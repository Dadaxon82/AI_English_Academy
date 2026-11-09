import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { disableHearts, skipThroughLesson } from './helpers'

/**
 * WCAG 2.1 AA — axe-core. Har marshrutda `serious` va `critical`
 * buzilishlar soni 0 bo'lishi shart (yorug' va qorong'i mavzuda).
 */
const ROUTES = [
  'dashboard', 'path', 'sections', 'vocabulary', 'grammar', 'reading', 'listening',
  'writing', 'speaking', 'mock-exam', 'progress', 'errors', 'settings', 'onboarding', 'quick', 'dialogues',
]

for (const scheme of ['light', 'dark'] as const) {
  for (const route of ROUTES) {
    test(`a11y ${scheme}: /${route}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto(route)
      await page.locator('main, #root > *').first().waitFor()
      await page.waitForTimeout(400)
      const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
      const bad = res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      const report = bad.map((v) => `${v.id} (${v.impact}) ×${v.nodes.length}: ${v.nodes.slice(0, 4).map((n) => n.target.join(' ')).join(' | ')}`)
      expect(report, 'serious/critical axe buzilishlari').toEqual([])
    })
  }
}

async function seriousViolations(page: import('@playwright/test').Page): Promise<string[]> {
  // Kirish animatsiyalari (fade-in) tugashini kutamiz — aks holda axe
  // shaffof holatdagi matnni o'lchab, soxta kontrast xatosi beradi.
  await page.waitForTimeout(900)
  const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  return res.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} (${v.impact}) ×${v.nodes.length}: ${v.nodes.slice(0, 4).map((n) => n.target.join(' ')).join(' | ')}`)
}

for (const scheme of ['light', 'dark'] as const) {
  test(`a11y ${scheme}: dars ichida (savol, natija, yakun)`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await disableHearts(page)
    await page.goto('grammar')
    await page.getByRole('button', { name: 'Darsni boshlash' }).first().click()
    const lesson = page.locator('.aea-lesson').first()
    const found: string[] = []
    // Qoida kartasi
    found.push(...(await seriousViolations(page)))
    await lesson.getByRole('button', { name: 'Davom etish' }).click()
    // Savol (idle) va xato natija holati
    found.push(...(await seriousViolations(page)))
    await lesson.getByRole('button', { name: 'O‘tkazib yuborish' }).click()
    found.push(...(await seriousViolations(page)))
    await lesson.getByRole('button', { name: /Keyingi mashq|Yakunlash/ }).click()
    await skipThroughLesson(page)
    found.push(...(await seriousViolations(page)))
    expect([...new Set(found)], 'serious/critical axe buzilishlari').toEqual([])
  })
}

for (const scheme of ['light', 'dark'] as const) {
  test(`a11y ${scheme}: «5 daqiqa» sessiyasi ichida`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await page.goto('quick')
    await page.getByRole('button', { name: /Boshlash/ }).click()
    await expect(page.getByRole('button', { name: 'Bilaman →' })).toBeVisible()
    const found = await seriousViolations(page)
    await page.getByRole('button', { name: /tarjimani ko‘rish/ }).click()
    found.push(...(await seriousViolations(page)))
    expect([...new Set(found)], 'serious/critical axe buzilishlari').toEqual([])
  })
}

for (const scheme of ['light', 'dark'] as const) {
  test(`a11y ${scheme}: suhbat darsi ichida (o‘qish, savol, izoh)`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await disableHearts(page)
    await page.goto('dialogues')
    await page.getByRole('button', { name: 'Boshlash' }).first().click()
    const lesson = page.locator('.aea-lesson').first()
    const found = await seriousViolations(page)
    await page.getByRole('button', { name: 'O‘zbekcha tarjimani ko‘rsatish' }).click()
    found.push(...(await seriousViolations(page)))
    await lesson.getByRole('button', { name: 'Davom etish' }).click()
    found.push(...(await seriousViolations(page)))
    await skipThroughLesson(page)
    found.push(...(await seriousViolations(page)))
    expect([...new Set(found)], 'serious/critical axe buzilishlari').toEqual([])
  })
}
