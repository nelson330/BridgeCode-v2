import { Database } from 'bun:sqlite'
import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { DEMO_TEACHER_CREDENTIALS } from '../../scripts/seed'

// The isolated runtime contains the production bundle and dependencies, no source or PDF.
const root = mkdtempSync(join(tmpdir(), 'aulaplay-production-'))
const probe = Bun.serve({ port: 0, fetch: () => new Response() })
const port = probe.port!
probe.stop(true)
cpSync(resolve('dist'), join(root, 'dist'), { recursive: true })
symlinkSync(resolve('node_modules'), join(root, 'node_modules'))
assert(!existsSync(join(root, 'MANUAL_HISTORIA_E_IDENTIDAD_NACIONAL_lzC0knx.pdf')))
async function boot() {
  const child = Bun.spawn([process.execPath, 'dist/entry.js'], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      DATA_DIR: join(root, 'data'),
      PORT: String(port),
      COOKIE_SECURE: 'false',
    },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const output = new Response(child.stdout).text()
  const errors = new Response(child.stderr).text()
  try {
    let healthy = false
    for (let attempt = 0; attempt < 150; attempt++) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/api/health`)
        if (response.ok) {
          const health = (await response.json()) as Record<string, unknown>
          assert(!('mode' in health))
          healthy = true
          break
        }
      } catch {
        /* Wait for the first seed and listener. */
      }
      if (child.exitCode !== null) break
      await Bun.sleep(100)
    }
    assert(healthy, 'Production startup did not become healthy')
    const page = await fetch(`http://127.0.0.1:${port}/present/cls_historia_identidad/lsn_identidad_unidad_1`)
    assert(page.ok)
    assert((await page.text()).includes('id="root"'))
    const login = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(DEMO_TEACHER_CREDENTIALS),
    })
    assert(login.ok, 'The demo teacher must accept its default credentials')
    const { user } = (await login.json()) as { user: { username: string; role: string } }
    assert.equal(user.username, DEMO_TEACHER_CREDENTIALS.username)
    assert.equal(user.role, 'teacher')
  } finally {
    child.kill()
    await child.exited
  }
  const log = await output
  const errorLog = await errors
  assert(!errorLog.includes('Failed to bootstrap'), 'Production bootstrap failed')
  return log
}
try {
  const firstLog = await boot()
  assert(firstLog.includes('[seed] Nuevas cuentas.'))
  assert(firstLog.includes('docente') && firstLog.includes('sofia.garcia'))
  assert(firstLog.includes(DEMO_TEACHER_CREDENTIALS.password))
  assert(!firstLog.includes('alumno123') && !firstLog.includes('admin123'))
  const db = new Database(join(root, 'data', 'aulaplay.db'))
  const count = (table: string) =>
    (db.query(`SELECT COUNT(*) AS total FROM ${table}`).get() as { total: number }).total
  assert.equal(count('users'), 10)
  assert.equal(count('group_members'), 8)
  assert.equal(count('lessons'), 3)
  assert.equal(count('exercises'), 18)
  db.exec("DELETE FROM exercises WHERE id = 'lsn_identidad_unidad_1_ex_1'")
  const secondLog = await boot()
  assert(!secondLog.includes('[seed] Nuevas cuentas.'))
  assert.equal(count('exercises'), 17)
  db.close()
  console.log(
    'Producción verificada: sin PDF, 8 estudiantes, 3 lecciones, 18 ejercicios; acceso docente por defecto, otras credenciales aleatorias y datos conservados al reiniciar.'
  )
} finally {
  rmSync(root, { recursive: true, force: true })
}
