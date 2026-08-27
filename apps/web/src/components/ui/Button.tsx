import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'
import { type HTMLMotionProps, motion } from 'motion/react'
import { type ReactNode, forwardRef } from 'react'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: (string | undefined | null | boolean)[]) {
  return twMerge(clsx(inputs))
}

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'game'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  isLoading?: boolean
  children?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 font-display font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer'

    const sizeStyles = {
      sm: 'text-xs px-3 py-1.5 min-h-[32px]',
      md: 'text-sm px-4 py-2.5 min-h-[42px]',
      lg: 'text-base px-6 py-3 min-h-[50px]',
      xl: 'text-lg px-8 py-4 min-h-[60px] font-bold tracking-wide',
    }

    const variantStyles = {
      primary:
        'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30 focus-visible:ring-indigo-500',
      secondary:
        'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 focus-visible:ring-slate-400',
      outline:
        'bg-transparent hover:bg-slate-800/80 text-slate-200 border border-slate-700 focus-visible:ring-slate-400',
      ghost:
        'bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white focus-visible:ring-slate-400',
      danger:
        'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-lg shadow-red-500/25 border border-red-400/30 focus-visible:ring-red-500',
      success:
        'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-lg shadow-emerald-500/25 border border-emerald-400/30 focus-visible:ring-emerald-500',
      game: 'bg-slate-800/90 text-white font-black text-xl shadow-2xl border-2 border-white/20 active:translate-y-1',
    }

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.96 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        disabled={disabled || isLoading}
        className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {children}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'
