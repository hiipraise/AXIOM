import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Share2, Send } from "lucide-react";
import { axiomJobsApi, cvApi } from "../../api";
import { useAuthStore } from "../../store/auth";
import ApplyModal from "../../components/jobs/ApplyModal";
import ShareJobModal from "../../components/jobs/ShareJobModal";
import { CV } from "../../types";

function AxiomJobDetailSkeleton() {
  return (
    <div className="min-h-screen bg-ash">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-4 h-9 w-24 rounded-lg bg-ash-dark animate-pulse" />
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <article className="card animate-pulse">
            <div className="mb-4 flex gap-2">
              <div className="h-6 w-16 rounded-full bg-ash-dark" />
              <div className="h-6 w-20 rounded-full bg-ash-dark" />
            </div>
            <div className="h-8 w-4/5 rounded bg-ash-dark mb-3" />
            <div className="h-4 w-1/2 rounded bg-ash-dark mb-8" />
            <div className="space-y-3">
              <div className="h-3 rounded bg-ash-dark" />
              <div className="h-3 rounded bg-ash-dark" />
              <div className="h-3 w-10/12 rounded bg-ash-dark" />
            </div>
          </article>
          <aside className="space-y-4">
            <div className="card animate-pulse">
              <div className="h-3 w-16 rounded bg-ash-dark mb-4" />
              <div className="h-10 rounded-lg bg-ash-dark mb-2" />
              <div className="h-10 rounded-lg bg-ash-dark" />
            </div>
            <div className="card animate-pulse space-y-3">
              <div className="h-3 rounded bg-ash-dark" />
              <div className="h-3 rounded bg-ash-dark" />
              <div className="h-3 w-4/5 rounded bg-ash-dark" />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function AxiomJobDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [applyOpen, setApplyOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const { data: job, isLoading } = useQuery({ queryKey: ["axiom-job", id], queryFn: () => axiomJobsApi.get(id), enabled: !!id });
  const { data: cvs = [] } = useQuery<CV[]>({ queryKey: ["cvs"], queryFn: cvApi.list, enabled: !!user });
  const description = useMemo(() => (job?.description || "").replace(/<[^>]+>/g, "\n").replace(/\n{3,}/g, "\n\n"), [job]);
  useEffect(() => {
    if (!job) return;
    const title = `${job.title} at ${job.company_name} | AXIOM Jobs`;
    document.title = title;
    const setMeta = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", property);
        document.head.appendChild(tag);
      }
      tag.content = content;
    };
    setMeta("og:title", title);
    setMeta("og:description", description.slice(0, 220));
    setMeta("og:type", "website");
    setMeta("og:url", window.location.href);
    if (job.company_logo_url) setMeta("og:image", job.company_logo_url);
  }, [description, job]);

  if (isLoading) return <AxiomJobDetailSkeleton />;
  if (!job) return <div className="p-8">Job not found.</div>;

  return (
    <div className="min-h-screen bg-ash">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <button className="btn-ghost mb-4" onClick={() => navigate(-1)}><ArrowLeft size={14} /> Back</button>
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <article className="card">
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">AXIOM</span>
              {job.remote && <span className="badge bg-ash-dark text-ink-muted">Remote</span>}
              <span className="badge bg-ash-dark text-ink-muted">{job.job_type}</span>
            </div>
            <h1 className="font-display text-3xl font-bold text-ink">{job.title}</h1>
            <p className="mt-1 text-ink-muted">
              {job.company_slug ? <Link className="hover:text-ink hover:underline" to={`/company/${job.company_slug}`}>{job.company_name}</Link> : job.company_name}
              {" · "}
              {job.location || "Flexible"}
            </p>
            <pre className="mt-6 whitespace-pre-wrap font-sans text-sm leading-7 text-ink-muted">{description}</pre>
          </article>
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="card">
              <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Apply</p>
              <button className="btn-primary mt-4 w-full justify-center" onClick={() => user ? setApplyOpen(true) : navigate(`/login?next=${encodeURIComponent(`/jobs/axiom/${id}`)}`)}>
                <Send size={15} /> Apply on AXIOM
              </button>
              <button className="btn-secondary mt-2 w-full justify-center" onClick={() => setShareOpen(true)}>
                <Share2 size={15} /> Share
              </button>
            </div>
            <div className="card text-sm text-ink-muted">
              <p><b className="text-ink">Experience:</b> {job.experience_level}</p>
              <p className="mt-2"><b className="text-ink">Industry:</b> {job.industry || "General"}</p>
              {!!job.skills_required.length && <p className="mt-2"><b className="text-ink">Skills:</b> {job.skills_required.join(", ")}</p>}
            </div>
          </aside>
        </div>
      </div>
      <ApplyModal open={applyOpen} job={job} cvs={cvs} onClose={() => setApplyOpen(false)} />
      <ShareJobModal open={shareOpen} title={job.title} company={job.company_name} url={`/jobs/axiom/${job.id}`} onClose={() => setShareOpen(false)} />
    </div>
  );
}
