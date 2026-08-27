import { type InputHTMLAttributes, forwardRef } from 'react'
import { cn } from './Button'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, error, ...props }, ref) => {
  return (
    <div className="w-full">
      <input
        ref={ref}
        className={cn(
          'w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-slate-100 placeholder-slate-500 font-medium text-sm transition-all focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-rose-400 font-medium">{error}</p>}
    </div>
  )
})

Input.displayName = 'Input'
