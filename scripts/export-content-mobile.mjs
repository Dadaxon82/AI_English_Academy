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
import { getBundle, LOADED_LEVELS, loadLevels } from ${JSON.stringify(path.join(ROOT, 'src', 'content', 'index.ts').replace(/\\/g, '/'))}
import { diagnosticTest } from ${JSON.stringify(path.join(ROOT, 'src', 'content', 'diagnostic.ts').replace(/\\/g, '/'))}
import * as C from ${JSON.stringify(path.join(ROOT, 'src', 'content', 'index.ts').replace(/\\/g, '/'))}
import { CAN_DO, LIKERT_LABELS } from ${JSON.stringify(path.join(ROOT, 'src', 'content', 'canDo.ts').replace(/\\/g, '/'))}
export const canDo = { labels: LIKERT_LABELS, statements: CAN_DO }
import { remixExercise } from ${JSON.stringify(path.join(ROOT, 'src', 'content', 'remix.ts').replace(/\\/g, '/'))}
import * as LS from ${JSON.stringify(path.join(ROOT, 'src', 'lib', 'lessons.ts').replace(/\\/g, '/'))}

/** Mobil paritet testi uchun: veb yasagan mashqlar (Kotlin xuddi shuni yasashi shart). */
export function makeParity() {
  const out = { exercises: [], lessons: [] }
  const add = (e) => e && out.exercises.push(e)
  for (const l of C.LOADED_LEVELS) {
    const b = C.getBundle(l)
    b.vocab.forEach((v) => { add(C.vocabPictureExercise(v)); add(C.vocabSentenceExercise(v, 'en')); add(C.vocabSentenceExercise(v, 'uz')) })
    for (let i = 0; i + 3 <= b.vocab.length; i += 3) add(C.vocabMatchExercise(b.vocab.slice(i, i + 3)))
    const lessons = [
      ...b.grammar.map((t) => ['grammar', t.id, LS.grammarLesson(t)]),
      ...b.reading.map((t) => ['reading', t.id, LS.readingLesson(t)]),
      ...b.listening.map((t) => ['listening', t.id, LS.listeningLesson(t)]),
      ...b.writing.map((t) => ['writing', t.id, LS.writingLesson(t)]),
      ...b.speaking.map((t) => ['speaking', t.id, LS.speakingLesson(t)]),
    ]
    for (const [kind, owner, steps] of lessons) {
      out.lessons.push({ kind, owner, steps: steps.map((s) => ({ type: s.type, id: s.id, exerciseId: s.type === 'exercise' ? s.exercise.id : s.type === 'speak' ? s.fallback.id : null })) })
      for (const s of steps) { if (s.type === 'exercise') add(s.exercise); if (s.type === 'speak') add(s.fallback) }
    }
    for (const e of C.allExercises(l)) add(remixExercise(e))
  }
  return out
}
// A2 … alohida chunk'larda (dinamik import) — avval hammasi yuklanadi.
export async function makePayload() {
  await loadLevels()
  return {
    bundles: Object.fromEntries(LOADED_LEVELS.map((l) => [l, getBundle(l)])),
    diagnostic: diagnosticTest,
    generatedAt: new Date().toISOString(),
  }
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
  const payload = await nodeRequire(path.join(TMP, 'bundle.cjs')).makePayload()

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

  // O'z-o'zini baholash da'volari (Likert) — bitta manba (veb `canDo.ts`).
  writeFileSync(path.join(OUT, 'content', 'can-do.json'), JSON.stringify(nodeRequire(path.join(TMP, 'bundle.cjs')).canDo, null, 1), 'utf8')

  // Mobil paritet fixture (faqat testlar uchun — APK'ga kirmaydi).
  const testRes = path.join(ROOT, 'mobile', 'app', 'src', 'test', 'resources')
  mkdirSync(testRes, { recursive: true })
  const parity = nodeRequire(path.join(TMP, 'bundle.cjs')).makeParity()
  writeFileSync(path.join(testRes, 'generated-parity.json'), JSON.stringify(parity), 'utf8')
  console.log(`paritet: ${parity.exercises.length} mashq, ${parity.lessons.length} dars`)

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
