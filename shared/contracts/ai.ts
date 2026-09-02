import { z } from 'zod'
import { ExerciseTypeSchema } from './exercises'

export const AiProviderIdSchema = z.enum([
  'openai',
  'groq',
  'nim',
  'openrouter',
  'zen',
  'deepseek',
  'google',
  'openai-compatible',
])
export type AiProviderId = z.infer<typeof AiProviderIdSchema>

export const AiProviderPresetSchema = z.object({
  id: AiProviderIdSchema,
  name: z.string(),
  defaultBaseUrl: z.string(),
  defaultModel: z.string(),
  requiresCustomUrl: z.boolean(),
  isFreeTierAvailable: z.boolean(),
})
export type AiProviderPreset = z.infer<typeof AiProviderPresetSchema>

export const AiConfigSaveSchema = z.object({
  provider: AiProviderIdSchema,
  apiKey: z.string().min(1).optional(),
  baseUrl: z.string().url().optional().or(z.literal('')),
  model: z.string().min(1).optional(),
  enabled: z.boolean().default(true),
})
export type AiConfigSave = z.infer<typeof AiConfigSaveSchema>

export const AiTestPingSchema = z.object({
  provider: AiProviderIdSchema,
  apiKey: z.string().min(1).optional(),
  baseUrl: z.string().optional(),
  model: z.string().optional(),
})
export type AiTestPing = z.infer<typeof AiTestPingSchema>

export const AiGenerateRequestSchema = z.object({
  exerciseTypes: z.array(ExerciseTypeSchema).min(1),
  count: z.number().int().min(1).max(30).default(5),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  lang: z.string().default('es'),
})
export type AiGenerateRequest = z.infer<typeof AiGenerateRequestSchema>

export const AiJobStatusResponseSchema = z.object({
  jobId: z.string(),
  status: z.enum(['queued', 'running', 'done', 'error']),
  progress: z.object({
    done: z.number(),
    total: z.number(),
  }),
  exercises: z.array(z.any()).optional(),
  error: z.string().nullable().optional(),
})
export type AiJobStatusResponse = z.infer<typeof AiJobStatusResponseSchema>

export const AiSummarizeRequestSchema = z.object({
  lessonId: z.string().optional(),
  fileUrl: z.string().optional(),
  content: z.string().optional(),
  lang: z.string().default('es'),
})
export type AiSummarizeRequest = z.infer<typeof AiSummarizeRequestSchema>

export const AiSummarizeResponseSchema = z.object({
  summary: z.string(),
  title: z.string().optional(),
})
export type AiSummarizeResponse = z.infer<typeof AiSummarizeResponseSchema>
