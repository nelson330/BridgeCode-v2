import { AiConfigSaveSchema, AiGenerateRequestSchema, AiTestPingSchema } from '@shared/contracts/ai'
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../../core/security/session'
import { AgentsService } from './service'

export const agentRoutes = new Hono()

agentRoutes.use('*', requireAuth(), requireRole('teacher', 'webmaster'))

agentRoutes.get('/providers', async (c) => {
  const user = c.get('user')
  const providers = await AgentsService.getProviders(user.id)
  return c.json({ providers })
})

agentRoutes.put('/config', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const parsed = AiConfigSaveSchema.parse(body)
  const result = await AgentsService.saveProviderConfig(user.id, parsed)
  return c.json(result)
})

agentRoutes.post('/config/test', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const parsed = AiTestPingSchema.parse(body)
  const result = await AgentsService.testAndFetchModels(user.id, parsed)
  return c.json(result)
})

agentRoutes.post('/lessons/:lessonId/ai-generate', async (c) => {
  const user = c.get('user')
  const lessonId = c.req.param('lessonId')
  const body = await c.req.json()
  const parsed = AiGenerateRequestSchema.parse(body)
  const result = await AgentsService.createGenerationJob(user.id, lessonId, parsed)
  return c.json(result, 201)
})

agentRoutes.get('/jobs/:jobId', async (c) => {
  const jobId = c.req.param('jobId')
  const status = await AgentsService.getJobStatus(jobId)
  return c.json(status)
})
