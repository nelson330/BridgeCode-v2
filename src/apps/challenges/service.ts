import type { ChallengeRequest, GhostReplay } from '@shared/contracts/challenges'
import { and, desc, eq } from 'drizzle-orm'
import { getDb } from '../../core/db/client'
import { answers, exercises, lessons, users } from '../../core/db/schema'
import { AppError } from '../../core/errors'

export class ChallengesService {
  static async findMatchOrGhost(
    _userId: string,
    req: ChallengeRequest
  ): Promise<{ mode: 'ghost' | 'live'; ghost?: GhostReplay }> {
    const db = getDb()

    // 1. Fetch lesson exercises
    const lesson = await db.select().from(lessons).where(eq(lessons.id, req.lessonId)).limit(1)
    if (lesson.length === 0 || !lesson[0]) {
      throw AppError.notFound('Lección no encontrada')
    }

    const exList = await db.select().from(exercises).where(eq(exercises.lessonId, req.lessonId))

    // 2. Fetch past answers for this lesson from other students to construct ghost replay
    const pastAnswers = await db
      .select({
        answer: answers,
        user: users,
      })
      .from(answers)
      .innerJoin(users, eq(answers.userId, users.id))
      .where(and(eq(answers.lessonId, req.lessonId), eq(answers.isCorrect, true)))
      .orderBy(desc(answers.pointsEarned))
      .limit(10)

    if (pastAnswers.length > 0) {
      const topUser = pastAnswers[0]!.user
      const userAnswers = pastAnswers
        .filter((a) => a.user.id === topUser.id)
        .map(({ answer }) => ({
          exerciseId: answer.exerciseId,
          latencyMs: answer.latencyMs,
          pointsEarned: answer.pointsEarned,
          isCorrect: answer.isCorrect,
        }))

      const totalScore = userAnswers.reduce((acc, curr) => acc + curr.pointsEarned, 0)

      return {
        mode: 'ghost',
        ghost: {
          ghostUserId: topUser.id,
          ghostName: topUser.displayName,
          totalScore,
          answers: userAnswers,
        },
      }
    }

    // Default bot ghost if no student has played yet
    const botAnswers = exList.map((ex) => ({
      exerciseId: ex.id,
      latencyMs: 4500,
      pointsEarned: ex.points * 80,
      isCorrect: true,
    }))

    return {
      mode: 'ghost',
      ghost: {
        ghostUserId: 'bot_astro',
        ghostName: 'AstroBot (Fantasma)',
        totalScore: botAnswers.reduce((acc, curr) => acc + curr.pointsEarned, 0),
        answers: botAnswers,
      },
    }
  }
}
