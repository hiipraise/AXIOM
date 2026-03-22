"""
html_pdf.py — HTML → PDF via headless Chromium (Playwright)

Uses subprocess to run Playwright in a completely separate Python process,
avoiding all asyncio event loop issues on Windows entirely.
A child process has its own fresh event loop with no inherited state.
"""
from __future__ import annotations

import asyncio
import subprocess
import sys
import tempfile
import os
import json
import base64
from concurrent.futures import ThreadPoolExecutor

_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="pw_pdf")

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
            margin={"top": "10mm", "bottom": "10mm",
                    "left": "12mm", "right": "12mm"},
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
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _run_in_subprocess, html)