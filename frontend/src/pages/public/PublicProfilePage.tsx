import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAnnouncement } from '../../context/announcement'
import { publicApi } from '../../api'
import { FileText, ExternalLink, ArrowLeft, Globe, Mail, Github, Linkedin, User } from 'lucide-react'
import Seo from "../../components/Seo"

interface PublicContact {
  email?: string
  phone?: string
  location?: string
  linkedin?: string
  github?: string
  portfolio?: string
  website?: string
}

interface PublicProfile {
  username: string
  role?: string
  contact?: PublicContact
  cvs: { id: string; title: string; slug: string; updated_at: string }[]
}

/** Render a single character as the avatar letter, falling back to User icon for special/digit-first names. */
function AvatarLetter({ username }: { username: string }) {
  const chars = Array.from(username).filter(c => c.trim().length > 0)
  const first = chars[0]
  if (!first || /^[0-9_\-.\s]$/.test(first)) return <User size={22} />
  return <>{first.toUpperCase()}</>
}


function ContactLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  if (!href) return null
  const isEmail = href.includes('@')
  const full = isEmail
    ? (href.startsWith('mailto:') ? href : `mailto:${href}`)
    : (href.startsWith('http') ? href : `https://${href}`)
  return (
    <a
      href={full}
      target={isEmail ? undefined : '_blank'}
      rel={isEmail ? undefined : 'noopener noreferrer'}
      className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
    >
      <Icon size={13} />
      <span>{label}</span>
    </a>
  )
}


export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>()
  const navigate     = useNavigate()

  const { bannerH } = useAnnouncement()

  const { data, isLoading, error } = useQuery<PublicProfile>({
    queryKey: ['public-profile', username],
    queryFn:  () => publicApi.getProfile(username!),
  })

  if (isLoading) return <div className="min-h-screen bg-ash flex items-center justify-center"><p className="text-sm text-ink-muted animate-pulse">Loading profile…</p></div>
  if (error || !data) return (
    <div className="min-h-screen bg-ash flex flex-col items-center justify-center gap-3">
      <p className="text-sm text-ink">User not found</p>
      <Link to="/" className="text-xs text-ink-muted underline">Go home</Link>
    </div>
  )

  const contact = data.contact || {}
  const contactLinks: Array<{ key: keyof PublicContact; icon: React.ElementType; label: string }> = [
    { key: 'linkedin', icon: Linkedin, label: 'LinkedIn' },
    { key: 'github', icon: Github, label: 'GitHub' },
    { key: 'portfolio', icon: Globe, label: 'Portfolio' },
    { key: 'website', icon: Globe, label: 'Website' },
    { key: 'email', icon: Mail, label: contact.email || '' },
  ]

  return (
    <div className="min-h-screen bg-ash">
      <Seo
        title={`${data.username} — Public Profile`}
        description={`Public CVs by ${data.username}`}
      />
      {/* Top bar offset below banner */}
      <div
        className="bg-white border-b border-ash-border px-6 py-4 flex items-center justify-between sticky z-30"
        style={{ top: bannerH, transition: 'top 0.28s cubic-bezier(0.4,0,0.2,1)' }}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors">
            <ArrowLeft size={13} /> Back
          </button>
          <span className="text-ash-border text-xs">|</span>
          <span className="font-display font-bold text-ink text-sm">AXIOM</span>
        </div>
        <Link to="/jobs" className="text-xs text-ink-muted hover:text-ink transition-colors">Browse jobs</Link>
      </div>

      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-ink text-white flex items-center justify-center text-xl font-bold mx-auto mb-3">
            <AvatarLetter username={data.username} />
          </div>
          <h1 className="font-display font-bold text-xl text-ink">@{data.username}</h1>
          <p className="text-xs text-ink-muted mt-1">{data.cvs.length} public {data.cvs.length === 1 ? 'CV' : 'CVs'}</p>

          {/* Contact links */}
          {contactLinks.some(({ key }) => contact[key]) && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              {contactLinks.map(({ key, icon, label }) => {
                const href = contact[key]
                if (!href) return null
                return <ContactLink key={key} href={href} label={label === 'email' ? href : label} icon={icon} />
              })}
            </div>
          )}
        </div>

        {data.cvs.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-ash-border rounded-xl">
            <p className="text-sm text-ink-muted">No public CVs yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.cvs.map(cv => (
              <Link key={cv.id} to={`/cv/${data.username}/${cv.slug}`}
                className="flex items-center justify-between p-4 bg-white border border-ash-border rounded-xl hover:border-ink transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-ash flex items-center justify-center group-hover:bg-ink group-hover:text-white transition-colors">
                    <FileText size={15} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{cv.title}</p>
                    <p className="text-xs text-ink-muted">Updated {new Date(cv.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>
                <ExternalLink size={14} className="text-ink-muted group-hover:text-ink transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
