#!/usr/bin/env node
/**
 * Tinglash audio materiallarini yaratadi.
 *
 * Siyosat: "Audio topilmasa, soxta audio yoki ishlamaydigan tugma
 * ko'rsatmaslik." Shuning uchun:
 *   1) Har bir ListeningTask / mock audio uchun transcriptdan haqiqiy
 *      WAV fayl yaratiladi (Windows SAPI ovozlari — offline, bepul).
 *   2) public/audio/manifest.json yoziladi: id -> fayl, uzunlik, litsenziya.
 *   3) Ilova pleyerni FAQAT manifestda fayl bo'lsa ko'rsatadi.
 *
 * Ishlatish:  node scripts/build-audio.mjs [--force]
 * Talab: Windows (System.Speech). Boshqa tizimda skript tushunarli xato
 * bilan chiqadi — audio bo'lmasa ilova uni "mavjud emas" deb ko'rsatadi.
 */

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const force = process.argv.includes('--force')

/** --- 1. Kontentdan audio ro'yxatini olish (esbuild orqali TS bundling) --- */
async function collectAudioTasks() {
  const esbuild = (await import('esbuild')).default ?? (await import('esbuild'))
  const tmp = path.join(os.tmpdir(), `aea-content-${Date.now()}.mjs`)
  await esbuild.build({
    entryPoints: [path.join(root, 'src/content/index.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: tmp,
    logLevel: 'warning',
  })
  try {
    const mod = await import(pathToFileUrl(tmp))
    /** @type {any[]} */
    const tasks = []
    for (const lvl of mod.LOADED_LEVELS ?? ['A1']) {
      const bundle = mod.getBundle(lvl)
      for (const t of bundle.listening ?? []) tasks.push({ id: t.audio.id, title: t.audio.title, transcript: t.audio.transcript, license: t.audio.license, attribution: t.audio.attribution })
    }
    const exam = mod.getBundle('A1').mockExam
    if (exam) {
      for (const s of exam.sections) {
        if (s.audio) tasks.push({ id: s.audio.id, title: s.audio.title, transcript: s.audio.transcript, license: s.audio.license, attribution: s.audio.attribution })
      }
    }
    return tasks
  } finally {
    fs.rmSync(tmp, { force: true })
  }
}

const pathToFileUrl = (p) => `file:///${p.replace(/\\/g, '/')}`

/** --- 2. SAPI bilan WAV yaratish --- */
function synthesizeWav(text, outWav, { rate = -2, voice = 'Microsoft Zira Desktop' } = {}) {
  const dir = path.dirname(outWav)
  fs.mkdirSync(dir, { recursive: true })
  const ps1 = path.join(dir, `_tts_${path.basename(outWav, '.wav')}.ps1`)
  const safeText = text.replace(/'/g, '’')
  fs.writeFileSync(
    ps1,
    `$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
try { $s.SelectVoice('${voice}') } catch { }
$s.Rate = ${rate}
$s.SetOutputToWaveFile('${outWav.replace(/'/g, "''")}')
$s.Speak([string]::Concat('${safeText}'))
$s.Dispose()
`,
    'utf8',
  )
  const res = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1],
    { encoding: 'utf8', timeout: 120_000 },
  )
  fs.rmSync(ps1, { force: true })
  if (res.status !== 0 || !fs.existsSync(outWav)) {
    throw new Error(`SAPI xatosi: ${(res.stderr || res.stdout || 'nomelum').trim().slice(0, 300)}`)
  }
}

/** --- 3. WAV'ni mono 16-bit 11025 Hz'ga qayta namuna olish ( hajm uchun) --- */
function toMono11k(buf) {
  let off = 12
  let fmt = null
  const find = (tag) => {
    let p = 12
    while (p + 8 <= buf.length) {
      const id = buf.toString('ascii', p, p + 4)
      const size = buf.readUInt32LE(p + 4)
      if (id === tag) return { data: p + 8, size }
      p += 8 + size + (size % 2)
    }
    return null
  }
  const f = find('fmt ')
  const d = find('data')
  if (!f || !d) throw new Error('WAV: fmt/data topilmadi')
  fmt = {
    channels: buf.readUInt16LE(f.data + 2),
    rate: buf.readUInt32LE(f.data + 4),
    bits: buf.readUInt16LE(f.data + 14),
  }
  if (fmt.bits !== 16) throw new Error(`WAV: 16-bit kutildi, topildi ${fmt.bits}`)

  const totalSamples = d.size / 2
  const mono = new Float64Array(totalSamples)
  for (let i = 0; i < totalSamples; i++) {
    let sum = 0
    for (let c = 0; c < fmt.channels; c++) sum += buf.readInt16LE(d.data + (i * fmt.channels + c) * 2)
    mono[i] = sum / fmt.channels
  }

  const target = 11025
  const ratio = fmt.rate / target
  const outLen = Math.floor(totalSamples / ratio)
  const out = Buffer.alloc(44 + outLen * 2)
  out.write('RIFF', 0)
  out.writeUInt32LE(36 + outLen * 2, 4)
  out.write('WAVE', 8)
  out.write('fmt ', 12)
  out.writeUInt32LE(16, 16)
  out.writeUInt16LE(1, 20) // PCM
  out.writeUInt16LE(1, 22) // mono
  out.writeUInt32LE(target, 24)
  out.writeUInt32LE(target * 2, 28)
  out.writeUInt16LE(2, 32)
  out.writeUInt16LE(16, 34)
  out.write('data', 36)
  out.writeUInt32LE(outLen * 2, 40)
  for (let i = 0; i < outLen; i++) {
    // quti o'rtacha — past-pass filtrlash (aliasingni kamaytiradi)
    const a = Math.floor(i * ratio)
    const b = Math.max(a + 1, Math.floor((i + 1) * ratio))
    let s = 0
    let n = 0
    for (let j = a; j < b && j < totalSamples; j++) {
      s += mono[j]
      n++
    }
    const v = Math.max(-32768, Math.min(32767, Math.round(n ? s / n : 0)))
    out.writeInt16LE(v, 44 + i * 2)
  }
  return { buf: out, durationSec: outLen / target }
}

async function main() {
  const tasks = await collectAudioTasks()
  if (tasks.length === 0) {
    console.error('Kontentda audio task topilmadi.')
    process.exit(1)
  }
  fs.mkdirSync(path.join(root, 'public/audio'), { recursive: true })
  const manifest = { generatedAt: new Date().toISOString(), items: [] }
  let made = 0
  let skipped = 0

  for (const t of tasks) {
    const final = path.join(root, 'public/audio', `${t.id}.wav`)
    if (fs.existsSync(final) && !force) {
      const dur = wavDuration(final)
      manifest.items.push({ id: t.id, src: `/audio/${t.id}.wav`, title: t.title, durationSec: dur, license: t.license, attribution: t.attribution, available: true })
      skipped++
      continue
    }
    // Oraliq wav → qayta namunalangan final
    const tmpWav = path.join(root, 'public/audio', `_${t.id}.raw.wav`)
    const text =
      (t.transcript ?? [])
        .map((s) => s.text.trim())
        .filter(Boolean)
        .join('. ') + '.'
    if (!text.trim()) {
      console.warn(`  ${t.id}: transcript bo'sh — audio yaratilmadi`)
      manifest.items.push({ id: t.id, src: `/audio/${t.id}.wav`, title: t.title, durationSec: 0, license: t.license, attribution: t.attribution, available: false })
      continue
    }
    try {
      synthesizeWav(text, tmpWav)
      const { buf, durationSec } = toMono11k(fs.readFileSync(tmpWav))
      fs.writeFileSync(final, buf)
      fs.rmSync(tmpWav, { force: true })
      manifest.items.push({ id: t.id, src: `/audio/${t.id}.wav`, title: t.title, durationSec, license: t.license, attribution: t.attribution, available: true })
      made++
      console.log(`  ✓ ${t.id}  ${durationSec.toFixed(1)}s  ${(buf.length / 1024).toFixed(0)} KB`)
    } catch (err) {
      fs.rmSync(tmpWav, { force: true })
      console.warn(`  ✗ ${t.id}: ${err.message}`)
      manifest.items.push({ id: t.id, src: `/audio/${t.id}.wav`, title: t.title, durationSec: 0, license: t.license, attribution: t.attribution, available: false })
    }
  }

  fs.writeFileSync(path.join(root, 'public/audio/manifest.json'), JSON.stringify(manifest, null, 2))
  console.log(`\nAudio: ${made} ta yaratildi, ${skipped} ta mavjud edi. manifest.json yozildi.`)
}

function wavDuration(p) {
  try {
    const buf = fs.readFileSync(p)
    let q = 12
    let rate = 11025
    let dataSize = 0
    while (q + 8 <= buf.length) {
      const id = buf.toString('ascii', q, q + 4)
      const size = buf.readUInt32LE(q + 4)
      if (id === 'fmt ') rate = buf.readUInt32LE(q + 4 + 4)
      if (id === 'data') dataSize = size
      q += 8 + size + (size % 2)
    }
    return dataSize / 2 / rate
  } catch {
    return 0
  }
}

main().catch((e) => {
  console.error('build-audio xatosi:', e.message)
  process.exit(1)
})
