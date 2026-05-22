import { useCallback, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  X,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { cvApi } from "../../api";
import type { CVData } from "../../types";

interface KeywordGapResult {
  present_keywords: string[];
  missing_keywords: {
    keyword: string;
    priority: "high" | "medium" | "low";
    suggested_placement: string;
  }[];
  ats_score_estimate: number;
  notes: string;
}

interface Props {
  cvData: CVData;
  onClose: () => void;
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 8
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : score >= 6
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-red-50 text-red-700 border-red-200";

  const label =
    score >= 9
      ? "Ready to send"
      : score >= 7
        ? "Strong - fixable gaps"
        : score >= 5
          ? "Needs rewrites"
          : score >= 3
            ? "Significant problems"
            : "Requires rebuild";

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${color}`}
    >
      <span className="text-base font-bold">{score}/10</span>
      <span className="font-normal">{label}</span>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" }) {
  const styles = {
    high: "bg-red-50 text-red-600 border-red-200",
    medium: "bg-amber-50 text-amber-600 border-amber-200",
    low: "bg-ash text-ink-muted border-ash-border",
  };

  return (
    <span
      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase ${styles[priority]}`}
    >
      {priority}
    </span>
  );
}

function ReviewSection({
  title,
  icon: Icon,
  iconClass = "text-ink-muted",
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: any;
  iconClass?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-ash-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-ash transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon size={13} className={iconClass} />
          <span className="text-xs font-semibold text-ink">{title}</span>
        </div>
        {open ? (
          <ChevronUp size={13} className="text-ink-muted" />
        ) : (
          <ChevronDown size={13} className="text-ink-muted" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-ash-border bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

function parseReviewSections(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = raw.split("\n");
  let currentKey = "preamble";
  let buffer: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (buffer.length) result[currentKey] = buffer.join("\n").trim();
      currentKey = line.replace("## ", "").trim();
      buffer = [];
    } else {
      buffer.push(line);
    }
  }

  if (buffer.length) result[currentKey] = buffer.join("\n").trim();
  return result;
}

function extractOverallScore(sections: Record<string, string>): number {
  const match = Object.keys(sections).find((key) =>
    key.startsWith("OVERALL SCORE"),
  );
  if (!match) return 0;
  const score = parseInt(match.replace(/[^0-9]/g, ""), 10);
  return Number.isNaN(score) ? 0 : score;
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={index} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function RawBlock({ text }: { text: string }) {
  if (!text) return null;

  return (
    <div className="space-y-1.5 min-w-0">
      {text
        .split("\n")
        .filter(Boolean)
        .map((line, index) => {
          const isBullet = line.startsWith("- ") || line.startsWith("• ");
          const content = isBullet ? line.slice(2) : line;

          if (line.startsWith("|")) {
            const cells = line
              .split("|")
              .filter((cell) => cell.trim() && cell !== "---");
            if (!cells.length) return null;

            return (
              <div
                key={index}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)] gap-2 text-[11px] py-0.5 border-b border-ash-border last:border-0 min-w-0"
              >
                {cells.map((cell, cellIndex) => (
                  <span
                    key={cellIndex}
                    className={`min-w-0 break-words ${cellIndex === 0 ? "font-medium text-ink" : "text-ink-muted"}`}
                  >
                    {renderInlineMarkdown(cell.trim())}
                  </span>
                ))}
              </div>
            );
          }

          return (
            <p
              key={index}
              className={`text-xs leading-relaxed whitespace-normal ${isBullet ? "pl-3 text-ink" : "text-ink-muted"}`}
            >
              {isBullet ? (
                <span>
                  <span className="text-ink-muted mr-1">•</span>
                  {renderInlineMarkdown(content)}
                </span>
              ) : (
                renderInlineMarkdown(content)
              )}
            </p>
          );
        })}
    </div>
  );
}

function KeywordGapPanel({ cvData }: { cvData: CVData }) {
  const [jd, setJd] = useState(cvData.job_description || "");
  const [result, setResult] = useState<KeywordGapResult | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!jd.trim()) {
      toast.error("Paste a job description first");
      return;
    }

    setLoading(true);
    try {
      const res = await cvApi.aiKeywordGap(cvData, jd);
      setResult(res.analysis ?? res);
    } catch {
      toast.error("Keyword gap analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-ink-muted leading-relaxed">
        Paste the job description to see which ATS keywords are missing and
        exactly where to add them.
      </p>
      <textarea
        value={jd}
        onChange={(e) => setJd(e.target.value)}
        rows={5}
        placeholder="Paste job description here..."
        className="w-full px-3 py-2 text-xs border border-ash-border rounded-lg focus:outline-none focus:border-ink resize-none"
      />
      <button
        onClick={run}
        disabled={loading || !jd.trim()}
        className="w-full py-2 bg-ink text-white text-xs font-medium rounded-lg hover:bg-ink-light disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        <Search size={12} />
        {loading ? "Analysing..." : "Run Keyword Gap Analysis"}
      </button>

      {result && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between p-3 bg-ash rounded-lg">
            <span className="text-xs text-ink-muted">Estimated ATS match</span>
            <span
              className={`text-sm font-bold ${
                result.ats_score_estimate >= 70
                  ? "text-emerald-600"
                  : result.ats_score_estimate >= 50
                    ? "text-amber-600"
                    : "text-red-600"
              }`}
            >
              {result.ats_score_estimate}%
            </span>
          </div>

          {result.notes && (
            <p className="text-[11px] text-ink-muted italic">{result.notes}</p>
          )}

          {result.missing_keywords.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink mb-2">
                Missing Keywords ({result.missing_keywords.length})
              </p>
              <div className="space-y-2">
                {[...result.missing_keywords]
                  .sort((a, b) => {
                    const order = { high: 0, medium: 1, low: 2 };
                    return order[a.priority] - order[b.priority];
                  })
                  .map((keyword, index) => (
                    <div
                      key={index}
                      className="p-2.5 border border-ash-border rounded-lg"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-medium text-ink">
                          {keyword.keyword}
                        </span>
                        <PriorityBadge priority={keyword.priority} />
                      </div>
                      <p className="text-[11px] text-ink-muted">
                        Add to: {keyword.suggested_placement}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {result.present_keywords.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink mb-2">
                Already Present ({result.present_keywords.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.present_keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] rounded-md flex items-center gap-1"
                  >
                    <CheckCircle size={9} />
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CVReviewPanel({ cvData, onClose }: Props) {
  const [reviewRaw, setReviewRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [jd, setJd] = useState(cvData.job_description || "");
  const [ran, setRan] = useState(false);

  const runReview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await cvApi.aiReview(cvData, jd || undefined);
      setReviewRaw(res.review || "");
      setRan(true);
    } catch {
      toast.error("Review failed - try again");
    } finally {
      setLoading(false);
    }
  }, [cvData, jd]);

  const sections = parseReviewSections(reviewRaw);
  const overallScore = ran ? extractOverallScore(sections) : 0;

  const criticalKey = Object.keys(sections).find((key) =>
    key.includes("CRITICAL"),
  );
  const improvKey = Object.keys(sections).find((key) =>
    key.includes("HIGH-IMPACT"),
  );
  const atsKey = Object.keys(sections).find((key) =>
    key.includes("ATS KEYWORD"),
  );
  const sectionKey = Object.keys(sections).find((key) =>
    key.includes("SECTION-BY-SECTION"),
  );
  const workingKey = Object.keys(sections).find((key) =>
    key.includes("WHAT IS WORKING"),
  );
  const dimensionKey = Object.keys(sections).find((key) =>
    key.includes("DIMENSION"),
  );
  const verdictKey = Object.keys(sections).find((key) =>
    key.includes("VERDICT"),
  );

  return (
    <div className="w-full max-w-full min-w-0 bg-white border-l border-ash-border flex flex-col h-full overflow-x-hidden">
      <div className="px-4 py-3 border-b border-ash-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-ink" />
          <span className="text-sm font-semibold text-ink">CV Review</span>
          {ran && overallScore > 0 && <ScoreBadge score={overallScore} />}
        </div>
        <button
          onClick={onClose}
          className="text-ink-muted hover:text-ink transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 min-w-0">
        {!ran && (
          <div className="space-y-3">
            <p className="text-xs text-ink-muted leading-relaxed">
              Get a structured, scored review of your CV. Add a job description
              to unlock ATS keyword analysis.
            </p>
            <div>
              <label className="text-xs font-medium text-ink block mb-1.5">
                Job Description{" "}
                <span className="text-ink-muted font-normal">
                  (optional but recommended)
                </span>
              </label>
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                rows={5}
                placeholder="Paste the job description you're targeting..."
                className="w-full px-3 py-2 text-xs border border-ash-border rounded-lg focus:outline-none focus:border-ink resize-none"
              />
            </div>
            <button
              onClick={runReview}
              disabled={loading}
              className="w-full py-2.5 bg-ink text-white text-xs font-semibold rounded-lg hover:bg-ink-light disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <Zap size={13} />
              {loading ? "Reviewing..." : "Run Review"}
            </button>
            {loading && (
              <p className="text-[11px] text-ink-muted text-center animate-pulse">
                Analysing your CV across 6 dimensions...
              </p>
            )}
          </div>
        )}

        {ran && (
          <div className="space-y-3">
            <button
              onClick={() => {
                setRan(false);
                setReviewRaw("");
              }}
              className="flex items-center gap-1.5 text-[11px] text-ink-muted hover:text-ink transition-colors"
            >
              <RefreshCw size={11} /> Run again with different JD
            </button>

            {dimensionKey && (
              <ReviewSection
                title="Dimension Scores"
                icon={Zap}
                iconClass="text-ink"
                defaultOpen
              >
                <RawBlock text={sections[dimensionKey]} />
              </ReviewSection>
            )}

            {criticalKey && (
              <ReviewSection
                title="Critical Failures - Fix These First"
                icon={AlertTriangle}
                iconClass="text-red-500"
                defaultOpen
              >
                <RawBlock text={sections[criticalKey]} />
              </ReviewSection>
            )}

            {improvKey && (
              <ReviewSection
                title="High-Impact Improvements"
                icon={Zap}
                iconClass="text-amber-500"
                defaultOpen
              >
                <RawBlock text={sections[improvKey]} />
              </ReviewSection>
            )}

            {sectionKey && (
              <ReviewSection title="Section Notes" icon={Zap}>
                <RawBlock text={sections[sectionKey]} />
              </ReviewSection>
            )}

            {atsKey && sections[atsKey] && (
              <ReviewSection
                title="ATS Keyword Gaps (from review)"
                icon={Search}
              >
                <RawBlock text={sections[atsKey]} />
              </ReviewSection>
            )}

            {workingKey && (
              <ReviewSection
                title="What Is Working"
                icon={CheckCircle}
                iconClass="text-emerald-500"
              >
                <RawBlock text={sections[workingKey]} />
              </ReviewSection>
            )}

            {verdictKey && (
              <div className="p-3 bg-ink text-white rounded-xl">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-white/60">
                  Verdict
                </p>
                <p className="text-xs leading-relaxed">
                  {sections[verdictKey]}
                </p>
              </div>
            )}

            <div className="border-t border-ash-border pt-3">
              <ReviewSection title="Keyword Gap Analysis" icon={Search}>
                <KeywordGapPanel cvData={cvData} />
              </ReviewSection>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
