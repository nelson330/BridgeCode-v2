import type { ForumPostCreate } from '@shared/contracts/forum'
import { and, desc, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { getDb } from '../../core/db/client'
import { courseClasses, exercises, forumPosts, forumRatings, lessons, users } from '../../core/db/schema'
import { AppError } from '../../core/errors'

export class ForumService {
  static async publishLessonToForum(teacherId: string, req: ForumPostCreate) {
    const db = getDb()
    const lesson = await db
      .select()
      .from(lessons)
      .where(and(eq(lessons.id, req.lessonId), eq(lessons.teacherId, teacherId)))
      .limit(1)

    if (lesson.length === 0 || !lesson[0]) {
      throw AppError.notFound('Lección no encontrada')
    }

    const exList = await db.select().from(exercises).where(eq(exercises.lessonId, req.lessonId))

    const snapshot = {
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
    }

    const postId = `fp_${nanoid(10)}`
    await db.insert(forumPosts).values({
      id: postId,
      teacherId,
      title: req.title,
      description: req.description || null,
      tagsJson: JSON.stringify(req.tags),
      lessonSnapshotJson: JSON.stringify(snapshot),
      avgRating: 0,
      votersCount: 0,
      importCount: 0,
    })

    return {
      id: postId,
      title: req.title,
      tags: req.tags,
    }
  }

  static async listForumPosts() {
    const db = getDb()
    const posts = await db
      .select({
        post: forumPosts,
        teacher: {
          id: users.id,
          displayName: users.displayName,
        },
      })
      .from(forumPosts)
      .innerJoin(users, eq(forumPosts.teacherId, users.id))
      .orderBy(desc(forumPosts.createdAt))

    return posts.map(({ post, teacher }) => ({
      ...post,
      teacherName: teacher.displayName,
      tags: JSON.parse(post.tagsJson || '[]'),
    }))
  }

  static async ratePost(teacherId: string, postId: string, rating: number) {
    const db = getDb()
    const existing = await db
      .select()
      .from(forumRatings)
      .where(and(eq(forumRatings.postId, postId), eq(forumRatings.teacherId, teacherId)))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(forumRatings)
        .set({ rating, updatedAt: new Date() })
        .where(eq(forumRatings.id, existing[0]!.id))
    } else {
      await db.insert(forumRatings).values({
        id: `fr_${nanoid(10)}`,
        postId,
        teacherId,
        rating,
      })
    }

    // Recalculate average
    const allRatings = await db.select().from(forumRatings).where(eq(forumRatings.postId, postId))
    const total = allRatings.reduce((acc, curr) => acc + curr.rating, 0)
    const avg = Math.round((total / allRatings.length) * 10) / 10

    await db
      .update(forumPosts)
      .set({
        avgRating: Math.round(avg),
        votersCount: allRatings.length,
      })
      .where(eq(forumPosts.id, postId))

    return { avgRating: avg, totalVoters: allRatings.length }
  }

  static async importLessonFromForum(teacherId: string, postId: string, targetClassId: string) {
    const db = getDb()
    const post = await db.select().from(forumPosts).where(eq(forumPosts.id, postId)).limit(1)
    if (post.length === 0 || !post[0]) {
      throw AppError.notFound('Publicación del foro no encontrada')
    }

    const cls = await db
      .select()
      .from(courseClasses)
      .where(and(eq(courseClasses.id, targetClassId), eq(courseClasses.teacherId, teacherId)))
      .limit(1)

    if (cls.length === 0 || !cls[0]) {
      throw AppError.notFound('Clase de destino no encontrada')
    }

    const snapshot = JSON.parse(post[0].lessonSnapshotJson)
    const newLessonId = `lsn_${nanoid(10)}`

    await db.insert(lessons).values({
      id: newLessonId,
      classId: targetClassId,
      teacherId,
      title: `${snapshot.title} (Importada)`,
      materialContent: snapshot.materialContent || null,
      status: 'draft',
      lang: snapshot.lang || 'es',
    })

    if (Array.isArray(snapshot.exercises)) {
      for (let i = 0; i < snapshot.exercises.length; i++) {
        const ex = snapshot.exercises[i]
        await db.insert(exercises).values({
          id: `ex_${nanoid(10)}`,
          lessonId: newLessonId,
          type: ex.type,
          prompt: ex.prompt,
          optionsJson: ex.optionsJson || null,
          answerJson: ex.answerJson,
          explanation: ex.explanation || null,
          points: ex.points || 1,
          timeSec: ex.timeSec || 30,
          sortOrder: i,
        })
      }
    }

    // Increment import count
    await db
      .update(forumPosts)
      .set({ importCount: post[0].importCount + 1 })
      .where(eq(forumPosts.id, postId))

    return {
      success: true,
      importedLessonId: newLessonId,
    }
  }
}
