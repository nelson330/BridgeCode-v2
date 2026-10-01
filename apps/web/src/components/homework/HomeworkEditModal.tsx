import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import { sound } from '../../lib/audio-synth'
import { notify } from '../../lib/feedback'
import { BookOpen, Calendar, CheckSquare, ClipboardList, Edit3, MessageSquare } from '../../lib/icons'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { FormError } from '../ui/FormError'
import { Input } from '../ui/Input'

interface HomeworkEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  classId: string
  homework: {
    id: string
    title: string
    kind?: 'quiz' | 'reading' | 'discussion'
    instructions?: string
    dueAt: string
    attemptLimit?: number
    allowAfterDue?: boolean
    lessonTitle?: string
  } | null
  onHomeworkUpdated: () => void
}

export function HomeworkEditModal({
  open,
  onOpenChange,
  classId,
  homework,
  onHomeworkUpdated,
}: HomeworkEditModalProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<'quiz' | 'reading' | 'discussion'>('quiz')
  const [instructions, setInstructions] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [attemptLimit, setAttemptLimit] = useState(3)
  const [allowAfterDue, setAllowAfterDue] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (homework) {
      setTitle(homework.title || '')
      setKind(homework.kind || 'quiz')
      setInstructions(homework.instructions || '')
      setAttemptLimit(homework.attemptLimit || 3)
      setAllowAfterDue(Boolean(homework.allowAfterDue))

      if (homework.dueAt) {
        const d = new Date(homework.dueAt)
        setDueAt(d.toISOString().slice(0, 16))
      }
    }
  }, [homework])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!homework || !title.trim()) return

    setIsSaving(true)
    try {
      await apiFetch(`/api/classes/${classId}/homework/${homework.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: title.trim(),
          kind,
          instructions: instructions.trim() || undefined,
          dueAt: new Date(dueAt).toISOString(),
          attemptLimit,
          allowAfterDue,
        }),
      })

      sound.playPowerup()
      onHomeworkUpdated()
      onOpenChange(false)
    } catch (err: any) {
      sound.playIncorrect()
      setFormError(err.message || 'Error al actualizar la tarea')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Editar Tarea / Actividad"
      description="Modifica las fechas de entrega, tipo de actividad o instrucciones pedagógicas."
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        <FormError message={formError} />
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-canvas border border-line flex items-center justify-between">
            <span className="text-xs text-muted">Lección Vinculada:</span>
            <span className="text-xs font-bold text-accent">{homework?.lessonTitle}</span>
          </div>

          <div>
            <label
              className="text-xs font-bold text-secondary uppercase tracking-wider block mb-1.5"
              htmlFor="homeworkeditmodal-field-1"
            >
              Título de la Tarea
            </label>
            <Input
              id="homeworkeditmodal-field-1"
              placeholder="Ej: Repaso de Leyes de Newton"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Modalidad de Tarea */}
          <div className="space-y-2">
            <label
              className="text-xs font-bold text-secondary uppercase tracking-wider block"
              htmlFor="homeworkeditmodal-field-2"
            >
              Tipo de Actividad
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setKind('quiz')}
                className={`p-3 rounded-xl border text-left flex flex-col items-center justify-center gap-1.5 transition-all ${
                  kind === 'quiz'
                    ? 'bg-indigo-600/20 border-indigo-500 text-foreground'
                    : 'bg-canvas border-line text-muted hover:border-line'
                }`}
              >
                <CheckSquare className="w-5 h-5 text-accent" />
                <span className="text-xs font-bold">Cuestionario</span>
              </button>

              <button
                type="button"
                onClick={() => setKind('reading')}
                className={`p-3 rounded-xl border text-left flex flex-col items-center justify-center gap-1.5 transition-all ${
                  kind === 'reading'
                    ? 'bg-purple-600/20 border-purple-500 text-foreground'
                    : 'bg-canvas border-line text-muted hover:border-line'
                }`}
              >
                <BookOpen className="w-5 h-5 text-purple-400" />
                <span className="text-xs font-bold">Lectura</span>
              </button>

              <button
                type="button"
                onClick={() => setKind('discussion')}
                className={`p-3 rounded-xl border text-left flex flex-col items-center justify-center gap-1.5 transition-all ${
                  kind === 'discussion'
                    ? 'bg-amber-600/20 border-amber-500 text-foreground'
                    : 'bg-canvas border-line text-muted hover:border-line'
                }`}
              >
                <MessageSquare className="w-5 h-5 text-warning" />
                <span className="text-xs font-bold">Debate</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-secondary uppercase tracking-wider block">
              Instrucciones Específicas
            </label>
            <textarea
              id="homeworkeditmodal-field-2"
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Instrucciones para tus alumnos..."
              className="w-full px-4 py-2.5 rounded-xl bg-canvas border border-line text-xs text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className="text-xs font-bold text-secondary uppercase tracking-wider block mb-1.5"
                htmlFor="homeworkeditmodal-field-3"
              >
                Fecha y Hora Límite
              </label>
              <Input
                id="homeworkeditmodal-field-3"
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                required
              />
            </div>

            <div>
              <label
                className="text-xs font-bold text-secondary uppercase tracking-wider block mb-1.5"
                htmlFor="homeworkeditmodal-field-4"
              >
                Límite de Intentos
              </label>
              <Input
                id="homeworkeditmodal-field-4"
                type="number"
                min={1}
                max={10}
                value={attemptLimit}
                onChange={(e) => setAttemptLimit(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving || !title.trim()} className="gap-2">
            <Edit3 className="w-4 h-4" />
            <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
