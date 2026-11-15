package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.AppData
import com.dadaxon.aienglishacademy.data.SelfRating

/**
 * O'z-o'zini baholash (Likert 1–5) — veb `reducer.ts::self-assess` bilan bir xil.
 * Da'volar `assets/content/can-do.json`da (veb `content/canDo.ts`dan eksport).
 *
 * BU BAHO DARAJANI O'ZGARTIRMAYDI va XP bermaydi (daraja faqat ko'p ko'nikma
 * dalili bilan ko'tariladi — `SkillScoring.kt`).
 */
data class CanDoStatement(val id: String = "", val level: String = "", val skill: String = "", val textUz: String = "")

data class CanDoFile(val labels: List<String> = emptyList(), val statements: List<CanDoStatement> = emptyList())

/** 1..5 butun son bo'lmasa — holat o'zgarmaydi (o'sha obyekt qaytadi). */
fun applySelfAssess(d: AppData, id: String, score: Int, at: Long): AppData {
    if (score < 1 || score > 5 || id.isBlank()) return d
    return d.copy(selfAssessment = d.selfAssessment + (id to SelfRating(score, at)))
}
