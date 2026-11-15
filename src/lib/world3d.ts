/**
 * 3D OLAM — mantiq qatlami (sof funksiyalar; sahna `components/world3d/`).
 *
 * 3D olam YANGI kontent yaratmaydi: u mavjud kun zanjirining (`lessonChain.ts`)
 * boshqa ko'rinishi. Olti stansiya — kunning olti bo'limi (lug'at → gapirish),
 * oltin «Finiş» qasri — kun yakuniy testi. Topshiriqlar soni kontentdan olinadi.
 *
 * 2D xaritadan farqi — faqat bitta qoida: stansiyalar KETMA-KET ochiladi
 * (oldingisi yakunlanmaguncha keyingisining darvozasi qulf).
 *
 * KUMUSH TANGA — yangi saqlanadigan maydon EMAS (sinxron sxemasi va mobil
 * o'zgarmaydi): topilgan tangalar mavjud natijalardan HISOBLANADI
 * (`passedTests['step:…']` yulduzlari va yakunlangan kunlar), sarflangani esa
 * `passedTests['coins:spent']` da turadi. Bu kalit faqat o'sadi, `merge.ts` esa
 * `passedTests`ni `max` bilan birlashtiradi — ikki qurilmada ham to'g'ri.
 */
import type { CefrLevel, DailyPlanDay, Skill } from '../content/types'
import { FREEZE_GEM_COST, HEARTS_MAX, MAX_FREEZES } from './gameConfig'
import { PLAN_ORDER, type ChainStep, type DayChain } from './lessonChain'
import type { AppData } from './types'

export type StationState = 'done' | 'open' | 'locked'

export interface NpcLine {
  /** NPC nomi (rol) */
  name: string
  emoji: string
  /** Inglizcha gap (TTS bilan aytiladi) — A1 darajasiga mos */
  en: string
  uz: string
  /** O'quvchi aytishi mumkin bo'lgan javob (mikrofon yoki tugma) */
  replyEn: string
  replyUz: string
}

export interface Station {
  skill: Skill
  index: number
  titleUz: string
  /** Kontentdagi HAQIQIY topshiriqlar soni (yozish/gapirishda — topshiriqlar) */
  tasks: number
  state: StationState
  /** Bo'lim darsi natijasi 0–100 (yo'q bo'lsa null) */
  score: number | null
  stars: 0 | 1 | 2 | 3
  npc: NpcLine
  color: string
  /** Sahnadagi o'rni (x, z) */
  pos: [number, number]
}

export interface FinishZone {
  state: StationState
  tasks: number
  passScore: number
  score: number | null
  titleUz: string
  pos: [number, number]
  npc: NpcLine
}

export interface World {
  dayId: string
  dayTitleUz: string
  stations: Station[]
  finish: FinishZone | null
  /** Qahramon boshlanadigan nuqta */
  spawn: [number, number]
  /** Keyingi maqsad (birinchi ochiq stansiya yoki finiş) — yo'l ko'rsatkichi uchun */
  target: [number, number] | null
}

/* ------------------------------ yulduz va tanga ------------------------------ */

/** Bo'lim natijasidan yulduz: 90+ → 3, 70+ → 2, yakunlangan → 1. */
export function starsOf(score: number | null, done: boolean): 0 | 1 | 2 | 3 {
  if (!done) return 0
  if (score === null) return 1
  return score >= 90 ? 3 : score >= 70 ? 2 : 1
}

export const COINS_PER_STAR = 10
export const COINS_PER_DAY = 100
export const COINS_SPENT_KEY = 'coins:spent'

/** Jami topilgan tanga: har bo'lim darsi yulduzi × 10, har yakunlangan kun × 100. */
export function coinsEarned(data: Pick<AppData, 'path'>): number {
  let stars = 0
  for (const [k, v] of Object.entries(data.path.passedTests)) {
    if (k.startsWith('step:')) stars += starsOf(v, true)
  }
  return stars * COINS_PER_STAR + data.path.completedDays.length * COINS_PER_DAY
}

export function coinsSpent(data: Pick<AppData, 'path'>): number {
  const v = data.path.passedTests[COINS_SPENT_KEY]
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0
}

export function coinBalance(data: Pick<AppData, 'path'>): number {
  return Math.max(0, coinsEarned(data) - coinsSpent(data))
}

/* ------------------------------ tanga do'koni ------------------------------ */

export type CoinItemId = 'heart' | 'gems' | 'freeze'

export const COIN_GEMS = 20

export const COIN_SHOP: { id: CoinItemId; titleUz: string; emoji: string; price: number; noteUz: string }[] = [
  { id: 'heart', titleUz: 'Bitta yurak', emoji: '❤️', price: 30, noteUz: 'Yana bitta xatoga imkon.' },
  { id: 'gems', titleUz: `${COIN_GEMS} gem`, emoji: '💎', price: 60, noteUz: 'Gem döqonida işlatiladi.' },
  { id: 'freeze', titleUz: 'Streak qalqoni', emoji: '🛡️', price: 150, noteUz: `1 kun uzilişni saqlaydi (gemda ${FREEZE_GEM_COST}).` },
]

export interface CoinBuyOutcome {
  data: AppData
  ok: boolean
  reasonUz: string | null
}

/** Tangaga xarid. Yetmasa yoki chegarada bo'lsa — sababi ochiq qaytadi, holat o'zgarmaydi. */
export function coinBuy(data: AppData, item: CoinItemId): CoinBuyOutcome {
  const spec = COIN_SHOP.find((i) => i.id === item)
  if (!spec) return { data, ok: false, reasonUz: 'Bunday buyum yöq.' }
  const balance = coinBalance(data)
  if (balance < spec.price) return { data, ok: false, reasonUz: `Tanga yetmadi: ${spec.price} kerak, sizda ${balance}.` }
  const g = data.game
  if (item === 'heart' && g.hearts >= HEARTS_MAX) return { data, ok: false, reasonUz: `Yuraklar allaqaçon töla (${HEARTS_MAX}).` }
  if (item === 'freeze' && g.freezes >= MAX_FREEZES) return { data, ok: false, reasonUz: `Omborda allaqaçon ${MAX_FREEZES} ta qalqon bor.` }
  const game =
    item === 'heart' ? { ...g, hearts: Math.min(HEARTS_MAX, g.hearts + 1) } : item === 'gems' ? { ...g, gems: g.gems + COIN_GEMS } : { ...g, freezes: g.freezes + 1 }
  const passedTests = { ...data.path.passedTests, [COINS_SPENT_KEY]: coinsSpent(data) + spec.price }
  return { data: { ...data, game, path: { ...data.path, passedTests } }, ok: true, reasonUz: null }
}

/* ------------------------------ NPC va sahna ------------------------------ */

const NPC: Record<Skill, NpcLine> = {
  vocabulary: {
    name: 'Word Keeper',
    emoji: '🧑‍🌾',
    en: 'Hello! I have new words for you. Are you ready?',
    uz: 'Salom! Sizga yangi sözlarim bor. Tayyormisiz?',
    replyEn: 'Yes, I am ready.',
    replyUz: 'Ha, tayyorman.',
  },
  grammar: {
    name: 'Bridge Builder',
    emoji: '👷',
    en: 'Welcome! Let us build good sentences together.',
    uz: 'Xuş kelibsiz! Keling, birga töğri gaplar tuzamiz.',
    replyEn: 'Okay, let us start.',
    replyUz: 'Xöp, boşlaymiz.',
  },
  reading: {
    name: 'Librarian',
    emoji: '👩‍🏫',
    en: 'Good to see you! Please read my story.',
    uz: 'Sizni körganimdan xursandman! Hikoyamni öqing.',
    replyEn: 'I want to read it.',
    replyUz: 'Uni öqimoqçiman.',
  },
  listening: {
    name: 'Radio Host',
    emoji: '🧑‍🎤',
    en: 'Hi there! Listen to me and answer.',
    uz: 'Salom! Meni tinglang va javob bering.',
    replyEn: 'I am listening.',
    replyUz: 'Tinglayapman.',
  },
  writing: {
    name: 'Writer',
    emoji: '🧑‍💼',
    en: 'Hello, my friend! Please write on my board.',
    uz: 'Salom, döstim! Doskamga yozing.',
    replyEn: 'I can write it.',
    replyUz: 'Yoza olaman.',
  },
  speaking: {
    name: 'Storyteller',
    emoji: '🧑‍🚀',
    en: 'Nice to meet you! Speak with me, please.',
    uz: 'Taniştganimdan xursandman! Men bilan gaplaşing.',
    replyEn: 'Nice to meet you too.',
    replyUz: 'Men ham xursandman.',
  },
}

const FINISH_NPC: NpcLine = {
  name: 'Headmaster',
  emoji: '🧙',
  en: 'You did it! This is the last test. Good luck!',
  uz: 'Uddaladingiz! Bu oxirgi sinov. Omad!',
  replyEn: 'Thank you. I am ready.',
  replyUz: 'Rahmat. Tayyorman.',
}

const COLORS: Record<Skill, string> = {
  vocabulary: '#f59e0b',
  grammar: '#3b82f6',
  reading: '#10b981',
  listening: '#a855f7',
  writing: '#ef4444',
  speaking: '#06b6d4',
}

/** Orol bo'ylab ilon izi yo'l: boshlanish → 6 stansiya → finiş. */
export const SPAWN: [number, number] = [0, 15]
export const STATION_POS: [number, number][] = [
  [-7, 10],
  [6.5, 6],
  [-6.5, 1.5],
  [6.5, -3],
  [-6, -7.5],
  [5, -11.5],
]
export const FINISH_POS: [number, number] = [0, -17]
/** Stansiyaga shu masofadan yaqin kelinsa — suhbat taklif qilinadi. */
export const INTERACT_RADIUS = 3.2
/** Orol chegarasi (ellips yarim o'qlari) — qahramon suvga chiqmaydi. */
export const ISLAND = { rx: 13, rz: 21 }

export function clampToIsland(x: number, z: number): [number, number] {
  const k = (x * x) / (ISLAND.rx * ISLAND.rx) + (z * z) / (ISLAND.rz * ISLAND.rz)
  if (k <= 1) return [x, z]
  const s = 1 / Math.sqrt(k)
  return [x * s, z * s]
}

/** Stansiya oldidagi nuqta (darvoza qarshisi) — bosilganda qahramon shu yerga boradi. */
export function frontOf(pos: [number, number], finish = false): [number, number] {
  return [pos[0], pos[1] + (finish ? 3.9 : 2.9)]
}

/** Yo'l nuqtalari (boshlanish → stansiyalar → finiş) — yo'lak va bayroqchalar uchun. */
export function pathPoints(): [number, number][] {
  return [SPAWN, ...STATION_POS, FINISH_POS]
}

export function buildWorld(
  chain: DayChain,
  stepDone: (step: ChainStep, day: DailyPlanDay) => boolean,
  stepScore: (step: ChainStep, day: DailyPlanDay) => number | null,
  dayDone: boolean,
): World {
  const day = chain.day
  const stations: Station[] = []
  let prevDone = true
  for (const skill of PLAN_ORDER) {
    const step = chain.steps.find((s) => s.skill === skill)
    if (!step) continue
    const section = day.sections.find((s) => s.skill === skill)
    const done = dayDone || stepDone(step, day)
    const score = stepScore(step, day)
    const i = stations.length
    stations.push({
      skill,
      index: i,
      titleUz: step.titleUz,
      tasks: step.exerciseIds.length > 0 ? step.exerciseIds.length : (section?.itemIds.length ?? 0),
      state: done ? 'done' : prevDone ? 'open' : 'locked',
      score,
      stars: starsOf(score, done),
      npc: NPC[skill],
      color: COLORS[skill],
      pos: STATION_POS[i % STATION_POS.length]!,
    })
    // Qat'iy ketma-ketlik: keyingisi faqat OLDINGI BARCHA stansiyalar yakunlangach ochiladi
    prevDone = prevDone && done
  }
  const test = day.sectionTest
  const testStep = chain.steps.find((s) => s.isTest)
  const finish: FinishZone | null =
    test && testStep
      ? {
          state: dayDone ? 'done' : prevDone ? 'open' : 'locked',
          tasks: test.exercises.length,
          passScore: test.passScore,
          score: stepScore(testStep, day),
          titleUz: test.titleUz,
          pos: FINISH_POS,
          npc: FINISH_NPC,
        }
      : null
  const next = stations.find((s) => s.state === 'open')
  const target = next ? next.pos : finish && finish.state === 'open' ? finish.pos : null
  return { dayId: day.id, dayTitleUz: day.titleUz, stations, finish, spawn: SPAWN, target }
}

/** Qahramon yonidagi (suhbat masofasidagi) stansiya yoki finiş. */
export function nearestPoint(world: World, x: number, z: number): { kind: 'station'; station: Station } | { kind: 'finish' } | null {
  let best: { d: number; hit: { kind: 'station'; station: Station } | { kind: 'finish' } } | null = null
  for (const s of world.stations) {
    const d = Math.hypot(s.pos[0] - x, s.pos[1] - z)
    if (d <= INTERACT_RADIUS && (!best || d < best.d)) best = { d, hit: { kind: 'station', station: s } }
  }
  if (world.finish) {
    const d = Math.hypot(world.finish.pos[0] - x, world.finish.pos[1] - z)
    if (d <= INTERACT_RADIUS + 0.8 && (!best || d < best.d)) best = { d, hit: { kind: 'finish' } }
  }
  return best?.hit ?? null
}

/* ------------------------------ ko'rinish tanlovi ------------------------------ */

export type PathView = '2d' | '3d'
const VIEW_KEY = 'aea-path-view'

export function loadPathView(): PathView {
  try {
    return localStorage.getItem(VIEW_KEY) === '3d' ? '3d' : '2d'
  } catch {
    return '2d'
  }
}

export function savePathView(v: PathView): void {
  try {
    localStorage.setItem(VIEW_KEY, v)
  } catch {
    /* saqlanmasa ham ishlaydi */
  }
}

/** WebGL bormi (bo'lmasa 3D tugmasi sababi bilan o'chiq turadi). */
export function webglSupported(): boolean {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'))
  } catch {
    return false
  }
}

/* ------------------------------ mukofot (dars oldidan / keyin) ------------------------------ */

const PENDING_KEY = 'aea-world-pending'

export interface PendingVisit {
  dayId: string
  skill: Skill
  xp: number
  coins: number
  hadScore: boolean
}

/** Stansiyaga kirishdan oldin holat eslab qolinadi — qaytganda haqiqiy farq ko'rsatiladi. */
export function rememberVisit(v: PendingVisit): void {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(v))
  } catch {
    /* mukofot oynasi chiqmaydi, xolos */
  }
}

export function takeVisit(): PendingVisit | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    if (!raw) return null
    sessionStorage.removeItem(PENDING_KEY)
    const v = JSON.parse(raw) as Partial<PendingVisit>
    if (typeof v.dayId !== 'string' || typeof v.skill !== 'string' || typeof v.xp !== 'number' || typeof v.coins !== 'number') return null
    return { dayId: v.dayId, skill: v.skill as Skill, xp: v.xp, coins: v.coins, hadScore: v.hadScore === true }
  } catch {
    return null
  }
}

export interface StationReward {
  skill: Skill
  titleUz: string
  score: number
  stars: 1 | 2 | 3
  /** Dars davomida HAQIQATAN qo'shilgan XP va tanga (oldingi holatdan farq) */
  xp: number
  coins: number
}

/** Stansiyadan qaytgach: yangi natija yozilgan bo'lsa — mukofot; aks holda null (hech narsa o'ylab topilmaydi). */
export function rewardFor(visit: PendingVisit | null, world: World, data: Pick<AppData, 'path' | 'xp'>): StationReward | null {
  if (!visit || visit.dayId !== world.dayId) return null
  const st = world.stations.find((s) => s.skill === visit.skill)
  if (!st || st.state !== 'done' || st.score === null) return null
  const coins = coinBalance(data) - visit.coins
  const xp = data.xp - visit.xp
  if (visit.hadScore && coins <= 0 && xp <= 0) return null
  return { skill: st.skill, titleUz: st.titleUz, score: st.score, stars: Math.max(1, st.stars) as 1 | 2 | 3, xp: Math.max(0, xp), coins: Math.max(0, coins) }
}

export function levelLabel(level: CefrLevel, dayId: string): string {
  return `${level} · ${dayId}`
}
