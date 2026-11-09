/**
 * BO'LIMLAR (Sections) qatlami — kurs → bo'lim → kun (unit) → qadam.
 *
 * Tahlil: `docs/DUOLINGO_SECTIONS_TAHLIL.md`. Duolingo'dan faqat MEXANIKA
 * olinadi (bo'limlar ro'yxati, holat, progress, sakrash testi); nomlar,
 * matnlar va dizayn — bizniki.
 *
 * Qarorlar (foydalanuvchi bilan kelishilgan, 2026-11-08):
 *  - Har CEFR darajasi 2 bo'limga bo'linadi: `A1.1`, `A1.2`, … `C1.2`.
 *  - Bo'lim kunlarini `SECTION_PLAN` belgilaydi (kun RAQAMLARI bo'yicha).
 *    Kontenti hali yo'q darajalar `empty` — tugma ham, soxta progress ham yo'q.
 *  - SAKRASH TESTI: bo'limga sakrash uchun undan OLDINGI (o'tkazib yuboriladigan)
 *    kunlarning yakuniy test savollaridan tuzilgan test. O'tilsa o'tkazib
 *    yuborilgan kunlar `completedDays`ga qo'shiladi (mobil ham shu ro'yxatni
 *    o'qiydi — qo'shimcha sxema shart emas) va natija
 *    `passedTests['jump:<id>']` ga yoziladi.
 *  - Sakrash testi DARAJANI KO'TARMAYDI (`settings.currentLevel` o'zgarmaydi):
 *    README qoidasi — daraja faqat ko'p ko'nikma dalili bilan ko'tariladi.
 *
 * SOF funksiyalar — kontent registrydan (`getBundle`) boshqa bog'liqlik yo'q.
 */

import { getBundle } from '../content'
import type { CefrLevel, DailyPlanDay, Exercise } from '../content/types'
import { CEFR_LEVELS } from '../content/types'
import type { AppData } from './types'

/** Bo'lim reja yozuvi: qaysi daraja, nechanchi qism, qaysi kun raqamlari. */
export interface SectionPlanEntry {
  id: string
  level: CefrLevel
  /** Daraja ichidagi qism (1 yoki 2) — `A1.1` ning "1" i. */
  part: number
  /** Daraja kunlari raqamlari (`DailyPlanDay.dayNumber`). Bo'sh — kontent yo'q. */
  dayNumbers: number[]
  /** Bo'lim nimani o'rgatadi (qisqa, o'zbekcha) — "Batafsil" ichida. */
  summaryUz: string
}

/**
 * Bo'limlar rejasi. A1 kontenti 7 kun: 1–4 (asoslar) va 5–7 (kundalik
 * vaziyatlar). Qolgan darajalar uchun kunlar hali yozilmagan — `dayNumbers`
 * bo'sh, karta "Kontent tayyorlanmoqda" deb ochiq yozadi.
 */
export const SECTION_PLAN: readonly SectionPlanEntry[] = [
  { id: 'a1-1', level: 'A1', part: 1, dayNumbers: [1, 2, 3, 4], summaryUz: 'Salomlashish, oila va egalik, kunlik tartib, uy va xonalar: “to be”, “have got”, Present Simple, “there is / are”.' },
  { id: 'a1-2', level: 'A1', part: 2, dayNumbers: [5, 6, 7], summaryUz: 'Ovqat va ichimliklar, bo‘sh vaqt va rejalar, sayohat va yo‘l so‘rash: “some / any”, “can”, “going to”, “was / were”.' },
  { id: 'a2-1', level: 'A2', part: 1, dayNumbers: [1, 2, 3, 4], summaryUz: 'O‘tgan hafta oxiri, bolalik xotiralari, shahar va qishloq, rejalar va ob-havo: Past Simple (to‘g‘ri va noto‘g‘ri fe’llar), qiyosiy daraja, “going to / will”.' },
  { id: 'a2-2', level: 'A2', part: 2, dayNumbers: [5, 6, 7], summaryUz: 'Hayot tajribalari, sog‘liq va maslahat, oshxona va xarid: Present Perfect, “should / must / have to”, “some / any, much / many”.' },
  ...CEFR_LEVELS.filter((l) => l !== 'A1' && l !== 'A2').flatMap((level) =>
    [1, 2].map((part) => ({
      id: `${level.toLowerCase()}-${part}`,
      level,
      part,
      dayNumbers: [] as number[],
      summaryUz: '',
    })),
  ),
]

/** Sakrash testidan o'tish chegarasi (%) — BIZNING qarorimiz (kun testi 70 dan qattiqroq). */
export const JUMP_PASS_SCORE = 80
/** Sakrash testiga har o'tkazib yuboriladigan kundan olinadigan savollar soni — BIZNING qarorimiz. */
export const JUMP_ITEMS_PER_DAY = 3

export type SectionStatus = 'done' | 'current' | 'locked' | 'empty'

export interface SectionCard {
  id: string
  /** `A1.1` ko'rinishidagi yorliq. */
  label: string
  level: CefrLevel
  part: number
  summaryUz: string
  status: SectionStatus
  days: DailyPlanDay[]
  daysDone: number
  /** Sakrash testi natijasi (bo'lsa) — `passedTests['jump:<id>']`. */
  jumpScore: number | null
  /** Shu bo'limga sakrash testi mumkinmi (qulflangan va kontenti bor). */
  canJump: boolean
  /** Namuna ibora — bo'limning birinchi kunidagi birinchi so'z misoli (kontentdan, ixtiro emas). */
  sample: { en: string; uz: string } | null
}

export function sectionLabel(e: Pick<SectionPlanEntry, 'level' | 'part'>): string {
  return `${e.level}.${e.part}`
}

export function jumpKey(sectionId: string): string {
  return `jump:${sectionId}`
}

function daysOf(entry: SectionPlanEntry): DailyPlanDay[] {
  const all = getBundle(entry.level).days
  return entry.dayNumbers.map((n) => all.find((d) => d.dayNumber === n)).filter((d): d is DailyPlanDay => d !== undefined)
}

/**
 * Bo'lim kartalari. Holat qoidasi:
 *  - kontenti yo'q → `empty`;
 *  - hamma kuni `completedDays`da → `done`;
 *  - birinchi tugallanmagan bo'lim (kontentli) → `current`;
 *  - qolganlari → `locked` (sakrash testi bilan ochiladi).
 */
export function buildSections(data: Pick<AppData, 'path'>): SectionCard[] {
  const done = new Set(data.path.completedDays)
  let currentGiven = false
  return SECTION_PLAN.map((entry) => {
    const days = daysOf(entry)
    const daysDone = days.filter((d) => done.has(d.id)).length
    let status: SectionStatus
    if (days.length === 0) status = 'empty'
    else if (daysDone === days.length) status = 'done'
    else if (!currentGiven) {
      status = 'current'
      currentGiven = true
    } else status = 'locked'
    const first = days[0]
    const vocab = first ? getBundle(entry.level).vocab.find((v) => first.sections.some((s) => s.itemIds.includes(v.id))) : undefined
    return {
      id: entry.id,
      label: sectionLabel(entry),
      level: entry.level,
      part: entry.part,
      summaryUz: entry.summaryUz,
      status,
      days,
      daysDone,
      jumpScore: data.path.passedTests[jumpKey(entry.id)] ?? null,
      canJump: status === 'locked',
      sample: vocab ? { en: vocab.exampleEn, uz: vocab.exampleUz } : null,
    }
  })
}

/** Shu bo'limga sakrashda o'tkazib yuboriladigan (hali tugallanmagan) kunlar. */
export function skippedDaysFor(sectionId: string, data: Pick<AppData, 'path'>): DailyPlanDay[] {
  const idx = SECTION_PLAN.findIndex((s) => s.id === sectionId)
  if (idx < 0) return []
  const done = new Set(data.path.completedDays)
  return SECTION_PLAN.slice(0, idx)
    .flatMap((e) => daysOf(e))
    .filter((d) => !done.has(d.id))
}

/**
 * Sakrash testi savollari: har o'tkazib yuboriladigan kunning yakuniy
 * testidan birinchi `JUMP_ITEMS_PER_DAY` ta mashq (deterministik — har
 * qurilmada bir xil test).
 */
export function jumpTestExercises(sectionId: string, data: Pick<AppData, 'path'>): Exercise[] {
  return skippedDaysFor(sectionId, data).flatMap((d) => (d.sectionTest?.exercises ?? []).slice(0, JUMP_ITEMS_PER_DAY))
}

/**
 * Sakrash natijasini holatga qo'llash (reducer chaqiradi). O'tilmasa yoki
 * bo'lim noma'lum bo'lsa — faqat eng yaxshi natija yoziladi, kunlar
 * o'zgarmaydi. Darajaga (`settings.currentLevel`) TEGILMAYDI.
 */
export function applySectionJump(state: AppData, sectionId: string, score: number): AppData {
  if (!SECTION_PLAN.some((s) => s.id === sectionId)) return state
  const key = jumpKey(sectionId)
  const passedTests = { ...state.path.passedTests, [key]: Math.max(state.path.passedTests[key] ?? 0, score) }
  if (score < JUMP_PASS_SCORE) return { ...state, path: { ...state.path, passedTests } }
  const skipped = skippedDaysFor(sectionId, state).map((d) => d.id)
  const completedDays = [...state.path.completedDays, ...skipped.filter((id) => !state.path.completedDays.includes(id))]
  const levelDays = getBundle(state.settings.currentLevel).days
  const currentDayId = levelDays.find((d) => !completedDays.includes(d.id))?.id ?? state.path.currentDayId
  return { ...state, path: { completedDays, passedTests, currentDayId } }
}

/** Joriy bo'lim va undagi joriy kun — Dashboard/O'quv yo'li banneri uchun. */
export interface CurrentSectionInfo {
  section: SectionCard
  /** Bo'lim ichidagi kun tartibi (1 dan). */
  unitNumber: number
  day: DailyPlanDay
}

/**
 * Banner ma'lumoti: joriy (`current`) bo'lim va `path.currentDayId` kuni.
 * Hamma bo'lim tugagan bo'lsa — oxirgi kontentli bo'lim, oxirgi kuni.
 * Kontent umuman yo'q bo'lsa — null (banner ko'rsatilmaydi).
 */
export function currentSectionInfo(
  data: Pick<AppData, 'path'> & { settings?: Pick<AppData['settings'], 'currentLevel'> },
): CurrentSectionInfo | null {
  const cards = buildSections(data)
  // Baholangan darajadan PAST bo'limlar "joriy" hisoblanmaydi (A2 dan
  // boshlagan o'quvchiga A1.1 ko'rsatilmasin). Daraja bu yerda o'zgarmaydi.
  const from = data.settings ? CEFR_LEVELS.indexOf(data.settings.currentLevel) : 0
  const eligible = cards.filter((c) => CEFR_LEVELS.indexOf(c.level) >= from && c.days.length > 0)
  const done = new Set(data.path.completedDays)
  const section =
    eligible.find((c) => c.days.some((d) => !done.has(d.id))) ??
    [...cards].reverse().find((c) => c.status === 'done') ??
    eligible[eligible.length - 1]
  if (!section || section.days.length === 0) return null
  let idx = section.days.findIndex((d) => d.id === data.path.currentDayId)
  if (idx < 0) idx = section.days.findIndex((d) => !done.has(d.id))
  if (idx < 0) idx = section.days.length - 1
  return { section, unitNumber: idx + 1, day: section.days[idx]! }
}

/**
 * O'quv yo'li QAYSI darajaning kunlarini ko'rsatadi: baholangan daraja
 * (`settings.currentLevel`) yoki undan keyingi birinchi tugallanmagan bo'lim
 * darajasi. Masalan A1 kunlari tugasa (yoki A2.1 ga sakralsa) yo'l A2 kunlariga
 * o'tadi. BAHOLANGAN DARAJA O'ZGARMAYDI — u faqat ko'p ko'nikma dalili bilan
 * ko'tariladi (`skillScoring.ts`).
 */
export function pathLevel(data: Pick<AppData, 'path' | 'settings'>): CefrLevel {
  return currentSectionInfo(data)?.section.level ?? data.settings.currentLevel
}

/**
 * Xarita uchun bo'lim chegaralari: har kontentli bo'limning oxirgi kunidan
 * keyin "keyingi bo'lim" sovrin tuguni (`pathMap.ts::MilestoneSpec`).
 */
export function pathMilestoneSpecs(level: CefrLevel): { afterDayId: string; sectionDayIds: string[]; label: string }[] {
  const out: { afterDayId: string; sectionDayIds: string[]; label: string }[] = []
  SECTION_PLAN.forEach((entry, i) => {
    if (entry.level !== level) return
    const days = daysOf(entry)
    const last = days[days.length - 1]
    if (!last) return
    const next = SECTION_PLAN[i + 1]
    out.push({
      afterDayId: last.id,
      sectionDayIds: days.map((d) => d.id),
      label: next ? `${sectionLabel(next)}-bo‘lim` : 'Kurs yakuni',
    })
  })
  return out
}
