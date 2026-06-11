import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";

export default function LiveInterviewLobbyPage() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  useEffect(() => {
    let active = true;

    async function init() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera preview is not available in this browser.");
        return;
      }
      try {
        const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!active) { media.getTracks().forEach((t) => t.stop()); return; }
        setStream(media);
        // Sync directly — don't rely on a separate effect reacting to stream state
        if (videoRef.current) {
          videoRef.current.srcObject = media;
          videoRef.current.play().catch(() => {});
        }
      } catch {
        setError("Allow camera and microphone access to preview before joining.");
      }
    }

    init();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ref callback: fires when React mounts the <video> element.
  // Handles the case where stream resolves before the element is in the DOM.
  const setVideoRef = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && stream) {
      el.srcObject = stream;
      el.play().catch(() => {});
    }
  };

  const toggleCamera = () => {
    stream?.getVideoTracks().forEach((t) => { t.enabled = !cameraOn; });
    setCameraOn((v) => !v);
  };

  const toggleMic = () => {
    stream?.getAudioTracks().forEach((t) => { t.enabled = !micOn; });
    setMicOn((v) => !v);
  };

  const join = () => {
    stream?.getTracks().forEach((t) => t.stop());
    navigate(`/interview/live/${sessionId}`);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="card">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Live interview lobby</p>
            <h1 className="mt-1 font-display text-2xl font-bold text-ink">Ready to join?</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Candidates and recruiters join the same room. Recruiters will see interviewer controls after entering.
            </p>
          </div>
          <Video className="text-ink-muted" size={28} />
        </div>

        <div className="overflow-hidden rounded-lg border border-ash-border bg-ink">
          {stream && cameraOn ? (
            <video
              ref={setVideoRef}
              autoPlay
              playsInline
              muted
              className="aspect-video w-full object-cover"
            />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center text-sm text-white/70">
              {error || "Camera is off"}
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-xs text-amber-700">{error}</p>}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button type="button" className="btn-secondary" onClick={toggleCamera} disabled={!stream}>
              {cameraOn ? <Video size={15} /> : <VideoOff size={15} />}
              {cameraOn ? "Camera on" : "Camera off"}
            </button>
            <button type="button" className="btn-secondary" onClick={toggleMic} disabled={!stream}>
              {micOn ? <Mic size={15} /> : <MicOff size={15} />}
              {micOn ? "Mic on" : "Mic off"}
            </button>
          </div>
          <button className="btn-primary" onClick={join}>
            Join interview
          </button>
        </div>
      </div>
    </div>
  );
}