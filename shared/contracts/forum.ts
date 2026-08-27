import { z } from 'zod'

export const ForumPostCreateSchema = z.object({
  lessonId: z.string(),
  title: z.string().min(3).max(120),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().min(1).max(30)).max(10).default([]),
})
export type ForumPostCreate = z.infer<typeof ForumPostCreateSchema>

export const ForumRatingSchema = z.object({
  rating: z.number().int().min(1).max(5),
})
export type ForumRating = z.infer<typeof ForumRatingSchema>

export const ForumImportSchema = z.object({
  targetClassId: z.string(),
})
export type ForumImport = z.infer<typeof ForumImportSchema>
