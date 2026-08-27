import { z } from 'zod'

export const ExerciseTypeSchema = z.enum(['mc', 'tf', 'fill', 'order', 'match', 'open', 'audio', 'image'])
export type ExerciseType = z.infer<typeof ExerciseTypeSchema>

export const ExerciseCreateSchema = z.object({
  type: ExerciseTypeSchema,
  prompt: z.string().min(2).max(1000),
  mediaUrl: z.string().url().optional().or(z.literal('')).nullable(),
  optionsJson: z.string().optional().nullable(), // Array of options or pairs
  answerJson: z.string().min(1), // Expected correct answer format
  explanation: z.string().max(1000).optional().nullable(),
  points: z.number().int().min(1).max(100).default(1),
  timeSec: z.number().int().min(5).max(300).default(30),
  sortOrder: z.number().int().default(0),
})
export type ExerciseCreate = z.infer<typeof ExerciseCreateSchema>

export const ExerciseBatchItemSchema = z.object({
  type: ExerciseTypeSchema.default('mc'),
  prompt: z.string().min(2).max(1000),
  mediaUrl: z.string().url().optional().or(z.literal('')).nullable(),
  optionsJson: z
    .union([z.string(), z.array(z.any()), z.record(z.string(), z.any())])
    .optional()
    .nullable(),
  answerJson: z.union([z.string(), z.record(z.string(), z.any()), z.number()]),
  explanation: z.string().max(1000).optional().nullable(),
  points: z.number().int().min(1).max(100).default(1),
  timeSec: z.number().int().min(5).max(300).default(30),
  sortOrder: z.number().int().default(0),
})
export type ExerciseBatchItem = z.infer<typeof ExerciseBatchItemSchema>

export const ExerciseBatchCreateSchema = z.object({
  exercises: z.array(ExerciseBatchItemSchema).min(1),
})
export type ExerciseBatchCreate = z.infer<typeof ExerciseBatchCreateSchema>

export const ExerciseResponseSchema = ExerciseCreateSchema.extend({
  id: z.string(),
  lessonId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type ExerciseResponse = z.infer<typeof ExerciseResponseSchema>
