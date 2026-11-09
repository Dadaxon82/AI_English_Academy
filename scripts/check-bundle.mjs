/**
 * Boshlang'ich JS byudjeti: `dist/index.html` darhol yuklaydigan skriptlar
 * (entry + modulepreload) gzip hajmi BUDGET_KB dan oshmasin.
 * Sahifa chunk'lari (React.lazy) va Supabase (dinamik import) bunga kirmaydi.
 *
 * Ishlatish: npm run build && node scripts/check-bundle.mjs
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const BUDGET_KB = Number(process.env.BUNDLE_BUDGET_KB ?? 300)
const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const html = readFileSync(path.join(DIST, 'index.html'), 'utf8')
const refs = [...html.matchAll(/<(?:script[^>]*\ssrc|link[^>]*rel="modulepreload"[^>]*\shref)="([^"]+\.js)"/g)].map((m) => m[1])
const base = (html.match(/(?:src|href)="(\/[^"]*?)\/assets\//) ?? [])[1] ?? ''

let raw = 0
let gz = 0
for (const ref of refs) {
  const file = path.join(DIST, ref.slice(base.length))
  const buf = readFileSync(file)
  const g = gzipSync(buf, { level: 9 }).length
  raw += buf.length
  gz += g
  console.log(`  ${path.basename(file).padEnd(34)} ${(buf.length / 1024).toFixed(1).padStart(7)} KB  gzip ${(g / 1024).toFixed(1).padStart(6)} KB`)
}
const ok = gz / 1024 <= BUDGET_KB
console.log(`${ok ? '✓' : '✗'} boshlang'ich JS: ${(raw / 1024).toFixed(1)} KB, gzip ${(gz / 1024).toFixed(1)} KB (byudjet ${BUDGET_KB} KB gzip)`)
process.exit(ok ? 0 : 1)
