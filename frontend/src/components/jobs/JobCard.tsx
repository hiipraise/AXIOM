import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays, MapPin, Bookmark } from "lucide-react";
import { JobResult } from "../../types";

function formatSalary(job: JobResult) {
  if (job.salary_min == null && job.salary_max == null)
    return "Salary not listed";
  const currency = job.currency || "$";
  const min =
    job.salary_min != null
      ? `${currency}${Math.round(job.salary_min).toLocaleString()}`
      : "";
  const max =
    job.salary_max != null
      ? `${currency}${Math.round(job.salary_max).toLocaleString()}`
      : "";
  return min && max ? `${min} - ${max}` : min || max || "Salary not listed";
}

export default function JobCard({
  job,
  matchPercentage,
  saved,
}: {
  job: JobResult;
  matchPercentage?: number | null;
  saved?: boolean;
}) {
  return (
    <article className="card p-4 h-full flex flex-col justify-between gap-4 hover:shadow-sm transition-shadow relative">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-ink line-clamp-2">{job.title}</p>
            <p className="text-sm text-ink-muted mt-0.5 truncate">
              {job.company}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {typeof matchPercentage === "number" && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                  matchPercentage >= 75
                    ? "bg-emerald-100 text-emerald-800"
                    : matchPercentage >= 50
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-800"
                }`}
              >
                Match {Math.round(matchPercentage)}%
              </span>
            )}
            <span className="badge bg-ash-dark text-ink-muted capitalize">
              {job.source}
            </span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <MapPin size={11} />
            {job.remote ? "Remote" : job.location || "Location unknown"}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={11} />
            {new Date(job.posted_at).toLocaleDateString()}
          </span>
        </div>
        <p className="text-sm text-ink-muted mt-3 line-clamp-3">
          {job.description}
        </p>
      </div>
      {saved && (
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
            <Bookmark size={16} />
          </span>
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{formatSalary(job)}</p>
          {!matchPercentage && saved && (
            <p className="text-xs text-ink-muted mt-0.5">Saved</p>
          )}
        </div>
        <Link
          to={`/jobs/${encodeURIComponent(job.id)}`}
          className="btn-secondary shrink-0"
        >
          Open <ArrowUpRight size={14} />
        </Link>
      </div>
    </article>
  );
}
