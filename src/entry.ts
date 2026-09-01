import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { runDatabaseSeed } from '../scripts/seed'
import { AuthService } from './apps/auth/service'
import { type WsSocketData, handleWsClose, handleWsMessage } from './apps/games/ws-handler'
import { getConfig } from './core/config'
import { getDb, initDb } from './core/db/client'
import { users } from './core/db/schema'
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

  // 3. Seed default users. Always runs (idempotent) so existing DBs are not
  // touched. In production this auto-populates the database on first boot
  // when /var/data is empty (Render free tier); on persistent disks the
  // `onConflictDoNothing` guards re-seed against existing users.
  if (config.NODE_ENV === 'production' && config.MODE === 'hosted') {
    const existing = getDb().select().from(users).limit(1).all()
    if (existing.length === 0) {
      logger.info('🌱 Empty database detected — running initial seed for production hosted mode...')
      await runDatabaseSeed()
    } else {
      // Idempotent: only ensures default admin/teacher/student exist if missing.
      await AuthService.seedInitialUser()
    }
  } else {
    await AuthService.seedInitialUser()
  }

  // 4. Initialize HTTP App
  const app = createHttpApp()

  // 5. Launch Bun Server with WebSockets
  const server = Bun.serve<WsSocketData>({
    port: config.PORT,
    fetch(req, server) {
      const url = new URL(req.url)
      if (url.pathname === '/api/ws/game') {
        const upgraded = server.upgrade(req, {
          data: {},
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

  logger.info(`🚀 AulaPlay running at http://localhost:${server.port} [Mode: ${config.MODE}]`)
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to bootstrap AulaPlay')
  process.exit(1)
})
