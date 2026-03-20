import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAnnouncement } from '../../context/announcement'
import { publicApi } from '../../api'
import { ArrowLeft, Search, Globe, ExternalLink, Share2, ChevronRight, Briefcase, X } from 'lucide-react'
import { getCVTheme } from '../../lib/cvThemes'

interface FeedCV {
  id: string; owner_username: string; title: string; slug: string; theme: string
  updated_at: string
  personal_info: { full_name: string; job_title: string; location: string }
  summary: string; skills: string[]
}
interface FeedResponse { cvs: FeedCV[]; total: number }

function CVCard({ cv, onShare }: { cv: FeedCV; onShare: (cv: FeedCV) => void }) {
  const accent   = getCVTheme(cv.theme).accent
  const name     = cv.personal_info.full_name || cv.owner_username
  const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div className="bg-white border border-ash-border rounded-2xl overflow-hidden hover:border-ink/20 hover:shadow-md transition-all group">
      <div className="h-1.5" style={{ backgroundColor: accent }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: accent }}>{initials}</div>
            <div>
              <p className="font-semibold text-sm text-ink leading-tight">{name}</p>
              {cv.personal_info.job_title && <p className="text-xs text-ink-muted mt-0.5">{cv.personal_info.job_title}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onShare(cv)} className="p-1.5 text-ink-muted hover:text-ink hover:bg-ash rounded-lg transition-colors"><Share2 size={13} /></button>
            <Link to={`/cv/${cv.owner_username}/${cv.slug}`} className="p-1.5 text-ink-muted hover:text-ink hover:bg-ash rounded-lg transition-colors"><ExternalLink size={13} /></Link>
          </div>
        </div>
        {cv.summary && <p className="text-xs text-ink-muted leading-relaxed line-clamp-2 mb-3">{cv.summary}</p>}
        {cv.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {cv.skills.slice(0, 5).map(s => <span key={s} className="px-2 py-0.5 bg-ash text-ink-muted text-[11px] rounded-md border border-ash-border">{s}</span>)}
            {cv.skills.length > 5 && <span className="px-2 py-0.5 text-ink-muted text-[11px]">+{cv.skills.length - 5}</span>}
          </div>
        )}
        <div className="flex items-center justify-between pt-3 border-t border-ash-border">
          <div className="flex items-center gap-1.5 text-[11px] text-ink-muted">
            <Globe size={11} />
            <Link to={`/profile/${cv.owner_username}`} className="hover:text-ink transition-colors">@{cv.owner_username}</Link>
            {cv.personal_info.location && <><span>·</span><span>{cv.personal_info.location}</span></>}
          </div>
          <Link to={`/cv/${cv.owner_username}/${cv.slug}`} className="flex items-center gap-1 text-[11px] font-medium text-ink hover:underline">View CV <ChevronRight size={11} /></Link>
        </div>
      </div>
    </div>
  )
}

function ShareModal({ cv, onClose }: { cv: FeedCV; onClose: () => void }) {
  const url = `${window.location.origin}/cv/${cv.owner_username}/${cv.slug}`
  const [copied, setCopied] = useState(false)
  const copy = async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-ash-border p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-sm text-ink">Share CV</p>
          <button onClick={onClose} className="text-ink-muted hover:text-ink"><X size={16} /></button>
        </div>
        <p className="text-xs text-ink-muted mb-3">Share <strong>{cv.personal_info.full_name || cv.owner_username}</strong>'s CV:</p>
        <div className="flex gap-2">
          <input readOnly value={url} className="flex-1 px-3 py-2 text-xs border border-ash-border rounded-lg bg-ash text-ink-muted font-mono" />
          <button onClick={copy} className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-ink text-white hover:bg-ink-light'}`}>{copied ? 'Copied!' : 'Copy'}</button>
        </div>
        <div className="flex gap-2 mt-3">
          <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Check out this CV by @${cv.owner_username}`)}`} target="_blank" rel="noopener noreferrer" className="flex-1 text-center py-2 text-xs border border-ash-border rounded-lg hover:bg-ash text-ink-muted transition-colors">Share on X</a>
          <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className="flex-1 text-center py-2 text-xs border border-ash-border rounded-lg hover:bg-ash text-ink-muted transition-colors">LinkedIn</a>
        </div>
      </div>
    </div>
  )
}

export default function PublicFeedPage() {
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(0)
  const [sharing, setSharing] = useState<FeedCV | null>(null)
  const limit    = 12
  const navigate = useNavigate()

  const { bannerH } = useAnnouncement()

  const { data, isLoading } = useQuery<FeedResponse>({
    queryKey: ['public-feed', page],
    queryFn:  () => publicApi.getFeed(page * limit, limit),
  })

  const filtered = (data?.cvs || []).filter(cv => {
    const q = search.toLowerCase()
    if (!q) return true
    const name = cv.personal_info.full_name || cv.owner_username
    return name.toLowerCase().includes(q) || cv.personal_info.job_title?.toLowerCase().includes(q) || cv.skills.some(s => s.toLowerCase().includes(q)) || cv.owner_username.toLowerCase().includes(q)
  })

  return (
    <div className="min-h-screen bg-ash">
      {/* Sticky topbar — sits below the announcement banner */}
      <header
        className="bg-white border-b border-ash-border sticky z-30"
        style={{ top: bannerH, transition: 'top 0.28s cubic-bezier(0.4,0,0.2,1)' }}
      >
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors">
              <ArrowLeft size={13} /> Home
            </button>
            <span className="text-ash-border">|</span>
            <div className="flex items-center gap-2">
              <Globe size={13} className="text-ink-muted" />
              <span className="font-display font-bold text-sm text-ink">Public CVs</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, role, skill…"
                className="pl-8 pr-4 py-1.5 text-xs border border-ash-border rounded-lg bg-ash focus:outline-none focus:border-ink w-56" />
            </div>
            <Link to="/register" className="px-3 py-1.5 bg-ink text-white text-xs font-medium rounded-lg hover:bg-ink-light transition-colors">Create yours →</Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 py-8">
        <div className="mb-8">
          <h1 className="font-display font-bold text-2xl text-ink mb-1">Explore CVs</h1>
          <p className="text-sm text-ink-muted">{data?.total ? `${data.total} public CV${data.total === 1 ? '' : 's'} from the AXIOM community` : 'Browse public CVs from the community'}</p>
        </div>

        <div className="sm:hidden relative mb-6">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, role, skill…"
            className="w-full pl-8 pr-4 py-2 text-sm border border-ash-border rounded-lg bg-white focus:outline-none focus:border-ink" />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-white rounded-2xl border border-ash-border h-48 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-ash-border rounded-2xl">
            <Briefcase size={28} className="mx-auto text-ink-muted/30 mb-3" />
            <p className="text-sm text-ink-muted mb-1">{search ? `No results for "${search}"` : 'No public CVs yet'}</p>
            {search && <button onClick={() => setSearch('')} className="text-xs text-ink underline mt-1">Clear search</button>}
            {!search && <Link to="/register" className="text-xs text-ink underline mt-1 inline-block">Be the first — create yours</Link>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(cv => <CVCard key={cv.id} cv={cv} onShare={setSharing} />)}
          </div>
        )}

        {!search && data && data.total > limit && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-4 py-2 text-xs border border-ash-border rounded-lg hover:bg-white disabled:opacity-40 transition-colors">← Previous</button>
            <span className="text-xs text-ink-muted">Page {page + 1} of {Math.ceil(data.total / limit)}</span>
            <button onClick={() => setPage(page + 1)} disabled={(page + 1) * limit >= data.total} className="px-4 py-2 text-xs border border-ash-border rounded-lg hover:bg-white disabled:opacity-40 transition-colors">Next →</button>
          </div>
        )}
      </div>

      {sharing && <ShareModal cv={sharing} onClose={() => setSharing(null)} />}
    </div>
  )
}