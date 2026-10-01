import { useEffect, useState } from 'react'
import { notify } from './feedback'

export function useFullscreen() {
  const [fullscreen, setFullscreen] = useState(!!document.fullscreenElement)
  useEffect(() => {
    const update = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', update)
    return () => document.removeEventListener('fullscreenchange', update)
  }, [])
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen()
      else
        notify('Este navegador no admite pantalla completa. Puedes usar la orientación horizontal.', 'info')
    } catch {
      notify('No se pudo activar pantalla completa. Inténtalo nuevamente.', 'info')
    }
  }
  return { fullscreen, toggleFullscreen }
}
