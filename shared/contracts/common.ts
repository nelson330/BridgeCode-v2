import { z } from 'zod'

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  version: z.string(),
  mode: z.enum(['local', 'hosted']),
  uptimeMs: z.number(),
})

export type HealthResponse = z.infer<typeof HealthResponseSchema>

export const ConfigResponseSchema = z.object({
  mode: z.enum(['local', 'hosted']),
  locale: z.string(),
  maxUploadMb: z.number(),
  flags: z.object({
    registerEnabled: z.boolean(),
    forumEnabled: z.boolean(),
    adminEnabled: z.boolean(),
    studentAccounts: z.boolean(),
  }),
})

export type ConfigResponse = z.infer<typeof ConfigResponseSchema>

export const ApiErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
})

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>
