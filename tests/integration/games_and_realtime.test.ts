import { beforeEach, describe, expect, it } from 'bun:test'
import { AuthService } from '../../src/apps/auth/service'
import { GameRoom, RoomManager } from '../../src/apps/games/room'
import { calculateScore, isAnswerCorrect } from '../../src/apps/games/scoring'
import { loadConfig } from '../../src/core/config'
import { getDb, initDb } from '../../src/core/db/client'
import { courseClasses, exercises, lessons, liveSessions, users } from '../../src/core/db/schema'
import { createHttpApp } from '../../src/core/http/app'

describe('GameRoom Realtime, 4 Mechanics & Anti-cheat (Fase 4)', () => {
  beforeEach(() => {
    loadConfig({ MODE: 'local' })
    initDb(':memory:')
  })

  it('calculates score with speed decay and streak multiplier correctly', () => {
    // 1. Instant correct answer (0ms latency on 30s question): Max speed (1.0)
    const res1 = calculateScore(1, 30, 0, 0, true)
    expect(res1.pointsEarned).toBe(100)
    expect(res1.newStreak).toBe(1)
    expect(res1.multiplier).toBe(1.0)

    // 2. Fast answer with streak 4 (multiplier x2.0)
    const res2 = calculateScore(1, 30, 5000, 4, true)
    expect(res2.pointsEarned).toBeGreaterThan(150)
    expect(res2.newStreak).toBe(5)
    expect(res2.multiplier).toBe(2.0)

    // 3. Incorrect answer resets streak
    const res3 = calculateScore(1, 30, 2000, 5, false)
    expect(res3.pointsEarned).toBe(0)
    expect(res3.newStreak).toBe(0)
  })

  it('validates answer correctness across exercise types', () => {
    // Multiple Choice
    expect(isAnswerCorrect('mc', '{"correctIndex": 2}', '{"correctIndex": 2}')).toBe(true)
    expect(isAnswerCorrect('mc', '{"correctIndex": 1}', '{"correctIndex": 2}')).toBe(false)

    // True/False
    expect(isAnswerCorrect('tf', '{"isTrue": true}', '{"isTrue": true}')).toBe(true)
    expect(isAnswerCorrect('tf', '{"isTrue": false}', '{"isTrue": true}')).toBe(false)

    // Fill in the blank (supports validAnswers array and case-insensitivity)
    expect(
      isAnswerCorrect(
        'fill',
        '{"text": "Fotosíntesis"}',
        '{"validAnswers": ["fotosíntesis", "fotosintesis"]}'
      )
    ).toBe(true)
    expect(
      isAnswerCorrect(
        'fill',
        '{"text": "fotosintesis"}',
        '{"validAnswers": ["fotosíntesis", "fotosintesis"]}'
      )
    ).toBe(true)
    expect(isAnswerCorrect('fill', '{"text": "Oxígeno"}', '{"validAnswers": ["fotosíntesis"]}')).toBe(false)

    // Ordering (supports correctOrder array)
    expect(isAnswerCorrect('order', '{"correctOrder": [0,1,2]}', '{"correctOrder": [0,1,2]}')).toBe(true)
    expect(isAnswerCorrect('order', '{"correctOrder": [1,0,2]}', '{"correctOrder": [0,1,2]}')).toBe(false)

    // Match pairs
    expect(
      isAnswerCorrect(
        'match',
        '{"pairs": [{"left": "Mercurio", "right": "1er Planeta"}, {"left": "Venus", "right": "2do Planeta"}]}',
        '{"pairs": [{"left": "Mercurio", "right": "1er Planeta"}, {"left": "Venus", "right": "2do Planeta"}]}'
      )
    ).toBe(true)

    // Open / short question keyword validation
    expect(
      isAnswerCorrect(
        'open',
        '{"text": "La gravedad atrae los cuerpos hacia el centro"}',
        '{"keywords": ["gravedad", "atrae"]}'
      )
    ).toBe(true)
    expect(isAnswerCorrect('open', '{"text": "No sé nada"}', '{"keywords": ["gravedad"]}')).toBe(false)

    // Type Answer (case-insensitive by default)
    expect(
      isAnswerCorrect('type_answer', '{"text": "Fotosíntesis"}', '{"validAnswers": ["fotosíntesis"], "caseSensitive": false}')
    ).toBe(true)
    expect(
      isAnswerCorrect('type_answer', '{"text": "FOTOSÍNTESIS"}', '{"validAnswers": ["fotosíntesis"], "caseSensitive": false}')
    ).toBe(true)
    expect(
      isAnswerCorrect('type_answer', '{"text": "Oxígeno"}', '{"validAnswers": ["fotosíntesis"], "caseSensitive": false}')
    ).toBe(false)

    // Slider (within tolerance)
    expect(isAnswerCorrect('slider', '{"value": 42}', '{"correctValue": 42, "tolerance": 5}')).toBe(true)
    expect(isAnswerCorrect('slider', '{"value": 45}', '{"correctValue": 42, "tolerance": 5}')).toBe(true)
    expect(isAnswerCorrect('slider', '{"value": 50}', '{"correctValue": 42, "tolerance": 5}')).toBe(false)

    // Pin Drop (within tolerance pixels)
    expect(isAnswerCorrect('pin_drop', '{"x": 100, "y": 100}', '{"correctX": 100, "correctY": 100, "tolerancePx": 50}')).toBe(true)
    expect(isAnswerCorrect('pin_drop', '{"x": 120, "y": 130}', '{"correctX": 100, "correctY": 100, "tolerancePx": 50}')).toBe(true)
    expect(isAnswerCorrect('pin_drop', '{"x": 200, "y": 200}', '{"correctX": 100, "correctY": 100, "tolerancePx": 50}')).toBe(false)

    // Word Cloud (always true - non-competitive)
    expect(isAnswerCorrect('word_cloud', '{"text": "célula"}', '{"sampleWords": ["célula", "mitocondria"]}')).toBe(true)

    // Slide (always true - informational)
    expect(isAnswerCorrect('slide', '{}', '{"durationSec": 8}')).toBe(true)

    // Race mode scoring (no streak bonus)
    const raceRes = calculateScore(1, 30, 5000, 4, true, 'race')
    expect(raceRes.pointsEarned).toBeGreaterThan(0)
    expect(raceRes.multiplier).toBe(1.0) // No streak bonus in race mode

    // Points multiplier
    const multRes = calculateScore(1, 30, 0, 0, true, 'classic', 2)
    expect(multRes.pointsEarned).toBe(200) // 100 * 2
    expect(multRes.multiplier).toBe(2.0)
  })

  it('manages real-time room lifecycle: join, start, submit answer, roulette, finish', async () => {
    const db = getDb()
    await db.insert(users).values({
      id: 'usr_t1',
      username: 'profe1',
      displayName: 'Profesor 1',
      passwordHash: 'hash',
      role: 'teacher',
    })
    await db.insert(courseClasses).values({
      id: 'cls_t1',
      teacherId: 'usr_t1',
      name: 'Geografía',
      code: 'GEO101',
    })
    await db.insert(lessons).values({
      id: 'lsn_1',
      classId: 'cls_t1',
      teacherId: 'usr_t1',
      title: 'Capitales',
      status: 'published',
    })
    await db.insert(exercises).values({
      id: 'ex_1',
      lessonId: 'lsn_1',
      type: 'mc',
      prompt: '¿Cuál es la capital de Francia?',
      optionsJson: JSON.stringify(['Madrid', 'París', 'Berlín', 'Roma']),
      answerJson: JSON.stringify({ correctIndex: 1 }),
      points: 2,
      timeSec: 15,
    })
    await db.insert(liveSessions).values({
      id: 'ses_test_1',
      classId: 'cls_t1',
      lessonId: 'lsn_1',
      teacherId: 'usr_t1',
      codePin: '123456',
      status: 'lobby',
      mode: 'roulette',
    })

    const mockExercises = [
      {
        id: 'ex_1',
        lessonId: 'lsn_1',
        type: 'mc',
        prompt: '¿Cuál es la capital de Francia?',
        optionsJson: JSON.stringify(['Madrid', 'París', 'Berlín', 'Roma']),
        answerJson: JSON.stringify({ correctIndex: 1 }),
        points: 2,
        timeSec: 15,
      },
    ]

    const room = RoomManager.createRoom('ses_test_1', '123456', 'roulette', mockExercises)
    expect(room.pin).toBe('123456')

    // Mock client sockets
    const messagesReceived1: any[] = []
    const socket1 = {
      send: (data: string) => messagesReceived1.push(JSON.parse(data)),
      close: () => {},
    }

    const messagesReceived2: any[] = []
    const socket2 = {
      send: (data: string) => messagesReceived2.push(JSON.parse(data)),
      close: () => {},
    }

    // 1. Join room
    const p1Id = room.addParticipant(socket1, 'Estudiante Ana')
    const _p2Id = room.addParticipant(socket2, 'Estudiante Bruno')
    expect(room.participants.size).toBe(2)

    // 2. Spin roulette
    const selectedIdx = room.spinRoulette()
    expect(selectedIdx).toBeGreaterThanOrEqual(0)
    expect(selectedIdx).toBeLessThanOrEqual(1)

    // 3. Start game (skip countdown for test speed)
    room.startGame(true)
    expect(room.status).toBe('active')
    expect(room.currentExerciseIndex).toBe(0)

    // 4. Submit answer
    await room.submitAnswer(p1Id, JSON.stringify({ correctIndex: 1 }), 2000)
    const p1 = room.participants.get(p1Id)!
    expect(p1.hasAnswered).toBe(true)
    expect(p1.lastAnswerCorrect).toBe(true)
    expect(p1.score).toBeGreaterThan(0)

    // 5. Finish game
    await room.finishGame()
    expect(room.status).toBe('finished')
  })

  it('creates live session via HTTP API and starts it', async () => {
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
      body: JSON.stringify({ name: 'Geografía 1ro' }),
    })
    const classId = ((await classRes.json()) as any).class.id

    // Create Lesson
    const lessonRes = await app.request(`/api/groups/${classId}/lessons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ title: 'Ríos y Montañas' }),
    })
    const lessonId = ((await lessonRes.json()) as any).lesson.id

    // Add Exercise
    await app.request(`/api/lessons/${lessonId}/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        type: 'tf',
        prompt: 'El río Amazonas es el más caudaloso del mundo.',
        optionsJson: JSON.stringify(['Verdadero', 'Falso']),
        answerJson: JSON.stringify({ isTrue: true }),
        points: 1,
        timeSec: 20,
      }),
    })

    // Publish Lesson
    await app.request(`/api/lessons/${lessonId}/publish`, {
      method: 'POST',
      headers: { Cookie: cookie },
    })

    // Create Live Session
    const sessionRes = await app.request('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        classId,
        lessonId,
        mode: 'trivia',
      }),
    })
    expect(sessionRes.status).toBe(201)
    const sessionData = (await sessionRes.json()) as any
    const sessionId = sessionData.session.sessionId
    expect(sessionData.session.pin).toBeDefined()

    // Start Live Session
    const startRes = await app.request(`/api/sessions/${sessionId}/start`, {
      method: 'POST',
      headers: { Cookie: cookie },
    })
    expect(startRes.status).toBe(200)

    // Report Anti-cheat Event
    const anticheatRes = await app.request(`/api/sessions/${sessionId}/anticheat-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        type: 'FOCUS_LOST',
        detail: { tabSwitchedCount: 1 },
      }),
    })
    expect(anticheatRes.status).toBe(200)

    // Finish Live Session
    const finishRes = await app.request(`/api/sessions/${sessionId}/finish`, {
      method: 'POST',
      headers: { Cookie: cookie },
    })
    expect(finishRes.status).toBe(200)
  })

  it('handles Datashow Host Observer (HOST_JOIN), real-time ANSWER_STATS, and late student join', async () => {
    const db = getDb()
    await db.insert(users).values({
      id: 'usr_t_sync',
      username: 'profe_sync',
      displayName: 'Profesor Sync',
      passwordHash: 'hash',
      role: 'teacher',
    })
    await db.insert(courseClasses).values({
      id: 'cls_sync_1',
      teacherId: 'usr_t_sync',
      name: 'Geografía Sync',
      code: 'GEOSYNC',
    })
    await db.insert(lessons).values({
      id: 'lsn_sync_1',
      classId: 'cls_sync_1',
      teacherId: 'usr_t_sync',
      title: 'Geografía Mundial',
      status: 'published',
    })
    await db.insert(exercises).values({
      id: 'ex_geo_1',
      lessonId: 'lsn_sync_1',
      type: 'mc',
      prompt: '¿En qué continente está Egipto?',
      optionsJson: JSON.stringify(['África', 'Asia', 'Europa', 'América']),
      answerJson: JSON.stringify({ correctIndex: 0 }),
      points: 2,
      timeSec: 20,
    })
    await db.insert(liveSessions).values({
      id: 'ses_sync_test',
      classId: 'cls_sync_1',
      lessonId: 'lsn_sync_1',
      teacherId: 'usr_t_sync',
      codePin: '778899',
      status: 'lobby',
      mode: 'trivia',
    })

    const mockExercises = [
      {
        id: 'ex_geo_1',
        lessonId: 'lsn_sync_1',
        type: 'mc',
        prompt: '¿En qué continente está Egipto?',
        optionsJson: JSON.stringify(['África', 'Asia', 'Europa', 'América']),
        answerJson: JSON.stringify({ correctIndex: 0 }),
        points: 2,
        timeSec: 20,
      },
    ]

    const room = RoomManager.createRoom('ses_sync_test', '778899', 'trivia', mockExercises)

    // 1. Datashow connects as Host Observer
    const hostMessages: any[] = []
    const hostSocket = {
      send: (data: string) => hostMessages.push(JSON.parse(data)),
      close: () => {},
    }

    room.addHostSocket(hostSocket)
    expect(room.hostSockets.size).toBe(1)
    expect(hostMessages[0].type).toBe('PARTICIPANT_LIST')
    expect(hostMessages[1].type).toBe('ANSWER_STATS')
    expect(hostMessages[1].totalParticipants).toBe(0)

    // 2. Student 1 joins before game starts
    const student1Messages: any[] = []
    const student1Socket = {
      send: (data: string) => student1Messages.push(JSON.parse(data)),
      close: () => {},
    }

    const p1Id = room.addParticipant(student1Socket, 'Sofía García')
    expect(student1Messages[0].type).toBe('ROOM_JOINED')
    expect(student1Messages[0].status).toBe('lobby')

    // Host should have received updated PARTICIPANT_LIST and ANSWER_STATS
    const latestHostParticipantMsg = hostMessages.filter((m) => m.type === 'PARTICIPANT_LIST').pop()
    expect(latestHostParticipantMsg.participants.length).toBe(1)
    expect(latestHostParticipantMsg.participants[0].displayName).toBe('Sofía García')

    // 3. Teacher starts the game (skip countdown for test speed)
    room.startGame(true)
    expect(room.status).toBe('active')

    // Both Host and Student receive GAME_STARTED
    const hostGameStarted = hostMessages.filter((m) => m.type === 'GAME_STARTED').pop()
    expect(hostGameStarted).toBeDefined()
    expect(hostGameStarted.currentExercise.prompt).toBe('¿En qué continente está Egipto?')

    const stu1GameStarted = student1Messages.filter((m) => m.type === 'GAME_STARTED').pop()
    expect(stu1GameStarted).toBeDefined()
    expect(stu1GameStarted.currentExercise.prompt).toBe('¿En qué continente está Egipto?')

    // 4. Student 1 submits answer -> Host receives ANSWER_STATS update
    await room.submitAnswer(p1Id, JSON.stringify({ correctIndex: 0 }), 1500)
    const latestAnswerStats = hostMessages.filter((m) => m.type === 'ANSWER_STATS').pop()
    expect(latestAnswerStats.answeredCount).toBe(1)
    expect(latestAnswerStats.totalParticipants).toBe(1)

    // 5. Student 2 connects AFTER game is already active (Late / Reload)
    const student2Messages: any[] = []
    const student2Socket = {
      send: (data: string) => student2Messages.push(JSON.parse(data)),
      close: () => {},
    }

    const _p2Id = room.addParticipant(student2Socket, 'Carlos Ruiz')
    const stu2JoinedMsg = student2Messages[0]
    expect(stu2JoinedMsg.type).toBe('ROOM_JOINED')
    expect(stu2JoinedMsg.status).toBe('active')
    // Active exercise MUST be immediately provided to late student
    expect(stu2JoinedMsg.currentExercise).toBeDefined()
    expect(stu2JoinedMsg.currentExercise.prompt).toBe('¿En qué continente está Egipto?')

    // Cleanup
    RoomManager.deleteRoom('ses_sync_test')
  })
})
