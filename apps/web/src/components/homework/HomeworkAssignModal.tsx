import { BookOpen, Calendar, CheckCircle2, ClipboardList, Clock, MessageSquare, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { apiFetch } from '../../lib/api'
import { sound } from '../../lib/audio-synth'
import { triggerConfetti } from '../../lib/confetti'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
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
    if (!title.trim() || !selectedClassId || !selectedLessonId) {
      alert('Por favor completa el título y selecciona una lección')
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
      alert(err.message || 'Error al asignar la tarea')
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
        {/* Task Type Selector */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            1. Modalidad de la Actividad
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setKind('quiz')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-1 ${
                kind === 'quiz'
                  ? 'border-indigo-500 bg-indigo-950/60 ring-2 ring-indigo-500/30'
                  : 'border-slate-800 bg-slate-950 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <ClipboardList
                  className={`w-4 h-4 ${kind === 'quiz' ? 'text-indigo-400' : 'text-slate-400'}`}
                />
                <span className="font-bold text-xs text-white">Cuestionario</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Resuelve los ejercicios interactivos de la lección con autocorrección.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setKind('reading')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-1 ${
                kind === 'reading'
                  ? 'border-indigo-500 bg-indigo-950/60 ring-2 ring-indigo-500/30'
                  : 'border-slate-800 bg-slate-950 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <BookOpen
                  className={`w-4 h-4 ${kind === 'reading' ? 'text-indigo-400' : 'text-slate-400'}`}
                />
                <span className="font-bold text-xs text-white">Lectura y Estudio</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Lectura comprensiva del material temático y apuntes de la clase.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setKind('discussion')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-1 ${
                kind === 'discussion'
                  ? 'border-indigo-500 bg-indigo-950/60 ring-2 ring-indigo-500/30'
                  : 'border-slate-800 bg-slate-950 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare
                  className={`w-4 h-4 ${kind === 'discussion' ? 'text-indigo-400' : 'text-slate-400'}`}
                />
                <span className="font-bold text-xs text-white">Debate en Muro</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Participación en el muro escolar respondiendo a una consigna o pregunta.
              </p>
            </button>
          </div>
        </div>

        {/* Class & Lesson Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Clase Asignada</label>
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
            <label className="text-xs font-semibold text-slate-300">Lección de Origen</label>
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
          <label className="text-xs font-semibold text-slate-300">Título de la Tarea</label>
          <Input
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
          <label className="text-xs font-semibold text-slate-300">
            {kind === 'discussion' ? 'Pregunta o Consigna de Debate' : 'Instrucciones para los Alumnos'}
          </label>
          <textarea
            rows={3}
            placeholder={
              kind === 'discussion'
                ? 'Escribe la pregunta que los alumnos deben responder en el muro de clase...'
                : 'Instrucciones adicionales para la realización de la actividad...'
            }
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Due Date & Attempt Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Fecha Límite de Entrega
            </label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
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
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
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
