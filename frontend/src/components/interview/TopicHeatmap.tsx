import { useQuery } from '@tanstack/react-query'
import { interviewApi } from '../../api'
import { InterviewTopic } from '../../types'
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react'

const TOPIC_COLORS: Record<string, string> = {
  'teamwork & leadership': 'bg-blue-500',
  'system design': 'bg-purple-500',
  'data & metrics': 'bg-emerald-500',
  'growth & motivation': 'bg-amber-500',
  'technical skills': 'bg-indigo-500',
  'project delivery': 'bg-cyan-500',
  behavioural: 'bg-pink-500',
  technical: 'bg-violet-500',
  full: 'bg-orange-500',
  general: 'bg-gray-400',
}

function getTopicColor(name: string): string {
  return TOPIC_COLORS[name.toLowerCase()] || 'bg-gray-400'
}

export default function TopicHeatmap() {
  const { data, isLoading } = useQuery<{ topics: InterviewTopic[]; total_sessions: number }>({
    queryKey: ['interview-topics'],
    queryFn: () => interviewApi.topics(),
  })

  const topics = data?.topics || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!topics.length) {
    return (
      <div className="text-center py-6">
        <AlertCircle size={24} className="mx-auto text-ink-muted mb-2" />
        <p className="text-xs text-ink-muted">No topic data yet.</p>
        <p className="text-[10px] text-ink-muted mt-1">Complete interview sessions to see your topic breakdown.</p>
      </div>
    )
  }

  const maxCount = Math.max(...topics.map((t) => t.count), 1)

  return (
    <div className="space-y-3">
      {data?.total_sessions !== undefined && (
        <p className="text-[10px] text-ink-muted">
          Across {data.total_sessions} session{data.total_sessions !== 1 ? 's' : ''}
        </p>
      )}

      <div className="space-y-2">
        {topics.map((topic) => {
          const widthPct = Math.round((topic.count / maxCount) * 100)
          const scoreColor =
            topic.avg_score === null
              ? 'bg-gray-200'
              : topic.avg_score >= 70
                ? 'bg-emerald-500'
                : topic.avg_score >= 50
                  ? 'bg-amber-500'
                  : 'bg-red-500'

          return (
            <div key={topic.name} className="flex items-center gap-3">
              {/* Topic label */}
              <span className="w-28 text-[11px] text-ink-muted truncate flex-shrink-0">
                {topic.name}
              </span>

              {/* Heatmap bar */}
              <div className="flex-1 h-5 bg-ash rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all ${getTopicColor(topic.name)}`}
                  style={{ width: `${widthPct}%`, opacity: topic.avg_score !== null ? 0.8 : 0.4 }}
                />
                <span className="absolute inset-0 flex items-center px-2 text-[10px] text-white font-medium mix-blend-difference">
                  {topic.count} question{topic.count !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Score */}
              <div className="w-12 text-right flex-shrink-0">
                {topic.avg_score !== null ? (
                  <span className={`text-[11px] font-semibold ${
                    topic.avg_score >= 70 ? 'text-emerald-600' :
                    topic.avg_score >= 50 ? 'text-amber-600' :
                    'text-red-600'
                  }`}>
                    {topic.avg_score}
                  </span>
                ) : (
                  <span className="text-[10px] text-ink-muted">—</span>
                )}
              </div>

              {/* Trend icon */}
              <div className="w-4 flex-shrink-0">
                {topic.trend === 'improving' && <TrendingUp size={12} className="text-emerald-500" />}
                {topic.trend === 'declining' && <TrendingDown size={12} className="text-red-500" />}
                {topic.trend === 'stable' && <Minus size={12} className="text-ink-muted" />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
