import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, ExternalLink, MapPin } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { publicApi } from "../../api";

interface CompanyPayload {
  profile: {
    company_name: string;
    company_slug: string;
    logo_url: string;
    website: string;
    description: string;
    industry: string;
    size: string;
    location: string;
    verified: boolean;
  };
  jobs: Array<{
    id: string;
    title: string;
    location: string;
    remote: boolean;
    job_type: string;
    created_at: string;
  }>;
}

function CompanyPublicSkeleton() {
  return (
    <div className="min-h-screen bg-ash">
      <div className="mx-auto max-w-6xl px-4 py-8 animate-pulse">
        <div className="mb-4 h-9 w-24 rounded-lg bg-ash-dark" />
        <section className="rounded-2xl border border-ash-border bg-white p-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-lg bg-ash-dark" />
            <div className="min-w-0 flex-1">
              <div className="h-8 w-64 rounded bg-ash-dark mb-3" />
              <div className="h-4 w-72 rounded bg-ash-dark mb-5" />
              <div className="h-4 w-24 rounded bg-ash-dark" />
            </div>
          </div>
          <div className="mt-6 max-w-3xl space-y-3">
            <div className="h-3 rounded bg-ash-dark" />
            <div className="h-3 rounded bg-ash-dark" />
            <div className="h-3 w-2/3 rounded bg-ash-dark" />
          </div>
        </section>
        <section className="mt-6">
          <div className="mb-3 h-6 w-28 rounded bg-ash-dark" />
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-ash-border bg-white p-4">
                <div className="h-4 w-4/5 rounded bg-ash-dark mb-3" />
                <div className="h-3 w-1/2 rounded bg-ash-dark" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function CompanyPublicPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery<CompanyPayload>({
    queryKey: ["company", slug],
    queryFn: () => publicApi.getCompany(slug),
    enabled: !!slug,
  });

  if (isLoading) return <CompanyPublicSkeleton />;
  if (!data) return <div className="p-8 text-sm text-ink-muted">Company not found.</div>;

  const { profile, jobs } = data;

  return (
    <div className="min-h-screen bg-ash">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <button className="btn-ghost mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Back
        </button>
        <section className="rounded-2xl border border-ash-border bg-white p-6">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-ash-border bg-ash text-ink-muted">
              {profile.logo_url ? <img src={profile.logo_url} alt="" className="h-full w-full rounded-lg object-cover" /> : <Building2 size={24} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-3xl font-bold text-ink">{profile.company_name}</h1>
                {profile.verified && <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">Verified</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-ink-muted">
                {profile.location && <span className="inline-flex items-center gap-1"><MapPin size={13} /> {profile.location}</span>}
                {profile.industry && <span>{profile.industry}</span>}
                {profile.size && <span>{profile.size}</span>}
              </div>
              {profile.website && (
                <a className="mt-3 inline-flex items-center gap-1 text-sm text-ink underline" href={profile.website} target="_blank" rel="noopener noreferrer">
                  Website <ExternalLink size={13} />
                </a>
              )}
            </div>
          </div>
          {profile.description && <p className="mt-5 max-w-3xl text-sm leading-7 text-ink-muted">{profile.description}</p>}
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-ink">Open roles</h2>
            <span className="text-sm text-ink-muted">{jobs.length} active</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {jobs.map((job) => (
              <Link key={job.id} to={`/jobs/axiom/${job.id}`} className="rounded-xl border border-ash-border bg-white p-4 transition-colors hover:border-ink/30">
                <p className="font-medium text-ink">{job.title}</p>
                <p className="mt-1 text-xs text-ink-muted">{job.remote ? "Remote" : job.location || "Flexible"} · {job.job_type}</p>
              </Link>
            ))}
          </div>
          {!jobs.length && <div className="rounded-xl border border-ash-border bg-white p-8 text-center text-sm text-ink-muted">No active roles right now.</div>}
        </section>
      </div>
    </div>
  );
}
