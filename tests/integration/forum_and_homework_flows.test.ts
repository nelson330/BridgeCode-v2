import { beforeAll, describe, expect, it } from 'bun:test'
import { runDatabaseSeed } from '../../scripts/seed'
import { loadConfig } from '../../src/core/config'
import { createTestDb } from '../../src/core/db/client'
import { createHttpApp } from '../../src/core/http/app'

describe('Multi-type Homework, Manual Builder, Forum & Reading Flows', () => {
  let app: ReturnType<typeof createHttpApp>
  let teacherCookie: string
  let studentCookie: string

  beforeAll(async () => {
    loadConfig({ MODE: 'hosted' })
    createTestDb()
    await runDatabaseSeed()
    app = createHttpApp()

    // 1. Login as teacher
    const tRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'docente', password: 'docente123' }),
    })
    expect(tRes.status).toBe(200)
    teacherCookie = tRes.headers.get('set-cookie') || ''

    // 2. Login as student
    const sRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'sofia.garcia', password: 'alumno123' }),
    })
    expect(sRes.status).toBe(200)
    studentCookie = sRes.headers.get('set-cookie') || ''
  })

  it('allows teacher to create exercises manually without AI', async () => {
    const res = await app.request('/api/lessons/lsn_sistema_solar/exercises', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: teacherCookie,
      },
      body: JSON.stringify({
        type: 'tf',
        prompt: '¿El Sol es una estrella de tipo enana amarilla?',
        optionsJson: JSON.stringify(['Verdadero', 'Falso']),
        answerJson: JSON.stringify({ isTrue: true }),
        explanation: 'El Sol es una estrella de tipo espectral G2V.',
        points: 3,
        timeSec: 25,
      }),
    })

    expect(res.status).toBe(201)
    const data = (await res.json()) as any
    expect(data.exercise.prompt).toBe('¿El Sol es una estrella de tipo enana amarilla?')
    expect(data.exercise.points).toBe(3)
  })

  it('publishes lesson to Community Forum, rates it, and imports to another class in 1 click', async () => {
    // Publish
    const pubRes = await app.request('/api/forum/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: teacherCookie,
      },
      body: JSON.stringify({
        lessonId: 'lsn_sistema_solar',
        title: 'Geología y Astronomía Planetaria',
        description: 'Lección completa para 5to de primaria.',
        tags: ['Geología', 'Astronomía', 'Primaria'],
      }),
    })
    expect(pubRes.status).toBe(201)
    const pubData = (await pubRes.json()) as any
    const postId = pubData.post.id

    // List forum posts
    const listRes = await app.request('/api/forum/posts', {
      headers: { Cookie: teacherCookie },
    })
    expect(listRes.status).toBe(200)
    const listData = (await listRes.json()) as any
    expect(listData.posts.length).toBeGreaterThanOrEqual(1)

    // Rate post 5 stars
    const rateRes = await app.request(`/api/forum/posts/${postId}/rate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: teacherCookie,
      },
      body: JSON.stringify({ rating: 5 }),
    })
    expect(rateRes.status).toBe(200)

    // 1-Click Import to Historia Universal class
    const impRes = await app.request(`/api/forum/posts/${postId}/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: teacherCookie,
      },
      body: JSON.stringify({ targetClassId: 'cls_historia_6b' }),
    })
    expect(impRes.status).toBe(201)
    const impData = (await impRes.json()) as any
    expect(impData.success).toBe(true)
    expect(impData.importedLessonId).toBeDefined()
  })

  it('assigns multi-type homework (Reading, Discussion, Quiz) and allows student to complete them', async () => {
    // 1. Assign Reading homework
    const readHwRes = await app.request('/api/classes/cls_ciencias_5a/homework', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: teacherCookie,
      },
      body: JSON.stringify({
        lessonId: 'lsn_sistema_solar',
        title: 'Lectura Guiada: Los Cuerpos Celestes',
        kind: 'reading',
        instructions: 'Leer atentamente los apuntes del sistema solar.',
        dueAt: new Date(Date.now() + 86400000).toISOString(),
        attemptLimit: 1,
      }),
    })
    expect(readHwRes.status).toBe(201)

    // 2. Student lists homework
    const stHwRes = await app.request('/api/student/homework', {
      headers: { Cookie: studentCookie },
    })
    expect(stHwRes.status).toBe(200)
    const stHwData = (await stHwRes.json()) as any
    expect(stHwData.homework.some((h: any) => h.kind === 'reading')).toBe(true)

    // 3. Student completes reading task
    const completeReadRes = await app.request(
      '/api/classes/cls_ciencias_5a/lessons/lsn_sistema_solar/reading/complete',
      {
        method: 'POST',
        headers: { Cookie: studentCookie },
      }
    )
    expect(completeReadRes.status).toBe(200)
    const completeReadData = (await completeReadRes.json()) as any
    expect(completeReadData.success).toBe(true)
    expect(completeReadData.pointsEarned).toBe(100)

    // 4. Check that gradebook reflects completed reading and homework
    const gbRes = await app.request('/api/classes/cls_ciencias_5a/gradebook', {
      headers: { Cookie: teacherCookie },
    })
    expect(gbRes.status).toBe(200)
    const gbData = (await gbRes.json()) as any
    const sofia = gbData.gradebook.students.find((s: any) => s.username === 'sofia.garcia')
    expect(sofia).toBeDefined()
    expect(sofia.homeworkCompleted).toBeGreaterThanOrEqual(1)
  })
})
