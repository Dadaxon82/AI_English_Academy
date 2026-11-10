import { expect, test } from '@playwright/test'
import { answerSomething, disableHearts, expectClean, skipThroughLesson, waitPersist, watchErrors } from './helpers'

/**
 * 5 asosiy oqim. Har test toza brauzer kontekstida (bo'sh IndexedDB) —
 * mehmon (mahalliy) rejim, Supabase kalitlarisiz.
 */

test('onboarding → dashboard', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('onboarding')
  await page.getByRole('button', { name: 'Davom etiş' }).click()
  await page.getByRole('button', { name: 'Davom etiş' }).click()
  await page.getByRole('button', { name: 'Hozir ötkazmayman' }).click()
  await expect(page.getByRole('heading', { name: /Hammasi tayyor/ })).toBeVisible()
  await page.getByRole('button', { name: 'Dashboardga ötiş' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  // Onboarding yakunlangan — "to'ldirilmagan" eslatmasi chiqmaydi
  await expect(page.getByText('Boşlanğiç sozlamalar töldirilmagan.')).toHaveCount(0)
  await expectClean(page, errors)
})

test('dars rejimi: grammatika darsi oxirigaça', async ({ page }) => {
  const errors = watchErrors(page)
  await disableHearts(page)
  await page.goto('grammar')
  await page.getByRole('button', { name: 'Darsni boşlaş' }).first().click()
  await expect(page.locator('.aea-lesson').first()).toBeVisible()
  await expectClean(page, errors)
  await skipThroughLesson(page)
  await expect(page.getByText(/Aniqlik/).first()).toBeVisible()
  await expectClean(page, errors)
})

test('söz öyini: luğat öyini oxirigaça', async ({ page }) => {
  const errors = watchErrors(page)
  await disableHearts(page)
  await page.goto('vocabulary')
  await page.getByRole('button', { name: 'Öyinni boşlaş' }).click()
  await expect(page.locator('.aea-lesson').first()).toBeVisible()
  await expectClean(page, errors)
  await skipThroughLesson(page)
  await expectClean(page, errors)
})

test('sakraş testi: savollarga javob va natija', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('sections')
  await page.getByRole('button', { name: /sakraş testi/i }).first().click()
  await page.getByRole('button', { name: 'Testni boşlaş' }).click()
  const result = page.getByText(/Sakraş testi topşirildi|sakraş uçun yetarli emas/)
  for (let i = 0; i < 40 && !(await result.count()); i++) {
    const runner = page.locator('.aea-lesson').first()
    await answerSomething(runner)
    await runner.getByRole('button', { name: 'Tekşiriş' }).click()
    await runner.getByRole('button', { name: /Keyingi maşq|Yakunlaş/ }).click()
  }
  await expect(result).toBeVisible()
  await expectClean(page, errors)
})

test('xatolar öyini: xato qilingan maşqlarni qayta işlaş', async ({ page }) => {
  const errors = watchErrors(page)
  await disableHearts(page)
  // Xato yaratamiz: grammatika darsini o'tkazib yuborib o'tamiz
  await page.goto('grammar')
  await page.getByRole('button', { name: 'Darsni boşlaş' }).first().click()
  await skipThroughLesson(page)
  await waitPersist(page)

  await page.goto('errors')
  const card = page.locator('div.rounded-2xl', { hasText: 'Xatolarni tuzatiş' }).last()
  const start = card.getByRole('button', { name: 'Boşlaş' })
  await expect(start).toBeEnabled()
  await start.click()
  await expect(page.locator('.aea-lesson').first()).toBeVisible()
  await expectClean(page, errors)
  await skipThroughLesson(page)
  await expectClean(page, errors)
})

test('A2: onboardingda A2 tanlansa — yöl, grammatika va tinglaş A2 kontentini oçadi', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('onboarding')
  await page.getByRole('button', { name: 'A2', exact: true }).first().click()
  await page.getByRole('button', { name: 'Davom etiş' }).click()
  await page.getByRole('button', { name: 'Davom etiş' }).click()
  await page.getByRole('button', { name: 'Hozir ötkazmayman' }).click()
  await page.getByRole('button', { name: 'Dashboardga ötiş' }).click()
  await waitPersist(page)
  await page.goto('path')
  await expect(page.getByText('Ötgan hafta oxiri').first()).toBeVisible()
  await page.goto('grammar')
  await expect(page.getByText(/Past Simple/).first()).toBeVisible()
  await page.goto('listening')
  await expect(page.getByText(/fayl hali yaratilmagan/).first()).toBeVisible()
  // Fayl yo'q — soxta pleyer ko'rsatilmaydi
  await expect(page.locator('audio')).toHaveCount(0)
  await expectClean(page, errors)
})

test('SEO/OG meta va PWA manifest skrinşotlari haqiqatan mavjud', async ({ page, request }) => {
  await page.goto('dashboard')
  const og = await page.locator('meta[property="og:image"]').getAttribute('content')
  expect(og).toMatch(/^https:\/\/.+\/og-image\.png$/)
  expect(await page.locator('meta[name="twitter:card"]').getAttribute('content')).toBe('summary_large_image')
  // Rasm fayli build'da bor (mutlaq URL Pages'ga ishora qiladi — shu nisbiy yo'lni tekshiramiz)
  expect((await request.get('og-image.png')).status()).toBe(200)
  const manifest = await (await request.get('manifest.webmanifest')).json()
  expect(manifest.screenshots.length).toBeGreaterThanOrEqual(2)
  for (const s of manifest.screenshots) expect((await request.get(s.src)).status(), s.src).toBe(200)
})

test('xarita: tugun bosilsa bölim darsi oçiladi, yakunlangaç ball tugun ustida', async ({ page }) => {
  const errors = watchErrors(page)
  await disableHearts(page)
  await page.goto('path')
  await page.getByRole('button', { name: /^Grammatika:/ }).first().click()
  await expect(page).toHaveURL(/\/lesson\/a1-day-01\/grammar$/)
  await skipThroughLesson(page)
  await expect(page.getByText(/Natija: \d+%/)).toBeVisible()
  await page.getByRole('button', { name: 'Davom etiş' }).last().click()
  await expect(page).toHaveURL(/\/path$/)
  await expect(page.getByRole('button', { name: /^Grammatika: .* — natija \d+%/ }).first()).toBeVisible()
  await expectClean(page, errors)
})

test('«5 daqiqa»: dashboard → sessiya, suriş va tugmalar bilan baholaş', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('dashboard')
  await page.getByRole('link', { name: '5 daqiqa boşlaş' }).click()
  await expect(page).toHaveURL(/\/quick$/)
  await page.getByRole('button', { name: /Boşlaş/ }).click()
  const card = page.getByRole('button', { name: /tarjimani köriş/ })
  await expect(card).toBeVisible()
  const counter = page.getByText(/^1 \/ \d+$/)
  await expect(counter).toBeVisible()
  // O'ngga surish — «Bilaman» (sichqoncha/barmoq bilan bir xil Pointer hodisalari).
  const box = (await card.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + box.width * 0.4, box.y + box.height / 2, { steps: 8 })
  await page.mouse.up()
  await expect(page.getByText(/^2 \/ \d+$/)).toBeVisible()
  await page.getByRole('button', { name: '← Yana' }).click()
  await expect(page.getByText(/^3 \/ \d+$/)).toBeVisible()
  await expectClean(page, errors)
})

test('suhbatlar: A1 suhbati oxirigaça va xato Takrorlaş menejeriga tuşadi', async ({ page }) => {
  const errors = watchErrors(page)
  await disableHearts(page)
  await page.goto('dialogues')
  await expect(page.getByRole('heading', { name: 'Real hayot suhbatlari' })).toBeVisible()
  await page.getByRole('button', { name: 'Boşlaş' }).first().click()
  await expect(page.locator('.aea-lesson').first()).toBeVisible()
  await skipThroughLesson(page)
  await expect(page.getByText('Dars tugadi!')).toBeVisible()
  await expectClean(page, errors)
  await waitPersist(page)
  await page.goto('errors')
  await expect(page.getByRole('heading', { name: /Bugungi takror: 3 ta xato \+ 0 ta söz/ })).toBeVisible()
  await page.getByRole('button', { name: 'Takrorlaşni boşlaş' }).click()
  await expect(page.locator('.aea-lesson').first()).toBeVisible()
  await expectClean(page, errors)
})

test('suhbatdoş: stsenariy rejimida kafe suhbati oxirigaça', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('conversation')
  await expect(page.getByText(/AI ulanmagan/)).toBeVisible()
  await page.getByRole('article').filter({ hasText: 'Kafeda buyurtma beriş' }).getByRole('button', { name: 'Gaplaşiş' }).click()
  for (const t of ['Can I have tea please', 'I would like a sandwich', 'How much is it']) {
    await page.getByLabel('Javobingiz').fill(t)
    await page.getByRole('button', { name: 'Yuboriş' }).click()
  }
  await expect(page.getByRole('heading', { name: 'Suhbat yakunlandi' })).toBeVisible()
  await expectClean(page, errors)
})

test('immersion: Sozlamada yoqilsa luğat kartasida tarjima yaşirinadi va tugma bilan oçiladi', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('settings')
  await page.getByRole('checkbox', { name: /Özbekça tarjimalarni yaşiriş/ }).check()
  await page.goto('vocabulary')
  await page.getByRole('button', { name: 'Ro\'yxat' }).click()
  const card = page.locator('article').first()
  await expect(card.getByRole('button', { name: 'Tarjimani körsatiş' })).toBeVisible()
  await card.getByRole('button', { name: 'Tarjimani körsatiş' }).click()
  await expect(card.getByRole('button', { name: 'Tarjimani körsatiş' })).toHaveCount(0)
  await page.goto('pronunciation')
  await expect(page.getByRole('heading', { name: 'Talaffuz maşqi' })).toBeVisible()
  await expectClean(page, errors)
})
