package com.dadaxon.aienglishacademy.domain

/**
 * Diagnostika natijasidan darajani baholash — aniq qoida.
 *
 * MANBA: veb `src/content/diagnostic.ts` — banda id'lari (dg-01…dg-12),
 * 2/3 qoidasi, `confidence` yaxlitlashi va o'zbekcha `labelUz` matnlari
 * SO'ZMA-SO'Z ko'chirildi.
 *
 * Foydalanuvchi A1 dan boshlaydi, lekin diagnostika testini ham
 * taklif qilimiz. Maqsad — darajani aniqlash (XP emas, dalil asosida).
 * Natija noaniq bo'lsa aniq CEFR darajasi deb ko'rsatilmaydi.
 */

import java.util.Locale

/** Veb: `diagnosticTest.exercises` — har darajani tekshiruvchi savol id'lari. */
val DIAGNOSTIC_BAND_IDS: Map<String, List<String>> =
    linkedMapOf(
        "A1" to listOf("dg-01", "dg-02", "dg-03"),
        "A2" to listOf("dg-04", "dg-05", "dg-06"),
        "B1" to listOf("dg-07"),
        "B2" to listOf("dg-08", "dg-09", "dg-12"),
        "C1" to listOf("dg-10", "dg-11"),
    )

/** Veb: `diagnose` ichidagi `order`. */
val DIAGNOSTIC_ORDER: List<String> = listOf("A1", "A2", "B1", "B2", "C1")

/**
 * Diagnostika natijasi (veb: `diagnose` qaytargan obyekt).
 * `level === null` — daraja aniq emas, A1 dan boshlanadi.
 */
data class DiagnosticOutcome(
    val level: String?,
    val labelUz: String,
    val confidence: Double,
)

/**
 * Diagnostika natijasidan darajani baholash aniq qoida bilan.
 * natija noaniq bo'lsa `level: null` qaytadi.
 *
 * Veb: `diagnose(exerciseResults)` — `exerciseResults` savol id -> to'g'ri/noto'g'ri.
 */
fun diagnose(exerciseResults: Map<String, Boolean>): DiagnosticOutcome {
    // Banda id'lari vebdagi `band` bilan bir xil (dg-01…dg-12).
    val hits = LinkedHashMap<String, Int>()
    for ((lvl, ids) in DIAGNOSTIC_BAND_IDS) {
        hits[lvl] = ids.count { id -> exerciseResults[id] == true }
    }

    // Daraja: barcha savollar to'g'ri bo'lgan eng yuqori banda,
    // qo'shni bandaga o'tish uchun kamida 2/3 to'g'ri bo'lishi kerak.
    var reached: String? = null
    var confidentBands = 0
    for (lvl in DIAGNOSTIC_ORDER) {
        val ids = DIAGNOSTIC_BAND_IDS[lvl] ?: emptyList()
        val h = hits[lvl] ?: 0
        if (h == ids.size) reached = lvl
        if (h.toDouble() / ids.size >= 2.0 / 3.0) confidentBands += 1
    }

    val confidence = round2(confidentBands.toDouble() / DIAGNOSTIC_ORDER.size)
    if (reached == null) {
        return DiagnosticOutcome(
            level = null,
            confidence = confidence,
            labelUz = "Natija noaniq — A1 dan boşlaymiz va diagnostikani keyin takrorlaymiz.",
        )
    }
    if (confidence < 0.5) {
        return DiagnosticOutcome(
            level = null,
            confidence = confidence,
            labelUz =
                "Taxminiy darajangiz $reached, ammo dalil yetarli emas. A1 bosqiçidan boşlab, birinçi bölim " +
                "testidan söng qayta baholanadi.",
        )
    }
    return DiagnosticOutcome(
        level = reached,
        confidence = confidence,
        labelUz = "Diagnostika natijasi: $reached. Bu taxminiy baho — darslar davomida aniqlaştiriladi.",
    )
}

/**
 * Veb: `scoreDiagnosticLevel` — mobil tomondan qayta baholash uchun ochiq
 * qilingan yordamchi: savollar natijasidan daraja idsi (to'g'ri javoblar
 * soni bo'yicha eng yuqori to'liq banda). Aniqlik chegarasidan tashqarida
 * `null`.
 */
fun scoreDiagnosticLevel(exerciseResults: Map<String, Boolean>): String? = diagnose(exerciseResults).level

/** Veb: `diagnosticTest.exercises` — daraja idsi (savol qaysi darajani tekshiradi). */
fun diagnosticQuestionLevel(questionId: String): String? =
    DIAGNOSTIC_BAND_IDS.entries.firstOrNull { it.value.contains(questionId) }?.key

/** Veb: `diagnosticTest.id`. */
const val DIAGNOSTIC_TEST_ID = "diagnostic-01"

/** Veb: `diagnosticTest.passScore`. */
const val DIAGNOSTIC_PASS_SCORE = 50

/** Daraja id'sini kichitish (vebda CEFR id'lari katta harf bilan). */
fun normalizeLevel(level: String): String = level.uppercase(Locale.ROOT)
