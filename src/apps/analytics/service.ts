import { and, eq, sql } from 'drizzle-orm'
import { getDb } from '../../core/db/client'
import {
  answers,
  anticheatEvents,
  courseClasses,
  exercises,
  groupMembers,
  homework,
  lessons,
  liveSessions,
  users,
} from '../../core/db/schema'
import { AppError } from '../../core/errors'

export class AnalyticsService {
  static async getClassAnalytics(teacherId: string, classId: string) {
    const gradebook = await AnalyticsService.getDetailedClassGradebook(teacherId, classId)
    return {
      classId,
      className: gradebook.className,
      totalStudents: gradebook.summary.totalStudents,
      totalSessions: gradebook.summary.totalSessions,
      totalAnswers: gradebook.summary.totalAnswers,
      accuracyPercent: gradebook.summary.classAverageAccuracy,
      anticheatAlertsCount: gradebook.summary.totalAnticheatAlerts,
    }
  }

  static async getDetailedClassGradebook(teacherId: string, classId: string) {
    const db = getDb()

    const foundClass = await db
      .select()
      .from(courseClasses)
      .where(and(eq(courseClasses.id, classId), eq(courseClasses.teacherId, teacherId)))
      .limit(1)

    if (foundClass.length === 0 || !foundClass[0]) {
      throw AppError.notFound('Clase no encontrada')
    }

    // 1. Get enrolled students
    const enrolledStudents = await db
      .select({
        studentId: users.id,
        displayName: users.displayName,
        username: users.username,
      })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groupMembers.classId, classId))

    // 2. Class lessons and exercises
    const classLessons = await db.select().from(lessons).where(eq(lessons.classId, classId))
    const lessonIds = classLessons.map((l) => l.id)

    const classExercises =
      lessonIds.length > 0
        ? (await db.select().from(exercises)).filter((e) => lessonIds.includes(e.lessonId))
        : []

    // 3. Class homework assignments
    const classHomework = await db.select().from(homework).where(eq(homework.classId, classId))

    // 4. Answers for this class
    const allAnswers =
      lessonIds.length > 0
        ? (await db.select().from(answers)).filter((a) => lessonIds.includes(a.lessonId))
        : []

    // 5. Anticheat events
    const allAnticheat = await db.select().from(anticheatEvents)

    // 6. Calculate Student-by-Student Gradebook
    const studentGrades = enrolledStudents.map((st) => {
      const studentAnswers = allAnswers.filter((a) => a.userId === st.studentId)
      const totalAnswers = studentAnswers.length
      const correctAnswers = studentAnswers.filter((a) => a.isCorrect).length
      const accuracyPercent = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0

      // Calculated Grade (0-100)
      const calculatedGrade = accuracyPercent

      // Average response time (latency in seconds)
      const totalLatency = studentAnswers.reduce((acc, curr) => acc + curr.latencyMs, 0)
      const avgLatencySec = totalAnswers > 0 ? Math.round((totalLatency / totalAnswers / 1000) * 10) / 10 : 0

      // Total points
      const totalPoints = studentAnswers.reduce((acc, curr) => acc + curr.pointsEarned, 0)

      // Anticheat alerts
      const studentAlerts = allAnticheat.filter((ev) => ev.userId === st.studentId).length

      // Homework completed
      const homeworkCompleted = studentAnswers.length > 0 ? 1 : 0
      const homeworkPending = Math.max(0, classHomework.length - homeworkCompleted)

      const statusTag: 'excelente' | 'aprobado' | 'refuerzo' =
        calculatedGrade >= 85 ? 'excelente' : calculatedGrade >= 60 ? 'aprobado' : 'refuerzo'

      return {
        studentId: st.studentId,
        displayName: st.displayName,
        username: st.username,
        totalAnswers,
        correctAnswers,
        accuracyPercent,
        calculatedGrade,
        totalPoints,
        avgLatencySec,
        homeworkCompleted,
        homeworkPending,
        anticheatAlerts: studentAlerts,
        statusTag,
      }
    })

    // 7. Calculate Exercise Difficulty Diagnostics
    const exerciseDiagnostics = classExercises.map((ex) => {
      const exAnswers = allAnswers.filter((a) => a.exerciseId === ex.id)
      const totalAttempts = exAnswers.length
      const correctAttempts = exAnswers.filter((a) => a.isCorrect).length
      const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 100
      const needsReinforcement = totalAttempts > 0 && accuracy < 60

      const parentLesson = classLessons.find((l) => l.id === ex.lessonId)

      return {
        exerciseId: ex.id,
        lessonTitle: parentLesson?.title || 'Lección',
        type: ex.type,
        prompt: ex.prompt,
        totalAttempts,
        accuracyPercent: accuracy,
        explanation: ex.explanation,
        needsReinforcement,
      }
    })

    const totalAnswersCount = allAnswers.length
    const correctAnswersCount = allAnswers.filter((a) => a.isCorrect).length
    const classAverageAccuracy =
      totalAnswersCount > 0 ? Math.round((correctAnswersCount / totalAnswersCount) * 100) : 0

    const totalAnticheatAlerts = studentGrades.reduce((acc, curr) => acc + curr.anticheatAlerts, 0)

    return {
      classId,
      className: foundClass[0].name,
      summary: {
        totalStudents: enrolledStudents.length,
        totalLessons: classLessons.length,
        totalHomework: classHomework.length,
        totalSessions: (await db.select().from(liveSessions).where(eq(liveSessions.classId, classId))).length,
        totalAnswers: totalAnswersCount,
        classAverageAccuracy,
        totalAnticheatAlerts,
      },
      students: studentGrades,
      exerciseDiagnostics,
    }
  }

  static async exportClassGradebookCsv(teacherId: string, classId: string): Promise<string> {
    const gradebook = await AnalyticsService.getDetailedClassGradebook(teacherId, classId)

    const headers = [
      'Estudiante',
      'Usuario',
      'Ejercicios Respondidos',
      'Aciertos',
      'Precision_Porcentaje',
      'Nota_Final',
      'Puntos_Totales',
      'Tiempo_Promedio_Seg',
      'Tareas_Completadas',
      'Tareas_Pendientes',
      'Alertas_AntiTrampa',
      'Estado_Pedagogico',
    ]

    const rows = gradebook.students.map((s) => [
      `"${s.displayName}"`,
      `"${s.username}"`,
      s.totalAnswers,
      s.correctAnswers,
      `${s.accuracyPercent}%`,
      s.calculatedGrade,
      s.totalPoints,
      s.avgLatencySec,
      s.homeworkCompleted,
      s.homeworkPending,
      s.anticheatAlerts,
      `"${s.statusTag.toUpperCase()}"`,
    ])

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  }

  static async getLeaderboard(classId?: string) {
    const db = getDb()

    let studentUsers: any[] = []
    let classLessonIds: string[] = []
    let classSessionIds: string[] = []

    if (classId) {
      studentUsers = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
        })
        .from(groupMembers)
        .innerJoin(users, eq(groupMembers.userId, users.id))
        .where(eq(groupMembers.classId, classId))

      const clsLessons = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.classId, classId))
      classLessonIds = clsLessons.map((l) => l.id)

      const clsSessions = await db
        .select({ id: liveSessions.id })
        .from(liveSessions)
        .where(eq(liveSessions.classId, classId))
      classSessionIds = clsSessions.map((s) => s.id)
    } else {
      studentUsers = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
        })
        .from(users)
        .where(eq(users.role, 'student'))
    }

    const allAnswers = await db.select().from(answers)

    const leaderboard = studentUsers.map((s) => {
      const studentAns = allAnswers.filter((a) => {
        if (a.userId !== s.id) return false
        if (!classId) return true
        const inLesson = a.lessonId && classLessonIds.includes(a.lessonId)
        const inSession = a.sessionId && classSessionIds.includes(a.sessionId)
        return inLesson || inSession
      })

      const correctCount = studentAns.filter((a) => a.isCorrect).length
      const totalPoints = studentAns.reduce((sum, a) => sum + (a.pointsEarned || 0), 0)
      const accuracy = studentAns.length > 0 ? Math.round((correctCount / studentAns.length) * 100) : 0
      const level = Math.floor(totalPoints / 250) + 1

      const badges: string[] = []
      if (totalPoints >= 100) badges.push('Iniciado del Saber')
      if (totalPoints >= 500) badges.push('Maestro de Trivia')
      if (accuracy >= 80 && studentAns.length >= 5) badges.push('Precisión Legendaria')
      if (studentAns.length >= 10) badges.push('Estudioso Imparable')

      return {
        userId: s.id,
        username: s.username,
        displayName: s.displayName,
        totalPoints,
        correctCount,
        totalAnswers: studentAns.length,
        accuracy,
        level,
        badges,
      }
    })

    return leaderboard.sort((a, b) => b.totalPoints - a.totalPoints)
  }
}
