import { type HTMLMotionProps, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from './Button'

export interface CardProps extends HTMLMotionProps<'div'> {
  hoverEffect?: boolean
  children: ReactNode
}

export function Card({ className, hoverEffect = false, children, ...props }: CardProps) {
  const base =
    'rounded-2xl bg-slate-900/70 backdrop-blur-xl border border-slate-800/80 shadow-xl p-4 sm:p-6 text-slate-100 transition-colors'

  if (hoverEffect) {
    return (
      <motion.div
        whileHover={{ y: -4, borderColor: 'rgba(139, 92, 246, 0.4)' }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className={cn(base, 'cursor-pointer hover:shadow-indigo-500/10 hover:shadow-2xl', className)}
        {...props}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <div className={cn(base, className)} {...(props as React.HTMLAttributes<HTMLDivElement>)}>
      {children}
    </div>
  )
}
