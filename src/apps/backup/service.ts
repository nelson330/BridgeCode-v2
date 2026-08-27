import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { ExportBundle } from '@shared/contracts/backup'
import { and, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { getConfig } from '../../core/config'
import { getDb } from '../../core/db/client'
import { courseClasses, exercises, lessons } from '../../core/db/schema'
import { AppError } from '../../core/errors'

export class BackupService {
  static async exportLessonBundle(teacherId: string, lessonId: string): Promise<ExportBundle> {
    const db = getDb()
    const lesson = await db
      .select()
      .from(lessons)
      .where(and(eq(lessons.id, lessonId), eq(lessons.teacherId, teacherId)))
      .limit(1)

    if (lesson.length === 0 || !lesson[0]) {
      throw AppError.notFound('Lección no encontrada')
    }

    const exList = await db.select().from(exercises).where(eq(exercises.lessonId, lessonId))

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      lesson: {
        title: lesson[0].title,
        materialContent: lesson[0].materialContent,
        lang: lesson[0].lang,
        exercises: exList.map((e) => ({
          type: e.type,
          prompt: e.prompt,
          optionsJson: e.optionsJson,
          answerJson: e.answerJson,
          explanation: e.explanation,
          points: e.points,
          timeSec: e.timeSec,
        })),
      },
    }
  }

  static async importLessonBundle(teacherId: string, targetClassId: string, bundle: ExportBundle) {
    const db = getDb()
    const cls = await db
      .select()
      .from(courseClasses)
      .where(and(eq(courseClasses.id, targetClassId), eq(courseClasses.teacherId, teacherId)))
      .limit(1)

    if (cls.length === 0 || !cls[0]) {
      throw AppError.notFound('Clase destino no encontrada')
    }

    const newLessonId = `lsn_${nanoid(10)}`
    await db.insert(lessons).values({
      id: newLessonId,
      classId: targetClassId,
      teacherId,
      title: bundle.lesson.title,
      materialContent: bundle.lesson.materialContent || null,
      status: 'draft',
      lang: bundle.lesson.lang || 'es',
    })

    for (let i = 0; i < bundle.lesson.exercises.length; i++) {
      const ex = bundle.lesson.exercises[i]
      if (ex) {
        await db.insert(exercises).values({
          id: `ex_${nanoid(10)}`,
          lessonId: newLessonId,
          type: ex.type as any,
          prompt: ex.prompt,
          optionsJson: ex.optionsJson || null,
          answerJson: ex.answerJson,
          explanation: ex.explanation || null,
          points: ex.points,
          timeSec: ex.timeSec,
          sortOrder: i,
        })
      }
    }

    return {
      success: true,
      importedLessonId: newLessonId,
    }
  }

  static async createDatabaseBackup(): Promise<{ filename: string; sizeBytes: number }> {
    const config = getConfig()
    const dbFile = join(config.DATA_DIR, 'aulaplay.db')
    const backupsDir = join(config.DATA_DIR, 'backups')

    if (!existsSync(backupsDir)) {
      mkdirSync(backupsDir, { recursive: true })
    }

    const filename = `aulaplay-backup-${Date.now()}.db`
    const destPath = join(backupsDir, filename)

    if (existsSync(dbFile)) {
      copyFileSync(dbFile, destPath)
    }

    return {
      filename,
      sizeBytes: existsSync(destPath) ? Bun.file(destPath).size : 0,
    }
  }
}
