import type { ParticipantState, WsServerMessage } from '@shared/contracts/games'
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock,
  Flame,
  Gamepad2,
  Lightbulb,
  Sparkles,
  Trophy,
  XCircle,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatedCounter } from '../components/animations/AnimatedCounter'
import { ShakeFeedback } from '../components/animations/ShakeFeedback'
import { StreakFlame } from '../components/animations/StreakFlame'
import { AnswerControls } from '../components/game/AnswerControls'
import { LivePodium } from '../components/game/LivePodium'
import { Button } from '../components/ui/Button'
import { MarkdownText } from '../components/ui/MarkdownText'
import { sound } from '../lib/audio-synth'
import { triggerConfetti } from '../lib/confetti'

export function PlayerRoom() {
  const { pin } = useParams<{ pin: string }>()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [status, setStatus] = useState<
    'connecting' | 'lobby' | 'countdown' | 'active' | 'result' | 'scoreboard' | 'finished'
  >('connecting')
  const [currentExercise, setCurrentExercise] = useState<any>(null)
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [totalExercises, setTotalExercises] = useState(0)
  const [remainingSec, setRemainingSec] = useState(0)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [myScore, setMyScore] = useState(0)
  const [myStreak, setMyStreak] = useState(0)
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [podium, setPodium] = useState<ParticipantState[]>([])
  const [shakeTrigger, setShakeTrigger] = useState(0)
  const [myRank, setMyRank] = useState<number | null>(null)
  const [countdownValue, setCountdownValue] = useState(0)
  const [leaderboard, setLeaderboard] = useState<ParticipantState[]>([])

  const socketRef = useRef<WebSocket | null>(null)
  const questionStartTime = useRef<number>(Date.now())

  useEffect(() => {
    const savedName = sessionStorage.getItem('ap_nickname') || 'Alumno'
    const savedUserId = sessionStorage.getItem('ap_user_id') || undefined
    setDisplayName(savedName)

    if (!pin) {
      navigate('/join')
      return
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/api/ws/game`
    const ws = new WebSocket(wsUrl)
    socketRef.current = ws

    ws.onopen = () => {
      const payload: any = {
        type: 'JOIN',
        pin,
        displayName: savedName,
      }
      if (savedUserId) {
        payload.userId = savedUserId
      }
      ws.send(JSON.stringify(payload))
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WsServerMessage

        switch (msg.type) {
          case 'ROOM_JOINED':
            setStatus(msg.status === 'active' ? 'active' : 'lobby')
            if (msg.status === 'active' && msg.currentExercise) {
              setCurrentExercise(msg.currentExercise)
              setExerciseIndex(msg.exerciseIndex ?? 0)
              setTotalExercises(msg.totalExercises ?? 1)
              setRemainingSec(msg.remainingSec ?? msg.timeSec ?? 30)
              setHasSubmitted(false)
              setLastCorrect(null)
              setExplanation(null)
              questionStartTime.current = Date.now()
            }
            sound.playPowerup()
            break

          case 'PRE_QUESTION_COUNTDOWN':
            setStatus('countdown')
            setExerciseIndex(msg.exerciseIndex)
            setTotalExercises(msg.totalExercises)
            setCountdownValue(msg.countdownSec)
            setHasSubmitted(false)
            setLastCorrect(null)
            setExplanation(null)
            break

          case 'TIMER_TICK':
            if (status === 'countdown') {
              setCountdownValue(msg.remainingSec)
              if (msg.remainingSec <= 3 && msg.remainingSec > 0) {
                sound.playCountdownTick()
              }
            } else {
              setRemainingSec(msg.remainingSec)
              if (msg.remainingSec <= 5 && msg.remainingSec > 0) {
                sound.playCountdownTick()
              }
            }
            break

          case 'GAME_STARTED':
            setCurrentExercise(msg.currentExercise)
            setExerciseIndex(msg.exerciseIndex)
            setTotalExercises(msg.totalExercises)
            setRemainingSec(msg.timeSec)
            setHasSubmitted(false)
            setLastCorrect(null)
            setExplanation(null)
            setStatus('active')
            questionStartTime.current = Date.now()
            sound.playPowerup()
            break

          case 'EXERCISE_RESULT': {
            setStatus('result')
            setExplanation(msg.explanation || null)
            sound.playReveal()

            const me = msg.leaderboard.find((p) => p.displayName === savedName)
            if (me) {
              setMyScore(me.score)
              setMyStreak(me.streak)
              setLastCorrect(me.lastAnswerCorrect ?? false)

              // Calculate rank
              const sorted = [...msg.leaderboard].sort((a, b) => b.score - a.score)
              const rank = sorted.findIndex((p) => p.displayName === savedName)
              setMyRank(rank >= 0 ? rank + 1 : null)

              if (me.lastAnswerCorrect) {
                sound.playCorrect()
                triggerConfetti()
              } else {
                sound.playIncorrect()
                setShakeTrigger((prev) => prev + 1)
              }
            }
            break
          }

          case 'SCOREBOARD':
            setLeaderboard(msg.leaderboard)
            setStatus('scoreboard')
            break

          case 'GAME_FINISHED':
            setPodium(msg.podium)
            setStatus('finished')
            sound.playVictory()
            triggerConfetti()
            break

          case 'ERROR':
            alert(msg.message)
            navigate('/join')
            break
        }
      } catch (err) {
        console.error('Error handling WS message in PlayerRoom:', err)
      }
    }

    ws.onclose = () => {
      // disconnected
    }

    ws.onerror = (err) => {
      console.warn('WebSocket error in PlayerRoom:', err)
    }

    const handleBlur = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'FOCUS_CHANGE',
            hasFocus: false,
          })
        )
      }
    }

    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('blur', handleBlur)
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [pin, navigate])

  const handleSubmitAnswer = (answerValue: any) => {
    if (hasSubmitted || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return

    setHasSubmitted(true)
    const latencyMs = Date.now() - questionStartTime.current

    socketRef.current.send(
      JSON.stringify({
        type: 'SUBMIT_ANSWER',
        exerciseId: currentExercise?.id || '',
        answerJson: typeof answerValue === 'string' ? answerValue : JSON.stringify(answerValue),
        latencyMs,
      })
    )
  }

  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full p-4 sm:p-6 space-y-4 select-none">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between py-3 border-b border-slate-800/80 mb-4">
        <div className="flex items-center gap-2">
          <span className="font-display font-black text-lg text-white">{displayName}</span>
          <StreakFlame streak={myStreak} />
        </div>
        <div className="flex items-center gap-3">
          <AnimatedCounter value={myScore} className="text-xl text-indigo-400" suffix=" pts" />
        </div>
      </div>

      {/* Main Game Screen */}
      <div className="flex-1 flex flex-col justify-center">
        {status === 'connecting' && (
          <div className="text-center space-y-4 py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1, ease: 'linear' }}
              className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent mx-auto"
            />
            <p className="text-slate-400 text-sm">Conectando con la sala {pin}...</p>
          </div>
        )}

        {status === 'lobby' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6 py-12 rounded-3xl bg-slate-900/80 border border-slate-800 p-8 backdrop-blur-xl"
          >
            <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 border-2 border-indigo-400/40 flex items-center justify-center mx-auto text-indigo-400">
              <Gamepad2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display font-black text-3xl text-white">¡Estás Dentro!</h2>
              <p className="text-slate-400 text-sm">
                Sala PIN: <span className="text-indigo-400 font-bold text-base">{pin}</span>
              </p>
              <p className="text-xs text-slate-500 pt-2">
                Mira la pantalla del profesor. El juego comenzará en breve...
              </p>
            </div>
          </motion.div>
        )}

        {/* Pre-question countdown */}
        {status === 'countdown' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center space-y-6 py-12"
          >
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-400">
              Pregunta {exerciseIndex + 1} de {totalExercises}
            </div>
            <motion.div
              key={countdownValue}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="font-display font-black text-8xl text-white"
            >
              {countdownValue}
            </motion.div>
            <p className="text-slate-400 text-sm font-bold">Prepárate para responder...</p>
          </motion.div>
        )}

        {status === 'active' && currentExercise && (
          <div className="space-y-6">
            {/* Timer and Progress */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Pregunta {exerciseIndex + 1} de {totalExercises}
              </span>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 font-bold text-amber-400 text-sm">
                <Clock className="w-4 h-4" />
                <span>{remainingSec}s</span>
              </div>
            </div>

            {/* Question Prompt */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center shadow-xl">
              <div className="font-display font-bold text-lg sm:text-xl text-white leading-relaxed">
                <MarkdownText content={currentExercise.prompt} />
              </div>
              {currentExercise.pointsMultiplier > 1 && (
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
                  <Sparkles className="w-3 h-3" />×{currentExercise.pointsMultiplier} Puntos
                </div>
              )}
            </div>

            {/* Answer Controls */}
            <AnswerControls
              exerciseType={currentExercise.type}
              options={
                Array.isArray(currentExercise.optionsJson)
                  ? currentExercise.optionsJson
                  : currentExercise.optionsJson
                    ? (() => {
                        try {
                          return JSON.parse(currentExercise.optionsJson)
                        } catch {
                          return []
                        }
                      })()
                    : []
              }
              hasSubmitted={hasSubmitted}
              onSubmit={handleSubmitAnswer}
              disabled={remainingSec <= 0}
            />
          </div>
        )}

        {status === 'result' && (
          <ShakeFeedback trigger={shakeTrigger}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-8 rounded-3xl border-2 text-center space-y-4 shadow-2xl backdrop-blur-xl ${
                lastCorrect
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-100'
                  : 'bg-rose-950/80 border-rose-500/50 text-rose-100'
              }`}
            >
              {lastCorrect ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-400">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h2 className="font-display font-black text-3xl text-white">¡Respuesta Correcta!</h2>
                  <p className="text-emerald-200 text-sm font-semibold">¡Puntos y racha sumados con éxito!</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center mx-auto text-rose-400">
                    <XCircle className="w-10 h-10" />
                  </div>
                  <h2 className="font-display font-black text-3xl text-white">¡Oh no, Incorrecto!</h2>
                  <p className="text-rose-200 text-sm">No te rindas, ¡sigue en la próxima ronda!</p>
                </>
              )}

              {myRank && (
                <div className="text-sm text-slate-300">
                  Estás en el puesto{' '}
                  <span className="font-display font-black text-indigo-400">#{myRank}</span>
                </div>
              )}

              {explanation && (
                <div className="mt-4 p-4 rounded-xl bg-black/40 text-xs text-left border border-white/10 text-slate-200">
                  <span className="font-bold text-white flex items-center gap-1.5 mb-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Explicación:
                  </span>
                  <MarkdownText content={explanation} />
                </div>
              )}
            </motion.div>
          </ShakeFeedback>
        )}

        {/* Scoreboard between questions */}
        {status === 'scoreboard' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 py-6"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 text-center flex items-center justify-center gap-1.5">
              <Trophy className="w-4 h-4" />
              Clasificación
            </h3>
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((p, idx) => (
                <motion.div
                  key={p.displayName}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    p.displayName === displayName
                      ? 'bg-indigo-500/10 border-indigo-500/30'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <span className="w-6 text-center font-display font-black text-sm text-slate-400">
                    {idx + 1}
                  </span>
                  <span
                    className={`flex-1 font-bold text-sm truncate ${
                      p.displayName === displayName ? 'text-indigo-300' : 'text-white'
                    }`}
                  >
                    {p.displayName}
                    {p.displayName === displayName && (
                      <span className="text-[10px] text-indigo-400 ml-1">(Tú)</span>
                    )}
                  </span>
                  <span className="font-display font-black text-indigo-400 text-sm">{p.score}</span>
                </motion.div>
              ))}
            </div>
            <p className="text-xs text-slate-500 text-center pt-2">Esperando siguiente pregunta...</p>
          </motion.div>
        )}

        {status === 'finished' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 py-6"
          >
            <LivePodium podium={podium} />

            <div className="flex justify-center pt-4">
              <Button variant="primary" size="lg" onClick={() => navigate('/student')} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Volver a mis Clases</span>
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
