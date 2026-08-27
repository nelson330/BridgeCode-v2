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
  Radio,
  Shield,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { sound } from '../../lib/audio-synth'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Switch } from '../ui/Switch'

export function AppHeader() {
  const { user, config, logout, isLocalMode } = useAuth()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const [colorblind, setColorblind] = useState(() => {
    return localStorage.getItem('ap.colorblind') === 'true'
  })

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('ap.theme') as 'dark' | 'light') || 'dark'
  })

  const [muted, setMuted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Initialize theme on mount & changes
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light')
      document.body.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
      document.body.classList.remove('light')
    }
    localStorage.setItem('ap.theme', theme)
  }, [theme])

  // Initialize colorblind on mount & changes
  useEffect(() => {
    if (colorblind) {
      document.body.setAttribute('data-dt', 'on')
    } else {
      document.body.removeAttribute('data-dt')
    }
    localStorage.setItem('ap.colorblind', String(colorblind))
  }, [colorblind])

  // Auto-close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const toggleLanguage = () => {
    const nextLang = i18n.language.startsWith('es') ? 'en' : 'es'
    i18n.changeLanguage(nextLang)
    localStorage.setItem('ap.locale', nextLang)
  }

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    sound.playWheelTick()
  }

  const toggleColorblind = (checked: boolean) => {
    setColorblind(checked)
    sound.playWheelTick()
  }

  const toggleSound = (checked: boolean) => {
    setMuted(!checked)
    sound.setMuted(!checked)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const isWebmaster = user?.role === 'webmaster'

  return (
    <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand & Mode */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-indigo-500/30"
            >
              <Gamepad2 className="w-5 h-5 text-white" />
            </motion.div>
            <div>
              <span className="font-display font-black text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent group-hover:to-fuchsia-200 transition-colors">
                AulaPlay
              </span>
            </div>
          </Link>

          {/* Mode Badge */}
          <Badge
            variant={isLocalMode ? 'success' : 'primary'}
            className="hidden lg:inline-flex items-center gap-1.5 text-xs py-0.5"
          >
            {isLocalMode ? (
              <>
                <Sparkles className="w-3 h-3" /> {t('app.modeLocal')}
              </>
            ) : (
              <>
                <Radio className="w-3 h-3" /> {t('app.modeHosted')}
              </>
            )}
          </Badge>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {user && (user.role === 'teacher' || user.role === 'webmaster') && (
            <Link to="/dashboard">
              <Button
                variant={location.pathname === '/dashboard' ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2 text-xs"
              >
                <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                <span>{t('nav.dashboard')}</span>
              </Button>
            </Link>
          )}

          {user && user.role === 'student' && (
            <Link to="/student">
              <Button
                variant={location.pathname === '/student' ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2 text-xs"
              >
                <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                <span>{t('nav.studentPortal')}</span>
              </Button>
            </Link>
          )}

          {config?.flags?.forumEnabled && (
            <Link to="/forum">
              <Button
                variant={location.pathname === '/forum' ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2 text-xs"
              >
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <span>{t('nav.forum')}</span>
              </Button>
            </Link>
          )}

          {isWebmaster && (
            <Link to="/admin">
              <Button
                variant={location.pathname === '/admin' ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2 text-xs"
              >
                <Shield className="w-4 h-4 text-amber-400" />
                <span>{t('nav.admin')}</span>
              </Button>
            </Link>
          )}

          {!isLocalMode && (
            <Link to="/join">
              <Button
                variant={location.pathname === '/join' ? 'primary' : 'ghost'}
                size="sm"
                className="gap-2 text-indigo-300 text-xs font-bold"
              >
                <Gamepad2 className="w-4 h-4" />
                <span>{t('nav.joinPin')}</span>
              </Button>
            </Link>
          )}
        </nav>

        {/* Quick Toggles and Auth (Desktop) */}
        <div className="hidden md:flex items-center gap-2.5">
          {/* Light / Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="text-xs px-2.5"
            title={theme === 'dark' ? t('app.themeLight') : t('app.themeDark')}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500" />
            )}
          </Button>

          {/* Language Switch */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="text-xs px-2.5 font-bold text-slate-300"
            title={t('common.language')}
          >
            <Globe className="w-4 h-4 mr-1 text-indigo-400" />
            {i18n.language.slice(0, 2).toUpperCase()}
          </Button>

          {/* Colorblind Toggle */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800"
            title={t('app.colorblindMode')}
          >
            <Eye className={`w-3.5 h-3.5 ${colorblind ? 'text-indigo-400' : 'text-slate-400'}`} />
            <Switch id="cb-toggle" checked={colorblind} onCheckedChange={toggleColorblind} />
          </div>

          {/* Sound Toggle */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800"
            title={muted ? t('app.soundMuted') : t('app.soundEnabled')}
          >
            {muted ? (
              <VolumeX className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <Switch id="sound-toggle" checked={!muted} onCheckedChange={toggleSound} />
          </div>

          {/* User Profile / Logout */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <span className="text-xs font-semibold text-slate-300 max-w-[120px] truncate">
                {user.displayName}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 p-2"
                title={t('nav.logout')}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Link to="/login">
              <Button variant="primary" size="sm" className="gap-1.5 text-xs">
                <LogIn className="w-4 h-4" />
                <span>{t('nav.login')}</span>
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 md:hidden">
          {/* Quick Theme Toggle on Mobile */}
          <Button variant="ghost" size="sm" onClick={toggleTheme} className="p-2">
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500" />
            )}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="p-2"
            aria-label={t('nav.menu')}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Slide-Down Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-2xl overflow-hidden px-4 py-6 space-y-6 shadow-2xl"
          >
            {/* User Greeting if logged in */}
            {user && (
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">
                    {user.role === 'teacher' ? 'Docente' : 'Estudiante'}
                  </span>
                  <span className="font-bold text-sm text-white">{user.displayName}</span>
                </div>
                <Badge variant="primary">{user.role}</Badge>
              </div>
            )}

            {/* Navigation Modules */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block px-2 mb-1">
                {t('nav.menu')}
              </span>

              {user && (user.role === 'teacher' || user.role === 'webmaster') && (
                <Link to="/dashboard">
                  <Button
                    variant={location.pathname === '/dashboard' ? 'secondary' : 'ghost'}
                    size="md"
                    className="w-full justify-start gap-3"
                  >
                    <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                    <span>{t('nav.dashboard')}</span>
                  </Button>
                </Link>
              )}

              {user && user.role === 'student' && (
                <Link to="/student">
                  <Button
                    variant={location.pathname === '/student' ? 'secondary' : 'ghost'}
                    size="md"
                    className="w-full justify-start gap-3"
                  >
                    <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                    <span>{t('nav.studentPortal')}</span>
                  </Button>
                </Link>
              )}

              {config?.flags?.forumEnabled && (
                <Link to="/forum">
                  <Button
                    variant={location.pathname === '/forum' ? 'secondary' : 'ghost'}
                    size="md"
                    className="w-full justify-start gap-3"
                  >
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    <span>{t('nav.forum')}</span>
                  </Button>
                </Link>
              )}

              {isWebmaster && (
                <Link to="/admin">
                  <Button
                    variant={location.pathname === '/admin' ? 'secondary' : 'ghost'}
                    size="md"
                    className="w-full justify-start gap-3"
                  >
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span>{t('nav.admin')}</span>
                  </Button>
                </Link>
              )}

              {!isLocalMode && (
                <Link to="/join">
                  <Button
                    variant={location.pathname === '/join' ? 'primary' : 'secondary'}
                    size="md"
                    className="w-full justify-start gap-3 text-indigo-300 font-bold"
                  >
                    <Gamepad2 className="w-4 h-4" />
                    <span>{t('nav.joinPin')}</span>
                  </Button>
                </Link>
              )}
            </div>

            {/* Quick Mobile Settings */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block px-2">
                {t('nav.quickSettings')}
              </span>

              <div className="grid grid-cols-2 gap-2">
                {/* Language Switch */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={toggleLanguage}
                  className="gap-2 justify-center text-xs"
                >
                  <Globe className="w-4 h-4 text-indigo-400" />
                  <span>
                    {i18n.language.slice(0, 2).toUpperCase()} (
                    {i18n.language.startsWith('es') ? 'Español' : 'English'})
                  </span>
                </Button>

                {/* Colorblind Toggle */}
                <Button
                  variant={colorblind ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => toggleColorblind(!colorblind)}
                  className="gap-2 justify-center text-xs"
                >
                  <Eye className="w-4 h-4" />
                  <span>{colorblind ? 'Daltónico: ON' : 'Daltónico: OFF'}</span>
                </Button>
              </div>

              {/* Sound Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <span className="flex items-center gap-2 text-slate-300 font-semibold">
                  {muted ? (
                    <VolumeX className="w-4 h-4 text-slate-500" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-indigo-400" />
                  )}
                  <span>{muted ? t('app.soundMuted') : t('app.soundEnabled')}</span>
                </span>
                <Switch id="mobile-sound-toggle" checked={!muted} onCheckedChange={toggleSound} />
              </div>
            </div>

            {/* Auth / Logout */}
            <div className="pt-2">
              {user ? (
                <Button
                  variant="danger"
                  size="md"
                  onClick={handleLogout}
                  className="w-full gap-2 justify-center font-bold"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('nav.logout')}</span>
                </Button>
              ) : (
                <Link to="/login" className="block w-full">
                  <Button variant="primary" size="md" className="w-full gap-2 justify-center font-bold">
                    <LogIn className="w-4 h-4" />
                    <span>{t('nav.login')}</span>
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
