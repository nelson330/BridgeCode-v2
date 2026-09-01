import {
  BookOpen,
  CheckCircle2,
  Download,
  MessageSquare,
  Search,
  Share2,
  Sparkles,
  Star,
  Tag,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { PublishToForumModal } from '../components/forum/PublishToForumModal'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { Input } from '../components/ui/Input'
import { CustomSelect } from '../components/ui/Select'
import { apiFetch } from '../lib/api'
import { sound } from '../lib/audio-synth'
import { triggerConfetti } from '../lib/confetti'

export function Forum() {
  const [posts, setPosts] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [classes, setClasses] = useState<any[]>([])
  const [myLessons, setMyLessons] = useState<any[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState<string>('')
  const [targetClassId, setTargetClassId] = useState<string>('')

  // Publish to forum modal
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false)

  useEffect(() => {
    loadForum()
    apiFetch<{ classes: any[] }>('/api/classes')
      .then((res) => {
        setClasses(res.classes)
        if (res.classes.length > 0) {
          setTargetClassId(res.classes[0].id)
          // Load teacher's lessons for sharing
          apiFetch<{ lessons: any[] }>(`/api/groups/${res.classes[0].id}/lessons`)
            .then((lRes) => setMyLessons(lRes.lessons))
            .catch(() => {})
        }
      })
      .catch(() => {})
  }, [])

  const loadForum = async () => {
    try {
      const res = await apiFetch<{ posts: any[] }>('/api/forum/posts')
      setPosts(res.posts)
      setLoadError(null)
    } catch (err: any) {
      setLoadError(err?.message || 'No se pudo cargar el foro. Inicia sesión como docente.')
    }
  }

  const handleRate = async (postId: string, rating: number) => {
    try {
      await apiFetch(`/api/forum/posts/${postId}/rate`, {
        method: 'POST',
        body: JSON.stringify({ rating }),
      })
      sound.playCorrect()
      await loadForum()
    } catch (err: any) {
      alert(err.message || 'Error al valorar la publicación')
    }
  }

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPostId || !targetClassId) return

    try {
      await apiFetch(`/api/forum/posts/${selectedPostId}/import`, {
        method: 'POST',
        body: JSON.stringify({ targetClassId }),
      })
      sound.playVictory()
      triggerConfetti()
      setIsImportModalOpen(false)
      await loadForum()
      alert('¡Lección y ejercicios importados con éxito en tu clase!')
    } catch (err: any) {
      sound.playIncorrect()
      alert(err.message || 'Error al importar lección')
    }
  }

  const filteredPosts = posts.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (Array.isArray(p.tags) &&
        p.tags.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase())))
  )

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 select-none">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-500/30 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display font-black text-3xl text-white">Foro Comunitario Docente</h1>
            <Badge variant="primary">Modo Hosted</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Descubre, califica e importa en 1 clic lecciones y actividades gamificadas creadas por otros
            profesores.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsPublishModalOpen(true)}
          className="gap-2 shrink-0 bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-500/20"
        >
          <Share2 className="w-4 h-4" />
          <span>+ Publicar Mi Lección</span>
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <Input
          type="text"
          placeholder="Buscar lecciones por título, tema o etiqueta (#Biología, #Ciencias)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 text-sm"
        />
      </div>

      {/* Forum Posts Grid */}
      {loadError && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-200 text-sm">
          <p className="font-bold">No se pudo cargar el foro</p>
          <p className="text-xs mt-1">{loadError}</p>
          <button
            type="button"
            onClick={() => void loadForum()}
            className="mt-2 text-xs text-rose-300 hover:text-rose-100 underline cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredPosts.map((post) => (
          <Card
            key={post.id}
            hoverEffect
            className="space-y-4 flex flex-col justify-between p-6 border-slate-800"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display font-black text-xl text-white">{post.title}</h3>
                  <span className="text-xs text-slate-400">Por: {post.teacherName}</span>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold shrink-0">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{post.avgRating || 5}.0</span>
                </div>
              </div>

              {post.description && (
                <p className="text-xs text-slate-300 leading-relaxed">{post.description}</p>
              )}

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {post.tags?.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-[10px] gap-1">
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              {/* Rating Stars */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRate(post.id, star)}
                    className="text-slate-600 hover:text-amber-400 transition-colors cursor-pointer"
                    title={`Valorar con ${star} estrellas`}
                  >
                    <Star
                      className={`w-4 h-4 ${
                        star <= (post.avgRating || 0) ? 'fill-amber-400 text-amber-400' : ''
                      }`}
                    />
                  </button>
                ))}
                <span className="text-[11px] text-slate-500 ml-1">({post.votersCount || 0})</span>
              </div>

              {/* 1-Click Import Button */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedPostId(post.id)
                  setIsImportModalOpen(true)
                }}
                className="gap-1.5 text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Importar en 1 Clic</span>
              </Button>
            </div>
          </Card>
        ))}

        {filteredPosts.length === 0 && (
          <div className="col-span-2 p-12 text-center rounded-3xl bg-slate-900/50 border border-slate-800 space-y-3">
            <MessageSquare className="w-12 h-12 text-slate-600 mx-auto" />
            <h4 className="font-bold text-white">No hay publicaciones disponibles</h4>
            <p className="text-xs text-slate-400">
              Sé el primero en compartir una lección con la comunidad docente.
            </p>
          </div>
        )}
      </div>

      {/* Import Modal */}
      <Dialog
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        title="Importar Lección a tu Clase"
        description="Selecciona el grupo donde deseas clonar todos los ejercicios de esta lección."
      >
        <form onSubmit={handleImport} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Clase de Destino</label>
            <CustomSelect
              value={targetClassId}
              onChange={(val) => setTargetClassId(val)}
              options={classes.map((c) => ({
                value: c.id,
                label: `${c.name} (${c.code})`,
              }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsImportModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" className="gap-1.5">
              <Download className="w-4 h-4" />
              <span>Confirmar Importación</span>
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Publish Modal */}
      <PublishToForumModal
        open={isPublishModalOpen}
        onOpenChange={setIsPublishModalOpen}
        lessons={myLessons}
        onPublished={loadForum}
      />
    </div>
  )
}
