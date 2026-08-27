import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { loadConfig } from '../src/core/config'
import { getDb, initDb } from '../src/core/db/client'
import {
  aiProviderConfigs,
  answers,
  courseClasses,
  exercises,
  forumPosts,
  groupMembers,
  homework,
  instanceMeta,
  lessons,
  progress,
  teacherProfiles,
  users,
  wallComments,
  wallLikes,
  wallPosts,
} from '../src/core/db/schema'
import { hashPassword } from '../src/core/security/crypto'

export async function runDatabaseSeed() {
  const db = getDb()

  // 1. Webmaster
  const existingWebmaster = await db.select().from(users).where(eq(users.username, 'webmaster')).limit(1)

  let webmasterId = existingWebmaster[0]?.id
  if (!webmasterId) {
    webmasterId = 'usr_webmaster_01'
    const webmasterPasswordHash = await hashPassword('admin123')
    await db
      .insert(users)
      .values({
        id: webmasterId,
        username: 'webmaster',
        displayName: 'Webmaster Principal',
        passwordHash: webmasterPasswordHash,
        role: 'webmaster',
        status: 'active',
        mustChangePassword: false,
      })
      .onConflictDoNothing()
  }

  // 2. Teacher: Prof. Alejandro Vargas
  const existingTeacher = await db.select().from(users).where(eq(users.username, 'docente')).limit(1)

  let teacherId = existingTeacher[0]?.id
  if (!teacherId) {
    teacherId = 'usr_docente_01'
    const teacherPasswordHash = await hashPassword('docente123')
    await db
      .insert(users)
      .values({
        id: teacherId,
        username: 'docente',
        displayName: 'Prof. Alejandro Vargas',
        passwordHash: teacherPasswordHash,
        role: 'teacher',
        status: 'active',
        mustChangePassword: false,
      })
      .onConflictDoNothing()
  }

  const existingProfile = await db
    .select()
    .from(teacherProfiles)
    .where(eq(teacherProfiles.userId, teacherId))
    .limit(1)

  if (existingProfile.length === 0) {
    await db
      .insert(teacherProfiles)
      .values({
        id: 'tp_docente_01',
        userId: teacherId,
        bio: 'Docente titular de Ciencias Naturales y Tecnología',
        locale: 'es',
        adminLocal: true,
      })
      .onConflictDoNothing()
  }

  // 3. Students: Sofía García & Carlos Ruiz
  const existingSofia = await db.select().from(users).where(eq(users.username, 'sofia.garcia')).limit(1)

  let student1Id = existingSofia[0]?.id
  if (!student1Id) {
    student1Id = 'usr_sofia_01'
    const studentPasswordHash = await hashPassword('alumno123')
    await db
      .insert(users)
      .values({
        id: student1Id,
        username: 'sofia.garcia',
        displayName: 'Sofía García',
        passwordHash: studentPasswordHash,
        role: 'student',
        status: 'active',
        mustChangePassword: false,
      })
      .onConflictDoNothing()
  }

  const existingCarlos = await db.select().from(users).where(eq(users.username, 'carlos.ruiz')).limit(1)

  let student2Id = existingCarlos[0]?.id
  if (!student2Id) {
    student2Id = 'usr_carlos_02'
    const studentPasswordHash = await hashPassword('alumno123')
    await db
      .insert(users)
      .values({
        id: student2Id,
        username: 'carlos.ruiz',
        displayName: 'Carlos Ruiz',
        passwordHash: studentPasswordHash,
        role: 'student',
        status: 'active',
        mustChangePassword: false,
      })
      .onConflictDoNothing()
  }

  // 4. Course Classes
  const existingClass1 = await db
    .select()
    .from(courseClasses)
    .where(eq(courseClasses.code, 'CN5A01'))
    .limit(1)

  let class1Id = existingClass1[0]?.id
  if (!class1Id) {
    class1Id = 'cls_ciencias_5a'
    await db
      .insert(courseClasses)
      .values({
        id: class1Id,
        teacherId,
        name: 'Ciencias Naturales 5to A',
        code: 'CN5A01',
      })
      .onConflictDoNothing()
  }

  const existingClass2 = await db
    .select()
    .from(courseClasses)
    .where(eq(courseClasses.code, 'HU6B02'))
    .limit(1)

  if (existingClass2.length === 0) {
    await db
      .insert(courseClasses)
      .values({
        id: 'cls_historia_6b',
        teacherId,
        name: 'Historia Universal 6to B',
        code: 'HU6B02',
      })
      .onConflictDoNothing()
  }

  // 5. Enroll Students into Class 1
  await db
    .insert(groupMembers)
    .values({
      id: 'gm_sofia_c1',
      classId: class1Id,
      userId: student1Id,
    })
    .onConflictDoNothing()

  await db
    .insert(groupMembers)
    .values({
      id: 'gm_carlos_c1',
      classId: class1Id,
      userId: student2Id,
    })
    .onConflictDoNothing()

  // 6. Lesson 1: El Sistema Solar y los Planetas
  const existingLesson = await db.select().from(lessons).where(eq(lessons.classId, class1Id)).limit(1)

  let lesson1Id = existingLesson[0]?.id
  if (!lesson1Id) {
    lesson1Id = 'lsn_sistema_solar'
    await db
      .insert(lessons)
      .values({
        id: lesson1Id,
        classId: class1Id,
        teacherId,
        title: 'El Sistema Solar y los Planetas',
        materialContent:
          'El Sistema Solar está formado por el Sol y ocho planetas principales que orbitan a su alrededor: Mercurio, Venus, Tierra, Marte, Júpiter, Saturno, Urano y Neptuno.',
        status: 'published',
        lang: 'es',
      })
      .onConflictDoNothing()

    // Exercises for Lesson 1
    const ex1_1 = 'ex_solar_01'
    const ex1_2 = 'ex_solar_02'

    await db
      .insert(exercises)
      .values({
        id: ex1_1,
        lessonId: lesson1Id,
        type: 'mc',
        prompt: '¿Cuál es el planeta más grande del Sistema Solar?',
        optionsJson: JSON.stringify(['Júpiter', 'Saturno', 'La Tierra', 'Marte']),
        answerJson: JSON.stringify({ correctIndex: 0 }),
        explanation: 'Júpiter es el planeta de mayor masa y volumen del Sistema Solar.',
        points: 2,
        timeSec: 25,
        sortOrder: 0,
      })
      .onConflictDoNothing()

    await db
      .insert(exercises)
      .values({
        id: ex1_2,
        lessonId: lesson1Id,
        type: 'tf',
        prompt: '¿La Tierra es el tercer planeta más cercano al Sol?',
        optionsJson: JSON.stringify(['Verdadero', 'Falso']),
        answerJson: JSON.stringify({ isTrue: true }),
        explanation: 'El orden de cercanía al Sol es: 1. Mercurio, 2. Venus, 3. Tierra.',
        points: 1,
        timeSec: 15,
        sortOrder: 1,
      })
      .onConflictDoNothing()

    // Homework Assignment
    const dueNextWeek = new Date(Date.now() + 7 * 24 * 3600 * 1000)
    await db
      .insert(homework)
      .values({
        id: 'hw_solar_01',
        classId: class1Id,
        lessonId: lesson1Id,
        title: 'Tarea 1: Planetas Rocosos vs Gaseosos',
        dueAt: dueNextWeek,
        attemptLimit: 3,
        allowAfterDue: true,
      })
      .onConflictDoNothing()

    // Answers for Sofía and Carlos
    await db
      .insert(answers)
      .values({
        id: 'ans_sofia_01',
        userId: student1Id,
        lessonId: lesson1Id,
        exerciseId: ex1_1,
        answerJson: JSON.stringify({ correctIndex: 0 }),
        isCorrect: true,
        pointsEarned: 190,
        latencyMs: 3800,
        kind: 'practice',
      })
      .onConflictDoNothing()

    await db
      .insert(answers)
      .values({
        id: 'ans_sofia_02',
        userId: student1Id,
        lessonId: lesson1Id,
        exerciseId: ex1_2,
        answerJson: JSON.stringify({ isTrue: true }),
        isCorrect: true,
        pointsEarned: 95,
        latencyMs: 4100,
        kind: 'practice',
      })
      .onConflictDoNothing()

    await db
      .insert(answers)
      .values({
        id: 'ans_carlos_01',
        userId: student2Id,
        lessonId: lesson1Id,
        exerciseId: ex1_1,
        answerJson: JSON.stringify({ correctIndex: 0 }),
        isCorrect: true,
        pointsEarned: 160,
        latencyMs: 6200,
        kind: 'practice',
      })
      .onConflictDoNothing()

    await db
      .insert(answers)
      .values({
        id: 'ans_carlos_02',
        userId: student2Id,
        lessonId: lesson1Id,
        exerciseId: ex1_2,
        answerJson: JSON.stringify({ isTrue: false }),
        isCorrect: false,
        pointsEarned: 0,
        latencyMs: 8400,
        kind: 'practice',
      })
      .onConflictDoNothing()

    await db
      .insert(progress)
      .values({
        id: 'prg_sofia_solar',
        userId: student1Id,
        classId: class1Id,
        lessonId: lesson1Id,
        exerciseId: ex1_1,
        attempts: 1,
        bestScore: 190,
        bestTimeMs: 3800,
      })
      .onConflictDoNothing()

    await db
      .insert(progress)
      .values({
        id: 'prg_carlos_solar',
        userId: student2Id,
        classId: class1Id,
        lessonId: lesson1Id,
        exerciseId: ex1_1,
        attempts: 1,
        bestScore: 160,
        bestTimeMs: 6200,
      })
      .onConflictDoNothing()
  }

  // 8. Wall Post & Comments
  const existingPost = await db.select().from(wallPosts).where(eq(wallPosts.classId, class1Id)).limit(1)

  if (existingPost.length === 0) {
    const postId = 'wp_bienvenida_01'
    await db
      .insert(wallPosts)
      .values({
        id: postId,
        classId: class1Id,
        authorId: teacherId,
        content:
          '¡Bienvenidos al ciclo escolar de Ciencias! Revisen la primera lección del Sistema Solar y resuelvan la tarea asignada.',
        pinned: true,
        locked: false,
      })
      .onConflictDoNothing()

    await db
      .insert(wallComments)
      .values({
        id: 'wc_com_01',
        postId,
        authorId: student1Id,
        content: '¡Hola profesor! Ya revisé el material, muchas gracias.',
      })
      .onConflictDoNothing()

    await db
      .insert(wallComments)
      .values({
        id: 'wc_com_02',
        postId,
        authorId: student2Id,
        content: 'Entendido profesor, ¡listo para la primera trivia!',
      })
      .onConflictDoNothing()

    await db
      .insert(wallLikes)
      .values({
        id: 'wl_like_01',
        postId,
        userId: student1Id,
      })
      .onConflictDoNothing()
  }

  // 10. AI Provider default preset (Groq)
  await db
    .insert(aiProviderConfigs)
    .values({
      id: 'groq_default',
      teacherId,
      provider: 'groq',
      enabled: true,
      model: 'llama-3.3-70b-versatile',
      apiKeyEncrypted: null,
    })
    .onConflictDoNothing()

  // 11. Forum Community Posts Seed
  const existingForumPost = await db.select().from(forumPosts).limit(1)
  if (existingForumPost.length === 0) {
    const forumSnapshot1 = {
      title: 'El Sistema Solar y la Astronomía',
      materialContent:
        'Lección completa sobre los planetas rocosos y gaseosos, el Sol y los asteroides con preguntas interactivas.',
      lang: 'es',
      exercises: [
        {
          type: 'mc',
          prompt: '¿Cuál es el planeta más cercano al Sol?',
          optionsJson: JSON.stringify(['Mercurio', 'Venus', 'Tierra', 'Marte']),
          answerJson: JSON.stringify({ correctIndex: 0 }),
          explanation: 'Mercurio orbita a tan sólo 58 millones de kilómetros del Sol.',
          points: 2,
          timeSec: 25,
        },
        {
          type: 'tf',
          prompt: '¿Saturno es el único planeta con anillos?',
          optionsJson: JSON.stringify(['Verdadero', 'Falso']),
          answerJson: JSON.stringify({ isTrue: false }),
          explanation: 'Júpiter, Urano y Neptuno también poseen sistemas de anillos más tenues.',
          points: 1,
          timeSec: 20,
        },
      ],
    }

    await db
      .insert(forumPosts)
      .values({
        id: 'fp_solar_community',
        teacherId,
        title: 'Explorando el Universo: Los Planetas y el Sol',
        description:
          'Actividad gamificada ideal para 5to y 6to de primaria sobre los cuerpos celestes del Sistema Solar con trivia interactiva.',
        tagsJson: JSON.stringify(['Astronomía', 'Ciencias Naturales', 'Primaria', 'Gamificación']),
        lessonSnapshotJson: JSON.stringify(forumSnapshot1),
        avgRating: 5,
        votersCount: 12,
        importCount: 8,
      })
      .onConflictDoNothing()

    const forumSnapshot2 = {
      title: 'La Célula y los Seres Vivos',
      materialContent: 'Conceptos clave sobre la célula vegetal y animal, orgánulos celulares y microscopía.',
      lang: 'es',
      exercises: [
        {
          type: 'mc',
          prompt: '¿Cuál es el organelo responsable de la respiración celular y síntesis de ATP?',
          optionsJson: JSON.stringify(['Mitocondria', 'Ribosoma', 'Aparato de Golgi', 'Lisosoma']),
          answerJson: JSON.stringify({ correctIndex: 0 }),
          explanation: 'Las mitocondrias son las centrales energéticas de las células.',
          points: 2,
          timeSec: 30,
        },
      ],
    }

    await db
      .insert(forumPosts)
      .values({
        id: 'fp_celula_community',
        teacherId,
        title: 'La Célula: Estructura y Función Vital',
        description:
          'Lección diseñada para introducir la biología celular y organelos mediante preguntas interactivas.',
        tagsJson: JSON.stringify(['Biología', 'Célula', 'Secundaria', 'Laboratorio']),
        lessonSnapshotJson: JSON.stringify(forumSnapshot2),
        avgRating: 5,
        votersCount: 19,
        importCount: 14,
      })
      .onConflictDoNothing()
  }

  // 12. Instance Meta
  await db
    .insert(instanceMeta)
    .values({
      id: 'meta_01',
      version: '1.0.0',
      mode: 'hosted',
    })
    .onConflictDoNothing()
}

// Execute directly if run with `bun scripts/seed.ts`
if (import.meta.main) {
  loadConfig({ MODE: 'hosted' })
  initDb()
  runDatabaseSeed()
    .then(() => {
      console.log('✅ Semilla ejecutada correctamente.')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Error al ejecutar semilla:', err)
      process.exit(1)
    })
}
