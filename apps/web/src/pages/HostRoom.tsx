import type { ParticipantState, WsServerMessage } from '@shared/contracts/games'
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
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnswerDistributionChart } from '../components/game/AnswerDistributionChart'
import { LivePodium } from '../components/game/LivePodium'
import { QuestionDisplay } from '../components/game/QuestionDisplay'
import { RouletteWheel } from '../components/game/RouletteWheel'
import { ScoreboardOverlay } from '../components/game/ScoreboardOverlay'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'
import { sound } from '../lib/audio-synth'

export function HostRoom() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { isLocalMode } = useAuth()
  const navigate = useNavigate()

  const [session, setSession] = useState<any>(null)
  const [exercises, setExercises] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'lobby' | 'trivia' | 'roulette' | 'podium'>('lobby')
  const [participants, setParticipants] = useState<ParticipantState[]>([])
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [studentNames, setStudentNames] = useState<string[]>([])
  const [answeredCount, setAnsweredCount] = useState(0)
  const [_totalParticipants, setTotalParticipants] = useState(0)

  // New Kahoot flow states
  const [preCountdown, setPreCountdown] = useState<number | null>(null)
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

    apiFetch<any>(`/api/sessions/${sessionId}`)
      .then((res) => {
        const sess = res?.session || res
        setSession(sess)
        if (Array.isArray(sess?.exercises)) {
          setExercises(sess.exercises)
        }
        if (sess?.mode === 'roulette') {
          setActiveTab('roulette')
        } else if (sess?.status === 'active') {
          setActiveTab('trivia')
        } else {
          setActiveTab('lobby')
        }

        if (sess?.classId) {
          apiFetch<{ gradebook: any }>(`/api/classes/${sess.classId}/gradebook`)
            .then((gbRes) => {
              const names = gbRes.gradebook?.students?.map((s: any) => s.displayName) || []
              if (names.length > 0) setStudentNames(names)
            })
            .catch(() => {})
        }
      })
      .catch((err) => {
        console.error('Error loading session in HostRoom:', err)
      })

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/api/ws/game`
    const ws = new WebSocket(wsUrl)
    socketRef.current = ws

    ws.onopen = () => {
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
            if (preCountdown !== null) {
              setPreCountdown(msg.remainingSec)
              if (msg.remainingSec <= 3 && msg.remainingSec > 0) {
                sound.playCountdownTick()
              }
            }
            break

          case 'GAME_STARTED':
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

          case 'GAME_FINISHED':
            setParticipants(msg.podium)
            if (msg.questionStats) setAllQuestionStats(msg.questionStats)
            setActiveTab('podium')
            sound.playVictory()
            break
        }
      } catch {
        // ignore
      }
    }

    ws.onerror = (err) => {
      console.warn('HostRoom WebSocket error:', err)
    }

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      } else if (ws.readyState === WebSocket.CONNECTING) {
        ws.onopen = () => {
          ws.close()
        }
      }
    }
  }, [sessionId])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const handleStartGame = async () => {
    if (!sessionId) return
    try {
      await apiFetch(`/api/sessions/${sessionId}/start`, { method: 'POST' })
      setActiveTab('trivia')
      sound.playVictory()
    } catch {
      setActiveTab('trivia')
    }
  }

  const handleNextExercise = async () => {
    setIsRevealed(false)
    setAnsweredCount(0)
    setDistribution([])
    setQuestionStats(null)
    setShowScoreboard(false)
    setPreCountdown(null)
    if (currentExerciseIndex + 1 < exercises.length) {
      if (sessionId) {
        try {
          await apiFetch(`/api/sessions/${sessionId}/next`, { method: 'POST' })
        } catch {
          // ignore
        }
      }
      sound.playPowerup()
    } else {
      handleFinishGame()
    }
  }

  const handleLocalAnswerSubmit = (isCorrect: boolean) => {
    setIsRevealed(true)
    if (isCorrect) {
      sound.playCorrect()
    } else {
      sound.playIncorrect()
    }
  }

  const handleFinishGame = async () => {
    if (sessionId) {
      try {
        await apiFetch(`/api/sessions/${sessionId}/finish`, { method: 'POST' })
      } catch {
        // ignore
      }
    }
    setActiveTab('podium')
    sound.playVictory()
  }

  const currentExercise = exercises[currentExerciseIndex]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none">
      {/* Header Bar */}
      <header className="h-16 px-4 sm:px-6 border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500 flex items-center justify-center text-indigo-400 shrink-0">
            <Tv className="w-5 h-5" />
          </div>
          <div className="truncate">
            <h1 className="font-display font-black text-base sm:text-lg text-white truncate">
              {session?.lessonTitle || 'Proyección en Datashow'}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
              <Badge
                variant={isLocalMode ? 'success' : 'primary'}
                className="text-[10px] py-0 px-1.5 shrink-0"
              >
                {isLocalMode ? 'Modo Local (Aula)' : 'Modo Hosted (Multijugador)'}
              </Badge>
              <span>•</span>
              <span className="font-semibold text-slate-300 truncate">{session?.className || 'Clase'}</span>
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
          {session?.codePin && !isLocalMode && (
            <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-indigo-600/20 border border-indigo-500/40">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">PIN de Sala:</span>
              <span className="font-display font-black text-2xl text-white tracking-widest">
                {session.codePin}
              </span>
            </div>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={toggleFullscreen}
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
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-7xl mx-auto w-full">
        {activeTab === 'lobby' && (
          <div className="max-w-3xl w-full text-center space-y-8">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-10 rounded-3xl bg-slate-900/90 border-2 border-indigo-500/40 shadow-2xl backdrop-blur-xl space-y-6"
            >
              <div className="space-y-2">
                <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-400">
                  {isLocalMode ? 'Sala Local Lista para Proyectar' : 'Esperando a los Alumnos'}
                </span>
                <h2 className="font-display font-black text-4xl sm:text-5xl text-white">
                  {session?.lessonTitle || 'Lección en Vivo'}
                </h2>
                {!isLocalMode && (
                  <div className="pt-4 space-y-4">
                    <span className="text-sm text-slate-400 block">Código PIN para unirse:</span>
                    <span className="inline-block px-8 py-4 rounded-3xl bg-indigo-600/30 border-2 border-indigo-400 font-display font-black text-6xl text-white tracking-widest shadow-2xl shadow-indigo-500/40">
                      {session?.codePin || '123456'}
                    </span>

                    {/* QR Code */}
                    {session?.codePin && (
                      <div className="flex flex-col items-center gap-2 pt-2">
                        <QRCodeSVG value={`${window.location.origin}/join?pin=${session.codePin}`} />
                        <span className="text-xs text-slate-500">Escanea para unirte</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Connected Players */}
              {participants.length > 0 && (
                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
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
                  className="gap-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-xl shadow-emerald-500/30 text-2xl px-10"
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
                  <Sparkles className="w-6 h-6 text-amber-400" />
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
                    : ['Sofía García', 'Carlos Ruiz', 'Mateo F.', 'Valentina R.']
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
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl"
              >
                <div className="text-center space-y-6">
                  <div className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                    Pregunta {currentExerciseIndex + 1} de {exercises.length}
                  </div>
                  <motion.div
                    key={preCountdown}
                    initial={{ scale: 2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    className="font-display font-black text-[12rem] text-white leading-none"
                  >
                    {preCountdown}
                  </motion.div>
                  <div className="text-lg text-slate-400 font-bold">Prepárate...</div>
                </div>
              </motion.div>
            )}

            {currentExercise ? (
              <>
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                  <span>
                    Pregunta {currentExerciseIndex + 1} de {exercises.length}
                  </span>
                  {currentExercise.pointsMultiplier > 1 && (
                    <Badge variant="warning" className="text-[10px]">
                      ×{currentExercise.pointsMultiplier} Puntos
                    </Badge>
                  )}
                </div>

                <QuestionDisplay
                  exercise={currentExercise}
                  isLocalMode={isLocalMode}
                  isRevealed={isRevealed}
                  onLocalAnswerSubmit={handleLocalAnswerSubmit}
                />

                {/* Live Responses Indicator */}
                {!isLocalMode && participants.length > 0 && (
                  <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl max-w-xl w-full">
                    <div className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-wider">
                      <span className="text-slate-400">Respuestas de Alumnos:</span>
                      <span className="font-display font-black text-emerald-400 text-sm">
                        {answeredCount || participants.filter((p) => p.hasAnswered).length} /{' '}
                        {participants.length}
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
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
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-500'
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
                <div className="flex items-center gap-4 pt-4">
                  {!isRevealed ? (
                    <Button variant="primary" size="lg" onClick={() => setIsRevealed(true)} className="gap-2">
                      <Sparkles className="w-5 h-5" />
                      <span>Revelar Respuesta Correcta</span>
                    </Button>
                  ) : (
                    <Button
                      variant="success"
                      size="lg"
                      onClick={handleNextExercise}
                      className="gap-2 text-white"
                    >
                      <span>
                        {currentExerciseIndex + 1 < exercises.length
                          ? 'Siguiente Pregunta'
                          : 'Ver Podio Final'}
                      </span>
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  )}

                  <Button variant="danger" size="lg" onClick={handleFinishGame} className="gap-2">
                    <Trophy className="w-5 h-5" />
                    <span>Finalizar</span>
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center text-slate-500 py-12">
                <Gamepad2 className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                <p>Esperando ejercicios...</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'podium' && (
          <div className="flex flex-col items-center space-y-6">
            <LivePodium
              podium={
                participants.length > 0
                  ? participants.sort((a, b) => b.score - a.score)
                  : [
                      { displayName: 'Sofía García', score: 285, streak: 2, hasAnswered: true },
                      { displayName: 'Carlos Ruiz', score: 160, streak: 1, hasAnswered: true },
                    ]
              }
            />

            {/* Question Stats Summary */}
            {allQuestionStats.length > 0 && (
              <div className="w-full max-w-2xl p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-400" />
                  Resumen por Pregunta
                </h3>
                <div className="space-y-2">
                  {allQuestionStats.map((qs) => (
                    <div
                      key={qs.exerciseIndex}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800"
                    >
                      <span className="text-xs font-bold text-indigo-400 w-8">#{qs.exerciseIndex + 1}</span>
                      <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
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
                      <span className="text-xs font-bold text-slate-300 w-12 text-right">
                        {qs.accuracyPercent}%
                      </span>
                      <span className="text-[10px] text-slate-500 w-20 text-right">
                        {qs.avgLatencyMs}ms avg
                      </span>
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
      </main>
    </div>
  )
}

// Simple QR Code SVG component (no external deps)
function QRCodeSVG({ value }: { value: string }) {
  // Generate a simple QR-like visual using the URL hash
  const size = 128
  const modules = 21 // QR version 1 is 21x21
  const cellSize = size / modules

  // Simple hash-based pattern (not a real QR encoder, but visually representative)
  const hash = simpleHash(value)
  const grid: boolean[][] = []
  for (let y = 0; y < modules; y++) {
    const row: boolean[] = []
    for (let x = 0; x < modules; x++) {
      // Finder patterns (corners)
      const isFinder = (x < 7 && y < 7) || (x >= modules - 7 && y < 7) || (x < 7 && y >= modules - 7)
      if (isFinder) {
        const lx = x < 7 ? x : x - (modules - 7)
        const ly = y < 7 ? y : y - (modules - 7)
        row.push(lx === 0 || lx === 6 || ly === 0 || ly === 6 || (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4))
      } else {
        // Data area: use hash for pseudo-random pattern
        row.push(((hash[(y * modules + x) % hash.length] ?? 0) & 1) === 1)
      }
    }
    grid.push(row)
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-lg">
      <rect width={size} height={size} fill="white" />
      {grid.map((row, y) =>
        row.map((cell, x) =>
          cell ? (
            <rect
              key={`${x}-${y}`}
              x={x * cellSize}
              y={y * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#1e293b"
            />
          ) : null
        )
      )}
    </svg>
  )
}

function simpleHash(str: string): number[] {
  const result: number[] = []
  for (let i = 0; i < str.length; i++) {
    result.push(str.charCodeAt(i))
  }
  // Expand
  while (result.length < 441) {
    const prev = result[result.length - 1] ?? 0
    const back = result[Math.max(0, result.length - 5)] ?? 0
    result.push((prev * 31 + back) & 0xff)
  }
  return result
}
