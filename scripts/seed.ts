import { randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { loadConfig } from '../src/core/config'
import { getDb, initDb } from '../src/core/db/client'
import {
  appSettings,
  courseClasses,
  exercises,
  groupMembers,
  homework,
  instanceMeta,
  lessons,
  teacherProfiles,
  users,
  wallPosts,
} from '../src/core/db/schema'
import { hashPassword } from '../src/core/security/crypto'
import { demoStudents, historyLessons } from './demo/history-identity'

export const SEED_KEY = 'seed.history_identity.v1'
export const DEMO_CLASS_ID = 'cls_historia_identidad'
export const DEMO_TEACHER_CREDENTIALS = { username: 'docente', password: 'docente123' } as const
const testHashes = new Map<string, Promise<string>>()
function prepareHash(password: string) {
  if (process.env.NODE_ENV !== 'test') return hashPassword(password)
  if (!testHashes.has(password)) testHashes.set(password, hashPassword(password))
  return testHashes.get(password)!
}

/** Hash outside the synchronous SQLite transaction; publish credentials only after commit. */
export async function runDatabaseSeed() {
  const db = getDb()
  if (db.select().from(appSettings).where(eq(appSettings.key, SEED_KEY)).get()) return
  const accounts = [
    {
      id: 'usr_webmaster_01',
      username: 'webmaster',
      displayName: 'Webmaster Principal',
      role: 'webmaster' as const,
    },
    {
      id: 'usr_docente_01',
      username: DEMO_TEACHER_CREDENTIALS.username,
      displayName: 'Prof. Alejandro Vargas',
      role: 'teacher' as const,
    },
    ...demoStudents.map(([username, displayName], index) => ({
      id: `usr_identidad_${index + 1}`,
      username,
      displayName,
      role: 'student' as const,
    })),
  ]
  const credentials: { username: string; password: string; role: string }[] = []
  const prepared = await Promise.all(
    accounts.map(async (account) => {
      const existing = db.select().from(users).where(eq(users.username, account.username)).get()
      if (existing)
        return { ...account, id: existing.id, passwordHash: existing.passwordHash, existing: true }
      const password =
        account.role === 'teacher'
          ? DEMO_TEACHER_CREDENTIALS.password
          : process.env.NODE_ENV === 'test'
            ? account.role === 'webmaster'
              ? 'admin123'
              : 'alumno123'
            : randomBytes(12).toString('base64url')
      const passwordHash = await prepareHash(password)
      credentials.push({ username: account.username, password, role: account.role })
      return { ...account, passwordHash, existing: false }
    })
  )
  let committed = false
  db.transaction((tx) => {
    if (tx.select().from(appSettings).where(eq(appSettings.key, SEED_KEY)).get()) return
    for (const account of prepared) {
      if (!account.existing)
        tx.insert(users)
          .values({
            id: account.id,
            username: account.username,
            displayName: account.displayName,
            role: account.role,
            passwordHash: account.passwordHash,
            status: 'active',
          })
          .run()
    }
    const teacher = prepared.find((account) => account.role === 'teacher')!
    if (!tx.select().from(teacherProfiles).where(eq(teacherProfiles.userId, teacher.id)).get()) {
      tx.insert(teacherProfiles)
        .values({
          id: 'tp_docente_01',
          userId: teacher.id,
          bio: 'Docente de Historia e Identidad Nacional',
          locale: 'es',
        })
        .run()
    }
    tx.insert(courseClasses)
      .values({
        id: DEMO_CLASS_ID,
        teacherId: teacher.id,
        name: 'Historia e Identidad Nacional',
        code: 'HIN001',
      })
      .onConflictDoNothing()
      .run()
    for (const account of prepared.filter((account) => account.role === 'student')) {
      tx.insert(groupMembers)
        .values({ id: `gm_identidad_${account.username}`, classId: DEMO_CLASS_ID, userId: account.id })
        .onConflictDoNothing()
        .run()
    }
    for (const lesson of historyLessons) {
      tx.insert(lessons)
        .values({
          id: lesson.id,
          classId: DEMO_CLASS_ID,
          teacherId: teacher.id,
          title: lesson.title,
          materialContent: lesson.materialContent,
          status: 'published',
          publishedAt: new Date(),
          lang: 'es',
        })
        .onConflictDoNothing()
        .run()
      for (const [index, exercise] of lesson.exercises.entries()) {
        tx.insert(exercises)
          .values({ ...exercise, id: `${lesson.id}_ex_${index + 1}`, lessonId: lesson.id, sortOrder: index })
          .onConflictDoNothing()
          .run()
      }
    }
    tx.insert(homework)
      .values({
        id: 'hw_identidad_01',
        classId: DEMO_CLASS_ID,
        lessonId: historyLessons[0].id,
        title: 'Tarea 1: Nuestra historia e identidad',
        dueAt: new Date(Date.now() + 7 * 86400000),
        attemptLimit: 3,
        allowAfterDue: true,
      })
      .onConflictDoNothing()
      .run()
    tx.insert(wallPosts)
      .values({
        id: 'wp_identidad_bienvenida',
        classId: DEMO_CLASS_ID,
        authorId: teacher.id,
        content:
          'Bienvenidos a Historia e Identidad Nacional. Explora las tres unidades del manual de INATEC y participa en las actividades.',
        pinned: true,
      })
      .onConflictDoNothing()
      .run()
    tx.insert(instanceMeta)
      .values({ id: 'meta_01', version: '1.0.0', mode: 'online' })
      .onConflictDoNothing()
      .run()
    tx.insert(appSettings)
      .values({ key: SEED_KEY, valueJson: JSON.stringify({ completed: true, version: 1 }) })
      .run()
    committed = true
  })
  if (committed && credentials.length && process.env.NODE_ENV !== 'test') {
    console.log('[seed] Nuevas cuentas. Guarda estas credenciales; se muestran una sola vez:')
    console.table(credentials)
  }
}
if (import.meta.main) {
  loadConfig()
  initDb()
  runDatabaseSeed()
    .then(() => console.log('Semilla inicial lista.'))
    .catch((error) => {
      console.error('Error al ejecutar semilla:', error)
      process.exitCode = 1
    })
}
