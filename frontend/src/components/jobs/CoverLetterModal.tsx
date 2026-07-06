import { useEffect } from "react";
import { X, Copy, Download, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

export default function CoverLetterModal({
  open,
  letter,
  title,
  isGenerating,
  onClose,
}: {
  open: boolean;
  letter: string;
  title: string;
  isGenerating?: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(letter);
    toast.success("Cover letter copied");
  };

  const download = () => {
    const blob = new Blob([letter], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "-").toLowerCase()}-cover-letter.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const showSkeleton = isGenerating || !letter;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-ash-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ash-border">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Cover letter</p>
            <h3 className="font-display text-lg font-bold text-ink tracking-tight">{title}</h3>
          </div>
          <button className="btn-ghost" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {showSkeleton ? (
          <div className="p-5">
            <div className="min-h-[360px] flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <Sparkles size={32} className="text-ink-muted animate-pulse" />
                <span className="absolute -top-1 -right-1 w-3 h-3">
                  <span className="absolute inset-0 rounded-full bg-ink opacity-30 animate-ping" />
                  <span className="absolute inset-0.5 rounded-full bg-ink" />
                </span>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-ink">Generating cover letter</p>
                <p className="text-xs text-ink-muted mt-1">
                  Tailoring content to the job description…
                </p>
              </div>
              <div className="flex gap-1.5 mt-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-ink/20 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              {/* Skeleton text lines */}
              <div className="w-full max-w-md space-y-3 mt-4">
                <div className="h-3 rounded bg-ash-dark animate-pulse" />
                <div className="h-3 rounded bg-ash-dark animate-pulse w-11/12" />
                <div className="h-3 rounded bg-ash-dark animate-pulse w-4/5" />
                <div className="h-3 rounded bg-ash-dark animate-pulse w-3/4" />
                <div className="h-3 rounded bg-ash-dark animate-pulse w-5/6" />
                <div className="h-3 rounded bg-ash-dark animate-pulse w-9/12" />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5">
            <textarea
              readOnly
              value={letter}
              className="textarea min-h-[360px] font-serif text-[15px] leading-7"
            />
          </div>
        )}

        {!showSkeleton && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-ash-border bg-ash/40">
            <button className="btn-secondary" onClick={copy}>
              <Copy size={14} /> Copy
            </button>
            <button className="btn-primary" onClick={download}>
              <Download size={14} /> Download txt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}