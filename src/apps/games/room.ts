import type { GameMode, ParticipantState, SessionStatus, WsServerMessage } from '@shared/contracts/games'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { getDb } from '../../core/db/client'
import { answers, anticheatEvents, liveSessions, sessionParticipants } from '../../core/db/schema'
import { calculateScore, isAnswerCorrect } from './scoring'

export interface ClientSocket {
  send(data: string): void
  close(): void
}

interface Participant {
  id: string
  socket: ClientSocket
  userId?: string
  displayName: string
  score: number
  streak: number
  team?: 'red' | 'blue' | 'green' | 'yellow'
  hasAnswered: boolean
  lastAnswerCorrect?: boolean | null
  lastSubmitTime: number
  lastLatencyMs: number
}

interface QuestionStat {
  exerciseIndex: number
  correctCount: number
  totalCount: number
  totalLatencyMs: number
  distribution: Map<number, number>
}

const PRE_QUESTION_SEC = 5

export class GameRoom {
  public sessionId: string
  public pin: string
  public mode: GameMode
  public status: SessionStatus = 'lobby'
  public exercises: any[] = []
  public currentExerciseIndex = -1
  public remainingTimeSec = 0
  public participants = new Map<string, Participant>()
  public hostSockets = new Set<ClientSocket>()
  private timerInterval: any = null
  private questionStats: QuestionStat[] = []
  private currentQuestionStat: QuestionStat | null = null

  constructor(sessionId: string, pin: string, mode: GameMode, exercises: any[]) {
    this.sessionId = sessionId
    this.pin = pin
    this.mode = mode
    this.exercises = exercises
  }

  public broadcast(msg: WsServerMessage) {
    const payload = JSON.stringify(msg)
    for (const participant of this.participants.values()) {
      try {
        participant.socket.send(payload)
      } catch {
        // client might have disconnected
      }
    }
    for (const host of this.hostSockets) {
      try {
        host.send(payload)
      } catch {
        // host disconnected
      }
    }
  }

  public addHostSocket(socket: ClientSocket) {
    this.hostSockets.add(socket)
    socket.send(
      JSON.stringify({
        type: 'PARTICIPANT_LIST',
        participants: this.getParticipantsState(),
      })
    )
    socket.send(
      JSON.stringify({
        type: 'ANSWER_STATS',
        totalParticipants: this.participants.size,
        answeredCount: Array.from(this.participants.values()).filter((p) => p.hasAnswered).length,
      })
    )
  }

  public removeHostSocket(socket: ClientSocket) {
    this.hostSockets.delete(socket)
  }

  public getParticipantsState(): ParticipantState[] {
    return Array.from(this.participants.values())
      .map((p) => ({
        userId: p.userId,
        displayName: p.displayName,
        score: p.score,
        streak: p.streak,
        team: p.team,
        hasAnswered: p.hasAnswered,
        lastAnswerCorrect: p.lastAnswerCorrect,
      }))
      .sort((a, b) => b.score - a.score)
  }

  public getTeamScores(): Array<{ team: string; score: number }> {
    const teamMap = new Map<string, number>()
    for (const p of this.participants.values()) {
      if (p.team) {
        teamMap.set(p.team, (teamMap.get(p.team) || 0) + p.score)
      }
    }
    return Array.from(teamMap.entries())
      .map(([team, score]) => ({ team, score }))
      .sort((a, b) => b.score - a.score)
  }

  public addParticipant(socket: ClientSocket, displayName: string, userId?: string): string {
    const participantId = `p_${nanoid(8)}`
    const teams: ('red' | 'blue' | 'green' | 'yellow')[] = ['red', 'blue', 'green', 'yellow']
    const team =
      this.mode === 'battle' || this.mode === 'teams'
        ? teams[this.participants.size % teams.length]
        : undefined

    const participant: Participant = {
      id: participantId,
      socket,
      userId,
      displayName,
      score: 0,
      streak: 0,
      team,
      hasAnswered: false,
      lastSubmitTime: 0,
      lastLatencyMs: 0,
    }

    this.participants.set(participantId, participant)

    const currentEx = this.exercises[this.currentExerciseIndex]
    const clientExercise = currentEx
      ? {
          id: currentEx.id,
          type: currentEx.type,
          prompt: currentEx.prompt,
          mediaUrl: currentEx.mediaUrl,
          optionsJson: currentEx.optionsJson,
          points: currentEx.points,
          timeSec: currentEx.timeSec,
          pointsMultiplier: currentEx.pointsMultiplier,
        }
      : undefined

    socket.send(
      JSON.stringify({
        type: 'ROOM_JOINED',
        participantId,
        mode: this.mode,
        status: this.status,
        participants: this.getParticipantsState(),
        ...(this.status === 'active' && clientExercise
          ? {
              currentExercise: clientExercise,
              exerciseIndex: this.currentExerciseIndex,
              totalExercises: this.exercises.length,
              timeSec: currentEx.timeSec || 30,
              remainingSec: this.remainingTimeSec,
            }
          : {}),
      })
    )

    this.broadcast({
      type: 'PARTICIPANT_LIST',
      participants: this.getParticipantsState(),
    })

    this.broadcast({
      type: 'ANSWER_STATS',
      totalParticipants: this.participants.size,
      answeredCount: Array.from(this.participants.values()).filter((p) => p.hasAnswered).length,
    })

    return participantId
  }

  public removeParticipant(participantId: string) {
    this.participants.delete(participantId)
    this.broadcast({
      type: 'PARTICIPANT_LIST',
      participants: this.getParticipantsState(),
    })
    this.broadcast({
      type: 'ANSWER_STATS',
      totalParticipants: this.participants.size,
      answeredCount: Array.from(this.participants.values()).filter((p) => p.hasAnswered).length,
    })
  }

  public startGame(skipCountdown = false) {
    this.status = 'active'
    this.currentExerciseIndex = 0
    this.questionStats = []
    if (skipCountdown) {
      this.loadExercise(0)
    } else {
      this.startPreQuestionCountdown(0)
    }
  }

  private startPreQuestionCountdown(index: number) {
    if (index >= this.exercises.length) {
      this.finishGame()
      return
    }

    this.currentExerciseIndex = index

    // Reset answered flags
    for (const p of this.participants.values()) {
      p.hasAnswered = false
      p.lastAnswerCorrect = null
    }

    // Initialize question stat
    this.currentQuestionStat = {
      exerciseIndex: index,
      correctCount: 0,
      totalCount: 0,
      totalLatencyMs: 0,
      distribution: new Map(),
    }

    // Send pre-question countdown
    this.broadcast({
      type: 'PRE_QUESTION_COUNTDOWN',
      exerciseIndex: index,
      totalExercises: this.exercises.length,
      countdownSec: PRE_QUESTION_SEC,
    })

    // After countdown, load the exercise
    if (this.timerInterval) clearInterval(this.timerInterval)
    let countdown = PRE_QUESTION_SEC
    this.timerInterval = setInterval(() => {
      countdown -= 1
      this.broadcast({
        type: 'TIMER_TICK',
        remainingSec: countdown,
      })

      if (countdown <= 0) {
        clearInterval(this.timerInterval)
        this.loadExercise(index)
      }
    }, 1000)
  }

  public loadExercise(index: number) {
    if (index >= this.exercises.length) {
      this.finishGame()
      return
    }

    this.currentExerciseIndex = index
    const exercise = this.exercises[index]

    // Slide type: show content for duration, then auto-advance
    if (exercise.type === 'slide') {
      const slideDuration = (() => {
        try {
          const cfg = JSON.parse(exercise.answerJson || '{}')
          return cfg.durationSec || 8
        } catch {
          return 8
        }
      })()

      const clientExercise = {
        id: exercise.id,
        type: exercise.type,
        prompt: exercise.prompt,
        mediaUrl: exercise.mediaUrl,
        optionsJson: exercise.optionsJson,
        points: 0,
        timeSec: slideDuration,
        pointsMultiplier: 1,
      }

      this.broadcast({
        type: 'GAME_STARTED',
        exerciseIndex: index,
        totalExercises: this.exercises.length,
        currentExercise: clientExercise,
        timeSec: slideDuration,
      })

      this.remainingTimeSec = slideDuration
      if (this.timerInterval) clearInterval(this.timerInterval)
      this.timerInterval = setInterval(() => {
        this.remainingTimeSec -= 1
        this.broadcast({ type: 'TIMER_TICK', remainingSec: this.remainingTimeSec })
        if (this.remainingTimeSec <= 0) {
          clearInterval(this.timerInterval)
          this.nextExercise()
        }
      }, 1000)
      return
    }

    this.remainingTimeSec = exercise.timeSec || 30

    // Reset answered flags
    for (const p of this.participants.values()) {
      p.hasAnswered = false
      p.lastAnswerCorrect = null
    }

    // Hide answers from sent client object
    const clientExercise = {
      id: exercise.id,
      type: exercise.type,
      prompt: exercise.prompt,
      mediaUrl: exercise.mediaUrl,
      optionsJson: exercise.optionsJson,
      points: exercise.points,
      timeSec: exercise.timeSec,
      pointsMultiplier: exercise.pointsMultiplier,
    }

    this.broadcast({
      type: 'GAME_STARTED',
      exerciseIndex: index,
      totalExercises: this.exercises.length,
      currentExercise: clientExercise,
      timeSec: this.remainingTimeSec,
    })

    this.broadcast({
      type: 'ANSWER_STATS',
      totalParticipants: this.participants.size,
      answeredCount: 0,
    })

    if (this.timerInterval) clearInterval(this.timerInterval)
    this.timerInterval = setInterval(() => {
      this.remainingTimeSec -= 1
      this.broadcast({
        type: 'TIMER_TICK',
        remainingSec: this.remainingTimeSec,
      })

      if (this.remainingTimeSec <= 0) {
        clearInterval(this.timerInterval)
        this.revealResults()
      }
    }, 1000)
  }

  public async submitAnswer(participantId: string, answerJson: string, latencyMs: number) {
    const participant = this.participants.get(participantId)
    if (!participant || participant.hasAnswered || this.status !== 'active') return

    const now = Date.now()
    if (now - participant.lastSubmitTime < 100) return // Rate limit
    participant.lastSubmitTime = now
    participant.lastLatencyMs = latencyMs

    const currentEx = this.exercises[this.currentExerciseIndex]
    if (!currentEx) return

    const correct = isAnswerCorrect(currentEx.type, answerJson, currentEx.answerJson)
    const multiplier = currentEx.pointsMultiplier || 1
    const { pointsEarned, newStreak } = calculateScore(
      currentEx.points,
      currentEx.timeSec,
      latencyMs,
      participant.streak,
      correct,
      this.mode === 'race' ? 'race' : 'classic',
      multiplier
    )

    participant.hasAnswered = true
    participant.lastAnswerCorrect = correct
    participant.score += pointsEarned
    participant.streak = newStreak

    // Track question stats
    if (this.currentQuestionStat) {
      this.currentQuestionStat.totalCount += 1
      this.currentQuestionStat.totalLatencyMs += latencyMs
      if (correct) {
        this.currentQuestionStat.correctCount += 1
      }

      // Track distribution for mc/tf types
      if (currentEx.type === 'mc' || currentEx.type === 'tf') {
        try {
          const submitted = JSON.parse(answerJson)
          const idx =
            typeof submitted?.correctIndex === 'number'
              ? submitted.correctIndex
              : typeof submitted?.selectedIndex === 'number'
                ? submitted.selectedIndex
                : -1
          if (idx >= 0) {
            this.currentQuestionStat.distribution.set(
              idx,
              (this.currentQuestionStat.distribution.get(idx) || 0) + 1
            )
          }
        } catch {
          // ignore parse errors
        }
      }
    }

    // Anti-cheat check: Suspiciously fast response (< 300ms) with non-trivial exercise
    if (latencyMs < 300 && correct) {
      const db = getDb()
      await db.insert(anticheatEvents).values({
        id: nanoid(),
        sessionId: this.sessionId,
        userId: participant.userId || null,
        type: 'SUSPICIOUS_LATENCY',
        detailJson: JSON.stringify({ latencyMs, exerciseId: currentEx.id }),
      })
    }

    // Persist answer in database
    const db = getDb()
    await db.insert(answers).values({
      id: nanoid(),
      sessionId: this.sessionId,
      exerciseId: currentEx.id,
      lessonId: currentEx.lessonId,
      userId: participant.userId || null,
      answerJson,
      isCorrect: correct,
      latencyMs,
      pointsEarned,
      kind: 'session',
    })

    // Broadcast updated answer stats
    this.broadcast({
      type: 'ANSWER_STATS',
      totalParticipants: this.participants.size,
      answeredCount: Array.from(this.participants.values()).filter((p) => p.hasAnswered).length,
    })

    // If all participants have answered, advance early
    const allAnswered = Array.from(this.participants.values()).every((p) => p.hasAnswered)
    if (allAnswered && this.participants.size > 0) {
      if (this.timerInterval) clearInterval(this.timerInterval)
      this.revealResults()
    }
  }

  public revealResults() {
    const currentEx = this.exercises[this.currentExerciseIndex]
    if (!currentEx) return

    // Build answer distribution
    const distribution: Array<{ optionIndex: number; count: number; label?: string }> = []
    let options: string[] = []
    try {
      if (currentEx.optionsJson) {
        options = JSON.parse(currentEx.optionsJson)
      }
    } catch {
      // ignore
    }

    if (this.currentQuestionStat) {
      for (const [idx, count] of this.currentQuestionStat.distribution.entries()) {
        distribution.push({
          optionIndex: idx,
          count,
          label: options[idx] || `Opción ${idx + 1}`,
        })
      }

      // Send answer distribution
      this.broadcast({
        type: 'ANSWER_DISTRIBUTION',
        exerciseIndex: this.currentExerciseIndex,
        distribution,
        correctCount: this.currentQuestionStat.correctCount,
        incorrectCount: this.currentQuestionStat.totalCount - this.currentQuestionStat.correctCount,
        totalCount: this.currentQuestionStat.totalCount,
      })

      // Send question stats
      const avgLatencyMs =
        this.currentQuestionStat.totalCount > 0
          ? Math.round(this.currentQuestionStat.totalLatencyMs / this.currentQuestionStat.totalCount)
          : 0
      const accuracyPercent =
        this.currentQuestionStat.totalCount > 0
          ? Math.round((this.currentQuestionStat.correctCount / this.currentQuestionStat.totalCount) * 100)
          : 0

      this.broadcast({
        type: 'QUESTION_STATS',
        exerciseIndex: this.currentExerciseIndex,
        accuracyPercent,
        correctCount: this.currentQuestionStat.correctCount,
        totalCount: this.currentQuestionStat.totalCount,
        avgLatencyMs,
      })

      // Save to history
      this.questionStats.push(this.currentQuestionStat)
    }

    this.broadcast({
      type: 'EXERCISE_RESULT',
      correctAnswerJson: currentEx.answerJson,
      explanation: currentEx.explanation,
      leaderboard: this.getParticipantsState(),
    })

    // After a delay, send scoreboard
    setTimeout(() => {
      this.broadcast({
        type: 'SCOREBOARD',
        leaderboard: this.getParticipantsState().slice(0, 5),
        exerciseIndex: this.currentExerciseIndex,
      })
    }, 3000)
  }

  public nextExercise() {
    this.startPreQuestionCountdown(this.currentExerciseIndex + 1)
  }

  public async recordFocusEvent(participantId: string, hasFocus: boolean) {
    const participant = this.participants.get(participantId)
    if (!participant || !participant.userId) return

    const db = getDb()
    await db.insert(anticheatEvents).values({
      id: nanoid(),
      sessionId: this.sessionId,
      userId: participant.userId,
      type: hasFocus ? 'FOCUS_GAINED' : 'FOCUS_LOST',
      detailJson: JSON.stringify({
        exerciseIndex: this.currentExerciseIndex,
        timestamp: Date.now(),
      }),
    })
  }

  public spinRoulette(): number {
    const participantList = Array.from(this.participants.values())
    if (participantList.length === 0) return 0

    const selectedIndex = Math.floor(Math.random() * participantList.length)
    const selected = participantList[selectedIndex]

    this.broadcast({
      type: 'ROULETTE_SPIN_RESULT',
      selectedIndex,
      selectedParticipant: selected?.displayName || '',
    })

    return selectedIndex
  }

  public async finishGame() {
    this.status = 'finished'
    if (this.timerInterval) clearInterval(this.timerInterval)

    const podium = this.getParticipantsState().slice(0, 3)

    // Build question stats summary
    const questionStatsSummary = this.questionStats.map((qs) => ({
      exerciseIndex: qs.exerciseIndex,
      accuracyPercent: qs.totalCount > 0 ? Math.round((qs.correctCount / qs.totalCount) * 100) : 0,
      correctCount: qs.correctCount,
      totalCount: qs.totalCount,
      avgLatencyMs: qs.totalCount > 0 ? Math.round(qs.totalLatencyMs / qs.totalCount) : 0,
    }))

    this.broadcast({
      type: 'GAME_FINISHED',
      podium,
      questionStats: questionStatsSummary,
    })

    const db = getDb()
    await db
      .update(liveSessions)
      .set({
        status: 'finished',
        rankSnapshotJson: JSON.stringify({
          podium,
          questionStats: questionStatsSummary,
          teamScores: this.mode === 'teams' ? this.getTeamScores() : undefined,
        }),
        endedAt: new Date(),
      })
      .where(eq(liveSessions.id, this.sessionId))
  }
}

export class RoomManager {
  private static roomsByPin = new Map<string, GameRoom>()
  private static roomsById = new Map<string, GameRoom>()

  static createRoom(sessionId: string, pin: string, mode: GameMode, exercises: any[]): GameRoom {
    const room = new GameRoom(sessionId, pin, mode, exercises)
    RoomManager.roomsByPin.set(pin, room)
    RoomManager.roomsById.set(sessionId, room)
    return room
  }

  static getRoomByPin(pin: string): GameRoom | undefined {
    return RoomManager.roomsByPin.get(pin)
  }

  static getRoomById(sessionId: string): GameRoom | undefined {
    return RoomManager.roomsById.get(sessionId)
  }

  static deleteRoom(sessionId: string) {
    const room = RoomManager.roomsById.get(sessionId)
    if (room) {
      RoomManager.roomsByPin.delete(room.pin)
      RoomManager.roomsById.delete(sessionId)
    }
  }

  static getActiveRoomCount(): number {
    return RoomManager.roomsById.size
  }
}
