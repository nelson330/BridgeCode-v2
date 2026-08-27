import { beforeEach, describe, expect, it } from 'bun:test'
import { AuthService } from '../../src/apps/auth/service'
import { loadConfig } from '../../src/core/config'
import { initDb } from '../../src/core/db/client'
import { createHttpApp } from '../../src/core/http/app'

describe('Challenges, Forum & Backups (Fase 6)', () => {
  beforeEach(() => {
    loadConfig({ MODE: 'local' })
    initDb(':memory:')
  })

  it('finds match or falls back to ghost replay for async challenges', async () => {
    const app = createHttpApp()
    await AuthService.seedInitialUser()

    const loginRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'docente',
        password: 'docente123',
      }),
    })
    const cookie = loginRes.headers.get('set-cookie')!

    // Create Class & Lesson
    const classRes = await app.request('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ name: 'Química 101' }),
    })
    const classId = ((await classRes.json()) as any).class.id

    const lessonRes = await app.request(`/api/groups/${classId}/lessons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ title: 'Tabla Periódica' }),
    })
    const lessonId = ((await lessonRes.json()) as any).lesson.id

    await app.request(`/api/lessons/${lessonId}/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        type: 'mc',
        prompt: '¿Cuál es el símbolo del Oro?',
        optionsJson: JSON.stringify(['Au', 'Ag', 'Fe', 'Cu']),
        answerJson: JSON.stringify({ correctIndex: 0 }),
        points: 1,
        timeSec: 15,
      }),
    })

    // Find challenge opponent or ghost
    const challengeRes = await app.request('/api/challenges/find', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ lessonId }),
    })
    expect(challengeRes.status).toBe(200)
    const challengeData = (await challengeRes.json()) as any
    expect(challengeData.mode).toBe('ghost')
    expect(challengeData.ghost.ghostName).toBeDefined()
    expect(challengeData.ghost.answers.length).toBe(1)
  })

  it('publishes lesson to forum, rates it, and imports it to another class (1-Click Import)', async () => {
    const app = createHttpApp()
    await AuthService.seedInitialUser()

    const loginRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'docente',
        password: 'docente123',
      }),
    })
    const cookie = loginRes.headers.get('set-cookie')!

    // Create Class 1 with Lesson
    const class1Res = await app.request('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ name: 'Literatura 1' }),
    })
    const class1Id = ((await class1Res.json()) as any).class.id

    const lessonRes = await app.request(`/api/groups/${class1Id}/lessons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ title: 'Don Quijote de la Mancha' }),
    })
    const lessonId = ((await lessonRes.json()) as any).lesson.id

    await app.request(`/api/lessons/${lessonId}/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        type: 'mc',
        prompt: '¿Quién escribió Don Quijote?',
        optionsJson: JSON.stringify(['Miguel de Cervantes', 'García Márquez', 'Borges']),
        answerJson: JSON.stringify({ correctIndex: 0 }),
        points: 2,
        timeSec: 30,
      }),
    })

    // 1. Publish to community forum
    const forumPostRes = await app.request('/api/forum/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        lessonId,
        title: 'Guía Completa Don Quijote',
        description: 'Actividades interactivas de lectura comprensiva',
        tags: ['literatura', 'cervantes', 'clasicos'],
      }),
    })
    expect(forumPostRes.status).toBe(201)
    const forumPostData = (await forumPostRes.json()) as any
    const postId = forumPostData.post.id

    // 2. Rate Post
    const rateRes = await app.request(`/api/forum/posts/${postId}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ rating: 5 }),
    })
    expect(rateRes.status).toBe(200)
    const rateData = (await rateRes.json()) as any
    expect(rateData.avgRating).toBe(5)

    // 3. Create Class 2 and 1-Click Import from Forum
    const class2Res = await app.request('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ name: 'Literatura 2' }),
    })
    const class2Id = ((await class2Res.json()) as any).class.id

    const importRes = await app.request(`/api/forum/posts/${postId}/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ targetClassId: class2Id }),
    })
    expect(importRes.status).toBe(201)
    const importData = (await importRes.json()) as any
    expect(importData.importedLessonId).toBeDefined()
  })

  it('exports and imports lesson bundle with integrity verification', async () => {
    const app = createHttpApp()
    await AuthService.seedInitialUser()

    const loginRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'docente',
        password: 'docente123',
      }),
    })
    const cookie = loginRes.headers.get('set-cookie')!

    // Create Class & Lesson
    const classRes = await app.request('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ name: 'Biología' }),
    })
    const classId = ((await classRes.json()) as any).class.id

    const lessonRes = await app.request(`/api/groups/${classId}/lessons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ title: 'Célula Eucariota' }),
    })
    const lessonId = ((await lessonRes.json()) as any).lesson.id

    await app.request(`/api/lessons/${lessonId}/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        type: 'tf',
        prompt: 'Las mitocondrias son las centrales energéticas de la célula.',
        optionsJson: JSON.stringify(['Verdadero', 'Falso']),
        answerJson: JSON.stringify({ isTrue: true }),
        points: 1,
        timeSec: 20,
      }),
    })

    // 1. Export Bundle
    const exportRes = await app.request(`/api/lessons/${lessonId}/export`, {
      headers: { Cookie: cookie },
    })
    expect(exportRes.status).toBe(200)
    const exportData = (await exportRes.json()) as any
    expect(exportData.bundle.lesson.title).toBe('Célula Eucariota')
    expect(exportData.bundle.lesson.exercises.length).toBe(1)

    // 2. Import Bundle into another class
    const targetClassRes = await app.request('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ name: 'Biología Avanzada' }),
    })
    const targetClassId = ((await targetClassRes.json()) as any).class.id

    const importBundleRes = await app.request(`/api/classes/${targetClassId}/import-bundle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(exportData.bundle),
    })
    expect(importBundleRes.status).toBe(201)
  })
})
