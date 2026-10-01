import { clsx } from 'clsx'
import { type HTMLMotionProps, motion } from 'motion/react'
import { type ReactNode, forwardRef, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { usePendingMutation } from '../../lib/api'
import { Loader2 } from '../../lib/icons'

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
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading,
      disabled,
      children,
      onClick,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const [pending, setPending] = useState(false)
    const pendingRef = useRef(false)
    const mutationPending = usePendingMutation()
    const busy = isLoading || pending || (type === 'submit' && mutationPending)
    const baseStyles =
      'inline-flex max-w-full min-w-0 items-center justify-center gap-2 break-words font-display font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer'

    const sizeStyles = {
      sm: 'text-xs px-3 py-1.5 min-h-[44px]',
      md: 'text-sm px-4 py-2.5 min-h-[44px]',
      lg: 'text-base px-6 py-3 min-h-[50px]',
      xl: 'text-lg px-8 py-4 min-h-[60px] font-bold tracking-wide',
    }

    const variantStyles = {
      primary:
        'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-on-accent shadow-lg shadow-indigo-500/25 border border-indigo-400/30 focus-visible:ring-indigo-500',
      secondary:
        'bg-elevated hover:bg-selected text-foreground border border-line focus-visible:ring-slate-400',
      outline:
        'bg-transparent hover:bg-elevated/80 text-foreground border border-line focus-visible:ring-slate-400',
      ghost:
        'bg-transparent hover:bg-elevated/60 text-secondary hover:text-foreground focus-visible:ring-slate-400',
      danger:
        'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-on-accent shadow-lg shadow-red-500/25 border border-red-400/30 focus-visible:ring-red-500',
      success:
        'bg-gradient-to-r from-emerald-700 to-green-700 hover:from-emerald-800 hover:to-green-800 text-on-accent shadow-lg shadow-emerald-500/25 border border-emerald-400/30 focus-visible:ring-emerald-500',
      game: 'bg-elevated/90 text-foreground font-black text-xl shadow-2xl border-2 border-white/20 active:translate-y-1',
    }

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || busy ? 1 : 1.02 }}
        whileTap={{ scale: disabled || busy ? 1 : 0.96 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        disabled={disabled || busy}
        type={type}
        aria-busy={busy || undefined}
        onClick={async (event) => {
          if (pendingRef.current || !onClick) return
          pendingRef.current = true
          setPending(true)
          try {
            await onClick(event)
          } finally {
            pendingRef.current = false
            setPending(false)
          }
        }}
        className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        {...props}
      >
        {busy && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {children}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'
