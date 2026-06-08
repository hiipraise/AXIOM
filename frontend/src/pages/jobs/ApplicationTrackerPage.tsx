import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Brain, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { axiomApplicationsApi, jobsApi } from "../../api";
import {
  ApplicationEntry,
  ApplicationStatus,
  AxiomApplication,
} from "../../types";
import { Link, useNavigate } from "react-router-dom";

const STATUSES: ApplicationStatus[] = [
  "saved",
  "applied",
  "interview",
  "offer",
  "rejected",
];

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
  const { data: applications = [], isLoading } = useQuery<ApplicationEntry[]>({
    queryKey: ["applications"],
    queryFn: jobsApi.applications,
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

  const grouped = useMemo(
    () =>
      Object.fromEntries(
        STATUSES.map((status) => [
          status,
          applications.filter((app) => app.status === status),
        ]),
      ) as Record<ApplicationStatus, ApplicationEntry[]>,
    [applications],
  );

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

        {isLoading || axiomLoading ? (
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
                    {grouped[status].map((entry) => (
                      <article
                        key={entry.id}
                        className="rounded-xl border border-ash-border bg-ash/30 p-3"
                      >
                        <Link
                          to={`/jobs/${encodeURIComponent(entry.job_id)}`}
                          className="font-medium text-ink hover:underline line-clamp-2"
                        >
                          {entry.job?.title || entry.job_id}
                        </Link>
                        <p className="text-sm text-ink-muted mt-0.5 line-clamp-1">
                          {entry.job?.company || "Unknown company"}
                        </p>
                        <div className="mt-3 flex items-center justify-between gap-2">
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
                          {entry.status === "interview" && (
                            <Link
                              className="btn-ghost p-2"
                              title="Practise interview"
                              to={`/interview?job=${encodeURIComponent(entry.job_id)}&cv=${entry.cv_id || ""}`}
                            >
                              <Brain size={14} />
                            </Link>
                          )}
                          <button
                            className="btn-ghost p-2"
                            onClick={() => deleteMutation.mutate(entry.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </article>
                    ))}
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
