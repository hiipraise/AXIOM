import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "../../api";

export default function NotificationList() {
  const { data = [] } = useQuery({ queryKey: ["notifications"], queryFn: notificationsApi.list });
  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.id} className="rounded-lg border border-ash-border bg-white p-3">
          <p className="font-medium text-ink">{item.title}</p>
          <p className="text-sm text-ink-muted">{item.body}</p>
        </div>
      ))}
    </div>
  );
}
