import { Mic, Square, Video, VideoOff } from "lucide-react";
import { useEffect } from "react";
import { useInterviewMedia } from "../../hooks/useInterviewMedia";
import { useVoiceCapture } from "../../hooks/useVoiceCapture";

export default function VoiceCapturePanel({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const voice = useVoiceCapture();
  const media = useInterviewMedia();
  useEffect(() => {
    if (voice.transcript) onChange(voice.transcript);
  }, [voice.transcript, onChange]);

  return (
    <div className="space-y-3">
      {!voice.isSupported && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Voice capture is not available in this browser. Type your answer instead.</div>}
      <div className="flex items-center gap-2">
        <button type="button" className={voice.isListening ? "btn-primary" : "btn-secondary"} onClick={voice.isListening ? voice.stop : voice.start} disabled={!voice.isSupported}>
          {voice.isListening ? <Square size={15} /> : <Mic size={15} />} {voice.isListening ? "Stop" : "Speak"}
        </button>
        {voice.isListening && <span className="text-xs text-ink-muted">Listening...</span>}
      </div>
      <div className="overflow-hidden rounded-lg border border-ash-border bg-ink">
        {media.stream ? (
          <video ref={media.videoRef} autoPlay muted playsInline className="aspect-video w-full object-cover" />
        ) : (
          <div className="flex aspect-video items-center justify-center text-xs text-white/60">Camera preview off</div>
        )}
      </div>
      <button type="button" className="btn-secondary !py-1.5 !px-3 !text-xs" onClick={() => media.stream ? media.stop() : media.start(true)}>
        {media.stream ? <VideoOff size={13} /> : <Video size={13} />} {media.stream ? "Turn camera off" : "Preview camera"}
      </button>
      {media.error && <p className="text-xs text-red-600">{media.error}</p>}
      <textarea className="input min-h-[140px]" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
