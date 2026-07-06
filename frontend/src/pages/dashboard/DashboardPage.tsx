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
import { cvApi, interviewApi, jobsApi, notificationsApi } from "../../api";
import {
  CV,
  InterviewSessionListItem,
  JobResult,
  NotificationItem,
} from "../../types";
import { GenericError } from "../../components/UI/ErrorState";
import { Skeleton } from "../../components/UI/Skeleton";
import { EmptyState } from "../../components/UI/EmptyState";
import {
  Plus,
  FileText,
  Globe,
  Lock,
  Copy,
  Trash2,
  Edit,
  Clock,
  Check,
  X,
  PencilLine,
  MoreVertical,
  Target,
  TrendingUp,
  CalendarClock,
  Info,
  Lightbulb,
  ArrowRight,
  Search,
  Map,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Calendar,
  MessageSquare,
  ImageIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/auth";
import ConfirmDialog from "../../components/UI/ConfirmDialog";
import ShareCardModal from "../../components/cv/ShareCardModal";
import OnboardingWizard from "../../components/OnboardingWizard";
import clsx from "clsx";

const WEEKLY_GOAL_KEYS = ["Update CV", "Save a job", "Practise interview"];

// Goal engine: auto-detect goals based on actual activity (weekly)
function computeGoalStatus(args: {
  primaryCv: CV | undefined;
  interviewSessions: InterviewSessionListItem[] | undefined;
  savedJobs: Array<{ id: string; saved_at: string }> | undefined;
  careerLevel: string;
}) {
  const { primaryCv, interviewSessions, savedJobs, careerLevel } = args;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Goal 1: Update CV - CV updated within last 7 days
  let cvUpdated = false;
  try {
    cvUpdated = primaryCv?.updated_at
      ? new Date(primaryCv.updated_at) >= weekAgo
      : false;
  } catch {
    cvUpdated = false;
  }

  // Goal 2: Save a job - at least 1 saved this week
  let saved = false;
  try {
    saved = (savedJobs || []).some(
      (sj) => sj.saved_at && new Date(sj.saved_at) >= weekAgo,
    );
  } catch {
    saved = false;
  }

  // Goal 3: Practise interview - at least 1 completed session per week
  const sessions = interviewSessions || [];
  let recentSessions = [];
  try {
    recentSessions = sessions.filter(
      (session) =>
        session?.status === "completed" &&
        session?.created_at &&
        new Date(session.created_at) >= weekAgo,
    );
  } catch {
    recentSessions = [];
  }
  const practiced = recentSessions.length >= 1;

  return {
    "Update CV": cvUpdated,
    "Save a job": saved,
    "Practise interview": practiced,
  };
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  icon: React.ReactNode;
  value: string | number;
  progress?: number;
  progressColor?: string;
  tooltip: string;
  isLoading?: boolean;
  children?: React.ReactNode;
}

function MetricCard({
  label,
  icon,
  value,
  progress,
  progressColor = "bg-amber-500",
  tooltip,
  isLoading = false,
  children,
}: MetricCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const flipDown = rect.top < 160;
      const flipRight = rect.left > window.innerWidth / 2;

      setTooltipStyle({
        position: "fixed",
        zIndex: 9999,
        width: "13rem",
        maxWidth: "calc(100vw - 2rem)",
        ...(flipDown
          ? { top: rect.bottom + 8 }
          : { top: rect.top - 8, transform: "translateY(-100%)" }),
        ...(flipRight
          ? { right: window.innerWidth - rect.right }
          : {
              left: rect.left + rect.width / 2,
              transform: `translateY(${flipDown ? "0" : "-100%"}) translateX(-50%)`,
            }),
      });
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
      onClick={() => {
        if (showTooltip) setShowTooltip(false);
        else handleMouseEnter();
      }}
      tabIndex={0}
      role="button"
      aria-label={`${label}: ${value}. ${tooltip}`}
    >
      {showTooltip &&
        createPortal(
          <div
            style={tooltipStyle}
            className="rounded-lg bg-ink px-3 py-2 text-xs text-white shadow-lg pointer-events-none"
          >
            <p className="font-medium">{tooltip}</p>
          </div>,
          document.body,
        )}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink">{label}</p>
        {isLoading ? (
          <Skeleton variant="circular" width={17} height={17} />
        ) : (
          icon
        )}
      </div>
      {isLoading ? (
        <div className="mt-3 space-y-2">
          <Skeleton width="60%" height={28} className="rounded-md" />
          {progress !== undefined && (
            <Skeleton width="100%" height={8} className="rounded-full" />
          )}
          {children && (
            <div className="pt-2 space-y-1">
              <Skeleton width="90%" height={12} />
              <Skeleton width="70%" height={12} />
            </div>
          )}
        </div>
      ) : (
        <>
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
        </>
      )}
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
  onEdit: () => void;
  onDuplicate: () => void;
  duplicating?: boolean;
  onDelete: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MENU_ITEM_HEIGHT = 44;
const MENU_ITEMS = 4;
const MENU_ESTIMATED_HEIGHT = MENU_ITEM_HEIGHT * MENU_ITEMS + 8 + 1;
const VIEWPORT_MARGIN = 8;

// ─── KebabMenu ────────────────────────────────────────────────────────────────

function KebabMenu({
  cv,
  onRename,
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
import Seo from "../../components/Seo";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<CV | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [savingTitleId, setSavingTitleId] = useState<string | null>(null);
  const [skillGapCV, setSkillGapCV] = useState<CV | null>(null);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [shareCardCV, setShareCardCV] = useState<CV | null>(null);

  const [cvPage, setCvPage] = useState(0);
  const {
    data: cvData,
    isLoading,
    error: cvsError,
    refetch: refetchCvs,
  } = useQuery({
    queryKey: ["cvs", cvPage],
    queryFn: () => cvApi.list(cvPage * 20, 20),
    enabled: !!user,
  });
  const cvs = cvData?.cvs ?? [];
  const cvTotal = cvData?.total ?? cvs.length;

  const primaryCv = cvs[0];
  const matchSeed =
    primaryCv?.data.target_role ||
    primaryCv?.data.personal_info.job_title ||
    primaryCv?.title ||
    "";

  const { data: matchJobs = [], isError: matchJobsError } = useQuery<
    JobResult[]
  >({
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
    throwOnError: false,
  });

  const { data: interviewSessions = [] } = useQuery<InterviewSessionListItem[]>(
    {
      queryKey: ["interview-sessions"],
      queryFn: interviewApi.sessions,
      enabled: !!user,
    },
  );

  const { data: recentNotifications = [] } = useQuery<NotificationItem[]>({
    queryKey: ["recent-notifications"],
    queryFn: () => notificationsApi.list(0, 20),
    enabled: !!user,
  });

  const { data: savedJobs = [] } = useQuery<Array<{ id: string; saved_at: string }>>({
    queryKey: ["saved-jobs-dash"],
    queryFn: () =>
      jobsApi.savedList().then((raw) =>
        (Array.isArray(raw) ? raw : []).map((item: { id: string; saved_at: string }) => ({
          id: item.id,
          saved_at: item.saved_at,
        })),
      ),
    enabled: !!user,
  });

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
    ];
    const profileStrength = Math.round(
      (profileChecks.filter(Boolean).length / profileChecks.length) * 100,
    );
    const completedSessions = (interviewSessions || []).filter(
      (session) => session.status === "completed",
    );
    const rawLatestScore =
      completedSessions.find((session) => session.overall_score != null)
        ?.overall_score || 0;
    const latestScore =
      rawLatestScore <= 10 ? rawLatestScore * 10 : rawLatestScore;
    const interviewReadiness = Math.min(
      100,
      Math.round(latestScore + Math.min(completedSessions.length, 5) * 8),
    );
    // Goal engine: compute weekly goals from actual activity
    // Use empty arrays as fallbacks to prevent errors during data loading
    const careerLevel = cv?.data?.career_level || "";
    const weeklyGoalsComputed = computeGoalStatus({
      primaryCv: cv,
      interviewSessions: interviewSessions || [],
      savedJobs: savedJobs || [],
      careerLevel,
    });
    const weeklyCompleted = WEEKLY_GOAL_KEYS.filter(
      (key) => weeklyGoalsComputed[key as keyof typeof weeklyGoalsComputed],
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
    } else if (completedSessions.length === 0) {
      suggestedNextAction = {
        message:
          "You haven't started an interview yet — practise now to build confidence.",
        action: "/interview",
        icon: <CalendarClock size={16} />,
      };
    } else {
      suggestedNextAction = {
        message:
          "Great progress! Keep browsing jobs and practising to stay job-ready.",
        action: "/jobs",
        icon: <Search size={16} />,
      };
    }

    return {
      profileStrength,
      interviewReadiness,
      weeklyCompleted,
      weeklyGoals: weeklyGoalsComputed,
      suggestedNextAction,
    };
  }, [interviewSessions, primaryCv, user]);

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
  const touchStartX = useRef<number>(0);

  // ── Activity feed: merge CV updates, interview sessions, and notifications ──
  const activityFeed = useMemo(() => {
    const items: Array<{
      id: string;
      kind: "cv_update" | "interview" | "notification" | "cv_created";
      title: string;
      description: string;
      timestamp: string;
      link?: string;
    }> = [];

    // CV creation/update events
    cvs.forEach((cv) => {
      items.push({
        id: `cv-${cv.id}`,
        kind: "cv_created",
        title: `"${cv.title}" updated`,
        description: cv.data.personal_info.job_title
          ? `${cv.data.personal_info.job_title}`
          : "No job title set",
        timestamp: cv.updated_at,
        link: `/cv/${cv.id}`,
      });
    });

    // Interview sessions
    (interviewSessions || []).forEach((session) => {
      const statusLabel =
        session.status === "completed"
          ? "completed"
          : session.status === "paused"
            ? "paused"
            : "active";
      items.push({
        id: `interview-${session.id}`,
        kind: "interview",
        title: `${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)} interview — ${session.mode}`,
        description: session.job_title
          ? `For ${session.job_title}`
          : `${session.answered_count}/${session.question_count} answered`,
        timestamp: session.updated_at || session.created_at,
        link: `/interview/review/${session.id}`,
      });
    });

    // Recent notifications
    (recentNotifications || []).forEach((n) => {
      items.push({
        id: `notif-${n.id}`,
        kind: "notification",
        title: n.title,
        description: n.body,
        timestamp: n.created_at,
        link: n.link || undefined,
      });
    });

    // Sort by timestamp descending (most recent first)
    items.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return items.slice(0, 15);
  }, [cvs, interviewSessions, recentNotifications]);

  if (cvsError) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto overflow-x-hidden">
        <GenericError
          title="Failed to load your data"
          message="We couldn't load your CVs and dashboard data. Please check your connection and try again."
          retry={() => refetchCvs()}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto overflow-x-hidden">
      <Seo title="Dashboard" noindex />
      {showOnboarding && (
        <>
          <OnboardingWizard />
          {/* Welcome banner - visible alongside the modal as a backdrop cue */}
          {!isLoading && cvs.length === 0 && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/60 px-5 py-5">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-amber-100 p-2 flex-shrink-0">
                  <FileText size={20} className="text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display font-bold text-lg text-ink tracking-tight">
                    Welcome to Axiom!
                  </h2>
                  <p className="text-sm text-ink-muted mt-1 leading-snug">
                    Get started by creating your first CV, then practise
                    interviews and browse matching jobs — all powered by AI.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 mb-6 sm:mb-8">
        <div className="min-w-0">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-ink tracking-tight">
            Career Command Center
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {cvTotal} {cvTotal === 1 ? "resume" : "resumes"} saved
          </p>
          {cvTotal > 20 && (
            <div className="flex items-center gap-2 mt-1">
              <button
                className="text-xs text-ink-muted hover:text-ink disabled:opacity-30"
                onClick={() => setCvPage((p) => Math.max(0, p - 1))}
                disabled={cvPage === 0}
              >
                ← Prev
              </button>
              <span className="text-xs text-ink-muted">
                Page {cvPage + 1} of {Math.ceil(cvTotal / 20)}
              </span>
              <button
                className="text-xs text-ink-muted hover:text-ink disabled:opacity-30"
                onClick={() => setCvPage((p) => p + 1)}
                disabled={(cvPage + 1) * 20 >= cvTotal}
              >
                Next →
              </button>
            </div>
          )}
        </div>
        <button
          className="btn-primary flex-shrink-0"
          onClick={() => navigate("/cv/new")}
        >
          <Plus size={14} /> New CV
        </button>
      </div>{" "}
      {/* ── Metric cards + Weekly goals (hidden when no CV exists) ── */}
      {cvs.length > 0 && (
        <section className="mb-4 grid gap-4 lg:grid-cols-[1fr_1.25fr] lg:items-start">
          {/* Left column */}
          <div className="flex flex-col gap-4">
            {/* Profile + Interview — carousel on mobile, 2-col from lg */}
            <div className="relative">
              <div
                className="lg:hidden overflow-hidden"
                onTouchStart={(e) => {
                  touchStartX.current = e.touches[0].clientX;
                }}
                onTouchEnd={(e) => {
                  const delta =
                    touchStartX.current - e.changedTouches[0].clientX;
                  if (delta > 40) setCarouselIdx(1);
                  if (delta < -40) setCarouselIdx(0);
                }}
              >
                <div
                  className="flex transition-transform duration-300 ease-out"
                  style={{ transform: `translateX(-${carouselIdx * 100}%)` }}
                >
                  <div className="w-full flex-shrink-0">
                    <MetricCard
                      label="Profile strength"
                      icon={<Target size={17} />}
                      value={`${commandCenter.profileStrength}%`}
                      progress={commandCenter.profileStrength}
                      progressColor="bg-amber-500"
                      tooltip="How complete your CV profile is. Add personal info, summary, skills, experience, education, and a target role to reach 100%."
                      isLoading={isLoading}
                    >
                      <p className="mt-2 text-xs text-ink-muted break-words">
                        Based on CV completeness, public profile, and targeting.
                      </p>
                    </MetricCard>
                  </div>
                  <div className="w-full flex-shrink-0">
                    <MetricCard
                      label="Interview readiness"
                      icon={<TrendingUp size={17} />}
                      value={`${commandCenter.interviewReadiness}%`}
                      progress={commandCenter.interviewReadiness}
                      progressColor="bg-[#a0449f]"
                      tooltip="Your interview preparation score. Complete practice sessions and get interview-stage applications to raise this score."
                      isLoading={isLoading}
                    >
                      <p className="mt-2 text-xs text-ink-muted break-words">
                        Practice sessions and interview-stage applications raise
                        this score.
                      </p>
                    </MetricCard>
                  </div>
                </div>
                <div className="flex justify-center gap-2 mt-3">
                  <button
                    onClick={() => setCarouselIdx(0)}
                    className={clsx(
                      "w-2 h-2 rounded-full transition-colors",
                      carouselIdx === 0 ? "bg-amber-500" : "bg-ink-20",
                    )}
                    aria-label="Show Profile strength"
                  />
                  <button
                    onClick={() => setCarouselIdx(1)}
                    className={clsx(
                      "w-2 h-2 rounded-full transition-colors",
                      carouselIdx === 1 ? "bg-[#a0449f]" : "bg-ink-20",
                    )}
                    aria-label="Show Interview readiness"
                  />
                </div>
              </div>
              <div className="hidden lg:grid grid-cols-2 gap-4">
                <MetricCard
                  label="Profile strength"
                  icon={<Target size={17} />}
                  value={`${commandCenter.profileStrength}%`}
                  progress={commandCenter.profileStrength}
                  progressColor="bg-amber-500"
                  tooltip="How complete your CV profile is. Add personal info, summary, skills, experience, education, and a target role to reach 100%."
                  isLoading={isLoading}
                >
                  <p className="mt-2 text-xs text-ink-muted break-words">
                    Based on CV completeness, public profile, and targeting.
                  </p>
                </MetricCard>
                <MetricCard
                  label="Interview readiness"
                  icon={<TrendingUp size={17} />}
                  value={`${commandCenter.interviewReadiness}%`}
                  progress={commandCenter.interviewReadiness}
                  progressColor="bg-[#a0449f]"
                  tooltip="Your interview preparation score. Complete practice sessions and get interview-stage applications to raise this score."
                  isLoading={isLoading}
                >
                  <p className="mt-2 text-xs text-ink-muted break-words">
                    Practice sessions and interview-stage applications raise
                    this score.
                  </p>
                </MetricCard>
              </div>
            </div>
          </div>

          {/* Right column: Weekly goals */}
          <MetricCard
            label="Weekly goals"
            icon={<CheckSquare size={17} />}
            value={`${commandCenter.weeklyCompleted}/${WEEKLY_GOAL_KEYS.length}`}
            tooltip="Track your weekly career goals. Update your CV, save a job, or practise interviews to stay on track."
            isLoading={isLoading}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
              <p className="text-xs text-ink-muted">
                {commandCenter.weeklyCompleted}/{WEEKLY_GOAL_KEYS.length}{" "}
                complete
              </p>
            </div>
            <div className="mt-4 space-y-2">
              {WEEKLY_GOAL_KEYS.map((goal) => {
                const isComplete =
                  commandCenter.weeklyGoals[
                    goal as keyof typeof commandCenter.weeklyGoals
                  ];
                return (
                  <div
                    key={goal}
                    className={clsx(
                      "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm",
                      isComplete
                        ? "border-green-500/30 bg-green-500/5"
                        : "border-ash-border",
                    )}
                  >
                    <span
                      className={isComplete ? "text-green-700" : "text-ink"}
                    >
                      {goal}
                    </span>
                    {isComplete ? (
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <span className="text-ink-muted text-xs">pending</span>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              className="btn-secondary mt-4 !px-3 !py-1.5 !text-xs"
              onClick={() => navigate("/interview")}
            >
              <CalendarClock size={13} /> Practise now
            </button>
          </MetricCard>
        </section>
      )}
      {/* ── What to do next (always visible, even without CV) ── */}
      {user && commandCenter.suggestedNextAction && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-4 flex flex-col gap-3 mb-6">
          <div className="flex items-start gap-3">
            <Lightbulb
              size={18}
              className="text-amber-500 flex-shrink-0 mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-[0.18em] text-amber-700 font-medium">
                What to do next
              </p>
              <p className="text-sm text-ink mt-1 leading-snug break-words">
                {commandCenter.suggestedNextAction.message}
              </p>
            </div>
          </div>
          <button
            className="btn-primary self-start w-full sm:w-auto !px-4 !py-2 text-sm"
            onClick={() => navigate(commandCenter.suggestedNextAction!.action)}
          >
            {commandCenter.suggestedNextAction.icon}
            Take action
            <ArrowRight size={14} className="ml-1" />
          </button>
        </div>
      )}
      {/* ── Quick Actions ── */}
      {user && cvs.length > 0 && (
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-ash-border bg-white p-4 hover:border-ink/20 hover:shadow-sm hover:-translate-y-0.5 transition-all"
            onClick={() => navigate("/cv/new")}
          >
            <div className="rounded-lg bg-amber-50 p-2.5">
              <FileText size={18} className="text-amber-600" />
            </div>
            <span className="text-xs font-medium text-ink text-center">
              New CV
            </span>
          </button>
          <button
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-ash-border bg-white p-4 hover:border-ink/20 hover:shadow-sm hover:-translate-y-0.5 transition-all"
            onClick={() => navigate("/interview")}
          >
            <div className="rounded-lg bg-violet-50 p-2.5">
              <Calendar size={18} className="text-violet-600" />
            </div>
            <span className="text-xs font-medium text-ink text-center">
              Start Interview
            </span>
          </button>
          <button
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-ash-border bg-white p-4 hover:border-ink/20 hover:shadow-sm hover:-translate-y-0.5 transition-all"
            onClick={() => navigate("/jobs")}
          >
            <div className="rounded-lg bg-blue-50 p-2.5">
              <Search size={18} className="text-blue-600" />
            </div>
            <span className="text-xs font-medium text-ink text-center">
              Browse Jobs
            </span>
          </button>
          <button
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-ash-border bg-white p-4 hover:border-ink/20 hover:shadow-sm hover:-translate-y-0.5 transition-all"
            onClick={() => navigate("/saved-jobs")}
          >
            <div className="rounded-lg bg-emerald-50 p-2.5">
              <Target size={18} className="text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-ink text-center">
              Saved Jobs
            </span>
          </button>
        </div>
      )}
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
                /* FIX: min-w-0 on the row prevents the select from causing overflow on mobile */
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center min-w-0">
                  <select
                    value={skillGapCV?.id || ""}
                    onChange={(e) => {
                      const selected = cvs.find((c) => c.id === e.target.value);
                      setSkillGapCV(selected || null);
                    }}
                    className="w-full sm:flex-1 text-sm border border-ash-border rounded-lg px-3 py-2 bg-white min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
                  >
                    <option value="">Select a CV to analyze</option>
                    {cvs.map((cv) => (
                      <option key={cv.id} value={cv.id} className="truncate">
                        {cv.title || `CV ${cv.id.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn-primary !px-4 !py-2 !bg-violet-600 hover:!bg-violet-700 sm:flex-shrink-0 whitespace-nowrap"
                    onClick={() => {
                      navigate("/skill-gap");
                    }}
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
              {/*
                FIX: matchSeed can be a long unbroken string (e.g. a full job title).
                line-clamp-2 caps it at 2 lines; break-words forces wrapping on narrow viewports
                instead of overflowing the card and triggering horizontal scroll.
              */}
              <h2 className="mt-1 font-display text-lg font-bold text-ink tracking-tight break-words line-clamp-2">
                Based on {matchSeed || "your latest CV"}
              </h2>
              {/* FIX: break-words guards against long unbroken description text */}
              <p className="text-sm text-ink-muted mt-1 break-words">
                Quick matches pulled from live job sources. Open the board to
                refine filters or start tracking.
              </p>
            </div>
            {/*
              FIX: w-full sm:w-auto ensures the button pair fills the available width on
              mobile (so neither button gets clipped) while shrinking to natural size on sm+.
            */}
            <div className="flex gap-2 w-full sm:w-auto sm:flex-shrink-0">
              <button
                className="btn-secondary flex-1 sm:flex-none"
                onClick={() => navigate("/jobs")}
              >
                Browse jobs
              </button>
              <button
                className="btn-primary flex-1 sm:flex-none"
                onClick={() => navigate("/saved-jobs")}
              >
                View saved jobs
              </button>
            </div>
          </div>

          {matchJobsError ? (
            <div className="mt-5 text-center py-6">
              <p className="text-xs text-ink-muted">
                Could not fetch job matches right now.
              </p>
            </div>
          ) : matchJobs.length > 0 ? (
            /* 1 col on mobile, 2 col from sm, 3 col from xl */
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {matchJobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => {
                    navigate(`/jobs/${encodeURIComponent(job.id)}`);
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
      {/* ── CV list loading skeleton ── */}
      {isLoading && cvs.length === 0 && (
        <div className="space-y-2" aria-label="Loading CVs">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card !p-4 animate-pulse">
              <div className="flex items-center gap-2">
                <div className="h-4 w-40 rounded bg-ash-dark" />
                <div className="h-4 w-16 rounded-full bg-ash-dark ml-auto" />
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-3 w-24 rounded bg-ash-dark" />
                <div className="h-3 w-16 rounded bg-ash-dark" />
                <div className="h-3 w-12 rounded bg-ash-dark" />
              </div>
            </div>
          ))}
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
                <p className="text-[11px] text-ink-muted/60 font-mono mt-1 truncate flex items-center gap-2">
                  <span className="truncate">
                    /cv/{cv.owner_username}/{cv.slug}
                  </span>
                  <button
                    onClick={() => setShareCardCV(cv)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-ink text-white rounded-md hover:bg-ink-light transition-colors flex-shrink-0"
                  >
                    <ImageIcon size={10} />
                    Card
                  </button>
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

                <span className="w-px h-3.5 bg-ash-border flex-shrink-0" />

                <div className="flex items-center gap-0.5 flex-shrink-0">
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
                <p className="text-[11px] text-ink-muted/60 font-mono mt-1 truncate flex items-center gap-2">
                  <span className="truncate">
                    /cv/{cv.owner_username}/{cv.slug}
                  </span>
                  <button
                    onClick={() => setShareCardCV(cv)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-ink text-white rounded-md hover:bg-ink-light transition-colors flex-shrink-0"
                  >
                    <ImageIcon size={10} />
                    Share card
                  </button>
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* ── Recent Activity ── */}
      {user && (
        <section className="mt-8 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-bold text-ink tracking-tight">
              Recent Activity
            </h2>
            {activityFeed.length > 0 && (
              <span className="text-xs text-ink-muted">
                {activityFeed.length} recent{" "}
                {activityFeed.length === 1 ? "event" : "events"}
              </span>
            )}
          </div>

          {activityFeed.length > 0 ? (
            <div className="space-y-1">
              {activityFeed.map((item) => {
                const iconMap = {
                  cv_update: <Edit size={13} className="text-amber-500" />,
                  cv_created: <FileText size={13} className="text-blue-500" />,
                  interview: <Calendar size={13} className="text-violet-500" />,
                  notification: (
                    <MessageSquare size={13} className="text-ink-muted" />
                  ),
                };
                const bgMap = {
                  cv_update: "bg-amber-50",
                  cv_created: "bg-blue-50",
                  interview: "bg-violet-50",
                  notification: "bg-ash",
                };
                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 rounded-xl px-3.5 py-2.5 ${bgMap[item.kind]} hover:bg-ash-dark transition-colors`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {iconMap[item.kind]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink font-medium truncate">
                        {item.link ? (
                          <button
                            className="hover:underline text-left w-full truncate"
                            onClick={() => navigate(item.link!)}
                          >
                            {item.title}
                          </button>
                        ) : (
                          item.title
                        )}
                      </p>
                      <p className="text-xs text-ink-muted mt-0.5 line-clamp-1">
                        {item.description}
                      </p>
                    </div>
                    <span className="text-[10px] text-ink-muted flex-shrink-0 whitespace-nowrap pt-0.5">
                      {fmt(item.timestamp)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-ash-border">
              <EmptyState
                variant="list"
                title="No activity yet"
                description="Create a CV or start an interview — your recent activity will show up here."
                action={{
                  label: "Create CV",
                  onClick: () => navigate("/cv/new"),
                }}
              />
            </div>
          )}
        </section>
      )}
      {/* ── Modals ── */}
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
      <ShareCardModal
        open={!!shareCardCV}
        onClose={() => setShareCardCV(null)}
        fullName={shareCardCV?.data?.personal_info?.full_name || ""}
        jobTitle={shareCardCV?.data?.personal_info?.job_title || ""}
        summary={shareCardCV?.data?.summary || ""}
        skills={shareCardCV?.data?.skills || []}
        location={shareCardCV?.data?.personal_info?.location || ""}
        publicUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/cv/${shareCardCV?.owner_username || ""}/${shareCardCV?.slug || ""}`}
        username={shareCardCV?.owner_username || ""}
      />
    </div>
  );
}
