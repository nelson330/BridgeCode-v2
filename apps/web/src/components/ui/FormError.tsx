import { AlertCircle } from '../../lib/icons'

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl bg-danger-soft p-4 text-danger border border-rose-500/30"
    >
      <AlertCircle className="w-5 h-5 shrink-0" />
      <p className="text-sm leading-relaxed">{message}</p>
    </div>
  )
}
