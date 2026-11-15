/**
 * "O'quv yo'li" xaritasi — «Dars sayohati» 2D sahnasi.
 *
 * Dizayn namunasi (2026-11-15, foydalanuvchi bergan rasm): tepada moviy osmon,
 * bulutlar va tepaliklar; ko'k kun sarlavhasi va uning ostida oq-sariq
 * «Keyingi maqsad» paneli; o'tloq bo'ylab och sariq, o'rtasida oq punktirli
 * egri yo'l; yo'l ustida katta, oq hoshiyali medallar (tosh taglikda, nomi
 * yumaloq yorliqda); joriy medalda bayroqcha va «▶ Boşlaş»; chapda yog'och
 * «Dars sayohati» belgisi, o'ngda maktab; pastki chapda «Sizning
 * yutuqlaringiz» paneli.
 *
 * Fon — SVG qatlamlari (rasm emas), medallar — haqiqiy tugmalar. Ma'lumot —
 * `src/lib/pathMap.ts::buildPathLayout` (sof funksiya); qulf/holat qoidasi
 * `lessonChain.ts`dan keladi — bu komponent FAQAT chizadi.
 *
 * Joylashuv tashqi `<g transform>` atributida, animatsiya ichki `<g>`da
 * (2026-11-09 dagi xato: CSS `transform` SVG atributini bosib, tugunlarni
 * (0,0) ga yig'ardi). Qahramon — loyihaning asl fayli
 * (`public/mascot/mascot-full.png`), qayta chizilmaydi.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { PathLayout, PathMilestone, PathNode } from '../lib/pathMap'
import { BANNER_H } from '../lib/pathMap'
import { MOTION } from '../lib/motionManifest'
import { GameIcon } from './icons'

const NODE_R = 34
const DEPTH = 7
/** «Keyingi maqsad» paneli uchun birinchi kun sarlavhasidan keyin ajratiladigan joy (viewBox birligi). */
const GOAL_SPACE = 100
/** Yo'l kengligi maksimal masshtabi (telefon kengligidagi yo'l keng ekranda cho'zilib ketmasin). */
const MAX_SCALE = 1.3

/** Tugun ostidagi bo'lim nomi. */
const SKILL_NAME: Record<string, string> = {
  vocabulary: 'Luğat',
  grammar: 'Grammatika',
  reading: 'Öqiş',
  listening: 'Tinglaş',
  writing: 'Yoziş',
  speaking: 'Gapiriş',
}

const FACE: Record<PathNode['status'], string> = {
  done: 'url(#aea-medal-done)',
  current: 'url(#aea-medal-current)',
  locked: 'url(#aea-medal-locked)',
}
const EDGE: Record<PathNode['status'], string> = {
  done: 'var(--map-done-edge)',
  current: 'var(--map-current-edge)',
  locked: 'var(--map-locked-edge)',
}

/** Medal belgisi (24×24 maydonda). */
function skillGlyph(skill: PathNode['skill'], isTest: boolean): { d: string; fill?: boolean } {
  if (isTest)
    return {
      d: 'M7 4h10v4a5 5 0 0 1-10 0V4Zm0 2H4a3 3 0 0 0 3 3m10-3h3a3 3 0 0 1-3 3M12 13v4m-4 3h8m-6 0 1-3h2l1 3',
    }
  switch (skill) {
    // Lug'at — «A» va so'z qatorlari yozilgan karta.
    case 'vocabulary':
      return {
        d: 'M4.5 4.5h15a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V6a1.5 1.5 0 0 1 1.5-1.5ZM6 16l2.5-7 2.5 7M6.9 13.5h3.2M13.5 9.5H18M13.5 12.5H18M13.5 15.5H18',
      }
    // Grammatika — yulduz.
    case 'grammar':
      return {
        d: 'M12 3.5 14.6 9l6 .7-4.5 4 1.3 5.9L12 16.5 6.6 19.6 7.9 13.7l-4.5-4 6-.7Z',
      }
    // O'qish — ochiq kitob.
    case 'reading':
      return {
        d: 'M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2Zm0 0v13',
      }
    // Tinglash — quloqchin.
    case 'listening':
      return {
        d: 'M4 14v-2a8 8 0 0 1 16 0v2M4 14a2 2 0 0 1 2-2h1v7H6a2 2 0 0 1-2-2v-3Zm16 0a2 2 0 0 0-2-2h-1v7h1a2 2 0 0 0 2-2v-3Z',
      }
    // Yozish — qalam.
    case 'writing':
      return { d: 'M4 20l4-1 11-11-3-3L5 16l-1 4ZM14 7l3 3' }
    case 'speaking':
      return {
        d: 'M12 3a4 4 0 0 1 4 4v4a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4Zm-7 8a7 7 0 0 0 14 0M12 18v3',
      }
    default:
      return { d: 'M12 2 3 7l9 5 9-5-9-5Z' }
  }
}

export interface DuoPathMapProps {
  layout: PathLayout
  selectedId: string | null
  onSelect: (node: PathNode) => void
  /** Xaritaga kirishda shu tugun ko'rinadigan joyga aylantiriladi; qahramon shu yerda turadi. */
  focusId?: string | null
  /** «Sizning yutuqlaringiz» paneli — haqiqiy nishonlar soni va ketma-ket kunlar. Berilmasa ko'rsatilmaydi. */
  achievements?: { badges: number; streak: number }
}

/** «Keyingi maqsad» paneli: oq fon, sariq hoshiya, yulduz … kubok. */
function NextGoal({ m }: { m: PathMilestone }) {
  const done = m.total - m.remaining
  const pct = m.total === 0 ? 0 : Math.round((done / m.total) * 100)
  return (
    <div className="rounded-2xl border-[3px] border-amber-300 bg-white/95 dark:bg-[var(--panel)]/95 shadow-[0_4px_14px_rgba(15,35,80,0.15)] px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2.5 sm:gap-3">
      <GameIcon name="star" size={34} className="shrink-0 text-amber-400 drop-shadow-sm" />
      <div className="flex-1 min-w-0 grid gap-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
          <p className="text-sm sm:text-[15px] font-extrabold text-[var(--scene-pill-ink)]">
            Keyingi maqsad: <span className="text-orange-600 dark:text-amber-400">{m.label}</span>
          </p>
          <p className="text-xs sm:text-sm font-extrabold tabular-nums text-orange-600 dark:text-amber-300">{m.remaining > 0 ? `${m.remaining} ta vazifa qoldi` : 'Oçildi!'}</p>
        </div>
        <div
          className="relative h-4 sm:h-[18px] rounded-full bg-slate-100 dark:bg-[var(--panel-2)] border border-slate-200 dark:border-[var(--border)] overflow-hidden"
          role="progressbar"
          aria-label={`${m.label}gaça bajarilgan vazifalar`}
          aria-valuemin={0}
          aria-valuemax={m.total}
          aria-valuenow={done}
          aria-valuetext={`${done} / ${m.total} vazifa`}
        >
          <div className="h-full rounded-full bg-gradient-to-b from-green-400 to-green-600 transition-[width] duration-500" style={{ width: `${pct}%` }} />
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold tabular-nums text-[var(--scene-pill-ink)]">
            {done} / {m.total}
          </span>
        </div>
      </div>
      <GameIcon name="trophy" size={34} className="shrink-0 text-amber-500 drop-shadow-sm" />
    </div>
  )
}

/** «Sizning yutuqlaringiz»: a'lo natijali medallar, nishonlar, ketma-ket kunlar. */
function Achievements({ stars, badges, streak }: { stars: number; badges: number; streak: number }) {
  const cell = (icon: ReactNode, value: string, label?: string) => (
    <div className="flex items-center gap-1.5 min-w-0">
      {icon}
      <span className="grid leading-tight">
        <b className="text-base sm:text-lg tabular-nums text-[var(--scene-pill-ink)]">{value}</b>
        {label && <span className="text-[10px] sm:text-[11px] font-semibold text-[var(--scene-pill-ink)] opacity-80">{label}</span>}
      </span>
    </div>
  )
  return (
    <section
      aria-label="Sizning yutuqlaringiz"
      className="relative rounded-3xl border-2 border-white/90 dark:border-[var(--scene-pill-edge)] bg-sky-50/95 dark:bg-[var(--panel)]/95 shadow-[0_6px_18px_rgba(15,35,80,0.18)] pl-3 pr-4 pt-2 pb-2.5 grid gap-1.5"
    >
      <div className="flex items-center gap-2">
        {/* Medal emblemasi */}
        <span aria-hidden className="grid place-items-center size-9 rounded-full bg-gradient-to-b from-violet-400 to-violet-600 ring-2 ring-amber-300 shadow">
          <GameIcon name="star" size={18} className="text-amber-300" />
        </span>
        <h3 className="text-sm font-extrabold text-[var(--scene-pill-ink)]">Sizning yutuqlaringiz</h3>
      </div>
      <div className="flex items-center gap-3 rounded-2xl bg-white/90 dark:bg-[var(--panel-2)] px-2.5 py-1.5 divide-x divide-slate-200 dark:divide-[var(--border)]">
        {cell(<GameIcon name="star" size={24} className="text-amber-400" />, String(stars), 'yulduz')}
        <span className="pl-3">{cell(<GameIcon name="shield" size={24} className="text-orange-400" />, String(badges), 'nişon')}</span>
        <span className="pl-3">{cell(<GameIcon name="flame" size={24} className="text-orange-500" />, `${streak} kun`, 'ketma-ket')}</span>
      </div>
    </section>
  )
}

/* ---------------- Manzara bezaklari (dekorativ, aria-hidden) ---------------- */

function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={34} rx={24} ry={6} fill="var(--scene-tuft)" opacity={0.45} />
      <path d="M-4 34 L-3 6 h6 L4 34 Z" fill="var(--scene-trunk)" />
      <path d="M0 14 l-8 -8 M0 18 l7 -7" stroke="var(--scene-trunk)" strokeWidth={3} strokeLinecap="round" />
      <circle cx={-14} cy={0} r={15} fill="var(--scene-tree-dark)" />
      <circle cx={14} cy={2} r={15} fill="var(--scene-tree-dark)" />
      <circle cx={0} cy={-12} r={19} fill="var(--scene-tree)" />
      <circle cx={-12} cy={-4} r={12} fill="var(--scene-tree)" />
      <circle cx={12} cy={-4} r={12} fill="var(--scene-tree)" />
      <circle cx={-7} cy={-19} r={6} fill="#fff" opacity={0.22} />
    </g>
  )
}

function Bush({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={8} rx={24} ry={4} fill="var(--scene-tuft)" opacity={0.45} />
      <circle cx={-12} cy={0} r={10} fill="var(--scene-tree-dark)" />
      <circle cx={11} cy={0} r={11} fill="var(--scene-tree-dark)" />
      <circle cx={0} cy={-7} r={12} fill="var(--scene-tree)" />
      <circle cx={-4} cy={-12} r={4} fill="#fff" opacity={0.2} />
    </g>
  )
}

function Daisy({ x, y, c = '#ffffff' }: { x: number; y: number; c?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <ellipse
          key={a}
          cx={Math.cos((a * Math.PI) / 180) * 4}
          cy={Math.sin((a * Math.PI) / 180) * 4}
          rx={3.2}
          ry={2.4}
          transform={`rotate(${a} ${Math.cos((a * Math.PI) / 180) * 4} ${Math.sin((a * Math.PI) / 180) * 4})`}
          fill={c}
        />
      ))}
      <circle r={2.6} fill="#ffc93c" />
    </g>
  )
}

function Flowers({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-9 8 q1 -6 0 -12 M8 8 q-1 -5 1 -10 M-1 9 q0 -6 1 -14" stroke="var(--scene-tuft)" strokeWidth={2} fill="none" strokeLinecap="round" />
      <Daisy x={-9} y={-6} />
      <Daisy x={8} y={-3} />
      <Daisy x={0} y={-12} c="#ffd1e6" />
    </g>
  )
}

function Grass({ x, y }: { x: number; y: number }) {
  return <path d={`M${x} ${y} q-1 -6 -4 -9 M${x + 3} ${y} q0 -7 1 -11 M${x + 6} ${y} q1 -5 4 -8`} stroke="var(--scene-tuft)" strokeWidth={2} fill="none" strokeLinecap="round" />
}

function Books({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={18} rx={28} ry={5} fill="var(--scene-tuft)" opacity={0.45} />
      <rect x={-24} y={4} width={48} height={13} rx={3} fill="#f4b740" stroke="#c98a12" strokeWidth={1.5} />
      <rect x={-20} y={6.5} width={4} height={8} fill="#fff" opacity={0.7} />
      <rect x={-20} y={-9} width={42} height={13} rx={3} fill="#3d7be0" stroke="#2a5bb0" strokeWidth={1.5} />
      <rect x={-17} y={-6.5} width={36} height={4} fill="#fff" opacity={0.75} />
      <path d="M-14 10.5h32M-12 -0.5h30" stroke="#fff" strokeOpacity={0.6} strokeWidth={1.2} />
    </g>
  )
}

function PencilCup({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-5 -6 l-3 -24 l3 -4 l3 4 Z" fill="#3d7be0" />
      <path d="M2 -6 l1 -27 l3 -3 l3 3 Z" fill="#e0554f" />
      <path d="M8 -6 l5 -22 l3 -2 l1 4 Z" fill="#22c55e" />
      <rect x={-10} y={-8} width={24} height={24} rx={3} fill="#f9c74f" stroke="#c98a12" strokeWidth={1.5} />
      <rect x={-10} y={-8} width={24} height={5} fill="#fff" opacity={0.35} />
    </g>
  )
}

function School({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={34} rx={62} ry={7} fill="var(--scene-tuft)" opacity={0.45} />
      {/* yon qanotlar */}
      <rect x={-56} y={2} width={28} height={30} fill="#fff4e0" stroke="#d8c7a8" strokeWidth={1.5} />
      <rect x={28} y={2} width={28} height={30} fill="#fff4e0" stroke="#d8c7a8" strokeWidth={1.5} />
      <path d="M-60 4 L-42 -8 L-24 4 Z M24 4 L42 -8 L60 4 Z" fill="#e0554f" stroke="#b03a35" strokeWidth={1.2} />
      {/* markaziy bino */}
      <rect x={-30} y={-6} width={60} height={38} fill="#fffaf0" stroke="#d8c7a8" strokeWidth={1.5} />
      <path d="M-36 -4 L0 -30 L36 -4 Z" fill="#e0554f" stroke="#b03a35" strokeWidth={1.5} />
      <circle cx={0} cy={-13} r={7} fill="#fff" stroke="#b03a35" strokeWidth={1.5} />
      <path d="M0 -17v4l3 2" stroke="#13233f" strokeWidth={1.4} fill="none" strokeLinecap="round" />
      {[-50, -40, 34, 44, -22, 14].map((wx) => (
        <rect key={wx} x={wx} y={10} width={8} height={9} rx={1.2} fill="#7cc4f5" stroke="#3d7be0" strokeWidth={1} />
      ))}
      <rect x={-7} y={14} width={14} height={18} rx={1.5} fill="#8a5a2b" />
      <path d="M0 -30v-16" stroke="#8a96a8" strokeWidth={2} />
      <path d="M0 -46l13 4-13 4Z" fill="#e0554f" />
      {/* panjara */}
      {Array.from({ length: 6 }, (_, k) => (
        <rect key={k} x={36 + k * 7} y={26} width={3} height={12} rx={1} fill="#fff" stroke="#d8c7a8" strokeWidth={0.6} />
      ))}
      <rect x={34} y={30} width={44} height={2.5} fill="#fff" />
    </g>
  )
}

function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={2} rx={32} ry={11} fill="var(--scene-cloud)" />
      <circle cx={-12} cy={-6} r={12} fill="var(--scene-cloud)" />
      <circle cx={8} cy={-10} r={15} fill="var(--scene-cloud)" />
      <circle cx={22} cy={-2} r={9} fill="var(--scene-cloud)" />
    </g>
  )
}

function Sparkle({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -8 C1 -2 2 -1 8 0 C2 1 1 2 0 8 C-1 2 -2 1 -8 0 C-2 -1 -1 -2 0 -8Z" fill="#ffd43b" />
}

function Signpost({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-5} y={8} width={10} height={58} rx={2} fill="var(--scene-wood-edge)" />
      <g transform="rotate(-8)">
        <rect x={-50} y={-28} width={100} height={50} rx={9} fill="var(--scene-wood-edge)" />
        <rect x={-50} y={-31} width={100} height={50} rx={9} fill="var(--scene-wood)" stroke="var(--scene-wood-edge)" strokeWidth={2.5} />
        <path d="M-42 -14 h22 M14 6 h26" stroke="var(--scene-wood-edge)" strokeOpacity={0.35} strokeWidth={1.5} />
        <text y={-10} textAnchor="middle" fontSize="16" fontWeight="900" fill="var(--scene-wood-ink)">
          Dars
        </text>
        <text y={9} textAnchor="middle" fontSize="16" fontWeight="900" fill="var(--scene-wood-ink)">
          sayohati
        </text>
      </g>
    </g>
  )
}

function FinishFlag({ x, y }: { x: number; y: number }) {
  const cells = []
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 5; c++) if ((r + c) % 2 === 0) cells.push(<rect key={`${r}-${c}`} x={6 + c * 7} y={-56 + r * 7} width={7} height={7} fill="#e0293f" />)
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={4} cy={6} rx={20} ry={8} fill="var(--scene-stone-edge)" />
      <ellipse cx={4} cy={2} rx={17} ry={7} fill="var(--scene-stone)" />
      <path d="M6 -56 h35 v28 h-35 Z" fill="#fff" stroke="#c9ced6" strokeWidth={1} />
      {cells}
      <rect x={2} y={-60} width={5} height={64} rx={2.5} fill="#8a5a2b" />
      <circle cx={4.5} cy={-61} r={3.5} fill="#f5b301" />
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
    const c1x = p1.x + (p2.x - p0.x) / 5
    const c1y = p1.y + (p2.y - p0.y) / 5
    const c2x = p2.x - (p3.x - p1.x) / 5
    const c2y = p2.y - (p3.y - p1.y) / 5
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

/** Yorliq kengligi — matn uzunligiga qarab (taxminiy, qalin şrift). */
const pillW = (text: string, fs = 13) => Math.round(text.length * fs * 0.6 + 28)

export default function DuoPathMap({ layout, selectedId, onSelect, focusId, achievements }: DuoPathMapProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const focusedOnce = useRef(false)
  const mascotSrc = `${import.meta.env.BASE_URL}mascot/mascot-full.png`
  // Konteyner kengligi: sahna butun kenglikka chiziladi, yo'l markazda (masshtab ≤ MAX_SCALE).
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

  const W = layout.width
  const nextGoal = layout.milestones.find((m) => m.remaining > 0) ?? layout.milestones[layout.milestones.length - 1] ?? null
  // Tor ekranda panel ikki qatorga o'raladi — joy ko'proq.
  const goalSpace = nextGoal ? (cw > 0 && cw < 560 ? GOAL_SPACE + 34 : GOAL_SPACE) : 0
  const scale = cw > 0 ? Math.min(cw, W * MAX_SCALE) / W : 1
  const ext = cw > 0 ? Math.max(0, (cw / scale - W) / 2) : 0
  // Keng ekranda yo'l biroz o'ngga suriladi — pastki chapdagi yutuqlar paneli medallarni yopmasin.
  const achOverlay = !!achievements && ext * scale >= 160
  const shift = achOverlay ? Math.min(ext * 0.55, 70) : 0
  const H = layout.height + goalSpace

  // Ochilganda (va «Joriy darsga» bosilganda) fokus tugun ko'rinadigan joyga aylantiriladi.
  const scrollToFocus = (smooth: boolean) => {
    const node = focusId ? layout.nodes.find((n) => n.id === focusId) : null
    const el = scrollRef.current
    if (!node || !el) return
    const k = el.clientWidth > 0 ? Math.min(el.clientWidth, W * MAX_SCALE) / W : 1
    const targetTop = Math.max(0, (node.y + goalSpace) * k - el.clientHeight / 2)
    // jsdom (unit testlar) `scrollTo`ni amalga oshirmaydi — himoyalangan chaqiruv.
    if (typeof el.scrollTo === 'function') el.scrollTo({ top: targetTop, behavior: smooth ? 'smooth' : 'auto' })
    else el.scrollTop = targetTop
  }
  useEffect(() => {
    if (focusedOnce.current || !focusId || !scrollRef.current) return
    focusedOnce.current = true
    scrollToFocus(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- faqat birinchi ochilishda
  }, [focusId, layout.nodes])

  const focus = focusId ? (layout.nodes.find((n) => n.id === focusId) ?? null) : null
  const stars = layout.nodes.filter((n) => n.score !== null && n.score >= 80).length

  // Qahramon — fokus tugunning yo'l to'lqini bo'yicha QARAMA-QARSHI tomonida.
  const mascot = focus
    ? (() => {
        const size = 112
        const right = focus.x > W / 2 + 10 ? false : focus.x < W / 2 - 10 ? true : focus.order % 2 === 0
        const x = right ? Math.min(W + ext - shift - size - 2, focus.x + NODE_R + 18) : Math.max(-ext + 2, focus.x - NODE_R - 18 - size)
        return { x, y: focus.y - size / 2 + 8, size }
      })()
    : null

  // Yo'l: tugunlar, sandiqlar va sovrinlar y bo'yicha ketma-ket.
  const road = smoothPath(
    [...layout.nodes.map((n) => ({ x: n.x, y: n.y })), ...layout.chests.map((c) => ({ x: c.x, y: c.y })), ...layout.milestones.map((m) => ({ x: m.x, y: m.y }))].sort(
      (a, b) => a.y - b.y,
    ),
  )

  // Bezaklar — tugunning qarama-qarshi tomonida, qahramon turgan tugundan tashqari.
  const decor = layout.nodes.flatMap((n, i) => {
    if (focus && n.id === focus.id) return []
    const side = n.x < W / 2 - 10 ? 'right' : n.x > W / 2 + 10 ? 'left' : i % 2 === 0 ? 'left' : 'right'
    const x = side === 'right' ? W - 30 + ext * 0.45 - shift * 0.5 : 30 - ext * 0.45
    const key = `d-${n.id}`
    switch (i % 6) {
      case 0:
        return [<Tree key={key} x={x} y={n.y - 14} s={0.85} />]
      case 1:
        return [<Flowers key={key} x={x} y={n.y + 10} />]
      case 2:
        return [<Bush key={key} x={x} y={n.y + 12} />]
      case 3:
        return [<Books key={key} x={x} y={n.y + 2} s={0.85} />]
      case 4:
        return [<Sparkle key={key} x={x} y={n.y - 20} s={0.9} />, <Bush key={`${key}-b`} x={x} y={n.y + 16} s={0.8} />]
      default:
        return [<Tree key={key} x={x} y={n.y - 10} s={0.7} />]
    }
  })

  // Keng ekranda yon maydonlarga qo'shimcha daraxt, butalar va gullar.
  const sideDecor =
    ext > 70
      ? Array.from({ length: Math.ceil((layout.height - 200) / 240) }, (_, k) => {
          const y = 300 + k * 240
          const lx = -ext + Math.min(70, ext * 0.4)
          const rx = W + ext - shift - Math.min(70, ext * 0.4)
          return (
            <g key={`sd-${k}`}>
              {k % 2 ? <Bush x={lx} y={y + 30} s={1.2} /> : <Tree x={lx} y={y} s={1.1} />}
              {k % 3 === 1 ? <Books x={rx} y={y + 110} /> : <Tree x={rx} y={y + 100} s={k % 2 ? 0.9 : 1.15} />}
              <Flowers x={lx + 46} y={y + 140} />
              <Daisy x={rx - 40} y={y + 30} />
            </g>
          )
        })
      : null

  const firstUnit = layout.units[0]
  const bannerFor = (u: (typeof layout.units)[number]) => {
    const cy = u.bannerY + BANNER_H / 2
    const title = `${u.dayNumber}-kun — ${u.titleUz.length > 30 ? `${u.titleUz.slice(0, 29)}…` : u.titleUz}`
    const bw = Math.min(W + 2 * ext - 80, Math.max(220, pillW(title, 14.5)))
    const bh = 36
    const bx = W / 2 - bw / 2
    const by = cy - bh / 2
    return (
      <g key={`unit-${u.dayId}`} role="group" aria-label={`${u.dayNumber}-kun: ${u.titleUz}`}>
        <g aria-hidden stroke="var(--scene-ray)" strokeWidth={4} strokeLinecap="round">
          <path d={`M${bx - 10} ${cy - 11} l-12 -6 M${bx - 12} ${cy} h-14 M${bx - 10} ${cy + 11} l-12 6`} />
          <path d={`M${bx + bw + 10} ${cy - 11} l12 -6 M${bx + bw + 12} ${cy} h14 M${bx + bw + 10} ${cy + 11} l12 6`} />
        </g>
        <rect x={bx} y={by + 4} width={bw} height={bh} rx={bh / 2} fill="var(--scene-banner-edge)" />
        <rect x={bx} y={by} width={bw} height={bh} rx={bh / 2} fill="url(#aea-banner)" stroke="#fff" strokeWidth={3} />
        <text x={W / 2} y={cy + 5.5} textAnchor="middle" fontSize="14.5" fontWeight="900" fill="#fff" opacity={u.status === 'locked' ? 0.85 : 1}>
          {title}
        </text>
      </g>
    )
  }

  return (
    <div>
      <div className="relative">
        <div
          ref={scrollRef}
          className="relative w-full overflow-y-auto overflow-x-hidden rounded-3xl border-2 border-[var(--scene-pill-edge)] shadow-inner"
          style={{ maxHeight: 640, background: 'var(--scene-grass)' }}
        >
          <div className="relative">
            <svg viewBox={`${(-ext).toFixed(1)} 0 ${(W + 2 * ext).toFixed(1)} ${H}`} width="100%" className="block" role="group" aria-label="Öquv yöli xaritasi">
              <defs>
                <linearGradient id="aea-sky" x1="0" y1="0" x2="0" y2="250" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="var(--scene-sky-top)" />
                  <stop offset="0.8" stopColor="var(--scene-sky-bottom)" />
                  <stop offset="1" stopColor="var(--scene-sky-bottom)" />
                </linearGradient>
                <linearGradient id="aea-banner" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--scene-banner-hi)" />
                  <stop offset="1" stopColor="var(--scene-banner)" />
                </linearGradient>
                <radialGradient id="aea-medal-done" cx="0.4" cy="0.3" r="0.8">
                  <stop offset="0" stopColor="var(--map-done-hi)" />
                  <stop offset="1" stopColor="var(--map-done)" />
                </radialGradient>
                <radialGradient id="aea-medal-current" cx="0.4" cy="0.3" r="0.8">
                  <stop offset="0" stopColor="var(--map-current-hi)" />
                  <stop offset="1" stopColor="var(--map-current)" />
                </radialGradient>
                <radialGradient id="aea-medal-locked" cx="0.4" cy="0.3" r="0.8">
                  <stop offset="0" stopColor="var(--map-locked-hi)" />
                  <stop offset="1" stopColor="var(--map-locked)" />
                </radialGradient>
                <filter id="aea-soft" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#0f2350" floodOpacity="0.22" />
                </filter>
              </defs>

              {/* ---- Fon: osmon, bulutlar, uzoqdagi şahar, tepaliklar, o'tloq ---- */}
              <g aria-hidden pointerEvents="none">
                <rect x={-ext} y={0} width={W + 2 * ext} height={H} fill="var(--scene-grass)" />
                <rect x={-ext} y={0} width={W + 2 * ext} height={260} fill="url(#aea-sky)" />
              </g>
              <g aria-hidden pointerEvents="none" transform={`translate(${shift} 0)`}>
                <Cloud x={W - 50 + ext * 0.7 - shift} y={34} />
                <Cloud x={40 - ext * 0.7} y={70} s={0.75} />
                {ext > 70 && <Cloud x={-ext * 0.3} y={28} s={0.6} />}
                <path
                  d={`M${W * 0.55 + ext * 0.3} 230 v-24 h12 v-14 h10 v24 h8 v-36 h14 v46 h10 v-20 h12 v24 Z M${-ext + 30} 232 v-18 h14 v-12 h10 v30 Z`}
                  fill="var(--scene-city)"
                  opacity={0.6}
                />
                <path d={`M${-ext - shift} 236 C${W * 0.1} 196 ${W * 0.35} 200 ${W * 0.5} 222 S${W * 0.85} 200 ${W + ext} 214 V290 H${-ext - shift} Z`} fill="var(--scene-grass-2)" />
                <path d={`M${-ext - shift} 254 C${W * 0.2} 232 ${W * 0.6} 262 ${W + ext} 240 V300 H${-ext - shift} Z`} fill="var(--scene-grass)" />
                {/* Tepalik ustidagi kitoblar va qalamdon (yuqori chap) */}
                <Books x={-ext + Math.max(34, ext * 0.25)} y={230} s={0.9} />
                {ext > 40 && <PencilCup x={-ext + Math.max(34, ext * 0.25) + 34} y={222} />}
                {Array.from({ length: Math.ceil(H / 64) }, (_, k) => (
                  <Grass key={`g-${k}`} x={((k * 97) % (W + 2 * ext - 40)) + 20 - ext} y={300 + k * 64} />
                ))}
              </g>

              {/* ---- Birinchi kun sarlavhasi — osmonda, «Keyingi maqsad» panelidan yuqorida ---- */}
              {firstUnit && bannerFor(firstUnit)}

              {/* ---- Qolgan hamma narsa panel uchun joy qoldirib pastga suriladi ---- */}
              <g transform={`translate(${shift} ${goalSpace})`}>
                <g aria-hidden pointerEvents="none">
                  {/* O'ngda maktab (birinchi kun yonida), chapda «Dars sayohati» */}
                  {firstUnit && <School x={W + ext - shift - Math.max(58, Math.min(110, ext * 0.6 + 58))} y={firstUnit.bannerY + 262} s={ext > 40 ? 1 : 0.8} />}
                  {sideDecor}
                  {decor}
                </g>

                {/* ---- Yo'l ---- */}
                <g aria-hidden pointerEvents="none" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d={road} stroke="var(--scene-road-edge)" strokeWidth={40} />
                  <path d={road} stroke="var(--scene-road)" strokeWidth={33} />
                  <path d={road} stroke="var(--scene-road-dash)" strokeWidth={4} strokeDasharray="14 13" />
                </g>

                {firstUnit && (
                  <g aria-hidden pointerEvents="none">
                    <Signpost x={-ext + Math.max(58, Math.min(120, ext * 0.6 + 58))} y={firstUnit.bannerY + 70} />
                  </g>
                )}

                {/* ---- Keyingi kunlar sarlavhalari ---- */}
                {layout.units.slice(1).map(bannerFor)}

                {/* ---- Kun yarmidagi sandiqlar ---- */}
                {layout.chests.map((c) => (
                  <g key={`chest-${c.dayId}`} transform={`translate(${c.x} ${c.y})`} aria-hidden>
                    <title>{c.open ? 'Kun yakunlandi' : 'Kun yarmi — davom eting!'}</title>
                    <ellipse cx={0} cy={26} rx={34} ry={9} fill="var(--scene-stone-edge)" />
                    <ellipse cx={0} cy={22} rx={31} ry={8} fill="var(--scene-stone)" />
                    <g filter="url(#aea-soft)">
                      <rect
                        x={-26}
                        y={-6}
                        width={52}
                        height={30}
                        rx={6}
                        fill={c.open ? 'var(--map-chest)' : 'var(--map-locked)'}
                        stroke={c.open ? 'var(--map-chest-edge)' : 'var(--map-locked-edge)'}
                        strokeWidth={2.5}
                      />
                      <path
                        d="M-28 -6 Q0 -30 28 -6 Z"
                        fill={c.open ? 'var(--map-chest-lid)' : 'var(--map-locked)'}
                        stroke={c.open ? 'var(--map-chest-edge)' : 'var(--map-locked-edge)'}
                        strokeWidth={2.5}
                      />
                      <rect x={-6} y={-2} width={12} height={12} rx={2} fill={c.open ? 'var(--map-chest-lock)' : 'var(--map-locked-edge)'} />
                    </g>
                  </g>
                ))}

                {/* ---- Bo'lim chegarasi: marra bayrog'i va yorliq ---- */}
                {layout.milestones.map((m) => (
                  <g
                    key={`ms-${m.afterDayId}`}
                    transform={`translate(${m.x} ${m.y})`}
                    role="img"
                    aria-label={`${m.label}: ${m.reached ? 'oçildi' : `${m.remaining} ta vazifa qoldi`}`}
                  >
                    <g aria-hidden>
                      <FinishFlag x={-8} y={10} />
                      <Sparkle x={-40} y={-30} s={0.8} />
                      <Sparkle x={48} y={-10} s={0.6} />
                    </g>
                    <g filter="url(#aea-soft)">
                      <rect
                        x={-100}
                        y={24}
                        width={200}
                        height={48}
                        rx={16}
                        fill={m.reached ? 'var(--map-done)' : 'var(--scene-pill)'}
                        stroke={m.reached ? 'var(--map-done-edge)' : '#fff'}
                        strokeWidth={3}
                      />
                    </g>
                    <text y={44} textAnchor="middle" fontSize="13.5" fontWeight="900" fill={m.reached ? 'var(--map-done-ink)' : 'var(--scene-pill-ink)'}>
                      {m.label}
                    </text>
                    <text y={62} textAnchor="middle" fontSize="11.5" fontWeight="700" fill={m.reached ? 'var(--map-done-ink)' : 'var(--muted)'}>
                      {m.reached ? 'Oçildi!' : `${m.remaining} ta vazifa qoldi`}
                    </text>
                  </g>
                ))}

                {/* ---- Medallar ---- */}
                {layout.nodes.map((node, i) => {
                  const isFocus = node.id === focusId
                  const isSelected = node.id === selectedId && !isFocus
                  const locked = node.status === 'locked'
                  const start = isFocus && node.status !== 'done'
                  const name = node.isTest ? 'Kun testi' : (SKILL_NAME[node.skill] ?? '')
                  const label = start ? 'Boşlaş' : name
                  const lw = pillW(label, 13) + (start ? 20 : 0)
                  const ly = NODE_R + DEPTH - 2
                  const glyph = skillGlyph(node.skill, node.isTest)
                  const open = () => !locked && onSelect(node)
                  return (
                    // Joylashuv — TASHQI g (atribut); animatsiya — ICHKI g (CSS). Aralashmaydi.
                    <g key={node.id} transform={`translate(${node.x} ${node.y})`}>
                      {/* Tosh taglik */}
                      <ellipse rx={NODE_R + 14} ry={14} cy={NODE_R + DEPTH - 1} fill="var(--scene-stone-edge)" pointerEvents="none" />
                      <ellipse rx={NODE_R + 12} ry={12} cy={NODE_R + DEPTH - 5} fill="var(--scene-stone)" pointerEvents="none" />
                      {start && (
                        <g aria-hidden pointerEvents="none">
                          <circle r={NODE_R + 22} cy={DEPTH / 2} fill="#d9f99d" opacity={0.45} />
                          <Sparkle x={NODE_R + 18} y={-NODE_R - 6} s={0.9} />
                          <Sparkle x={-NODE_R - 20} y={NODE_R - 6} s={0.6} />
                        </g>
                      )}
                      <g
                        className="animate-[var(--animate-chain)]"
                        style={{
                          transformBox: 'fill-box',
                          transformOrigin: 'center',
                          animationDelay: `calc(${Math.min(i, MOTION.staggerMaxItems)} * var(--aea-stagger))`,
                        }}
                      >
                        {isSelected && <circle r={NODE_R + 9} cy={DEPTH / 2} fill="none" stroke="var(--accent)" strokeWidth={3} opacity={0.6} />}
                        <g filter="url(#aea-soft)">
                          <circle r={NODE_R} cy={DEPTH} fill={EDGE[node.status]} />
                          <circle
                            r={NODE_R}
                            fill={FACE[node.status]}
                            stroke="#fff"
                            strokeWidth={4}
                            style={{
                              cursor: locked ? 'not-allowed' : 'pointer',
                            }}
                            onClick={open}
                            role="button"
                            tabIndex={locked ? -1 : 0}
                            aria-label={`${node.isTest ? 'Kun yakuniy testi' : (SKILL_NAME[node.skill] ?? '')}: ${node.titleUz}${node.score !== null ? ` — natija ${node.score}%` : ''}${locked ? ' (qulflangan)' : ''}`}
                            aria-disabled={locked}
                            onKeyDown={(e) => {
                              if (!locked && (e.key === 'Enter' || e.key === ' ')) onSelect(node)
                            }}
                          />
                        </g>
                        <ellipse rx={NODE_R - 12} ry={7} cy={-NODE_R + 12} fill="#fff" opacity={locked ? 0.25 : 0.32} pointerEvents="none" />
                        <path
                          d={glyph.d}
                          fill={glyph.fill ? '#fff' : 'none'}
                          stroke={locked ? 'var(--map-locked-ink)' : '#fff'}
                          strokeWidth={2.3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          transform="translate(-15 -16) scale(1.25)"
                          pointerEvents="none"
                          opacity={locked ? 0.75 : 1}
                        />
                        {locked && (
                          <g transform={`translate(${NODE_R * 0.62} ${NODE_R * 0.5})`} pointerEvents="none" aria-hidden>
                            <circle r={11} fill="var(--scene-pill)" stroke="var(--map-locked-edge)" strokeWidth={2} />
                            <path
                              d="M-4 -1v-2.5a4 4 0 0 1 8 0V-1M-5.5 -1h11v7.5h-11z"
                              fill="var(--map-locked-ink)"
                              stroke="var(--map-locked-ink)"
                              strokeWidth={1.4}
                              strokeLinejoin="round"
                            />
                          </g>
                        )}
                      </g>
                      {/* Joriy medal ustida bayroqcha */}
                      {start && (
                        <g transform={`translate(-2 ${-NODE_R + 4})`} pointerEvents="none" aria-hidden>
                          <rect x={-2.5} y={-42} width={5} height={44} rx={2.5} fill="#8a5a2b" />
                          <path d="M2.5 -42 C12 -46 20 -36 32 -40 L28 -30 L32 -20 C20 -16 12 -26 2.5 -22 Z" fill="#e0293f" />
                          <circle cx={0} cy={-44} r={4.5} fill="#f5b301" />
                          <path d="M-16 -46 l-6 -6 M-20 -36 h-8 M14 -54 l3 -8" stroke="#ffd43b" strokeWidth={3} strokeLinecap="round" />
                        </g>
                      )}
                      {/* Nomi — yumaloq yorliqda (joriy medalda «▶ Boşlaş», bosiladi) */}
                      <g
                        transform={`translate(0 ${ly})`}
                        aria-hidden
                        onClick={start ? open : undefined}
                        style={{ cursor: start ? 'pointer' : undefined }}
                        pointerEvents={start ? 'auto' : 'none'}
                      >
                        <g filter="url(#aea-soft)">
                          <rect
                            x={-lw / 2}
                            y={0}
                            width={lw}
                            height={26}
                            rx={13}
                            fill="var(--scene-pill)"
                            stroke={start ? 'var(--map-current)' : 'var(--scene-pill-edge)'}
                            strokeWidth={start ? 2.5 : 1.5}
                          />
                        </g>
                        {start && (
                          <g transform={`translate(${-lw / 2 + 16} 13)`}>
                            <circle r={8.5} fill="var(--map-current)" />
                            <path d="M-2.5 -4.5 L4.5 0 L-2.5 4.5 Z" fill="#fff" />
                          </g>
                        )}
                        <text
                          x={start ? 10 : 0}
                          y={18}
                          textAnchor="middle"
                          fontSize="13"
                          fontWeight="900"
                          fill={start ? 'var(--map-current-ink)' : locked ? 'var(--muted)' : 'var(--scene-pill-ink)'}
                        >
                          {label}
                        </text>
                      </g>
                      {/* Olingan ball — medal ustida */}
                      {node.score !== null && (
                        <g transform={`translate(${NODE_R - 2} ${-NODE_R + 4})`} pointerEvents="none" aria-hidden>
                          <rect x={-26} y={-13} width={52} height={26} rx={13} fill="#fff8e1" stroke="#f5b301" strokeWidth={2.5} />
                          <text y={4.5} textAnchor="middle" fontSize="12.5" fontWeight="900" fill="#3b2a00">
                            {node.score >= 80 ? '★' : ''}
                            {node.score}%
                          </text>
                        </g>
                      )}
                    </g>
                  )
                })}

                {/* ---- Qahramon — yo'l yonida (asl fayl) ---- */}
                {mascot && (
                  <g pointerEvents="none" aria-hidden>
                    <ellipse cx={mascot.x + mascot.size / 2} cy={mascot.y + mascot.size - 2} rx={mascot.size / 3} ry={7} fill="var(--scene-tuft)" opacity={0.6} />
                    <image href={mascotSrc} x={mascot.x} y={mascot.y} width={mascot.size} height={mascot.size} preserveAspectRatio="xMidYMax meet" />
                  </g>
                )}
              </g>
            </svg>

            {/* «Keyingi maqsad» — birinchi kun sarlavhasi ostida, osmon fonida */}
            {nextGoal && firstUnit && (
              <div className="absolute left-1/2 -translate-x-1/2 w-[calc(100%-24px)] sm:w-[88%] max-w-3xl" style={{ top: (firstUnit.bannerY + BANNER_H + 18) * scale }}>
                <NextGoal m={nextGoal} />
              </div>
            )}
          </div>
        </div>

        {/* Pastki qatlam: yutuqlar (chapda) va joriy darsga qaytish (o'ngda) */}
        {achievements && achOverlay && (
          <div className="absolute left-3 bottom-3 pointer-events-none">
            <Achievements stars={stars} badges={achievements.badges} streak={achievements.streak} />
          </div>
        )}
        {focus && (
          <button
            type="button"
            onClick={() => scrollToFocus(true)}
            className="absolute right-3 bottom-3 rounded-full bg-white/95 dark:bg-[var(--panel)] border-2 border-[var(--scene-pill-edge)] shadow px-3 py-1.5 text-xs font-extrabold text-[var(--scene-pill-ink)] hover:bg-white"
          >
            Joriy darsga ↓
          </button>
        )}
      </div>
      {achievements && !achOverlay && (
        <div className="mt-3 max-w-md">
          <Achievements stars={stars} badges={achievements.badges} streak={achievements.streak} />
        </div>
      )}
    </div>
  )
}
