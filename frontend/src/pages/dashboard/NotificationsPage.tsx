import { useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Bell, Check, CheckCheck, ChevronDown, Settings2 } from "lucide-react";
import { Link } from "react-router-dom";
import { notificationsApi } from "../../api";
import { NotificationItem } from "../../types";
import NotificationPreferencesPanel from "../../components/notifications/NotificationPreferencesPanel";

const PAGE_SIZE = 50;

/** Day boundaries for grouping: today vs yesterday vs this week vs older. */
function getDateGroup(dateStr: string): { label: string; sortKey: string } {
  const now = new Date();
  const d = new Date(dateStr);

  // Start of today, yesterday, this week (Monday), last week (Monday of previous week)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  // Monday of this week
  const dayOfWeek = todayStart.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday → last Monday
  const thisWeekStart = new Date(todayStart);
  thisWeekStart.setDate(thisWeekStart.getDate() + mondayOffset);

  // Monday of last week
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  // Sort key: days since epoch (descending = most recent first in group order)
  const daysSinceEpoch = Math.floor(d.getTime() / 86_400_000);

  if (d >= todayStart)
    return { label: "Today", sortKey: `0-${daysSinceEpoch}` };
  if (d >= yesterdayStart)
    return { label: "Yesterday", sortKey: `1-${daysSinceEpoch}` };
  if (d >= thisWeekStart)
    return { label: "This week", sortKey: `2-${daysSinceEpoch}` };
  if (d >= lastWeekStart)
    return { label: "Last week", sortKey: `3-${daysSinceEpoch}` };
  // Older: format as "17 June 2026"
  const formatted = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return { label: formatted, sortKey: `4-${daysSinceEpoch}` };
}

import Seo from "../../components/Seo";

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [showPrefs, setShowPrefs] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data: notifications = [], isLoading } = useQuery<NotificationItem[]>({
    queryKey: ["notifications", limit],
    queryFn: () => notificationsApi.list(0, limit),
    placeholderData: keepPreviousData,
  });

  const { data: total = 0 } = useQuery<number>({
    queryKey: ["notifications-count"],
    queryFn: notificationsApi.count,
    staleTime: 30_000,
  });

  const readAll = useMutation({
    mutationFn: notificationsApi.readAll,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const readOne = useMutation({
    mutationFn: (id: string) => notificationsApi.read(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  const hasMore = notifications.length < total;

  const handleLoadOlder = () => setLimit((l) => l + PAGE_SIZE);

  return (
    <div className="min-h-screen bg-ash">
      <Seo title="Notifications" noindex />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-ink-muted mt-0.5">
                {unreadCount} unread
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`text-xs btn ${showPrefs ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setShowPrefs(!showPrefs)}
            >
              <Settings2 size={13} /> {showPrefs ? "Hide" : "Preferences"}
            </button>
            {unreadCount > 0 && (
              <button
                className="btn-secondary text-xs"
                onClick={() => readAll.mutate()}
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>
        </div>

        {isLoading && limit === PAGE_SIZE && (
          <div
            className="space-y-2"
            role="status"
            aria-label="Loading notifications"
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="card !p-4 flex items-start gap-4 animate-pulse"
              >
                <div className="w-2 h-2 rounded-full bg-ash-dark mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="h-4 w-3/5 rounded bg-ash-dark mb-2" />
                  <div className="h-3 w-4/5 rounded bg-ash-dark mb-1" />
                  <div className="h-2 w-1/4 rounded bg-ash-dark" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="card text-center py-16">
            <Bell size={28} className="mx-auto text-ink-muted/30 mb-3" />
            <p className="text-sm text-ink-muted">No notifications yet</p>
          </div>
        )}

        {/* Preferences panel */}
        {showPrefs && (
          <div className="card p-5 mb-6">
            <h2 className="text-sm font-semibold text-ink mb-4">
              Notification preferences
            </h2>
            <NotificationPreferencesPanel />
          </div>
        )}

        <div className="space-y-6">
          {(() => {
            // Group notifications by date label, preserving order
            const groups: {
              label: string;
              sortKey: string;
              items: NotificationItem[];
            }[] = [];
            const groupMap = new Map<
              string,
              { label: string; sortKey: string; items: NotificationItem[] }
            >();

            for (const n of notifications) {
              const { label, sortKey } = getDateGroup(n.created_at);
              let g = groupMap.get(label);
              if (!g) {
                g = { label, sortKey, items: [] };
                groupMap.set(label, g);
                groups.push(g);
              }
              g.items.push(n);
            }

            // Sort groups: prefix ascending (0=today … 4=older), suffix descending (most-recent date first)
            groups.sort((a, b) => {
              const aPrefix = a.sortKey.charAt(0);
              const bPrefix = b.sortKey.charAt(0);
              if (aPrefix !== bPrefix) return aPrefix < bPrefix ? -1 : 1;
              const aSuffix = parseInt(a.sortKey.slice(2), 10);
              const bSuffix = parseInt(b.sortKey.slice(2), 10);
              return bSuffix - aSuffix; // descending: higher daysSinceEpoch = more recent
            });

            return groups.map((group) => (
              <div key={group.label}>
                <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-ash/80 backdrop-blur-sm border-b border-ash-border mb-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                    {group.label}
                  </span>
                  <span className="ml-2 text-[10px] text-ink-muted/60">
                    {group.items.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.items.map((n) => (
                    <div
                      key={n.id}
                      className={`card !p-4 flex items-start gap-4 ${!n.read ? "border-ink/20 bg-white" : "bg-ash/40"}`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.read ? "bg-ink" : "bg-ash-border"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm ${!n.read ? "font-semibold text-ink" : "text-ink-muted"}`}
                        >
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
                            {n.body}
                          </p>
                        )}
                        <p className="text-[10px] text-ink-muted mt-1">
                          {new Date(n.created_at).toLocaleString("en-GB", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {n.link && (
                          <Link
                            to={n.link}
                            className="text-xs text-ink underline hover:no-underline"
                          >
                            View
                          </Link>
                        )}
                        {!n.read && (
                          <button
                            className="text-ink-muted hover:text-ink"
                            onClick={() => readOne.mutate(n.id)}
                          >
                            <Check size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>

        {/* Pagination: load older */}
        {hasMore && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <button
              className="btn-secondary text-xs"
              onClick={handleLoadOlder}
              disabled={isLoading}
            >
              <ChevronDown size={13} />
              Load older
            </button>
            <p className="text-[10px] text-ink-muted">
              Showing {notifications.length} of {total}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
