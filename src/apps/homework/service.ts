import type { HomeworkCreate, PracticeAnswer } from '@shared/contracts/homework'
import { and, eq, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { getDb } from '../../core/db/client'
import {
  answers,
  courseClasses,
  exercises,
  groupMembers,
  homework,
  lessons,
  progress,
  users,
} from '../../core/db/schema'
import { AppError } from '../../core/errors'
import { calculateScore, isAnswerCorrect } from '../games/scoring'

export class HomeworkService {
  static async createHomework(_teacherId: string, classId: string, req: HomeworkCreate) {
    const db = getDb()
    const homeworkId = `hw_${nanoid(10)}`
    const dueAt = typeof req.dueAt === 'string' ? new Date(req.dueAt) : req.dueAt

    await db.insert(homework).values({
      id: homeworkId,
      classId,
      lessonId: req.lessonId,
      title: req.title,
      kind: req.kind || 'quiz',
      instructions: req.instructions || null,
      dueAt,
      attemptLimit: req.attemptLimit || null,
      allowAfterDue: req.allowAfterDue,
    })

    return {
      id: homeworkId,
      classId,
      lessonId: req.lessonId,
      title: req.title,
      kind: req.kind || 'quiz',
      instructions: req.instructions,
      dueAt,
    }
  }

  static async listHomework(classId: string) {
    const db = getDb()
    const items = await db
      .select({
        hw: homework,
        lessonTitle: lessons.title,
      })
      .from(homework)
      .innerJoin(lessons, eq(homework.lessonId, lessons.id))
      .where(eq(homework.classId, classId))

    return items.map(({ hw, lessonTitle }) => ({
      ...hw,
      lessonTitle,
    }))
  }

  static async updateHomework(
    _teacherId: string,
    classId: string,
    homeworkId: string,
    req: Partial<HomeworkCreate>
  ) {
    const db = getDb()
    const dueAt = req.dueAt ? (typeof req.dueAt === 'string' ? new Date(req.dueAt) : req.dueAt) : undefined

    await db
      .update(homework)
      .set({
        ...(req.title ? { title: req.title } : {}),
        ...(req.kind ? { kind: req.kind } : {}),
        ...(req.instructions !== undefined ? { instructions: req.instructions } : {}),
        ...(dueAt ? { dueAt } : {}),
        ...(req.attemptLimit !== undefined ? { attemptLimit: req.attemptLimit } : {}),
        ...(req.allowAfterDue !== undefined ? { allowAfterDue: req.allowAfterDue } : {}),
      })
      .where(and(eq(homework.id, homeworkId), eq(homework.classId, classId)))

    return { success: true }
  }

  static async deleteHomework(_teacherId: string, classId: string, homeworkId: string) {
    const db = getDb()
    await db.delete(homework).where(and(eq(homework.id, homeworkId), eq(homework.classId, classId)))
    return { success: true }
  }

  static async submitPracticeAnswer(userId: string, classId: string, lessonId: string, req: PracticeAnswer) {
    const db = getDb()

    // Verify the student is enrolled in the class
    await HomeworkService.assertClassMembership(userId, classId)

    const exercise = await db.select().from(exercises).where(eq(exercises.id, req.exerciseId)).limit(1)
    if (exercise.length === 0 || !exercise[0]) {
      throw AppError.notFound('Ejercicio no encontrado')
    }

    const ex = exercise[0]
    const correct = isAnswerCorrect(ex.type, req.answerJson, ex.answerJson)
    const { pointsEarned: calculatedPoints } = calculateScore(
      ex.points,
      ex.timeSec,
      req.latencyMs,
      0,
      correct
    )

    // Check if student already solved this specific exercise correctly previously
    const priorCorrectAnswers = await db
      .select()
      .from(answers)
      .where(
        and(
          eq(answers.userId, userId),
          eq(answers.exerciseId, req.exerciseId),
          eq(answers.isCorrect, true),
          sql`${answers.answerJson} NOT LIKE '%"type":"reading"%'`
        )
      )
      .limit(1)

    // 1x Reward Cap: Only award points on first correct solve
    const alreadyRewarded = priorCorrectAnswers.length > 0
    const pointsEarned = alreadyRewarded || !correct ? 0 : calculatedPoints

    // Save answer record
    await db.insert(answers).values({
      id: nanoid(),
      exerciseId: ex.id,
      lessonId,
      userId,
      answerJson: req.answerJson,
      isCorrect: correct,
      latencyMs: req.latencyMs,
      pointsEarned,
      kind: 'practice',
    })

    // Update student mastery progress
    const existingProgress = await db
      .select()
      .from(progress)
      .where(
        and(
          eq(progress.userId, userId),
          eq(progress.classId, classId),
          eq(progress.exerciseId, req.exerciseId)
        )
      )
      .limit(1)

    if (existingProgress.length > 0) {
      const p = existingProgress[0]!
      await db
        .update(progress)
        .set({
          attempts: p.attempts + 1,
          bestScore: Math.max(p.bestScore, calculatedPoints),
          bestTimeMs: p.bestTimeMs ? Math.min(p.bestTimeMs, req.latencyMs) : req.latencyMs,
          lastAt: new Date(),
        })
        .where(eq(progress.id, p.id))
    } else {
      await db.insert(progress).values({
        id: `prg_${nanoid(10)}`,
        userId,
        classId,
        lessonId,
        exerciseId: ex.id,
        attempts: 1,
        bestScore: correct ? calculatedPoints : 0,
        bestTimeMs: req.latencyMs,
      })
    }

    return {
      isCorrect: correct,
      pointsEarned,
      alreadyRewarded,
      explanation: ex.explanation,
      correctAnswer: ex.answerJson,
    }
  }

  static async completeReading(userId: string, classId: string, lessonId: string) {
    const db = getDb()

    // Verify the student is enrolled in the class
    await HomeworkService.assertClassMembership(userId, classId)

    // Check if reading was already confirmed previously by this student for this lesson
    const priorReading = await db
      .select()
      .from(answers)
      .where(
        and(
          eq(answers.userId, userId),
          eq(answers.lessonId, lessonId),
          sql`${answers.answerJson} LIKE '%"type":"reading"%'`
        )
      )
      .limit(1)

    if (priorReading.length > 0) {
      // 1x Cap: Already completed, no extra points
      return { success: true, pointsEarned: 0, alreadyCompleted: true }
    }

    // Find any exercise in lesson to satisfy DB foreign key constraint
    const exList = await db.select().from(exercises).where(eq(exercises.lessonId, lessonId)).limit(1)
    const exId = exList[0]?.id

    if (!exId) {
      return { success: true, pointsEarned: 100, alreadyCompleted: false }
    }

    // Save first-time reading answer (+100 XP)
    await db.insert(answers).values({
      id: nanoid(),
      exerciseId: exId,
      lessonId,
      userId,
      answerJson: JSON.stringify({ completed: true, type: 'reading' }),
      isCorrect: true,
      latencyMs: 10000,
      pointsEarned: 100,
      kind: 'reading',
    })

    const existingProgress = await db
      .select()
      .from(progress)
      .where(and(eq(progress.userId, userId), eq(progress.classId, classId), eq(progress.exerciseId, exId)))
      .limit(1)

    if (existingProgress.length === 0) {
      await db.insert(progress).values({
        id: `prg_${nanoid(10)}`,
        userId,
        classId,
        lessonId,
        exerciseId: exId,
        attempts: 1,
        bestScore: 100,
        bestTimeMs: 10000,
      })
    }

    return { success: true, pointsEarned: 100, alreadyCompleted: false }
  }

  static async getStudentProgress(userId: string, classId: string) {
    const db = getDb()
    await HomeworkService.assertClassMembership(userId, classId)
    const records = await db
      .select()
      .from(progress)
      .where(and(eq(progress.userId, userId), eq(progress.classId, classId)))

    const totalExercisesCompleted = records.length
    const totalPoints = records.reduce((acc, curr) => acc + curr.bestScore, 0)

    return {
      totalExercisesCompleted,
      totalPoints,
      records,
    }
  }

  /**
   * Verify the user is allowed to interact with the given class.
   * - Teacher: must own the class
   * - Student: must be enrolled
   * - Webmaster: always allowed
   */
  static async assertClassMembership(userId: string, classId: string): Promise<void> {
    const db = getDb()
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (user.length === 0 || !user[0]) {
      throw AppError.unauthenticated('Debes iniciar sesión para continuar')
    }

    if (user[0].role === 'webmaster') return

    if (user[0].role === 'teacher') {
      const cls = await db
        .select()
        .from(courseClasses)
        .where(and(eq(courseClasses.id, classId), eq(courseClasses.teacherId, userId)))
        .limit(1)
      if (cls.length > 0) return
      throw AppError.forbidden('No tienes permisos sobre esta clase')
    }

    // Student
    const member = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.userId, userId), eq(groupMembers.classId, classId)))
      .limit(1)
    if (member.length === 0) {
      throw AppError.forbidden('No estás inscrito en esta clase')
    }
  }
}
