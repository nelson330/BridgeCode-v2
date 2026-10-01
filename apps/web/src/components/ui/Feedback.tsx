import { dismissNotice, settleConfirmation, useFeedback } from '../../lib/feedback'
import { AlertCircle, CheckCircle2, HelpCircle, X } from '../../lib/icons'
import { Button } from './Button'
import { Dialog } from './Dialog'

export function Feedback() {
  const { notices, confirmation } = useFeedback()
  return (
    <>
      <div
        className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-[80] space-y-3 max-h-[calc(100dvh-2rem)] overflow-y-auto"
        aria-label="Notificaciones"
        aria-live="polite"
      >
        {notices.map((notice) => {
          const Icon =
            notice.tone === 'error' ? AlertCircle : notice.tone === 'success' ? CheckCircle2 : HelpCircle
          return (
            <div
              key={notice.id}
              role={notice.tone === 'error' ? 'alert' : 'status'}
              className={`flex gap-3 rounded-2xl border p-4 shadow-xl bg-surface ${notice.tone === 'error' ? 'border-rose-500 text-danger' : notice.tone === 'success' ? 'border-emerald-500 text-success' : 'border-indigo-500 text-accent'}`}
            >
              <Icon className="w-5 h-5 shrink-0 mt-2" />
              <p className="flex-1 text-sm leading-relaxed whitespace-pre-line">{notice.message}</p>
              <Button
                variant="ghost"
                className="shrink-0 p-2 self-start"
                aria-label="Cerrar notificación"
                onClick={() => dismissNotice(notice.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )
        })}
      </div>
      <Dialog
        open={!!confirmation}
        onOpenChange={(open) => {
          if (!open) settleConfirmation(false)
        }}
        title="Confirmar acción"
        description={confirmation?.message}
      >
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" autoFocus onClick={() => settleConfirmation(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => settleConfirmation(true)}>
            Confirmar
          </Button>
        </div>
      </Dialog>
    </>
  )
}
