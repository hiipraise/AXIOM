import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { axiomApplicationsApi, cvApi, interviewApi, jobsApi } from "../../api";
import {
  ApplicationEntry,
  AxiomApplication,
  CV,
  InterviewSessionListItem,
  JobResult,
} from "../../types";
import {
  Plus,
  FileText,
  Globe,
  Lock,
  Copy,
  Trash2,
  Edit,
  Clock,
  Star,
  Check,
  X,
  PencilLine,
  MoreVertical,
  Target,
  TrendingUp,
  CalendarClock,
  Briefcase,
  Info,
  Lightbulb,
  ArrowRight,
  Search,
  Send,
  Map,
  CheckSquare,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/auth";
import RatingModal from "../../components/cv/RatingModal";
import ConfirmDialog from "../../components/UI/ConfirmDialog";
import OnboardingWizard from "../../components/OnboardingWizard";

const WEEKLY_GOAL_KEYS = ["Update CV", "Apply to jobs", "Practise interview"];

// ─── MetricCard ───────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  icon: React.ReactNode;
  value: string | number;
  progress?: number;
  progressColor?: string;
  tooltip: string;
  children?: React.ReactNode;
}

function MetricCard({
  label,
  icon,
  value,
  progress,
  progressColor = "bg-amber-500",
  tooltip,
  children,
}: MetricCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [flipDown, setFlipDown] = useState(false);
  const [flipRight, setFlipRight] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setFlipDown(rect.top < 160);
      setFlipRight(rect.left > window.innerWidth / 2);
    }
    setShowTooltip(true);
  };

  return (
    <div
      ref={cardRef}
      className="card relative cursor-help"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={handleMouseEnter}
      onBlur={() => setShowTooltip(false)}
      tabIndex={0}
      role="button"
      aria-label={`${label}: ${value}. ${tooltip}`}
    >
      {showTooltip && (
        <div
          className={`absolute z-50 w-52 max-w-[calc(100vw-2rem)] rounded-lg bg-ink px-3 py-2 text-xs text-white shadow-lg pointer-events-none
            ${flipDown ? "top-full mt-2" : "bottom-full mb-2"}
            ${flipRight ? "right-0" : "left-1/2 -translate-x-1/2"}
          `}
        >
          <p className="font-medium">{tooltip}</p>
          <div
            className={`absolute ${flipRight ? "right-4" : "left-1/2 -translate-x-1/2"} w-2 h-2 bg-ink rotate-45
              ${flipDown ? "-top-1" : "-bottom-1"}
            `}
          />
        </div>
      )}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink">{label}</p>
        {icon}
      </div>
      <p className="mt-3 text-3xl font-bold text-ink">{value}</p>
      {progress !== undefined && (
        <div className="mt-3 h-2 rounded-full bg-ash-dark">
          <div
            className={`h-2 rounded-full ${progressColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {children}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuPosition {
  top?: number;
  bottom?: number;
  right: number;
  maxHeight: number;
  openUpward: boolean;
}

interface KebabMenuProps {
  cv: CV;
  onRename: () => void;
  onRate: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  duplicating?: boolean;
  onDelete: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MENU_ITEM_HEIGHT = 44;
const MENU_ITEMS = 5;
const MENU_ESTIMATED_HEIGHT = MENU_ITEM_HEIGHT * MENU_ITEMS + 8 + 1;
const VIEWPORT_MARGIN = 8;

// ─── KebabMenu ────────────────────────────────────────────────────────────────

function KebabMenu({
  cv,
  onRename,
  onRate,
  onEdit,
  onDuplicate,
  duplicating,
  onDelete,
}: KebabMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const getMenuWidth = () =>
    Math.min(176, window.innerWidth - VIEWPORT_MARGIN * 2);

  const computePosition = useCallback((): MenuPosition => {
    const btn = triggerRef.current!.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const menuWidth = getMenuWidth();

    let right = vw - btn.right;
    right = Math.max(
      VIEWPORT_MARGIN,
      Math.min(right, vw - menuWidth - VIEWPORT_MARGIN),
    );

    const spaceBelow = vh - btn.bottom - VIEWPORT_MARGIN;
    const spaceAbove = btn.top - VIEWPORT_MARGIN;
    const fitsBelow = spaceBelow >= MENU_ESTIMATED_HEIGHT;
    const fitsAbove = spaceAbove >= MENU_ESTIMATED_HEIGHT;

    if (fitsBelow) {
      return {
        top: btn.bottom + 4,
        right,
        maxHeight: spaceBelow,
        openUpward: false,
      };
    } else if (fitsAbove) {
      return {
        bottom: vh - btn.top + 4,
        right,
        maxHeight: spaceAbove,
        openUpward: true,
      };
    } else {
      const useBelow = spaceBelow >= spaceAbove;
      return useBelow
        ? {
            top: btn.bottom + 4,
            right,
            maxHeight: spaceBelow,
            openUpward: false,
          }
        : {
            bottom: vh - btn.top + 4,
            right,
            maxHeight: spaceAbove,
            openUpward: true,
          };
    }
  }, []);

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPosition(computePosition());
    setOpen(true);
  };

  const closeMenu = useCallback(() => {
    setOpen(false);
    setPosition(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: Event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        closeMenu();
      }
    };
    const handleScrollResize = () => closeMenu();
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    window.addEventListener("scroll", handleScrollResize, { passive: true });
    window.addEventListener("resize", handleScrollResize, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      window.removeEventListener("scroll", handleScrollResize);
      window.removeEventListener("resize", handleScrollResize);
    };
  }, [open, closeMenu]);

  useEffect(() => {
    if (!open) return;
    const handleScroll = () => {
      if (triggerRef.current) setPosition(computePosition());
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [open, computePosition]);

  const menuStyle: React.CSSProperties = position
    ? {
        position: "fixed",
        right: position.right,
        width: getMenuWidth(),
        maxHeight: position.maxHeight,
        overflowY: "auto",
        zIndex: 9999,
        ...(position.openUpward
          ? { bottom: position.bottom }
          : { top: position.top }),
      }
    : {};

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className="btn-ghost p-1.5"
        title="More options"
        onClick={openMenu}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <MoreVertical size={15} />
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className="rounded-xl border border-ash-border bg-white shadow-lg py-1"
            role="menu"
          >
            <button
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-ink hover:bg-ash-dark"
              onClick={() => {
                onRename();
                closeMenu();
              }}
            >
              <PencilLine size={14} /> Rename
            </button>
            <button
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-ink hover:bg-ash-dark"
              onClick={() => {
                onRate();
                closeMenu();
              }}
            >
              <Star
                size={14}
                className={cv.rating ? "text-amber-400 fill-amber-400" : ""}
              />
              Rate
            </button>
            <button
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-ink hover:bg-ash-dark"
              onClick={() => {
                onEdit();
                closeMenu();
              }}
            >
              <Edit size={14} /> Edit
            </button>
            <button
              role="menuitem"
              className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm ${
                duplicating
                  ? "text-ink-muted cursor-wait"
                  : "text-ink hover:bg-ash-dark"
              }`}
              onClick={() => {
                if (!duplicating) {
                  onDuplicate();
                  closeMenu();
                }
              }}
              disabled={duplicating}
            >
              <Copy size={14} /> {duplicating ? "Duplicating..." : "Duplicate"}
            </button>
            <div className="my-1 border-t border-ash-border" />
            <button
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50"
              onClick={() => {
                onDelete();
                closeMenu();
              }}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}

// ─── DashboardPage ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [ratingCV, setRatingCV] = useState<CV | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CV | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [savingTitleId, setSavingTitleId] = useState<string | null>(null);
  const [weeklyGoals, setWeeklyGoals] = useState<Record<string, boolean>>({});
  const [skillGapCV, setSkillGapCV] = useState<CV | null>(null);

  const { data: cvs = [], isLoading } = useQuery<CV[]>({
    queryKey: ["cvs"],
    queryFn: cvApi.list,
    enabled: !!user,
  });

  const primaryCv = cvs[0];
  const matchSeed =
    primaryCv?.data.target_role ||
    primaryCv?.data.personal_info.job_title ||
    primaryCv?.title ||
    "";

  const { data: matchJobs = [] } = useQuery<JobResult[]>({
    queryKey: ["dashboard-jobs", primaryCv?.id, matchSeed],
    queryFn: async () => {
      const res = await jobsApi.search({
        q: matchSeed,
        location: primaryCv?.data.personal_info.location || "",
        per_page: 5,
      });
      return res.items.slice(0, 5);
    },
    enabled: !!user && !!primaryCv && !!matchSeed,
  });

  const { data: applications = [] } = useQuery<ApplicationEntry[]>({
    queryKey: ["applications"],
    queryFn: jobsApi.applications,
    enabled: !!user,
  });

  const { data: axiomApplications = [] } = useQuery<AxiomApplication[]>({
    queryKey: ["axiom-applications"],
    queryFn: axiomApplicationsApi.list,
    enabled: !!user,
  });

  const { data: interviewSessions = [] } = useQuery<InterviewSessionListItem[]>(
    {
      queryKey: ["interview-sessions"],
      queryFn: interviewApi.sessions,
      enabled: !!user,
    },
  );

  const commandCenter = useMemo(() => {
    const cv = primaryCv;
    const data = cv?.data;
    const profileChecks = [
      !!data?.personal_info.full_name,
      !!data?.personal_info.email,
      !!data?.personal_info.job_title,
      !!data?.summary && data.summary.length > 80,
      (data?.skills?.length || 0) >= 6,
      (data?.experience?.length || 0) > 0,
      (data?.education?.length || 0) > 0,
      !!data?.target_role,
      !!cv?.is_public,
      !!cv?.rating && cv.rating >= 4,
    ];
    const profileStrength = Math.round(
      (profileChecks.filter(Boolean).length / profileChecks.length) * 100,
    );
    const completedSessions = interviewSessions.filter(
      (session) => session.status === "completed",
    );
    const rawLatestScore =
      completedSessions.find((session) => session.overall_score != null)
        ?.overall_score || 0;
    const latestScore =
      rawLatestScore <= 10 ? rawLatestScore * 10 : rawLatestScore;
    const interviewReadiness = Math.min(
      100,
      Math.round(
        latestScore +
          Math.min(completedSessions.length, 5) * 8 +
          (applications.some((app) => app.status === "interview") ? 15 : 0) +
          (axiomApplications.some((app) => app.status === "interview_scheduled")
            ? 15
            : 0),
      ),
    );
    const weeklyCompleted = WEEKLY_GOAL_KEYS.filter(
      (key) => weeklyGoals[key],
    ).length;

    const now = new Date();
    const overdueFollowUps = applications.filter((app) => {
      if (!app.follow_up_at) return false;
      return new Date(app.follow_up_at).getTime() <= now.getTime();
    }).length;

    const activeApplications =
      applications.filter((app) => !["offer", "rejected"].includes(app.status))
        .length +
      axiomApplications.filter(
        (app) =>
          !["offered", "rejected", "accepted", "declined"].includes(app.status),
      ).length;

    let suggestedNextAction: {
      message: string;
      action: string;
      icon: React.ReactNode;
    } | null = null;

    if (!primaryCv) {
      suggestedNextAction = {
        message:
          "You haven't created a CV yet — create your first one to get started.",
        action: "/cv/new",
        icon: <FileText size={16} />,
      };
    } else if (profileStrength < 50) {
      suggestedNextAction = {
        message:
          "Your profile is incomplete — add more details to improve visibility.",
        action: `/cv/${primaryCv.id}`,
        icon: <Edit size={16} />,
      };
    } else if (!primaryCv.is_public) {
      suggestedNextAction = {
        message: "Your CV isn't public — make it public to attract recruiters.",
        action: `/cv/${primaryCv.id}`,
        icon: <Globe size={16} />,
      };
    } else if (!primaryCv.rating || primaryCv.rating < 4) {
      suggestedNextAction = {
        message: "Your CV needs a higher rating — update and rate it again.",
        action: `/cv/${primaryCv.id}`,
        icon: <Star size={16} />,
      };
    } else if (overdueFollowUps > 0) {
      suggestedNextAction = {
        message: `You have ${overdueFollowUps} overdue follow-up${overdueFollowUps > 1 ? "s" : ""} — check your tracker.`,
        action: "/tracker",
        icon: <CalendarClock size={16} />,
      };
    } else if (completedSessions.length === 0) {
      suggestedNextAction = {
        message:
          "You haven't started an interview yet — practise now to build confidence.",
        action: "/interview",
        icon: <CalendarClock size={16} />,
      };
    } else if (activeApplications === 0) {
      suggestedNextAction = {
        message: "You haven't applied to any jobs — start applying today.",
        action: "/jobs",
        icon: <Send size={16} />,
      };
    } else {
      suggestedNextAction = {
        message:
          "Great progress! Keep applying and practising to stay job-ready.",
        action: "/jobs",
        icon: <Search size={16} />,
      };
    }

    return {
      profileStrength,
      interviewReadiness,
      weeklyCompleted,
      activeApplications,
      suggestedNextAction,
    };
  }, [
    applications,
    axiomApplications,
    interviewSessions,
    primaryCv,
    weeklyGoals,
  ]);

  const toggleGoal = (goal: string) => {
    setWeeklyGoals((current) => ({ ...current, [goal]: !current[goal] }));
  };

  const handleDuplicate = async (id: string) => {
    if (duplicatingId) return;
    setDuplicatingId(id);
    try {
      await cvApi.duplicate(id);
      qc.invalidateQueries({ queryKey: ["cvs"] });
      toast.success("CV duplicated");
    } catch {
      toast.error("Failed to duplicate");
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await cvApi.delete(id);
      qc.invalidateQueries({ queryKey: ["cvs"] });
      toast.success("CV deleted");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete");
    }
  };

  const startTitleEdit = (cv: CV) => {
    setEditingTitleId(cv.id);
    setTitleDraft(cv.title);
  };

  const cancelTitleEdit = () => {
    setEditingTitleId(null);
    setTitleDraft("");
  };

  const saveTitleEdit = async (cvId: string) => {
    const nextTitle = titleDraft.trim();
    if (!nextTitle) {
      toast.error("Title cannot be empty");
      return;
    }
    setSavingTitleId(cvId);
    try {
      await cvApi.update(cvId, { title: nextTitle });
      await qc.invalidateQueries({ queryKey: ["cvs"] });
      toast.success("CV title updated");
      setEditingTitleId(null);
      setTitleDraft("");
    } catch {
      toast.error("Failed to update title");
    } finally {
      setSavingTitleId(null);
    }
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const showOnboarding = user?.is_first_login;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto overflow-x-hidden">
      {showOnboarding && <OnboardingWizard />}

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 mb-6 sm:mb-8">
        <div className="min-w-0">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-ink tracking-tight">
            Career Command Center
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {cvs.length} {cvs.length === 1 ? "resume" : "resumes"} saved
          </p>
        </div>
        <button
          className="btn-primary flex-shrink-0"
          onClick={() => navigate("/cv/new")}
        >
          <Plus size={14} /> New CV
        </button>
      </div>

      {/* ── Metric cards + What to do next ──
          Mobile:  full-width stack (Profile → Interview → Next action → Weekly goals)
          lg+:     [left col: Profile+Interview 2-up, then Next action] | [right col: Weekly goals]
      ── */}
      <section className="mb-4 grid gap-4 lg:grid-cols-[1fr_1.25fr] lg:items-start">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          {/* Profile + Interview — single col on mobile, 2-col from sm */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MetricCard
              label="Profile strength"
              icon={<Target size={17} />}
              value={`${commandCenter.profileStrength}%`}
              progress={commandCenter.profileStrength}
              progressColor="bg-amber-500"
              tooltip="How complete your CV profile is. Add personal info, summary, skills, experience, education, and a target role to reach 100%."
            >
              <p className="mt-2 text-xs text-ink-muted">
                Based on CV completeness, public profile, targeting, and
                ratings.
              </p>
            </MetricCard>

            <MetricCard
              label="Interview readiness"
              icon={<TrendingUp size={17} />}
              value={`${commandCenter.interviewReadiness}%`}
              progress={commandCenter.interviewReadiness}
              progressColor="bg-[#a0449f]"
              tooltip="Your interview preparation score. Complete practice sessions and get interview-stage applications to raise this score."
            >
              <p className="mt-2 text-xs text-ink-muted">
                Practice sessions and interview-stage applications raise this
                score.
              </p>
            </MetricCard>
          </div>

          {/* What to do next */}
          {user && commandCenter.suggestedNextAction && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <Lightbulb
                  size={18}
                  className="text-amber-500 flex-shrink-0 mt-0.5"
                />
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-amber-700 font-medium">
                    What to do next
                  </p>
                  <p className="text-sm text-ink mt-1 leading-snug">
                    {commandCenter.suggestedNextAction.message}
                  </p>
                </div>
              </div>
              <button
                className="btn-primary self-start w-full sm:w-auto !px-4 !py-2 text-sm"
                onClick={() =>
                  navigate(commandCenter.suggestedNextAction!.action)
                }
              >
                {commandCenter.suggestedNextAction.icon}
                Take action
                <ArrowRight size={14} className="ml-1" />
              </button>
            </div>
          )}
        </div>

        {/* Right column: Weekly goals — full-width on mobile, right col on lg */}
        <MetricCard
          label="Weekly goals"
          icon={<CheckSquare size={17} />}
          value={`${commandCenter.weeklyCompleted}/${WEEKLY_GOAL_KEYS.length}`}
          tooltip="Track your weekly career goals. Update your CV, apply to jobs, or practise interviews to stay on track."
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
            <p className="text-xs text-ink-muted">
              {commandCenter.weeklyCompleted}/{WEEKLY_GOAL_KEYS.length} complete
            </p>
            <div className="flex items-center gap-2 rounded-lg bg-ash px-3 py-2 text-sm text-ink-muted">
              <Briefcase size={15} />
              {commandCenter.activeApplications} active
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {WEEKLY_GOAL_KEYS.map((goal) => (
              <label
                key={goal}
                className="flex items-center justify-between gap-3 rounded-lg border border-ash-border px-3 py-2 text-sm cursor-pointer select-none"
              >
                <span
                  className={
                    weeklyGoals[goal]
                      ? "text-ink-muted line-through"
                      : "text-ink"
                  }
                >
                  {goal}
                </span>
                <input
                  type="checkbox"
                  checked={!!weeklyGoals[goal]}
                  onChange={() => toggleGoal(goal)}
                  className="h-4 w-4 flex-shrink-0 accent-ink"
                />
              </label>
            ))}
          </div>
          <button
            className="btn-secondary mt-4 !px-3 !py-1.5 !text-xs"
            onClick={() => navigate("/interview")}
          >
            <CalendarClock size={13} /> Practise now
          </button>
        </MetricCard>
      </section>

      {/* ── Skill Gap + Roadmap ── */}
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        {/* Skill Gap Analysis */}
        <div
          className={`card bg-violet-50/30${
            !(user && user.roadmap_progress && user.roadmap_progress.length > 0)
              ? " lg:col-span-2"
              : ""
          }`}
        >
          <div className="flex items-start gap-3">
            <Map size={20} className="text-violet-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-[0.18em] text-violet-700 font-medium">
                Skill Gap Engine
              </p>
              <p className="text-sm text-ink mt-1">
                Discover what skills you need for your target role and get a
                learning roadmap.
              </p>

              {cvs.length > 0 ? (
                /* Stack vertically on mobile; row on sm+ */
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    value={skillGapCV?.id || ""}
                    onChange={(e) => {
                      const selected = cvs.find((c) => c.id === e.target.value);
                      setSkillGapCV(selected || null);
                    }}
                    className="w-full sm:flex-1 text-sm border border-ash-border rounded-lg px-3 py-2 bg-white min-w-0"
                  >
                    <option value="">Select a CV to analyze</option>
                    {cvs.map((cv) => (
                      <option key={cv.id} value={cv.id}>
                        {cv.title || `CV ${cv.id.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn-primary !px-4 !py-2 !bg-violet-600 hover:!bg-violet-700 sm:flex-shrink-0 whitespace-nowrap"
                    onClick={() => {
                      const cvToUse = skillGapCV || primaryCv;
                      if (cvToUse) {
                        navigate(`/cv/${cvToUse.id}?skill_gap=true`);
                      } else {
                        navigate("/cv/new?skill_gap=true");
                      }
                    }}
                    disabled={!skillGapCV && !primaryCv}
                  >
                    <Map size={14} className="mr-1" />
                    Analyze
                  </button>
                </div>
              ) : (
                <button
                  className="btn-primary mt-3 !px-4 !py-2 !bg-violet-600 hover:!bg-violet-700"
                  onClick={() => navigate("/cv/new?skill_gap=true")}
                >
                  <Map size={14} className="mr-1" />
                  Create CV
                  <ArrowRight size={14} className="ml-1" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Roadmap Progress */}
        {user && user.roadmap_progress && user.roadmap_progress.length > 0 && (
          <div className="card border-l-4 border-l-emerald-500 bg-emerald-50/30">
            <div className="flex items-start gap-3">
              <TrendingUp
                size={20}
                className="text-emerald-600 flex-shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-[0.18em] text-emerald-700 font-medium">
                  Your Progress
                </p>
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-ink mb-1">
                    <span>Steps completed</span>
                    <span className="font-medium">
                      {user.roadmap_progress.length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min((user.roadmap_progress.length / 5) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Complete 5 roadmap steps to unlock achievements
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Jobs matching CV ── */}
      {user && primaryCv && (
        <div className="card mb-6 border-ink/10 bg-gradient-to-br from-white to-ash/40">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">
                Jobs matching your CV
              </p>
              <h2 className="mt-1 font-display text-lg font-bold text-ink tracking-tight">
                Based on {matchSeed || "your latest CV"}
              </h2>
              <p className="text-sm text-ink-muted mt-1">
                Quick matches pulled from live job sources. Open the board to
                refine filters or start tracking.
              </p>
            </div>
            {/* Button pair: stretch to fill on mobile, natural on sm+ */}
            <div className="flex gap-2 sm:flex-shrink-0">
              <button
                className="btn-secondary flex-1 sm:flex-none"
                onClick={() => navigate("/jobs")}
              >
                Browse jobs
              </button>
              <button
                className="btn-primary flex-1 sm:flex-none"
                onClick={() => navigate("/tracker")}
              >
                View tracker
              </button>
            </div>
          </div>

          {matchJobs.length > 0 ? (
            /* 1 col on mobile, 2 col from sm, 3 col from xl */
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {matchJobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => {
                    const jobUrl =
                      job.source === "axiom" && job.id.startsWith("axiom:")
                        ? `/jobs/axiom/${job.id.slice("axiom:".length)}`
                        : `/jobs/${encodeURIComponent(job.id)}`;
                    navigate(jobUrl);
                  }}
                  className="text-left rounded-xl border border-ash-border bg-white p-4 hover:border-ink/20 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink truncate">
                        {job.title}
                      </p>
                      <p className="text-sm text-ink-muted truncate mt-0.5">
                        {job.company}
                      </p>
                    </div>
                    <span className="badge bg-ash-dark text-ink-muted capitalize flex-shrink-0">
                      {job.source}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mt-3 line-clamp-2">
                    {job.location}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Info size={24} className="mx-auto text-ink-muted/30 mb-2" />
              <p className="text-sm text-ink-muted">
                No matches yet. Add a target role or skills to your latest CV
                and try again.
              </p>
              <button
                className="btn-secondary mt-3"
                onClick={() => navigate(`/cv/${primaryCv?.id}`)}
              >
                <Edit size={14} /> Update CV
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && cvs.length === 0 && (
        <div className="card text-center py-16 border-dashed">
          <FileText size={32} className="mx-auto text-ink-muted/40 mb-3" />
          <p className="text-sm text-ink-muted mb-4">
            No CVs yet. Create your first one.
          </p>
          <button className="btn-primary" onClick={() => navigate("/cv/new")}>
            <Plus size={14} /> Create CV
          </button>
        </div>
      )}

      {/* ── CV list ── */}
      <div className="space-y-2">
        {cvs.map((cv) => (
          <div key={cv.id} className="card !p-4">
            {/* ── MOBILE LAYOUT (hidden on sm+) ── */}
            <div className="sm:hidden">
              {/* Row 1: title + kebab */}
              <div className="flex items-center gap-2 w-full min-w-0">
                {editingTitleId === cv.id ? (
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <input
                      autoFocus
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveTitleEdit(cv.id);
                        if (e.key === "Escape") cancelTitleEdit();
                      }}
                      className="min-w-0 flex-1 rounded-lg border border-ash-border bg-white px-2.5 py-1.5 text-sm font-medium text-ink outline-none transition-colors focus:border-ink"
                      placeholder="CV title"
                    />
                    <button
                      className="btn-ghost p-1.5 flex-shrink-0"
                      title="Save title"
                      onClick={() => saveTitleEdit(cv.id)}
                      disabled={savingTitleId === cv.id}
                    >
                      <Check size={13} />
                    </button>
                    <button
                      className="btn-ghost p-1.5 flex-shrink-0"
                      title="Cancel"
                      onClick={cancelTitleEdit}
                      disabled={savingTitleId === cv.id}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <h3 className="font-medium text-ink text-sm truncate flex-1 min-w-0">
                    {cv.title}
                  </h3>
                )}
                <div className="flex-shrink-0">
                  <KebabMenu
                    cv={cv}
                    onRename={() => startTitleEdit(cv)}
                    onRate={() => setRatingCV(cv)}
                    onEdit={() => navigate(`/cv/${cv.id}`)}
                    onDuplicate={() => handleDuplicate(cv.id)}
                    duplicating={duplicatingId === cv.id}
                    onDelete={() => setDeleteTarget(cv)}
                  />
                </div>
              </div>

              {/* Row 2: badge + stars */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span
                  className={`badge text-[10px] ${
                    cv.is_public
                      ? "bg-green-50 text-green-700"
                      : "bg-ash-dark text-ink-muted"
                  }`}
                >
                  {cv.is_public ? (
                    <>
                      <Globe size={9} className="inline mr-0.5" />
                      Public
                    </>
                  ) : (
                    <>
                      <Lock size={9} className="inline mr-0.5" />
                      Private
                    </>
                  )}
                </span>
                {cv.rating != null && (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: cv.rating }).map((_, i) => (
                      <Star
                        key={i}
                        size={10}
                        className="text-amber-400 fill-amber-400"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Row 3: meta */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-ink-muted mt-1">
                <span className="flex items-center gap-1">
                  <Clock size={10} /> {fmt(cv.updated_at)}
                </span>
                <span className="capitalize">{cv.theme}</span>
                <span>
                  {cv.page_count === 1 ? "1 page" : `${cv.page_count} pages`}
                </span>
                {cv.data.personal_info.job_title && (
                  <span className="truncate max-w-[120px] sm:max-w-[180px]">
                    {cv.data.personal_info.job_title}
                  </span>
                )}
              </div>

              {/* Row 4: public URL */}
              {cv.is_public && cv.slug && (
                <p className="text-[11px] text-ink-muted/60 font-mono mt-1 truncate">
                  /cv/{cv.owner_username}/{cv.slug}
                </p>
              )}
            </div>

            {/* ── DESKTOP LAYOUT (hidden on mobile) ── */}
            <div className="hidden sm:block">
              <div className="flex items-center gap-2 min-w-0">
                {editingTitleId === cv.id ? (
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <input
                      autoFocus
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveTitleEdit(cv.id);
                        if (e.key === "Escape") cancelTitleEdit();
                      }}
                      className="min-w-0 flex-1 rounded-lg border border-ash-border bg-white px-2.5 py-1.5 text-sm font-medium text-ink outline-none transition-colors focus:border-ink"
                      placeholder="CV title"
                    />
                    <button
                      className="btn-ghost p-1.5"
                      title="Save title"
                      onClick={() => saveTitleEdit(cv.id)}
                      disabled={savingTitleId === cv.id}
                    >
                      <Check size={13} />
                    </button>
                    <button
                      className="btn-ghost p-1.5"
                      title="Cancel"
                      onClick={cancelTitleEdit}
                      disabled={savingTitleId === cv.id}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <h3 className="font-medium text-ink text-sm truncate flex-1 min-w-0">
                      {cv.title}
                    </h3>
                    <button
                      className="btn-ghost p-1.5 flex-shrink-0"
                      title="Rename"
                      onClick={() => startTitleEdit(cv)}
                    >
                      <PencilLine size={13} />
                    </button>
                  </div>
                )}

                <span
                  className={`badge text-[10px] flex-shrink-0 ${
                    cv.is_public
                      ? "bg-green-50 text-green-700"
                      : "bg-ash-dark text-ink-muted"
                  }`}
                >
                  {cv.is_public ? (
                    <>
                      <Globe size={9} className="inline mr-0.5" />
                      Public
                    </>
                  ) : (
                    <>
                      <Lock size={9} className="inline mr-0.5" />
                      Private
                    </>
                  )}
                </span>

                {cv.rating != null && (
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {Array.from({ length: cv.rating }).map((_, i) => (
                      <Star
                        key={i}
                        size={10}
                        className="text-amber-400 fill-amber-400"
                      />
                    ))}
                  </div>
                )}

                <span className="w-px h-3.5 bg-ash-border flex-shrink-0" />

                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    className="btn-ghost p-1.5"
                    title="Rate"
                    onClick={() => setRatingCV(cv)}
                  >
                    <Star
                      size={13}
                      className={
                        cv.rating ? "text-amber-400 fill-amber-400" : ""
                      }
                    />
                  </button>
                  <button
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-ink text-white hover:bg-ink-light text-sm"
                    title="Edit"
                    onClick={() => navigate(`/cv/${cv.id}`)}
                  >
                    <Edit size={13} /> Edit
                  </button>
                  <button
                    className="btn-ghost p-1.5"
                    title="Duplicate"
                    onClick={() => handleDuplicate(cv.id)}
                    disabled={duplicatingId === cv.id}
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    className="btn-ghost p-1.5 hover:text-red-600"
                    title="Delete"
                    onClick={() => setDeleteTarget(cv)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Desktop row 2: meta */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-ink-muted mt-1.5">
                <span className="flex items-center gap-1">
                  <Clock size={10} /> {fmt(cv.updated_at)}
                </span>
                <span className="capitalize">{cv.theme}</span>
                <span>
                  {cv.page_count === 1 ? "1 page" : `${cv.page_count} pages`}
                </span>
                {cv.data.personal_info.job_title && (
                  <span className="truncate max-w-[100px] sm:max-w-[160px]">
                    {cv.data.personal_info.job_title}
                  </span>
                )}
              </div>

              {/* Desktop row 3: public URL */}
              {cv.is_public && cv.slug && (
                <p className="text-[11px] text-ink-muted/60 font-mono mt-1 truncate">
                  /cv/{cv.owner_username}/{cv.slug}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Modals ── */}
      {ratingCV && (
        <RatingModal
          cvId={ratingCV.id}
          cvTitle={ratingCV.title}
          currentRating={ratingCV.rating}
          onClose={() => setRatingCV(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["cvs"] })}
        />
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete CV?"
        description={
          <>
            Delete{" "}
            <span className="font-medium text-ink">
              "{deleteTarget?.title}"
            </span>
            ? This cannot be undone.
          </>
        }
        confirmLabel="Delete CV"
        variant="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
      />
    </div>
  );
}
