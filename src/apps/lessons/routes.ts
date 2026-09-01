import { ExerciseBatchCreateSchema, ExerciseCreateSchema } from '@shared/contracts/exercises'
import { LessonCreateSchema, LessonUpdateSchema } from '@shared/contracts/lessons'
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../../core/security/session'
import { LessonsService } from './service'

export const lessonRoutes = new Hono()

lessonRoutes.use('/groups/*', requireAuth())
lessonRoutes.use('/lessons/*', requireAuth())

lessonRoutes.post('/groups/:classId/lessons', requireRole('teacher', 'webmaster'), async (c) => {
  const user = c.get('user')
  const classId = c.req.param('classId')
  const body = await c.req.json()
  const parsed = LessonCreateSchema.parse(body)
  const lesson = await LessonsService.createLesson(user.id, classId, parsed)
  return c.json({ lesson }, 201)
})

lessonRoutes.get('/groups/:classId/lessons', async (c) => {
  const user = c.get('user')
  const classId = c.req.param('classId')
  const list = await LessonsService.listLessons(user?.id, classId)
  return c.json({ lessons: list })
})

lessonRoutes.get('/groups/:classId/lessons/:id', requireAuth(), async (c) => {
  const user = c.get('user')
  const lessonId = c.req.param('id')
  const lesson = await LessonsService.getLesson(user.id, lessonId)
  return c.json({ lesson })
})

lessonRoutes.patch('/groups/:classId/lessons/:id', requireRole('teacher', 'webmaster'), async (c) => {
  const user = c.get('user')
  const lessonId = c.req.param('id')
  const body = await c.req.json()
  const parsed = LessonUpdateSchema.parse(body)
  const result = await LessonsService.updateLesson(user.id, lessonId, parsed)
  return c.json(result)
})

lessonRoutes.delete('/groups/:classId/lessons/:id', requireRole('teacher', 'webmaster'), async (c) => {
  const user = c.get('user')
  const lessonId = c.req.param('id')
  const result = await LessonsService.deleteLesson(user.id, lessonId)
  return c.json(result)
})

lessonRoutes.delete('/lessons/:id', requireRole('teacher', 'webmaster'), async (c) => {
  const user = c.get('user')
  const lessonId = c.req.param('id')
  const result = await LessonsService.deleteLesson(user.id, lessonId)
  return c.json(result)
})

lessonRoutes.post('/lessons/:id/publish', requireRole('teacher', 'webmaster'), async (c) => {
  const user = c.get('user')
  const lessonId = c.req.param('id')
  const result = await LessonsService.publishLesson(user.id, lessonId)
  return c.json(result)
})

lessonRoutes.post('/groups/:classId/lessons/:id/publish', requireRole('teacher', 'webmaster'), async (c) => {
  const user = c.get('user')
  const lessonId = c.req.param('id')
  const result = await LessonsService.publishLesson(user.id, lessonId)
  return c.json(result)
})

lessonRoutes.get('/lessons/:id/exercises', requireAuth(), async (c) => {
  const user = c.get('user')
  const lessonId = c.req.param('id')
  const exercises = await LessonsService.getLessonExercises(user.id, lessonId)
  return c.json({ exercises })
})

lessonRoutes.post('/lessons/:id/exercises', requireRole('teacher', 'webmaster'), async (c) => {
  const user = c.get('user')
  const lessonId = c.req.param('id')
  const body = await c.req.json()
  const parsed = ExerciseCreateSchema.parse(body)
  const exercise = await LessonsService.addExercise(user.id, lessonId, parsed)
  return c.json({ exercise }, 201)
})

lessonRoutes.post('/lessons/:id/exercises/batch', requireRole('teacher', 'webmaster'), async (c) => {
  const user = c.get('user')
  const lessonId = c.req.param('id')
  const body = await c.req.json()
  const parsed = ExerciseBatchCreateSchema.parse(body)
  const result = await LessonsService.addExercisesBatch(user.id, lessonId, parsed.exercises)
  return c.json(result, 201)
})

lessonRoutes.put('/exercises/:exerciseId', requireRole('teacher', 'webmaster'), async (c) => {
  const user = c.get('user')
  const exerciseId = c.req.param('exerciseId')
  const body = await c.req.json()
  const parsed = ExerciseCreateSchema.partial().parse(body)
  const result = await LessonsService.updateExercise(user.id, exerciseId, parsed)
  return c.json(result)
})

lessonRoutes.delete('/exercises/:exerciseId', requireRole('teacher', 'webmaster'), async (c) => {
  const user = c.get('user')
  const exerciseId = c.req.param('exerciseId')
  const result = await LessonsService.deleteExercise(user.id, exerciseId)
  return c.json(result)
})

lessonRoutes.delete(
  '/lessons/:lessonId/exercises/:exerciseId',
  requireRole('teacher', 'webmaster'),
  async (c) => {
    const user = c.get('user')
    const exerciseId = c.req.param('exerciseId')
    const result = await LessonsService.deleteExercise(user.id, exerciseId)
    return c.json(result)
  }
)
