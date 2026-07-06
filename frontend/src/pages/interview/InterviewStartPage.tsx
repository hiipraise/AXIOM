import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Brain,
  Clock,
  MessageSquare,
  Play,
  RotateCcw,
  Star,
  TrendingUp,
  BarChart3,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import { cvApi, interviewApi } from "../../api";
import {
  CV,
  InterviewMode,
  InterviewSessionListItem,
  DifficultyInfo,
} from "../../types";
import TopicHeatmap from "../../components/interview/TopicHeatmap";

const MODES: Array<{
  value: InterviewMode;
  label: string;
  description: string;
}> = [
  {
    value: "behavioural",
    label: "Behavioural",
    description: "STAR-style stories, motivation, teamwork, conflict, impact.",
  },
  {
    value: "technical",
    label: "Technical",
    description:
      "Role-specific skills, tools, trade-offs, and practical judgement.",
  },
  {
    value: "full",
    label: "Full interview",
    description:
      "Behavioural, situational, technical, and CV-probing questions.",
  },
];
import Seo from "../../components/Seo";

export default function InterviewStartPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [cvId, setCvId] = useState(searchParams.get("cv") || "");
  const [jobId, setJobId] = useState(searchParams.get("job") || "");
  const [jobDescription, setJobDescription] = useState("");
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [mode, setMode] = useState<InterviewMode>("behavioural");
  const [useStar, setUseStar] = useState(true);

  // 409 conflict dialog state
  const [conflictSessionId, setConflictSessionId] = useState<string | null>(
    null,
  );

  const { data: cvData } = useQuery<{ cvs: CV[]; total: number }>({
    queryKey: ["cvs"],
    queryFn: () => cvApi.list(),
  });
  const cvs = cvData?.cvs ?? [];
  const { data: sessions = [] } = useQuery<InterviewSessionListItem[]>({
    queryKey: ["interview-sessions"],
    queryFn: interviewApi.sessions,
  });

  const { data: difficulty } = useQuery<DifficultyInfo>({
    queryKey: ["interview-difficulty", mode],
    queryFn: () => interviewApi.difficulty(mode),
  });

  const startMutation = useMutation({
    mutationFn: (force: boolean = false) =>
      interviewApi.start({
        cv_id: cvId,
        job_id: jobId || undefined,
        job_description: jobDescription || undefined,
        mode,
        use_star: useStar,
        force,
      }),
    onSuccess: (data) => navigate(`/interview/${data.session_id}`),
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const existingId = error.response.headers?.["x-existing-session-id"];
        if (existingId) {
          setConflictSessionId(existingId);
          return;
        }
      }
      toast.error("Could not start interview. Check the CV and job context.");
    },
  });

  const handleResumeExisting = () => {
    if (conflictSessionId) {
      navigate(`/interview/${conflictSessionId}`);
    }
    setConflictSessionId(null);
  };

  const handleStartNewAnyway = () => {
    setConflictSessionId(null);
    startMutation.mutate(true);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!cvId) return toast.error("Choose the CV you submitted");
    if (!jobId && !jobDescription.trim())
      return toast.error("Pick a tracked role or paste a job description");
    startMutation.mutate(false);
  };

  return (
    <div className="min-h-screen bg-ash">
      <Seo title="Interview Prep" noindex />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl bg-ink p-8 text-white shadow-sm">
            <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/60">
              <Brain size={15} /> AXIOM Interview Prep
            </p>
            <h1 className="font-display text-4xl font-bold tracking-tight">
              Practise for the role you actually applied to.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70">
              Pull in the job description and the CV you submitted, then get a
              structured mock interview with per-answer feedback on clarity,
              specificity, evidence, and length.
            </p>
            <div className="mt-4 flex items-center gap-4">
              <Link
                to="/interview/review"
                className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors"
              >
                <RotateCcw size={13} /> Review flashcards
              </Link>
              <Link
                to="/interview/history"
                className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors"
              >
                <BarChart3 size={13} /> Session history
              </Link>
            </div>
          </div>
          <div className="card flex flex-col justify-center">
            <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">
              {sessions.some((s) => s.status === "paused")
                ? "Paused / Active"
                : "Recent sessions"}
            </p>
            <div className="mt-3 space-y-2">
              {sessions.slice(0, 5).map((session) => (
                <Link
                  key={session.id}
                  to={
                    session.status === "completed"
                      ? `/interview/${session.id}/review`
                      : `/interview/${session.id}`
                  }
                  className="block rounded-xl border border-ash-border p-3 hover:bg-ash/50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="line-clamp-1 text-sm font-medium text-ink">
                      {session.job_title || "Mock interview"}
                    </p>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        session.status === "paused"
                          ? "bg-amber-50 text-amber-700"
                          : session.status === "completed"
                            ? "bg-ash text-ink-muted"
                            : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {session.status === "paused" ? "Paused" : session.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    {session.answered_count}/{session.question_count} answered ·{" "}
                    {session.mode}
                  </p>
                  {session.status === "paused" && (
                    <span className="mt-2 inline-block text-[10px] font-medium text-amber-600">
                      Click to resume
                    </span>
                  )}
                </Link>
              ))}
              {sessions.length === 0 && (
                <p className="text-sm text-ink-muted">
                  Your practice history will appear here.
                </p>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <section className="card space-y-5">
            <div>
              <label className="label">CV submitted</label>
              <select
                className="input"
                value={cvId}
                onChange={(event) => setCvId(event.target.value)}
              >
                <option value="">Select a CV</option>
                {cvs.map((cv) => (
                  <option key={cv.id} value={cv.id}>
                    {cv.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Job ID (optional)</label>
              <input
                className="input"
                value={jobId}
                onChange={(event) => setJobId(event.target.value)}
                placeholder="e.g. job_abc123 — paste from the job detail page"
              />
            </div>

            <div>
              <label className="label">Job description</label>
              <textarea
                className="input min-h-[220px]"
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Paste the JD here if the role is not in your saved jobs, or add extra interview notes for a saved role."
              />
            </div>
          </section>

          <section className="card space-y-5">
            <div>
              <label className="label">Session mode</label>
              <div className="grid gap-3">
                {MODES.map((option) => (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${mode === option.value ? "border-ink bg-ink text-white" : "border-ash-border bg-white hover:bg-ash/50"}`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      checked={mode === option.value}
                      onChange={() => setMode(option.value)}
                    />
                    <span className="font-medium">{option.label}</span>
                    <span
                      className={`mt-1 block text-sm ${mode === option.value ? "text-white/70" : "text-ink-muted"}`}
                    >
                      {option.description}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-ash-border p-4">
              <input
                type="checkbox"
                className="mt-1"
                checked={useStar}
                onChange={(event) => setUseStar(event.target.checked)}
              />
              <span>
                <span className="flex items-center gap-2 font-medium text-ink">
                  <Star size={15} /> Coach with STAR prompts
                </span>
                <span className="mt-1 block text-sm text-ink-muted">
                  Nudge answers toward Situation, Task, Action, Result when it
                  helps.
                </span>
              </span>
            </label>

            <button
              className="btn-primary w-full justify-center"
              disabled={startMutation.isPending}
            >
              <Play size={16} />{" "}
              {startMutation.isPending ? "Starting..." : "Start mock interview"}
            </button>

            {/* Difficulty indicator */}
            {difficulty && (
              <div className="rounded-2xl border border-ash-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={14} className="text-ink-muted" />
                  <span className="text-xs font-medium text-ink">
                    Difficulty: {difficulty.level}
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted leading-relaxed">
                  {difficulty.description}
                </p>
                <p className="text-[10px] text-ink-muted mt-1">
                  Based on your past {difficulty.max_questions} sessions.
                </p>
              </div>
            )}

            {/* Topic heatmap toggle */}
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className="w-full flex items-center justify-between rounded-2xl border border-ash-border p-4 text-left hover:bg-ash/50 transition-colors"
            >
              <span className="flex items-center gap-2 text-xs font-medium text-ink">
                <BarChart3 size={14} /> Topic heatmap
              </span>
              <span className="text-[10px] text-ink-muted">
                {showHeatmap ? "Hide" : "Show"}
              </span>
            </button>
            {showHeatmap && (
              <div className="rounded-2xl border border-ash-border p-4">
                <TopicHeatmap />
              </div>
            )}

            <div className="rounded-2xl bg-ash p-4 text-sm text-ink-muted">
              <p className="mb-2 flex items-center gap-2 font-medium text-ink">
                <MessageSquare size={15} /> What you’ll get
              </p>
              <ul className="space-y-1">
                <li>• One question at a time</li>
                <li>• Feedback after each answer</li>
                <li>• Scores for clarity, evidence, specificity, and length</li>
                <li>• Final review with top improvements</li>
                <li>• Flashcard review mode for spaced repetition</li>
                <li>• Difficulty adapts based on past performance</li>
              </ul>
            </div>
          </section>
        </form>

        <Link
          to="/interview"
          className="mt-8 inline-flex items-center gap-2 text-sm text-ink-muted"
        >
          <Clock size={14} /> Session history is saved automatically
        </Link>
      </div>

      {/* 409 Resume conflict dialog */}
      {conflictSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-3xl border border-ash-border bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={20}
                className="mt-0.5 shrink-0 text-amber-500"
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-ink">
                  Session in progress
                </h3>
                <p className="mt-1 text-sm text-ink-muted leading-relaxed">
                  You already have an interview session in progress for this CV
                  and job. Resume it to pick up where you left off, or abandon
                  it and start fresh.
                </p>
              </div>
              <button
                onClick={() => setConflictSessionId(null)}
                className="shrink-0 rounded-full p-1 hover:bg-ash transition-colors"
              >
                <X size={16} className="text-ink-muted" />
              </button>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={handleResumeExisting}
                className="btn-primary flex-1 justify-center"
              >
                <RotateCcw size={14} /> Resume session
              </button>
              <button
                onClick={handleStartNewAnyway}
                className="btn-secondary flex-1 justify-center"
              >
                Start new anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
