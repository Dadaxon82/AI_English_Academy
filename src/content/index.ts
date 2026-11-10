/**
 * Kontent registri — UI kontentga shu yer orqali murojaat qiladi.
 * Yangi daraja qo'shish uchun faqat shu fayl va yangi papka kifoya.
 */

import { DIALOGUE_PREFIX, findDialogueExercise } from './dialogues'
import { CEFR_LEVELS } from './types'
import type {
  CefrLevel,
  DailyPlanDay,
  Exercise,
  GrammarTopic,
  ListeningTask,
  MatchingExercise,
  MockExamSpec,
  MultipleChoiceExercise,
  ReadingPassage,
  SectionTest,
  SpeakingTask,
  TranslationExercise,
  VocabularyItem,
  WordOrderExercise,
  WritingTask,
} from './types'

import { day1, vocabDay1, grammarDay1, readingDay1, listeningDay1, writingDay1, speakingDay1, testDay1 } from './a1/day-01'
import { day2, vocabDay2, grammarDay2, readingDay2, listeningDay2, writingDay2, speakingDay2, testDay2 } from './a1/day-02'
import { day3, vocabDay3, grammarDay3, readingDay3, listeningDay3, writingDay3, speakingDay3, testDay3 } from './a1/day-03'
import { day4, vocabDay4, grammarDay4, readingDay4, listeningDay4, writingDay4, speakingDay4, testDay4 } from './a1/day-04'
import { day5, vocabDay5, grammarDay5, readingDay5, listeningDay5, writingDay5, speakingDay5, testDay5 } from './a1/day-05'
import { day6, vocabDay6, grammarDay6, readingDay6, listeningDay6, writingDay6, speakingDay6, testDay6 } from './a1/day-06'
import { day7, vocabDay7, grammarDay7, readingDay7, listeningDay7, writingDay7, speakingDay7, testDay7 } from './a1/day-07'
import { mockExamA1 } from './mockExamA1'
import { GRAMMAR_EXTRA, READING_EXTRA } from './a1/new-types'
import { REMIX_PREFIX, baseExerciseId, remixExercise } from './remix'
import { diagnosticTest } from './diagnostic'

/** Har bir daraja uchun to'plam. A2/B1/B2/C1 shu strukturada qo'shiladi. */
export interface LevelBundle {
  level: CefrLevel
  days: DailyPlanDay[]
  vocab: VocabularyItem[]
  grammar: GrammarTopic[]
  reading: ReadingPassage[]
  listening: ListeningTask[]
  writing: WritingTask[]
  speaking: SpeakingTask[]
  tests: SectionTest[]
  mockExam?: MockExamSpec
}

export const a1: LevelBundle = {
  level: 'A1',
  days: [day1, day2, day3, day4, day5, day6, day7],
  vocab: [...vocabDay1, ...vocabDay2, ...vocabDay3, ...vocabDay4, ...vocabDay5, ...vocabDay6, ...vocabDay7],
  // Yangi mashq turlari (`a1/new-types.ts`) tegishli mavzu / matn oxiriga qo'shiladi.
  grammar: [grammarDay1, grammarDay2, grammarDay3, grammarDay4, grammarDay5, grammarDay6, grammarDay7].map((t) => ({
    ...t,
    exercises: [...t.exercises, ...(GRAMMAR_EXTRA[t.id] ?? [])],
  })),
  reading: [readingDay1, readingDay2, readingDay3, readingDay4, readingDay5, readingDay6, readingDay7].map((p) => ({
    ...p,
    exercises: [...p.exercises, ...(READING_EXTRA[p.id] ?? [])],
  })),
  listening: [listeningDay1, listeningDay2, listeningDay3, listeningDay4, listeningDay5, listeningDay6, listeningDay7],
  writing: [writingDay1, writingDay2, writingDay3, writingDay4, writingDay5, writingDay6, writingDay7],
  speaking: [...speakingDay1, ...speakingDay2, ...speakingDay3, ...speakingDay4, ...speakingDay5, ...speakingDay6, ...speakingDay7],
  tests: [testDay1, testDay2, testDay3, testDay4, testDay5, testDay6, testDay7],
  mockExam: mockExamA1,
}

/**
 * Kundalik bo'lim minutlarini kunlik rejaga (90′) moslashtirish.
 *
 * MUAMMO: a1 day fayllaridagi `sections[].minutes` yig'indisi 110–115′ —
 * talabnomadagi 90′ (Vocab 10 / Grammar 15 / Reading 15 / Listening 15 /
 * Writing 20 / Speaking 15) bilan mos kelmas edi. Natijada O'quv yo'li
 * "kun 110 daqiqa" deb ko'rsatadi, Dashboard esa 90′ hisoblab beradi —
 * ikki sahifa bir-biriga zid.
 *
 * YECHIM: bitta joyda (shu registarda) nisbatan taqsimlab chiqamiz. Kasr
 * qoldig'i eng katta bo'lgan bo'limlarga beriladi, shuning uchun yig'indi
 * ANIQ `total` ga teng bo'ladi va tartib (vocab<grammar<…) buzilmaydi.
 * Kontent fayllari o'zgarishsiz qoladi — ular "xom material".
 */
export function normalizeDayMinutes(
  day: DailyPlanDay,
  total = DAILY_PLAN_TOTAL,
): DailyPlanDay {
  const raw = day.sections.reduce((a, s) => a + s.minutes, 0)
  if (raw === total || raw <= 0 || day.sections.length === 0) return day
  const weights = day.sections.map((s) => s.minutes / raw)
  const exact = weights.map((w) => total * w)
  const scaled = exact.map((x) => Math.floor(x))
  // Kasr qoldig'ini eng katta bo'lganlardan birlab beramiz — yig'indi aniq
  // `total` chiqadi va nisbat (katta bo'lim kichigidan kam emas) saqlanadi.
  const order = scaled
    .map((v, i) => ({ i, frac: exact[i] - v }))
    .sort((a, b) => b.frac - a.frac)
  let assigned = scaled.reduce((a, b) => a + b, 0)
  for (const o of order) {
    if (assigned >= total) break
    scaled[o.i] += 1
    assigned += 1
  }
  return { ...day, sections: day.sections.map((s, i) => ({ ...s, minutes: scaled[i] })) }
}

/** Talabnomadagi asosiy kunlik reja (daqiqa). */
export const DAILY_PLAN_TOTAL = 90

/* ------------------- MATN (GLOSSARIY) SO'ZLARI ---------------------------- */

/** So'zni solishtirish kaliti — Reading/Lug'at sahifalari BIR XIL kalit ishlatadi. */
export function wordKeyOf(s: string): string {
  return s
    .toLocaleLowerCase('en')
    .replace(/[‘’`´ʻ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Matn glossariyi so'zi uchun barqaror SRS kaliti.
 * Reading sahifasi shu kalit bilan `gradeVocab` chaqiradi.
 *
 * Matn id'si kalitga KIRTMAYDI: bir so'z ikki matnda uchrasa ikki xil kalit
 * bo'lib, Lug'at ro'yxatidagi bittasi bilan adashib qolardi. So'z bitta —
 * kalit ham bitta.
 */
export function glossaryVocabId(word: string): string {
  return `gl-${wordKeyOf(word)}`
}

// Eski SRS kaliti (`<matn>|gl-<so'z>`) faqat kesh migratsiyasi uchun kerak —
// u `lib/storage.ts`da yashaydi (kontentkalit qoidasini o'zi belgilamaydi).

let glossaryCache: VocabularyItem[] | null = null

/**
 * Barcha o'qish matnlarining glossariy so'zlari — `VocabularyItem` ko'rinishida.
 *
 * ESKI KAMCHILIK: Reading sahifasida "Lug'atga" saqlangan glossariy so'zlari
 * SRS'ga yozilardi (`<matn>|gl-<so'z>` kaliti bilan), lekin Lug'at sahifasi
 * faqat asosiy lug'at ro'yxatini ko'rsatgani uchun ular BIR ORA QAYTA
 * KO'RIKMASDI — saqlanganligi ma'nosiz qolardi.
 *
 * Asosiy lug'atda ALLQACHON bor so'zlar qayta qo'shilmaydi (bir xil so'z ikki
 * marta ko'rinmasin va SRSda bitta kalit bo'lsin).
 */
export function allGlossaryVocab(levels: readonly CefrLevel[] = LOADED_LEVELS): VocabularyItem[] {
  if (glossaryCache) return glossaryCache
  const mainKeys = new Set(allVocab(levels).map((v) => wordKeyOf(v.word)))
  const seen = new Set<string>()
  const out: VocabularyItem[] = []
  for (const lvl of levels) {
    for (const p of getBundle(lvl).reading) {
      for (const g of p.glossary ?? []) {
        const key = wordKeyOf(g.word)
        if (!key || mainKeys.has(key) || seen.has(key)) continue
        seen.add(key)
        out.push({
          id: glossaryVocabId(g.word),
          word: g.word,
          translationUz: g.uz,
          explanationEn: `Bu söz “${p.title}” matnining glossariyidan olindi.`,
          exampleEn: '',
          exampleUz: '',
          pos: 'noun',
          topic: 'matndan olingan',
          level: p.level,
        })
      }
    }
  }
  glossaryCache = out
  return out
}


/**
 * Darajalar registri. A1 asosiy bundle'da (diagnostika, mock imtihon unga
 * tayanadi); qolgan darajalar ALOHIDA chunk'da va `loadLevels()` bilan
 * yuklanadi (store ma'lumot bilan parallel yuklaydi, `ready` shundan keyin).
 * Yuklanmagan daraja bo'sh to'plam qaytaradi ("Tayyorlanmoqda").
 *
 * Natija KESHLANADI: to'plam immutabl, `normalizeDayMinutes` esa har chaqiruvda
 * qayta massiv yasardi va har safar yangi obyekt qaytargani uchun
 * sahifalardagi useMemo'lar ishlamasdi.
 */
const bundleCache = new Map<CefrLevel, LevelBundle>()
const loadedBundles = new Map<CefrLevel, LevelBundle>([['A1', a1]])

/** Kontenti mavjud (yuklab olinadigan) darajalar — CEFR tartibida. */
const LEVEL_LOADERS: Partial<Record<CefrLevel, () => Promise<LevelBundle>>> = {
  A2: () => import('./a2').then((m) => m.a2),
}

export function getBundle(level: CefrLevel): LevelBundle {
  const hit = bundleCache.get(level)
  if (hit) return hit
  const src = loadedBundles.get(level)
  const made: LevelBundle = src
    ? { ...src, days: src.days.map((d) => normalizeDayMinutes(d)) }
    : { level, days: [], vocab: [], grammar: [], reading: [], listening: [], writing: [], speaking: [], tests: [] }
  bundleCache.set(level, made)
  return made
}

/**
 * Yuklangan darajalar. JOYIDA yangilanadi (`loadLevels`) — import qilgan
 * modullar bir xil massivni ko'radi.
 */
export const LOADED_LEVELS: CefrLevel[] = ['A1']

const LEVEL_ORDER: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1']
let loading: Promise<void> | null = null

/** Barcha mavjud darajalarni yuklaydi (takroriy chaqiruv — bitta va'da). */
export function loadLevels(): Promise<void> {
  loading ??= Promise.all(
    Object.entries(LEVEL_LOADERS).map(async ([lvl, load]) => {
      const level = lvl as CefrLevel
      if (loadedBundles.has(level) || !load) return
      loadedBundles.set(level, await load())
    }),
  ).then(() => {
    LOADED_LEVELS.splice(0, LOADED_LEVELS.length, ...LEVEL_ORDER.filter((l) => loadedBundles.has(l)))
    bundleCache.clear()
    glossaryCache = null
  })
  return loading
}

export function allVocab(levels: readonly CefrLevel[] = LOADED_LEVELS): VocabularyItem[] {
  return levels.flatMap((l) => getBundle(l).vocab)
}

export function findVocab(id: string): VocabularyItem | undefined {
  return allVocab().find((v) => v.id === id)
}

export function allExercises(level: CefrLevel = 'A1'): Exercise[] {
  const b = getBundle(level)
  return [
    ...b.grammar.flatMap((g) => g.exercises),
    ...b.reading.flatMap((r) => r.exercises),
    ...b.listening.flatMap((l) => l.exercises),
    ...b.tests.flatMap((t) => t.exercises),
  ]
}

/** Lug'at testidagi savollar shu prefiks + so'z idsi bilan yoziladi. */
export const VOCAB_QUIZ_PREFIX = 'vocab-quiz-'

/**
 * Lug'at testi savoli (tarjima tanlovi). Variantlar test paytida aralashtiriladi;
 * berilmasa — faqat to'g'ri javob (Xatolar daftarida "to'g'ri javob"ni ko'rsatish uchun).
 */
export function vocabQuizExercise(v: VocabularyItem, options: string[] = [v.translationUz]): MultipleChoiceExercise {
  return {
    id: `${VOCAB_QUIZ_PREFIX}${v.id}`,
    kind: 'multiple-choice',
    instructionUz: `“${v.word}” sözining özbekça ma’nosini tanlang.`,
    level: v.level,
    skill: 'vocabulary',
    explanationUz: `${v.word} — ${v.translationUz}. ${v.explanationEn}`,
    difficulty: v.level === 'A1' ? 1 : 2,
    tags: ['vocab quiz', v.topic],
    question: `What does “${v.word}” mean?`,
    options,
    answerIndex: options.indexOf(v.translationUz),
  }
}

/* ---------------- Lug'at O'YINI topshiriqlari (id'dan tiklanadi) ---------------- */

export const VOCAB_PIC_PREFIX = 'vocab-pic-'
export const VOCAB_SENT_PREFIX = 'vocab-sent-'
export const VOCAB_MATCH_PREFIX = 'vocab-match-'

/** Rasmli tanlov: «X» so'zini tanlang — variantlar inglizcha so'zlar. */
export function vocabPictureExercise(v: VocabularyItem, options: string[] = [v.word]): MultipleChoiceExercise {
  return {
    id: `${VOCAB_PIC_PREFIX}${v.id}`,
    kind: 'multiple-choice',
    instructionUz: `«${v.translationUz.split(/[,;]/)[0]!.trim()}» sözini tanlang`,
    level: v.level,
    skill: 'vocabulary',
    explanationUz: `${v.translationUz} — ${v.word}.`,
    difficulty: 1,
    tags: ['vocab game', v.topic],
    question: '',
    options,
    answerIndex: options.indexOf(v.word),
  }
}

/** Misol gapni tarjima qilish (so'z plitkalari). `en` — inglizchadan o'zbekchaga. */
export function vocabSentenceExercise(v: VocabularyItem, from: 'en' | 'uz'): TranslationExercise {
  return {
    id: `${VOCAB_SENT_PREFIX}${from}-${v.id}`,
    kind: 'translation',
    instructionUz: from === 'en' ? 'Özbekçaga tarjima qiling' : 'Inglizçaga tarjima qiling',
    level: v.level,
    skill: 'vocabulary',
    explanationUz: `${v.exampleEn} — ${v.exampleUz}`,
    difficulty: from === 'en' ? 1 : 2,
    tags: ['vocab game', v.topic],
    source: from === 'en' ? v.exampleEn : v.exampleUz,
    sourceLang: from,
    accepted: [from === 'en' ? v.exampleUz : v.exampleEn],
  }
}

/** Juftlik: so'z ↔ tarjima (id'da so'z id'lari `~` bilan). */
export function vocabMatchExercise(vs: readonly VocabularyItem[]): MatchingExercise {
  return {
    id: `${VOCAB_MATCH_PREFIX}${vs.map((v) => v.id).join('~')}`,
    kind: 'matching',
    instructionUz: 'Juftliklarni toping',
    level: vs[0]?.level ?? 'A1',
    skill: 'vocabulary',
    explanationUz: vs.map((v) => `${v.word} — ${v.translationUz}`).join('; '),
    difficulty: 1,
    tags: ['vocab game'],
    pairs: vs.map((v) => ({ left: v.word, right: v.translationUz })),
  }
}

/* -------- Bo'lim DARSLARI (o'yin) uchun yasalgan topshiriqlar (id'dan tiklanadi) -------- */

export const LESSON_GRAMMAR_PREFIX = 'lesson-gtr-'
export const LESSON_WRITING_PREFIX = 'lesson-wwo-'
export const LESSON_SPEAK_PREFIX = 'lesson-spk-'

/** Plitkalar uchun gap uzunligi chegarasi (so'z). */
export const LESSON_SENTENCE_MAX = 12

function wordsOf(s: string): string[] {
  return s.trim().split(/\s+/).filter(Boolean)
}

/** Deterministik aralashtirish (id bo'yicha — har qurilmada bir xil). */
function seededShuffle<T>(arr: readonly T[], seed: string): T[] {
  const out = [...arr]
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
  for (let i = out.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0
    const j = h % (i + 1)
    const t = out[i]!
    out[i] = out[j]!
    out[j] = t
  }
  // Aralash natija javobning o'zi bo'lib qolmasin (2+ so'zda).
  if (out.length > 1 && out.every((x, i) => x === arr[i])) out.push(out.shift()!)
  return out
}

/** Grammatika misolini o'zbekchadan inglizchaga yig'ish (plitkalar). */
export function grammarExampleExercise(topic: GrammarTopic, i: number): TranslationExercise | undefined {
  const ex = topic.examples[i]
  if (!ex) return undefined
  return {
    id: `${LESSON_GRAMMAR_PREFIX}${topic.id}-${i}`,
    kind: 'translation',
    instructionUz: 'Inglizçaga tarjima qiling',
    level: topic.level,
    skill: 'grammar',
    explanationUz: `${ex.uz} — ${ex.en}`,
    difficulty: 2,
    tags: ['lesson', topic.id],
    source: ex.uz,
    sourceLang: 'uz',
    accepted: [ex.en],
  }
}

/** Matnni gaplarga bo'lish (plitkalar uchun qisqalari). */
export function shortSentences(text: string, max = 4): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter((x) => {
      const n = wordsOf(x).length
      return n >= 3 && n <= LESSON_SENTENCE_MAX
    })
    .slice(0, max)
}

function wordOrder(id: string, sentence: string, level: CefrLevel, skill: 'writing' | 'speaking', instructionUz: string, note: string): WordOrderExercise {
  const answer = wordsOf(sentence)
  return {
    id,
    kind: 'word-order',
    instructionUz,
    level,
    skill,
    explanationUz: note,
    difficulty: 2,
    tags: ['lesson'],
    answer,
    bank: seededShuffle(answer, id),
  }
}

/** Yozish darsi: namuna javob gaplarini plitkalardan tuzish. */
export function writingSentenceExercise(task: WritingTask, i: number): WordOrderExercise | undefined {
  const s = shortSentences(task.modelAnswerEn ?? '')[i]
  if (!s) return undefined
  return wordOrder(`${LESSON_WRITING_PREFIX}${task.id}-${i}`, s, task.level, 'writing', 'Gapni töğri tartibda tuzing', `Namuna javobdan: “${s}”`)
}

/** Gapirish darsi gaplari: savol va qo'shimcha savollar (qisqalari). */
export function speakingSentences(task: SpeakingTask): string[] {
  return [task.questionEn, ...(task.followUpsEn ?? [])].filter((x) => {
    const n = wordsOf(x).length
    return n >= 2 && n <= LESSON_SENTENCE_MAX + 2
  })
}

/** Gapirish darsi: gapni takrorlash (mikrofonsiz — plitkalar bilan). */
export function speakingRepeatExercise(task: SpeakingTask, i: number): WordOrderExercise | undefined {
  const s = speakingSentences(task)[i]
  if (!s) return undefined
  return wordOrder(`${LESSON_SPEAK_PREFIX}${task.id}-${i}`, s, task.level, 'speaking', 'Gapni tinglang va takrorlang', `Savol: “${s}”`)
}

function allWritingTasks(): WritingTask[] {
  return LOADED_LEVELS.flatMap((l) => {
    const b = getBundle(l)
    return [...b.writing, ...(b.mockExam?.sections.flatMap((s) => (s.writingTask ? [s.writingTask] : [])) ?? [])]
  })
}

function allSpeakingTasks(): SpeakingTask[] {
  return LOADED_LEVELS.flatMap((l) => {
    const b = getBundle(l)
    return [...b.speaking, ...(b.mockExam?.sections.flatMap((s) => (s.speakingTask ? [s.speakingTask] : [])) ?? [])]
  })
}

/** `<prefix><ownerId>-<index>` id'ni ajratish (owner id'da ham "-" bo'ladi). */
function splitIndexed(rest: string): [string, number] | null {
  const m = /^(.*)-(\d+)$/.exec(rest)
  return m ? [m[1]!, Number(m[2])] : null
}

function lessonExercise(id: string): Exercise | undefined {
  if (id.startsWith(LESSON_GRAMMAR_PREFIX)) {
    const p = splitIndexed(id.slice(LESSON_GRAMMAR_PREFIX.length))
    const topic = p && LOADED_LEVELS.flatMap((l) => getBundle(l).grammar).find((t) => t.id === p[0])
    return topic && p ? grammarExampleExercise(topic, p[1]) : undefined
  }
  if (id.startsWith(LESSON_WRITING_PREFIX)) {
    const p = splitIndexed(id.slice(LESSON_WRITING_PREFIX.length))
    const task = p && allWritingTasks().find((t) => t.id === p[0])
    return task && p ? writingSentenceExercise(task, p[1]) : undefined
  }
  if (id.startsWith(LESSON_SPEAK_PREFIX)) {
    const p = splitIndexed(id.slice(LESSON_SPEAK_PREFIX.length))
    const task = p && allSpeakingTasks().find((t) => t.id === p[0])
    return task && p ? speakingRepeatExercise(task, p[1]) : undefined
  }
  return undefined
}

/* ---------------- AI suhbatdosh tuzatishlari (id'dan tiklanadi) ---------------- */

/**
 * Suhbatda topilgan xato → «to'g'ri gapni tuzing» mashqi. Ma'lumot (asl gap,
 * tuzatilgan gap, izoh, daraja) to'liq ID ichida (base64url JSON) — saqlash
 * kerak emas, `findExercise()` uni qayta yasaydi va Xatolar daftari ishlaydi.
 */
export const ROLEPLAY_FIX_PREFIX = 'rpfix-'
/** Uzun gaplar plitkada noqulay — undan uzun tuzatish mashqqa aylanmaydi. */
export const ROLEPLAY_FIX_MAX_WORDS = 14

function b64urlEncode(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(s: string): string | null {
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
  } catch {
    return null
  }
}

/** Tuzatish mashq bo'la oladimi bo'lsa — uning ID'si, aks holda null. */
export function roleplayFixId(fix: { original: string; corrected: string; whyUz: string }, level: CefrLevel): string | null {
  const words = wordsOf(fix.corrected)
  if (words.length < 2 || words.length > ROLEPLAY_FIX_MAX_WORDS) return null
  const payload = JSON.stringify({ o: fix.original.slice(0, 200), c: fix.corrected.slice(0, 200), w: fix.whyUz.slice(0, 200), l: level })
  return `${ROLEPLAY_FIX_PREFIX}${b64urlEncode(payload)}`
}

export function roleplayFixExercise(id: string): WordOrderExercise | undefined {
  if (!id.startsWith(ROLEPLAY_FIX_PREFIX)) return undefined
  const raw = b64urlDecode(id.slice(ROLEPLAY_FIX_PREFIX.length))
  if (!raw) return undefined
  let v: { o?: unknown; c?: unknown; w?: unknown; l?: unknown }
  try {
    v = JSON.parse(raw) as typeof v
  } catch {
    return undefined
  }
  if (typeof v.o !== 'string' || typeof v.c !== 'string' || typeof v.w !== 'string' || typeof v.l !== 'string') return undefined
  if (!(CEFR_LEVELS as readonly string[]).includes(v.l)) return undefined
  const answer = wordsOf(v.c)
  if (answer.length < 2 || answer.length > ROLEPLAY_FIX_MAX_WORDS) return undefined
  return {
    id,
    kind: 'word-order',
    instructionUz: `Suhbatda şunday dedingiz: “${v.o}”. Töğri gapni sözlardan tuzing.`,
    level: v.l as CefrLevel,
    skill: 'grammar',
    explanationUz: `${v.w} Töğri: “${v.c}”.`,
    difficulty: 2,
    tags: ['roleplay'],
    answer,
    bank: seededShuffle(answer, id),
  }
}

export function findExercise(id: string): Exercise | undefined {
  // Xatolar daftari o'yini: "boshqa ko'rinishda" — asl mashqdan qayta quriladi.
  if (id.startsWith(REMIX_PREFIX)) {
    const orig = findExercise(baseExerciseId(id))
    return orig ? remixExercise(orig) ?? undefined : undefined
  }
  if (id.startsWith('lesson-')) return lessonExercise(id)
  if (id.startsWith(ROLEPLAY_FIX_PREFIX)) return roleplayFixExercise(id)
  // Real hayot suhbatlari (`dialogues.ts`) — `dlg-<suhbat>-<qator>`.
  if (id.startsWith(DIALOGUE_PREFIX)) return findDialogueExercise(id)
  const vocabById = (vid: string) => [...allVocab(), ...allGlossaryVocab()].find((x) => x.id === vid)
  if (id.startsWith(VOCAB_PIC_PREFIX)) {
    const v = vocabById(id.slice(VOCAB_PIC_PREFIX.length))
    return v ? vocabPictureExercise(v) : undefined
  }
  if (id.startsWith(VOCAB_SENT_PREFIX)) {
    const rest = id.slice(VOCAB_SENT_PREFIX.length)
    const from = rest.startsWith('uz-') ? 'uz' : 'en'
    const v = vocabById(rest.slice(3))
    return v ? vocabSentenceExercise(v, from) : undefined
  }
  if (id.startsWith(VOCAB_MATCH_PREFIX)) {
    const vs = id.slice(VOCAB_MATCH_PREFIX.length).split('~').map(vocabById)
    return vs.every((v): v is VocabularyItem => v !== undefined) && vs.length > 0 ? vocabMatchExercise(vs) : undefined
  }
  // ESKI KAMCHILIK: lug'at testi savollari hech qayerda ro'yxatda yo'q edi —
  // Xatolar daftari ular uchun to'g'ri javob o'rniga "—" ko'rsatardi.
  if (id.startsWith(VOCAB_QUIZ_PREFIX)) {
    const vocabId = id.slice(VOCAB_QUIZ_PREFIX.length)
    const v = [...allVocab(), ...allGlossaryVocab()].find((x) => x.id === vocabId)
    return v ? vocabQuizExercise(v) : undefined
  }
  for (const lvl of LOADED_LEVELS) {
    const hit = allExercises(lvl).find((e) => e.id === id)
    if (hit) return hit
  }
  const exam = getBundle('A1').mockExam
  if (exam) {
    const hit = exam.sections.flatMap((s) => s.exercises).find((e) => e.id === id)
    if (hit) return hit
  }
  return diagnosticTest.exercises.find((e) => e.id === id)
}

export { mockExamA1 } from './mockExamA1'
export { diagnosticTest } from './diagnostic'
export * from './types'
