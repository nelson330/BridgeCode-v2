import { beforeEach, describe, expect, it } from 'bun:test'
import { AuthService } from '../../src/apps/auth/service'
import { loadConfig } from '../../src/core/config'
import { initDb } from '../../src/core/db/client'
import { createHttpApp } from '../../src/core/http/app'

describe('Social Wall, Homework, Analytics & Webmaster Admin (Fase 5)', () => {
  beforeEach(() => {
    loadConfig({ MODE: 'local' })
    initDb(':memory:')
  })

  it('manages class wall posts, likes, comments, pinning and moderation', async () => {
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

    // Create Class
    const classRes = await app.request('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ name: 'Arte y Música' }),
    })
    const classId = ((await classRes.json()) as any).class.id

    // 1. Create Wall Post
    const postRes = await app.request(`/api/classes/${classId}/wall/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        content: '¡Bienvenidos a la clase de Arte! Recuerden traer sus lápices.',
      }),
    })
    expect(postRes.status).toBe(201)
    const postData = (await postRes.json()) as any
    const postId = postData.post.id

    // 2. Like Post
    const likeRes = await app.request(`/api/wall/posts/${postId}/like`, {
      method: 'POST',
      headers: { Cookie: cookie },
    })
    expect(likeRes.status).toBe(200)
    const likeData = (await likeRes.json()) as any
    expect(likeData.liked).toBe(true)

    // 3. Add Comment
    const commentRes = await app.request(`/api/wall/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        content: '¡Entendido profesor, gracias!',
      }),
    })
    expect(commentRes.status).toBe(201)

    // 4. Pin Post
    const pinRes = await app.request(`/api/wall/posts/${postId}/pin`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ pinned: true }),
    })
    expect(pinRes.status).toBe(200)

    // 5. List Posts
    const listRes = await app.request(`/api/classes/${classId}/wall/posts`, {
      headers: { Cookie: cookie },
    })
    expect(listRes.status).toBe(200)
    const listData = (await listRes.json()) as any
    expect(listData.posts.length).toBe(1)
    expect(listData.posts[0].pinned).toBe(true)
    expect(listData.posts[0].likeCount).toBe(1)
  })

  it('manages homework and student asynchronous self-paced practice', async () => {
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

    // Create Class & Lesson with Exercise
    const classRes = await app.request('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ name: 'Matemáticas 2do' }),
    })
    const classId = ((await classRes.json()) as any).class.id

    const lessonRes = await app.request(`/api/groups/${classId}/lessons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ title: 'Fracciones' }),
    })
    const lessonId = ((await lessonRes.json()) as any).lesson.id

    const exRes = await app.request(`/api/lessons/${lessonId}/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        type: 'mc',
        prompt: '¿Cuánto es 1/2 + 1/2?',
        optionsJson: JSON.stringify(['1', '2', '1/4']),
        answerJson: JSON.stringify({ correctIndex: 0 }),
        points: 2,
        timeSec: 30,
      }),
    })
    const exerciseId = ((await exRes.json()) as any).exercise.id

    // 1. Assign Homework
    const dueTomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString()
    const hwRes = await app.request(`/api/classes/${classId}/homework`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        lessonId,
        title: 'Tarea 1: Suma de fracciones',
        dueAt: dueTomorrow,
        attemptLimit: 3,
        allowAfterDue: false,
      }),
    })
    expect(hwRes.status).toBe(201)

    // 2. Submit Practice Answer
    const practiceRes = await app.request(`/api/classes/${classId}/lessons/${lessonId}/practice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        exerciseId,
        answerJson: JSON.stringify({ correctIndex: 0 }),
        latencyMs: 3500,
      }),
    })
    expect(practiceRes.status).toBe(200)
    const practiceData = (await practiceRes.json()) as any
    expect(practiceData.isCorrect).toBe(true)
    expect(practiceData.pointsEarned).toBeGreaterThan(0)

    // 3. Verify Student Progress
    const progressRes = await app.request(`/api/classes/${classId}/progress/me`, {
      headers: { Cookie: cookie },
    })
    expect(progressRes.status).toBe(200)
    const progressData = (await progressRes.json()) as any
    expect(progressData.progress.totalExercisesCompleted).toBe(1)
    expect(progressData.progress.totalPoints).toBeGreaterThan(0)

    // 4. Verify Teacher Analytics Dashboard
    const dashRes = await app.request(`/api/classes/${classId}/dashboard`, {
      headers: { Cookie: cookie },
    })
    expect(dashRes.status).toBe(200)
    const dashData = (await dashRes.json()) as any
    expect(dashData.analytics.totalAnswers).toBe(1)
    expect(dashData.analytics.accuracyPercent).toBe(100)
  })
})
