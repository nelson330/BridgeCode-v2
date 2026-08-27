import { beforeAll, describe, expect, it } from 'bun:test'
import { customAlphabet } from 'nanoid'
import { RoomManager } from '../../src/apps/games/room'
import { loadConfig } from '../../src/core/config'
import { getDb, initDb } from '../../src/core/db/client'
import { sessions, users } from '../../src/core/db/schema'
import { createHttpApp } from '../../src/core/http/app'
import { hashPassword } from '../../src/core/security/crypto'

const generateId = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10)

describe('Full CRUD, Multimedia (PDF/Images), Live Game Filter & Ranking', () => {
  let app: ReturnType<typeof createHttpApp>
  let teacherToken: string
  let studentToken: string
  let teacherId: string
  let studentId: string
  let classId: string
  let lessonId: string
  let exerciseId: string
  let homeworkId: string

  beforeAll(async () => {
    loadConfig({ MODE: 'hosted' })
    initDb(':memory:')
    app = createHttpApp()
    const db = getDb()

    teacherId = `usr_tea_${generateId()}`
    studentId = `usr_stu_${generateId()}`

    const pwd = await hashPassword('password123')

    await db.insert(users).values([
      {
        id: teacherId,
        username: 'prof_mario',
        displayName: 'Prof. Mario',
        passwordHash: pwd,
        role: 'teacher',
      },
      {
        id: studentId,
        username: 'lucia.perez',
        displayName: 'Lucía Pérez',
        passwordHash: pwd,
        role: 'student',
      },
    ])

    teacherToken = 'token_tea_test_123'
    studentToken = 'token_stu_test_123'

    await db.insert(sessions).values([
      {
        id: teacherToken,
        userId: teacherId,
        roleSnapshot: 'teacher',
        ip: '127.0.0.1',
        userAgent: 'test',
        expiresAt: new Date(Date.now() + 86400000),
      },
      {
        id: studentToken,
        userId: studentId,
        roleSnapshot: 'student',
        ip: '127.0.0.1',
        userAgent: 'test',
        expiresAt: new Date(Date.now() + 86400000),
      },
    ])
  })

  // 1. Uploads: PDF & Images
  it('uploads and serves PDF and image files with correct MIME types', async () => {
    // A. Upload PDF
    const pdfContent = '%PDF-1.4 sample pdf content for test'
    const pdfBlob = new Blob([pdfContent], { type: 'application/pdf' })
    const pdfForm = new FormData()
    pdfForm.append('file', pdfBlob, 'ciencias_guia.pdf')

    const uploadRes = await app.request('/api/uploads', {
      method: 'POST',
      headers: { Cookie: `session=${teacherToken}` },
      body: pdfForm,
    })

    expect(uploadRes.status).toBe(201)
    const uploadData = (await uploadRes.json()) as any
    expect(uploadData.url).toContain('/api/uploads/')
    expect(uploadData.mimeType).toBe('application/pdf')

    // B. Serve PDF
    const serveRes = await app.request(uploadData.url, {
      method: 'GET',
    })
    expect(serveRes.status).toBe(200)
    expect(serveRes.headers.get('Content-Type')).toBe('application/pdf')
    expect(serveRes.headers.get('Content-Disposition')).toContain('inline')

    // C. Upload PNG Image
    const imgBlob = new Blob(['PNG_MOCK_IMAGE_DATA'], { type: 'image/png' })
    const imgForm = new FormData()
    imgForm.append('file', imgBlob, 'diagrama_celula.png')

    const imgUploadRes = await app.request('/api/uploads', {
      method: 'POST',
      headers: { Cookie: `session=${teacherToken}` },
      body: imgForm,
    })
    expect(imgUploadRes.status).toBe(201)
    const imgData = (await imgUploadRes.json()) as any
    expect(imgData.mimeType).toBe('image/png')

    const imgServeRes = await app.request(imgData.url)
    expect(imgServeRes.status).toBe(200)
    expect(imgServeRes.headers.get('Content-Type')).toBe('image/png')
  })

  // 2. Classes CRUD
  it('creates, updates and deletes classes', async () => {
    // Create
    const createRes = await app.request('/api/classes', {
      method: 'POST',
      headers: {
        Cookie: `session=${teacherToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Física Cuántica 3ero' }),
    })
    expect(createRes.status).toBe(201)
    const createData = (await createRes.json()) as any
    classId = createData.class.id
    expect(createData.class.name).toBe('Física Cuántica 3ero')

    // Update
    const updateRes = await app.request(`/api/classes/${classId}`, {
      method: 'PATCH',
      headers: {
        Cookie: `session=${teacherToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Física y Química 3ero A' }),
    })
    expect(updateRes.status).toBe(200)

    // Add Student to Class
    const addMemberRes = await app.request(`/api/classes/${classId}/members`, {
      method: 'POST',
      headers: {
        Cookie: `session=${teacherToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userIds: [studentId] }),
    })
    expect(addMemberRes.status).toBe(200)
  })

  // 3. Lessons & Exercises CRUD
  it('creates, updates and manages lessons and exercises', async () => {
    // Create Lesson with rich material
    const createRes = await app.request(`/api/groups/${classId}/lessons`, {
      method: 'POST',
      headers: {
        Cookie: `session=${teacherToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Leyes de Newton y Cinemática',
        materialContent:
          'La primera ley de Newton establece que todo cuerpo permanece en reposo o movimiento rectilíneo uniforme...',
        lang: 'es',
      }),
    })
    expect(createRes.status).toBe(201)
    const createData = (await createRes.json()) as any
    lessonId = createData.lesson.id

    // Update Lesson
    const updateRes = await app.request(`/api/groups/${classId}/lessons/${lessonId}`, {
      method: 'PATCH',
      headers: {
        Cookie: `session=${teacherToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Dinámica Clásica: Las 3 Leyes de Newton',
      }),
    })
    expect(updateRes.status).toBe(200)

    // Add Exercise
    const addExRes = await app.request(`/api/lessons/${lessonId}/exercises`, {
      method: 'POST',
      headers: {
        Cookie: `session=${teacherToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'mc',
        prompt: '¿Qué mide la segunda ley de Newton?',
        optionsJson: JSON.stringify(['Fuerza (F=ma)', 'Energía', 'Temperatura', 'Velocidad']),
        answerJson: JSON.stringify({ correctIndex: 0 }),
        points: 2,
        timeSec: 30,
        sortOrder: 1,
      }),
    })
    expect(addExRes.status).toBe(201)
    const exData = (await addExRes.json()) as any
    exerciseId = exData.exercise.id

    // Update Exercise
    const putExRes = await app.request(`/api/exercises/${exerciseId}`, {
      method: 'PUT',
      headers: {
        Cookie: `session=${teacherToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: '¿Cuál es la fórmula de la Segunda Ley de Newton?',
        points: 3,
      }),
    })
    expect(putExRes.status).toBe(200)

    // Publish Lesson
    const pubRes = await app.request(`/api/lessons/${lessonId}/publish`, {
      method: 'POST',
      headers: { Cookie: `session=${teacherToken}` },
    })
    expect(pubRes.status).toBe(200)
  })

  // 4. Homework CRUD
  it('creates, updates and deletes homework', async () => {
    const dueAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    // Create Homework
    const createRes = await app.request(`/api/classes/${classId}/homework`, {
      method: 'POST',
      headers: {
        Cookie: `session=${teacherToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lessonId,
        title: 'Guía de Problemas sobre Newton',
        kind: 'quiz',
        instructions: 'Resuelve todos los ejercicios interactivos',
        dueAt,
        attemptLimit: 3,
      }),
    })
    expect(createRes.status).toBe(201)
    const data = (await createRes.json()) as any
    homeworkId = data.homework.id

    // Update Homework
    const updateRes = await app.request(`/api/classes/${classId}/homework/${homeworkId}`, {
      method: 'PATCH',
      headers: {
        Cookie: `session=${teacherToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Guía Avanzada de Cinemática y Newton',
        kind: 'reading',
      }),
    })
    expect(updateRes.status).toBe(200)

    // List Homework
    const listRes = await app.request(`/api/classes/${classId}/homework`, {
      headers: { Cookie: `session=${teacherToken}` },
    })
    expect(listRes.status).toBe(200)
    const listData = (await listRes.json()) as any
    expect(listData.homework.length).toBeGreaterThan(0)
    expect(listData.homework[0].title).toBe('Guía Avanzada de Cinemática y Newton')
  })

  // 5. Ranking & Leaderboard
  it('calculates and serves global and class leaderboards', async () => {
    const globalRes = await app.request('/api/ranking', {
      headers: { Cookie: `session=${studentToken}` },
    })
    expect(globalRes.status).toBe(200)
    const globalData = (await globalRes.json()) as any
    expect(Array.isArray(globalData.leaderboard)).toBe(true)

    const classRes = await app.request(`/api/classes/${classId}/ranking`, {
      headers: { Cookie: `session=${studentToken}` },
    })
    expect(classRes.status).toBe(200)
    const classData = (await classRes.json()) as any
    expect(Array.isArray(classData.leaderboard)).toBe(true)
  })

  // 6. Active Live Session Filter
  it('filters active live sessions to only return sessions that exist in RoomManager', async () => {
    // When no room is active in RoomManager
    const sessRes1 = await app.request('/api/student/active-sessions', {
      headers: { Cookie: `session=${studentToken}` },
    })
    expect(sessRes1.status).toBe(200)
    const sessData1 = (await sessRes1.json()) as any
    expect(sessData1.sessions.length).toBe(0)

    // Now start a live session
    const launchRes = await app.request('/api/sessions', {
      method: 'POST',
      headers: {
        Cookie: `session=${teacherToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        classId,
        lessonId,
        mode: 'trivia',
      }),
    })
    expect(launchRes.status).toBe(201)
    const launchData = (await launchRes.json()) as any

    // Now student should see the active live session!
    const sessRes2 = await app.request('/api/student/active-sessions', {
      headers: { Cookie: `session=${studentToken}` },
    })
    expect(sessRes2.status).toBe(200)
    const sessData2 = (await sessRes2.json()) as any
    expect(sessData2.sessions.length).toBe(1)
    expect(sessData2.sessions[0].codePin).toBe(launchData.session.pin)

    // Clean up room
    RoomManager.deleteRoom(launchData.session.sessionId)
  })

  // 7. Enforce 1x Points/XP Cap for Readings & Practice Exercises
  it('enforces 1x points cap: rewards points on first completion only', async () => {
    // A. Reading confirmation 1x cap
    const readRes1 = await app.request(`/api/classes/${classId}/lessons/${lessonId}/reading/complete`, {
      method: 'POST',
      headers: { Cookie: `session=${studentToken}` },
    })
    expect(readRes1.status).toBe(200)
    const readData1 = (await readRes1.json()) as any
    expect(readData1.pointsEarned).toBe(100)
    expect(readData1.alreadyCompleted).toBe(false)

    // Repeat reading confirmation -> 0 extra points
    const readRes2 = await app.request(`/api/classes/${classId}/lessons/${lessonId}/reading/complete`, {
      method: 'POST',
      headers: { Cookie: `session=${studentToken}` },
    })
    expect(readRes2.status).toBe(200)
    const readData2 = (await readRes2.json()) as any
    expect(readData2.pointsEarned).toBe(0)
    expect(readData2.alreadyCompleted).toBe(true)

    // B. Practice Exercise 1x cap
    const practiceRes1 = await app.request(`/api/classes/${classId}/lessons/${lessonId}/practice`, {
      method: 'POST',
      headers: {
        Cookie: `session=${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        exerciseId,
        answerJson: JSON.stringify({ correctIndex: 0 }),
        latencyMs: 1500,
      }),
    })
    expect(practiceRes1.status).toBe(200)
    const practiceData1 = (await practiceRes1.json()) as any
    expect(practiceData1.isCorrect).toBe(true)
    expect(practiceData1.pointsEarned).toBeGreaterThan(0)
    expect(practiceData1.alreadyRewarded).toBe(false)

    // Repeat correct practice solve -> 0 extra points (review mode)
    const practiceRes2 = await app.request(`/api/classes/${classId}/lessons/${lessonId}/practice`, {
      method: 'POST',
      headers: {
        Cookie: `session=${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        exerciseId,
        answerJson: JSON.stringify({ correctIndex: 0 }),
        latencyMs: 1000,
      }),
    })
    expect(practiceRes2.status).toBe(200)
    const practiceData2 = (await practiceRes2.json()) as any
    expect(practiceData2.isCorrect).toBe(true)
    expect(practiceData2.pointsEarned).toBe(0)
    expect(practiceData2.alreadyRewarded).toBe(true)
  })

  // 8. Cleanup & Delete endpoints
  it('deletes homework, lesson and class properly', async () => {
    // Delete Homework
    const delHwRes = await app.request(`/api/classes/${classId}/homework/${homeworkId}`, {
      method: 'DELETE',
      headers: { Cookie: `session=${teacherToken}` },
    })
    expect(delHwRes.status).toBe(200)

    // Delete Lesson
    const delLesRes = await app.request(`/api/groups/${classId}/lessons/${lessonId}`, {
      method: 'DELETE',
      headers: { Cookie: `session=${teacherToken}` },
    })
    expect(delLesRes.status).toBe(200)

    // Delete Class
    const delClsRes = await app.request(`/api/classes/${classId}`, {
      method: 'DELETE',
      headers: { Cookie: `session=${teacherToken}` },
    })
    expect(delClsRes.status).toBe(200)
  })
})
