import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Briefcase, FileText, Plus } from "lucide-react";
import { axiomApplicationsApi, axiomJobsApi, recruiterApi } from "../../api";

function RecruiterDashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 animate-pulse">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <div className="h-3 w-36 rounded bg-ash-dark mb-3" />
          <div className="h-8 w-64 rounded bg-ash-dark" />
        </div>
        <div className="h-10 w-24 rounded-xl bg-ash-dark" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card">
            <div className="h-5 w-5 rounded bg-ash-dark" />
            <div className="mt-3 h-8 w-12 rounded bg-ash-dark" />
            <div className="mt-2 h-4 w-24 rounded bg-ash-dark" />
          </div>
        ))}
      </div>
      <section className="mt-6 card">
        <div className="mb-4 h-6 w-32 rounded bg-ash-dark" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="space-y-2">
                <div className="h-4 w-48 rounded bg-ash-dark" />
                <div className="h-3 w-32 rounded bg-ash-dark" />
              </div>
              <div className="h-8 w-16 rounded-lg bg-ash-dark" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function RecruiterDashboard() {
  const navigate = useNavigate();
  const profile = useQuery({ queryKey: ["recruiter-profile"], queryFn: recruiterApi.profile, retry: false });
  const jobs = useQuery({ queryKey: ["axiom-jobs-mine"], queryFn: axiomJobsApi.mine, enabled: !profile.isError });
  const applications = useQuery({ queryKey: ["employer-applications"], queryFn: axiomApplicationsApi.employer, enabled: !profile.isError });

  if (profile.isLoading) return <RecruiterDashboardSkeleton />;
  if (profile.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="card text-center">
          <h1 className="font-display text-2xl font-bold text-ink">Recruiter profile needed</h1>
          <p className="mt-2 text-sm text-ink-muted">Create a company profile before posting AXIOM jobs.</p>
          <button className="btn-primary mt-4" onClick={() => navigate("/recruiter/register")}>Create profile</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Recruiter dashboard</p>
          <h1 className="font-display text-3xl font-bold text-ink">{profile.data?.company_name}</h1>
        </div>
        <Link className="btn-primary" to="/jobs/axiom/new"><Plus size={15} /> Post job</Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card"><Briefcase size={18} /><p className="mt-3 text-2xl font-bold text-ink">{jobs.data?.length || 0}</p><p className="text-sm text-ink-muted">Jobs posted</p></div>
        <div className="card"><FileText size={18} /><p className="mt-3 text-2xl font-bold text-ink">{applications.data?.length || 0}</p><p className="text-sm text-ink-muted">Applications</p></div>
        <div className="card"><p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Free tier</p><p className="mt-3 text-2xl font-bold text-ink">{Math.max(0, 5 - (jobs.data?.filter((job) => job.is_active).length || 0))}</p><p className="text-sm text-ink-muted">Active slots left</p></div>
      </div>
      <section className="mt-6 card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-ink">Active jobs</h2>
          <Link className="text-sm text-ink-muted underline" to="/recruiter/applications">Applications</Link>
        </div>
        <div className="divide-y divide-ash-border">
          {(jobs.data || []).map((job) => (
            <div key={job.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div><p className="font-medium text-ink">{job.title}</p><p className="text-xs text-ink-muted">{job.location || "Flexible"} · {job.views} views</p></div>
              <Link className="btn-secondary !py-1.5 !px-3 !text-xs" to={`/jobs/axiom/${job.id}/edit`}>Edit</Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
