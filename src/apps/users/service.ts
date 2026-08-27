import type { StudentCreate, StudentUpdate } from '@shared/contracts/users'
import { and, eq } from 'drizzle-orm'
import { customAlphabet, nanoid } from 'nanoid'
import { getDb } from '../../core/db/client'
import { auditLogs, courseClasses, groupMembers, users } from '../../core/db/schema'
import { AppError } from '../../core/errors'
import { hashPassword } from '../../core/security/crypto'

const generatePinDigits = customAlphabet('0123456789', 3)
const words = ['Astro', 'Cometa', 'Estrella', 'Luna', 'Rayo', 'Sol', 'Nova', 'Fénix', 'Titan', 'Atlas']

function generateReadablePassword(): string {
  const word = words[Math.floor(Math.random() * words.length)]
  return `${word}#${generatePinDigits()}`
}

export class UsersService {
  static async createStudent(teacherId: string, classId: string, req: StudentCreate) {
    const db = getDb()

    // Verify teacher owns the class
    const foundClass = await db
      .select()
      .from(courseClasses)
      .where(and(eq(courseClasses.id, classId), eq(courseClasses.teacherId, teacherId)))
      .limit(1)

    if (foundClass.length === 0 || !foundClass[0]) {
      throw AppError.notFound('Clase no encontrada o sin permisos')
    }

    const username = req.username.trim().toLowerCase()
    const existing = await db.select().from(users).where(eq(users.username, username)).limit(1)
    if (existing.length > 0) {
      throw AppError.conflict(`El usuario "${username}" ya existe`)
    }

    const plainPassword = req.password?.trim() || generateReadablePassword()
    const passwordHash = await hashPassword(plainPassword)
    const studentId = `usr_${nanoid(10)}`

    await db.insert(users).values({
      id: studentId,
      username,
      displayName: req.displayName.trim(),
      passwordHash,
      role: 'student',
      status: 'active',
      mustChangePassword: false,
    })

    await db.insert(groupMembers).values({
      id: `gm_${nanoid(10)}`,
      classId,
      userId: studentId,
    })

    await db.insert(auditLogs).values({
      id: nanoid(),
      actorId: teacherId,
      action: 'USER.CREATE_STUDENT',
      entityType: 'USER',
      entityId: studentId,
    })

    return {
      id: studentId,
      username,
      displayName: req.displayName.trim(),
      tempPassword: plainPassword,
      password: plainPassword,
      classId,
      status: 'active',
    }
  }

  static async createStudentsBatch(teacherId: string, classId: string, students: StudentCreate[]) {
    const results = []
    for (const student of students) {
      try {
        const created = await UsersService.createStudent(teacherId, classId, student)
        results.push({ status: 'ok' as const, student: created })
      } catch (err: any) {
        results.push({ status: 'error' as const, username: student.username, error: err.message })
      }
    }
    return results
  }

  static async updateStudent(_teacherId: string, studentId: string, req: StudentUpdate) {
    const db = getDb()
    const found = await db.select().from(users).where(eq(users.id, studentId)).limit(1)
    if (found.length === 0 || !found[0]) {
      throw AppError.notFound('Estudiante no encontrado')
    }

    const updates: Record<string, any> = {
      updatedAt: new Date(),
    }

    if (req.displayName?.trim()) {
      updates.displayName = req.displayName.trim()
    }

    if (req.username?.trim()) {
      const newUsername = req.username.trim().toLowerCase()
      if (newUsername !== found[0].username) {
        const existing = await db.select().from(users).where(eq(users.username, newUsername)).limit(1)
        if (existing.length > 0) {
          throw AppError.conflict(`El nombre de usuario "${newUsername}" ya está en uso`)
        }
        updates.username = newUsername
      }
    }

    if (req.password?.trim()) {
      updates.passwordHash = await hashPassword(req.password.trim())
      updates.mustChangePassword = false
    }

    if (req.status) {
      updates.status = req.status
    }

    await db.update(users).set(updates).where(eq(users.id, studentId))

    return { success: true }
  }

  static async deleteStudentFromClass(teacherId: string, classId: string, studentId: string) {
    const db = getDb()

    // 1. Remove from groupMembers of this class
    await db
      .delete(groupMembers)
      .where(and(eq(groupMembers.classId, classId), eq(groupMembers.userId, studentId)))

    // 2. Check if student belongs to any other classes
    const otherMemberships = await db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.userId, studentId))
      .limit(1)

    // If not enrolled anywhere else, remove student user
    if (otherMemberships.length === 0) {
      await db.delete(users).where(eq(users.id, studentId))
    }

    await db.insert(auditLogs).values({
      id: nanoid(),
      actorId: teacherId,
      action: 'USER.DELETE_STUDENT',
      entityType: 'USER',
      entityId: studentId,
    })

    return { success: true }
  }

  static async deactivateStudent(teacherId: string, studentId: string) {
    const db = getDb()
    await db
      .update(users)
      .set({
        status: 'inactive',
        updatedAt: new Date(),
      })
      .where(eq(users.id, studentId))

    await db.insert(auditLogs).values({
      id: nanoid(),
      actorId: teacherId,
      action: 'USER.DEACTIVATE',
      entityType: 'USER',
      entityId: studentId,
    })

    return { success: true }
  }

  static async resetPassword(teacherId: string, studentId: string, newPassword?: string) {
    const db = getDb()
    const found = await db.select().from(users).where(eq(users.id, studentId)).limit(1)
    if (found.length === 0 || !found[0]) {
      throw AppError.notFound('Estudiante no encontrado')
    }

    const targetPassword = newPassword?.trim() ? newPassword.trim() : generateReadablePassword()
    const passwordHash = await hashPassword(targetPassword)

    await db
      .update(users)
      .set({
        passwordHash,
        mustChangePassword: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, studentId))

    await db.insert(auditLogs).values({
      id: nanoid(),
      actorId: teacherId,
      action: 'USER.RESET_PASSWORD',
      entityType: 'USER',
      entityId: studentId,
    })

    return { success: true, tempPassword: targetPassword, password: targetPassword }
  }
}
