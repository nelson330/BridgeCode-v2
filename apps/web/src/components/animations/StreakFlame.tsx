import { Flame } from 'lucide-react'
import { motion } from 'motion/react'

interface StreakFlameProps {
  streak: number
  className?: string
}

export function StreakFlame({ streak, className = '' }: StreakFlameProps) {
  if (streak < 2) return null

  // Intensity levels: 2-3: normal orange flame, 4-6: intense amber flame, 7+: super blue/purple flame
  const isSuperStreak = streak >= 7
  const isHighStreak = streak >= 4

  const flameColor = isSuperStreak
    ? 'text-fuchsia-400 drop-shadow-[0_0_12px_rgba(217,70,239,0.8)]'
    : isHighStreak
      ? 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]'
      : 'text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]'

  const multiplier = (1 + Math.min(streak, 5) * 0.2).toFixed(1)

  return (
    <motion.div
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      exit={{ scale: 0, opacity: 0 }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-lg ${className}`}
    >
      <motion.div
        animate={{
          scale: [1, 1.25, 0.95, 1.15, 1],
          rotate: [0, -6, 6, -3, 0],
        }}
        transition={{
          repeat: Number.POSITIVE_INFINITY,
          duration: 1.2,
          ease: 'easeInOut',
        }}
        className={flameColor}
      >
        <Flame className="w-5 h-5 fill-current" />
      </motion.div>
      <span className="font-display font-extrabold text-xs tracking-wider text-white">
        ×{multiplier} ({streak})
      </span>
    </motion.div>
  )
}
