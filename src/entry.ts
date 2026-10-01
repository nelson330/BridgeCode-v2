import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { runDatabaseSeed } from '../scripts/seed'
import { type WsSocketData, getSocketUser, handleWsClose, handleWsMessage } from './apps/games/ws-handler'
import { getConfig } from './core/config'
import { initDb } from './core/db/client'
import { createHttpApp } from './core/http/app'
import { logger } from './core/logger'

async function bootstrap() {
  const config = getConfig()

  // 1. Ensure required data directories exist
  const dirs = [
    config.DATA_DIR,
    join(config.DATA_DIR, '.keys'),
    join(config.DATA_DIR, 'uploads'),
    join(config.DATA_DIR, 'backups'),
  ]

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 })
    }
  }

  // 2. Initialize database
  initDb()

  // 3. Initialize the online demo once, in every environment.
  await runDatabaseSeed()

  // 4. Initialize HTTP App
  const app = createHttpApp()

  // 5. Launch Bun Server with WebSockets
  const server = Bun.serve<WsSocketData>({
    port: config.PORT,
    fetch(req, server) {
      const url = new URL(req.url)
      if (url.pathname === '/api/ws/game') {
        const upgraded = server.upgrade(req, {
          data: { authenticatedUserId: getSocketUser(req) },
        })
        if (upgraded) return undefined
      }

      return app.fetch(req)
    },
    websocket: {
      message(ws, message) {
        handleWsMessage(ws, message)
      },
      close(ws) {
        handleWsClose(ws)
      },
    },
  })

  logger.info(`AulaPlay running at http://localhost:${server.port}`)
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to bootstrap AulaPlay')
  process.exit(1)
})
