import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { publicApi } from '../../api'
import { Search, MapPin, Briefcase, Clock, FileText, User, Shield, ExternalLink } from 'lucide-react'
import Seo from '../../components/Seo'
import Navbar from '../../components/landing/Navbar'
import Footer from '../../components/landing/Footer'

export default function PublicCVBrowsePage() {
  const [query, setQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [skillFilter, setSkillFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['public-cvs-browse', query, skillFilter, page],
    queryFn: () => publicApi.browseCVs({ q: query || undefined, skills: skillFilter || undefined, page, per_page: 20 }),
    placeholderData: keepPreviousData,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setQuery(searchInput)
    setPage(1)
  }

  const totalPages = data ? Math.ceil(data.total / 20) : 0

  return (
    <>
      <Seo title="Explore Public CVs" description="Browse CVs from the AXIOM community — discover professionals by role, skills, and industry." />
      <Navbar />
      <main className="min-h-screen bg-ash">
        <div className="max-w-6xl mx-auto px-4 pt-28 pb-16">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="font-display text-3xl font-bold text-ink">Explore public CVs</h1>
            <p className="text-sm text-ink-muted mt-2 max-w-lg mx-auto">
              Discover CVs from the AXIOM community. Search by role, skill, or username — each CV respects its owner's privacy settings.
            </p>
          </div>

          {/* Search + filter */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by role, skill, or username…"
                  className="input pl-9 w-full"
                />
              </div>
              <input
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                placeholder="Skills filter (comma-separated)"
                className="input w-48 hidden sm:block text-xs"
              />
              <button type="submit" className="btn-primary px-5">
                Search
              </button>
            </div>
          </form>

          {/* Results */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-ash-border p-5 animate-pulse space-y-3">
                  <div className="h-4 bg-ash-dark rounded w-3/4" />
                  <div className="h-3 bg-ash-dark rounded w-1/2" />
                  <div className="h-3 bg-ash-dark rounded w-full" />
                  <div className="flex gap-1.5 mt-3">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="h-5 bg-ash-dark rounded-full w-14" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : data?.items.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-ash mb-4">
                <FileText size={24} className="text-ink-muted" />
              </div>
              <p className="text-sm text-ink font-medium">No public CVs found</p>
              <p className="text-xs text-ink-muted mt-1">
                {query || skillFilter
                  ? 'Try different search terms or filters.'
                  : 'No public CVs have been shared yet. Make your CV public to appear here.'}
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-ink-muted mb-4">
                {data?.total ?? 0} CV{data?.total !== 1 ? 's' : ''} found
                {(query || skillFilter) && (
                  <button onClick={() => { setQuery(''); setSearchInput(''); setSkillFilter(''); setPage(1); }} className="ml-2 text-ink underline hover:no-underline">
                    Clear filters
                  </button>
                )}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data?.items.map((card) => (
                  <Link
                    key={card.id}
                    to={`/cv/${card.owner_username}/${card.id}`}
                    className="group bg-white rounded-xl border border-ash-border p-5 hover:border-ink hover:shadow-sm transition-all flex flex-col h-full"
                  >
                    {/* Name or username */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">
                          {card.name || `@${card.owner_username}`}
                        </p>
                        {card.job_title && (
                          <p className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
                            <Briefcase size={11} />
                            {card.job_title}
                          </p>
                        )}
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-ash flex items-center justify-center flex-shrink-0 group-hover:bg-ink group-hover:text-white transition-colors">
                        <User size={14} />
                      </div>
                    </div>

                    {/* Location */}
                    {card.location && (
                      <p className="text-[11px] text-ink-muted flex items-center gap-1 mb-2">
                        <MapPin size={11} />
                        {card.location}
                      </p>
                    )}

                    {/* Summary */}
                    {card.summary && (
                      <p className="text-[11px] text-ink-muted leading-relaxed line-clamp-2 mb-3">
                        {card.summary}
                      </p>
                    )}

                    {/* Skills */}
                    {card.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {card.skills.slice(0, 5).map((skill) => (
                          <span key={skill} className="text-[10px] px-2 py-0.5 rounded-full bg-ash text-ink-muted">
                            {skill}
                          </span>
                        ))}
                        {card.skills.length > 5 && (
                          <span className="text-[10px] text-ink-muted">+{card.skills.length - 5}</span>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between text-[10px] text-ink-muted mt-auto pt-2 border-t border-ash-border">
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(card.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1 group-hover:text-ink transition-colors">
                        View CV <ExternalLink size={10} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-xs rounded-lg border border-ash-border text-ink-muted hover:text-ink disabled:opacity-30 transition-colors"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 7) {
                      pageNum = i + 1
                    } else if (page <= 4) {
                      pageNum = i + 1
                      if (i === 6) pageNum = totalPages
                    } else if (page >= totalPages - 3) {
                      pageNum = totalPages - 6 + i
                    } else {
                      pageNum = page - 3 + i
                      if (i === 0) pageNum = 1
                      if (i === 6) pageNum = totalPages
                    }
                    const isGap = i === 1 && pageNum > 2
                    const isGap2 = i === 5 && pageNum < totalPages - 1
                    if ((isGap || isGap2) && totalPages > 7) {
                      return <span key={`gap-${i}`} className="text-xs text-ink-muted px-1">...</span>
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          page === pageNum ? 'bg-ink text-white font-medium' : 'border border-ash-border text-ink-muted hover:text-ink'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 text-xs rounded-lg border border-ash-border text-ink-muted hover:text-ink disabled:opacity-30 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}

          {/* Privacy note */}
          <div className="mt-12 max-w-xl mx-auto">
            <div className="flex items-start gap-3 p-4 rounded-xl border border-ash-border bg-white">
              <Shield size={16} className="text-ink-muted mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-ink">Privacy-controlled visibility</p>
                <p className="text-[11px] text-ink-muted mt-0.5 leading-relaxed">
                  Each CV shown here respects its owner's privacy settings. If they've chosen to hide their name, email,
                  phone, or experience section, that data is not displayed. You can control all of these when making your
                  own CV public.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
