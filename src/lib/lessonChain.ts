/**
 * Darslar KETMA-KETLIGI (zanjir) — mobildagi
 * `mobile/.../domain/LessonChain.kt` ning vebdagi ekvivalenti.
 * Ikkala tomonda QOIDALAR BIR XIL (sonlar quyida manba bilan birga yozilgan),
 * shuning uchun telefon va brauzerda bir xil mashq tartibi ko'rinadi —
 * "ikki tomonlama sinxron" faqat ma'lumotda emas, ketma-ketlikda ham.
 *
 * MANBA — `DULO_mod.apk` ichidagi fayllar (zap arxivi ochib o'qildi; apktool
 * va tarmoq shart emas). HAR BIR SON repodagi skriptdan olinadi:
 * `tools/dulo_scan/dulo_facts.py` → `tools/dulo_scan/DULO_FAKTLAR.json`
 * (o'lchangan sana: 2026-11-05):
 *  - `assets/hardcoded_sessions/` ichida 18 ta dars JSON'i (chess 4, music 2,
 *    math 12). Har darsda tartib
 *    **buyruq ro'yxati** bilan beriladi (`{id, challenges[], type, skillId…}`);
 *    `challenges` massivining tartibi o'quv tartibining O'ZIDIR.
 *  - `math/math_lesson.json` (85 960 bayt) — 15 mashq, 10 xil tur
 *    (`mathProductSelect` ×3, `mathDecimalFill` ×2, `mathTypeFill` ×2,
 *    `mathEstimateNumberLine` ×2 va 6 yagona tur).
 *  - SHu darsda 3 qo'shni bir xil tur (`mathDecimalFill` 2→3,
 *    `mathEstimateNumberLine` 6→7, `mathProductSelect` 14→15), eng qisqa takror
 *    masofasi 1. 3+ turga ega 5 ta dars (50 tur / 45 qo'shni juftlik) bo'yicha
 *    qo'shni bir xilligi **31.1%** — ~69% hollarda tur almashadi. Bir turli
 *    darslar (`math_l0_lessons.json` 38 tur, chess, match_practice) — 100% bir xil.
 *
 * BIZNING TALAB QASDDAN KUCHLIROQ (`MIN_KIND_GAP = 2`): aralash havzada bir xil
 * turli qo'shni UMUMAN bo'lmaydi. DULO klonida nusxalanadigan narsa — 31.1%
 * soni EMAS, MEHANIZM: tartib buyruq ro'yxati bilan beriladi + tur almashinuvi
 * + takrorlash qatlami.
 *
 * Bizda zanjir ikki qatlamda: KUNLAR tartibi (`path.currentDayId`) va kun
 * ichida BO'LIM→MASHQ tartibi. Quyidagi funksiya ikkinchisini kuradi.
 * SOF funksiya — kontent registrydan mustaqil, unit testda tekshiriladi.
 */

import type { DailyPlanDay, DaySection, Exercise, Skill } from '../content/types'

/** Zanjir bo'limi — kun ichidagi bitta "dars" (ko'nikma yoki bo'lim testi). */
export interface ChainStep {
  dayId: string
  /** Ko'nikma (`Skill`) yoki TEST_STEP. */
  skill: Skill | typeof TEST_STEP
  /** Bo'lim mashq id'lari, zanjir tartibida. */
  exerciseIds: string[]
  /** Zanjirdagi tartib nomeri (0 dan). */
  index: number
  /** Bo'lim daqiqasi (`DaySection.minutes`); testda 0 — maydon yo'q. */
  minutes: number
  isTest: boolean
  /** Bo'lim sarlavhasi (`DaySection.titleUz`). */
  titleUz: string
}

/** Bo'lim testini zanjir oxiriga qo'shish uchun soxta "ko'nikma" nomi. */
export const TEST_STEP = 'test'

/** Zanjir qulfi holatlari. */
export const ChainState = { LOCKED: 'locked', CURRENT: 'current', DONE: 'done' } as const
export type ChainStateValue = (typeof ChainState)[keyof typeof ChainState]

/**
 * Bo'limlar ko'rinadigan tartibi — `src/pages/LearningPath.tsx` bo'limlarni
 * `day.sections` tartibida chizadi, kontent registry esa shu tartibda
 * yaratilgan (vocab → grammar → reading → listening → writing → speaking).
 * Mobilda `Skills.PLAN_ORDER` — ikkalasi bir xil.
 */
export const PLAN_ORDER: Skill[] = ['vocabulary', 'grammar', 'reading', 'listening', 'writing', 'speaking']

export interface DayChain {
  day: DailyPlanDay
  dayIndex: number
  steps: ChainStep[]
  isCurrent: boolean
  isDone: boolean
  state: ChainStateValue
}

/**
 * Kun zanjiri.
 *
 * Qulf qoidasi (`src/pages/LearningPath.tsx` siyosati; mobilda `nextDayId`
 * ham shuni qiladi): kun faqatoldingi kun yakunlansa yoki u joriy kun bo'lsa
 * ochiladi — qolganlar `locked`. Ochilgan kunning HAMMA bo'limi ochiq,
 * shuning uchun joriy kunda bitta qadam emas, hamma qadam `current`.
 */
export function buildChain(
  day: DailyPlanDay,
  exerciseIdsBySkill: Partial<Record<Skill, string[]>>,
  dayIndex = 0,
  isCurrent = false,
  isDone = false,
): DayChain {
  const steps: ChainStep[] = []
  // `sections`da PLAN_ORDER'da yo'q ko'nikma bo'lsa ham yo'qolmasin: avval
  // PLAN_ORDER bo'yicha, so'ng qolganlari `day.sections` tartibida qo'shiladi.
  const ordered: DaySection[] = [
    ...PLAN_ORDER.map((s) => day.sections.find((x) => x.skill === s)).filter((x): x is DaySection => x !== undefined),
    ...day.sections.filter((s) => !PLAN_ORDER.includes(s.skill)),
  ]
  for (const sec of ordered) {
    if (steps.some((s) => s.skill === sec.skill)) continue
    const ids = exerciseIdsBySkill[sec.skill] ?? []
    const isTextTask = sec.skill === 'writing' || sec.skill === 'speaking'
    // Bo'sh bo'lim (mashq yo'q va yozish/gapirish ham emas) zanjirga KIRMAYDI
    // — DULO dars ro'yxatida bo'sh tur uchramagani kabi.
    if (ids.length === 0 && !isTextTask) continue
    steps.push({
      dayId: day.id,
      skill: sec.skill,
      exerciseIds: ids,
      index: steps.length,
      minutes: sec.minutes,
      isTest: false,
      titleUz: sec.titleUz,
    })
  }
  if (day.sectionTest) {
    const t = day.sectionTest
    steps.push({
      dayId: day.id,
      skill: TEST_STEP,
      exerciseIds: t.exercises.map((e) => e.id),
      // `SectionTest`da daqiqa maydoni YO'Q — son ixtir qilinmaydi.
      minutes: 0,
      index: steps.length,
      isTest: true,
      titleUz: t.titleUz,
    })
  }
  const state: ChainStateValue =
    isDone && !isCurrent ? ChainState.DONE : isCurrent || isDone ? ChainState.CURRENT : ChainState.LOCKED
  return { day, dayIndex, steps, isCurrent, isDone, state }
}

/** Bo'lim holati (ochilgan kunda hamma qadam ochiq — yuqoriga qarang). */
export function stepState(chain: DayChain): ChainStateValue {
  return chain.state
}

/** Butun daraja zanjiri — kunlar ro'yxatidagi tartib saqlanadi. */
export function buildDayChains(
  days: readonly DailyPlanDay[],
  exerciseIdsByDayAndSkill: Record<string, Partial<Record<Skill, string[]>>>,
  completedDays: readonly string[],
  currentDayId: string,
): DayChain[] {
  return days.map((day, i) =>
    buildChain(day, exerciseIdsByDayAndSkill[day.id] ?? {}, i, day.id === currentDayId, completedDays.includes(day.id)),
  )
}

/**
 * Mashq turini topish — `content.findExercise(id)?.kind`. Turni bilmagan
 * mashq cheklangan emas (son ixtir qilinmaydi).
 */
export type KindLookup = (id: string) => string | undefined

/**
 * Mashqlar ketma-ketligi — DULO qoidasi asosida.
 *
 * MIN_KIND_GAP=2 — DULO `math_lesson.json`da o'lchangan tur almashinuvidan
 * QASDDAN kuchliroq talab: DULO ning o'zida 3 qo'shni bir xil tur va eng qisqa
 * masofa 1 (aralash darslarda bir xillik 31.1%). Biz aralash havzada buni 0
 * ga tushiramiz — o'quvchi formatga o'rganib qolmasin.
 *
 * REINFORCE_EVERY — bilinarli xatolikni mustahkamlash. Veb manbasi
 * (`src/lib/check.ts::nextExerciseIndex`) xato javobdan keyin oldingi mashqni
 * qayta taklif qiladi; DULO aralash darslarida bir xil tur qo'shni kelishi
 * 31.1% (takrorlash bor). Bizda har REINFORCE_EVERY-qadamda bitta mashq qayta
 * takrorlanadi.
 */
export const MIN_KIND_GAP = 2
export const REINFORCE_EVERY = 6

/**
 * Qolgan mashqlarni yonma-yon takrorlanmasdan joylashtirish MUMKINLIGI.
 * `MIN_KIND_GAP = 2`da qoida oddiy: `r` ta joyda bir tur `c` marta uchrasa,
 * `c ≤ ⌈r/2⌉` bo'lishi shart (keyingi joy oldingi tur bilan bir xil bo'la
 * olmaydi — shu holda chegaralovchi `⌊r/2⌋`). Bu shart yetarli ham (adasha
 * joylashtirish teoremasi). Shu tekshir ovorli "birinchi yaroqlisi" qoidasini
 * tuzatadi: DULO `math_lesson.json` nusxasida 3 ta `productSelect` oxirga
 * to'planib qolardi.
 */
function placeableRemaining(counts: ReadonlyMap<string, number>, r: number, lastKind: string | undefined): boolean {
  if (r <= 0) return true
  for (const [k, c] of counts) {
    if (c <= 0) continue
    const cap = lastKind !== undefined && k === lastKind ? Math.floor(r / 2) : Math.ceil(r / 2)
    if (c > cap) return false
  }
  return true
}

/**
 * Zanjir tartibini kuradi.
 * @param orderedIds bo'lim mashq id'lari (kontentdagi tartib — DULO
 *   JSON'laridagi `challenges` massivining tartibiga mos).
 * @param knownKind id → mashq turi; noma'lum bo'lsa `undefined`.
 * @param reinforce qayta takrorlash (bo'lim testida O'CHIQ — test savollari
 *   takrorlanmasligi kerak).
 */
export function lessonSequence(
  orderedIds: readonly string[],
  knownKind: KindLookup = () => undefined,
  reinforce = true,
): string[] {
  if (orderedIds.length === 0) return []
  const kinds = orderedIds.map((id) => knownKind(id))

  // 1) Tur almashinuvi: chiqish TARTIBIDA oxirgi (MIN_KIND_GAP-1) qadamda
  //    uchramagan turdi oladi. Bitta turli yoki juda zich ro'yxatda boshqa
  //    yo'l qolmaydi — baribir birinchi qolgan mashq olinadi (ro'yxat
  //    qisqarmaydi, hech narsa yo'qolmaydi).
  const used: number[] = []
  const pool: number[] = orderedIds.map((_, i) => i)
  const remaining = new Set(pool)
  const lookback = Math.max(0, MIN_KIND_GAP - 1)

  // Qolgan turlar soni — "davomi joylashtirish mumkinmi" shartini tekshirish
  // uchun kerak (qoida quyida).
  const counts = new Map<string, number>()
  for (const k of kinds) if (k !== undefined) counts.set(k, (counts.get(k) ?? 0) + 1)

  while (remaining.size > 0) {
    const recentKinds = lookback === 0 ? [] : used.slice(-lookback).map((i) => kinds[i])
    // Nomzodlar KONTEHT TARTIBIDA ko'rib chiqiladi (`Set` tartibiga tayanmaymiz
    // — mobildagi `HashSet` boshqa tartib beradi; telefon va brauzerda BIR XIL
    // natija chiqishi shart).
    let take = -1
    for (const i of pool) {
      if (!remaining.has(i)) continue
      const k = kinds[i]
      if (k !== undefined && recentKinds.includes(k)) continue
      if (k !== undefined) counts.set(k, (counts.get(k) ?? 1) - 1)
      // Bu mashqni olgach qolganlarini ham yonma-yon takrorlanmasdan joylashtirish
      // MUMKINMI? Oddiy "birinchi yaroqlisi" qoidasi DULO `math_lesson.json`
      // nusxasimizda sinadi: 3 ta `productSelect` oxirga to'planib qo'shni
      // bo'lib qolardi. Shuning uchun imkoniyat saqlanadigan BIRINCHI nomzod
      // olinadi — Kontent tartibi iloji boricha buzilmaydi.
      if (placeableRemaining(counts, remaining.size - 1, k)) {
        take = i
        break
      }
      if (k !== undefined) counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    // Joylashtirib bo'lmaydigan holda (bitta turli ro'yxat — DULO
    // `math_l0_lessons.json` 38 mashq bitta tur) baribir HAMMA mashq qatnashadi:
    // birinchi qolgan olinadi, ro'yxat qisqarmaydi.
    if (take === -1) {
      take = pool.find((i) => remaining.has(i)) as number
      const k = kinds[take]
      if (k !== undefined) counts.set(k, (counts.get(k) ?? 1) - 1)
    }
    used.push(take)
    remaining.delete(take)
  }

  // 2) Mustahkamlash: har REINFORCE_EVERY qadamda bitta mashq qayta.
  if (!reinforce || used.length < 2) return used.map((i) => orderedIds[i])
  const out: string[] = []
  used.forEach((i, pos) => {
    out.push(orderedIds[i])
    if (pos > 0 && (pos + 1) % REINFORCE_EVERY === 0 && pos < used.length - 1) out.push(orderedIds[i])
  })
  return out
}

/**
 * Ketma-ketlik auditi (hisobot/test):
 *  - `sameNeighbours` — bir xil turli qo'shni soni (DULO aralash darslarida
 *    31.1%, bizda 0 bo'lishi kerak);
 *  - `minGap` — bir xil tur orasidagi eng kichik masofa (DULO: 2).
 */
export function sequenceAudit(ids: readonly string[], knownKind: KindLookup = () => undefined): Record<string, number> {
  const kinds = ids.map((id) => knownKind(id))
  let same = 0
  let minGap = Number.POSITIVE_INFINITY
  const last = new Map<string, number>()
  for (let i = 0; i < ids.length; i++) {
    const k = kinds[i]
    if (k === undefined) continue
    if (i > 0 && kinds[i - 1] === k) same++
    const prev = last.get(k)
    if (prev !== undefined) minGap = Math.min(minGap, i - prev)
    last.set(k, i)
  }
  return { steps: ids.length, sameNeighbours: same, minGap: Number.isFinite(minGap) ? minGap : 0 }
}

/**
 * Zanjir kataklari byudjeti — `UI_KONTRAKTI.md`dagi bo'laklab chizish
 * qoidasi (`ListPagingTest`: bir ekranda ≤ 24 satr; katak qatori bitta
 * gorizontal blok). MAKSIMUM = 64 katak: A1 o'lchangan kontentida
 * 7 kun × 7 qadam = 49 — chegaradan past, shuning uchun vebda ham mobilda
 * ham butun zanjir birdaniga chiziladi (test buni tekshiradi).
 */
export const MAX_CHAIN_CELLS = 64

export function chainExerciseBudget(dayCount: number, stepsPerDay: number): number {
  return Math.min(MAX_CHAIN_CELLS, Math.max(0, dayCount) * Math.max(0, stepsPerDay))
}

/** Bo'lim testi zanjirning oxirida turishini tekshirish uchun yordamchi. */
export function testStepOf(day: DailyPlanDay) {
  return day.sectionTest
}

/**
 * Zanjir auditi — butun kun(lar) bo'yicha, HALOL ko'rsatkichlar.
 *
 * Nima uchun alohida funksiya: `sequenceAudit` butun ro'yxatga qo'llansa,
 * yagona turli bo'lim (masalan lug'at testi — hammasi `multiple-choice`)
 * "bir xil tur qo'shni" deb chiqadi, holbuki у yerda ajratishning IMKONI yo'q
 * (DULO `math_l0_lessons.json` 38 mashq bitta tur — 100% bir xil qo'shni).
 * Shuning uchun son ikkiga ajratiladi:
 *  - `sameNeighbours` — rotatsiyadan keyingi qolgan bir xil qo'shnilar;
 *  - `unavoidable` — ulardan nechtasi yagona turli bo'lim tufayli MAJBURIY.
 * `MIN_KIND_GAP=2` talabi aralash bo'limlarga tegishli: `sameNeighbours ===
 * unavoidable` bo'lishi kerak (test tekshiradi).
 *
 * `plannedSteps` — o'quvchi ko'radigan qadamlar soni (mustahkamlash bilan),
 * `reinforcement` — shundan nechtasi qayta takror (DULO bitta turli darslarida
 * mashqni takrorlagani kabi).
 */
export interface ChainAuditReport {
  sections: number
  plannedSteps: number
  reinforcement: number
  rotationSteps: number
  sameNeighbours: number
  minGap: number
  unavoidable: number
}

export function chainAudit(chains: readonly DayChain[], knownKind: KindLookup = () => undefined): ChainAuditReport {
  let sections = 0
  let plannedSteps = 0
  let reinforcement = 0
  let unavoidable = 0
  let same = 0
  let minGap = Number.POSITIVE_INFINITY
  for (const c of chains) {
    for (const s of c.steps) {
      if (s.exerciseIds.length === 0) continue
      sections++
      // Rotatsiya (takrorlashsiz) — tur almashinuvi shu qatlamda tekshiriladi.
      // Bo'limlar ALOHIDA hisoblanadi: har bo'lim alohida mashq oqimi, shuning
      // uchun "bo'lim chegarasi" qo'shni hisoblanmaydi.
      const base = lessonSequence(s.exerciseIds, knownKind, false)
      const a = sequenceAudit(base, knownKind)
      same += a.sameNeighbours
      const planned = lessonSequence(s.exerciseIds, knownKind, !s.isTest)
      plannedSteps += planned.length
      reinforcement += planned.length - base.length
      const kinds = new Set(base.map((id) => knownKind(id)).filter((k): k is string => k !== undefined))
      if (kinds.size >= 2) {
        // `minGap` faqat TUR ALMASHINUVI QO LLANADIGAN bo'limlarda o'lchanadi:
        // yagona turli bo'limda masofa tabiiy 1 (DULO `math_l0_lessons.json`
        // 38 mashq bitta tur). Shunda bu son "aralash turlarda bir xil tur
        // qo'shni kelmaydi" degan talabni halol tekshiradi.
        if (a.minGap > 0) minGap = Math.min(minGap, a.minGap)
      } else if (kinds.size === 1 && base.length > 1) {
        // Bitta turli bo'limda qo'shni majburiy: n-1 juftlik. (Tur umuman
        // noma'lum bo'lsa hisob YO'Q — son ixtir qilinmaydi.)
        unavoidable += base.length - 1
      }
    }
  }
  return {
    sections,
    plannedSteps,
    reinforcement,
    rotationSteps: plannedSteps - reinforcement,
    sameNeighbours: same,
    minGap: Number.isFinite(minGap) ? minGap : 0,
    unavoidable,
  }
}

/**
 * Bo'lim mashq id'lari (veb kontentidan) — zanjir kartasi va audit uchun.
 * Mobildagi `LearningPathFragment.exerciseIdsFor()` bilan BIR XIL:
 *  - `vocabulary` — bo'lim so'zlari test savollariga aylantiriladi
 *    (`vocabQuizExercise` id'si `vocab-quiz-<vocabId>`);
 *  - `grammar / reading / listening` — kontent elementi ichidagi mashqlar;
 *  - `writing / speaking` — alohida mashqlar ro'yxati yo'q (topshiriq
 *    yoziladi/gapiriladi), shuning uchun bo'sh qaytadi.
 *
 * `vocabQuizId` funksiyasi `src/content/index.ts`dag `vocabQuizExercise`ni
 * takrorlamaydi (u variantlar ham kuradi) — faqat barqaror id kerak.
 */
export function exerciseIdsForSection(
  section: DaySection,
  lookup: {
    vocabQuizIds: (ids: readonly string[]) => string[]
    grammarExercises: (id: string) => Exercise[]
    readingExercises: (id: string) => Exercise[]
    listeningExercises: (id: string) => Exercise[]
    findExercise: (id: string) => Exercise | undefined
  },
): string[] {
  const out: string[] = []
  switch (section.skill) {
    case 'vocabulary':
      out.push(...lookup.vocabQuizIds(section.itemIds))
      break
    case 'grammar':
      for (const id of section.itemIds) out.push(...lookup.grammarExercises(id).map((e) => e.id))
      break
    case 'reading':
      for (const id of section.itemIds) out.push(...lookup.readingExercises(id).map((e) => e.id))
      break
    case 'listening':
      for (const id of section.itemIds) out.push(...lookup.listeningExercises(id).map((e) => e.id))
      break
    default:
      // writing / speaking: yozish va gapirish topshiriqlari mashq ro'yxatiga
      // kirmaydi — ularning baholashida `Exercise` ishlatilmaydi.
      for (const id of section.itemIds) if (lookup.findExercise(id)) out.push(id)
  }
  return out
}
