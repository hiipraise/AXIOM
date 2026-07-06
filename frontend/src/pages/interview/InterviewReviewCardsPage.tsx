import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { interviewApi } from '../../api'
import { ReviewCard } from '../../types'
import {
  Brain,
  Search,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Meh,
  Filter,
  ChevronDown,
  ExternalLink,
  Calendar,
  Layers,
} from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_OPTS = [
  { value: '', label: 'All cards' },
  { value: 'due', label: 'Due now' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'reviewed', label: 'Reviewed' },
]

const fmtDate = (d: string | null) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const isOverdue = (card: ReviewCard) => {
  if (!card.next_review_at) return false
  return new Date(card.next_review_at) <= new Date()
}
import Seo from "../../components/Seo";

export default function InterviewReviewCardsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [revealedId, setRevealedId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const { data: allCards = [], isLoading } = useQuery<ReviewCard[]>({
    queryKey: ['review-cards-all', statusFilter],
    queryFn: () =>
      interviewApi.reviewCardsAll({
        status: statusFilter || undefined,
      }),
  })

  const { data: stats } = useQuery({
    queryKey: ['review-card-stats'],
    queryFn: () => interviewApi.reviewCardStats(),
  })

  const { data: topicsData } = useQuery<{ topics: { name: string; count: number }[]; total_sessions: number }>({
    queryKey: ['interview-topics'],
    queryFn: () => interviewApi.topics(),
  })

  const rateMutation = useMutation({
    mutationFn: ({ cardId, rating }: { cardId: string; rating: 'easy' | 'medium' | 'hard' }) =>
      interviewApi.rateReviewCard(cardId, rating),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['review-cards-all'] })
      qc.invalidateQueries({ queryKey: ['review-cards'] })
      qc.invalidateQueries({ queryKey: ['review-card-stats'] })
      setRevealedId(null)
      toast.success('Rated!')
    },
    onError: () => toast.error('Failed to rate card'),
  })

  const filteredCards = useMemo(() => {
    if (!search) return allCards
    const q = search.toLowerCase()
    return allCards.filter(
      (c) =>
        c.question.toLowerCase().includes(q) ||
        c.answer.toLowerCase().includes(q) ||
        c.topic.toLowerCase().includes(q),
    )
  }, [allCards, search])

  const uniqueTopics = useMemo(() => {
    if (!allCards.length) return []
    const topicSet = new Set(allCards.map((c) => c.topic))
    return Array.from(topicSet).sort()
  }, [allCards])

  const dueCount = useMemo(
    () => filteredCards.filter((c) => isOverdue(c)).length,
    [filteredCards],
  )

  return (
    <div className="min-h-screen bg-ash">
      <Seo title="Review Cards" noindex />
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-ink-muted mb-1">
                <Brain size={15} /> Review Cards
              </p>
              <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
                Spaced-repetition review
              </h1>
              {stats && (
                <p className="mt-1 text-sm text-ink-muted">
                  {stats.total} total &middot; {stats.due} due now &middot;{' '}
                  {stats.completed} reviewed
                </p>
              )}
            </div>
            <Link
              to="/interview"
              className="flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors"
            >
              <ExternalLink size={13} />
              New interview
            </Link>
          </div>
        </div>

        {/* Search + filters bar */}
        <div className="card mb-6 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search questions, answers, topics..."
                className="input pl-9 h-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-medium transition-colors ${
                showFilters || statusFilter
                  ? 'border-ink bg-ink text-white'
                  : 'border-ash-border text-ink-muted hover:border-ink hover:text-ink'
              }`}
            >
              <Filter size={13} />
              Filters
              <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-ash-border">
              {/* Status */}
              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="text-ink-muted" />
                <select
                  className="input text-xs h-8 py-0"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  {STATUS_OPTS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Topic quick chips */}
              {uniqueTopics.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Layers size={13} className="text-ink-muted" />
                  {uniqueTopics.map((topic) => (
                    <button
                      key={topic}
                      onClick={() =>
                        setSearch(search === topic ? '' : topic)
                      }
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                        search === topic
                          ? 'bg-ink text-white'
                          : 'bg-ash text-ink-muted hover:bg-ash-dark'
                      }`}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              )}

              {statusFilter || search ? (
                <button
                  onClick={() => {
                    setSearch('')
                    setStatusFilter('')
                  }}
                  className="text-[10px] text-ink-muted underline hover:text-ink"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          )}
        </div>

        {/* Cards list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-ink border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="text-center py-16">
            <Brain size={32} className="mx-auto text-ink-muted mb-3" />
            <p className="text-sm text-ink-muted">
              {search || statusFilter
                ? 'No cards match your filters.'
                : 'No review cards yet.'}
            </p>
            <p className="text-xs text-ink-muted mt-1">
              Complete an interview session and generate review cards to start.
            </p>
            {!search && !statusFilter && (
              <Link
                to="/interview"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-ink hover:underline"
              >
                <Brain size={13} /> Start a practice session
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Due count badge */}
            {dueCount > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 text-amber-700 text-xs">
                <RotateCcw size={13} />
                <span className="font-medium">{dueCount} card{dueCount !== 1 ? 's' : ''} due for review</span>
              </div>
            )}

            {filteredCards.map((card, i) => {
              const overdue = isOverdue(card)
              const isRevealed = revealedId === card.id

              return (
                <div
                  key={card.id}
                  className={`card p-5 transition-all ${
                    overdue && !isRevealed ? 'border-l-4 border-l-amber-400' : ''
                  }`}
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider text-ink-muted px-2 py-0.5 rounded-full bg-ash">
                        {card.topic}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          card.difficulty === 'hard'
                            ? 'bg-red-50 text-red-600'
                            : card.difficulty === 'easy'
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-amber-50 text-amber-600'
                        }`}
                      >
                        {card.difficulty}
                      </span>
                      {card.review_count > 0 && (
                        <span className="text-[10px] text-ink-muted bg-ash px-2 py-0.5 rounded-full">
                          {card.review_count}x
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-ink-muted whitespace-nowrap">
                      <span title="Next review">
                        <RotateCcw size={11} className="inline mr-0.5" />
                        {fmtDate(card.next_review_at)}
                      </span>
                    </div>
                  </div>

                  {/* Question */}
                  <p className="text-sm font-medium text-ink leading-relaxed mb-3">
                    {card.question}
                  </p>

                  {/* Reveal / Answer */}
                  {isRevealed ? (
                    <div className="space-y-3">
                      {card.answer && (
                        <div className="rounded-lg bg-ash p-3">
                          <p className="text-[11px] text-ink-muted font-medium mb-1">
                            Your answer:
                          </p>
                          <p className="text-xs text-ink leading-relaxed">
                            {card.answer}
                          </p>
                        </div>
                      )}

                      <div>
                        <p className="text-[10px] text-ink-muted mb-2">
                          How well did you know this?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              rateMutation.mutate({
                                cardId: card.id,
                                rating: 'hard',
                              })
                            }
                            disabled={rateMutation.isPending}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-600 text-xs hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            <ThumbsDown size={12} /> Hard
                          </button>
                          <button
                            onClick={() =>
                              rateMutation.mutate({
                                cardId: card.id,
                                rating: 'medium',
                              })
                            }
                            disabled={rateMutation.isPending}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-amber-200 text-amber-600 text-xs hover:bg-amber-50 transition-colors disabled:opacity-50"
                          >
                            <Meh size={12} /> Medium
                          </button>
                          <button
                            onClick={() =>
                              rateMutation.mutate({
                                cardId: card.id,
                                rating: 'easy',
                              })
                            }
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
                      onClick={() => setRevealedId(card.id)}
                      className="w-full py-2 rounded-lg border border-dashed border-ash-border text-xs text-ink-muted hover:text-ink hover:border-ink transition-colors"
                    >
                      Tap to reveal answer &amp; rate
                    </button>
                  )}

                  {/* Session link */}
                  <Link
                    to={`/interview/${card.session_id}/review`}
                    className="mt-3 inline-flex items-center gap-1 text-[10px] text-ink-muted hover:text-ink transition-colors"
                  >
                    <ExternalLink size={10} />
                    View session
                  </Link>
                </div>
              )
            })}

            {/* Card count */}
            <p className="text-center text-xs text-ink-muted pt-4">
              Showing {filteredCards.length} of {allCards.length} card{allCards.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
