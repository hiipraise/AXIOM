import { ReactNode } from 'react'
import { Link } from 'lucide-react'
import { countWords, estimateReadingTime } from '../../lib/wordCount'

interface FieldProps {
  label: string
  required?: boolean
  hint?: string
  children: ReactNode
}
export function Field({ label, required, hint, children }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-ink-muted mt-1">{hint}</p>}
    </div>
  )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 text-sm border border-ash-border rounded-lg focus:outline-none focus:border-ink bg-white placeholder:text-ink-muted/50 ${className}`}
    />
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** If set, shows word count below the textarea */
  showWordCount?: boolean
}
export function Textarea({ showWordCount, className = '', spellCheck = true, ...props }: TextareaProps) {
  const wc = showWordCount && props.value ? countWords(props.value as string) : 0
  return (
    <div>
      <textarea
        {...props}
        className={`w-full px-3 py-2 text-sm border border-ash-border rounded-lg focus:outline-none focus:border-ink bg-white resize-none placeholder:text-ink-muted/50 ${className}`}
      />
      {showWordCount && typeof props.value === 'string' && (
        <p className="text-[10px] text-ink-muted mt-1 text-right">
          {wc} words · {estimateReadingTime(wc)} read
        </p>
      )}
    </div>
  )
}

interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  /** Word count for the section — shown as a small badge */
  wordCount?: number
}
export function SectionHeader({ title, subtitle, action, wordCount }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-display font-semibold text-base text-ink">{title}</h2>
          {wordCount !== undefined && wordCount > 0 && (
            <span className="text-[10px] text-ink-muted bg-ash px-2 py-0.5 rounded-full whitespace-nowrap">
              {wordCount} words · {estimateReadingTime(wordCount)}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

interface CardProps {
  children: ReactNode
  className?: string
}
export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white border border-ash-border rounded-xl p-5 ${className}`}>
      {children}
    </div>
  )
}

export function Divider() {
  return <div className="border-t border-ash-border my-4" />
}

/**
 * Minimal markdown formatting toolbar.
 * Inserts markdown syntax around selection or at cursor.
 * When nothing is selected, uses placeholder text that gets auto-selected.
 */
interface MarkdownToolbarProps {
  onInsert: (before: string, after: string, placeholder?: string) => void
}
export function MarkdownToolbar({ onInsert }: MarkdownToolbarProps) {
  const btns: { label: ReactNode; title: string; before: string; after: string; placeholder?: string }[] = [
    { label: 'B', title: 'Bold', before: '**', after: '**', placeholder: 'bold text' },
    { label: 'I', title: 'Italic', before: '_', after: '_', placeholder: 'italic text' },
    { label: '•', title: 'Bullet list', before: '\n- ', after: '', placeholder: 'bullet point' },
    { label: <Link size={13} />, title: 'Link', before: '[', after: '](url)', placeholder: 'link text' },
  ]
  return (
    <div className="flex items-center gap-1 mb-1.5">
      {btns.map(({ label, title, before, after, placeholder }) => (
        <button
          key={title}
          type="button"
          title={title}
          onClick={(e) => {
            e.preventDefault()
            onInsert(before, after, placeholder)
          }}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-ash text-ink-muted hover:text-ink transition-colors">
          {label}
        </button>
      ))}
      <span className="text-[9px] text-ink-muted ml-1">Markdown</span>
    </div>
  )
}
