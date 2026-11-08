/**
 * "Yo'l xaritasi" (Duolingo uslubidagi yilonsimon zigzag) uchun tekis tugun
 * ro'yxati. Mavjud `lessonChain.ts::buildChain` natijasini (kun → bo'limlar
 * zanjiri) EKRAN KOORDINATALARIGA aylantiradi — hisob-kitob (qulf holati,
 * qadamlar tartibi) o'zgarmaydi, faqat chizish uchun (x, y) qo'shiladi.
 *
 * Zigzag qoidasi: tugunlar ustunlar bo'ylab chapdan o'ngga, so'ng o'ngdan
 * chapga (DULO'ning asosiy o'quv yo'li xaritasidagi vizual naqsh) siljiydi.
 * `COLS` — bir "qatorda" nechta tugun (bosqichlar ko'p bo'lsa qator almashadi).
 */

import type { DayChain } from './lessonChain'
import { ChainState, TEST_STEP } from './lessonChain'
import type { Skill } from '../content/types'

export type NodeStatus = 'done' | 'current' | 'locked'

export interface PathNode {
  /** Barqaror id: `${dayId}:${skill}` (test uchun `${dayId}:test`). */
  id: string
  dayId: string
  dayNumber: number
  /** Kun ichidagi tartib raqami (0 dan) — bir xil kunning tugunlarini ajratish uchun. */
  stepIndex: number
  skill: Skill | typeof TEST_STEP
  titleUz: string
  isTest: boolean
  status: NodeStatus
  minutes: number
  /** Zanjirdagi GLOBAL tartib (0 dan) — barcha kunlar bo'ylab ketma-ket. */
  order: number
  x: number
  y: number
}

export interface PathUnit {
  dayId: string
  dayNumber: number
  titleUz: string
  goalUz: string
  status: NodeStatus
  /** Shu bosqichning birinchi tuguni — unit banner shu node'dan boshlanadi. */
  firstNodeOrder: number
}

export interface PathLayout {
  nodes: PathNode[]
  units: PathUnit[]
  width: number
  height: number
}

/** Bir qatorda nechta tugun — undan keyin yo'l teskari tomonga buriladi. */
const COLS = 3
/** Tugunlar orasidagi vertikal masofa (px). */
const ROW_GAP = 104
/** Chekka bo'shlig'i (px). */
const PAD_X = 48
const PAD_TOP = 56

function statusOf(chainState: (typeof ChainState)[keyof typeof ChainState]): NodeStatus {
  if (chainState === ChainState.DONE) return 'done'
  if (chainState === ChainState.CURRENT) return 'current'
  return 'locked'
}

/**
 * Bitta ustundagi x-pozitsiya (0..COLS-1 ustun indeksi, qator juft/toq bo'lsa
 * yo'nalish teskari). Markazga nisbatan kenglik `width` bo'yicha hisoblanadi.
 */
function colX(col: number, width: number): number {
  const cols: number = COLS
  if (cols === 1) return width / 2
  const usable = width - PAD_X * 2
  return PAD_X + (usable * col) / (cols - 1)
}

/**
 * Kunlar zanjiridan (`buildChain` natijasi) butun yo'l xaritasini quradi.
 * Faqat JONIY (current) kunning HAMMA bo'limi "current" bo'lib bo'yaladi —
 * `LearningPath.tsx`dagi avvalgi siyosat bilan bir xil (qulf — kun darajasida).
 *
 * `width` — chizish maydoni kengligi (responsive: chaqiruvchi tomonidan
 * beriladi, masalan konteyner kengligi yoki standart 360).
 */
export function buildPathLayout(chains: readonly DayChain[], width = 360): PathLayout {
  const nodes: PathNode[] = []
  const units: PathUnit[] = []
  let order = 0
  let row = 0

  for (const chain of chains) {
    const status = statusOf(chain.state)
    const firstNodeOrder = order
    units.push({
      dayId: chain.day.id,
      dayNumber: chain.day.dayNumber,
      titleUz: chain.day.titleUz,
      goalUz: chain.day.goalUz,
      status,
      firstNodeOrder,
    })

    chain.steps.forEach((step, stepIndex) => {
      const col = row % COLS
      // Juft "qatorlar bloki"da yo'nalish teskari (zigzag): har COLS tugundan
      // keyin qator oshadi, lekin ketma-ket ikki blokning yo'nalishi teskari
      // bo'lishi uchun `block` juft/toqligi tekshiriladi.
      const block = Math.floor(row / COLS)
      const effectiveCol = block % 2 === 0 ? col : COLS - 1 - col
      const x = colX(effectiveCol, width)
      const y = PAD_TOP + row * ROW_GAP

      nodes.push({
        id: `${chain.day.id}:${step.skill}`,
        dayId: chain.day.id,
        dayNumber: chain.day.dayNumber,
        stepIndex,
        skill: step.skill,
        titleUz: step.titleUz,
        isTest: step.isTest,
        status,
        minutes: step.minutes,
        order,
        x,
        y,
      })
      order++
      row++
    })
  }

  const height = row === 0 ? PAD_TOP * 2 : PAD_TOP + (row - 1) * ROW_GAP + PAD_TOP
  return { nodes, units, width, height }
}

/** Xaritada e'tibor markazida bo'lishi kerak bo'lgan tugun — birinchi
 * "locked" bo'lmagan (current) tugun, bo'lmasa oxirgi "done" tugun. */
export function focalNode(layout: PathLayout): PathNode | null {
  const current = layout.nodes.find((n) => n.status === 'current')
  if (current) return current
  const done = layout.nodes.filter((n) => n.status === 'done')
  return done.length > 0 ? done[done.length - 1]! : layout.nodes[0] ?? null
}
