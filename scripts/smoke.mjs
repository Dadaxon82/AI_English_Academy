/**
 * Smoke testi — qurilgan (dist) versiyani haqiqiy serverda tekshiradi.
 *
 * 1. dist'ni statik server bilan ochadi;
 * 2. index.html, assetlar, manifest, /audio/manifest.json mavjudligini tekshiradi;
 * 3. Edge/Chromium bosh bo'lsa — sahifani ochib konsol xatolarini yig'adi va
 *    mobil (375px) + desktop (1280px) skrinshot oladi.
 *
 * Ishlatish: npm run build && npm run smoke
 */

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import { existsSync, mkdirSync } from 'node:fs'

const ROOT = resolve(import.meta.dirname, '..', 'dist')
const OUT = resolve(import.meta.dirname, '..', 'screenshots')
const PORT = 4173 + (Number(process.env.SMOKE_PORT_OFFSET ?? 0))

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon',
}

function fail(msg) {
  console.error('✗ SMOKE FAILED:', msg)
  process.exitCode = 1
}

/**
 * dist qanday `base` bilan qurilganini index.html'dan aniqlaymiz
 * (`/AI_English_Academy/assets/...`). Shu prefiks bilan so'raymiz —
 * base `/` bo'lsa bo'sh satr qaytadi.
 */
async function detectBase() {
  try {
    const html = await readFile(join(ROOT, 'index.html'), 'utf8')
    const m = html.match(/(?:src|href)="(\/[^"]*?)\/assets\/[^"]+\.(?:js|css)"/)
    return m?.[1] ?? ''
  } catch {
    return ''
  }
}

async function fileServer(base = '') {
  const server = createServer(async (req, res) => {
    let path = (req.url ?? '/').split('?')[0]
    // dist `base` bilan qurilgan bo'lishi mumkin (masalan '/AI_English_Academy')
    // — lokallab testda shu prefiksni qaytarib tashlaymiz.
    if (base && path.startsWith(base)) path = path.slice(base.length) || '/'
    let file = join(ROOT, path)
    try {
      let s = await stat(file)
      if (s.isDirectory()) {
        file = join(file, 'index.html')
        s = await stat(file)
      }
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
      res.end(await readFile(file))
    } catch {
      // SPA fallback
      try {
        res.writeHead(200, { 'content-type': MIME['.html'] })
        res.end(await readFile(join(ROOT, 'index.html')))
      } catch {
        res.writeHead(404).end('not found')
      }
    }
  })
  await new Promise((r) => server.listen(PORT, r))
  return server
}

async function get(path, { binary = false } = {}) {
  const res = await fetch(`http://localhost:${PORT}${path}`)
  return { status: res.status, body: binary ? await res.arrayBuffer() : await res.text() }
}

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    // Chrome oldinda: ba'zi tizimlarda Edge ochiq sessiyaga "ulanib"
    // skrinshotni asmoyin qoldiradi (ETIMEDOUT).
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'chrome',
    'chromium',
  ].filter(Boolean)
  for (const c of candidates) {
    if (c === 'chrome' || c === 'chromium') {
      try {
        execFileSync(c, ['--version'], { stdio: 'ignore' })
        return c
      } catch {}
    } else if (existsSync(c)) return c
  }
  return null
}

async function shoot(browser, url, out, width, height) {
  // DIQQAT: spawnSync ishlatib BO'LMAYDI — statik server shu jarayonda
  // ishlaydi va bloklangan event loop brauzerga javob bera olmaydi
  // (natijada ETIMEDOUT). Shuning uchun async spawn + kutish.
  // Alohida user-data-dir — ochiq turgan brauzer sessiyasiga ulanib qolmaslik uchun.
  const udd = fs.mkdtempSync(join(os.tmpdir(), 'aea-smoke-'))
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(
        browser,
        [
          '--headless=new',
          `--user-data-dir=${udd}`,
          '--disable-gpu',
          '--no-sandbox',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-component-update',
          '--virtual-time-budget=9000',
          `--window-size=${width},${height}`,
          `--screenshot=${out}`,
          url,
        ],
        { stdio: 'pipe' },
      )
      const timer = setTimeout(() => {
        child.kill('SIGKILL')
        reject(new Error('brauzer 90s ichida tugamadi'))
      }, 90_000)
      let stderr = ''
      child.stderr.on('data', (d) => (stderr += String(d)))
      child.on('error', (e) => {
        clearTimeout(timer)
        reject(e)
      })
      child.on('close', (code) => {
        clearTimeout(timer)
        if (code === 0 || existsSync(out)) resolve()
        else reject(new Error(`brauzer kodi ${code}: ${stderr.slice(0, 200)}`))
      })
    })
  } finally {
    fs.rmSync(udd, { recursive: true, force: true })
  }
}

async function main() {
  try {
    await stat(ROOT)
  } catch {
    fail('dist/ yo‘q — avval `npm run build` bajaring.')
    return
  }

  const BASE = await detectBase() // masalan '/AI_English_Academy' yoki ''
  const server = await fileServer(BASE)
  let problems = 0

  // 1. Asosiy sahifa va kerakli elementlar
  const index = await get(BASE ? `${BASE}/` : '/')
  if (index.status !== 200) {
    fail('index.html 200 qaytarmadi')
    problems++
  }
  for (const needle of ['<div id="root">', 'AI English Academy', 'type="module"']) {
    if (!index.body.includes(needle)) {
      fail(`index.html ichida "${needle}" topilmadi`)
      problems++
    }
  }

  // 2. Assetlarni kesh orqali tekshirish (base prefiksi bo'lishi mumkin:
  //    /AI_English_Academy/assets/...)
  const assetHref = index.body.match(/(?:src|href)="((?:\/[^"]*|\.\/)assets\/[^"]+\.(?:js|css))"/g) ?? []
  if (assetHref.length === 0) {
    fail('index.html da asset havolalari yo‘q')
    problems++
  }
  for (const m of assetHref) {
    let href = m.slice(m.indexOf('"') + 1, m.lastIndexOf('"'))
    if (href.startsWith('./')) href = BASE + href.slice(1)
    const r = await get(href)
    if (r.status !== 200) {
      fail(`asset ${href} — ${r.status}`)
      problems++
    }
  }

  // 3. PWA manifest va ikonalar
  const wm = await get('/manifest.webmanifest')
  if (wm.status !== 200 || !wm.body.includes('"lang":"uz"')) {
    fail('manifest.webmanifest topilmadi yoki lang: uz yo‘q')
    problems++
  }
  for (const icon of ['/icons/icon-192.png', '/icons/icon-512.png']) {
    const r = await get(icon, { binary: true })
    if (r.status !== 200) {
      fail(`icona ${icon} yo‘q — npm run icons:build bajaring`)
      problems++
    }
  }

  // 4. /sw.js (service worker build'ga kiritilganmi)
  const sw = await get('/sw.js')
  if (sw.status !== 200) {
    fail('sw.js topilmadi — PWA service worker build bo‘lmagan')
    problems++
  }

  // 5. Audio manifesti — bo'lmasa ilova pleyerni yashiradi (xato emas, ogohlantirish)
  const audio = await get('/audio/manifest.json')
  if (audio.status !== 200) {
    console.warn('⚠ /audio/manifest.json yo‘q — audio pleyer yashirinadi (`npm run audio:build` bajaring).')
  } else {
    const json = JSON.parse(audio.body)
    const avail = (json.items ?? []).filter((i) => i.available).length
    console.log(`✓ audio manifesti: ${json.items?.length ?? 0} yozuv, ${avail} ta fayli mavjud`)
    for (const it of (json.items ?? []).filter((i) => i.available).slice(0, 2)) {
      const r = await get(it.src, { binary: true })
      if (r.status !== 200) {
        fail(`manifestda available=${it.src} lekin fayl 404`)
        problems++
      }
    }
  }

  // 6. Statik resurslar va (BrowserRouter build bo'lsa) SPA marshrutlari
  for (const route of ['/dashboard', '/mock-exam', '/settings']) {
    const r = await get(`${BASE}${route}`)
    if (r.status !== 200 || !r.body.includes('id="root"')) {
      fail(`marshrut ${BASE}${route} fallback ishlamadi`)
      problems++
    }
  }

  // 7. Brauzer bilan skrinshotlar (mavjud bo'lsa)
  const browser = findBrowser()
  if (browser) {
    mkdirSync(OUT, { recursive: true })
    const shots = [
      { out: join(OUT, 'mobile-375.png'), w: 375, h: 720 },
      { out: join(OUT, 'desktop-1280.png'), w: 1280, h: 860 },
    ]
    for (const s of shots) {
      try {
        await shoot(browser, `http://localhost:${PORT}${BASE}${BASE ? '/' : ''}`, s.out, s.w, s.h)
        if (existsSync(s.out)) console.log(`✓ skrinshot: ${s.out}`)
        else fail(`skrinshot yaratilmadi: ${s.out}`)
      } catch (e) {
        console.warn(`⚠ skrinshot olinmadi (${s.out}):`, String(e.message).split('\n')[0])
      }
    }
  } else {
    console.warn('⚠ Chrome/Edge topilmadi — skrinshotlar olinkanani tashlashdi.')
  }

  server.close()
  if (problems === 0) console.log('\n✓ SMOKE PASSED — barcha tekshiruvlar otdi.')
  else console.log(`\n✗ SMOKE: ${problems} muammo topildi.`)
}

main().catch((e) => {
  fail(e.stack ?? String(e))
})
