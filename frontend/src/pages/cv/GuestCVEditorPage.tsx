/**
 * GuestCVEditorPage — Session-only mode.
 * No account required. All data lives in component state only.
 * PDF export uses the unauthenticated /api/export/pdf-preview endpoint.
 * AI features are disabled with prompts to sign up.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { exportApi } from '../../api'
import { EMPTY_CV_DATA, CVData } from '../../types'
import toast from 'react-hot-toast'
import {
  Download, ChevronLeft, Save, X, Eye, Sparkles,
  Briefcase, GraduationCap, Award, FolderOpen,
  Languages, Heart, User, AlignLeft, Wrench,
  ArrowRight, AlertTriangle
} from 'lucide-react'

import PersonalInfoSection   from '../../components/cv/PersonalInfoSection'
import SummarySection        from '../../components/cv/SummarySection'
import SkillsSection         from '../../components/cv/SkillsSection'
import ExperienceSection     from '../../components/cv/ExperienceSection'
import EducationSection      from '../../components/cv/EducationSection'
import CertificationsSection from '../../components/cv/CertificationsSection'
import ProjectsSection       from '../../components/cv/ProjectsSection'
import AwardsSection         from '../../components/cv/AwardsSection'
import LanguagesSection      from '../../components/cv/LanguagesSection'
import VolunteerSection      from '../../components/cv/VolunteerSection'
import CVPreview             from '../../components/cv/CVPreview'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const SECTIONS = [
  { id: 'personal',       label: 'Personal Info',   icon: User },
  { id: 'summary',        label: 'Summary',          icon: AlignLeft },
  { id: 'skills',         label: 'Skills',           icon: Wrench },
  { id: 'experience',     label: 'Experience',       icon: Briefcase },
  { id: 'education',      label: 'Education',        icon: GraduationCap },
  { id: 'certifications', label: 'Certifications',   icon: Award },
  { id: 'projects',       label: 'Projects',         icon: FolderOpen },
  { id: 'awards',         label: 'Awards',           icon: Award },
  { id: 'languages',      label: 'Languages',        icon: Languages },
  { id: 'volunteer',      label: 'Volunteer',        icon: Heart },
]

// ─── Sign-up nudge banner (dismissible) ──────────────────────────────────────
function SignUpBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="bg-ink text-white px-4 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-xs">
        <AlertTriangle size={13} className="text-amber-300 flex-shrink-0" />
        <span>
          <strong>Session-only mode:</strong> Your CV won't be saved when you leave this page.{' '}
          <Link to="/register" className="underline font-medium hover:text-white/80">
            Create a free account →
          </Link>
        </span>
      </div>
      <button onClick={onDismiss} className="text-white/60 hover:text-white flex-shrink-0">
        <X size={14} />
      </button>
    </div>
  )
}

// ─── AI disabled nudge ────────────────────────────────────────────────────────
function AILockedPanel() {
  return (
    <div className="w-72 bg-white border-l border-ash-border flex flex-col items-center justify-center p-8 text-center">
      <div className="w-12 h-12 rounded-2xl bg-ash flex items-center justify-center mb-4">
        <Sparkles size={20} className="text-ink-muted" />
      </div>
      <p className="font-semibold text-sm text-ink mb-2">AI features require an account</p>
      <p className="text-xs text-ink-muted leading-relaxed mb-5">
        Sign up for free to unlock AI chat, auto-generate your summary,
        apply edits with natural language, and match your CV to job descriptions.
      </p>
      <Link
        to="/register"
        className="flex items-center gap-2 px-4 py-2.5 bg-ink text-white text-xs font-medium rounded-xl hover:bg-ink-light transition-colors"
      >
        Create free account <ArrowRight size={12} />
      </Link>
      <Link to="/login" className="mt-3 text-xs text-ink-muted hover:text-ink underline">
        Already have an account? Sign in
      </Link>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function GuestCVEditorPage() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('personal')
  const [cvData, setCvData]               = useState<CVData>(EMPTY_CV_DATA)
  const [title, setTitle]                 = useState('My CV')
  const [theme, setTheme]                 = useState('minimal')
  const [pageCount, setPageCount]         = useState(1)
  const [showAI, setShowAI]               = useState(false)
  const [showPreview, setShowPreview]     = useState(false)
  const [bannerVisible, setBannerVisible] = useState(true)
  const [downloading, setDownloading]     = useState(false)

  const updateData = (patch: Partial<CVData>) => {
    setCvData(prev => ({ ...prev, ...patch }))
  }

  const handleDownloadPDF = async () => {
    setDownloading(true)
    try {
      const blob = await exportApi.previewPDF({
        title, data: cvData, theme, page_count: pageCount, username: 'guest',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${cvData.personal_info.full_name || 'cv'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded')
    } catch {
      toast.error('PDF generation failed')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex h-screen bg-ash overflow-hidden flex-col">
      {/* Banner */}
      {bannerVisible && <SignUpBanner onDismiss={() => setBannerVisible(false)} />}

      <div className="flex flex-1 min-h-0">
        {/* Left: section nav */}
        <div className="w-44 bg-white border-r border-ash-border flex flex-col flex-shrink-0">
          <div className="px-3 py-3 border-b border-ash-border">
            <button
              onClick={() => navigate('/')}
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
                    ? 'bg-ink text-white font-medium'
                    : 'text-ink-muted hover:bg-ash hover:text-ink'
                }`}
              >
                <Icon size={13} />
                {label}
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

        {/* Center: editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="bg-white border-b border-ash-border px-5 py-3 flex items-center gap-3 flex-wrap">
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="font-display font-semibold text-sm text-ink bg-transparent border-none outline-none flex-1 min-w-0"
              placeholder="CV Title"
            />
            <div className="flex items-center gap-2 ml-auto">
              <select
                value={theme}
                onChange={e => setTheme(e.target.value)}
                className="text-xs border border-ash-border rounded-lg px-2 py-1.5 bg-ash text-ink-muted focus:outline-none"
              >
                <option value="minimal">Minimal</option>
                <option value="classic">Classic</option>
                <option value="sharp">Sharp</option>
              </select>
              <select
                value={pageCount}
                onChange={e => setPageCount(Number(e.target.value))}
                className="text-xs border border-ash-border rounded-lg px-2 py-1.5 bg-ash text-ink-muted focus:outline-none"
              >
                <option value={1}>1 Page</option>
                <option value={2}>2 Pages</option>
                <option value={3}>3 Pages</option>
              </select>

              {/* Save nudge */}
              <Link
                to="/register"
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
              >
                <Save size={12} /> Save (sign up)
              </Link>

              <button
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg bg-ink text-white hover:bg-ink-light disabled:opacity-50 transition-colors font-medium"
              >
                <Download size={12} /> {downloading ? 'Generating…' : 'PDF'}
              </button>
            </div>
          </div>

          {/* Section content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto">
              {activeSection === 'personal'       && <PersonalInfoSection   data={cvData.personal_info} onChange={v => updateData({ personal_info: v })} />}
              {activeSection === 'summary'        && <SummarySection        value={cvData.summary} jobDesc={cvData.job_description} onChange={v => updateData({ summary: v })} onJobDescChange={v => updateData({ job_description: v })} cvData={cvData} />}
              {activeSection === 'skills'         && <SkillsSection         skills={cvData.skills}        onChange={v => updateData({ skills: v })} />}
              {activeSection === 'experience'     && <ExperienceSection     items={cvData.experience}     onChange={v => updateData({ experience: v })} />}
              {activeSection === 'education'      && <EducationSection      items={cvData.education}      onChange={v => updateData({ education: v })} />}
              {activeSection === 'certifications' && <CertificationsSection items={cvData.certifications} onChange={v => updateData({ certifications: v })} />}
              {activeSection === 'projects'       && <ProjectsSection       items={cvData.projects}       onChange={v => updateData({ projects: v })} />}
              {activeSection === 'awards'         && <AwardsSection         items={cvData.awards}         onChange={v => updateData({ awards: v })} />}
              {activeSection === 'languages'      && <LanguagesSection      items={cvData.languages}      onChange={v => updateData({ languages: v })} />}
              {activeSection === 'volunteer'      && <VolunteerSection      items={cvData.volunteer}      onChange={v => updateData({ volunteer: v })} />}
            </div>
          </div>
        </div>

        {/* Right: AI locked panel */}
        {showAI && <AILockedPanel />}
      </div>

      {showPreview && (
        <CVPreview cvData={cvData} theme={theme} onClose={() => setShowPreview(false)} />
      )}
    </div>
  )
}