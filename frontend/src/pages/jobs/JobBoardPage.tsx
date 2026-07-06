import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CloudOff,
  WifiOff,
} from "lucide-react";
import { jobsApi, cvApi } from "../../api";
import { useAuthStore } from "../../store/auth";
import { CV, JobResult } from "../../types";
import JobCard from "../../components/jobs/JobCard";
import { useAnnouncement } from "../../context/announcement";
import { EmptySearch } from "../../components/UI/EmptyState";
import { NIGERIA_STATES } from "../../lib/nigeriaStates";

const PAGE_SIZE = 12;

function quickMatchScore(job: JobResult, tokens: string[]): number | null {
  if (!tokens.length) return null;
  const haystack =
    `${job.title} ${job.company} ${job.description} ${job.category}`.toLowerCase();
  const hits = tokens.filter((t) => haystack.includes(t.toLowerCase())).length;
  return Math.round((hits / tokens.length) * 100);
}

const SORT_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "match-desc", label: "Best match first" },
  { value: "match-asc", label: "Lowest match first" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

function JobBoardSkeleton() {
  return (
    <section
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      aria-label="Loading jobs"
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-ash-border bg-white p-4 animate-pulse"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="h-3 w-20 rounded bg-ash-dark" />
            <div className="h-3 w-14 rounded bg-ash-dark" />
          </div>
          <div className="h-5 w-5/6 rounded bg-ash-dark mb-2" />
          <div className="h-3 w-1/2 rounded bg-ash-dark mb-5" />
          <div className="space-y-2">
            <div className="h-3 rounded bg-ash-dark" />
            <div className="h-3 w-11/12 rounded bg-ash-dark" />
            <div className="h-3 w-3/4 rounded bg-ash-dark" />
          </div>
          <div className="mt-5 h-8 rounded-lg bg-ash-dark" />
        </div>
      ))}
    </section>
  );
}
import Seo from "../../components/Seo";

export default function JobBoardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { bannerH } = useAnnouncement();

  // ── Search inputs (live)
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [remote, setRemote] = useState<boolean | "">("");
  const [region, setRegion] = useState("");
  const [nigeriaState, setNigeriaState] = useState("");

  // ── Committed search (fires query)
  const [committed, setCommitted] = useState({
    q: "",
    location: "",
    remote: "" as boolean | "",
    region: "",
    nigeria_state: "",
  });

  // ── Filters / sort (client-side)
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState("default");
  const [sourceFilter, setSourceFilter] = useState("");
  const [useCvMatch, setUseCvMatch] = useState(false);
  const [page, setPage] = useState(() => {
    const p = searchParams.get("page");
    return p ? parseInt(p, 10) : 0;
  });

  // Track if we're actually initializing from URL vs setting from within the component
  const isInitialUrlLoad = useRef(true);
  // On first load, if page came from URL, mark it as already synced so we don't write back
  useEffect(() => {
    if (isInitialUrlLoad.current) {
      isInitialUrlLoad.current = false;
    }
  }, []);

  // Sync page changes to URL (but not on initial load to avoid loops)
  useEffect(() => {
    if (!isInitialUrlLoad.current) {
      if (page === 0) {
        searchParams.delete("page");
      } else {
        searchParams.set("page", page.toString());
      }
      setSearchParams(searchParams);
    }
  }, [page]);

  function commit() {
    setCommitted({
      q: query,
      location,
      remote,
      region,
      nigeria_state: nigeriaState,
    });
    setPage(0);
  }

  // ── CV tokens for client-side match scoring
  const { data: cvData } = useQuery<{ cvs: CV[]; total: number }>({
    queryKey: ["cvs"],
    queryFn: () => cvApi.list(),
    enabled: !!user,
  });
  const cvs = cvData?.cvs ?? [];
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

  const cvSearch = useMemo(() => {
    const parts = [
      primaryCv?.data.target_role,
      primaryCv?.data.personal_info.job_title,
      ...(primaryCv?.data.skills ?? []).slice(0, 4),
    ].filter(Boolean) as string[];
    return [...new Set(parts)].join(" ");
  }, [primaryCv]);

  function applyCvSearch() {
    if (!cvSearch) return;
    setUseCvMatch(true);
    setQuery(cvSearch);
    setCommitted({
      q: cvSearch,
      location,
      remote,
      region,
      nigeria_state: nigeriaState,
    });
    setSortBy("match-desc");
    setPage(0);
  }

  function clearCvSearch() {
    setUseCvMatch(false);
    if (query === cvSearch) {
      setQuery("");
      setCommitted({
        q: "",
        location,
        remote,
        region,
        nigeria_state: nigeriaState,
      });
    }
    if (sortBy.startsWith("match")) setSortBy("default");
    setPage(0);
  }

  // ── Fetch jobs
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: [
      "jobs",
      committed.q,
      committed.location,
      committed.remote,
      committed.region,
      committed.nigeria_state,
    ],
    queryFn: () =>
      jobsApi.search({
        q: committed.q,
        location: committed.location,
        remote: committed.remote === "" ? null : committed.remote,
        region: committed.region,
        nigeria_state: committed.nigeria_state,
        per_page: 60,
      }),
    staleTime: 0, // Job listings need fresh data for accurate availability
    placeholderData: (prev) => prev,
  });

  const rawJobs = data?.items ?? [];
  const sourceHealth = data?.source_health;
  const isSearching = isFetching || isLoading;

  // ── Provider health flags
  const providersAllFailed = useMemo(
    () =>
      sourceHealth !== undefined &&
      sourceHealth.configured > 0 &&
      sourceHealth.succeeded === 0 &&
      !isSearching,
    [sourceHealth, isSearching],
  );

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
  }, [rawJobs, sortBy, sourceFilter, tokens, user, primaryCv, useCvMatch]);

  const totalPages = Math.ceil(processed.length / PAGE_SIZE);
  const paginated = processed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const resetFilters = () => {
    setSortBy("default");
    setSourceFilter("");
    setPage(0);
  };

  return (
    <div className="min-h-screen bg-ash">
      <Seo title="Job Search" noindex />
      {/* ── Sticky header ── */}
      <header
        className="border-b border-ash-border bg-white/80 backdrop-blur-sm sticky z-20"
        style={{
          top: bannerH,
          transition: "top 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-ink-muted">
              AXIOM Jobs
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-ink tracking-tight">
              Find roles across AXIOM
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
                onClick={() => navigate("/saved-jobs")}
              >
                Saved Jobs
              </button>
            )}
          </div>
        </div>
      </header>

      <main
        className="mx-auto max-w-6xl px-4 py-6 lg:py-8"
        style={{ paddingTop: `calc(1.5rem + ${bannerH}px)` }}
      >
        {/* ── Search bar ── */}
        <section className="card mb-4 bg-white shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1.3fr_0.85fr_0.65fr_0.65fr_auto]">
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
              <label className="label">Region</label>
              <select
                className="input"
                value={region}
                onChange={(e) => {
                  setRegion(e.target.value);
                  if (e.target.value !== "nigeria") setNigeriaState("");
                }}
              >
                <option value="">All</option>
                <option value="nigeria">Nigeria</option>
                <option value="africa">Africa</option>
              </select>
            </div>
            {region === "nigeria" && (
              <div>
                <label className="label">State</label>
                <select
                  className="input"
                  value={nigeriaState}
                  onChange={(e) => setNigeriaState(e.target.value)}
                >
                  <option value="">All states</option>
                  {NIGERIA_STATES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
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

        {user && primaryCv && (
          <section className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ash-border bg-white px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink">
                Use your CV for matching
              </p>
              <p className="text-xs text-ink-muted">
                {useCvMatch
                  ? `Searching with: ${cvSearch || "your CV"}`
                  : "Start with all jobs, then switch on CV-aware search when you want it."}
              </p>
            </div>
            <button
              className={useCvMatch ? "btn-secondary" : "btn-primary"}
              onClick={useCvMatch ? clearCvSearch : applyCvSearch}
              disabled={!cvSearch || isSearching}
            >
              {isSearching
                ? "Searching…"
                : useCvMatch
                  ? "Show all jobs"
                  : "Use my CV"}
            </button>
          </section>
        )}

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

        {/* ── Source health warning ── */}
        {sourceHealth?.warning && !isLoading && !providersAllFailed && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <AlertTriangle
              size={14}
              className="mt-0.5 flex-shrink-0 text-amber-500"
            />
            <span>{sourceHealth.warning}</span>
          </div>
        )}

        {/* ── Results ── */}
        {isLoading ? (
          <JobBoardSkeleton />
        ) : isError ? (
          <div className="card text-center py-12">
            <WifiOff
              size={36}
              className="mx-auto mb-3 text-ink-muted"
            />
            <p className="text-sm font-medium text-ink">
              Could not connect to the job service
            </p>
            <p className="mt-1 text-xs text-ink-muted max-w-sm mx-auto">
              The server may be starting up or experiencing a temporary
              outage. Results may appear once the connection is restored.
            </p>
            <button className="btn-secondary mt-5" onClick={() => refetch()}>
              Retry
            </button>
          </div>
        ) : providersAllFailed && paginated.length === 0 ? (
          <div className="card text-center py-12">
            <CloudOff
              size={36}
              className="mx-auto mb-3 text-amber-500"
            />
            <p className="text-sm font-medium text-ink">
              External job sources are unavailable
            </p>
            <p className="mt-1 text-xs text-ink-muted max-w-sm mx-auto">
              {sourceHealth?.warning ||
                "All job boards are temporarily unresponsive. Try again later or check your internet connection."}
            </p>
            <button className="btn-secondary mt-5" onClick={() => refetch()}>
              Retry
            </button>
          </div>
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
                  {(() => {
                    const delta = 2;
                    const range: (number | "...")[] = [];
                    const left = Math.max(0, page - delta);
                    const right = Math.min(totalPages - 1, page + delta);

                    if (left > 0) {
                      range.push(0);
                      if (left > 1) range.push("...");
                    }
                    for (let i = left; i <= right; i++) range.push(i);
                    if (right < totalPages - 1) {
                      if (right < totalPages - 2) range.push("...");
                      range.push(totalPages - 1);
                    }

                    return range.map((item, idx) =>
                      item === "..." ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="w-8 h-8 flex items-center justify-center text-xs text-ink-muted"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => {
                            setPage(item as number);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className={`w-8 h-8 text-xs rounded-lg transition-colors ${
                            item === page
                              ? "bg-ink text-white font-medium"
                              : "text-ink-muted hover:bg-ash hover:text-ink"
                          }`}
                        >
                          {(item as number) + 1}
                        </button>
                      ),
                    );
                  })()}
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
          <EmptySearch
            title="No jobs matched this search"
            description="Try broader keywords, different location, or remove filters."
          />
        )}
      </main>
    </div>
  );
}
