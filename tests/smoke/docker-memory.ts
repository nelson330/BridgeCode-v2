import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { DEMO_TEACHER_CREDENTIALS } from '../../scripts/seed'

const image = process.argv[2] || 'aulaplay-online:memory-test'
const container = `aulaplay-memory-${randomUUID()}`
const baseUrl = 'http://127.0.0.1:10000'
const headroomLimit = 384 * 1024 * 1024

async function docker(...args: string[]) {
  const child = Bun.spawn(['docker', ...args], { stdout: 'pipe', stderr: 'pipe' })
  const [output, errors, status] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  assert.equal(status, 0, `docker ${args[0]} failed: ${errors.trim()}`)
  return output.trim()
}

async function checkStartup() {
  let healthy = false
  for (let attempt = 0; attempt < 200; attempt++) {
    const state = JSON.parse(await docker('inspect', '--format', '{{json .State}}', container))
    assert(!state.OOMKilled, 'Startup exceeded the 512 MiB memory limit')
    assert(state.Running, 'The container exited before becoming healthy')
    try {
      const health = JSON.parse(await docker('exec', container, 'wget', '-qO-', `${baseUrl}/api/health`))
      if (health.status === 'ok') {
        healthy = true
        break
      }
    } catch {
      /* The listener starts after seeding. */
    }
    await Bun.sleep(200)
  }
  assert(healthy, 'Startup did not become healthy')
  const login = JSON.parse(
    await docker(
      'exec',
      container,
      'wget',
      '-qO-',
      '--header=Content-Type: application/json',
      `--post-data=${JSON.stringify(DEMO_TEACHER_CREDENTIALS)}`,
      `${baseUrl}/api/auth/login`
    )
  )
  assert.equal(login.user.username, DEMO_TEACHER_CREDENTIALS.username)
  const peak = Number(await docker('exec', container, 'cat', '/sys/fs/cgroup/memory.peak'))
  assert(Number.isFinite(peak) && peak > 0, 'Missing cgroup v2 memory measurement')
  assert(
    peak < headroomLimit,
    `Startup left insufficient memory headroom: ${(peak / 1048576).toFixed(1)} MiB`
  )
  return peak
}

async function checkDemo() {
  const result = JSON.parse(
    await docker(
      'exec',
      container,
      'bun',
      '-e',
      `
    const { Database } = require('bun:sqlite');
    const db = new Database('/var/data/aulaplay.db');
    const counts = ['users', 'group_members', 'lessons', 'exercises'].map(table => db.query('SELECT COUNT(*) AS total FROM ' + table).get().total);
    const hash = db.query("SELECT password_hash FROM users WHERE username = 'docente'").get().password_hash;
    console.log(JSON.stringify({ counts, secureHash: hash.includes('m=65536,t=3,p=1') }));
  `
    )
  )
  assert.deepEqual(result.counts, [10, 8, 3, 18])
  assert(result.secureHash, 'Argon2 security parameters must be preserved')
}

try {
  await docker(
    'run',
    '-d',
    '--name',
    container,
    '--memory',
    '512m',
    '--memory-swap',
    '512m',
    '--cpus',
    '1',
    '-e',
    'NODE_ENV=production',
    '-e',
    'PORT=10000',
    '-e',
    'COOKIE_SECURE=false',
    // Allow all ten hashes to run in native workers to expose an accidentally parallel seed.
    '-e',
    'UV_THREADPOOL_SIZE=10',
    image
  )
  const initialPeak = await checkStartup()
  await checkDemo()
  await docker('restart', container)
  const restartPeak = await checkStartup()
  await checkDemo()
  console.log(
    `Docker 512 MiB verificado: primer arranque ${(initialPeak / 1048576).toFixed(1)} MiB; reinicio ${(restartPeak / 1048576).toFixed(1)} MiB; demo y acceso docente correctos.`
  )
} finally {
  await docker('rm', '-fv', container)
}
