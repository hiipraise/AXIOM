import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { interviewApi } from '../../api'
import { ReviewCard, ReviewCardStats } from '../../types'
import { Brain, RotateCcw, ThumbsUp, ThumbsDown, Meh, BarChart3 } from 'lucide-react'

export default function SpacedRepetitionPanel() {
  const qc = useQueryClient()
  const [revealedId, setRevealedId] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionCount, setSessionCount] = useState(0)

  const { data: cards = [], isLoading } = useQuery<ReviewCard[]>({
    queryKey: ['review-cards'],
    queryFn: () => interviewApi.reviewCards(),
    refetchInterval: 10_000,
  })

  const { data: stats } = useQuery<ReviewCardStats>({
    queryKey: ['review-card-stats'],
    queryFn: () => interviewApi.reviewCardStats(),
  })

  const rateMutation = useMutation({
    mutationFn: ({ cardId, rating }: { cardId: string; rating: 'easy' | 'medium' | 'hard' }) =>
      interviewApi.rateReviewCard(cardId, rating),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['review-cards'] })
      qc.invalidateQueries({ queryKey: ['review-card-stats'] })
      setRevealedId(null)
      setCurrentIndex(prev => prev + 1)
    },
  })

  useEffect(() => {
    if (cards.length > 0 && sessionCount === 0) {
      setSessionCount(cards.length)
    }
  }, [cards.length])

  const current = cards[currentIndex]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!cards.length) {
    return (
      <div className="text-center py-6">
        <Brain size={24} className="mx-auto text-ink-muted mb-2" />
        <p className="text-xs text-ink-muted">No review cards due.</p>
        <p className="text-[10px] text-ink-muted mt-1">Complete an interview session and generate cards to start reviewing.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      {stats && (
        <div className="flex items-center gap-3 text-[10px] text-ink-muted">
          <span className="flex items-center gap-1">
            <BarChart3 size={11} />
            {stats.due} due · {stats.total} total
          </span>
          <span className="flex items-center gap-1">
            <RotateCcw size={11} />
            {stats.completed} reviewed
          </span>
        </div>
      )}

      {/* Progress dots */}
      <div className="flex gap-1">
        {cards.slice(0, Math.min(cards.length, 10)).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i === currentIndex ? 'bg-ink' : i < currentIndex ? 'bg-emerald-400' : 'bg-ash-dark'
            }`}
          />
        ))}
        {cards.length > 10 && (
          <span className="text-[10px] text-ink-muted ml-1">+{cards.length - 10}</span>
        )}
      </div>

      {/* All caught up */}
      {!current && cards.length > 0 && (
        <div className="text-center py-6">
          <RotateCcw size={24} className="mx-auto text-ink-muted mb-2" />
          <p className="text-xs text-ink-muted">All caught up!</p>
          <p className="text-[10px] text-ink-muted mt-1">New cards will appear when due.</p>
        </div>
      )}

      {/* Flashcard */}
      {current && (
        <div className="bg-white rounded-xl border border-ash-border p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-ink-muted px-2 py-0.5 rounded-full bg-ash">
              {current.topic}
            </span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              current.difficulty === 'hard' ? 'bg-red-50 text-red-600' :
              current.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-600' :
              'bg-amber-50 text-amber-600'
            }`}>
              {current.difficulty}
            </span>
          </div>

          <p className="text-sm font-medium text-ink leading-relaxed mb-4">
            {current.question}
          </p>

          {revealedId === current.id ? (
            <div className="space-y-4">
              {current.answer && (
                <div className="rounded-lg bg-ash p-3">
                  <p className="text-[11px] text-ink-muted font-medium mb-1">Your answer:</p>
                  <p className="text-xs text-ink leading-relaxed">{current.answer}</p>
                </div>
              )}

              <div>
                <p className="text-[10px] text-ink-muted mb-2">How well did you know this?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => rateMutation.mutate({ cardId: current.id, rating: 'hard' })}
                    disabled={rateMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-600 text-xs hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <ThumbsDown size={12} /> Hard
                  </button>
                  <button
                    onClick={() => rateMutation.mutate({ cardId: current.id, rating: 'medium' })}
                    disabled={rateMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-amber-200 text-amber-600 text-xs hover:bg-amber-50 transition-colors disabled:opacity-50"
                  >
                    <Meh size={12} /> Medium
                  </button>
                  <button
                    onClick={() => rateMutation.mutate({ cardId: current.id, rating: 'easy' })}
                    disabled={rateMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-200 text-emerald-600 text-xs hover:bg-emerald-50 transition-colors disabled:opacity-50"
                  >
                    <ThumbsUp size={12} /> Easy
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setRevealedId(current.id)}
              className="w-full py-2.5 rounded-lg border border-dashed border-ash-border text-xs text-ink-muted hover:text-ink hover:border-ink transition-colors"
            >
              Tap to reveal answer & rate
            </button>
          )}
        </div>
      )}

      {/* Card count */}
      <p className="text-center text-[10px] text-ink-muted">
        {currentIndex + 1} of {sessionCount || cards.length} cards
      </p>
    </div>
  )
}
