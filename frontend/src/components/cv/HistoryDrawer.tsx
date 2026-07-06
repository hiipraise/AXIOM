import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cvApi } from "../../api";
import { CVData } from "../../types";
import { X, RotateCcw, Clock, GitCompare, ChevronDown, ChevronUp } from "lucide-react";
import { useAnnouncement } from "../../context/announcement"
import DiffViewer from "./DiffViewer";

interface HistoryEntry {
  id: string;
  title: string;
  saved_at: string;
  snapshot: CVData;
}

interface Props {
  cvId: string;
  currentData?: CVData;
  onRestore: (snapshot: CVData) => void;
  onClose: () => void;
}

export default function HistoryDrawer({ cvId, currentData, onRestore, onClose }: Props) {

  const { data: history = [], isLoading } = useQuery<HistoryEntry[]>({
    queryKey: ["cv-history", cvId],
    queryFn: () => cvApi.history(cvId),
  });

  const [selectedCompare, setSelectedCompare] = useState<HistoryEntry | null>(null);
  const [compareWith, setCompareWith] = useState<"current" | "previous">("current");

  const fmt = (d: string) =>
    new Date(d).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleCompare = (entry: HistoryEntry) => {
    if (selectedCompare?.id === entry.id) {
      setSelectedCompare(null);
    } else {
      setSelectedCompare(entry);
    }
  };

  const getCompareData = (): CVData | null => {
    if (!selectedCompare) return null;
    if (compareWith === "current" && currentData) {
      return currentData;
    }
    // Compare with the previous version in the list
    const idx = history.findIndex(h => h.id === selectedCompare.id);
    if (idx >= 0 && idx < history.length - 1) {
      return history[idx + 1].snapshot;
    }
    return selectedCompare.snapshot;
  };

  const compareData = getCompareData();

  const { bannerH } = useAnnouncement()

  return (
    <div className="fixed inset-y-0 right-0 w-72 bg-white border-l border-ash-border z-40 flex flex-col shadow-xl" style={{ top: bannerH, transition: 'top 0.28s cubic-bezier(0.4,0,0.2,1)' }}>
      <div className="px-4 py-3 border-b border-ash-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-ink-muted" />
          <span className="text-sm font-medium text-ink">Version History</span>
        </div>
        <button
          onClick={onClose}
          className="text-ink-muted hover:text-ink transition-colors"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading && (
          <div className="space-y-2" role="status" aria-label="Loading history">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border border-ash-border rounded-lg p-3 animate-pulse">
                <div className="h-3 w-3/4 rounded bg-ash-dark mb-2" />
                <div className="h-2 w-1/2 rounded bg-ash-dark mb-3" />
                <div className="flex gap-3">
                  <div className="h-3 w-14 rounded bg-ash-dark" />
                  <div className="h-3 w-14 rounded bg-ash-dark" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!isLoading && history.length === 0 && (
          <div className="text-center py-8">
            <Clock size={20} className="text-ink-muted mx-auto mb-2" />
            <p className="text-xs text-ink-muted">No history yet.</p>
            <p className="text-xs text-ink-muted mt-1">
              History is saved automatically when you update a CV.
            </p>
          </div>
        )}
        {history.map((entry) => (
          <div
            key={entry.id}
            className="border border-ash-border rounded-lg p-3 hover:bg-ash transition-colors"
          >
            <p className="text-xs font-medium text-ink">{entry.title}</p>
            <p className="text-[10px] text-ink-muted mt-0.5">
              {fmt(entry.saved_at)}
            </p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => onRestore(entry.snapshot)}
                className="flex items-center gap-1.5 text-[11px] text-ink hover:text-ink-muted transition-colors"
              >
                <RotateCcw size={11} /> Restore
              </button>
              {currentData && (
                <button
                  onClick={() => handleCompare(entry)}
                  className="flex items-center gap-1.5 text-[11px] text-ink hover:text-ink-muted transition-colors"
                >
                  <GitCompare size={11} />
                  {selectedCompare?.id === entry.id ? "Hide" : "Compare"}
                </button>
              )}
            </div>
            {selectedCompare?.id === entry.id && compareData && (
              <div className="mt-3 border-t border-ash-border pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] text-ink-muted">Compare with:</span>
                  <select
                    value={compareWith}
                    onChange={(e) => setCompareWith(e.target.value as "current" | "previous")}
                    className="text-[10px] bg-white border border-ash-border rounded px-1 py-0.5"
                  >
                    <option value="current">Current</option>
                    <option value="previous">Previous version</option>
                  </select>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <DiffViewer before={entry.snapshot} after={compareData} />
                </div>
                <button
                  onClick={() => onRestore(entry.snapshot)}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 text-[11px] bg-axiom text-white rounded py-1.5 hover:bg-axiom-dark transition-colors"
                >
                  <RotateCcw size={11} /> Restore this version
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
