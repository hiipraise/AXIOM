import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { jobsApi, cvApi } from "../../api";
import { useAuthStore } from "../../store/auth";
import { JobResult } from "../../types";
import JobCard from "../../components/jobs/JobCard";
import AppLoading from "../../components/AppLoading";

const PAGE_SIZE = 12;

function quickMatchScore(job: JobResult, tokens: string[]): number | null {
  if (!tokens.length) return null;
  const haystack =
    `${job.title} ${job.company} ${job.description} ${job.category}`.toLowerCase();
  const hits = tokens.filter((t) => haystack.includes(t.toLowerCase())).length;
  return Math.round((hits / tokens.length) * 100);
}

const SOURCES = ["adzuna", "remotive", "arbeitnow", "jsearch", "muse"];

const SORT_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "match-desc", label: "Best match first" },
  { value: "match-asc", label: "Lowest match first" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

export default function JobBoardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // ── Search inputs (live)
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [remote, setRemote] = useState<boolean | "">("");

  // ── Committed search (fires query)
  const [committed, setCommitted] = useState({
    q: "",
    location: "",
    remote: "" as boolean | "",
  });

  // ── Filters / sort (client-side)
  const [sortBy, setSortBy] = useState("default");
  const [sourceFilter, setSourceFilter] = useState("");
  const [page, setPage] = useState(0);

  function commit() {
    setCommitted({ q: query, location, remote });
    setPage(0);
  }

  // ── CV tokens for client-side match scoring
  const { data: cvs = [] } = useQuery({
    queryKey: ["cvs"],
    queryFn: cvApi.list,
    enabled: !!user,
  });
  const primaryCv = cvs[0];
  const tokens = useMemo(() => {
    const skills = primaryCv?.data.skills ?? [];
    const roleBits = [
      primaryCv?.data.target_role,
      primaryCv?.data.personal_info.job_title,
    ].filter(Boolean) as string[];
    return [...skills, ...roleBits]
      .flatMap((v) => v.split(/\s+/))
      .filter(Boolean)
      .slice(0, 20);
  }, [primaryCv]);

  // ── Fetch jobs
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["jobs", committed.q, committed.location, committed.remote],
    queryFn: () =>
      jobsApi.search({
        q: committed.q,
        location: committed.location,
        remote: committed.remote === "" ? null : committed.remote,
        per_page: 60,
      }),
    staleTime: 1000 * 60 * 5,
    placeholderData: (prev) => prev,
  });

  const rawJobs = data?.items ?? [];

  // ── Sources present in results
  const availableSources = useMemo(
    () => [...new Set(rawJobs.map((j) => j.source))],
    [rawJobs],
  );

  // ── Score, filter, sort
  const processed = useMemo(() => {
    let result = rawJobs.map((job) => ({
      job,
      score: user && primaryCv ? quickMatchScore(job, tokens) : null,
    }));

    // Source filter
    if (sourceFilter)
      result = result.filter(({ job }) => job.source === sourceFilter);

    // Sort
    if (sortBy === "match-desc")
      result.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    else if (sortBy === "match-asc")
      result.sort((a, b) => (a.score ?? 101) - (b.score ?? 101));
    else if (sortBy === "newest")
      result.sort(
        (a, b) =>
          new Date(b.job.posted_at).getTime() -
          new Date(a.job.posted_at).getTime(),
      );
    else if (sortBy === "oldest")
      result.sort(
        (a, b) =>
          new Date(a.job.posted_at).getTime() -
          new Date(b.job.posted_at).getTime(),
      );

    return result;
  }, [rawJobs, sortBy, sourceFilter, tokens, user, primaryCv]);

  const totalPages = Math.ceil(processed.length / PAGE_SIZE);
  const paginated = processed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const resetFilters = () => {
    setSortBy("default");
    setSourceFilter("");
    setPage(0);
  };

  return (
    <div className="min-h-screen bg-ash">
      {/* ── Sticky header ── */}
      <header className="border-b border-ash-border bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-ink-muted">
              AXIOM Jobs
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-ink tracking-tight">
              Find roles matched to your CV
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn-secondary"
              onClick={() => navigate(user ? "/dashboard" : "/login")}
            >
              {user ? "Dashboard" : "Sign in"}
            </button>
            {user && (
              <button
                className="btn-primary"
                onClick={() => navigate("/tracker")}
              >
                Tracker
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 lg:py-8">
        {/* ── Search bar ── */}
        <section className="card mb-4 bg-white shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1.4fr_0.9fr_0.7fr_auto]">
            <div>
              <label className="label">Role or keywords</label>
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                />
                <input
                  className="input pl-9"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && commit()}
                  placeholder="Product manager, React, data analyst…"
                />
              </div>
            </div>
            <div>
              <label className="label">Location</label>
              <input
                className="input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && commit()}
                placeholder="London, Berlin, Remote"
              />
            </div>
            <div>
              <label className="label">Remote</label>
              <select
                className="input"
                value={remote as string}
                onChange={(e) =>
                  setRemote(
                    e.target.value === "" ? "" : e.target.value === "true",
                  )
                }
              >
                <option value="">Any</option>
                <option value="true">Remote only</option>
                <option value="false">On-site / hybrid</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                className="btn-primary w-full justify-center"
                onClick={commit}
              >
                <SlidersHorizontal size={14} /> Search
              </button>
            </div>
          </div>
        </section>

        {/* ── Filters row ── */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <select
            className="text-xs border border-ash-border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-ink"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(0);
            }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            className="text-xs border border-ash-border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-ink"
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All sources</option>
            {availableSources.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s}
              </option>
            ))}
          </select>

          {(sortBy !== "default" || sourceFilter) && (
            <button
              className="text-xs text-ink-muted hover:text-ink underline"
              onClick={resetFilters}
            >
              Reset filters
            </button>
          )}

          <div className="ml-auto flex items-center gap-2 text-xs text-ink-muted">
            {isFetching && !isLoading && (
              <span className="animate-pulse">Updating…</span>
            )}
            {!isLoading && (
              <span>
                {processed.length} job{processed.length !== 1 ? "s" : ""}
                {data?.cached && " · cached"}
              </span>
            )}
          </div>
        </div>

        {/* ── Results ── */}
        {isLoading ? (
          <AppLoading message="Searching jobs…" />
        ) : paginated.length > 0 ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {paginated.map(({ job, score }) => (
                <JobCard key={job.id} job={job} matchPercentage={score} />
              ))}
            </section>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  className="btn-ghost p-2"
                  disabled={page === 0}
                  onClick={() => {
                    setPage((p) => Math.max(0, p - 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setPage(i);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`w-8 h-8 text-xs rounded-lg transition-colors ${
                        i === page
                          ? "bg-ink text-white font-medium"
                          : "text-ink-muted hover:bg-ash hover:text-ink"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  className="btn-ghost p-2"
                  disabled={page >= totalPages - 1}
                  onClick={() => {
                    setPage((p) => Math.min(totalPages - 1, p + 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="card mt-2 text-center py-16">
            <p className="text-sm text-ink-muted mb-2">
              No jobs matched this search.
            </p>
            <p className="text-xs text-ink-muted">
              Try broader keywords, different location, or remove filters.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
