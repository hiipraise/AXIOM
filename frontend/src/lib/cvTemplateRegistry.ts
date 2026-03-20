export interface CVTemplateDefinition {
  id: string
  label: string
  description: string
}

export const CV_TEMPLATES: CVTemplateDefinition[] = [
  { id: 'standard',    label: 'Standard',    description: 'Classic single-column' },
  { id: 'atlas',       label: 'Atlas',       description: 'Sidebar two-column' },
  { id: 'horizon',     label: 'Horizon',     description: 'Bold header + columns' },
  { id: 'pulse',       label: 'Pulse',       description: 'Timeline style' },
  { id: 'grid',        label: 'Grid',        description: 'Structured two-column' },
  { id: 'minimal-pro', label: 'Minimal Pro', description: 'Ultra-clean layout' },
]

export const CV_TEMPLATE_OPTIONS = CV_TEMPLATES.map(t => ({ value: t.id, label: t.label }))