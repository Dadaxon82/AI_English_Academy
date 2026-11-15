package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.AppData
import com.dadaxon.aienglishacademy.data.DailyPlanDay

/**
 * Daraja yakunlash guvohnomasi — veb `src/lib/certificate.ts` nusxasi.
 * Shart: darajaning barcha kunlari yakunlangan. Har son haqiqiy ma'lumotdan;
 * guvohnomada doim «rasmiy sertifikat emas» deb yoziladi.
 */
data class CertificateInfo(
    val eligible: Boolean,
    val level: String,
    val daysDone: Int,
    val daysTotal: Int,
    val attempts: Int,
    /** 0..100; urinish yo'q bo'lsa null. */
    val accuracy: Int?,
    val wordsLearned: Int,
    val canDoConfirmed: Int,
    val canDoTotal: Int,
)

fun certificateInfo(
    data: AppData,
    level: String,
    days: List<DailyPlanDay>,
    levelVocabIds: List<String>,
    claims: List<CanDoStatement>,
    now: Long,
    examLevel: (String) -> String?,
): CertificateInfo {
    val done = days.count { it.id in data.path.completedDays }
    val atts = data.attempts.filter { it.level == level }
    val correct = atts.count { it.correct }
    val mine = claims.filter { it.level == level }
    return CertificateInfo(
        eligible = days.isNotEmpty() && done == days.size,
        level = level,
        daysDone = done,
        daysTotal = days.size,
        attempts = atts.size,
        accuracy = if (atts.isEmpty()) null else Math.round(correct * 100.0 / atts.size).toInt(),
        wordsLearned = levelVocabIds.count { data.srs[it]?.learnedAt != null },
        canDoConfirmed = mine.count { canDoEvidence(it, data.attempts, data.mockAttempts, now, examLevel).status == CanDoStatus.CONFIRMED },
        canDoTotal = mine.size,
    )
}
