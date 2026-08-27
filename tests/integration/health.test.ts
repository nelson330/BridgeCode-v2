import { describe, expect, it } from 'bun:test'
import { createHttpApp } from '../../src/core/http/app'

describe('Health and Config API', () => {
  const app = createHttpApp()

  it('GET /api/health returns 200 with status ok and version', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.status).toBe('ok')
    expect(data.version).toBe('1.0.0')
    expect(typeof data.uptimeMs).toBe('number')
  })

  it('GET /api/config returns mode and flags', async () => {
    const res = await app.request('/api/config')
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.locale).toBe('es')
    expect(data.maxUploadMb).toBe(25)
    expect(typeof data.flags).toBe('object')
  })
})
