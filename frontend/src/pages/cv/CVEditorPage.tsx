import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cvApi } from "../../api";
import { CV, CVData, EMPTY_CV_DATA, normalizeCVData } from "../../types";
import { usePrintCV } from "../../hooks/usePrintCV";
import toast from "react-hot-toast";
import {
  Save,
  Download,
  Sparkles,
  ChevronLeft,
  Globe,
  Lock,
  Briefcase,
  GraduationCap,
  Award,
  FolderOpen,
  Menu,
  X,
  Languages,
  Heart,
  User,
  AlignLeft,
  Wrench,
  History,
  Eye,
  Target,
  Info,
  PencilLine,
  SlidersHorizontal,
  GripVertical,
  Check,
  Circle,
  ArrowRight,
  Undo2,
  CheckCircle,
  XCircle,
  Search,
  FileText,
  ChevronDown,
  Star,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useAnnouncement } from "../../context/announcement";
import PersonalInfoSection from "../../components/cv/PersonalInfoSection";
import CVContextSelector from "../../components/cv/CVContextSelector";
import SummarySection from "../../components/cv/SummarySection";
import SkillsSection from "../../components/cv/SkillsSection";
import ExperienceSection from "../../components/cv/ExperienceSection";
import EducationSection from "../../components/cv/EducationSection";
import CertificationsSection from "../../components/cv/CertificationsSection";
import ProjectsSection from "../../components/cv/ProjectsSection";
import AwardsSection from "../../components/cv/AwardsSection";
import LanguagesSection from "../../components/cv/LanguagesSection";
import VolunteerSection from "../../components/cv/VolunteerSection";
import AIAssistPanel from "../../components/cv/AIAssistPanel";
import SkillGapEngine from "../../components/cv/SkillGapEngine";
import CVPreview from "../../components/cv/CVPreview";
import ATSPreviewModal from "../../components/cv/ATSPreviewModal";
import { CV_THEME_OPTIONS } from "../../lib/cvThemes";
import { CV_TEMPLATE_OPTIONS } from "../../lib/cvTemplateRegistry";
import HistoryDrawer from "../../components/cv/HistoryDrawer";
import DiffViewer from "../../components/cv/DiffViewer";
import ConfirmDialog from "../../components/UI/ConfirmDialog";
import Breadcrumb from "../../components/Breadcrumb";
import { useCVUndoStore } from "../../store/cvUndo";

// Recommended fill order for progressive disclosure
const RECOMMENDED_ORDER = [
  "personal",
  "targeting",
  "summary",
  "experience",
  "education",
  "skills",
  "certifications",
  "projects",
  "awards",
  "languages",
  "volunteer",
];

const DEFAULT_SECTIONS = [
  { id: "personal", label: "Personal Info", icon: User },
  { id: "targeting", label: "Targeting", icon: Target },
  { id: "summary", label: "Summary", icon: AlignLeft },
  { id: "skills", label: "Skills", icon: Wrench },
  { id: "experience", label: "Experience", icon: Briefcase },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "certifications", label: "Certifications", icon: Award },
  { id: "projects", label: "Projects", icon: FolderOpen },
  { id: "awards", label: "Awards", icon: Star },
  { id: "languages", label: "Languages", icon: Languages },
  { id: "volunteer", label: "Volunteer", icon: Heart },
];

// Sortable section item component
function SortableSectionItem({
  id,
  label,
  icon: Icon,
  isActive,
  isCompleted,
  orderIndex,
  onClick,
}: {
  id: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  isCompleted: boolean;
  orderIndex: number;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-all text-left ${
        isActive
          ? "bg-ink text-white font-medium"
          : "text-ink-muted hover:bg-ash hover:text-ink"
      }`}
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={13} className="text-ink-muted" />
      </span>
      <Icon size={13} />
      <span className="flex-1 truncate">{label}</span>
      {isCompleted ? (
        <Check size={12} className="text-emerald-500" />
      ) : (
        <span className="text-[10px] text-ink-muted">{orderIndex + 1}</span>
      )}
    </button>
  );
}

// Helper to format time since last save
function formatTimeSince(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function SectionDrawer({
  activeSection,
  onSelect,
  onClose,
}: {
  activeSection: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black/40 z-40 md:hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl md:hidden"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-ash-border">
          <p className="font-semibold text-sm text-ink">Sections</p>
          <button onClick={onClose}>
            <X size={16} className="text-ink-muted" />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[60vh] py-2">
          {DEFAULT_SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                onSelect(id);
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm text-left transition-colors ${
                activeSection === id
                  ? "bg-ink text-white font-medium"
                  : "text-ink-muted hover:bg-ash hover:text-ink"
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </motion.div>
    </>
  );
}

// ── 8a: Mobile settings bottom sheet ────────────────────────────────────────
function MobileSettingsSheet({
  theme,
  template,
  pageCount,
  isPublic,
  onThemeChange,
  onTemplateChange,
  onPageCountChange,
  onPublicChange,
  onClose,
}: {
  theme: string;
  template: string;
  pageCount: number;
  isPublic: boolean;
  onThemeChange: (v: string) => void;
  onTemplateChange: (v: string) => void;
  onPageCountChange: (v: number) => void;
  onPublicChange: (v: boolean) => void;
  onClose: () => void;
}) {
  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black/40 z-40 md:hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl md:hidden"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-ash-border">
          <p className="font-semibold text-sm text-ink">CV Settings</p>
          <button onClick={onClose}>
            <X size={16} className="text-ink-muted" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Template */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink-muted uppercase tracking-wide">
              Template
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CV_TEMPLATE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => onTemplateChange(o.value)}
                  className={`px-3 py-2.5 rounded-lg text-sm border transition-colors text-left ${
                    template === o.value
                      ? "border-ink bg-ink text-white font-medium"
                      : "border-ash-border text-ink-muted hover:bg-ash hover:text-ink"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink-muted uppercase tracking-wide">
              Theme
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CV_THEME_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => onThemeChange(o.value)}
                  className={`px-3 py-2.5 rounded-lg text-sm border transition-colors text-left ${
                    theme === o.value
                      ? "border-ink bg-ink text-white font-medium"
                      : "border-ash-border text-ink-muted hover:bg-ash hover:text-ink"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Page count */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink-muted uppercase tracking-wide">
              Page Count
            </label>
            <div className="flex gap-2">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => onPageCountChange(n)}
                  className={`flex-1 py-2.5 rounded-lg text-sm border transition-colors font-medium ${
                    pageCount === n
                      ? "border-ink bg-ink text-white"
                      : "border-ash-border text-ink-muted hover:bg-ash hover:text-ink"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink-muted uppercase tracking-wide">
              Visibility
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => onPublicChange(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm border transition-colors ${
                  !isPublic
                    ? "border-ink bg-ink text-white font-medium"
                    : "border-ash-border text-ink-muted hover:bg-ash hover:text-ink"
                }`}
              >
                <Lock size={13} /> Private
              </button>
              <button
                onClick={() => onPublicChange(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm border transition-colors ${
                  isPublic
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 font-medium"
                    : "border-ash-border text-ink-muted hover:bg-ash hover:text-ink"
                }`}
              >
                <Globe size={13} /> Public
              </button>
            </div>
          </div>
        </div>

        {/* Safe-area spacer for home bar */}
        <div className="h-safe-bottom pb-4" />
      </motion.div>
    </>
  );
}

export default function CVEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const { printCV, exportCV, isPrinting } = usePrintCV();
  const [exportFormat, setExportFormat] = useState<"pdf" | "docx" | "txt">(
    "pdf",
  );
  const [showExportMenu, setShowExportMenu] = useState(false);
  const openSkillGap = searchParams.get("skill_gap") === "true";

  // Section order state (default order)
  const [sectionOrder, setSectionOrder] = useState<string[]>(() =>
    DEFAULT_SECTIONS.map((s) => s.id),
  );
  const [activeSection, setActiveSection] = useState("personal");
  const [cvData, setCvData] = useState<CVData>(EMPTY_CV_DATA);
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [theme, setTheme] = useState("minimal");
  const [template, setTemplate] = useState("standard");
  const [pageCount, setPageCount] = useState(1);
  const [showAI, setShowAI] = useState(false);
  const [showSkillGap, setShowSkillGap] = useState(openSkillGap);
  const [showPreview, setShowPreview] = useState(false);
  const [showATS, setShowATS] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingAction, setPendingAction] = useState<null | {
    action: "leave" | "restore";
    run: () => void;
  }>(null);

  // Undo state
  const { stack, push: pushUndo, undoTo, clear: clearUndo } = useCVUndoStore();
  const [pendingAIDiff, setPendingAIDiff] = useState<{
    before: CVData;
    after: CVData;
  } | null>(null);

  // Auto-save state
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    "idle" | "saving" | "saved"
  >("idle");
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { bannerH } = useAnnouncement();

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Helper: Check if a section is completed
  const isSectionCompleted = useCallback(
    (sectionId: string, data: CVData): boolean => {
      switch (sectionId) {
        case "personal":
          return !!data.personal_info.full_name || !!data.personal_info.email;
        case "targeting":
          return !!data.target_role || !!data.industry;
        case "summary":
          return !!data.summary;
        case "skills":
          return data.skills.length > 0;
        case "experience":
          return (
            data.experience.length > 0 &&
            data.experience.some((e) => e.company || e.role)
          );
        case "education":
          return (
            data.education.length > 0 &&
            data.education.some((e) => e.institution || e.degree)
          );
        case "certifications":
          return (
            data.certifications.length > 0 &&
            data.certifications.some((c) => c.name)
          );
        case "projects":
          return data.projects.length > 0 && data.projects.some((p) => p.name);
        case "awards":
          return data.awards.length > 0 && data.awards.some((a) => a.title);
        case "languages":
          return (
            data.languages.length > 0 && data.languages.some((l) => l.language)
          );
        case "volunteer":
          return (
            data.volunteer.length > 0 &&
            data.volunteer.some((v) => v.organization)
          );
        default:
          return false;
      }
    },
    [],
  );

  // Calculate completed sections count
  const completedCount = useMemo(() => {
    return sectionOrder.filter((sid) => isSectionCompleted(sid, cvData)).length;
  }, [sectionOrder, cvData, isSectionCompleted]);

  // Get the first incomplete section
  const firstIncompleteSection = useMemo(() => {
    return sectionOrder.find((sid) => !isSectionCompleted(sid, cvData));
  }, [sectionOrder, cvData, isSectionCompleted]);

  // Map section IDs to their SECTIONS objects
  const sectionsMap = useMemo(() => {
    const map: Record<string, (typeof DEFAULT_SECTIONS)[0]> = {};
    DEFAULT_SECTIONS.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, []);

  // Auto-save function
  const triggerAutoSave = useCallback(async () => {
    if (!id || !isDirty) return;
    setAutoSaveStatus("saving");
    try {
      await cvApi.update(id, {
        title,
        data: cvData,
        is_public: isPublic,
        theme,
        template,
        page_count: pageCount,
      });
      setIsDirty(false);
      setAutoSaveStatus("saved");
      setLastSaved(new Date());
      // Skip query invalidation on auto-save - it causes a refetch that can overwrite
      // the current state and create a confusing UX. Invalidation happens on
      // manual save or page navigation instead.
    } catch {
      setAutoSaveStatus("idle");
    }
  }, [id, isDirty, title, cvData, isPublic, theme, template, pageCount, qc]);

  // Debounced auto-save on data change
  useEffect(() => {
    if (!isDirty || !autoSaveEnabled) return;
    setAutoSaveStatus("idle");
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      triggerAutoSave();
    }, 2000);
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [cvData, title, isDirty, triggerAutoSave, autoSaveEnabled]);

  // Clear auto-save status after delay
  useEffect(() => {
    if (autoSaveStatus === "saved") {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(() => {
        setAutoSaveStatus("idle");
      }, 3000);
      return () => {
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
        }
      };
    }
  }, [autoSaveStatus]);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSectionOrder((items) => {
      const oldIndex = items.indexOf(active.id as string);
      const newIndex = items.indexOf(over.id as string);
      return arrayMove(items, oldIndex, newIndex);
    });
  }, []);

  const { data: cv, isLoading } = useQuery<CV>({
    queryKey: ["cv", id],
    queryFn: () => cvApi.get(id!),
    enabled: !!id,
  });

  // Load CV data and set initial section to first incomplete
  // Effect 1: load data ONLY when cv first arrives from the server
  useEffect(() => {
    if (cv) {
      setCvData(normalizeCVData(cv.data));
      setTitle(cv.title);
      setIsPublic(cv.is_public);
      setTheme(cv.theme);
      setTemplate(cv.template || "standard");
      setPageCount(cv.page_count);
    }
  }, [cv]); // ← cv only, NOT firstIncompleteSection

  // Effect 2: set the initial active section ONCE when the CV id loads
  useEffect(() => {
    if (cv && firstIncompleteSection) {
      setActiveSection(firstIncompleteSection);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cv?.id]); // ← keyed on id so it only fires on first load, not on every edit

  // Clear undo stack when loading a new CV
  useEffect(() => {
    if (id) {
      clearUndo();
    }
  }, [id, clearUndo]);

  const confirmDiscard = useCallback(
    (action: "leave" | "restore", run: () => void) => {
      if (!isDirty) {
        run();
        return;
      }
      setPendingAction({ action, run });
    },
    [isDirty],
  );

  const handleLeaveEditor = () =>
    confirmDiscard("leave", () => navigate("/dashboard"));

  // 8b: wrap history restore with the same unsaved-changes guard
  const handleRestoreFromHistory = (snap: CVData) => {
    confirmDiscard("restore", () => {
      setCvData(snap);
      setIsDirty(true);
      setShowHistory(false);
      toast.success("Version restored — save to keep it");
    });
  };

  const updateData = (patch: Partial<CVData>) => {
    setCvData((prev) => ({ ...prev, ...patch }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await cvApi.update(id, {
        title,
        data: cvData,
        is_public: isPublic,
        theme,
        template,
        page_count: pageCount,
      });
      qc.invalidateQueries({ queryKey: ["cv", id] });
      qc.invalidateQueries({ queryKey: ["cvs"] });
      setIsDirty(false);
      setLastSaved(new Date());
      toast.success("CV saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcuts: Ctrl+Z / Cmd+Z undo, Ctrl+S / Cmd+S save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S = save
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (saving) return;
        handleSave();
      }
      // Ctrl+Z / Cmd+Z = undo
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        const prev = undoTo(cvData);
        if (prev) {
          setCvData(prev);
          setIsDirty(true);
          toast.success("Undone");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cvData, undoTo, saving, handleSave]);

  const handleExport = async () => {
    if (!id) return;
    if (isDirty) {
      toast("Saving first…", { icon: "💾" });
      try {
        await cvApi.update(id, {
          title,
          data: cvData,
          is_public: isPublic,
          theme,
          template,
          page_count: pageCount,
        });
        setIsDirty(false);
      } catch {
        toast.error("Save failed — cannot export");
        return;
      }
    }
    if (exportFormat === "pdf") {
      printCV(id);
    } else {
      setShowExportMenu(false);
      await exportCV(id, exportFormat);
    }
  };

  const activeSectionLabel =
    DEFAULT_SECTIONS.find((s) => s.id === activeSection)?.label ?? "";

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-screen bg-ash">
        <div className="text-ink-muted text-sm animate-pulse">Loading CV…</div>
      </div>
    );

  return (
    <>
      <Breadcrumb />
      <div
        className="flex bg-ash overflow-hidden"
        style={{
          height: "calc(100vh - 56px)",
          marginTop: bannerH + 44,
          transition: "margin-top 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Sidebar */}
        <div className="hidden md:flex w-52 bg-white border-r border-ash-border flex-col flex-shrink-0">
          <div className="px-3 py-3 border-b border-ash-border flex-shrink-0">
            <button
              onClick={handleLeaveEditor}
              className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
            >
              <ChevronLeft size={13} /> Back
            </button>
          </div>

          {/* Progress bar */}
          <div className="px-3 py-2 border-b border-ash-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-ink">Progress</span>
              <span className="text-xs text-ink-muted">
                {completedCount}/{sectionOrder.length}
              </span>
            </div>
            <div className="h-1.5 bg-ash-border rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-emerald-500 rounded-full"
                initial={{ width: 0 }}
                animate={{
                  width: `${(completedCount / sectionOrder.length) * 100}%`,
                }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            {/* Auto-save indicator */}
            <div className="mt-2 text-[10px] flex items-center gap-1">
              {autoSaveStatus === "saving" && (
                <span className="text-amber-600 flex items-center gap-1">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{
                      repeat: Infinity,
                      duration: 1,
                      ease: "linear",
                    }}
                    className="block w-2 h-2 border border-amber-600 border-t-transparent rounded-full"
                  />
                  Saving...
                </span>
              )}
              {autoSaveStatus === "saved" && (
                <span className="text-emerald-600 flex items-center gap-1">
                  <Check size={10} /> Saved
                </span>
              )}
              {autoSaveStatus === "idle" && lastSaved && (
                <span className="text-ink-muted">
                  Saved {formatTimeSince(lastSaved)}
                </span>
              )}
              {autoSaveStatus === "idle" && (
                <button
                  onClick={() => setAutoSaveEnabled((v) => !v)}
                  className="flex items-center gap-1 hover:text-ink transition-colors ml-1"
                  title={
                    autoSaveEnabled ? "Turn off auto-save" : "Turn on auto-save"
                  }
                >
                  {autoSaveEnabled ? (
                    <ToggleRight size={14} className="text-emerald-600" />
                  ) : (
                    <ToggleLeft size={14} className="text-ash-border" />
                  )}
                  Auto
                </button>
              )}
            </div>
          </div>

          {/* Recommended fill order */}
          <div className="px-3 py-2 border-b border-ash-border bg-ash/30">
            <div className="text-[10px] font-medium text-ink-muted uppercase tracking-wide mb-1">
              Suggested Order
            </div>
            <div className="flex items-center gap-1 text-[10px] text-ink-muted">
              {RECOMMENDED_ORDER.slice(0, 3).map((sid, i) => (
                <React.Fragment key={sid}>
                  <span className="truncate">
                    {sectionsMap[sid]?.label || sid}
                  </span>
                  {i < 2 && <ArrowRight size={8} />}
                </React.Fragment>
              ))}
              <span className="text-ink-muted/50">
                +{RECOMMENDED_ORDER.length - 3}
              </span>
            </div>
          </div>

          {/* Draggable sections list */}
          <div className="flex-1 overflow-y-auto py-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sectionOrder}
                strategy={verticalListSortingStrategy}
              >
                {sectionOrder.map((sid, idx) => {
                  const section = sectionsMap[sid];
                  if (!section) return null;
                  const isCompleted = isSectionCompleted(sid, cvData);
                  const recommendedIdx = RECOMMENDED_ORDER.indexOf(sid);
                  return (
                    <SortableSectionItem
                      key={sid}
                      id={sid}
                      label={section.label}
                      icon={section.icon}
                      isActive={activeSection === sid}
                      isCompleted={isCompleted}
                      orderIndex={recommendedIdx >= 0 ? recommendedIdx : idx}
                      onClick={() => setActiveSection(sid)}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          </div>
          <div className="p-3 border-t border-ash-border space-y-1 flex-shrink-0">
            <button
              onClick={() => setShowSkillGap(!showSkillGap)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-[#a0449f] text-white hover:bg-[#8d3f8c] transition-colors"
            >
              <Target size={13} /> Skill Gap
            </button>
            <button
              onClick={() => setShowAI(!showAI)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-ink text-white hover:bg-ink-light transition-colors"
            >
              <Sparkles size={13} /> AI Assist
            </button>
            <button
              onClick={() => setShowPreview(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs border border-ash-border text-ink-muted hover:bg-ash transition-colors"
            >
              <Eye size={13} /> Preview
            </button>
            <button
              onClick={() => setShowATS(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs border border-ash-border text-ink-muted hover:bg-ash transition-colors"
            >
              <Search size={13} /> ATS Preview
            </button>
            <button
              onClick={() => setShowHistory(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs border border-ash-border text-ink-muted hover:bg-ash transition-colors"
            >
              <History size={13} /> History
            </button>
          </div>
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Toolbar */}
          <div className="bg-white border-b border-ash-border px-3 sm:px-5 py-2.5 flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleLeaveEditor}
              className="md:hidden p-1.5 text-ink-muted hover:text-ink flex-shrink-0"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setShowDrawer(true)}
              className="md:hidden flex items-center gap-1.5 text-xs font-medium text-ink truncate flex-1 min-w-0"
            >
              <Menu size={14} className="flex-shrink-0 text-ink-muted" />
              <span className="truncate">{activeSectionLabel}</span>
            </button>
            <div className="hidden md:flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
              <div className="flex-1 min-w-0 overflow-hidden">
                <input
                  ref={titleInputRef}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full font-display font-semibold text-sm text-ink bg-transparent border-none outline-none"
                  placeholder="CV Title"
                />
                <div className="text-[9px] text-ink-muted mt-0.5 flex items-center gap-2 w-full overflow-hidden">
                  <Info size={12} className="text-ink-muted flex-shrink-0" />
                  <div className="relative flex-1 overflow-hidden h-3">
                    <motion.div
                      key={
                        (cvData.personal_info.full_name
                          ? `${cvData.personal_info.full_name} - ${title || "CV"}`
                          : title || "CV") + ".pdf"
                      }
                      className="font-mono whitespace-nowrap absolute left-0 top-0 inline-flex"
                      animate={{ x: ["0%", "-50%"] }}
                      transition={{
                        duration: 10,
                        ease: "linear",
                        repeat: Infinity,
                      }}
                    >
                      <span className="pr-8">
                        {(cvData.personal_info.full_name
                          ? `${cvData.personal_info.full_name} - ${title || "CV"}`
                          : title || "CV") + ".pdf"}
                      </span>
                      <span className="pr-8">
                        {(cvData.personal_info.full_name
                          ? `${cvData.personal_info.full_name} - ${title || "CV"}`
                          : title || "CV") + ".pdf"}
                      </span>
                    </motion.div>
                  </div>
                </div>
              </div>
              <button
                className="btn-ghost p-1.5 flex-shrink-0"
                title="Rename title"
                onClick={() => {
                  const el = document.querySelector(
                    'input[placeholder="CV Title"]',
                  ) as HTMLInputElement | null;
                  el?.focus();
                  el?.select();
                }}
              >
                <PencilLine size={14} />
              </button>
            </div>

            <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
              {/* Desktop-only selects */}
              <select
                value={template}
                onChange={(e) => {
                  setTemplate(e.target.value);
                  setIsDirty(true);
                }}
                className="hidden sm:block text-xs border border-ash-border rounded-lg px-2 py-1.5 bg-ash text-ink-muted focus:outline-none"
                title="Template"
              >
                {CV_TEMPLATE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                value={theme}
                onChange={(e) => {
                  setTheme(e.target.value);
                  setIsDirty(true);
                }}
                className="hidden sm:block text-xs border border-ash-border rounded-lg px-2 py-1.5 bg-ash text-ink-muted focus:outline-none"
              >
                {CV_THEME_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                value={pageCount}
                onChange={(e) => {
                  setPageCount(Number(e.target.value));
                  setIsDirty(true);
                }}
                className="hidden sm:block text-xs border border-ash-border rounded-lg px-2 py-1.5 bg-ash text-ink-muted focus:outline-none"
              >
                <option value={1}>1 Page</option>
                <option value={2}>2 Pages</option>
                <option value={3}>3 Pages</option>
              </select>

              {/* Mobile-only action buttons */}
              <button
                onClick={() => setShowSkillGap(!showSkillGap)}
                className="md:hidden p-1.5 text-[#a0449f] hover:text-[#8d3f8c]"
                title="Skill Gap"
              >
                <Target size={15} />
              </button>
              <button
                onClick={() => setShowAI(!showAI)}
                className="md:hidden p-1.5 text-ink-muted hover:text-ink"
                title="AI Assist"
              >
                <Sparkles size={15} />
              </button>
              <button
                onClick={() => setShowPreview(true)}
                className="md:hidden p-1.5 text-ink-muted hover:text-ink"
                title="Preview"
              >
                <Eye size={15} />
              </button>
              {/* 8a: Mobile settings button */}
              <button
                onClick={() => setShowSettings(true)}
                className="md:hidden p-1.5 text-ink-muted hover:text-ink"
                title="CV Settings"
              >
                <SlidersHorizontal size={15} />
              </button>

              <button
                onClick={() => {
                  setIsPublic(!isPublic);
                  setIsDirty(true);
                }}
                className={`hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  isPublic
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-ash-border text-ink-muted hover:bg-ash"
                }`}
              >
                {isPublic ? <Globe size={12} /> : <Lock size={12} />}
                {isPublic ? "Public" : "Private"}
              </button>
              {/* Export Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={isPrinting}
                  className="p-1.5 sm:flex sm:items-center sm:gap-1 sm:text-xs sm:px-3 sm:py-1.5 sm:rounded-lg sm:border sm:border-ash-border sm:text-ink-muted sm:hover:bg-ash sm:transition-colors text-ink-muted hover:text-ink disabled:opacity-50"
                >
                  <Download size={14} />
                  <span className="hidden sm:inline text-xs">
                    {isPrinting ? "Preparing…" : exportFormat.toUpperCase()}
                  </span>
                  <ChevronDown size={12} className="hidden sm:block" />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-ash-border rounded-lg shadow-lg z-50 py-1 min-w-24">
                    <button
                      onClick={() => {
                        setExportFormat("pdf");
                        setShowExportMenu(false);
                        handleExport();
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-ash flex items-center gap-2"
                    >
                      <FileText size={12} /> PDF
                    </button>
                    <button
                      onClick={() => {
                        setExportFormat("docx");
                        setShowExportMenu(false);
                        handleExport();
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-ash flex items-center gap-2"
                    >
                      <FileText size={12} /> Word
                    </button>
                    <button
                      onClick={() => {
                        setExportFormat("txt");
                        setShowExportMenu(false);
                        handleExport();
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-ash flex items-center gap-2"
                    >
                      <FileText size={12} /> Plain Text
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={handleSave}
                disabled={saving || !isDirty}
                title="Save (Ctrl+S)"
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  isDirty
                    ? "bg-ink text-white hover:bg-ink-light"
                    : "bg-ash text-ink-muted cursor-not-allowed"
                }`}
              >
                <Save size={12} />
                <span className="hidden sm:inline">
                  {saving ? "Saving…" : "Save"}
                </span>
              </button>
            </div>
          </div>

          {/* Section content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="max-w-2xl mx-auto">
              {activeSection === "personal" && (
                <PersonalInfoSection
                  data={cvData.personal_info}
                  onChange={(v) => updateData({ personal_info: v })}
                />
              )}
              {activeSection === "targeting" && (
                <CVContextSelector
                  careerLevel={cvData.career_level}
                  industry={cvData.industry}
                  targetRole={cvData.target_role}
                  onChange={(v) => updateData(v)}
                  mode="edit"
                />
              )}
              {activeSection === "summary" && (
                <SummarySection
                  value={cvData.summary}
                  jobDesc={cvData.job_description}
                  onChange={(v) => updateData({ summary: v })}
                  onJobDescChange={(v) => updateData({ job_description: v })}
                  cvData={cvData}
                />
              )}
              {activeSection === "skills" && (
                <SkillsSection
                  skills={cvData.skills}
                  onChange={(v) => updateData({ skills: v })}
                />
              )}
              {activeSection === "experience" && (
                <ExperienceSection
                  items={cvData.experience}
                  onChange={(v) => updateData({ experience: v })}
                  cvData={cvData}
                  onApplyCvData={(next) => updateData(next)}
                />
              )}
              {activeSection === "education" && (
                <EducationSection
                  items={cvData.education}
                  onChange={(v) => updateData({ education: v })}
                />
              )}
              {activeSection === "certifications" && (
                <CertificationsSection
                  items={cvData.certifications}
                  onChange={(v) => updateData({ certifications: v })}
                />
              )}
              {activeSection === "projects" && (
                <ProjectsSection
                  items={cvData.projects}
                  onChange={(v) => updateData({ projects: v })}
                />
              )}
              {activeSection === "awards" && (
                <AwardsSection
                  items={cvData.awards}
                  onChange={(v) => updateData({ awards: v })}
                />
              )}
              {activeSection === "languages" && (
                <LanguagesSection
                  items={cvData.languages}
                  onChange={(v) => updateData({ languages: v })}
                />
              )}
              {activeSection === "volunteer" && (
                <VolunteerSection
                  items={cvData.volunteer}
                  onChange={(v) => updateData({ volunteer: v })}
                />
              )}
            </div>
          </div>
        </div>

        {/* Desktop AI panel */}
        {showAI && (
          <div className="hidden md:block">
            <AIAssistPanel
              cvData={cvData}
              onApply={(d) => {
                pushUndo(cvData);
                setPendingAIDiff({ before: cvData, after: d });
              }}
              onClose={() => setShowAI(false)}
              cvId={id!}
            />
          </div>
        )}
        {/* Mobile AI panel */}
        {showAI && (
          <div className="md:hidden fixed inset-0 z-50 bg-white flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-ash-border">
              <span className="font-semibold text-sm text-ink">AI Assist</span>
              <button onClick={() => setShowAI(false)}>
                <X size={16} className="text-ink-muted" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <AIAssistPanel
                cvData={cvData}
                onApply={(d) => {
                  pushUndo(cvData);
                  setPendingAIDiff({ before: cvData, after: d });
                  setShowAI(false);
                }}
                onClose={() => setShowAI(false)}
                cvId={id!}
              />
            </div>
          </div>
        )}

        {/* Desktop Skill Gap panel */}
        {showSkillGap && (
          <div className="hidden md:block">
            <SkillGapEngine
              cvData={cvData}
              onClose={() => setShowSkillGap(false)}
              cvId={id!}
            />
          </div>
        )}
        {/* Mobile Skill Gap panel */}
        {showSkillGap && (
          <div className="md:hidden fixed inset-0 z-50 bg-white flex flex-col">
            <div className="flex-1 overflow-hidden">
              <SkillGapEngine
                cvData={cvData}
                onClose={() => setShowSkillGap(false)}
                cvId={id!}
              />
            </div>
          </div>
        )}

        <AnimatePresence>
          {showDrawer && (
            <SectionDrawer
              activeSection={activeSection}
              onSelect={setActiveSection}
              onClose={() => setShowDrawer(false)}
            />
          )}
        </AnimatePresence>

        {/* 8a: Mobile settings sheet */}
        <AnimatePresence>
          {showSettings && (
            <MobileSettingsSheet
              theme={theme}
              template={template}
              pageCount={pageCount}
              isPublic={isPublic}
              onThemeChange={(v) => {
                setTheme(v);
                setIsDirty(true);
              }}
              onTemplateChange={(v) => {
                setTemplate(v);
                setIsDirty(true);
              }}
              onPageCountChange={(v) => {
                setPageCount(v);
                setIsDirty(true);
              }}
              onPublicChange={(v) => {
                setIsPublic(v);
                setIsDirty(true);
              }}
              onClose={() => setShowSettings(false)}
            />
          )}
        </AnimatePresence>

        {showPreview && (
          <CVPreview
            cvData={cvData}
            theme={theme}
            template={template}
            onClose={() => setShowPreview(false)}
          />
        )}

        {/* ATS Preview Modal */}
        {showATS && (
          <ATSPreviewModal cvData={cvData} onClose={() => setShowATS(false)} />
        )}

        {/* AI Edit Diff Preview Modal */}
        <AnimatePresence>
          {pendingAIDiff && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
              onClick={() => {
                setCvData(pendingAIDiff.before);
                setPendingAIDiff(null);
                toast("AI edits discarded");
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-5 py-4 border-b border-ash-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-axiom" />
                    <span className="font-semibold text-ink">
                      AI Edit Preview
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setCvData(pendingAIDiff.before);
                      setPendingAIDiff(null);
                      toast("AI edits discarded");
                    }}
                    className="text-ink-muted hover:text-ink"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="p-5 overflow-y-auto max-h-[60vh]">
                  <DiffViewer
                    before={pendingAIDiff.before}
                    after={pendingAIDiff.after}
                  />
                </div>
                <div className="px-5 py-4 border-t border-ash-border flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setCvData(pendingAIDiff.before);
                      setPendingAIDiff(null);
                      toast("AI edits undone");
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-ink-muted hover:text-ink transition-colors"
                  >
                    <XCircle size={16} /> Undo
                  </button>
                  <button
                    onClick={() => {
                      setCvData(pendingAIDiff.after);
                      setPendingAIDiff(null);
                      setIsDirty(true);
                      toast.success("AI edits applied");
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-axiom text-white rounded-lg hover:bg-axiom-dark transition-colors"
                  >
                    <CheckCircle size={16} /> Accept
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {showHistory && id && (
          <HistoryDrawer
            cvId={id}
            currentData={cvData}
            onRestore={handleRestoreFromHistory} // 8b: guarded restore
            onClose={() => setShowHistory(false)}
          />
        )}

        {/* 8b: Extended confirm dialog covers leave / restore */}
        <ConfirmDialog
          open={!!pendingAction}
          title="Discard unsaved changes?"
          description={
            pendingAction?.action === "restore"
              ? "You have unsaved edits. Restoring a version will overwrite them. Save first if you want to keep your current changes."
              : "You have unsaved edits. Leave the editor now and your current changes will be lost unless you save first."
          }
          confirmLabel={
            pendingAction?.action === "restore"
              ? "Discard and restore"
              : "Discard and leave"
          }
          variant="danger"
          onClose={() => setPendingAction(null)}
          onConfirm={() => {
            pendingAction?.run();
            setPendingAction(null);
          }}
        />
      </div>
    </>
  );
}
