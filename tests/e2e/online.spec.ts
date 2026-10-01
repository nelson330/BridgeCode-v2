import { type BrowserContext, type Page, expect, test } from '@playwright/test'

const classId = 'cls_historia_identidad'
const lessonId = 'lsn_identidad_unidad_1'
async function login(context: BrowserContext, username = 'docente', password = 'docente123') {
  const response = await context.request.post('/api/auth/login', { data: { username, password } })
  expect(response.ok()).toBe(true)
}
async function fits(page: Page, soft = false) {
  await page.waitForLoadState('networkidle')
  const result = await page.evaluate(() => ({
    width: innerWidth,
    actual: document.documentElement.scrollWidth,
    overflow: [...document.querySelectorAll('body *')]
      .filter((element) => element.getBoundingClientRect().right > innerWidth + 1)
      .slice(0, 8)
      .map((element) => `${element.tagName}.${element.className}`),
  }))
  const assertion = soft ? expect.soft : expect
  assertion(result.actual, `${page.url()} ${JSON.stringify(result)}`).toBeLessThanOrEqual(result.width + 1)
}
async function createSession(context: BrowserContext) {
  const response = await context.request.post('/api/sessions', {
    data: { classId, lessonId, mode: 'trivia' },
  })
  expect(response.status()).toBe(201)
  return (await response.json()).session as { sessionId: string; pin: string }
}

for (const theme of ['dark', 'light']) {
  for (const width of [320, 375, 768, 1024, 1440, 1920]) {
    test(`responsive ${width}px · ${theme}`, async ({ page, context }) => {
      await page.setViewportSize({ width, height: width < 768 ? 812 : 1080 })
      await context.addInitScript((theme) => {
        localStorage.setItem('ap.locale', 'es')
        localStorage.setItem('ap.theme', theme)
        localStorage.setItem('ap.muted', 'true')
      }, theme)
      await login(context)
      const session = await createSession(context)
      for (const path of [
        '/',
        '/dashboard',
        '/forum',
        `/present/${classId}/${lessonId}`,
        `/host/${session.sessionId}`,
      ]) {
        await page.goto(path)
        await expect(page.locator('#root')).not.toBeEmpty()
        await fits(page)
        if (path === '/dashboard') {
          if (width < 640) {
            await page.getByRole('button', { name: 'Seleccionar sección' }).click()
            await page.getByRole('menuitem', { name: 'Lecciones', exact: true }).click()
          } else await page.getByRole('tab', { name: 'Lecciones', exact: true }).click()
          await expect(page.getByRole('button', { name: 'Abrir lección' }).first()).toBeVisible()
          await fits(page)
          await page.getByRole('button', { name: 'Abrir lección' }).first().click()
          await expect(page.getByRole('dialog', { name: 'Abrir lección' })).toBeVisible()
          await fits(page)
          await page.getByRole('button', { name: 'Jugar en vivo', exact: true }).click()
          await fits(page)
          await page.keyboard.press('Escape')
        }
        if (path === '/' && (width === 320 || width === 1440))
          await page.screenshot({ path: `test-results/home-${width}-${theme}.png`, fullPage: true })
      }
      await login(context, 'sofia.garcia', 'alumno123')
      await page.goto('/student')
      await fits(page)
      await login(context, 'webmaster', 'admin123')
      await page.goto('/admin')
      await fits(page)
      await context.clearCookies()
      for (const path of ['/login', '/join']) {
        await page.goto(path)
        await fits(page)
      }
    })
  }
}

test('presentation has manual reveal, explanations, navigation, reload reset and a focused header', async ({
  page,
  context,
}) => {
  await login(context)
  await page.goto(`/present/${classId}/${lessonId}`)
  await expect(page.getByText('Pregunta 1 de 6', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Anterior', exact: true })).toBeDisabled()
  await expect(page.getByText('Fuente:', { exact: false })).toHaveCount(0)
  await page.getByRole('button', { name: 'Revelar respuesta' }).click()
  await expect(page.getByText('Mesoamérica se extiende', { exact: false })).toBeVisible()
  for (let question = 2; question <= 6; question++) {
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
    await expect(page.getByText(`Pregunta ${question} de 6`, { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Revelar respuesta' }).click()
  }
  await expect(page.getByRole('button', { name: 'Siguiente', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Anterior', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Revelar respuesta' })).toBeEnabled()
  await page.reload()
  await expect(page.getByText('Pregunta 1 de 6', { exact: true })).toBeVisible()
  await expect(page.locator('header')).toHaveCount(1)
  await page.getByRole('button', { name: 'Pantalla completa', exact: true }).click()
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true)
  await page.getByRole('button', { name: 'Salir de pantalla completa', exact: true }).click()
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false)
  await page.setViewportSize({ width: 844, height: 390 })
  await fits(page)
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await fits(page)
  await page.getByRole('button', { name: 'Revelar respuesta' }).click()
  await page.screenshot({ path: 'test-results/presentation-landscape-200.png', fullPage: true })
})

test('live game with two guests, scoring, final results and visible disconnect', async ({
  page: host,
  context,
  browser,
}) => {
  await login(context)
  const session = await createSession(context)
  const guestOne = await browser.newContext({
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 320, height: 812 },
    reducedMotion: 'reduce',
  })
  const guestTwo = await browser.newContext({ baseURL: 'http://127.0.0.1:4173', reducedMotion: 'reduce' })
  const one = await guestOne.newPage()
  const two = await guestTwo.newPage()
  try {
    await host.goto(`/host/${session.sessionId}`)
    for (const [page, name] of [
      [one, 'Participante Uno'],
      [two, 'Participante Dos'],
    ] as const) {
      await page.goto(`/join?pin=${session.pin}`)
      await page.getByLabel('Tu nombre o apodo').fill(name)
      await page.getByRole('button', { name: 'Entrar a jugar' }).click()
      await expect(page.getByRole('heading', { name: '¡Estás Dentro!' })).toBeVisible()
    }
    await expect(host.getByText('Participante Uno', { exact: true }).first()).toBeVisible()
    await expect(host.getByText('Participante Dos', { exact: true }).first()).toBeVisible()
    await expect(host.locator('svg[role="img"]').first()).toBeVisible()
    await host.getByRole('button', { name: '¡Comenzar Trivia!' }).click()
    await expect(one.getByRole('button', { name: /Del centro de México/ })).toBeVisible()
    await one.getByRole('button', { name: /Del centro de México/ }).click()
    await two.getByRole('button', { name: /Solamente por Nicaragua/ }).click()
    await expect(one.getByText('¡Respuesta Correcta!', { exact: true })).toBeVisible()
    await expect(two.getByText('Incorrecto', { exact: false }).first()).toBeVisible()
    await fits(one)
    await guestTwo.setOffline(true)
    await expect(two.getByText('Sin conexión.', { exact: false })).toBeVisible()
    await expect(two.getByRole('button', { name: 'Volver a unirme' })).toBeVisible()
    await guestTwo.setOffline(false)
    await host.getByRole('button', { name: 'Finalizar', exact: true }).click()
    await expect(host.getByRole('button', { name: 'Regresar al Panel Docente' })).toBeVisible()
    await expect(one.getByText('Participante Uno', { exact: true }).first()).toBeVisible()
    await fits(one)
    await host.setViewportSize({ width: 320, height: 812 })
    await fits(host)
    const reportResponse = await context.request.get(`/api/sessions/${session.sessionId}/report`)
    expect(reportResponse.ok()).toBe(true)
    const reportText = await reportResponse.text()
    expect(reportText).toContain('Participante Uno')
    await host.goto(`/host/${session.sessionId}`)
    await expect(host.getByRole('button', { name: 'Regresar al Panel Docente' })).toBeVisible()
    await fits(host)
    // A separate room remains open while the host loses the network.
    const lobby = await createSession(context)
    await host.goto(`/host/${lobby.sessionId}`)
    await expect(host.getByText('Conectado · En vivo', { exact: true })).toBeVisible()
    await context.setOffline(true)
    await expect(host.getByText('Sin conexión.', { exact: false })).toBeVisible()
    await expect(host.getByRole('button', { name: '¡Comenzar Trivia!' })).toBeDisabled()
    await context.setOffline(false)
    await host.getByRole('button', { name: 'Reconectar', exact: true }).click()
    await expect(host.getByText('Conectado · En vivo', { exact: true })).toBeVisible()
  } finally {
    await Promise.allSettled([guestOne.close(), guestTwo.close()])
  }
})

test('failed saves keep form input, validation is visible and destructive confirmation supports keyboard', async ({
  page,
  context,
}) => {
  await login(context)
  await page.goto('/dashboard')
  await page.getByRole('button', { name: 'Crear Nueva Clase', exact: true }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Crear Nueva Clase' })
  await dialog.locator('input').fill('Grupo conservado')
  await page.route('**/api/classes', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: { message: 'Servidor temporalmente ocupado' } }),
        })
      : route.continue()
  )
  await dialog.getByRole('button', { name: 'Crear Clase', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Servidor temporalmente ocupado' })).toBeVisible()
  await expect(dialog.locator('input')).toHaveValue('Grupo conservado')
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await page.getByRole('button', { name: 'Eliminar', exact: true }).first().click()
  const confirmation = page.getByRole('dialog', { name: 'Confirmar acción' })
  await expect(confirmation).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(confirmation).not.toBeVisible()
  await expect(page.getByText('Historia e Identidad Nacional', { exact: true }).first()).toBeVisible()
})

test('teacher editors, reading and tables fit a 320px mobile viewport', async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 812 })
  await login(context)
  await page.goto('/dashboard')
  async function selectTab(name: string) {
    await page.getByRole('button', { name: 'Seleccionar sección' }).click()
    await page.getByRole('menuitem', { name, exact: true }).click()
    await fits(page)
  }
  async function openAndClose(name: string, title: string) {
    await page.getByRole('button', { name, exact: true }).first().click()
    const dialog = page.getByRole('dialog', { name: title })
    await expect(dialog).toBeVisible()
    await fits(page)
    const height = await dialog.evaluate((node) => node.getBoundingClientRect().height)
    expect(height).toBeLessThanOrEqual(812)
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
  }
  await selectTab('Lecciones')
  await openAndClose('Crear Lección', 'Nueva Lección & Material de Estudio')
  await openAndClose('Editar Temario & Multimedia', 'Editar Lección & Temario')
  await openAndClose('+ Ejercicio Manual', 'Constructor Manual de Ejercicios')
  await page
    .getByRole('button', { name: /6 Ejercicios en esta lección/ })
    .first()
    .click()
  await fits(page)
  await selectTab('Tareas')
  await openAndClose('+ Asignar Nueva Tarea', 'Asignar Nueva Tarea o Actividad')
  await selectTab('Calificaciones')
  await selectTab('Alumnos')
  await openAndClose('Editar', 'Editar Estudiante')
  await login(context, 'sofia.garcia', 'alumno123')
  await page.goto('/student')
  await selectTab('Temario & Lecturas')
  await openAndClose('Leer Apuntes & Ver PDFs', 'Unidad I · Evolución histórica y sociocultural de Nicaragua')
})

test('main pages remain usable with 200 percent text and landscape mobile', async ({ page, context }) => {
  await context.addInitScript(() => {
    localStorage.setItem('ap.locale', 'es')
    document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.style.fontSize = '200%'
    })
  })
  await login(context)
  for (const viewport of [
    { width: 375, height: 812 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport)
    for (const path of ['/', '/dashboard', '/forum', `/present/${classId}/${lessonId}`]) {
      await page.goto(path)
      await fits(page, true)
    }
    await login(context, 'webmaster', 'admin123')
    await page.goto('/admin')
    await fits(page, true)
    await login(context, 'sofia.garcia', 'alumno123')
    await page.goto('/student')
    await fits(page, true)
    await context.clearCookies()
    for (const path of ['/login', '/join']) {
      await page.goto(path)
      await fits(page, true)
    }
    await login(context)
  }
})
