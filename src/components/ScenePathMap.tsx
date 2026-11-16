/**
 * 2D «Dars sayohati» xaritasi — loyiha egasi bergan namunaviy rasm asosida.
 *
 * QATLAMLAR (har kun uchun bitta sahna):
 *  1. `public/map/scene.webp` — namunaning o'z piksellari: osmon, bulutlar,
 *     tepaliklar, yo'l, maktab, kitoblar, «Dars sayohati» belgisi, qahramon,
 *     marra bayrog'i. Undan FAQAT dinamik qismlar o'chirilgan (matnlar, foizlar,
 *     belgilar, progress) — `scripts/map-assets/build_map_assets.py`.
 *  2. `public/map/band.webp` — sahna ostidagi davom qismi (Gapiriş va Kun testi:
 *     namunada ular yo'q, loyihada har kun 7 qadam).
 *  3. Medal disklari holatga qarab: bajarilgan — oltin, ochiq — yashil,
 *     qulflangan — kulrang (`disc-*.webp`, namuna diskining rangi o'zgartirilgan).
 *  4. Dinamik qatlam (SVG): belgilar, yorliq matnlari, foizlar, kun sarlavhasi,
 *     «Keyingi maqsad» paneli, «Sizning yutuqlaringiz», qulf, joriy dars halqasi.
 *  5. Interaktiv qatlam: har medal — haqiqiy tugma (klaviatura bilan ham).
 *
 * Ma'lumot — `buildPathLayout` (pathMap.ts); qulf/holat qoidasi lessonChain.ts'da.
 * Bu komponent hech qanday qiymatni o'ylab topmaydi.
 */
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import type { PathLayout, PathMilestone, PathNode, PathUnit } from '../lib/pathMap'
import { SCENE } from '../lib/sceneGeometry'
import { GameIcon } from './icons'

const W = SCENE.width
const SH = SCENE.sceneHeight
const DAY_H = SH + SCENE.bandHeight
const NAVY = '#1b2550'
const ORANGE = '#c2410c'

type Slot = 'vocabulary' | 'grammar' | 'reading' | 'listening' | 'writing'
const PLATE_SLOTS: readonly Slot[] = ['vocabulary', 'grammar', 'reading', 'listening', 'writing']
const DISC_FILE: Record<Slot | 'start', string> = {
  start: 'start',
  vocabulary: 'vocab',
  grammar: 'gram',
  reading: 'read',
  listening: 'listen',
  writing: 'write',
}
/** Belgi markazlari (namunadagi joyi). */
const ICON_AT: Record<Slot, { x: number; y: number }> = {
  vocabulary: { x: 801, y: 317 },
  grammar: { x: 1050, y: 489 },
  reading: { x: 611, y: 543 },
  listening: { x: 596, y: 758 },
  writing: { x: 1006, y: 761 },
}
/** Foiz pufakchasi joyi (namunada Lug'at 826,238 va Grammatika 1072,419). */
const BADGE_AT: Record<Slot, { x: number; y: number }> = {
  vocabulary: { x: 826, y: 238 },
  grammar: { x: 1072, y: 419 },
  reading: { x: 640, y: 462 },
  listening: { x: 624, y: 682 },
  writing: { x: 1034, y: 684 },
}
const LABEL_MAX: Record<Slot | 'start', number> = { start: 118, vocabulary: 132, grammar: 158, reading: 124, listening: 126, writing: 126 }

/** Davom qismidagi medallar (Gapiriş, Kun testi) markazi — sahna koordinatasida. */
const BAND_SPOTS = [
  { x: 600, y: SH + 168 },
  { x: 1060, y: SH + 248 },
]
const SKILL_NAME: Record<string, string> = {
  vocabulary: 'Luğat',
  grammar: 'Grammatika',
  reading: 'Öqiş',
  listening: 'Tinglaş',
  writing: 'Yoziş',
  speaking: 'Gapiriş',
  test: 'Kun testi',
}

const asset = (f: string) => `${import.meta.env.BASE_URL}map/${f}`
const colorOf = (s: PathNode['status']) => (s === 'done' ? 'gold' : s === 'locked' ? 'grey' : 'green')

/** Medal ichidagi oq belgi (namunadagi kabi qalin, yumaloq chiziqlar). */
function Glyph({ skill, x, y, locked }: { skill: string; x: number; y: number; locked: boolean }) {
  const stroke = locked ? '#eef1f5' : '#fff'
  const common = { fill: 'none', stroke, strokeWidth: 7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const op = locked ? 0.85 : 1
  switch (skill) {
    case 'vocabulary':
      // Krem karta, to'q sariq «A» va so'z qatorlari
      return (
        <g transform={`translate(${x} ${y})`} opacity={op}>
          <rect x={-35} y={-30} width={70} height={58} rx={11} fill={locked ? '#f3f4f6' : '#fff6e3'} stroke={locked ? '#d1d5db' : '#f0b44a'} strokeWidth={3} />
          <path d="M-24 18 L-12 -16 L0 18 M-18 6 H-6" fill="none" stroke={locked ? '#9ca3af' : '#ef8a12'} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 -10 H24 M8 2 H24 M8 14 H24" stroke={locked ? '#9ca3af' : '#ef8a12'} strokeWidth={6} strokeLinecap="round" />
        </g>
      )
    case 'grammar':
      return <path transform={`translate(${x - 36} ${y - 36}) scale(3)`} d="M12 3.2 14.6 8.6l5.9.8-4.3 4.1 1 5.9L12 16.6l-5.2 2.8 1-5.9L3.5 9.4l5.9-.8Z" {...common} strokeWidth={2.2} opacity={op} />
    case 'reading':
      return <path transform={`translate(${x - 36} ${y - 36}) scale(3)`} d="M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2Zm0 0v13" {...common} strokeWidth={2.2} opacity={op} />
    case 'listening':
      return (
        <path
          transform={`translate(${x - 36} ${y - 36}) scale(3)`}
          d="M4 15v-3a8 8 0 0 1 16 0v3M4 15a2 2 0 0 1 2-2h1.5v7H6a2 2 0 0 1-2-2v-3Zm16 0a2 2 0 0 0-2-2h-1.5v7H18a2 2 0 0 0 2-2v-3Z"
          {...common}
          strokeWidth={2.2}
          opacity={op}
        />
      )
    case 'writing':
      return <path transform={`translate(${x - 36} ${y - 36}) scale(3)`} d="M4.5 19.5 5.5 15 15.5 5a2.1 2.1 0 0 1 3 3l-10 10-4 1.5ZM14 6.5l3 3" {...common} strokeWidth={2.2} opacity={op} />
    case 'speaking':
      return <path transform={`translate(${x - 36} ${y - 36}) scale(3)`} d="M12 3a3.5 3.5 0 0 1 3.5 3.5v4.5a3.5 3.5 0 0 1-7 0V6.5A3.5 3.5 0 0 1 12 3Zm-6.5 8.5a6.5 6.5 0 0 0 13 0M12 18v3" {...common} strokeWidth={2.2} opacity={op} />
    default:
      // Kun testi — kubok
      return (
        <path
          transform={`translate(${x - 36} ${y - 36}) scale(3)`}
          d="M7 4h10v4.5a5 5 0 0 1-10 0V4Zm0 2H4.5a2.5 2.5 0 0 0 2.6 3M17 6h2.5a2.5 2.5 0 0 1-2.6 3M12 13.5V17m-3.5 3h7m-5.5 0 .7-3h2.6l.7 3"
          {...common}
          strokeWidth={2.2}
          opacity={op}
        />
      )
  }
}

/** Matn — joyga sig'masa siqiladi (namunadagi yorliq kengligi o'zgarmaydi). */
function Fit({ x, y, max, size, children, anchor = 'middle', fill = NAVY, weight = 800 }: { x: number; y: number; max: number; size: number; children: string; anchor?: 'middle' | 'start' | 'end'; fill?: string; weight?: number }) {
  const est = children.length * size * 0.56
  return (
    <text x={x} y={y} fontSize={size} fontWeight={weight} fill={fill} textAnchor={anchor} dominantBaseline="central" {...(est > max ? { textLength: max, lengthAdjust: 'spacingAndGlyphs' } : {})}>
      {children}
    </text>
  )
}

function ScoreBadge({ x, y, score }: { x: number; y: number; score: number }) {
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none" aria-hidden>
      <rect width={104} height={44} rx={22} fill="#fff8e6" stroke="#f2b31b" strokeWidth={5} />
      {score >= 80 && <path transform="translate(10 9) scale(1.1)" d="M12 2.5 14.8 8.3l6.2.8-4.6 4.3 1.2 6.2L12 16.6l-5.6 3 1.2-6.2L3 9.1l6.2-.8Z" fill="#f5b301" />}
      <text x={score >= 80 ? 66 : 52} y={23} fontSize={27} fontWeight={900} fill={NAVY} textAnchor="middle" dominantBaseline="central">
        {score}%
      </text>
    </g>
  )
}

function LockBadge({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none" aria-hidden>
      <circle r={22} fill="#fff" stroke="#c4cad4" strokeWidth={3} />
      <path d="M-7 -2v-5a7 7 0 0 1 14 0v5M-10 -2h20v15h-20z" fill="#8a96a8" stroke="#8a96a8" strokeWidth={2.5} strokeLinejoin="round" />
    </g>
  )
}

/** Joriy dars — medal atrofida yorug' halqa. */
function CurrentRing({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g pointerEvents="none" aria-hidden>
      <circle cx={x} cy={y} r={r + 22} fill="#eaff9e" opacity={0.35} />
      <circle cx={x} cy={y} r={r + 14} fill="none" stroke="#fff" strokeWidth={9} opacity={0.95}>
        <animate attributeName="r" values={`${r + 12};${r + 18};${r + 12}`} dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.95;0.45;0.95" dur="1.6s" repeatCount="indefinite" />
      </circle>
    </g>
  )
}

function nodeLabel(n: PathNode): string {
  return `${n.isTest ? 'Kun yakuniy testi' : SKILL_NAME[n.skill] ?? ''}: ${n.titleUz}${n.score !== null ? ` — natija ${n.score}%` : ''}${n.status === 'locked' ? ' (qulflangan)' : ''}`
}

function onKey(open: () => void) {
  return (e: KeyboardEvent<SVGElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      open()
    }
  }
}

interface DayProps {
  unit: PathUnit
  nodes: PathNode[]
  goal: PathMilestone | null
  sectionEnd: PathMilestone | null
  focusId: string | null
  onSelect: (n: PathNode) => void
  achievements?: { stars: number; badges: number; streak: number }
}

function DayScene({ unit, nodes, goal, sectionEnd, focusId, onSelect, achievements }: DayProps) {
  const bySlot = new Map<string, PathNode>()
  const extra: PathNode[] = []
  for (const n of nodes) {
    if (!n.isTest && (PLATE_SLOTS as readonly string[]).includes(n.skill) && !bySlot.has(n.skill)) bySlot.set(n.skill, n)
    else extra.push(n)
  }
  const dayColor = unit.status === 'done' ? 'gold' : unit.status === 'locked' ? 'grey' : 'green'
  // «Boşlaş»: shu kundagi joriy (yoki birinchi bajarilmagan) qadamni ochadi
  const startTarget = nodes.find((n) => n.id === focusId) ?? nodes.find((n) => n.status !== 'done' && n.status !== 'locked') ?? (unit.status === 'done' ? nodes[0] : undefined)
  const startLabel = unit.status === 'locked' ? 'Qulflangan' : unit.status === 'done' ? 'Takrorlaş' : 'Boşlaş'
  const openStart = () => startTarget && unit.status !== 'locked' && onSelect(startTarget)
  const title = `${unit.dayNumber}-kun — ${unit.titleUz}`
  const done = goal ? goal.total - goal.remaining : 0
  const pct = goal && goal.total > 0 ? done / goal.total : 0

  const medal = (n: PathNode, cx: number, cy: number, r: number, label: ReactNode, badge: { x: number; y: number }, lock: { x: number; y: number }) => {
    const locked = n.status === 'locked'
    const open = () => !locked && onSelect(n)
    return (
      <g key={n.id}>
        {n.id === focusId && n.status !== 'done' && <CurrentRing x={cx} y={cy} r={r} />}
        {label}
        {n.score !== null && <ScoreBadge x={badge.x} y={badge.y} score={n.score} />}
        {locked && <LockBadge x={lock.x} y={lock.y} />}
        <circle
          cx={cx}
          cy={cy}
          r={r + 6}
          fill="transparent"
          role="button"
          tabIndex={locked ? -1 : 0}
          aria-label={nodeLabel(n)}
          aria-disabled={locked}
          style={{ cursor: locked ? 'not-allowed' : 'pointer' }}
          onClick={open}
          onKeyDown={onKey(open)}
          className="aea-hit"
        />
      </g>
    )
  }

  return (
    <g role="group" aria-label={`${unit.dayNumber}-kun: ${unit.titleUz}`}>
      {/* 1–2. Sahna va davom qismi */}
      <image href={asset('scene.webp')} width={W} height={SH} preserveAspectRatio="none" className="aea-scene-img" />
      <image href={asset('band.webp')} y={SH} width={W} height={SCENE.bandHeight} preserveAspectRatio="none" className="aea-scene-img" />

      {/* Davom yo'li: Yoziş → Gapiriş → Kun testi */}
      <g pointerEvents="none" aria-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
        {(() => {
          const d = `M1005 880 C1000 990 650 1000 ${BAND_SPOTS[0]!.x} ${BAND_SPOTS[0]!.y + 40} C560 ${SH + 330} 1000 ${SH + 360} ${BAND_SPOTS[1]!.x} ${BAND_SPOTS[1]!.y + 40}`
          return (
            <>
              <path d={d} stroke="#efcd93" strokeWidth={62} className="aea-scene-img" />
              <path d={d} stroke="#fddfae" strokeWidth={52} className="aea-scene-img" />
              <path d={d} stroke="#fffdf8" strokeWidth={7} strokeDasharray="24 22" className="aea-scene-img" />
            </>
          )
        })()}
      </g>

      {/* 3. Medal disklari holat rangida (namunadagi rangdan farq qilsa) */}
      <g pointerEvents="none" aria-hidden className="aea-scene-img">
        {SCENE.discs.start.base !== dayColor && (
          <image href={asset(`disc-start-${dayColor}.webp`)} x={SCENE.discs.start.x} y={SCENE.discs.start.y} width={SCENE.discs.start.w} height={SCENE.discs.start.h} />
        )}
        {PLATE_SLOTS.map((slot) => {
          const n = bySlot.get(slot)
          const g = SCENE.discs[DISC_FILE[slot] as keyof typeof SCENE.discs]
          const col = n ? colorOf(n.status) : 'grey'
          return col === g.base ? null : <image key={slot} href={asset(`disc-${DISC_FILE[slot]}-${col}.webp`)} x={g.x} y={g.y} width={g.w} height={g.h} />
        })}
        {extra.slice(0, BAND_SPOTS.length).map((n, i) => {
          const spot = BAND_SPOTS[i]!
          const m = SCENE.medal
          return <image key={n.id} href={asset(`medal-${colorOf(n.status)}.webp`)} x={spot.x - m.cx} y={spot.y - m.cy} width={m.w} height={m.h} />
        })}
      </g>

      {/* 4. Kun sarlavhasi */}
      <g pointerEvents="none">
        <text
          x={SCENE.banner.x + SCENE.banner.w / 2}
          y={SCENE.banner.y + SCENE.banner.h / 2 + 1}
          fontSize={40}
          fontWeight={900}
          fill="#fff"
          stroke="rgba(20,35,120,0.35)"
          strokeWidth={3}
          paintOrder="stroke"
          textAnchor="middle"
          dominantBaseline="central"
          {...(title.length * 40 * 0.55 > SCENE.banner.w - 70 ? { textLength: SCENE.banner.w - 70, lengthAdjust: 'spacingAndGlyphs' } : {})}
        >
          {title}
        </text>
      </g>

      {/* «Keyingi maqsad» paneli */}
      {goal && (
        <g role="progressbar" aria-label={`${goal.label}gaça bajarilgan vazifalar`} aria-valuemin={0} aria-valuemax={goal.total} aria-valuenow={done} aria-valuetext={`${done} / ${goal.total} vazifa`}>
          <text x={218} y={SCENE.panel.textY} fontSize={30} fontWeight={800} fill={NAVY} dominantBaseline="central">
            Keyingi maqsad: <tspan fill={ORANGE}>{goal.label}</tspan>
          </text>
          <text x={1195} y={SCENE.panel.textY} fontSize={27} fontWeight={800} fill={ORANGE} textAnchor="end" dominantBaseline="central">
            {goal.remaining > 0 ? `${goal.remaining} ta vazifa qoldi` : 'Oçildi!'}
          </text>
          {pct > 0 && (
            <rect x={SCENE.panel.barX} y={SCENE.panel.barY} width={Math.max(SCENE.panel.barH, SCENE.panel.barW * pct)} height={SCENE.panel.barH} rx={SCENE.panel.barH / 2} fill="url(#aea-bar)" />
          )}
          <text x={SCENE.panel.barX + SCENE.panel.barW / 2} y={SCENE.panel.barY + SCENE.panel.barH / 2 + 1} fontSize={22} fontWeight={900} fill={NAVY} textAnchor="middle" dominantBaseline="central">
            {`${done} / ${goal.total}`}
          </text>
        </g>
      )}

      {/* «Sizning yutuqlaringiz» */}
      {achievements && (
        <g aria-label={`Sizning yutuqlaringiz: ${achievements.stars} yulduz, ${achievements.badges} nişon, ${achievements.streak} kun ketma-ket`} role="img">
          <Fit x={SCENE.ach.titleX} y={SCENE.ach.titleY - 2} max={250} size={29} anchor="start">
            Sizning yutuqlaringiz
          </Fit>
          <text x={96} y={928} fontSize={34} fontWeight={900} fill={NAVY} dominantBaseline="central">
            {achievements.stars}
          </text>
          <text x={212} y={917} fontSize={30} fontWeight={900} fill={NAVY} dominantBaseline="central">
            {achievements.badges}
          </text>
          <text x={208} y={942} fontSize={19} fontWeight={700} fill={NAVY} dominantBaseline="central">
            nişon
          </text>
          <Fit x={330} y={917} max={74} size={26} anchor="start" weight={900}>
            {`${achievements.streak} kun`}
          </Fit>
          <text x={330} y={942} fontSize={16} fontWeight={700} fill={NAVY} dominantBaseline="central">
            ketma-ket
          </text>
        </g>
      )}

      {/* Bo'lim chegarasi (shu kundan keyin keyingi bo'lim ochiladi) */}
      {sectionEnd && (
        <g transform={`translate(110 ${SH + 300})`} role="img" aria-label={`${sectionEnd.label}: ${sectionEnd.reached ? 'oçildi' : `${sectionEnd.remaining} ta vazifa qoldi`}`}>
          <rect width={420} height={104} rx={26} fill="#fffaf0" stroke="#f5c84a" strokeWidth={6} />
          <path transform="translate(26 22) scale(2.5)" d="M7 4h10v4.5a5 5 0 0 1-10 0V4Zm0 2H4.5a2.5 2.5 0 0 0 2.6 3M17 6h2.5a2.5 2.5 0 0 1-2.6 3M12 13.5V17m-3.5 3h7m-5.5 0 .7-3h2.6l.7 3" fill="#f5b301" stroke="#c98a12" strokeWidth={1} />
          <Fit x={110} y={36} max={290} size={30} anchor="start">
            {sectionEnd.label}
          </Fit>
          <Fit x={110} y={74} max={290} size={23} anchor="start" fill={ORANGE} weight={700}>
            {sectionEnd.reached ? 'Oçildi!' : `${sectionEnd.remaining} ta vazifa qoldi`}
          </Fit>
        </g>
      )}

      {/* 5. «Boşlaş» medali */}
      <g>
        <Fit x={SCENE.labels.start.x} y={SCENE.labels.start.y} max={LABEL_MAX.start} size={32} fill={unit.status === 'locked' ? '#6b7280' : '#166534'} weight={900}>
          {startLabel}
        </Fit>
        <ellipse
          cx={405}
          cy={405}
          rx={110}
          ry={92}
          fill="transparent"
          role="button"
          tabIndex={unit.status === 'locked' ? -1 : 0}
          aria-label={`${unit.dayNumber}-kun: ${startLabel}${startTarget ? ` — ${SKILL_NAME[startTarget.skill] ?? ''}` : ''}`}
          aria-disabled={unit.status === 'locked'}
          style={{ cursor: unit.status === 'locked' ? 'not-allowed' : 'pointer' }}
          onClick={openStart}
          onKeyDown={onKey(openStart)}
          className="aea-hit"
        />
      </g>

      {/* Sahnadagi 5 medal */}
      {PLATE_SLOTS.map((slot) => {
        const n = bySlot.get(slot)
        if (!n) return null
        const ic = ICON_AT[slot]
        const lb = SCENE.labels[slot]
        const locked = n.status === 'locked'
        return medal(
          n,
          ic.x,
          ic.y + 4,
          82,
          <g pointerEvents="none">
            <Glyph skill={slot} x={ic.x} y={ic.y} locked={locked} />
            <Fit x={lb.x} y={lb.y} max={LABEL_MAX[slot]} size={31} fill={locked ? '#6b7280' : NAVY}>
              {SKILL_NAME[slot] ?? slot}
            </Fit>
          </g>,
          BADGE_AT[slot],
          { x: ic.x + 58, y: ic.y + 48 },
        )
      })}

      {/* Davom qismidagi medallar (Gapiriş, Kun testi) */}
      {extra.slice(0, BAND_SPOTS.length).map((n, i) => {
        const spot = BAND_SPOTS[i]!
        const locked = n.status === 'locked'
        const name = n.isTest ? 'Kun testi' : SKILL_NAME[n.skill] ?? n.skill
        return medal(
          n,
          spot.x,
          spot.y,
          82,
          <g pointerEvents="none">
            <Glyph skill={n.isTest ? 'test' : n.skill} x={spot.x} y={spot.y - 6} locked={locked} />
            <Fit x={spot.x + 1} y={spot.y + 67} max={126} size={31} fill={locked ? '#6b7280' : NAVY}>
              {name}
            </Fit>
          </g>,
          { x: spot.x + 26, y: spot.y - 108 },
          { x: spot.x + 58, y: spot.y + 44 },
        )
      })}
    </g>
  )
}

export interface ScenePathMapProps {
  layout: PathLayout
  /** Mos kelish uchun saqlangan; joriy dars `focusId` bilan belgilanadi. */
  selectedId?: string | null
  onSelect: (node: PathNode) => void
  focusId?: string | null
  /** «Sizning yutuqlaringiz» — haqiqiy nishonlar soni va ketma-ket kunlar. */
  achievements?: { badges: number; streak: number }
}

export default function ScenePathMap({ layout, onSelect, focusId = null, achievements }: ScenePathMapProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const focusedOnce = useRef(false)
  const units = layout.units
  const focus = focusId ? layout.nodes.find((n) => n.id === focusId) ?? null : null
  const stars = layout.nodes.filter((n) => n.score !== null && n.score >= 80).length
  const ach = achievements ? { stars, badges: achievements.badges, streak: achievements.streak } : undefined

  const scrollToFocus = (smooth: boolean) => {
    const el = scrollRef.current
    if (!el || !focus) return
    const di = units.findIndex((u) => u.dayId === focus.dayId)
    if (di < 0) return
    const k = el.clientWidth / W
    const target = (di * (DAY_H + 40) + 300) * k - el.clientHeight * 0.3
    if (typeof el.scrollTo === 'function') el.scrollTo({ top: Math.max(0, target), behavior: smooth ? 'smooth' : 'auto' })
    else el.scrollTop = Math.max(0, target)
  }
  useEffect(() => {
    if (focusedOnce.current || !focus || !scrollRef.current) return
    focusedOnce.current = true
    scrollToFocus(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- faqat birinchi ochilishda
  }, [focus?.id])

  // Har kun uchun «keyingi maqsad»: shu kun yoki undan keyin tugaydigan birinchi bo'lim
  const dayIndex = new Map(units.map((u, i) => [u.dayId, i]))
  const goalFor = (i: number) => layout.milestones.find((m) => (dayIndex.get(m.afterDayId) ?? -1) >= i) ?? null
  const totalH = units.length * (DAY_H + 40) - 40

  return (
    <div>
      <div className="relative">
        <div ref={scrollRef} className="relative w-full overflow-y-auto overflow-x-hidden rounded-3xl border-2 border-[var(--scene-pill-edge)] bg-[#8fd14f] dark:bg-[#24462a]" style={{ maxHeight: 760 }}>
          <svg viewBox={`0 0 ${W} ${Math.max(totalH, 1)}`} width="100%" className="block select-none" role="group" aria-label="Öquv yöli xaritasi">
            <defs>
              <linearGradient id="aea-bar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#4ade80" />
                <stop offset="1" stopColor="#16a34a" />
              </linearGradient>
            </defs>
            {units.map((u, i) => (
              <g key={u.dayId} transform={`translate(0 ${i * (DAY_H + 40)})`}>
                <DayScene
                  unit={u}
                  nodes={layout.nodes.filter((n) => n.dayId === u.dayId).sort((a, b) => a.order - b.order)}
                  goal={goalFor(i)}
                  sectionEnd={layout.milestones.find((m) => m.afterDayId === u.dayId) ?? null}
                  focusId={focusId}
                  onSelect={onSelect}
                  achievements={ach}
                />
              </g>
            ))}
          </svg>
        </div>
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

      {/* Telefon: sahna kichik ko'rinadi — joriy kun qadamlari katta, o'qiladigan tugmalar bilan */}
      {focus && (
        <div className="sm:hidden mt-3 grid gap-2">
          <p className="text-sm font-extrabold">{`${focus.dayNumber}-kun qadamlari`}</p>
          <div className="grid grid-cols-2 gap-2">
            {layout.nodes
              .filter((n) => n.dayId === focus.dayId)
              .sort((a, b) => a.order - b.order)
              .map((n) => {
                const locked = n.status === 'locked'
                const tone = n.status === 'done' ? 'bg-amber-100 border-amber-300 dark:bg-amber-950/40 dark:border-amber-700' : locked ? 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700' : 'bg-green-50 border-green-300 dark:bg-green-950/40 dark:border-green-700'
                return (
                  <button
                    key={n.id}
                    type="button"
                    disabled={locked}
                    onClick={() => onSelect(n)}
                    className={`flex items-center justify-between gap-2 rounded-2xl border-2 px-3 py-2.5 text-left text-sm font-bold ${tone} ${n.id === focusId ? 'ring-2 ring-green-500' : ''} disabled:opacity-70`}
                  >
                    <span>{n.isTest ? 'Kun testi' : SKILL_NAME[n.skill] ?? n.skill}</span>
                    <span className="text-xs tabular-nums">{locked ? <GameIcon name="lock" size={14} /> : n.score !== null ? `${n.score}%` : n.id === focusId ? '▶' : ''}</span>
                  </button>
                )
              })}
          </div>
          {ach && (
            <p className="text-xs font-semibold muted">
              Sizning yutuqlaringiz: {ach.stars} yulduz · {ach.badges} nişon · {ach.streak} kun ketma-ket
            </p>
          )}
        </div>
      )}
    </div>
  )
}
