import { useState } from 'react'
import { cvApi } from '../../api'
import { CVData } from '../../types'
import { X, Sparkles, Wand2, FileSearch, Send } from 'lucide-react'
import toast from 'react-hot-toast'

type Tab = 'chat' | 'edit' | 'job'

interface Props {
  cvData: CVData
  onApply: (data: CVData) => void
  onClose: () => void
  cvId: string
}

export default function AIAssistPanel({ cvData, onApply, onClose, cvId }: Props) {
  const [tab, setTab] = useState<Tab>('chat')
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([
    { role: 'assistant', content: 'Hi! I can help you improve your CV. Ask me to make a section shorter, stronger, or more specific — or paste a job description to align your CV to a role.' }
  ])
  const [chatInput, setChatInput] = useState('')
  const [editInstruction, setEditInstruction] = useState('')
  const [jobDesc, setJobDesc] = useState(cvData.job_description || '')
  const [loading, setLoading] = useState(false)

  const sendChat = async () => {
    if (!chatInput.trim() || loading) return
    const userMsg = { role: 'user', content: chatInput }
    const newHistory = [...chatHistory, userMsg]
    setChatHistory(newHistory)
    setChatInput('')
    setLoading(true)
    try {
      const res = await cvApi.aiChat(chatInput, cvData)
      setChatHistory([...newHistory, { role: 'assistant', content: res.response }])
    } catch {
      toast.error('AI unavailable')
    } finally {
      setLoading(false)
    }
  }

  const applyEdit = async () => {
    if (!editInstruction.trim() || loading) return
    setLoading(true)
    try {
      const res = await cvApi.aiEdit(editInstruction, cvData)
      onApply(res.data)
      setEditInstruction('')
      toast.success('Edits applied')
    } catch {
      toast.error('AI edit failed')
    } finally {
      setLoading(false)
    }
  }

  const matchJob = async () => {
    if (!jobDesc.trim() || loading) return
    setLoading(true)
    try {
      const res = await cvApi.aiMatchJob(cvData, jobDesc)
      onApply(res.data)
      toast.success('CV aligned to job description')
    } catch {
      toast.error('Job match failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-80 bg-white border-l border-ash-border flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-ash-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-ink" />
          <span className="text-sm font-medium text-ink">AI Assist</span>
        </div>
        <button onClick={onClose} className="text-ink-muted hover:text-ink transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ash-border">
        {[
          { id: 'chat' as Tab, label: 'Chat', icon: Sparkles },
          { id: 'edit' as Tab, label: 'Edit', icon: Wand2 },
          { id: 'job' as Tab, label: 'Job Match', icon: FileSearch },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs transition-colors ${tab === id ? 'border-b-2 border-ink text-ink font-medium' : 'text-ink-muted hover:text-ink'}`}>
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] px-3 py-2 rounded-xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-ink text-white' : 'bg-ash text-ink'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && <div className="flex justify-start"><div className="bg-ash px-3 py-2 rounded-xl text-xs text-ink-muted animate-pulse">Thinking…</div></div>}
            </div>
            <div className="p-3 border-t border-ash-border flex gap-2">
              <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChat()}
                placeholder="Ask anything about your CV…"
                className="flex-1 px-3 py-2 text-xs border border-ash-border rounded-lg focus:outline-none focus:border-ink" />
              <button onClick={sendChat} disabled={loading || !chatInput.trim()}
                className="p-2 bg-ink text-white rounded-lg hover:bg-ink-light disabled:opacity-50 transition-colors">
                <Send size={13} />
              </button>
            </div>
          </>
        )}

        {tab === 'edit' && (
          <div className="p-4 space-y-4 flex-1">
            <p className="text-xs text-ink-muted">Write a plain-language instruction and the AI will update your entire CV accordingly.</p>
            <div className="space-y-2">
              {[
                'Make the summary more concise',
                'Strengthen the experience bullet points',
                'Remove all vague language',
                'Emphasise leadership roles',
              ].map((s) => (
                <button key={s} onClick={() => setEditInstruction(s)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg border border-ash-border hover:bg-ash transition-colors text-ink-muted">
                  "{s}"
                </button>
              ))}
            </div>
            <textarea
              value={editInstruction}
              onChange={(e) => setEditInstruction(e.target.value)}
              rows={4}
              placeholder="Or write your own instruction…"
              className="w-full px-3 py-2 text-xs border border-ash-border rounded-lg focus:outline-none focus:border-ink resize-none"
            />
            <button onClick={applyEdit} disabled={loading || !editInstruction.trim()}
              className="w-full py-2.5 bg-ink text-white text-xs font-medium rounded-lg hover:bg-ink-light disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              <Wand2 size={13} /> {loading ? 'Applying…' : 'Apply Edit'}
            </button>
          </div>
        )}

        {tab === 'job' && (
          <div className="p-4 space-y-4 flex-1 flex flex-col">
            <p className="text-xs text-ink-muted">Paste a job description below. The AI will align your CV's language and emphasis to the role — without fabricating anything.</p>
            <textarea
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              rows={10}
              placeholder="Paste job description here…"
              className="flex-1 w-full px-3 py-2 text-xs border border-ash-border rounded-lg focus:outline-none focus:border-ink resize-none"
            />
            <button onClick={matchJob} disabled={loading || !jobDesc.trim()}
              className="w-full py-2.5 bg-ink text-white text-xs font-medium rounded-lg hover:bg-ink-light disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              <FileSearch size={13} /> {loading ? 'Matching…' : 'Align to Job'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
