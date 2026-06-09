import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import toast from "react-hot-toast";
import { liveInterviewApi } from "../../api";
import { useAuthStore } from "../../store/auth";
import JitsiRoom from "../../components/interview/JitsiRoom";
import MediaControls from "../../components/interview/MediaControls";
import QuestionPlayer from "../../components/interview/QuestionPlayer";
import VoiceCapturePanel from "../../components/interview/VoiceCapturePanel";

export default function LiveInterviewPage() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [notes, setNotes] = useState("");
  const [answer, setAnswer] = useState("");
  const [followUp, setFollowUp] = useState("");
  const { data: session, isLoading, refetch } = useQuery({ queryKey: ["live-interview", sessionId], queryFn: () => liveInterviewApi.get(sessionId), enabled: !!sessionId, refetchInterval: 5000 });
  const nextQuestion = useMutation({ mutationFn: () => liveInterviewApi.nextQuestion(sessionId), onSuccess: () => { setAnswer(""); refetch(); } });
  const answerMutation = useMutation({ mutationFn: () => liveInterviewApi.answer(sessionId, { answer }), onSuccess: () => { toast.success("Answer evaluated"); setAnswer(""); refetch(); } });
  const followUpMutation = useMutation({ mutationFn: () => liveInterviewApi.followUp(sessionId, { question: followUp }), onSuccess: () => { toast.success("Follow-up sent"); setFollowUp(""); refetch(); } });
  const summaryMutation = useMutation({ mutationFn: () => liveInterviewApi.summarize(sessionId), onSuccess: () => { toast.success("AI notes updated"); refetch(); } });
  const feedbackMutation = useMutation({
    mutationFn: () => liveInterviewApi.feedback(sessionId, { employer_notes: notes, ended: true }),
    onSuccess: () => {
      toast.success("Interview notes saved");
      navigate("/recruiter/applications");
    },
  });

  if (isLoading || !session) return <div className="p-8">Loading interview...</div>;
  const isEmployer = user?.id === session.employer_id;
  const aiMode = session.session_type === "live_ai";
  const lastAiQuestion = [...session.transcript].reverse().find((item) => item.type === "ai_question");
  const latestQuestion = session.current_question || String(lastAiQuestion?.question || "Click next question to begin.");
  const latestEmployerQuestion = session.employer_question;

  return (
    <div className="min-h-screen bg-ash">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Live interview</p>
            <h1 className="font-display text-2xl font-bold text-ink">{aiMode ? "AI assisted interview" : "Manual interview"}</h1>
          </div>
          <span className="badge bg-ash-dark text-ink-muted">{session.duration_minutes} min</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="space-y-3">
            <JitsiRoom roomName={session.jitsi_room || session.id} displayName={user?.username || "AXIOM guest"} />
            <MediaControls duration={session.duration_minutes} onLeave={() => navigate(isEmployer ? "/recruiter/applications" : "/dashboard")} />
          </div>
          <aside className="space-y-3">
            {aiMode && (
              <div className="card">
                <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">AI stage</p>
                <QuestionPlayer question={latestQuestion} autoPlay={!isEmployer && !!session.current_question} />
                <div className="mt-4 flex gap-2">
                  <button className="btn-secondary !py-1.5 !px-3 !text-xs" onClick={() => nextQuestion.mutate()} disabled={nextQuestion.isPending}>Next question</button>
                  {!isEmployer && <button className="btn-primary !py-1.5 !px-3 !text-xs" onClick={() => answerMutation.mutate()} disabled={!answer.trim() || answerMutation.isPending}>Submit answer</button>}
                </div>
                {!isEmployer && latestEmployerQuestion && (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-amber-700">Employer follow-up</p>
                    <QuestionPlayer question={latestEmployerQuestion} autoPlay />
                  </div>
                )}
                {!isEmployer && <div className="mt-4"><VoiceCapturePanel value={answer} onChange={setAnswer} /></div>}
              </div>
            )}
            {isEmployer && (
              <div className="card">
                <label className="label">Follow-up question</label>
                <textarea className="input min-h-[90px]" value={followUp} onChange={(event) => setFollowUp(event.target.value)} />
                <button className="btn-secondary mt-2 w-full justify-center" onClick={() => followUpMutation.mutate()} disabled={!followUp.trim() || followUpMutation.isPending}>Send to candidate</button>
                <div className="my-4 border-t border-ash-border" />
                <label className="label">Employer notes</label>
                <textarea className="input min-h-[220px]" value={notes} onChange={(event) => setNotes(event.target.value)} />
                <button className="btn-secondary mt-3 w-full justify-center" onClick={() => summaryMutation.mutate()} disabled={summaryMutation.isPending}>Generate AI note summary</button>
                {session.ai_summary && <p className="mt-3 rounded-lg bg-ash p-3 text-sm text-ink-muted">{session.ai_summary}</p>}
                <button className="btn-primary mt-3 w-full justify-center" onClick={() => feedbackMutation.mutate()}>End and save</button>
              </div>
            )}
            {isEmployer && (
              <div className="card">
                <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Transcript</p>
                <div className="mt-3 max-h-[360px] space-y-3 overflow-auto">
                  {session.transcript.map((item, index) => (
                    <div key={index} className="rounded-lg border border-ash-border p-3 text-sm">
                      <p className="font-medium text-ink">{String(item.question || item.type || "Entry")}</p>
                      {item.answer ? <p className="mt-2 text-ink-muted">{String(item.answer)}</p> : null}
                      {item.feedback ? <p className="mt-2 text-xs text-emerald-700">Feedback saved</p> : null}
                    </div>
                  ))}
                  {session.transcript.length === 0 && <p className="text-sm text-ink-muted">Transcript appears here as questions and answers are captured.</p>}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
