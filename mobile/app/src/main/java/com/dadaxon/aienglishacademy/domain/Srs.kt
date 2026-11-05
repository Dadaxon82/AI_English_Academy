package com.dadaxon.aienglishacademy.domain

/**
 * Spaced repetition (SM-2 asosida soddalashtirilgan).
 *
 * MANBA: veb `src/lib/srs.ts` — mantiq, chegaralar va izohlar so'zma-so'z
 * ko'chirildi (`data/SrsState` tiplari `data/Models.kt`da, kalitlar bir xil).
 *
 * Qoidalar:
 *  - "Bilaman" / "Qayta mashq qilish" tugmalari shu hisobga asoslanadi.
 *  - Takrorlangan so'z statistikada IKKI marta hisoblanmaydi — `reps` bu
 *    takrorlashlar soni, `learned` esa bir marta o'rnatiladi.
 */

import com.dadaxon.aienglishacademy.data.MIN_EASE
import com.dadaxon.aienglishacademy.data.SrsState
import com.dadaxon.aienglishacademy.data.START_EASE

/** Veb: `SrsGrade = 'again' | 'hard' | 'good' | 'easy'`. */
enum class SrsGrade {
    AGAIN,
    HARD,
    GOOD,
    EASY,
    ;

    /** Server/JSON bilan bir xil qiymat (`age`, `hard`, `good`, `easy`). */
    fun wire(): String = name.lowercase()

    companion object {
        /** Noma'lum qiymat — `null` (qiymat ixtiro qilinmaydi). */
        fun fromWire(s: String?): SrsGrade? = values().firstOrNull { it.wire() == s?.lowercase() }
    }
}

/** Veb: `const DAY_MS = 24 * 60 * 60 * 1000`. */
const val DAY_MS = 24L * 60L * 60L * 1000L

/** Veb: `initialSrsState`. */
fun initialSrsState(now: Long = System.currentTimeMillis()): SrsState =
    SrsState(
        learnedAt = null,
        dueAt = now,
        intervalDays = 0,
        ease = START_EASE,
        reps = 0,
        lapses = 0,
        lastReviewedAt = null,
    )

/** SM-2 quality: 0..5. Bizning 4 gradamiz shu yerga moslashtiriladi. */
fun toQuality(grade: SrsGrade): Int =
    when (grade) {
        SrsGrade.AGAIN -> 1
        SrsGrade.HARD -> 3
        SrsGrade.GOOD -> 4
        SrsGrade.EASY -> 5
    }

/** Veb: `review(state, grade, now)`. */
fun review(state: SrsState, grade: SrsGrade, now: Long = System.currentTimeMillis()): SrsState {
    val q = toQuality(grade)
    val ease = Math.max(MIN_EASE, state.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))

    if (q < 3) {
        // Xato: interval boshlanadi, lekin `learnedAt` tozalanmaydi — so'z
        // "o'zlashtirilgan" ro'yxatida qoladi, faqat qayta takrorlashga tushadi.
        return state.copy(
            ease = ease,
            intervalDays = 0,
            dueAt = now + 10 * 60 * 1000L, // 10 daqiqadan keyin qayta
            reps = state.reps + 1,
            lapses = state.lapses + 1,
            lastReviewedAt = now,
            learnedAt = state.learnedAt,
        )
    }

    val intervalDays: Int =
        if (state.reps == 0) {
            if (grade == SrsGrade.EASY) 3 else 1
        } else {
            // `Math.round` Long qaytaradi — maydon Int (`intervalDays` kunlar soni).
            Math.max(1L, Math.round(state.intervalDays * ease)).toInt()
        }

    return SrsState(
        // `learnedAt` birinchi marta o'rnatiladi va keyin o'zgarmaydi.
        learnedAt = state.learnedAt ?: now,
        dueAt = now + intervalDays * DAY_MS,
        intervalDays = intervalDays,
        ease = ease,
        reps = state.reps + 1,
        lapses = state.lapses,
        lastReviewedAt = now,
    )
}

/** Veb: `isDue`. */
fun isDue(state: SrsState, now: Long = System.currentTimeMillis()): Boolean = state.dueAt <= now

/** Statistikada sanash: har bir so'z BIR marta hisoblanadi. */
fun countLearned(states: List<SrsState>): Int = states.count { it.learnedAt != null }

/** Veb: `countDue`. */
fun countDue(states: List<SrsState>, now: Long = System.currentTimeMillis()): Int =
    states.count { isDue(state = it, now = now) }

/** `sortForReview` kirish elementi (veb: `{ state, item }`). */
data class ReviewEntry<T>(val state: SrsState, val item: T)

/** Xato qilingan so'zlar ustuvor takrorlanadi. */
fun <T> sortForReview(entries: List<ReviewEntry<T>>): List<T> =
    entries.sortedWith(
        compareBy<ReviewEntry<T>> { if (it.state.lapses > 0) 0 else 1 }
            .thenBy { it.state.dueAt },
    ).map { it.item }
