/**
 * README sonlari — QO'LDA EMAS, o'lchab yoziladi.
 *
 *   npm run stats          — o'lchaydi (vitest JSON hisoboti bilan) va README'dagi
 *                            <!-- STATS:START --> … <!-- STATS:END --> blokini yangilaydi
 *   npm run stats -- --check — faqat kontent sonlarini (tez) qayta o'lchaydi va README
 *                            bilan solishtiradi; farq bo'lsa exit 1 (CI'da).
 */
import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const README = path.join(ROOT, 'README.md')
const TMP = path.join(ROOT, '.tmp-stats')
const CHECK = process.argv.includes('--check')

async function contentStats() {
  mkdirSync(TMP, { recursive: true })
  const idx = path.join(ROOT, 'src', 'content', 'index.ts').replace(/\\/g, '/')
  writeFileSync(
    path.join(TMP, 'entry.ts'),
    `import * as C from ${JSON.stringify(idx)}
export async function stats() {
  await C.loadLevels()
  return C.LOADED_LEVELS.map((l) => {
    const b = C.getBundle(l)
    const ex = C.allExercises(l)
    const kinds = {}
    for (const e of ex) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1
    return { level: l, days: b.days.length, vocab: b.vocab.length, glossary: b.reading.reduce((a, r) => a + (r.glossary?.length ?? 0), 0), exercises: ex.length, kinds, audio: b.listening.filter((t) => t.audio.fileAvailable).length, listening: b.listening.length, mock: b.mockExam ? 1 : 0 }
  })
}`,
    'utf8',
  )
  await build({ entryPoints: [path.join(TMP, 'entry.ts')], bundle: true, format: 'cjs', platform: 'node', outfile: path.join(TMP, 'b.cjs'), logLevel: 'error' })
  const levels = await createRequire(import.meta.url)(path.join(TMP, 'b.cjs')).stats()
  rmSync(TMP, { recursive: true, force: true })
  return levels
}

function contentBlock(levels) {
  const rows = levels.map(
    (l) =>
      `| ${l.level} | ${l.days} | ${l.vocab} + ${l.glossary} glossariy | ${l.exercises} | ${Object.entries(l.kinds).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ')} | ${l.audio}/${l.listening} | ${l.mock ? 'bor' : 'yo‘q'} |`,
  )
  return ['| Daraja | Kun | Lug‘at | Mashq | Turlar | Audio fayl / tinglash | Mock |', '|---|---|---|---|---|---|---|', ...rows].join('\n')
}

function testStats() {
  const out = path.join(ROOT, 'node_modules', '.tmp-vitest.json')
  try {
    execFileSync('npx', ['vitest', 'run', '--reporter=json', `--outputFile=${out}`], { cwd: ROOT, stdio: 'ignore' })
  } catch {
    /* muvaffaqiyatsiz test bo'lsa ham hisobot yoziladi — pastda tekshiriladi */
  }
  const j = JSON.parse(readFileSync(out, 'utf8'))
  rmSync(out, { force: true })
  return { tests: j.numTotalTests, passed: j.numPassedTests, files: j.testResults.length }
}

function countLines(dir, re) {
  let n = 0
  let files = 0
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f)
    if (statSync(p).isDirectory()) {
      const r = countLines(p, re)
      n += r.n
      files += r.files
    } else if (re.test(f)) {
      n += readFileSync(p, 'utf8').split('\n').length
      files++
    }
  }
  return { n, files }
}

const START = '<!-- STATS:START -->'
const END = '<!-- STATS:END -->'

const levels = await contentStats()
const content = contentBlock(levels)
const readme = readFileSync(README, 'utf8')
const i = readme.indexOf(START)
const j = readme.indexOf(END)
if (i < 0 || j < 0) {
  console.error('README’da STATS bloki yo‘q')
  process.exit(1)
}
const current = readme.slice(i, j)

if (CHECK) {
  if (!current.includes(content)) {
    console.error('✗ README kontent sonlari eskirgan — `npm run stats` ni ishga tushiring.\nKutilgan:\n' + content)
    process.exit(1)
  }
  console.log('✓ README kontent sonlari joriy')
  process.exit(0)
}

const t = testStats()
const web = countLines(path.join(ROOT, 'src'), /\.(ts|tsx)$/)
const kt = countLines(path.join(ROOT, 'mobile', 'app', 'src'), /\.kt$/)
const date = new Date().toISOString().slice(0, 10)
const block = `${START}
_Avtomatik o‘lchandi (\`npm run stats\`, ${date}). Qo‘lda tahrirlamang._

**Testlar:** vitest **${t.passed}/${t.tests}** (${t.files} fayl) · **Kod:** veb ${web.files} fayl / ${web.n} qator (TS/TSX), mobil ${kt.files} fayl / ${kt.n} qator (Kotlin)

${content}
`
writeFileSync(README, readme.slice(0, i) + block + readme.slice(j), 'utf8')
console.log(block)
if (t.passed !== t.tests) process.exit(1)
