import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
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
  Star,
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
} from "lucide-react";
import { useRef } from "react";
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
import { CV_THEME_OPTIONS } from "../../lib/cvThemes";
import { CV_TEMPLATE_OPTIONS } from "../../lib/cvTemplateRegistry";
import HistoryDrawer from "../../components/cv/HistoryDrawer";
import RatingModal from "../../components/cv/RatingModal";
import ConfirmDialog from "../../components/UI/ConfirmDialog";

const SECTIONS = [
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
          {SECTIONS.map(({ id, label, icon: Icon }) => (
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
  const qc = useQueryClient();
  const { printCV, isPrinting } = usePrintCV();

  const [activeSection, setActiveSection] = useState("personal");
  const [cvData, setCvData] = useState<CVData>(EMPTY_CV_DATA);
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [theme, setTheme] = useState("minimal");
  const [template, setTemplate] = useState("standard");
  const [pageCount, setPageCount] = useState(1);
  const [showAI, setShowAI] = useState(false);
  const [showSkillGap, setShowSkillGap] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showSettings, setShowSettings] = useState(false); // 8a
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentRating, setCurrentRating] = useState<number | undefined>(
    undefined,
  );
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingAction, setPendingAction] = useState<null | {
    action: "leave" | "rate" | "restore"; // 8b: added "restore"
    run: () => void;
  }>(null);

  const { bannerH } = useAnnouncement();

  const { data: cv, isLoading } = useQuery<CV>({
    queryKey: ["cv", id],
    queryFn: () => cvApi.get(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (cv) {
      setCvData(normalizeCVData(cv.data));
      setTitle(cv.title);
      setIsPublic(cv.is_public);
      setTheme(cv.theme);
      setTemplate(cv.template || "standard");
      setPageCount(cv.page_count);
      setCurrentRating(cv.rating ?? undefined);
    }
  }, [cv]);

  const confirmDiscard = useCallback(
    (action: "leave" | "rate" | "restore", run: () => void) => {
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
  const handleOpenRating = () =>
    confirmDiscard("rate", () => setShowRating(true));

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
      toast.success("CV saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
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
        toast.error("Save failed — cannot generate PDF");
        return;
      }
    }
    printCV(id);
  };

  const activeSectionLabel =
    SECTIONS.find((s) => s.id === activeSection)?.label ?? "";

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-screen bg-ash">
        <div className="text-ink-muted text-sm animate-pulse">Loading CV…</div>
      </div>
    );

  return (
    <>
      <div
        className="flex bg-ash overflow-hidden"
        style={{
          height: `calc(100vh - ${bannerH}px)`,
          paddingTop: bannerH,
          transition:
            "height 0.28s cubic-bezier(0.4,0,0.2,1), padding-top 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Sidebar */}
        <div className="hidden md:flex w-44 bg-white border-r border-ash-border flex-col flex-shrink-0">
          <div className="px-3 py-3 border-b border-ash-border flex-shrink-0">
            <button
              onClick={handleLeaveEditor}
              className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
            >
              <ChevronLeft size={13} /> Back
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {SECTIONS.map(({ id: sid, label, icon: Icon }) => (
              <button
                key={sid}
                onClick={() => setActiveSection(sid)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-all text-left ${
                  activeSection === sid
                    ? "bg-ink text-white font-medium"
                    : "text-ink-muted hover:bg-ash hover:text-ink"
                }`}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
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
              onClick={() => setShowHistory(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs border border-ash-border text-ink-muted hover:bg-ash transition-colors"
            >
              <History size={13} /> History
            </button>
            <button
              onClick={handleOpenRating}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-colors ${
                currentRating
                  ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  : "border-ash-border text-ink-muted hover:bg-ash"
              }`}
            >
              <Star
                size={13}
                className={currentRating ? "fill-amber-400 text-amber-400" : ""}
              />
              {currentRating ? `Rated ${currentRating}/5` : "Rate CV"}
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
              <button
                onClick={handleDownloadPDF}
                disabled={isPrinting}
                className="p-1.5 sm:flex sm:items-center sm:gap-1.5 sm:text-xs sm:px-3 sm:py-1.5 sm:rounded-lg sm:border sm:border-ash-border sm:text-ink-muted sm:hover:bg-ash sm:transition-colors text-ink-muted hover:text-ink disabled:opacity-50"
              >
                <Download size={14} />
                <span className="hidden sm:inline text-xs ml-1">
                  {isPrinting ? "Preparing…" : "PDF"}
                </span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !isDirty}
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
                setCvData(d);
                setIsDirty(true);
                toast.success("AI edits applied");
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
                  setCvData(d);
                  setIsDirty(true);
                  toast.success("AI edits applied");
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

        {showHistory && id && (
          <HistoryDrawer
            cvId={id}
            onRestore={handleRestoreFromHistory} // 8b: guarded restore
            onClose={() => setShowHistory(false)}
          />
        )}
        {showRating && id && (
          <RatingModal
            cvId={id}
            cvTitle={title}
            currentRating={currentRating}
            onClose={() => setShowRating(false)}
            onSaved={(score) => {
              setCurrentRating(score);
              qc.invalidateQueries({ queryKey: ["cv", id] });
              qc.invalidateQueries({ queryKey: ["cvs"] });
            }}
          />
        )}

        {/* 8b: Extended confirm dialog covers leave / rate / restore */}
        <ConfirmDialog
          open={!!pendingAction}
          title="Discard unsaved changes?"
          description={
            pendingAction?.action === "rate"
              ? "You have unsaved edits. Open the rating dialog now and your current changes will be lost unless you save first."
              : pendingAction?.action === "restore"
                ? "You have unsaved edits. Restoring a version will overwrite them. Save first if you want to keep your current changes."
                : "You have unsaved edits. Leave the editor now and your current changes will be lost unless you save first."
          }
          confirmLabel={
            pendingAction?.action === "rate"
              ? "Discard and rate"
              : pendingAction?.action === "restore"
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
