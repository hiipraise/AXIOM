import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { interviewApi } from "../../api";
import { InterviewSessionListItem } from "../../types";
import {
  Brain,
  Search,
  Clock,
  CheckCircle2,
  Play,
  RotateCcw,
  BarChart3,
  Pause,
  XCircle,
  ChevronDown,
  Filter,
  ExternalLink,
  Trophy,
} from "lucide-react";

const STATUS_OPTS = [
  { value: "", label: "All sessions" },
  { value: "completed", label: "Completed" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "abandoned", label: "Abandoned" },
];

const MODE_OPTS = [
  { value: "", label: "All modes" },
  { value: "behavioural", label: "Behavioural" },
  { value: "technical", label: "Technical" },
  { value: "full", label: "Full" },
];

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  completed: { label: "Completed", classes: "bg-emerald-50 text-emerald-700" },
  active: { label: "Active", classes: "bg-blue-50 text-blue-700" },
  paused: { label: "Paused", classes: "bg-amber-50 text-amber-700" },
  abandoned: { label: "Abandoned", classes: "bg-ash text-ink-muted" },
};

const STATUS_ICON: Record<string, typeof CheckCircle2> = {
  completed: CheckCircle2,
  active: Play,
  paused: Pause,
  abandoned: XCircle,
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

import Seo from "../../components/Seo";

export default function InterviewHistoryPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const PER_PAGE = 20;

  const { data: allSessions = [], isLoading } = useQuery<InterviewSessionListItem[]>({
    queryKey: ["interview-all-sessions", statusFilter],
    queryFn: () =>
      interviewApi.allSessions({
        status: statusFilter || undefined,
        limit: 100,
      }),
  });

  const filtered = useMemo(() => {
    let items = allSessions;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (s) =>
          (s.job_title || "").toLowerCase().includes(q) ||
          (s.company || "").toLowerCase().includes(q) ||
          s.mode.toLowerCase().includes(q) ||
          s.status.toLowerCase().includes(q),
      );
    }
    if (modeFilter) {
      items = items.filter((s) => s.mode === modeFilter);
    }
    return items;
  }, [allSessions, search, modeFilter]);

  const paginated = useMemo(() => {
    const start = page * PER_PAGE;
    return filtered.slice(start, start + PER_PAGE);
  }, [filtered, page]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));

  // Stats
  const stats = useMemo(() => {
    const total = allSessions.length;
    const completed = allSessions.filter((s) => s.status === "completed").length;
    const avgScore = allSessions
      .filter((s) => s.overall_score != null)
      .reduce((sum, s) => sum + (s.overall_score || 0), 0);
    const scoredCount = allSessions.filter((s) => s.overall_score != null).length;
    return {
      total,
      completed,
      avgScore: scoredCount > 0 ? Math.round(avgScore / scoredCount) : null,
      paused: allSessions.filter((s) => s.status === "paused").length,
    };
  }, [allSessions]);

  return (
    <div className="min-h-screen bg-ash">
      <Seo title="Interview History" noindex />
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-ink-muted mb-1">
                <Brain size={15} /> Interview History
              </p>
              <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
                All sessions
              </h1>
            </div>
            <Link
              to="/interview"
              className="btn-primary"
            >
              <Play size={14} /> New interview
            </Link>
          </div>

          {/* Stats bar */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-white border border-ash-border p-4">
              <p className="text-xs text-ink-muted">Total sessions</p>
              <p className="mt-1 text-2xl font-bold text-ink">{stats.total}</p>
            </div>
            <div className="rounded-2xl bg-white border border-ash-border p-4">
              <p className="text-xs text-ink-muted">Completed</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{stats.completed}</p>
            </div>
            <div className="rounded-2xl bg-white border border-ash-border p-4">
              <p className="text-xs text-ink-muted">Avg score</p>
              <p className="mt-1 text-2xl font-bold text-ink">
                {stats.avgScore != null ? `${stats.avgScore}/100` : "—"}
              </p>
            </div>
            <div className="rounded-2xl bg-white border border-ash-border p-4">
              <p className="text-xs text-ink-muted">Paused</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{stats.paused}</p>
            </div>
          </div>
        </div>

        {/* Search + filters */}
        <div className="card mb-6 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search by role, company, mode..."
                className="input pl-9 h-9 text-sm"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-medium transition-colors ${
                showFilters || modeFilter
                  ? "border-ink bg-ink text-white"
                  : "border-ash-border text-ink-muted hover:border-ink hover:text-ink"
              }`}
            >
              <Filter size={13} />
              Filters
              <ChevronDown size={12} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-ash-border">
              <select
                className="input text-xs h-8 py-0 w-32"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
              >
                {STATUS_OPTS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                className="input text-xs h-8 py-0 w-32"
                value={modeFilter}
                onChange={(e) => {
                  setModeFilter(e.target.value);
                  setPage(0);
                }}
              >
                {MODE_OPTS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {(statusFilter || modeFilter || search) && (
                <button
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("");
                    setModeFilter("");
                    setPage(0);
                  }}
                  className="text-[10px] text-ink-muted underline hover:text-ink"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Session list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-ink border-t-transparent rounded-full animate-spin" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-16">
            <Brain size={32} className="mx-auto text-ink-muted mb-3" />
            <p className="text-sm text-ink-muted">
              {search || statusFilter || modeFilter
                ? "No sessions match your filters."
                : "No interview sessions yet."}
            </p>
            <p className="text-xs text-ink-muted mt-1">
              Start a practice session to build your history.
            </p>
            {!search && !statusFilter && !modeFilter && (
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
            {paginated.map((session) => {
              const Icon = STATUS_ICON[session.status] || Clock;
              const badge = STATUS_BADGE[session.status] || STATUS_BADGE.abandoned;

              return (
                <Link
                  key={session.id}
                  to={
                    session.status === "completed"
                      ? `/interview/${session.id}/review`
                      : `/interview/${session.id}`
                  }
                  className="block card p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-ink truncate">
                          {session.job_title || "Mock interview"}
                        </h3>
                        {session.company && (
                          <span className="text-xs text-ink-muted">· {session.company}</span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.classes}`}>
                          <Icon size={10} />
                          {badge.label}
                        </span>
                        <span className="capitalize">{session.mode}</span>
                        <span>{session.answered_count}/{session.question_count} answered</span>
                        <span>{fmtDate(session.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {session.overall_score != null && (
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-lg font-bold text-ink">
                            <Trophy size={14} className="text-amber-500" />
                            {session.overall_score}
                          </div>
                          <p className="text-[10px] text-ink-muted">/100</p>
                        </div>
                      )}
                      <ExternalLink size={14} className="text-ink-muted" />
                    </div>
                  </div>
                </Link>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 rounded-lg border border-ash-border text-xs text-ink-muted hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-xs text-ink-muted">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 rounded-lg border border-ash-border text-xs text-ink-muted hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}

            <p className="text-center text-xs text-ink-muted pt-2">
              Showing {paginated.length} of {filtered.length} session{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
