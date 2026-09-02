import {
  AlertCircle,
  BookOpen,
  Eye,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  PenTool,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../../lib/api'
import { sound } from '../../lib/audio-synth'
import { triggerConfetti } from '../../lib/confetti'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { MarkdownText } from '../ui/MarkdownText'

interface LessonModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  classId: string
  lessonToEdit?: {
    id: string
    title: string
    materialContent?: string | null
    materialFile?: string | null
  } | null
  onLessonSaved?: () => void
}

export function LessonModal({ open, onOpenChange, classId, lessonToEdit, onLessonSaved }: LessonModalProps) {
  const [title, setTitle] = useState('')
  const [materialContent, setMaterialContent] = useState('')
  const [materialFile, setMaterialFile] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [activeEditorTab, setActiveEditorTab] = useState<'write' | 'preview' | 'split'>('write')
  const [attachments, setAttachments] = useState<Array<{ name: string; url: string; type: 'pdf' | 'image' }>>(
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
      setMaterialFile(lessonToEdit.materialFile || null)
    } else {
      setTitle('')
      setMaterialContent('')
      setMaterialFile(null)
      setAttachments([])
      setLinks([])
      setActiveEditorTab('write')
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

      const isPdf = res.mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      const newAtt = {
        url: res.url,
        name: res.originalName || file.name,
        type: isPdf ? ('pdf' as const) : ('image' as const),
      }

      setAttachments((prev) => [...prev, newAtt])

      if (isPdf) {
        setMaterialFile(res.url)
        // Auto-insert markdown reference into content if not already there
        setMaterialContent((prev) => {
          if (!prev.includes(res.url)) {
            return `${prev}\n\n**Documento Adjunto:** [${newAtt.name}](${res.url})\n`
          }
          return prev
        })
      } else {
        setMaterialContent((prev) => `${prev}\n\n![${newAtt.name}](${res.url})\n`)
      }

      sound.playPowerup()
    } catch (err: any) {
      alert(err.message || 'Error al subir archivo')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleGenerateSummary = async () => {
    if (!materialFile && !materialContent.trim()) {
      setSummaryError('Sube un archivo PDF o escribe contenido preliminar para que el modelo pueda resumir.')
      return
    }

    setSummaryError(null)
    setSummarizing(true)
    try {
      const res = await apiFetch<{ summary: string; title?: string }>('/api/ai/summarize', {
        method: 'POST',
        body: JSON.stringify({
          lessonId: lessonToEdit?.id,
          fileUrl: materialFile || undefined,
          content: materialContent || undefined,
          lang: 'es',
        }),
      })

      if (res.summary) {
        setMaterialContent(res.summary)
        sound.playVictory()
        triggerConfetti()
        // Switch to preview mode so teacher immediately sees the live markdown formatting
        setActiveEditorTab('preview')
      }
    } catch (err: any) {
      sound.playIncorrect()
      setSummaryError(
        err.message ||
          'No se pudo generar el resumen. Verifica tu configuración de IA o que el PDF tenga texto.'
      )
    } finally {
      setSummarizing(false)
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
    const target = attachments[index]
    if (target?.url === materialFile) {
      setMaterialFile(null)
    }
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
            materialFile: materialFile || null,
          }),
        })
      } else {
        // Create new lesson
        await apiFetch(`/api/groups/${classId}/lessons`, {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(),
            materialContent: materialContent.trim(),
            materialFile: materialFile || null,
            lang: 'es',
          }),
        })
      }
      onLessonSaved?.()
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
      description="Escribe apuntes teóricos o sube PDFs: el modelo generará resúmenes y preguntas automáticas."
      className="max-w-4xl"
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

          {/* Media & PDF Upload Zone with AI Summarize trigger */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-indigo-400" />
                  <span>Subir Documentos PDF e Imágenes de Estudio</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Sube el PDF de la clase para que la IA extraiga el texto y redacte el resumen.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
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
                  disabled={uploading || summarizing}
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 text-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>{uploading ? 'Subiendo...' : 'Adjuntar Archivo'}</span>
                </Button>

                {(materialFile || attachments.some((a) => a.type === 'pdf')) && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={uploading || summarizing}
                    onClick={handleGenerateSummary}
                    className="gap-1.5 text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-indigo-500/20"
                  >
                    {summarizing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Resumiendo PDF con IA...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Generar Resumen con IA del PDF</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Uploaded Attachments List */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-900">
                {attachments.map((att, idx) => (
                  <div
                    key={att.url}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200"
                  >
                    {att.type === 'pdf' ? (
                      <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    <span className="font-semibold max-w-[180px] truncate">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="text-slate-500 hover:text-rose-400 p-0.5"
                      title="Eliminar adjunto"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Error banner for AI Summary with direct retry */}
            {summaryError && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs">
                <div className="flex items-start gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="leading-tight">{summaryError}</span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleGenerateSummary}
                  disabled={summarizing}
                  className="shrink-0 gap-1 text-[11px] text-rose-200 border-rose-700/60 hover:bg-rose-900/40"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Reintentar</span>
                </Button>
              </div>
            )}
          </div>

          {/* Material Content with Real-time Markdown Preview */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Material de Lectura, Apuntes y Resumen de la Clase
                </label>
                <span className="text-[11px] text-slate-400">
                  Soporta Markdown en tiempo real (# Títulos, **negrita**, - listas, `código`)
                </span>
              </div>

              {/* Real-time View Toggle Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveEditorTab('write')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeEditorTab === 'write'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Editor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEditorTab('preview')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeEditorTab === 'preview'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Vista Previa en Vivo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEditorTab('split')}
                  className={`hidden md:flex px-3 py-1 rounded-lg text-xs font-bold transition-all items-center gap-1.5 cursor-pointer ${
                    activeEditorTab === 'split'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Dividido</span>
                </button>
              </div>
            </div>

            {/* Editor and Real-Time Preview Container */}
            <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
              {/* Write Mode */}
              {activeEditorTab === 'write' && (
                <div className="space-y-1.5">
                  <textarea
                    rows={10}
                    value={materialContent}
                    onChange={(e) => setMaterialContent(e.target.value)}
                    placeholder="Escribe aquí los apuntes de la clase o haz clic en 'Generar Resumen con IA del PDF'..."
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono leading-relaxed resize-y"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                    <span>{materialContent.length} caracteres</span>
                    <span>Cambia a 'Vista Previa en Vivo' para ver el Markdown renderizado</span>
                  </div>
                </div>
              )}

              {/* Preview Mode */}
              {activeEditorTab === 'preview' && (
                <div className="min-h-[220px] max-h-[350px] overflow-y-auto p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  {materialContent.trim() ? (
                    <MarkdownText
                      content={materialContent}
                      className="text-sm text-slate-200 leading-relaxed"
                    />
                  ) : (
                    <div className="text-center py-10 text-slate-500 text-xs italic">
                      No hay contenido redactado todavía. Escribe en el editor o genera el resumen desde un
                      PDF.
                    </div>
                  )}
                </div>
              )}

              {/* Split Mode (Desktop) */}
              {activeEditorTab === 'split' && (
                <div className="grid grid-cols-2 gap-3 min-h-[260px]">
                  <textarea
                    rows={10}
                    value={materialContent}
                    onChange={(e) => setMaterialContent(e.target.value)}
                    placeholder="Escribe Markdown aquí..."
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono leading-relaxed"
                  />
                  <div className="max-h-[280px] overflow-y-auto p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed">
                    {materialContent.trim() ? (
                      <MarkdownText content={materialContent} className="text-xs text-slate-200" />
                    ) : (
                      <span className="text-slate-500 italic">Vista previa en tiempo real...</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* External Links Section */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <LinkIcon className="w-4 h-4 text-indigo-400" />
              <span>Compartir Enlaces Web de Interés</span>
            </h4>

            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Título del enlace (Ej: Video explicativo)"
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
