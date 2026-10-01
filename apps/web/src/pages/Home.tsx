import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { useAuth } from '../context/AuthContext'
import { ArrowRight, BookOpen, Gamepad2, Sparkles, Tv, Users } from '../lib/icons'

export function Home() {
  const { user } = useAuth()
  const panel = user?.role === 'student' ? '/student' : user ? '/dashboard' : '/login'
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-8 sm:py-14 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-secondary">Tecnología para una clase más participativa</p>
        <Link
          to="/proyecto"
          className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl border border-line bg-surface px-5 py-3 text-accent font-semibold hover:bg-accent-soft transition-colors"
        >
          <Tv className="w-5 h-5" />
          Conoce el proyecto
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-hero to-surface p-6 sm:p-12 lg:p-16 shadow-xl"
      >
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-10 items-center">
          <div className="space-y-6">
            <span className="inline-flex gap-2 items-center rounded-full bg-accent-soft px-4 py-2 text-sm font-semibold text-accent">
              <Sparkles className="w-4 h-4" />
              Aprende, participa, celebra
            </span>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black text-foreground leading-tight tracking-tight">
              Cada clase, una nueva <span className="text-accent">aventura.</span>
            </h1>
            <p className="text-secondary text-base sm:text-lg max-w-xl leading-relaxed">
              Proyecta una lección a tu ritmo o conecta a tus estudiantes en un juego en vivo. Todo tu grupo,
              en un mismo lugar.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to={panel}
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-indigo-600 text-on-accent px-5 py-3 font-semibold shadow-lg shadow-indigo-500/20"
              >
                <Tv className="w-5 h-5" />
                {user ? 'Ir a mi panel' : 'Acceso docente'}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/join"
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl border border-line bg-surface text-foreground px-5 py-3 font-semibold"
              >
                <Gamepad2 className="w-5 h-5 text-accent" />
                Unirse con PIN
              </Link>
            </div>
          </div>
          <Card className="space-y-5 p-6 sm:p-8 bg-surface/90">
            <div className="flex items-center gap-3 text-accent">
              <BookOpen className="w-7 h-7" />
              <span className="text-sm font-bold uppercase tracking-wider">Lista para descubrir</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">Historia e Identidad Nacional</h2>
            <p className="text-secondary text-sm leading-relaxed">
              Una primera experiencia basada en el manual de INATEC. Las cuentas y actividades de demostración
              se crean automáticamente.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-line pt-5">
              {[
                ['8', 'estudiantes'],
                ['3', 'lecciones'],
                ['18', 'ejercicios'],
              ].map(([value, label]) => (
                <div key={label} className="flex flex-wrap items-baseline gap-3 sm:block">
                  <p className="text-2xl font-black text-accent">{value}</p>
                  <p className="text-xs text-muted">{label}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </motion.section>
      <div className="grid md:grid-cols-3 gap-5">
        {[
          {
            icon: Tv,
            title: 'Presenta a tu ritmo',
            text: 'Preguntas legibles, respuestas que revelas cuando quieras y pantalla completa para el aula.',
          },
          {
            icon: Gamepad2,
            title: 'Juega en tiempo real',
            text: 'Comparte el PIN o QR. Tus estudiantes responden y celebran sus avances desde sus dispositivos.',
          },
          {
            icon: Users,
            title: 'Acompaña a tu grupo',
            text: 'Lecciones, tareas, conversación y progreso en una experiencia conectada.',
          },
        ].map(({ icon: Icon, title, text }) => (
          <Card key={title} className="space-y-3 p-6">
            <Icon className="w-6 h-6 text-accent" />
            <h2 className="font-display text-xl font-bold text-foreground">{title}</h2>
            <p className="text-sm text-secondary leading-relaxed">{text}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
