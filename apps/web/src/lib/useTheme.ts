import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'
const themeEvent = 'aulaplay:theme'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    localStorage.getItem('ap.theme') === 'light' ? 'light' : 'dark'
  )
  useEffect(() => {
    const sync = () => setTheme(localStorage.getItem('ap.theme') === 'light' ? 'light' : 'dark')
    window.addEventListener(themeEvent, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(themeEvent, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('ap.theme', next)
    document.documentElement.dataset.theme = next
    window.dispatchEvent(new Event(themeEvent))
  }
  return { theme, toggleTheme }
}
