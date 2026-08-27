import { describe, expect, it } from 'bun:test'
import { z } from 'zod'
import { AppError, ErrorCodes } from '../../src/core/errors'
import { createHttpApp } from '../../src/core/http/app'

describe('AppError & Error Handler', () => {
  it('instantiates various AppError types with correct status codes', () => {
    const badReq = AppError.badRequest('Invalid input')
    expect(badReq.statusCode).toBe(400)
    expect(badReq.code).toBe(ErrorCodes.BAD_REQUEST)

    const unauth = AppError.unauthenticated()
    expect(unauth.statusCode).toBe(401)
    expect(unauth.code).toBe(ErrorCodes.AUTH_UNAUTHENTICATED)

    const forbid = AppError.forbidden()
    expect(forbid.statusCode).toBe(403)

    const notF = AppError.notFound()
    expect(notF.statusCode).toBe(404)

    const conf = AppError.conflict()
    expect(conf.statusCode).toBe(409)

    const rate = AppError.rateLimit()
    expect(rate.statusCode).toBe(429)

    const intern = AppError.internal('Database error', { query: 'SELECT' })
    expect(intern.statusCode).toBe(500)
    expect(intern.details).toEqual({ query: 'SELECT' })
  })

  it('handles AppError properly in HTTP routes', async () => {
    const app = createHttpApp()
    app.get('/test-error', (_c) => {
      throw AppError.forbidden('Custom forbidden message')
    })

    const res = await app.request('/test-error')
    expect(res.status).toBe(403)
    const body = (await res.json()) as { error: { code: string; message: string } }
    expect(body.error.code).toBe(ErrorCodes.AUTH_UNAUTHORIZED)
    expect(body.error.message).toBe('Custom forbidden message')
  })

  it('handles ZodError properly in HTTP routes', async () => {
    const app = createHttpApp()
    app.get('/test-zod', (c) => {
      const schema = z.object({ age: z.number() })
      schema.parse({ age: 'twenty' })
      return c.text('ok')
    })

    const res = await app.request('/test-zod')
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: { code: string; details: unknown[] } }
    expect(body.error.code).toBe(ErrorCodes.VALIDATION_ERROR)
    expect(Array.isArray(body.error.details)).toBe(true)
  })

  it('handles unexpected runtime Error with 500 without leaking stack', async () => {
    const app = createHttpApp()
    app.get('/test-500', (_c) => {
      throw new Error('Secret internal failure message')
    })

    const res = await app.request('/test-500')
    expect(res.status).toBe(500)
    const body = (await res.json()) as { error: { code: string; message: string } }
    expect(body.error.code).toBe(ErrorCodes.INTERNAL_ERROR)
    expect(body.error.message).toBe('Error interno del servidor')
  })
})
