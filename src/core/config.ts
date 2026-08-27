import { z } from 'zod'

const envSchema = z.object({
  MODE: z.enum(['local', 'hosted']).default('local'),
  PORT: z.coerce.number().default(3000),
  BASE_URL: z.string().default('http://localhost:3000'),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),
  DATA_DIR: z.string().default('./data'),
  AI_KEYS_AES_AAD: z.string().default('aulaplay:v1'),
  SESSION_TTL_MS: z.coerce.number().default(43200000),
  SESSION_TTL_STUDENT_MS: z.coerce.number().default(28800000),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().default(5),
  LOGIN_BLOCK_MS: z.coerce.number().default(300000),
  AI_TIMEOUT_MS: z.coerce.number().default(90000),
  AI_MAX_TOKENS: z.coerce.number().default(4096),
  AI_RATE_PER_MIN: z.coerce.number().default(10),
  BACKUP_ENABLED: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('true'),
  BACKUP_INTERVAL_H: z.coerce.number().default(24),
  BACKUP_RETENTION: z.coerce.number().default(7),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export type AppConfig = z.infer<typeof envSchema>

let cachedConfig: AppConfig | null = null

export function loadConfig(overrideEnv?: Record<string, string | undefined>): AppConfig {
  const env = overrideEnv ?? process.env
  const result = envSchema.safeParse(env)

  if (!result.success) {
    const errorDetails = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
    throw new Error(`Invalid environment configuration: ${errorDetails}`)
  }

  cachedConfig = result.data
  return cachedConfig
}

export function getConfig(): AppConfig {
  if (!cachedConfig) {
    return loadConfig()
  }
  return cachedConfig
}
