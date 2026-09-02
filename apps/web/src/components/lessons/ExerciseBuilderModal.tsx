import {
  AlignLeft,
  Award,
  BarChart,
  CheckCircle2,
  CheckSquare,
  Clock,
  HelpCircle,
  ListOrdered,
  MapPin,
  MessageSquare,
  Plus,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Type,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import { sound } from '../../lib/audio-synth'
import { triggerConfetti } from '../../lib/confetti'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { CustomSelect } from '../ui/Select'

interface ExerciseBuilderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lessonId: string
  exerciseToEdit?: any
  onExerciseCreated: () => void
}

type ExerciseType =
  | 'mc'
  | 'tf'
  | 'fill'
  | 'order'
  | 'match'
  | 'short'
  | 'open'
  | 'poll'
  | 'type_answer'
  | 'slider'
  | 'pin_drop'
  | 'word_cloud'
  | 'slide'

const EXERCISE_TYPES: { id: ExerciseType; label: string; icon: any; description: string }[] = [
  {
    id: 'mc',
    label: 'Opción Múltiple',
    icon: CheckSquare,
    description: 'Pregunta con varias opciones y una sola respuesta correcta.',
  },
  {
    id: 'tf',
    label: 'Verdadero / Falso',
    icon: CheckCircle2,
    description: 'Enunciado simple para determinar su veracidad.',
  },
  {
    id: 'fill',
    label: 'Rellenar Espacio',
    icon: AlignLeft,
    description: 'Texto con espacios [___] para completar con la palabra clave.',
  },
  {
    id: 'type_answer',
    label: 'Respuesta Exacta',
    icon: Type,
    description: 'Escribir el término o cifra exacta sin opciones a la vista.',
  },
  {
    id: 'slider',
    label: 'Slider Numérico',
    icon: SlidersHorizontal,
    description: 'Ajustar un valor en una barra numérica (fechas, porcentajes).',
  },
  {
    id: 'order',
    label: 'Ordenar Elementos',
    icon: ListOrdered,
    description: 'Secuencia de pasos o eventos para ordenar cronológica o lógicamente.',
  },
  {
    id: 'match',
    label: 'Emparejar Columnas',
    icon: Shuffle,
    description: 'Pares de conceptos y sus definiciones correspondientes.',
  },
  {
    id: 'pin_drop',
    label: 'Marcar en Imagen',
    icon: MapPin,
    description: 'Colocar un marcador sobre una coordenada específica de una imagen.',
  },
  {
    id: 'word_cloud',
    label: 'Nube de Palabras',
    icon: MessageSquare,
    description: 'Recopilación libre de palabras clave sin puntuación competitiva.',
  },
  {
    id: 'short',
    label: 'Respuesta Corta',
    icon: HelpCircle,
    description: 'Pregunta conceptual que requiere una palabra o frase precisa.',
  },
  {
    id: 'open',
    label: 'Pregunta Abierta',
    icon: MessageSquare,
    description: 'Pregunta de desarrollo para debate o reflexión en clase.',
  },
  {
    id: 'slide',
    label: 'Diapositiva',
    icon: Sparkles,
    description: 'Pantalla informativa con texto entre preguntas (sin scoring).',
  },
]

export function ExerciseBuilderModal({
  open,
  onOpenChange,
  lessonId,
  exerciseToEdit,
  onExerciseCreated,
}: ExerciseBuilderModalProps) {
  const [type, setType] = useState<ExerciseType>('mc')
  const [prompt, setPrompt] = useState('')
  const [explanation, setExplanation] = useState('')
  const [points, setPoints] = useState(2)
  const [timeSec, setTimeSec] = useState(30)
  const [pointsMultiplier, setPointsMultiplier] = useState(1)
  const [isSaving, setIsSaving] = useState(false)

  // MC options
  const [mcOptions, setMcOptions] = useState(['', '', '', ''])
  const [mcCorrectIndex, setMcCorrectIndex] = useState(0)

  // TF option
  const [tfIsTrue, setTfIsTrue] = useState(true)

  // Fill valid answers and distractors
  const [fillAnswers, setFillAnswers] = useState('')
  const [fillDistractors, setFillDistractors] = useState('')

  // Order items
  const [orderItems, setOrderItems] = useState(['Paso 1', 'Paso 2', 'Paso 3'])

  // Match pairs
  const [matchPairs, setMatchPairs] = useState<{ left: string; right: string }[]>([
    { left: 'Concepto A', right: 'Definición A' },
    { left: 'Concepto B', right: 'Definición B' },
  ])

  // Slider config
  const [sliderMin, setSliderMin] = useState(0)
  const [sliderMax, setSliderMax] = useState(100)
  const [sliderCorrect, setSliderCorrect] = useState(50)
  const [sliderTolerance, setSliderTolerance] = useState(5)

  // Pin drop config
  const [pinImageUrl, setPinImageUrl] = useState('')
  const [pinCorrectX, setPinCorrectX] = useState(100)
  const [pinCorrectY, setPinCorrectY] = useState(100)
  const [pinTolerance, setPinTolerance] = useState(50)

  // Word cloud sample words
  const [cloudSampleWords, setCloudSampleWords] = useState('')

  // Slide content
  const [slideContent, setSlideContent] = useState('')
  const [slideDuration, setSlideDuration] = useState(8)

  // Sync state when opening or editing an exercise
  useEffect(() => {
    if (exerciseToEdit) {
      setType(exerciseToEdit.type || 'mc')
      setPrompt(exerciseToEdit.prompt || '')
      setExplanation(exerciseToEdit.explanation || '')
      setPoints(exerciseToEdit.points || 2)
      setTimeSec(exerciseToEdit.timeSec || 30)
      setPointsMultiplier(exerciseToEdit.pointsMultiplier || 1)

      if (exerciseToEdit.answerJson) {
        try {
          const ans = JSON.parse(exerciseToEdit.answerJson)
          if (ans.validAnswers && Array.isArray(ans.validAnswers)) {
            setFillAnswers(ans.validAnswers.join(', '))
          } else if (ans.validAnswer) {
            setFillAnswers(String(ans.validAnswer))
          }
          if (ans.isTrue !== undefined) {
            setTfIsTrue(Boolean(ans.isTrue))
          }
          if (ans.correctIndex !== undefined) {
            setMcCorrectIndex(ans.correctIndex)
          }
        } catch {
          // ignore
        }
      }

      if (exerciseToEdit.optionsJson) {
        try {
          const opts = JSON.parse(exerciseToEdit.optionsJson)
          if (Array.isArray(opts)) {
            if (exerciseToEdit.type === 'mc' || exerciseToEdit.type === 'poll') {
              setMcOptions(opts.length >= 2 ? opts : ['', '', '', ''])
            } else if (exerciseToEdit.type === 'order') {
              setOrderItems(opts)
            } else if (exerciseToEdit.type === 'match') {
              setMatchPairs(opts)
            } else if (exerciseToEdit.type === 'fill') {
              // Extract distractors: options that are not in validAnswers
              try {
                const ans = JSON.parse(exerciseToEdit.answerJson || '{}')
                const validList: string[] = Array.isArray(ans.validAnswers) ? ans.validAnswers : []
                const distractors = opts.filter((o: string) => !validList.includes(o))
                setFillDistractors(distractors.join(', '))
              } catch {
                setFillDistractors(opts.join(', '))
              }
            }
          }
        } catch {
          // ignore
        }
      }
    } else {
      setType('mc')
      setPrompt('')
      setExplanation('')
      setPoints(2)
      setTimeSec(30)
      setPointsMultiplier(1)
      setMcOptions(['', '', '', ''])
      setMcCorrectIndex(0)
      setTfIsTrue(true)
      setFillAnswers('')
      setFillDistractors('')
      setOrderItems(['Paso 1', 'Paso 2', 'Paso 3'])
      setMatchPairs([
        { left: 'Concepto A', right: 'Definición A' },
        { left: 'Concepto B', right: 'Definición B' },
      ])
    }
  }, [exerciseToEdit, open])

  const handleAddMcOption = () => {
    if (mcOptions.length < 6) {
      setMcOptions([...mcOptions, ''])
    }
  }

  const handleRemoveMcOption = (idx: number) => {
    if (mcOptions.length > 2) {
      const updated = mcOptions.filter((_, i) => i !== idx)
      setMcOptions(updated)
      if (mcCorrectIndex >= updated.length) {
        setMcCorrectIndex(0)
      }
    }
  }

  const handleSaveExercise = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || !lessonId) return

    setIsSaving(true)

    try {
      let optionsJson: string | null = null
      let answerJson = '{}'

      if (type === 'mc' || type === 'poll') {
        const validOptions = mcOptions.filter((opt) => opt.trim() !== '')
        if (validOptions.length < 2) {
          alert('Debes ingresar al menos 2 opciones válidas')
          setIsSaving(false)
          return
        }
        optionsJson = JSON.stringify(validOptions)
        answerJson = JSON.stringify({ correctIndex: Math.min(mcCorrectIndex, validOptions.length - 1) })
      } else if (type === 'tf') {
        optionsJson = JSON.stringify(['Verdadero', 'Falso'])
        answerJson = JSON.stringify({ isTrue: tfIsTrue })
      } else if (type === 'fill') {
        const validWords = fillAnswers
          .split(',')
          .map((w) => w.trim())
          .filter(Boolean)
        const distractors = fillDistractors
          .split(',')
          .map((w) => w.trim())
          .filter(Boolean)
        if (validWords.length === 0) {
          alert('Ingresa al menos una palabra o respuesta correcta')
          setIsSaving(false)
          return
        }
        const allOpts = Array.from(new Set([...validWords, ...distractors]))
        optionsJson = JSON.stringify(allOpts)
        answerJson = JSON.stringify({ validAnswers: validWords })
      } else if (type === 'order') {
        const validSteps = orderItems.filter((s) => s.trim() !== '')
        optionsJson = JSON.stringify(validSteps)
        answerJson = JSON.stringify({ correctOrder: validSteps.map((_, i) => i) })
      } else if (type === 'match') {
        const validPairs = matchPairs.filter((p) => p.left.trim() && p.right.trim())
        optionsJson = JSON.stringify(validPairs)
        answerJson = JSON.stringify({ pairs: validPairs })
      } else if (type === 'short') {
        const validKeywords = fillAnswers
          .split(',')
          .map((w) => w.trim())
          .filter(Boolean)
        optionsJson = null
        answerJson = JSON.stringify({ validAnswers: validKeywords })
      } else if (type === 'type_answer') {
        const validAnswers = fillAnswers
          .split(',')
          .map((w) => w.trim())
          .filter(Boolean)
        if (validAnswers.length === 0) {
          alert('Ingresa al menos una respuesta válida')
          setIsSaving(false)
          return
        }
        optionsJson = null
        answerJson = JSON.stringify({ validAnswers, caseSensitive: false })
      } else if (type === 'slider') {
        optionsJson = null
        answerJson = JSON.stringify({
          min: sliderMin,
          max: sliderMax,
          correctValue: sliderCorrect,
          tolerance: sliderTolerance,
        })
      } else if (type === 'pin_drop') {
        optionsJson = null
        answerJson = JSON.stringify({
          imageUrl: pinImageUrl,
          correctX: pinCorrectX,
          correctY: pinCorrectY,
          tolerancePx: pinTolerance,
        })
      } else if (type === 'word_cloud') {
        const samples = cloudSampleWords
          .split(',')
          .map((w) => w.trim())
          .filter(Boolean)
        optionsJson = null
        answerJson = JSON.stringify({ sampleWords: samples })
      } else if (type === 'slide') {
        optionsJson = null
        answerJson = JSON.stringify({ durationSec: slideDuration })
      } else if (type === 'open') {
        optionsJson = null
        answerJson = JSON.stringify({ type: 'open' })
      }

      if (exerciseToEdit) {
        await apiFetch(`/api/exercises/${exerciseToEdit.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            type,
            prompt,
            optionsJson,
            answerJson,
            explanation: explanation.trim() || undefined,
            points,
            timeSec,
            pointsMultiplier,
          }),
        })
      } else {
        await apiFetch(`/api/lessons/${lessonId}/exercises`, {
          method: 'POST',
          body: JSON.stringify({
            type,
            prompt,
            optionsJson,
            answerJson,
            explanation: explanation.trim() || undefined,
            points,
            timeSec,
            pointsMultiplier,
          }),
        })
      }

      sound.playVictory()
      triggerConfetti()
      onExerciseCreated()
      onOpenChange(false)

      // Reset form
      setPrompt('')
      setExplanation('')
      setMcOptions(['', '', '', ''])
      setMcCorrectIndex(0)
    } catch (err: any) {
      sound.playIncorrect()
      alert(err.message || 'Error al guardar el ejercicio')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={exerciseToEdit ? 'Editar Ejercicio' : 'Constructor Manual de Ejercicios'}
      description={
        exerciseToEdit
          ? 'Modifica los parámetros pedagógicos y respuesta del ejercicio.'
          : 'Crea preguntas interactivas paso a paso sin necesidad de IA.'
      }
      className="max-w-3xl"
    >
      <form onSubmit={handleSaveExercise} className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        {/* Type Selector Tabs */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            1. Selecciona el Tipo de Ejercicio
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {EXERCISE_TYPES.map((t) => {
              const Icon = t.icon
              const isSelected = type === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1.5 ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/60 ring-2 ring-indigo-500/30'
                      : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span className="font-bold text-xs text-white">{t.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-1">{t.description}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Prompt */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Enunciado / Pregunta del Ejercicio</label>
          <textarea
            rows={2}
            placeholder={
              type === 'fill'
                ? 'Ej: El proceso por el cual las plantas fabrican su alimento es la [___].'
                : 'Ej: ¿Cuál es el órgano principal del sistema circulatorio humano?'
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        {/* Dynamic Controls based on Type */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block">
            2. Configuración de Respuestas
          </span>

          {/* MC & POLL */}
          {(type === 'mc' || type === 'poll') && (
            <div className="space-y-3">
              <span className="text-[11px] text-slate-400 block">
                Escribe las opciones y marca cuál es la respuesta correcta:
              </span>
              {mcOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="mc_correct"
                    checked={mcCorrectIndex === idx}
                    onChange={() => setMcCorrectIndex(idx)}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <Input
                    placeholder={`Opción ${String.fromCharCode(65 + idx)}`}
                    value={opt}
                    onChange={(e) => {
                      const copy = [...mcOptions]
                      copy[idx] = e.target.value
                      setMcOptions(copy)
                    }}
                    required
                    className="text-xs"
                  />
                  {mcOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMcOption(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              {mcOptions.length < 6 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddMcOption}
                  className="gap-1.5 text-xs mt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Opción</span>
                </Button>
              )}
            </div>
          )}

          {/* TF */}
          {type === 'tf' && (
            <div className="space-y-2">
              <span className="text-xs text-slate-300 block">Respuesta Correcta:</span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setTfIsTrue(true)}
                  className={`flex-1 p-3 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                    tfIsTrue
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  Verdadero
                </button>
                <button
                  type="button"
                  onClick={() => setTfIsTrue(false)}
                  className={`flex-1 p-3 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                    !tfIsTrue
                      ? 'bg-rose-950 border-rose-500 text-rose-300 ring-2 ring-rose-500/20'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  Falso
                </button>
              </div>
            </div>
          )}

          {/* FILL */}
          {type === 'fill' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 block font-semibold">
                  Palabra(s) Correcta(s) (la que completa el espacio [___]):
                </label>
                <Input
                  placeholder="Ej: fotosíntesis, fotosintesis"
                  value={fillAnswers}
                  onChange={(e) => setFillAnswers(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 block font-semibold">
                  Opciones de Distracción / Otras palabras para elegir (separadas por comas):
                </label>
                <Input
                  placeholder="Ej: respiración, digestión, combustión"
                  value={fillDistractors}
                  onChange={(e) => setFillDistractors(e.target.value)}
                  className="text-xs"
                />
                <p className="text-[10px] text-slate-400">
                  Los alumnos verán estas palabras y la correcta como botones barajados para seleccionar sin
                  tener que escribir.
                </p>
              </div>
            </div>
          )}

          {/* SHORT */}
          {type === 'short' && (
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 block">
                Palabras o Frases Aceptadas (separadas por comas):
              </label>
              <Input
                placeholder="Ej: fotosíntesis, fotosintesis, FOTOSINTESIS"
                value={fillAnswers}
                onChange={(e) => setFillAnswers(e.target.value)}
                required
                className="text-xs"
              />
            </div>
          )}

          {/* ORDER */}
          {type === 'order' && (
            <div className="space-y-2">
              <span className="text-xs text-slate-300 block">
                Escribe los pasos en el <b>orden correcto</b> (el juego los mezclará al proyectar):
              </span>
              {orderItems.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Badge variant="primary" className="shrink-0 text-xs">
                    {idx + 1}
                  </Badge>
                  <Input
                    value={step}
                    onChange={(e) => {
                      const copy = [...orderItems]
                      copy[idx] = e.target.value
                      setOrderItems(copy)
                    }}
                    required
                    className="text-xs"
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setOrderItems([...orderItems, `Paso ${orderItems.length + 1}`])}
                className="gap-1 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Paso</span>
              </Button>
            </div>
          )}

          {/* MATCH */}
          {type === 'match' && (
            <div className="space-y-2">
              <span className="text-xs text-slate-300 block">Define los pares de Concepto y Definición:</span>
              {matchPairs.map((pair, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="Concepto"
                    value={pair.left}
                    onChange={(e) => {
                      const copy = [...matchPairs]
                      if (copy[idx]) {
                        copy[idx].left = e.target.value
                        setMatchPairs(copy)
                      }
                    }}
                    required
                    className="text-xs"
                  />
                  <span className="text-slate-500">↔</span>
                  <Input
                    placeholder="Definición / Término"
                    value={pair.right}
                    onChange={(e) => {
                      const copy = [...matchPairs]
                      if (copy[idx]) {
                        copy[idx].right = e.target.value
                        setMatchPairs(copy)
                      }
                    }}
                    required
                    className="text-xs"
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setMatchPairs([...matchPairs, { left: '', right: '' }])}
                className="gap-1 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Par</span>
              </Button>
            </div>
          )}

          {/* OPEN */}
          {type === 'open' && (
            <p className="text-xs text-slate-400 italic">
              Las preguntas abiertas permiten a los estudiantes redactar libremente sus respuestas para debate
              o revisión en clase.
            </p>
          )}

          {/* TYPE ANSWER */}
          {type === 'type_answer' && (
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 block">
                Respuestas Aceptadas (separadas por comas, sin importar mayúsculas):
              </label>
              <Input
                placeholder="Ej: fotosíntesis, Fotosintesis, FOTOSÍNTESIS"
                value={fillAnswers}
                onChange={(e) => setFillAnswers(e.target.value)}
                required
                className="text-xs"
              />
            </div>
          )}

          {/* SLIDER */}
          {type === 'slider' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Valor Mínimo</label>
                <Input
                  type="number"
                  value={sliderMin}
                  onChange={(e) => setSliderMin(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Valor Máximo</label>
                <Input
                  type="number"
                  value={sliderMax}
                  onChange={(e) => setSliderMax(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Respuesta Correcta</label>
                <Input
                  type="number"
                  value={sliderCorrect}
                  onChange={(e) => setSliderCorrect(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Tolerancia (±)</label>
                <Input
                  type="number"
                  value={sliderTolerance}
                  onChange={(e) => setSliderTolerance(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          {/* PIN DROP */}
          {type === 'pin_drop' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">URL de la Imagen</label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={pinImageUrl}
                  onChange={(e) => setPinImageUrl(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Coordenada X correcta</label>
                  <Input
                    type="number"
                    value={pinCorrectX}
                    onChange={(e) => setPinCorrectX(Number(e.target.value))}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Coordenada Y correcta</label>
                  <Input
                    type="number"
                    value={pinCorrectY}
                    onChange={(e) => setPinCorrectY(Number(e.target.value))}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Tolerancia (px)</label>
                  <Input
                    type="number"
                    value={pinTolerance}
                    onChange={(e) => setPinTolerance(Number(e.target.value))}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* WORD CLOUD */}
          {type === 'word_cloud' && (
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 block">
                Palabras de muestra esperadas (separadas por comas, opcional):
              </label>
              <Input
                placeholder="Ej: célula, mitocondria, ADN, núcleo"
                value={cloudSampleWords}
                onChange={(e) => setCloudSampleWords(e.target.value)}
                className="text-xs"
              />
              <p className="text-[10px] text-slate-500">
                La nube de palabras no tiene puntuación competitiva.
              </p>
            </div>
          )}

          {/* SLIDE */}
          {type === 'slide' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Contenido de la diapositiva</label>
                <textarea
                  rows={3}
                  placeholder="Texto informativo que se mostrará entre preguntas..."
                  value={slideContent}
                  onChange={(e) => setSlideContent(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Duración (segundos)</label>
                <CustomSelect
                  value={slideDuration}
                  onChange={(val) => setSlideDuration(Number(val))}
                  options={[
                    { value: 5, label: '5 segundos' },
                    { value: 8, label: '8 segundos' },
                    { value: 10, label: '10 segundos' },
                    { value: 15, label: '15 segundos' },
                  ]}
                />
              </div>
            </div>
          )}
        </div>

        {/* Pedagogical Metadata (Points, Time, Multiplier, Explanation) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Puntaje del Ejercicio
            </label>
            <CustomSelect
              value={points}
              onChange={(val) => setPoints(Number(val))}
              options={[
                { value: 1, label: '1 Punto' },
                { value: 2, label: '2 Puntos' },
                { value: 3, label: '3 Puntos' },
                { value: 5, label: '5 Puntos (Desafío)' },
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Tiempo Límite
            </label>
            <CustomSelect
              value={timeSec}
              onChange={(val) => setTimeSec(Number(val))}
              options={[
                { value: 15, label: '15 Segundos (Rápido)' },
                { value: 30, label: '30 Segundos (Estándar)' },
                { value: 45, label: '45 Segundos (Medio)' },
                { value: 60, label: '60 Segundos (Reflexivo)' },
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Multiplicador
            </label>
            <CustomSelect
              value={pointsMultiplier}
              onChange={(val) => setPointsMultiplier(Number(val))}
              options={[
                { value: 1, label: '×1 (Normal)' },
                { value: 2, label: '×2 (Doble Puntos)' },
                { value: 3, label: '×3 (Triple Puntos)' },
                { value: 5, label: '×5 (Máximo)' },
              ]}
            />
          </div>
        </div>

        {/* Feedback / Explanation */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Explicación Pedagógica (Feedback al responder)
          </label>
          <Input
            placeholder="Ej: La fotosíntesis ocurre en los cloroplastos utilizando luz solar y clorofila."
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            className="text-xs"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSaving} className="gap-1.5">
            <Plus className="w-4 h-4" />
            <span>Guardar Ejercicio</span>
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
