"""
html_pdf.py — HTML → PDF via headless Chromium (Playwright)

Uses subprocess to run Playwright in a completely separate Python process,
avoiding all asyncio event loop issues on Windows entirely.
A child process has its own fresh event loop with no inherited state.

HTML sanitization uses bleach (allowlist approach) instead of a regex blocklist.
"""
from __future__ import annotations

import asyncio
import subprocess
import sys
import json
import base64
from concurrent.futures import ThreadPoolExecutor

import bleach
from bleach.css_sanitizer import CSSSanitizer

_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="pw_pdf")

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

# The worker script — written to a temp file and executed as a subprocess
_WORKER_SCRIPT = r"""
import sys, json, base64, asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from playwright.sync_api import sync_playwright

data = json.loads(sys.stdin.buffer.read())
html = data["html"]

with sync_playwright() as pw:
    browser = pw.chromium.launch(args=[
        "--no-sandbox", "--disable-setuid-sandbox",
        "--disable-dev-shm-usage", "--disable-gpu", "--no-first-run",
    ])
    try:
        page = browser.new_page()
        page.set_content(html, wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(200)
        pdf = page.pdf(
            format="A4",
            print_background=True,
            scale=1.0,
            margin={"top": "14mm", "bottom": "16mm",
                "left": "16mm", "right": "16mm"},
        )
        sys.stdout.buffer.write(base64.b64encode(pdf))
    finally:
        browser.close()
"""


def _run_in_subprocess(html: str) -> bytes:
    """
    Write the worker script to a temp file and run it as a fresh Python
    subprocess.  Input/output via stdin/stdout avoids any file permission
    issues with temp directories.
    """
    payload = json.dumps({"html": html}).encode()

    result = subprocess.run(
        [sys.executable, "-c", _WORKER_SCRIPT],
        input=payload,
        capture_output=True,
        timeout=60,
    )

    if result.returncode != 0:
        stderr = result.stderr.decode(errors="replace")
        raise RuntimeError(f"Playwright subprocess failed:\n{stderr}")

    return base64.b64decode(result.stdout)


async def html_to_pdf(html: str) -> bytes:
    """Async entry point — offloads blocking subprocess to thread pool."""
    html = sanitize_html(html)
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _run_in_subprocess, html)
