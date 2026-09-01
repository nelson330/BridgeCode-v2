import { existsSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { adminRoutes } from '../../apps/admin/routes'
import { agentRoutes } from '../../apps/agents/routes'
import { analyticsRoutes } from '../../apps/analytics/routes'
import { authRoutes } from '../../apps/auth/routes'
import { backupRoutes } from '../../apps/backup/routes'
import { challengeRoutes } from '../../apps/challenges/routes'
import { classRoutes } from '../../apps/classes/routes'
import { forumRoutes } from '../../apps/forum/routes'
import { gameRoutes } from '../../apps/games/routes'
import { homeworkRoutes } from '../../apps/homework/routes'
import { lessonRoutes } from '../../apps/lessons/routes'
import { socialRoutes } from '../../apps/social/routes'
import { studentRoutes } from '../../apps/student/routes'
import { uploadRoutes } from '../../apps/uploads/routes'
import { getConfig } from '../config'
import { logger } from '../logger'
import { sessionMiddleware } from '../security/session'
import { errorHandler } from './error-handler'

export function createHttpApp() {
  const app = new Hono()
  const config = getConfig()

  // Security Headers
  app.use(
    '*',
    secureHeaders({
      xFrameOptions: 'SAMEORIGIN',
      xContentTypeOptions: 'nosniff',
      referrerPolicy: 'strict-origin-when-cross-origin',
    })
  )

  // CORS for local development when needed
  if (config.NODE_ENV !== 'production') {
    app.use(
      '*',
      cors({
        origin: [config.BASE_URL, 'http://localhost:5173', 'http://localhost:3000'],
        credentials: true,
      })
    )
  }

  // Request logger
  app.use('*', async (c, next) => {
    const start = Date.now()
    const path = c.req.path
    const method = c.req.method
    await next()
    const ms = Date.now() - start
    logger.debug({ method, path, status: c.res.status, durationMs: ms }, `${method} ${path}`)
  })

  // Global Error Handler
  app.onError(errorHandler)

  // Global session loader
  app.use('*', sessionMiddleware)

  // System Endpoints
  const startTime = Date.now()

  app.get('/api/health', (c) => {
    return c.json({
      status: 'ok',
      version: '1.0.0',
      mode: config.MODE,
      uptimeMs: Date.now() - startTime,
    })
  })

  app.get('/api/config', (c) => {
    const isHosted = config.MODE === 'hosted'
    return c.json({
      mode: config.MODE,
      locale: 'es',
      maxUploadMb: 25,
      flags: {
        registerEnabled: isHosted,
        forumEnabled: isHosted,
        adminEnabled: isHosted,
        studentAccounts: isHosted,
      },
    })
  })

  // Domain Routers
  app.route('/api/auth', authRoutes)
  app.route('/api/classes', classRoutes)
  app.route('/api', lessonRoutes)
  app.route('/api/ai', agentRoutes)
  app.route('/api', gameRoutes)
  app.route('/api', socialRoutes)
  app.route('/api', homeworkRoutes)
  app.route('/api', analyticsRoutes)
  app.route('/api/admin', adminRoutes)
  app.route('/api', challengeRoutes)
  app.route('/api', forumRoutes)
  app.route('/api', backupRoutes)
  app.route('/api', studentRoutes)
  app.route('/api', uploadRoutes)

  // ─── Static front-end (production) ────────────────────────────────────────
  // Vite's `bun run build:web` produces dist/web/index.html + assets.
  // In production Hono serves them; SPA history-fallback returns index.html
  // for any non-API GET so React Router can take over on reload.
  // API routes (/api/*) bypass this handler so 404s are handled normally.
  app.get('*', async (c, next) => {
    if (config.NODE_ENV !== 'production') return next()

    const url = new URL(c.req.url)
    // /api/* is handled by the route handlers above — never serve SPA for them
    if (url.pathname.startsWith('/api/') || url.pathname === '/api') return next()

    const distDir = join(process.cwd(), 'dist', 'web')
    const requested = join(distDir, url.pathname)

    // Only serve regular files (EISDIR-safe)
    let isFile = false
    try {
      isFile = statSync(requested).isFile()
    } catch {
      isFile = false
    }
    if (isFile) {
      const buf = await readFile(requested)
      return new Response(buf, {
        headers: {
          'Content-Type': mimeFor(requested),
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    }

    // SPA fallback — only when index.html exists (i.e. front-end was built)
    const indexPath = join(distDir, 'index.html')
    if (existsSync(indexPath)) {
      const html = await readFile(indexPath, 'utf8')
      return c.html(html)
    }

    // No built front-end — let downstream handlers (or 404) take over
    return next()
  })

  return app
}

function mimeFor(filePath: string): string {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8'
  if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) return 'application/javascript; charset=utf-8'
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8'
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8'
  if (filePath.endsWith('.svg')) return 'image/svg+xml'
  if (filePath.endsWith('.png')) return 'image/png'
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg'
  if (filePath.endsWith('.webp')) return 'image/webp'
  if (filePath.endsWith('.woff2')) return 'font/woff2'
  if (filePath.endsWith('.woff')) return 'font/woff'
  if (filePath.endsWith('.ttf')) return 'font/ttf'
  return 'application/octet-stream'
}
