/**
 * Render tekshiruvi — qurilgan (dist) versiyani haqiqiy Chromium'da
 * CDP (remote debugging) orqali ochadi va HAR BIR marshrutning haqiqiy
 * DOM holatini tekshiradi.
 *
 * Nima uchun CDP va `--dump-dom` emas: dump-dom virtual-time byudjeti
 * tugagach DOM hali xom holicha qaytishi mumkin (flaky), CDP esa
 * render barqarorlashgunicha kutadi va konsol xatolarini ham yig'adi.
 *
 * Ishlatish: npm run build && npm run render:check
 * Brauzer topilmasa — skript ogohlantirib, exit 0 bilan chiqadi
 * (tekshiruv majburiy emas, lekin natijani yashirmaydi).
 */

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const PORT = 4199 + (Number(process.env.SMOKE_PORT_OFFSET ?? 0))
const CDP_PORT = 9333 + (Number(process.env.SMOKE_PORT_OFFSET ?? 0))

const ROUTES = [
  '/',
  '/login',
  '/dashboard',
  '/path',
  '/vocabulary',
  '/grammar',
  '/reading',
  '/listening',
  '/writing',
  '/speaking',
  '/mock-exam',
  '/progress',
  '/errors',
  '/settings',
  '/nope-404',
]

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
}

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean)
  for (const c of candidates) if (c && fs.existsSync(c)) return c
  return null
}

async function detectBase() {
  try {
    const html = await readFile(path.join(ROOT, 'index.html'), 'utf8')
    const m = html.match(/(?:src|href)="(\/[^"]*?)\/assets\/[^"]+\.(?:js|css)"/)
    return m?.[1] ?? ''
  } catch {
    return ''
  }
}

async function serve(base = '') {
  const server = createServer(async (req, res) => {
    let p = (req.url ?? '/').split('?')[0]
    // Base `/AI_English_Academy/` bilan build qilingan dist'ni lokallab
    // tekshirish uchun prefiksni qaytaramiz.
    if (base && p.startsWith(base)) p = p.slice(base.length) || '/'
    let file = path.join(ROOT, p)
    try {
      const s = await stat(file)
      if (s.isDirectory()) file = path.join(file, 'index.html')
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' })
      res.end(await readFile(file))
    } catch {
      res.writeHead(200, { 'content-type': MIME['.html'] })
      res.end(await readFile(path.join(ROOT, 'index.html')))
    }
  })
  await new Promise((r) => server.listen(PORT, r))
  return server
}

async function waitForCdp() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)
      if (r.ok) return true
    } catch {}
    await new Promise((r) => setTimeout(r, 250))
  }
  return false
}

class CDP {
  constructor(ws) {
    this.ws = ws
    this.nextId = 0
    this.pending = new Map()
    this.listeners = []
    ws.onmessage = (ev) => {
      const msg = JSON.parse(String(ev.data))
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        if (msg.error) reject(new Error(JSON.stringify(msg.error)))
        else resolve(msg.result)
      } else {
        for (const l of this.listeners) l(msg)
      }
    }
  }
  send(method, params = {}) {
    const id = ++this.nextId
    this.ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }))
  }
  on(fn) {
    this.listeners.push(fn)
  }
}

async function openPage() {
  const created = await (
    await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, { method: 'PUT' })
  ).json()
  const ws = new WebSocket(created.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve)
    ws.addEventListener('error', () => reject(new Error('WebSocket xatosi')))
  })
  return new CDP(ws)
}

async function checkRoute(url) {
  const cdp = await openPage()
  const consoleIssues = []
  cdp.on((m) => {
    if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) {
      consoleIssues.push(m.params.type + ': ' + m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 160))
    }
    if (m.method === 'Runtime.exceptionThrown') {
      consoleIssues.push('EXCEPTION: ' + (m.params.exceptionDetails.exception?.description ?? '').slice(0, 160))
    }
  })
  await cdp.send('Runtime.enable')
  await cdp.send('Page.enable')
  await cdp.send('Page.navigate', { url })

  // Render barqarorlashguncha kutish — 3 qo'shni o'lchov bir xil bo'lsa yetarli.
  const probe = `JSON.stringify({
    buttons: document.querySelectorAll('button').length,
    links: document.querySelectorAll('a[href]').length,
    textChars: (document.body.innerText || '').length,
    heading: (document.querySelector('h1,h2')?.innerText || document.body.innerText || '').slice(0, 46).replace(/\\s+/g, ' '),
    rootKids: document.getElementById('root')?.childElementCount ?? 0,
  })`

  let snap = null
  let lastKey = ''
  let stable = 0
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline && stable < 3) {
    await new Promise((r) => setTimeout(r, 800))
    const r = await cdp.send('Runtime.evaluate', { expression: probe, returnByValue: true })
    const cur = JSON.parse(r.result.value)
    const key = `${cur.rootKids}:${cur.buttons}:${cur.textChars}`
    if (key === lastKey) stable++
    else stable = 0
    lastKey = key
    snap = cur
  }
  try {
    cdp.ws.close()
  } catch {}
  return { snap, consoleIssues }
}

async function main() {
  try {
    await stat(ROOT)
  } catch {
    console.error('✗ dist/ yo‘q — avval `npm run build` bajaring.')
    process.exit(1)
  }
  const browser = findBrowser()
  if (!browser) {
    console.warn('⚠ Chrome/Edge topilmadi — render tekshiruvi o‘tkazilmadi (CHROME_PATH bilan ko‘rsating).')
    return
  }

  const BASE = await detectBase() // masalan '/AI_English_Academy' yoki ''
  const server = await serve(BASE)
  const udd = fs.mkdtempSync(path.join(os.tmpdir(), 'aea-render-'))
  const proc = spawn(
    browser,
    [
      '--headless=new',
      `--user-data-dir=${udd}`,
      `--remote-debugging-port=${CDP_PORT}`,
      '--disable-gpu',
      '--no-sandbox',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-component-update',
      'about:blank',
    ],
    { stdio: 'ignore' },
  )

  let bad = 0
  try {
    if (!(await waitForCdp())) throw new Error('CDP porti ochilmadi')
    console.log(`Brauzer: ${path.basename(browser)} · CDP :${CDP_PORT} · dist:${PORT} · base:${BASE || '/'}\n`)
    for (const route of ROUTES) {
      const { snap, consoleIssues } = await checkRoute(
        `http://127.0.0.1:${PORT}${BASE}${route === '/' ? '/' : route}`,
      )
      const crashed = consoleIssues.some((e) => e.startsWith('EXCEPTION'))
      // 404 / bo'sh holatli sahifalar ham render bo'ladi — matni qisqa,
      // shuning uchun chegarani past tutamiz (montaj + kamida 1 tugma).
      const ok = snap.rootKids > 0 && !crashed && (snap.textChars > 100 || snap.buttons >= 1)
      if (!ok) bad++
      console.log(
        `${ok ? '✓' : '✗'} ${route.padEnd(14)} tugma:${String(snap.buttons).padStart(3)} havola:${String(snap.links).padStart(3)} matn:${String(snap.textChars).padStart(6)}  ${snap.heading}`,
      )
      for (const e of consoleIssues.slice(0, 4)) console.log(`      ${e}`)
    }
  } finally {
    proc.kill()
    server.close()
    // Chrome yopilishi bilan papka bo'shashadi — bir necha marta urinish yetadi.
    try {
      fs.rmSync(udd, { recursive: true, force: true, maxRetries: 12, retryDelay: 300 })
    } catch {}
  }

  if (bad === 0) console.log(`\n✓ RENDER OK — ${ROUTES.length} marshrutning hammasi xatosiz o‘tkazdi.`)
  else console.log(`\n✗ RENDER: ${bad} marshrutda muammo.`)
  process.exit(bad === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error('render:check xatosi:', e.message ?? String(e))
  process.exit(1)
})
