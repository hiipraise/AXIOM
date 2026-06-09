import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  Copy,
  ExternalLink,
  FileSignature,
  Save,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { cvApi, jobsApi } from "../../api";
import { useAuthStore } from "../../store/auth";
import CoverLetterModal from "../../components/jobs/CoverLetterModal";
import { JobResult, JobMatchResult, CV, ApplicationEntry } from "../../types";

function stripHtml(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, "\n")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function JobDetailSkeleton() {
  return (
    <div className="min-h-screen bg-ash">
      <div className="mx-auto max-w-6xl px-4 py-6 lg:py-8">
        <div className="mb-4 h-9 w-28 rounded-lg bg-ash-dark animate-pulse" />
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] items-start">
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
              <div className="h-3 w-11/12 rounded bg-ash-dark" />
              <div className="h-3 w-2/3 rounded bg-ash-dark" />
            </div>
          </article>
          <aside className="space-y-4">
            <div className="card animate-pulse">
              <div className="h-3 w-20 rounded bg-ash-dark mb-3" />
              <div className="h-6 w-40 rounded bg-ash-dark mb-5" />
              <div className="space-y-3">
                <div className="h-10 rounded-lg bg-ash-dark" />
                <div className="h-10 rounded-lg bg-ash-dark" />
                <div className="h-10 rounded-lg bg-ash-dark" />
              </div>
            </div>
            <div className="card animate-pulse">
              <div className="h-3 w-20 rounded bg-ash-dark mb-4" />
              <div className="space-y-3">
                <div className="h-3 rounded bg-ash-dark" />
                <div className="h-3 rounded bg-ash-dark" />
                <div className="h-3 w-4/5 rounded bg-ash-dark" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function JobDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [selectedCvId, setSelectedCvId] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [coverOpen, setCoverOpen] = useState(false);
  const [matchResult, setMatchResult] = useState<JobMatchResult | null>(null);

  // ── staleTime prevents refetch on every navigation
  const { data: job, isLoading } = useQuery<JobResult>({
    queryKey: ["job", id],
    queryFn: () => jobsApi.get(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10 min — backend caches for 6h anyway
  });

  const { data: cvs = [] } = useQuery<CV[]>({
    queryKey: ["cvs"],
    queryFn: cvApi.list,
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });

  const { data: savedJobs = [] } = useQuery<ApplicationEntry[]>({
    queryKey: ["saved-jobs"],
    queryFn: jobsApi.savedList,
    enabled: !!user,
  });

  const isSaved = useMemo(
    () => savedJobs.some((savedJob) => savedJob.job_id === id),
    [savedJobs, id],
  );

  const selectedCv = useMemo(
    () => cvs.find((cv) => cv.id === selectedCvId) || cvs[0],
    [cvs, selectedCvId],
  );

  const matchMutation = useMutation({
    mutationFn: () => jobsApi.matchCv(selectedCv?.data, job?.description || ""),
    onSuccess: (data) => {
      setMatchResult(data);
      toast.success(`Match score: ${data.match_percentage}%`);
    },
    onError: () => toast.error("Could not score this match"),
  });

  const coverMutation = useMutation({
    mutationFn: () =>
      jobsApi.coverLetter(
        selectedCv?.data,
        job?.title || "",
        job?.company || "",
        job?.description || "",
      ),
    onSuccess: (data) => {
      setCoverLetter(data.cover_letter);
      setCoverOpen(true);
      toast.success("Cover letter generated");
    },
    onError: () => toast.error("Could not generate cover letter"),
  });

  const toggleSaveMutation = useMutation({
    mutationFn: () => (isSaved ? jobsApi.unsave(id) : jobsApi.save(id)),
    onSuccess: () => {
      toast.success(isSaved ? "Removed from saved" : "Job saved");
      qc.invalidateQueries({ queryKey: ["saved-jobs"] });
    },
  });

  const trackMutation = useMutation({
    mutationFn: () =>
      jobsApi.createApplication({
        job_id: id,
        status: "saved",
        cv_id: selectedCv?.id || null,
      }),
    onSuccess: () => {
      toast.success("Added to tracker");
      navigate("/tracker");
    },
  });

  const tailorMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCv) throw new Error("Select a CV first");
      const duplicated = await cvApi.duplicate(selectedCv.id);
      const matched = await cvApi.aiMatchJob(
        selectedCv.data,
        job?.description || "",
      );
      await cvApi.update(duplicated.id, {
        title: `${selectedCv.title} — ${job?.title || "Tailored"}`,
        data: matched.data,
      });
      return duplicated.id;
    },
    onSuccess: (cvId) => {
      toast.success("Tailored CV created — opening editor");
      navigate(`/cv/${cvId}`);
    },
    onError: () => toast.error("Could not tailor CV"),
  });

  if (isLoading) return <JobDetailSkeleton />;
  if (!job)
    return (
      <div className="min-h-screen bg-ash flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-ink">Job not found or expired from cache.</p>
        <button className="btn-secondary" onClick={() => navigate("/jobs")}>
          Back to jobs
        </button>
      </div>
    );

  const externalUrl = job.apply_url || "#";

  return (
    <div className="min-h-screen bg-ash">
      <div className="mx-auto max-w-6xl px-4 py-6 lg:py-8">
        {/* Back */}
        <button className="btn-ghost mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Back to jobs
        </button>

        {/* ── Two-column layout: article (scrolls) + aside (sticky) ── */}
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] items-start">
          {/* ── Left: Job content — scrolls naturally ── */}
          <article className="card">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="badge bg-ash-dark text-ink-muted capitalize">
                    {job.source}
                  </span>
                  {job.remote && (
                    <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Remote
                    </span>
                  )}
                  {job.category && (
                    <span className="badge bg-ash-dark text-ink-muted">
                      {job.category}
                    </span>
                  )}
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight">
                  {job.title}
                </h1>
                <p className="mt-1 text-base text-ink-muted">
                  {job.company}
                  {job.location && ` · ${job.location}`}
                </p>
                <p className="text-xs text-ink-muted mt-1">
                  Posted{" "}
                  {new Date(job.posted_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <a
                className="btn-primary shrink-0"
                href={externalUrl}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={14} /> Apply externally
              </a>
            </div>

            {/* Match result (shows after running AI match) */}
            {matchResult && (
              <div
                className={`mt-5 p-4 rounded-xl border ${
                  matchResult.match_percentage >= 75
                    ? "bg-emerald-50 border-emerald-200"
                    : matchResult.match_percentage >= 50
                      ? "bg-amber-50 border-amber-200"
                      : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <p className="text-2xl font-bold text-ink">
                    {matchResult.match_percentage}%
                  </p>
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {matchResult.verdict}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {matchResult.notes}
                    </p>
                  </div>
                </div>
                {matchResult.missing_keywords.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-ink mb-1.5">
                      Missing keywords
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {matchResult.missing_keywords.slice(0, 8).map((kw) => (
                        <span
                          key={kw.keyword}
                          className="text-[11px] px-2 py-0.5 bg-white border border-ash-border rounded-md text-ink-muted"
                        >
                          {kw.keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-3">
                Job Description
              </p>
              <div className="bg-ash/50 rounded-xl border border-ash-border p-4">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-ink-muted">
                  {stripHtml(job.description)}
                </pre>
              </div>
            </div>
          </article>

          {/* ── Right: AI tools panel — sticky, does not scroll with article ── */}
          {/*
            lg:sticky lg:top-6    — sticks to top of viewport while article scrolls
            lg:self-start          — prevents grid stretching it to article height
            lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto — scrolls internally if tall
          */}
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:pb-4">
            <div className="card">
              <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">
                AI tools
              </p>
              <h2 className="mt-1 font-display text-lg font-bold text-ink tracking-tight">
                Match, tailor & write
              </h2>

              {user ? (
                <div className="mt-4 space-y-3">
                  {cvs.length > 0 && (
                    <div>
                      <label className="label">Use CV</label>
                      <select
                        className="input"
                        value={selectedCv?.id || ""}
                        onChange={(e) => setSelectedCvId(e.target.value)}
                      >
                        {cvs.map((cv) => (
                          <option key={cv.id} value={cv.id}>
                            {cv.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    className="btn-secondary w-full justify-center"
                    onClick={() => matchMutation.mutate()}
                    disabled={!selectedCv || !job || matchMutation.isPending}
                  >
                    <Sparkles size={14} />
                    {matchMutation.isPending ? "Scoring…" : "AI match score"}
                  </button>

                  <button
                    className="btn-secondary w-full justify-center"
                    onClick={() => tailorMutation.mutate()}
                    disabled={!selectedCv || !job || tailorMutation.isPending}
                  >
                    <Copy size={14} />
                    {tailorMutation.isPending ? "Tailoring…" : "Tailor my CV"}
                  </button>

                  <button
                    className="btn-secondary w-full justify-center"
                    onClick={() => coverMutation.mutate()}
                    disabled={!selectedCv || !job || coverMutation.isPending}
                  >
                    <FileSignature size={14} />
                    {coverMutation.isPending
                      ? "Writing…"
                      : "Write cover letter"}
                  </button>

                  <div className="border-t border-ash-border pt-3 space-y-2">
                    <button
                      className="btn-ghost w-full justify-center text-xs"
                      onClick={() => toggleSaveMutation.mutate()}
                      disabled={toggleSaveMutation.isPending}
                    >
                      <Save size={13} className={isSaved ? "fill-current text-indigo-600" : ""} />
                      {isSaved ? "Unsave" : "Save job"}
                    </button>
                    <button
                      className="btn-primary w-full justify-center"
                      onClick={() => trackMutation.mutate()}
                      disabled={trackMutation.isPending}
                    >
                      <Briefcase size={14} />
                      {trackMutation.isPending
                        ? "Adding…"
                        : "Track application"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-ash-border bg-ash/40 p-4 text-sm text-ink-muted">
                    Sign in to score your CV against this role, tailor it, and
                    generate a cover letter.
                  </div>
                  <Link
                    to="/login"
                    className="btn-primary w-full justify-center"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="btn-secondary w-full justify-center text-xs"
                  >
                    Create free account
                  </Link>
                </div>
              )}
            </div>

            {/* Source card */}
            <div className="card">
              <p className="text-xs uppercase tracking-[0.18em] text-ink-muted mb-3">
                Details
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Source</span>
                  <span className="text-ink capitalize">{job.source}</span>
                </div>
                {job.category && (
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Category</span>
                    <span className="text-ink">{job.category}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-ink-muted">Type</span>
                  <span className="text-ink">
                    {job.remote ? "Remote" : "On-site / hybrid"}
                  </span>
                </div>
                {(job.salary_min || job.salary_max) && (
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Salary</span>
                    <span className="text-ink text-xs">
                      {[job.salary_min, job.salary_max]
                        .filter(Boolean)
                        .map(
                          (v) =>
                            `${job.currency || "$"}${Math.round(v!).toLocaleString()}`,
                        )
                        .join(" – ")}
                    </span>
                  </div>
                )}
              </div>
              <a
                href={externalUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary mt-4 w-full justify-center text-xs"
              >
                <ExternalLink size={13} /> Open original listing
              </a>
            </div>
          </aside>
        </div>
      </div>

      <CoverLetterModal
        open={coverOpen}
        letter={coverLetter}
        title={job.title}
        onClose={() => setCoverOpen(false)}
      />
    </div>
  );
}
