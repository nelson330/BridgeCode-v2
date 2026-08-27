import { HomeworkCreateSchema, PracticeAnswerSchema } from '@shared/contracts/homework'
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../../core/security/session'
import { HomeworkService } from './service'

export const homeworkRoutes = new Hono()

homeworkRoutes.use('/classes/*', requireAuth())

// Teacher creates homework
homeworkRoutes.post('/classes/:classId/homework', requireRole('teacher', 'webmaster'), async (c) => {
  const user = c.get('user')
  const classId = c.req.param('classId')
  const body = await c.req.json()
  const parsed = HomeworkCreateSchema.parse(body)
  const created = await HomeworkService.createHomework(user.id, classId, parsed)
  return c.json({ homework: created }, 201)
})

// List homework
homeworkRoutes.get('/classes/:classId/homework', async (c) => {
  const classId = c.req.param('classId')
  const list = await HomeworkService.listHomework(classId)
  return c.json({ homework: list })
})

// Teacher updates homework
homeworkRoutes.patch(
  '/classes/:classId/homework/:homeworkId',
  requireRole('teacher', 'webmaster'),
  async (c) => {
    const user = c.get('user')
    const classId = c.req.param('classId')
    const homeworkId = c.req.param('homeworkId')
    const body = await c.req.json()
    const parsed = HomeworkCreateSchema.partial().parse(body)
    const result = await HomeworkService.updateHomework(user.id, classId, homeworkId, parsed)
    return c.json(result)
  }
)

// Teacher deletes homework
homeworkRoutes.delete(
  '/classes/:classId/homework/:homeworkId',
  requireRole('teacher', 'webmaster'),
  async (c) => {
    const user = c.get('user')
    const classId = c.req.param('classId')
    const homeworkId = c.req.param('homeworkId')
    const result = await HomeworkService.deleteHomework(user.id, classId, homeworkId)
    return c.json(result)
  }
)

// Student submits practice / review exercise
homeworkRoutes.post('/classes/:classId/lessons/:lessonId/practice', async (c) => {
  const user = c.get('user')
  const classId = c.req.param('classId')
  const lessonId = c.req.param('lessonId')
  const body = await c.req.json()
  const parsed = PracticeAnswerSchema.parse(body)
  const result = await HomeworkService.submitPracticeAnswer(user.id, classId, lessonId, parsed)
  return c.json(result)
})

// Student completes reading task
homeworkRoutes.post('/classes/:classId/lessons/:lessonId/reading/complete', async (c) => {
  const user = c.get('user')
  const classId = c.req.param('classId')
  const lessonId = c.req.param('lessonId')
  const result = await HomeworkService.completeReading(user.id, classId, lessonId)
  return c.json(result)
})

// Get student progress
homeworkRoutes.get('/classes/:classId/progress/me', async (c) => {
  const user = c.get('user')
  const classId = c.req.param('classId')
  const progress = await HomeworkService.getStudentProgress(user.id, classId)
  return c.json({ progress })
})
