import {
  ArrowDown,
  ArrowUp,
  Check,
  Circle,
  Diamond,
  ListOrdered,
  Loader2,
  PenTool,
  Send,
  Square,
  Triangle,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { sound } from '../../lib/audio-synth'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { MarkdownText } from '../ui/MarkdownText'

interface AnswerControlsProps {
  exerciseType: string
  options?: any[]
  optionsCount?: number
  hasSubmitted: boolean
  onSubmit: (answerJson: string) => void
  disabled?: boolean
}

const BUTTON_CONFIGS = [
  {
    bg: 'bg-rose-600 active:bg-rose-700',
    border: 'border-rose-400',
    icon: Triangle,
    pattern: 'pattern-triangle',
    label: 'A',
  },
  {
    bg: 'bg-blue-600 active:bg-blue-700',
    border: 'border-blue-400',
    icon: Diamond,
    pattern: 'pattern-diamond',
    label: 'B',
  },
  {
    bg: 'bg-amber-500 active:bg-amber-600',
    border: 'border-amber-300',
    icon: Circle,
    pattern: 'pattern-circle',
    label: 'C',
  },
  {
    bg: 'bg-emerald-600 active:bg-emerald-700',
    border: 'border-emerald-400',
    icon: Square,
    pattern: 'pattern-square',
    label: 'D',
  },
]

export function AnswerControls({
  exerciseType,
  options = [],
  optionsCount = 4,
  hasSubmitted,
  onSubmit,
  disabled = false,
}: AnswerControlsProps) {
  // State for Fill-in-the-blank & Open questions
  const [typedText, setTypedText] = useState('')

  // State for Order questions
  const [orderItems, setOrderItems] = useState<Array<{ id: number; text: string }>>([])

  useEffect(() => {
    setTypedText('')
    if (exerciseType === 'order' && Array.isArray(options)) {
      setOrderItems(
        options.map((opt, idx) => ({ id: idx, text: typeof opt === 'string' ? opt : JSON.stringify(opt) }))
      )
    }
  }, [exerciseType, options])

  const handleSelectMcTf = (index: number) => {
    if (hasSubmitted || disabled) return
    sound.playPowerup()

    let answerJson = ''
    if (exerciseType === 'mc') {
      answerJson = JSON.stringify({ correctIndex: index })
    } else if (exerciseType === 'tf') {
      answerJson = JSON.stringify({ isTrue: index === 0 })
    }

    onSubmit(answerJson)
  }

  const handleSubmitText = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (hasSubmitted || disabled || !typedText.trim()) return
    sound.playPowerup()

    const answerJson = JSON.stringify({ text: typedText.trim() })
    onSubmit(answerJson)
  }

  const handleMoveOrder = (index: number, direction: 'up' | 'down') => {
    if (disabled || hasSubmitted) return
    sound.playWheelTick()

    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= orderItems.length) return

    setOrderItems((prev) => {
      const copy = [...prev]
      const [moved] = copy.splice(index, 1)
      if (moved) copy.splice(targetIndex, 0, moved)
      return copy
    })
  }

  const handleSubmitOrder = () => {
    if (hasSubmitted || disabled) return
    sound.playPowerup()

    const orderIndices = orderItems.map((item) => item.id)
    const answerJson = JSON.stringify({ correctOrder: orderIndices })
    onSubmit(answerJson)
  }

  if (hasSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl">
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}
          className="w-16 h-16 rounded-full bg-indigo-500/20 border-2 border-indigo-400 flex items-center justify-center text-indigo-400"
        >
          <Check className="w-8 h-8" />
        </motion.div>
        <h3 className="font-display font-black text-2xl text-white">¡Respuesta Enviada!</h3>
        <p className="text-slate-400 text-sm flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Esperando a que termine el tiempo...
        </p>
      </div>
    )
  }

  // 1. Fill-in-the-blank Form
  if (exerciseType === 'fill') {
    return (
      <form onSubmit={handleSubmitText} className="space-y-4 w-full">
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-indigo-400 block text-center">
            Escribe la palabra que completa la oración:
          </label>
          <Input
            type="text"
            placeholder="Escribe tu respuesta aquí..."
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            disabled={disabled}
            className="text-center font-display font-bold text-xl py-3 text-white"
            autoFocus
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={disabled || !typedText.trim()}
          className="w-full gap-2 text-base font-bold py-4 shadow-xl"
        >
          <Send className="w-5 h-5" />
          <span>Enviar Respuesta</span>
        </Button>
      </form>
    )
  }

  // 2. Order Reordering List
  if (exerciseType === 'order') {
    return (
      <div className="space-y-4 w-full">
        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1">
            <ListOrdered className="w-4 h-4" />
            Usa las flechas para ordenar de primero a último:
          </span>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {orderItems.map((item, idx) => (
            <motion.div
              key={item.id}
              layout
              className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-sm"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center justify-center font-bold text-xs shrink-0">
                  {idx + 1}
                </span>
                <span className="font-semibold text-white truncate">{item.text}</span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleMoveOrder(idx, 'up')}
                  disabled={idx === 0 || disabled}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 cursor-pointer"
                  title="Mover arriba"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveOrder(idx, 'down')}
                  disabled={idx === orderItems.length - 1 || disabled}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 cursor-pointer"
                  title="Mover abajo"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={handleSubmitOrder}
          disabled={disabled || orderItems.length === 0}
          className="w-full gap-2 text-base font-bold py-4 shadow-xl"
        >
          <Check className="w-5 h-5" />
          <span>Confirmar Orden de los Pasos</span>
        </Button>
      </div>
    )
  }

  // 2.5 Match Pairs (left -> right matching)
  if (exerciseType === 'match') {
    // options is an array of pairs like [{ left, right }, ...] or strings.
    const pairs: Array<{ left: string; right: string }> = (Array.isArray(options) ? options : []).map(
      (p: any) =>
        typeof p === 'object' && p !== null
          ? { left: String(p.left ?? p.term ?? ''), right: String(p.right ?? p.definition ?? '') }
          : { left: String(p), right: '' }
    )

    // State: which left item is selected and which right items are matched to which left.
    const [leftIndex, setLeftIndex] = useState<number | null>(null)
    const [matches, setMatches] = useState<Record<number, number>>({})

    useEffect(() => {
      setLeftIndex(null)
      setMatches({})
    }, [exerciseType, options])

    const handlePickLeft = (idx: number) => {
      if (hasSubmitted || disabled) return
      sound.playWheelTick()
      setLeftIndex(idx === leftIndex ? null : idx)
    }

    const handlePickRight = (rightIdx: number) => {
      if (hasSubmitted || disabled || leftIndex === null) return
      sound.playCorrect()
      setMatches((prev) => ({ ...prev, [leftIndex]: rightIdx }))
      setLeftIndex(null)
    }

    const handleSubmitMatch = () => {
      if (hasSubmitted || disabled) return
      sound.playPowerup()
      // Build pairs array reflecting the matches from the original order.
      const submission = pairs.map((_p, i) => matches[i] ?? -1)
      onSubmit(JSON.stringify({ pairs: submission }))
    }

    const matchedRight = new Set(Object.values(matches).filter((v) => v >= 0))

    return (
      <div className="space-y-4 w-full">
        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Empareja cada concepto de la izquierda con su definición:
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 max-h-72 overflow-y-auto">
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block text-center">
              Concepto
            </span>
            {pairs.map((p, idx) => (
              <button
                key={`l-${idx}`}
                type="button"
                disabled={hasSubmitted || disabled}
                onClick={() => handlePickLeft(idx)}
                className={`w-full p-2.5 rounded-xl border-2 text-left text-sm font-bold transition-all cursor-pointer ${
                  leftIndex === idx
                    ? 'bg-indigo-600/30 border-indigo-400 text-white'
                    : matches[idx] !== undefined
                      ? 'bg-emerald-900/40 border-emerald-700 text-emerald-200'
                      : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500'
                }`}
              >
                {p.left}
                {matches[idx] !== undefined && pairs[matches[idx] as number] && (
                  <span className="block text-[10px] text-emerald-400 mt-0.5">
                    → {pairs[matches[idx] as number]?.right}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block text-center">
              Definición
            </span>
            {pairs.map((p, idx) => (
              <button
                key={`r-${idx}`}
                type="button"
                disabled={hasSubmitted || disabled || leftIndex === null || matchedRight.has(idx)}
                onClick={() => handlePickRight(idx)}
                className={`w-full p-2.5 rounded-xl border-2 text-left text-sm transition-all cursor-pointer ${
                  matchedRight.has(idx)
                    ? 'bg-slate-950 border-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                    : leftIndex !== null
                      ? 'bg-slate-900 border-slate-700 text-slate-200 hover:border-indigo-500 hover:text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                {p.right}
              </button>
            ))}
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={handleSubmitMatch}
          disabled={disabled || Object.keys(matches).length === 0}
          className="w-full gap-2 text-base font-bold py-4 shadow-xl"
        >
          <Check className="w-5 h-5" />
          <span>Confirmar Emparejamiento</span>
        </Button>
      </div>
    )
  }

  // 3. Open Question Response
  if (exerciseType === 'open' || exerciseType === 'short') {
    return (
      <form onSubmit={handleSubmitText} className="space-y-4 w-full">
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-indigo-400 block">
            Escribe tu respuesta:
          </label>
          <textarea
            rows={3}
            placeholder="Explica con tus palabras..."
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            disabled={disabled}
            className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={disabled || !typedText.trim()}
          className="w-full gap-2 text-base font-bold py-4 shadow-xl"
        >
          <PenTool className="w-5 h-5" />
          <span>Enviar Respuesta Escrita</span>
        </Button>
      </form>
    )
  }

  // 4. Default: Multiple Choice & True/False Touch Buttons
  const count = exerciseType === 'tf' ? 2 : Math.min(optionsCount, 4)
  const buttons = BUTTON_CONFIGS.slice(0, count)

  return (
    <div className="grid grid-cols-2 gap-4 w-full h-full min-h-[300px]">
      {buttons.map((btn, index) => {
        const Icon = btn.icon
        const textLabel = exerciseType === 'tf' ? (index === 0 ? 'Verdadero' : 'Falso') : btn.label

        return (
          <motion.button
            key={index}
            whileTap={{ scale: 0.94 }}
            onClick={() => handleSelectMcTf(index)}
            disabled={disabled || hasSubmitted}
            className={`flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border-4 text-white shadow-2xl transition-transform cursor-pointer select-none ${btn.bg} ${btn.border} ${btn.pattern}`}
          >
            <Icon className="w-12 h-12 text-white drop-shadow-md" />
            <span className="font-display font-black text-2xl tracking-wider drop-shadow-md">
              {textLabel}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
