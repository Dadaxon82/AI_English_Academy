package com.dadaxon.aienglishacademy.domain

/**
 * Ko'nikma bahosi va daraja o'tish qoidalari.
 *
 * MANBA: veb `src/lib/skillScoring.ts` — doimiylar, og'irliklar, ikkala
 * yaxlitlash va `reasonUz` matnlari so'zma-so'z ko'chirildi.
 *
 * LOYIHA TALABI: faqat kunlar soni yoki umumiy XP darajani oshirmaydi.
 * Daraja keyingi bosqichga faqat bir necha ko'nikma bo'yicha dalil
 * yig'ilsa tavsiya qilinadi. Noaniq baholar aniq CEFR darajasi deb
 * ko'rsatilmaydi — shuning uchun bu yerda `confidence` ham qaytadi.
 */

import com.dadaxon.aienglishacademy.data.Levels
import com.dadaxon.aienglishacademy.data.Skills
import java.time.LocalDate

/** Ko'nikma dalili (veb: `SkillEvidence`). */
data class SkillEvidence(
    val skill: String,
    /** 0..100 — yig'ilgan natijalardan hisoblangan o'rtacha, vaqt bilan og'irlikli */
    val score: Double,
    /** Qanchalik ishonchli: nuqta soni va xilma-xillik */
    val evidenceCount: Int,
    /** 0..1 */
    val confidence: Double,
    val lastAt: Long?,
)

/** Namuna (veb: `{ score, at, kind }`). */
data class ScoreSample(val score: Double, val at: Long, val kind: String)

/** Baho berish uchun minimal dalil soni (har bir ko'nikma). */
const val MIN_EVIDENCE_PER_SKILL = 4

/** Daraja o'tish uchun nechta ko'nikma yetarli bo'lishi kerak. */
const val SKILLS_REQUIRED_TO_PROMOTE = 4

/** Har bir ko'nikma uchun o'tish bosik'lari (0..100). */
const val PROMOTION_THRESHOLD = 72

/**
 * Mock Exam natijasi boshqa dalillarga qaraganda kuchliroq hisoblanadi
 * (og'irlik 1 + 0.35). Mock Exam shart EMAS — talabnamada daraja faqat
 * ko'p ko'nikma dalili bilan tavsiya qilinadi, deyilgan.
 */
const val MOCK_EXAM_WEIGHT = 0.35

/** Veb: `weightedScore`. */
fun weightedScore(samples: List<ScoreSample>, now: Long): Double {
    if (samples.isEmpty()) return 0.0
    var sum = 0.0
    var totalW = 0.0
    for (s in samples) {
        // Yangi natijalar ko'proq hisobga olinadi (yarim umr ~30 kun).
        val ageDays = Math.max(0.0, (now - s.at) / 86_400_000.0)
        val recency = Math.pow(0.5, ageDays / 30)
        val kindWeight =
            when (s.kind) {
                "mock_exam" -> 1 + MOCK_EXAM_WEIGHT
                "section_test" -> 1.15
                else -> 1.0
            }
        val w = recency * kindWeight
        sum += s.score * w
        totalW += w
    }
    return if (totalW == 0.0) 0.0 else sum / totalW
}

/** Veb: `confidenceFor` — `toFixed(2)` ikki xil yaxlitlashning birinchi qismi. */
fun confidenceFor(evidenceCount: Int, distinctKinds: Int): Double {
    val byCount = Math.min(1.0, evidenceCount.toDouble() / MIN_EVIDENCE_PER_SKILL)
    val byVariety = Math.min(1.0, distinctKinds / 3.0)
    return round2(Math.min(byCount, byVariety * 0.4 + byCount * 0.6))
}

/** `Number(x.toFixed(2))` — vebdagi ikki xil yaxlitlash. */
fun round2(x: Double): Double = Math.round(x * 100.0) / 100.0

/** Daraja tavsiyasi natijasi (veb: `evaluateLevelPromotion` qaytargan obyekt). */
data class Promotion(
    val recommendedLevel: String?,
    val readySkills: List<String>,
    val weakSkills: List<String>,
    val reasonUz: String,
)

/**
 * Daraja tavsiyasi. `recommendedLevel === null` bo'lsa — hozircha
 * tavsiya yo'q, foydalanuvchi hozirgi darajada davom etadi.
 */
fun evaluateLevelPromotion(current: String, evidence: List<SkillEvidence>): Promotion {
    val bySkill = evidence.associateBy { it.skill }
    val ready = mutableListOf<String>()
    val weak = mutableListOf<String>()

    for (skill in Skills.CORE) {
        val e = bySkill[skill]
        if (e == null) {
            weak.add(skill)
            continue
        }
        val solid = e.score >= PROMOTION_THRESHOLD && e.evidenceCount >= MIN_EVIDENCE_PER_SKILL && e.confidence >= 0.6
        if (solid) ready.add(skill) else weak.add(skill)
    }

    val idx = Levels.ALL.indexOf(current)
    val next = if (idx >= 0 && idx < Levels.ALL.size - 1) Levels.ALL[idx + 1] else null

    if (ready.size >= SKILLS_REQUIRED_TO_PROMOTE && next != null) {
        return Promotion(
            recommendedLevel = next,
            readySkills = ready,
            weakSkills = weak,
            reasonUz =
                "Tört asosiy könikma böyiça yetarli dalil töplandi (har biri ≥$PROMOTION_THRESHOLD ball va ≥$MIN_EVIDENCE_PER_SKILL natija). " +
                    "$next bosqiçiga ötiş tavsiya etiladi. Bu avtomatik ötiş emas — faqat tavsiya.",
        )
    }

    return Promotion(
        recommendedLevel = null,
        readySkills = ready,
        weakSkills = weak,
        reasonUz =
            if (ready.size >= SKILLS_REQUIRED_TO_PROMOTE) {
                "Keyingi bosqiç hozirça oxirgi daraja."
            } else {
                "Daraja oşiriş uçun kamida $SKILLS_REQUIRED_TO_PROMOTE könikma böyiça dalil kerak. " +
                    "Hozirça ${ready.size} ta tayyor; zaif: ${if (weak.isEmpty()) "yöq" else weak.joinToString(", ")}. " +
                    "XP va kunlar soni darajani özgartirmaydi."
            },
    )
}

/** XP / streak motivatsiya uchun — darajaga ta'siri YO'Q. */
fun xpForAttempt(correct: Boolean, difficulty: Int, firstTry: Boolean): Int {
    val base = if (correct) 6 + difficulty * 2 else 1
    return if (firstTry && correct) base else Math.max(1, Math.round(base * 0.4).toInt())
}

/** Veb: `streakFor` — dates: YYYY-MM-DD. */
fun streakFor(dates: List<String>, today: String): Int {
    val set = dates.toSet()
    var streak = 0
    var cursor = today
    while (set.contains(cursor)) {
        streak += 1
        cursor = LocalDate.parse(cursor).minusDays(1).toString()
    }
    return streak
}

/** Daraja nomi (veb: `levelLabel`). */
data class LevelLabel(val titleEn: String, val titleUz: String)

fun levelLabel(level: String): LevelLabel =
    when (level) {
        Levels.A1 -> LevelLabel("Beginner", "Boşlanğiç")
        Levels.A2 -> LevelLabel("Elementary", "Örtaça past")
        Levels.B1 -> LevelLabel("Intermediate", "Örtaça")
        Levels.B2 -> LevelLabel("Upper-Intermediate", "Örtaçadan yuqori")
        Levels.C1 -> LevelLabel("Advanced", "Yuqori")
        else -> LevelLabel(level, level)
    }
