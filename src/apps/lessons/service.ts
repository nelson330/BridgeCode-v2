import type { ExerciseBatchItem, ExerciseCreate } from '@shared/contracts/exercises'
import type { LessonCreate, LessonUpdate } from '@shared/contracts/lessons'
import { and, asc, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { getDb } from '../../core/db/client'
import { auditLogs, courseClasses, exercises, lessons, users } from '../../core/db/schema'
import { AppError } from '../../core/errors'

export class LessonsService {
  static async createLesson(teacherId: string, classId: string, req: LessonCreate) {
    const db = getDb()
    const foundClass = await db
      .select()
      .from(courseClasses)
      .where(and(eq(courseClasses.id, classId), eq(courseClasses.teacherId, teacherId)))
      .limit(1)

    if (foundClass.length === 0 || !foundClass[0]) {
      throw AppError.notFound('Clase no encontrada o sin permisos')
    }

    const lessonId = `lsn_${nanoid(10)}`
    const status = req.status || 'draft'
    await db.insert(lessons).values({
      id: lessonId,
      classId,
      teacherId,
      title: req.title,
      materialContent: req.materialContent || null,
      status,
      lang: req.lang || 'es',
      settingsJson: req.settingsJson || null,
      publishedAt: status === 'published' ? new Date() : null,
    })

    await db.insert(auditLogs).values({
      id: nanoid(),
      actorId: teacherId,
      action: 'LESSON.CREATE',
      entityType: 'LESSON',
      entityId: lessonId,
    })

    return {
      id: lessonId,
      classId,
      teacherId,
      title: req.title,
      status,
      lang: req.lang || 'es',
    }
  }

  static async listLessons(userId: string | undefined, classId: string) {
    const db = getDb()
    if (!userId) {
      return await db
        .select()
        .from(lessons)
        .where(and(eq(lessons.classId, classId), eq(lessons.status, 'published')))
    }

    const foundUser = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    const isStudent = foundUser[0]?.role === 'student'

    if (isStudent) {
      return await db
        .select()
        .from(lessons)
        .where(and(eq(lessons.classId, classId), eq(lessons.status, 'published')))
    }

    return await db.select().from(lessons).where(eq(lessons.classId, classId))
  }

  static async getLesson(_userId: string, lessonId: string) {
    const db = getDb()
    const found = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1)

    if (found.length === 0 || !found[0]) {
      throw AppError.notFound('Lección no encontrada')
    }

    const exerciseList = await db
      .select()
      .from(exercises)
      .where(eq(exercises.lessonId, lessonId))
      .orderBy(asc(exercises.sortOrder))

    return {
      ...found[0],
      exercises: exerciseList,
    }
  }

  static async updateLesson(teacherId: string, lessonId: string, req: LessonUpdate) {
    const db = getDb()
    const found = await db
      .select()
      .from(lessons)
      .where(and(eq(lessons.id, lessonId), eq(lessons.teacherId, teacherId)))
      .limit(1)

    if (found.length === 0 || !found[0]) {
      throw AppError.notFound('Lección no encontrada')
    }

    if (req.status === 'published') {
      const exerciseList = await db.select().from(exercises).where(eq(exercises.lessonId, lessonId))
      if (exerciseList.length === 0) {
        throw AppError.badRequest('No se puede publicar una lección sin ejercicios')
      }
    }

    const updates: Record<string, any> = {
      ...(req.title ? { title: req.title } : {}),
      ...(req.materialContent !== undefined ? { materialContent: req.materialContent } : {}),
      ...(req.lang ? { lang: req.lang } : {}),
      ...(req.settingsJson !== undefined ? { settingsJson: req.settingsJson } : {}),
      updatedAt: new Date(),
    }

    if (req.status !== undefined) {
      updates.status = req.status
      updates.publishedAt = req.status === 'published' ? new Date() : null
    }

    await db.update(lessons).set(updates).where(eq(lessons.id, lessonId))

    return { success: true }
  }

  static async publishLesson(teacherId: string, lessonId: string) {
    const db = getDb()
    const found = await db
      .select()
      .from(lessons)
      .where(and(eq(lessons.id, lessonId), eq(lessons.teacherId, teacherId)))
      .limit(1)

    if (found.length === 0 || !found[0]) {
      throw AppError.notFound('Lección no encontrada')
    }

    const exerciseList = await db.select().from(exercises).where(eq(exercises.lessonId, lessonId))
    if (exerciseList.length === 0) {
      throw AppError.badRequest('No se puede publicar una lección sin ejercicios')
    }

    await db
      .update(lessons)
      .set({
        status: 'published',
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(lessons.id, lessonId))

    await db.insert(auditLogs).values({
      id: nanoid(),
      actorId: teacherId,
      action: 'LESSON.PUBLISH',
      entityType: 'LESSON',
      entityId: lessonId,
    })

    return { success: true, status: 'published' }
  }

  static async deleteLesson(teacherId: string, lessonId: string) {
    const db = getDb()
    const found = await db
      .select()
      .from(lessons)
      .where(and(eq(lessons.id, lessonId), eq(lessons.teacherId, teacherId)))
      .limit(1)

    if (found.length === 0 || !found[0]) {
      throw AppError.notFound('Lección no encontrada o sin permisos')
    }

    // Delete exercises
    await db.delete(exercises).where(eq(exercises.lessonId, lessonId))
    // Delete lesson
    await db.delete(lessons).where(eq(lessons.id, lessonId))

    await db.insert(auditLogs).values({
      id: nanoid(),
      actorId: teacherId,
      action: 'LESSON.DELETE',
      entityType: 'LESSON',
      entityId: lessonId,
    })

    return { success: true }
  }

  static async addExercise(teacherId: string, lessonId: string, req: ExerciseCreate) {
    const db = getDb()
    const found = await db
      .select()
      .from(lessons)
      .where(and(eq(lessons.id, lessonId), eq(lessons.teacherId, teacherId)))
      .limit(1)

    if (found.length === 0 || !found[0]) {
      throw AppError.notFound('Lección no encontrada')
    }

    const exerciseId = `ex_${nanoid(10)}`
    await db.insert(exercises).values({
      id: exerciseId,
      lessonId,
      type: req.type,
      prompt: req.prompt,
      mediaUrl: req.mediaUrl || null,
      optionsJson: req.optionsJson || null,
      answerJson: req.answerJson,
      explanation: req.explanation || null,
      points: req.points,
      timeSec: req.timeSec,
      sortOrder: req.sortOrder,
    })

    return {
      id: exerciseId,
      lessonId,
      ...req,
    }
  }

  static async addExercisesBatch(teacherId: string, lessonId: string, exercisesList: ExerciseBatchItem[]) {
    const db = getDb()
    const found = await db
      .select()
      .from(lessons)
      .where(and(eq(lessons.id, lessonId), eq(lessons.teacherId, teacherId)))
      .limit(1)

    if (found.length === 0 || !found[0]) {
      throw AppError.notFound('Lección no encontrada')
    }

    if (!Array.isArray(exercisesList) || exercisesList.length === 0) {
      throw AppError.badRequest('No se proporcionaron ejercicios para agregar')
    }

    const inserted: any[] = []
    for (let i = 0; i < exercisesList.length; i++) {
      const ex = exercisesList[i]
      if (!ex) continue
      const exerciseId = `ex_${nanoid(10)}`

      const optionsJson =
        ex.optionsJson != null
          ? typeof ex.optionsJson === 'object'
            ? JSON.stringify(ex.optionsJson)
            : String(ex.optionsJson)
          : null

      const answerJson =
        ex.answerJson != null
          ? typeof ex.answerJson === 'object'
            ? JSON.stringify(ex.answerJson)
            : String(ex.answerJson)
          : ''

      await db.insert(exercises).values({
        id: exerciseId,
        lessonId,
        type: ex.type || 'mc',
        prompt: ex.prompt,
        mediaUrl: ex.mediaUrl || null,
        optionsJson,
        answerJson,
        explanation: ex.explanation || null,
        points: ex.points ?? 1,
        timeSec: ex.timeSec ?? 30,
        sortOrder: ex.sortOrder ?? i,
      })

      inserted.push({
        id: exerciseId,
        lessonId,
        type: ex.type || 'mc',
        prompt: ex.prompt,
        mediaUrl: ex.mediaUrl || null,
        optionsJson,
        answerJson,
        explanation: ex.explanation || null,
        points: ex.points ?? 1,
        timeSec: ex.timeSec ?? 30,
        sortOrder: ex.sortOrder ?? i,
      })
    }

    await db.insert(auditLogs).values({
      id: nanoid(),
      actorId: teacherId,
      action: 'EXERCISE.BATCH_CREATE',
      entityType: 'LESSON',
      entityId: lessonId,
    })

    return { count: inserted.length, exercises: inserted }
  }

  static async updateExercise(_teacherId: string, exerciseId: string, req: Partial<ExerciseCreate>) {
    const db = getDb()
    await db
      .update(exercises)
      .set({
        ...(req.prompt ? { prompt: req.prompt } : {}),
        ...(req.type ? { type: req.type } : {}),
        ...(req.optionsJson !== undefined ? { optionsJson: req.optionsJson } : {}),
        ...(req.answerJson ? { answerJson: req.answerJson } : {}),
        ...(req.explanation !== undefined ? { explanation: req.explanation } : {}),
        ...(req.points !== undefined ? { points: req.points } : {}),
        ...(req.timeSec !== undefined ? { timeSec: req.timeSec } : {}),
        ...(req.sortOrder !== undefined ? { sortOrder: req.sortOrder } : {}),
        updatedAt: new Date(),
      })
      .where(eq(exercises.id, exerciseId))

    return { success: true }
  }

  static async getLessonExercises(lessonId: string) {
    const db = getDb()
    const list = await db
      .select()
      .from(exercises)
      .where(eq(exercises.lessonId, lessonId))
      .orderBy(exercises.sortOrder)
    return list
  }

  static async deleteExercise(_teacherId: string, exerciseId: string) {
    const db = getDb()
    await db.delete(exercises).where(eq(exercises.id, exerciseId))
    return { success: true }
  }
}
