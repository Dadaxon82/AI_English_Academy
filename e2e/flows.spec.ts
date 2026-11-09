import { expect, test } from '@playwright/test'
import { answerSomething, disableHearts, expectClean, skipThroughLesson, waitPersist, watchErrors } from './helpers'

/**
 * 5 asosiy oqim. Har test toza brauzer kontekstida (bo'sh IndexedDB) —
 * mehmon (mahalliy) rejim, Supabase kalitlarisiz.
 */

test('onboarding → dashboard', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('onboarding')
  await page.getByRole('button', { name: 'Davom etish' }).click()
  await page.getByRole('button', { name: 'Davom etish' }).click()
  await page.getByRole('button', { name: 'Hozir o‘tkazmayman' }).click()
  await expect(page.getByRole('heading', { name: /Hammasi tayyor/ })).toBeVisible()
  await page.getByRole('button', { name: 'Dashboardga o‘tish' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  // Onboarding yakunlangan — "to'ldirilmagan" eslatmasi chiqmaydi
  await expect(page.getByText('Boshlang‘ich sozlamalar to‘ldirilmagan.')).toHaveCount(0)
  await expectClean(page, errors)
})

test('dars rejimi: grammatika darsi oxirigacha', async ({ page }) => {
  const errors = watchErrors(page)
  await disableHearts(page)
  await page.goto('grammar')
  await page.getByRole('button', { name: 'Darsni boshlash' }).first().click()
  await expect(page.locator('.aea-lesson').first()).toBeVisible()
  await expectClean(page, errors)
  await skipThroughLesson(page)
  await expect(page.getByText(/Aniqlik/).first()).toBeVisible()
  await expectClean(page, errors)
})

test('so‘z o‘yini: lug‘at o‘yini oxirigacha', async ({ page }) => {
  const errors = watchErrors(page)
  await disableHearts(page)
  await page.goto('vocabulary')
  await page.getByRole('button', { name: 'O‘yinni boshlash' }).click()
  await expect(page.locator('.aea-lesson').first()).toBeVisible()
  await expectClean(page, errors)
  await skipThroughLesson(page)
  await expectClean(page, errors)
})

test('sakrash testi: savollarga javob va natija', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('sections')
  await page.getByRole('button', { name: /sakrash testi/i }).first().click()
  await page.getByRole('button', { name: 'Testni boshlash' }).click()
  const result = page.getByText(/Sakrash testi topshirildi|sakrash uchun yetarli emas/)
  for (let i = 0; i < 40 && !(await result.count()); i++) {
    const runner = page.locator('.aea-lesson').first()
    await answerSomething(runner)
    await runner.getByRole('button', { name: 'Tekshirish' }).click()
    await runner.getByRole('button', { name: /Keyingi mashq|Yakunlash/ }).click()
  }
  await expect(result).toBeVisible()
  await expectClean(page, errors)
})

test('xatolar o‘yini: xato qilingan mashqlarni qayta ishlash', async ({ page }) => {
  const errors = watchErrors(page)
  await disableHearts(page)
  // Xato yaratamiz: grammatika darsini o'tkazib yuborib o'tamiz
  await page.goto('grammar')
  await page.getByRole('button', { name: 'Darsni boshlash' }).first().click()
  await skipThroughLesson(page)
  await waitPersist(page)

  await page.goto('errors')
  const card = page.locator('div.rounded-2xl', { hasText: 'Xatolarni tuzatish' }).last()
  const start = card.getByRole('button', { name: 'Boshlash' })
  await expect(start).toBeEnabled()
  await start.click()
  await expect(page.locator('.aea-lesson').first()).toBeVisible()
  await expectClean(page, errors)
  await skipThroughLesson(page)
  await expectClean(page, errors)
})
