import { motion } from 'motion/react'
import type { ReactNode } from 'react'

interface ShakeFeedbackProps {
  trigger: boolean | number
  children: ReactNode
  className?: string
}

export function ShakeFeedback({ trigger, children, className = '' }: ShakeFeedbackProps) {
  return (
    <motion.div
      key={typeof trigger === 'boolean' ? String(trigger) : trigger}
      animate={
        trigger
          ? {
              x: [0, -10, 10, -8, 8, -4, 4, 0],
              transition: { duration: 0.45, ease: 'easeInOut' },
            }
          : {}
      }
      className={className}
    >
      {children}
    </motion.div>
  )
}
