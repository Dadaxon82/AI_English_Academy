/**
 * Adaptiv o'quv mantiqi.
 *
 * Bu modul foydalanuvchining zaif nuqtalarga asoslanib (mistakeHistory va weakPoints),
 * moslashtirilgan mashqlarni (remedial questions) saralashni taqdim etadi.
 */

import type { Exercise, Skill } from '../content/types'
import { allVocab, findExercise, getBundle } from '../content/index'

/** Foydalanuvchi xatolariga asoslanib "remedial" mashqlarni topadi. */
export function getAdaptiveExercises(
  data: any, // AppData
  skill: Skill,
  maxCount: number = 5
): Exercise[] {
  const { weakPoints, mistakeHistory } = data

  // 1. Zaif nuqtalarni olish
  const weakIds = new Set(weakPoints.map(wp => wp.exerciseId))

  // 2. Kontentdan barcha mashqlarni olish
  const allExercises = []
  for (const level of ['A1', 'A2', 'B1', 'B2', 'C1']) {
    const bundle = getBundle(level)
    // Har bir bo'limdan mashqlarni to'plar
    bundle.days.forEach(day => {
      day.sections.forEach(sec => {
        sec.itemIds.forEach(id => {
          const ex = findExercise(id)
          if (ex && ex.skill === skill) allExercises.push(ex)
        } )
      })
    })
  }

  // 3. Zaif nuqtalarga mos keladigan mashqlarni filtrlash
  // Agar zaif nuqta bo'lsa, o'sha mashqni birinchi ko'rsatamiz
  const remedial = allExercises.filter(ex => weakIds.has(ex.id))
  const others = allExercises.filter(ex => !weakIds.has(ex.id))

  return [...remedial.slice(0, maxCount), ...others.slice(0, maxCount - remedial.length)]
}

/**
 * Mashqlar orasida "remedial" bo'lganlarini aniqlaydi.
 *
 * Masalan, agar foydalanuvchi "gap-fill" mashqida xato qilgan bo'lsa,
 * unga ushbu mavzudagi qo'shimcha 3 ta mashqni ko'rsatamiz.
 */
export function filterRemedialExercises(
  exercises: Exercise[],
  weakExerciseIds: string[]
): Exercise[] {
  if (weakExerciseIds.length === 0) return exercises

  // Faqat zaif nuqtalarga mos keladigan mashqni topamiz
  return exercises.filter(ex => weakExerciseIds.includes(ex.id))
}

/**
 * Masalan: "To be" fe'li bo'yicha xatolar ko'p bo'lsa,
 * kontentdan "to be" tagi bilan bog'langan boshqa mashqlarni topadi.
 */
export function getExercisesByTag(exercises: Exercise[], tag: string): Exercise[] {
  return exercises.filter(ex => ex.tags?.includes(tag))
}

/**
 * Zaif nuqtalarga asoslangan "remedial" mashqlar ro'yxatini qaytaradi.
 *
 * Bu funksiya foydalanuvchining xato qilgan mashqlariga o'xshash,
 * lekin ularning o'zi emas, mavzu bo'yicha boshqa mashqlarni topadi.
 */
export function getRelatedRemedialExercises(
  data: any,
  skill: Skill,
  maxCount: number = 5
): Exercise[] {
  // Faqat "to be" kabi aniq taglari bo'lgan mashqlarni qidiramiz
  // chunki taglar orqali mavzuni guruhlash mumkin.
  const weakPoints = data.weakPoints || []
  const tagPool = new Set<string>()

  // Zaif nuqtalardan taglarni to'playmiz
  weakPoints.forEach(wp => {
    const ex = findExercise(wp.exerciseId)
    if (ex && ex.tags) {
      ex.tags.forEach(tag => tagPool.add(tag))
    }
  })

  // Barcha mashqlarni olamiz
  const allExercises = []
  for (const level of ['A1', 'A2', 'B1', 'B2', 'C1']) {
    const bundle = getBundle(level)
    bundle.days.forEach(day => {
      day.sections.forEach(sec => {
        sec.itemIds.forEach(id => {
          const ex = findExercise(id)
          if (ex && ex.skill === skill) allExercises.push(ex)
        } )
      })
    })
  }

  // Zaif nuqta bo'lgan mashqlarni va taglari bir xil bo'lgan boshqa mashqlarni saralaymiz
  const remedial = allExercises.filter(ex => {
    // Agar mashq o'zi zaif nuqta bo'lsa, uni olamiz
    if (weakPoints.some(wp => wp.exerciseId === ex.id)) return true

    // Yoki mashqning taglari zaif nuqtalardan birortasiga mos kelsa
    return ex.tags?.some(tag => tagPool.has(tag))
  })

  const others = allExercises.filter(ex => {
    const isRemedial = remedial.some(r => r.id === ex.id)
    return !isRemedial
  })

  // Remedial mashqlarni birinchi, boshqalarni keyin
  return [...remedial.slice(0, maxCount), ...others.slice(0, maxCount - remedial.length)]
}
