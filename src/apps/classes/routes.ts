import { ClassCreateSchema, ClassMembersAddSchema, ClassUpdateSchema } from '@shared/contracts/classes'
import {
  StudentBatchCreateSchema,
  StudentCreateSchema,
  StudentPasswordResetSchema,
  StudentUpdateSchema,
} from '@shared/contracts/users'
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../../core/security/session'
import { UsersService } from '../users/service'
import { ClassesService } from './service'

export const classRoutes = new Hono()

// Apply authentication and role check to specific class management endpoints
classRoutes.use('/', requireAuth(), requireRole('teacher', 'webmaster'))
classRoutes.use('/:id', requireAuth(), requireRole('teacher', 'webmaster'))
classRoutes.use('/:id/members', requireAuth(), requireRole('teacher', 'webmaster'))
classRoutes.use('/:id/members/:userId', requireAuth(), requireRole('teacher', 'webmaster'))
classRoutes.use('/:id/students', requireAuth(), requireRole('teacher', 'webmaster'))
classRoutes.use('/:id/students/:studentId', requireAuth(), requireRole('teacher', 'webmaster'))
classRoutes.use('/:id/students/:studentId/reset-password', requireAuth(), requireRole('teacher', 'webmaster'))
classRoutes.use('/students/:studentId/reset-password', requireAuth(), requireRole('teacher', 'webmaster'))

classRoutes.post('/', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const parsed = ClassCreateSchema.parse(body)
  const created = await ClassesService.createClass(user.id, parsed)
  return c.json({ class: created }, 201)
})

classRoutes.get('/', async (c) => {
  const user = c.get('user')
  const classes = await ClassesService.listClasses(user.id)
  return c.json({ classes })
})

classRoutes.get('/:id', async (c) => {
  const user = c.get('user')
  const classId = c.req.param('id')
  const detail = await ClassesService.getClass(user.id, classId)
  return c.json({ class: detail })
})

classRoutes.patch('/:id', async (c) => {
  const user = c.get('user')
  const classId = c.req.param('id')
  const body = await c.req.json()
  const parsed = ClassUpdateSchema.parse(body)
  const result = await ClassesService.updateClass(user.id, classId, parsed)
  return c.json(result)
})

classRoutes.delete('/:id', async (c) => {
  const user = c.get('user')
  const classId = c.req.param('id')
  const result = await ClassesService.deleteClass(user.id, classId)
  return c.json(result)
})

classRoutes.post('/:id/members', async (c) => {
  const user = c.get('user')
  const classId = c.req.param('id')
  const body = await c.req.json()
  const parsed = ClassMembersAddSchema.parse(body)
  const result = await ClassesService.addMembers(user.id, classId, parsed.userIds)
  return c.json(result)
})

classRoutes.delete('/:id/members/:userId', async (c) => {
  const user = c.get('user')
  const classId = c.req.param('id')
  const userId = c.req.param('userId')
  const result = await ClassesService.removeMember(user.id, classId, userId)
  return c.json(result)
})

// Student management under class
classRoutes.post('/:id/students', async (c) => {
  const user = c.get('user')
  const classId = c.req.param('id')
  const body = await c.req.json()

  if (Array.isArray(body?.students)) {
    const parsed = StudentBatchCreateSchema.parse(body)
    const results = await UsersService.createStudentsBatch(user.id, classId, parsed.students)
    return c.json({ results }, 201)
  }

  const parsed = StudentCreateSchema.parse(body)
  const student = await UsersService.createStudent(user.id, classId, parsed)
  return c.json({ student }, 201)
})

classRoutes.patch('/:id/students/:studentId', async (c) => {
  const user = c.get('user')
  const studentId = c.req.param('studentId')
  const body = await c.req.json()
  const parsed = StudentUpdateSchema.parse(body)
  const result = await UsersService.updateStudent(user.id, studentId, parsed)
  return c.json(result)
})

classRoutes.delete('/:id/students/:studentId', async (c) => {
  const user = c.get('user')
  const classId = c.req.param('id')
  const studentId = c.req.param('studentId')
  const result = await UsersService.deleteStudentFromClass(user.id, classId, studentId)
  return c.json(result)
})

classRoutes.post('/:id/students/:studentId/reset-password', async (c) => {
  const user = c.get('user')
  const studentId = c.req.param('studentId')
  const body = (await c.req.json().catch(() => ({}))) || {}
  const parsed = StudentPasswordResetSchema.parse(body)
  const result = await UsersService.resetPassword(user.id, studentId, parsed.newPassword)
  return c.json(result)
})

classRoutes.post('/students/:studentId/reset-password', async (c) => {
  const user = c.get('user')
  const studentId = c.req.param('studentId')
  const body = (await c.req.json().catch(() => ({}))) || {}
  const parsed = StudentPasswordResetSchema.parse(body)
  const result = await UsersService.resetPassword(user.id, studentId, parsed.newPassword)
  return c.json(result)
})
