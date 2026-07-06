import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";

function useIsMobile() {
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", handler);
    setMobile(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return mobile;
}
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
import { exportApi } from "../../api";
import { DownloadAnalytics } from "../../types";
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
  EyeOff,
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
  RotateCcw,
  RotateCw,
  Save,
  Cloud,
  CloudOff,
  MessageSquare,
  Lightbulb,
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
import CommentsPanel from "../../components/cv/CommentsPanel";
import SectionSuggestionsPanel from "../../components/cv/SectionSuggestionsPanel";
import ToneAdjuster from "../../components/cv/ToneAdjuster";
import ConfirmDialog from "../../components/UI/ConfirmDialog";
import Breadcrumb from "../../components/Breadcrumb";
import { useCVUndoStore } from "../../store/cvUndo";
import { useAuthStore } from "../../store/auth";
import { useCVEditorTour } from "../../hooks/useCVEditorTour";

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
  isCompleted,
}: {
  activeSection: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  isCompleted: (id: string) => boolean;
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
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-ink">Sections</p>
            <span className="text-[10px] text-ink-muted">
              {DEFAULT_SECTIONS.filter((s) => isCompleted(s.id)).length}/{DEFAULT_SECTIONS.length} done
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-ash">
            <X size={16} className="text-ink-muted" />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[60vh] py-2">
          {DEFAULT_SECTIONS.map(({ id, label, icon: Icon }) => {
            const completed = isCompleted(id);
            return (
              <button
                key={id}
                onClick={() => {
                  onSelect(id);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-5 py-3 text-sm text-left transition-colors ${activeSection === id ? "bg-ink text-white font-medium" : "text-ink-muted hover:bg-ash hover:text-ink"}`}
              >
                <Icon size={15} className="flex-shrink-0" />
                <span className="flex-1 truncate">{label}</span>
                {completed && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Done</span>
                )}
              </button>
            );
          })}
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
  showName,
  showEmail,
  showPhone,
  showExperience,
  onThemeChange,
  onTemplateChange,
  onPageCountChange,
  onPublicChange,
  onShowNameChange,
  onShowEmailChange,
  onShowPhoneChange,
  onShowExperienceChange,
  onClose,
}: {
  theme: string;
  template: string;
  pageCount: number;
  isPublic: boolean;
  showName: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showExperience: boolean;
  onThemeChange: (v: string) => void;
  onTemplateChange: (v: string) => void;
  onPageCountChange: (v: number) => void;
  onPublicChange: (v: boolean) => void;
  onShowNameChange: (v: boolean) => void;
  onShowEmailChange: (v: boolean) => void;
  onShowPhoneChange: (v: boolean) => void;
  onShowExperienceChange: (v: boolean) => void;
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

          {/* Privacy toggles — only shown when public */}
          {isPublic && (
            <div className="space-y-3">
              <label className="text-xs font-medium text-ink-muted uppercase tracking-wide">
                Privacy
              </label>
              <p className="text-[10px] text-ink-muted -mt-1.5 leading-relaxed">
                Control what appears on your public CV.
              </p>
              <div className="space-y-2">
                {[
                  { label: 'Show name', key: 'name', value: showName, onChange: onShowNameChange },
                  { label: 'Show email', key: 'email', value: showEmail, onChange: onShowEmailChange },
                  { label: 'Show phone', key: 'phone', value: showPhone, onChange: onShowPhoneChange },
                  { label: 'Show experience', key: 'exp', value: showExperience, onChange: onShowExperienceChange },
                ].map(({ label, value, onChange }) => (
                  <button
                    key={label}
                    onClick={() => onChange(!value)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs border transition-colors ${
                      value
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-ash-border text-ink-muted hover:bg-ash'
                    }`}
                  >
                    <span>{label}</span>
                    <span className={`text-[10px] font-medium ${value ? 'text-emerald-600' : 'text-ink-muted'}`}>
                      {value ? 'Visible' : 'Hidden'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

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
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl md:hidden flex flex-col max-h-[55vh]"
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

function MobileSheetContent({ title, onClose, children }: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();
  if (!isMobile) return null;
  return <MobileSheet title={title} onClose={onClose}>{children}</MobileSheet>;
}
import Seo from "../../components/Seo";

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
  const [downloadStats, setDownloadStats] = useState<DownloadAnalytics | null>(null);
  const [showDownloadStats, setShowDownloadStats] = useState(false);
  const openSkillGap = searchParams.get("skill_gap") === "true";

  const [sectionOrder, setSectionOrder] = useState<string[]>(() =>
    DEFAULT_SECTIONS.map((s) => s.id),
  );
  const [activeSection, setActiveSection] = useState("personal");
  const [cvData, setCvData] = useState<CVData>(EMPTY_CV_DATA);
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [showName, setShowName] = useState(true);
  const [showEmail, setShowEmail] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [showExperience, setShowExperience] = useState(true);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [theme, setTheme] = useState("minimal");
  const [template, setTemplate] = useState("standard");
  const [pageCount, setPageCount] = useState(1);
  const [showAI, setShowAI] = useState(false);
  const [showSkillGap, setShowSkillGap] = useState(openSkillGap);
  const [showComments, setShowComments] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
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

  const currentUser = useAuthStore((s) => s.user);
  const currentUserId = currentUser?.id || "";
  const currentUsername = currentUser?.username || "";

  const { push: pushUndo, undoTo, redoTo, clear: clearUndo, stackSize, redoStackSize } = useCVUndoStore();
  const [pendingAIDiff, setPendingAIDiff] = useState<{
    before: CVData;
    after: CVData;
  } | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "dirty">("saved");
  const maxRetries = 3;
  const isMobile = useIsMobile();

  // ── CV Editor Tour (Driver.js) ──
  const [showTour, setShowTour] = useState(searchParams.get("tour") === "true");
  useCVEditorTour({ enabled: showTour, onFinish: () => setShowTour(false) });

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistedDataRef = useRef<{
    cvData: CVData;
    title: string;
    isPublic: boolean;
    showName: boolean;
    showEmail: boolean;
    showPhone: boolean;
    showExperience: boolean;
    theme: string;
    template: string;
    pageCount: number;
  } | null>(null);
  const hasSetInitialSection = useRef(false);

  const cvDataRef = useRef(cvData);
  const titleRef = useRef(title);
  const isPublicRef = useRef(isPublic);
  const showNameRef = useRef(showName);
  const showEmailRef = useRef(showEmail);
  const showPhoneRef = useRef(showPhone);
  const showExperienceRef = useRef(showExperience);
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
  useEffect(() => { showNameRef.current = showName; }, [showName]);
  useEffect(() => { showEmailRef.current = showEmail; }, [showEmail]);
  useEffect(() => { showPhoneRef.current = showPhone; }, [showPhone]);
  useEffect(() => { showExperienceRef.current = showExperience; }, [showExperience]);
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

  const triggerAutoSaveWithRetry = useCallback(async (attempt = 0): Promise<void> => {
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
      setSaveStatus("saved");
      return;
    }
    setSaveStatus("saving");
    try {
      await cvApi.update(id, {
        title: latestTitle,
        data: latestCvData,
        is_public: latestIsPublic,
        show_name: showNameRef.current,
        show_email: showEmailRef.current,
        show_phone: showPhoneRef.current,
        show_experience: showExperienceRef.current,
        theme: latestTheme,
        template: latestTemplate,
        page_count: latestPageCount,
      });
      persistedDataRef.current = {
        cvData: latestCvData,
        title: latestTitle,
        isPublic: latestIsPublic,
        showName: showNameRef.current,
        showEmail: showEmailRef.current,
        showPhone: showPhoneRef.current,
        showExperience: showExperienceRef.current,
        theme: latestTheme,
        template: latestTemplate,
        pageCount: latestPageCount,
      };
      qc.invalidateQueries({ queryKey: ["cvs"] });
      setIsDirty(false);
      setSaveStatus("saved");
      // retry succeeded
    } catch {
      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
        setSaveStatus("dirty");
        await new Promise((resolve) => setTimeout(resolve, delay));
        return triggerAutoSaveWithRetry(attempt + 1);
      }
      setSaveStatus("dirty");
    }
  }, [id, qc]);

  useEffect(() => {
    if (!isDirty) {
      setSaveStatus("saved");
      return;
    }
    setSaveStatus("dirty");
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      triggerAutoSaveWithRetry();
    }, 3000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [cvData, title, isDirty, triggerAutoSaveWithRetry]);

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
      setShowName(cv.show_name ?? true);
      setShowEmail(cv.show_email ?? false);
      setShowPhone(cv.show_phone ?? false);
      setShowExperience(cv.show_experience ?? true);
      setTheme(cv.theme);
      setTemplate(cv.template || "standard");
      setPageCount(cv.page_count);
      persistedDataRef.current = {
        cvData: normalized,
        title: cv.title,
        isPublic: cv.is_public,
        showName: cv.show_name ?? true,
        showEmail: cv.show_email ?? false,
        showPhone: cv.show_phone ?? false,
        showExperience: cv.show_experience ?? true,
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
      // Deep-compare with persisted data — skip dialog if nothing actually changed
      const persisted = persistedDataRef.current;
      if (
        persisted &&
        JSON.stringify(cvDataRef.current) === JSON.stringify(persisted.cvData) &&
        titleRef.current === persisted.title &&
        isPublicRef.current === persisted.isPublic &&
        themeRef.current === persisted.theme &&
        templateRef.current === persisted.template &&
        pageCountRef.current === persisted.pageCount
      ) {
        setIsDirty(false);
        setSaveStatus("saved");
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

  const handleUndo = useCallback(() => {
    const prev = undoTo(cvData);
    if (prev) {
      setCvData(prev);
      setIsDirty(true);
    }
  }, [cvData, undoTo]);

  const handleRedo = useCallback(() => {
    const next = redoTo(cvData);
    if (next) {
      setCvData(next);
      setIsDirty(true);
    }
  }, [cvData, redoTo]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Push undo snapshots on meaningful changes (skip initial load)
  const prevCvDataRef = useRef(cvData);
  const hasLoadedRef = useRef(false);
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      prevCvDataRef.current = cvData;
      return;
    }
    if (cvData !== prevCvDataRef.current) {
      pushUndo(prevCvDataRef.current);
      prevCvDataRef.current = cvData;
    }
  }, [cvData, pushUndo]);

  const handleApplySuggestion = useCallback((section: string, fieldPath: string, value: string) => {
    switch (section) {
      case "summary":
        updateData({ summary: value });
        toast.success("Summary updated");
        break;
      case "personal":
        if (fieldPath && fieldPath.startsWith("personal_info.")) {
          const field = fieldPath.replace("personal_info.", "");
          setCvData(prev => ({ ...prev, personal_info: { ...prev.personal_info, [field as keyof typeof prev.personal_info]: value } }));
          setIsDirty(true);
          toast.success("Personal info updated");
        }
        break;
      case "targeting": {
        if (fieldPath === "target_role") { updateData({ target_role: value }); toast.success("Target role updated"); }
        else if (fieldPath === "industry") { updateData({ industry: value }); toast.success("Industry updated"); }
        break;
      }
      case "experience":
      case "education":
      case "certifications":
      case "projects":
      case "awards":
      case "languages":
      case "volunteer":
        // Array sections — can't apply directly without an item index
        toast("Open this section to apply the suggestion", { icon: "📝" });
        setActiveSection(section);
        break;
      default:
        toast("Open this section to apply the suggestion", { icon: "📝" });
        setActiveSection(section);
    }
  }, [updateData]);

  const handleExport = async (format: "pdf" | "docx" | "txt", usePDFA = false) => {
    if (!id) return;
    setShowExportMenu(false);
    if (isDirty) {
      toast("Saving first…", { icon: "💾" });
      try {
        await cvApi.update(id, {
          title,
          data: cvData,
          is_public: isPublic,
          show_name: showName,
          show_email: showEmail,
          show_phone: showPhone,
          show_experience: showExperience,
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
      if (usePDFA) {
        const tid = toast.loading("Generating PDF/A…");
        try {
          const blob = await exportApi.downloadPDFA(id);
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${cvData.personal_info.full_name || title || "CV"}-pdfa.pdf`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success("PDF/A downloaded", { id: tid });
        } catch {
          toast.error("Could not generate PDF/A", { id: tid });
        }
      } else {
        printCV(id);
      }
    } else {
      await exportCV(id, format);
    }
  };

  const fetchDownloadStats = useCallback(async () => {
    if (!id) return;
    try {
      const stats = await exportApi.downloadAnalytics(id);
      setDownloadStats(stats);
    } catch {
      // Silently fail — analytics are non-critical
    }
  }, [id]);

  useEffect(() => {
    fetchDownloadStats();
  }, [fetchDownloadStats]);

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
      <Seo title={title || "CV Editor"} noindex />
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
        <div data-tour="sidebar" className="hidden md:flex w-52 bg-white border-r border-ash-border flex-col flex-shrink-0">
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
              data-tour="skill-gap"
              onClick={() => setShowSkillGap(!showSkillGap)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-[#a0449f] text-white hover:bg-[#8d3f8c] transition-colors"
            >
              <Target size={13} /> Skill Gap
            </button>
            <button
              data-tour="ai-assist"
              onClick={() => setShowAI(!showAI)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-ink text-white hover:bg-ink-light transition-colors"
            >
              <Sparkles size={13} /> AI Assist
            </button>
            <button
              data-tour="preview"
              onClick={() => setShowPreview(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs border border-ash-border text-ink-muted hover:bg-ash transition-colors"
            >
              <Eye size={13} /> Preview
            </button>
            <button
              data-tour="ats"
              onClick={() => setShowATS(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs border border-ash-border text-ink-muted hover:bg-ash transition-colors"
            >
              <Search size={13} /> ATS Preview
            </button>
            <button
              data-tour="comments"
              onClick={() => setShowComments(!showComments)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs border border-ash-border text-ink-muted hover:bg-ash transition-colors"
            >
              <MessageSquare size={13} /> Comments
            </button>
            <button
              data-tour="suggestions"
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs border border-ash-border text-ink-muted hover:bg-ash transition-colors"
            >
              <Lightbulb size={13} /> Suggestions
            </button>
            <button
              data-tour="review-tools"
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
          <div data-tour="title" className="bg-white border-b border-ash-border px-3 sm:px-5 py-2.5 flex items-center gap-2 flex-shrink-0">
            {/* Save status indicator */}
            <div data-tour="save" className="hidden md:flex items-center gap-1.5 mr-1">
              {saveStatus === "saving" && (
                <div className="flex items-center gap-1 text-[10px] text-ink-muted">
                  <Save size={12} className="animate-pulse text-amber-500" />
                  Saving…
                </div>
              )}
              {saveStatus === "saved" && (
                <div className="flex items-center gap-1 text-[10px] text-emerald-600">
                  <Cloud size={12} />
                  Saved
                </div>
              )}
              {saveStatus === "dirty" && (
                <div className="flex items-center gap-1 text-[10px] text-amber-600">
                  <CloudOff size={12} />
                  Unsaved
                </div>
              )}
            </div>
            {/* Undo / Redo */}
            <div className="hidden md:flex items-center gap-0.5 mr-2">
              <button
                onClick={handleUndo}
                disabled={stackSize() === 0}
                className="p-1.5 text-ink-muted hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded"
                title="Undo (Ctrl+Z)"
              >
                <RotateCcw size={13} />
              </button>
              <button
                onClick={handleRedo}
                disabled={redoStackSize() === 0}
                className="p-1.5 text-ink-muted hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded"
                title="Redo (Ctrl+Shift+Z)"
              >
                <RotateCw size={13} />
              </button>
            </div>
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
                data-tour="ats"
                onClick={() => setShowATS(true)}
                className="md:hidden p-1.5 text-ink-muted hover:text-ink"
                title="ATS Preview"
              >
                <Search size={15} />
              </button>
              <button
                data-tour="review-tools"
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
              <div data-tour="export" className="flex items-center gap-1.5">
              <div className="hidden sm:flex items-center gap-1">
                <button
                  onClick={() => {
                    setIsPublic(!isPublic);
                    setIsDirty(true);
                  }}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${isPublic ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-ash-border text-ink-muted hover:bg-ash"}`}
                >
                  {isPublic ? <Globe size={12} /> : <Lock size={12} />}
                  {isPublic ? "Public" : "Private"}
                </button>
                {/* Privacy gear — only shown when public */}
                {isPublic && (
                  <div className="relative">
                    <button
                      onClick={() => setShowPrivacy(!showPrivacy)}
                      className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-ash transition-colors"
                      title="Privacy settings"
                    >
                      <EyeOff size={13} />
                    </button>
                    <AnimatePresence>
                      {showPrivacy && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowPrivacy(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.12 }}
                            className="absolute right-0 top-full mt-1 bg-white border border-ash-border rounded-lg shadow-lg z-50 py-2 min-w-[13rem]"
                          >
                            <div className="px-3 pb-1.5">
                              <p className="text-[10px] font-medium text-ink-muted uppercase tracking-wide">Privacy</p>
                              <p className="text-[9px] text-ink-muted">Choose what to show on your public CV.</p>
                            </div>
                            <div className="space-y-0.5 px-1">
                              {[
                                { label: 'Show name', value: showName, onChange: setShowName },
                                { label: 'Show email', value: showEmail, onChange: setShowEmail },
                                { label: 'Show phone', value: showPhone, onChange: setShowPhone },
                                { label: 'Show experience', value: showExperience, onChange: setShowExperience },
                              ].map(({ label, value, onChange }) => (
                                <button
                                  key={label}
                                  onClick={() => { onChange(!value); setIsDirty(true); }}
                                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs hover:bg-ash transition-colors"
                                >
                                  <span className="text-ink">{label}</span>
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                    value ? 'bg-emerald-100 text-emerald-700' : 'bg-ash text-ink-muted'
                                  }`}>
                                    {value ? 'Visible' : 'Hidden'}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
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
                        <div className="border-t border-ash-border my-1" />
                        <button
                          onClick={() => {
                            setExportFormat("pdf");
                            handleExport("pdf", true);
                          }}
                          className="w-full px-3 py-2 text-left text-xs hover:bg-ash flex items-center gap-2 text-ink"
                        >
                          <FileText size={12} />
                          <span>PDF (PDF/A)</span>
                        </button>
                        <div className="border-t border-ash-border my-1" />
                        <div className="px-3 py-2">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await fetchDownloadStats();
                              setShowDownloadStats(!showDownloadStats);
                            }}
                            className="w-full text-left text-[10px] text-ink-muted hover:text-ink flex items-center gap-1.5"
                          >
                            <Download size={10} />
                            {downloadStats
                              ? `${downloadStats.total_downloads} downloads (${downloadStats.cache_hit_rate}% cached)`
                              : "Download stats"}
                          </button>
                          <AnimatePresence>
                            {showDownloadStats && downloadStats && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-1 space-y-0.5 overflow-hidden"
                              >
                                {Object.entries(downloadStats.formats).map(([type, stat]) => (
                                  <div key={type} className="flex justify-between text-[9px] text-ink-muted pl-2">
                                    <span>{type}</span>
                                    <span>{stat.count}x · {stat.total_bytes > 0 ? `${(stat.total_bytes / 1024 / 1024).toFixed(1)}MB` : "-"}</span>
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
            </div>
          </div>

          {/* Section content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="max-w-2xl mx-auto">
              {activeSection === "personal" && (
                <div className="space-y-4">
                  <ToneAdjuster
                    cvData={cvData}
                    section="personal"
                    sectionLabel="Personal Info"
                    onApply={(patch) => updateData(patch)}
                  />
                  <PersonalInfoSection
                    data={cvData.personal_info}
                    onChange={(v) => updateData({ personal_info: v })}
                  />
                </div>
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
                <div className="space-y-4">
                  <ToneAdjuster
                    cvData={cvData}
                    section="summary"
                    sectionLabel="Summary"
                    onApply={(patch) => updateData(patch)}
                  />
                  <SummarySection
                    value={cvData.summary}
                    jobDesc={cvData.job_description}
                    onChange={(v) => updateData({ summary: v })}
                    onJobDescChange={(v) => updateData({ job_description: v })}
                    cvData={cvData}
                  />
                </div>
              )}
              {activeSection === "skills" && (
                <div className="space-y-4">
                  <ToneAdjuster
                    cvData={cvData}
                    section="skills"
                    sectionLabel="Skills"
                    onApply={(patch) => updateData(patch)}
                  />
                  <SkillsSection
                    skills={cvData.skills}
                    onChange={(v) => updateData({ skills: v })}
                  />
                </div>
              )}
              {activeSection === "experience" && (
                <div className="space-y-4">
                  <ToneAdjuster
                    cvData={cvData}
                    section="experience"
                    sectionLabel="Experience"
                    onApply={(patch) => {
                      if (patch.experience) updateData({ experience: patch.experience });
                    }}
                  />
                  <ExperienceSection
                    items={cvData.experience}
                    onChange={(v) => updateData({ experience: v })}
                    cvData={cvData}
                    onApplyCvData={(next) => updateData(next)}
                  />
                </div>
              )}
              {activeSection === "education" && (
                <div className="space-y-4">
                  <ToneAdjuster
                    cvData={cvData}
                    section="education"
                    sectionLabel="Education"
                    onApply={(patch) => {
                      if (patch.education) updateData({ education: patch.education });
                    }}
                  />
                  <EducationSection
                    items={cvData.education}
                    onChange={(v) => updateData({ education: v })}
                  />
                </div>
              )}
              {activeSection === "certifications" && (
                <div className="space-y-4">
                  <ToneAdjuster
                    cvData={cvData}
                    section="certifications"
                    sectionLabel="Certifications"
                    onApply={(patch) => {
                      if (patch.certifications) updateData({ certifications: patch.certifications });
                    }}
                  />
                  <CertificationsSection
                    items={cvData.certifications}
                    onChange={(v) => updateData({ certifications: v })}
                  />
                </div>
              )}
              {activeSection === "projects" && (
                <div className="space-y-4">
                  <ToneAdjuster
                    cvData={cvData}
                    section="projects"
                    sectionLabel="Projects"
                    onApply={(patch) => {
                      if (patch.projects) updateData({ projects: patch.projects });
                    }}
                  />
                  <ProjectsSection
                    items={cvData.projects}
                    onChange={(v) => updateData({ projects: v })}
                  />
                </div>
              )}
              {activeSection === "awards" && (
                <div className="space-y-4">
                  <ToneAdjuster
                    cvData={cvData}
                    section="awards"
                    sectionLabel="Awards"
                    onApply={(patch) => {
                      if (patch.awards) updateData({ awards: patch.awards });
                    }}
                  />
                  <AwardsSection
                    items={cvData.awards}
                    onChange={(v) => updateData({ awards: v })}
                  />
                </div>
              )}
              {activeSection === "languages" && (
                <div className="space-y-4">
                  <ToneAdjuster
                    cvData={cvData}
                    section="languages"
                    sectionLabel="Languages"
                    onApply={(patch) => {
                      if (patch.languages) updateData({ languages: patch.languages });
                    }}
                  />
                  <LanguagesSection
                    items={cvData.languages}
                    onChange={(v) => updateData({ languages: v })}
                  />
                </div>
              )}
              {activeSection === "volunteer" && (
                <div className="space-y-4">
                  <ToneAdjuster
                    cvData={cvData}
                    section="volunteer"
                    sectionLabel="Volunteer"
                    onApply={(patch) => {
                      if (patch.volunteer) updateData({ volunteer: patch.volunteer });
                    }}
                  />
                  <VolunteerSection
                    items={cvData.volunteer}
                    onChange={(v) => updateData({ volunteer: v })}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Desktop-only side panels — gated by isMobile so only one instance mounts ── */}
        {showAI && !isMobile && (
          <AIAssistPanel
            cvData={cvData}
            onApply={(d) => {
              pushUndo(cvData);
              setPendingAIDiff({ before: cvData, after: d });
            }}
            onClose={() => setShowAI(false)}
            cvId={id!}
          />
        )}
        {showSkillGap && !isMobile && (
          <SkillGapEngine
            cvData={cvData}
            onClose={() => setShowSkillGap(false)}
            cvId={id!}
          />
        )}
        {showComments && id && !isMobile && (
          <CommentsPanel
            cvId={id}
            cvOwnerId={cv?.owner_id || ""}
            currentUserId={currentUserId}
            currentUsername={currentUsername}
            currentUserRole={currentUser?.role}
            onClose={() => setShowComments(false)}
            activeSection={activeSection}
            onSectionClick={setActiveSection}
            onApplySuggestion={handleApplySuggestion}
          />
        )}
        {showSuggestions && !isMobile && (
          <SectionSuggestionsPanel
            cvData={cvData}
            cvId={id!}
            onClose={() => setShowSuggestions(false)}
            onNavigateToSection={setActiveSection}
          />
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

        {/* ── Mobile sheets for sidebar panels — only render on mobile ── */}
        <AnimatePresence>
          {showAI && (
            <MobileSheetContent title="AI Assist" onClose={() => setShowAI(false)}>
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
            </MobileSheetContent>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSkillGap && (
            <MobileSheetContent
              title="Skill Gap"
              onClose={() => setShowSkillGap(false)}
            >
              <SkillGapEngine
                cvData={cvData}
                onClose={() => setShowSkillGap(false)}
                cvId={id!}
              />
            </MobileSheetContent>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showComments && id && (
            <MobileSheetContent title="Comments" onClose={() => setShowComments(false)}>
              <CommentsPanel
                cvId={id}
                cvOwnerId={cv?.owner_id || ""}
                currentUserId={currentUserId}
                currentUsername={currentUsername}
                currentUserRole={currentUser?.role}
                onClose={() => setShowComments(false)}
                activeSection={activeSection}
                onApplySuggestion={handleApplySuggestion}
              />
            </MobileSheetContent>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSuggestions && (
            <MobileSheetContent title="Suggestions" onClose={() => setShowSuggestions(false)}>
              <SectionSuggestionsPanel
                cvData={cvData}
                cvId={id!}
                onClose={() => setShowSuggestions(false)}
                onNavigateToSection={setActiveSection}
              />
            </MobileSheetContent>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showDrawer && (
            <SectionDrawer
              activeSection={activeSection}
              onSelect={setActiveSection}
              onClose={() => setShowDrawer(false)}
              isCompleted={(id) => isSectionCompleted(id, cvData)}
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
              showName={showName}
              showEmail={showEmail}
              showPhone={showPhone}
              showExperience={showExperience}
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
              onShowNameChange={(v) => { setShowName(v); setIsDirty(true); }}
              onShowEmailChange={(v) => { setShowEmail(v); setIsDirty(true); }}
              onShowPhoneChange={(v) => { setShowPhone(v); setIsDirty(true); }}
              onShowExperienceChange={(v) => { setShowExperience(v); setIsDirty(true); }}
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
