import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { sound } from '../../lib/audio-synth'
import { notify } from '../../lib/feedback'
import {
  Eye,
  Gamepad2,
  Globe,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Shield,
  Sun,
  Volume2,
  X,
} from '../../lib/icons'
import { useTheme } from '../../lib/useTheme'
import { Button } from '../ui/Button'
import { Switch } from '../ui/Switch'

export function AppHeader() {
  const { user, logout } = useAuth()
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const [colorblind, setColorblind] = useState(() => localStorage.getItem('ap.colorblind') === 'true')
  const [muted, setMuted] = useState(() => localStorage.getItem('ap.muted') === 'true')
  const [loggingOut, setLoggingOut] = useState(false)
  useEffect(() => {
    document.body.dataset.dt = colorblind ? 'on' : 'off'
    localStorage.setItem('ap.colorblind', String(colorblind))
  }, [colorblind])
  useEffect(() => {
    sound.setMuted(muted)
    localStorage.setItem('ap.muted', String(muted))
  }, [muted])
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])
  const links = [
    ...(user
      ? [
          {
            to: user.role === 'student' ? '/student' : '/dashboard',
            label: user.role === 'student' ? t('nav.studentPortal') : t('nav.dashboard'),
            icon: LayoutDashboard,
          },
        ]
      : []),
    ...(user && user.role !== 'student'
      ? [{ to: '/forum', label: t('nav.forum'), icon: MessageSquare }]
      : []),
    ...(user?.role === 'webmaster' ? [{ to: '/admin', label: t('nav.admin'), icon: Shield }] : []),
    { to: '/join', label: t('nav.joinPin'), icon: Gamepad2 },
  ]
  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
      navigate('/')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo cerrar sesión')
    } finally {
      setLoggingOut(false)
    }
  }
  // Projection and player screens provide their own focused navigation.
  if (/^\/(host|present|play)\//.test(location.pathname) || location.pathname === '/proyecto') return null
  return (
    <header className="sticky top-0 z-40 max-h-dvh overflow-y-auto border-b border-line bg-surface/95 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-wrap min-h-20 items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-3 shrink-0 min-h-11"
          aria-label="AulaPlay, inicio"
        >
          <span className="rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 p-3 text-on-accent shadow-lg shadow-indigo-500/20">
            <Gamepad2 className="h-5 w-5" />
          </span>
          <span className="font-display font-black text-xl tracking-tight text-foreground">AulaPlay</span>
        </Link>
        <nav aria-label="Navegación principal" className="hidden xl:flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              aria-current={location.pathname === to ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors ${location.pathname === to ? 'bg-accent-soft text-accent' : 'text-secondary hover:bg-elevated'}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro'}
            title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
            className="px-3"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
          <Button
            variant="ghost"
            className="xl:hidden px-3"
            aria-label={t('nav.menu')}
            aria-expanded={open}
            aria-controls="app-menu"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <div className="hidden xl:flex items-center gap-2">
            <Button
              variant="ghost"
              aria-label="Cambiar idioma"
              onClick={() => i18n.changeLanguage(i18n.language.startsWith('es') ? 'en' : 'es')}
            >
              <Globe className="w-4 h-4" />
              {i18n.language.slice(0, 2).toUpperCase()}
            </Button>
            {user ? (
              <Button
                variant="secondary"
                isLoading={loggingOut}
                onClick={handleLogout}
                aria-label="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
                <span className="max-w-28 truncate">{user.displayName}</span>
              </Button>
            ) : (
              <Link
                to="/login"
                className="inline-flex min-h-11 items-center gap-2 bg-indigo-600 text-on-accent rounded-xl px-4 text-sm font-semibold"
              >
                <LogIn className="w-4 h-4" />
                {t('nav.login')}
              </Link>
            )}
          </div>
          <Button
            variant="ghost"
            className="hidden xl:inline-flex"
            aria-label="Preferencias de accesibilidad"
            aria-expanded={open}
            aria-controls="app-menu"
            onClick={() => setOpen(!open)}
          >
            <Eye className="w-5 h-5" />
          </Button>
        </div>
      </div>
      {open && (
        <div
          id="app-menu"
          className="border-t border-line bg-surface p-4 max-h-[calc(100dvh-5rem)] overflow-y-auto"
        >
          <div className="max-w-7xl mx-auto space-y-4">
            <nav aria-label="Navegación móvil" className="grid sm:grid-cols-2 gap-2 xl:hidden">
              {links.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  aria-current={location.pathname === to ? 'page' : undefined}
                  className="flex min-h-11 items-center gap-3 p-3 rounded-xl bg-elevated text-foreground"
                >
                  <Icon className="w-5 h-5 text-accent" />
                  {label}
                </Link>
              ))}
            </nav>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-3 min-h-11 text-sm text-secondary">
                <Eye className="w-4 h-4" />
                Patrones de contraste
                <Switch
                  checked={colorblind}
                  onCheckedChange={setColorblind}
                  aria-label="Patrones de contraste"
                />
              </label>
              <label className="flex items-center gap-3 min-h-11 text-sm text-secondary">
                <Volume2 className="w-4 h-4" />
                Sonido
                <Switch
                  checked={!muted}
                  onCheckedChange={(checked) => setMuted(!checked)}
                  aria-label="Sonido"
                />
              </label>
              <Button
                variant="secondary"
                onClick={() => i18n.changeLanguage(i18n.language.startsWith('es') ? 'en' : 'es')}
              >
                <Globe className="w-4 h-4" />
                {i18n.language.startsWith('es') ? 'English' : 'Español'}
              </Button>
              {user ? (
                <Button variant="ghost" isLoading={loggingOut} onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                  {t('nav.logout')}
                </Button>
              ) : (
                <Link to="/login" className="flex min-h-11 items-center gap-2 text-accent">
                  <LogIn className="w-4 h-4" />
                  {t('nav.login')}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
