import { useEffect, useState } from "react";
import { X, Download, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import CVRenderer from "../cv/CVRenderer";
import { api } from "../../api";
import { CVData, normalizeCVData } from "../../types";

interface CvSnapshotModalProps {
  open: boolean;
  snapshot: Record<string, unknown> | null;
  candidateName?: string;
  jobTitle?: string;
  theme?: string;
  template?: string;
  onClose: () => void;
}

export default function CvSnapshotModal({
  open,
  snapshot,
  candidateName,
  jobTitle,
  theme = "minimal",
  template = "standard",
  onClose,
}: CvSnapshotModalProps) {
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !snapshot) return null;

  const cvData: CVData = normalizeCVData(snapshot as Partial<CVData>);

  const displayName =
    candidateName ||
    cvData.personal_info?.full_name ||
    "Candidate";

  const download = async () => {
    setDownloading(true);
    try {
      const blob = await api
        .post("/export/html-pdf", { cv_data: cvData, theme, template }, { responseType: "blob" })
        .then((r) => r.data as Blob);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${displayName.replace(/\s+/g, "-").toLowerCase()}-cv.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download CV");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-ash-border bg-white shadow-2xl"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-ash-border px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">CV snapshot</p>
            <h3 className="font-display text-lg font-bold tracking-tight text-ink">
              {displayName}
              {jobTitle && <span className="ml-2 text-sm font-normal text-ink-muted">· {jobTitle}</span>}
            </h3>
          </div>
          <button className="btn-ghost" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* CV body — scrollable */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-ash/30 p-4">
          <div className="mx-auto w-full max-w-[700px] rounded-lg border border-ash-border bg-white shadow-sm">
            <CVRenderer cvData={cvData} theme={theme} template={template} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-ash-border bg-ash/40 px-5 py-3">
          <p className="text-xs text-ink-muted">
            Snapshot captured at time of application
          </p>
          <button
            className="btn-primary"
            onClick={download}
            disabled={downloading}
          >
            {downloading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}{" "}
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}