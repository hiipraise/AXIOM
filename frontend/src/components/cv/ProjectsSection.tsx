import { ProjectItem, EMPTY_PROJECT } from '../../types'
import { Field, Input, Textarea, SectionHeader, Card } from '../UI/FormElements'
import { Plus, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react'
import { useState } from 'react'

interface Props { items: ProjectItem[]; onChange: (v: ProjectItem[]) => void }

export default function ProjectsSection({ items, onChange }: Props) {
  const [expanded, setExpanded] = useState<number | null>(0)
  const [techInput, setTechInput] = useState<Record<number, string>>({})
  const add = () => { const n = [...items, { ...EMPTY_PROJECT }]; onChange(n); setExpanded(n.length - 1) }
  const remove = (i: number) => { onChange(items.filter((_, idx) => idx !== i)); setExpanded(null) }
  const update = (i: number, patch: Partial<ProjectItem>) => onChange(items.map((item, idx) => idx === i ? { ...item, ...patch } : item))

  const addTech = (i: number) => {
    const val = (techInput[i] || '').trim()
    if (!val) return
    update(i, { technologies: [...items[i].technologies, val] })
    setTechInput((prev) => ({ ...prev, [i]: '' }))
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <SectionHeader title="Projects" subtitle="Personal, open-source, or client work"
        action={<button onClick={add} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-ink text-white rounded-lg hover:bg-ink-light transition-colors"><Plus size={13} /> Add</button>} />
      {items.length === 0 && <div className="text-center py-10 border-2 border-dashed border-ash-border rounded-xl"><p className="text-sm text-ink-muted">No projects added</p><button onClick={add} className="mt-3 text-xs text-ink underline">Add one</button></div>}
      {items.map((item, i) => (
        <Card key={i} className="!p-0 overflow-hidden">
          <button onClick={() => setExpanded(expanded === i ? null : i)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-ash transition-colors">
            <p className="text-sm font-medium text-ink">{item.name || 'Untitled Project'}</p>
            <div className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); remove(i) }} className="p-1 text-ink-muted hover:text-red-500"><Trash2 size={14} /></button>
              {expanded === i ? <ChevronUp size={16} className="text-ink-muted" /> : <ChevronDown size={16} className="text-ink-muted" />}
            </div>
          </button>
          {expanded === i && (
            <div className="px-5 pb-5 space-y-4 border-t border-ash-border pt-4">
              <Field label="Project Name"><Input value={item.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Open Source CLI Tool" /></Field>
              <Field label="Description"><Textarea value={item.description} onChange={(e) => update(i, { description: e.target.value })} rows={3} placeholder="What it does, scale, outcomes" /></Field>
              <div>
                <label className="text-xs font-medium text-ink block mb-2">Technologies</label>
                <div className="flex gap-2 mb-2">
                  <input value={techInput[i] || ''} onChange={(e) => setTechInput((p) => ({ ...p, [i]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTech(i))}
                    className="flex-1 px-3 py-2 text-xs border border-ash-border rounded-lg focus:outline-none focus:border-ink" placeholder="e.g. TypeScript" />
                  <button onClick={() => addTech(i)} className="px-3 py-2 bg-ink text-white text-xs rounded-lg hover:bg-ink-light transition-colors"><Plus size={12} /></button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {item.technologies.map((t) => (
                    <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-ash text-xs text-ink rounded border border-ash-border">
                      {t}<button onClick={() => update(i, { technologies: item.technologies.filter((x) => x !== t) })} className="text-ink-muted hover:text-red-500"><X size={10} /></button>
                    </span>
                  ))}
                </div>
              </div>
              <Field label="URL"><Input type="url" value={item.url} onChange={(e) => update(i, { url: e.target.value })} placeholder="https://github.com/you/project" /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Start"><Input value={item.start_date} onChange={(e) => update(i, { start_date: e.target.value })} placeholder="Jan 2023" /></Field>
                <Field label="End"><Input value={item.end_date} onChange={(e) => update(i, { end_date: e.target.value })} placeholder="Mar 2023" /></Field>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}
