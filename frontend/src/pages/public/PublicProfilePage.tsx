import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAnnouncement } from '../../context/announcement'
import { publicApi } from '../../api'
import { FileText, ExternalLink, ArrowLeft } from 'lucide-react'

interface PublicProfile {
  username: string
  cvs: { id: string; title: string; slug: string; updated_at: string }[]
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

  return (
    <div className="min-h-screen bg-ash">
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
        <Link to="/explore" className="text-xs text-ink-muted hover:text-ink transition-colors">Explore CVs</Link>
      </div>

      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-ink text-white flex items-center justify-center text-xl font-bold mx-auto mb-3">
            {data.username.charAt(0).toUpperCase()}
          </div>
          <h1 className="font-display font-bold text-xl text-ink">@{data.username}</h1>
          <p className="text-xs text-ink-muted mt-1">{data.cvs.length} public {data.cvs.length === 1 ? 'CV' : 'CVs'}</p>
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