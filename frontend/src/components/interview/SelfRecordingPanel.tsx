import { useEffect, useRef, useState, useCallback } from "react";

interface SelfRecordingPanelProps {
  onRecordingComplete?: (blob: Blob) => void;
}

export default function SelfRecordingPanel({ onRecordingComplete }: SelfRecordingPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        mediaRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        console.warn("Camera access denied");
      }
    }
    startCamera();
    return () => mediaRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const startRecording = () => {
    if (!mediaRef.current) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(mediaRef.current);
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = () => {
      const videoBlob = new Blob(chunksRef.current, { type: "video/webm" });
      setBlob(videoBlob);
      setVideoUrl(URL.createObjectURL(videoBlob));
      onRecordingComplete?.(videoBlob);
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const handleUpload = useCallback(() => {
    if (!blob) return;
    setUploading(true);
    // Parent component handles upload via onRecordingComplete callback
    onRecordingComplete?.(blob);
    setUploading(false);
  }, [blob, onRecordingComplete]);

  return (
    <div className="overflow-hidden rounded-lg border border-ash-border bg-ink">
      <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full object-cover" />
      <div className="flex flex-wrap items-center gap-2 border-t border-ash-border bg-white p-3">
        <button
          className={recording ? "btn-danger" : "btn-primary"}
          onClick={recording ? stopRecording : startRecording}
        >
          {recording ? "Stop recording" : "Start recording"}
        </button>
        {videoUrl && blob && (
          <>
            <a href={videoUrl} download="interview-recording.webm" className="btn-secondary !text-xs">
              Download
            </a>
            <span className="text-xs text-ink-muted">Recording ready - will save on submit</span>
          </>
        )}
        {uploading && <span className="text-xs text-ink-muted">Uploading...</span>}
      </div>
    </div>
  );
}