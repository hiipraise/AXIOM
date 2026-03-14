import { EducationItem, EMPTY_EDUCATION } from '../../types'
import { Field, Input, Textarea, SectionHeader, Card } from '../UI/FormElements'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface Props { items: EducationItem[]; onChange: (v: EducationItem[]) => void }

export default function EducationSection({ items, onChange }: Props) {
  const [expanded, setExpanded] = useState<number | null>(0)
  const add = () => { const n = [...items, { ...EMPTY_EDUCATION }]; onChange(n); setExpanded(n.length - 1) }
  const remove = (i: number) => { onChange(items.filter((_, idx) => idx !== i)); setExpanded(null) }
  const update = (i: number, patch: Partial<EducationItem>) => onChange(items.map((item, idx) => idx === i ? { ...item, ...patch } : item))

  return (
    <div className="space-y-5 animate-fade-in">
      <SectionHeader title="Education" subtitle="Degrees, diplomas, courses"
        action={<button onClick={add} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-ink text-white rounded-lg hover:bg-ink-light transition-colors"><Plus size={13} /> Add</button>} />
      {items.length === 0 && <div className="text-center py-10 border-2 border-dashed border-ash-border rounded-xl"><p className="text-sm text-ink-muted">No education added</p><button onClick={add} className="mt-3 text-xs text-ink underline">Add entry</button></div>}
      {items.map((item, i) => (
        <Card key={i} className="!p-0 overflow-hidden">
          <button onClick={() => setExpanded(expanded === i ? null : i)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-ash transition-colors">
            <div className="text-left">
              <p className="text-sm font-medium text-ink">{item.degree || 'Untitled Degree'}{item.field ? `, ${item.field}` : ''}</p>
              <p className="text-xs text-ink-muted">{item.institution || 'Institution'}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); remove(i) }} className="p-1 text-ink-muted hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
              {expanded === i ? <ChevronUp size={16} className="text-ink-muted" /> : <ChevronDown size={16} className="text-ink-muted" />}
            </div>
          </button>
          {expanded === i && (
            <div className="px-5 pb-5 space-y-4 border-t border-ash-border pt-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Degree"><Input value={item.degree} onChange={(e) => update(i, { degree: e.target.value })} placeholder="Bachelor of Science" /></Field>
                <Field label="Field of Study"><Input value={item.field} onChange={(e) => update(i, { field: e.target.value })} placeholder="Computer Science" /></Field>
              </div>
              <Field label="Institution"><Input value={item.institution} onChange={(e) => update(i, { institution: e.target.value })} placeholder="University of Lagos" /></Field>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Start Date"><Input value={item.start_date} onChange={(e) => update(i, { start_date: e.target.value })} placeholder="Sep 2018" /></Field>
                <Field label="End Date"><Input value={item.end_date} onChange={(e) => update(i, { end_date: e.target.value })} placeholder="Jun 2022" /></Field>
                <Field label="Grade / GPA"><Input value={item.grade} onChange={(e) => update(i, { grade: e.target.value })} placeholder="First Class" /></Field>
              </div>
              <Field label="Notes"><Textarea value={item.description} onChange={(e) => update(i, { description: e.target.value })} rows={2} placeholder="Dissertation, notable modules, awards…" /></Field>
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}
