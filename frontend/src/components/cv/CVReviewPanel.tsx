import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
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
  cvId: string;
  onClose: () => void;
  navigate?: (path: string) => void;
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
  icon: LucideIcon;
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

function KeywordGapPanel({ cvData, cvId }: { cvData: CVData; cvId: string }) {
  const qc = useQueryClient();
  const [jd, setJd] = useState(cvData.job_description || "");
  const [result, setResult] = useState<KeywordGapResult | null>(null);
  const [loading, setLoading] = useState(false);
  const saveAnalytics = useMutation({
    mutationFn: (analysis: KeywordGapResult) =>
      cvApi.createAnalyticsEvent(cvId, {
        ats_score: analysis.ats_score_estimate,
        present_keywords: analysis.present_keywords,
        missing_keywords: analysis.missing_keywords,
        job_description: jd,
        source: "keyword_gap",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cv-analytics", cvId] }),
  });

  const run = async () => {
    if (!jd.trim()) {
      toast.error("Paste a job description first");
      return;
    }

    setLoading(true);
    try {
      const res = await cvApi.aiKeywordGap(cvData, jd);
      const analysis = res.analysis ?? res;
      setResult(analysis);
      saveAnalytics.mutate(analysis);
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

function CVAnalyticsPanel({ cvId }: { cvId: string }) {
  const { data } = useQuery({
    queryKey: ["cv-analytics", cvId],
    queryFn: () => cvApi.analytics(cvId),
  });
  const events = data?.events || [];
  const ordered = [...events].reverse();
  const latest = events[0];
  const bestScore = events.length
    ? Math.max(...events.map((event) => event.ats_score))
    : 0;

  return (
    <ReviewSection title="Performance Analytics" icon={Zap} defaultOpen>
      {events.length ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-ash p-2">
              <p className="text-[10px] text-ink-muted">Latest ATS</p>
              <p className="text-lg font-bold text-ink">{latest.ats_score}%</p>
            </div>
            <div className="rounded-lg bg-ash p-2">
              <p className="text-[10px] text-ink-muted">Best</p>
              <p className="text-lg font-bold text-ink">{bestScore}%</p>
            </div>
            <div className="rounded-lg bg-ash p-2">
              <p className="text-[10px] text-ink-muted">Runs</p>
              <p className="text-lg font-bold text-ink">{events.length}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-ink">
              ATS score history
            </p>
            <div className="flex h-24 items-end gap-1 rounded-lg border border-ash-border bg-ash/40 p-2">
              {ordered.map((event) => (
                <div
                  key={event.id}
                  className="min-w-[14px] flex-1 rounded-t bg-ink"
                  style={{ height: `${Math.max(8, event.ats_score)}%` }}
                  title={`${event.ats_score}% on ${new Date(event.created_at).toLocaleDateString()}`}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-ink">
              Recurring missing keywords
            </p>
            <div className="space-y-1.5">
              {(data?.missing_keyword_trends || []).slice(0, 6).map((trend) => (
                <div
                  key={trend.keyword}
                  className="flex items-center justify-between gap-2 rounded-lg border border-ash-border px-2 py-1.5 text-xs"
                >
                  <span className="font-medium text-ink">{trend.keyword}</span>
                  <span className="text-ink-muted">{trend.count}x</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-ink">
              Strengthening keywords
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(data?.present_keyword_trends || []).slice(0, 10).map((trend) => (
                <span
                  key={trend.keyword}
                  className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700"
                >
                  {trend.keyword} · {trend.count}x
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs leading-relaxed text-ink-muted">
          Run Keyword Gap Analysis to start tracking ATS score history and
          keyword trends for this CV.
        </p>
      )}
    </ReviewSection>
  );
}

export default function CVReviewPanel({ cvData, cvId, onClose, navigate }: Props) {
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
            <CVAnalyticsPanel cvId={cvId} />
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
                {navigate && (
                  <button
                    className="mt-3 flex items-center gap-1 text-xs font-medium text-violet-300 hover:text-violet-200"
                    onClick={() => navigate(`/cv/${cvId}/skill-gap`)}
                  >
                    See your skill gaps
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>
            )}

            <div className="border-t border-ash-border pt-3">
              <CVAnalyticsPanel cvId={cvId} />
              <ReviewSection title="Keyword Gap Analysis" icon={Search}>
                <KeywordGapPanel cvData={cvData} cvId={cvId} />
              </ReviewSection>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
