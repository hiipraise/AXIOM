import { useState } from "react";
import { cvApi } from "../../api";
import { CVData, SkillGapResponse } from "../../types";
import { X, Target, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

type Tab = "analyze" | "roadmap";

interface Props {
  cvData: CVData;
  onApply?: (data: CVData) => void;
  onClose: () => void;
  cvId?: string;
}

export default function SkillGapEngine({
  cvData,
  onApply,
  onClose,
  cvId,
}: Props) {
  const [tab, setTab] = useState<Tab>("analyze");
  const [target, setTarget] = useState(cvData.target_role || "");
  const [result, setResult] = useState<SkillGapResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!target.trim()) {
      setError("Please enter a target role");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await cvApi.skillGap(cvData, target);
      setResult(res as unknown as SkillGapResponse);
    } catch {
      setError("Failed to analyze. Please try again.");
      toast.error("Skill gap analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-50 border-red-300 text-red-800";
      case "medium":
        return "bg-amber-50 border-amber-300 text-amber-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-600";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-amber-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return "Ready";
    if (score >= 40) return "Developing";
    return "Needs Work";
  };

  return (
    <div className="w-full md:w-80 bg-white border-l border-ash-border flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-ash-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-[#a0449f]" />
          <span className="text-sm font-medium text-ink">Skill Gap</span>
        </div>
        <button
          onClick={onClose}
          className="text-ink-muted hover:text-ink transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ash-border">
        {[
          { id: "analyze" as Tab, label: "Analyze" },
          { id: "roadmap" as Tab, label: "Roadmap" },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2.5 text-xs transition-colors ${
              tab === id
                ? "border-b-2 border-[#a0449f] text-[#a0449f] font-medium"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Analyze Tab */}
        <div className={tab === "analyze" ? "p-3 space-y-4" : "hidden"}>
          <div className="space-y-2">
            <label className="text-xs text-ink-muted">Target Role</label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="e.g. Senior Product Manager"
              className="w-full px-3 py-2 text-xs border border-ash-border rounded-lg focus:outline-none focus:border-ink"
            />
          </div>
          <button
            onClick={analyze}
            disabled={loading || !target.trim()}
            className="w-full py-2.5 bg-[#a0449f] text-white text-xs font-medium rounded-lg hover:bg-[#8d3f8c] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles size={13} /> {loading ? "Analyzing..." : "Analyze Gaps"}
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}

          {result && (
            <div className="space-y-4 pt-2">
              {/* Readiness Score */}
              <div className="bg-ash rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-ink-muted">Readiness</p>
                    <p className={`text-2xl font-bold ${getScoreColor(result.readiness_score)}`}>
                      {result.readiness_score}%
                    </p>
                    <p className="text-xs text-ink">{getScoreLabel(result.readiness_score)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-ink-muted">Target</p>
                    <p className="text-xs font-medium text-ink">{result.target_role}</p>
                  </div>
                </div>
              </div>

              {/* Matched Skills */}
              {result.matched_skills?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-ink mb-2">
                    Skills You Have ({result.matched_skills.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {result.matched_skills.map((skill, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-green-50 border border-green-200 text-green-700 text-xs rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Skills */}
              {result.missing_skills?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-ink mb-2">
                    Missing Skills ({result.missing_skills.length})
                  </p>
                  <div className="space-y-2">
                    {result.missing_skills.map((item, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded-md border text-xs ${getPriorityColor(item.priority)}`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-medium">{item.skill}</span>
                          <span className="text-[10px] uppercase font-medium px-1.5 py-0.5 bg-white/50 rounded">
                            {item.priority}
                          </span>
                        </div>
                        {item.reason && (
                          <p className="mt-1 opacity-80">{item.reason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Roadmap Tab */}
        <div className={tab === "roadmap" ? "p-3 space-y-4" : "hidden"}>
          {!result ? (
            <p className="text-xs text-ink-muted">
              Run analysis first to generate your learning roadmap.
            </p>
          ) : result.roadmap?.length === 0 ? (
            <p className="text-xs text-ink-muted">No roadmap generated.</p>
          ) : (
            <div className="space-y-4">
              <p className="text-xs font-medium text-ink">Learning Roadmap</p>
              {result.roadmap.map((step, i) => (
                <div key={i} className="relative pl-4">
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-1 w-2 h-2 rounded-full bg-[#a0449f]" />
                  {i < result.roadmap.length - 1 && (
                    <div className="absolute left-0.5 top-3 w-0.5 h-full bg-[#a0449f]/20" />
                  )}
                  <div className="pb-3">
                    <span className="text-[10px] font-semibold text-[#a0449f]">
                      {step.phase}
                    </span>
                    <p className="text-xs font-medium text-ink">{step.focus}</p>
                    {step.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {step.skills.map((skill, si) => (
                          <span
                            key={si}
                            className="px-1.5 py-0.5 bg-gray-100 text-gray-700 text-[10px] rounded"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                    {step.actions?.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {step.actions.map((action, ai) => (
                          <li key={ai} className="text-[10px] text-gray-600 flex items-start gap-1">
                            <span className="text-[#a0449f] mt-0.5">•</span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}