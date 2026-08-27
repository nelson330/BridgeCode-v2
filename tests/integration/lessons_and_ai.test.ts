import { beforeEach, describe, expect, it } from 'bun:test'
import { AuthService } from '../../src/apps/auth/service'
import { loadConfig } from '../../src/core/config'
import { initDb } from '../../src/core/db/client'
import { createHttpApp } from '../../src/core/http/app'
import { decryptApiKey, encryptApiKey } from '../../src/core/security/crypto'
import { isBlockedUrl } from '../../src/core/security/ssrf'

describe('Lessons, Exercises & AI Engine (Fase 3)', () => {
  beforeEach(() => {
    loadConfig({ MODE: 'local' })
    initDb(':memory:')
  })

  it('verifies SSRF blocking on private and metadata URLs', () => {
    expect(isBlockedUrl('http://localhost:8080')).toBe(true)
    expect(isBlockedUrl('http://127.0.0.1/api')).toBe(true)
    expect(isBlockedUrl('http://169.254.169.254/latest/meta-data')).toBe(true)
    expect(isBlockedUrl('http://192.168.1.1/admin')).toBe(true)
    expect(isBlockedUrl('http://10.0.0.1/')).toBe(true)
    expect(isBlockedUrl('https://api.openai.com/v1')).toBe(false)
    expect(isBlockedUrl('https://api.groq.com/openai/v1')).toBe(false)
  })

  it('verifies AES-256-GCM encryption and decryption round-trip', () => {
    const originalKey = 'sk-test-super-secret-key-12345'
    const encrypted = encryptApiKey(originalKey)
    expect(encrypted).not.toBe(originalKey)
    expect(encrypted.split(':').length).toBe(3)

    const decrypted = decryptApiKey(encrypted)
    expect(decrypted).toBe(originalKey)
  })

  it('creates lesson, adds exercises and publishes lesson', async () => {
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

    // 1. Create a class
    const classRes = await app.request('/api/classes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({ name: 'Historia 3ro' }),
    })
    const classData = (await classRes.json()) as any
    const classId = classData.class.id

    // 2. Create a lesson draft
    const lessonRes = await app.request(`/api/groups/${classId}/lessons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({
        title: 'Revolución Industrial',
        materialContent: 'La Revolución Industrial comenzó en Gran Bretaña en el siglo XVIII.',
        lang: 'es',
      }),
    })
    expect(lessonRes.status).toBe(201)
    const lessonData = (await lessonRes.json()) as any
    const lessonId = lessonData.lesson.id
    expect(lessonData.lesson.status).toBe('draft')

    // 3. Try to publish without exercises (should fail with 400)
    const failPublishRes = await app.request(`/api/lessons/${lessonId}/publish`, {
      method: 'POST',
      headers: { Cookie: cookie },
    })
    expect(failPublishRes.status).toBe(400)

    // 4. Add an exercise
    const exerciseRes = await app.request(`/api/lessons/${lessonId}/exercises`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({
        type: 'mc',
        prompt: '¿Dónde comenzó la Revolución Industrial?',
        optionsJson: JSON.stringify(['Gran Bretaña', 'Francia', 'Alemania', 'Italia']),
        answerJson: JSON.stringify({ correctIndex: 0 }),
        points: 2,
        timeSec: 25,
      }),
    })
    expect(exerciseRes.status).toBe(201)

    // 5. Publish lesson
    const publishRes = await app.request(`/api/lessons/${lessonId}/publish`, {
      method: 'POST',
      headers: { Cookie: cookie },
    })
    expect(publishRes.status).toBe(200)
    const publishData = (await publishRes.json()) as any
    expect(publishData.status).toBe('published')
  })

  it('configures AI provider and launches generation job with fallback', async () => {
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

    // 1. Get providers catalog
    const providersRes = await app.request('/api/ai/providers', {
      headers: { Cookie: cookie },
    })
    expect(providersRes.status).toBe(200)
    const providersData = (await providersRes.json()) as any
    expect(providersData.providers.length).toBeGreaterThan(5)

    // 2. Save Groq configuration with encrypted key
    const saveRes = await app.request('/api/ai/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({
        provider: 'groq',
        apiKey: 'gsk_mock_api_key_test_123',
        model: 'llama-3.3-70b-versatile',
        enabled: true,
      }),
    })
    expect(saveRes.status).toBe(200)

    // 3. Create class and lesson for generation
    const classRes = await app.request('/api/classes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({ name: 'Física y Química' }),
    })
    const classId = ((await classRes.json()) as any).class.id

    const lessonRes = await app.request(`/api/groups/${classId}/lessons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({
        title: 'Leyes de Newton',
        materialContent: 'La primera ley de Newton establece que un objeto permanece en reposo.',
      }),
    })
    const lessonId = ((await lessonRes.json()) as any).lesson.id

    // 4. Launch AI generation job
    const jobRes = await app.request(`/api/ai/lessons/${lessonId}/ai-generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({
        exerciseTypes: ['mc', 'tf'],
        count: 2,
        difficulty: 'medium',
        lang: 'es',
      }),
    })
    expect(jobRes.status).toBe(201)
    const jobData = (await jobRes.json()) as any
    expect(jobData.jobId).toBeDefined()

    // 5. Poll status until completed
    let statusData: any = null
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 100))
      const statusRes = await app.request(`/api/ai/jobs/${jobData.jobId}`, {
        headers: { Cookie: cookie },
      })
      statusData = await statusRes.json()
      if (statusData.status === 'done' || statusData.status === 'error') break
    }

    expect(statusData.status).toBe('done')
    expect(statusData.exercises.length).toBe(2)

    // 6. Teacher adds the AI-generated exercises to the lesson in batch
    const batchRes = await app.request(`/api/lessons/${lessonId}/exercises/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({
        exercises: statusData.exercises,
      }),
    })
    expect(batchRes.status).toBe(201)
    const batchData = (await batchRes.json()) as any
    expect(batchData.count).toBe(2)
    expect(batchData.exercises.length).toBe(2)

    // 7. Verify exercises now exist in the database for this lesson
    const listExRes = await app.request(`/api/lessons/${lessonId}/exercises`, {
      headers: { Cookie: cookie },
    })
    expect(listExRes.status).toBe(200)
    const listExData = (await listExRes.json()) as any
    expect(listExData.exercises.length).toBe(2)

    // 8. Publish lesson now that it contains the AI generated exercises
    const publishRes = await app.request(`/api/lessons/${lessonId}/publish`, {
      method: 'POST',
      headers: { Cookie: cookie },
    })
    expect(publishRes.status).toBe(200)
    const publishData = (await publishRes.json()) as any
    expect(publishData.status).toBe('published')
  }, 20000)

  it('generates 8 exercises requested with slider and saves all 8 to lesson in batch', async () => {
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

    // 1. Create class and lesson
    const classRes = await app.request('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ name: 'Biología Celular' }),
    })
    const classId = ((await classRes.json()) as any).class.id

    const lessonRes = await app.request(`/api/groups/${classId}/lessons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        title: 'Estructura y Función de la Célula',
        materialContent: 'La célula es la unidad morfológica y funcional de todo ser vivo.',
      }),
    })
    const lessonId = ((await lessonRes.json()) as any).lesson.id

    // 2. Launch AI generation requesting 8 exercises with 2 types
    const jobRes = await app.request(`/api/ai/lessons/${lessonId}/ai-generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        exerciseTypes: ['mc', 'tf'],
        count: 8,
        difficulty: 'medium',
        lang: 'es',
      }),
    })
    expect(jobRes.status).toBe(201)
    const jobData = (await jobRes.json()) as any

    // 3. Poll until done
    let statusData: any = null
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 100))
      const statusRes = await app.request(`/api/ai/jobs/${jobData.jobId}`, {
        headers: { Cookie: cookie },
      })
      statusData = await statusRes.json()
      if (statusData.status === 'done' || statusData.status === 'error') break
    }

    expect(statusData.status).toBe('done')
    expect(statusData.exercises.length).toBe(8)

    // 4. Batch save all 8 exercises
    const batchRes = await app.request(`/api/lessons/${lessonId}/exercises/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ exercises: statusData.exercises }),
    })
    expect(batchRes.status).toBe(201)
    const batchData = (await batchRes.json()) as any
    expect(batchData.count).toBe(8)

    // 5. Verify 8 exercises stored
    const listRes = await app.request(`/api/lessons/${lessonId}/exercises`, {
      headers: { Cookie: cookie },
    })
    expect(listRes.status).toBe(200)
    const listData = (await listRes.json()) as any
    expect(listData.exercises.length).toBe(8)
  }, 20000)

  it('generates exercises without regex errors when lesson material has parentheses, formulas and brackets', async () => {
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

    const classRes = await app.request('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ name: 'Química y Física Cuántica' }),
    })
    const classId = ((await classRes.json()) as any).class.id

    // Lesson with heavy parentheses, brackets and formula notation
    const lessonRes = await app.request(`/api/groups/${classId}/lessons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        title: 'Reacciones Químicas y Moléculas (H2O & NaCl)',
        materialContent:
          'La molécula de agua (H2O) y el cloruro de sodio (NaCl) reaccionan formando disoluciones acuosas [Ref. (1945)]. La función de estado f(x) = E/(mc^2) describe el balance energético.',
      }),
    })
    const lessonId = ((await lessonRes.json()) as any).lesson.id

    // Launch generation with fill, order, tf, and mc
    const jobRes = await app.request(`/api/ai/lessons/${lessonId}/ai-generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        exerciseTypes: ['fill', 'order', 'tf', 'mc'],
        count: 4,
        difficulty: 'hard',
        lang: 'es',
      }),
    })
    expect(jobRes.status).toBe(201)
    const jobData = (await jobRes.json()) as any

    let statusData: any = null
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 100))
      const statusRes = await app.request(`/api/ai/jobs/${jobData.jobId}`, {
        headers: { Cookie: cookie },
      })
      statusData = await statusRes.json()
      if (statusData.status === 'done' || statusData.status === 'error') break
    }

    expect(statusData.status).toBe('done')
    expect(statusData.error).toBeFalsy()
    expect(statusData.exercises.length).toBe(4)

    // Save generated exercises including fill (which has optionsJson: null)
    const batchSaveRes = await app.request(`/api/lessons/${lessonId}/exercises/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ exercises: statusData.exercises }),
    })
    expect(batchSaveRes.status).toBe(201)
    const batchSaveData = (await batchSaveRes.json()) as any
    expect(batchSaveData.count).toBe(4)
  }, 20000)

  it('accepts single and batch creation of exercises with optionsJson: null (fill, open)', async () => {
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

    const classRes = await app.request('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ name: 'Gramática y Sintaxis' }),
    })
    const classId = ((await classRes.json()) as any).class.id

    const lessonRes = await app.request(`/api/groups/${classId}/lessons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        title: 'Oraciones Simples y Compuestas',
      }),
    })
    const lessonId = ((await lessonRes.json()) as any).lesson.id

    // Test batch with explicit optionsJson: null, mediaUrl: null, explanation: null
    const batchRes = await app.request(`/api/lessons/${lessonId}/exercises/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        exercises: [
          {
            type: 'fill',
            prompt: 'El sujeto en la oración realiza la [ ___ ].',
            optionsJson: null,
            answerJson: JSON.stringify({ validAnswers: ['acción', 'accion'] }),
            explanation: null,
            mediaUrl: null,
            points: 2,
            timeSec: 25,
          },
          {
            type: 'open',
            prompt: 'Explica qué es una oración copulativa.',
            optionsJson: null,
            answerJson: JSON.stringify({
              sampleAnswer: 'Oración con verbo copulativo (ser, estar, parecer)',
            }),
            explanation: 'Requiere verbo copulativo y atributo.',
            points: 3,
            timeSec: 45,
          },
        ],
      }),
    })
    expect(batchRes.status).toBe(201)
    const batchData = (await batchRes.json()) as any
    expect(batchData.count).toBe(2)

    // Test single creation with optionsJson: null
    const singleRes = await app.request(`/api/lessons/${lessonId}/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        type: 'fill',
        prompt: 'La fotosíntesis convierte la luz solar en energía [ ___ ].',
        optionsJson: null,
        answerJson: JSON.stringify({ validAnswers: ['química', 'quimica'] }),
        explanation: null,
        mediaUrl: null,
        points: 1,
        timeSec: 30,
      }),
    })
    expect(singleRes.status).toBe(201)
  })
})
