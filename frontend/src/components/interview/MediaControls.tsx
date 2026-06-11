import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { useInterviewTimer } from "../../hooks/useInterviewTimer";
import { useInterviewMedia } from "../../hooks/useInterviewMedia";

interface Props {
  duration: number;
  onLeave: () => void;
  onTimeUp?: () => void;
}

export default function MediaControls({ duration, onLeave, onTimeUp }: Props) {
  const timer = useInterviewTimer(duration, onTimeUp);
  const media = useInterviewMedia();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ash-border bg-white p-3">
      <div
        className={`font-mono text-sm ${timer.warning ? "text-red-600" : "text-ink"}`}
      >
        {timer.label}
      </div>
      <div className="flex items-center gap-2">
        <button
          className="btn-secondary !p-2"
          onClick={media.toggleMic}
          aria-label="Toggle microphone"
        >
          {media.micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
        </button>
        <button
          className="btn-secondary !p-2"
          onClick={media.toggleCamera}
          aria-label="Toggle camera"
        >
          {media.cameraEnabled ? <Video size={16} /> : <VideoOff size={16} />}
        </button>
        <button
          className="btn-primary !p-2"
          onClick={() => {
            media.stop();
            onLeave();
          }}
          aria-label="Leave interview"
        >
          <PhoneOff size={16} />
        </button>
      </div>
    </div>
  );
}
