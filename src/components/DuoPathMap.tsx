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
 * ESKI XATO (2026-11-09): tugun `<g transform="translate(..)">`ning o'ziga CSS
 * animatsiya (`transform: scale`) qo'yilgan edi — CSS `transform` SVG
 * atributini bosib, HAMMA tugunlarni (0,0) ga yig'ardi: xaritada faqat chiziq
 * qolardi. Endi joylashuv tashqi `<g>`da, animatsiya ichki `<g>`da
 * (`transform-box: fill-box` — o'z markazidan kattalashadi). Qahramon ham SVG
 * ichida chiziladi — masshtab bilan birga siljiydi, kesilmaydi.
 */

import { useEffect, useRef } from 'react'
import type { PathLayout, PathMilestone, PathNode } from '../lib/pathMap'
import { BANNER_H } from '../lib/pathMap'
import { MOTION } from '../lib/motionManifest'

const NODE_R = 30
const DEPTH = 7

const TOP: Record<PathNode['status'], string> = {
  done: '#f5b301',
  current: '#22c55e',
  locked: '#e2e8f0',
}
const BOTTOM: Record<PathNode['status'], string> = {
  done: '#c98f00',
  current: '#15803d',
  locked: '#b8c2d0',
}

function skillGlyphPath(skill: PathNode['skill'], isTest: boolean): string {
  // Kun yakuniy testi — kubok.
  if (isTest) return 'M7 4h10v4a5 5 0 0 1-10 0V4Zm0 2H4a3 3 0 0 0 3 3m10-3h3a3 3 0 0 1-3 3M12 13v4m-4 3h8m-6 0 1-3h2l1 3'
  switch (skill) {
    case 'vocabulary':
      return 'M4 5h12a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2V5Zm14 3h2v11H6'
    case 'grammar':
      return 'M5 5h14M12 5v14M7 19h10'
    case 'reading':
      return 'M4 6h16v12H4zM8 10h8M8 14h5'
    case 'listening':
      return 'M4 12a8 8 0 0 1 16 0M6 12v4a2 2 0 0 0 4 0v-4m4 0v4a2 2 0 0 0 4 0v-4'
    case 'writing':
      return 'M4 20l4-1 11-11-3-3L5 16l-1 4Z'
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
}

/** Tepada: keyingi bo'limgacha yo'l (🚩 … 🏆) va qolgan vazifalar soni. */
function NextGoal({ m }: { m: PathMilestone }) {
  const done = m.total - m.remaining
  const pct = m.total === 0 ? 0 : Math.round((done / m.total) * 100)
  return (
    <div className="rounded-2xl border-2 border-b-4 border-amber-300 dark:border-amber-600 bg-amber-50/60 dark:bg-amber-950/20 px-3.5 py-3 grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-extrabold">
          <span aria-hidden>🏁 </span>Keyingi maqsad: <span className="text-amber-600 dark:text-amber-400">{m.label}</span>
        </p>
        <p className="text-xs font-extrabold tabular-nums text-amber-700 dark:text-amber-300">
          {m.remaining > 0 ? `${m.remaining} ta vazifa qoldi` : 'Ochildi!'}
        </p>
      </div>
      <div className="flex items-center gap-2" aria-label={`${m.label}gacha: ${done}/${m.total} vazifa`}>
        <span aria-hidden className="text-lg">🚩</span>
        <div className="relative flex-1 h-4 rounded-full bg-[var(--panel-2)] border overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={m.total} aria-valuenow={done}>
          <div className="h-full rounded-full bg-amber-400 transition-[width] duration-500" style={{ width: `${pct}%` }} />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold tabular-nums">
            {done} / {m.total}
          </span>
        </div>
        <span aria-hidden className="text-xl">🏆</span>
      </div>
    </div>
  )
}

export default function DuoPathMap({ layout, selectedId, onSelect, focusId }: DuoPathMapProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const focusedOnce = useRef(false)
  const mascotSrc = `${import.meta.env.BASE_URL}mascot/mascot-full.png`

  // Ochilganda joriy/fokus tugun ko'rinadigan joyga scroll qilinadi.
  useEffect(() => {
    if (focusedOnce.current) return
    const node = focusId ? layout.nodes.find((n) => n.id === focusId) : null
    const el = scrollRef.current
    if (!node || !el) return
    focusedOnce.current = true
    const svgW = Math.min(el.clientWidth, Math.round(layout.width * 1.25))
    const scale = svgW > 0 ? svgW / layout.width : 1
    const targetTop = Math.max(0, node.y * scale - el.clientHeight / 2)
    // jsdom (unit testlar) `scrollTo`ni amalga oshirmaydi — himoyalangan chaqiruv.
    if (typeof el.scrollTo === 'function') el.scrollTo({ top: targetTop, behavior: 'auto' })
    else el.scrollTop = targetTop
  }, [focusId, layout.nodes, layout.width])

  const focus = focusId ? layout.nodes.find((n) => n.id === focusId) ?? null : null
  const nextGoal = layout.milestones.find((m) => m.remaining > 0) ?? layout.milestones[layout.milestones.length - 1] ?? null

  // Qahramon — fokus tugunning to'lqin bo'yicha QARAMA-QARSHI tomonida.
  const mascot = focus
    ? (() => {
        const size = 96
        const right = focus.x <= layout.width / 2
        const x = right ? Math.min(layout.width - size - 4, focus.x + NODE_R + 22) : Math.max(4, focus.x - NODE_R - 22 - size)
        return { x, y: focus.y - size / 2 - 4, size }
      })()
    : null

  return (
    <div className="grid gap-3">
      {nextGoal && <NextGoal m={nextGoal} />}
      <div ref={scrollRef} className="relative w-full overflow-y-auto overflow-x-hidden rounded-2xl" style={{ maxHeight: 560 }}>
        {/* Keng ekranda xarita cho'zilib ketmasin — Duolingodagidek markazda, telefon kengligida. */}
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width="100%"
          className="block mx-auto"
          style={{ maxWidth: Math.round(layout.width * 1.25) }}
          role="img"
          aria-label="O'quv yo'li xaritasi"
        >
          {/* ---- Kun ajratgichlari: "——— 2-kun · Oila va egalik ———" ---- */}
          {layout.units.map((u) => {
            const cy = u.bannerY + BANNER_H / 2
            const active = u.status === 'current'
            const color = active ? 'var(--accent)' : 'var(--muted)'
            return (
              <g key={`unit-${u.dayId}`} aria-label={`${u.dayNumber}-kun: ${u.titleUz}`}>
                <line x1={12} x2={layout.width - 12} y1={cy} y2={cy} stroke="var(--border)" strokeWidth={1.5} />
                <rect x={layout.width / 2 - 130} y={u.bannerY} width={260} height={BANNER_H} rx={BANNER_H / 2} fill="var(--panel)" />
                <text x={layout.width / 2} y={cy + 4.5} textAnchor="middle" fontSize="12.5" fontWeight="800" fill={color}>
                  {`${u.dayNumber}-kun · ${u.titleUz.length > 30 ? `${u.titleUz.slice(0, 29)}…` : u.titleUz}`}
                </text>
              </g>
            )
          })}

          {/* ---- Kun yarmidagi sandiqlar (bosilmaydi — yarim yo'l belgisi) ---- */}
          {layout.chests.map((c) => (
            <g key={`chest-${c.dayId}`} transform={`translate(${c.x} ${c.y})`} aria-hidden>
              <title>{c.open ? 'Kun yakunlandi' : 'Kun yarmi — davom eting!'}</title>
              <ellipse cx={0} cy={26} rx={30} ry={6} fill="var(--border)" opacity={0.5} />
              <rect x={-26} y={-6} width={52} height={30} rx={6} fill={c.open ? '#b7791f' : '#e2e8f0'} stroke={c.open ? '#7c4a03' : '#b8c2d0'} strokeWidth={2.5} />
              <path d="M-28 -6 Q0 -30 28 -6 Z" fill={c.open ? '#d69e2e' : '#e2e8f0'} stroke={c.open ? '#7c4a03' : '#b8c2d0'} strokeWidth={2.5} />
              <rect x={-6} y={-2} width={12} height={12} rx={2} fill={c.open ? '#f5b301' : '#b8c2d0'} />
            </g>
          ))}

          {/* ---- Bo'lim chegarasi: sovrin tuguni ---- */}
          {layout.milestones.map((m) => (
            <g key={`ms-${m.afterDayId}`} transform={`translate(${m.x} ${m.y})`} aria-label={`${m.label}: ${m.remaining > 0 ? `${m.remaining} ta vazifa qoldi` : 'ochildi'}`}>
              <circle r={40} cy={DEPTH} fill={m.reached ? '#c98f00' : '#b8c2d0'} />
              <circle r={40} fill={m.reached ? '#f5b301' : '#e2e8f0'} stroke={m.reached ? '#c98f00' : '#8a96a8'} strokeWidth={3} strokeDasharray={m.reached ? undefined : '7 5'} />
              <text y={13} textAnchor="middle" fontSize="38" opacity={m.reached ? 1 : 0.55}>
                🏆
              </text>
              <rect x={-110} y={56} width={220} height={46} rx={14} fill={m.reached ? '#f5b301' : 'var(--panel)'} stroke={m.reached ? '#c98f00' : 'var(--border)'} strokeWidth={2} />
              <text y={75} textAnchor="middle" fontSize="13" fontWeight="800" fill={m.reached ? '#fff' : 'var(--text)'}>
                {m.label}
              </text>
              <text y={93} textAnchor="middle" fontSize="11.5" fontWeight="700" fill={m.reached ? '#fff' : 'var(--muted)'}>
                {m.reached ? 'Ochildi!' : `${m.remaining} ta vazifa qoldi`}
              </text>
            </g>
          ))}

          {/* ---- Tugunlar (3D tanga) ---- */}
          {layout.nodes.map((node, i) => {
            const isFocus = node.id === focusId
            const isSelected = node.id === selectedId && !isFocus
            const locked = node.status === 'locked'
            return (
              // Joylashuv — TASHQI g (atribut); animatsiya — ICHKI g (CSS). Aralashmaydi.
              <g key={node.id} transform={`translate(${node.x} ${node.y})`}>
                <g
                  className="animate-[var(--animate-chain)]"
                  style={{
                    transformBox: 'fill-box',
                    transformOrigin: 'center',
                    animationDelay: `calc(${Math.min(i, MOTION.staggerMaxItems)} * var(--aea-stagger))`,
                  }}
                >
                  {isFocus && (
                    <>
                      <circle r={NODE_R + 12} cy={DEPTH / 2} fill="none" stroke="var(--panel-2)" strokeWidth={8} />
                      <circle r={NODE_R + 12} cy={DEPTH / 2} fill="none" stroke="#22c55e" strokeWidth={8} opacity={0.35} />
                    </>
                  )}
                  {isSelected && <circle r={NODE_R + 10} cy={DEPTH / 2} fill="none" stroke="var(--accent)" strokeWidth={3} opacity={0.6} />}
                  <ellipse rx={NODE_R} ry={NODE_R - 3} cy={DEPTH} fill={BOTTOM[node.status]} />
                  <ellipse
                    rx={NODE_R}
                    ry={NODE_R - 3}
                    fill={TOP[node.status]}
                    style={{ cursor: locked ? 'not-allowed' : 'pointer' }}
                    onClick={() => !locked && onSelect(node)}
                    role="button"
                    tabIndex={locked ? -1 : 0}
                    aria-label={`${node.titleUz}${node.isTest ? ' (kun yakuniy testi)' : ''}${locked ? ' (qulflangan)' : ''}`}
                    aria-disabled={locked}
                    onKeyDown={(e) => {
                      if (!locked && (e.key === 'Enter' || e.key === ' ')) onSelect(node)
                    }}
                  />
                  <ellipse rx={NODE_R - 9} ry={7} cy={-NODE_R + 12} fill="#fff" opacity={locked ? 0.25 : 0.22} pointerEvents="none" />
                  <path
                    d={skillGlyphPath(node.skill, node.isTest)}
                    fill="none"
                    stroke={locked ? '#8a96a8' : '#fff'}
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    transform="translate(-12 -12)"
                    pointerEvents="none"
                    opacity={locked ? 0.7 : 1}
                  />
                </g>
                {/* «BOSHLASH» yorlig'i — joriy tugun ustida */}
                {isFocus && node.status !== 'done' && (
                  // Joylashuv tashqi g'da, sakrash animatsiyasi ichki g'da (CSS transform atributni bosmasin).
                  <g transform={`translate(0 ${-NODE_R - 30})`} pointerEvents="none">
                    <g className="animate-bounce" style={{ transformBox: 'fill-box' }}>
                    <rect x={-50} y={-16} width={100} height={30} rx={10} fill="var(--panel)" stroke="var(--border)" strokeWidth={2} />
                    <path d="M-7 13 L0 21 L7 13 Z" fill="var(--panel)" stroke="var(--border)" strokeWidth={2} />
                    <rect x={-8} y={10} width={16} height={5} fill="var(--panel)" />
                    <text y={4} textAnchor="middle" fontSize="12" fontWeight="900" fill="#16a34a" letterSpacing="0.5">
                      BOSHLASH
                    </text>
                    </g>
                  </g>
                )}
              </g>
            )
          })}

          {/* ---- Qahramon — yo'l yonida (SVG ichida: masshtab bilan siljiydi, kesilmaydi) ---- */}
          {mascot && (
            <g pointerEvents="none" aria-hidden>
              <ellipse cx={mascot.x + mascot.size / 2} cy={mascot.y + mascot.size - 2} rx={mascot.size / 2.6} ry={7} fill="var(--border)" opacity={0.55} />
              <image href={mascotSrc} x={mascot.x} y={mascot.y} width={mascot.size} height={mascot.size} preserveAspectRatio="xMidYMax meet" />
            </g>
          )}
        </svg>
      </div>
    </div>
  )
}
