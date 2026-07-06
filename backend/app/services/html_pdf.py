"""
html_pdf.py — HTML → PDF via headless Chromium (Playwright async API)

Uses playwright.async_api directly on the server's event loop instead of
spawning a subprocess. A single browser instance is created on first use
and reused across requests with an asyncio lock for thread-safe init.

HTML sanitization uses bleach (allowlist approach) instead of a regex blocklist.
"""
from __future__ import annotations

import asyncio
import logging

import bleach
from bleach.css_sanitizer import CSSSanitizer

logger = logging.getLogger(__name__)

# ── Allowlist-based HTML sanitization ─────────────────────────────────────────
# Only tags, attributes, and CSS properties needed for CV PDF rendering.
# Everything else is stripped. This is far more secure than any blocklist.

ALLOWED_TAGS = {
    # Document structure
    "html", "head", "body", "div", "span", "p", "br", "hr",
    # Headings
    "h1", "h2", "h3", "h4", "h5", "h6",
    # Text formatting
    "strong", "em", "b", "i", "u", "s", "sub", "sup", "small",
    "pre", "code", "blockquote", "q", "mark", "ins", "del",
    # Lists
    "ul", "ol", "li", "dl", "dt", "dd",
    # Tables
    "table", "thead", "tbody", "tfoot", "tr", "td", "th",
    "caption", "colgroup", "col",
    # Links & images
    "a", "img",
    # Semantic / layout
    "section", "header", "footer", "main", "article", "aside",
    "figure", "figcaption", "nav",
    # Metadata (style, meta, base excluded:
    # - <style> tag content is not sanitized by bleach's CSSSanitizer
    # - <meta http-equiv="refresh"> triggers HTTP requests in Playwright
    # - <base> can redirect relative URLs)
    "title",
    # Inline
    "abbr", "address", "cite", "dfn", "kbd", "samp", "var", "time",
}

ALLOWED_ATTRIBUTES = {
    "a":         ["href", "target", "rel", "title", "class", "id", "style", "download"],
    "img":       ["src", "alt", "width", "height", "loading", "class", "id", "style", "title"],
    "td":        ["colspan", "rowspan", "class", "id", "style", "headers", "scope"],
    "th":        ["colspan", "rowspan", "class", "id", "style", "headers", "scope"],
    "table":     ["class", "id", "style", "border", "cellpadding", "cellspacing"],
    "col":       ["span", "class", "id", "style"],
    "colgroup":  ["span", "class", "id", "style"],
    "time":      ["datetime", "class", "id", "style"],
    "ol":        ["start", "reversed", "type", "class", "id", "style"],
    "meta":      ["charset", "name", "content", "http-equiv"],
    "base":      ["href", "target"],
    "style":     ["type", "media", "class", "id"],
    "*":         ["class", "id", "style", "title", "lang", "dir"],  # global attrs
}

ALLOWED_STYLES = {
    # Font
    "font-family", "font-size", "font-weight", "font-style", "font-variant",
    "line-height", "color", "text-align", "text-decoration", "text-transform",
    "text-indent", "letter-spacing", "word-spacing", "white-space",
    "vertical-align", "direction", "unicode-bidi",
    # Layout & sizing
    "display", "width", "height", "min-width", "min-height",
    "max-width", "max-height",
    "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
    "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
    "float", "clear", "overflow", "visibility",
    # Borders
    "border", "border-collapse", "border-spacing",
    "border-color", "border-width", "border-style",
    "border-top", "border-right", "border-bottom", "border-left",
    "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
    "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
    "border-top-style", "border-right-style", "border-bottom-style", "border-left-style",
    "border-radius",
    # Background (no background-image — too risky for exfiltration)
    "background", "background-color",
    # Table-specific
    "table-layout", "caption-side", "empty-cells",
    # Print/PDF
    "page-break-inside", "page-break-before", "page-break-after",
    "orphans", "widows", "box-decoration-break",
    # Modern layout
    "box-sizing", "flex", "flex-direction", "flex-wrap", "flex-flow",
    "flex-grow", "flex-shrink", "flex-basis",
    "justify-content", "align-items", "align-content", "align-self",
    "order", "gap", "row-gap", "column-gap",
    # Grid
    "grid", "grid-template", "grid-template-columns", "grid-template-rows",
    "grid-template-areas", "grid-column", "grid-row", "grid-area",
    "grid-auto-flow", "grid-auto-columns", "grid-auto-rows",
    "justify-items", "justify-self",
    # Lists
    "list-style", "list-style-type", "list-style-position", "list-style-image",
    # Opacity & transforms
    "opacity", "transform", "transform-origin",
    # Text
    "text-overflow", "word-break", "overflow-wrap", "hyphens",
}

# Only these URL protocols are allowed in href/src attributes
ALLOWED_PROTOCOLS = ["http", "https", "mailto", "tel"]


_css_sanitizer = CSSSanitizer(allowed_css_properties=ALLOWED_STYLES)


def sanitize_html(html: str) -> str:
    """Sanitize HTML using an allowlist approach.

    Strips any tags, attributes, CSS properties, or URL protocols
    not in the explicit allowlists (silently — no ValueError raised).
    This is far more secure than a regex blocklist because unknown
    threats are automatically blocked rather than needing a new
    pattern to be added.

    Note: unlike the previous blocklist implementation, this does
    NOT raise ValueError when dangerous content is found. Instead
    it silently removes the offending parts and returns clean HTML.
    """
    return bleach.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        css_sanitizer=_css_sanitizer,
        protocols=ALLOWED_PROTOCOLS,
        strip=True,
        strip_comments=True,
    )


# ── Shared browser instance (lazy init, reused across requests) ───────────────

_playwright_instance = None
_browser = None
_browser_lock = asyncio.Lock()


def _is_browser_error(exc: Exception) -> bool:
    """Check if an exception indicates the browser process is dead."""
    msg = str(exc).lower()
    # Playwright raises Error with "browser closed", "target closed",
    # "connection closed", "protocol error" on crashed/disconnected browsers
    return any(kw in msg for kw in [
        "browser closed",
        "target closed",
        "connection closed",
        "protocol error",
        "page crashed",
        "page closed",
    ])


async def _reset_browser():
    """Close and re-launch the browser from scratch."""
    global _playwright_instance, _browser
    async with _browser_lock:
        if _browser is not None:
            try:
                await _browser.close()
            except Exception:
                pass
            _browser = None
        if _playwright_instance is not None:
            try:
                await _playwright_instance.stop()
            except Exception:
                pass
            _playwright_instance = None
    # Re-launch via the normal lazy init path
    await _get_browser()


async def _get_browser():
    """Return the shared Chromium browser, creating it on first call."""
    global _playwright_instance, _browser

    if _browser is not None:
        return _browser

    async with _browser_lock:
        if _browser is not None:
            return _browser

        from playwright.async_api import async_playwright

        _playwright_instance = await async_playwright().start()
        _browser = await _playwright_instance.chromium.launch(
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--no-first-run",
            ],
        )
        logger.info("Playwright browser launched (reused across requests)")
        return _browser


async def _close_browser():
    """Cleanup: close browser and stop Playwright (call on app shutdown)."""
    global _playwright_instance, _browser

    async with _browser_lock:
        if _browser is not None:
            try:
                await _browser.close()
            except Exception:
                logger.exception("Error closing Playwright browser")
            _browser = None
        if _playwright_instance is not None:
            try:
                await _playwright_instance.stop()
            except Exception:
                logger.exception("Error stopping Playwright")
            _playwright_instance = None
        logger.info("Playwright browser shut down")


async def html_to_pdf(html: str, _retry: bool = True) -> bytes:
    """Render HTML to PDF via headless Chromium.

    Uses a shared browser instance (created on first call).
    Each call creates a new isolated page/context for safety.
    If the browser crashes, it is re-launched and the call retried once.
    """
    html = sanitize_html(html)
    browser = await _get_browser()

    context = None
    try:
        context = await browser.new_context(
            # No cookies/localStorage from previous calls
            no_viewport=True,
            java_script_enabled=False,
        )
        page = await context.new_page()
        await page.set_content(html, wait_until="networkidle", timeout=15000)
        await page.wait_for_timeout(200)
        pdf = await page.pdf(
            format="A4",
            print_background=True,
            scale=1.0,
            margin={"top": "14mm", "bottom": "16mm",
                    "left": "16mm", "right": "16mm"},
        )
        return pdf
    except Exception as exc:
        # If the browser seems dead, reset it and retry once
        if _retry and _is_browser_error(exc):
            logger.warning("Playwright browser may be dead — re-launching: %s", exc)
            await _reset_browser()
            return await html_to_pdf(html, _retry=False)
        raise
    finally:
        if context is not None:
            await context.close()
