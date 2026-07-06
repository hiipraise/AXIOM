import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bookmark, X } from "lucide-react";
import toast from "react-hot-toast";
import { jobsApi } from "../../api";
import { JobResult } from "../../types";
import { Link, useNavigate } from "react-router-dom";

interface SavedJobEntry {
  id: string;
  job_id: string;
  saved_at: string;
  job?: JobResult | null;
}

interface SavedJobCard {
  id: string;
  jobId: string;
  savedAt?: string;
  job?: JobResult | null;
}

function getJobDetailUrl(job: Pick<JobResult, "id">) {
  return `/jobs/${encodeURIComponent(job.id)}`;
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-ash-border bg-white p-4 animate-pulse">
      <div className="h-4 w-5/6 rounded bg-ash-dark mb-2" />
      <div className="h-3 w-1/2 rounded bg-ash-dark mb-4" />
      <div className="flex items-center justify-between">
        <div className="h-5 w-16 rounded-full bg-ash-dark" />
        <div className="h-5 w-5 rounded bg-ash-dark" />
      </div>
    </div>
  );
}
import Seo from "../../components/Seo";

export default function SavedJobsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: savedJobsRaw, isLoading } = useQuery<SavedJobEntry[]>({
    queryKey: ["saved-jobs"],
    queryFn: jobsApi.savedList,
  });

  const unsaveMutation = useMutation({
    mutationFn: (jobId: string) => jobsApi.unsave(jobId),
    onSuccess: () => {
      toast.success("Job unsaved");
      qc.invalidateQueries({ queryKey: ["saved-jobs"] });
    },
    onError: () => toast.error("Failed to unsave"),
  });

  const savedJobCards = useMemo<SavedJobCard[]>(() => {
    if (!savedJobsRaw) return [];
    return (Array.isArray(savedJobsRaw) ? savedJobsRaw : []).map((item) => ({
      id: item.id,
      jobId: item.job_id,
      savedAt: item.saved_at,
      job: item.job,
    }));
  }, [savedJobsRaw]);

  return (
    <div className="min-h-screen bg-ash">
      <Seo title="Saved Jobs" noindex />
      <div className="mx-auto max-w-7xl px-4 py-6 lg:py-10">
        <button className="btn-ghost mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Back
        </button>

        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">
              Saved Jobs
            </p>
            <h1 className="font-display text-3xl font-bold text-ink tracking-tight">
              Saved jobs
            </h1>
          </div>
          <Link to="/jobs" className="btn-primary">
            Browse jobs
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : savedJobCards.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {savedJobCards.map(({ id, jobId, job }) => (
              <article
                key={id}
                className="rounded-xl border border-ash-border bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <Link
                      to={
                        job
                          ? getJobDetailUrl(job)
                          : `/jobs/${encodeURIComponent(jobId)}`
                      }
                      className="font-medium text-ink hover:underline line-clamp-2"
                    >
                      {job?.title || jobId}
                    </Link>
                    <p className="mt-0.5 text-sm text-ink-muted line-clamp-1">
                      {job?.company || "Saved job"}
                    </p>
                  </div>
                  <button
                    onClick={() => unsaveMutation.mutate(jobId)}
                    disabled={unsaveMutation.isPending}
                    className="p-1.5 text-ink-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    title="Unsave job"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="badge bg-ash-dark text-ink-muted capitalize text-xs">
                    {job?.source || "saved"}
                  </span>
                  <Bookmark size={14} className="text-indigo-600" />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <Bookmark size={32} className="mx-auto text-ink-muted/40 mb-3" />
            <p className="text-sm text-ink-muted">
              No saved jobs yet. Browse jobs to save interesting listings.
            </p>
            <Link to="/jobs" className="btn-primary mt-4 inline-flex">
              Browse jobs
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}