import { ButtonHTMLAttributes, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
  /** Accessibility label required for icon-only buttons */
  'aria-label'?: string
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-white hover:bg-ink-light active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2',
  secondary: 'border border-ink-20 text-ink hover:bg-ink-5 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2',
  ghost: 'text-ink-muted hover:bg-ink-5 hover:text-ink active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2',
  danger: 'bg-error-500 text-white hover:bg-error-700 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-error-500 focus-visible:ring-offset-2',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-5 py-3 text-sm gap-2',
}

const iconSizes: Record<ButtonSize, number> = {
  sm: 14,
  md: 16,
  lg: 18,
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon: Icon,
      iconPosition = 'left',
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          variantStyles[variant],
          sizeStyles[size],
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {loading ? (
          <Loader2 size={iconSizes[size]} className="animate-spin" />
        ) : Icon && iconPosition === 'left' ? (
          <Icon size={iconSizes[size]} />
        ) : null}
        {children}
        {!loading && Icon && iconPosition === 'right' ? (
          <Icon size={iconSizes[size]} />
        ) : null}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button