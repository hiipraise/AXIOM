import { useEffect } from "react";
import { X, Copy, Download } from "lucide-react";
import toast from "react-hot-toast";

export default function CoverLetterModal({
  open,
  letter,
  title,
  onClose,
}: {
  open: boolean;
  letter: string;
  title: string;
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
        <div className="p-5">
          <textarea
            readOnly
            value={letter}
            className="textarea min-h-[360px] font-serif text-[15px] leading-7"
          />
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-ash-border bg-ash/40">
          <button className="btn-secondary" onClick={copy}>
            <Copy size={14} /> Copy
          </button>
          <button className="btn-primary" onClick={download}>
            <Download size={14} /> Download txt
          </button>
        </div>
      </div>
    </div>
  );
}