import { Hono } from 'hono'
import { requireAuth, requireRole } from '../../core/security/session'
import { StudentService } from './service'

export const studentRoutes = new Hono()

studentRoutes.use('/student/*', requireAuth(), requireRole('student', 'teacher', 'webmaster'))

studentRoutes.get('/student/classes', async (c) => {
  const user = c.get('user')
  const classes = await StudentService.getMyClasses(user.id)
  return c.json({ classes })
})

studentRoutes.get('/student/active-sessions', async (c) => {
  const user = c.get('user')
  const sessions = await StudentService.getActiveSessions(user.id)
  return c.json({ sessions, activeSessions: sessions })
})

studentRoutes.get('/student/homework', async (c) => {
  const user = c.get('user')
  const homework = await StudentService.getMyHomework(user.id)
  return c.json({ homework })
})
