import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runDatabaseSeed } from '../../scripts/seed'
import { loadConfig } from '../../src/core/config'
import { initDb } from '../../src/core/db/client'

process.env.NODE_ENV = 'test'
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'aulaplay-e2e-'))
process.env.PORT = '4173'
process.env.BASE_URL = 'http://127.0.0.1:4173'
process.env.COOKIE_SECURE = 'false'
loadConfig()
initDb()
await runDatabaseSeed()
loadConfig({ ...process.env, NODE_ENV: 'production' })
await import('../../src/entry')
