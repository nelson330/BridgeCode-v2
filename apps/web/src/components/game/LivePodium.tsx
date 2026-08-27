import type { ParticipantState } from '@shared/contracts/games'
import { Crown, Medal, Trophy } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect } from 'react'
import { sound } from '../../lib/audio-synth'
import { triggerFireworks } from '../../lib/confetti'

interface LivePodiumProps {
  podium: ParticipantState[]
}

export function LivePodium({ podium }: LivePodiumProps) {
  const first = podium[0]
  const second = podium[1]
  const third = podium[2]

  useEffect(() => {
    sound.playVictory()
    triggerFireworks()
  }, [])

  return (
    <div className="flex flex-col items-center justify-center p-8 max-w-4xl mx-auto w-full space-y-8 select-none">
      {/* Title */}
      <motion.div
        initial={{ scale: 0, y: -20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="text-center space-y-2"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold text-sm">
          <Trophy className="w-4 h-4" />
          ¡Partida Finalizada!
        </div>
        <h1 className="font-display font-black text-4xl sm:text-5xl text-white tracking-tight">
          Gran Podio de Honor
        </h1>
      </motion.div>

      {/* Podium Columns */}
      <div className="flex items-end justify-center gap-4 sm:gap-8 w-full pt-8 min-h-[360px]">
        {/* 2nd Place (Silver) */}
        {second ? (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: 'spring', damping: 20 }}
            className="flex flex-col items-center w-28 sm:w-36"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-300 border-4 border-white shadow-xl flex items-center justify-center text-slate-900 font-bold text-lg mb-2">
              <Medal className="w-8 h-8 text-slate-700" />
            </div>
            <span className="font-bold text-white text-sm sm:text-base text-center truncate w-full">
              {second.displayName}
            </span>
            <span className="text-xs text-indigo-300 font-semibold mb-2">{second.score} pts</span>
            <div className="w-full h-36 sm:h-44 rounded-t-2xl bg-gradient-to-t from-slate-700 to-slate-500 border-t-2 border-slate-400 flex items-center justify-center font-display font-black text-3xl text-white shadow-2xl">
              2
            </div>
          </motion.div>
        ) : (
          <div className="w-28 sm:w-36" />
        )}

        {/* 1st Place (Gold) */}
        {first && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 80 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.6, type: 'spring', damping: 15 }}
            className="flex flex-col items-center w-32 sm:w-44 z-10"
          >
            <Crown className="w-10 h-10 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)] animate-bounce mb-1" />
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-amber-400 border-4 border-white shadow-2xl flex items-center justify-center text-slate-900 font-black text-xl mb-2">
              <Trophy className="w-10 h-10 text-amber-900" />
            </div>
            <span className="font-display font-extrabold text-base sm:text-lg text-amber-300 text-center truncate w-full">
              {first.displayName}
            </span>
            <span className="text-sm text-amber-200 font-black mb-2">{first.score} pts</span>
            <div className="w-full h-52 sm:h-64 rounded-t-2xl bg-gradient-to-t from-amber-600 via-amber-500 to-yellow-400 border-t-4 border-amber-300 flex items-center justify-center font-display font-black text-5xl text-white shadow-[0_0_50px_rgba(251,191,36,0.4)]">
              1
            </div>
          </motion.div>
        )}

        {/* 3rd Place (Bronze) */}
        {third ? (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: 'spring', damping: 20 }}
            className="flex flex-col items-center w-28 sm:w-36"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-700 border-4 border-white shadow-xl flex items-center justify-center text-white font-bold text-lg mb-2">
              <Medal className="w-8 h-8 text-amber-200" />
            </div>
            <span className="font-bold text-white text-sm sm:text-base text-center truncate w-full">
              {third.displayName}
            </span>
            <span className="text-xs text-indigo-300 font-semibold mb-2">{third.score} pts</span>
            <div className="w-full h-28 sm:h-32 rounded-t-2xl bg-gradient-to-t from-amber-900 to-amber-700 border-t-2 border-amber-600 flex items-center justify-center font-display font-black text-2xl text-white shadow-xl">
              3
            </div>
          </motion.div>
        ) : (
          <div className="w-28 sm:w-36" />
        )}
      </div>
    </div>
  )
}
