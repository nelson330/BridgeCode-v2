import { WallCommentCreateSchema, WallPostCreateSchema } from '@shared/contracts/social'
import { Hono } from 'hono'
import { requireAuth } from '../../core/security/session'
import { SocialService } from './service'

export const socialRoutes = new Hono()

socialRoutes.use('/classes/*', requireAuth())

socialRoutes.post('/classes/:classId/wall/posts', async (c) => {
  const user = c.get('user')
  const classId = c.req.param('classId')
  const body = await c.req.json()
  const parsed = WallPostCreateSchema.parse(body)
  const post = await SocialService.createPost(user.id, classId, parsed)
  return c.json({ post }, 201)
})

socialRoutes.get('/classes/:classId/wall/posts', async (c) => {
  const user = c.get('user')
  const classId = c.req.param('classId')
  const posts = await SocialService.listPosts(user.id, classId)
  return c.json({ posts })
})

socialRoutes.post('/wall/posts/:postId/like', async (c) => {
  const user = c.get('user')
  const postId = c.req.param('postId')
  const result = await SocialService.toggleLike(user.id, postId)
  return c.json(result)
})

socialRoutes.post('/wall/posts/:postId/comments', async (c) => {
  const user = c.get('user')
  const postId = c.req.param('postId')
  const body = await c.req.json()
  const parsed = WallCommentCreateSchema.parse(body)
  const comment = await SocialService.addComment(user.id, postId, parsed)
  return c.json({ comment }, 201)
})

socialRoutes.get('/wall/posts/:postId/comments', async (c) => {
  const postId = c.req.param('postId')
  const comments = await SocialService.listComments(postId)
  return c.json({ comments })
})

socialRoutes.patch('/wall/posts/:postId/pin', async (c) => {
  const user = c.get('user')
  const postId = c.req.param('postId')
  const body = await c.req.json()
  const result = await SocialService.pinPost(user.id, postId, !!body.pinned)
  return c.json(result)
})

socialRoutes.delete('/wall/posts/:postId', async (c) => {
  const user = c.get('user')
  const postId = c.req.param('postId')
  const result = await SocialService.moderatePost(user.id, postId, true)
  return c.json(result)
})
