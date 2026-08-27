import type {
  AuthUser,
  ChangePasswordRequest,
  LoginRequest,
  RegisterTeacherRequest,
} from '@shared/contracts/auth'
import { and, eq, sql } from 'drizzle-orm'
import type { Context } from 'hono'
import { nanoid } from 'nanoid'
import { getConfig } from '../../core/config'
import { getDb } from '../../core/db/client'
import { auditLogs, instanceMeta, teacherProfiles, users } from '../../core/db/schema'
import { AppError, ErrorCodes } from '../../core/errors'
import { logger } from '../../core/logger'
import { hashPassword, verifyPassword } from '../../core/security/crypto'
import { createSession, destroySession } from '../../core/security/session'

export class AuthService {
  static async login(c: Context, req: LoginRequest): Promise<AuthUser> {
    const db = getDb()
    const cleanUsername = req.username.trim().toLowerCase()
    const cleanPassword = req.password.trim()

    const found = await db
      .select({
        user: users,
        teacherProfile: teacherProfiles,
      })
      .from(users)
      .leftJoin(teacherProfiles, eq(users.id, teacherProfiles.userId))
      .where(sql`lower(${users.username}) = ${cleanUsername}`)
      .limit(1)

    if (found.length === 0 || !found[0]) {
      throw new AppError('Usuario o contraseña incorrectos', ErrorCodes.AUTH_INVALID_CREDENTIALS, 401)
    }

    const { user, teacherProfile } = found[0]

    const isValid = await verifyPassword(cleanPassword, user.passwordHash)
    if (!isValid) {
      throw new AppError('Usuario o contraseña incorrectos', ErrorCodes.AUTH_INVALID_CREDENTIALS, 401)
    }

    if (user.status === 'banned') {
      throw new AppError('Tu cuenta ha sido suspendida', ErrorCodes.AUTH_BANNED, 403)
    }

    if (user.status === 'inactive') {
      throw new AppError(
        'Tu cuenta está desactivada o pendiente de aprobación',
        ErrorCodes.AUTH_INACTIVE,
        403
      )
    }

    // Create session cookie
    await createSession(c, user.id, user.role as any, user.role === 'student')

    // Audit login
    const ip = c.req.header('x-forwarded-for') || '127.0.0.1'
    await db.insert(auditLogs).values({
      id: nanoid(),
      actorId: user.id,
      action: 'AUTH.LOGIN',
      entityType: 'USER',
      entityId: user.id,
      ip,
    })

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role as any,
      status: user.status as any,
      mustChangePassword: user.mustChangePassword,
      adminLocal: teacherProfile?.adminLocal || false,
    }
  }

  static async logout(c: Context): Promise<void> {
    const user = c.get('user')
    if (user) {
      const db = getDb()
      const ip = c.req.header('x-forwarded-for') || '127.0.0.1'
      await db.insert(auditLogs).values({
        id: nanoid(),
        actorId: user.id,
        action: 'AUTH.LOGOUT',
        entityType: 'USER',
        entityId: user.id,
        ip,
      })
    }
    await destroySession(c)
  }

  static async changePassword(userId: string, req: ChangePasswordRequest): Promise<void> {
    const db = getDb()
    const found = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (found.length === 0 || !found[0]) {
      throw AppError.notFound('Usuario no encontrado')
    }

    const user = found[0]
    const isValid = await verifyPassword(req.currentPassword.trim(), user.passwordHash)
    if (!isValid) {
      throw new AppError('Contraseña actual incorrecta', ErrorCodes.AUTH_INVALID_CREDENTIALS, 400)
    }

    const passwordHash = await hashPassword(req.nextPassword.trim())
    await db
      .update(users)
      .set({
        passwordHash,
        mustChangePassword: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
  }

  static async requestTeacher(req: RegisterTeacherRequest): Promise<void> {
    const db = getDb()
    const cleanUsername = req.username.trim().toLowerCase()

    const existing = await db.select().from(users).where(eq(users.username, cleanUsername)).limit(1)
    if (existing.length > 0) {
      throw new AppError('El nombre de usuario ya está registrado', ErrorCodes.CONFLICT, 409)
    }

    const userId = nanoid()
    const passwordHash = await hashPassword(req.password.trim())

    await db.insert(users).values({
      id: userId,
      username: cleanUsername,
      displayName: req.name.trim(),
      passwordHash,
      role: 'teacher',
      status: 'inactive', // pending approval
      mustChangePassword: false,
    })

    const bioText = req.reason ? `${req.reason} | Contacto: ${req.email}` : `Contacto: ${req.email}`

    await db.insert(teacherProfiles).values({
      id: nanoid(),
      userId,
      bio: bioText,
      locale: 'es',
      adminLocal: false,
    })

    await db.insert(auditLogs).values({
      id: nanoid(),
      actorId: userId,
      action: 'USER.REQUEST_TEACHER',
      entityType: 'USER',
      entityId: userId,
      detailJson: JSON.stringify({ email: req.email, reason: req.reason }),
    })
  }

  static async seedInitialUser(): Promise<void> {
    const { runDatabaseSeed } = await import('../../../scripts/seed')
    await runDatabaseSeed()
  }
}
