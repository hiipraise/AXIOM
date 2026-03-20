import { ReactNode } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  if (!open) return null

  const confirmClasses = variant === 'danger'
    ? 'bg-red-600 text-white hover:bg-red-500'
    : 'bg-ink text-white hover:bg-ink-light'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-ash-border bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-ash-border px-5 py-4">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 rounded-full p-2 ${variant === 'danger' ? 'bg-red-50 text-red-600' : 'bg-ash text-ink'}`}>
              <AlertTriangle size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">{title}</p>
              <div className="mt-1 text-xs leading-5 text-ink-muted">{description}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-ink-muted transition-colors hover:text-ink">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2 px-5 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-ash-border py-2.5 text-xs text-ink-muted transition-colors hover:bg-ash"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-lg py-2.5 text-xs font-medium transition-colors ${confirmClasses}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
