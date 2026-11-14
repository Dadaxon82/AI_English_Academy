package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.Exercise
import com.dadaxon.aienglishacademy.data.Kinds
import com.dadaxon.aienglishacademy.data.SrsState
import com.dadaxon.aienglishacademy.data.VOCAB_QUIZ_PREFIX
import com.dadaxon.aienglishacademy.data.VocabularyItem

/**
 * TAKRORLASH MENEJERI — veb `src/lib/reviewManager.ts` ning mobil nusxasi:
 * tuzatilmagan xatolar va muddati kelgan so'zlar BITTA navbatda.
 *
 *  - So'z bilan bog'liq xato va o'sha so'zning SRS takrori — BITTA qadam
 *    (bir xato ikki marta sanalmaydi);
 *  - tartib: xato, so'z, xato, so'z… (biri tugasa qolgani ketma-ket);
 *  - ko'pi bilan [REVIEW_MAX] qadam.
 *
 * Mobil mashq pleyeri mashqlarni ID bo'yicha oladi, shuning uchun reja —
 * ID ro'yxati; so'z qadami `vocab-quiz-<so'z>`.
 */

const val REVIEW_MAX = 12

fun vocabIdOfExercise(id: String): String? {
    if (id.startsWith(VOCAB_QUIZ_PREFIX)) return id.removePrefix(VOCAB_QUIZ_PREFIX).ifEmpty { null }
    if (id.startsWith(VOCAB_PIC_PREFIX)) return id.removePrefix(VOCAB_PIC_PREFIX).ifEmpty { null }
    if (id.startsWith(VOCAB_SENT_PREFIX)) {
        val rest = id.removePrefix(VOCAB_SENT_PREFIX)
        return if (rest.startsWith("en-") || rest.startsWith("uz-")) rest.substring(3).ifEmpty { null } else null
    }
    return null
}

data class ReviewPlan(val exerciseIds: List<String>, val mistakes: Int, val words: Int)

fun buildReviewPlan(
    mistakes: List<Mistake>,
    srs: Map<String, SrsState>,
    vocab: List<VocabularyItem>,
    now: Long,
    max: Int = REVIEW_MAX,
): ReviewPlan {
    val covered = HashSet<String>()
    val mistakeIds = mistakes.map { m ->
        vocabIdOfExercise(m.exercise.id)?.let { covered.add(it) }
        m.exercise.id
    }
    val seen = HashSet<String>()
    val entries = vocab.mapNotNull { v ->
        if (!seen.add(v.id) || v.id in covered) return@mapNotNull null
        val st = srs[v.id] ?: return@mapNotNull null
        if (isDue(st, now)) ReviewEntry(st, v) else null
    }
    val wordIds = sortForReview(entries).map { "$VOCAB_QUIZ_PREFIX${it.id}" }

    val out = ArrayList<String>()
    var mi = 0
    var wi = 0
    while (out.size < max.coerceAtLeast(0) && (mi < mistakeIds.size || wi < wordIds.size)) {
        val takeMistake = mi < mistakeIds.size && (wi >= wordIds.size || out.size % 2 == 0)
        out.add(if (takeMistake) mistakeIds[mi++] else wordIds[wi++])
    }
    return ReviewPlan(out, mi, wi)
}

/**
 * Lug'at savoli id'dan tiklanganda faqat to'g'ri javobga ega (variant yo'q).
 * Pleyer uni shu funksiya bilan to'ldiradi: 3 ta boshqa tarjima, tartib
 * mashq ID'sidan olingan seed bilan — qayta ochilganda bir xil.
 */
fun withQuizOptions(e: Exercise, pool: List<VocabularyItem>): Exercise {
    if (e.kind != Kinds.MULTIPLE_CHOICE || !e.id.startsWith(VOCAB_QUIZ_PREFIX)) return e
    val opts = e.options ?: return e
    if (opts.size >= 2) return e
    val correct = opts.firstOrNull() ?: return e
    val rnd = java.util.Random(e.id.hashCode().toLong())
    val others = pool.map { it.translationUz }.filter { it.isNotBlank() && it != correct }.distinct().shuffled(rnd).take(3)
    if (others.isEmpty()) return e
    val all = (others + correct).shuffled(rnd)
    return e.copy(options = all, answerIndex = all.indexOf(correct))
}
