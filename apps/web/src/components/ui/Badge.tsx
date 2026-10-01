import type { ReactNode } from 'react'
import { cn } from './Button'

interface BadgeProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline'
  className?: string
  children: ReactNode
}

export function Badge({ variant = 'primary', className, children }: BadgeProps) {
  const variants = {
    primary: 'bg-indigo-500/15 text-accent border-indigo-500/30',
    secondary: 'bg-elevated text-secondary border-line',
    success: 'bg-emerald-500/15 text-success border-emerald-500/30',
    warning: 'bg-amber-500/15 text-warning border-amber-500/30',
    danger: 'bg-rose-500/15 text-danger border-rose-500/30',
    outline: 'bg-transparent text-secondary border-line',
  }

  return (
    <span
      className={cn(
        'inline-flex max-w-full min-w-0 items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide select-none break-words',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
