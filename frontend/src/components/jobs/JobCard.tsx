import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays, MapPin, Bookmark } from "lucide-react";
import { JobResult } from "../../types";

function stripHtml(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, " ")
    .trim();
}

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
  return min && max ? `${min} – ${max}` : min || max || "Salary not listed";
}

interface JobCardProps {
  job: JobResult;
  matchPercentage?: number | null;
  saved?: boolean;
}

export default function JobCard({ job, matchPercentage, saved }: JobCardProps) {
  return (
    <article className="card p-4 h-full flex flex-col justify-between gap-4 hover:shadow-sm transition-shadow">
      {/* ── Header ── */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-ink line-clamp-2 leading-snug">
              {job.title}
            </p>
            <p className="text-sm text-ink-muted mt-0.5 truncate">
              {job.company}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className="badge bg-ash-dark text-ink-muted capitalize text-[10px]">
              {job.source}
            </span>
            {saved && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Bookmark size={12} />
              </span>
            )}
          </div>
        </div>

        {/* ── Meta row ── */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <MapPin size={11} />
            {job.remote ? "Remote" : job.location || "Location unknown"}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={11} />
            {new Date(job.posted_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>

        {/* ── Description snippet ── */}
        <p className="text-xs text-ink-muted mt-3 line-clamp-3 leading-relaxed">
          {stripHtml(job.description)}
        </p>
      </div>

      {/* ── Footer ── */}
      <div className="flex items-end justify-between gap-3 pt-2 border-t border-ash-border">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{formatSalary(job)}</p>
          {typeof matchPercentage === "number" && (
            <span
              className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                matchPercentage >= 75
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : matchPercentage >= 50
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-ash-dark text-ink-muted border border-ash-border"
              }`}
            >
              {Math.round(matchPercentage)}% match
            </span>
          )}
          {typeof matchPercentage !== "number" && saved && (
            <p className="text-xs text-ink-muted mt-1">Saved</p>
          )}
        </div>
        <Link
          to={`/jobs/${encodeURIComponent(job.id)}`}
          className="btn-secondary shrink-0 !py-1.5 !px-3 !text-xs"
        >
          View <ArrowUpRight size={13} />
        </Link>
      </div>
    </article>
  );
}
