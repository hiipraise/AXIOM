import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { axiomApplicationsApi, cvApi, interviewApi, jobsApi } from "../../api";
import { ApplicationEntry, AxiomApplication, CV, InterviewSessionListItem, JobResult } from "../../types";
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
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/auth";
import RatingModal from "../../components/cv/RatingModal";
import ConfirmDialog from "../../components/UI/ConfirmDialog";

const WEEKLY_GOAL_KEYS = ["Update CV", "Apply to jobs", "Practise interview"];

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
  onDelete: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MENU_WIDTH = 176; // w-44 = 11rem = 176px
const MENU_ITEM_HEIGHT = 44; // approx px per item (2.75rem)
const MENU_ITEMS = 5; // Rename, Rate, Edit, Duplicate, Delete
const MENU_ESTIMATED_HEIGHT = MENU_ITEM_HEIGHT * MENU_ITEMS + 8 + 1; // items + padding + divider
const VIEWPORT_MARGIN = 8; // minimum gap from viewport edge

// ─── KebabMenu ────────────────────────────────────────────────────────────────

function KebabMenu({
  cv,
  onRename,
  onRate,
  onEdit,
  onDuplicate,
  onDelete,
}: KebabMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Compute where to render the dropdown relative to the viewport
  const computePosition = useCallback((): MenuPosition => {
    const btn = triggerRef.current!.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Horizontal: align right edge of menu with button's right edge
    let right = vw - btn.right;
    // Clamp to keep menu within viewport (right edge at most MENU_WIDTH from right)
    right = Math.max(VIEWPORT_MARGIN, Math.min(right, vw - MENU_WIDTH - VIEWPORT_MARGIN));

    // Vertical: decide direction
    const spaceBelow = vh - btn.bottom - VIEWPORT_MARGIN;
    const spaceAbove = btn.top - VIEWPORT_MARGIN;
    const fitsBelow = spaceBelow >= MENU_ESTIMATED_HEIGHT;
    const fitsAbove = spaceAbove >= MENU_ESTIMATED_HEIGHT;

    if (fitsBelow) {
      // Open downward — plenty of room
      return {
        top: btn.bottom + 4,
        right,
        maxHeight: spaceBelow,
        openUpward: false,
      };
    } else if (fitsAbove) {
      // Open upward — not enough room below
      return {
        bottom: vh - btn.top + 4,
        right,
        maxHeight: spaceAbove,
        openUpward: true,
      };
    } else {
      // Neither fits perfectly — pick the larger side and scroll inside
      const useBelow = spaceBelow >= spaceAbove;
      if (useBelow) {
        return {
          top: btn.bottom + 4,
          right,
          maxHeight: spaceBelow,
          openUpward: false,
        };
      } else {
        return {
          bottom: vh - btn.top + 4,
          right,
          maxHeight: spaceAbove,
          openUpward: true,
        };
      }
    }
  }, []);

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    const pos = computePosition();
    setPosition(pos);
    setOpen(true);
  };

  const closeMenu = useCallback(() => {
    setOpen(false);
    setPosition(null);
  }, []);

  // Close on outside click / scroll / resize
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

  // Recompute on scroll inside any ancestor (e.g. the page itself scrolls)
  useEffect(() => {
    if (!open) return;
    const handleScroll = () => {
      if (triggerRef.current) {
        setPosition(computePosition());
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [open, computePosition]);

  const menuStyle: React.CSSProperties = position
    ? {
        position: "fixed",
        right: position.right,
        width: MENU_WIDTH,
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
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-ink hover:bg-ash-dark"
              onClick={() => {
                onDuplicate();
                closeMenu();
              }}
            >
              <Copy size={14} /> Duplicate
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
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [savingTitleId, setSavingTitleId] = useState<string | null>(null);
  const goalStorageKey = user ? `weekly-goals:${user.id}` : "weekly-goals:guest";
  const [weeklyGoals, setWeeklyGoals] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(goalStorageKey) || "{}");
    } catch {
      return {};
    }
  });

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

  const { data: interviewSessions = [] } = useQuery<InterviewSessionListItem[]>({
    queryKey: ["interview-sessions"],
    queryFn: interviewApi.sessions,
    enabled: !!user,
  });

  useEffect(() => {
    try {
      setWeeklyGoals(JSON.parse(localStorage.getItem(goalStorageKey) || "{}"));
    } catch {
      setWeeklyGoals({});
    }
  }, [goalStorageKey]);

  useEffect(() => {
    localStorage.setItem(goalStorageKey, JSON.stringify(weeklyGoals));
  }, [goalStorageKey, weeklyGoals]);

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
    const latestScore = rawLatestScore <= 10 ? rawLatestScore * 10 : rawLatestScore;
    const interviewReadiness = Math.min(
      100,
      Math.round(
        latestScore +
          Math.min(completedSessions.length, 5) * 8 +
          (applications.some((app) => app.status === "interview") ? 15 : 0) +
          (axiomApplications.some((app) => app.status === "interview_scheduled") ? 15 : 0),
      ),
    );
    const weeklyCompleted = WEEKLY_GOAL_KEYS.filter((key) => weeklyGoals[key]).length;
    return {
      profileStrength,
      interviewReadiness,
      weeklyCompleted,
      activeApplications: applications.filter(
        (app) => !["offer", "rejected"].includes(app.status),
      ).length + axiomApplications.filter(
        (app) => !["offered", "rejected", "accepted", "declined"].includes(app.status),
      ).length,
    };
  }, [applications, axiomApplications, interviewSessions, primaryCv, weeklyGoals]);

  const toggleGoal = (goal: string) => {
    setWeeklyGoals((current) => ({ ...current, [goal]: !current[goal] }));
  };

  const handleDuplicate = async (id: string) => {
    try {
      await cvApi.duplicate(id);
      qc.invalidateQueries({ queryKey: ["cvs"] });
      toast.success("CV duplicated");
    } catch {
      toast.error("Failed to duplicate");
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

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-ink tracking-tight">
            Career Command Center
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {cvs.length} {cvs.length === 1 ? "resume" : "resumes"} saved
          </p>
        </div>
        <button className="btn-primary" onClick={() => navigate("/cv/new")}>
          <Plus size={14} /> New CV
        </button>
      </div>

      <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr]">
        <div className="card">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-ink">Profile strength</p>
            <Target size={17} />
          </div>
          <p className="mt-3 text-3xl font-bold text-ink">
            {commandCenter.profileStrength}%
          </p>
          <div className="mt-3 h-2 rounded-full bg-ash-dark">
            <div
              className="h-2 rounded-full bg-amber-500"
              style={{ width: `${commandCenter.profileStrength}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Based on CV completeness, public profile, targeting, and ratings.
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-ink">Interview readiness</p>
            <TrendingUp size={17} />
          </div>
          <p className="mt-3 text-3xl font-bold text-ink">
            {commandCenter.interviewReadiness}%
          </p>
          <div className="mt-3 h-2 rounded-full bg-ash-dark">
            <div
              className="h-2 rounded-full bg-[#a0449f]"
              style={{ width: `${commandCenter.interviewReadiness}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Practice sessions and interview-stage applications raise this score.
          </p>
        </div>

        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">Weekly goals</p>
              <p className="text-xs text-ink-muted">
                {commandCenter.weeklyCompleted}/{WEEKLY_GOAL_KEYS.length} complete
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-ash px-3 py-2 text-sm text-ink-muted">
              <Briefcase size={15} />
              {commandCenter.activeApplications} active
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {WEEKLY_GOAL_KEYS.map((goal) => (
              <label
                key={goal}
                className="flex items-center justify-between gap-3 rounded-lg border border-ash-border px-3 py-2 text-sm"
              >
                <span className={weeklyGoals[goal] ? "text-ink-muted line-through" : "text-ink"}>
                  {goal}
                </span>
                <input
                  type="checkbox"
                  checked={!!weeklyGoals[goal]}
                  onChange={() => toggleGoal(goal)}
                  className="h-4 w-4 accent-ink"
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
        </div>
      </section>

      {user && primaryCv && (
        <div className="card mb-6 border-ink/10 bg-gradient-to-br from-white to-ash/40">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
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
            <div className="flex gap-2">
              <button
                className="btn-secondary"
                onClick={() => navigate("/jobs")}
              >
                Browse jobs
              </button>
              <button
                className="btn-primary"
                onClick={() => navigate("/tracker")}
              >
                View tracker
              </button>
            </div>
          </div>
          {matchJobs.length > 0 ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
                    <span className="badge bg-ash-dark text-ink-muted capitalize">
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
            <p className="text-sm text-ink-muted mt-4">
              No matches yet. Add a target role or skills to your latest CV and
              try again.
            </p>
          )}
        </div>
      )}

      {/* Empty state */}
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

      {/* CV list */}
      <div className="space-y-2">
        {cvs.map((cv) => (
          <div key={cv.id} className="card !p-4">
            {/* ── MOBILE LAYOUT (hidden on sm+) ── */}
            <div className="sm:hidden">
              <div className="flex items-center gap-2 w-full">
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
                  <h3 className="font-medium text-ink text-sm truncate w-0 flex-1">
                    {cv.title}
                  </h3>
                )}

                {/* ✅ Portal-based kebab menu — no clipping, viewport-aware */}
                <div className="flex-shrink-0">
                  <KebabMenu
                    cv={cv}
                    onRename={() => startTitleEdit(cv)}
                    onRate={() => setRatingCV(cv)}
                    onEdit={() => navigate(`/cv/${cv.id}`)}
                    onDuplicate={() => handleDuplicate(cv.id)}
                    onDelete={() => setDeleteTarget(cv)}
                  />
                </div>
              </div>

              {/* Mobile row 2: badge + stars */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span
                  className={`badge text-[10px] ${cv.is_public ? "bg-green-50 text-green-700" : "bg-ash-dark text-ink-muted"}`}
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

              {/* Mobile row 3: meta */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-ink-muted mt-1">
                <span className="flex items-center gap-1">
                  <Clock size={10} /> {fmt(cv.updated_at)}
                </span>
                <span className="capitalize">{cv.theme}</span>
                <span>
                  {cv.page_count === 1 ? "1 page" : `${cv.page_count} pages`}
                </span>
                {cv.data.personal_info.job_title && (
                  <span className="truncate max-w-[180px]">
                    {cv.data.personal_info.job_title}
                  </span>
                )}
              </div>

              {/* Mobile row 4: public URL */}
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
                    <h3 className="font-medium text-ink text-sm truncate w-0 flex-1">
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
                  className={`badge text-[10px] flex-shrink-0 ${cv.is_public ? "bg-green-50 text-green-700" : "bg-ash-dark text-ink-muted"}`}
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
                  <span className="truncate max-w-[160px]">
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
