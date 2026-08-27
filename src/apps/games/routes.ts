import { CreateSessionRequestSchema } from '@shared/contracts/games'
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../../core/security/session'
import { GamesService } from './service'

export const gameRoutes = new Hono()

// Create a live session (Teacher or Webmaster)
gameRoutes.post('/sessions', requireAuth(), requireRole('teacher', 'webmaster'), async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const parsed = CreateSessionRequestSchema.parse(body)
  const session = await GamesService.createSession(user.id, parsed)
  return c.json({ session }, 201)
})

gameRoutes.get('/sessions/:id', async (c) => {
  const sessionId = c.req.param('id')
  const session = await GamesService.getSession(sessionId)
  return c.json({ session })
})

gameRoutes.post('/sessions/:id/start', requireAuth(), requireRole('teacher', 'webmaster'), async (c) => {
  const user = c.get('user')
  const sessionId = c.req.param('id')
  const result = await GamesService.startSession(user.id, sessionId)
  return c.json(result)
})

gameRoutes.post('/sessions/:id/next', requireAuth(), requireRole('teacher', 'webmaster'), async (c) => {
  const user = c.get('user')
  const sessionId = c.req.param('id')
  const result = await GamesService.nextExercise(user.id, sessionId)
  return c.json(result)
})

gameRoutes.post('/sessions/:id/finish', requireAuth(), requireRole('teacher', 'webmaster'), async (c) => {
  const user = c.get('user')
  const sessionId = c.req.param('id')
  const result = await GamesService.finishSession(user.id, sessionId)
  return c.json(result)
})

gameRoutes.post('/sessions/:id/anticheat-event', async (c) => {
  const sessionId = c.req.param('id')
  const user = c.get('user')
  const body = await c.req.json()
  const result = await GamesService.reportAnticheatEvent(
    sessionId,
    user?.id,
    body.type || 'BLUR_EVENT',
    JSON.stringify(body.detail || {})
  )
  return c.json(result)
})
