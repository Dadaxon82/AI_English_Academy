package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.DailyPlanDay
import com.dadaxon.aienglishacademy.data.Exercise
import com.dadaxon.aienglishacademy.data.LearningPath

/**
 * Bo'lim sakrash TESTINING pleyerdan chekkadagi mantig'i — veb
 * `src/pages/Sections.tsx::JumpTest` ning SOF qismi (testni tuzish, ball,
 * o'tish chegarasi).
 *
 * Nima uchun alohida fayl: `ui/runner/ExerciseFragment.kt` — Android
 * interfeysi, uni JUnit (Robolectric'siz) bilan sinab bo'lmaydi. Bu yerda
 * funksiya SOF: ekran shu mantikni chaqiradi va har bir o'lchov HAQIQIY
 * holatdan olinadi (soxta son yo'q).
 */
data class JumpPlan(
    /** Test savollari (kontentdan, deterministik — har qurilmada bir xil). */
    val exercises: List<Exercise>,
    /** Testga kirgan kunlar soni (test ochilganda qotiriladi — pastdagi izoh). */
    val skippedDays: Int,
)

/**
 * Sakrash testini ochish (veb: `useState(() => jumpTestExercises(...))`).
 *
 * QOTIRISH MUHIM: natija yozilgach o'tkazilgan kunlar `completedDays`ga
 * qo'shiladi va `skippedDaysFor` endi ularni qaytarmaydi — shuning uchun
 * test TO'PLAMI ochilish paytida BIR marta hisoblanadi (veb izohi ham shu).
 */
fun jumpPlan(
    sectionId: String,
    path: LearningPath,
    daysOf: (String) -> List<DailyPlanDay>,
): JumpPlan =
    JumpPlan(
        exercises = jumpTestExercises(sectionId, path, daysOf),
        skippedDays = skippedDaysFor(sectionId, path, daysOf).size,
    )

/**
 * Yakuniy ball (veb `onNext`): har savolga hissa — to'g'ri = 1, aks holda
 * `partial` — keyin foizga aylantirilib yaxlitlanadi.
 *
 * Hisob YO'QOBLAR TARTIBI BO'YICHA EMAS, mashqning O'ZI bo'yicha yig'iladi
 * (veb `acc.current[ex.id]` xuddi shuni qiladi): pleyerda `nextExerciseIndex`
 * xatoni mustahkamlash uchun oldingi mashqni qayta ko'rsatishi mumkin,
 * takrorlangan mashq ikki marta sanalmasin.
 */
fun jumpScore(
    exercises: List<Exercise>,
    outcomesByExerciseId: Map<String, CheckOutcome>,
): Int {
    if (exercises.isEmpty()) return 0
    var earned = 0.0
    for (ex in exercises) {
        val o = outcomesByExerciseId[ex.id] ?: continue
        earned += if (o.correct) 1.0 else o.partial
    }
    // Math.round — veb `Math.round` bilan BIR XIL yaxlitlash.
    return Math.round(earned / exercises.size * 100.0).toInt()
}

/** O'tish chegarasi bilan bir xil qoida (veb: `score >= JUMP_PASS_SCORE`). */
fun jumpPassed(score: Int): Boolean = score >= JUMP_PASS_SCORE

/**
 * Sakrash testi uchun pleyer tartibi: mashqlar QAYTA TARTIBLANMAYDI.
 *
 * Sakrash testi BAHOLASH testi (kun testi kabi), mashq zanjiri emas —
 * `Nav.openExercises` tartibni faqat `practice` manbasida qayta kuradi.
 * Bu funksiya shu qoidani testda ochiq tekshirish imkonini beradi.
 */
fun jumpExerciseIds(exercises: List<Exercise>): List<String> = exercises.map { it.id }
