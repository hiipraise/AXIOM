import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal } from "lucide-react";
import { jobsApi, cvApi } from "../../api";
import { useAuthStore } from "../../store/auth";
import { JobResult } from "../../types";
import JobCard from "../../components/jobs/JobCard";

function quickMatchScore(job: JobResult, tokens: string[]) {
  if (!tokens.length) return null;
  const haystack =
    `${job.title} ${job.company} ${job.description} ${job.category}`.toLowerCase();
  const hits = tokens.filter((token) =>
    haystack.includes(token.toLowerCase()),
  ).length;
  return Math.round((hits / tokens.length) * 100);
}

export default function JobBoardPage() {
  const { user } = useAuthStore();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [remote, setRemote] = useState<boolean | "">("");

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
      primaryCv?.title,
    ].filter(Boolean) as string[];
    return [...skills, ...roleBits]
      .flatMap((value) => value.split(/\s+/))
      .filter(Boolean)
      .slice(0, 16);
  }, [primaryCv]);

  const { data, isLoading } = useQuery({
    queryKey: ["jobs", query, location, remote],
    queryFn: () =>
      jobsApi.search({
        q: query,
        location,
        remote: remote === "" ? null : remote,
        per_page: 20,
      }),
    placeholderData: (previous) => previous,
  });

  const jobs = data?.items ?? [];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.08),_transparent_40%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_55%,_#f8fafc_100%)]">
      <header className="border-b border-ash-border bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-ink-muted">
              AXIOM Jobs
            </p>
            <h1 className="font-display text-2xl font-bold text-ink tracking-tight">
              Find roles matched to your CV
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn-secondary"
              onClick={() =>
                (window.location.href = user ? "/dashboard" : "/login")
              }
            >
              {user ? "Dashboard" : "Sign in"}
            </button>
            <button
              className="btn-primary"
              onClick={() => (window.location.href = "/tracker")}
            >
              Tracker
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 lg:py-10">
        <section className="card mb-6 bg-white/90 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1.4fr_0.9fr_0.7fr_auto]">
            <div>
              <label className="label">Role or keywords</label>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                />
                <input
                  className="input pl-9"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Product manager, React, data analyst..."
                />
              </div>
            </div>
            <div>
              <label className="label">Location</label>
              <input
                className="input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
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
                <option value="false">On-site/hybrid</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                className="btn-primary w-full justify-center"
                onClick={() => {}}
              >
                <SlidersHorizontal size={14} /> Search
              </button>
            </div>
          </div>
        </section>

        <div className="mb-4 flex items-center justify-between text-sm text-ink-muted">
          <p>{isLoading ? "Searching jobs..." : `${jobs.length} jobs found`}</p>
          {data?.cached && (
            <span className="badge bg-ash-dark text-ink-muted">Cached</span>
          )}
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              saved={false}
              matchPercentage={
                user && primaryCv ? quickMatchScore(job, tokens) : null
              }
            />
          ))}
        </section>

        {!isLoading && jobs.length === 0 && (
          <div className="card mt-6 text-center py-16">
            <p className="text-sm text-ink-muted">
              No jobs matched this search. Try broader keywords or remove
              filters.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
