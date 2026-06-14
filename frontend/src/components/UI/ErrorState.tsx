import { ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './Button'

/** Field-level error - displays inline below input */
export function FieldError({ message }: { message: string }) {
  if (!message) return null
  return (
    <p role="alert" className="mt-1 text-xs text-error-500">
      {message}
    </p>
  )
}

/** Page-level error banner */
interface PageErrorProps {
  title?: string
  message: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function PageError({
  title = 'Something went wrong',
  message,
  action,
}: PageErrorProps) {
  return (
    <div
      role="alert"
      className="mb-6 flex flex-col gap-3 rounded-lg border border-error-200 bg-error-50 p-4"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 shrink-0 text-error-500" size={20} />
        <div className="flex-1">
          <p className="text-sm font-medium text-error-700">{title}</p>
          <p className="mt-1 text-sm text-error-600">{message}</p>
        </div>
      </div>
      {action && (
        <div className="ml-8">
          <Button variant="secondary" size="sm" onClick={action.onClick}>
            <RefreshCw size={14} />
            {action.label}
          </Button>
        </div>
      )}
    </div>
  )
}

/** Generic error display with optional retry */
interface GenericErrorProps {
  title?: string
  message: string
  retry?: () => void
}

export function GenericError({
  title = 'Something went wrong',
  message = 'Please try again later.',
  retry,
}: GenericErrorProps) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center">
      <AlertTriangle className="text-ink-muted" size={32} />
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mt-1 text-xs text-ink-muted">{message}</p>
      </div>
      {retry && (
        <Button variant="secondary" size="sm" onClick={retry}>
          <RefreshCw size={14} />
          Try again
        </Button>
      )}
    </div>
  )
}

// Re-export Button for convenience
export { Button } from './Button'

// Default export for convenience
export default GenericError