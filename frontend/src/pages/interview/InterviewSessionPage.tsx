import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Send, Target } from "lucide-react";
import toast from "react-hot-toast";
import { interviewApi } from "../../api";
import { InterviewFeedback, InterviewSessionDetail } from "../../types";

function ScorePill({ label, value }: { label: string; value: number }) {
  return <span className="rounded-full bg-ash px-3 py-1 text-xs text-ink-muted">{label}: <b className="text-ink">{value}/10</b></span>;
}

function FeedbackCard({ feedback }: { feedback: InterviewFeedback }) {
  return (
    <div className="mt-3 rounded-2xl border border-ash-border bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="badge bg-ink text-white">Overall {feedback.overall_score}/100</span>
        <ScorePill label="Clarity" value={feedback.score.clarity} />
        <ScorePill label="Specificity" value={feedback.score.specificity} />
        <ScorePill label="Evidence" value={feedback.score.evidence} />
        <ScorePill label="Length" value={feedback.score.length} />
      </div>
      <div className="grid gap-3 text-sm md:grid-cols-2">
        <p><b className="text-ink">Strong:</b> <span className="text-ink-muted">{feedback.what_was_strong}</span></p>
        <p><b className="text-ink">Vague:</b> <span className="text-ink-muted">{feedback.what_was_vague}</span></p>
        <p><b className="text-ink">Recruiter hears:</b> <span className="text-ink-muted">{feedback.recruiter_takeaway}</span></p>
        <p><b className="text-ink">Improve:</b> <span className="text-ink-muted">{feedback.suggested_improvement}</span></p>
      </div>
    </div>
  );
}

export default function InterviewSessionPage() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [answer, setAnswer] = useState("");

  const { data: session, isLoading } = useQuery<InterviewSessionDetail>({
    queryKey: ["interview-session", sessionId],
    queryFn: () => interviewApi.session(sessionId),
    enabled: !!sessionId,
  });

  const pendingQuestion = useMemo(
    () => session?.messages.find((message) => !message.answer),
    [session],
  );

  const answerMutation = useMutation({
    mutationFn: () => interviewApi.answer(sessionId, answer.trim()),
    onSuccess: async (data) => {
      setAnswer("");
      await qc.invalidateQueries({ queryKey: ["interview-session", sessionId] });
      await qc.invalidateQueries({ queryKey: ["interview-sessions"] });
      if (data.done) navigate(`/interview/${sessionId}/review`);
    },
    onError: () => toast.error("Could not submit answer"),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!answer.trim()) return;
    answerMutation.mutate();
  };

  if (isLoading || !session) return <div className="p-8">Loading interview...</div>;

  return (
    <div className="min-h-screen bg-ash">
      <div className="mx-auto max-w-4xl px-4 py-6 lg:py-10">
        <button className="btn-ghost mb-4" onClick={() => navigate(-1)}><ArrowLeft size={14} /> Back</button>
        <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Live mock interview</p>
              <h1 className="font-display text-3xl font-bold text-ink">{session.job_title || "Interview practice"}</h1>
              <p className="mt-1 text-sm text-ink-muted">{session.company || "Pasted role"} · {session.mode} · {session.answered_count}/{session.question_count} answered</p>
            </div>
            {session.status === "completed" && <Link className="btn-primary" to={`/interview/${session.id}/review`}><CheckCircle2 size={15} /> Review</Link>}
          </div>
        </div>

        <div className="space-y-5">
          {session.messages.map((message, index) => (
            <article key={message.id} className="rounded-3xl border border-ash-border bg-white p-5">
              <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-ink-muted"><Target size={13} /> Question {index + 1}</p>
              <p className="text-lg font-medium leading-7 text-ink">{message.question}</p>
              {message.answer && <div className="mt-4 rounded-2xl bg-ash p-4 text-sm leading-6 text-ink"><b>Your answer:</b> {message.answer}</div>}
              {message.feedback && <FeedbackCard feedback={message.feedback} />}
            </article>
          ))}
        </div>

        {pendingQuestion && session.status !== "completed" && (
          <form onSubmit={submit} className="sticky bottom-0 mt-6 rounded-t-3xl border border-ash-border bg-white p-4 shadow-lg">
            <label className="label">Your answer</label>
            <textarea className="input min-h-[140px]" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Answer out loud, then paste or type your best version here. Aim for Situation, Task, Action, Result." />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-ink-muted">You’ll get feedback before the next question.</p>
              <button className="btn-primary" disabled={answerMutation.isPending || !answer.trim()}><Send size={15} /> {answerMutation.isPending ? "Scoring..." : "Submit answer"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
