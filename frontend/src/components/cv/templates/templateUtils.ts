import { CVData, PersonalInfo } from '../../../types'
import { CVThemeDefinition } from '../../../lib/cvThemes'

export interface TemplateProps {
  cvData: CVData
  t: CVThemeDefinition
}

export const has = (s?: string | null): boolean =>
  Boolean(s && s.trim().length > 0)

export const contactItems = (pi: PersonalInfo): string[] =>
  [pi.email, pi.phone, pi.location, pi.linkedin, pi.github, pi.portfolio, pi.website].filter(has) as string[]

export const initials = (name: string): string =>
  name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
