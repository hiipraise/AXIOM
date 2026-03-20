import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { cvApi, exportApi } from '../../api'
import { CV, CVData, EMPTY_CV_DATA } from '../../types'
import toast from 'react-hot-toast'
import {
  Save, Download, Sparkles, ChevronLeft, Globe, Lock, Star,
  Briefcase, GraduationCap, Award, FolderOpen, Menu, X,
  Languages, Heart, User, AlignLeft, Wrench, History, Eye,
} from 'lucide-react'
import { useAnnouncement } from '../../context/announcement'


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
import AIAssistPanel         from '../../components/cv/AIAssistPanel'
import CVPreview             from '../../components/cv/CVPreview'
import HistoryDrawer         from '../../components/cv/HistoryDrawer'
import RatingModal           from '../../components/cv/RatingModal'

const SECTIONS = [
  { id: 'personal',       label: 'Personal Info',  icon: User },
  { id: 'summary',        label: 'Summary',         icon: AlignLeft },
  { id: 'skills',         label: 'Skills',          icon: Wrench },
  { id: 'experience',     label: 'Experience',      icon: Briefcase },
  { id: 'education',      label: 'Education',       icon: GraduationCap },
  { id: 'certifications', label: 'Certifications',  icon: Award },
  { id: 'projects',       label: 'Projects',        icon: FolderOpen },
  { id: 'awards',         label: 'Awards',          icon: Star },
  { id: 'languages',      label: 'Languages',       icon: Languages },
  { id: 'volunteer',      label: 'Volunteer',       icon: Heart },
]

// ─── Mobile bottom-sheet section picker ──────────────────────────────────────
function SectionDrawer({
  activeSection,
  onSelect,
  onClose,
}: {
  activeSection: string
  onSelect: (id: string) => void
  onClose: () => void
}) {
  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black/40 z-40 md:hidden"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl md:hidden"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-ash-border">
          <p className="font-semibold text-sm text-ink">Sections</p>
          <button onClick={onClose}><X size={16} className="text-ink-muted" /></button>
        </div>
        <div className="overflow-y-auto max-h-[60vh] py-2">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { onSelect(id); onClose() }}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm text-left transition-colors ${
                activeSection === id
                  ? 'bg-ink text-white font-medium'
                  : 'text-ink-muted hover:bg-ash hover:text-ink'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </motion.div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CVEditorPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc       = useQueryClient()

  const [activeSection, setActiveSection] = useState('personal')
  const [cvData, setCvData]               = useState<CVData>(EMPTY_CV_DATA)
  const [title, setTitle]                 = useState('')
  const [isPublic, setIsPublic]           = useState(false)
  const [theme, setTheme]                 = useState('minimal')
  const [pageCount, setPageCount]         = useState(1)
  const [showAI, setShowAI]               = useState(false)
  const [showPreview, setShowPreview]     = useState(false)
  const [showHistory, setShowHistory]     = useState(false)
  const [showRating, setShowRating]       = useState(false)
  const [showDrawer, setShowDrawer]       = useState(false)
  const [isDirty, setIsDirty]             = useState(false)
  const [saving, setSaving]               = useState(false)
  const [currentRating, setCurrentRating] = useState<number | undefined>(undefined)
  const { bannerH } = useAnnouncement()


  const { data: cv, isLoading } = useQuery<CV>({
    queryKey: ['cv', id],
    queryFn:  () => cvApi.get(id!),
    enabled:  !!id,
  })

  useEffect(() => {
    if (cv) {
      setCvData(cv.data)
      setTitle(cv.title)
      setIsPublic(cv.is_public)
      setTheme(cv.theme)
      setPageCount(cv.page_count)
      setCurrentRating(cv.rating ?? undefined)
    }
  }, [cv])

  const updateData = (patch: Partial<CVData>) => {
    setCvData(prev => ({ ...prev, ...patch }))
    setIsDirty(true)
  }

  const handleSave = async () => {
    if (!id) return
    setSaving(true)
    try {
      await cvApi.update(id, { title, data: cvData, is_public: isPublic, theme, page_count: pageCount })
      qc.invalidateQueries({ queryKey: ['cv', id] })
      qc.invalidateQueries({ queryKey: ['cvs'] })
      setIsDirty(false)
      toast.success('CV saved')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const handleDownloadPDF = async () => {
    if (!id) return
    try {
      const blob = await exportApi.downloadPDF(id)
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${cvData.personal_info.full_name || title}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded')
    } catch { toast.error('PDF generation failed') }
  }

  const activeSectionLabel = SECTIONS.find(s => s.id === activeSection)?.label ?? ''

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen bg-ash">
      <div className="text-ink-muted text-sm animate-pulse">Loading CV…</div>
    </div>
  )

  return (
    <div className="flex h-screen bg-ash overflow-hidden">

      {/* ── Desktop sidebar ── */}
      <div className="hidden md:flex w-44 bg-white border-r border-ash-border flex-col" style={{top: bannerH, transition:'top 0.28s cubic-bezier(0.4,0,0.2,1)'}}>
        <div className="px-3 py-3 border-b border-ash-border">
          <button
            onClick={() => navigate('/dashboard')}
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
                  ? 'bg-ink text-white font-medium'
                  : 'text-ink-muted hover:bg-ash hover:text-ink'
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-ash-border space-y-1">
          <button
            onClick={() => setShowAI(!showAI)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-ink text-white hover:bg-ink-light transition-colors"
          >
            <Sparkles size={13} /> AI Assist
          </button>
          <button onClick={() => setShowPreview(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs border border-ash-border text-ink-muted hover:bg-ash transition-colors">
            <Eye size={13} /> Preview
          </button>
          <button onClick={() => setShowHistory(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs border border-ash-border text-ink-muted hover:bg-ash transition-colors">
            <History size={13} /> History
          </button>
          <button
            onClick={() => setShowRating(true)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-colors ${
              currentRating
                ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                : 'border-ash-border text-ink-muted hover:bg-ash'
            }`}
          >
            <Star size={13} className={currentRating ? 'fill-amber-400 text-amber-400' : ''} />
            {currentRating ? `Rated ${currentRating}/5` : 'Rate CV'}
          </button>
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Toolbar */}
        <div className="bg-white border-b border-ash-border px-3 sm:px-5 py-2.5 flex items-center gap-2 flex-shrink-0" style={{top: bannerH, transition:'top 0.28s cubic-bezier(0.4,0,0.2,1)'}}>

          {/* Mobile back */}
          <button
            onClick={() => navigate('/dashboard')}
            className="md:hidden p-1.5 text-ink-muted hover:text-ink flex-shrink-0"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Mobile: current section name taps to open drawer */}
          <button
            onClick={() => setShowDrawer(true)}
            className="md:hidden flex items-center gap-1.5 text-xs font-medium text-ink truncate flex-1 min-w-0"
          >
            <Menu size={14} className="flex-shrink-0 text-ink-muted" />
            <span className="truncate">{activeSectionLabel}</span>
          </button>

          {/* Desktop: title input */}
          <input
            value={title}
            onChange={e => { setTitle(e.target.value); setIsDirty(true) }}
            className="hidden md:block font-display font-semibold text-sm text-ink bg-transparent border-none outline-none flex-1 min-w-0"
            placeholder="CV Title"
          />

          {/* Controls */}
          <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
            <select
              value={theme}
              onChange={e => { setTheme(e.target.value); setIsDirty(true) }}
              className="hidden sm:block text-xs border border-ash-border rounded-lg px-2 py-1.5 bg-ash text-ink-muted focus:outline-none"
            >
              <option value="minimal">Minimal</option>
              <option value="classic">Classic</option>
              <option value="sharp">Sharp</option>
            </select>
            <select
              value={pageCount}
              onChange={e => { setPageCount(Number(e.target.value)); setIsDirty(true) }}
              className="hidden sm:block text-xs border border-ash-border rounded-lg px-2 py-1.5 bg-ash text-ink-muted focus:outline-none"
            >
              <option value={1}>1 Page</option>
              <option value={2}>2 Pages</option>
              <option value={3}>3 Pages</option>
            </select>

            {/* Mobile icon buttons */}
            <button onClick={() => setShowAI(!showAI)} className="md:hidden p-1.5 text-ink-muted hover:text-ink" title="AI Assist">
              <Sparkles size={15} />
            </button>
            <button onClick={() => setShowPreview(true)} className="md:hidden p-1.5 text-ink-muted hover:text-ink" title="Preview">
              <Eye size={15} />
            </button>

            <button
              onClick={() => { setIsPublic(!isPublic); setIsDirty(true) }}
              className={`hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                isPublic
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-ash-border text-ink-muted hover:bg-ash'
              }`}
            >
              {isPublic ? <Globe size={12} /> : <Lock size={12} />}
              {isPublic ? 'Public' : 'Private'}
            </button>

            <button
              onClick={handleDownloadPDF}
              className="p-1.5 sm:flex sm:items-center sm:gap-1.5 sm:text-xs sm:px-3 sm:py-1.5 sm:rounded-lg sm:border sm:border-ash-border sm:text-ink-muted sm:hover:bg-ash sm:transition-colors text-ink-muted hover:text-ink"
            >
              <Download size={14} />
              <span className="hidden sm:inline text-xs ml-1">PDF</span>
            </button>

            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                isDirty
                  ? 'bg-ink text-white hover:bg-ink-light'
                  : 'bg-ash text-ink-muted cursor-not-allowed'
              }`}
            >
              <Save size={12} />
              <span className="hidden sm:inline">{saving ? 'Saving…' : 'Save'}</span>
            </button>
          </div>
        </div>

        {/* Section content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-2xl mx-auto">
            {activeSection === 'personal'       && <PersonalInfoSection   data={cvData.personal_info}   onChange={v => updateData({ personal_info: v })} />}
            {activeSection === 'summary'        && <SummarySection        value={cvData.summary}         jobDesc={cvData.job_description} onChange={v => updateData({ summary: v })} onJobDescChange={v => updateData({ job_description: v })} cvData={cvData} />}
            {activeSection === 'skills'         && <SkillsSection         skills={cvData.skills}         onChange={v => updateData({ skills: v })} />}
            {activeSection === 'experience'     && <ExperienceSection     items={cvData.experience}      onChange={v => updateData({ experience: v })} />}
            {activeSection === 'education'      && <EducationSection      items={cvData.education}       onChange={v => updateData({ education: v })} />}
            {activeSection === 'certifications' && <CertificationsSection items={cvData.certifications}  onChange={v => updateData({ certifications: v })} />}
            {activeSection === 'projects'       && <ProjectsSection       items={cvData.projects}        onChange={v => updateData({ projects: v })} />}
            {activeSection === 'awards'         && <AwardsSection         items={cvData.awards}          onChange={v => updateData({ awards: v })} />}
            {activeSection === 'languages'      && <LanguagesSection      items={cvData.languages}       onChange={v => updateData({ languages: v })} />}
            {activeSection === 'volunteer'      && <VolunteerSection      items={cvData.volunteer}       onChange={v => updateData({ volunteer: v })} />}
          </div>
        </div>
      </div>

      {/* Desktop AI panel */}
      {showAI && (
        <div className="hidden md:block">
          <AIAssistPanel cvData={cvData} onApply={d => { setCvData(d); setIsDirty(true); toast.success('AI edits applied') }} onClose={() => setShowAI(false)} cvId={id!} />
        </div>
      )}

      {/* Mobile AI panel — full overlay */}
      {showAI && (
        <div className="md:hidden fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-ash-border">
            <span className="font-semibold text-sm text-ink">AI Assist</span>
            <button onClick={() => setShowAI(false)}><X size={16} className="text-ink-muted" /></button>
          </div>
          <div className="flex-1 overflow-hidden">
            <AIAssistPanel cvData={cvData} onApply={d => { setCvData(d); setIsDirty(true); toast.success('AI edits applied'); setShowAI(false) }} onClose={() => setShowAI(false)} cvId={id!} />
          </div>
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

      {showPreview  && <CVPreview cvData={cvData} theme={theme} onClose={() => setShowPreview(false)} />}
      {showHistory && id && <HistoryDrawer cvId={id} onRestore={snap => { setCvData(snap); setIsDirty(true); setShowHistory(false); toast.success('Version restored — save to keep it') }} onClose={() => setShowHistory(false)} />}
      {showRating  && id && (
        <RatingModal
          cvId={id}
          cvTitle={title}
          currentRating={currentRating}
          onClose={() => setShowRating(false)}
          onSaved={score => {
            setCurrentRating(score)
            qc.invalidateQueries({ queryKey: ['cv', id] })
            qc.invalidateQueries({ queryKey: ['cvs'] })
          }}
        />
      )}
    </div>
  )
}