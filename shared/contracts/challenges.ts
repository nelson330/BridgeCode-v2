import { z } from 'zod'

export const ChallengeRequestSchema = z.object({
  lessonId: z.string(),
  opponentUserId: z.string().optional(),
})
export type ChallengeRequest = z.infer<typeof ChallengeRequestSchema>

export const GhostReplaySchema = z.object({
  ghostUserId: z.string(),
  ghostName: z.string(),
  totalScore: z.number(),
  answers: z.array(
    z.object({
      exerciseId: z.string(),
      latencyMs: z.number(),
      pointsEarned: z.number(),
      isCorrect: z.boolean(),
    })
  ),
})
export type GhostReplay = z.infer<typeof GhostReplaySchema>
