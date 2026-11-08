/**
 * "O'quv yo'li" xaritasi — Duolingo uslubidagi yilonsimon (zigzag) yo'l.
 * Har bo'lim (yoki bo'lim testi) bitta doira TUGUN; tugunlar egri chiziq
 * bilan bog'lanadi. Holat ranggi: yashil — tugatilgan, ko'k — joriy (bosilsa
 * bo'ladi), kulrang — qulflangan. Qahramon (`MascotAvatar`) joriy tugunda
 * turadi — DULO'dagi "xaritada seni kutib turuvchi belgi" ko'rinishi.
 *
 * Ma'lumot — `src/lib/pathMap.ts::buildPathLayout` (sof funksiya, hisob-kitob
 * shu yerda emas, u yerda). Bu komponent FAQAT chizadi; qulf/holat qoidasi
 * `lessonChain.ts`dan keladi — ikki marta yozilmaydi.
 *
 * Bosqich (unit) bannerlari — DULO'dagi "Unit 1, 2, 3…" sarlavha panellari.
 */

import { useEffect, useMemo, useRef } from 'react'
import type { PathLayout, PathNode } from '../lib/pathMap'
import { MOTION } from '../lib/motionManifest'
import { MascotAvatar } from './Mascot'

const NODE_R = 26

const STATUS_FILL: Record<PathNode['status'], string> = {
  done: 'var(--ok)',
  current: 'var(--accent)',
  locked: 'var(--panel-2)',
}
const STATUS_STROKE: Record<PathNode['status'], string> = {
  done: 'var(--ok)',
  current: 'var(--accent)',
  locked: 'var(--border)',
}

function skillGlyphPath(skill: PathNode['skill'], isTest: boolean): string {
  if (isTest) return 'M12 2 3 7l9 5 9-5-9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5' // test — toj/yulduzsimon
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

/** Ikki tugun orasidagi yumshoq egri chiziq (S-shakl) — zigzagni chiroyli bog'laydi. */
function pathBetween(a: PathNode, b: PathNode): string {
  const midY = (a.y + b.y) / 2
  return `M ${a.x} ${a.y} C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y}`
}

export interface DuoPathMapProps {
  layout: PathLayout
  selectedId: string | null
  onSelect: (node: PathNode) => void
  /** Xaritaga kirishda shu tugun ko'rinadigan joyga aylantiriladi. */
  focusId?: string | null
}

export default function DuoPathMap({ layout, selectedId, onSelect, focusId }: DuoPathMapProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const focusedOnce = useRef(false)

  // Ochilganda joriy/fokus tugun ko'rinadigan joyga scroll qilinadi — uzun
  // xaritada o'quvchi har safar yuqoridan emas, "shu yerdaman"dan boshlaydi.
  useEffect(() => {
    if (focusedOnce.current) return
    const node = focusId ? layout.nodes.find((n) => n.id === focusId) : null
    if (!node || !scrollRef.current) return
    focusedOnce.current = true
    const el = scrollRef.current
    const targetTop = Math.max(0, node.y - el.clientHeight / 2)
    // jsdom (unit testlar) `scrollTo`ni amalga oshirmaydi — himoyalangan chaqiruv:
    // xarita baribir to'g'ri render bo'ladi, faqat avtomatik scroll o'tkazib
    // yuboriladi.
    if (typeof el.scrollTo === 'function') el.scrollTo({ top: targetTop, behavior: 'auto' })
    else el.scrollTop = targetTop
  }, [focusId, layout.nodes])

  const unitBands = useMemo(() => {
    // Har unit banner joylashadigan y — o'z birinchi tuguni y'sidan sal yuqorida.
    return layout.units.map((u) => {
      const firstNode = layout.nodes.find((n) => n.order === u.firstNodeOrder)
      return { ...u, y: (firstNode?.y ?? 0) - ROW_GAP_HALF }
    })
  }, [layout.units, layout.nodes])

  return (
    <div
      ref={scrollRef}
      className="relative w-full overflow-y-auto overflow-x-hidden rounded-2xl"
      style={{ maxHeight: 560 }}
    >
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        width="100%"
        height={layout.height}
        role="img"
        aria-label="O'quv yo'li xaritasi"
      >
        {/* ---- Bog'lovchi chiziqlar ---- */}
        {layout.nodes.slice(1).map((node, i) => {
          const prev = layout.nodes[i]!
          const lit = prev.status !== 'locked'
          return (
            <path
              key={`edge-${node.id}`}
              d={pathBetween(prev, node)}
              fill="none"
              stroke={lit ? 'var(--ok)' : 'var(--border)'}
              strokeWidth={5}
              strokeLinecap="round"
              opacity={lit ? 0.85 : 0.6}
            />
          )
        })}

        {/* ---- Bosqich (unit) bannerlari ---- */}
        {unitBands.map((u) => (
          <g key={`unit-${u.dayId}`}>
            <rect
              x={16}
              y={Math.max(4, u.y)}
              width={layout.width - 32}
              height={40}
              rx={14}
              fill={u.status === 'locked' ? 'var(--panel-2)' : 'var(--accent)'}
              opacity={u.status === 'locked' ? 0.5 : 1}
            />
            <text
              x={layout.width / 2}
              y={Math.max(4, u.y) + 25}
              textAnchor="middle"
              fontSize="13"
              fontWeight="700"
              fill={u.status === 'locked' ? 'var(--muted)' : '#fff'}
            >
              {`${u.dayNumber}-kun · ${u.titleUz}`}
            </text>
          </g>
        ))}

        {/* ---- Tugunlar ---- */}
        {layout.nodes.map((node, i) => {
          const isFocus = node.id === focusId
          const isSelected = node.id === selectedId
          const locked = node.status === 'locked'
          const pulseFocus = isFocus && node.status === 'current'
          return (
            <g
              key={node.id}
              transform={`translate(${node.x} ${node.y})`}
              style={{
                animationDelay: `calc(${Math.min(i, MOTION.staggerMaxItems)} * var(--aea-stagger))`,
              }}
              className="animate-[var(--animate-chain)]"
            >
              {isSelected && (
                <circle r={NODE_R + 7} fill="none" stroke="var(--accent)" strokeWidth={2.5} opacity={0.55} />
              )}
              {pulseFocus && (
                <circle
                  r={NODE_R + 4}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  opacity={0.4}
                  className="animate-[var(--animate-pop)]"
                />
              )}
              <circle
                r={NODE_R}
                fill={STATUS_FILL[node.status]}
                stroke={STATUS_STROKE[node.status]}
                strokeWidth={2}
                opacity={locked ? 0.55 : 1}
                style={{ cursor: locked ? 'not-allowed' : 'pointer', transition: 'transform 120ms ease-out' }}
                onClick={() => !locked && onSelect(node)}
                role="button"
                tabIndex={locked ? -1 : 0}
                aria-label={`${node.titleUz}${locked ? ' (qulflangan)' : ''}`}
                aria-disabled={locked}
                onKeyDown={(e) => {
                  if (!locked && (e.key === 'Enter' || e.key === ' ')) onSelect(node)
                }}
              />
              {locked ? (
                <path
                  d="M-7 -2h14v9h-14z M-5 -2v-3a5 5 0 0 1 10 0v3"
                  fill="none"
                  stroke="var(--muted)"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  pointerEvents="none"
                />
              ) : (
                <path
                  d={skillGlyphPath(node.skill, node.isTest)}
                  fill="none"
                  stroke="#fff"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  transform="translate(-12 -12) scale(1)"
                  pointerEvents="none"
                />
              )}
              {node.status === 'done' && (
                <circle r={9} cx={NODE_R - 6} cy={-(NODE_R - 6)} fill="var(--panel)" pointerEvents="none" />
              )}
              {node.status === 'done' && (
                <path
                  d={`M ${NODE_R - 10} ${-(NODE_R - 6)} l 3 3 l 5 -6`}
                  fill="none"
                  stroke="var(--ok)"
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pointerEvents="none"
                />
              )}
            </g>
          )
        })}
      </svg>

      {/* ---- Qahramon (mascot) — joriy fokus tugun ustida ---- */}
      {focusId &&
        (() => {
          const node = layout.nodes.find((n) => n.id === focusId)
          if (!node) return null
          return (
            <div
              className="absolute pointer-events-none animate-[var(--animate-pop)]"
              style={{ left: node.x, top: node.y - NODE_R - 46, transform: 'translateX(-50%)' }}
              aria-hidden
            >
              <MascotAvatar size="sm" mood="cheer" />
            </div>
          )
        })()}
    </div>
  )
}

/** `unitBands` hisobida ishlatiladigan yarim qator masofasi — `pathMap.ts`dagi
 * `ROW_GAP` bilan vizual mувофiq bo'lishi uchun shu yerda takrorlanadi emas,
 * taxminiy siljish sifatida qattiq qiymat olinadi (faqat bannerning tugundan
 * tepada turishi uchun — hisob-kitobga ta'sir qilmaydi). */
const ROW_GAP_HALF = 60
