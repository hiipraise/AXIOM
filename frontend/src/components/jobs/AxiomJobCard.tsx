import { Link } from "react-router-dom";
import { ArrowUpRight, Building2, MapPin, Share2 } from "lucide-react";
import { AxiomJob } from "../../types";

export default function AxiomJobCard({ job, onShare }: { job: AxiomJob; onShare?: () => void }) {
  return (
    <article className="card p-4 h-full flex flex-col justify-between gap-4">
      <div>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-ash-border bg-ash text-ink-muted">
            {job.company_logo_url ? <img src={job.company_logo_url} alt="" className="h-full w-full rounded-lg object-cover" /> : <Building2 size={18} />}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-ink line-clamp-2">{job.title}</p>
            {job.company_slug ? (
              <Link to={`/company/${job.company_slug}`} className="text-sm text-ink-muted truncate hover:text-ink hover:underline">
                {job.company_name}
              </Link>
            ) : (
              <p className="text-sm text-ink-muted truncate">{job.company_name}</p>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1"><MapPin size={11} /> {job.remote ? "Remote" : job.location || "Flexible"}</span>
          <span className="badge bg-ash-dark text-ink-muted">{job.job_type}</span>
          <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">AXIOM</span>
        </div>
        <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-ink-muted">{job.description.replace(/<[^>]+>/g, " ")}</p>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-ash-border pt-3">
        <button className="btn-ghost !py-1.5 !px-2" onClick={onShare} aria-label="Share job"><Share2 size={14} /></button>
        <Link to={`/jobs/axiom/${job.id}`} className="btn-secondary !py-1.5 !px-3 !text-xs">
          View <ArrowUpRight size={13} />
        </Link>
      </div>
    </article>
  );
}
