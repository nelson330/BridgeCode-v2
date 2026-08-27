import { beforeEach, describe, expect, it } from 'bun:test'
import { AuthService } from '../../src/apps/auth/service'
import { loadConfig } from '../../src/core/config'
import { initDb } from '../../src/core/db/client'
import { createHttpApp } from '../../src/core/http/app'

describe('Auth, Roles, Students & Classes (Fase 2)', () => {
  beforeEach(() => {
    loadConfig({ MODE: 'local' })
    initDb(':memory:')
  })

  it('runs initial seed and logs in as default teacher', async () => {
    const app = createHttpApp()
    await AuthService.seedInitialUser()

    const loginRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'docente',
        password: 'docente123',
      }),
    })

    expect(loginRes.status).toBe(200)
    const cookie = loginRes.headers.get('set-cookie')
    expect(cookie).toContain('session=')

    const body = (await loginRes.json()) as any
    expect(body.user.username).toBe('docente')
    expect(body.user.role).toBe('teacher')
  })

  it('validates session cookie via GET /api/auth/me', async () => {
    const app = createHttpApp()
    await AuthService.seedInitialUser()

    const loginRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'docente',
        password: 'docente123',
      }),
    })
    const cookie = loginRes.headers.get('set-cookie')!

    const meRes = await app.request('/api/auth/me', {
      headers: { Cookie: cookie },
    })

    expect(meRes.status).toBe(200)
    const meBody = (await meRes.json()) as any
    expect(meBody.user.displayName).toBe('Prof. Alejandro Vargas')
  })

  it('creates classes and manages students within groups', async () => {
    const app = createHttpApp()
    await AuthService.seedInitialUser()

    const loginRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'docente',
        password: 'docente123',
      }),
    })
    const cookie = loginRes.headers.get('set-cookie')!

    // 1. Create a Class
    const classRes = await app.request('/api/classes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({
        name: 'Ciencias Naturales 5to',
      }),
    })
    expect(classRes.status).toBe(201)
    const classData = (await classRes.json()) as any
    const classId = classData.class.id
    expect(classData.class.name).toBe('Ciencias Naturales 5to')

    // 2. Add students in batch
    const batchRes = await app.request(`/api/classes/${classId}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({
        students: [
          { username: 'carlos_g', displayName: 'Carlos García' },
          { username: 'lucia_m', displayName: 'Lucía Morales' },
        ],
      }),
    })
    expect(batchRes.status).toBe(201)
    const batchData = (await batchRes.json()) as any
    expect(batchData.results.length).toBe(2)
    const student1 = batchData.results[0].student

    // 3. Verify student can login with their auto-generated temp password
    const studentLoginRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'carlos_g',
        password: student1.tempPassword,
      }),
    })
    expect(studentLoginRes.status).toBe(200)
    const studentData = (await studentLoginRes.json()) as any
    expect(studentData.user.role).toBe('student')

    // 4. Verify Class detail includes students
    const detailRes = await app.request(`/api/classes/${classId}`, {
      headers: { Cookie: cookie },
    })
    expect(detailRes.status).toBe(200)
    const detailData = (await detailRes.json()) as any
    expect(detailData.class.members.length).toBe(2)
  })

  it('allows teacher to create, edit, reset password, and delete a student with instant login verification', async () => {
    const app = createHttpApp()
    await AuthService.seedInitialUser()

    const loginTeacher = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'docente', password: 'docente123' }),
    })
    const teacherCookie = loginTeacher.headers.get('set-cookie')!

    // 1. Create a class
    const classRes = await app.request('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: teacherCookie },
      body: JSON.stringify({ name: 'Matemáticas Avanzadas' }),
    })
    const { class: classObj } = (await classRes.json()) as any

    // 2. Create single student with custom explicit password
    const createStudentRes = await app.request(`/api/classes/${classObj.id}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: teacherCookie },
      body: JSON.stringify({
        displayName: 'Mateo López',
        username: 'mateo.lopez',
        password: 'miClaveSegura123',
      }),
    })
    expect(createStudentRes.status).toBe(201)
    const { student } = (await createStudentRes.json()) as any
    expect(student.username).toBe('mateo.lopez')
    expect(student.displayName).toBe('Mateo López')

    // 3. Student logs in immediately with custom credentials
    const studentLogin1 = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'mateo.lopez', password: 'miClaveSegura123' }),
    })
    expect(studentLogin1.status).toBe(200)
    const student1Data = (await studentLogin1.json()) as any
    expect(student1Data.user.role).toBe('student')

    // 4. Teacher edits student's display name and username
    const editStudentRes = await app.request(`/api/classes/${classObj.id}/students/${student.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: teacherCookie },
      body: JSON.stringify({
        displayName: 'Mateo López Renovado',
        username: 'mateo.nuevo',
      }),
    })
    expect(editStudentRes.status).toBe(200)

    // 5. Student logs in with the updated username
    const studentLogin2 = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'mateo.nuevo', password: 'miClaveSegura123' }),
    })
    expect(studentLogin2.status).toBe(200)
    const student2Data = (await studentLogin2.json()) as any
    expect(student2Data.user.displayName).toBe('Mateo López Renovado')

    // 6. Teacher resets student password to a new custom password
    const resetPwRes = await app.request(`/api/classes/students/${student.id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: teacherCookie },
      body: JSON.stringify({ newPassword: 'claveNueva456' }),
    })
    expect(resetPwRes.status).toBe(200)

    // 7. Student logs in with the new password
    const studentLogin3 = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'mateo.nuevo', password: 'claveNueva456' }),
    })
    expect(studentLogin3.status).toBe(200)

    // 8. Teacher deletes the student
    const deleteStudentRes = await app.request(`/api/classes/${classObj.id}/students/${student.id}`, {
      method: 'DELETE',
      headers: { Cookie: teacherCookie },
    })
    expect(deleteStudentRes.status).toBe(200)

    // 9. Deleted student can no longer login
    const studentLogin4 = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'mateo.nuevo', password: 'claveNueva456' }),
    })
    expect(studentLogin4.status).toBe(401)
  })

  it('allows prospective teacher to request account, webmaster approves, resets password and manages status', async () => {
    const app = createHttpApp()
    await AuthService.seedInitialUser()

    // 1. Prospective teacher requests an account
    const requestRes = await app.request('/api/auth/request-teacher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Prof. Carlos Santana',
        username: 'carlos.santana',
        email: 'carlos@instituto.edu',
        password: 'claveInicial123',
        reason: 'Profesor de Física 3er año',
      }),
    })
    expect(requestRes.status).toBe(201)

    // 2. Pending teacher cannot login before approval
    const pendingLogin = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'carlos.santana', password: 'claveInicial123' }),
    })
    expect(pendingLogin.status).toBe(403)

    // 3. Webmaster logs in
    const adminLogin = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'webmaster', password: 'admin123' }),
    })
    expect(adminLogin.status).toBe(200)
    const adminCookie = adminLogin.headers.get('set-cookie')!

    // 4. Webmaster queries teachers and system metrics
    const listRes = await app.request('/api/admin/teachers', {
      headers: { Cookie: adminCookie },
    })
    expect(listRes.status).toBe(200)
    const { teachers } = (await listRes.json()) as any
    const santana = teachers.find((t: any) => t.username === 'carlos.santana')
    expect(santana).toBeDefined()
    expect(santana.status).toBe('inactive')

    // 5. Webmaster approves teacher
    const approveRes = await app.request(`/api/admin/teachers/${santana.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ status: 'active' }),
    })
    expect(approveRes.status).toBe(200)

    // 6. Approved teacher can now login
    const teacherLogin = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'carlos.santana', password: 'claveInicial123' }),
    })
    expect(teacherLogin.status).toBe(200)
    const teacherData = (await teacherLogin.json()) as any
    expect(teacherData.user.role).toBe('teacher')

    // 7. Webmaster resets teacher password
    const resetTeacherPw = await app.request(`/api/admin/teachers/${santana.id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ newPassword: 'docenteSeguro2026' }),
    })
    expect(resetTeacherPw.status).toBe(200)

    // 8. Teacher logs in with new password
    const teacherLogin2 = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'carlos.santana', password: 'docenteSeguro2026' }),
    })
    expect(teacherLogin2.status).toBe(200)
  })

  it('manages lesson publishing lifecycle and ensures students only see published lessons', async () => {
    const app = createHttpApp()
    await AuthService.seedInitialUser()

    // 1. Teacher logs in
    const teacherLogin = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'docente', password: 'docente123' }),
    })
    const teacherCookie = teacherLogin.headers.get('set-cookie')!

    // 2. Teacher creates a class and a student
    const classRes = await app.request('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: teacherCookie },
      body: JSON.stringify({ name: 'Historia Universal' }),
    })
    const { class: classObj } = (await classRes.json()) as any

    const studentRes = await app.request(`/api/classes/${classObj.id}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: teacherCookie },
      body: JSON.stringify({
        displayName: 'Valeria Ramos',
        username: 'Valeria.Ramos',
        password: 'Password#2026',
      }),
    })
    expect(studentRes.status).toBe(201)

    // 3. Student logs in with mixed case username
    const studentLogin = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'valeria.ramos', password: 'Password#2026' }),
    })
    expect(studentLogin.status).toBe(200)
    const studentCookie = studentLogin.headers.get('set-cookie')!

    // 4. Teacher creates a lesson in DRAFT mode
    const lessonRes = await app.request(`/api/groups/${classObj.id}/lessons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: teacherCookie },
      body: JSON.stringify({
        title: 'Las Civilizaciones Antiguas',
        materialContent: 'Apuntes sobre Mesopotamia y Egipto.',
      }),
    })
    expect(lessonRes.status).toBe(201)
    const { lesson } = (await lessonRes.json()) as any
    expect(lesson.status).toBe('draft')

    // 5. Student queries lessons -> SHOULD BE EMPTY (since status is draft)
    const studentLessons1 = await app.request(`/api/groups/${classObj.id}/lessons`, {
      headers: { Cookie: studentCookie },
    })
    expect(studentLessons1.status).toBe(200)
    const body1 = (await studentLessons1.json()) as any
    expect(body1.lessons.length).toBe(0)

    // 6. Teacher adds an exercise to the lesson
    const exRes = await app.request(`/api/lessons/${lesson.id}/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: teacherCookie },
      body: JSON.stringify({
        type: 'mc',
        prompt: '¿Dónde floreció la civilización mesopotámica?',
        optionsJson: JSON.stringify(['Entre los ríos Tigris y Éufrates', 'En el Nilo', 'En el Amazonas']),
        answerJson: JSON.stringify('Entre los ríos Tigris y Éufrates'),
        points: 10,
        timeSec: 30,
      }),
    })
    expect(exRes.status).toBe(201)

    // 7. Teacher publishes the lesson for the class
    const publishRes = await app.request(`/api/lessons/${lesson.id}/publish`, {
      method: 'POST',
      headers: { Cookie: teacherCookie },
    })
    expect(publishRes.status).toBe(200)

    // 8. Student queries lessons again -> NOW VISIBLE
    const studentLessons2 = await app.request(`/api/groups/${classObj.id}/lessons`, {
      headers: { Cookie: studentCookie },
    })
    expect(studentLessons2.status).toBe(200)
    const body2 = (await studentLessons2.json()) as any
    expect(body2.lessons.length).toBe(1)
    expect(body2.lessons[0].title).toBe('Las Civilizaciones Antiguas')
    expect(body2.lessons[0].status).toBe('published')

    // 9. Teacher unpublishes lesson back to draft
    const unpublishRes = await app.request(`/api/groups/${classObj.id}/lessons/${lesson.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: teacherCookie },
      body: JSON.stringify({ status: 'draft' }),
    })
    expect(unpublishRes.status).toBe(200)

    // 10. Student queries lessons -> HIDDEN AGAIN
    const studentLessons3 = await app.request(`/api/groups/${classObj.id}/lessons`, {
      headers: { Cookie: studentCookie },
    })
    expect(studentLessons3.status).toBe(200)
    const body3 = (await studentLessons3.json()) as any
    expect(body3.lessons.length).toBe(0)
  })

  it('rejects unauthenticated requests to protected endpoints', async () => {
    const app = createHttpApp()
    const res = await app.request('/api/classes')
    expect(res.status).toBe(401)
  })
})
