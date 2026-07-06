import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, ArrowLeft, Briefcase, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { jobsApi } from "../../api";
import { useAuthStore } from "../../store/auth";
import { JobResult } from "../../types";
import JobCard from "../../components/jobs/JobCard";
import { useAnnouncement } from "../../context/announcement";
import { EmptyJobs } from "../../components/UI/EmptyState";
import { NIGERIA_STATES } from "../../lib/nigeriaStates";

const PAGE_SIZE = 12;

const FEATURED_QUERIES = [
  "Software Engineer",
  "Product Manager",
  "Data Analyst",
  "Designer",
  "Marketing",
  "Sales",
  "Customer Success",
  "Finance",
  "Operations",
  "Human Resources",
  "Cybersecurity",
  "DevOps",
  "Project Manager",
  "Content Writer",
  "Business Analyst",
];

const REGION_FILTERS = [
  { value: "", label: "Worldwide" },
  { value: "nigeria", label: "Nigeria" },
  { value: "kenya", label: "Kenya" },
  { value: "ghana", label: "Ghana" },
  { value: "south africa", label: "South Africa" },
  { value: "united kingdom", label: "United Kingdom" },
  { value: "united states", label: "United States" },
  { value: "canada", label: "Canada" },
  { value: "germany", label: "Germany" },
  { value: "netherlands", label: "Netherlands" },
  { value: "remote", label: "Remote" },
  { value: "africa", label: "Africa" },
];

function JobsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="Loading jobs">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-ash-border bg-white p-4 animate-pulse">
          <div className="h-3 w-20 rounded bg-ash-dark mb-4" />
          <div className="h-5 w-4/5 rounded bg-ash-dark mb-2" />
          <div className="h-3 w-1/2 rounded bg-ash-dark mb-5" />
          <div className="space-y-2">
            <div className="h-3 rounded bg-ash-dark" />
            <div className="h-3 w-11/12 rounded bg-ash-dark" />
            <div className="h-3 w-2/3 rounded bg-ash-dark" />
          </div>
          <div className="mt-5 flex gap-2">
            <div className="h-7 w-20 rounded-lg bg-ash-dark" />
            <div className="h-7 w-24 rounded-lg bg-ash-dark" />
          </div>
        </div>
      ))}
    </div>
  );
}
import Seo from "../../components/Seo";

export default function PublicJobsPage() {
  const { user }  = useAuthStore();
  const navigate  = useNavigate();
  const { bannerH } = useAnnouncement();
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("");
  const [region, setRegion] = useState("");
  const [nigeriaState, setNigeriaState] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["public-jobs", active, region, nigeriaState],
    queryFn:  () => jobsApi.search({ q: active, region, nigeria_state: nigeriaState, per_page: 60 }),
    staleTime: 0, // Job listings need fresh data for accurate availability
  });

  const jobs = data?.items ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return jobs;
    const q = search.toLowerCase();
    return jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q),
    );
  }, [jobs, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function selectCategory(q: string) {
    setActive((current) => current === q ? "" : q);
    setSearch("");
    setPage(0);
  }

  function selectRegion(value: string) {
    setRegion((current) => current === value ? "" : value);
    if (value !== "nigeria") setNigeriaState("");
    setPage(0);
  }

  return (
    <div className="min-h-screen bg-ash">
      <Seo
        title="Browse Jobs"
        description="Browse live roles from Adzuna, Remotive, The Muse and more. Sign in to get an AI match score, tailor your CV, and generate cover letters."
      />
      {/* ── Top bar ── */}
      <header
        className="bg-white border-b border-ash-border sticky z-30"
        style={{ top: bannerH, transition: "top 0.28s cubic-bezier(0.4,0,0.2,1)" }}
      >
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors">
              <ArrowLeft size={13} /> Home
            </button>
            <span className="text-ash-border">|</span>
            <div className="flex items-center gap-2">
              <Briefcase size={13} className="text-ink-muted" />
              <span className="font-display font-bold text-sm text-ink">AXIOM Jobs</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter results…"
                className="pl-8 pr-4 py-1.5 text-xs border border-ash-border rounded-lg bg-ash focus:outline-none focus:border-ink w-44"
              />
            </div>
            <Link
              to={user ? "/jobs" : "/register"}
              className="px-3 py-1.5 bg-ink text-white text-xs font-medium rounded-lg hover:bg-ink-light transition-colors flex items-center gap-1.5"
            >
              {user ? "Full search" : "Get started"} <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </header>

      <div
        className="max-w-6xl mx-auto px-5 py-8"
        style={{ paddingTop: `calc(2rem + ${bannerH}px)` }}
      >
        {/* ── Hero ── */}
        <div className="mb-8 text-center max-w-xl mx-auto">
          <p className="text-xs uppercase tracking-[0.22em] text-ink-muted mb-2">AXIOM Jobs</p>
          <h1 className="font-display font-bold text-3xl text-ink mb-3 leading-tight">
            Real jobs. Matched to your CV.
          </h1>
          <p className="text-sm text-ink-muted leading-relaxed">
            Browse live roles from Adzuna, Remotive, The Muse and more. Sign in to get an AI match score, tailor your CV to any role, and generate a cover letter — instantly.
          </p>
          {!user && (
            <div className="flex items-center justify-center gap-3 mt-5">
              <Link to="/register" className="btn-primary">Create free account</Link>
              <Link to="/login" className="btn-secondary">Sign in</Link>
            </div>
          )}
        </div>

        {/* ── Popular searches ── */}
        <p className="text-xs uppercase tracking-[0.2em] text-ink-muted text-center mb-3">Popular searches</p>
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {FEATURED_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => selectCategory(q)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                active === q
                  ? "bg-ink text-white border-ink"
                  : "border-ash-border text-ink-muted hover:border-ink/30 hover:text-ink bg-white"
              }`}
            >
              {q}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {REGION_FILTERS.map((option) => (
            <button
              key={option.label}
              onClick={() => selectRegion(option.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                region === option.value
                  ? "bg-[#a0449f] text-white border-[#a0449f]"
                  : "border-ash-border text-ink-muted hover:border-ink/30 hover:text-ink bg-white"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {region === "nigeria" && (
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {NIGERIA_STATES.map((s) => (
              <button
                key={s.key}
                onClick={() => setNigeriaState(s.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  nigeriaState === s.key
                    ? "bg-[#a0449f] text-white border-[#a0449f]"
                    : "border-ash-border text-ink-muted hover:border-ink/30 hover:text-ink bg-white"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Mobile search ── */}
        <div className="sm:hidden relative mb-5">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter results…"
            className="w-full pl-8 pr-4 py-2 text-sm border border-ash-border rounded-lg bg-white focus:outline-none focus:border-ink"
          />
        </div>

        {/* ── Results count ── */}
        {!isLoading && (
          <p className="text-sm text-ink-muted mb-4">
            {filtered.length} {active || "job"} role{filtered.length !== 1 ? "s" : ""} found
            {data?.cached && " · cached"}
          </p>
        )}

        {/* ── Jobs grid ── */}
        {isLoading ? (
          <JobsGridSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyJobs
            action={
              search
                ? { label: "Clear filter", onClick: () => setSearch("") }
                : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginated.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}

        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button className="btn-ghost p-2" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-ink-muted">Page {page + 1} of {totalPages}</span>
            <button className="btn-ghost p-2" disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── CTA ── */}
        {!user && !isLoading && filtered.length > 0 && (
          <div className="mt-10 text-center p-8 bg-ink text-white rounded-2xl">
            <h3 className="font-display font-bold text-xl mb-2">See how well you match each role.</h3>
            <p className="text-white/70 text-sm mb-5">
              Sign up free. AXIOM scores your CV against any job, tailors it in one click, and writes your cover letter.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link to="/register" className="px-5 py-2.5 bg-white text-ink text-sm font-semibold rounded-xl hover:bg-ash transition-colors">
                Create free account
              </Link>
              <Link to="/jobs" className="px-5 py-2.5 border border-white/30 text-white text-sm rounded-xl hover:bg-white/10 transition-colors">
                Full job search
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
