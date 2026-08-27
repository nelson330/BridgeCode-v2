import { motion, useSpring, useTransform } from 'motion/react'
import { useEffect, useRef } from 'react'

interface AnimatedCounterProps {
  value: number
  className?: string
  prefix?: string
  suffix?: string
}

export function AnimatedCounter({ value, className = '', prefix = '', suffix = '' }: AnimatedCounterProps) {
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 })
  const display = useTransform(spring, (current) => Math.round(current).toLocaleString())
  const prevValue = useRef(value)

  useEffect(() => {
    spring.set(value)
    prevValue.current = value
  }, [value, spring])

  return (
    <motion.span
      key={value}
      initial={{ scale: 1.15, filter: 'brightness(1.3)' }}
      animate={{ scale: 1, filter: 'brightness(1)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`inline-flex items-center font-display font-black tracking-tight ${className}`}
    >
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </motion.span>
  )
}
