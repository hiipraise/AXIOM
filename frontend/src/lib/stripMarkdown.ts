/**
 * stripMarkdown.ts — Strip markdown syntax from CV text fields.
 *
 * Removes bold, italic, links, bullet markers, and heading markers,
 * returning clean plain text. Used for defense-in-depth: AI prompts
 * are instructed to avoid markdown, but this catches any that slips
 * through (both on-save and on-display).
 *
 * Exports:
 *   stripMarkdown(text)          — strip markdown from a single string
 *   stripMarkdownCVData(data)    — strip markdown from all text fields in CVData
 */

/** Strip markdown syntax from a single text string. */
export function stripMarkdown(text: string): string {
  if (!text) return ''

  let result = text

  // Bold: **text** or __text__
  result = result.replace(/\*\*(.+?)\*\*/g, '$1')
  result = result.replace(/__(.+?)__/g, '$1')

  // Italic: *text* or _text_ (word-boundary aware — avoids stripping
  // underscores inside words like "some_var_name")
  result = result.replace(/(^|\s)\*([^*]+?)\*(?=\s|$|[.,!?;])/g, '$1$2')
  result = result.replace(/(^|\s)_([^_]+?)_(?=\s|$|[.,!?;])/g, '$1$2')

  // Fenced code blocks: ``` ... ``` — strip entirely
  result = result.replace(/```[\s\S]*?```/g, '')

  // Inline code: `text`
  result = result.replace(/`([^`]+)`/g, '$1')

  // Markdown links: [label](url) → label
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

  // Leading bullet markers on lines: - , * , + followed by space
  result = result.replace(/^[-*+]\s+/gm, '')

  // Leading heading markers: ## , ### , etc.
  result = result.replace(/^#{1,6}\s+/gm, '')

  // Leading blockquote markers: > 
  result = result.replace(/^>\s+/gm, '')

  return result
}

/** Recursively strip markdown from all writable text fields in a CVData object.
 *
 * Handles: summary, job_description, personal_info text fields,
 * experience[].description & .achievements[], education[].description,
 * project[].description, award[].description, volunteer[].description,
 * any nested or future string fields.
 */
export function stripMarkdownCVData<T extends Record<string, unknown>>(data: T): T {
  const out = { ...data } as Record<string, unknown>

  for (const [key, value] of Object.entries(out)) {
    if (typeof value === 'string') {
      out[key] = stripMarkdown(value)
    } else if (Array.isArray(value)) {
      out[key] = value.map((item: unknown) => {
        if (typeof item === 'string') {
          return stripMarkdown(item)
        }
        if (item && typeof item === 'object') {
          return stripMarkdownCVData(item as Record<string, unknown>)
        }
        return item
      })
    } else if (value && typeof value === 'object') {
      out[key] = stripMarkdownCVData(value as Record<string, unknown>)
    }
  }

  return out as T
}
