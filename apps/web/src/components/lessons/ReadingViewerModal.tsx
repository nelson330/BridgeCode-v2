import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { sound } from '../../lib/audio-synth'
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileText,
  Image as ImageIcon,
  Sparkles,
  X,
} from '../../lib/icons'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { MarkdownText } from '../ui/MarkdownText'

interface ReadingViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lesson: {
    id: string
    title: string
    materialContent?: string
  } | null
  homework?: {
    id: string
    classId: string
    title: string
    completed?: boolean
  } | null
  onConfirmReading?: () => Promise<void>
}

export function ReadingViewerModal({
  open,
  onOpenChange,
  lesson,
  homework,
  onConfirmReading,
}: ReadingViewerModalProps) {
  const { t } = useTranslation()
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  // Parse embedded PDFs, Images, and Links from Markdown content
  const { cleanText, pdfs, images, links } = useMemo(() => {
    const raw = lesson?.materialContent || ''
    const pdfList: { name: string; url: string }[] = []
    const imgList: { name: string; url: string }[] = []
    const linkList: { title: string; url: string }[] = []

    // Match Markdown images: ![alt](url)
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
    let match: RegExpExecArray | null = null
    while (true) {
      match = imgRegex.exec(raw)
      if (!match) break
      imgList.push({ name: match[1] || 'Imagen de estudio', url: match[2] || '' })
    }

    // Match PDF links: [name](url.pdf) or  **Documento Adjunto:** [name](url)
    const pdfRegex = /\[([^\]]+)\]\(([^)]+\.pdf[^)]*)\)/gi
    while (true) {
      match = pdfRegex.exec(raw)
      if (!match) break
      pdfList.push({ name: match[1] || 'Documento PDF', url: match[2] || '' })
    }

    // Match External links:  **Enlace:** [title](url) or regular [title](url)
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
    while (true) {
      match = linkRegex.exec(raw)
      if (!match) break
      if (!match[2]?.toLowerCase().endsWith('.pdf')) {
        linkList.push({ title: match[1] || 'Enlace', url: match[2] || '' })
      }
    }

    // Remove markdown image & pdf tags for clean text reading
    const textWithoutMedia = raw
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '')
      .replace(/(?:\s*)?\*\*Documento Adjunto:\*\*\s*\[([^\]]+)\]\(([^)]+)\)/g, '')
      .replace(/(?:\s*)?\*\*Enlace de Estudio:\*\*\s*\[([^\]]+)\]\(([^)]+)\)/g, '')
      .trim()

    return {
      cleanText: textWithoutMedia,
      pdfs: pdfList,
      images: imgList,
      links: linkList,
    }
  }, [lesson?.materialContent])

  const handleConfirm = async () => {
    if (!onConfirmReading) return
    setIsConfirming(true)
    try {
      await onConfirmReading()
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={lesson?.title || 'Material de Lectura'}
      description="Visualiza apuntes, diagramas y documentos PDF interactivos."
      className="max-w-4xl"
    >
      <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
        {/* Homework Context Badge */}
        {homework && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-hero/80 to-accent-soft/80 border border-purple-500/30 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-400">
                Tarea Asignada
              </span>
              <h4 className="font-bold text-foreground text-sm">{homework.title}</h4>
            </div>
            <Badge variant={homework.completed ? 'success' : 'warning'}>
              {homework.completed ? t('student.readingConfirmed') : `${t('student.pending')} (+100 pts)`}
            </Badge>
          </div>
        )}

        {/* Text Content (preserved verbatim from teacher) */}
        {cleanText && (
          <div className="p-4 sm:p-6 rounded-2xl bg-surface/90 border border-line text-foreground text-sm leading-relaxed space-y-4">
            <h4 className="font-bold text-foreground text-base flex items-center gap-2 border-b border-line pb-2">
              <BookOpen className="w-5 h-5 text-accent" />
              <span>Apuntes y Contenido Teórico</span>
            </h4>
            <MarkdownText content={cleanText} className="text-foreground text-sm leading-relaxed" />
          </div>
        )}

        {/* Embedded Images Gallery */}
        {images.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-success" />
              <span>Imágenes e Ilustraciones de Estudio ({images.length})</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {images.map((img) => (
                <div
                  key={img.url}
                  className="rounded-2xl overflow-hidden border border-line bg-canvas space-y-2 p-2"
                >
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-48 object-cover rounded-xl hover:scale-[1.02] transition-transform duration-300"
                  />
                  <span className="text-xs font-semibold text-secondary block px-2 pb-1 truncate">
                    {img.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Embedded Online PDF Viewer */}
        {pdfs.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-danger" />
              <span>Documentos PDF Adjuntos (Lectura en Línea)</span>
            </h4>

            <div className="flex flex-wrap gap-2">
              {pdfs.map((pdf) => (
                <Button
                  key={pdf.url}
                  type="button"
                  variant={selectedPdfUrl === pdf.url ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    setSelectedPdfUrl((prev) => (prev === pdf.url ? null : pdf.url))
                    sound.playWheelTick()
                  }}
                  className="gap-2 text-xs"
                >
                  <FileText className="w-4 h-4 text-danger" />
                  <span>{pdf.name}</span>
                  <Eye className="w-3.5 h-3.5 ml-1 opacity-70" />
                </Button>
              ))}
            </div>

            {/* Active PDF Viewer Iframe */}
            {selectedPdfUrl && (
              <div className="p-2 rounded-2xl bg-canvas border border-line shadow-2xl space-y-2">
                <div className="flex items-center justify-between px-3 py-1 text-xs text-muted">
                  <span>Visor de Documento PDF en Línea</span>
                  <a
                    href={selectedPdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Abrir en Pestaña Completa</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <iframe
                  src={selectedPdfUrl}
                  title="Visor de PDF"
                  className="w-full h-[520px] rounded-xl border border-line bg-surface"
                />
              </div>
            )}
          </div>
        )}

        {/* External Links */}
        {links.length > 0 && (
          <div className="p-4 rounded-2xl bg-surface border border-line space-y-2">
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">Enlaces de Apoyo</h4>
            <div className="flex flex-col gap-1.5">
              {links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-accent hover:text-accent flex items-center gap-1.5 font-medium transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{link.title}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-line">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>

          {onConfirmReading && (
            <Button
              variant={homework?.completed ? 'secondary' : 'success'}
              onClick={handleConfirm}
              disabled={isConfirming}
              className="gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>
                {isConfirming
                  ? t('common.loading')
                  : homework?.completed
                    ? `${t('student.readingConfirmed')} (1x Cap)`
                    : 'Confirmar Lectura (+100 pts)'}
              </span>
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  )
}
