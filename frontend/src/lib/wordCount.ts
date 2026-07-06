/** Word count utility for CV sections */

export function countWords(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}

export function estimateReadingTime(wordCount: number): string {
  const wpm = 200; // Average reading speed
  const minutes = Math.ceil(wordCount / wpm);
  if (minutes < 1) return "< 1 min";
  if (minutes === 1) return "1 min";
  return `${minutes} min`;
}

export function wordCountLabel(text: string): string {
  const wc = countWords(text);
  return `${wc} words · ${estimateReadingTime(wc)} read`;
}

/** Stats for an array of text fields (e.g. bullet achievements) */
export function countListWords(items: string[]): number {
  return items.reduce((sum, item) => sum + countWords(item), 0);
}
