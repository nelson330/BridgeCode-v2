import type { WallCommentCreate, WallPostCreate } from '@shared/contracts/social'
import { and, desc, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { getDb } from '../../core/db/client'
import {
  auditLogs,
  courseClasses,
  groupMembers,
  users,
  wallComments,
  wallLikes,
  wallPosts,
} from '../../core/db/schema'
import { AppError } from '../../core/errors'

export class SocialService {
  static async createPost(userId: string, classId: string, req: WallPostCreate) {
    const db = getDb()

    await SocialService.assertClassMembership(userId, classId)

    const postId = `wp_${nanoid(10)}`
    await db.insert(wallPosts).values({
      id: postId,
      classId,
      authorId: userId,
      content: req.content,
      mediaUrl: req.mediaUrl || null,
      pinned: false,
      locked: false,
      likeCount: 0,
    })

    return {
      id: postId,
      classId,
      authorId: userId,
      content: req.content,
      mediaUrl: req.mediaUrl,
      createdAt: new Date(),
    }
  }

  static async listPosts(userId: string, classId: string) {
    const db = getDb()

    await SocialService.assertClassMembership(userId, classId)

    const posts = await db
      .select({
        post: wallPosts,
        author: {
          id: users.id,
          displayName: users.displayName,
          role: users.role,
        },
      })
      .from(wallPosts)
      .innerJoin(users, eq(wallPosts.authorId, users.id))
      .where(and(eq(wallPosts.classId, classId), eq(wallPosts.hidden, false)))
      .orderBy(desc(wallPosts.pinned), desc(wallPosts.createdAt))

    return posts.map(({ post, author }) => ({
      ...post,
      authorName: author.displayName,
      authorRole: author.role,
    }))
  }

  static async toggleLike(userId: string, postId: string) {
    const db = getDb()
    const existing = await db
      .select()
      .from(wallLikes)
      .where(and(eq(wallLikes.postId, postId), eq(wallLikes.userId, userId)))
      .limit(1)

    const post = await db.select().from(wallPosts).where(eq(wallPosts.id, postId)).limit(1)
    if (post.length === 0 || !post[0]) {
      throw AppError.notFound('Publicación no encontrada')
    }

    // Verify user belongs to the post's class
    await SocialService.assertClassMembership(userId, post[0].classId)

    if (existing.length > 0) {
      await db.delete(wallLikes).where(eq(wallLikes.id, existing[0]!.id))
      await db
        .update(wallPosts)
        .set({ likeCount: Math.max(0, post[0].likeCount - 1) })
        .where(eq(wallPosts.id, postId))
      return { liked: false }
    }

    await db.insert(wallLikes).values({
      id: `wl_${nanoid(10)}`,
      postId,
      userId,
    })
    await db
      .update(wallPosts)
      .set({ likeCount: post[0].likeCount + 1 })
      .where(eq(wallPosts.id, postId))

    return { liked: true }
  }

  static async addComment(userId: string, postId: string, req: WallCommentCreate) {
    const db = getDb()
    const post = await db.select().from(wallPosts).where(eq(wallPosts.id, postId)).limit(1)
    if (post.length === 0 || !post[0]) {
      throw AppError.notFound('Publicación no encontrada')
    }

    if (post[0].locked) {
      throw AppError.forbidden('La publicación está bloqueada para nuevos comentarios')
    }

    // Verify user belongs to the post's class
    await SocialService.assertClassMembership(userId, post[0].classId)

    const commentId = `wc_${nanoid(10)}`
    await db.insert(wallComments).values({
      id: commentId,
      postId,
      authorId: userId,
      content: req.content,
    })

    return {
      id: commentId,
      postId,
      authorId: userId,
      content: req.content,
      createdAt: new Date(),
    }
  }

  static async listComments(_userId: string, postId: string) {
    const db = getDb()
    const post = await db.select().from(wallPosts).where(eq(wallPosts.id, postId)).limit(1)
    if (post.length === 0 || !post[0]) {
      throw AppError.notFound('Publicación no encontrada')
    }
    await SocialService.assertClassMembership(_userId, post[0].classId)

    const comments = await db
      .select({
        comment: wallComments,
        author: {
          id: users.id,
          displayName: users.displayName,
          role: users.role,
        },
      })
      .from(wallComments)
      .innerJoin(users, eq(wallComments.authorId, users.id))
      .where(and(eq(wallComments.postId, postId), eq(wallComments.hidden, false)))
      .orderBy(wallComments.createdAt)

    return comments.map(({ comment, author }) => ({
      ...comment,
      authorName: author.displayName,
      authorRole: author.role,
    }))
  }

  static async pinPost(teacherId: string, postId: string, pinned: boolean) {
    const db = getDb()
    const post = await db.select().from(wallPosts).where(eq(wallPosts.id, postId)).limit(1)
    if (post.length === 0 || !post[0]) {
      throw AppError.notFound('Publicación no encontrada')
    }
    await SocialService.assertClassMembership(teacherId, post[0].classId)

    await db.update(wallPosts).set({ pinned }).where(eq(wallPosts.id, postId))
    return { success: true, pinned }
  }

  static async lockPost(teacherId: string, postId: string, locked: boolean) {
    const db = getDb()
    const post = await db.select().from(wallPosts).where(eq(wallPosts.id, postId)).limit(1)
    if (post.length === 0 || !post[0]) {
      throw AppError.notFound('Publicación no encontrada')
    }
    await SocialService.assertClassMembership(teacherId, post[0].classId)

    await db.update(wallPosts).set({ locked }).where(eq(wallPosts.id, postId))
    return { success: true, locked }
  }

  static async moderatePost(moderatorId: string, postId: string, hide: boolean) {
    const db = getDb()
    const post = await db.select().from(wallPosts).where(eq(wallPosts.id, postId)).limit(1)
    if (post.length === 0 || !post[0]) {
      throw AppError.notFound('Publicación no encontrada')
    }
    await SocialService.assertClassMembership(moderatorId, post[0].classId)

    await db
      .update(wallPosts)
      .set({
        hidden: hide,
        moderated: true,
        moderatedBy: moderatorId,
      })
      .where(eq(wallPosts.id, postId))

    return { success: true, hidden: hide }
  }

  /**
   * Verify that a user belongs to a class. Throws 403 if not.
   * Required for: students enrolled, teachers who own the class, or webmaster.
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
