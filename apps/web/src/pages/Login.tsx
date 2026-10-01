import { motion } from 'motion/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { Input } from '../components/ui/Input'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'
import { sound } from '../lib/audio-synth'
import { triggerConfetti } from '../lib/confetti'
import { AlertCircle, ArrowRight, CheckCircle2, Lock, LogIn, User, UserPlus } from '../lib/icons'

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Teacher Registration Request Modal
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [regName, setRegName] = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regReason, setRegReason] = useState('')
  const [isSubmittingReg, setIsSubmittingReg] = useState(false)
  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(null)
  const [regErrorMessage, setRegErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const cleanUsername = username.trim()
      const cleanPassword = password.trim()
      const user = await login(cleanUsername, cleanPassword)
      sound.playCorrect()

      if (user.role === 'webmaster') {
        navigate('/admin')
      } else if (user.role === 'student') {
        navigate('/student')
      } else {
        navigate('/dashboard')
      }
    } catch (err: any) {
      sound.playIncorrect()
      setErrorMessage(err.message || 'Credenciales incorrectas')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegisterTeacher = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingReg(true)
    setRegErrorMessage(null)
    setRegSuccessMessage(null)

    try {
      await apiFetch('/api/auth/request-teacher', {
        method: 'POST',
        body: JSON.stringify({
          name: regName.trim(),
          username: regUsername.trim().toLowerCase(),
          email: regEmail.trim(),
          password: regPassword.trim(),
          reason: regReason.trim() || 'Docente de AulaPlay',
        }),
      })

      sound.playVictory()
      triggerConfetti()
      setRegSuccessMessage(
        '¡Solicitud enviada con éxito! El administrador/webmaster revisará y activará tu cuenta.'
      )
      setRegName('')
      setRegUsername('')
      setRegEmail('')
      setRegPassword('')
      setRegReason('')
    } catch (err: any) {
      sound.playIncorrect()
      setRegErrorMessage(err.message || 'Error al enviar la solicitud')
    } finally {
      setIsSubmittingReg(false)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md space-y-6"
      >
        <Card className="p-5 sm:p-8 shadow-2xl border-line bg-surface/90 backdrop-blur-xl">
          <div className="text-center space-y-2 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center mx-auto text-accent mb-3">
              <LogIn className="w-6 h-6" />
            </div>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-foreground">Iniciar Sesión</h2>
            <p className="text-xs text-muted">Accede a tu cuenta para continuar.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="login-username"
                className="text-xs font-semibold text-secondary flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-muted" />
                Nombre de Usuario
              </label>
              <Input
                id="login-username"
                autoComplete="username"
                type="text"
                placeholder="docente o sofia.garcia"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="login-password"
                className="text-xs font-semibold text-secondary flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-muted" />
                Contraseña
              </label>
              <Input
                error={errorMessage || undefined}
                id="login-password"
                autoComplete="current-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full gap-2 mt-2"
            >
              <span>Acceder</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Teacher Registration Link */}
          <div className="mt-4 pt-4 border-t border-line/80 text-center">
            <button
              type="button"
              onClick={() => {
                setRegErrorMessage(null)
                setRegSuccessMessage(null)
                setIsRegisterOpen(true)
              }}
              className="text-xs text-accent hover:text-accent font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>¿Eres profesor nuevo? Solicita tu cuenta docente</span>
            </button>
          </div>
        </Card>
      </motion.div>

      {/* MODAL: SOLICITUD DE REGISTRO DOCENTE */}
      <Dialog
        open={isRegisterOpen}
        onOpenChange={setIsRegisterOpen}
        title="Solicitud de Registro Docente"
        description="Completa tus datos para que el administrador webmaster revise y apruebe tu cuenta."
        className="max-w-md"
      >
        <form onSubmit={handleRegisterTeacher} className="space-y-4">
          <div>
            <label
              className="text-xs font-bold text-secondary uppercase tracking-wider block mb-1"
              htmlFor="login-field-1"
            >
              Nombre Completo
            </label>
            <Input
              id="login-field-1"
              placeholder="Prof. Juan Rodríguez"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label
              className="text-xs font-bold text-secondary uppercase tracking-wider block mb-1"
              htmlFor="login-field-2"
            >
              Nombre de Usuario Deseado
            </label>
            <Input
              id="login-field-2"
              placeholder="juan.rodriguez"
              value={regUsername}
              onChange={(e) => setRegUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label
              className="text-xs font-bold text-secondary uppercase tracking-wider block mb-1"
              htmlFor="login-field-3"
            >
              Correo Electrónico de Contacto
            </label>
            <Input
              id="login-field-3"
              type="email"
              placeholder="juan@colegio.edu"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label
              className="text-xs font-bold text-secondary uppercase tracking-wider block mb-1"
              htmlFor="login-field-4"
            >
              Contraseña
            </label>
            <Input
              id="login-field-4"
              type="password"
              placeholder="••••••••"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label
              className="text-xs font-bold text-secondary uppercase tracking-wider block mb-1"
              htmlFor="login-field-5"
            >
              Institución Educativa / Motivo
            </label>
            <Input
              id="login-field-5"
              placeholder="Colegio San Martín - 5to Grado"
              value={regReason}
              onChange={(e) => setRegReason(e.target.value)}
            />
          </div>

          {regSuccessMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-success-soft/70 border border-emerald-800 text-success text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{regSuccessMessage}</span>
            </div>
          )}

          {regErrorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-danger-soft/70 border border-rose-800 text-danger text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{regErrorMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
            <Button type="button" variant="ghost" onClick={() => setIsRegisterOpen(false)}>
              Cerrar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmittingReg}
              disabled={!regName.trim() || !regUsername.trim() || !regEmail.trim() || !regPassword.trim()}
            >
              Enviar Solicitud
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
