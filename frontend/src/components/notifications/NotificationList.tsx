import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "../../api";

export default function NotificationList() {
  const { data = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsApi.list,
  });

  return (
    <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
      {data.map((item) => (
        <div
          key={item.id}
          className="rounded-lg border border-ash-border bg-white p-3"
        >
          <p className="font-medium text-ink">{item.title}</p>
          <p className="text-sm text-ink-muted">{item.body}</p>
        </div>
      ))}
      {!data.length && (
        <p className="py-8 text-center text-sm text-ink-muted">
          No notifications yet
        </p>
      )}
    </div>
  );
}