package com.dadaxon.aienglishacademy.domain

/**
 * Kundalik 90 daqiqalik reja va moslashuvchan taqsimot.
 *
 * MANBA: veb `src/lib/planning.ts` — taqsimot bazasi, zaif ko'nikma
 * balansi, yakshanba/imtihon siljishlari, yig'indini `total` ga keltirish
 * sikli va XABAR qoidasi (ESKI BUG izohi bilan) so'zma-so'z ko'chirildi.
 *
 * Boshlang'ich taqsimot: Vocab 10 / Grammar 15 / Reading 15 / Listening 15 /
 * Writing 20 / Speaking 15 = 90 daqiqa.
 * Moslashish omillari: zaif ko'nikmalar, haftalik jadval, imtihon sanasigacha
 * qolgan kunlar.
 */

import com.dadaxon.aienglishacademy.data.DEFAULT_ALLOCATION
import com.dadaxon.aienglishacademy.data.Skills
import com.dadaxon.aienglishacademy.data.UserSettings
import com.dadaxon.aienglishacademy.data.clampDailyMinutes
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.temporal.ChronoUnit

/** Kunlik taqsimot natijasi (veb: `Allocation`). */
data class Allocation(
    val minutes: Map<String, Int>,
    val total: Int,
    /** Nima uchun o'zgarish — interfeysga ko'rsatish uchun */
    val reasonUz: List<String>,
)

/** Veb: `SKILL_ORDER`. */
private val SKILL_ORDER: List<String> = Skills.PLAN_ORDER

fun computeAllocation(
    settings: UserSettings,
    evidence: List<SkillEvidence>,
    today: LocalDate = LocalDate.now(),
): Allocation {
    val total = clampDailyMinutes(settings.dailyMinutes)
    // Vebda `reasons` hech qachon to'ldirilmaydi (oxirga qoldirilgan blok) —
    // uni shu holda saqlaymiz, chunki xabar ro'yxati tartibi ham muhim.
    val reasons = mutableListOf<String>()
    val base = LinkedHashMap(DEFAULT_ALLOCATION)

    // 1) Zaif ko'nikmalarga ko'proq vaqt
    val weak = evidence
        .filter { it.confidence >= 0.4 && it.score < 65 }
        .sortedBy { it.score }
        .take(2)
        .map { it.skill }

    val reasons2 = mutableListOf<String>()

    // 2) Hafta kuniga qarab yengil siljish (dam olish kuni Speaking/Vocab kamroq)
    if (today.dayOfWeek == DayOfWeek.SUNDAY) {
        base[Skills.SPEAKING] = Math.max(5, (base[Skills.SPEAKING] ?: 0) - 5)
        base[Skills.VOCABULARY] = Math.max(5, (base[Skills.VOCABULARY] ?: 0) - 5)
        base[Skills.READING] = (base[Skills.READING] ?: 0) + 10
        reasons2.add("Yakşanba — öqişga köproq vaqt, yengil kun.")
    }

    // 3) Imtihon yaqinlashsa — Mock Examga yaqin ko'nikmalar ustunligi
    if (settings.examDate != null) {
        // `daysUntil` ishlatiladi (yarim tun oralig'i hisobga olinadi). Eski holatda
        // `today` soat bilan hisoblani, Settings'dagi "N kun qoldi" esa yarim tun
        // notidan hisoblanardi — ikki sahifa turli son ko'rsatardi va 30-kun
        // chegarasida bir sahifada kuchaytirish yo'qolardi.
        val daysToExam = daysUntil(settings.examDate, today)
        if (daysToExam != null && daysToExam >= 0 && daysToExam <= 30) {
            base[Skills.WRITING] = Math.min(30, (base[Skills.WRITING] ?: 0) + 5)
            base[Skills.READING] = Math.min(25, (base[Skills.READING] ?: 0) + 5)
            base[Skills.VOCABULARY] = Math.max(5, (base[Skills.VOCABULARY] ?: 0) - 5)
            base[Skills.GRAMMAR] = Math.max(5, (base[Skills.GRAMMAR] ?: 0) - 5)
            reasons2.add("Imtihonga $daysToExam kun qoldi — Reading va Writing kuçaytirildi.")
        }
    }

    // weak ga qarab +5 / -5 (jami saqlanishi uchun balanslashtiriladi)
    if (weak.isNotEmpty()) {
        val donors = SKILL_ORDER.filter { !weak.contains(it) }.sortedByDescending { base[it] ?: 0 }
        weak.forEachIndexed { i, w ->
            val donor = donors[i % donors.size]
            if ((base[donor] ?: 0) - 5 >= 5) {
                base[donor] = (base[donor] ?: 0) - 5
                base[w] = Math.min(35, (base[w] ?: 0) + 5)
            }
        }
    }

    // 4) Yig'indini aniq `total` ga keltirish (eng katta maydonni sozlab)
    val sum = SKILL_ORDER.sumOf { base[it] ?: 0 }
    if (sum != total) {
        var diff = total - sum
        val order = SKILL_ORDER.sortedByDescending { base[it] ?: 0 }
        var i = 0
        while (diff != 0 && i < 400) {
            val s = order[i % order.size]
            if (diff > 0) {
                base[s] = (base[s] ?: 0) + 1
                diff -= 1
            } else if ((base[s] ?: 0) > 5) {
                base[s] = (base[s] ?: 0) - 1
                diff += 1
            }
            i++
        }
    }

    val minutes: Map<String, Int> = base

    // ESKI BUG: "Zaif ko'nikmalar kuchaytirildi" xabari transfer siklidan OLDIN
    // qo'yilardi — keyingi bosqichlarda (masalan 30 daqiqalik rejada hamma 5
    // daqiqaga tushadi) kuchaytirish yo'qolsa ham interfeys "kuchaytirildi" deb
    // yozardi. Endi xabar YAKUNIY taqsimotga qarab: zaif ko'nikma boshqalaridan
    // haqiqatan ko'p vaqt olgandagina aytiladi.
    if (weak.isNotEmpty()) {
        val others = SKILL_ORDER.filter { !weak.contains(it) }.map { minutes[it] ?: 0 }
        val baseline = if (others.isNotEmpty()) others.maxOrNull() ?: 0 else 0
        val boosted = weak.filter { (minutes[it] ?: 0) > baseline }
        if (boosted.isNotEmpty()) reasons2.add("Zaif könikmalar kuçaytirildi: ${boosted.joinToString(", ")}.")
    }

    return Allocation(
        minutes = minutes,
        total = SKILL_ORDER.sumOf { minutes[it] ?: 0 },
        reasonUz = listOf("Boşlanğiç taqsimot 90 daqiqaga asoslangan.") + reasons2 + reasons,
    )
}

/** Kundalik vazifa (veb: `DayTask`). */
data class DayTask(
    val skill: String,
    val minutes: Int,
    val sectionId: String,
    val titleUz: String,
    val contentId: String?,
    val done: Boolean,
)

/** Kun kontenti + taqsimotdan bugungi vaziyat ro'yxati (veb: `buildDayTasks`). */
fun buildDayTasks(
    day: com.dadaxon.aienglishacademy.data.DailyPlanDay,
    alloc: Allocation,
    doneBySkill: Map<String, String>,
): List<DayTask> =
    SKILL_ORDER.map { skill ->
        val sec = day.sections.firstOrNull { it.skill == skill }
        DayTask(
            skill = skill,
            minutes = alloc.minutes[skill] ?: sec?.minutes ?: 0,
            sectionId = "${day.id}:$skill",
            titleUz = sec?.titleUz ?: skillLabelUz(skill),
            contentId = sec?.itemIds?.getOrNull(0),
            done = doneBySkill[skill] == day.id,
        )
    }

fun skillLabelUz(s: String): String =
    when (s) {
        Skills.VOCABULARY -> "Luğat"
        Skills.GRAMMAR -> "Grammatika"
        Skills.READING -> "Öqiş"
        Skills.LISTENING -> "Tinglaş"
        Skills.WRITING -> "Yoziş"
        Skills.SPEAKING -> "Gapiriş"
        else -> s
    }

fun skillLabelEn(s: String): String = s

/**
 * Imtihon sanasigacha qolgan kunlar (veb: `daysUntil`).
 * Natija — lokal yarim tun oralig'i hisobi bilan aniq kun soni.
 */
fun daysUntil(dateStr: String?, now: LocalDate = LocalDate.now()): Int? {
    if (dateStr.isNullOrEmpty()) return null
    val t =
        try {
            LocalDate.parse(dateStr)
        } catch (e: java.time.DateTimeException) {
            // Vebda `new Date('...')` — Invalid Date (`Number.isFinite` rad etadi).
            return null
        }
    return Math.toIntExact(ChronoUnit.DAYS.between(now, t))
}

/**
 * Kun tartibida keyingi bosqichni aniqlash (o'quv yo'li) — veb: `nextDayId`.
 * `days` — kun ID'lari (kontent tartibida).
 */
fun nextDayId(level: String, days: List<String>, completed: List<String>): String {
    val done = completed.toSet()
    val next = days.firstOrNull { !done.contains(it) }
    return next ?: days.lastOrNull() ?: "${level.lowercase()}-day-1"
}
