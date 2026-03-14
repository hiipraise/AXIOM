import { useState } from 'react'
import { cvApi } from '../../api'
import { CVData } from '../../types'
import { Field, Textarea, SectionHeader, Card } from '../UI/FormElements'
import { Wand2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  value: string
  jobDesc: string
  onChange: (v: string) => void
  onJobDescChange: (v: string) => void
  cvData: CVData
}

export default function SummarySection({ value, jobDesc, onChange, onJobDescChange, cvData }: Props) {
  const [generating, setGenerating] = useState(false)

  const generateSummary = async () => {
    setGenerating(true)
    try {
      const res = await cvApi.aiGenerateSummary(cvData)
      onChange(res.summary)
      toast.success('Summary generated')
    } catch {
      toast.error('AI unavailable')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <SectionHeader title="Professional Summary" subtitle="A concise, factual overview of your career — no filler phrases" />
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-ink">Profile Summary</label>
          <button onClick={generateSummary} disabled={generating}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-ink text-white hover:bg-ink-light disabled:opacity-50 transition-colors">
            <Wand2 size={12} /> {generating ? 'Generating…' : 'AI Generate'}
          </button>
        </div>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          placeholder="Describe your career in concrete terms. Use specific job titles, years of experience, and measurable achievements."
        />
        <p className="text-[10px] text-ink-muted">Tip: Avoid "passionate about" or "results-driven" — state what you actually did and the scale of it.</p>
      </Card>
      <Card className="space-y-3">
        <Field label="Job Description (optional)" hint="Paste a job description here to align your CV language to the role. AI will match your experience without fabricating anything.">
          <Textarea
            value={jobDesc}
            onChange={(e) => onJobDescChange(e.target.value)}
            rows={6}
            placeholder="Paste the job description you're applying for…"
          />
        </Field>
      </Card>
    </div>
  )
}
