/**
 * Audio yaxlitligi — kontentda aytilgan audio fayl HAQIQIY mavjudligini
 * tekshiradi ("Audio topilmasa, soxta audio yoki ishlamaydigan tugma
 * ko'rsatmaslik" talabining avtomatik nazorati).
 *
 * Ikkita narsa solishtiriladi:
 *  1) har bir tinglash topshirigining `audio.id` manifestda bor va
 *     `available: true`;
 *  2) kontentdagı `audio.src` manifestdagi manzil bilan BIR XIL
 *     (aksi holda manifest o'qib bo'lmasa pleyer mavjud bo'lmagan faylga
 *     murojaat qiladi — eski holatda 8 tasining ham manzili noto'g'ri edi).
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { a1, mockExamA1 } from '../content'

// vitest ish chiqlangani doim loyiha ildizi (jsdom'da import.meta.url
// file:// bo'lmaganligi uchun readFileSync ishlamaydi).
const ROOT = process.cwd()

interface ManifestItem {
  id: string
  src: string
  available: boolean
  durationSec: number
}

const manifest = JSON.parse(readFileSync(path.join(ROOT, 'public/audio/manifest.json'), 'utf8')) as {
  items: ManifestItem[]
}
const byId = new Map(manifest.items.map((i) => [i.id, i]))

const audioRefs = [
  ...a1.listening.map((t) => ({ where: t.id, audio: t.audio })),
  ...mockExamA1.sections.filter((s) => s.audio).map((s) => ({ where: s.id, audio: s.audio! })),
]

describe('Audio yaxlitligi', () => {
  it('tinglash topshiriqlari audio bilan ta’minlangan', () => {
    expect(audioRefs.length).toBeGreaterThanOrEqual(8)
  })

  it('har bir audio manifestda mavjud va available: true', () => {
    const bad: string[] = []
    for (const { where, audio } of audioRefs) {
      const item = byId.get(audio.id)
      if (!item) bad.push(`${where}: manifestda “${audio.id}“ yo‘q`)
      else if (item.available !== true) bad.push(`${where}: “${audio.id}“ available !== true`)
      else if (audio.fileAvailable !== true) bad.push(`${where}: kontentda fileAvailable false`)
    }
    expect(bad, `Audio manifesti muammolari (${bad.length} ta):\n` + bad.join('\n')).toEqual([])
  })

  it('kontentdagı audio.src manifest manzili bilan bir xil', () => {
    const bad: string[] = []
    for (const { where, audio } of audioRefs) {
      const item = byId.get(audio.id)
      if (item && item.src !== audio.src) bad.push(`${where}: src “${audio.src}“ ≠ manifest “${item.src}“`)
    }
    expect(bad, `Audio manzil nomuvofiqligi (${bad.length} ta):\n` + bad.join('\n')).toEqual([])
  })

  it('manifest fayllari public/audio da haqiqatan bor', () => {
    const bad: string[] = []
    for (const item of manifest.items) {
      if (item.available !== true) continue // available:false — fayl kutilmaydi
      try {
        const buf = readFileSync(path.join(ROOT, 'public', item.src.replace(/^\/+/, '')))
        if (buf.length < 1000) bad.push(`${item.id}: ${item.src} fayli juda kichik (${buf.length} bayt) — buzilgan bo'lishi mumkin`)
        else if (buf.length > 4_000_000) bad.push(`${item.id}: ${item.src} 4 MB dan katta (${buf.length} bayt) — bepul rejada sekin yuklanadi`)
      } catch {
        bad.push(`${item.id}: ${item.src} fayli topilmadi`)
      }
    }
    expect(bad, `Manifestda ko'rsatilgan fayllar yo'q (${bad.length} ta):\n` + bad.join('\n')).toEqual([])
  })
})
