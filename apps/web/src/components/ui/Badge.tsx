import type { ReactNode } from 'react'
import { cn } from './Button'

interface BadgeProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline'
  className?: string
  children: ReactNode
}

export function Badge({ variant = 'primary', className, children }: BadgeProps) {
  const variants = {
    primary: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    secondary: 'bg-slate-800 text-slate-300 border-slate-700',
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    danger: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    outline: 'bg-transparent text-slate-300 border-slate-700',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide select-none',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
