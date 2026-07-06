import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../../api";
import { ChevronLeft, ChevronRight, ChevronFirst, ChevronLast } from "lucide-react";

interface AuditLogEntry {
  id: string;
  actor_id: string;
  action: string;
  target: string;
  ts: string;
}

const PAGE_SIZE = 50;
import Seo from "../../components/Seo";

export default function AdminAuditLog() {
  const [skip, setSkip] = useState(0);

  const { data, isLoading } = useQuery<{
    entries: AuditLogEntry[];
    total: number;
  }>({
    queryKey: ["admin-audit-log", skip],
    queryFn: () => adminApi.auditLog(skip, PAGE_SIZE),
    placeholderData: (prev) => prev,
  });

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;
  const page = Math.floor(skip / PAGE_SIZE);
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const hasPrev = skip > 0;
  const hasNext = skip + PAGE_SIZE < total;

  const goTo = (newSkip: number) => {
    setSkip(newSkip);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="p-8">
      <Seo title="Admin Audit Log" noindex />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            Audit log
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {total} event{total !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Pagination controls */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-ink-muted mr-2">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => goTo(0)}
            disabled={!hasPrev}
            className="p-1.5 rounded-lg hover:bg-ash disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="First page"
          >
            <ChevronFirst size={15} />
          </button>
          <button
            onClick={() => goTo(skip - PAGE_SIZE)}
            disabled={!hasPrev}
            className="p-1.5 rounded-lg hover:bg-ash disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => goTo(skip + PAGE_SIZE)}
            disabled={!hasNext}
            className="p-1.5 rounded-lg hover:bg-ash disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <ChevronRight size={15} />
          </button>
          <button
            onClick={() => goTo((totalPages - 1) * PAGE_SIZE)}
            disabled={!hasNext}
            className="p-1.5 rounded-lg hover:bg-ash disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Last page"
          >
            <ChevronLast size={15} />
          </button>
        </div>
      </div>

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
            {isLoading && !data && (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={4} className="px-4 py-3">
                    <div className="flex items-center gap-4">
                      <div className="h-4 w-20 rounded bg-ash-dark" />
                      <div className="h-4 w-32 rounded bg-ash-dark" />
                      <div className="h-4 w-24 rounded bg-ash-dark" />
                      <div className="h-4 w-28 rounded bg-ash-dark" />
                    </div>
                  </td>
                </tr>
              ))
            )}
            {entries.map((entry) => (
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
            {!isLoading && entries.length === 0 && (
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

      {/* Bottom pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-ink-muted">
            Showing {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => goTo(0)}
              disabled={!hasPrev}
              className="p-1.5 rounded-lg hover:bg-ash disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronFirst size={15} />
            </button>
            <button
              onClick={() => goTo(skip - PAGE_SIZE)}
              disabled={!hasPrev}
              className="p-1.5 rounded-lg hover:bg-ash disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs text-ink-muted px-2">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => goTo(skip + PAGE_SIZE)}
              disabled={!hasNext}
              className="p-1.5 rounded-lg hover:bg-ash disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={15} />
            </button>
            <button
              onClick={() => goTo((totalPages - 1) * PAGE_SIZE)}
              disabled={!hasNext}
              className="p-1.5 rounded-lg hover:bg-ash disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLast size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
