import { AlertCircle, BookOpen, Loader2 } from '../../lib/icons'
import { Button } from './Button'

export function AsyncState({
  loading,
  error,
  empty,
  onRetry,
}: { loading?: boolean; error?: string | null; empty?: string; onRetry?: () => void }) {
  return (
    <div
      className="rounded-2xl border border-line bg-surface p-6 sm:p-10 text-center space-y-4 w-full"
      role={error ? 'alert' : 'status'}
    >
      {loading ? (
        <Loader2 className="w-7 h-7 animate-spin text-accent mx-auto" />
      ) : error ? (
        <AlertCircle className="w-7 h-7 text-danger mx-auto" />
      ) : (
        <BookOpen className="w-7 h-7 text-accent mx-auto" />
      )}
      <p className="text-secondary text-sm leading-relaxed">{loading ? 'Cargando…' : error || empty}</p>
      {error && onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}
