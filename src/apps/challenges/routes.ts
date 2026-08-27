import { ChallengeRequestSchema } from '@shared/contracts/challenges'
import { Hono } from 'hono'
import { requireAuth } from '../../core/security/session'
import { ChallengesService } from './service'

export const challengeRoutes = new Hono()

challengeRoutes.use('/challenges/*', requireAuth())

challengeRoutes.post('/challenges/find', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const parsed = ChallengeRequestSchema.parse(body)
  const result = await ChallengesService.findMatchOrGhost(user.id, parsed)
  return c.json(result)
})
