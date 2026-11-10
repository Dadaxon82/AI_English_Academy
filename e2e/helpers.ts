import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Umumiy yordamchilar. Har test `watchErrors` bilan boshlanadi va oxirida
 * `expectClean` chaqiradi: konsol xatosi va gorizontal scroll yo'q.
 */
export function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })
  return errors
}

export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, 'gorizontal scroll bölmasligi kerak').toBeLessThanOrEqual(1)
}

export async function expectClean(page: Page, errors: string[]): Promise<void> {
  await expectNoHorizontalScroll(page)
  expect(errors, 'konsol xatolari bölmasligi kerak').toEqual([])
}

/** Ma'lumot IndexedDB'ga debounce bilan yoziladi — sahifa almashishidan oldin kutamiz. */
export async function waitPersist(page: Page): Promise<void> {
  await page.waitForTimeout(900)
}

/** Yuraklar tizimini o'chiradi — xato javoblar darvozaga urilmasin. */
export async function disableHearts(page: Page): Promise<void> {
  await page.goto('settings')
  const cb = page.getByRole('checkbox', { name: /Yuraklar tizimi/ })
  await expect(cb).toBeVisible()
  if (await cb.isChecked()) await cb.uncheck()
  await expect(cb).not.toBeChecked()
  await waitPersist(page)
}

/**
 * LessonPlayer darsini oxirigacha "O'tkazib yuborish" bilan o'tadi
 * (har mashq xato sifatida yoziladi). «Dars tugadi!» chiqishini kutadi.
 */
export async function skipThroughLesson(page: Page, maxSteps = 80): Promise<void> {
  const end = page.getByText(/Dars tugadi!|Vaqt tugadi!/)
  for (let i = 0; i < maxSteps; i++) {
    if (await end.count()) break
    const lesson = page.locator('.aea-lesson').first()
    const cont = lesson.getByRole('button', { name: 'Davom etiş' })
    if (await cont.count()) {
      await cont.first().click()
      continue
    }
    const skip = lesson.getByRole('button', { name: 'Ötkazib yuboriş' })
    if (await skip.count()) {
      await skip.click()
      await lesson.getByRole('button', { name: /Keyingi maşq|Yakunlaş/ }).click()
      continue
    }
    await page.waitForTimeout(100)
  }
  await expect(end).toBeVisible()
}

/** ExerciseRunner'da "Tekshirish" faol bo'lguncha biror javob tanlaydi/yozadi. */
export async function answerSomething(scope: Locator): Promise<void> {
  const check = scope.getByRole('button', { name: 'Tekşiriş' })
  const pairs = scope.locator('.grid-cols-2 > div')
  if ((await pairs.count()) === 2 && (await pairs.nth(0).locator('button').count()) > 0) {
    const n = await pairs.nth(0).locator('button').count()
    for (let i = 0; i < n; i++) {
      await pairs.nth(0).locator('button').nth(i).click()
      await pairs.nth(1).locator('button:enabled:not([aria-pressed=true])').first().click()
    }
  }
  for (let t = 0; t < 14 && !(await check.isEnabled()); t++) {
    const inputs = scope.locator('input:enabled:not([type=checkbox]), textarea:enabled')
    const ni = await inputs.count()
    if (ni) {
      for (let i = 0; i < ni; i++) await inputs.nth(i).fill('am')
      continue
    }
    const selects = scope.locator('select:enabled')
    const ns = await selects.count()
    if (ns) {
      for (let i = 0; i < ns; i++) await selects.nth(i).selectOption({ index: 1 })
      continue
    }
    const btns = scope.locator('[role=radio]:enabled, [role=checkbox]:enabled, .aea-choice:enabled')
    const nb = await btns.count()
    if (!nb) break
    await btns.nth(t % nb).click()
  }
  await expect(check).toBeEnabled()
}
