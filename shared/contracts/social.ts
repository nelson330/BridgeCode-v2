import { z } from 'zod'

export const WallPostCreateSchema = z.object({
  content: z.string().min(1).max(2000),
  mediaUrl: z.string().url().optional().or(z.literal('')),
})
export type WallPostCreate = z.infer<typeof WallPostCreateSchema>

export const WallCommentCreateSchema = z.object({
  content: z.string().min(1).max(1000),
})
export type WallCommentCreate = z.infer<typeof WallCommentCreateSchema>

export const WallPostResponseSchema = z.object({
  id: z.string(),
  classId: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  content: z.string(),
  mediaUrl: z.string().nullable().optional(),
  pinned: z.boolean(),
  locked: z.boolean(),
  likeCount: z.number(),
  hasLiked: z.boolean().optional(),
  commentCount: z.number(),
  createdAt: z.date(),
})
export type WallPostResponse = z.infer<typeof WallPostResponseSchema>
