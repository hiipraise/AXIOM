import { AlertTriangle, Shield, Brain, TrendingDown, Activity } from 'lucide-react'

interface AnomalyAlert {
  id: string
  severity: 'high' | 'medium' | 'low'
  icon: React.ComponentType<{ size?: string | number; className?: string }>
  title: string
  description: string
}

interface AnomalyAlertsProps {
  securityStats?: {
    total_failed_logins: number
    daily_failed: { date: string; count: number }[]
    top_failed_usernames: { username: string; count: number }[]
    total_other_events: number
    unique_ips_30d: number
  }
  aiStats?: {
    total_calls: number
    error_rate: number
    daily: { date: string; calls: number; failed: number }[]
    feature_breakdown: { feature: string; calls: number }[]
  }
  engagementStats?: {
    active_users_30d: number
    total_feedback: number
  }
  daily?: { views: number; sessions: number }[]
}

export default function AnomalyAlerts({
  securityStats,
  aiStats,
  engagementStats,
  daily,
}: AnomalyAlertsProps) {
  const alerts: AnomalyAlert[] = []

  // ── Security anomalies ──
  if (securityStats) {
    const recentDaily = securityStats.daily_failed.slice(-3)
    const avgRecent = recentDaily.length
      ? recentDaily.reduce((s, d) => s + d.count, 0) / recentDaily.length
      : 0

    if (avgRecent >= 10) {
      alerts.push({
        id: 'brute-force',
        severity: 'high',
        icon: Shield,
        title: 'Possible brute-force attack',
        description: `Average ${Math.round(avgRecent)} failed logins/day over the last ${recentDaily.length} days. Top target: "${securityStats.top_failed_usernames[0]?.username || 'unknown'}" (${securityStats.top_failed_usernames[0]?.count || 0} attempts).`,
      })
    }

    if (securityStats.total_other_events > 0) {
      alerts.push({
        id: 'security-other',
        severity: 'medium',
        icon: AlertTriangle,
        title: 'Non-login security events detected',
        description: `${securityStats.total_other_events} other security events recorded. Review the audit log for details.`,
      })
    }
  }

  // ── AI anomalies ──
  if (aiStats) {
    if (aiStats.error_rate > 10) {
      alerts.push({
        id: 'ai-error-rate',
        severity: aiStats.error_rate > 20 ? 'high' : 'medium',
        icon: Brain,
        title: 'High AI error rate',
        description: `AI calls failing at ${aiStats.error_rate}% rate. Total calls: ${aiStats.total_calls}. Check upstream API status.`,
      })
    }

    if (aiStats.total_calls === 0) {
      alerts.push({
        id: 'ai-no-usage',
        severity: 'low',
        icon: Brain,
        title: 'No AI usage detected',
        description: 'No AI calls recorded. Users may not be engaging with AI features.',
      })
    }
  }

  // ── Traffic anomalies ──
  if (daily && daily.length >= 3) {
    const recent = daily.slice(-3)
    const avgViews = recent.reduce((s, d) => s + d.views, 0) / recent.length

    if (avgViews === 0 && engagementStats?.active_users_30d === 0) {
      alerts.push({
        id: 'zero-traffic',
        severity: 'high',
        icon: TrendingDown,
        title: 'Zero traffic detected',
        description: 'No page views in the last 3 days and no active users in 30 days.',
      })
    } else if (avgViews === 0) {
      alerts.push({
        id: 'low-traffic',
        severity: 'medium',
        icon: Activity,
        title: 'Traffic drop off',
        description: 'No page views recorded in the last 3 days despite active users. Possible tracking issue.',
      })
    }
  }

  if (!alerts.length) {
    // Data loaded but no issues detected — show all-clear state
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-ink-muted" />
          <p className="text-xs font-semibold text-ink">Alerts</p>
        </div>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold">All clear</p>
            <p className="text-[11px] mt-0.5 opacity-80">No anomalies detected in the last 30 days.</p>
          </div>
        </div>
      </div>
    )
  }

  const SEV_COLORS = {
    high: 'bg-red-50 border-red-200 text-red-700',
    medium: 'bg-amber-50 border-amber-200 text-amber-700',
    low: 'bg-blue-50 border-blue-200 text-blue-700',
  }

  const SEV_DOT = {
    high: 'bg-red-500',
    medium: 'bg-amber-500',
    low: 'bg-blue-500',
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className="text-ink-muted" />
        <p className="text-xs font-semibold text-ink">Alerts</p>
      </div>
      {alerts.map((a) => (
        <div
          key={a.id}
          className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border ${SEV_COLORS[a.severity]}`}
        >
          <span className={`w-2 h-2 rounded-full mt-0.5 flex-shrink-0 ${SEV_DOT[a.severity]}`} />
          <div className="min-w-0">
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <a.icon size={12} />
              {a.title}
            </p>
            <p className="text-[11px] mt-0.5 opacity-80">{a.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
