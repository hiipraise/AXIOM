import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bookmark, Brain, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { axiomApplicationsApi, jobsApi } from "../../api";
import {
  ApplicationEntry,
  ApplicationStatus,
  AxiomApplication,
  JobResult,
} from "../../types";
import { Link, useNavigate } from "react-router-dom";

const STATUSES: ApplicationStatus[] = [
  "saved",
  "applied",
  "interview",
  "offer",
  "rejected",
];

type TrackerTab = "applications" | "saved";

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

function getJobDetailUrl(job: Pick<JobResult, "id" | "source">) {
  return job.source === "axiom" && job.id.startsWith("axiom:")
    ? `/jobs/axiom/${job.id.slice("axiom:".length)}`
    : `/jobs/${encodeURIComponent(job.id)}`;
}

function getInterviewPrepUrl(jobId: string, cvId?: string | null) {
  const params = new URLSearchParams({ job: jobId });
  if (cvId) params.set("cv", cvId);
  return `/interview?${params.toString()}`;
}

function isSavedJobEntry(item: SavedJobEntry | JobResult): item is SavedJobEntry {
  return "job_id" in item;
}

function TrackerSkeleton() {
  return (
    <div
      className="grid gap-4 xl:grid-cols-5 md:grid-cols-2"
      aria-label="Loading applications"
    >
      {STATUSES.map((status) => (
        <section
          key={status}
          className="rounded-2xl border border-ash-border bg-white p-4 animate-pulse"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="h-4 w-20 rounded bg-ash-dark" />
            <div className="h-5 w-8 rounded-full bg-ash-dark" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-ash-border bg-ash/30 p-3"
              >
                <div className="h-4 w-5/6 rounded bg-ash-dark mb-2" />
                <div className="h-3 w-1/2 rounded bg-ash-dark mb-4" />
                <div className="h-8 rounded-lg bg-ash-dark" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function ApplicationTrackerPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TrackerTab>("applications");
  const { data: applications = [], isLoading } = useQuery<ApplicationEntry[]>({
    queryKey: ["applications"],
    queryFn: jobsApi.applications,
  });
  const { data: savedJobsRaw, isLoading: savedLoading } = useQuery<
    | Array<SavedJobEntry | JobResult>
    | { items?: Array<SavedJobEntry | JobResult>; jobs?: Array<SavedJobEntry | JobResult> }
  >({
    queryKey: ["saved-jobs"],
    queryFn: jobsApi.savedList,
  });
  const { data: axiomApplications = [], isLoading: axiomLoading } = useQuery<
    AxiomApplication[]
  >({
    queryKey: ["axiom-applications"],
    queryFn: axiomApplicationsApi.list,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) =>
      jobsApi.updateApplication(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["applications"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => jobsApi.deleteApplication(id),
    onSuccess: () => {
      toast.success("Application removed");
      qc.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  const savedJobCards = useMemo<SavedJobCard[]>(() => {
    const rawItems = (() => {
      if (!savedJobsRaw) return [];
      if (Array.isArray(savedJobsRaw)) return savedJobsRaw;
      return savedJobsRaw.items || savedJobsRaw.jobs || [];
    })();

    return rawItems.map((item) => {
      if (isSavedJobEntry(item)) {
        return {
          id: item.id,
          jobId: item.job_id,
          savedAt: item.saved_at,
          job: item.job,
        };
      }
      return {
        id: item.id,
        jobId: item.id,
        job: item,
      };
    });
  }, [savedJobsRaw]);

  const grouped = useMemo(() => {
    const savedApplicationIds = new Set(
      applications.map((app) => app.job_id),
    );
    const savedOnlyEntries: ApplicationEntry[] = savedJobCards
      .filter((entry) => !savedApplicationIds.has(entry.jobId))
      .map((entry) => ({
        id: `saved-${entry.id}`,
        user_id: "",
        job_id: entry.jobId,
        status: "saved",
        cv_id: null,
        notes: "",
        applied_url: null,
        created_at: entry.savedAt || "",
        updated_at: entry.savedAt || "",
        job: entry.job || null,
      }));

    return Object.fromEntries(
      STATUSES.map((status) => [
        status,
        status === "saved"
          ? [
              ...applications.filter((app) => app.status === status),
              ...savedOnlyEntries,
            ]
          : applications.filter((app) => app.status === status),
      ]),
    ) as Record<ApplicationStatus, ApplicationEntry[]>;
  }, [applications, savedJobCards]);

  const savedCount = savedJobCards.length;

  const savedFallbackByJobId = useMemo(() => {
    return new Map(savedJobCards.map((entry) => [entry.jobId, entry.job || null]));
  }, [savedJobCards]);

  const getApplicationJob = (entry: ApplicationEntry) =>
    entry.job || savedFallbackByJobId.get(entry.job_id) || null;

  const getApplicationJobUrl = (entry: ApplicationEntry) => {
    const job = getApplicationJob(entry);
    return job ? getJobDetailUrl(job) : `/jobs/${encodeURIComponent(entry.job_id)}`;
  };

  return (
    <div className="min-h-screen bg-ash">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:py-10">
        <button className="btn-ghost mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Back
        </button>

        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">
              Tracker
            </p>
            <h1 className="font-display text-3xl font-bold text-ink tracking-tight">
              Application board
            </h1>
          </div>
          <Link to="/jobs" className="btn-primary">
            Browse jobs
          </Link>
        </div>

        <div className="mb-6 inline-flex rounded-xl border border-ash-border bg-white p-1">
          <button
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === "applications"
                ? "bg-ink text-white"
                : "text-ink-muted hover:text-ink"
            }`}
            onClick={() => setActiveTab("applications")}
          >
            Applications
          </button>
          <button
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === "saved"
                ? "bg-ink text-white"
                : "text-ink-muted hover:text-ink"
            }`}
            onClick={() => setActiveTab("saved")}
          >
            Saved jobs
          </button>
        </div>

        {activeTab === "saved" ? (
          savedLoading ? (
            <TrackerSkeleton />
          ) : (
            <section className="rounded-2xl border border-ash-border bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-ink">
                  Saved jobs
                </h2>
                <span className="badge bg-ash-dark text-ink-muted">
                  {savedCount}
                </span>
              </div>
              {savedJobCards.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {savedJobCards.map(({ id, jobId, job }) => (
                    <article
                      key={id}
                      className="rounded-xl border border-ash-border bg-ash/30 p-3"
                    >
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
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="badge bg-white text-ink-muted border border-ash-border capitalize">
                          {job?.source || "saved"}
                        </span>
                        <Bookmark size={14} className="text-indigo-600" />
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-ink-muted">
                  No saved jobs yet.
                </p>
              )}
            </section>
          )
        ) : isLoading || axiomLoading ? (
          <TrackerSkeleton />
        ) : (
          <>
            {axiomApplications.length > 0 && (
              <section className="mb-6 rounded-2xl border border-ash-border bg-white p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold text-ink">
                    AXIOM applications
                  </h2>
                  <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {axiomApplications.length}
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {axiomApplications.map((entry) => (
                    <article
                      key={entry.id}
                      className="rounded-xl border border-ash-border bg-ash/30 p-3"
                    >
                      <Link
                        to={`/jobs/axiom/${entry.job_id}`}
                        className="font-medium text-ink hover:underline line-clamp-2"
                      >
                        {entry.job?.title || "AXIOM job"}
                      </Link>
                      <p className="mt-0.5 text-sm text-ink-muted line-clamp-1">
                        {entry.job?.company_name || "AXIOM employer"}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="badge bg-white text-ink-muted border border-ash-border">
                          {entry.status.replace("_", " ")}
                        </span>
                        {entry.status === "interview_scheduled" && (
                          <Link
                            className="btn-ghost p-2"
                            title="Interview prep"
                            to={`/interview?cv=${entry.cv_id}`}
                          >
                            <Brain size={14} />
                          </Link>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
            <div className="grid gap-4 xl:grid-cols-5 md:grid-cols-2">
              {STATUSES.map((status) => (
                <section
                  key={status}
                  className="rounded-2xl border border-ash-border bg-white p-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-medium text-ink capitalize">
                      {status}
                    </h2>
                    <span className="badge bg-ash-dark text-ink-muted">
                      {grouped[status].length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {grouped[status].map((entry) => {
                      const job = getApplicationJob(entry);
                      const isSavedOnly = entry.id.startsWith("saved-");

                      return (
                        <article
                          key={entry.id}
                          className="rounded-xl border border-ash-border bg-ash/30 p-3"
                        >
                          <Link
                            to={getApplicationJobUrl(entry)}
                            className="font-medium text-ink hover:underline line-clamp-2"
                          >
                            {job?.title || entry.job_id}
                          </Link>
                          <p className="text-sm text-ink-muted mt-0.5 line-clamp-1">
                            {job?.company || "Saved job"}
                          </p>
                          <div className="mt-3 flex items-center justify-between gap-2">
                            {isSavedOnly ? (
                              <span className="badge bg-white text-ink-muted border border-ash-border">
                                saved
                              </span>
                            ) : (
                              <select
                                className="input !py-1.5 !text-xs"
                                value={entry.status}
                                onChange={(e) =>
                                  updateMutation.mutate({
                                    id: entry.id,
                                    status: e.target.value as ApplicationStatus,
                                  })
                                }
                              >
                                {STATUSES.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            )}
                            {entry.status === "interview" && (
                              <Link
                                className="btn-ghost p-2"
                                title={
                                  entry.cv_id
                                    ? "Practise interview"
                                    : "No CV attached. You can choose a CV before starting prep."
                                }
                                to={getInterviewPrepUrl(entry.job_id, entry.cv_id)}
                              >
                                <Brain size={14} />
                              </Link>
                            )}
                            {!isSavedOnly && (
                              <button
                                className="btn-ghost p-2"
                                onClick={() => deleteMutation.mutate(entry.id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                    {grouped[status].length === 0 && (
                      <p className="text-sm text-ink-muted py-6 text-center">
                        No items
                      </p>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
