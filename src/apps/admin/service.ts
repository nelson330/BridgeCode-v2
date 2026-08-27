import type { TeacherApproval } from '@shared/contracts/admin'
import { and, desc, eq, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { getDb } from '../../core/db/client'
import {
  auditLogs,
  courseClasses,
  lessons,
  liveSessions,
  sessions,
  teacherProfiles,
  users,
} from '../../core/db/schema'
import { AppError } from '../../core/errors'
import { hashPassword } from '../../core/security/crypto'

export class AdminService {
  static async listTeachers() {
    const db = getDb()
    const teachers = await db
      .select({
        user: users,
        profile: teacherProfiles,
      })
      .from(users)
      .leftJoin(teacherProfiles, eq(users.id, teacherProfiles.userId))
      .where(eq(users.role, 'teacher'))
      .orderBy(desc(users.createdAt))

    const classesList = await db.select().from(courseClasses)

    return teachers.map(({ user, profile }) => {
      const teacherClasses = classesList.filter((c) => c.teacherId === user.id)
      return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        status: user.status,
        bio: profile?.bio || null,
        locale: profile?.locale || 'es',
        classesCount: teacherClasses.length,
        createdAt: user.createdAt,
      }
    })
  }

  static async updateTeacherStatus(teacherId: string, req: TeacherApproval) {
    const db = getDb()
    const found = await db.select().from(users).where(eq(users.id, teacherId)).limit(1)
    if (found.length === 0 || !found[0]) {
      throw AppError.notFound('Docente no encontrado')
    }

    await db
      .update(users)
      .set({
        status: req.status,
        banReason: req.banReason || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, teacherId))

    if (req.status === 'banned' || req.status === 'inactive') {
      await db.delete(sessions).where(eq(sessions.userId, teacherId))
    }

    return { success: true, status: req.status }
  }

  static async resetTeacherPassword(adminId: string, teacherId: string, newPassword?: string) {
    const db = getDb()
    const found = await db.select().from(users).where(eq(users.id, teacherId)).limit(1)
    if (found.length === 0 || !found[0]) {
      throw AppError.notFound('Docente no encontrado')
    }

    const plainPassword = newPassword?.trim()
      ? newPassword.trim()
      : `Docente#${Math.floor(1000 + Math.random() * 9000)}`
    const passwordHash = await hashPassword(plainPassword)

    await db
      .update(users)
      .set({
        passwordHash,
        mustChangePassword: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, teacherId))

    await db.insert(auditLogs).values({
      id: nanoid(),
      actorId: adminId,
      action: 'ADMIN.RESET_TEACHER_PASSWORD',
      entityType: 'USER',
      entityId: teacherId,
    })

    return { success: true, password: plainPassword }
  }

  static async deleteTeacher(adminId: string, teacherId: string) {
    const db = getDb()
    const found = await db.select().from(users).where(eq(users.id, teacherId)).limit(1)
    if (found.length === 0 || !found[0]) {
      throw AppError.notFound('Docente no encontrado')
    }

    await db.delete(sessions).where(eq(sessions.userId, teacherId))
    await db.delete(teacherProfiles).where(eq(teacherProfiles.userId, teacherId))
    await db.delete(users).where(eq(users.id, teacherId))

    await db.insert(auditLogs).values({
      id: nanoid(),
      actorId: adminId,
      action: 'ADMIN.DELETE_TEACHER',
      entityType: 'USER',
      entityId: teacherId,
    })

    return { success: true }
  }

  static async listAuditLogs(limit = 100) {
    const db = getDb()
    const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit)
    return logs
  }

  static async getSystemMetrics() {
    const db = getDb()

    const allUsers = await db.select().from(users)
    const approvedTeachers = allUsers.filter((u) => u.role === 'teacher' && u.status === 'active').length
    const pendingTeachers = allUsers.filter((u) => u.role === 'teacher' && u.status === 'inactive').length
    const studentsCount = allUsers.filter((u) => u.role === 'student').length

    const classesCount =
      (await db.select({ count: sql<number>`count(*)` }).from(courseClasses))[0]?.count || 0
    const lessonsCount = (await db.select({ count: sql<number>`count(*)` }).from(lessons))[0]?.count || 0
    const sessionsCount =
      (await db.select({ count: sql<number>`count(*)` }).from(liveSessions))[0]?.count || 0

    return {
      usersCount: allUsers.length,
      approvedTeachers,
      pendingTeachers,
      studentsCount,
      classesCount,
      lessonsCount,
      sessionsCount,
      nodeVersion: process.version,
      platform: process.platform,
      uptimeSec: Math.round(process.uptime()),
    }
  }
}
