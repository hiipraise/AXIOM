import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { cvApi } from '../../api'
import { CV } from '../../types'
import { Plus, FileText, Globe, Lock, Copy, Trash2, Edit, Clock, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/auth'
import RatingModal from '../../components/cv/RatingModal'
import ConfirmDialog from '../../components/UI/ConfirmDialog'

export default function DashboardPage() {
  const { user }  = useAuthStore()
  const navigate  = useNavigate()
  const qc        = useQueryClient()
  const [ratingCV, setRatingCV] = useState<CV | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CV | null>(null)

  const { data: cvs = [], isLoading } = useQuery<CV[]>({
    queryKey: ['cvs'],
    queryFn:  cvApi.list,
    enabled:  !!user,
  })

  const handleDuplicate = async (id: string) => {
    try {
      await cvApi.duplicate(id)
      qc.invalidateQueries({ queryKey: ['cvs'] })
      toast.success('CV duplicated')
    } catch { toast.error('Failed to duplicate') }
  }

  const handleDelete = async (id: string) => {
    try {
      await cvApi.delete(id)
      qc.invalidateQueries({ queryKey: ['cvs'] })
      toast.success('CV deleted')
      setDeleteTarget(null)
    } catch { toast.error('Failed to delete') }
  }

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-ink tracking-tight">Your CVs</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {cvs.length} {cvs.length === 1 ? 'resume' : 'resumes'} saved
          </p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/cv/new')}>
          <Plus size={14} /> New CV
        </button>
      </div>

      {/* Empty state */}
      {!isLoading && cvs.length === 0 && (
        <div className="card text-center py-16 border-dashed">
          <FileText size={32} className="mx-auto text-ink-muted/40 mb-3" />
          <p className="text-sm text-ink-muted mb-4">No CVs yet. Create your first one.</p>
          <button className="btn-primary" onClick={() => navigate('/cv/new')}>
            <Plus size={14} /> Create CV
          </button>
        </div>
      )}

      {/* CV list */}
      <div className="space-y-2">
        {cvs.map((cv) => (
          <div key={cv.id} className="card !p-4">

            {/* Row 1: title + badge + actions */}
            <div className="flex items-center gap-2 min-w-0 flex-wrap">

              {/* Title */}
              <h3 className="font-medium text-ink text-sm truncate flex-1 min-w-0">
                {cv.title}
              </h3>

              {/* Visibility badge */}
              <span className={`badge text-[10px] flex-shrink-0 ${cv.is_public ? 'bg-green-50 text-green-700' : 'bg-ash-dark text-ink-muted'}`}>
                {cv.is_public
                  ? <><Globe size={9} className="inline mr-0.5" />Public</>
                  : <><Lock size={9} className="inline mr-0.5" />Private</>}
              </span>

              {/* Rating display */}
              {cv.rating != null && (
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {Array.from({ length: cv.rating }).map((_, i) => (
                    <Star key={i} size={10} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
              )}

              {/* Divider */}
              <span className="w-px h-3.5 bg-ash-border flex-shrink-0 hidden sm:block" />

              {/* Action buttons — always visible, no shift */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  className="btn-ghost p-1.5"
                  title="Rate"
                  onClick={() => setRatingCV(cv)}
                >
                  <Star size={13} className={cv.rating ? 'text-amber-400 fill-amber-400' : ''} />
                </button>
                <button className="btn-ghost p-1.5" title="Edit" onClick={() => navigate(`/cv/${cv.id}`)}>
                  <Edit size={13} />
                </button>
                <button className="btn-ghost p-1.5 hidden sm:inline-flex" title="Duplicate" onClick={() => handleDuplicate(cv.id)}>
                  <Copy size={13} />
                </button>
                <button className="btn-ghost p-1.5 hover:text-red-600" title="Delete" onClick={() => setDeleteTarget(cv)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Row 2: meta */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-ink-muted mt-1.5">
              <span className="flex items-center gap-1">
                <Clock size={10} /> {fmt(cv.updated_at)}
              </span>
              <span className="capitalize">{cv.theme}</span>
              <span>{cv.page_count === 1 ? '1 page' : `${cv.page_count} pages`}</span>
              {cv.data.personal_info.job_title && (
                <span className="truncate max-w-[160px]">{cv.data.personal_info.job_title}</span>
              )}
            </div>

            {/* Row 3: public URL (optional) */}
            {cv.is_public && cv.slug && (
              <p className="text-[11px] text-ink-muted/60 font-mono mt-1 truncate">
                /cv/{cv.owner_username}/{cv.slug}
              </p>
            )}

          </div>
        ))}
      </div>

      {ratingCV && (
        <RatingModal
          cvId={ratingCV.id}
          cvTitle={ratingCV.title}
          currentRating={ratingCV.rating}
          onClose={() => setRatingCV(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['cvs'] })}
        />
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete CV?"
        description={
          <>
            Delete <span className="font-medium text-ink">"{deleteTarget?.title}"</span>? This cannot be undone.
          </>
        }
        confirmLabel="Delete CV"
        variant="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
      />
    </div>
  )
}
