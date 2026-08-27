import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'password',
      'passwordHash',
      'token',
      'secret',
      'apiKey',
      'apiKeyEncrypted',
      'pin',
      'cookie',
      'authorization',
      '*.password',
      '*.token',
      '*.apiKey',
      '*.pin',
    ],
    censor: '[REDACTED]',
  },
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'SYS:standard',
        },
      }
    : undefined,
})
