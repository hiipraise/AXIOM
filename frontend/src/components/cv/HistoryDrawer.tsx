import { useQuery } from '@tanstack/react-query'
import { cvApi } from '../../api'
import { CVData } from '../../types'
import { X, RotateCcw, Clock } from 'lucide-react'

interface HistoryEntry {
  id: string
  title: string
  saved_at: string
  snapshot: CVData
}

interface Props {
  cvId: string
  onRestore: (snapshot: CVData) => void
  onClose: () => void
}

export default function HistoryDrawer({ cvId, onRestore, onClose }: Props) {
  const { data: history = [], isLoading } = useQuery<HistoryEntry[]>({
    queryKey: ['cv-history', cvId],
    queryFn: () => cvApi.history(cvId),
  })

  const fmt = (d: string) =>
    new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="fixed inset-y-0 right-0 w-72 bg-white border-l border-ash-border z-40 flex flex-col shadow-xl">
      <div className="px-4 py-3 border-b border-ash-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-ink-muted" />
          <span className="text-sm font-medium text-ink">Version History</span>
        </div>
        <button onClick={onClose} className="text-ink-muted hover:text-ink transition-colors">
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading && <p className="text-xs text-ink-muted text-center py-8">Loading…</p>}
        {!isLoading && history.length === 0 && (
          <div className="text-center py-8">
            <Clock size={20} className="text-ink-muted mx-auto mb-2" />
            <p className="text-xs text-ink-muted">No history yet.</p>
            <p className="text-xs text-ink-muted mt-1">History is saved automatically when you update a CV.</p>
          </div>
        )}
        {history.map((entry) => (
          <div key={entry.id} className="border border-ash-border rounded-lg p-3 hover:bg-ash transition-colors">
            <p className="text-xs font-medium text-ink">{entry.title}</p>
            <p className="text-[10px] text-ink-muted mt-0.5">{fmt(entry.saved_at)}</p>
            <button
              onClick={() => onRestore(entry.snapshot)}
              className="mt-2 flex items-center gap-1.5 text-[11px] text-ink hover:text-ink-muted transition-colors"
            >
              <RotateCcw size={11} /> Restore this version
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
