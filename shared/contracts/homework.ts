import { z } from 'zod'

export const HomeworkKindSchema = z.enum(['quiz', 'reading', 'discussion'])
export type HomeworkKind = z.infer<typeof HomeworkKindSchema>

export const HomeworkCreateSchema = z.object({
  lessonId: z.string(),
  title: z.string().min(2).max(100),
  kind: HomeworkKindSchema.default('quiz'),
  instructions: z.string().optional(),
  dueAt: z.string().or(z.date()),
  attemptLimit: z.number().int().min(1).max(10).optional(),
  allowAfterDue: z.boolean().default(false),
})
export type HomeworkCreate = z.infer<typeof HomeworkCreateSchema>

export const PracticeAnswerSchema = z.object({
  exerciseId: z.string(),
  answerJson: z.string(),
  latencyMs: z.number().int().min(0).default(0),
})
export type PracticeAnswer = z.infer<typeof PracticeAnswerSchema>
