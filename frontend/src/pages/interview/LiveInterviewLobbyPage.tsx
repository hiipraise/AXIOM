import { useNavigate, useParams } from "react-router-dom";
import { Video } from "lucide-react";

export default function LiveInterviewLobbyPage() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="card text-center">
        <Video className="mx-auto text-ink-muted" size={28} />
        <h1 className="mt-3 font-display text-2xl font-bold text-ink">Ready to join?</h1>
        <p className="mt-2 text-sm text-ink-muted">Check your camera and microphone permissions in the browser prompt.</p>
        <button className="btn-primary mt-5" onClick={() => navigate(`/interview/live/${sessionId}`)}>Join interview</button>
      </div>
    </div>
  );
}
