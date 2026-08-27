import type { SessionUser, UserRole } from '@shared/contracts/rbac'
import { and, eq, gt } from 'drizzle-orm'
import type { Context, MiddlewareHandler } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { getConfig } from '../config'
import { getDb } from '../db/client'
import { sessions, teacherProfiles, users } from '../db/schema'
import { AppError, ErrorCodes } from '../errors'
import { generateRandomToken } from './crypto'

declare module 'hono' {
  interface ContextVariableMap {
    user: SessionUser
    sessionToken: string
  }
}

export async function createSession(
  c: Context,
  userId: string,
  role: UserRole,
  isStudent = false
): Promise<string> {
  const db = getDb()
  const config = getConfig()
  const token = generateRandomToken(32)

  const ttl = isStudent ? config.SESSION_TTL_STUDENT_MS : config.SESSION_TTL_MS
  const expiresAt = new Date(Date.now() + ttl)

  const ip = c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || '127.0.0.1'
  const userAgent = c.req.header('user-agent') || 'unknown'

  await db.insert(sessions).values({
    id: token,
    userId,
    roleSnapshot: role,
    ip,
    userAgent,
    expiresAt,
  })

  const isSecure = config.COOKIE_SECURE
  setCookie(c, 'session', token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'Lax',
    path: '/api',
    expires: expiresAt,
  })

  return token
}

export async function destroySession(c: Context): Promise<void> {
  const token = getCookie(c, 'session')
  if (token) {
    const db = getDb()
    await db.delete(sessions).where(eq(sessions.id, token))
    deleteCookie(c, 'session', { path: '/api' })
  }
}

export const sessionMiddleware: MiddlewareHandler = async (c, next) => {
  const token = getCookie(c, 'session')
  if (!token) {
    return next()
  }

  const db = getDb()
  const now = new Date()

  const found = await db
    .select({
      session: sessions,
      user: users,
      teacherProfile: teacherProfiles,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .leftJoin(teacherProfiles, eq(users.id, teacherProfiles.userId))
    .where(and(eq(sessions.id, token), gt(sessions.expiresAt, now)))
    .limit(1)

  if (found.length === 0 || !found[0]) {
    deleteCookie(c, 'session', { path: '/api' })
    return next()
  }

  const { user, teacherProfile } = found[0]

  if (user.status === 'banned') {
    await db.delete(sessions).where(eq(sessions.id, token))
    deleteCookie(c, 'session', { path: '/api' })
    throw new AppError('Tu cuenta ha sido suspendida', ErrorCodes.AUTH_BANNED, 403)
  }

  if (user.status === 'inactive') {
    await db.delete(sessions).where(eq(sessions.id, token))
    deleteCookie(c, 'session', { path: '/api' })
    throw new AppError('Tu cuenta está desactivada', ErrorCodes.AUTH_INACTIVE, 403)
  }

  c.set('user', {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role as UserRole,
    status: user.status as any,
    mustChangePassword: user.mustChangePassword,
    adminLocal: teacherProfile?.adminLocal || false,
  })
  c.set('sessionToken', token)

  await next()
}

export function requireAuth(): MiddlewareHandler {
  return async (c, next) => {
    const user = c.get('user')
    if (!user) {
      throw AppError.unauthenticated('Debes iniciar sesión para continuar')
    }
    await next()
  }
}

export function requireRole(...roles: UserRole[]): MiddlewareHandler {
  return async (c, next) => {
    const user = c.get('user')
    if (!user) {
      throw AppError.unauthenticated('Debes iniciar sesión para continuar')
    }

    if (!roles.includes(user.role)) {
      throw AppError.forbidden('No tienes permisos suficientes')
    }

    await next()
  }
}
