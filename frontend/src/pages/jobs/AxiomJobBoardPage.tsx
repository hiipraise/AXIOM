import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { axiomJobsApi, cvApi } from "../../api";
import AxiomJobCard from "../../components/jobs/AxiomJobCard";
import ShareJobModal from "../../components/jobs/ShareJobModal";
import { AxiomJob } from "../../types";
import { useAuthStore } from "../../store/auth";

function quickAxiomMatchScore(job: AxiomJob, tokens: string[]): number | null {
  if (!tokens.length) return null;
  const haystack = [
    job.title,
    job.company_name,
    job.description,
    job.industry,
    job.experience_level,
    ...job.skills_required,
  ]
    .join(" ")
    .toLowerCase();
  const hits = tokens.filter((token) => haystack.includes(token.toLowerCase())).length;
  return Math.round((hits / tokens.length) * 100);
}

export default function AxiomJobBoardPage() {
  const { user } = useAuthStore();
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [shareJob, setShareJob] = useState<AxiomJob | null>(null);
  const { data = [], isLoading } = useQuery({ queryKey: ["axiom-jobs", q, region], queryFn: () => axiomJobsApi.list({ q, region }) });
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
      .flatMap((value) => value.split(/\s+/))
      .filter(Boolean)
      .slice(0, 20);
  }, [primaryCv]);

  const scoredJobs = useMemo(
    () =>
      data.map((job) => ({
        job,
        score: user && primaryCv ? quickAxiomMatchScore(job, tokens) : null,
      })),
    [data, primaryCv, tokens, user],
  );

  return (
    <div className="min-h-screen bg-ash">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">AXIOM Jobs</p>
          <h1 className="font-display text-3xl font-bold text-ink">Platform-native roles</h1>
        </div>
        <section className="card mb-5 grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input className="input pl-9" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search AXIOM jobs" />
          </div>
          <select className="input" value={region} onChange={(event) => setRegion(event.target.value)}>
            <option value="">All regions</option>
            <option value="nigeria">Nigeria</option>
            <option value="africa">Africa</option>
          </select>
        </section>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading AXIOM jobs">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-ash-border bg-white p-4 animate-pulse">
                <div className="h-3 w-16 rounded bg-ash-dark mb-4" />
                <div className="h-5 w-4/5 rounded bg-ash-dark mb-2" />
                <div className="h-3 w-1/2 rounded bg-ash-dark mb-5" />
                <div className="h-3 rounded bg-ash-dark mb-2" />
                <div className="h-3 w-2/3 rounded bg-ash-dark" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {scoredJobs.map(({ job, score }) => (
              <AxiomJobCard
                key={job.id}
                job={job}
                matchPercentage={score}
                onShare={() => setShareJob(job)}
              />
            ))}
          </div>
        )}
        {!isLoading && !data.length && <div className="card text-center text-sm text-ink-muted">No AXIOM jobs yet.</div>}
      </div>
      {shareJob && <ShareJobModal open title={shareJob.title} company={shareJob.company_name} url={`/jobs/axiom/${shareJob.id}`} onClose={() => setShareJob(null)} />}
    </div>
  );
}
