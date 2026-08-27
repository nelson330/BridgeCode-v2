import type { ErrorHandler } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { ZodError } from 'zod'
import { AppError, ErrorCodes } from '../errors'
import { logger } from '../logger'

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, code: err.code, status: err.statusCode }, err.message)
    }
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      },
      err.statusCode as ContentfulStatusCode
    )
  }

  if (err instanceof ZodError) {
    return c.json(
      {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Error de validación en la solicitud',
          details: err.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
      },
      400
    )
  }

  logger.error({ err }, 'Unhandled server exception')

  return c.json(
    {
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Error interno del servidor',
      },
    },
    500
  )
}
