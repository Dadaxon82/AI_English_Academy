/**
 * Veb kontentini (src/content) mobil ilovaga JSON qilib eksport qiladi.
 *
 * Maqsad — BIR xil o'quv materiali ikkala platformada: mobil ilova HTML/JS
 * o'qimaydi, shu JSON'ni assets'dan yuklaydi. Kontent TS'da yoziladi, bu
 * skript uni bu ndiradi (esbuild orqali paketlanadi — tsx/shart emas).
 *
 * Ishlatish: node scripts/export-content-mobile.mjs
 */
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, copyFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const OUT = path.join(ROOT, 'mobile', 'app', 'src', 'main', 'assets')
const TMP = path.join(ROOT, '.tmp-content-bundle')

const entry = `
import { getBundle, LOADED_LEVELS } from ${JSON.stringify(path.join(ROOT, 'src', 'content', 'index.ts').replace(/\\/g, '/'))}
import { diagnosticTest } from ${JSON.stringify(path.join(ROOT, 'src', 'content', 'diagnostic.ts').replace(/\\/g, '/'))}
export const payload = {
  bundles: Object.fromEntries(LOADED_LEVELS.map((l) => [l, getBundle(l)])),
  diagnostic: diagnosticTest,
  generatedAt: new Date().toISOString(),
}
`

async function main() {
  mkdirSync(TMP, { recursive: true })
  mkdirSync(path.join(OUT, 'content'), { recursive: true })
  const entryFile = path.join(TMP, 'entry.ts')
  writeFileSync(entryFile, entry, 'utf8')

  await build({
    entryPoints: [entryFile],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    outfile: path.join(TMP, 'bundle.cjs'),
    logLevel: 'warning',
  })

  const nodeRequire = createRequire(import.meta.url)
  const { payload } = nodeRequire(path.join(TMP, 'bundle.cjs'))

  // Har daraja — alohida fayl (mobil xotirasida keraksiz darajani yuklamaslik uchun).
  const levels = []
  for (const [level, bundle] of Object.entries(payload.bundles)) {
    const file = path.join(OUT, 'content', `${level.toLowerCase()}.json`)
    writeFileSync(file, JSON.stringify(bundle, null, 1), 'utf8')
    levels.push({
      level,
      days: bundle.days.length,
      vocab: bundle.vocab.length,
      exercises: countExercises(bundle),
      bytes: readFileSync(file).byteLength,
    })
  }
  const meta = {
    generatedAt: payload.generatedAt,
    source: 'web/src/content',
    levels,
  }
  writeFileSync(path.join(OUT, 'content', 'manifest.json'), JSON.stringify(meta, null, 2), 'utf8')

  // Diagnostika testi — onboarding'da ishlatiladi (mobil tomon `domain/Diagnostic.kt`
  // banda id'larini (dg-01…dg-12) biladi, savollarni shu fayldan oladi).
  if (payload.diagnostic) {
    writeFileSync(
      path.join(OUT, 'content', 'diagnostic.json'),
      JSON.stringify(payload.diagnostic, null, 1),
      'utf8',
    )
  }

  // Tinglash audio faillary + manifest (public/audio → assets/audio).
  const srcAudio = path.join(ROOT, 'public', 'audio')
  const dstAudio = path.join(OUT, 'audio')
  mkdirSync(dstAudio, { recursive: true })
  let audioCopied = 0
  for (const f of readdirSync(srcAudio)) {
    copyFileSync(path.join(srcAudio, f), path.join(dstAudio, f))
    audioCopied++
  }

  rmSync(TMP, { recursive: true, force: true })
  console.log(JSON.stringify({ levels, audioCopied }, null, 2))
}

function countExercises(bundle) {
  let n = 0
  for (const g of bundle.grammar) n += g.exercises.length
  for (const r of bundle.reading) n += r.exercises.length
  for (const l of bundle.listening) n += l.exercises.length
  for (const t of bundle.tests) n += t.exercises.length
  if (bundle.mockExam) for (const s of bundle.mockExam.sections) n += s.exercises.length
  return n
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
