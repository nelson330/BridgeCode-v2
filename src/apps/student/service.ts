import { and, desc, eq, inArray } from 'drizzle-orm'
import { getDb } from '../../core/db/client'
import {
  courseClasses,
  groupMembers,
  homework,
  lessons,
  liveSessions,
  progress,
  users,
} from '../../core/db/schema'

import { RoomManager } from '../games/room'

export class StudentService {
  static async getMyClasses(studentId: string) {
    const db = getDb()

    const myClasses = await db
      .select({
        classId: courseClasses.id,
        className: courseClasses.name,
        classCode: courseClasses.code,
        joinedAt: groupMembers.joinedAt,
      })
      .from(groupMembers)
      .innerJoin(courseClasses, eq(groupMembers.classId, courseClasses.id))
      .where(eq(groupMembers.userId, studentId))

    return myClasses
  }

  static async getActiveSessions(studentId: string) {
    const db = getDb()

    const memberships = await db
      .select({ classId: groupMembers.classId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, studentId))

    const classIds = memberships.map((m) => m.classId)
    if (classIds.length === 0) return []

    const sessions = await db
      .select({
        sessionId: liveSessions.id,
        classId: liveSessions.classId,
        className: courseClasses.name,
        codePin: liveSessions.codePin,
        mode: liveSessions.mode,
        status: liveSessions.status,
        lessonTitle: lessons.title,
      })
      .from(liveSessions)
      .innerJoin(courseClasses, eq(liveSessions.classId, courseClasses.id))
      .innerJoin(lessons, eq(liveSessions.lessonId, lessons.id))
      .where(and(inArray(liveSessions.classId, classIds), inArray(liveSessions.status, ['lobby', 'active'])))
      .orderBy(desc(liveSessions.createdAt))

    // Only return sessions that are genuinely active and alive in memory
    return sessions.filter((s) => RoomManager.getRoomById(s.sessionId) !== undefined)
  }

  static async getMyHomework(studentId: string) {
    const db = getDb()

    const memberships = await db
      .select({ classId: groupMembers.classId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, studentId))

    const classIds = memberships.map((m) => m.classId)
    if (classIds.length === 0) return []

    const hwList = await db
      .select({
        id: homework.id,
        classId: homework.classId,
        className: courseClasses.name,
        lessonId: homework.lessonId,
        lessonTitle: lessons.title,
        lessonMaterial: lessons.materialContent,
        title: homework.title,
        kind: homework.kind,
        instructions: homework.instructions,
        dueAt: homework.dueAt,
        attemptLimit: homework.attemptLimit,
      })
      .from(homework)
      .innerJoin(courseClasses, eq(homework.classId, courseClasses.id))
      .innerJoin(lessons, eq(homework.lessonId, lessons.id))
      .where(inArray(homework.classId, classIds))
      .orderBy(desc(homework.createdAt))

    // Check student progress for each homework
    const studentProgress = await db.select().from(progress).where(eq(progress.userId, studentId))

    return hwList.map((hw) => {
      const prog = studentProgress.find((p) => p.lessonId === hw.lessonId)
      return {
        ...hw,
        completed: Boolean(prog),
        score: prog?.bestScore || 0,
        attempts: prog?.attempts || 0,
      }
    })
  }
}
