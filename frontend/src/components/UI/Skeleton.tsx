import { HTMLAttributes } from 'react'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
  ...props
}: SkeletonProps) {
  const baseStyles = 'animate-pulse bg-ash-20'

  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  }

  const defaultHeights = {
    text: 'h-4',
    circular: 'h-10',
    rectangular: 'h-24',
  }

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${defaultHeights[variant]} ${className}`}
      style={{
        width: width ?? (variant === 'circular' ? '40px' : undefined),
        height: height ?? (variant === 'circular' ? '40px' : undefined),
      }}
      {...props}
    />
  )
}

interface SkeletonGroupProps {
  rows?: number
  className?: string
  children?: React.ReactNode
}

export function SkeletonGroup({
  rows = 3,
  className = '',
  children,
}: SkeletonGroupProps) {
  if (children) {
    return <div className={`space-y-2 ${className}`}>{children}</div>
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} />
      ))}
    </div>
  )
}

export default Skeleton