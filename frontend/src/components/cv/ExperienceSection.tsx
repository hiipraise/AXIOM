import { ExperienceItem, EMPTY_EXPERIENCE } from '../../types'
import { Field, Input, Textarea, SectionHeader, Card } from '../UI/FormElements'
import { Plus, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react'
import { useState } from 'react'

interface Props {
  items: ExperienceItem[]
  onChange: (v: ExperienceItem[]) => void
}

export default function ExperienceSection({ items, onChange }: Props) {
  const [expanded, setExpanded] = useState<number | null>(items.length > 0 ? 0 : null)

  const add = () => {
    const newItems = [...items, { ...EMPTY_EXPERIENCE }]
    onChange(newItems)
    setExpanded(newItems.length - 1)
  }

  const remove = (i: number) => {
    onChange(items.filter((_, idx) => idx !== i))
    setExpanded(null)
  }

  const update = (i: number, patch: Partial<ExperienceItem>) =>
    onChange(items.map((item, idx) => (idx === i ? { ...item, ...patch } : item)))

  const addAchievement = (i: number) =>
    update(i, { achievements: [...items[i].achievements, ''] })

  const updateAchievement = (i: number, ai: number, val: string) =>
    update(i, { achievements: items[i].achievements.map((a, idx) => (idx === ai ? val : a)) })

  const removeAchievement = (i: number, ai: number) =>
    update(i, { achievements: items[i].achievements.filter((_, idx) => idx !== ai) })

  return (
    <div className="space-y-5 animate-fade-in">
      <SectionHeader
        title="Work Experience"
        subtitle="List roles with concrete outcomes — use numbers where possible"
        action={
          <button onClick={add} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-ink text-white rounded-lg hover:bg-ink-light transition-colors">
            <Plus size={13} /> Add Role
          </button>
        }
      />
      {items.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed border-ash-border rounded-xl">
          <p className="text-sm text-ink-muted">No experience added yet</p>
          <button onClick={add} className="mt-3 text-xs text-ink underline">Add your first role</button>
        </div>
      )}
      {items.map((item, i) => (
        <Card key={i} className="!p-0 overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === i ? null : i)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-ash transition-colors"
          >
            <div className="text-left">
              <p className="text-sm font-medium text-ink">{item.role || 'Untitled Role'}</p>
              <p className="text-xs text-ink-muted">{item.company || 'Company'}{item.start_date ? ` · ${item.start_date}–${item.current ? 'Present' : item.end_date}` : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); remove(i) }} className="p-1 text-ink-muted hover:text-red-500 transition-colors">
                <Trash2 size={14} />
              </button>
              {expanded === i ? <ChevronUp size={16} className="text-ink-muted" /> : <ChevronDown size={16} className="text-ink-muted" />}
            </div>
          </button>
          {expanded === i && (
            <div className="px-5 pb-5 space-y-4 border-t border-ash-border pt-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Job Title" required>
                  <Input value={item.role} onChange={(e) => update(i, { role: e.target.value })} placeholder="Software Engineer" />
                </Field>
                <Field label="Company" required>
                  <Input value={item.company} onChange={(e) => update(i, { company: e.target.value })} placeholder="Acme Corp" />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Start Date">
                  <Input value={item.start_date} onChange={(e) => update(i, { start_date: e.target.value })} placeholder="Jan 2022" />
                </Field>
                <Field label="End Date">
                  <Input value={item.end_date} onChange={(e) => update(i, { end_date: e.target.value })} placeholder="Dec 2024" disabled={item.current} />
                </Field>
                <Field label="Current">
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={item.current} onChange={(e) => update(i, { current: e.target.checked })} className="rounded" />
                    <span className="text-xs text-ink-muted">Still here</span>
                  </label>
                </Field>
              </div>
              <Field label="Description" hint="Describe your responsibilities in specific, measurable terms">
                <Textarea value={item.description} onChange={(e) => update(i, { description: e.target.value })} rows={3} placeholder="What did you actually do? What changed because of your work?" />
              </Field>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-ink">Key Achievements</label>
                  <button onClick={() => addAchievement(i)} className="text-xs text-ink underline">+ Add</button>
                </div>
                {item.achievements.map((a, ai) => (
                  <div key={ai} className="flex gap-2 mb-2">
                    <Input value={a} onChange={(e) => updateAchievement(i, ai, e.target.value)} placeholder="Reduced deployment time by 40% by rewriting the CI pipeline" />
                    <button onClick={() => removeAchievement(i, ai)} className="p-2 text-ink-muted hover:text-red-500 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {item.achievements.length === 0 && (
                  <p className="text-xs text-ink-muted italic">Add bullet-point achievements — use numbers and named tools</p>
                )}
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}
