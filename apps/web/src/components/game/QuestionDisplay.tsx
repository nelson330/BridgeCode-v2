import {
  ArrowDownUp,
  Check,
  CheckCircle2,
  Circle,
  Diamond,
  HelpCircle,
  Keyboard,
  Lightbulb,
  Link2,
  ListOrdered,
  MapPin,
  MessageSquareQuote,
  PenTool,
  SlidersHorizontal,
  Square,
  Triangle,
  Type,
  XCircle,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { sound } from '../../lib/audio-synth'
import { triggerConfetti } from '../../lib/confetti'
import { Badge } from '../ui/Badge'
import { MarkdownText } from '../ui/MarkdownText'

interface QuestionDisplayProps {
  exercise: {
    id: string
    type: string
    prompt: string
    mediaUrl?: string | null
    optionsJson?: string | null
    answerJson?: string
    explanation?: string | null
    points?: number
    timeSec?: number
    pointsMultiplier?: number
  }
  isLocalMode?: boolean
  isRevealed?: boolean
  onLocalAnswerSubmit?: (isCorrect: boolean) => void
}

const OPTION_STYLES = [
  {
    bg: 'bg-rose-600 hover:bg-rose-500 border-rose-400',
    pattern: 'pattern-triangle',
    icon: Triangle,
    label: 'A',
  },
  {
    bg: 'bg-blue-600 hover:bg-blue-500 border-blue-400',
    pattern: 'pattern-diamond',
    icon: Diamond,
    label: 'B',
  },
  {
    bg: 'bg-amber-500 hover:bg-amber-400 border-amber-300 text-slate-950',
    pattern: 'pattern-circle',
    icon: Circle,
    label: 'C',
  },
  {
    bg: 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400',
    pattern: 'pattern-square',
    icon: Square,
    label: 'D',
  },
]

const TYPE_LABELS: Record<string, { label: string; icon: typeof HelpCircle }> = {
  mc: { label: 'OPCIÓN MÚLTIPLE', icon: HelpCircle },
  tf: { label: 'VERDADERO / FALSO', icon: HelpCircle },
  fill: { label: 'RELLENAR ESPACIO', icon: Keyboard },
  order: { label: 'ORDENAR SECUENCIA', icon: ListOrdered },
  match: { label: 'EMPAREJAR CONCEPTOS', icon: Link2 },
  open: { label: 'PREGUNTA ABIERTA', icon: PenTool },
  short: { label: 'RESPUESTA CORTA', icon: PenTool },
  type_answer: { label: 'RESPUESTA EXACTA', icon: Type },
  slider: { label: 'VALOR NUMÉRICO', icon: SlidersHorizontal },
  pin_drop: { label: 'MARCAR EN IMAGEN', icon: MapPin },
  word_cloud: { label: 'NUBE DE PALABRAS', icon: MessageSquareQuote },
  slide: { label: 'INFORMATIVO', icon: Lightbulb },
}

export function QuestionDisplay({
  exercise,
  isLocalMode = false,
  isRevealed = false,
  onLocalAnswerSubmit,
}: QuestionDisplayProps) {
  const [selectedLocalIndex, setSelectedLocalIndex] = useState<number | null>(null)
  const [revealedLocal, setRevealedLocal] = useState(false)

  let options: any[] = []
  try {
    if (exercise.optionsJson) {
      options = JSON.parse(exercise.optionsJson)
    }
  } catch {
    options = []
  }

  let correctAnswer: any = null
  try {
    if (exercise.answerJson) {
      correctAnswer = JSON.parse(exercise.answerJson)
    }
  } catch {
    correctAnswer = null
  }

  const handleOptionClick = (index: number) => {
    if (!isLocalMode || revealedLocal) return

    setSelectedLocalIndex(index)
    setRevealedLocal(true)

    let isCorrect = false
    if (exercise.type === 'mc') {
      isCorrect = correctAnswer?.correctIndex === index
    } else if (exercise.type === 'tf') {
      isCorrect = correctAnswer?.isTrue === (index === 0)
    }

    if (isCorrect) {
      sound.playCorrect()
      triggerConfetti()
    } else {
      sound.playIncorrect()
    }

    if (onLocalAnswerSubmit) {
      onLocalAnswerSubmit(isCorrect)
    }
  }

  const showResult = isRevealed || revealedLocal
  const typeInfo = TYPE_LABELS[exercise.type] || { label: 'PREGUNTA', icon: HelpCircle }
  const TypeIcon = typeInfo.icon

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      {/* Question Prompt Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-slate-900/90 border-2 border-indigo-500/30 p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center space-y-4 min-h-[120px] flex flex-col justify-center"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider mx-auto">
          <TypeIcon className="w-4 h-4" />
          {typeInfo.label} • {exercise.points || 1} Pts
          {exercise.pointsMultiplier && exercise.pointsMultiplier > 1 && (
            <span className="text-amber-400">×{exercise.pointsMultiplier}</span>
          )}
        </div>

        <div className="font-display font-black text-xl sm:text-2xl lg:text-3xl text-white tracking-tight leading-relaxed max-w-3xl mx-auto">
          <MarkdownText content={exercise.prompt} />
        </div>

        {exercise.mediaUrl && exercise.type !== 'pin_drop' && (
          <div className="mt-4 max-h-64 overflow-hidden rounded-2xl border border-slate-800 flex justify-center">
            <img src={exercise.mediaUrl} alt="Material multimedia" className="object-cover h-full" />
          </div>
        )}
      </motion.div>

      {/* MC & TF Options Grid */}
      {(exercise.type === 'mc' || exercise.type === 'tf') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {options.map((option, index) => {
            const style = OPTION_STYLES[index % OPTION_STYLES.length]
            const Icon = style?.icon || Circle

            let isOptionCorrect = false
            if (exercise.type === 'mc') {
              isOptionCorrect = correctAnswer?.correctIndex === index
            } else if (exercise.type === 'tf') {
              isOptionCorrect = correctAnswer?.isTrue === (index === 0)
            }

            const isSelected = selectedLocalIndex === index

            return (
              <motion.button
                key={index}
                whileHover={isLocalMode && !showResult ? { scale: 1.02, y: -2 } : {}}
                whileTap={isLocalMode && !showResult ? { scale: 0.98 } : {}}
                onClick={() => handleOptionClick(index)}
                disabled={!isLocalMode || showResult}
                className={`relative flex items-center gap-4 p-5 sm:p-6 rounded-2xl border-2 font-display font-extrabold text-white shadow-xl transition-all select-none text-left min-h-[90px] ${
                  showResult
                    ? isOptionCorrect
                      ? 'bg-emerald-600 border-emerald-300 ring-4 ring-emerald-500/40'
                      : isSelected
                        ? 'bg-rose-700/80 border-rose-400 opacity-80'
                        : 'bg-slate-900/60 border-slate-800 opacity-40'
                    : `${style?.bg} ${style?.pattern}`
                } ${isLocalMode && !showResult ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className="w-12 h-12 rounded-xl bg-black/25 flex items-center justify-center shrink-0 border border-white/20">
                  <Icon className="w-6 h-6 text-white" />
                </div>

                <div className="flex-1 text-base sm:text-lg md:text-xl drop-shadow-md leading-snug">
                  <MarkdownText content={option} />
                </div>

                {showResult && (
                  <div className="shrink-0">
                    {isOptionCorrect ? (
                      <CheckCircle2 className="w-8 h-8 text-white drop-shadow-lg" />
                    ) : isSelected ? (
                      <XCircle className="w-8 h-8 text-rose-200 drop-shadow-lg" />
                    ) : null}
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>
      )}

      {/* Fill in the Blank */}
      {exercise.type === 'fill' && (
        <div className="space-y-4">
          {!showResult ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 rounded-3xl bg-indigo-950/60 border-2 border-indigo-500/40 text-center space-y-2"
            >
              <div className="flex items-center justify-center gap-2 text-indigo-300 font-bold text-lg">
                <Keyboard className="w-6 h-6 animate-pulse text-indigo-400" />
                <span>Escribe la palabra o término que falta en tu pantalla</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/90 to-slate-900 border-2 border-emerald-400 text-center space-y-3 shadow-2xl"
            >
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Respuesta(s) Correcta(s)</span>
              </div>
              <div className="font-display font-black text-2xl sm:text-3xl text-white">
                {Array.isArray(correctAnswer?.validAnswers)
                  ? correctAnswer.validAnswers.join('  •  ')
                  : correctAnswer?.text || correctAnswer?.validAnswer || 'Respuesta correcta'}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Type Answer */}
      {exercise.type === 'type_answer' && (
        <div className="space-y-4">
          {!showResult ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 rounded-3xl bg-indigo-950/60 border-2 border-indigo-500/40 text-center space-y-2"
            >
              <div className="flex items-center justify-center gap-2 text-indigo-300 font-bold text-lg">
                <Type className="w-6 h-6 animate-pulse text-indigo-400" />
                <span>Escribe la respuesta exacta en tu dispositivo</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/90 to-slate-900 border-2 border-emerald-400 text-center space-y-3 shadow-2xl"
            >
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Respuesta Correcta</span>
              </div>
              <div className="font-display font-black text-2xl sm:text-3xl text-white">
                {Array.isArray(correctAnswer?.validAnswers)
                  ? correctAnswer.validAnswers.join('  •  ')
                  : correctAnswer?.text || correctAnswer?.validAnswer || 'Respuesta'}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Slider */}
      {exercise.type === 'slider' && (
        <div className="space-y-4">
          {!showResult ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 rounded-3xl bg-indigo-950/60 border-2 border-indigo-500/40 text-center space-y-2"
            >
              <div className="flex items-center justify-center gap-2 text-indigo-300 font-bold text-lg">
                <SlidersHorizontal className="w-6 h-6 animate-pulse text-indigo-400" />
                <span>Ajusta el valor en tu dispositivo</span>
              </div>
              {correctAnswer && (
                <p className="text-xs text-slate-400">
                  Rango: {correctAnswer.min ?? 0} – {correctAnswer.max ?? 100}
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/90 to-slate-900 border-2 border-emerald-400 text-center space-y-3 shadow-2xl"
            >
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Valor Correcto</span>
              </div>
              <div className="font-display font-black text-5xl text-white">
                {correctAnswer?.correctValue ?? correctAnswer?.value ?? '?'}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Pin Drop */}
      {exercise.type === 'pin_drop' && (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700">
            {exercise.mediaUrl ? (
              <img src={exercise.mediaUrl} alt="Imagen" className="w-full h-auto" />
            ) : (
              <div className="w-full h-64 bg-slate-800 flex items-center justify-center text-slate-500">
                Imagen no disponible
              </div>
            )}
            {showResult && correctAnswer && (
              <div
                className="absolute w-6 h-6 -ml-3 -mt-6"
                style={{ left: correctAnswer.correctX, top: correctAnswer.correctY }}
              >
                <MapPin className="w-6 h-6 text-emerald-400 drop-shadow-lg" fill="currentColor" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Word Cloud */}
      {exercise.type === 'word_cloud' && (
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 rounded-3xl bg-indigo-950/60 border-2 border-indigo-500/40 text-center space-y-2"
          >
            <div className="flex items-center justify-center gap-2 text-indigo-300 font-bold text-lg">
              <MessageSquareQuote className="w-6 h-6 animate-pulse text-indigo-400" />
              <span>Escribe una palabra o concepto clave</span>
            </div>
            <p className="text-xs text-slate-400">Las palabras de todos se mostrarán como nube</p>
          </motion.div>
        </div>
      )}

      {/* Order Sequence */}
      {exercise.type === 'order' && (
        <div className="space-y-4">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center justify-center gap-1.5 mb-2">
              <ListOrdered className="w-4 h-4" />
              {showResult ? 'Orden Correcto de la Secuencia' : 'Elementos a Ordenar en tu Dispositivo'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {(() => {
              const rawItems: string[] = Array.isArray(options) ? options : []
              const correctOrder: number[] = Array.isArray(correctAnswer?.correctOrder)
                ? correctAnswer.correctOrder
                : Array.isArray(correctAnswer?.order)
                  ? correctAnswer.order
                  : rawItems.map((_, i) => i)

              const displayList = showResult
                ? correctOrder.map((idx, orderPos) => ({
                    item: rawItems[idx] || `Paso ${idx + 1}`,
                    pos: orderPos + 1,
                  }))
                : rawItems.map((item, idx) => ({ item, pos: idx + 1 }))

              return displayList.map(({ item, pos }, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className={`p-4 sm:p-5 rounded-2xl border-2 flex items-center gap-4 text-base sm:text-lg font-bold ${
                    showResult
                      ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-100 shadow-lg'
                      : 'bg-slate-900/80 border-slate-700/80 text-white'
                  }`}
                >
                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-display font-black text-sm shrink-0 ${
                      showResult
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                    }`}
                  >
                    {showResult ? `${pos}º` : `${String.fromCharCode(65 + index)}`}
                  </span>
                  <span className="flex-1">
                    <MarkdownText content={item} />
                  </span>
                  {showResult && <Check className="w-5 h-5 text-emerald-400 shrink-0" />}
                </motion.div>
              ))
            })()}
          </div>
        </div>
      )}

      {/* Match Concepts */}
      {exercise.type === 'match' && (
        <div className="space-y-4">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center justify-center gap-1.5 mb-2">
              <Link2 className="w-4 h-4" />
              {showResult ? 'Asociaciones y Pares Correctos' : 'Relaciona los Conceptos en tu Dispositivo'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(() => {
              const pairs: Array<{ left: string; right: string }> = Array.isArray(options)
                ? options
                : Array.isArray(correctAnswer?.pairs)
                  ? correctAnswer.pairs
                  : []

              return pairs.map((pair, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`p-4 rounded-2xl border-2 space-y-2 ${
                    showResult
                      ? 'bg-emerald-950/70 border-emerald-500/60'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="primary" className="text-[10px]">
                      Concepto {idx + 1}
                    </Badge>
                    {showResult && <Check className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <div className="font-bold text-white text-base">
                    <MarkdownText content={pair.left} />
                  </div>
                  <div className="pt-2 border-t border-slate-800 text-xs text-indigo-200 flex items-center gap-2">
                    <span className="font-bold text-indigo-400">→</span>
                    <MarkdownText content={pair.right} />
                  </div>
                </motion.div>
              ))
            })()}
          </div>
        </div>
      )}

      {/* Open / Short Response */}
      {(exercise.type === 'open' || exercise.type === 'short') && (
        <div className="space-y-4">
          {!showResult ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 rounded-3xl bg-indigo-950/60 border-2 border-indigo-500/40 text-center space-y-2"
            >
              <div className="flex items-center justify-center gap-2 text-indigo-300 font-bold text-lg">
                <PenTool className="w-6 h-6 animate-pulse text-indigo-400" />
                <span>Redacta tu respuesta en la pantalla de tu dispositivo</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/90 to-slate-900 border-2 border-emerald-400 space-y-3 shadow-2xl"
            >
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                <MessageSquareQuote className="w-4 h-4" />
                <span>Respuesta Modelo / Criterio de Corrección</span>
              </div>
              <div className="text-white text-sm sm:text-base leading-relaxed">
                <MarkdownText
                  content={
                    correctAnswer?.sampleAnswer ||
                    correctAnswer?.text ||
                    'Respuesta argumentada según los conceptos clave del temario.'
                  }
                />
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Slide (Informational) */}
      {exercise.type === 'slide' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-indigo-950/90 to-slate-900 border-2 border-indigo-400/40 text-center space-y-6 shadow-2xl"
        >
          <div className="text-xs font-bold uppercase tracking-widest text-indigo-400 flex items-center justify-center gap-1.5">
            <Lightbulb className="w-4 h-4" />
            Información
          </div>
          <div className="font-display font-bold text-xl sm:text-2xl text-white leading-relaxed">
            <MarkdownText content={exercise.prompt} />
          </div>
          {exercise.mediaUrl && (
            <div className="max-h-64 overflow-hidden rounded-2xl border border-slate-800 flex justify-center">
              <img src={exercise.mediaUrl} alt="Material" className="object-cover h-full" />
            </div>
          )}
        </motion.div>
      )}

      {/* Explanation Banner */}
      {showResult && exercise.explanation && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-5 rounded-2xl bg-indigo-950/70 border border-indigo-500/40 text-indigo-200 text-sm sm:text-base leading-relaxed shadow-lg text-left"
        >
          <span className="font-bold text-white flex items-center gap-1.5 mb-1.5">
            <Lightbulb className="w-4 h-4 text-amber-400" /> Explicación Pedagógica:
          </span>
          <MarkdownText content={exercise.explanation} />
        </motion.div>
      )}
    </div>
  )
}
