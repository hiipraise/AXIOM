import { CertificationItem, EMPTY_CERT } from '../../types'
import { Field, Input, SectionHeader, Card } from '../UI/FormElements'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface Props { items: CertificationItem[]; onChange: (v: CertificationItem[]) => void }

export default function CertificationsSection({ items, onChange }: Props) {
  const [expanded, setExpanded] = useState<number | null>(0)
  const add = () => { const n = [...items, { ...EMPTY_CERT }]; onChange(n); setExpanded(n.length - 1) }
  const remove = (i: number) => { onChange(items.filter((_, idx) => idx !== i)); setExpanded(null) }
  const update = (i: number, patch: Partial<CertificationItem>) => onChange(items.map((item, idx) => idx === i ? { ...item, ...patch } : item))

  return (
    <div className="space-y-5 animate-fade-in">
      <SectionHeader title="Certifications & Training" subtitle="Include verification URLs for credibility"
        action={<button onClick={add} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-ink text-white rounded-lg hover:bg-ink-light transition-colors"><Plus size={13} /> Add</button>} />
      {items.length === 0 && <div className="text-center py-10 border-2 border-dashed border-ash-border rounded-xl"><p className="text-sm text-ink-muted">No certifications added</p><button onClick={add} className="mt-3 text-xs text-ink underline">Add one</button></div>}
      {items.map((item, i) => (
        <Card key={i} className="!p-0 overflow-hidden">
          <button onClick={() => setExpanded(expanded === i ? null : i)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-ash transition-colors">
            <div className="text-left">
              <p className="text-sm font-medium text-ink">{item.name || 'Untitled Certification'}</p>
              <p className="text-xs text-ink-muted">{item.issuer || 'Issuer'}{item.date ? ` · ${item.date}` : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); remove(i) }} className="p-1 text-ink-muted hover:text-red-500"><Trash2 size={14} /></button>
              {expanded === i ? <ChevronUp size={16} className="text-ink-muted" /> : <ChevronDown size={16} className="text-ink-muted" />}
            </div>
          </button>
          {expanded === i && (
            <div className="px-5 pb-5 space-y-4 border-t border-ash-border pt-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Certification Name"><Input value={item.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="AWS Solutions Architect" /></Field>
                <Field label="Issuing Body"><Input value={item.issuer} onChange={(e) => update(i, { issuer: e.target.value })} placeholder="Amazon Web Services" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date Issued"><Input value={item.date} onChange={(e) => update(i, { date: e.target.value })} placeholder="Mar 2024" /></Field>
                <Field label="Expiry"><Input value={item.expiry} onChange={(e) => update(i, { expiry: e.target.value })} placeholder="Mar 2027" /></Field>
              </div>
              <Field label="Credential ID"><Input value={item.credential_id} onChange={(e) => update(i, { credential_id: e.target.value })} placeholder="ABC-123-XYZ" /></Field>
              <Field label="Verification URL" hint="Link to the credential on the issuer's website"><Input type="url" value={item.url} onChange={(e) => update(i, { url: e.target.value })} placeholder="https://credly.com/badges/…" /></Field>
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}
