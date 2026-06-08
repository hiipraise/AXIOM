import { Mic, PhoneOff, Video } from "lucide-react";
import { useInterviewTimer } from "../../hooks/useInterviewTimer";

export default function MediaControls({ duration, onLeave }: { duration: number; onLeave: () => void }) {
  const timer = useInterviewTimer(duration);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ash-border bg-white p-3">
      <div className={`font-mono text-sm ${timer.warning ? "text-red-600" : "text-ink"}`}>{timer.label}</div>
      <div className="flex items-center gap-2">
        <button className="btn-secondary !p-2" aria-label="Toggle microphone"><Mic size={16} /></button>
        <button className="btn-secondary !p-2" aria-label="Toggle camera"><Video size={16} /></button>
        <button className="btn-primary !p-2" onClick={onLeave} aria-label="Leave interview"><PhoneOff size={16} /></button>
      </div>
    </div>
  );
}
