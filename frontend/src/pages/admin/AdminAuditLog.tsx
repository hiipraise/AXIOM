import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../../api";

interface AuditLogEntry {
  id: string;
  actor_id: string;
  action: string;
  target: string;
  ts: string;
}

export default function AdminAuditLog() {
  const { data, isLoading } = useQuery<{
    entries: AuditLogEntry[];
    total: number;
  }>({
    queryKey: ["admin-audit-log"],
    queryFn: () => adminApi.auditLog(),
  });

  return (
    <div className="p-8">
      <h1 className="font-display text-2xl font-bold text-ink mb-1">
        Audit log
      </h1>
      <p className="text-sm text-ink-muted mb-6">
        {data?.total ?? 0} events
      </p>

      <div className="bg-white border border-ash-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ash-border bg-ash">
              <th className="text-left text-xs font-medium text-ink-muted px-4 py-3">
                Actor
              </th>
              <th className="text-left text-xs font-medium text-ink-muted px-4 py-3">
                Action
              </th>
              <th className="text-left text-xs font-medium text-ink-muted px-4 py-3">
                Target
              </th>
              <th className="text-left text-xs font-medium text-ink-muted px-4 py-3">
                Timestamp
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td
                  colSpan={4}
                  className="text-center py-8 text-sm text-ink-muted"
                >
                  Loading...
                </td>
              </tr>
            )}
            {data?.entries.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-ash-border last:border-0 hover:bg-ash/50 transition-colors"
              >
                <td className="px-4 py-3 text-xs font-mono text-ink-muted">
                  {entry.actor_id}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-ink">
                  {entry.action}
                </td>
                <td className="px-4 py-3 text-xs font-mono text-ink-muted">
                  {entry.target}
                </td>
                <td className="px-4 py-3 text-xs text-ink-muted">
                  {new Date(entry.ts).toLocaleString()}
                </td>
              </tr>
            ))}
            {!isLoading && data?.entries.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="text-center py-8 text-sm text-ink-muted"
                >
                  No audit events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
