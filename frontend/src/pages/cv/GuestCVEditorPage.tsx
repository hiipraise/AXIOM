/**
 * GuestCVEditorPage — Session-only mode, mobile-responsive.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { exportApi } from "../../api";
import { EMPTY_CV_DATA, CVData } from "../../types";
import toast from "react-hot-toast";
import {
  Download,
  ChevronLeft,
  Save,
  X,
  Eye,
  Sparkles,
  Briefcase,
  GraduationCap,
  Award,
  FolderOpen,
  Languages,
  Heart,
  User,
  AlignLeft,
  Wrench,
  ArrowRight,
  AlertTriangle,
  Menu,
} from "lucide-react";
import { useAnnouncement } from "../../context/announcement";

import PersonalInfoSection from "../../components/cv/PersonalInfoSection";
import SummarySection from "../../components/cv/SummarySection";
import SkillsSection from "../../components/cv/SkillsSection";
import ExperienceSection from "../../components/cv/ExperienceSection";
import EducationSection from "../../components/cv/EducationSection";
import CertificationsSection from "../../components/cv/CertificationsSection";
import ProjectsSection from "../../components/cv/ProjectsSection";
import AwardsSection from "../../components/cv/AwardsSection";
import LanguagesSection from "../../components/cv/LanguagesSection";
import VolunteerSection from "../../components/cv/VolunteerSection";
import CVPreview from "../../components/cv/CVPreview";

const SECTIONS = [
  { id: "personal", label: "Personal Info", icon: User },
  { id: "summary", label: "Summary", icon: AlignLeft },
  { id: "skills", label: "Skills", icon: Wrench },
  { id: "experience", label: "Experience", icon: Briefcase },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "certifications", label: "Certifications", icon: Award },
  { id: "projects", label: "Projects", icon: FolderOpen },
  { id: "awards", label: "Awards", icon: Award },
  { id: "languages", label: "Languages", icon: Languages },
  { id: "volunteer", label: "Volunteer", icon: Heart },
];

// ─── Banner ───────────────────────────────────────────────────────────────────
function SignUpBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="bg-ink text-white px-4 py-2.5 flex items-center justify-between gap-3 flex-shrink-0">
      <div className="flex items-center gap-2 text-xs min-w-0">
        <AlertTriangle size={13} className="text-amber-300 flex-shrink-0" />
        <span className="truncate">
          <strong>Session-only:</strong> data lost on exit.{" "}
          <Link
            to="/register"
            className="underline font-medium whitespace-nowrap"
          >
            Save free →
          </Link>
        </span>
      </div>
      <button
        onClick={onDismiss}
        className="text-white/60 hover:text-white flex-shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── AI locked panel ──────────────────────────────────────────────────────────
function AILockedPanel({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="
      fixed inset-y-0 right-0 z-40 w-full sm:w-80
      bg-white border-l border-ash-border
      flex flex-col items-center justify-center p-8 text-center
      shadow-xl
    "
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-ink-muted hover:text-ink"
      >
        <X size={16} />
      </button>
      <div className="w-12 h-12 rounded-2xl bg-ash flex items-center justify-center mb-4">
        <Sparkles size={20} className="text-ink-muted" />
      </div>
      <p className="font-semibold text-sm text-ink mb-2">
        AI features require an account
      </p>
      <p className="text-xs text-ink-muted leading-relaxed mb-5">
        Sign up for free to unlock AI chat, auto-generate summaries, apply
        edits, and match your CV to job descriptions.
      </p>
      <Link
        to="/register"
        className="flex items-center gap-2 px-4 py-2.5 bg-ink text-white text-xs font-medium rounded-xl hover:bg-ink-light transition-colors"
      >
        Create free account <ArrowRight size={12} />
      </Link>
      <Link
        to="/login"
        className="mt-3 text-xs text-ink-muted hover:text-ink underline"
      >
        Already have an account? Sign in
      </Link>
    </div>
  );
}

// ─── Mobile section drawer ────────────────────────────────────────────────────
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function GuestCVEditorPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("personal");
  const [cvData, setCvData] = useState<CVData>(EMPTY_CV_DATA);
  const [title, setTitle] = useState("My CV");
  const [theme, setTheme] = useState("minimal");
  const [pageCount, setPageCount] = useState(1);
  const [showAI, setShowAI] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const { bannerH } = useAnnouncement();

  const updateData = (patch: Partial<CVData>) =>
    setCvData((prev) => ({ ...prev, ...patch }));

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const blob = await exportApi.previewPDF({
        title,
        data: cvData,
        theme,
        page_count: pageCount,
        username: "guest",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cvData.personal_info.full_name || "cv"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch {
      toast.error("PDF generation failed");
    } finally {
      setDownloading(false);
    }
  };

  const activeSectionLabel =
    SECTIONS.find((s) => s.id === activeSection)?.label ?? "";

  return (
    <div className="flex h-screen bg-ash overflow-hidden flex-col">
      {bannerVisible && (
        <SignUpBanner onDismiss={() => setBannerVisible(false)} />
      )}

      <div className="flex flex-1 min-h-0">
        {/* ── Desktop sidebar ── */}
        <div className="hidden md:flex w-44 bg-white border-r border-ash-border flex-col flex-shrink-0">
          <div className="px-3 py-3 border-b border-ash-border">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
            >
              <ChevronLeft size={13} /> Home
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
          <div className="p-3 border-t border-ash-border space-y-1">
            <button
              onClick={() => setShowAI(!showAI)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs border border-ash-border text-ink-muted hover:bg-ash transition-colors"
            >
              <Sparkles size={13} /> AI (login required)
            </button>
            <button
              onClick={() => setShowPreview(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs border border-ash-border text-ink-muted hover:bg-ash transition-colors"
            >
              <Eye size={13} /> Preview
            </button>
          </div>
        </div>

        {/* ── Center: editor ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div
            className="bg-white border-b border-ash-border px-3 sm:px-5 py-2.5 flex items-center gap-2 flex-shrink-0 sticky z-30"
            style={{
              top: bannerH,
              transition: "top 0.28s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            {/* Mobile: back + section picker */}
            <button
              onClick={() => navigate("/")}
              className="md:hidden p-1.5 text-ink-muted hover:text-ink flex-shrink-0"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Mobile section label / Desktop title input */}
            <button
              onClick={() => setShowDrawer(true)}
              className="md:hidden flex items-center gap-1.5 text-xs font-medium text-ink truncate flex-1 min-w-0"
            >
              <Menu size={14} className="flex-shrink-0 text-ink-muted" />
              <span className="truncate">{activeSectionLabel}</span>
            </button>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="hidden md:block font-display font-semibold text-sm text-ink bg-transparent border-none outline-none flex-1 min-w-0"
              placeholder="CV Title"
            />

            {/* Right controls */}
            <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
              {/* Theme + page — hidden on smallest screens */}
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="hidden sm:block text-xs border border-ash-border rounded-lg px-2 py-1.5 bg-ash text-ink-muted focus:outline-none"
              >
                <option value="minimal">Minimal</option>
                <option value="classic">Classic</option>
                <option value="sharp">Sharp</option>
              </select>
              <select
                value={pageCount}
                onChange={(e) => setPageCount(Number(e.target.value))}
                className="hidden sm:block text-xs border border-ash-border rounded-lg px-2 py-1.5 bg-ash text-ink-muted focus:outline-none"
              >
                <option value={1}>1 Page</option>
                <option value={2}>2 Pages</option>
                <option value={3}>3 Pages</option>
              </select>

              {/* Mobile: AI icon */}
              <button
                onClick={() => setShowAI(true)}
                className="md:hidden p-1.5 text-ink-muted hover:text-ink"
                title="AI (login required)"
              >
                <Sparkles size={15} />
              </button>

              {/* Mobile: preview icon */}
              <button
                onClick={() => setShowPreview(true)}
                className="md:hidden p-1.5 text-ink-muted hover:text-ink"
                title="Preview"
              >
                <Eye size={15} />
              </button>

              <Link
                to="/register"
                className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
              >
                <Save size={12} /> Save
              </Link>

              <button
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-ink text-white hover:bg-ink-light disabled:opacity-50 transition-colors font-medium"
              >
                <Download size={12} />
                <span className="hidden sm:inline">
                  {downloading ? "Generating…" : "PDF"}
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
          <div className="hidden md:flex">
            <AILockedPanel onClose={() => setShowAI(false)} />
          </div>
        )}
      </div>

      {/* Mobile AI panel */}
      {showAI && (
        <div className="md:hidden">
          <AILockedPanel onClose={() => setShowAI(false)} />
        </div>
      )}

      {/* Mobile section drawer */}
      <AnimatePresence>
        {showDrawer && (
          <SectionDrawer
            activeSection={activeSection}
            onSelect={setActiveSection}
            onClose={() => setShowDrawer(false)}
          />
        )}
      </AnimatePresence>

      {showPreview && (
        <CVPreview
          cvData={cvData}
          theme={theme}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
