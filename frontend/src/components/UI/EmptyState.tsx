import { Link } from 'react-router-dom'
import { Search, Inbox, FileText, Users, Briefcase, Plus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from './Button'

type EmptyVariant = 'search' | 'list' | 'create' | 'custom'

interface EmptyStateProps {
  variant?: EmptyVariant
  title: string
  description?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  icon?: LucideIcon
}

/** Pre-configured empty state variants */
const variantConfig: Record<
  EmptyVariant,
  { icon: typeof Inbox; title: string; description?: string }
> = {
  search: {
    icon: Search,
    title: 'No results found',
    description: 'Try adjusting your search or filters.',
  },
  list: {
    icon: Inbox,
    title: 'Nothing here yet',
    description: 'Get started by adding your first item.',
  },
  create: {
    icon: Plus,
    title: 'Ready to begin',
    description: 'Click the button below to get started.',
  },
  custom: {
    icon: Inbox,
    title: 'No data',
    description: 'Nothing to display.',
  },
}

export function EmptyState({
  variant = 'custom',
  title,
  description,
  action,
  icon,
}: EmptyStateProps) {
  const config = variantConfig[variant]
  const IconComponent = icon ?? config.icon

  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 py-12 text-center">
      <div className="rounded-full bg-ink-5 p-4">
        {IconComponent && <IconComponent className="text-ink-muted" size={28} />}
      </div>
      <div>
        <p className="text-sm font-medium text-ink">{title || config.title}</p>
        {description && (
          <p className="mt-1 text-xs text-ink-muted">{description}</p>
        )}
      </div>
      {action && (
        <Button
          variant="secondary"
          size="sm"
          onClick={action.onClick}
          {...(action.href ? { as: Link, to: action.href } : {})}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

/** Pre-built empty states for common scenarios */
export const EmptyJobs = ({
  action,
}: {
  action?: { label: string; href?: string; onClick?: () => void }
}) => (
  <EmptyState
    variant="search"
    title="No jobs matched your search"
    description="Try removing a filter or check back later."
    action={action}
    icon={Briefcase}
  />
)

export const EmptyApplications = ({
  action,
}: {
  action?: { label: string; href?: string; onClick?: () => void }
}) => (
  <EmptyState
    variant="list"
    title="No applications yet"
    description="Find a job to apply to and grow your career."
    action={action}
    icon={FileText}
  />
)

export const EmptyCandidates = ({
  action,
}: {
  action?: { label: string; href?: string; onClick?: () => void }
}) => (
  <EmptyState
    variant="list"
    title="No candidates yet"
    description="Add candidates to your talent pool."
    action={action}
    icon={Users}
  />
)

export const EmptySearch = ({
  title = 'No results found',
  description = 'Try adjusting your search or filters.',
  action,
}: {
  title?: string
  description?: string
  action?: { label: string; href?: string; onClick?: () => void }
}) => (
  <EmptyState
    variant="search"
    title={title}
    description={description}
    action={action}
    icon={Search}
  />
)

// Default export for convenience
export default EmptyState