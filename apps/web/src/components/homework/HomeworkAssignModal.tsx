import { useState } from 'react'
import { apiFetch } from '../../lib/api'
import { sound } from '../../lib/audio-synth'
import { triggerConfetti } from '../../lib/confetti'
import { notify } from '../../lib/feedback'
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  MessageSquare,
  Sparkles,
} from '../../lib/icons'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { FormError } from '../ui/FormError'
import { Input } from '../ui/Input'
import { CustomSelect } from '../ui/Select'

interface HomeworkAssignModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  classId: string
  classes: any[]
  lessons: any[]
  onHomeworkAssigned: () => void
}

type HomeworkKind = 'quiz' | 'reading' | 'discussion'

export function HomeworkAssignModal({
  open,
  onOpenChange,
  classId,
  classes,
  lessons,
  onHomeworkAssigned,
}: HomeworkAssignModalProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const [selectedClassId, setSelectedClassId] = useState(classId || (classes[0]?.id ?? ''))
  const [selectedLessonId, setSelectedLessonId] = useState(lessons[0]?.id ?? '')
  const [kind, setKind] = useState<HomeworkKind>('quiz')
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(Date.now() + 7 * 24 * 3600 * 1000)
    return d.toISOString().split('T')[0]
  })
  const [attemptLimit, setAttemptLimit] = useState(3)
  const [allowAfterDue, _setAllowAfterDue] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!title.trim() || !selectedClassId || !selectedLessonId) {
      setFormError('Por favor completa el título y selecciona una lección')
      return
    }

    setIsSaving(true)

    try {
      const dueIso = new Date(`${dueDate}T23:59:59`).toISOString()

      await apiFetch(`/api/classes/${selectedClassId}/homework`, {
        method: 'POST',
        body: JSON.stringify({
          lessonId: selectedLessonId,
          title: title.trim(),
          kind,
          instructions: instructions.trim() || undefined,
          dueAt: dueIso,
          attemptLimit,
          allowAfterDue,
        }),
      })

      // If discussion type, also auto-create a wall post with the discussion prompt
      if (kind === 'discussion') {
        await apiFetch(`/api/classes/${selectedClassId}/wall/posts`, {
          method: 'POST',
          body: JSON.stringify({
            content: `[Debate de Clase] ${title.trim()}\n\n${instructions.trim() || 'Participa compartiendo tu opinión y respondiendo a tus compañeros.'}`,
          }),
        }).catch(() => {})
      }

      sound.playVictory()
      triggerConfetti()
      onHomeworkAssigned()
      onOpenChange(false)
      setTitle('')
      setInstructions('')
    } catch (err: any) {
      sound.playIncorrect()
      setFormError(err.message || 'Error al asignar la tarea')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Asignar Nueva Tarea o Actividad"
      description="Programa tareas interactivas, lecturas guiadas o debates escolares para tus alumnos."
      className="max-w-2xl"
    >
      <form onSubmit={handleAssign} className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        <FormError message={formError} />
        {/* Task Type Selector */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted block">
            1. Modalidad de la Actividad
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setKind('quiz')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-1 ${
                kind === 'quiz'
                  ? 'border-indigo-500 bg-accent-soft/60 ring-2 ring-indigo-500/30'
                  : 'border-line bg-canvas hover:border-line'
              }`}
            >
              <div className="flex items-center gap-2">
                <ClipboardList className={`w-4 h-4 ${kind === 'quiz' ? 'text-accent' : 'text-muted'}`} />
                <span className="font-bold text-xs text-foreground">Cuestionario</span>
              </div>
              <p className="text-[11px] text-muted">
                Resuelve los ejercicios interactivos de la lección con autocorrección.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setKind('reading')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-1 ${
                kind === 'reading'
                  ? 'border-indigo-500 bg-accent-soft/60 ring-2 ring-indigo-500/30'
                  : 'border-line bg-canvas hover:border-line'
              }`}
            >
              <div className="flex items-center gap-2">
                <BookOpen className={`w-4 h-4 ${kind === 'reading' ? 'text-accent' : 'text-muted'}`} />
                <span className="font-bold text-xs text-foreground">Lectura y Estudio</span>
              </div>
              <p className="text-[11px] text-muted">
                Lectura comprensiva del material temático y apuntes de la clase.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setKind('discussion')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-1 ${
                kind === 'discussion'
                  ? 'border-indigo-500 bg-accent-soft/60 ring-2 ring-indigo-500/30'
                  : 'border-line bg-canvas hover:border-line'
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare
                  className={`w-4 h-4 ${kind === 'discussion' ? 'text-accent' : 'text-muted'}`}
                />
                <span className="font-bold text-xs text-foreground">Debate en Muro</span>
              </div>
              <p className="text-[11px] text-muted">
                Participación en el muro escolar respondiendo a una consigna o pregunta.
              </p>
            </button>
          </div>
        </div>

        {/* Class & Lesson Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-secondary" htmlFor="homeworkassignmodal-field-1">
              Clase Asignada
            </label>
            <CustomSelect
              value={selectedClassId}
              onChange={(val) => setSelectedClassId(val)}
              options={classes.map((c) => ({
                value: c.id,
                label: `${c.name} (${c.code})`,
              }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-secondary">Lección de Origen</label>
            <CustomSelect
              value={selectedLessonId}
              onChange={(val) => setSelectedLessonId(val)}
              options={lessons.map((l) => ({
                value: l.id,
                label: l.title,
              }))}
            />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-secondary">Título de la Tarea</label>
          <Input
            id="homeworkassignmodal-field-1"
            placeholder={
              kind === 'quiz'
                ? 'Ej: Tarea 1: Cuestionario del Sistema Solar'
                : kind === 'reading'
                  ? 'Ej: Lectura Obligatoria: La Estructura Celular'
                  : 'Ej: Debate: ¿Por qué es crucial el cuidado del agua?'
            }
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="text-xs"
          />
        </div>

        {/* Instructions / Prompt */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-secondary" htmlFor="homeworkassignmodal-field-2">
            {kind === 'discussion' ? 'Pregunta o Consigna de Debate' : 'Instrucciones para los Alumnos'}
          </label>
          <textarea
            id="homeworkassignmodal-field-2"
            rows={3}
            placeholder={
              kind === 'discussion'
                ? 'Escribe la pregunta que los alumnos deben responder en el muro de clase...'
                : 'Instrucciones adicionales para la realización de la actividad...'
            }
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="w-full p-3 rounded-xl bg-canvas border border-line text-xs text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Due Date & Attempt Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              className="text-xs font-semibold text-secondary flex items-center gap-1"
              htmlFor="homeworkassignmodal-field-3"
            >
              <Calendar className="w-3.5 h-3.5 text-warning" />
              Fecha Límite de Entrega
            </label>
            <Input
              id="homeworkassignmodal-field-3"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-secondary flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-accent" />
              Límite de Intentos
            </label>
            <CustomSelect
              value={attemptLimit}
              onChange={(val) => setAttemptLimit(Number(val))}
              options={[
                { value: 1, label: '1 Intento (Evaluación)' },
                { value: 3, label: '3 Intentos (Formativo)' },
                { value: 5, label: '5 Intentos (Práctica)' },
              ]}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSaving} className="gap-1.5">
            <Sparkles className="w-4 h-4" />
            <span>Asignar Tarea a la Clase</span>
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
