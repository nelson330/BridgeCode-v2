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
}

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

  constructor(sessionId: string, pin: string, mode: GameMode, exercises: any[]) {
    this.sessionId = sessionId
    this.pin = pin
    this.mode = mode
    this.exercises = exercises
  }

  public broadcast(msg: WsServerMessage) {
    const payload = JSON.stringify(msg)

    // Broadcast to player participants
    for (const participant of this.participants.values()) {
      try {
        participant.socket.send(payload)
      } catch {
        // client might have disconnected
      }
    }

    // Broadcast to host observers (Datashow projectors)
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

    // Immediately send current participant list and status to host
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

  public addParticipant(socket: ClientSocket, displayName: string, userId?: string): string {
    const participantId = `p_${nanoid(8)}`
    const teams: ('red' | 'blue' | 'green' | 'yellow')[] = ['red', 'blue', 'green', 'yellow']
    const team = this.mode === 'battle' ? teams[this.participants.size % teams.length] : undefined

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
        }
      : undefined

    // Send ROOM_JOINED with current exercise if session is already active
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

    // Broadcast updated participant list to all (including Host Datashow)
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

  public startGame() {
    this.status = 'active'
    this.currentExerciseIndex = 0
    this.loadExercise(0)
  }

  public loadExercise(index: number) {
    if (index >= this.exercises.length) {
      this.finishGame()
      return
    }

    this.currentExerciseIndex = index
    const exercise = this.exercises[index]
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

    const currentEx = this.exercises[this.currentExerciseIndex]
    if (!currentEx) return

    const correct = isAnswerCorrect(currentEx.type, answerJson, currentEx.answerJson)
    const { pointsEarned, newStreak } = calculateScore(
      currentEx.points,
      currentEx.timeSec,
      latencyMs,
      participant.streak,
      correct
    )

    participant.hasAnswered = true
    participant.lastAnswerCorrect = correct
    participant.score += pointsEarned
    participant.streak = newStreak

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

    // Broadcast updated answer stats to Datashow host and participants
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

    this.broadcast({
      type: 'EXERCISE_RESULT',
      correctAnswerJson: currentEx.answerJson,
      explanation: currentEx.explanation,
      leaderboard: this.getParticipantsState(),
    })
  }

  public nextExercise() {
    this.loadExercise(this.currentExerciseIndex + 1)
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

    this.broadcast({
      type: 'GAME_FINISHED',
      podium,
    })

    const db = getDb()
    await db
      .update(liveSessions)
      .set({
        status: 'finished',
        rankSnapshotJson: JSON.stringify(podium),
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
