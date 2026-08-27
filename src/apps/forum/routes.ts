import { ForumImportSchema, ForumPostCreateSchema, ForumRatingSchema } from '@shared/contracts/forum'
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../../core/security/session'
import { ForumService } from './service'

export const forumRoutes = new Hono()

forumRoutes.use('/forum/*', requireAuth(), requireRole('teacher', 'webmaster'))

forumRoutes.post('/forum/posts', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const parsed = ForumPostCreateSchema.parse(body)
  const result = await ForumService.publishLessonToForum(user.id, parsed)
  return c.json({ post: result }, 201)
})

forumRoutes.get('/forum/posts', async (c) => {
  const posts = await ForumService.listForumPosts()
  return c.json({ posts })
})

forumRoutes.post('/forum/posts/:postId/rate', async (c) => {
  const user = c.get('user')
  const postId = c.req.param('postId')
  const body = await c.req.json()
  const parsed = ForumRatingSchema.parse(body)
  const result = await ForumService.ratePost(user.id, postId, parsed.rating)
  return c.json(result)
})

forumRoutes.post('/forum/posts/:postId/import', async (c) => {
  const user = c.get('user')
  const postId = c.req.param('postId')
  const body = await c.req.json()
  const parsed = ForumImportSchema.parse(body)
  const result = await ForumService.importLessonFromForum(user.id, postId, parsed.targetClassId)
  return c.json(result, 201)
})
