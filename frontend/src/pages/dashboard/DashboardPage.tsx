import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { cvApi } from '../../api'
import { CV } from '../../types'
import { Plus, FileText, Globe, Lock, Copy, Trash2, Edit, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/auth'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: cvs = [], isLoading } = useQuery<CV[]>({
    queryKey: ['cvs'],
    queryFn: cvApi.list,
    enabled: !!user,
  })

  const handleDuplicate = async (id: string) => {
    try {
      await cvApi.duplicate(id)
      qc.invalidateQueries({ queryKey: ['cvs'] })
      toast.success('CV duplicated')
    } catch {
      toast.error('Failed to duplicate')
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    try {
      await cvApi.delete(id)
      qc.invalidateQueries({ queryKey: ['cvs'] })
      toast.success('CV deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink tracking-tight">Your CVs</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {cvs.length} {cvs.length === 1 ? 'resume' : 'resumes'} saved
          </p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/cv/new')}>
          <Plus size={15} />
          New CV
        </button>
      </div>

      {/* Empty state */}
      {!isLoading && cvs.length === 0 && (
        <div className="card text-center py-16 border-dashed">
          <FileText size={32} className="mx-auto text-ink-muted/40 mb-3" />
          <p className="text-sm text-ink-muted mb-4">No CVs yet. Create your first one.</p>
          <button className="btn-primary" onClick={() => navigate('/cv/new')}>
            <Plus size={14} />
            Create CV
          </button>
        </div>
      )}

      {/* CV grid */}
      <div className="space-y-3">
        {cvs.map((cv) => (
          <div key={cv.id} className="card hover:border-ink-muted/30 transition-colors group">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-ink text-sm truncate">{cv.title}</h3>
                  <span className={`badge ${cv.is_public ? 'bg-green-50 text-green-700' : 'bg-ash-dark text-ink-muted'}`}>
                    {cv.is_public ? <><Globe size={9} className="inline mr-0.5" /> Public</> : <><Lock size={9} className="inline mr-0.5" /> Private</>}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-ink-muted">
                  <span className="flex items-center gap-1"><Clock size={10} /> {formatDate(cv.updated_at)}</span>
                  <span className="capitalize">{cv.theme} theme</span>
                  <span>{cv.page_count === 1 ? '1 page' : `${cv.page_count} pages`}</span>
                  {cv.data.personal_info.job_title && (
                    <span className="truncate">{cv.data.personal_info.job_title}</span>
                  )}
                </div>
                {cv.is_public && cv.slug && (
                  <p className="text-[11px] text-ink-muted/70 font-mono mt-1 truncate">
                    /cv/{cv.owner_username}/{cv.slug}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="btn-ghost p-2" onClick={() => navigate(`/cv/${cv.id}`)}>
                  <Edit size={13} />
                </button>
                <button className="btn-ghost p-2" onClick={() => handleDuplicate(cv.id)}>
                  <Copy size={13} />
                </button>
                <button
                  className="btn-ghost p-2 hover:text-red-600"
                  onClick={() => handleDelete(cv.id, cv.title)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
