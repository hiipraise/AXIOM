import { useEffect, useRef, useState } from "react";

export default function SelfRecordingPanel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

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
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setVideoUrl(URL.createObjectURL(blob));
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-ash-border bg-ink">
      <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full object-cover" />
      <div className="flex items-center gap-2 border-t border-ash-border bg-white p-3">
        <button
          className={recording ? "btn-danger" : "btn-primary"}
          onClick={recording ? stopRecording : startRecording}
        >
          {recording ? "Stop recording" : "Start recording"}
        </button>
        {videoUrl && (
          <a href={videoUrl} download="interview-recording.webm" className="btn-secondary !text-xs">
            Download recording
          </a>
        )}
      </div>
    </div>
  );
}