import { beforeEach, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import { DEMO_CLASS_ID, SEED_KEY, runDatabaseSeed } from '../../scripts/seed'
import { ExerciseCreateSchema, isAnswerCorrect } from '../../shared/contracts/exercises'
import { loadConfig } from '../../src/core/config'
import { getDb, initDb } from '../../src/core/db/client'
import {
  appSettings,
  courseClasses,
  exercises,
  groupMembers,
  lessons,
  teacherProfiles,
  users,
} from '../../src/core/db/schema'
import { hashPassword, verifyPassword } from '../../src/core/security/crypto'

describe('Initial history seed', () => {
  beforeEach(() => {
    loadConfig({})
    initDb(':memory:')
  })
  it('publishes three sourced lessons and 18 valid exercises for eight enrolled students', async () => {
    await runDatabaseSeed()
    const db = getDb()
    expect(db.select().from(users).all()).toHaveLength(10)
    expect(db.select().from(groupMembers).all()).toHaveLength(8)
    expect(db.select().from(courseClasses).all()).toHaveLength(1)
    const seededLessons = db.select().from(lessons).all()
    expect(seededLessons).toHaveLength(3)
    expect(db.select().from(exercises).all()).toHaveLength(18)
    for (const lesson of seededLessons) {
      expect(lesson.status).toBe('published')
      expect(lesson.materialContent).toContain('INATEC')
      expect(lesson.materialContent).toContain('enero de 2025')
      const items = db.select().from(exercises).where(eq(exercises.lessonId, lesson.id)).all()
      expect(items.filter((item) => item.type === 'mc')).toHaveLength(4)
      expect(items.filter((item) => item.type === 'tf')).toHaveLength(2)
      expect(items.map((item) => item.sortOrder).sort()).toEqual([0, 1, 2, 3, 4, 5])
      for (const item of items) {
        expect(ExerciseCreateSchema.safeParse(item).success).toBe(true)
        expect(item.timeSec).toBe(30)
        expect(item.explanation).toContain('INATEC')
        expect(isAnswerCorrect(item.type, item.answerJson, item.answerJson)).toBe(true)
        if (item.type === 'mc') expect(JSON.parse(item.optionsJson!).length).toBe(4)
      }
    }
  })
  it('does not reseed edits or recreate intentionally deleted demo content', async () => {
    await runDatabaseSeed()
    const db = getDb()
    const lesson = db.select().from(lessons).get()!
    db.update(lessons).set({ title: 'Adaptada por el docente' }).where(eq(lessons.id, lesson.id)).run()
    db.delete(exercises).where(eq(exercises.lessonId, lesson.id)).run()
    await runDatabaseSeed()
    expect(db.select().from(lessons).where(eq(lessons.id, lesson.id)).get()!.title).toBe(
      'Adaptada por el docente'
    )
    expect(db.select().from(exercises).where(eq(exercises.lessonId, lesson.id)).all()).toHaveLength(0)
    expect(db.select().from(groupMembers).all()).toHaveLength(8)
  })
  it('preserves an existing teacher, profile, password and unrelated class', async () => {
    const db = getDb()
    const passwordHash = await hashPassword('existing-secret')
    db.insert(users)
      .values({
        id: 'existing-teacher',
        username: 'docente',
        displayName: 'Docente existente',
        role: 'teacher',
        passwordHash,
      })
      .run()
    db.insert(teacherProfiles)
      .values({ id: 'existing-profile', userId: 'existing-teacher', bio: 'Mi perfil' })
      .run()
    db.insert(courseClasses)
      .values({ id: 'existing-class', teacherId: 'existing-teacher', name: 'Mi clase', code: 'EXISTING' })
      .run()
    await runDatabaseSeed()
    expect(
      await verifyPassword(
        'existing-secret',
        db.select().from(users).where(eq(users.username, 'docente')).get()!.passwordHash
      )
    ).toBe(true)
    expect(db.select().from(teacherProfiles).get()!.bio).toBe('Mi perfil')
    expect(db.select().from(courseClasses).all()).toHaveLength(2)
    expect(db.select().from(courseClasses).where(eq(courseClasses.id, DEMO_CLASS_ID)).get()!.teacherId).toBe(
      'existing-teacher'
    )
  })
  it('rolls back every insert on failure, leaving startup able to retry', async () => {
    const { sqlite } = initDb(':memory:')
    sqlite.exec(
      "CREATE TRIGGER fail_seed BEFORE INSERT ON exercises BEGIN SELECT RAISE(ABORT, 'simulated seed failure'); END"
    )
    await expect(runDatabaseSeed()).rejects.toThrow('simulated seed failure')
    const db = getDb()
    expect(db.select().from(users).all()).toHaveLength(0)
    expect(db.select().from(lessons).all()).toHaveLength(0)
    expect(db.select().from(appSettings).where(eq(appSettings.key, SEED_KEY)).get()).toBeUndefined()
    sqlite.exec('DROP TRIGGER fail_seed')
    await runDatabaseSeed()
    expect(db.select().from(exercises).all()).toHaveLength(18)
  })
  it('serializes overlapping initializations without duplicate accounts', async () => {
    await Promise.all([runDatabaseSeed(), runDatabaseSeed()])
    expect(getDb().select().from(users).all()).toHaveLength(10)
    expect(getDb().select().from(groupMembers).all()).toHaveLength(8)
  })
})
