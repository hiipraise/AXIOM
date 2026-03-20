import { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { cvApi } from '../../api'
import { publicApi } from '../../api'
import { CV, CVData } from '../../types'
import CVRenderer from '../../components/cv/CVRenderer'

interface PublicCV {
  id: string
  owner_username: string
  title: string
  data: CVData
  theme: string
  template: string
}

// ─── Authenticated CV print ───────────────────────────────────────────────────
function AuthPrintPage({ id }: { id: string }) {
  const { data: cv, isLoading } = useQuery<CV>({
    queryKey: ['cv-print', id],
    queryFn: () => cvApi.get(id),
  })

  useEffect(() => {
    if (!cv) return
    document.title = cv.title || 'CV'
    // Small delay so the DOM has fully painted before print dialog opens
    const t = setTimeout(() => window.print(), 800)
    return () => clearTimeout(t)
  }, [cv])

  if (isLoading) return <div className="p-8 text-sm text-gray-400">Preparing PDF…</div>
  if (!cv) return <div className="p-8 text-sm text-gray-400">CV not found.</div>

  return (
    <CVRenderer
      cvData={cv.data}
      theme={cv.theme || 'minimal'}
      template={cv.template || 'standard'}
    />
  )
}

// ─── Public CV print ─────────────────────────────────────────────────────────
function PublicPrintPage({ username, slug }: { username: string; slug: string }) {
  const { data: cv, isLoading } = useQuery<PublicCV>({
    queryKey: ['cv-print-public', username, slug],
    queryFn: () => publicApi.getCV(username, slug),
  })

  useEffect(() => {
    if (!cv) return
    document.title = cv.title || 'CV'
    const t = setTimeout(() => window.print(), 800)
    return () => clearTimeout(t)
  }, [cv])

  if (isLoading) return <div className="p-8 text-sm text-gray-400">Preparing PDF…</div>
  if (!cv) return <div className="p-8 text-sm text-gray-400">CV not found.</div>

  return (
    <CVRenderer
      cvData={cv.data}
      theme={cv.theme || 'minimal'}
      template={cv.template || 'standard'}
    />
  )
}

// ─── Router — ?public=username/slug or just /:id ──────────────────────────────
export default function CVPrintPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const publicParam = searchParams.get('public') // e.g. "username/my-cv-slug"

  if (publicParam) {
    const [username, ...slugParts] = publicParam.split('/')
    const slug = slugParts.join('/')
    return <PublicPrintPage username={username} slug={slug} />
  }

  if (id) return <AuthPrintPage id={id} />

  return <div className="p-8 text-sm text-gray-400">No CV specified.</div>
}