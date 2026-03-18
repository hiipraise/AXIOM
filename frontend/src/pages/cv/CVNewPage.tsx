import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cvApi } from '../../api'
import { EMPTY_CV_DATA, CVData } from '../../types'
import toast from 'react-hot-toast'
import { Upload, MessageSquare, FileText, ChevronRight, ArrowLeft, Send } from 'lucide-react'
import { useAnnouncement } from '../../context/announcement'


type Mode = 'choose' | 'blank' | 'upload' | 'interview'

export default function CVNewPage() {
  const navigate = useNavigate()
  const [mode, setMode]               = useState<Mode>('choose')
  const [title, setTitle]             = useState('')
  const [pageCount, setPageCount]     = useState(1)
  const [loading, setLoading]         = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [extractedData, setExtractedData] = useState<CVData | null>(null)
  const [interviewMessages, setInterviewMessages] = useState<{ role: string; content: string }[]>([])
  const [interviewInput, setInterviewInput]   = useState('')
  const [interviewLoading, setInterviewLoading] = useState(false)
  const { bannerH } = useAnnouncement()


  const handleCreateBlank = async () => {
    if (!title.trim()) { toast.error('Give your CV a title'); return }
    setLoading(true)
    try {
      const cv = await cvApi.create({ title, data: EMPTY_CV_DATA, page_count: pageCount })
      navigate(`/cv/${cv.id}`)
    } catch { toast.error('Failed to create CV') }
    finally { setLoading(false) }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await cvApi.uploadCV(file)
      setExtractedData(res.data)
      toast.success('CV extracted — review and create')
    } catch { toast.error('Could not parse PDF') }
    finally { setUploading(false) }
  }

  const handleCreateFromUpload = async () => {
    if (!title.trim()) { toast.error('Give your CV a title'); return }
    setLoading(true)
    try {
      const cv = await cvApi.create({ title, data: extractedData || EMPTY_CV_DATA, page_count: pageCount })
      navigate(`/cv/${cv.id}`)
    } catch { toast.error('Failed to create CV') }
    finally { setLoading(false) }
  }

  const handleInterviewSend = async () => {
    if (!interviewInput.trim()) return
    const userMsg    = { role: 'user', content: interviewInput }
    const newHistory = [...interviewMessages, userMsg]
    setInterviewMessages(newHistory)
    setInterviewInput('')
    setInterviewLoading(true)
    try {
      const res = await cvApi.aiInterview(interviewInput, interviewMessages)
      setInterviewMessages([...newHistory, { role: 'assistant', content: res.response }])
    } catch { toast.error('AI unavailable') }
    finally { setInterviewLoading(false) }
  }

  const handleCreateFromInterview = async () => {
    if (!title.trim()) { toast.error('Give your CV a title'); return }
    setLoading(true)
    try {
      const conversation = interviewMessages.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`).join('\n')
      const editRes = await cvApi.aiEdit(
        `Extract structured CV data from this interview conversation: ${conversation}`,
        EMPTY_CV_DATA
      )
      const cv = await cvApi.create({ title, data: editRes.data || EMPTY_CV_DATA, page_count: pageCount })
      navigate(`/cv/${cv.id}`)
    } catch { toast.error('Failed to create CV') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-ash px-4 sm:px-6 py-6 sm:py-8">
      <div className="max-w-2xl mx-auto">

        <button
          onClick={() => mode === 'choose' ? navigate('/dashboard') : setMode('choose')}
          className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink mb-5 transition-colors"
        >
          <ArrowLeft size={13} />
          {mode === 'choose' ? 'Back to dashboard' : 'Back to options'}
        </button>

        <h1 className="font-display text-xl sm:text-2xl font-bold text-ink mb-1">New CV</h1>
        <p className="text-sm text-ink-muted mb-6">Choose how you want to start</p>

        {/* ── Choose mode ── */}
        {mode === 'choose' && (
          <div className="grid grid-cols-1 gap-3">
            {[
              { m: 'blank'     as Mode, icon: FileText,     title: 'Start from scratch',  desc: 'Fill in each section manually with AI help on demand.' },
              { m: 'upload'    as Mode, icon: Upload,        title: 'Import existing CV',   desc: 'Upload a PDF — we extract the content and you refine it.' },
              { m: 'interview' as Mode, icon: MessageSquare, title: 'AI Interview mode',    desc: 'Answer questions and we build the CV structure from your responses.' },
            ].map(({ m, icon: Icon, title: t, desc }) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="flex items-center gap-4 p-4 sm:p-5 bg-white rounded-xl border border-ash-border hover:border-ink transition-all text-left group"
              >
                <div className="w-9 h-9 rounded-lg bg-ash flex items-center justify-center flex-shrink-0 group-hover:bg-ink group-hover:text-white transition-colors">
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-ink">{t}</p>
                  <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">{desc}</p>
                </div>
                <ChevronRight size={15} className="text-ink-muted flex-shrink-0 group-hover:text-ink transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* ── Blank / Upload ── */}
        {(mode === 'blank' || mode === 'upload') && (
          <div className="bg-white rounded-xl border border-ash-border p-4 sm:p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">CV Title *</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Software Engineer — Google Application"
                className="w-full px-3 py-2 text-sm border border-ash-border rounded-lg focus:outline-none focus:border-ink"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">Page length</label>
              <div className="flex gap-2">
                {[1, 2, 3].map(n => (
                  <button
                    key={n}
                    onClick={() => setPageCount(n)}
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs rounded-lg border transition-colors ${
                      pageCount === n ? 'bg-ink text-white border-ink' : 'border-ash-border text-ink-muted hover:bg-ash'
                    }`}
                  >
                    {n} {n === 1 ? 'page' : 'pages'}
                  </button>
                ))}
              </div>
            </div>

            {mode === 'upload' && (
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Upload existing CV (PDF)</label>
                {!extractedData ? (
                  <label className={`flex flex-col items-center justify-center border-2 border-dashed border-ash-border rounded-xl p-6 sm:p-8 cursor-pointer hover:border-ink transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Upload size={22} className="text-ink-muted mb-2" />
                    <span className="text-sm text-ink-muted text-center">
                      {uploading ? 'Extracting…' : 'Tap to upload PDF'}
                    </span>
                    <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
                  </label>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <FileText size={15} className="text-emerald-600 flex-shrink-0" />
                    <span className="text-xs text-emerald-700 font-medium">
                      CV extracted — {extractedData.experience.length} experience entries found
                    </span>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={mode === 'blank' ? handleCreateBlank : handleCreateFromUpload}
              disabled={loading || (mode === 'upload' && !extractedData)}
              className="w-full py-2.5 bg-ink text-white text-sm font-medium rounded-lg hover:bg-ink-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating…' : 'Create CV →'}
            </button>
          </div>
        )}

        {/* ── Interview ── */}
        {mode === 'interview' && (
          <div className="bg-white rounded-xl border border-ash-border overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-ash-border">
              <p className="text-sm font-medium text-ink">AI Interview</p>
              <p className="text-xs text-ink-muted">Answer naturally — AI gathers your career details</p>
            </div>

            {/* Chat — fixed height on desktop, flexible on mobile */}
            <div className="h-64 sm:h-80 overflow-y-auto p-4 space-y-3">
              {interviewMessages.length === 0 && (
                <p className="text-xs text-ink-muted italic">
                  Start by telling me about yourself — your current role, background, or target job.
                </p>
              )}
              {interviewMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    msg.role === 'user' ? 'bg-ink text-white' : 'bg-ash text-ink'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {interviewLoading && (
                <div className="flex justify-start">
                  <div className="bg-ash px-3 py-2 rounded-xl text-xs text-ink-muted animate-pulse">Thinking…</div>
                </div>
              )}
            </div>

            <div className="border-t border-ash-border p-3 flex gap-2">
              <input
                value={interviewInput}
                onChange={e => setInterviewInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleInterviewSend()}
                placeholder="Your answer…"
                className="flex-1 px-3 py-2 text-xs border border-ash-border rounded-lg focus:outline-none focus:border-ink"
              />
              <button
                onClick={handleInterviewSend}
                disabled={interviewLoading || !interviewInput.trim()}
                className="p-2 bg-ink text-white rounded-lg hover:bg-ink-light disabled:opacity-50 transition-colors"
              >
                <Send size={14} />
              </button>
            </div>

            {interviewMessages.length >= 4 && (
              <div className="p-4 border-t border-ash-border space-y-3">
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="CV Title (required)"
                  className="w-full px-3 py-2 text-xs border border-ash-border rounded-lg focus:outline-none focus:border-ink"
                />
                <button
                  onClick={handleCreateFromInterview}
                  disabled={loading || !title.trim()}
                  className="w-full py-2.5 bg-ink text-white text-sm font-medium rounded-lg hover:bg-ink-light disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Building CV…' : 'Build CV from Interview →'}
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}