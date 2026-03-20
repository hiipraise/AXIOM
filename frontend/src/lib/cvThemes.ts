export type CVThemeKey =
  | 'minimal'
  | 'classic'
  | 'sharp'
  | 'executive'
  | 'nordic'
  | 'terracotta'
  | 'forest'
  | 'royal'

export interface CVThemeDefinition {
  label: string
  accent: string
  secondary: string
  background: string
  line: string
  text: string
  fontFamily: string
}

export const CV_THEMES: Record<CVThemeKey, CVThemeDefinition> = {
  minimal: {
    label: 'Minimal',
    accent: '#0F172A',
    secondary: '#64748B',
    background: '#FFFFFF',
    line: '#E2E8F0',
    text: '#111827',
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  },
  classic: {
    label: 'Classic',
    accent: '#1E3A5F',
    secondary: '#4A5568',
    background: '#FFFEFB',
    line: '#CBD5E1',
    text: '#1F2937',
    fontFamily: "Georgia, 'Times New Roman', serif",
  },
  sharp: {
    label: 'Sharp',
    accent: '#DC2626',
    secondary: '#4B5563',
    background: '#FFFFFF',
    line: '#E5E7EB',
    text: '#111111',
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  },
  executive: {
    label: 'Executive',
    accent: '#111827',
    secondary: '#8B5E3C',
    background: '#FFFDFC',
    line: '#E7D7CB',
    text: '#1F2937',
    fontFamily: "'Trebuchet MS', 'Helvetica Neue', Arial, sans-serif",
  },
  nordic: {
    label: 'Nordic',
    accent: '#0F766E',
    secondary: '#475569',
    background: '#F8FFFE',
    line: '#BEE3DB',
    text: '#0F172A',
    fontFamily: "'Avenir Next', 'Segoe UI', Arial, sans-serif",
  },
  terracotta: {
    label: 'Terracotta',
    accent: '#C2410C',
    secondary: '#7C5E52',
    background: '#FFF8F4',
    line: '#F1C9B6',
    text: '#431407',
    fontFamily: "'Gill Sans', 'Segoe UI', Arial, sans-serif",
  },
  forest: {
    label: 'Forest',
    accent: '#166534',
    secondary: '#4B5563',
    background: '#FAFFFB',
    line: '#CFE9D6',
    text: '#1F2937',
    fontFamily: "'Optima', 'Segoe UI', Arial, sans-serif",
  },
  royal: {
    label: 'Royal',
    accent: '#4338CA',
    secondary: '#6B7280',
    background: '#FCFCFF',
    line: '#D9D6FE',
    text: '#1E1B4B',
    fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
  },
}

export const CV_THEME_OPTIONS = Object.entries(CV_THEMES).map(([value, config]) => ({
  value: value as CVThemeKey,
  label: config.label,
}))

export function getCVTheme(theme?: string) {
  return CV_THEMES[(theme as CVThemeKey) || 'minimal'] || CV_THEMES.minimal
}
