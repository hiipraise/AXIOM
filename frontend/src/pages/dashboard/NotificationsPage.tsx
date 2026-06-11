import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { notificationsApi } from "../../api";
import { NotificationItem } from "../../types";

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data: notifications = [], isLoading } = useQuery<NotificationItem[]>({
    queryKey: ["notifications"],
    queryFn: notificationsApi.list,
  });

  const readAll = useMutation({
    mutationFn: notificationsApi.readAll,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const readOne = useMutation({
    mutationFn: (id: string) => notificationsApi.read(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-ash">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-ink-muted mt-0.5">{unreadCount} unread</p>
            )}
          </div>
          {unreadCount > 0 && (
            <button className="btn-secondary text-xs" onClick={() => readAll.mutate()}>
              <CheckCheck size={13} /> Mark all read
            </button>
          )}
        </div>

        {isLoading && <p className="text-sm text-ink-muted">Loading…</p>}

        {!isLoading && notifications.length === 0 && (
          <div className="card text-center py-16">
            <Bell size={28} className="mx-auto text-ink-muted/30 mb-3" />
            <p className="text-sm text-ink-muted">No notifications yet</p>
          </div>
        )}

        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`card !p-4 flex items-start gap-4 ${!n.read ? "border-ink/20 bg-white" : "bg-ash/40"}`}
            >
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.read ? "bg-ink" : "bg-ash-border"}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!n.read ? "font-semibold text-ink" : "text-ink-muted"}`}>{n.title}</p>
                {n.body && <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">{n.body}</p>}
                <p className="text-[10px] text-ink-muted mt-1">
                  {new Date(n.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {n.link && (
                  <Link to={n.link} className="text-xs text-ink underline hover:no-underline">
                    View
                  </Link>
                )}
                {!n.read && (
                  <button className="text-ink-muted hover:text-ink" onClick={() => readOne.mutate(n.id)}>
                    <Check size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}