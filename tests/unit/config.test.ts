import { describe, expect, it } from 'bun:test'
import { loadConfig } from '../../src/core/config'

describe('Online configuration', () => {
  it('loads defaults without an application mode', () => {
    const config = loadConfig({})
    expect(config.PORT).toBe(3000)
    expect(config.COOKIE_SECURE).toBe(false)
    expect(config).not.toHaveProperty('MODE')
  })
  it('parses environment settings', () => {
    const config = loadConfig({ PORT: '8080', COOKIE_SECURE: 'true' })
    expect(config.PORT).toBe(8080)
    expect(config.COOKIE_SECURE).toBe(true)
  })
  it('ignores the obsolete mode variable in existing deployments', () => {
    expect(loadConfig({ MODE: 'local' })).not.toHaveProperty('MODE')
  })
  it('rejects invalid environment settings', () => {
    expect(() => loadConfig({ COOKIE_SECURE: 'invalid' })).toThrow()
  })
})
