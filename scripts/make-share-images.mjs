/**
 * Ulashish rasmlari — HAQIQIY ilovadan / loyiha qahramonidan (ixtiro qilingan
 * skrinshot emas):
 *   public/og-image.png               1200×630 — Open Graph / Twitter kartasi
 *   public/screenshots/wide-*.png     1280×800 — PWA manifest (form_factor: wide)
 *   public/screenshots/narrow-*.png   390×844  — PWA manifest (narrow)
 *
 * Ishlatish: npm run build && npx vite preview --port 4317 &  →  node scripts/make-share-images.mjs
 */
import { chromium } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const URL = process.env.PREVIEW_URL ?? 'http://localhost:4317/AI_English_Academy/'
const PUB = path.join(ROOT, 'public')
mkdirSync(path.join(PUB, 'screenshots'), { recursive: true })

const mascot = `data:image/png;base64,${readFileSync(path.join(PUB, 'mascot', 'mascot-512.png')).toString('base64')}`
const card = `<!doctype html><html><body style="margin:0;width:1200px;height:630px;display:flex;align-items:center;gap:48px;
  padding:0 72px;box-sizing:border-box;background:linear-gradient(135deg,#0b1b34,#1c3fd8);font-family:Inter,system-ui,sans-serif;color:#fff">
  <img src="${mascot}" style="height:440px" alt="">
  <div><div style="font-size:64px;font-weight:900;line-height:1.05">AI English Academy</div>
  <div style="font-size:30px;margin-top:20px;color:#dbe6fe;line-height:1.35">Ingliz tili — o‘zbek tilida, o‘yin shaklida.<br>CEFR yo‘li: A1 va A2 darslari tayyor.</div>
  <div style="margin-top:28px;display:inline-block;background:#007a55;border-bottom:6px solid #004f3b;border-radius:18px;padding:14px 28px;font-size:26px;font-weight:900;letter-spacing:1px">BEPUL BOSHLASH</div></div></body></html>`

const b = await chromium.launch()
const og = await b.newPage({ viewport: { width: 1200, height: 630 } })
await og.setContent(card)
await og.screenshot({ path: path.join(PUB, 'og-image.png') })

for (const [name, vp] of [['wide', { width: 1280, height: 800 }], ['narrow', { width: 390, height: 844 }]]) {
  const ctx = await b.newContext({ viewport: vp, colorScheme: 'light' })
  const p = await ctx.newPage()
  for (const route of ['dashboard', 'path']) {
    await p.goto(URL + route)
    await p.waitForTimeout(1500)
    await p.screenshot({ path: path.join(PUB, 'screenshots', `${name}-${route}.png`) })
  }
  await ctx.close()
}
await b.close()
console.log('✓ og-image.png va 4 ta manifest skrinshoti yozildi')
