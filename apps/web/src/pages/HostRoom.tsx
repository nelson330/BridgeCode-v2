import type { ParticipantState, WsServerMessage } from '@shared/contracts/games'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnswerDistributionChart } from '../components/game/AnswerDistributionChart'
import { LivePodium } from '../components/game/LivePodium'
import { QuestionDisplay } from '../components/game/QuestionDisplay'
import { RouletteWheel } from '../components/game/RouletteWheel'
import { ScoreboardOverlay } from '../components/game/ScoreboardOverlay'
import { AsyncState } from '../components/ui/AsyncState'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { QrCode } from '../components/ui/QrCode'
import { apiFetch } from '../lib/api'
import { sound } from '../lib/audio-synth'
import { notify } from '../lib/feedback'
import {
  ArrowRight,
  BarChart3,
  Clock,
  Gamepad2,
  Maximize,
  Minimize,
  Play,
  Radio,
  Sparkles,
  Timer,
  Trophy,
  Tv,
  Users,
} from '../lib/icons'
import { useFullscreen } from '../lib/useFullscreen'

export function HostRoom() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const [session, setSession] = useState<any>(null)
  const [exercises, setExercises] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'lobby' | 'trivia' | 'roulette' | 'podium'>('lobby')
  const [participants, setParticipants] = useState<ParticipantState[]>([])
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  const { fullscreen: isFullscreen, toggleFullscreen } = useFullscreen()
  const [connection, setConnection] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [studentNames, setStudentNames] = useState<string[]>([])
  const [answeredCount, setAnsweredCount] = useState(0)
  const [_totalParticipants, setTotalParticipants] = useState(0)

  // New Kahoot flow states
  const [preCountdown, setPreCountdownState] = useState<number | null>(null)
  const preCountdownRef = useRef<number | null>(null)
  const setPreCountdown = (val: number | null) => {
    preCountdownRef.current = val
    setPreCountdownState(val)
  }
  const [distribution, setDistribution] = useState<
    Array<{ optionIndex: number; count: number; label?: string }>
  >([])
  const [questionStats, setQuestionStats] = useState<{
    accuracyPercent: number
    correctCount: number
    totalCount: number
    avgLatencyMs: number
  } | null>(null)
  const [showScoreboard, setShowScoreboard] = useState(false)
  const [allQuestionStats, setAllQuestionStats] = useState<
    Array<{
      exerciseIndex: number
      accuracyPercent: number
      correctCount: number
      totalCount: number
      avgLatencyMs: number
    }>
  >([])

  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!sessionId) return
    let disposed = false
    setLoadError(null)
    setConnection('connecting')

    let removeOfflineListener = () => {}
    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/api/ws/game`
      const ws = new WebSocket(wsUrl)
      socketRef.current = ws

      ws.onopen = () => {
        if (!disposed) setConnection('connected')
        ws.send(
          JSON.stringify({
            type: 'HOST_JOIN',
            sessionId,
          })
        )
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WsServerMessage
          switch (msg.type) {
            case 'SESSION_STATE':
              setCurrentExerciseIndex(Math.max(0, msg.exerciseIndex))
              setIsRevealed(msg.phase === 'result')
              setParticipants(msg.participants)
              setPreCountdown(msg.phase === 'countdown' ? msg.remainingSec : null)
              setActiveTab(msg.phase === 'finished' ? 'podium' : msg.phase === 'lobby' ? 'lobby' : 'trivia')
              break

            case 'PARTICIPANT_LIST':
              sound.playPowerup()
              setParticipants(msg.participants)
              break

            case 'ANSWER_STATS':
              setTotalParticipants(msg.totalParticipants)
              setAnsweredCount(msg.answeredCount)
              break

            case 'PRE_QUESTION_COUNTDOWN':
              setCurrentExerciseIndex(msg.exerciseIndex)
              setIsRevealed(false)
              setAnsweredCount(0)
              setDistribution([])
              setQuestionStats(null)
              setShowScoreboard(false)
              setPreCountdown(msg.countdownSec)
              setActiveTab('trivia')
              break

            case 'TIMER_TICK':
              if (preCountdownRef.current !== null && preCountdownRef.current > 0) {
                setPreCountdown(msg.remainingSec)
                if (msg.remainingSec <= 3 && msg.remainingSec > 0) {
                  sound.playCountdownDramatic()
                } else if (msg.remainingSec > 3) {
                  sound.playCountdownTick()
                }
              }
              break

            case 'GAME_STARTED':
              setActiveTab('trivia')
              setPreCountdown(null)
              setCurrentExerciseIndex(msg.exerciseIndex)
              setIsRevealed(false)
              setAnsweredCount(0)
              setDistribution([])
              setQuestionStats(null)
              setShowScoreboard(false)
              break

            case 'ANSWER_DISTRIBUTION':
              setDistribution(msg.distribution)
              break

            case 'QUESTION_STATS':
              setQuestionStats({
                accuracyPercent: msg.accuracyPercent,
                correctCount: msg.correctCount,
                totalCount: msg.totalCount,
                avgLatencyMs: msg.avgLatencyMs,
              })
              break

            case 'EXERCISE_RESULT':
              setIsRevealed(true)
              setParticipants(msg.leaderboard)
              break

            case 'SCOREBOARD':
              setShowScoreboard(true)
              setParticipants(msg.leaderboard)
              break

            case 'ERROR':
              setLoadError(msg.message)
              break

            case 'GAME_FINISHED':
              setParticipants(msg.podium)
              if (msg.questionStats) setAllQuestionStats(msg.questionStats)
              setActiveTab('podium')
              sound.playVictory()
              break
          }
        } catch {
          notify('No se pudo interpretar una actualización de la sala')
        }
      }

      ws.onclose = () => {
        if (!disposed) setConnection('disconnected')
      }
      ws.onerror = () => {
        if (!disposed) setConnection('disconnected')
      }

      const handleOffline = () => {
        setConnection('disconnected')
        ws.close()
      }
      window.addEventListener('offline', handleOffline)
      removeOfflineListener = () => window.removeEventListener('offline', handleOffline)
    }

    apiFetch<any>(`/api/sessions/${sessionId}`)
      .then((res) => {
        const sess = res?.session || res
        if (disposed) return
        setSession(sess)
        setCurrentExerciseIndex(Math.max(0, sess.currentExerciseIndex ?? 0))
        setIsRevealed(sess.phase === 'result')
        if (Array.isArray(sess?.exercises)) {
          setExercises(sess.exercises)
        }
        if (sess?.status === 'finished') {
          setParticipants(sess.rankSnapshotJson ? JSON.parse(sess.rankSnapshotJson).podium || [] : [])
          setActiveTab('podium')
        } else if (sess?.mode === 'roulette') {
          setActiveTab('roulette')
        } else if (sess?.status === 'active') {
          setActiveTab('trivia')
        } else {
          setActiveTab('lobby')
        }

        if (sess?.status !== 'finished') connect()
        else setConnection('disconnected')

        if (sess?.classId) {
          apiFetch<{ gradebook: any }>(`/api/classes/${sess.classId}/gradebook`)
            .then((gbRes) => {
              const names = gbRes.gradebook?.students?.map((s: any) => s.displayName) || []
              if (names.length > 0) setStudentNames(names)
            })
            .catch((error) => {
              if (!disposed) notify(error.message || 'No se pudo cargar el grupo para la ruleta')
            })
        }
      })
      .catch((err) => {
        if (!disposed) setLoadError(err.message || 'No se pudo cargar la sala')
      })

    return () => {
      disposed = true
      removeOfflineListener()
      const socket = socketRef.current
      if (socket) socket.close()
      socketRef.current = null
    }
  }, [sessionId, retry])

  const handleStartGame = async () => {
    if (!sessionId) return
    try {
      await apiFetch(`/api/sessions/${sessionId}/start`, { method: 'POST' })
      setActiveTab('trivia')
      sound.playVictory()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo iniciar la partida')
    }
  }

  const handleNextExercise = async () => {
    if (!sessionId) return
    try {
      if (currentExerciseIndex + 1 < exercises.length) {
        await apiFetch(`/api/sessions/${sessionId}/next`, { method: 'POST' })
        setIsRevealed(false)
        setShowScoreboard(false)
        setDistribution([])
        setQuestionStats(null)
      } else await handleFinishGame()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo avanzar')
    }
  }
  const handleFinishGame = async () => {
    if (!sessionId) return
    try {
      await apiFetch(`/api/sessions/${sessionId}/finish`, { method: 'POST' })
      setActiveTab('podium')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo finalizar la partida')
    }
  }
  const handleReveal = async () => {
    if (!sessionId) return
    try {
      await apiFetch(`/api/sessions/${sessionId}/reveal`, { method: 'POST' })
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo revelar la respuesta')
    }
  }

  const currentExercise = exercises[currentExerciseIndex]

  if (loadError)
    return (
      <div className="p-4">
        <AsyncState error={loadError} onRetry={() => setRetry(retry + 1)} />
        <Button variant="ghost" onClick={() => navigate('/dashboard')}>
          Volver al panel
        </Button>
      </div>
    )
  if (!session)
    return (
      <div className="p-4">
        <AsyncState loading />
      </div>
    )

  return (
    <div className="min-h-screen bg-canvas text-foreground flex flex-col select-none">
      <div
        className="flex flex-wrap items-center justify-center gap-3 px-4 py-2 bg-surface border-b border-line text-sm"
        aria-live="polite"
      >
        <span>
          {connection === 'connected'
            ? 'Conectado · En vivo'
            : connection === 'connecting'
              ? 'Conectando con la sala…'
              : 'Sin conexión. Las acciones están pausadas.'}
        </span>
        {connection === 'disconnected' && (
          <Button variant="secondary" onClick={() => setRetry(retry + 1)}>
            Reconectar
          </Button>
        )}
      </div>
      {/* Header Bar */}
      <header className="min-h-16 py-3 gap-3 flex-wrap px-4 sm:px-6 border-b border-line bg-surface/60 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500 flex items-center justify-center text-accent shrink-0">
            <Tv className="w-5 h-5" />
          </div>
          <div className="truncate">
            <h1 className="font-display font-black text-base sm:text-lg text-foreground truncate">
              {session?.lessonTitle || 'Proyección en Datashow'}
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted truncate">
              <Badge variant="primary" className="text-[10px] py-0 px-1.5 shrink-0">
                En vivo
              </Badge>
              <span>•</span>
              <span className="font-semibold text-secondary truncate">{session?.className || 'Clase'}</span>
              {session?.mode && (
                <>
                  <span>•</span>
                  <Badge variant="warning" className="text-[10px] py-0 px-1.5 capitalize">
                    {session.mode === 'teams'
                      ? 'Equipos'
                      : session.mode === 'race'
                        ? 'Carrera'
                        : session.mode === 'battle'
                          ? 'Batalla'
                          : session.mode === 'roulette'
                            ? 'Ruleta'
                            : 'Trivia'}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {session?.codePin && (
            <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-indigo-600/20 border border-indigo-500/40">
              <span className="text-xs font-bold uppercase tracking-wider text-accent">PIN de Sala:</span>
              <span className="font-display font-black text-2xl text-foreground tracking-widest">
                {session.codePin}
              </span>
            </div>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            className="gap-1.5 text-xs hidden sm:inline-flex"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            {isFullscreen ? 'Salir' : 'Pantalla Completa'}
          </Button>

          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="text-xs">
            Volver al Panel
          </Button>
        </div>
      </header>

      {/* Main Stage */}
      <section className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-7xl mx-auto w-full">
        {activeTab === 'lobby' && (
          <div className="max-w-3xl w-full text-center space-y-8">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-10 rounded-3xl bg-surface/90 border-2 border-indigo-500/40 shadow-2xl backdrop-blur-xl space-y-6"
            >
              <div className="space-y-2">
                <span className="text-xs font-extrabold uppercase tracking-widest text-accent">
                  Esperando a los alumnos
                </span>
                <h2 className="font-display font-black text-4xl sm:text-5xl text-foreground">
                  {session?.lessonTitle || 'Lección en Vivo'}
                </h2>
                {
                  <div className="pt-4 space-y-4">
                    <span className="text-sm text-muted block">Código PIN para unirse:</span>
                    <span className="inline-block max-w-full px-4 sm:px-8 py-4 rounded-3xl bg-indigo-600/30 border-2 border-indigo-400 font-display font-black text-[clamp(1.5rem,7vw,3.75rem)] text-foreground tracking-wider shadow-2xl shadow-indigo-500/40">
                      {session?.codePin || '—'}
                    </span>

                    {/* Real Scannable QR Code */}
                    {session?.codePin && (
                      <div className="flex flex-col items-center gap-3 pt-3">
                        <QrCode value={`${window.location.origin}/join?pin=${session.codePin}`} size={160} />
                        <div className="space-y-0.5 text-center">
                          <span className="text-xs font-bold text-accent block">
                            Escanea con la cámara de tu móvil para unirte
                          </span>
                          <span className="text-[11px] text-muted font-mono select-all">
                            {window.location.origin}/join?pin={session.codePin}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                }
              </div>

              {/* Connected Players */}
              {participants.length > 0 && (
                <div className="pt-4 border-t border-line space-y-2">
                  <span className="text-xs font-bold text-muted uppercase tracking-wider">
                    Alumnos Conectados ({participants.length})
                  </span>
                  <div className="flex flex-wrap justify-center gap-2">
                    {participants.map((p) => (
                      <Badge key={p.displayName} variant="primary" className="text-sm py-1 px-3 font-bold">
                        {p.displayName}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-center gap-4 pt-6">
                <Button
                  variant="game"
                  size="xl"
                  onClick={handleStartGame}
                  disabled={connection !== 'connected' || participants.length === 0}
                  className="gap-3 bg-gradient-to-r from-emerald-600 to-green-600 text-on-accent shadow-xl shadow-emerald-500/30 text-2xl px-10"
                >
                  <Play className="w-7 h-7 fill-current" />
                  <span>¡Comenzar Trivia!</span>
                </Button>

                <Button
                  variant="secondary"
                  size="xl"
                  onClick={() => setActiveTab('roulette')}
                  className="gap-2 text-xl"
                >
                  <Sparkles className="w-6 h-6 text-warning" />
                  <span>Modo Ruleta</span>
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {activeTab === 'roulette' && (
          <div className="flex flex-col items-center space-y-6">
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setActiveTab('lobby')} className="text-xs">
                ← Volver al Lobby
              </Button>
              <Button variant="primary" size="sm" onClick={() => setActiveTab('trivia')} className="text-xs">
                Ir a Trivia →
              </Button>
            </div>

            <RouletteWheel
              items={
                participants.length > 0
                  ? participants.map((p) => p.displayName)
                  : studentNames.length > 0
                    ? studentNames
                    : []
              }
            />
          </div>
        )}

        {activeTab === 'trivia' && (
          <div className="max-w-5xl w-full flex flex-col items-center space-y-6">
            {/* Pre-question countdown overlay */}
            {preCountdown !== null && preCountdown > 0 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/90 backdrop-blur-xl"
              >
                <div className="text-center space-y-6">
                  <div className="text-xs font-bold uppercase tracking-widest text-accent">
                    Pregunta {currentExerciseIndex + 1} de {exercises.length}
                  </div>
                  <motion.div
                    key={preCountdown}
                    initial={{ scale: 2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    className="font-display font-black text-[clamp(5rem,20vw,12rem)] text-foreground leading-none"
                  >
                    {preCountdown}
                  </motion.div>
                  <div className="text-lg text-muted font-bold">Prepárate...</div>
                </div>
              </motion.div>
            )}

            {currentExercise ? (
              <>
                <div className="text-xs font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                  <span>
                    Pregunta {currentExerciseIndex + 1} de {exercises.length}
                  </span>
                  {currentExercise.pointsMultiplier > 1 && (
                    <Badge variant="warning" className="text-[10px]">
                      ×{currentExercise.pointsMultiplier} Puntos
                    </Badge>
                  )}
                </div>

                <QuestionDisplay exercise={currentExercise} isRevealed={isRevealed} />

                {/* Live Responses Indicator */}
                {participants.length > 0 && (
                  <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-surface/90 border border-line shadow-xl max-w-xl w-full">
                    <div className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-wider">
                      <span className="text-muted">Respuestas de Alumnos:</span>
                      <span className="font-display font-black text-success text-sm">
                        {answeredCount || participants.filter((p) => p.hasAnswered).length} /{' '}
                        {participants.length}
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-elevated overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{
                          width: `${
                            ((answeredCount || participants.filter((p) => p.hasAnswered).length) /
                              Math.max(participants.length, 1)) *
                            100
                          }%`,
                        }}
                      />
                    </div>

                    <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                      {participants.map((p) => (
                        <span
                          key={p.displayName}
                          className={`text-[11px] px-2 py-0.5 rounded-md font-semibold transition-colors ${
                            p.hasAnswered
                              ? 'bg-emerald-500/20 text-success border border-emerald-500/40'
                              : 'bg-elevated text-muted'
                          }`}
                        >
                          {p.displayName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Answer Distribution + Stats (after reveal) */}
                {isRevealed && distribution.length > 0 && (
                  <AnswerDistributionChart distribution={distribution} stats={questionStats} />
                )}

                {/* Scoreboard overlay between questions */}
                {showScoreboard && !isRevealed && (
                  <ScoreboardOverlay leaderboard={participants} mode={session?.mode} />
                )}

                {/* Teacher Control Bar */}
                <div className="flex flex-wrap justify-center items-center gap-3 pt-4">
                  {!isRevealed ? (
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleReveal}
                      disabled={connection !== 'connected' || preCountdown !== null}
                      className="gap-2"
                    >
                      <Sparkles className="w-5 h-5" />
                      <span>Revelar Respuesta Correcta</span>
                    </Button>
                  ) : (
                    <Button
                      variant="success"
                      size="lg"
                      onClick={handleNextExercise}
                      disabled={connection !== 'connected'}
                      className="gap-2 text-foreground"
                    >
                      <span>
                        {currentExerciseIndex + 1 < exercises.length
                          ? 'Siguiente Pregunta'
                          : 'Ver Podio Final'}
                      </span>
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  )}

                  <Button
                    variant="danger"
                    size="lg"
                    onClick={handleFinishGame}
                    disabled={connection !== 'connected'}
                    className="gap-2"
                  >
                    <Trophy className="w-5 h-5" />
                    <span>Finalizar</span>
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center text-muted py-12">
                <Gamepad2 className="w-12 h-12 mx-auto mb-4 text-muted" />
                <p>Esperando ejercicios...</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'podium' && (
          <div className="flex flex-col items-center space-y-6">
            <LivePodium podium={[...participants].sort((a, b) => b.score - a.score)} />

            {/* Question Stats Summary */}
            {allQuestionStats.length > 0 && (
              <div className="w-full max-w-2xl p-6 rounded-2xl bg-surface/90 border border-line space-y-4">
                <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-accent" />
                  Resumen por Pregunta
                </h3>
                <div className="space-y-2">
                  {allQuestionStats.map((qs) => (
                    <div
                      key={qs.exerciseIndex}
                      className="flex items-center gap-3 p-3 rounded-xl bg-canvas border border-line"
                    >
                      <span className="text-xs font-bold text-accent w-8">#{qs.exerciseIndex + 1}</span>
                      <div className="flex-1 h-2 rounded-full bg-elevated overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            qs.accuracyPercent >= 70
                              ? 'bg-emerald-500'
                              : qs.accuracyPercent >= 40
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                          }`}
                          style={{ width: `${qs.accuracyPercent}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-secondary w-12 text-right">
                        {qs.accuracyPercent}%
                      </span>
                      <span className="text-[10px] text-muted w-20 text-right">{qs.avgLatencyMs}ms avg</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button variant="primary" size="lg" onClick={() => navigate('/dashboard')} className="mt-6">
              Regresar al Panel Docente
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}
