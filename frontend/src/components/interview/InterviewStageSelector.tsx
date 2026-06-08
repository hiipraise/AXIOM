export default function InterviewStageSelector({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        ["live_manual", "Live"],
        ["live_ai", "AI assisted"],
      ].map(([mode, label]) => (
        <button key={mode} className={value === mode ? "btn-primary justify-center" : "btn-secondary justify-center"} onClick={() => onChange(mode)}>
          {label}
        </button>
      ))}
    </div>
  );
}
