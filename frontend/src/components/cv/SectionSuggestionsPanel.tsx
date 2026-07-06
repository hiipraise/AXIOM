import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { commentsApi, cvApi } from "../../api";
import type { CVData, SectionSuggestion } from "../../types";
import {
  X,
  Sparkles,
  FileSearch,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Check,
  MessageSquare,
} from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  cvData: CVData;
  cvId: string;
  onClose: () => void;
  onNavigateToSection?: (section: string) => void;
}

const SECTION_LABELS: Record<string, string> = {
  personal: "Personal Info",
  summary: "Summary",
  skills: "Skills",
  experience: "Experience",
  education: "Education",
  certifications: "Certifications",
  projects: "Projects",
  awards: "Awards",
  languages: "Languages",
  volunteer: "Volunteer",
};

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    high: "bg-red-50 text-red-600 border-red-200",
    medium: "bg-amber-50 text-amber-600 border-amber-200",
    low: "bg-ash text-ink-muted border-ash-border",
  };

  return (
    <span
      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase ${styles[priority] || styles.medium}`}
    >
      {priority}
    </span>
  );
}

export default function SectionSuggestionsPanel({
  cvData,
  cvId,
  onClose,
  onNavigateToSection,
}: Props) {
  const [jobDesc, setJobDesc] = useState(cvData.job_description || "");
  const [suggestions, setSuggestions] = useState<SectionSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  );
  const [ranAnalysis, setRanAnalysis] = useState(false);

  const addCommentMutation = useMutation({
    mutationFn: ({
      section,
      text,
      suggestedValue,
    }: {
      section: string;
      text: string;
      suggestedValue?: string;
    }) =>
      commentsApi.create(cvId, {
        section,
        text,
        is_suggestion: true,
        suggested_value: suggestedValue,
      }),
    onSuccess: () => toast.success("Suggestion added as comment"),
    onError: () => toast.error("Failed to add suggestion as comment"),
  });

  const runAnalysis = async () => {
    if (!jobDesc.trim() || loading) return;
    setLoading(true);
    try {
      const res = await cvApi.sectionSuggestions(cvData, jobDesc);
      setSuggestions(res.suggestions);
      setRanAnalysis(true);
      // Expand all sections by default
      const sections = new Set(res.suggestions.map((s) => s.section));
      setExpandedSections(sections);
    } catch {
      toast.error("Failed to generate suggestions");
    } finally {
      setLoading(false);
    }
  };

  const groupedSuggestions = suggestions.reduce<
    Record<string, SectionSuggestion[]>
  >((acc, s) => {
    if (!acc[s.section]) acc[s.section] = [];
    acc[s.section].push(s);
    return acc;
  }, {});

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const totalHigh = suggestions.filter((s) => s.priority === "high").length;

  return (
    <div className="w-full md:w-80 bg-white border-l border-ash-border flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-ash-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Lightbulb size={14} className="text-amber-500" />
          <span className="text-sm font-medium text-ink">
            Section Suggestions
          </span>
          {ranAnalysis && (
            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
              {suggestions.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-ink-muted hover:text-ink transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Input area */}
        <div className="space-y-2">
          <p className="text-[11px] text-ink-muted leading-relaxed">
            Paste a job description to get AI-powered suggestions for each CV
            section.
          </p>
          <textarea
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
            rows={6}
            placeholder="Paste job description here…"
            className="w-full px-3 py-2 text-xs border border-ash-border rounded-lg focus:outline-none focus:border-ink resize-none"
          />
          <button
            onClick={runAnalysis}
            disabled={loading || !jobDesc.trim()}
            className="w-full py-2.5 bg-ink text-white text-xs font-medium rounded-lg hover:bg-ink-light disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <FileSearch size={13} />
            {loading
              ? "Analysing…"
              : ranAnalysis
                ? "Re-analyse"
                : "Get Section Suggestions"}
          </button>
        </div>

        {/* Results */}
        {ranAnalysis && suggestions.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <Check size={24} className="mx-auto text-emerald-500" />
            <p className="text-xs text-ink-muted">
              No suggestions — your CV is well aligned with this job description.
            </p>
          </div>
        )}

        {totalHigh > 0 && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
            <p className="text-[11px] text-red-700">
              {totalHigh} high-priority suggestion{totalHigh > 1 ? "s" : ""}{" "}
              that may impact ATS compatibility.
            </p>
          </div>
        )}

        {/* Suggestions by section */}
        {Object.entries(groupedSuggestions).map(
          ([section, sectionSugs]) => (
            <div
              key={section}
              className="border border-ash-border rounded-xl overflow-hidden"
            >
              <button
                onClick={() => toggleSection(section)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-ash transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-ink">
                    {SECTION_LABELS[section] || section}
                  </span>
                  <span className="text-[10px] text-ink-muted bg-ash px-1.5 py-0.5 rounded-full">
                    {sectionSugs.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {onNavigateToSection && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToSection(section);
                        onClose();
                      }}
                      className="text-[10px] text-axiom hover:underline"
                    >
                      Open section
                    </button>
                  )}
                  {expandedSections.has(section) ? (
                    <ChevronUp size={14} className="text-ink-muted" />
                  ) : (
                    <ChevronDown size={14} className="text-ink-muted" />
                  )}
                </div>
              </button>

              {expandedSections.has(section) && (
                <div className="border-t border-ash-border divide-y divide-ash-border">
                  {sectionSugs.map((sug, idx) => (
                    <div key={idx} className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-ink flex-1">
                          {sug.title}
                        </span>
                        <PriorityBadge priority={sug.priority} />
                      </div>
                      <p className="text-[11px] text-ink-muted leading-relaxed">
                        {sug.description}
                      </p>
                      {sug.suggested_change && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                          <p className="text-[10px] text-amber-700 font-medium mb-0.5">
                            Suggested text:
                          </p>
                          <p className="text-[11px] text-ink italic">
                            {sug.suggested_change}
                          </p>
                        </div>
                      )}
                      <button
                        onClick={() =>
                          addCommentMutation.mutate({
                            section,
                            text: sug.description,
                            suggestedValue:
                              sug.suggested_change || undefined,
                          })
                        }
                        className="flex items-center gap-1 text-[10px] text-ink-muted hover:text-ink transition-colors"
                      >
                        <MessageSquare size={10} />
                        Add as comment suggestion
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ),
        )}

        {/* Prompt to add JD if no analysis yet */}
        {!ranAnalysis && !loading && (
          <div className="text-center py-8 space-y-2">
            <Sparkles size={24} className="mx-auto text-ink-muted opacity-40" />
            <p className="text-xs text-ink-muted">
              Paste a job description above and click "Get Section Suggestions"
              to see AI-powered recommendations for every section of your CV.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
