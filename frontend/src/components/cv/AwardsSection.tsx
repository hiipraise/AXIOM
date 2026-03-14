import { AwardItem, LanguageItem, VolunteerItem, EMPTY_AWARD, EMPTY_LANGUAGE, EMPTY_VOLUNTEER } from '../../types'
import { Field, Input, Textarea, SectionHeader, Card } from '../UI/FormElements'
import { Plus, Trash2 } from 'lucide-react'

// ---- AWARDS ----
interface AwardsProps { items: AwardItem[]; onChange: (v: AwardItem[]) => void }
export function AwardsSection({ items, onChange }: AwardsProps) {
  const add = () => onChange([...items, { ...EMPTY_AWARD }])
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const update = (i: number, patch: Partial<AwardItem>) => onChange(items.map((item, idx) => idx === i ? { ...item, ...patch } : item))
  return (
    <div className="space-y-5 animate-fade-in">
      <SectionHeader title="Awards & Recognition" action={<button onClick={add} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-ink text-white rounded-lg hover:bg-ink-light transition-colors"><Plus size={13} /> Add</button>} />
      {items.length === 0 && <div className="text-center py-10 border-2 border-dashed border-ash-border rounded-xl"><p className="text-sm text-ink-muted">No awards added</p></div>}
      {items.map((item, i) => (
        <Card key={i} className="space-y-3">
          <div className="flex justify-between"><p className="text-xs font-medium text-ink">Award {i + 1}</p><button onClick={() => remove(i)} className="text-ink-muted hover:text-red-500"><Trash2 size={14} /></button></div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Title"><Input value={item.title} onChange={(e) => update(i, { title: e.target.value })} placeholder="Best Paper Award" /></Field>
            <Field label="Issuer"><Input value={item.issuer} onChange={(e) => update(i, { issuer: e.target.value })} placeholder="IEEE" /></Field>
          </div>
          <Field label="Date"><Input value={item.date} onChange={(e) => update(i, { date: e.target.value })} placeholder="Nov 2023" /></Field>
          <Field label="Description"><Textarea value={item.description} onChange={(e) => update(i, { description: e.target.value })} rows={2} /></Field>
        </Card>
      ))}
    </div>
  )
}
export default AwardsSection

// ---- LANGUAGES ----
interface LangProps { items: LanguageItem[]; onChange: (v: LanguageItem[]) => void }
export function LanguagesSection({ items, onChange }: LangProps) {
  const add = () => onChange([...items, { ...EMPTY_LANGUAGE }])
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const update = (i: number, patch: Partial<LanguageItem>) => onChange(items.map((item, idx) => idx === i ? { ...item, ...patch } : item))
  const levels = ['Native', 'Fluent', 'Conversational', 'Basic']
  return (
    <div className="space-y-5 animate-fade-in">
      <SectionHeader title="Languages" action={<button onClick={add} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-ink text-white rounded-lg hover:bg-ink-light transition-colors"><Plus size={13} /> Add</button>} />
      {items.length === 0 && <div className="text-center py-10 border-2 border-dashed border-ash-border rounded-xl"><p className="text-sm text-ink-muted">No languages added</p></div>}
      {items.map((item, i) => (
        <Card key={i} className="flex items-center gap-4">
          <Field label="Language"><Input value={item.language} onChange={(e) => update(i, { language: e.target.value })} placeholder="English" /></Field>
          <Field label="Proficiency">
            <select value={item.proficiency} onChange={(e) => update(i, { proficiency: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-ash-border rounded-lg focus:outline-none focus:border-ink bg-white">
              <option value="">Select…</option>
              {levels.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
          <button onClick={() => remove(i)} className="text-ink-muted hover:text-red-500 mt-5"><Trash2 size={14} /></button>
        </Card>
      ))}
    </div>
  )
}

// ---- VOLUNTEER ----
interface VolProps { items: VolunteerItem[]; onChange: (v: VolunteerItem[]) => void }
export function VolunteerSection({ items, onChange }: VolProps) {
  const add = () => onChange([...items, { ...EMPTY_VOLUNTEER }])
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const update = (i: number, patch: Partial<VolunteerItem>) => onChange(items.map((item, idx) => idx === i ? { ...item, ...patch } : item))
  return (
    <div className="space-y-5 animate-fade-in">
      <SectionHeader title="Volunteer & Community" action={<button onClick={add} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-ink text-white rounded-lg hover:bg-ink-light transition-colors"><Plus size={13} /> Add</button>} />
      {items.length === 0 && <div className="text-center py-10 border-2 border-dashed border-ash-border rounded-xl"><p className="text-sm text-ink-muted">No volunteer work added</p></div>}
      {items.map((item, i) => (
        <Card key={i} className="space-y-3">
          <div className="flex justify-between"><p className="text-xs font-medium text-ink">Entry {i + 1}</p><button onClick={() => remove(i)} className="text-ink-muted hover:text-red-500"><Trash2 size={14} /></button></div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role"><Input value={item.role} onChange={(e) => update(i, { role: e.target.value })} placeholder="Mentor" /></Field>
            <Field label="Organization"><Input value={item.organization} onChange={(e) => update(i, { organization: e.target.value })} placeholder="Code for Africa" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start"><Input value={item.start_date} onChange={(e) => update(i, { start_date: e.target.value })} placeholder="Jan 2023" /></Field>
            <Field label="End"><Input value={item.end_date} onChange={(e) => update(i, { end_date: e.target.value })} placeholder="Present" /></Field>
          </div>
          <Field label="Description"><Textarea value={item.description} onChange={(e) => update(i, { description: e.target.value })} rows={2} /></Field>
        </Card>
      ))}
    </div>
  )
}
