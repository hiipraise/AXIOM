/**
 * Lightweight markdown-to-HTML renderer for CV text fields.
 * Supports: **bold**, _italic_, [links](url), `- bullet` lists, and line breaks.
 * HTML-encodes input first to prevent XSS.
 */
export function renderMarkdown(text: string): string {
  if (!text) return ''

  // HTML-encode
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  // Italic: _text_ (word-boundary aware, avoids matching underscores in words)
  html = html.replace(/(^|\s)_([^_]+)_(?=\s|$|[.,!?;])/g, '$1<em>$2</em>')

  // Links: [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  )

  // Bullet list: lines starting with "- " (also handle `*` and `+`)
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/^\* (.+)$/gm, '<li>$1</li>')
  html = html.replace(/^\+ (.+)$/gm, '<li>$1</li>')

  // Line breaks (preserve within paragraphs)
  html = html.replace(/\n/g, '<br />')

  return html
}
