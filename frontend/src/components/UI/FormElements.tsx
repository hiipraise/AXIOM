import { ReactNode } from 'react'

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

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
export function Textarea({ className = '', ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-2 text-sm border border-ash-border rounded-lg focus:outline-none focus:border-ink bg-white resize-none placeholder:text-ink-muted/50 ${className}`}
    />
  )
}

interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}
export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h2 className="font-display font-semibold text-base text-ink">{title}</h2>
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
