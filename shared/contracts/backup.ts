import { z } from 'zod'

export const ExportBundleSchema = z.object({
  version: z.string(),
  exportedAt: z.string(),
  lesson: z.object({
    title: z.string(),
    materialContent: z.string().nullable().optional(),
    lang: z.string(),
    exercises: z.array(
      z.object({
        type: z.string(),
        prompt: z.string(),
        optionsJson: z.string().nullable().optional(),
        answerJson: z.string(),
        explanation: z.string().nullable().optional(),
        points: z.number(),
        timeSec: z.number(),
      })
    ),
  }),
})
export type ExportBundle = z.infer<typeof ExportBundleSchema>
