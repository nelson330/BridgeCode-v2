import { TeacherApprovalSchema, TeacherPasswordResetSchema } from '@shared/contracts/admin'
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../../core/security/session'
import { AdminService } from './service'

export const adminRoutes = new Hono()

adminRoutes.use('*', requireAuth(), requireRole('webmaster'))

adminRoutes.get('/teachers', async (c) => {
  const teachers = await AdminService.listTeachers()
  return c.json({ teachers })
})

adminRoutes.patch('/teachers/:id/status', async (c) => {
  const teacherId = c.req.param('id')
  const body = await c.req.json()
  const parsed = TeacherApprovalSchema.parse(body)
  const result = await AdminService.updateTeacherStatus(teacherId, parsed)
  return c.json(result)
})

adminRoutes.post('/teachers/:id/reset-password', async (c) => {
  const user = c.get('user')
  const teacherId = c.req.param('id')
  const body = (await c.req.json().catch(() => ({}))) || {}
  const parsed = TeacherPasswordResetSchema.parse(body)
  const result = await AdminService.resetTeacherPassword(user.id, teacherId, parsed.newPassword)
  return c.json(result)
})

adminRoutes.delete('/teachers/:id', async (c) => {
  const user = c.get('user')
  const teacherId = c.req.param('id')
  const result = await AdminService.deleteTeacher(user.id, teacherId)
  return c.json(result)
})

adminRoutes.get('/audit-logs', async (c) => {
  const logs = await AdminService.listAuditLogs()
  return c.json({ logs })
})

adminRoutes.get('/metrics', async (c) => {
  const metrics = await AdminService.getSystemMetrics()
  return c.json({ metrics })
})

adminRoutes.get('/system', async (c) => {
  const metrics = await AdminService.getSystemMetrics()
  const teachers = await AdminService.listTeachers()
  const pendingTeachers = teachers.filter((t) => t.status === 'inactive')
  return c.json({ metrics, pendingTeachers, teachers })
})
