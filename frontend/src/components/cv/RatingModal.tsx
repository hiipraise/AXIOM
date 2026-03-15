import { useState } from 'react'
import { cvApi } from '../../api'
import { X, Star } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  cvId: string
  cvTitle: string
  currentRating?: number | null
  onClose: () => void
  onSaved?: (score: number) => void
}

export default function RatingModal({ cvId, cvTitle, currentRating, onClose, onSaved }: Props) {
  const [hovered, setHovered] = useState(0)
  const [selected, setSelected] = useState(currentRating || 0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (selected === 0) {
      toast.error('Please select a rating')
      return
    }
    setSaving(true)
    try {
      await cvApi.rate(cvId, selected, comment.trim() || undefined)
      toast.success('Rating saved')
      onSaved?.(selected)
      onClose()
    } catch {
      toast.error('Failed to save rating')
    } finally {
      setSaving(false)
    }
  }

  const LABELS: Record<number, string> = {
    1: 'Needs major work',
    2: 'Getting there',
    3: 'Decent',
    4: 'Strong',
    5: 'Ready to send',
  }

  const display = hovered || selected

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-ash-border w-full max-w-sm shadow-xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-ash-border flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-sm text-ink">Rate this CV</p>
            <p className="text-xs text-ink-muted mt-0.5 truncate max-w-[220px]">{cvTitle}</p>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink mt-0.5 flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Stars */}
        <div className="px-5 py-6">
          <p className="text-xs text-ink-muted mb-4 text-center">
            How satisfied are you with this version of your CV?
          </p>

          <div className="flex items-center justify-center gap-2 mb-3">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setSelected(n)}
                className="transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  size={32}
                  className={`transition-colors ${
                    n <= display
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-ash-border'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Label */}
          <div className="text-center h-5 mb-5">
            {display > 0 && (
              <p className="text-xs font-medium text-ink animate-fade-in">
                {LABELS[display]}
              </p>
            )}
          </div>

          {/* Comment */}
          <div>
            <label className="block text-xs font-medium text-ink mb-1.5">
              Notes <span className="text-ink-muted font-normal">(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
              placeholder="What would make this CV stronger? What's working well?"
              className="w-full px-3 py-2 text-xs border border-ash-border rounded-lg focus:outline-none focus:border-ink resize-none text-ink placeholder:text-ink-muted/50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-xs border border-ash-border rounded-lg text-ink-muted hover:bg-ash transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || selected === 0}
            className="flex-1 py-2.5 bg-ink text-white text-xs font-medium rounded-lg hover:bg-ink-light disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {saving ? 'Saving…' : (
              <>
                <Star size={12} className="fill-white" />
                Save rating
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}