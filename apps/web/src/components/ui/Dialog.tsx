import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { X } from '../../lib/icons'
import { cn } from './Button'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  className?: string
}
export function Dialog({ open, onOpenChange, title, description, children, className }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm"
              />
            </DialogPrimitive.Overlay>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 pointer-events-none">
              <DialogPrimitive.Content asChild>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  className={cn(
                    'pointer-events-auto relative w-full max-w-lg rounded-2xl bg-surface border border-line p-4 sm:p-6 max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain shadow-2xl text-foreground',
                    className
                  )}
                >
                  <div className="flex items-start justify-between gap-3 pb-4 border-b border-line">
                    <div className="min-w-0">
                      <DialogPrimitive.Title className="font-display font-bold text-xl text-foreground">
                        {title}
                      </DialogPrimitive.Title>
                      <DialogPrimitive.Description
                        className={description ? 'text-sm text-muted mt-2 leading-relaxed' : 'sr-only'}
                      >
                        {description || title}
                      </DialogPrimitive.Description>
                    </div>
                    <DialogPrimitive.Close
                      aria-label="Cerrar diálogo"
                      className="shrink-0 rounded-xl p-3 text-muted hover:text-foreground hover:bg-elevated"
                    >
                      <X className="w-5 h-5" />
                    </DialogPrimitive.Close>
                  </div>
                  <div className="mt-5">{children}</div>
                </motion.div>
              </DialogPrimitive.Content>
            </div>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}
