/**
 * "Yo'l xaritasi" (Duolingo uslubidagi yilonsimon zigzag) uchun tekis tugun
 * ro'yxati. Mavjud `lessonChain.ts::buildChain` natijasini (kun → bo'limlar
 * zanjiri) EKRAN KOORDINATALARIGA aylantiradi — hisob-kitob (qulf holati,
 * qadamlar tartibi) o'zgarmaydi, faqat chizish uchun (x, y) qo'shiladi.
 *
 * Joylashuv: tugunlar markaz atrofida YUMSHOQ TO'LQIN bo'ylab (`WAVE`)
 * pastga tushadi; kun yarmida sandiq belgisi, har kun oldidan ajratgich,
 * bo'lim oxirida sovrin (keyingi bo'lim) tuguni.
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
  /** Banner yuqori chetining y koordinatasi (tugunlar bilan ustma-ust tushmaydi). */
  bannerY: number
  /** Kun qadamlari: jami va tugatilgan (banner ustidagi "3/7"). */
  steps: number
  stepsDone: number
}

/**
 * Bo'lim oxiridagi "sovrin" tugun: keyingi bo'lim shu yerda ochiladi.
 * `remaining` — bo'lim kunlaridagi hali tugatilmagan qadamlar (vazifalar) soni.
 */
export interface PathMilestone {
  afterDayId: string
  /** Ochiladigan bo'lim nomi, masalan "A1.2-bo‘lim" */
  label: string
  x: number
  y: number
  total: number
  remaining: number
  reached: boolean
}

/** Chaqiruvchi beradigan bo'lim chegarasi (qaysi kunlardan keyin, qaysi kunlar hisoblanadi). */
export interface MilestoneSpec {
  afterDayId: string
  sectionDayIds: string[]
  label: string
}

/** Kun yarmidagi sandiq belgisi (bosilmaydi — "yarim yo'l" belgisi). */
export interface PathChest {
  dayId: string
  x: number
  y: number
  /** Kun tugatilganmi (ochiq sandiq) */
  open: boolean
}

export interface PathLayout {
  nodes: PathNode[]
  units: PathUnit[]
  milestones: PathMilestone[]
  chests: PathChest[]
  width: number
  height: number
}

/** Chekka bo'shlig'i (px). */
const PAD_TOP = 56
/** Bosqich banneri balandligi va undan birinchi tugun markazigacha masofa. */
export const BANNER_H = 28
const BANNER_TO_NODE = 96
/** Oxirgi tugundan keyingi bosqich ajratgichiga qadar bo'shliq. */
const AFTER_UNIT = 58
/** Tugunlar orasidagi vertikal qadam (yo'l bo'ylab). */
const STEP_GAP = 92
/** Yumshoq to'lqin: markazdan gorizontal siljish (kenglik ulushi). */
const WAVE = [0, -0.17, -0.25, -0.17, 0, 0.17, 0.25, 0.17]
/** Sovrin tuguni uchun ajratilgan vertikal joy (doira + yorliq). */
const MILESTONE_SPACE = 170

function statusOf(chainState: (typeof ChainState)[keyof typeof ChainState]): NodeStatus {
  if (chainState === ChainState.DONE) return 'done'
  if (chainState === ChainState.CURRENT) return 'current'
  return 'locked'
}


/**
 * Kunlar zanjiridan (`buildChain` natijasi) butun yo'l xaritasini quradi.
 * Faqat JONIY (current) kunning HAMMA bo'limi "current" bo'lib bo'yaladi —
 * `LearningPath.tsx`dagi avvalgi siyosat bilan bir xil (qulf — kun darajasida).
 *
 * `width` — chizish maydoni kengligi (responsive: chaqiruvchi tomonidan
 * beriladi, masalan konteyner kengligi yoki standart 360).
 */
export function buildPathLayout(chains: readonly DayChain[], width = 360, milestoneSpecs: readonly MilestoneSpec[] = []): PathLayout {
  const nodes: PathNode[] = []
  const units: PathUnit[] = []
  const milestones: PathMilestone[] = []
  const chests: PathChest[] = []
  let order = 0
  let row = 0
  // Vertikal kursor: har bosqich OLDIDAN banner uchun joy ajratiladi —
  // banner hech qachon tugun yoki qahramon ustiga tushmaydi.
  let y = 12

  for (const chain of chains) {
    const status = statusOf(chain.state)
    const firstNodeOrder = order
    const bannerY = y
    y += BANNER_H + BANNER_TO_NODE
    units.push({
      dayId: chain.day.id,
      dayNumber: chain.day.dayNumber,
      titleUz: chain.day.titleUz,
      goalUz: chain.day.goalUz,
      status,
      firstNodeOrder,
      bannerY,
      steps: chain.steps.length,
      stepsDone: status === 'done' ? chain.steps.length : 0,
    })

    // Kun ichidagi tartib: qadamlar, o'rtasida (4+ qadamda) sandiq belgisi.
    const chestAt = chain.steps.length >= 4 ? Math.floor(chain.steps.length / 2) : -1
    let slot = 0
    const place = () => {
      const x = width / 2 + WAVE[row % WAVE.length]! * width
      if (slot > 0) y += STEP_GAP
      slot++
      row++
      return x
    }
    chain.steps.forEach((step, stepIndex) => {
      if (stepIndex === chestAt) {
        const cx = place()
        chests.push({ dayId: chain.day.id, x: cx, y, open: status === 'done' })
      }
      const x = place()
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
    })
    y += AFTER_UNIT

    // Bo'lim chegarasi — sovrin tuguni.
    const spec = milestoneSpecs.find((m) => m.afterDayId === chain.day.id)
    if (spec) {
      const mine = nodes.filter((n) => spec.sectionDayIds.includes(n.dayId))
      const remaining = mine.filter((n) => n.status !== 'done').length
      milestones.push({
        afterDayId: spec.afterDayId,
        label: spec.label,
        x: width / 2,
        y: y + 40,
        total: mine.length,
        remaining,
        reached: mine.length > 0 && remaining === 0,
      })
      y += MILESTONE_SPACE
    }
  }

  const height = row === 0 ? PAD_TOP * 2 : y + 12
  return { nodes, units, milestones, chests, width, height }
}

/** Xaritada e'tibor markazida bo'lishi kerak bo'lgan tugun — birinchi
 * "locked" bo'lmagan (current) tugun, bo'lmasa oxirgi "done" tugun. */
export function focalNode(layout: PathLayout): PathNode | null {
  const current = layout.nodes.find((n) => n.status === 'current')
  if (current) return current
  const done = layout.nodes.filter((n) => n.status === 'done')
  return done.length > 0 ? done[done.length - 1]! : layout.nodes[0] ?? null
}
