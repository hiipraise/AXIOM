import { Mic, Square } from "lucide-react";
import { useEffect } from "react";
import { useVoiceCapture } from "../../hooks/useVoiceCapture";

export default function VoiceCapturePanel({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const voice = useVoiceCapture();
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
      <textarea className="input min-h-[140px]" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
