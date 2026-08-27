import {
  ChangePasswordSchema,
  LoginRequestSchema,
  RegisterTeacherRequestSchema,
} from '@shared/contracts/auth'
import { Hono } from 'hono'
import { requireAuth } from '../../core/security/session'
import { AuthService } from './service'

export const authRoutes = new Hono()

authRoutes.post('/login', async (c) => {
  const body = await c.req.json()
  const parsed = LoginRequestSchema.parse(body)
  const user = await AuthService.login(c, parsed)
  return c.json({ user })
})

authRoutes.post('/logout', async (c) => {
  await AuthService.logout(c)
  return c.body(null, 204)
})

authRoutes.get('/me', requireAuth(), (c) => {
  const user = c.get('user')
  return c.json({ user })
})

authRoutes.post('/change-password', requireAuth(), async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const parsed = ChangePasswordSchema.parse(body)
  await AuthService.changePassword(user.id, parsed)
  return c.body(null, 204)
})

authRoutes.post('/request-teacher', async (c) => {
  const body = await c.req.json()
  const parsed = RegisterTeacherRequestSchema.parse(body)
  await AuthService.requestTeacher(parsed)
  return c.json({ message: 'Solicitud enviada para revisión' }, 201)
})
