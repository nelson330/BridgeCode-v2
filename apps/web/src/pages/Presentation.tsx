import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QuestionDisplay } from '../components/game/QuestionDisplay'
import { AsyncState } from '../components/ui/AsyncState'
import { Button } from '../components/ui/Button'
import { apiFetch } from '../lib/api'
import { ArrowLeft, ArrowRight, Eye, Maximize, Minimize, Tv } from '../lib/icons'
import { useFullscreen } from '../lib/useFullscreen'

type Lesson = {
  title: string
  status: string
  exercises: Parameters<typeof QuestionDisplay>[0]['exercise'][]
}
export function Presentation() {
  const { classId, lessonId } = useParams()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const { fullscreen, toggleFullscreen } = useFullscreen()
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    setIndex(0)
    setRevealed(false)
    apiFetch<{ lesson: Lesson }>(`/api/groups/${classId}/lessons/${lessonId}`, { signal: controller.signal })
      .then(({ lesson: data }) => setLesson(data))
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message || 'No se pudo cargar la lección')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [classId, lessonId, attempt])
  const exercise = lesson?.exercises[index]
  const move = (next: number) => {
    setIndex(next)
    setRevealed(false)
  }
  return (
    <div className="min-h-dvh flex flex-col bg-canvas">
      <header className="border-b border-line bg-surface px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Tv className="w-6 h-6 shrink-0 text-accent" />
          <div className="min-w-0">
            <p className="text-xs text-accent font-bold uppercase tracking-wider">Exposición guiada</p>
            <h1 className="font-display font-bold text-base sm:text-xl text-foreground">
              {lesson?.title || 'Presentación'}
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
          <Link
            to="/dashboard"
            className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-secondary hover:bg-elevated"
          >
            Volver al panel
          </Link>
        </div>
      </header>
      <section className="flex-1 mx-auto w-full max-w-6xl p-4 sm:p-8 space-y-6">
        {loading ? (
          <AsyncState loading />
        ) : error ? (
          <AsyncState error={error} onRetry={() => setAttempt(attempt + 1)} />
        ) : !exercise ? (
          <AsyncState empty="Esta lección no tiene ejercicios para presentar." />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-accent" aria-live="polite">
                Pregunta {index + 1} de {lesson!.exercises.length}
              </p>
              <p className="text-xs text-muted">
                Avanza a tu ritmo. Revela la respuesta después de conversar.
              </p>
            </div>
            <QuestionDisplay
              key={exercise.id}
              exercise={exercise}
              variant="presentation"
              isRevealed={revealed}
            />
          </>
        )}
      </section>
      {!loading && !error && exercise && (
        <footer className="sticky bottom-0 border-t border-line bg-surface/95 backdrop-blur-xl px-4 py-4">
          <div className="mx-auto max-w-4xl flex flex-wrap justify-center gap-3">
            <Button variant="secondary" disabled={index === 0} onClick={() => move(index - 1)}>
              <ArrowLeft className="w-4 h-4" />
              Anterior
            </Button>
            <Button variant="primary" disabled={revealed} onClick={() => setRevealed(true)}>
              <Eye className="w-4 h-4" />
              {revealed ? 'Respuesta visible' : 'Revelar respuesta'}
            </Button>
            <Button
              variant="secondary"
              disabled={index === lesson!.exercises.length - 1}
              onClick={() => move(index + 1)}
            >
              Siguiente
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </footer>
      )}
    </div>
  )
}
