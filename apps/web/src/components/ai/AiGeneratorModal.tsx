import type { AiJobStatusResponse } from '@shared/contracts/ai'
import type { ExerciseCreate } from '@shared/contracts/exercises'
import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import { sound } from '../../lib/audio-synth'
import { triggerConfetti } from '../../lib/confetti'
import {
  AlertCircle,
  Bot,
  Check,
  CheckCircle2,
  FileText,
  ListOrdered,
  Plus,
  Sliders,
  Sparkles,
  Trash2,
} from '../../lib/icons'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { MarkdownText } from '../ui/MarkdownText'

interface AiGeneratorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lessonId: string
  onExercisesGenerated: (exercises: ExerciseCreate[]) => void
  hasMaterialFile?: boolean
}

const INTERACTIVE_EXERCISE_TYPES = [
  { id: 'mc', label: 'Opción Múltiple' },
  { id: 'tf', label: 'Verdadero / Falso' },
  { id: 'fill', label: 'Rellenar Hueco' },
  { id: 'order', label: 'Ordenar Secuencia' },
  { id: 'match', label: 'Emparejar Columnas' },
  { id: 'slider', label: 'Slider Numérico' },
]

export function AiGeneratorModal({
  open,
  onOpenChange,
  lessonId,
  onExercisesGenerated,
  hasMaterialFile = false,
}: AiGeneratorModalProps) {
  const [activeProvider, setActiveProvider] = useState<{
    id: string
    name: string
    selectedModel: string
    isConfigured: boolean
  } | null>(null)

  const [selectedTypes, setSelectedTypes] = useState<string[]>(['mc', 'tf', 'fill', 'order', 'match'])
  const [count, setCount] = useState(4)
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')

  const [isGenerating, setIsGenerating] = useState(false)
  const [isSavingToLesson, setIsSavingToLesson] = useState(false)
  const [addedSuccess, setAddedSuccess] = useState(false)
  const [generatedResults, setGeneratedResults] = useState<any[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Load configured active provider from central settings on open
  useEffect(() => {
    if (open) {
      apiFetch<{ providers: any[] }>('/api/ai/providers')
        .then((res) => {
          if (res.providers && res.providers.length > 0) {
            // Find configured provider or default
            const configured = res.providers.find((p) => p.isConfigured || p.hasKey) || res.providers[0]
            if (configured) {
              setActiveProvider({
                id: configured.id,
                name: configured.name,
                selectedModel: configured.selectedModel || configured.defaultModel,
                isConfigured: Boolean(configured.isConfigured || configured.hasKey),
              })
            }
          }
        })
        .catch(console.error)
    }
  }, [open])

  const toggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length > 1) {
        setSelectedTypes(selectedTypes.filter((t) => t !== type))
      }
    } else {
      setSelectedTypes([...selectedTypes, type])
    }
  }

  const handleStartGeneration = async () => {
    setIsGenerating(true)
    setErrorMessage(null)
    setGeneratedResults([])

    try {
      // Launch Job using backend centralized config
      const jobRes = await apiFetch<{ jobId: string }>(`/api/ai/lessons/${lessonId}/ai-generate`, {
        method: 'POST',
        body: JSON.stringify({
          exerciseTypes: selectedTypes,
          count,
          difficulty,
          lang: 'es',
        }),
      })

      // Poll Job until complete
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await apiFetch<AiJobStatusResponse>(`/api/ai/jobs/${jobRes.jobId}`)
          if (statusRes.status === 'done') {
            clearInterval(pollInterval)
            setIsGenerating(false)
            setGeneratedResults(statusRes.exercises || [])
            sound.playVictory()
          } else if (statusRes.status === 'error') {
            clearInterval(pollInterval)
            setIsGenerating(false)
            setErrorMessage(statusRes.error || 'Error en la generación de IA')
            sound.playIncorrect()
          }
        } catch {
          clearInterval(pollInterval)
          setIsGenerating(false)
        }
      }, 500)
    } catch (err: any) {
      setIsGenerating(false)
      setErrorMessage(err.message || 'Error al iniciar trabajo de IA')
      sound.playIncorrect()
    }
  }

  const handleDiscardExercise = (index: number) => {
    sound.playWheelTick()
    setGeneratedResults((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddAllToLesson = async () => {
    if (!lessonId || generatedResults.length === 0) return
    setIsSavingToLesson(true)
    setErrorMessage(null)

    try {
      await apiFetch(`/api/lessons/${lessonId}/exercises/batch`, {
        method: 'POST',
        body: JSON.stringify({
          exercises: generatedResults,
        }),
      })

      sound.playVictory()
      triggerConfetti()
      setAddedSuccess(true)
      onExercisesGenerated(generatedResults)

      setTimeout(() => {
        setIsSavingToLesson(false)
        setAddedSuccess(false)
        setGeneratedResults([])
        onOpenChange(false)
      }, 700)
    } catch (err: any) {
      setIsSavingToLesson(false)
      setErrorMessage(err.message || 'Error al guardar los ejercicios en la lección')
    }
  }

  const handleAddSingleToLesson = async (exercise: any, index: number) => {
    if (!lessonId) return
    setErrorMessage(null)

    try {
      await apiFetch(`/api/lessons/${lessonId}/exercises/batch`, {
        method: 'POST',
        body: JSON.stringify({
          exercises: [exercise],
        }),
      })

      sound.playPowerup()
      setGeneratedResults((prev) => prev.filter((_, i) => i !== index))
      onExercisesGenerated([exercise])
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al añadir el ejercicio a la lección')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Generador Pedagógico con Inteligencia Artificial"
      description="Crea ejercicios interactivos directamente a partir del temario y material de tu lección."
      className="max-w-2xl"
    >
      <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        {/* Active AI Engine Banner (Centralized from AI Module) */}
        <div className="p-4 rounded-2xl bg-surface/80 border border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-accent" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground text-sm">
                  {activeProvider?.name || 'Motor de IA'}
                </span>
                {activeProvider?.isConfigured ? (
                  <Badge variant="success" className="text-[10px] px-2 py-0.5">
                    Configurado
                  </Badge>
                ) : (
                  <Badge variant="warning" className="text-[10px] px-2 py-0.5">
                    Requiere configuración
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted">
                Modelo:{' '}
                <span className="font-mono text-accent font-semibold">
                  {activeProvider?.selectedModel || 'Predeterminado'}
                </span>
              </p>
            </div>
          </div>

          <div className="text-[11px] text-muted italic">Configurado en la pestaña "Motor de IA"</div>
        </div>

        {/* Pedagogical Configuration */}
        <div className="space-y-5">
          {/* Exercise Types Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted block">
              Tipos de Ejercicios Interactivos
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {INTERACTIVE_EXERCISE_TYPES.map((t) => {
                const active = selectedTypes.includes(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleType(t.id)}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      active
                        ? 'bg-indigo-600/20 border-indigo-500 text-accent shadow-sm'
                        : 'bg-surface border-line text-muted hover:text-foreground'
                    }`}
                  >
                    <span>{t.label}</span>
                    {active && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quantity & Difficulty Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-canvas/60 border border-line/80">
            {/* Quantity Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-secondary flex items-center gap-1.5">
                  <ListOrdered className="w-3.5 h-3.5 text-accent" />
                  Cantidad de Ejercicios:
                </span>
                <span className="text-accent font-mono text-sm">{count}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={count}
                onChange={(e) => setCount(Number.parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted font-bold">
                <span>1</span>
                <span>5</span>
                <span>10 ejercicios</span>
              </div>
            </div>

            {/* Difficulty Selector */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-secondary flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-accent" />
                Nivel de Dificultad:
              </span>
              <div className="flex rounded-xl bg-surface p-1 border border-line">
                {(['easy', 'medium', 'hard'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all capitalize cursor-pointer ${
                      difficulty === d
                        ? 'bg-indigo-600 text-on-accent shadow-sm'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    {d === 'easy' ? 'Fácil' : d === 'medium' ? 'Media' : 'Difícil'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Material source banner — sets expectations before generating */}
        {hasMaterialFile && (
          <div
            data-testid="ai-pdf-banner"
            className="flex items-start gap-2 p-3 rounded-xl bg-warning-soft/40 border border-amber-800/80 text-warning text-xs"
          >
            <FileText className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">PDF adjunto a la lección</p>
              <p className="text-warning/80">
                El modelo intentará leer el PDF y extraer su contenido antes de generar las preguntas. Si el
                PDF es una imagen escaneada o no contiene texto seleccionable, la generación se cancelará con
                un mensaje claro.
              </p>
            </div>
          </div>
        )}

        {/* Error Message with Immediate Retry */}
        {errorMessage && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-danger-soft/60 border border-rose-800/80 text-danger text-xs">
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-danger" />
              <div className="space-y-0.5">
                <p className="font-bold text-danger">No se pudieron generar los ejercicios</p>
                <p className="text-danger/90 whitespace-pre-line">{errorMessage}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleStartGeneration}
              disabled={isGenerating}
              className="shrink-0 gap-1.5 text-xs text-danger border-rose-700/60 hover:bg-rose-900/40"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Reintentar</span>
            </Button>
          </div>
        )}

        {/* Generation Results Preview with individual discard & add */}
        {generatedResults.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-success flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {generatedResults.length} Ejercicios Generados con Éxito
              </span>
              <span className="text-[11px] text-muted">
                Descarta los que no te gusten o añádelos a tu lección
              </span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {generatedResults.map((ex, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-canvas border border-line text-xs flex items-start justify-between gap-3 group hover:border-line transition-colors"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="primary" className="text-[10px]">
                        {ex.type === 'mc'
                          ? 'OPCIÓN MÚLTIPLE'
                          : ex.type === 'tf'
                            ? 'V / F'
                            : ex.type === 'fill'
                              ? 'RELLENAR'
                              : ex.type === 'order'
                                ? 'ORDENAR'
                                : ex.type === 'slider'
                                  ? 'SLIDER'
                                  : 'EMPAREJAR'}
                      </Badge>
                      <span className="font-bold text-foreground truncate">{ex.prompt}</span>
                    </div>
                    {ex.explanation && (
                      <div className="text-muted italic text-[11px] leading-relaxed">
                        <MarkdownText content={ex.explanation} />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDiscardExercise(idx)}
                      className="p-2 rounded-xl text-muted hover:text-danger hover:bg-danger-soft/40 transition-colors cursor-pointer"
                      title="Descartar este ejercicio de la lista"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAddSingleToLesson(ex, idx)}
                      className="shrink-0 text-[11px] gap-1 text-success hover:text-success"
                      title="Añadir únicamente este ejercicio a la lección"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Añadir</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={isSavingToLesson}>
            Cerrar
          </Button>

          {generatedResults.length > 0 ? (
            <Button
              variant="success"
              size="md"
              onClick={handleAddAllToLesson}
              isLoading={isSavingToLesson}
              disabled={isSavingToLesson}
              className="gap-2 bg-gradient-to-r from-emerald-700 to-green-700 hover:from-emerald-800 hover:to-green-800 text-on-accent shadow-lg shadow-emerald-500/20"
            >
              {addedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡Añadidos con Éxito!</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Añadir todos ({generatedResults.length}) a la Lección</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={handleStartGeneration}
              isLoading={isGenerating}
              className="gap-2 shadow-lg shadow-indigo-500/20"
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating ? 'Generando con IA...' : 'Generar Ejercicios con IA'}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  )
}
