import { Hono } from 'hono'
import { requireAuth, requireRole } from '../../core/security/session'
import { AnalyticsService } from './service'

export const analyticsRoutes = new Hono()

analyticsRoutes.use('/classes/*', requireAuth())
analyticsRoutes.use('/ranking', requireAuth())

analyticsRoutes.get('/classes/:classId/dashboard', requireRole('teacher', 'webmaster'), async (c) => {
  const user = c.get('user')
  const classId = c.req.param('classId')
  const analytics = await AnalyticsService.getClassAnalytics(user.id, classId)
  return c.json({ analytics })
})

analyticsRoutes.get('/classes/:classId/gradebook', requireRole('teacher', 'webmaster'), async (c) => {
  const user = c.get('user')
  const classId = c.req.param('classId')
  const gradebook = await AnalyticsService.getDetailedClassGradebook(user.id, classId)
  return c.json({ gradebook })
})

analyticsRoutes.get('/classes/:classId/gradebook/export', requireRole('teacher', 'webmaster'), async (c) => {
  const user = c.get('user')
  const classId = c.req.param('classId')
  const csv = await AnalyticsService.exportClassGradebookCsv(user.id, classId)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="calificaciones_${classId}.csv"`,
    },
  })
})

// Leaderboard endpoints for students and teachers
analyticsRoutes.get('/ranking', async (c) => {
  const classId = c.req.query('classId')
  const leaderboard = await AnalyticsService.getLeaderboard(classId)
  return c.json({ leaderboard })
})

analyticsRoutes.get('/classes/:classId/ranking', async (c) => {
  const classId = c.req.param('classId')
  const leaderboard = await AnalyticsService.getLeaderboard(classId)
  return c.json({ leaderboard })
})
