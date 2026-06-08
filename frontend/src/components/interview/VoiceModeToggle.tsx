import { Mic } from "lucide-react";

export default function VoiceModeToggle({ enabled, onChange }: { enabled: boolean; onChange: (value: boolean) => void }) {
  const supported = "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ash-border bg-white p-3">
      <div className="flex items-center gap-2 text-sm text-ink">
        <Mic size={15} /> Voice mode
        {!supported && <span className="text-xs text-amber-700">Chrome or Edge recommended</span>}
      </div>
      <button className={enabled ? "btn-primary !py-1.5 !px-3 !text-xs" : "btn-secondary !py-1.5 !px-3 !text-xs"} onClick={() => onChange(!enabled)}>
        {enabled ? "On" : "Off"}
      </button>
    </div>
  );
}
