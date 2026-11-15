/**
 * "O'quv yo'li" xaritasi — Duolingo dars yo'li MEXANIKASI (dizayn va qahramon
 * bizniki): tugunlar qalin "3D tanga" ko'rinishida yumshoq to'lqin bo'ylab;
 * joriy tugun atrofida halqa va ustida «BOSHLASH»; kun yarmida sandiq; kun
 * yakuniy testi — kubok; qahramon yo'l yonida turadi; kunlar orasida
 * ajratgich; bo'lim oxirida sovrin tuguni va tepada "keyingi bo'limgacha N ta
 * vazifa" yo'l-progressi.
 *
 * Ma'lumot — `src/lib/pathMap.ts::buildPathLayout` (sof funksiya). Bu
 * komponent FAQAT chizadi; qulf/holat qoidasi `lessonChain.ts`dan keladi.
 *
 * MANZARA (2026-11-15): xarita «dars sayohati» sahnasi sifatida chiziladi —
 * tepada osmon, pastda o'tloq, tugunlar qum yo'l bilan ulangan, har tanga tosh
 * taglik ustida, nomi oq yorliqda. Bezaklar (daraxt, buta, gul, kitob, maktab)
 * tugunning QARAMA-QARSHI tomoniga deterministik qo'yiladi — tugunni yopmaydi.
 * Ranglar `--scene-*` o'zgaruvchilarida (light/dark).
 *
 * ESKI XATO (2026-11-09): tugun `<g transform="translate(..)">`ning o'ziga CSS
 * animatsiya (`transform: scale`) qo'yilgan edi — CSS `transform` SVG
 * atributini bosib, HAMMA tugunlarni (0,0) ga yig'ardi: xaritada faqat chiziq
 * qolardi. Endi joylashuv tashqi `<g>`da, animatsiya ichki `<g>`da
 * (`transform-box: fill-box` — o'z markazidan kattalashadi). Qahramon ham SVG
 * ichida chiziladi — masshtab bilan birga siljiydi, kesilmaydi.
 */

import { useEffect, useRef, useState } from 'react'
import type { PathLayout, PathMilestone, PathNode } from '../lib/pathMap'
import { BANNER_H } from '../lib/pathMap'
import { MOTION } from '../lib/motionManifest'

const NODE_R = 32
const DEPTH = 8

/** Tugun ostidagi bo'lim nomi. */
const SKILL_NAME: Record<string, string> = {
  vocabulary: 'Luğat',
  grammar: 'Grammatika',
  reading: 'Öqiş',
  listening: 'Tinglaş',
  writing: 'Yoziş',
  speaking: 'Gapiriş',
}

const TOP: Record<PathNode['status'], string> = {
  done: 'var(--map-done)',
  current: 'var(--map-current)',
  locked: 'var(--map-locked)',
}
const BOTTOM: Record<PathNode['status'], string> = {
  done: 'var(--map-done-edge)',
  current: 'var(--map-current-edge)',
  locked: 'var(--map-locked-edge)',
}

function skillGlyphPath(skill: PathNode['skill'], isTest: boolean): string {
  // Kun yakuniy testi — kubok.
  if (isTest) return 'M7 4h10v4a5 5 0 0 1-10 0V4Zm0 2H4a3 3 0 0 0 3 3m10-3h3a3 3 0 0 1-3 3M12 13v4m-4 3h8m-6 0 1-3h2l1 3'
  switch (skill) {
    // Lug'at — ochiq lug'at kitobi: chap betda «A», o'ngda so'z qatorlari.
    case 'vocabulary':
      return 'M3.5 5.5A1.5 1.5 0 0 1 5 4h7v16H5a1.5 1.5 0 0 1-1.5-1.5v-13ZM20.5 5.5A1.5 1.5 0 0 0 19 4h-7v16h7a1.5 1.5 0 0 0 1.5-1.5v-13ZM5.8 15l2-6 2 6M6.5 13h2.6M14.5 9h3.5M14.5 12h3.5M14.5 15h3.5'
    // Grammatika — jumboq bo'lagi (qoidalar gapni birlashtiradi).
    case 'grammar':
      return 'M5 9V5h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4h-4a2 2 0 1 0-4 0H5v-4a2 2 0 1 0 0-4Z'
    // O'qish — ochiq kitob.
    case 'reading':
      return 'M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2Zm0 0v13'
    case 'listening':
      return 'M4 12a8 8 0 0 1 16 0M6 12v4a2 2 0 0 0 4 0v-4m4 0v4a2 2 0 0 0 4 0v-4'
    case 'writing':
      return 'M4 20l4-1 11-11-3-3L5 16l-1 4ZM14 7l3 3'
    case 'speaking':
      return 'M12 3a4 4 0 0 1 4 4v4a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4Zm-7 8a7 7 0 0 0 14 0M12 18v3'
    default:
      return 'M12 2 3 7l9 5 9-5-9-5Z'
  }
}

export interface DuoPathMapProps {
  layout: PathLayout
  selectedId: string | null
  onSelect: (node: PathNode) => void
  /** Xaritaga kirishda shu tugun ko'rinadigan joyga aylantiriladi; qahramon shu yerda turadi. */
  focusId?: string | null
  /** «Sizning yutuqlaringiz» kartasi — haqiqiy nishonlar soni va ketma-ket kunlar. Berilmasa ko'rsatilmaydi. */
  achievements?: { badges: number; streak: number }
}

/** Tepada: keyingi bo'limgacha yo'l (bayroq … kubok) va qolgan vazifalar soni. */
function NextGoal({ m }: { m: PathMilestone }) {
  const done = m.total - m.remaining
  const pct = m.total === 0 ? 0 : Math.round((done / m.total) * 100)
  return (
    <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-600 bg-white/90 dark:bg-[var(--panel)]/90 shadow-sm px-3.5 py-3 flex items-center gap-3">
      <span aria-hidden className="text-2xl leading-none">⭐</span>
      <div className="flex-1 min-w-0 grid gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
          <p className="text-sm font-extrabold">
            Keyingi maqsad: <span className="text-amber-700 dark:text-amber-400">{m.label}</span>
          </p>
          <p className="text-xs font-extrabold tabular-nums text-amber-700 dark:text-amber-300">
            {m.remaining > 0 ? `${m.remaining} ta vazifa qoldi` : 'Oçildi!'}
          </p>
        </div>
        <div className="relative h-4 rounded-full bg-[var(--panel-2)] border overflow-hidden" role="progressbar" aria-label={`${m.label}gaça bajarilgan vazifalar`} aria-valuemin={0} aria-valuemax={m.total} aria-valuenow={done} aria-valuetext={`${done} / ${m.total} vazifa`}>
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-[width] duration-500" style={{ width: `${pct}%` }} />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold tabular-nums">
            {done} / {m.total}
          </span>
        </div>
      </div>
      <span aria-hidden className="text-2xl leading-none">🏆</span>
    </div>
  )
}

/** «Sizning yutuqlaringiz»: a'lo natijali tugunlar, nishonlar, ketma-ket kunlar. */
function Achievements({ stars, badges, streak }: { stars: number; badges: number; streak: number }) {
  const item = (icon: string, value: string, label: string) => (
    <div className="flex items-center gap-1.5 min-w-0">
      <span aria-hidden className="text-xl leading-none">{icon}</span>
      <span className="grid leading-tight">
        <b className="text-base tabular-nums">{value}</b>
        <span className="text-[10px] muted">{label}</span>
      </span>
    </div>
  )
  return (
    <section aria-label="Sizning yutuqlaringiz" className="rounded-2xl border bg-white/95 dark:bg-[var(--panel)]/95 shadow-md px-3.5 py-2.5 grid gap-1.5">
      <h3 className="text-xs font-extrabold">Sizning yutuqlaringiz</h3>
      <div className="flex items-center gap-3 divide-x">
        {item('⭐', String(stars), '80%+ natija')}
        <span className="pl-3">{item('🏅', String(badges), 'nişon')}</span>
        <span className="pl-3">{item('🔥', `${streak} kun`, 'ketma-ket')}</span>
      </div>
    </section>
  )
}

/* ---------------- Manzara bezaklari (dekorativ, aria-hidden) ---------------- */

function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={30} rx={20} ry={5} fill="var(--scene-tuft)" opacity={0.5} />
      <rect x={-4} y={6} width={8} height={24} rx={3} fill="var(--scene-trunk)" />
      <circle cx={-11} cy={2} r={14} fill="var(--scene-tree-dark)" />
      <circle cx={11} cy={2} r={14} fill="var(--scene-tree-dark)" />
      <circle cx={0} cy={-10} r={17} fill="var(--scene-tree)" />
      <circle cx={-6} cy={-15} r={5} fill="#fff" opacity={0.18} />
    </g>
  )
}

function Bush({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx={-10} cy={0} r={9} fill="var(--scene-tree-dark)" />
      <circle cx={8} cy={0} r={10} fill="var(--scene-tree-dark)" />
      <circle cx={0} cy={-6} r={11} fill="var(--scene-tree)" />
    </g>
  )
}

function Flowers({ x, y }: { x: number; y: number }) {
  const one = (dx: number, dy: number, c: string) => (
    <g transform={`translate(${dx} ${dy})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 3.6} cy={Math.sin((a * Math.PI) / 180) * 3.6} r={2.8} fill={c} />
      ))}
      <circle r={2.2} fill="#ffc93c" />
    </g>
  )
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-8 6 q2 -6 0 -10 M6 6 q-1 -5 2 -9 M-1 7 q0 -5 1 -8" stroke="var(--scene-tuft)" strokeWidth={2} fill="none" strokeLinecap="round" />
      {one(-8, -6, '#ffffff')}
      {one(8, -4, '#ffffff')}
      {one(0, -10, '#ff9ec7')}
    </g>
  )
}

function Books({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={16} rx={24} ry={4} fill="var(--scene-tuft)" opacity={0.5} />
      <rect x={-20} y={4} width={40} height={11} rx={2} fill="#f2b230" stroke="#c98a12" strokeWidth={1.5} />
      <rect x={-17} y={-7} width={36} height={11} rx={2} fill="#3d7be0" stroke="#2a5bb0" strokeWidth={1.5} />
      <rect x={-19} y={-17} width={33} height={10} rx={2} fill="#e0554f" stroke="#b03a35" strokeWidth={1.5} />
      <path d="M-15 9h28M-12 -2h26M-14 -12h24" stroke="#fff" strokeOpacity={0.55} strokeWidth={1.2} />
    </g>
  )
}

function School({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={30} rx={46} ry={6} fill="var(--scene-tuft)" opacity={0.5} />
      <rect x={-40} y={-4} width={80} height={34} fill="#fff4e0" stroke="#d8c7a8" strokeWidth={1.5} />
      <path d="M-46 -2 L0 -30 L46 -2 Z" fill="#e0554f" stroke="#b03a35" strokeWidth={1.5} />
      <circle cx={0} cy={-12} r={7} fill="#fff" stroke="#b03a35" strokeWidth={1.5} />
      <path d="M0 -16v4l3 2" stroke="#13233f" strokeWidth={1.4} fill="none" strokeLinecap="round" />
      {[-30, -16, 10, 24].map((wx) => (
        <rect key={wx} x={wx} y={4} width={9} height={9} rx={1.5} fill="#7cc4f5" stroke="#3d7be0" strokeWidth={1} />
      ))}
      <rect x={-6} y={12} width={12} height={18} rx={1.5} fill="#8a5a2b" />
      <path d="M0 -30v-14" stroke="#8a96a8" strokeWidth={2} />
      <path d="M0 -44l12 4-12 4Z" fill="#e0554f" />
    </g>
  )
}

function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={0.95}>
      <ellipse cx={0} cy={0} rx={26} ry={10} fill="var(--scene-cloud)" />
      <circle cx={-8} cy={-6} r={10} fill="var(--scene-cloud)" />
      <circle cx={8} cy={-8} r={12} fill="var(--scene-cloud)" />
    </g>
  )
}

function Signpost({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-4} y={10} width={8} height={46} rx={2} fill="var(--scene-wood-edge)" />
      <g transform="rotate(-7)">
        <rect x={-46} y={-26} width={92} height={46} rx={8} fill="var(--scene-wood)" stroke="var(--scene-wood-edge)" strokeWidth={3} />
        <text y={-6} textAnchor="middle" fontSize="15" fontWeight="900" fill="var(--scene-wood-ink)">Dars</text>
        <text y={12} textAnchor="middle" fontSize="15" fontWeight="900" fill="var(--scene-wood-ink)">sayohati</text>
      </g>
    </g>
  )
}

function FinishFlag({ x, y }: { x: number; y: number }) {
  const cells = []
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) if ((r + c) % 2 === 0) cells.push(<rect key={`${r}-${c}`} x={4 + c * 7} y={-48 + r * 7} width={7} height={7} fill="#e0293f" />)
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={2} cy={4} rx={16} ry={7} fill="var(--scene-stone-edge)" />
      <ellipse cx={2} cy={1} rx={14} ry={6} fill="var(--scene-stone)" />
      <rect x={4} y={-48} width={28} height={21} fill="#fff" stroke="#c9ced6" strokeWidth={1} />
      {cells}
      <rect x={1} y={-52} width={4} height={54} rx={2} fill="#8a5a2b" />
    </g>
  )
}

/** Yo'l nuqtalaridan silliq egri chiziq (Catmull-Rom → kubik Bezier). */
function smoothPath(pts: readonly { x: number; y: number }[]): string {
  if (pts.length === 0) return ''
  let d = `M${pts[0]!.x} ${pts[0]!.y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!
    const p1 = pts[i]!
    const p2 = pts[i + 1]!
    const p3 = pts[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

/** Yorliq (oq «tabletka») kengligi — matn uzunligiga qarab. */
const pillW = (text: string, fs = 12) => Math.round(text.length * fs * 0.62 + 26)

export default function DuoPathMap({ layout, selectedId, onSelect, focusId, achievements }: DuoPathMapProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const focusedOnce = useRef(false)
  const mascotSrc = `${import.meta.env.BASE_URL}mascot/mascot-full.png`
  // Konteyner kengligi: sahna (osmon, o'tloq, bezaklar) butun kenglikka chiziladi,
  // yo'l esa markazda telefon kengligida qoladi (masshtab ≤ 1.6).
  const [cw, setCw] = useState(0)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const read = () => setCw(el.clientWidth)
    read()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Ochilganda joriy/fokus tugun ko'rinadigan joyga scroll qilinadi.
  useEffect(() => {
    if (focusedOnce.current) return
    const node = focusId ? layout.nodes.find((n) => n.id === focusId) : null
    const el = scrollRef.current
    if (!node || !el) return
    focusedOnce.current = true
    const k = el.clientWidth > 0 ? Math.min(el.clientWidth, layout.width * 1.6) / layout.width : 1
    const targetTop = Math.max(0, node.y * k - el.clientHeight / 2)
    // jsdom (unit testlar) `scrollTo`ni amalga oshirmaydi — himoyalangan chaqiruv.
    if (typeof el.scrollTo === 'function') el.scrollTo({ top: targetTop, behavior: 'auto' })
    else el.scrollTop = targetTop
  }, [focusId, layout.nodes, layout.width])

  const W = layout.width
  const scale = cw > 0 ? Math.min(cw, W * 1.6) / W : 1
  // Yon tomonlarga qo'shimcha sahna (viewBox birligida)
  const ext = cw > 0 ? Math.max(0, (cw / scale - W) / 2) : 0
  const focus = focusId ? layout.nodes.find((n) => n.id === focusId) ?? null : null
  const nextGoal = layout.milestones.find((m) => m.remaining > 0) ?? layout.milestones[layout.milestones.length - 1] ?? null
  const stars = layout.nodes.filter((n) => n.score !== null && n.score >= 80).length

  // Qahramon — fokus tugunning to'lqin bo'yicha QARAMA-QARSHI tomonida.
  const mascot = focus
    ? (() => {
        const size = 96
        const right = focus.x <= W / 2
        const x = right ? Math.min(W - size - 4, focus.x + NODE_R + 22) : Math.max(4, focus.x - NODE_R - 22 - size)
        return { x, y: focus.y - size / 2 + 12, size }
      })()
    : null

  // Qum yo'l: tugunlar, sandiqlar va sovrinlar y bo'yicha ketma-ket.
  const road = smoothPath(
    [...layout.nodes.map((n) => ({ x: n.x, y: n.y })), ...layout.chests.map((c) => ({ x: c.x, y: c.y })), ...layout.milestones.map((m) => ({ x: m.x, y: m.y }))].sort((a, b) => a.y - b.y),
  )

  // Bezaklar — tugunning qarama-qarshi tomonida, qahramon turgan joydan tashqari.
  const decor = layout.nodes.flatMap((n, i) => {
    if (focus && n.id === focus.id) return []
    const side = n.x < W / 2 - 10 ? 'right' : n.x > W / 2 + 10 ? 'left' : i % 2 === 0 ? 'left' : 'right'
    const x = side === 'right' ? W - 34 + ext * 0.45 : 34 - ext * 0.45
    const kind = i % 5
    const key = `d-${n.id}`
    if (kind === 0) return [<Tree key={key} x={x} y={n.y - 12} s={0.9} />]
    if (kind === 1) return [<Flowers key={key} x={x} y={n.y + 8} />]
    if (kind === 2) return [<Bush key={key} x={x} y={n.y + 10} />]
    if (kind === 3) return [<Books key={key} x={x} y={n.y} />]
    return [<Tree key={key} x={x} y={n.y - 8} s={0.75} />]
  })

  // Keng ekranda yon maydonlarga qo'shimcha daraxt, kitob va maktablar.
  const sideDecor =
    ext > 70
      ? Array.from({ length: Math.ceil((layout.height - 160) / 260) }, (_, k) => {
          const y = 230 + k * 260
          const lx = -ext + ext * 0.35
          const rx = W + ext - ext * 0.35
          return (
            <g key={`sd-${k}`}>
              {k % 3 === 2 ? <School x={lx} y={y} /> : <Tree x={lx} y={y} s={k % 2 ? 1.05 : 0.85} />}
              {k % 3 === 0 ? <Books x={rx} y={y + 90} /> : <Tree x={rx} y={y + 90} s={k % 2 ? 0.8 : 1} />}
              <Flowers x={lx + 40} y={y + 130} />
            </g>
          )
        })
      : null

  const firstUnit = layout.units[0]

  return (
    <div className="grid gap-3">
      {nextGoal && <NextGoal m={nextGoal} />}
      <div className="relative">
        <div ref={scrollRef} className="relative w-full overflow-y-auto overflow-x-hidden rounded-2xl border-2 border-[var(--scene-pill-edge)]" style={{ maxHeight: 600, background: 'var(--scene-grass)' }}>
          <svg
            viewBox={`${(-ext).toFixed(1)} 0 ${(W + 2 * ext).toFixed(1)} ${layout.height}`}
            width="100%"
            className="block"
            role="group"
            aria-label="Öquv yöli xaritasi"
          >
            <defs>
              <linearGradient id="aea-sky" x1="0" y1="0" x2="0" y2="150" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="var(--scene-sky-top)" />
                <stop offset="0.7" stopColor="var(--scene-sky-bottom)" />
                <stop offset="1" stopColor="var(--scene-grass)" />
              </linearGradient>
            </defs>

            {/* ---- Fon: osmon (tepada) va o'tloq ---- */}
            <g aria-hidden pointerEvents="none">
              <rect x={-ext} y={0} width={W + 2 * ext} height={layout.height} fill="var(--scene-grass)" />
              <rect x={-ext} y={0} width={W + 2 * ext} height={150} fill="url(#aea-sky)" />
              <path d={`M${-ext} 110 h${18 + ext * 0.3} v-22 h12 v14 h10 v-30 h14 v38 h12 v-18 h10 v18 H${W - 70 + ext * 0.5} v-26 h12 v-12 h14 v38 h10 v-20 h12 v20 H${W + ext} V150 H${-ext} Z`} fill="var(--scene-city)" opacity={0.55} />
              <path d={`M${-ext} 128 Q${W * 0.25} 104 ${W * 0.5} 124 T${W + ext} 118 V150 H${-ext} Z`} fill="var(--scene-grass-2)" />
              <Cloud x={W - 64 + ext * 0.6} y={30} s={1} />
              <Cloud x={60 - ext * 0.6} y={22} s={0.7} />
              {ext > 70 && <Cloud x={W / 2 + ext * 0.75} y={60} s={0.6} />}
              {/* O'tloq teksturasi — kichik o't tutamlari */}
              {Array.from({ length: Math.ceil(layout.height / 70) }, (_, k) => {
                const ty = 170 + k * 70
                const tx = ((k * 97) % (W + 2 * ext - 40)) + 20 - ext
                return <path key={`t-${k}`} d={`M${tx} ${ty} q-1 -6 -4 -9 M${tx + 3} ${ty} q0 -7 1 -11 M${tx + 6} ${ty} q1 -5 4 -8`} stroke="var(--scene-tuft)" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
              })}
              {sideDecor}
              {decor}
            </g>

            {/* ---- Qum yo'l ---- */}
            <g aria-hidden pointerEvents="none" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d={road} stroke="var(--scene-road-edge)" strokeWidth={30} />
              <path d={road} stroke="var(--scene-road)" strokeWidth={24} />
              <path d={road} stroke="var(--scene-road-dash)" strokeWidth={3} strokeDasharray="10 12" opacity={0.9} />
            </g>

            {/* ---- Yo'l belgisi «Dars sayohati» (birinchi kun boshida) ---- */}
            {firstUnit && (
              <g aria-hidden pointerEvents="none">
                <Signpost x={56} y={firstUnit.bannerY + 92} />
              </g>
            )}

            {/* ---- Kun bannerlari: ko'k «tabletka» + sariq nurlar ---- */}
            {layout.units.map((u) => {
              const cy = u.bannerY + BANNER_H / 2
              const title = `${u.dayNumber}-kun · ${u.titleUz.length > 28 ? `${u.titleUz.slice(0, 27)}…` : u.titleUz}`
              const bw = Math.min(W - 70, pillW(title, 12.5))
              const bx = W / 2 - bw / 2
              return (
                <g key={`unit-${u.dayId}`} role="group" aria-label={`${u.dayNumber}-kun: ${u.titleUz}`}>
                  <g aria-hidden stroke="var(--scene-ray)" strokeWidth={3} strokeLinecap="round">
                    <path d={`M${bx - 8} ${cy - 9} l-10 -5 M${bx - 10} ${cy} h-12 M${bx - 8} ${cy + 9} l-10 5`} />
                    <path d={`M${bx + bw + 8} ${cy - 9} l10 -5 M${bx + bw + 10} ${cy} h12 M${bx + bw + 8} ${cy + 9} l10 5`} />
                  </g>
                  <rect x={bx} y={u.bannerY + 3} width={bw} height={BANNER_H} rx={BANNER_H / 2} fill="var(--scene-banner-edge)" />
                  <rect x={bx} y={u.bannerY} width={bw} height={BANNER_H} rx={BANNER_H / 2} fill="var(--scene-banner)" stroke="#fff" strokeOpacity={0.6} strokeWidth={1.5} />
                  <text x={W / 2} y={cy + 4.5} textAnchor="middle" fontSize="12.5" fontWeight="900" fill="#fff" opacity={u.status === 'locked' ? 0.8 : 1}>
                    {title}
                  </text>
                </g>
              )
            })}

            {/* ---- Kun yarmidagi sandiqlar ---- */}
            {layout.chests.map((c) => (
              <g key={`chest-${c.dayId}`} transform={`translate(${c.x} ${c.y})`} aria-hidden>
                <title>{c.open ? 'Kun yakunlandi' : 'Kun yarmi — davom eting!'}</title>
                <ellipse cx={0} cy={26} rx={32} ry={8} fill="var(--scene-stone-edge)" />
                <ellipse cx={0} cy={23} rx={30} ry={7} fill="var(--scene-stone)" />
                <rect x={-26} y={-6} width={52} height={30} rx={6} fill={c.open ? 'var(--map-chest)' : 'var(--map-locked)'} stroke={c.open ? 'var(--map-chest-edge)' : 'var(--map-locked-edge)'} strokeWidth={2.5} />
                <path d="M-28 -6 Q0 -30 28 -6 Z" fill={c.open ? 'var(--map-chest-lid)' : 'var(--map-locked)'} stroke={c.open ? 'var(--map-chest-edge)' : 'var(--map-locked-edge)'} strokeWidth={2.5} />
                <rect x={-6} y={-2} width={12} height={12} rx={2} fill={c.open ? 'var(--map-chest-lock)' : 'var(--map-locked-edge)'} />
              </g>
            ))}

            {/* ---- Bo'lim chegarasi: maktab, marra bayrog'i va yorliq ---- */}
            {layout.milestones.map((m) => {
              const sub = m.reached ? 'Oçildi!' : `${m.remaining} ta vazifa qoldi`
              return (
                <g key={`ms-${m.afterDayId}`} transform={`translate(${m.x} ${m.y})`} role="img" aria-label={`${m.label}: ${m.reached ? 'oçildi' : `${m.remaining} ta vazifa qoldi`}`}>
                  <g aria-hidden>
                    <School x={-m.x + (m.x < W / 2 ? W - 62 + ext * 0.4 : 62 - ext * 0.4)} y={-18} />
                    <FinishFlag x={-6} y={8} />
                  </g>
                  <rect x={-100} y={22} width={200} height={46} rx={14} fill={m.reached ? 'var(--map-done)' : 'var(--scene-pill)'} stroke={m.reached ? 'var(--map-done-edge)' : 'var(--scene-pill-edge)'} strokeWidth={2} />
                  <text y={41} textAnchor="middle" fontSize="13" fontWeight="900" fill={m.reached ? 'var(--map-done-ink)' : 'var(--scene-pill-ink)'}>
                    {m.label}
                  </text>
                  <text y={59} textAnchor="middle" fontSize="11.5" fontWeight="700" fill={m.reached ? 'var(--map-done-ink)' : 'var(--muted)'}>
                    {sub}
                  </text>
                </g>
              )
            })}

            {/* ---- Tugunlar: tosh taglik ustidagi 3D tanga ---- */}
            {layout.nodes.map((node, i) => {
              const isFocus = node.id === focusId
              const isSelected = node.id === selectedId && !isFocus
              const locked = node.status === 'locked'
              const start = isFocus && node.status !== 'done'
              const name = node.isTest ? 'Kun testi' : SKILL_NAME[node.skill] ?? ''
              const label = start ? `▶ Boşlaş` : name
              const lw = pillW(label, 12)
              const ly = NODE_R + DEPTH + 6
              return (
                // Joylashuv — TASHQI g (atribut); animatsiya — ICHKI g (CSS). Aralashmaydi.
                <g key={node.id} transform={`translate(${node.x} ${node.y})`}>
                  <ellipse rx={NODE_R + 12} ry={12} cy={NODE_R + DEPTH - 2} fill="var(--scene-stone-edge)" pointerEvents="none" />
                  <ellipse rx={NODE_R + 10} ry={10} cy={NODE_R + DEPTH - 5} fill="var(--scene-stone)" pointerEvents="none" />
                  <g
                    className="animate-[var(--animate-chain)]"
                    style={{
                      transformBox: 'fill-box',
                      transformOrigin: 'center',
                      animationDelay: `calc(${Math.min(i, MOTION.staggerMaxItems)} * var(--aea-stagger))`,
                    }}
                  >
                    {start && (
                      <>
                        <circle r={NODE_R + 16} cy={DEPTH / 2} fill="var(--map-current)" opacity={0.18} />
                        <circle r={NODE_R + 10} cy={DEPTH / 2} fill="none" stroke="#fff" strokeWidth={5} opacity={0.85} />
                      </>
                    )}
                    {isFocus && !start && <circle r={NODE_R + 10} cy={DEPTH / 2} fill="none" stroke="var(--map-current)" strokeWidth={6} opacity={0.4} />}
                    {isSelected && <circle r={NODE_R + 9} cy={DEPTH / 2} fill="none" stroke="var(--accent)" strokeWidth={3} opacity={0.6} />}
                    <ellipse rx={NODE_R} ry={NODE_R - 3} cy={DEPTH} fill={BOTTOM[node.status]} />
                    <ellipse
                      rx={NODE_R}
                      ry={NODE_R - 3}
                      fill={TOP[node.status]}
                      style={{ cursor: locked ? 'not-allowed' : 'pointer' }}
                      onClick={() => !locked && onSelect(node)}
                      role="button"
                      tabIndex={locked ? -1 : 0}
                      aria-label={`${node.isTest ? 'Kun yakuniy testi' : SKILL_NAME[node.skill] ?? ''}: ${node.titleUz}${node.score !== null ? ` — natija ${node.score}%` : ''}${locked ? ' (qulflangan)' : ''}`}
                      aria-disabled={locked}
                      onKeyDown={(e) => {
                        if (!locked && (e.key === 'Enter' || e.key === ' ')) onSelect(node)
                      }}
                    />
                    <ellipse rx={NODE_R - 5} ry={NODE_R - 8} fill="none" stroke="#fff" strokeOpacity={locked ? 0.25 : 0.4} strokeWidth={2} pointerEvents="none" />
                    <ellipse rx={NODE_R - 12} ry={6} cy={-NODE_R + 11} fill="#fff" opacity={locked ? 0.25 : 0.3} pointerEvents="none" />
                    <path
                      d={skillGlyphPath(node.skill, node.isTest)}
                      fill="none"
                      stroke={locked ? 'var(--map-locked-ink)' : '#fff'}
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      transform="translate(-12 -12)"
                      pointerEvents="none"
                      opacity={locked ? 0.7 : 1}
                    />
                  </g>
                  {/* Joriy tugun ustida bayroqcha */}
                  {start && (
                    <g transform={`translate(${-NODE_R + 6} ${-NODE_R - 2})`} pointerEvents="none" aria-hidden>
                      <rect x={-2} y={-34} width={4} height={36} rx={2} fill="#8a5a2b" />
                      <path d="M2 -34 L26 -26 L2 -18 Z" fill="#e0293f" />
                      <circle cx={0} cy={-35} r={3.5} fill="#f5b301" />
                    </g>
                  )}
                  {/* Bo'lim nomi — oq yorliqda, tugun ostida */}
                  <g transform={`translate(0 ${ly})`} pointerEvents="none" aria-hidden>
                    <rect x={-lw / 2} y={0} width={lw} height={22} rx={11} fill="var(--scene-pill)" stroke="var(--scene-pill-edge)" strokeWidth={1.5} />
                    <text y={15.5} textAnchor="middle" fontSize="12" fontWeight="900" fill={start ? 'var(--map-current-ink)' : locked ? 'var(--muted)' : 'var(--scene-pill-ink)'}>
                      {label}
                    </text>
                  </g>
                  {/* Olingan ball — tugun ustida */}
                  {node.score !== null && (
                    <g transform={`translate(${NODE_R - 2} ${-NODE_R + 2})`} pointerEvents="none" aria-hidden>
                      <rect x={-23} y={-12} width={46} height={24} rx={12} fill="var(--scene-pill)" stroke={node.score >= 80 ? 'var(--map-done-edge)' : node.score >= 50 ? 'var(--map-current-edge)' : 'var(--warn)'} strokeWidth={2.5} />
                      <text y={4.5} textAnchor="middle" fontSize="11.5" fontWeight="900" fill="var(--scene-pill-ink)">
                        {node.score >= 80 ? '★' : ''}
                        {node.score}%
                      </text>
                    </g>
                  )}
                </g>
              )
            })}

            {/* ---- Qahramon — yo'l yonida ---- */}
            {mascot && (
              <g pointerEvents="none" aria-hidden>
                <ellipse cx={mascot.x + mascot.size / 2} cy={mascot.y + mascot.size - 2} rx={mascot.size / 2.6} ry={7} fill="var(--scene-tuft)" opacity={0.6} />
                <image href={mascotSrc} x={mascot.x} y={mascot.y} width={mascot.size} height={mascot.size} preserveAspectRatio="xMidYMax meet" />
              </g>
            )}
          </svg>
        </div>
        {achievements && (
          <div className="hidden sm:block absolute left-3 bottom-3 pointer-events-none">
            <Achievements stars={stars} badges={achievements.badges} streak={achievements.streak} />
          </div>
        )}
      </div>
      {achievements && (
        <div className="sm:hidden">
          <Achievements stars={stars} badges={achievements.badges} streak={achievements.streak} />
        </div>
      )}
    </div>
  )
}
