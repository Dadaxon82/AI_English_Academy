package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.SrsState
import com.dadaxon.aienglishacademy.data.VocabularyItem

/**
 * «5 daqiqa» tezkor sessiya — qisqa kunlik odat.
 *
 * MANBA: veb `src/lib/quickSession.ts` — sonlar va tartib BIR XIL
 * (`QuickSessionTest` veb faylidagi konstantalarni o'qib solishtiradi).
 *
 *  - Kartalar: avval SRS bo'yicha MUDDATI KELGAN so'zlar (xato qilinganlar
 *    birinchi — `sortForReview`), keyin BITTA mavzudan bir nechta YANGI so'z
 *    (eng ko'p o'rganilmagan so'zi bor mavzu; teng bo'lsa havuzda birinchi
 *    uchragani).
 *  - Kunlik reja (90 daqiqa) O'ZGARMAYDI. Zanjir uchun yangi qoida yo'q:
 *    `GameLogic.activeDayKeys` (kunda ≥ 60 s) 5 daqiqalik sessiyani qamraydi.
 */
object QuickSession {
    /** Sessiya davomiyligi (sekund). */
    const val SESSION_SEC = 5 * 60

    /** Bitta sessiyada eng ko'pi bilan nechta takror kartasi. */
    const val MAX_DUE = 12

    /** Bitta sessiyada nechta yangi so'z (bitta mavzudan). */
    const val NEW_WORDS = 5

    /** Surish chegarasi: kamida shuncha dp (veb: 80 CSS px). */
    const val SWIPE_MIN_DP = 80

    /** Keng kartada chegara karta enining shu ulushidan kam bo'lmaydi. */
    const val SWIPE_WIDTH_RATIO = 0.25

    /** Taymer sessiya kaliti — kun bilan (veb `quickSessionId`). */
    fun sessionId(day: String): String = "quick-$day"

    data class Card(val item: VocabularyItem, val isNew: Boolean)

    data class Deck(
        val cards: List<Card>,
        val dueCount: Int,
        val newCount: Int,
        /** Yangi so'zlar olingan mavzu (yangi so'z bo'lmasa null). */
        val newTopic: String?,
    )

    /**
     * Sessiya kartalari. `pool` — joriy darajaning lug'ati (asosiy + glossariy);
     * `newPool` — yangi so'zlar olinadigan havuz (ekran faqat ASOSIY lug'atni
     * beradi: glossariy so'zlarida misol gap yo'q).
     */
    fun buildDeck(
        pool: List<VocabularyItem>,
        srs: Map<String, SrsState>,
        now: Long,
        maxDue: Int = MAX_DUE,
        newWords: Int = NEW_WORDS,
        newPool: List<VocabularyItem>? = null,
    ): Deck {
        val unique = pool.distinctBy { it.id }
        val due = sortForReview(
            unique.mapNotNull { item -> srs[item.id]?.takeIf { isDue(it, now) }?.let { ReviewEntry(it, item) } },
        ).take(maxDue.coerceAtLeast(0))
        val dueIds = due.map { it.id }.toSet()

        // LinkedHashMap — havuzdagi birinchi uchrash tartibi saqlanadi.
        val byTopic = LinkedHashMap<String, MutableList<VocabularyItem>>()
        for (item in newPool ?: unique) {
            if (srs.containsKey(item.id) || item.id in dueIds) continue
            val list = byTopic.getOrPut(item.topic) { mutableListOf() }
            if (list.none { it.id == item.id }) list.add(item)
        }
        var topic: String? = null
        var best: List<VocabularyItem> = emptyList()
        for ((t, list) in byTopic) {
            if (list.size > best.size) {
                best = list
                topic = t
            }
        }
        val fresh = if (newWords > 0) best.take(newWords) else emptyList()
        if (fresh.isEmpty()) topic = null

        return Deck(
            cards = due.map { Card(it, false) } + fresh.map { Card(it, true) },
            dueCount = due.size,
            newCount = fresh.size,
            newTopic = topic,
        )
    }

    /**
     * Surish natijasi: o'ngga — `GOOD` («Bilaman»), chapga — `AGAIN` («Yana»),
     * masofa yetmasa — null. `minPx` — [SWIPE_MIN_DP] ekran zichligida.
     */
    fun swipeGrade(dx: Float, cardWidth: Float, minPx: Float): SrsGrade? {
        if (dx.isNaN() || dx.isInfinite()) return null
        val width = if (cardWidth.isNaN() || cardWidth.isInfinite()) 0f else cardWidth
        val threshold = maxOf(minPx, width * SWIPE_WIDTH_RATIO.toFloat())
        return when {
            dx >= threshold -> SrsGrade.GOOD
            dx <= -threshold -> SrsGrade.AGAIN
            else -> null
        }
    }

    /** Qolgan sekundlar (manfiy bo'lmaydi). */
    fun remaining(elapsedSec: Int): Int = (SESSION_SEC - elapsedSec.coerceAtLeast(0)).coerceAtLeast(0)
}
