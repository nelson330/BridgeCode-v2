import { BookOpen, CheckCircle2, Share2, Sparkles, Tag } from 'lucide-react'
import { useState } from 'react'
import { apiFetch } from '../../lib/api'
import { sound } from '../../lib/audio-synth'
import { triggerConfetti } from '../../lib/confetti'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { CustomSelect } from '../ui/Select'

interface PublishToForumModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lessons: any[]
  initialLessonId?: string
  onPublished?: () => void
}

export function PublishToForumModal({
  open,
  onOpenChange,
  lessons,
  initialLessonId,
  onPublished,
}: PublishToForumModalProps) {
  const [lessonId, setLessonId] = useState(initialLessonId || (lessons[0]?.id ?? ''))
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tagsInput, setTagsInput] = useState('Ciencias, Gamificación, Primaria')
  const [isPublishing, setIsPublishing] = useState(false)

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lessonId || !title.trim()) return

    setIsPublishing(true)

    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      await apiFetch('/api/forum/posts', {
        method: 'POST',
        body: JSON.stringify({
          lessonId,
          title: title.trim(),
          description: description.trim() || undefined,
          tags,
        }),
      })

      sound.playVictory()
      triggerConfetti()
      if (onPublished) onPublished()
      onOpenChange(false)
      alert('¡Lección publicada en la comunidad docente con éxito!')
      setTitle('')
      setDescription('')
    } catch (err: any) {
      sound.playIncorrect()
      alert(err.message || 'Error al publicar en el foro')
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Compartir Lección en la Comunidad Docente"
      description="Publica tu lección con todos sus ejercicios en el Foro Comunitario para que otros docentes puedan valorarla e importarla."
      className="max-w-xl"
    >
      <form onSubmit={handlePublish} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Selecciona la Lección a Compartir</label>
          <CustomSelect
            value={lessonId}
            onChange={(val) => {
              setLessonId(val)
              const selected = lessons.find((l) => l.id === val)
              if (selected && !title) setTitle(selected.title)
            }}
            options={lessons.map((l) => ({
              value: l.id,
              label: l.title,
            }))}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Título Público de la Publicación</label>
          <Input
            placeholder="Ej: Trivia Completa del Sistema Solar y Planetas"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">
            Descripción / Recomendación Pedagógica
          </label>
          <textarea
            rows={3}
            placeholder="Describe para qué edades o grado está pensada, y cómo usarla en el aula..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-indigo-400" />
            Etiquetas / Tags (separadas por comas)
          </label>
          <Input
            placeholder="Ciencias, Astronomía, 5to Grado"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="text-xs"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isPublishing} className="gap-1.5">
            <Share2 className="w-4 h-4" />
            <span>Publicar en la Comunidad</span>
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
