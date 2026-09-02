import { isAnswerCorrect } from '@shared/contracts/exercises'
import { motion } from 'framer-motion'
import {
  Bot,
  Clock,
  Crown,
  Flame,
  Gamepad2,
  Play,
  RotateCcw,
  Sparkles,
  Swords,
  Trophy,
  User,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiFetch } from '../../lib/api'
import { sound } from '../../lib/audio-synth'
import { triggerConfetti } from '../../lib/confetti'
import { StreakFlame } from '../animations/StreakFlame'
import { AnswerControls } from '../game/AnswerControls'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

interface BattlesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentName: string
  lessons: Array<{ id: string; title: string }>
}

export function BattlesModal({ open, onOpenChange, studentName, lessons }: BattlesModalProps) {
  const { t } = useTranslation()
  const [selectedLessonId, setSelectedLessonId] = useState(lessons[0]?.id || '')
  const [gameState, setGameState] = useState<'lobby' | 'matching' | 'battle' | 'result'>('lobby')

  const [opponent, setOpponent] = useState<{ name: string; isBot: boolean }>({
    name: 'AstroBot',
    isBot: true,
  })

  const [exercises, setExercises] = useState<any[]>([])
  const [currentExIndex, setCurrentExIndex] = useState(0)
  const [myScore, setMyScore] = useState(0)
  const [opponentScore, setOpponentScore] = useState(0)
  const [myStreak, setMyStreak] = useState(0)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [_remainingSec, setRemainingSec] = useState(20)

  const handleStartBattle = async () => {
    if (!selectedLessonId) return

    setGameState('matching')
    sound.playPowerup()

    try {
      // 1. Fetch challenge match or ghost replay
      const matchRes = await apiFetch<{ mode: string; ghost?: any }>('/api/challenges/find', {
        method: 'POST',
        body: JSON.stringify({ lessonId: selectedLessonId }),
      })

      // 2. Fetch exercises for this lesson
      const exRes = await apiFetch<{ exercises: any[] }>(`/api/lessons/${selectedLessonId}/exercises`)
      if (exRes.exercises.length === 0) {
        alert('Esta lección aún no tiene ejercicios para batallas.')
        setGameState('lobby')
        return
      }

      setOpponent({
        name: matchRes.ghost?.ghostName || 'AstroBot (Fantasma)',
        isBot: true,
      })

      setExercises(exRes.exercises)
      setCurrentExIndex(0)
      setMyScore(0)
      setOpponentScore(0)
      setMyStreak(0)
      setHasSubmitted(false)
      setRemainingSec(20)

      setTimeout(() => {
        setGameState('battle')
        sound.playVictory()
      }, 1200)
    } catch (err: any) {
      alert(err.message || 'Error al buscar batalla')
      setGameState('lobby')
    }
  }

  const handleSubmitAnswer = (selectedOption: any) => {
    if (hasSubmitted) return

    setHasSubmitted(true)
    const ex = exercises[currentExIndex]
    if (!ex) return

    // Validate correctness locally for instant arcade response using universal validator
    const answerJsonStr = typeof selectedOption === 'string' ? selectedOption : JSON.stringify(selectedOption)
    const isCorrect = isAnswerCorrect(ex.type, answerJsonStr, ex.answerJson)

    if (isCorrect) {
      sound.playCorrect()
      const pts = 100 + myStreak * 25
      setMyScore((prev) => prev + pts)
      setMyStreak((prev) => prev + 1)
    } else {
      sound.playIncorrect()
      setMyStreak(0)
    }

    // Opponent AI answer simulation
    const opponentCorrect = Math.random() > 0.3
    if (opponentCorrect) {
      setOpponentScore((prev) => prev + 90 + Math.floor(Math.random() * 20))
    }

    setTimeout(() => {
      if (currentExIndex + 1 < exercises.length) {
        setCurrentExIndex((prev) => prev + 1)
        setHasSubmitted(false)
        setRemainingSec(20)
        sound.playPowerup()
      } else {
        // End of battle
        setGameState('result')
        if (myScore >= opponentScore) {
          sound.playVictory()
          triggerConfetti()
        } else {
          sound.playIncorrect()
        }
      }
    }, 1000)
  }

  const currentExercise = exercises[currentExIndex]

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('battles.title')}
      description={t('battles.subtitle')}
      className="max-w-3xl select-none"
    >
      <div className="space-y-6">
        {/* LOBBY / TOPIC SELECTION */}
        {gameState === 'lobby' && (
          <div className="p-5 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center mx-auto text-rose-400 shadow-xl shadow-rose-500/20">
              <Swords className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="font-display font-black text-2xl text-white">{t('battles.selectTopic')}</h3>
              <p className="text-xs text-slate-400">
                Selecciona una lección para retarte en trivia rápida 1v1.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
              {lessons.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setSelectedLessonId(l.id)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    selectedLessonId === l.id
                      ? 'bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="font-bold text-sm text-white block">{l.title}</span>
                  <span className="text-[11px] text-slate-400">
                    {(l as any).exerciseCount || 3} Preguntas • 1v1 Rápido
                  </span>
                </button>
              ))}
            </div>

            <Button
              variant="game"
              size="lg"
              onClick={handleStartBattle}
              disabled={!selectedLessonId}
              className="w-full gap-3 bg-gradient-to-r from-rose-600 to-red-600 text-white font-black shadow-xl shadow-rose-500/30 text-lg"
            >
              <Zap className="w-5 h-5 fill-current" />
              <span>{t('battles.startMatch')}</span>
            </Button>
          </div>
        )}

        {/* MATCHING STATE */}
        {gameState === 'matching' && (
          <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/90 border border-slate-800 text-center space-y-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.2, ease: 'linear' }}
              className="w-16 h-16 rounded-full border-4 border-rose-500 border-t-transparent mx-auto"
            />
            <div className="space-y-2">
              <h3 className="font-display font-black text-2xl text-white">{t('battles.matching')}</h3>
              <p className="text-xs text-slate-400">{t('battles.matchingDesc')}</p>
            </div>
          </div>
        )}

        {/* ACTIVE BATTLE */}
        {gameState === 'battle' && currentExercise && (
          <div className="space-y-6">
            {/* Scoreboard Bar */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800">
              {/* Player 1 (Me) */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400 flex items-center justify-center font-black text-indigo-300">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-xs text-white block">{studentName}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-black text-lg text-indigo-400">{myScore} pts</span>
                    <StreakFlame streak={myStreak} />
                  </div>
                </div>
              </div>

              {/* Player 2 (Opponent) */}
              <div className="flex items-center justify-end gap-3 text-right">
                <div>
                  <span className="font-bold text-xs text-rose-300 block">{opponent.name}</span>
                  <span className="font-display font-black text-lg text-rose-400">{opponentScore} pts</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-600/30 border border-rose-400 flex items-center justify-center font-black text-rose-300">
                  <Bot className="w-5 h-5 text-rose-300" />
                </div>
              </div>
            </div>

            {/* Question Display */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2 shadow-xl">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                {t('battles.round')} {currentExIndex + 1} / {exercises.length}
              </div>
              <h3 className="font-display font-black text-xl text-white">{currentExercise.prompt}</h3>
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
              answerJson={currentExercise.answerJson}
              hasSubmitted={hasSubmitted}
              onSubmit={handleSubmitAnswer}
            />
          </div>
        )}

        {/* BATTLE RESULT */}
        {gameState === 'result' && (
          <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 text-center space-y-6">
            <div
              className={`w-20 h-20 rounded-3xl border-2 flex items-center justify-center mx-auto shadow-2xl ${
                myScore >= opponentScore
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-emerald-500/30'
                  : 'bg-rose-500/20 border-rose-400 text-rose-400 shadow-rose-500/30'
              }`}
            >
              {myScore >= opponentScore ? <Trophy className="w-10 h-10" /> : <Swords className="w-10 h-10" />}
            </div>

            <div className="space-y-2">
              <h2 className="font-display font-black text-3xl text-white">
                {myScore >= opponentScore ? t('battles.epicVictory') : t('battles.goodFight')}
              </h2>
              <p className="text-sm text-slate-400">
                Puntaje Final: <b className="text-indigo-400">{myScore} pts</b> vs{' '}
                <b className="text-rose-400">{opponentScore} pts</b>
              </p>
            </div>

            <div className="flex justify-center gap-3 pt-4">
              <Button
                variant="game"
                size="lg"
                onClick={() => setGameState('lobby')}
                className="gap-2 bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t('battles.playAgain')}</span>
              </Button>
              <Button variant="ghost" size="lg" onClick={() => onOpenChange(false)}>
                {t('battles.finish')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  )
}
