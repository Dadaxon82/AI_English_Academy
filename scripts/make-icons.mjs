/**
 * PWA ikonalarini yaratadi: public/icons/icon-192.png va icon-512.png.
 *
 * Tashqi kutubxona YO'Q — PNG qo'lda yoziladi (zlib bilan). Ikona: to'q
 * ko'k fon + oq halqa + urg'uvchi yoy (progress belgisi) — ilova uslubiga mos.
 *
 * Ishlatish: node scripts/make-icons.mjs
 */

import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'public', 'icons')

const BG = [0x0b, 0x1b, 0x34] // #0b1b34
const TRACK = [0xff, 0xff, 0xff]
const ACCENT = [0x4f, 0x8d, 0xff]

function makeRgba(size) {
  const px = new Uint8Array(size * size * 4)
  const cx = size / 2
  const cy = size / 2
  const outer = size * 0.34
  const inner = size * 0.26
  const trackInner = size * 0.225
  const corner = size * 0.18

  const inRoundedSquare = (x, y) => {
    const m = size * 0.04
    const x0 = m
    const y0 = m
    const x1 = size - m
    const y1 = size - m
    if (x < x0 || y < y0 || x > x1 || y > y1) return false
    const rx = Math.min(x - x0, x1 - x)
    const ry = Math.min(y - y0, y1 - y)
    if (rx >= corner || ry >= corner) return true
    const dx = corner - rx
    const dy = corner - ry
    return dx * dx + dy * dy <= corner * corner
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let col = null
      if (inRoundedSquare(x, y)) col = BG

      const dx = x - cx + 0.5
      const dy = y - cy + 0.5
      const dist = Math.sqrt(dx * dx + dy * dy)
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI // -180..180
      const fromTop = (angle + 90 + 360) % 360 // 0 = tepada, soat yo'nalishida

      if (dist <= outer && dist >= inner) {
        col = fromTop <= 300 ? ACCENT : TRACK
      } else if (dist < inner && dist >= trackInner) {
        col = TRACK
      }

      // markazda qalin "A" harfi (5x7 piksel shrift, masshtablangan)
      const glyph = drawA(x, y, size)
      if (glyph) col = TRACK

      if (col) {
        const i = (y * size + x) * 4
        px[i] = col[0]
        px[i + 1] = col[1]
        px[i + 2] = col[2]
        px[i + 3] = 255
      }
    }
  }
  return px
}

const A_GLYPH = [
  [0, 0, 1, 0, 0],
  [0, 1, 0, 1, 0],
  [0, 1, 1, 1, 0],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
]

function drawA(x, y, size) {
  const cell = Math.floor(size * 0.055)
  const gw = A_GLYPH[0].length * cell
  const gh = A_GLYPH.length * cell
  const gx0 = Math.round(size / 2 - gw / 2)
  const gy0 = Math.round(size / 2 - gh / 2)
  if (x < gx0 || y < gy0 || x >= gx0 + gw || y >= gy0 + gh) return false
  const col = Math.floor((x - gx0) / cell)
  const row = Math.floor((y - gy0) / cell)
  return A_GLYPH[row][col] === 1
}

// ------------------------------ PNG yozish ------------------------------
function crc32(buf) {
  let c
  const table = crc32.table ?? (crc32.table = (() => {
    const t = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[n] = c >>> 0
    }
    return t
  })())
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const t = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filter: none
    rgba.copy ? Buffer.from(rgba).copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
      : raw.set(rgba.subarray(y * size * 4, (y + 1) * size * 4), y * (size * 4 + 1) + 1)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync(outDir, { recursive: true })
for (const size of [192, 512]) {
  const png = encodePng(size, Buffer.from(makeRgba(size)))
  const file = join(outDir, `icon-${size}.png`)
  writeFileSync(file, png)
  console.log(`✓ ${file} (${(png.length / 1024).toFixed(1)} KB)`)
}
