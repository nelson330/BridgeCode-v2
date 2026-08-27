import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Flame,
  Gamepad2,
  Layers,
  Shield,
  Sparkles,
  Tv,
  Users,
} from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useAuth } from '../context/AuthContext'

export function Home() {
  const { user, isLocalMode } = useAuth()

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-6xl mx-auto w-full space-y-12">
      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/80 via-slate-900/90 to-purple-950/80 border-2 border-indigo-500/30 p-6 sm:p-14 text-center space-y-6 shadow-2xl backdrop-blur-xl w-full"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-xs font-extrabold uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          {isLocalMode ? 'Modo Local Autónomo • Proyección' : 'Modo Servidor • Multidispositivo'}
        </div>

        <h1 className="font-display font-black text-4xl sm:text-6xl text-white tracking-tight leading-tight max-w-4xl mx-auto">
          Gamificación Educativa, Mecánicas en Vivo y{' '}
          <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-fuchsia-400 bg-clip-text text-transparent">
            Motor de IA
          </span>
        </h1>

        <p className="text-slate-300 text-base sm:text-xl max-w-2xl mx-auto leading-relaxed">
          {isLocalMode
            ? 'Proyecta trivias, ruletas y desafíos directamente en la pizarra de tu aula sin necesidad de internet ni teléfonos.'
            : 'Conecta a tus alumnos en tiempo real con código PIN para competencias arcade, muros sociales y tareas interactivas.'}
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          {isLocalMode ? (
            <Link to="/dashboard">
              <Button variant="primary" size="xl" className="gap-3">
                <Tv className="w-6 h-6" />
                <span>Entrar al Panel Docente</span>
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/join">
                <Button
                  variant="game"
                  size="xl"
                  className="gap-3 bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
                >
                  <Gamepad2 className="w-6 h-6" />
                  <span>Unirse a Partida con PIN</span>
                </Button>
              </Link>

              <Link to={user ? '/dashboard' : '/login'}>
                <Button variant="secondary" size="xl" className="gap-2">
                  <Tv className="w-5 h-5 text-indigo-400" />
                  <span>{user ? 'Mi Panel Docente' : 'Acceso Docente'}</span>
                </Button>
              </Link>
            </>
          )}
        </div>
      </motion.div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        <Card hoverEffect className="space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-xl text-white">4 Mecánicas en Vivo</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Ruleta de turnos con física realista, Trivia rápida con decaimiento de velocidad, Batalla por
            equipos y Carrera contrarreloj.
          </p>
        </Card>

        <Card hoverEffect className="space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-xl text-white">IA Multi-Proveedor</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Genera 8 tipos de ejercicios desde cualquier material con Groq, OpenAI, Gemini, DeepSeek o NVIDIA
            NIM con cifrado de llaves AES-256.
          </p>
        </Card>

        <Card hoverEffect className="space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Flame className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-xl text-white">Efectos & Sonido Arcade</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Sintetizador WebAudio procedural zero-asset, contador odometer, racha de fuego, confeti y modo de
            accesibilidad daltónica.
          </p>
        </Card>
      </div>
    </div>
  )
}
