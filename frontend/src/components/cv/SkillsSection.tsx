import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { SectionHeader, Card } from '../UI/FormElements'

interface Props {
  skills: string[]
  onChange: (v: string[]) => void
}

export default function SkillsSection({ skills, onChange }: Props) {
  const [input, setInput] = useState('')

  const addSkill = () => {
    const trimmed = input.trim()
    if (!trimmed || skills.includes(trimmed)) return
    onChange([...skills, trimmed])
    setInput('')
  }

  const removeSkill = (s: string) => onChange(skills.filter((x) => x !== s))

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill() }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <SectionHeader title="Skills" subtitle="Plain list only — no ratings, no bars, no levels (ATS requirement)" />
      <Card className="space-y-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a skill and press Enter or comma"
            className="flex-1 px-3 py-2 text-sm border border-ash-border rounded-lg focus:outline-none focus:border-ink"
          />
          <button onClick={addSkill} disabled={!input.trim()}
            className="px-4 py-2 bg-ink text-white text-xs rounded-lg hover:bg-ink-light disabled:opacity-50 transition-colors">
            <Plus size={14} />
          </button>
        </div>
        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <span key={s} className="flex items-center gap-1.5 px-2.5 py-1 bg-ash text-xs text-ink rounded-lg border border-ash-border">
                {s}
                <button onClick={() => removeSkill(s)} className="text-ink-muted hover:text-red-500 transition-colors">
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-ink-muted italic">No skills added yet. Type above and press Enter.</p>
        )}
        <p className="text-[10px] text-ink-muted">These will appear as a plain comma-separated list on the CV — exactly as ATS systems need them.</p>
      </Card>
    </div>
  )
}
