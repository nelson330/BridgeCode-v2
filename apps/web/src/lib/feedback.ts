import { useSyncExternalStore } from 'react'

type Notice = { id: number; message: string; tone: 'error' | 'success' | 'info' }
type Confirmation = { message: string; resolve: (accepted: boolean) => void }
let notices: Notice[] = []
let confirmation: Confirmation | null = null
let sequence = 0
const listeners = new Set<() => void>()
const emit = () => {
  for (const listener of listeners) listener()
}
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function dismissNotice(id: number) {
  notices = notices.filter((notice) => notice.id !== id)
  emit()
}
export function notify(message: string, tone: Notice['tone'] = 'error') {
  const id = ++sequence
  notices = [...notices.slice(-3), { id, message, tone }]
  emit()
  if (tone !== 'error') setTimeout(() => dismissNotice(id), 6000)
}
export function notifySuccess(message: string) {
  notify(message, 'success')
}
export function confirmAction(message: string): Promise<boolean> {
  // Only one confirmation may be pending. Do not strand the previous caller.
  confirmation?.resolve(false)
  return new Promise((resolve) => {
    confirmation = { message, resolve }
    emit()
  })
}
export function settleConfirmation(accepted: boolean) {
  const current = confirmation
  confirmation = null
  emit()
  current?.resolve(accepted)
}
export function useFeedback() {
  const currentNotices = useSyncExternalStore(subscribe, () => notices)
  const currentConfirmation = useSyncExternalStore(subscribe, () => confirmation)
  return { notices: currentNotices, confirmation: currentConfirmation }
}
