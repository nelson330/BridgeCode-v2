import { AnimatePresence, type Variants, motion, useReducedMotion } from 'motion/react'
import { type ComponentType, type ReactNode, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Gamepad2,
  GraduationCap,
  type IconProps,
  Lightbulb,
  Maximize,
  MessageSquare,
  Minimize,
  Moon,
  QrCode,
  Sun,
  Tv,
  Users,
} from '../lib/icons'
import { useFullscreen } from '../lib/useFullscreen'
import { useTheme } from '../lib/useTheme'
import '../styles/project-deck.css'

const slides = [
  {
    label: 'La propuesta',
    eyebrow: '01 / Una clase que se vive',
    title: 'Del concepto a la participación.',
    description:
      'AulaPlay conecta explicación, práctica y feedback en una misma experiencia online para la formación técnica.',
    notes:
      'Presenta AulaPlay como un apoyo al docente. En una carrera técnica, explicar un concepto es el inicio: también necesitamos que el grupo participe, justifique sus decisiones y se prepare para la práctica en el taller.',
  },
  {
    label: 'El problema',
    eyebrow: '02 / El reto del aula técnica',
    title: '¿Quién comprendió el procedimiento?',
    description:
      'Una explicación frente al grupo no siempre permite ver las dudas a tiempo. Antes de la práctica, hace falta escuchar más respuestas y conversar sobre los errores.',
    notes:
      'Plantea el problema con una escena cotidiana: terminamos de explicar y preguntamos si se entendió; responden unas pocas personas. AulaPlay abre otra oportunidad de participación y ayuda a identificar qué conviene repasar antes de la práctica.',
  },
  {
    label: 'Las herramientas',
    eyebrow: '03 / Funcionalidades que acompañan',
    title: 'Una lección. Dos formas de activarla.',
    description:
      'El docente elige cómo trabajar cada lección: presentar a su ritmo o abrir una partida para que el grupo responda desde sus dispositivos.',
    notes:
      'Distingue las dos opciones: Presentar permite explicar y revelar respuestas manualmente; Jugar en vivo añade participación desde dispositivos, puntuación y resultados. Las lecciones, tareas, foro y progreso dan continuidad al trabajo del grupo.',
  },
  {
    label: 'El flujo',
    eyebrow: '04 / De la preparación al feedback',
    title: 'Un recorrido claro para cada clase.',
    description:
      'Por ejemplo, en una clase de redes: plantea un caso de conexión, recoge las decisiones del grupo y discute el diagnóstico antes de pasar a la práctica.',
    notes:
      'Recorre el diagrama de izquierda a derecha. El docente prepara una lección y decide si la presenta o abre una partida. En el juego, comparte PIN o QR; el grupo responde, revisa la explicación y el docente consulta los resultados para orientar el repaso.',
  },
  {
    label: 'La demostración',
    eyebrow: '05 / Del proyecto a la demostración',
    title: 'Lista para abrir y probar.',
    description:
      'La instalación incluye una demo de Historia e Identidad Nacional. Sirve para recorrer el aula, proyectar ejercicios y probar una partida de inmediato.',
    notes:
      'Cierra con una demostración concreta: entra como docente, abre el grupo Historia e Identidad Nacional y elige una lección. Presenta primero una pregunta; después abre Jugar en vivo y comparte el PIN. El contenido técnico se prepara en las lecciones del docente.',
  },
] as const

type DeckIcon = ComponentType<IconProps>
type ElementProps = { variants: Variants; children: ReactNode; className?: string }

function Element({ variants, children, className = '' }: ElementProps) {
  return (
    <motion.div variants={variants} className={className}>
      {children}
    </motion.div>
  )
}

function DiagramNode({
  icon: Icon,
  title,
  text,
  step,
}: { icon: DeckIcon; title: string; text: string; step?: string }) {
  return (
    <div className="deck-node">
      <span className="deck-icon">
        <Icon className="h-5 w-5" />
      </span>
      {step && <span className="deck-step">{step}</span>}
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  )
}

function Connector() {
  return <ArrowRight className="deck-connector" aria-hidden="true" />
}

function SlideContent({ index, variants, panel }: { index: number; variants: Variants; panel: string }) {
  if (index === 0)
    return (
      <div className="deck-overview">
        <Element variants={variants} className="deck-statement">
          <span className="deck-icon">
            <GraduationCap className="h-7 w-7" />
          </span>
          <p className="deck-kicker">Para carreras técnicas</p>
          <h2>
            Aprender a decidir.
            <br />
            Prepararse para hacer.
          </h2>
          <p>
            Preguntas sobre conceptos, casos y procedimientos como punto de partida para conversar y
            practicar.
          </p>
          <div className="deck-tags">
            <span>Redes</span>
            <span>Electricidad</span>
            <span>Gastronomía</span>
          </div>
        </Element>
        <section className="deck-cycle" aria-label="Aprender, participar y reforzar">
          {[
            { icon: BookOpen, title: 'Comprender', text: 'Una explicación clara, al ritmo del docente.' },
            { icon: Users, title: 'Participar', text: 'Preguntas para poner en juego lo aprendido.' },
            { icon: Lightbulb, title: 'Reforzar', text: 'Respuestas explicadas para volver a intentarlo.' },
          ].map((node, i) => (
            <Element variants={variants} key={node.title} className="deck-cycle-item">
              <DiagramNode {...node} step={`0${i + 1}`} />
              {i < 2 && <Connector />}
            </Element>
          ))}
        </section>
      </div>
    )

  if (index === 1)
    return (
      <>
        <div className="deck-comparison">
          <Element variants={variants} className="deck-card deck-card-warm">
            <p className="deck-kicker">El punto de partida</p>
            <h2>
              Mucho contenido.
              <br />
              Pocas señales de comprensión.
            </h2>
            <ul className="deck-list">
              <li>
                <MessageSquare />
                Las dudas pueden quedarse sin expresar.
              </li>
              <li>
                <Users />
                Unas pocas voces concentran la participación.
              </li>
              <li>
                <ClipboardList />
                El error puede aparecer recién en la práctica.
              </li>
            </ul>
          </Element>
          <Element variants={variants} className="deck-card deck-card-cool">
            <p className="deck-kicker">La oportunidad con AulaPlay</p>
            <h2>
              Hacer visibles
              <br />
              las decisiones del grupo.
            </h2>
            <ul className="deck-list">
              <li>
                <CheckCircle2 />
                Plantear preguntas antes de pasar al taller.
              </li>
              <li>
                <CheckCircle2 />
                Recoger respuestas durante la partida.
              </li>
              <li>
                <CheckCircle2 />
                Explicar el porqué y orientar el repaso.
              </li>
            </ul>
          </Element>
        </div>
        <Element variants={variants} className="deck-takeaway">
          <Lightbulb className="h-5 w-5" />
          <p>El juego abre la conversación; el docente conecta las respuestas con la práctica técnica.</p>
        </Element>
      </>
    )

  if (index === 2)
    return (
      <>
        <div className="deck-comparison">
          <Element variants={variants} className="deck-card deck-card-cool">
            <div className="deck-card-heading">
              <Tv />
              <span className="deck-kicker">Explicar y conversar</span>
            </div>
            <h2>Presentar</h2>
            <p>
              Proyecta preguntas, avanza manualmente y revela la respuesta con su explicación. Sin
              temporizador ni puntuación.
            </p>
            <div className="deck-mini-flow">
              <span>Pregunta</span>
              <Connector />
              <span>Discusión</span>
              <Connector />
              <span>Explicación</span>
            </div>
          </Element>
          <Element variants={variants} className="deck-card deck-card-lilac">
            <div className="deck-card-heading">
              <Gamepad2 />
              <span className="deck-kicker">Responder y descubrir</span>
            </div>
            <h2>Jugar en vivo</h2>
            <p>
              Abre una sala, comparte PIN o QR y recibe respuestas desde dispositivos. Consulta puntuación y
              resultados de la partida.
            </p>
            <div className="deck-mini-flow">
              <span>PIN / QR</span>
              <Connector />
              <span>Respuestas</span>
              <Connector />
              <span>Resultados</span>
            </div>
          </Element>
        </div>
        <div className="deck-feature-grid">
          {[
            { icon: Users, title: 'Grupos y lecciones', text: 'Organiza estudiantes y contenidos.' },
            { icon: ClipboardList, title: 'Lecturas y tareas', text: 'Continúa el trabajo de la clase.' },
            { icon: MessageSquare, title: 'Muro y foro', text: 'Comparte y conversa en comunidad.' },
            { icon: BarChart3, title: 'Progreso y resultados', text: 'Consulta cómo avanza el grupo.' },
          ].map(({ icon: Icon, title, text }) => (
            <Element key={title} variants={variants} className="deck-feature">
              <Icon className="h-5 w-5" />
              <h3>{title}</h3>
              <p>{text}</p>
            </Element>
          ))}
        </div>
      </>
    )

  if (index === 3)
    return (
      <>
        <section className="deck-workflow" aria-label="Flujo de una clase online">
          {[
            { icon: BookOpen, title: 'Prepara', text: 'Elige el grupo, la lección y los ejercicios.' },
            { icon: Tv, title: 'Activa', text: 'Presenta a tu ritmo o inicia Jugar en vivo.' },
            { icon: QrCode, title: 'Conecta', text: 'En el juego, comparte el PIN o QR del aula.' },
            { icon: MessageSquare, title: 'Practica', text: 'Recoge respuestas y explica las decisiones.' },
            { icon: BarChart3, title: 'Acompaña', text: 'Revisa resultados y decide qué reforzar.' },
          ].map((node, i) => (
            <Element key={node.title} variants={variants} className="deck-workflow-item">
              <DiagramNode {...node} step={`0${i + 1}`} />
              {i < 4 && <Connector />}
            </Element>
          ))}
        </section>
        <div className="deck-comparison deck-context">
          <Element variants={variants} className="deck-card deck-card-warm">
            <p className="deck-kicker">Ejemplo de uso técnico</p>
            <h2>Un caso. Varias decisiones.</h2>
            <p>
              “Un equipo no logra conectarse a la red. ¿Qué revisarías primero y por qué?” El grupo elige una
              opción y después justifica su diagnóstico.
            </p>
          </Element>
          <Element variants={variants} className="deck-card">
            <p className="deck-kicker">Lo necesario en el aula</p>
            <p>
              Conexión a internet y un equipo del docente para proyectar. Para Jugar en vivo, los
              participantes también necesitan un dispositivo conectado.
            </p>
            <p className="deck-caption">
              El caso de redes es una propuesta de uso; la demo incluida es de Historia e Identidad Nacional.
            </p>
          </Element>
        </div>
      </>
    )

  return (
    <div className="deck-overview">
      <Element variants={variants} className="deck-card deck-card-lilac deck-demo">
        <p className="deck-kicker">Demo incluida · INATEC</p>
        <h2>
          Historia e<br />
          Identidad Nacional
        </h2>
        <p>
          Tres lecciones publicadas, con lecturas, preguntas de opción múltiple, verdadero o falso y
          explicaciones.
        </p>
        <div className="deck-metrics">
          {[
            ['8', 'estudiantes ficticios'],
            ['3', 'lecciones publicadas'],
            ['18', 'ejercicios listos'],
          ].map(([value, label]) => (
            <div key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <p className="deck-caption">
          Manual de INATEC, edición enero de 2025. El docente puede crear otras lecciones para su carrera
          técnica.
        </p>
      </Element>
      <div className="deck-demo-actions">
        <Element variants={variants}>
          <p className="deck-kicker">Ahora, veámoslo en acción</p>
          <h2 className="deck-closing">
            Abre. Proyecta.
            <br />
            <span>Haz participar.</span>
          </h2>
          <ol className="deck-checklist">
            <li>
              <span>1</span>Entra al panel docente y abre el grupo.
            </li>
            <li>
              <span>2</span>Selecciona una de las lecciones publicadas.
            </li>
            <li>
              <span>3</span>Elige Presentar o Jugar en vivo.
            </li>
          </ol>
        </Element>
        <Element variants={variants} className="deck-cta-row">
          <Link to={panel} className="deck-primary-link">
            Abrir la demo
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link to="/join" className="deck-secondary-link">
            <Gamepad2 className="h-5 w-5" />
            Unirse con PIN
          </Link>
        </Element>
      </div>
    </div>
  )
}

export function ProjectDeck() {
  const [{ index, direction }, setPosition] = useState({ index: 0, direction: 1 })
  const [showNotes, setShowNotes] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const reducedMotion = useReducedMotion()
  const { theme, toggleTheme } = useTheme()
  const { fullscreen, toggleFullscreen } = useFullscreen()
  const { user } = useAuth()
  const panel = user?.role === 'student' ? '/student' : user ? '/dashboard' : '/login'
  const slide = slides[index]!
  const goTo = (next: number) => {
    setPosition((current) => {
      const target = Math.max(0, Math.min(slides.length - 1, next))
      return target === current.index
        ? current
        : { index: target, direction: target > current.index ? 1 : -1 }
    })
  }
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'AulaPlay · Presentación del proyecto'
    return () => {
      document.title = previousTitle
    }
  }, [])
  useEffect(() => {
    const navigate = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('input, textarea, select, [contenteditable="true"]')
      )
        return
      const destinations: Record<string, number> = {
        ArrowRight: index + 1,
        PageDown: index + 1,
        ArrowLeft: index - 1,
        PageUp: index - 1,
        Home: 0,
        End: slides.length - 1,
      }
      const target = destinations[event.key]
      if (target === undefined) return
      event.preventDefault()
      goTo(target)
    }
    window.addEventListener('keydown', navigate)
    return () => window.removeEventListener('keydown', navigate)
  }, [index])
  const elements: Variants = {
    hidden: { opacity: 0, y: reducedMotion ? 0 : 18 },
    visible: { opacity: 1, y: 0, transition: { duration: reducedMotion ? 0 : 0.4 } },
    exit: { opacity: 0, y: reducedMotion ? 0 : -12, transition: { duration: reducedMotion ? 0 : 0.18 } },
  }
  const frame: Variants = {
    hidden: { opacity: 0, x: reducedMotion ? 0 : direction * 24 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: reducedMotion ? 0 : 0.3, staggerChildren: reducedMotion ? 0 : 0.065 },
    },
    exit: {
      opacity: 0,
      x: reducedMotion ? 0 : direction * -24,
      transition: {
        duration: reducedMotion ? 0 : 0.25,
        staggerChildren: reducedMotion ? 0 : 0.025,
        staggerDirection: -1,
        when: 'afterChildren',
      },
    },
  }
  return (
    <div className="project-deck">
      <header className="deck-header">
        <Link to="/" className="deck-brand" aria-label="Volver al inicio de AulaPlay">
          <ArrowLeft className="h-4 w-4" />
          <span>
            AulaPlay<span className="deck-brand-subtitle">Presentación del proyecto</span>
          </span>
        </Link>
        <div className="deck-toolbar">
          <Button
            variant="ghost"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro'}
          >
            {theme === 'dark' ? <Sun /> : <Moon />}
          </Button>
          <Button
            variant="ghost"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {fullscreen ? <Minimize /> : <Maximize />}
          </Button>
        </div>
      </header>
      <div className="deck-stage">
        <AnimatePresence mode="wait">
          <motion.section
            key={index}
            className="deck-slide"
            aria-labelledby={`deck-title-${index}`}
            variants={frame}
            initial="hidden"
            animate="visible"
            exit="exit"
            onAnimationComplete={(definition) => {
              if (definition === 'visible') {
                heading.current?.focus({ preventScroll: true })
                window.scrollTo({ top: 0, behavior: 'instant' })
              }
            }}
          >
            <Element variants={elements} className="deck-intro">
              <motion.p variants={elements} className="deck-eyebrow">
                {slide.eyebrow}
              </motion.p>
              <motion.h1 variants={elements} ref={heading} tabIndex={-1} id={`deck-title-${index}`}>
                {slide.title}
              </motion.h1>
              <motion.p variants={elements} className="deck-description">
                {slide.description}
              </motion.p>
            </Element>
            <SlideContent index={index} variants={elements} panel={panel} />
            <AnimatePresence>
              {showNotes && (
                <motion.aside
                  key="notes"
                  id="deck-notes"
                  className="deck-notes"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reducedMotion ? 0 : 0.2 }}
                >
                  <h2>Guion para exponer</h2>
                  <p>{slide.notes}</p>
                </motion.aside>
              )}
            </AnimatePresence>
          </motion.section>
        </AnimatePresence>
      </div>
      <footer className="deck-footer">
        <div
          className="deck-progress"
          role="progressbar"
          tabIndex={0}
          aria-label="Progreso de la presentación"
          aria-valuemin={1}
          aria-valuemax={slides.length}
          aria-valuenow={index + 1}
          aria-valuetext={`Diapositiva ${index + 1} de ${slides.length}: ${slide.label}`}
        >
          <span style={{ width: `${((index + 1) / slides.length) * 100}%` }} />
        </div>
        <div className="deck-controls">
          <div className="deck-control-meta">
            <p className="deck-counter" aria-live="polite" aria-atomic="true">
              {String(index + 1).padStart(2, '0')} <span>/ 05</span>
            </p>
            <button
              type="button"
              className="deck-notes-toggle"
              onClick={() => setShowNotes(!showNotes)}
              aria-expanded={showNotes}
              aria-controls={showNotes ? 'deck-notes' : undefined}
            >
              {showNotes ? 'Ocultar guion' : 'Guion para exponer'}
            </button>
          </div>
          <nav className="deck-dots" aria-label="Diapositivas">
            {slides.map((item, i) => (
              <button
                type="button"
                key={item.label}
                onClick={() => goTo(i)}
                aria-label={`Diapositiva ${i + 1}: ${item.label}`}
                aria-current={i === index ? 'step' : undefined}
              >
                <span />
              </button>
            ))}
          </nav>
          <div className="deck-navigation">
            <Button
              variant="outline"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              aria-label="Diapositiva anterior"
            >
              <ArrowLeft />
            </Button>
            <Button
              onClick={() => goTo(index + 1)}
              disabled={index === slides.length - 1}
              aria-label="Diapositiva siguiente"
            >
              <span>Siguiente</span>
              <ArrowRight />
            </Button>
          </div>
        </div>
        <p className="deck-keyboard-hint">
          Usa las flechas del teclado para avanzar · Inicio / Fin para saltar
        </p>
      </footer>
    </div>
  )
}
