import { useState } from "react";
import { AlertCircle, Check, Wand2, X } from "lucide-react";
import toast from "react-hot-toast";
import { cvApi } from "../../api";
import type { CVData, ExperienceItem } from "../../types";

interface Props {
  cvData: CVData;
  experienceIndex: number;
  onApply: (updatedData: CVData) => void;
}

function BulletText({ text }: { text: string }) {
  const parts = text.split(/(\[METRIC NEEDED\])/g);

  return (
    <span>
      {parts.map((part, index) =>
        part === "[METRIC NEEDED]" ? (
          <span
            key={index}
            className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-amber-100 text-amber-700 border border-amber-300 rounded text-[10px] font-medium"
          >
            <AlertCircle size={9} />
            metric needed
          </span>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </span>
  );
}

export default function BulletOptimizer({
  cvData,
  experienceIndex,
  onApply,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ExperienceItem | null>(null);

  const currentExperience = cvData.experience[experienceIndex];

  const runOptimizer = async () => {
    setLoading(true);
    try {
      const res = await cvApi.aiOptimizeBullets(cvData, experienceIndex);
      const updatedExperience = res.data.experience[experienceIndex];
      setPreview(updatedExperience);
    } catch {
      toast.error("Optimisation failed");
    } finally {
      setLoading(false);
    }
  };

  const accept = () => {
    if (!preview) return;

    const nextData = { ...cvData, experience: [...cvData.experience] };
    nextData.experience[experienceIndex] = preview;
    onApply(nextData);
    setPreview(null);
    toast.success("Bullets updated");
  };

  const reject = () => {
    setPreview(null);
    toast("Changes discarded", { icon: "↩️" });
  };

  if (preview) {
    return (
      <div className="mt-3 border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold text-amber-800">
            Optimised bullets - review before accepting
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={reject}
              className="flex items-center gap-1 px-2 py-1 text-[11px] border border-ash-border bg-white text-ink-muted rounded-md hover:bg-ash transition-colors"
            >
              <X size={10} /> Discard
            </button>
            <button
              onClick={accept}
              className="flex items-center gap-1 px-2 py-1 text-[11px] bg-ink text-white rounded-md hover:bg-ink-light transition-colors"
            >
              <Check size={10} /> Accept
            </button>
          </div>
        </div>

        {preview.description &&
          preview.description !== currentExperience.description && (
            <div className="space-y-1">
              <p className="text-[10px] text-ink-muted uppercase tracking-wide font-semibold">
                Description
              </p>
              <div className="space-y-1">
                <p className="text-[11px] line-through text-red-400 leading-relaxed">
                  {currentExperience.description}
                </p>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  <BulletText text={preview.description} />
                </p>
              </div>
            </div>
          )}

        {preview.achievements.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] text-ink-muted uppercase tracking-wide font-semibold">
              Achievements
            </p>
            <div className="space-y-1.5">
              {preview.achievements.map((achievement, index) => {
                const original = currentExperience.achievements[index];
                const changed = original !== achievement;

                return (
                  <div key={index}>
                    {changed && original && (
                      <p className="text-[11px] line-through text-red-400 leading-relaxed">
                        {original}
                      </p>
                    )}
                    <p
                      className={`text-[11px] leading-relaxed ${changed ? "text-emerald-700" : "text-ink"}`}
                    >
                      • <BulletText text={achievement} />
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(() => {
          const allText = [preview.description, ...preview.achievements].join(
            " ",
          );
          const count = (allText.match(/\[METRIC NEEDED\]/g) || []).length;

          return count > 0 ? (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-100 px-2 py-1.5 rounded-md">
              <AlertCircle size={11} />
              {count} place{count !== 1 ? "s" : ""} need a real metric - fill
              these in after accepting.
            </div>
          ) : null;
        })()}
      </div>
    );
  }

  return (
    <button
      onClick={runOptimizer}
      disabled={loading}
      className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-muted hover:text-ink border border-ash-border hover:border-ink/30 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
    >
      <Wand2 size={11} />
      {loading ? "Optimising…" : "Optimise bullets"}
    </button>
  );
}
