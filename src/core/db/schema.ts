import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  displayName: text('display_name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['teacher', 'student', 'webmaster'] }).notNull(),
  status: text('status', { enum: ['active', 'inactive', 'banned'] })
    .notNull()
    .default('active'),
  banReason: text('ban_reason'),
  mustChangePassword: integer('must_change_password', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export const teacherProfiles = sqliteTable('teacher_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  bio: text('bio'),
  locale: text('locale').notNull().default('es'),
  defaultAiProvider: text('default_ai_provider'),
  adminLocal: integer('admin_local', { mode: 'boolean' }).notNull().default(false),
})

export const aiProviderConfigs = sqliteTable('ai_provider_configs', {
  id: text('id').primaryKey(),
  teacherId: text('teacher_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  apiKeyEncrypted: text('api_key_encrypted'),
  baseUrl: text('base_url'),
  model: text('model'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export const courseClasses = sqliteTable('course_classes', {
  id: text('id').primaryKey(),
  teacherId: text('teacher_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export const groupMembers = sqliteTable('group_members', {
  id: text('id').primaryKey(),
  classId: text('class_id')
    .notNull()
    .references(() => courseClasses.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export const lessons = sqliteTable('lessons', {
  id: text('id').primaryKey(),
  classId: text('class_id')
    .notNull()
    .references(() => courseClasses.id, { onDelete: 'cascade' }),
  teacherId: text('teacher_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  materialContent: text('material_content'),
  materialFile: text('material_file'),
  status: text('status', { enum: ['draft', 'published'] })
    .notNull()
    .default('draft'),
  lang: text('lang').notNull().default('es'),
  settingsJson: text('settings_json'),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export const exercises = sqliteTable('exercises', {
  id: text('id').primaryKey(),
  lessonId: text('lesson_id')
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['mc', 'tf', 'fill', 'order', 'match', 'open', 'audio', 'image'] }).notNull(),
  prompt: text('prompt').notNull(),
  mediaUrl: text('media_url'),
  optionsJson: text('options_json'),
  answerJson: text('answer_json').notNull(),
  explanation: text('explanation'),
  points: integer('points').notNull().default(1),
  timeSec: integer('time_sec').notNull().default(30),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export const liveSessions = sqliteTable('live_sessions', {
  id: text('id').primaryKey(),
  classId: text('class_id')
    .notNull()
    .references(() => courseClasses.id, { onDelete: 'cascade' }),
  lessonId: text('lesson_id')
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  teacherId: text('teacher_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  codePin: text('code_pin').notNull(),
  status: text('status', { enum: ['lobby', 'active', 'finished', 'closed'] })
    .notNull()
    .default('lobby'),
  mode: text('mode', { enum: ['trivia', 'roulette', 'battle', 'race'] })
    .notNull()
    .default('trivia'),
  stateJson: text('state_json'),
  rankSnapshotJson: text('rank_snapshot_json'),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export const sessionParticipants = sqliteTable('session_participants', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => liveSessions.id, { onDelete: 'cascade' }),
  userId: text('user_id'),
  displayName: text('display_name').notNull(),
  score: integer('score').notNull().default(0),
  streak: integer('streak').notNull().default(0),
  stateJson: text('state_json'),
  joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export const answers = sqliteTable('answers', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => liveSessions.id, { onDelete: 'set null' }),
  exerciseId: text('exercise_id')
    .notNull()
    .references(() => exercises.id, { onDelete: 'cascade' }),
  lessonId: text('lesson_id')
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  answerJson: text('answer_json').notNull(),
  exerciseJsonSnapshot: text('exercise_json_snapshot'),
  isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
  latencyMs: integer('latency_ms').notNull().default(0),
  pointsEarned: integer('points_earned').notNull().default(0),
  kind: text('kind', { enum: ['session', 'practice', 'challenge'] })
    .notNull()
    .default('session'),
  flaggedLostFocus: integer('flagged_lost_focus', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export const homework = sqliteTable('homework', {
  id: text('id').primaryKey(),
  classId: text('class_id')
    .notNull()
    .references(() => courseClasses.id, { onDelete: 'cascade' }),
  lessonId: text('lesson_id')
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  kind: text('kind', { enum: ['quiz', 'reading', 'discussion'] })
    .notNull()
    .default('quiz'),
  instructions: text('instructions'),
  dueAt: integer('due_at', { mode: 'timestamp' }).notNull(),
  attemptLimit: integer('attempt_limit'),
  allowAfterDue: integer('allow_after_due', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export const progress = sqliteTable('progress', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  classId: text('class_id')
    .notNull()
    .references(() => courseClasses.id, { onDelete: 'cascade' }),
  lessonId: text('lesson_id')
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  exerciseId: text('exercise_id')
    .notNull()
    .references(() => exercises.id, { onDelete: 'cascade' }),
  attempts: integer('attempts').notNull().default(1),
  bestScore: integer('best_score').notNull().default(0),
  bestTimeMs: integer('best_time_ms'),
  lastAt: integer('last_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export const wallPosts = sqliteTable('wall_posts', {
  id: text('id').primaryKey(),
  classId: text('class_id')
    .notNull()
    .references(() => courseClasses.id, { onDelete: 'cascade' }),
  authorId: text('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  mediaUrl: text('media_url'),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  locked: integer('locked', { mode: 'boolean' }).notNull().default(false),
  hidden: integer('hidden', { mode: 'boolean' }).notNull().default(false),
  moderated: integer('moderated', { mode: 'boolean' }).notNull().default(false),
  moderatedBy: text('moderated_by').references(() => users.id, { onDelete: 'set null' }),
  likeCount: integer('like_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export const wallComments = sqliteTable('wall_comments', {
  id: text('id').primaryKey(),
  postId: text('post_id')
    .notNull()
    .references(() => wallPosts.id, { onDelete: 'cascade' }),
  authorId: text('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  hidden: integer('hidden', { mode: 'boolean' }).notNull().default(false),
  moderated: integer('moderated', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export const wallLikes = sqliteTable('wall_likes', {
  id: text('id').primaryKey(),
  postId: text('post_id')
    .notNull()
    .references(() => wallPosts.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export const forumPosts = sqliteTable('forum_posts', {
  id: text('id').primaryKey(),
  teacherId: text('teacher_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  tagsJson: text('tags_json'),
  lessonSnapshotJson: text('lesson_snapshot_json').notNull(),
  avgRating: integer('avg_rating').notNull().default(0),
  votersCount: integer('voters_count').notNull().default(0),
  importCount: integer('import_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export const forumComments = sqliteTable('forum_comments', {
  id: text('id').primaryKey(),
  postId: text('post_id')
    .notNull()
    .references(() => forumPosts.id, { onDelete: 'cascade' }),
  teacherId: text('teacher_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export const forumRatings = sqliteTable('forum_ratings', {
  id: text('id').primaryKey(),
  postId: text('post_id')
    .notNull()
    .references(() => forumPosts.id, { onDelete: 'cascade' }),
  teacherId: text('teacher_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  actorId: text('actor_id'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  detailJson: text('detail_json'),
  ip: text('ip'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  valueJson: text('value_json').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export const instanceMeta = sqliteTable('instance_meta', {
  id: text('id').primaryKey(),
  version: text('version').notNull(),
  mode: text('mode').notNull(),
  seededAt: integer('seeded_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export const aiJobs = sqliteTable('ai_jobs', {
  id: text('id').primaryKey(),
  teacherId: text('teacher_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  lessonId: text('lesson_id')
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['queued', 'running', 'done', 'error'] })
    .notNull()
    .default('queued'),
  exerciseTypesJson: text('exercise_types_json').notNull(),
  count: integer('count').notNull(),
  lang: text('lang').notNull().default('es'),
  payloadJson: text('payload_json'),
  resultJson: text('result_json'),
  error: text('error'),
  retries: integer('retries').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export const anticheatEvents = sqliteTable('anticheat_events', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => liveSessions.id, { onDelete: 'cascade' }),
  practiceId: text('practice_id'),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  detailJson: text('detail_json'),
  occurredAt: integer('occurred_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  roleSnapshot: text('role_snapshot').notNull(),
  ip: text('ip'),
  userAgent: text('user_agent'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export function getSchemaTableNames() {
  return [
    'users',
    'teacher_profiles',
    'ai_provider_configs',
    'course_classes',
    'group_members',
    'lessons',
    'exercises',
    'live_sessions',
    'session_participants',
    'answers',
    'homework',
    'progress',
    'wall_posts',
    'wall_comments',
    'wall_likes',
    'forum_posts',
    'forum_comments',
    'forum_ratings',
    'audit_logs',
    'app_settings',
    'instance_meta',
    'ai_jobs',
    'anticheat_events',
    'sessions',
  ]
}
