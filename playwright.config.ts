import { defineConfig } from '@playwright/test'

/**
 * E2E (brauzer) testlari — qurilgan (`dist`) ilovani `vite preview` orqali
 * ochadi. Avval `npm run build`, keyin `npm run e2e`.
 *
 * Ikki o'lcham: kompyuter (1280px) va telefon (375px). Har testda konsol
 * xatosi va gorizontal scroll yo'qligi tekshiriladi (`e2e/helpers.ts`).
 */
const PORT = Number(process.env.E2E_PORT ?? 4317)
const BASE = process.env.VITE_BASE ?? '/AI_English_Academy/'

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}${BASE}`,
    trace: 'off',
    launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
  },
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1280, height: 900 } } },
    { name: 'mobile', use: { browserName: 'chromium', viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}${BASE}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
