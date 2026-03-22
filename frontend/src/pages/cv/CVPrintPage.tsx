import { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { cvApi, publicApi } from '../../api'
import { CV, CVData } from '../../types'
import CVRenderer from '../../components/cv/CVRenderer'

/**
 * Dedicated print page — opened in a new tab / navigated to directly.
 * Renders ONLY the CV (no chrome) then triggers window.print().
 *
 * The <html> min-width: 210mm in index.css @media print handles the mobile
 * viewport fix globally. The wrapper div here enforces the same width at
 * screen render time so that the layout is already correct before printing.
 */

const PRINT_WRAPPER_STYLE: React.CSSProperties = {
  width: '210mm',       // A4 width — keeps template columns intact on narrow screens
  minWidth: '210mm',
  margin: '0 auto',
  background: 'white',
}

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
    const t = setTimeout(() => window.print(), 800)
    return () => clearTimeout(t)
  }, [cv])

  if (isLoading) return <div className="p-8 text-sm text-gray-400">Preparing PDF…</div>
  if (!cv) return <div className="p-8 text-sm text-gray-400">CV not found.</div>

  return (
    <div style={PRINT_WRAPPER_STYLE}>
      <CVRenderer
        cvData={cv.data}
        theme={cv.theme || 'minimal'}
        template={cv.template || 'standard'}
      />
    </div>
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
    <div style={PRINT_WRAPPER_STYLE}>
      <CVRenderer
        cvData={cv.data}
        theme={cv.theme || 'minimal'}
        template={cv.template || 'standard'}
      />
    </div>
  )
}

// ─── Router — ?public=username/slug or just /:id ──────────────────────────────
export default function CVPrintPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const publicParam = searchParams.get('public')

  if (publicParam) {
    const [username, ...slugParts] = publicParam.split('/')
    const slug = slugParts.join('/')
    return <PublicPrintPage username={username} slug={slug} />
  }

  if (id) return <AuthPrintPage id={id} />

  return <div className="p-8 text-sm text-gray-400">No CV specified.</div>
}