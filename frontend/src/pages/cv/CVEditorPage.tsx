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
  CheckCircle,
  XCircle,
  Search,
  FileText,
  ChevronDown,
  Star,
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

  return (
    <button
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
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
    </button>
  );
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
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm text-left transition-colors ${activeSection === id ? "bg-ink text-white font-medium" : "text-ink-muted hover:bg-ash hover:text-ink"}`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </motion.div>
    </>
  );
}

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
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl md:hidden flex flex-col max-h-[85vh]"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-ash-border flex-shrink-0">
          <p className="font-semibold text-sm text-ink">CV Settings</p>
          <button onClick={onClose}>
            <X size={16} className="text-ink-muted" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-5 overflow-y-auto flex-1">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink-muted uppercase tracking-wide">
              Template
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CV_TEMPLATE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => onTemplateChange(o.value)}
                  className={`px-3 py-2.5 rounded-lg text-sm border transition-colors text-left ${template === o.value ? "border-ink bg-ink text-white font-medium" : "border-ash-border text-ink-muted hover:bg-ash hover:text-ink"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink-muted uppercase tracking-wide">
              Theme
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CV_THEME_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => onThemeChange(o.value)}
                  className={`px-3 py-2.5 rounded-lg text-sm border transition-colors text-left ${theme === o.value ? "border-ink bg-ink text-white font-medium" : "border-ash-border text-ink-muted hover:bg-ash hover:text-ink"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink-muted uppercase tracking-wide">
              Page Count
            </label>
            <div className="flex gap-2">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => onPageCountChange(n)}
                  className={`flex-1 py-2.5 rounded-lg text-sm border transition-colors font-medium ${pageCount === n ? "border-ink bg-ink text-white" : "border-ash-border text-ink-muted hover:bg-ash hover:text-ink"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink-muted uppercase tracking-wide">
              Visibility
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => onPublicChange(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm border transition-colors ${!isPublic ? "border-ink bg-ink text-white font-medium" : "border-ash-border text-ink-muted hover:bg-ash hover:text-ink"}`}
              >
                <Lock size={13} /> Private
              </button>
              <button
                onClick={() => onPublicChange(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm border transition-colors ${isPublic ? "border-emerald-300 bg-emerald-50 text-emerald-700 font-medium" : "border-ash-border text-ink-muted hover:bg-ash hover:text-ink"}`}
              >
                <Globe size={13} /> Public
              </button>
            </div>
          </div>
          <div className="pb-6" />
        </div>
      </motion.div>
    </>
  );
}

function MobileSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
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
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl md:hidden flex flex-col max-h-[90vh]"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-ash-border flex-shrink-0">
          <span className="font-semibold text-sm text-ink">{title}</span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-ash transition-colors"
          >
            <X size={18} className="text-ink-muted" />
          </button>
        </div>
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {children}
        </div>
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
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingAction, setPendingAction] = useState<null | {
    action: "leave" | "restore";
    run: () => void;
  }>(null);

  const { push: pushUndo, undoTo, clear: clearUndo } = useCVUndoStore();
  const [pendingAIDiff, setPendingAIDiff] = useState<{
    before: CVData;
    after: CVData;
  } | null>(null);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistedDataRef = useRef<{
    cvData: CVData;
    title: string;
    isPublic: boolean;
    theme: string;
    template: string;
    pageCount: number;
  } | null>(null);
  const hasSetInitialSection = useRef(false);

  const cvDataRef = useRef(cvData);
  const titleRef = useRef(title);
  const isPublicRef = useRef(isPublic);
  const themeRef = useRef(theme);
  const templateRef = useRef(template);
  const pageCountRef = useRef(pageCount);

  useEffect(() => {
    cvDataRef.current = cvData;
  }, [cvData]);
  useEffect(() => {
    titleRef.current = title;
  }, [title]);
  useEffect(() => {
    isPublicRef.current = isPublic;
  }, [isPublic]);
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);
  useEffect(() => {
    templateRef.current = template;
  }, [template]);
  useEffect(() => {
    pageCountRef.current = pageCount;
  }, [pageCount]);

  const { bannerH } = useAnnouncement();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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

  const firstIncompleteSection = useMemo(
    () => sectionOrder.find((sid) => !isSectionCompleted(sid, cvData)),
    [sectionOrder, cvData, isSectionCompleted],
  );

  const sectionsMap = useMemo(() => {
    const map: Record<string, (typeof DEFAULT_SECTIONS)[0]> = {};
    DEFAULT_SECTIONS.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, []);

  const triggerAutoSave = useCallback(async () => {
    if (!id) return;
    const latestCvData = cvDataRef.current;
    const latestTitle = titleRef.current;
    const latestIsPublic = isPublicRef.current;
    const latestTheme = themeRef.current;
    const latestTemplate = templateRef.current;
    const latestPageCount = pageCountRef.current;
    const persisted = persistedDataRef.current;
    if (
      persisted &&
      JSON.stringify(latestCvData) === JSON.stringify(persisted.cvData) &&
      latestTitle === persisted.title &&
      latestIsPublic === persisted.isPublic &&
      latestTheme === persisted.theme &&
      latestTemplate === persisted.template &&
      latestPageCount === persisted.pageCount
    ) {
      setIsDirty(false);
      return;
    }
    try {
      await cvApi.update(id, {
        title: latestTitle,
        data: latestCvData,
        is_public: latestIsPublic,
        theme: latestTheme,
        template: latestTemplate,
        page_count: latestPageCount,
      });
      persistedDataRef.current = {
        cvData: latestCvData,
        title: latestTitle,
        isPublic: latestIsPublic,
        theme: latestTheme,
        template: latestTemplate,
        pageCount: latestPageCount,
      };
      qc.invalidateQueries({ queryKey: ["cvs"] });
      setIsDirty(false);
    } catch {
      // silent fail
    }
  }, [id, qc]);

  useEffect(() => {
    if (!isDirty) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      triggerAutoSave();
    }, 2000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [cvData, title, isDirty, triggerAutoSave]);

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

  useEffect(() => {
    if (cv) {
      const normalized = normalizeCVData(cv.data);
      setCvData(normalized);
      setTitle(cv.title);
      setIsPublic(cv.is_public);
      setTheme(cv.theme);
      setTemplate(cv.template || "standard");
      setPageCount(cv.page_count);
      persistedDataRef.current = {
        cvData: normalized,
        title: cv.title,
        isPublic: cv.is_public,
        theme: cv.theme,
        template: cv.template || "standard",
        pageCount: cv.page_count,
      };
    }
  }, [cv]);

  useEffect(() => {
    if (cv && firstIncompleteSection && !hasSetInitialSection.current) {
      hasSetInitialSection.current = true;
      setActiveSection(firstIncompleteSection);
    }
  }, [cv, firstIncompleteSection]);

  useEffect(() => {
    if (id) clearUndo();
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [cvData, undoTo]);

  const handleExport = async (format: "pdf" | "docx" | "txt") => {
    if (!id) return;
    setShowExportMenu(false);
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
    if (format === "pdf") {
      printCV(id);
    } else {
      await exportCV(id, format);
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
        {/* ── Desktop Sidebar ── */}
        <div className="hidden md:flex w-52 bg-white border-r border-ash-border flex-col flex-shrink-0">
          <div className="px-3 py-3 border-b border-ash-border flex-shrink-0">
            <button
              onClick={handleLeaveEditor}
              className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
            >
              <ChevronLeft size={13} /> Back
            </button>
          </div>
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
                  return (
                    <SortableSectionItem
                      key={sid}
                      id={sid}
                      label={section.label}
                      icon={section.icon}
                      isActive={activeSection === sid}
                      isCompleted={isSectionCompleted(sid, cvData)}
                      orderIndex={idx}
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

        {/* ── Main area ── */}
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
                      {[0, 1].map((i) => (
                        <span key={i} className="pr-8">
                          {(cvData.personal_info.full_name
                            ? `${cvData.personal_info.full_name} - ${title || "CV"}`
                            : title || "CV") + ".pdf"}
                        </span>
                      ))}
                    </motion.div>
                  </div>
                </div>
              </div>
              <button
                className="btn-ghost p-1.5 flex-shrink-0"
                title="Rename title"
                onClick={() => {
                  titleInputRef.current?.focus();
                  titleInputRef.current?.select();
                }}
              >
                <PencilLine size={14} />
              </button>
            </div>
            <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
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
              <button
                onClick={() => setShowATS(true)}
                className="md:hidden p-1.5 text-ink-muted hover:text-ink"
                title="ATS Preview"
              >
                <Search size={15} />
              </button>
              <button
                onClick={() => setShowHistory(true)}
                className="md:hidden p-1.5 text-ink-muted hover:text-ink"
                title="History"
              >
                <History size={15} />
              </button>
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
                className={`hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${isPublic ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-ash-border text-ink-muted hover:bg-ash"}`}
              >
                {isPublic ? <Globe size={12} /> : <Lock size={12} />}
                {isPublic ? "Public" : "Private"}
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu((v) => !v)}
                  disabled={isPrinting}
                  className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border border-ash-border text-ink-muted hover:bg-ash transition-colors disabled:opacity-50"
                >
                  <Download size={14} />
                  <span className="hidden sm:inline">
                    {isPrinting ? "Preparing…" : exportFormat.toUpperCase()}
                  </span>
                  <ChevronDown size={12} className="hidden sm:block" />
                </button>
                <AnimatePresence>
                  {showExportMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowExportMenu(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-0 top-full mt-1 bg-white border border-ash-border rounded-lg shadow-lg z-50 py-1 min-w-[7rem]"
                      >
                        {(["pdf", "docx", "txt"] as const).map((fmt) => (
                          <button
                            key={fmt}
                            onClick={() => {
                              setExportFormat(fmt);
                              handleExport(fmt);
                            }}
                            className="w-full px-3 py-2 text-left text-xs hover:bg-ash flex items-center gap-2 text-ink"
                          >
                            <FileText size={12} />
                            {fmt === "pdf"
                              ? "PDF"
                              : fmt === "docx"
                                ? "Word"
                                : "Plain Text"}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
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

        {/* ── Desktop-only side panels (AI + SkillGap are sidebars, not modals) ── */}
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
        {showSkillGap && (
          <div className="hidden md:block">
            <SkillGapEngine
              cvData={cvData}
              onClose={() => setShowSkillGap(false)}
              cvId={id!}
            />
          </div>
        )}

        {/*
          ATSPreviewModal and HistoryDrawer are self-contained modal components —
          they render their own fixed overlay internally. Render each once,
          unconditionally, and let them handle both desktop and mobile layout.
        */}
        {showATS && (
          <ATSPreviewModal cvData={cvData} onClose={() => setShowATS(false)} />
        )}
        {showHistory && id && (
          <HistoryDrawer
            cvId={id}
            currentData={cvData}
            onRestore={handleRestoreFromHistory}
            onClose={() => setShowHistory(false)}
          />
        )}

        {/* ── Mobile sheets for sidebar panels ── */}
        <AnimatePresence>
          {showAI && (
            <MobileSheet title="AI Assist" onClose={() => setShowAI(false)}>
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
            </MobileSheet>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSkillGap && (
            <MobileSheet
              title="Skill Gap"
              onClose={() => setShowSkillGap(false)}
            >
              <SkillGapEngine
                cvData={cvData}
                onClose={() => setShowSkillGap(false)}
                cvId={id!}
              />
            </MobileSheet>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showDrawer && (
            <SectionDrawer
              activeSection={activeSection}
              onSelect={setActiveSection}
              onClose={() => setShowDrawer(false)}
            />
          )}
        </AnimatePresence>

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

        <AnimatePresence>
          {pendingAIDiff && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
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
                className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-5 py-4 border-b border-ash-border flex items-center justify-between flex-shrink-0">
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
                <div className="p-5 overflow-y-auto flex-1">
                  <DiffViewer
                    before={pendingAIDiff.before}
                    after={pendingAIDiff.after}
                  />
                </div>
                <div className="px-5 py-4 border-t border-ash-border flex gap-3 justify-end flex-shrink-0">
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
