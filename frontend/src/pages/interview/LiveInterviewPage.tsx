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
  const { data: session, isLoading } = useQuery({ queryKey: ["live-interview", sessionId], queryFn: () => liveInterviewApi.get(sessionId), enabled: !!sessionId });
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
                <QuestionPlayer question="Tell me about your most relevant experience for this role." autoPlay={!isEmployer} />
                {!isEmployer && <div className="mt-4"><VoiceCapturePanel value={answer} onChange={setAnswer} /></div>}
              </div>
            )}
            {isEmployer && (
              <div className="card">
                <label className="label">Employer notes</label>
                <textarea className="input min-h-[220px]" value={notes} onChange={(event) => setNotes(event.target.value)} />
                <button className="btn-primary mt-3 w-full justify-center" onClick={() => feedbackMutation.mutate()}>End and save</button>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
