import type { ClassCreate, ClassUpdate } from '@shared/contracts/classes'
import { and, eq, inArray, or, sql } from 'drizzle-orm'
import { customAlphabet } from 'nanoid'
import { getDb } from '../../core/db/client'
import { auditLogs, courseClasses, groupMembers, lessons, users } from '../../core/db/schema'
import { AppError } from '../../core/errors'

const generateClassCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6)

export class ClassesService {
  static async createClass(teacherId: string, req: ClassCreate) {
    const db = getDb()
    const code = req.code ? req.code.toUpperCase() : generateClassCode()

    const existing = await db.select().from(courseClasses).where(eq(courseClasses.code, code)).limit(1)
    if (existing.length > 0) {
      throw AppError.conflict('El código de clase ya está en uso')
    }

    const classId = `cls_${generateClassCode()}`
    await db.insert(courseClasses).values({
      id: classId,
      teacherId,
      name: req.name,
      code,
      archived: false,
    })

    await db.insert(auditLogs).values({
      id: generateClassCode(),
      actorId: teacherId,
      action: 'CLASS.CREATE',
      entityType: 'CLASS',
      entityId: classId,
    })

    return {
      id: classId,
      teacherId,
      name: req.name,
      code,
      archived: false,
    }
  }

  static async listClasses(userId: string) {
    const db = getDb()

    // Return classes the user teaches OR is enrolled in as a student.
    const classes = await db
      .select({
        id: courseClasses.id,
        name: courseClasses.name,
        code: courseClasses.code,
        archived: courseClasses.archived,
        createdAt: courseClasses.createdAt,
        studentCount: sql<number>`(SELECT COUNT(*) FROM group_members WHERE group_members.class_id = course_classes.id)`,
        lessonCount: sql<number>`(SELECT COUNT(*) FROM lessons WHERE lessons.class_id = course_classes.id)`,
      })
      .from(courseClasses)
      .where(
        or(
          eq(courseClasses.teacherId, userId),
          inArray(
            courseClasses.id,
            db.select({ id: groupMembers.classId }).from(groupMembers).where(eq(groupMembers.userId, userId))
          )
        )
      )

    return classes
  }

  static async getClass(userId: string, classId: string) {
    const db = getDb()
    const found = await db.select().from(courseClasses).where(eq(courseClasses.id, classId)).limit(1)

    if (!found[0]) {
      throw AppError.notFound('Clase no encontrada')
    }

    // Verify the user is either the teacher or an enrolled student.
    const isTeacher = found[0].teacherId === userId
    if (!isTeacher) {
      const enrollment = await db
        .select()
        .from(groupMembers)
        .where(and(eq(groupMembers.userId, userId), eq(groupMembers.classId, classId)))
        .limit(1)

      if (!enrollment[0]) {
        throw AppError.notFound('Clase no encontrada')
      }
    }

    const members = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        status: users.status,
        joinedAt: groupMembers.joinedAt,
      })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groupMembers.classId, classId))

    return {
      ...found[0],
      members,
    }
  }

  static async updateClass(teacherId: string, classId: string, req: ClassUpdate) {
    const db = getDb()
    const found = await db
      .select()
      .from(courseClasses)
      .where(and(eq(courseClasses.id, classId), eq(courseClasses.teacherId, teacherId)))
      .limit(1)

    if (found.length === 0 || !found[0]) {
      throw AppError.notFound('Clase no encontrada')
    }

    await db
      .update(courseClasses)
      .set({
        ...(req.name ? { name: req.name } : {}),
        ...(req.archived !== undefined ? { archived: req.archived } : {}),
        updatedAt: new Date(),
      })
      .where(eq(courseClasses.id, classId))

    return { success: true }
  }

  static async addMembers(teacherId: string, classId: string, userIds: string[]) {
    const db = getDb()
    const found = await db
      .select()
      .from(courseClasses)
      .where(and(eq(courseClasses.id, classId), eq(courseClasses.teacherId, teacherId)))
      .limit(1)

    if (found.length === 0 || !found[0]) {
      throw AppError.notFound('Clase no encontrada')
    }

    for (const userId of userIds) {
      const existing = await db
        .select()
        .from(groupMembers)
        .where(and(eq(groupMembers.classId, classId), eq(groupMembers.userId, userId)))
        .limit(1)

      if (existing.length === 0) {
        await db.insert(groupMembers).values({
          id: `gm_${generateClassCode()}`,
          classId,
          userId,
        })
      }
    }

    return { success: true, count: userIds.length }
  }

  static async removeMember(teacherId: string, classId: string, userId: string) {
    const db = getDb()
    const found = await db
      .select()
      .from(courseClasses)
      .where(and(eq(courseClasses.id, classId), eq(courseClasses.teacherId, teacherId)))
      .limit(1)

    if (found.length === 0 || !found[0]) {
      throw AppError.notFound('Clase no encontrada')
    }

    await db
      .delete(groupMembers)
      .where(and(eq(groupMembers.classId, classId), eq(groupMembers.userId, userId)))

    return { success: true }
  }

  static async deleteClass(teacherId: string, classId: string) {
    const db = getDb()
    const found = await db
      .select()
      .from(courseClasses)
      .where(and(eq(courseClasses.id, classId), eq(courseClasses.teacherId, teacherId)))
      .limit(1)

    if (found.length === 0 || !found[0]) {
      throw AppError.notFound('Clase no encontrada o sin permisos')
    }

    // Delete members
    await db.delete(groupMembers).where(eq(groupMembers.classId, classId))
    // Delete class
    await db.delete(courseClasses).where(eq(courseClasses.id, classId))

    await db.insert(auditLogs).values({
      id: generateClassCode(),
      actorId: teacherId,
      action: 'CLASS.DELETE',
      entityType: 'CLASS',
      entityId: classId,
    })

    return { success: true }
  }
}
