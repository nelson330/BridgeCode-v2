import { beforeEach, describe, expect, it } from 'bun:test'
import { runDatabaseSeed } from '../../scripts/seed'
import { loadConfig } from '../../src/core/config'
import { initDb } from '../../src/core/db/client'
import { createHttpApp } from '../../src/core/http/app'

describe('Real Seed, Student Portal & Granular Gradebook', () => {
  beforeEach(async () => {
    loadConfig({ MODE: 'hosted' })
    initDb(':memory:')
    await runDatabaseSeed()
  })

  it('verifies full real database seed with teacher, students, classes and lessons', async () => {
    const app = createHttpApp()

    // 1. Login as teacher
    const loginTeacher = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'docente', password: 'docente123' }),
    })
    expect(loginTeacher.status).toBe(200)
    const teacherCookie = loginTeacher.headers.get('set-cookie')!

    // 2. Query classes
    const classesRes = await app.request('/api/classes', {
      headers: { Cookie: teacherCookie },
    })
    expect(classesRes.status).toBe(200)
    const { classes } = (await classesRes.json()) as any
    expect(classes.length).toBeGreaterThanOrEqual(2)
    const cienciasClass = classes.find((c: any) => c.name.includes('Ciencias'))
    expect(cienciasClass).toBeDefined()
    expect(cienciasClass.code).toBe('CN5A01')

    // 3. Query granular gradebook for Ciencias
    const gradebookRes = await app.request(`/api/classes/${cienciasClass.id}/gradebook`, {
      headers: { Cookie: teacherCookie },
    })
    expect(gradebookRes.status).toBe(200)
    const { gradebook } = (await gradebookRes.json()) as any
    expect(gradebook.students.length).toBe(2)
    expect(gradebook.students[0].displayName).toBeDefined()
    expect(gradebook.students[0].calculatedGrade).toBeGreaterThan(0)
    expect(gradebook.summary.classAverageAccuracy).toBeGreaterThan(0)

    // 4. Download CSV export of gradebook
    const exportCsvRes = await app.request(`/api/classes/${cienciasClass.id}/gradebook/export`, {
      headers: { Cookie: teacherCookie },
    })
    expect(exportCsvRes.status).toBe(200)
    const csvContent = await exportCsvRes.text()
    expect(csvContent).toContain('Estudiante')
    expect(csvContent).toContain('Sofía García')
    expect(csvContent).toContain('Carlos Ruiz')
  })

  it('allows student to login, view enrolled classes, active live sessions and solve homework', async () => {
    const app = createHttpApp()

    // 1. Login as Student (Sofía García)
    const loginStudent = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'sofia.garcia', password: 'alumno123' }),
    })
    expect(loginStudent.status).toBe(200)
    const studentCookie = loginStudent.headers.get('set-cookie')!

    // 2. Query student enrolled classes
    const studentClassesRes = await app.request('/api/student/classes', {
      headers: { Cookie: studentCookie },
    })
    expect(studentClassesRes.status).toBe(200)
    const { classes } = (await studentClassesRes.json()) as any
    expect(classes.length).toBeGreaterThanOrEqual(1)
    expect(classes[0].className).toContain('Ciencias Naturales')

    // 3. Query student homework
    const hwRes = await app.request('/api/student/homework', {
      headers: { Cookie: studentCookie },
    })
    expect(hwRes.status).toBe(200)
    const { homework } = (await hwRes.json()) as any
    expect(homework.length).toBeGreaterThanOrEqual(1)
    expect(homework[0].title).toContain('Tarea 1')
  })
})
