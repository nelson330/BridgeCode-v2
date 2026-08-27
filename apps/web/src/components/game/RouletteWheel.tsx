import { Sparkles, Trophy } from 'lucide-react'
import { motion, useAnimation } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { sound } from '../../lib/audio-synth'
import { Button } from '../ui/Button'

interface RouletteWheelProps {
  items: string[]
  onSelect?: (item: string, index: number) => void
  disabled?: boolean
}

const COLORS = [
  '#f43f5e', // Red
  '#3b82f6', // Blue
  '#eab308', // Yellow
  '#10b981', // Green
  '#a855f7', // Purple
  '#f97316', // Orange
  '#06b6d4', // Cyan
  '#ec4899', // Pink
]

export function RouletteWheel({ items, onSelect, disabled = false }: RouletteWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const controls = useAnimation()
  const currentRotation = useRef(0)

  const segments = items.length > 0 ? items : ['1', '2', '3', '4', '5', '6', '7', '8']
  const segmentAngle = 360 / segments.length

  const spin = async () => {
    if (isSpinning || disabled) return
    setIsSpinning(true)
    setSelectedIndex(null)

    // Random target index
    const targetIdx = Math.floor(Math.random() * segments.length)
    const extraRounds = 5 + Math.floor(Math.random() * 3) // 5 to 7 full spins

    // Center of target slice aligned with the top pointer (angle offset)
    const targetAngle = (segments.length - targetIdx) * segmentAngle - segmentAngle / 2
    const totalRotation = currentRotation.current + extraRounds * 360 + targetAngle

    // Tick audio loop
    let tickCount = 0
    const tickInterval = setInterval(() => {
      sound.playWheelTick()
      tickCount++
      if (tickCount > 25) clearInterval(tickInterval)
    }, 120)

    await controls.start({
      rotate: totalRotation,
      transition: {
        duration: 4.5,
        ease: [0.15, 0.9, 0.25, 1], // Realistic deceleration
      },
    })

    clearInterval(tickInterval)
    currentRotation.current = totalRotation % 360
    setIsSpinning(false)
    setSelectedIndex(targetIdx)
    sound.playPowerup()

    const chosenItem = segments[targetIdx]
    if (chosenItem && onSelect) {
      onSelect(chosenItem, targetIdx)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 select-none">
      <div className="relative w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center">
        {/* Top Pointer Needle */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 w-8 h-10 flex flex-col items-center">
          <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[22px] border-t-amber-400 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]" />
        </div>

        {/* Outer Glowing Ring */}
        <div className="absolute inset-0 rounded-full border-4 border-amber-400/40 shadow-[0_0_40px_rgba(234,179,8,0.25)] pointer-events-none" />

        {/* Rotating Wheel Canvas/SVG */}
        <motion.div
          animate={controls}
          className="w-full h-full rounded-full overflow-hidden shadow-2xl border-4 border-slate-900 relative"
          style={{ originX: 0.5, originY: 0.5 }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {segments.map((item, index) => {
              const startAngle = (index * segmentAngle * Math.PI) / 180
              const endAngle = ((index + 1) * segmentAngle * Math.PI) / 180
              const x1 = 50 + 50 * Math.cos(startAngle)
              const y1 = 50 + 50 * Math.sin(startAngle)
              const x2 = 50 + 50 * Math.cos(endAngle)
              const y2 = 50 + 50 * Math.sin(endAngle)
              const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`
              const color = COLORS[index % COLORS.length]

              // Label angle calculation
              const midAngle = startAngle + (endAngle - startAngle) / 2
              const textX = 50 + 32 * Math.cos(midAngle)
              const textY = 50 + 32 * Math.sin(midAngle)
              const textRot = (midAngle * 180) / Math.PI + 90

              return (
                <g key={index}>
                  <path d={pathData} fill={color} stroke="#0f172a" strokeWidth="0.8" />
                  <text
                    x={textX}
                    y={textY}
                    fill="#ffffff"
                    fontSize="4"
                    fontWeight="800"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${textRot}, ${textX}, ${textY})`}
                    className="drop-shadow-sm pointer-events-none font-display uppercase tracking-wider"
                  >
                    {item.length > 10 ? `${item.slice(0, 8)}..` : item}
                  </text>
                </g>
              )
            })}
          </svg>

          {/* Wheel Center Hub */}
          <div className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-slate-900 border-4 border-amber-400 shadow-xl flex items-center justify-center z-10">
            <Sparkles className="w-6 h-6 text-amber-400" />
          </div>
        </motion.div>
      </div>

      {/* Selected Winner Banner */}
      {selectedIndex !== null && (
        <motion.div
          initial={{ scale: 0, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-2 border-amber-400 text-amber-300 font-display font-black text-xl shadow-xl shadow-amber-500/20"
        >
          <Trophy className="w-6 h-6 text-amber-400" />
          <span>¡Seleccionado: {segments[selectedIndex]}!</span>
        </motion.div>
      )}

      {/* Spin Button */}
      <Button
        variant="game"
        size="lg"
        onClick={spin}
        disabled={isSpinning || disabled}
        className="w-48 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-xl shadow-amber-500/30"
      >
        {isSpinning ? 'Girando...' : '¡Girar Ruleta!'}
      </Button>
    </div>
  )
}
