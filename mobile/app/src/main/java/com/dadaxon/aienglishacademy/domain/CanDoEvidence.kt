package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.AttemptRecord
import com.dadaxon.aienglishacademy.data.MockExamAttempt

/**
 * «Men qila olaman» da'volarining DALILI — veb `src/lib/canDoEvidence.ts`
 * nusxasi. Daraja qoidasi bilan bir xil chegaralar: kamida
 * [MIN_EVIDENCE_PER_SKILL] natija va og'irlikli ball ≥ [PROMOTION_THRESHOLD]
 * bo'lsa — «tasdiqlandi». Natija yo'q bo'lsa ball ixtiro qilinmaydi.
 */
object CanDoStatus {
    const val NONE = "none"
    const val FEW = "few"
    const val PRACTICE = "practice"
    const val CONFIRMED = "confirmed"
}

data class CanDoEvidenceResult(val status: String, val count: Int, val score: Int?, val needed: Int)

fun canDoEvidence(
    st: CanDoStatement,
    attempts: List<AttemptRecord>,
    mockAttempts: List<MockExamAttempt>,
    now: Long,
    examLevel: (String) -> String?,
): CanDoEvidenceResult {
    val samples = ArrayList<ScoreSample>()
    for (a in attempts) {
        if (a.level != st.level || a.skill != st.skill) continue
        samples += ScoreSample(if (a.correct) 100.0 else Math.round(a.partial * 100).toDouble(), a.at, a.source)
    }
    for (m in mockAttempts) {
        if (examLevel(m.examId) != st.level) continue
        for (sec in m.sections) {
            val sc = sec.score ?: continue
            if (sec.skill == st.skill) samples += ScoreSample(sc.toDouble(), m.completedAt, "mock_exam")
        }
    }
    if (samples.isEmpty()) return CanDoEvidenceResult(CanDoStatus.NONE, 0, null, MIN_EVIDENCE_PER_SKILL)
    val score = Math.round(weightedScore(samples, now)).toInt()
    if (samples.size < MIN_EVIDENCE_PER_SKILL) {
        return CanDoEvidenceResult(CanDoStatus.FEW, samples.size, score, MIN_EVIDENCE_PER_SKILL - samples.size)
    }
    return CanDoEvidenceResult(
        if (score >= PROMOTION_THRESHOLD) CanDoStatus.CONFIRMED else CanDoStatus.PRACTICE,
        samples.size,
        score,
        0,
    )
}
