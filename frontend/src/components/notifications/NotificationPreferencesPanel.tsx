import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '../../api'
import {
  Bell,
  BellRing,
  Mail,
  Smartphone,
  Moon,
  Clock,
  Layers,
} from 'lucide-react'
import toast from 'react-hot-toast'

const KIND_LABELS: Record<string, { label: string; desc: string }> = {
  general: { label: 'General', desc: 'Account updates and system messages' },
  application: { label: 'Applications', desc: 'Job application status changes' },
  interview: { label: 'Interview', desc: 'Interview session reminders' },
  review_card: { label: 'Review cards', desc: 'Flashcard review reminders' },
  announcement: { label: 'Announcements', desc: 'Platform announcements from admins' },
}

export default function NotificationPreferencesPanel() {
  const qc = useQueryClient()

  const { data: prefs, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => notificationsApi.preferences(),
  })

  const { data: quietHoursStatus } = useQuery({
    queryKey: ['quiet-hours-status'],
    queryFn: () => notificationsApi.quietHours(),
  })

  const updateMutation = useMutation({
    mutationFn: (body: Parameters<typeof notificationsApi.updatePreferences>[0]) =>
      notificationsApi.updatePreferences(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-preferences'] })
      qc.invalidateQueries({ queryKey: ['quiet-hours-status'] })
      toast.success('Preferences saved')
    },
    onError: () => toast.error('Failed to save preferences'),
  })

  const [pushSupported] = useState(() => 'Notification' in window && 'serviceWorker' in navigator)
  const [pushSubscribed, setPushSubscribed] = useState(false)

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  const pushConfigurable = pushSupported && vapidKey

  const subscribePush = async () => {
    try {
      if (!vapidKey) {
        toast.error('VAPID key not configured — contact the administrator')
        return
      }
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        toast.error('Push permission denied')
        return
      }
      const registration = await navigator.serviceWorker.register('/sw.js').catch(() => null)
      if (!registration) {
        toast.error('Service worker registration failed')
        return
      }
      const applicationServerKey = urlBase64ToUint8Array(vapidKey) as unknown as string
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      }).catch(() => null)
      if (!subscription) {
        toast.error('Push subscription failed — VAPID key may be invalid')
        return
      }
      const subJSON = subscription.toJSON()
      await notificationsApi.subscribePush({
        endpoint: subJSON.endpoint!,
        keys: subJSON.keys as { p256dh: string; auth: string },
      })
      setPushSubscribed(true)
      qc.invalidateQueries({ queryKey: ['notification-preferences'] })
      toast.success('Push notifications enabled')
    } catch (e) {
      toast.error('Push subscription failed')
    }
  }

  const unsubscribePush = async () => {
    try {
      await notificationsApi.unsubscribePush()
      setPushSubscribed(false)
      qc.invalidateQueries({ queryKey: ['notification-preferences'] })
      toast.success('Push notifications disabled')
    } catch {
      toast.error('Failed to unsubscribe')
    }
  }

  const toggleKind = (kind: string, current: boolean) => {
    if (!prefs) return
    updateMutation.mutate({
      ...prefs,
      kinds: { ...prefs.kinds, [kind]: !current },
    })
  }

  const toggleEmail = () => {
    if (!prefs) return
    updateMutation.mutate({ ...prefs, email_notifications: !prefs.email_notifications })
  }

  const togglePush = () => {
    if (!prefs) return
    const newVal = !prefs.push_notifications
    if (newVal && pushSupported) {
      // Subscribe to browser push first, then update preferences
      subscribePush()
    } else if (!newVal) {
      // Update preference + unsubscribe in parallel
      unsubscribePush()
      updateMutation.mutate({ ...prefs, push_notifications: false })
    }
  }

  const toggleQuietHours = () => {
    if (!prefs) return
    updateMutation.mutate({
      ...prefs,
      quiet_hours: { ...prefs.quiet_hours, enabled: !prefs.quiet_hours.enabled },
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Delivery channels */}
      <div>
        <p className="text-xs uppercase tracking-[0.15em] text-ink-muted mb-3 flex items-center gap-2">
          <Bell size={13} /> Delivery channels
        </p>
        <div className="space-y-2">
          {/* Email toggle */}
          <label className="flex items-center justify-between rounded-xl border border-ash-border p-3 cursor-pointer hover:bg-ash/50 transition-colors">
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-ink-muted" />
              <div>
                <p className="text-sm font-medium text-ink">Email notifications</p>
                <p className="text-[11px] text-ink-muted">Delivered via Sendhiiv to your email</p>
              </div>
            </div>
            <button
              onClick={toggleEmail}
              disabled={updateMutation.isPending}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                prefs?.email_notifications ? 'bg-ink' : 'bg-ash-border'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                  prefs?.email_notifications ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>

          {/* Push toggle */}
          <label className="flex items-center justify-between rounded-xl border border-ash-border p-3 cursor-pointer hover:bg-ash/50 transition-colors">
            <div className="flex items-center gap-3">
              <Smartphone size={16} className="text-ink-muted" />
              <div>
                <p className="text-sm font-medium text-ink">Push notifications</p>
                <p className="text-[11px] text-ink-muted">
                  {pushSupported && !vapidKey
                    ? 'Not configured — admin must set VAPID key'
                    : pushSupported
                      ? 'Browser push notifications'
                      : 'Not supported in this browser'}
                </p>
              </div>
            </div>
            <button
              onClick={togglePush}
              disabled={updateMutation.isPending || !pushConfigurable}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                prefs?.push_notifications ? 'bg-ink' : 'bg-ash-border'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                  prefs?.push_notifications ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>
        </div>
      </div>

      {/* Quiet hours */}
      <div>
        <p className="text-xs uppercase tracking-[0.15em] text-ink-muted mb-3 flex items-center gap-2">
          <Moon size={13} /> Quiet hours
        </p>
        <div className="rounded-xl border border-ash-border p-4 space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <Clock size={16} className="text-ink-muted" />
              <div>
                <p className="text-sm font-medium text-ink">Quiet hours</p>
                <p className="text-[11px] text-ink-muted">
                  {prefs?.quiet_hours.start} – {prefs?.quiet_hours.end} UTC
                </p>
              </div>
            </div>
            <button
              onClick={toggleQuietHours}
              disabled={updateMutation.isPending}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                prefs?.quiet_hours.enabled ? 'bg-ink' : 'bg-ash-border'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                  prefs?.quiet_hours.enabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>
          {quietHoursStatus?.active_now && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-xs">
              <Moon size={13} />
              Quiet hours are active — email notifications are being held
            </div>
          )}
        </div>
      </div>

      {/* Per-kind toggles */}
      <div>
        <p className="text-xs uppercase tracking-[0.15em] text-ink-muted mb-3 flex items-center gap-2">
          <Layers size={13} /> Notification types
        </p>
        <div className="space-y-1">
          {Object.entries(KIND_LABELS).map(([kind, { label, desc }]) => (
            <label
              key={kind}
              className="flex items-center justify-between rounded-xl border border-ash-border p-3 cursor-pointer hover:bg-ash/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{label}</p>
                  <p className="text-[11px] text-ink-muted truncate">{desc}</p>
                </div>
              </div>
              <button
                onClick={() => toggleKind(kind, prefs?.kinds[kind] ?? true)}
                disabled={updateMutation.isPending}
                className={`relative w-10 h-5 rounded-full flex-shrink-0 transition-colors ${
                  prefs?.kinds[kind] ?? true ? 'bg-ink' : 'bg-ash-border'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                    prefs?.kinds[kind] ?? true ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>
          ))}
        </div>
      </div>

      {/* Review-due check */}
      <ReviewDueCheck />
    </div>
  )
}

function ReviewDueCheck() {
  const [checking, setChecking] = useState(false)

  const check = async () => {
    setChecking(true)
    try {
      const result = await notificationsApi.checkReviewDue()
      if (result.notified) {
        toast.success(`Notified about ${result.due_count} due card${result.due_count !== 1 ? 's' : ''}`)
      } else if (result.due_count > 0) {
        toast(`Already notified about ${result.due_count} due card${result.due_count !== 1 ? 's' : ''}`, { icon: '🔔' })
      } else {
        toast("No review cards due — you're all caught up!", { icon: '✅' })
      }
    } catch {
      toast.error('Failed to check due cards')
    } finally {
      setChecking(false)
    }
  }

  return (
    <button
      onClick={check}
      disabled={checking}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-ash-border text-xs text-ink-muted hover:text-ink hover:border-ink transition-colors disabled:opacity-50"
    >
      {checking ? (
        <div className="w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin" />
      ) : (
        <BellRing size={13} />
      )}
      Check for due review cards
    </button>
  )
}

// Utility: base64 VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i)
  }
  return output
}
