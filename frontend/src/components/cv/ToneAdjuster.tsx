import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { cvApi } from "../../api";
import type { CVData, ToneStyle, ToneAdjustResponse } from "../../types";
import { TONE_OPTIONS } from "../../types";
import { stripMarkdown, stripMarkdownCVData } from "../../lib/stripMarkdown";
import {
  Sparkles,
  Check,
  X,
  ChevronDown,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  cvData: CVData;
  section: string;
  sectionLabel: string;
  onApply: (adjustedData: Partial<CVData>) => void;
  onClose?: () => void;
}

const TONE_LABELS: Record<string, string> = {
  professional: "Professional",
  concise: "Concise",
  assertive: "Assertive",
  confident: "Confident",
  moderate: "Moderate",
  enthusiastic: "Enthusiastic",
};

const TONE_DESCRIPTIONS: Record<string, string> = {
  professional:
    "Polished, formal business language with precise terminology",
  concise: "Maximum impact with minimum words — cut all filler",
  assertive: "Strong action verbs, no hedging, commanding tone",
  confident: "Definitive statements without qualifiers or understatement",
  moderate: "Balanced, factual, clear — no extreme language",
  enthusiastic:
    "Dynamic verbs, emphasis on impact, warm professional tone",
};

export default function ToneAdjuster({
  cvData,
  section,
  sectionLabel,
  onApply,
  onClose,
}: Props) {
  const [selectedTone, setSelectedTone] = useState<ToneStyle>("professional");
  const [customInstruction, setCustomInstruction] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [result, setResult] = useState<ToneAdjustResponse | null>(null);
  const [open, setOpen] = useState(false);

  const adjustToneMutation = useMutation({
    mutationFn: () =>
      cvApi.adjustTone(cvData, section, selectedTone, customInstruction),
    onSuccess: (data) => {
      setResult(data);
      toast.success(`Tone adjusted: ${TONE_LABELS[data.tone] || data.tone}`);
    },
    onError: () => toast.error("Failed to adjust tone"),
  });

  const applyAdjustment = () => {
    if (!result) return;

    // Parse adjusted content and apply to the appropriate section
    const adjusted = result.adjusted;
    const patch: Partial<CVData> = {};

    if (section === "summary") {
      patch.summary = stripMarkdown(adjusted);
    } else if (section === "skills") {
      try {
        const parsed = JSON.parse(adjusted);
        patch.skills = Array.isArray(parsed) ? parsed.map(stripMarkdown) : parsed;
      } catch {
        patch.skills = adjusted
          .split(/[,\n]/)
          .map((s) => stripMarkdown(s.trim()))
          .filter(Boolean);
      }
    } else if (section === "experience") {
      try {
        const parsed = JSON.parse(adjusted);
        patch.experience = Array.isArray(parsed) ? parsed.map(stripMarkdownCVData as unknown as (e: unknown) => typeof e) : parsed;
      } catch {
        // If JSON parsing fails, don't apply
        toast.error("Could not apply tone adjustment");
        return;
      }
    } else if (section === "education") {
      try {
        const parsed = JSON.parse(adjusted);
        patch.education = Array.isArray(parsed) ? parsed.map(stripMarkdownCVData as unknown as (e: unknown) => typeof e) : parsed;
      } catch {
        toast.error("Could not apply tone adjustment");
        return;
      }
    } else if (section === "certifications") {
      try {
        const parsed = JSON.parse(adjusted);
        patch.certifications = Array.isArray(parsed) ? parsed.map(stripMarkdownCVData as unknown as (e: unknown) => typeof e) : parsed;
      } catch {
        toast.error("Could not apply tone adjustment");
        return;
      }
    } else if (section === "projects") {
      try {
        const parsed = JSON.parse(adjusted);
        patch.projects = Array.isArray(parsed) ? parsed.map(stripMarkdownCVData as unknown as (e: unknown) => typeof e) : parsed;
      } catch {
        toast.error("Could not apply tone adjustment");
        return;
      }
    } else if (section === "languages") {
      try {
        const parsed = JSON.parse(adjusted);
        patch.languages = Array.isArray(parsed) ? parsed.map(stripMarkdownCVData as unknown as (e: unknown) => typeof e) : parsed;
      } catch {
        // Keep as text if parsing fails
      }
    } else if (section === "volunteer") {
      try {
        const parsed = JSON.parse(adjusted);
        patch.volunteer = Array.isArray(parsed) ? parsed.map(stripMarkdownCVData as unknown as (e: unknown) => typeof e) : parsed;
      } catch {
        toast.error("Could not apply tone adjustment");
        return;
      }
    }

    onApply(patch);
    setResult(null);
    setOpen(false);
    toast.success("Tone adjustment applied");
  };

  const discardAdjustment = () => {
    setResult(null);
    toast("Adjustment discarded", { icon: "↩️" });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[10px] text-ink-muted hover:text-ink border border-ash-border hover:border-ink/30 px-2 py-1 rounded-lg transition-all"
        title="Adjust tone/style of this section"
      >
        <Sparkles size={11} />
        Tone
        <ChevronDown size={10} />
      </button>
    );
  }

  return (
    <div className="bg-white border border-ash-border rounded-xl p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-ink" />
          <span className="text-xs font-medium text-ink">
            Tone: {sectionLabel}
          </span>
        </div>
        <button
          onClick={() => {
            setOpen(false);
            setResult(null);
          }}
          className="p-0.5 text-ink-muted hover:text-ink"
        >
          <X size={12} />
        </button>
      </div>

      {result ? (
        /* Preview result */
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
            <Check size={11} />
            Adjusted to{" "}
            <span className="font-medium">
              {TONE_LABELS[result.tone] || result.tone}
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="bg-ash rounded-lg p-2">
              <p className="text-[9px] text-ink-muted uppercase tracking-wide mb-1">
                Original
              </p>
              <p className="text-[11px] text-ink-muted line-through whitespace-pre-wrap">
                {result.original.length > 200
                  ? result.original.slice(0, 200) + "..."
                  : result.original}
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
              <p className="text-[9px] text-emerald-600 uppercase tracking-wide mb-1">
                Adjusted
              </p>
              <p className="text-[11px] text-emerald-800 whitespace-pre-wrap">
                {result.adjusted.length > 200
                  ? result.adjusted.slice(0, 200) + "..."
                  : result.adjusted}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={discardAdjustment}
              className="flex-1 py-1.5 text-[10px] text-ink-muted border border-ash-border rounded-lg hover:bg-ash transition-colors"
            >
              Discard
            </button>
            <button
              onClick={applyAdjustment}
              className="flex-1 py-1.5 text-[10px] bg-ink text-white rounded-lg hover:bg-ink-light transition-colors flex items-center justify-center gap-1"
            >
              <Check size={10} /> Apply
            </button>
          </div>
        </div>
      ) : (
        /* Tone selector */
        <>
          <div className="grid grid-cols-2 gap-1.5">
            {TONE_OPTIONS.map((tone) => (
              <button
                key={tone}
                onClick={() => {
                  setSelectedTone(tone);
                  setShowCustom(false);
                }}
                className={`px-2 py-1.5 rounded-lg text-[10px] text-left border transition-all ${
                  selectedTone === tone && !showCustom
                    ? "border-ink bg-ink text-white font-medium"
                    : "border-ash-border text-ink-muted hover:bg-ash hover:text-ink"
                }`}
                title={TONE_DESCRIPTIONS[tone]}
              >
                <span className="block font-medium">
                  {TONE_LABELS[tone]}
                </span>
                <span className="block opacity-60 font-normal">
                  {TONE_DESCRIPTIONS[tone].length > 35
                    ? TONE_DESCRIPTIONS[tone].slice(0, 35) + "…"
                    : TONE_DESCRIPTIONS[tone]}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCustom(!showCustom)}
            className="text-[10px] text-ink-muted hover:text-ink underline"
          >
            {showCustom ? "Hide custom instruction" : "+ Custom instruction"}
          </button>

          {showCustom && (
            <textarea
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              rows={2}
              placeholder="e.g. Make it sound more like a product leader..."
              className="w-full px-2 py-1.5 text-[11px] border border-ash-border rounded-lg focus:outline-none focus:border-ink resize-none"
            />
          )}

          <button
            onClick={() => adjustToneMutation.mutate()}
            disabled={adjustToneMutation.isPending}
            className="w-full py-2 text-[11px] bg-ink text-white rounded-lg hover:bg-ink-light disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
          >
            {adjustToneMutation.isPending ? (
              <>
                <Loader2 size={11} className="animate-spin" />
                Adjusting…
              </>
            ) : (
              <>
                <Sparkles size={11} />
                Apply {TONE_LABELS[selectedTone]}
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
