import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAnnouncement } from '../../context/announcement'
import { publicApi, exportApi } from '../../api'
import { CVData } from '../../types'
import { Download, ArrowLeft, Globe } from 'lucide-react'
import toast from 'react-hot-toast'

interface PublicCV {
  id: string; owner_username: string; title: string
  data: CVData; theme: string; updated_at: string
}

const THEME_ACCENT: Record<string, string> = {
  minimal: '#0F172A', classic: '#1E3A5F', sharp: '#DC2626',
}


function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <p className="text-xs font-bold tracking-widest uppercase mb-1.5" style={{ color: accent }}>{title}</p>
      <div className="border-t mb-3" style={{ borderColor: '#E2E8F0' }} />
      {children}
    </div>
  )
}

export default function PublicCVPage() {
  const { username, slug } = useParams<{ username: string; slug: string }>()
  const navigate = useNavigate()

  const { bannerH } = useAnnouncement()

  const { data: cv, isLoading, error } = useQuery<PublicCV>({
    queryKey: ['public-cv', username, slug],
    queryFn:  () => publicApi.getCV(username!, slug!),
  })

  const handleDownload = async () => {
    try {
      const blob = await exportApi.downloadPublicPDF(username!, slug!)
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `${cv?.data.personal_info.full_name || username}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Download failed') }
  }

  if (isLoading) return <div className="min-h-screen bg-ash flex items-center justify-center"><p className="text-sm text-ink-muted animate-pulse">Loading CV…</p></div>
  if (error || !cv) return (
    <div className="min-h-screen bg-ash flex flex-col items-center justify-center gap-3">
      <p className="text-sm text-ink">CV not found or not public</p>
      <Link to="/" className="text-xs text-ink-muted underline">Go home</Link>
    </div>
  )

  const pi  = cv.data.personal_info
  const acc = THEME_ACCENT[cv.theme] || THEME_ACCENT.minimal

  return (
    <div className="min-h-screen bg-ash">
      {/* Top bar — sticky, sits below announcement banner */}
      <div
        className="bg-white border-b border-ash-border px-6 py-3 flex items-center justify-between sticky z-30"
        style={{ top: bannerH, transition: 'top 0.28s cubic-bezier(0.4,0,0.2,1)' }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors">
            <ArrowLeft size={13} /> Back
          </button>
          <span className="text-ash-border text-xs">|</span>
          <span className="font-display font-bold text-ink text-sm">AXIOM</span>
          <span className="text-ash-border text-xs">|</span>
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <Globe size={12} />
            <Link to={`/profile/${username}`} className="hover:text-ink transition-colors">@{username}</Link>
          </div>
        </div>
        <button onClick={handleDownload} className="flex items-center gap-1.5 px-4 py-2 bg-ink text-white text-xs rounded-lg hover:bg-ink-light transition-colors">
          <Download size={13} /> Download PDF
        </button>
      </div>

      {/* CV Document */}
      <div className="max-w-[700px] mx-auto my-8 bg-white shadow-sm rounded-xl overflow-hidden">
        <div className="p-12" style={{ fontFamily: 'Helvetica, Arial, sans-serif', color: '#111111' }}>
          <h1 className="text-3xl font-bold mb-1" style={{ color: acc }}>{pi.full_name || username}</h1>
          {pi.job_title && <p className="text-sm mb-3" style={{ color: '#555' }}>{pi.job_title}</p>}
          <div className="text-xs flex flex-wrap gap-x-4 gap-y-1 pb-3 mb-3" style={{ color: '#555', borderBottom: `2px solid ${acc}` }}>
            {[pi.email, pi.phone, pi.location, pi.linkedin, pi.github, pi.portfolio].filter(Boolean).map((c, i) => <span key={i}>{c}</span>)}
          </div>

          {cv.data.summary && <Section title="PROFILE" accent={acc}><p className="text-sm leading-relaxed">{cv.data.summary}</p></Section>}

          {cv.data.experience.length > 0 && (
            <Section title="EXPERIENCE" accent={acc}>
              {cv.data.experience.map((exp, i) => (
                <div key={i} className="mb-4">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-sm">{exp.role} — {exp.company}</span>
                    <span className="text-xs" style={{ color: '#555' }}>{exp.start_date}{exp.start_date && ' – '}{exp.current ? 'Present' : exp.end_date}</span>
                  </div>
                  {exp.description && <p className="text-sm mt-1 leading-relaxed">{exp.description}</p>}
                  {exp.achievements.map((a, ai) => <p key={ai} className="text-sm pl-4 mt-0.5">• {a}</p>)}
                </div>
              ))}
            </Section>
          )}

          {cv.data.education.length > 0 && (
            <Section title="EDUCATION" accent={acc}>
              {cv.data.education.map((edu, i) => (
                <div key={i} className="mb-3">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-sm">{edu.degree}{edu.field ? `, ${edu.field}` : ''} — {edu.institution}</span>
                    <span className="text-xs" style={{ color: '#555' }}>{edu.start_date}{edu.start_date && ' – '}{edu.end_date}</span>
                  </div>
                  {edu.grade && <p className="text-xs" style={{ color: '#555' }}>{edu.grade}</p>}
                </div>
              ))}
            </Section>
          )}

          {cv.data.skills.length > 0 && <Section title="SKILLS" accent={acc}><p className="text-sm">{cv.data.skills.join(', ')}</p></Section>}

          {cv.data.certifications.length > 0 && (
            <Section title="CERTIFICATIONS" accent={acc}>
              {cv.data.certifications.map((c, i) => (
                <div key={i} className="mb-2">
                  <span className="font-semibold text-sm">{c.name}</span>
                  <span className="text-sm" style={{ color: '#555' }}> — {c.issuer}{c.date ? ` (${c.date})` : ''}</span>
                  {c.url && <p className="text-xs mt-0.5" style={{ color: '#555' }}>{c.url}</p>}
                </div>
              ))}
            </Section>
          )}

          {cv.data.projects.length > 0 && (
            <Section title="PROJECTS" accent={acc}>
              {cv.data.projects.map((p, i) => (
                <div key={i} className="mb-3">
                  <p className="font-semibold text-sm">{p.name}</p>
                  {p.description && <p className="text-sm">{p.description}</p>}
                  {p.technologies.length > 0 && <p className="text-xs mt-0.5" style={{ color: '#555' }}>Tech: {p.technologies.join(', ')}</p>}
                  {p.url && <p className="text-xs" style={{ color: '#555' }}>{p.url}</p>}
                </div>
              ))}
            </Section>
          )}

          {cv.data.languages.length > 0 && (
            <Section title="LANGUAGES" accent={acc}>
              <p className="text-sm">{cv.data.languages.map(l => `${l.language}${l.proficiency ? ` (${l.proficiency})` : ''}`).join('  •  ')}</p>
            </Section>
          )}

          <div className="mt-8 pt-4 border-t border-gray-100 text-xs text-gray-400 text-center">
            Verified via AXIOM · axiom.cv/profile/{username}
          </div>
        </div>
      </div>
    </div>
  )
}