import {
  ArrowDown,
  ArrowUp,
  Check,
  Circle,
  Diamond,
  HelpCircle,
  ListOrdered,
  Loader2,
  MapPin,
  Send,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Square,
  Triangle,
  X,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { sound } from '../../lib/audio-synth'
import { Button } from '../ui/Button'

interface AnswerControlsProps {
  exerciseType: string
  options?: any[]
  optionsCount?: number
  hasSubmitted: boolean
  onSubmit: (answerJson: string) => void
  disabled?: boolean
  mediaUrl?: string
  answerJson?: string
}

const BUTTON_CONFIGS = [
  { bg: 'bg-rose-600 active:bg-rose-700', border: 'border-rose-400', icon: Triangle, label: 'A' },
  { bg: 'bg-blue-600 active:bg-blue-700', border: 'border-blue-400', icon: Diamond, label: 'B' },
  { bg: 'bg-amber-500 active:bg-amber-600', border: 'border-amber-300', icon: Circle, label: 'C' },
  { bg: 'bg-emerald-600 active:bg-emerald-700', border: 'border-emerald-400', icon: Square, label: 'D' },
]

const TILE_COLORS = [
  'bg-indigo-600 hover:bg-indigo-500 border-indigo-400 text-white',
  'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white',
  'bg-amber-500 hover:bg-amber-400 border-amber-300 text-slate-950',
  'bg-rose-600 hover:bg-rose-500 border-rose-400 text-white',
  'bg-purple-600 hover:bg-purple-500 border-purple-400 text-white',
  'bg-cyan-600 hover:bg-cyan-500 border-cyan-400 text-white',
]

const PAIR_COLORS = [
  { bg: 'bg-indigo-950/80', border: 'border-indigo-500', badge: 'bg-indigo-500 text-white', label: 'Par 1' },
  {
    bg: 'bg-emerald-950/80',
    border: 'border-emerald-500',
    badge: 'bg-emerald-500 text-slate-950',
    label: 'Par 2',
  },
  { bg: 'bg-amber-950/80', border: 'border-amber-500', badge: 'bg-amber-500 text-slate-950', label: 'Par 3' },
  { bg: 'bg-rose-950/80', border: 'border-rose-500', badge: 'bg-rose-500 text-white', label: 'Par 4' },
  { bg: 'bg-purple-950/80', border: 'border-purple-500', badge: 'bg-purple-500 text-white', label: 'Par 5' },
  { bg: 'bg-cyan-950/80', border: 'border-cyan-500', badge: 'bg-cyan-500 text-slate-950', label: 'Par 6' },
]

export function AnswerControls({
  exerciseType,
  options = [],
  optionsCount = 4,
  hasSubmitted,
  onSubmit,
  disabled = false,
  mediaUrl,
  answerJson,
}: AnswerControlsProps) {
  // ─── All hooks must be at the top ────────────────────────────────────────────
  const [orderItems, setOrderItems] = useState<Array<{ id: number; text: string }>>([])

  // Slider state
  const [sliderValue, setSliderValue] = useState(50)
  const [sliderConfig, setSliderConfig] = useState({ min: 0, max: 100 })

  // Pin drop state
  const [pinPos, setPinPos] = useState<{ x: number; y: number } | null>(null)

  // Match pairs state
  const [matchLeftItems, setMatchLeftItems] = useState<Array<{ id: number; text: string }>>([])
  const [matchRightItems, setMatchRightItems] = useState<Array<{ id: number; text: string }>>([])
  const [matchLeftIndex, setMatchLeftIndex] = useState<number | null>(null)
  const [matchMatches, setMatchMatches] = useState<Record<number, number>>({}) // leftIdx -> rightIdx

  // Word-tile / Concept-tile state
  const [wordTiles, setWordTiles] = useState<string[]>([])
  const [selectedWord, setSelectedWord] = useState<string | null>(null)

  // ─── Effect: load type-specific state ─────────────────────────────────────────
  useEffect(() => {
    setPinPos(null)
    setMatchLeftIndex(null)
    setMatchMatches({})
    setSelectedWord(null)

    let parsed: any = null
    if (answerJson) {
      try {
        parsed = typeof answerJson === 'string' ? JSON.parse(answerJson) : answerJson
      } catch {
        parsed = null
      }
    }

    // 1. ORDER: parse and shuffle initial items so student actively orders them
    if (exerciseType === 'order' && Array.isArray(options)) {
      const items = options.map((opt, idx) => ({
        id: idx,
        text: typeof opt === 'string' ? opt : JSON.stringify(opt),
      }))

      // Shuffle initially
      const shuffled = [...items]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const temp = shuffled[i]
        const target = shuffled[j]
        if (temp !== undefined && target !== undefined) {
          shuffled[i] = target
          shuffled[j] = temp
        }
      }
      setOrderItems(shuffled)
    } else {
      setOrderItems([])
    }

    // 2. SLIDER: configure bounds
    if (exerciseType === 'slider' && parsed) {
      const min = parsed.min ?? 0
      const max = parsed.max ?? 100
      setSliderConfig({ min, max })
      setSliderValue(Math.round((min + max) / 2))
    }

    // 3. MATCH: parse left concepts and shuffled right definitions
    if (exerciseType === 'match') {
      const pairs: Array<{ left: string; right: string }> = (Array.isArray(options) ? options : []).map(
        (p: any) =>
          typeof p === 'object' && p !== null
            ? {
                left: String(p.left ?? p.term ?? p.concept ?? ''),
                right: String(p.right ?? p.definition ?? ''),
              }
            : { left: String(p), right: '' }
      )

      if (pairs.length === 0 && parsed?.pairs && Array.isArray(parsed.pairs)) {
        for (const p of parsed.pairs) {
          pairs.push({
            left: String(p.left ?? p.term ?? p.concept ?? ''),
            right: String(p.right ?? p.definition ?? ''),
          })
        }
      }

      const lefts = pairs.map((p, idx) => ({ id: idx, text: p.left }))
      const rights = pairs.map((p, idx) => ({ id: idx, text: p.right }))

      // Shuffle right definitions
      const shuffledRights = [...rights]
      for (let i = shuffledRights.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const temp = shuffledRights[i]
        const target = shuffledRights[j]
        if (temp !== undefined && target !== undefined) {
          shuffledRights[i] = target
          shuffledRights[j] = temp
        }
      }

      setMatchLeftItems(lefts)
      setMatchRightItems(shuffledRights)
    } else {
      setMatchLeftItems([])
      setMatchRightItems([])
    }

    // 4. FILL / TYPE_ANSWER / SHORT / OPEN / WORD_CLOUD: 100% interactive selectable word bank
    if (
      exerciseType === 'fill' ||
      exerciseType === 'type_answer' ||
      exerciseType === 'short' ||
      exerciseType === 'open' ||
      exerciseType === 'word_cloud'
    ) {
      const valid: string[] = Array.isArray(parsed?.validAnswers)
        ? parsed.validAnswers.map((s: any) => String(s))
        : parsed?.validAnswer
          ? [String(parsed.validAnswer)]
          : parsed?.sampleAnswer
            ? [String(parsed.sampleAnswer)]
            : []

      const keywords: string[] = Array.isArray(parsed?.keywords)
        ? parsed.keywords.map((k: any) => String(k))
        : Array.isArray(parsed?.sampleWords)
          ? parsed.sampleWords.map((k: any) => String(k))
          : []

      const distractorPool: string[] = Array.isArray(options)
        ? options
            .map((o: any) => (typeof o === 'string' ? o : String(o?.text ?? o?.term ?? o?.word ?? '')))
            .filter(Boolean)
        : []

      let merged = Array.from(new Set([...valid, ...keywords, ...distractorPool])).filter(
        (w) => w.trim().length > 0
      )

      // If no options exist, provide contextual default choices
      if (merged.length === 0) {
        merged = ['Opción A', 'Opción B', 'Opción C', 'Opción D']
      }

      // Shuffle tiles (Fisher-Yates)
      const tiles = [...merged]
      for (let i = tiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const temp = tiles[i]
        const target = tiles[j]
        if (temp !== undefined && target !== undefined) {
          tiles[i] = target
          tiles[j] = temp
        }
      }
      setWordTiles(tiles)
    } else {
      setWordTiles([])
    }
  }, [exerciseType, options, answerJson])

  // ─── Handlers ─────────────────────────────────────────────────────────────────
  const handleSelectMcTf = (index: number) => {
    if (hasSubmitted || disabled) return
    sound.playPowerup()

    let answerJsonStr = ''
    if (exerciseType === 'mc' || exerciseType === 'poll') {
      answerJsonStr = JSON.stringify({ correctIndex: index })
    } else if (exerciseType === 'tf') {
      answerJsonStr = JSON.stringify({ isTrue: index === 0 })
    }

    onSubmit(answerJsonStr)
  }

  const handlePickWordTile = (word: string) => {
    if (hasSubmitted || disabled) return
    setSelectedWord(word)
    sound.playPowerup()
    onSubmit(JSON.stringify({ text: word.trim() }))
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
    onSubmit(JSON.stringify({ correctOrder: orderIndices }))
  }

  const handleSubmitSlider = () => {
    if (hasSubmitted || disabled) return
    sound.playPowerup()
    onSubmit(JSON.stringify({ value: sliderValue }))
  }

  const handlePinDrop = (e: React.MouseEvent<HTMLElement>) => {
    if (hasSubmitted || disabled) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.round(e.clientX - rect.left)
    const y = Math.round(e.clientY - rect.top)
    setPinPos({ x, y })
    sound.playPowerup()
  }

  const handleSubmitPin = () => {
    if (hasSubmitted || disabled || !pinPos) return
    sound.playPowerup()
    onSubmit(JSON.stringify({ x: pinPos.x, y: pinPos.y }))
  }

  const handlePickMatchLeft = (leftIdx: number) => {
    if (hasSubmitted || disabled) return
    sound.playWheelTick()

    // If already paired, clicking allows re-selecting or unpairing
    if (matchMatches[leftIdx] !== undefined) {
      setMatchLeftIndex(leftIdx)
      return
    }

    setMatchLeftIndex((prev) => (prev === leftIdx ? null : leftIdx))
  }

  const handlePickMatchRight = (rightIdx: number) => {
    if (hasSubmitted || disabled) return

    // If a left item is currently selected, link them
    if (matchLeftIndex !== null) {
      sound.playCorrect()
      setMatchMatches((prev) => {
        const next = { ...prev }
        // If another left was using this right, remove it
        for (const [k, v] of Object.entries(next)) {
          if (v === rightIdx) {
            delete next[Number(k)]
          }
        }
        next[matchLeftIndex] = rightIdx
        return next
      })
      setMatchLeftIndex(null)
    }
  }

  const handleUnpairMatch = (leftIdx: number) => {
    if (hasSubmitted || disabled) return
    sound.playWheelTick()
    setMatchMatches((prev) => {
      const next = { ...prev }
      delete next[leftIdx]
      return next
    })
    if (matchLeftIndex === leftIdx) {
      setMatchLeftIndex(null)
    }
  }

  const handleSubmitMatch = () => {
    if (hasSubmitted || disabled) return
    sound.playPowerup()

    // Construct submitted pair objects: [{ left: "Concept", right: "Definition" }]
    const submittedPairs = matchLeftItems.map((lItem, idx) => {
      const rightIdx = matchMatches[idx]
      const rItem = rightIdx !== undefined ? matchRightItems[rightIdx] : null
      return {
        left: lItem.text,
        right: rItem ? rItem.text : '',
      }
    })

    onSubmit(JSON.stringify({ pairs: submittedPairs }))
  }

  // ─── Render ────────────────────────────────────────────────────────────────────

  // Slide: no answer needed
  if (exerciseType === 'slide') {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 rounded-3xl bg-indigo-950/40 border border-indigo-800/40">
        <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
        <p className="text-slate-400 text-sm">Diapositiva informativa...</p>
      </div>
    )
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
          Procesando resultado...
        </p>
      </div>
    )
  }

  // ─── 100% Interactive Word-Tile Picker (fill / type_answer / short / open / word_cloud) ──
  if (
    exerciseType === 'fill' ||
    exerciseType === 'type_answer' ||
    exerciseType === 'short' ||
    exerciseType === 'open' ||
    exerciseType === 'word_cloud'
  ) {
    const isWordCloud = exerciseType === 'word_cloud'
    const isShortOrOpen = exerciseType === 'short' || exerciseType === 'open'

    return (
      <div className="space-y-4 w-full">
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
          <div className="text-center space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block">
              {isWordCloud
                ? 'Selecciona una idea o palabra clave:'
                : isShortOrOpen
                  ? 'Selecciona la respuesta o concepto correcto:'
                  : exerciseType === 'type_answer'
                    ? 'Elige la respuesta exacta:'
                    : 'Elige la palabra correcta para completar el espacio:'}
            </span>
            <p className="text-[11px] text-slate-400">
              {isWordCloud
                ? 'Toca la palabra que mejor responde a la pregunta'
                : 'Toca una opción para responder'}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            {wordTiles.map((word, idx) => {
              const isChosen = selectedWord === word
              return (
                <motion.button
                  key={word}
                  type="button"
                  onClick={() => handlePickWordTile(word)}
                  disabled={disabled}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.94 }}
                  className={`p-3.5 sm:p-4 rounded-2xl border-2 font-display font-bold text-sm sm:text-base shadow-lg transition-all cursor-pointer select-none flex items-center justify-center gap-2 text-center ${
                    isChosen
                      ? 'bg-indigo-600 border-indigo-300 ring-4 ring-indigo-500/40 text-white'
                      : TILE_COLORS[idx % TILE_COLORS.length]
                  }`}
                >
                  <span>{word}</span>
                </motion.button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ─── Slider ──────────────────────────────────────────────────────────────────
  if (exerciseType === 'slider') {
    return (
      <div className="space-y-4 w-full">
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
          <label className="text-xs font-bold uppercase tracking-wider text-indigo-400 block text-center flex items-center justify-center gap-1.5">
            <SlidersHorizontal className="w-4 h-4" />
            Ajusta el valor numérico:
          </label>
          <div className="text-center">
            <span className="font-display font-black text-5xl text-white">{sliderValue}</span>
          </div>
          <input
            type="range"
            min={sliderConfig.min}
            max={sliderConfig.max}
            value={sliderValue}
            onChange={(e) => setSliderValue(Number(e.target.value))}
            disabled={disabled}
            className="w-full h-3 rounded-full appearance-none bg-slate-700 cursor-pointer accent-indigo-500"
          />
          <div className="flex justify-between text-xs text-slate-500 font-mono font-bold">
            <span>{sliderConfig.min}</span>
            <span>{sliderConfig.max}</span>
          </div>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={handleSubmitSlider}
          disabled={disabled}
          className="w-full gap-2 text-base font-bold py-4 shadow-xl"
        >
          <Check className="w-5 h-6" />
          <span>Confirmar Valor</span>
        </Button>
      </div>
    )
  }

  // ─── Pin Drop ───────────────────────────────────────────────────────────────
  if (exerciseType === 'pin_drop') {
    return (
      <div className="space-y-4 w-full">
        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center justify-center gap-1.5">
            <MapPin className="w-4 h-4" />
            Toca la imagen para colocar tu marcador
          </span>
        </div>
        <button
          type="button"
          className="relative rounded-2xl overflow-hidden border-2 border-slate-700 cursor-crosshair w-full text-left p-0"
          onClick={handlePinDrop}
        >
          {mediaUrl ? (
            <img src={mediaUrl} alt="Imagen para marcar" className="w-full h-auto" />
          ) : (
            <div className="w-full h-64 bg-slate-800 flex items-center justify-center text-slate-500">
              Imagen no disponible
            </div>
          )}
          {pinPos && (
            <div className="absolute w-6 h-6 -ml-3 -mt-6" style={{ left: pinPos.x, top: pinPos.y }}>
              <MapPin className="w-6 h-6 text-rose-500 drop-shadow-lg" fill="currentColor" />
            </div>
          )}
        </button>
        <Button
          variant="primary"
          size="lg"
          onClick={handleSubmitPin}
          disabled={disabled || !pinPos}
          className="w-full gap-2 text-base font-bold py-4 shadow-xl"
        >
          <Check className="w-5 h-6" />
          <span>Confirmar Ubicación</span>
        </Button>
      </div>
    )
  }

  // ─── Order Sequence ─────────────────────────────────────────────────────────
  if (exerciseType === 'order') {
    return (
      <div className="space-y-4 w-full">
        <div className="text-center space-y-0.5">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center justify-center gap-1.5">
            <ListOrdered className="w-4 h-4" />
            Ordena los elementos usando las flechas:
          </span>
          <p className="text-[11px] text-slate-400">
            Mueve cada paso hacia arriba o hacia abajo para formar el orden correcto
          </p>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {orderItems.map((item, index) => (
            <div
              key={item.id}
              className="p-3 sm:p-4 rounded-2xl bg-slate-900 border-2 border-slate-700/80 flex items-center justify-between gap-3 shadow-md"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-black text-xs flex items-center justify-center shrink-0 font-mono">
                  {index + 1}
                </span>
                <span className="text-sm sm:text-base font-bold text-white truncate">{item.text}</span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  disabled={disabled || index === 0}
                  onClick={() => handleMoveOrder(index, 'up')}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
                  title="Mover arriba"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={disabled || index === orderItems.length - 1}
                  onClick={() => handleMoveOrder(index, 'down')}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
                  title="Mover abajo"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            </div>
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
          <Check className="w-5 h-6" />
          <span>Confirmar Orden de la Secuencia</span>
        </Button>
      </div>
    )
  }

  // ─── Match Pairs ────────────────────────────────────────────────────────────
  if (exerciseType === 'match') {
    const totalPairs = matchLeftItems.length
    const matchedCount = Object.keys(matchMatches).length

    return (
      <div className="space-y-4 w-full">
        <div className="text-center space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center justify-center gap-1.5">
            <Shuffle className="w-4 h-4" />
            1. Toca un Concepto (izquierda) • 2. Toca su Definición (derecha)
          </span>
          <p className="text-[11px] text-slate-400">
            {matchLeftIndex !== null ? (
              <span className="text-amber-400 font-bold animate-pulse">
                👉 Ahora selecciona la definición correspondiente en la columna derecha
              </span>
            ) : matchedCount === totalPairs && totalPairs > 0 ? (
              <span className="text-emerald-400 font-bold">
                ✓ ¡Todos los pares emparejados! Haz clic en Confirmar.
              </span>
            ) : (
              <span>Empareja todos los conceptos con su definición correspondiente</span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
          {/* Left Column: Concepts */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold text-center bg-slate-900/60 py-1 rounded-lg border border-slate-800">
              Concepto
            </div>
            {matchLeftItems.map((lItem, leftIdx) => {
              const matchedRightIdx = matchMatches[leftIdx]
              const isMatched = matchedRightIdx !== undefined
              const isSelected = matchLeftIndex === leftIdx
              const pairColor = isMatched ? PAIR_COLORS[leftIdx % PAIR_COLORS.length] : null

              return (
                <div key={`left-${leftIdx}`} className="relative group">
                  <button
                    type="button"
                    disabled={hasSubmitted || disabled}
                    onClick={() => handlePickMatchLeft(leftIdx)}
                    className={`w-full p-3 rounded-2xl border-2 text-left text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[56px] flex items-center justify-between gap-2 select-none ${
                      isSelected
                        ? 'bg-indigo-600/40 border-indigo-400 text-white ring-4 ring-indigo-500/40 shadow-lg scale-[1.02]'
                        : isMatched
                          ? `${pairColor?.bg} ${pairColor?.border} text-white shadow-md`
                          : 'bg-slate-900/90 border-slate-700/80 text-slate-200 hover:border-slate-500 hover:bg-slate-850'
                    }`}
                  >
                    <span className="leading-snug">{lItem.text || `Concepto ${leftIdx + 1}`}</span>

                    {isMatched && (
                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono font-black ${pairColor?.badge}`}
                        >
                          {pairColor?.label}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUnpairMatch(leftIdx)
                          }}
                          className="text-slate-400 hover:text-rose-400 p-0.5"
                          title="Desemparejar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Right Column: Definitions */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold text-center bg-slate-900/60 py-1 rounded-lg border border-slate-800">
              Definición
            </div>
            {matchRightItems.map((rItem, rightIdx) => {
              // Check if any left item is paired to this right item
              const pairedLeftEntry = Object.entries(matchMatches).find(([_, rVal]) => rVal === rightIdx)
              const isPaired = pairedLeftEntry !== undefined
              const pairedLeftIdx = isPaired ? Number(pairedLeftEntry[0]) : null
              const pairColor =
                pairedLeftIdx !== null ? PAIR_COLORS[pairedLeftIdx % PAIR_COLORS.length] : null
              const isTargetable = matchLeftIndex !== null && !isPaired

              return (
                <button
                  key={`right-${rightIdx}`}
                  type="button"
                  disabled={hasSubmitted || disabled || (matchLeftIndex === null && !isPaired)}
                  onClick={() => {
                    if (isPaired && pairedLeftIdx !== null) {
                      handleUnpairMatch(pairedLeftIdx)
                    } else {
                      handlePickMatchRight(rightIdx)
                    }
                  }}
                  className={`w-full p-3 rounded-2xl border-2 text-left text-xs sm:text-sm font-semibold transition-all select-none min-h-[56px] flex items-center justify-between gap-2 ${
                    isPaired
                      ? `${pairColor?.bg} ${pairColor?.border} text-white shadow-md cursor-pointer`
                      : isTargetable
                        ? 'bg-slate-900 border-indigo-500 text-white hover:bg-indigo-950/60 ring-2 ring-indigo-500/30 cursor-pointer animate-pulse'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-400 cursor-not-allowed opacity-75'
                  }`}
                >
                  <span className="leading-snug">{rItem.text || `Definición ${rightIdx + 1}`}</span>

                  {isPaired && pairColor && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono font-black shrink-0 ${pairColor.badge}`}
                    >
                      {pairColor.label}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>
            Pares completados: <b className="text-white">{matchedCount}</b> / {totalPairs}
          </span>
          {matchLeftIndex !== null && (
            <span className="text-indigo-400 font-bold">Seleccionando par para #{matchLeftIndex + 1}</span>
          )}
        </div>

        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={handleSubmitMatch}
          disabled={disabled || matchedCount === 0}
          className="w-full gap-2 text-base font-bold py-4 shadow-xl"
        >
          <Check className="w-5 h-6" />
          <span>
            Confirmar Emparejamiento ({matchedCount}/{totalPairs})
          </span>
        </Button>
      </div>
    )
  }

  // ─── Default: MC & TF ────────────────────────────────────────────────────────
  const count = exerciseType === 'tf' ? 2 : Math.min(optionsCount, 4)
  const buttons = BUTTON_CONFIGS.slice(0, count)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full h-full min-h-[260px]">
      {buttons.map((btn, index) => {
        const Icon = btn.icon
        const isTf = exerciseType === 'tf'
        const optionText = typeof options?.[index] === 'string' ? options[index] : null
        const textLabel = isTf ? (index === 0 ? 'Verdadero' : 'Falso') : optionText || btn.label

        return (
          <motion.button
            key={index}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => handleSelectMcTf(index)}
            disabled={disabled || hasSubmitted}
            className={`flex items-center gap-4 p-5 sm:p-6 rounded-3xl border-4 text-white shadow-2xl transition-all cursor-pointer select-none text-left ${btn.bg} ${btn.border}`}
          >
            <div className="w-12 h-12 rounded-2xl bg-black/20 border border-white/20 flex items-center justify-center shrink-0">
              <Icon className="w-7 h-7 text-white drop-shadow-md" />
            </div>
            <div className="flex-1 min-w-0">
              {!isTf && optionText && (
                <span className="text-[10px] uppercase font-mono font-bold text-white/80 block">
                  Opción {btn.label}
                </span>
              )}
              <span className="font-display font-black text-lg sm:text-xl tracking-wide drop-shadow-md line-clamp-2">
                {textLabel}
              </span>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
