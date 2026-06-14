import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bookmark, Brain, CalendarClock, CalendarDays, Target, Trash2, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";
import { axiomApplicationsApi, jobsApi } from "../../api";
import {
  ApplicationEntry,
  ApplicationStatus,
  AxiomApplication,
  JobResult,
} from "../../types";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

// Create moment localizer for react-big-calendar
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const localizer = momentLocalizer(moment as any);

const STATUSES: ApplicationStatus[] = [
  "saved",
  "applied",
  "interview",
  "offer",
  "rejected",
];

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

type TrackerTab = "applications" | "saved" | "calendar";

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
  const [draggedId, setDraggedId] = useState<string | null>(null);
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
    mutationFn: ({ id, body }: { id: string; body: Partial<ApplicationEntry> }) =>
      jobsApi.updateApplication(id, body),
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

  const analytics = useMemo(() => {
    const realApplications = applications.filter((app) => app.status !== "saved");
    const offers = applications.filter((app) => app.status === "offer").length;
    const interviews = applications.filter((app) => app.status === "interview").length;
    const now = new Date();
    const dueFollowUps = applications.filter((app) => {
      if (!app.follow_up_at) return false;
      return new Date(app.follow_up_at).getTime() <= now.getTime();
    }).length;
    const successRate = realApplications.length
      ? Math.round((offers / realApplications.length) * 100)
      : 0;
    const interviewRate = realApplications.length
      ? Math.round(((interviews + offers) / realApplications.length) * 100)
      : 0;
    return {
      total: applications.length,
      active: applications.filter((app) => !["offer", "rejected"].includes(app.status)).length,
      successRate,
      interviewRate,
      dueFollowUps,
    };
  }, [applications]);

  const savedFallbackByJobId = useMemo(() => {
    return new Map(savedJobCards.map((entry) => [entry.jobId, entry.job || null]));
  }, [savedJobCards]);

  const getApplicationJob = (entry: ApplicationEntry) =>
    entry.job || savedFallbackByJobId.get(entry.job_id) || null;

  const getApplicationJobUrl = (entry: ApplicationEntry) => {
    const job = getApplicationJob(entry);
    return job ? getJobDetailUrl(job) : `/jobs/${encodeURIComponent(entry.job_id)}`;
  };

  const moveApplication = (id: string, status: ApplicationStatus) => {
    if (id.startsWith("saved-")) return;
    updateMutation.mutate({ id, body: { status } });
  };

  const toDateTimeLocal = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };

  // Calendar state and events
  const [calendarView, setCalendarView] = useState<"month" | "week" | "day">("month");
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  // Create calendar events from applications with follow-up dates
  const calendarEvents = useMemo(() => {
    return applications
      .filter((app) => app.follow_up_at)
      .map((app) => {
        const job = getApplicationJob(app);
        const followUpDate = new Date(app.follow_up_at!);
        return {
          id: app.id,
          title: `${job?.title || "Follow-up"}${app.status === "rejected" ? " (Rejected)" : ""}`,
          start: followUpDate,
          end: moment(followUpDate).add(1, "hour").toDate(),
          allDay: false,
          resource: { application: app, job },
        };
      });
  }, [applications]);

  const eventStyleGetter = (event: { resource?: { application: ApplicationEntry } }) => {
    const status = event.resource?.application?.status;
    let backgroundColor = "#64748b"; // default ash-dark
    if (status === "rejected") backgroundColor = "#ef4444"; // red
    else if (status === "offer") backgroundColor = "#22c55e"; // green
    else if (status === "interview") backgroundColor = "#f59e0b"; // amber
    else if (status === "applied") backgroundColor = "#3b82f6"; // blue
    return { style: { backgroundColor } };
  };

  const handleSelectEvent = (event: { resource?: { application: ApplicationEntry; job: JobResult | null } }) => {
    const app = event.resource?.application;
    if (app && !app.id.startsWith("saved-")) {
      navigate(getApplicationJobUrl(app));
    }
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
          <button
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === "calendar"
                ? "bg-ink text-white"
                : "text-ink-muted hover:text-ink"
            }`}
            onClick={() => setActiveTab("calendar")}
          >
            <CalendarDays size={14} className="inline mr-1" />
            Calendar
          </button>
        </div>

        {activeTab === "calendar" && (
          <div className="mb-6 rounded-2xl border border-ash-border bg-white p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-ink">
                Follow-up Schedule
              </h2>
              <div className="flex items-center gap-2">
                <button
                  className="btn-ghost text-xs"
                  onClick={() => setCalendarDate(moment(calendarDate).subtract(1, "month").toDate())}
                >
                  ← Prev
                </button>
                <span className="text-sm font-medium text-ink">
                  {moment(calendarDate).format("MMMM YYYY")}
                </span>
                <button
                  className="btn-ghost text-xs"
                  onClick={() => setCalendarDate(moment(calendarDate).add(1, "month").toDate())}
                >
                  Next →
                </button>
              </div>
            </div>
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 500 }}
              view={calendarView}
              onView={(v) => setCalendarView(v as "month" | "week" | "day")}
              date={calendarDate}
              onNavigate={setCalendarDate}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={handleSelectEvent}
              popup
              selectable
            />
          </div>
        )}

        {activeTab === "applications" && (
          <div className="mb-6 grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-ash-border bg-white p-4">
              <Target size={17} />
              <p className="mt-2 text-2xl font-bold text-ink">{analytics.successRate}%</p>
              <p className="text-sm text-ink-muted">Offer success rate</p>
            </div>
            <div className="rounded-xl border border-ash-border bg-white p-4">
              <TrendingUp size={17} />
              <p className="mt-2 text-2xl font-bold text-ink">{analytics.interviewRate}%</p>
              <p className="text-sm text-ink-muted">Interview conversion</p>
            </div>
            <div className="rounded-xl border border-ash-border bg-white p-4">
              <CalendarClock size={17} />
              <p className="mt-2 text-2xl font-bold text-ink">{analytics.dueFollowUps}</p>
              <p className="text-sm text-ink-muted">Follow-ups due</p>
            </div>
            <div className="rounded-xl border border-ash-border bg-white p-4">
              <Bookmark size={17} />
              <p className="mt-2 text-2xl font-bold text-ink">{analytics.active}</p>
              <p className="text-sm text-ink-muted">Active opportunities</p>
            </div>
          </div>
        )}

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
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/plain") || draggedId;
                    if (id) moveApplication(id, status);
                    setDraggedId(null);
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-medium text-ink capitalize">
                      {STATUS_LABELS[status]}
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
                          className={`rounded-xl border border-ash-border bg-ash/30 p-3 ${
                            draggedId === entry.id ? "opacity-60" : ""
                          }`}
                          draggable={!isSavedOnly}
                          onDragStart={(e) => {
                            setDraggedId(entry.id);
                            e.dataTransfer.setData("text/plain", entry.id);
                          }}
                          onDragEnd={() => setDraggedId(null)}
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
                                    body: { status: e.target.value as ApplicationStatus },
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
                          {!isSavedOnly && (
                            <div className="mt-3">
                              <label className="label flex items-center gap-1">
                                <CalendarClock size={12} /> Follow-up
                              </label>
                              <input
                                className="input !py-1.5 !text-xs"
                                type="datetime-local"
                                value={toDateTimeLocal(entry.follow_up_at)}
                                onChange={(e) =>
                                  updateMutation.mutate({
                                    id: entry.id,
                                    body: {
                                      follow_up_at: e.target.value
                                        ? new Date(e.target.value).toISOString()
                                        : null,
                                    },
                                  })
                                }
                              />
                            </div>
                          )}
                        </article>
                      );
                    })}
                    {grouped[status].length === 0 && (
                      <p className="text-xs text-ink-muted py-6 text-center">
                        No applications
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
