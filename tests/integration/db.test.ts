import { describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import { closeDb, createTestDb, getDb, getRawDb, initDb } from '../../src/core/db/client'
import { courseClasses, exercises, getSchemaTableNames, lessons, users } from '../../src/core/db/schema'

describe('Database Schema & ORM', () => {
  const { db } = createTestDb()

  it('verifies table names in schema', () => {
    const tableNames = getSchemaTableNames()
    expect(tableNames).toContain('users')
    expect(tableNames).toContain('lessons')
    expect(tableNames).toContain('live_sessions')
  })

  it('inserts and queries a user with typed Drizzle ORM', async () => {
    await db.insert(users).values({
      id: 'usr_test_1',
      username: 'profe_alberto',
      displayName: 'Alberto Gómez',
      passwordHash: 'hashed_pw_test',
      role: 'teacher',
      status: 'active',
    })

    const found = await db.select().from(users).where(eq(users.id, 'usr_test_1'))
    expect(found.length).toBe(1)
    expect(found[0]?.username).toBe('profe_alberto')
    expect(found[0]?.role).toBe('teacher')
  })

  it('enforces foreign key constraints and cascade deletes', async () => {
    await db.insert(courseClasses).values({
      id: 'cls_1',
      teacherId: 'usr_test_1',
      name: 'Matemáticas 101',
      code: 'MATH101',
    })

    await db.insert(lessons).values({
      id: 'lsn_1',
      classId: 'cls_1',
      teacherId: 'usr_test_1',
      title: 'Álgebra Básica',
      status: 'draft',
      lang: 'es',
    })

    await db.insert(exercises).values({
      id: 'ex_1',
      lessonId: 'lsn_1',
      type: 'mc',
      prompt: '¿Cuánto es 2 + 2?',
      answerJson: JSON.stringify({ correctIndex: 0 }),
      optionsJson: JSON.stringify(['4', '3', '5']),
      points: 2,
    })

    const exercisesFound = await db.select().from(exercises).where(eq(exercises.id, 'ex_1'))
    expect(exercisesFound.length).toBe(1)

    await db.delete(courseClasses).where(eq(courseClasses.id, 'cls_1'))

    const remainingLessons = await db.select().from(lessons).where(eq(lessons.id, 'lsn_1'))
    expect(remainingLessons.length).toBe(0)

    const remainingExercises = await db.select().from(exercises).where(eq(exercises.id, 'ex_1'))
    expect(remainingExercises.length).toBe(0)
  })

  it('initializes and closes main db connection properly', () => {
    closeDb()
    const activeDb = getDb()
    expect(activeDb).toBeDefined()

    const raw = getRawDb()
    expect(raw).toBeDefined()

    closeDb()
  })
})
