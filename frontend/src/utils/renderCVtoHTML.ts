/**
 * renderCVtoHTML.ts
 *
 * Renders the CVRenderer component into a hidden off-screen div,
 * waits for fonts and layout to settle, then returns a complete
 * self-contained HTML document string ready to send to the backend.
 *
 * Because CVRenderer uses only inline styles (no Tailwind / CSS classes),
 * the innerHTML snapshot is 100% self-contained — no stylesheets needed.
 */
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import CVRenderer from '../components/cv/CVRenderer'
import { CVData } from '../types'

// A4 at 96 dpi = 794 px.  Templates are designed around this width.
const A4_PX = 794

export async function renderCVtoHTML(
  cvData:   CVData,
  theme:    string,
  template: string,
): Promise<string> {
  // ── 1. Mount component into a hidden off-screen container ──────────────────
  const container = document.createElement('div')
  container.style.cssText = [
    `width: ${A4_PX}px`,
    'position: fixed',
    'top: 0',
    'left: -9999px',
    'background: white',
    'z-index: -1',
  ].join(';')
  document.body.appendChild(container)

  await new Promise<void>((resolve) => {
    const root = createRoot(container)
    root.render(createElement(CVRenderer, { cvData, theme, template }))
    // 500 ms — enough for React, inline styles, and system font rendering
    setTimeout(resolve, 500)
  })

  const bodyHTML = container.innerHTML
  document.body.removeChild(container)

  // ── 2. Wrap in a minimal HTML document ─────────────────────────────────────
  // The CV templates reference only system fonts (Helvetica, Arial, Georgia,
  // Times) so no external font URLs are needed.  Chromium headless ships all
  // of these natively.
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: ${A4_PX}px; background: white; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style>
</head>
<body>
  <div style="width:${A4_PX}px;background:white;">
    ${bodyHTML}
  </div>
</body>
</html>`
}