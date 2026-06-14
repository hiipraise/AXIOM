import { HTMLAttributes, forwardRef } from 'react'

type CardVariant = 'default' | 'elevated' | 'ghost'
type CardSize = 'sm' | 'md' | 'lg'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  size?: CardSize
  hover?: boolean
}

const variantStyles: Record<CardVariant, string> = {
  default: 'border border-ink-20 bg-white',
  elevated: 'border border-ink-20 bg-white shadow-card-hover',
  ghost: 'bg-transparent',
}

const variantHoverStyles: Record<CardVariant, string> = {
  default: 'hover:border-ink-30 hover:shadow-card',
  elevated: 'hover:shadow-card-hover',
  ghost: 'hover:bg-ash-5',
}

const sizeStyles: Record<CardSize, string> = {
  sm: 'p-3 rounded-xl',
  md: 'p-4 rounded-xl',
  lg: 'p-6 rounded-2xl',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      size = 'md',
      hover = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={[
          'transition-all duration-200',
          variantStyles[variant],
          sizeStyles[size],
          hover && variantHoverStyles[variant],
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className = '', children, ...props }, ref) => (
  <div
    ref={ref}
    className={`flex items-center justify-between gap-3 border-b border-ink-20 px-5 py-4 ${className}`}
    {...props}
  >
    {children}
  </div>
))

CardHeader.displayName = 'CardHeader'

export const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className = '', children, ...props }, ref) => (
  <div ref={ref} className={`p-5 ${className}`} {...props}>
    {children}
  </div>
))

CardContent.displayName = 'CardContent'

export const CardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className = '', children, ...props }, ref) => (
  <div
    ref={ref}
    className={`flex items-center gap-2 px-5 py-4 ${className}`}
    {...props}
  >
    {children}
  </div>
))

CardFooter.displayName = 'CardFooter'

export default Card