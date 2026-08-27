import { z } from 'zod'
import { ExerciseResponseSchema } from './exercises'

export const LessonStatusSchema = z.enum(['draft', 'published'])
export type LessonStatus = z.infer<typeof LessonStatusSchema>

export const LessonCreateSchema = z.object({
  title: z.string().min(2).max(120),
  materialContent: z.string().optional(),
  status: LessonStatusSchema.optional().default('draft'),
  lang: z.string().default('es'),
  settingsJson: z.string().optional(),
})
export type LessonCreate = z.infer<typeof LessonCreateSchema>

export const LessonUpdateSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  materialContent: z.string().optional(),
  status: LessonStatusSchema.optional(),
  lang: z.string().optional(),
  settingsJson: z.string().optional(),
})
export type LessonUpdate = z.infer<typeof LessonUpdateSchema>

export const LessonDetailResponseSchema = z.object({
  id: z.string(),
  classId: z.string(),
  teacherId: z.string(),
  title: z.string(),
  materialContent: z.string().nullable(),
  materialFile: z.string().nullable(),
  status: LessonStatusSchema,
  lang: z.string(),
  settingsJson: z.string().nullable(),
  publishedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  exercises: z.array(ExerciseResponseSchema),
})
export type LessonDetailResponse = z.infer<typeof LessonDetailResponseSchema>
