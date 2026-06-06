import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Brain, Clock, MessageSquare, Play, Star } from "lucide-react";
import toast from "react-hot-toast";
import { cvApi, interviewApi, jobsApi } from "../../api";
import { ApplicationEntry, CV, InterviewMode, InterviewSessionListItem } from "../../types";

const MODES: Array<{ value: InterviewMode; label: string; description: string }> = [
  { value: "behavioural", label: "Behavioural", description: "STAR-style stories, motivation, teamwork, conflict, impact." },
  { value: "technical", label: "Technical", description: "Role-specific skills, tools, trade-offs, and practical judgement." },
  { value: "full", label: "Full interview", description: "Behavioural, situational, technical, and CV-probing questions." },
];

export default function InterviewStartPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [cvId, setCvId] = useState(searchParams.get("cv") || "");
  const [jobId, setJobId] = useState(searchParams.get("job") || "");
  const [jobDescription, setJobDescription] = useState("");
  const [mode, setMode] = useState<InterviewMode>("behavioural");
  const [useStar, setUseStar] = useState(true);

  const { data: cvs = [] } = useQuery<CV[]>({ queryKey: ["cvs"], queryFn: cvApi.list });
  const { data: applications = [] } = useQuery<ApplicationEntry[]>({ queryKey: ["applications"], queryFn: jobsApi.applications });
  const { data: sessions = [] } = useQuery<InterviewSessionListItem[]>({ queryKey: ["interview-sessions"], queryFn: interviewApi.sessions });

  const selectedApplication = useMemo(
    () => applications.find((app) => app.job_id === jobId),
    [applications, jobId],
  );

  const startMutation = useMutation({
    mutationFn: () =>
      interviewApi.start({
        cv_id: cvId,
        job_id: jobId || undefined,
        job_description: jobDescription || undefined,
        mode,
        use_star: useStar,
      }),
    onSuccess: (data) => navigate(`/interview/${data.session_id}`),
    onError: () => toast.error("Could not start interview. Check the CV and job context."),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!cvId) return toast.error("Choose the CV you submitted");
    if (!jobId && !jobDescription.trim()) return toast.error("Pick a tracked role or paste a job description");
    startMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-ash">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl bg-ink p-8 text-white shadow-sm">
            <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/60">
              <Brain size={15} /> AXIOM Interview Prep
            </p>
            <h1 className="font-display text-4xl font-bold tracking-tight">Practise for the role you actually applied to.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70">
              Pull in the job description and the CV you submitted, then get a structured mock interview with per-answer feedback on clarity, specificity, evidence, and length.
            </p>
          </div>
          <div className="card flex flex-col justify-center">
            <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Recent sessions</p>
            <div className="mt-3 space-y-2">
              {sessions.slice(0, 3).map((session) => (
                <Link key={session.id} to={`/interview/${session.id}${session.status === "completed" ? "/review" : ""}`} className="block rounded-xl border border-ash-border p-3 hover:bg-ash/50">
                  <div className="flex items-center justify-between gap-3">
                    <p className="line-clamp-1 text-sm font-medium text-ink">{session.job_title || "Mock interview"}</p>
                    <span className="badge bg-ash-dark text-ink-muted">{session.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">{session.answered_count}/{session.question_count} answered · {session.mode}</p>
                </Link>
              ))}
              {sessions.length === 0 && <p className="text-sm text-ink-muted">Your practice history will appear here.</p>}
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <section className="card space-y-5">
            <div>
              <label className="label">CV submitted</label>
              <select className="input" value={cvId} onChange={(event) => setCvId(event.target.value)}>
                <option value="">Select a CV</option>
                {cvs.map((cv) => (
                  <option key={cv.id} value={cv.id}>{cv.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Tracked role</label>
              <select className="input" value={jobId} onChange={(event) => setJobId(event.target.value)}>
                <option value="">Paste a job description instead</option>
                {applications.map((app) => (
                  <option key={app.id} value={app.job_id}>{app.job?.title || app.job_id} · {app.job?.company || "Unknown company"}</option>
                ))}
              </select>
              {selectedApplication?.cv_id && !cvId && (
                <button type="button" className="mt-2 text-xs font-medium text-ink underline" onClick={() => setCvId(selectedApplication.cv_id || "")}>Use CV attached to this application</button>
              )}
            </div>

            <div>
              <label className="label">Job description</label>
              <textarea className="input min-h-[220px]" value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} placeholder="Paste the JD here if the role is not in your tracker, or add extra interview notes for a tracked role." />
            </div>
          </section>

          <section className="card space-y-5">
            <div>
              <label className="label">Session mode</label>
              <div className="grid gap-3">
                {MODES.map((option) => (
                  <label key={option.value} className={`cursor-pointer rounded-2xl border p-4 transition ${mode === option.value ? "border-ink bg-ink text-white" : "border-ash-border bg-white hover:bg-ash/50"}`}>
                    <input type="radio" className="sr-only" checked={mode === option.value} onChange={() => setMode(option.value)} />
                    <span className="font-medium">{option.label}</span>
                    <span className={`mt-1 block text-sm ${mode === option.value ? "text-white/70" : "text-ink-muted"}`}>{option.description}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-ash-border p-4">
              <input type="checkbox" className="mt-1" checked={useStar} onChange={(event) => setUseStar(event.target.checked)} />
              <span>
                <span className="flex items-center gap-2 font-medium text-ink"><Star size={15} /> Coach with STAR prompts</span>
                <span className="mt-1 block text-sm text-ink-muted">Nudge answers toward Situation, Task, Action, Result when it helps.</span>
              </span>
            </label>

            <button className="btn-primary w-full justify-center" disabled={startMutation.isPending}>
              <Play size={16} /> {startMutation.isPending ? "Starting..." : "Start mock interview"}
            </button>

            <div className="rounded-2xl bg-ash p-4 text-sm text-ink-muted">
              <p className="mb-2 flex items-center gap-2 font-medium text-ink"><MessageSquare size={15} /> What you’ll get</p>
              <ul className="space-y-1">
                <li>• One question at a time</li>
                <li>• Feedback after each answer</li>
                <li>• Scores for clarity, evidence, specificity, and length</li>
                <li>• Final review with top improvements</li>
              </ul>
            </div>
          </section>
        </form>

        <Link to="/interview" className="mt-8 inline-flex items-center gap-2 text-sm text-ink-muted"><Clock size={14} /> Session history is saved automatically</Link>
      </div>
    </div>
  );
}
