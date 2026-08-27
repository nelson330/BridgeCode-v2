import { describe, expect, it } from 'bun:test'
import { loadConfig } from '../../src/core/config'

describe('Config', () => {
  it('loads valid default configuration', () => {
    const config = loadConfig({})
    expect(config.MODE).toBe('local')
    expect(config.PORT).toBe(3000)
    expect(config.COOKIE_SECURE).toBe(false)
  })

  it('correctly parses custom environment variables', () => {
    const config = loadConfig({
      MODE: 'hosted',
      PORT: '8080',
      COOKIE_SECURE: 'true',
    })
    expect(config.MODE).toBe('hosted')
    expect(config.PORT).toBe(8080)
    expect(config.COOKIE_SECURE).toBe(true)
  })

  it('throws error for invalid mode', () => {
    expect(() =>
      loadConfig({
        MODE: 'invalid_mode' as unknown as 'local',
      })
    ).toThrow()
  })
})
