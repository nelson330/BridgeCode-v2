import type { CreateSessionRequest } from '@shared/contracts/games'
import { and, eq } from 'drizzle-orm'
import { customAlphabet, nanoid } from 'nanoid'
import { getDb } from '../../core/db/client'
import {
  anticheatEvents,
  courseClasses,
  exercises,
  groupMembers,
  lessons,
  liveSessions,
  users,
} from '../../core/db/schema'
import { AppError } from '../../core/errors'
import { RoomManager } from './room'

const generatePin = customAlphabet('0123456789', 6)

export class GamesService {
  static async createSession(teacherId: string, req: CreateSessionRequest) {
    const db = getDb()

    // 1. Verify class and lesson
    const lessonFound = await db
      .select()
      .from(lessons)
      .where(and(eq(lessons.id, req.lessonId), eq(lessons.teacherId, teacherId)))
      .limit(1)

    if (lessonFound.length === 0 || !lessonFound[0]) {
      throw AppError.notFound('Lección no encontrada o sin permisos')
    }

    if (lessonFound[0].status !== 'published') {
      throw AppError.badRequest('La lección debe estar publicada para iniciar una sesión en vivo')
    }

    // 2. Load exercises
    const exerciseList = await db.select().from(exercises).where(eq(exercises.lessonId, req.lessonId))

    if (exerciseList.length === 0) {
      throw AppError.badRequest('La lección no contiene ejercicios')
    }

    const sessionId = `ses_${nanoid(10)}`
    const pin = generatePin()

    await db.insert(liveSessions).values({
      id: sessionId,
      classId: req.classId,
      lessonId: req.lessonId,
      teacherId,
      codePin: pin,
      status: 'lobby',
      mode: req.mode,
      startedAt: new Date(),
    })

    // 3. Register in memory GameRoom
    const _room = RoomManager.createRoom(sessionId, pin, req.mode, exerciseList)

    return {
      sessionId,
      pin,
      mode: req.mode,
      status: 'lobby',
      exerciseCount: exerciseList.length,
    }
  }

  static async getSession(userId: string, sessionId: string) {
    const db = getDb()
    const found = await db.select().from(liveSessions).where(eq(liveSessions.id, sessionId)).limit(1)
    if (found.length === 0 || !found[0]) {
      throw AppError.notFound('Sesión no encontrada')
    }

    // Verify the user belongs to the session's class
    await GamesService.assertSessionAccess(userId, found[0])

    const parentLesson = await db.select().from(lessons).where(eq(lessons.id, found[0].lessonId)).limit(1)

    const exerciseList = await db.select().from(exercises).where(eq(exercises.lessonId, found[0].lessonId))

    const room = RoomManager.getRoomById(sessionId)

    return {
      ...found[0],
      lessonTitle: parentLesson[0]?.title || 'Lección en Vivo',
      exercises: exerciseList,
      activeParticipants: room ? room.getParticipantsState() : [],
    }
  }

  static async startSession(teacherId: string, sessionId: string) {
    const db = getDb()
    const found = await db
      .select()
      .from(liveSessions)
      .where(and(eq(liveSessions.id, sessionId), eq(liveSessions.teacherId, teacherId)))
      .limit(1)

    if (found.length === 0 || !found[0]) {
      throw AppError.notFound('Sesión no encontrada o sin permisos')
    }

    await db.update(liveSessions).set({ status: 'active' }).where(eq(liveSessions.id, sessionId))
    const room = RoomManager.getRoomById(sessionId)
    if (room) {
      room.startGame()
    }

    return { success: true, status: 'active' }
  }

  static async nextExercise(_teacherId: string, sessionId: string) {
    const room = RoomManager.getRoomById(sessionId)
    if (!room) {
      throw AppError.notFound('Sala activa no encontrada')
    }
    room.nextExercise()
    return { success: true, currentExerciseIndex: room.currentExerciseIndex }
  }

  static async finishSession(_teacherId: string, sessionId: string) {
    const room = RoomManager.getRoomById(sessionId)
    if (room) {
      await room.finishGame()
      RoomManager.deleteRoom(sessionId)
    }

    return { success: true, status: 'finished' }
  }

  static async reportAnticheatEvent(
    sessionId: string,
    userId: string | undefined,
    type: string,
    detail?: string
  ) {
    const db = getDb()
    await db.insert(anticheatEvents).values({
      id: nanoid(),
      sessionId,
      userId: userId || null,
      type,
      detailJson: detail || null,
    })
    return { success: true }
  }

  /**
   * Verify a user can access a live session. Webmaster has access to everything;
   * teacher must own the session; student must be enrolled in the session's class.
   */
  static async assertSessionAccess(userId: string, session: { classId: string; teacherId: string }) {
    const db = getDb()

    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (user.length === 0 || !user[0]) {
      throw AppError.unauthenticated('Debes iniciar sesión para continuar')
    }

    if (user[0].role === 'webmaster') return
    if (user[0].role === 'teacher') {
      if (session.teacherId === userId) return
      throw AppError.forbidden('No tienes permisos sobre esta sesión')
    }

    // Student
    const member = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.userId, userId), eq(groupMembers.classId, session.classId)))
      .limit(1)
    if (member.length === 0) {
      throw AppError.forbidden('No estás inscrito en la clase de esta sesión')
    }
  }
}
