import { ExportBundleSchema } from '@shared/contracts/backup'
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../../core/security/session'
import { BackupService } from './service'

export const backupRoutes = new Hono()

backupRoutes.use('/backup/*', requireAuth(), requireRole('teacher', 'webmaster'))

backupRoutes.get('/lessons/:lessonId/export', async (c) => {
  const user = c.get('user')
  const lessonId = c.req.param('lessonId')
  const bundle = await BackupService.exportLessonBundle(user.id, lessonId)
  return c.json({ bundle })
})

backupRoutes.post('/classes/:classId/import-bundle', async (c) => {
  const user = c.get('user')
  const classId = c.req.param('classId')
  const body = await c.req.json()
  const parsed = ExportBundleSchema.parse(body)
  const result = await BackupService.importLessonBundle(user.id, classId, parsed)
  return c.json(result, 201)
})

backupRoutes.post('/admin/backup', requireRole('webmaster'), async (c) => {
  const result = await BackupService.createDatabaseBackup()
  return c.json(result)
})
