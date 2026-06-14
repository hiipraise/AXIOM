import { HTMLAttributes, forwardRef } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'outline'
type BadgeSize = 'xs' | 'sm'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: BadgeSize
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-ash-10 text-ink-muted',
  success: 'bg-success-50 text-success-700 border border-success-100',
  warning: 'bg-warning-50 text-warning-700 border border-warning-100',
  error: 'bg-error-50 text-error-700 border border-error-100',
  outline: 'bg-white text-ink-muted border border-ink-20',
}

const sizeStyles: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2 py-0.5 text-xs',
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'default',
      size = 'sm',
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={[
          'inline-flex items-center rounded-full font-medium transition-colors',
          variantStyles[variant],
          sizeStyles[size],
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export default Badge