import { type Page, expect, test } from '@playwright/test'

const titles = [
  'Del concepto a la participación.',
  '¿Quién comprendió el procedimiento?',
  'Una lección. Dos formas de activarla.',
  'Un recorrido claro para cada clase.',
  'Lista para abrir y probar.',
]

async function fits(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
    .toBeLessThanOrEqual(1)
  const smallControls = await page.locator('button').evaluateAll((buttons) =>
    buttons
      .filter((button) => {
        const box = button.getBoundingClientRect()
        return box.width > 0 && (box.width < 44 || box.height < 44)
      })
      .map((button) => button.getAttribute('aria-label') || button.textContent)
  )
  expect(smallControls).toEqual([])
}

for (const theme of ['light', 'dark']) {
  for (const width of [320, 375, 768, 1024, 1440, 1920]) {
    test(`project deck · ${theme} · ${width}px`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem('ap.theme', value), theme)
      await page.setViewportSize({ width, height: width < 768 ? 812 : 1080 })
      await page.goto('/proyecto')
      for (let i = 0; i < titles.length; i++) {
        await expect(page.getByRole('heading', { name: titles[i], exact: true })).toBeVisible()
        await expect(page.getByRole('heading', { name: titles[i], exact: true })).toBeFocused()
        await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(i + 1))
        await fits(page)
        if (i === 0 && (width === 320 || width === 1440)) {
          await expect(page.locator('.deck-cycle-item').last()).toHaveCSS('opacity', '1')
          await page.screenshot({ path: `test-results/project-deck-${width}-${theme}.png`, fullPage: true })
        }
        if (i < titles.length - 1) await page.getByRole('button', { name: 'Diapositiva siguiente' }).click()
      }
      await expect(page.getByRole('button', { name: 'Diapositiva siguiente' })).toBeDisabled()
      await expect(page.getByRole('link', { name: 'Abrir la demo' })).toHaveAttribute('href', '/login')
      await expect(page.getByRole('link', { name: 'Unirse con PIN' })).toHaveAttribute('href', '/join')
    })
  }
}

test('landing access, keyboard, speaker notes, fullscreen, theme sync and reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Conoce el proyecto' }).click()
  await expect(page).toHaveURL('/proyecto')
  await expect(page.getByRole('heading', { name: titles[0], exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Diapositiva anterior' })).toBeDisabled()
  await page.getByRole('button', { name: 'Guion para exponer', exact: true }).click()
  await expect(page.getByRole('complementary')).toContainText('Presenta AulaPlay como un apoyo al docente')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('heading', { name: titles[1], exact: true })).toBeVisible()
  await expect(page.getByRole('complementary')).toContainText('Plantea el problema')
  await page.keyboard.press('End')
  await expect(page.getByRole('heading', { name: titles[4], exact: true })).toBeVisible()
  await page.keyboard.press('PageUp')
  await expect(page.getByRole('heading', { name: titles[3], exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Diapositiva 3: Las herramientas' }).click()
  await expect(page.getByRole('heading', { name: titles[2], exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Pantalla completa', exact: true }).click()
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true)
  await page.getByRole('button', { name: 'Salir de pantalla completa' }).click()
  await page.getByRole('button', { name: 'Activar tema claro' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('link', { name: 'Volver al inicio de AulaPlay' }).click()
  await expect(page.getByRole('button', { name: 'Activar tema oscuro' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.goto('/proyecto')
  await expect(page.getByRole('heading', { name: titles[0], exact: true })).toBeFocused()
  await page.keyboard.press('End')
  await expect(page.getByRole('heading', { name: titles[4], exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: titles[0], exact: true })).toBeVisible()
})

test('all slides and notes remain accessible with 200% text in portrait and landscape', async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 812 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/proyecto')
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%'
    })
    await page.getByRole('button', { name: 'Guion para exponer', exact: true }).click()
    for (let i = 0; i < titles.length; i++) {
      await expect(page.getByRole('heading', { name: titles[i], exact: true })).toBeVisible()
      await fits(page)
      if (i < titles.length - 1) await page.getByRole('button', { name: 'Diapositiva siguiente' }).click()
    }
    await page.screenshot({ path: `test-results/project-deck-${viewport.width}-200.png`, fullPage: true })
  }
})

test('animated transitions enter and exit while preserving navigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/proyecto')
  for (let i = 0; i < titles.length; i++) {
    const heading = page.getByRole('heading', { name: titles[i], exact: true })
    await expect(heading).toBeFocused()
    await expect(heading).toHaveCSS('opacity', '1')
    if (i < titles.length - 1) await page.getByRole('button', { name: 'Diapositiva siguiente' }).click()
  }
  await page.getByRole('button', { name: 'Diapositiva 1: La propuesta' }).click()
  await expect(page.getByRole('heading', { name: titles[0], exact: true })).toBeFocused()
  await expect(page.locator('.deck-slide')).toHaveCount(1)
})
