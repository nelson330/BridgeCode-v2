import { type ErrorCode, ErrorCodes } from './codes'

export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly details?: unknown

  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.INTERNAL_ERROR,
    statusCode = 500,
    details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }

  static badRequest(message: string, code: ErrorCode = ErrorCodes.BAD_REQUEST, details?: unknown): AppError {
    return new AppError(message, code, 400, details)
  }

  static unauthenticated(
    message = 'No autenticado',
    code: ErrorCode = ErrorCodes.AUTH_UNAUTHENTICATED
  ): AppError {
    return new AppError(message, code, 401)
  }

  static forbidden(message = 'No autorizado', code: ErrorCode = ErrorCodes.AUTH_UNAUTHORIZED): AppError {
    return new AppError(message, code, 403)
  }

  static notFound(message = 'Recurso no encontrado', code: ErrorCode = ErrorCodes.NOT_FOUND): AppError {
    return new AppError(message, code, 404)
  }

  static conflict(message = 'Conflicto de recursos', code: ErrorCode = ErrorCodes.CONFLICT): AppError {
    return new AppError(message, code, 409)
  }

  static rateLimit(
    message = 'Límite de peticiones excedido',
    code: ErrorCode = ErrorCodes.RATE_LIMIT_EXCEEDED
  ): AppError {
    return new AppError(message, code, 429)
  }

  static internal(message = 'Error interno del servidor', details?: unknown): AppError {
    return new AppError(message, ErrorCodes.INTERNAL_ERROR, 500, details)
  }
}

export { ErrorCodes, type ErrorCode }
