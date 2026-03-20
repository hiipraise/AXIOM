import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAnnouncement } from '../../context/announcement'
import { publicApi, exportApi } from '../../api'
import { CVData } from '../../types'
import { Download, ArrowLeft, Globe } from 'lucide-react'
import toast from 'react-hot-toast'
import CVRenderer from '../../components/cv/CVRenderer'

interface PublicCV {
  id: string
  owner_username: string
  title: string
  data: CVData
  theme: string
  template: string        // ← now included
  updated_at: string
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
    } catch {
      toast.error('Download failed')
    }
  }

  if (isLoading) return (
    <div className="min-h-screen bg-ash flex items-center justify-center">
      <p className="text-sm text-ink-muted animate-pulse">Loading CV…</p>
    </div>
  )

  if (error || !cv) return (
    <div className="min-h-screen bg-ash flex flex-col items-center justify-center gap-3">
      <p className="text-sm text-ink">CV not found or not public</p>
      <Link to="/" className="text-xs text-ink-muted underline">Go home</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-ash">
      {/* Top bar */}
      <div
        className="bg-white border-b border-ash-border px-6 py-3 flex items-center justify-between sticky z-30"
        style={{ top: bannerH, transition: 'top 0.28s cubic-bezier(0.4,0,0.2,1)' }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
          >
            <ArrowLeft size={13} /> Back
          </button>
          <span className="text-ash-border text-xs">|</span>
          <span className="font-display font-bold text-ink text-sm">AXIOM</span>
          <span className="text-ash-border text-xs">|</span>
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <Globe size={12} />
            <Link to={`/profile/${username}`} className="hover:text-ink transition-colors">
              @{username}
            </Link>
          </div>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-4 py-2 bg-ink text-white text-xs rounded-lg hover:bg-ink-light transition-colors"
        >
          <Download size={13} /> Download PDF
        </button>
      </div>

      {/* CV body — CVRenderer picks the right template automatically */}
      <div className="max-w-[700px] mx-auto my-8 bg-white shadow-sm rounded-xl overflow-hidden">
        <CVRenderer
          cvData={cv.data}
          theme={cv.theme || 'minimal'}
          template={cv.template || 'standard'}
        />
      </div>
    </div>
  )
}