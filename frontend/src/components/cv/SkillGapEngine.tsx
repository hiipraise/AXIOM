import { useState, useEffect, useCallback } from "react";
import { cvApi } from "../../api";
import { CVData, SkillGapResponse, SkillEndorsement, CourseLink } from "../../types";
import {
  X,
  Target,
  Sparkles,
  TrendingUp,
  TrendingDown,
  UserCheck,
  BookOpen,
  ExternalLink,
  CheckCircle,
  Award,
  Minus,
} from "lucide-react";
import toast from "react-hot-toast";

type Tab = "analyze" | "market" | "roadmap";

interface Props {
  cvData: CVData;
  onApply?: (data: CVData) => void;
  onClose: () => void;
  cvId?: string;
}

function getScoreColor(score: number) {
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-amber-600";
  return "text-red-600";
}

function getScoreLabel(score: number) {
  if (score >= 70) return "Ready";
  if (score >= 40) return "Developing";
  return "Needs Work";
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case "high":
      return "bg-red-50 border-red-300 text-red-800";
    case "medium":
      return "bg-amber-50 border-amber-300 text-amber-800";
    default:
      return "bg-gray-50 border-gray-200 text-gray-600";
  }
}

function getDemandBarColor(score: number) {
  if (score >= 70) return "bg-green-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-gray-400";
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

  // Endorsements: track which skills the user has endorsed
  const [endorsedSkills, setEndorsedSkills] = useState<Set<string>>(new Set());

  // Courses: cache per skill
  const [courseCache, setCourseCache] = useState<Record<string, CourseLink[]>>({});

  // Load user's existing endorsements on mount
  useEffect(() => {
    cvApi
      .myEndorsements()
      .then((endorsements) => {
        setEndorsedSkills(new Set(endorsements.map((e: SkillEndorsement) => e.skill)));
      })
      .catch(() => {});
  }, []);

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
      // Batch-fetch courses for all uncached missing skills
      const uncachedSkills = res.missing_skills
        .map((s) => s.skill)
        .filter((name) => !courseCache[name.toLowerCase()]);
      if (uncachedSkills.length > 0) {
        Promise.all(
          uncachedSkills.map((skill) =>
            cvApi
              .coursesForSkill(skill)
              .then((data) => ({ skill: skill.toLowerCase(), courses: data.courses || [] }))
              .catch(() => null)
          )
        ).then((results) => {
          const newCourses: Record<string, CourseLink[]> = {};
          for (const r of results) {
            if (r && r.courses.length > 0) newCourses[r.skill] = r.courses;
          }
          if (Object.keys(newCourses).length > 0) {
            setCourseCache((prev) => ({ ...prev, ...newCourses }));
          }
        });
      }
      setResult(res);
    } catch {
      setError("Failed to analyze. Please try again.");
      toast.error("Skill gap analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEndorse = useCallback(
    async (skill: string) => {
      const skillKey = skill.toLowerCase();
      if (endorsedSkills.has(skillKey)) {
        // Remove endorsement
        try {
          await cvApi.removeEndorsement(skill);
          setEndorsedSkills((prev) => {
            const next = new Set(prev);
            next.delete(skillKey);
            return next;
          });
          toast.success(`Endorsement removed for ${skill}`);
        } catch {
          toast.error("Failed to remove endorsement");
        }
      } else {
        // Add endorsement
        try {
          await cvApi.endorseSkill(skill, cvId);
          setEndorsedSkills((prev) => new Set(prev).add(skillKey));
          toast.success(`Endorsed ${skill}!`);
        } catch {
          toast.error("Failed to endorse skill");
        }
      }
    },
    [endorsedSkills, cvId]
  );

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

      {/* Tabs: Analyze | Market | Roadmap */}
      <div className="flex border-b border-ash-border">
        {[
          { id: "analyze" as Tab, label: "Analyze", icon: Target },
          {
            id: "market" as Tab,
            label: "Market",
            icon: TrendingUp,
            badge: result && result.total_jobs_analyzed > 0 ? result.total_jobs_analyzed : undefined,
          },
          { id: "roadmap" as Tab, label: "Roadmap", icon: BookOpen },
        ].map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2.5 text-xs transition-colors flex items-center justify-center gap-1 ${
              tab === id
                ? "border-b-2 border-[#a0449f] text-[#a0449f] font-medium"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <Icon size={12} />
            {label}
            {badge !== undefined && (
              <span className="text-[9px] px-1 py-0.5 rounded-full bg-[#a0449f]/10 text-[#a0449f]">
                {badge}
              </span>
            )}
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
            <Sparkles size={13} /> {loading ? "Analyzing with market data..." : "Analyze Gaps"}
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
                    {result.total_jobs_analyzed > 0 && (
                      <p className="text-[10px] text-ink-muted mt-1">
                        {result.total_jobs_analyzed} jobs analyzed
                      </p>
                    )}
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
                        className="px-2 py-1 bg-green-50 border border-green-200 text-green-700 text-xs rounded-full flex items-center gap-1"
                      >
                        <CheckCircle size={10} />
                        {skill}
                        {result.skill_demand?.[skill.toLowerCase()] && (
                          <span className="text-[9px] opacity-70">
                            {result.skill_demand[skill.toLowerCase()]}%
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Skills with Endorsements + Courses */}
              {result.missing_skills?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-ink mb-2">
                    Missing Skills ({result.missing_skills.length})
                  </p>
                  <div className="space-y-2">
                    {result.missing_skills.map((item, i) => {
                      const skillKey = item.skill.toLowerCase();
                      const isEndorsed = endorsedSkills.has(skillKey);
                      const courses = courseCache[skillKey];
                      const demandScore = result.skill_demand?.[skillKey];

                      return (
                        <div
                          key={i}
                          className={`p-2 rounded-md border text-xs ${
                            isEndorsed
                              ? "bg-blue-50 border-blue-300 text-blue-800"
                              : getPriorityColor(item.priority)
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium truncate">{item.skill}</span>
                                <span className="text-[10px] uppercase font-medium px-1.5 py-0.5 bg-white/50 rounded shrink-0">
                                  {item.priority}
                                </span>
                              </div>

                              {/* Market demand bar */}
                              {demandScore !== undefined && (
                                <div className="mt-1.5 flex items-center gap-1.5">
                                  <TrendingUp size={10} className="text-ink-muted" />
                                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${getDemandBarColor(demandScore)}`}
                                      style={{ width: `${demandScore}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-medium text-ink-muted">
                                    {demandScore}%
                                  </span>
                                </div>
                              )}

                              {item.reason && (
                                <p className="mt-1 opacity-80">{item.reason}</p>
                              )}

                              {/* Course links */}
                              {courses && courses.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {courses.slice(0, 2).map((course, ci) => (
                                    <a
                                      key={ci}
                                      href={course.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                      <BookOpen size={10} />
                                      <span className="truncate">{course.title}</span>
                                      <span className="text-[8px] uppercase shrink-0 px-1 py-0.5 rounded bg-blue-100">
                                        {course.cost === "free" ? "Free" : course.platform}
                                      </span>
                                      <ExternalLink size={8} className="shrink-0" />
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Endorse button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEndorse(item.skill);
                              }}
                              className={`shrink-0 ml-2 p-1.5 rounded-full transition-colors ${
                                isEndorsed
                                  ? "bg-blue-100 text-blue-600"
                                  : "text-ink-muted hover:bg-gray-100 hover:text-ink"
                              }`}
                              title={isEndorsed ? "Remove endorsement" : "Endorse this skill"}
                            >
                              {isEndorsed ? (
                                <Award size={14} className="text-blue-600" />
                              ) : (
                                <UserCheck size={14} />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Market Data Tab */}
        <div className={tab === "market" ? "p-3 space-y-4" : "hidden"}>
          {!result ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <TrendingUp size={24} className="text-ink-muted mb-2" />
              <p className="text-xs text-ink-muted">
                Run analysis first to see real job market demand data.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              {result.total_jobs_analyzed > 0 && (
                <div className="bg-ash rounded-lg p-3">
                  <p className="text-xs font-medium text-ink mb-1">
                    Real Market Data
                  </p>
                  <p className="text-[10px] text-ink-muted">
                    Analyzed {result.total_jobs_analyzed} active job postings for "{result.target_role}"
                  </p>
                  {result.sample_titles?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[10px] text-ink-muted mb-1">Sample titles:</p>
                      <div className="flex flex-wrap gap-1">
                        {result.sample_titles.slice(0, 5).map((title, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded"
                          >
                            {title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Skill demand ranking */}
              {Object.keys(result.skill_demand || {}).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-ink mb-2">
                    Skill Demand (by frequency in job postings)
                  </p>
                  <div className="space-y-1.5">
                    {Object.entries(result.skill_demand)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 30)
                      .map(([skill, score]) => {
                        const isMatched = result.matched_skills?.some(
                          (s) => s.toLowerCase() === skill.toLowerCase()
                        );
                        return (
                          <div
                            key={skill}
                            className={`flex items-center gap-2 p-1.5 rounded text-xs ${
                              isMatched ? "bg-green-50" : "bg-gray-50"
                            }`}
                          >
                            <span className="w-4 text-[10px] text-ink-muted text-right shrink-0">
                              {score >= 10 ? Math.round(score) : "<1"}
                            </span>
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${getDemandBarColor(score)}`}
                                style={{ width: `${score}%` }}
                              />
                            </div>
                            <span className="flex-1 text-ink truncate">{skill}</span>
                            {isMatched ? (
                              <CheckCircle size={12} className="text-green-500 shrink-0" />
                            ) : (
                              <Minus size={12} className="text-ink-muted shrink-0" />
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {result.total_jobs_analyzed === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-800">
                    No market data available. The Adzuna API key may not be configured.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Roadmap Tab */}
        <div className={tab === "roadmap" ? "p-3 space-y-4" : "hidden"}>
          {!result ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BookOpen size={24} className="text-ink-muted mb-2" />
              <p className="text-xs text-ink-muted">
                Run analysis first to generate your learning roadmap.
            </p>
            </div>
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

      {/* Footer: endorsement count summary */}
      {endorsedSkills.size > 0 && (
        <div className="px-3 py-2 border-t border-ash-border bg-ash">
          <div className="flex items-center gap-1.5 text-[10px] text-ink-muted">
            <Award size={10} className="text-blue-500" />
            <span>{endorsedSkills.size} skill{endorsedSkills.size !== 1 ? "s" : ""} endorsed</span>
          </div>
        </div>
      )}
    </div>
  );
}
