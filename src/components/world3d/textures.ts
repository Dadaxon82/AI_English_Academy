/**
 * Protsedura teksturalari — brauzerda Canvas'da chiziladi (tashqi rasm, litsenziya
 * va CSP muammosi yo'q). Har biri rang xaritasi sifatida ham, relyef (`bumpMap`)
 * sifatida ham ishlatiladi. Sahna yopilganda `disposeTextures` bilan bo'shatiladi.
 */
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Draw = (g: CanvasRenderingContext2D, size: number, r: () => number) => void

function make(size: number, seed: number, draw: Draw, repeat: [number, number]): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')!
  draw(g, size, rng(seed))
  const t = new CanvasTexture(c)
  t.wrapS = RepeatWrapping
  t.wrapT = RepeatWrapping
  t.repeat.set(repeat[0], repeat[1])
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  return t
}

/** Mayda dog'lar (o't, qum, tosh donalari). */
function speckle(g: CanvasRenderingContext2D, s: number, r: () => number, n: number, colors: string[], min: number, max: number) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[Math.floor(r() * colors.length)]!
    const w = min + r() * (max - min)
    g.globalAlpha = 0.35 + r() * 0.5
    g.fillRect(r() * s, r() * s, w, w * (0.6 + r() * 1.6))
  }
  g.globalAlpha = 1
}

const grass: Draw = (g, s, r) => {
  g.fillStyle = '#74c24a'
  g.fillRect(0, 0, s, s)
  speckle(g, s, r, 5200, ['#63b23d', '#84d058', '#58a336', '#93da66', '#6fbe47'], 1, 4)
  // o't tolalari
  g.lineWidth = 1
  for (let i = 0; i < 1400; i++) {
    g.strokeStyle = r() < 0.5 ? 'rgba(40,110,30,0.5)' : 'rgba(150,215,95,0.45)'
    const x = r() * s
    const y = r() * s
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + (r() - 0.5) * 4, y - 3 - r() * 5)
    g.stroke()
  }
}

const sand: Draw = (g, s, r) => {
  g.fillStyle = '#ecd59a'
  g.fillRect(0, 0, s, s)
  speckle(g, s, r, 4200, ['#e2c684', '#f5e2ae', '#d9bb77', '#f0dba3'], 1, 3)
}

const wood: Draw = (g, s, r) => {
  // gorizontal xodalar (yog'och uy devori)
  const rows = 8
  const h = s / rows
  for (let i = 0; i < rows; i++) {
    const base = 95 + Math.floor(r() * 30)
    g.fillStyle = `rgb(${base + 45},${base},${Math.floor(base * 0.55)})`
    g.fillRect(0, i * h, s, h)
    const grad = g.createLinearGradient(0, i * h, 0, (i + 1) * h)
    grad.addColorStop(0, 'rgba(255,225,170,0.28)')
    grad.addColorStop(0.5, 'rgba(0,0,0,0)')
    grad.addColorStop(1, 'rgba(0,0,0,0.42)')
    g.fillStyle = grad
    g.fillRect(0, i * h, s, h)
    g.strokeStyle = 'rgba(60,35,15,0.35)'
    g.lineWidth = 1
    for (let k = 0; k < 9; k++) {
      const y = i * h + 3 + r() * (h - 6)
      g.beginPath()
      g.moveTo(0, y)
      g.bezierCurveTo(s * 0.3, y + (r() - 0.5) * 4, s * 0.7, y + (r() - 0.5) * 4, s, y)
      g.stroke()
    }
  }
}

const planks: Draw = (g, s, r) => {
  // vertikal taxtalar (eshik, lavha, to'siq)
  const cols = 6
  const w = s / cols
  for (let i = 0; i < cols; i++) {
    const base = 105 + Math.floor(r() * 35)
    g.fillStyle = `rgb(${base + 40},${base},${Math.floor(base * 0.55)})`
    g.fillRect(i * w, 0, w, s)
    g.fillStyle = 'rgba(40,22,8,0.55)'
    g.fillRect(i * w, 0, 2, s)
    g.strokeStyle = 'rgba(60,35,15,0.28)'
    for (let k = 0; k < 6; k++) {
      const x = i * w + 4 + r() * (w - 8)
      g.beginPath()
      g.moveTo(x, 0)
      g.lineTo(x + (r() - 0.5) * 5, s)
      g.stroke()
    }
  }
}

const stone: Draw = (g, s, r) => {
  // tosh terish: qatorlar siljigan g'ishtlar
  g.fillStyle = '#6f6a63'
  g.fillRect(0, 0, s, s)
  const rows = 8
  const h = s / rows
  for (let j = 0; j < rows; j++) {
    let x = j % 2 === 0 ? 0 : -h * 0.9
    while (x < s) {
      const w = h * (1.3 + r() * 1.1)
      const v = 150 + Math.floor(r() * 55)
      g.fillStyle = `rgb(${v},${v - 6},${v - 16})`
      g.beginPath()
      g.roundRect(x + 2, j * h + 2, w - 4, h - 4, 5)
      g.fill()
      g.fillStyle = 'rgba(255,255,255,0.14)'
      g.fillRect(x + 4, j * h + 3, w - 8, 3)
      g.fillStyle = 'rgba(0,0,0,0.16)'
      g.fillRect(x + 4, (j + 1) * h - 6, w - 8, 3)
      x += w
    }
  }
  speckle(g, s, r, 900, ['rgba(60,60,55,0.5)', 'rgba(230,225,215,0.4)'], 1, 2)
}

const thatch: Draw = (g, s, r) => {
  g.fillStyle = '#c9a24f'
  g.fillRect(0, 0, s, s)
  g.lineWidth = 2
  for (let i = 0; i < 2600; i++) {
    const v = r()
    g.strokeStyle = v < 0.4 ? 'rgba(120,85,25,0.55)' : v < 0.75 ? 'rgba(235,205,120,0.6)' : 'rgba(170,125,50,0.55)'
    const x = r() * s
    const y = r() * s
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + (r() - 0.5) * 6, y + 10 + r() * 22)
    g.stroke()
  }
  // qatlam chegaralari
  g.fillStyle = 'rgba(70,45,10,0.35)'
  for (let j = 1; j < 6; j++) g.fillRect(0, (j * s) / 6, s, 4)
}

const slate: Draw = (g, s, r) => {
  g.fillStyle = '#4b5563'
  g.fillRect(0, 0, s, s)
  const rows = 9
  const h = s / rows
  for (let j = 0; j < rows; j++) {
    const off = j % 2 === 0 ? 0 : h * 0.6
    for (let x = -h; x < s + h; x += h * 1.2) {
      const v = 70 + Math.floor(r() * 40)
      g.fillStyle = `rgb(${v},${v + 8},${v + 22})`
      g.beginPath()
      g.roundRect(x + off + 1, j * h + 1, h * 1.2 - 2, h + 5, [0, 0, 7, 7])
      g.fill()
      g.fillStyle = 'rgba(0,0,0,0.3)'
      g.fillRect(x + off + 1, (j + 1) * h + 2, h * 1.2 - 2, 3)
    }
  }
}

const cobble: Draw = (g, s, r) => {
  g.fillStyle = '#b98a2e'
  g.fillRect(0, 0, s, s)
  for (let i = 0; i < 46; i++) {
    const x = r() * s
    const y = r() * s
    const rad = 14 + r() * 16
    const v = r()
    g.fillStyle = v < 0.33 ? '#f2c94c' : v < 0.66 ? '#e9b949' : '#f7d774'
    g.beginPath()
    g.ellipse(x, y, rad, rad * (0.7 + r() * 0.3), r() * 3, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = 'rgba(120,80,10,0.55)'
    g.lineWidth = 3
    g.stroke()
    g.fillStyle = 'rgba(255,255,255,0.25)'
    g.beginPath()
    g.ellipse(x - rad * 0.2, y - rad * 0.25, rad * 0.4, rad * 0.22, 0, 0, Math.PI * 2)
    g.fill()
  }
}

const leaves: Draw = (g, s, r) => {
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, s, s)
  for (let i = 0; i < 900; i++) {
    const v = r()
    g.fillStyle = v < 0.3 ? '#c9d8c2' : v < 0.65 ? '#e6efe1' : '#ffffff'
    g.globalAlpha = 0.75
    g.beginPath()
    g.ellipse(r() * s, r() * s, 5 + r() * 7, 3 + r() * 4, r() * 3, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
}

export interface WorldTextures {
  grass: CanvasTexture
  sand: CanvasTexture
  wood: CanvasTexture
  planks: CanvasTexture
  stone: CanvasTexture
  thatch: CanvasTexture
  slate: CanvasTexture
  cobble: CanvasTexture
  leaves: CanvasTexture
}

export function createTextures(): WorldTextures {
  return {
    grass: make(512, 11, grass, [14, 22]),
    sand: make(256, 12, sand, [10, 16]),
    wood: make(256, 13, wood, [1, 1]),
    planks: make(256, 14, planks, [1, 1]),
    stone: make(256, 15, stone, [1.5, 1]),
    thatch: make(256, 16, thatch, [2, 1]),
    slate: make(256, 17, slate, [2, 1]),
    cobble: make(256, 18, cobble, [1, 1]),
    leaves: make(256, 19, leaves, [2, 2]),
  }
}

export function disposeTextures(t: WorldTextures): void {
  for (const tex of Object.values(t)) (tex as CanvasTexture).dispose()
}
