import { type InputHTMLAttributes, forwardRef, useId } from 'react'
import { cn } from './Button'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, error, ...props }, ref) => {
  const generatedId = useId()
  const errorId = `${props.id || generatedId}-error`
  return (
    <div className="w-full">
      <input
        ref={ref}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? errorId : props['aria-describedby']}
        className={cn(
          'w-full px-4 py-2.5 rounded-xl bg-canvas/80 border border-line/80 text-foreground placeholder-muted font-medium text-sm transition-all focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20',
          className
        )}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-danger font-medium">
          {error}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'
