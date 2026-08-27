import { getRawDb } from '../src/core/db/client'
import { logger } from '../src/core/logger'

export async function runMigrations() {
  logger.info('📦 Running database migrations...')
  const sqlite = getRawDb()

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      ban_reason TEXT,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS teacher_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      bio TEXT,
      locale TEXT NOT NULL DEFAULT 'es',
      default_ai_provider TEXT,
      admin_local INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ai_provider_configs (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      api_key_encrypted TEXT,
      base_url TEXT,
      model TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS course_classes (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS group_members (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL REFERENCES course_classes(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL REFERENCES course_classes(id) ON DELETE CASCADE,
      teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      material_content TEXT,
      material_file TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      lang TEXT NOT NULL DEFAULT 'es',
      settings_json TEXT,
      published_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      prompt TEXT NOT NULL,
      media_url TEXT,
      options_json TEXT,
      answer_json TEXT NOT NULL,
      explanation TEXT,
      points INTEGER NOT NULL DEFAULT 1,
      time_sec INTEGER NOT NULL DEFAULT 30,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS live_sessions (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL REFERENCES course_classes(id) ON DELETE CASCADE,
      lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code_pin TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'lobby',
      mode TEXT NOT NULL DEFAULT 'trivia',
      state_json TEXT,
      rank_snapshot_json TEXT,
      started_at INTEGER,
      ended_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS session_participants (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
      user_id TEXT,
      display_name TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      streak INTEGER NOT NULL DEFAULT 0,
      state_json TEXT,
      joined_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES live_sessions(id) ON DELETE SET NULL,
      exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
      lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      userId TEXT REFERENCES users(id) ON DELETE SET NULL,
      answer_json TEXT NOT NULL,
      exercise_json_snapshot TEXT,
      is_correct INTEGER NOT NULL,
      latency_ms INTEGER NOT NULL DEFAULT 0,
      points_earned INTEGER NOT NULL DEFAULT 0,
      kind TEXT NOT NULL DEFAULT 'session',
      flagged_lost_focus INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS homework (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL REFERENCES course_classes(id) ON DELETE CASCADE,
      lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'quiz',
      instructions TEXT,
      due_at INTEGER NOT NULL,
      attempt_limit INTEGER,
      allow_after_due INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      class_id TEXT NOT NULL REFERENCES course_classes(id) ON DELETE CASCADE,
      lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
      attempts INTEGER NOT NULL DEFAULT 1,
      best_score INTEGER NOT NULL DEFAULT 0,
      best_time_ms INTEGER,
      last_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS wall_posts (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL REFERENCES course_classes(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      media_url TEXT,
      pinned INTEGER NOT NULL DEFAULT 0,
      locked INTEGER NOT NULL DEFAULT 0,
      hidden INTEGER NOT NULL DEFAULT 0,
      moderated INTEGER NOT NULL DEFAULT 0,
      moderated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      like_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS wall_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES wall_posts(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      hidden INTEGER NOT NULL DEFAULT 0,
      moderated INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS wall_likes (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES wall_posts(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS forum_posts (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      tags_json TEXT,
      lesson_snapshot_json TEXT NOT NULL,
      avg_rating INTEGER NOT NULL DEFAULT 0,
      voters_count INTEGER NOT NULL DEFAULT 0,
      import_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS forum_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
      teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS forum_ratings (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
      teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      detail_json TEXT,
      ip TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS instance_meta (
      id TEXT PRIMARY KEY,
      version TEXT NOT NULL,
      mode TEXT NOT NULL,
      seeded_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS ai_jobs (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'queued',
      exercise_types_json TEXT NOT NULL,
      count INTEGER NOT NULL,
      lang TEXT NOT NULL DEFAULT 'es',
      payload_json TEXT,
      result_json TEXT,
      error TEXT,
      retries INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS anticheat_events (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES live_sessions(id) ON DELETE CASCADE,
      practice_id TEXT,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      detail_json TEXT,
      occurred_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_snapshot TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    -- Create critical indexes
    CREATE INDEX IF NOT EXISTS idx_answers_user_lesson ON answers(user_id, lesson_id);
    CREATE INDEX IF NOT EXISTS idx_answers_exercise ON answers(exercise_id);
    CREATE INDEX IF NOT EXISTS idx_progress_user_lesson ON progress(user_id, lesson_id);
    CREATE INDEX IF NOT EXISTS idx_session_participants_session ON session_participants(session_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON audit_logs(actor_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_jobs(status);
  `)

  logger.info('✅ Database migrations applied successfully.')
}

if (import.meta.main) {
  runMigrations().catch((err) => {
    logger.fatal({ err }, 'Migration failed')
    process.exit(1)
  })
}
