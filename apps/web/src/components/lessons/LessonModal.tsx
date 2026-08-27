import {
  BookOpen,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../../lib/api'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'

interface LessonModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  classId: string
  lessonToEdit?: {
    id: string
    title: string
    materialContent?: string
    lang?: string
  } | null
  onLessonSaved: () => void
}

export function LessonModal({ open, onOpenChange, classId, lessonToEdit, onLessonSaved }: LessonModalProps) {
  const [title, setTitle] = useState('')
  const [materialContent, setMaterialContent] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Attachments: list of uploaded media files and links
  const [attachments, setAttachments] = useState<Array<{ url: string; name: string; type: 'pdf' | 'image' }>>(
    []
  )
  const [_links, setLinks] = useState<Array<{ title: string; url: string }>>([])
  const [newLinkTitle, setNewLinkTitle] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (lessonToEdit) {
      setTitle(lessonToEdit.title)
      setMaterialContent(lessonToEdit.materialContent || '')
    } else {
      setTitle('')
      setMaterialContent('')
      setAttachments([])
      setLinks([])
    }
  }, [lessonToEdit, open])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await apiFetch<{ url: string; originalName: string; mimeType: string }>('/api/uploads', {
        method: 'POST',
        body: formData,
      })

      const isPdf = res.mimeType === 'application/pdf' || file.name.endsWith('.pdf')
      const newAtt = {
        url: res.url,
        name: res.originalName || file.name,
        type: isPdf ? ('pdf' as const) : ('image' as const),
      }

      setAttachments((prev) => [...prev, newAtt])

      // Auto-insert markdown reference into content
      if (isPdf) {
        setMaterialContent((prev) => `${prev}\n\n**Documento Adjunto:** [${newAtt.name}](${res.url})\n`)
      } else {
        setMaterialContent((prev) => `${prev}\n\n![${newAtt.name}](${res.url})\n`)
      }
    } catch (err: any) {
      alert(err.message || 'Error al subir archivo')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleAddLink = () => {
    if (!newLinkUrl.trim() || !newLinkTitle.trim()) return
    const linkItem = { title: newLinkTitle.trim(), url: newLinkUrl.trim() }
    setLinks((prev) => [...prev, linkItem])
    setMaterialContent((prev) => `${prev}\n\n**Enlace de Estudio:** [${linkItem.title}](${linkItem.url})\n`)
    setNewLinkTitle('')
    setNewLinkUrl('')
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !classId) return

    setSaving(true)
    try {
      if (lessonToEdit) {
        // Edit existing lesson
        await apiFetch(`/api/groups/${classId}/lessons/${lessonToEdit.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: title.trim(),
            materialContent: materialContent.trim(),
          }),
        })
      } else {
        // Create new lesson
        await apiFetch(`/api/groups/${classId}/lessons`, {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(),
            materialContent: materialContent.trim(),
            lang: 'es',
          }),
        })
      }
      onLessonSaved()
      onOpenChange(false)
    } catch (err: any) {
      alert(err.message || 'Error al guardar la lección')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={lessonToEdit ? 'Editar Lección & Temario' : 'Nueva Lección & Material de Estudio'}
      description="Escribe los apuntes teóricos y sube PDFs o imágenes que los alumnos podrán leer en línea."
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Título de la Lección
            </label>
            <Input
              placeholder="Ej: El Sistema Solar y los Planetas"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Material de Lectura, Apuntes y Contenido Teórico
              </label>
              <span className="text-[11px] text-slate-500">Soporta Markdown, imágenes y PDFs embebidos</span>
            </div>

            <textarea
              rows={8}
              value={materialContent}
              onChange={(e) => setMaterialContent(e.target.value)}
              placeholder="Escribe aquí los conceptos clave, resúmenes o explicaciones que los alumnos leerán en el portal..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono leading-relaxed"
            />
          </div>

          {/* Media & PDF Upload Zone */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-indigo-400" />
                  <span>Subir Documentos PDF e Imágenes de Estudio</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Los PDFs se podrán leer en línea directamente en el portal del alumno.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp,image/gif"
                onChange={handleFileUpload}
                className="hidden"
                id="lesson-file-upload"
              />

              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 shrink-0 text-xs"
              >
                <Plus className="w-4 h-4" />
                <span>{uploading ? 'Subiendo...' : 'Adjuntar Archivo'}</span>
              </Button>
            </div>

            {/* Uploaded Attachments List */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {attachments.map((att, idx) => (
                  <div
                    key={att.url}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200"
                  >
                    {att.type === 'pdf' ? (
                      <FileText className="w-4 h-4 text-rose-400" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-emerald-400" />
                    )}
                    <span className="font-semibold max-w-[180px] truncate">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* External Links Section */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <LinkIcon className="w-4 h-4 text-indigo-400" />
              <span>Compartir Enlaces Web de Interés</span>
            </h4>

            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Título del enlace (Ej: Video de la NASA)"
                value={newLinkTitle}
                onChange={(e) => setNewLinkTitle(e.target.value)}
                className="text-xs"
              />
              <Input
                placeholder="https://ejemplo.com"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                className="text-xs"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddLink}
                disabled={!newLinkTitle.trim() || !newLinkUrl.trim()}
                className="shrink-0 text-xs gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={saving || !title.trim()} className="gap-2">
            <BookOpen className="w-4 h-4" />
            <span>{saving ? 'Guardando...' : lessonToEdit ? 'Actualizar Lección' : 'Crear Lección'}</span>
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
