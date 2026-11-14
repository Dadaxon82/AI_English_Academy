package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.DailyPlanDay
import com.dadaxon.aienglishacademy.data.SectionTest
import com.dadaxon.aienglishacademy.data.Skills

/**
 * Darslar KETMA-KETLIGI (zanjir) — namunaviy ilovaning ketma-ketlik sxemasining
 * bizdagi ko'rinishi.
 *
 * MANBA — `DULO_mod.apk` ichidagi fayllar (zap arxivi ochib o'qildi; `apktool`
 * va tarmoq shart emas). HAR BIR SON repodagi skriptdan olinadi:
 * `tools/dulo_scan/dulo_facts.py` → `tools/dulo_scan/DULO_FAKTLAR.json`
 * (o'lchangan sana: 2026-11-05):
 *  - `assets/hardcoded_sessions/` ichida 18 ta dars JSON'i (chess 4, music 2,
 *    math 12). Har bir darsda tartib
 *    **buyruq ro'yxati** bilan beriladi: `{id, challenges[], type:"MATH_LESSON",
 *    skillId, nodeId, feedbackProperties…}`; `challenges` massivining tartibi
 *    o'quv tartibining O'ZIDIR (massiv o'rin almashmaydi).
 *  - `math/math_l0_lessons.json` (265 010 bayt) — 38 tur, bitta `type`
 *    (`mathChallengeBlob`); `math/math_lesson.json` (85 960 bayt) — 15 tur,
 *    10 xil tur: `mathMatch, mathDecimalFill ×2, mathFractionFill, mathTypeFill,
 *    mathEstimateNumberLine ×2, mathIntegerNumberLineFill, mathExpressionBuild,
 *    mathMultiSelect, mathWordProblemTokenDrag, mathProductSelect ×3`.
 *  - SHu 15 turli darsda 3 qo'shni bir xil turdir: `mathDecimalFill` 2→3,
 *    `mathEstimateNumberLine` 6→7, `mathProductSelect` 14→15 (ular 12, 14, 15
 *    o'rinlarda). Demak eng qisqa takror masofasi 1. DULO qoidasi
 *    "hech qachon qo'shni emas" DEYLMAYDI: 3+ turga ega 5 ta dars (50 tur,
 *    45 qo'shni juftlik) bo'yicha qo'shni bir xilligi **31.1%** — ~69%
 *    hollarda tur almashadi. Bir turli darslar (`math_l0_lessons.json` 38 tur,
 *    chess, `math_match_practice`) esa aksincha: qo'shni turlar 100% bir xil.
 *
 * BIZNING TALAB QASDDAN KUCHLIROQ: [MIN_KIND_GAP]=2 — aralash havzada bir xil
 * turli qo'shni UMUMAN bo'lmaydi (testda 0 tekshiriladi). Sababi: o'quvchi bir
 * xil formatni ketma-ket ko'rsa javobni o'ylamay, formatga o'rganib qoladi.
 * DULO klonida nusxalanadigan narsa — DULOning 31.1% soni EMAS, MEHANIZM:
 *   1) tartib buyruq ro'yxati bilan beriladi (`challenges` tartibi),
 *   2) tur almashinuvi qatlam, 3) takrorlash (mustahkamlash) qatlam.
 *
 * Bizda zanjir ikki qatlamda: KUNLAR tartibi (`nextDayId`) va kun ichida
 * BO'LIM→MASHQ tartibi. Quyidagi funksiya ikkinchisini kuradi: bo'limlar
 * `Skills.PLAN_ORDER` tartibida, mashqlar esa DULO qoidasi bilan
 * tur-almashinuvli (bir xil tur qo'shni bo'lmasligi uchun) va
 * `nextExerciseIndex` xatosini mustahkamlash uchun **qayta takrorlanadigan**
 * qilinadi. Funksiya SOF (Android konteksti yo'q) — unit testda tekshiriladi.
 */

/** Zanjir bo'limi — kun ichidagi bitta "dars" (ko'nikma yoki bo'lim testi). */
data class ChainStep(
    val dayId: String,
    /** Ko'nikma (`Skills.*`) yoki [TEST_STEP]. */
    val skill: String,
    /** Bo'lim mashq id'lari, zanjir tartibida. */
    val exerciseIds: List<String>,
    /** Zanjirdagi tartib nomeri (0 dan). */
    val index: Int,
    /** Bo'lim daqiqasi (`DaySection.minutes`); testda 0 — maydon yo'q. */
    val minutes: Int,
    val isTest: Boolean,
    /** Bo'lim sarlavhasi (`DaySection.titleUz`) — bo'sh bo'lsa ko'nikma nomi. */
    val titleUz: String,
)

/** Bo'lim testini zanjirning oxiriga qo'shish uchun soxta "ko'nikma" nomi. */
const val TEST_STEP = "test"

/** Zanjir qulfi holatlari. */
object ChainState {
    const val LOCKED = "locked"
    const val CURRENT = "current"
    const val DONE = "done"
}

/**
 * Kun zanjiri va uning holati.
 *
 * Qulf qoidasi (veb `LearningPath.tsx` siyosati; mobilda `nextDayId` ham
 * shuni qiladi): kun faqatoldingi kun yakunlansa yoki u joriy kun bo'lsa
 * ochiladi — qolganlar `LOCKED`.
 */
data class DayChain(
    val day: DailyPlanDay,
    val dayIndex: Int,
    val steps: List<ChainStep>,
    val isCurrent: Boolean,
    val isDone: Boolean,
) {
    val state: String
        get() = when {
            isDone && !isCurrent -> ChainState.DONE
            isCurrent || isDone -> ChainState.CURRENT
            else -> ChainState.LOCKED
        }

    /**
     * Bo'lim holati. Ochilgan KUNNING hamma bo'limi ochiq — interfeysda
     * `LearningPathFragment.openDay()` istalgan bo'limni tanlashga ruxsat
     * beradi (veb: kun ochilsa bo'limlar akkordeonda ko'rinadi), shuning
     * uchun joriy kunda bitta qadam emas, HAMMA qadam CURRENT.
     *
     * `stepIndex` API barqarorligi uchun saqlab qolindi (chaqiruvchi katak
     * tartibi bilan beradi); hozirgi qoidada unda bog'liqlik yo'q.
     */
    @Suppress("UNUSED_PARAMETER")
    fun stepState(stepIndex: Int): String = when {
        isDone -> ChainState.DONE
        isCurrent -> ChainState.CURRENT
        else -> ChainState.LOCKED
    }

    /** Zanjirdagi ochiq bo'limlar soni (faol qulf emas, ko'rinadigan qadam). */
    fun openSteps(): Int = if (isDone) steps.size else if (isCurrent) steps.size.coerceAtLeast(0) else 0
}

/**
 * Bo'limlari va testi bo'lgan kun uchun mashq id'larini bo'lim bo'yicha
 * hisoblaydi (`exerciseIdsFor` natijasi shu ko'rinishda beriladi).
 *
 * Bo'sh bo'lim (mashq yo'q va yozish/gapirish ham emas) zanjirga KIRMAYDI —
 * DULO dars ro'yxatida bo'sh tur uchramagani kabi.
 */
fun buildChain(
    day: DailyPlanDay,
    exerciseIdsBySkill: Map<String, List<String>>,
    dayIndex: Int = 0,
    isCurrent: Boolean = false,
    isDone: Boolean = false,
): DayChain {
    val steps = ArrayList<ChainStep>()
    for (skill in Skills.PLAN_ORDER) {
        val sec = day.sections.firstOrNull { it.skill == skill } ?: continue
        val ids = exerciseIdsBySkill[skill] ?: emptyList()
        val isTextTask = skill == Skills.WRITING || skill == Skills.SPEAKING
        if (ids.isEmpty() && !isTextTask) continue
        steps.add(
            ChainStep(
                dayId = day.id,
                skill = skill,
                exerciseIds = ids,
                index = steps.size,
                minutes = sec.minutes,
                isTest = false,
                titleUz = sec.titleUz,
            ),
        )
    }
    day.sectionTest?.let { t ->
        steps.add(
            ChainStep(
                dayId = day.id,
                skill = TEST_STEP,
                exerciseIds = t.exercises.map { it.id },
                // `SectionTest`da daqiqa maydoni YO'Q — son ixtir qilinmaydi.
                minutes = 0,
                index = steps.size,
                isTest = true,
                titleUz = t.titleUz,
            ),
        )
    }
    return DayChain(day = day, dayIndex = dayIndex, steps = steps, isCurrent = isCurrent, isDone = isDone)
}

/** Butun daraja zanjiri — kunlar ro'yxatdagi tartib saqlanadi. */
fun buildDayChains(
    days: List<DailyPlanDay>,
    exerciseIdsByDayAndSkill: Map<String, Map<String, List<String>>>,
    completedDays: List<String>,
    currentDayId: String,
): List<DayChain> = days.mapIndexed { i, day ->
    buildChain(
        day = day,
        exerciseIdsBySkill = exerciseIdsByDayAndSkill[day.id] ?: emptyMap(),
        dayIndex = i,
        isCurrent = day.id == currentDayId,
        isDone = completedDays.contains(day.id),
    )
}

/**
 * Mashq turini topish. `knownKind` — kontentdan (`content.findExercise(id)?.kind`,
 * lug'at savollari `vocab-quiz-…` idsi bilan ham ishlaydi). Turni bilmagan
 * mashq cheklangan emas — son ixtir qilinmaydi.
 */
private fun kindOf(knownKind: (String) -> String?, id: String): String? = knownKind(id)

/**
 * Kun ichidagi MASHQLAR ketma-ketligi — DULO qoidasi asosida.
 *
 * [MIN_KIND_GAP]=2 DULO `math_lesson.json`dan o'lchangan: bir xil turli mashq
 * qo'shni kelmaydi, eng qisqa takror masofasi 2 qadam. Turni bilmagan
 * mashq (`kind == null`) cheklangan emas.
 *
 * [REINFORCE_EVERY] — bilinarli xatolikni mustahkamlash. Veb manbasi
 * (`src/lib/check.ts::nextExerciseIndex`) xato javobdan keyin oldingi
 * mashqni qayta taklif qiladi; DULO aralash darslarida bir xil tur qo'shni
 * kelishi 31.1% (takrorlash bor). Bizda har [REINFORCE_EVERY]-qadamda bir
 * mashq qayta takrorlanadi, shuning uchun zanjir "ketma-ket + mustahkam"
 * bo'ladi va ro'yxat oxirigacha son saqlanadi.
 */
const val MIN_KIND_GAP = 2

/** Qanchalik qadamlar orasida bitta mashq qayta takrorlanadi. */
const val REINFORCE_EVERY = 6

/**
 * Qolgan mashqlarni yonma-yon takrorlanmasdan joylashtirish MUMKINLIGI.
 *
 * [MIN_KIND_GAP]=2 da qoida oddiy: `r` ta joyda bir tur `c` marta uchrasa
 * `c ≤ ⌈r/2⌉` bo'lishi shart; keyingi joy aynan shu tur bilan band bo'lsa
 * chegima `⌊r/2⌋` ga tushadi. Bu shart yetarli ham (adasha joylashtirish
 * teoremasi).
 *
 * Nima uchun kerak: oddiy "birinchi yaroqlisini ol" qoidasi DULO
 * `math_lesson.json` tartibini nusxalashda SINADI — `productSelect` 3 marta
 * uchraydi va ular ro'yxat oxiriga to'planib, qo'shni bo'lib qoladi. Shuning
 * uchun imkoniyatni saqlovchi BIRINCHI nomzod olinadi (kontent tartibi iloji
 * boricha buzilmaydi). Veb tomoni: `src/lib/lessonChain.ts::placeableRemaining`
 * — ikkala tomonda BIR XIL natija chiqishi shart.
 */
private fun placeableRemaining(counts: Map<String, Int>, r: Int, lastKind: String?): Boolean {
    if (r <= 0) return true
    for ((k, c) in counts) {
        if (c <= 0) continue
        val cap = if (lastKind != null && k == lastKind) r / 2 else (r + 1) / 2
        if (c > cap) return false
    }
    return true
}

/**
 * Zanjir tartibini quradi.
 *
 * @param orderedIds bo'lim mashq id'lari (kontentdagi tartib — bu DULO
 *   JSON'laridagi `challenges` massivining tartibiga mos keladi).
 * @param knownKind id → mashq turi (`Kinds.*`); noma'lum bo'lsa `null`.
 * @param reinforce qayta takrorlash yoqilsinmi (bo'lim testida O'CHIQ —
 *   test savollari takrorlanmasligi kerak).
 * @param dayId zanjr qaysi kun uchun qurilayotgani (hisobot/log kaliti —
 *   tartibga ta'sir qilmaydi).
 */
fun lessonSequence(
    @Suppress("UNUSED_PARAMETER") dayId: String,
    orderedIds: List<String>,
    knownKind: (String) -> String? = { null },
    reinforce: Boolean = true,
): List<String> {
    if (orderedIds.isEmpty()) return emptyList()
    val kinds = orderedIds.map { kindOf(knownKind, it) }

    // 1) Tur almashinuvi: chiqish TARTIBIDA oxirgi [MIN_KIND_GAP]-1 qadamda
    //    uchramagan turdi oladi (masofa yangi pozitsiyalarda o'lchanadi —
    //    asl indeksda emas, chunki biz chiqish tartibini o'zgartiramiz).
    //    Boshqa mashq qolmasa birinchisi olinadi (jadvatib bo'lmagan holda
    //    bo'sh qator qaytarmaymiz — DULO 15 turli darsida ham gap 1 uchraydi).
    val used = ArrayList<Int>(orderedIds.size)
    val remaining = LinkedHashSet<Int>(orderedIds.size)
    for (i in orderedIds.indices) remaining.add(i)
    val lookback = (MIN_KIND_GAP - 1).coerceAtLeast(0)

    // Qolgan turlar soni — `placeableRemaining` sharti uchun.
    val counts = HashMap<String, Int>()
    for (k in kinds) if (k != null) counts[k] = (counts[k] ?: 0) + 1

    while (remaining.isNotEmpty()) {
        val recentKinds = if (lookback == 0) emptyList() else used.takeLast(lookback).map { kinds[it] }
        // Nomzodlar KONTEHT TARTIBIDA ko'riladi (`LinkedHashSet`/`indices` —
        // `HashSet` tartibi brauzerdagi `Set` bilan har xil bo'lardi).
        var take = -1
        for (i in orderedIds.indices) {
            if (!remaining.contains(i)) continue
            val k = kinds[i]
            if (k != null && recentKinds.any { it == k }) continue
            if (k != null) counts[k] = (counts[k] ?: 1) - 1
            if (placeableRemaining(counts, remaining.size - 1, k)) {
                take = i
                break
            }
            if (k != null) counts[k] = (counts[k] ?: 0) + 1
        }
        // Joylashtirib bo'lmaydigan holat (bitta turli ro'yxat — DULO
        // `math_l0_lessons.json` 38 mashq bitta tur): baribir HAMMA mashq
        // qatnashadi, ro'yxat qisqarmaydi.
        if (take == -1) {
            take = orderedIds.indices.first { remaining.contains(it) }
            val k = kinds[take]
            if (k != null) counts[k] = (counts[k] ?: 1) - 1
        }
        used.add(take)
        remaining.remove(take)
    }

    // 2) Mustahkamlash: har REINFORCE_EVERY qadamda bitta mashq qayta.
    if (!reinforce || used.size < 2) return used.map { orderedIds[it] }
    val out = ArrayList<String>(used.size + used.size / REINFORCE_EVERY + 1)
    for ((pos, i) in used.withIndex()) {
        out.add(orderedIds[i])
        if (pos > 0 && (pos + 1) % REINFORCE_EVERY == 0 && pos < used.size - 1) {
            out.add(orderedIds[i])
        }
    }
    return out
}

/**
 * Ketma-ketlikni baholovchi yorliqlar (hisobot/test uchun):
 *  - `sameNeighbours` — bir xil turli qo'shni soni (DULO aralash darslarida
 *    31.1%, bizda 0 bo'lishi kerak);
 *  - `minGap` — bir xil tur orasidagi eng kichik masofa (DULO: 2).
 */
fun sequenceAudit(ids: List<String>, knownKind: (String) -> String? = { null }): Map<String, Int> {
    val kinds = ids.map { kindOf(knownKind, it) }
    var same = 0
    var minGap = Int.MAX_VALUE
    val last = HashMap<String, Int>()
    for (i in ids.indices) {
        val k = kinds[i] ?: continue
        if (i > 0 && kinds[i - 1] == k) same++
        last[k]?.let { minGap = minOf(minGap, i - it) }
        last[k] = i
    }
    return mapOf(
        "steps" to ids.size,
        "sameNeighbours" to same,
        "minGap" to if (minGap == Int.MAX_VALUE) 0 else minGap,
    )
}

/** Bo'lim testi zanjirning oxirida turishini tekshirish uchun yordamchi. */
fun testStepOf(day: DailyPlanDay): SectionTest? = day.sectionTest

/**
 * Butun zanjir bo'yicha HALOL audit — veb `src/lib/lessonChain.ts::chainAudit`
 * bilan BIR XIL (telefon va brauzerda bir xil son chiqishi shart).
 *
 * Nima uchun alohida: `sequenceAudit` butun ro'yxatga qo'llansa, yagona turli
 * bo'lim (lug'at testi — hammasi `multiple-choice`) "bir xil tur qo'shni" deb
 * chiqadi, holbuki u yerda ajratishning IMKONI yo'q (DULO
 * `math_l0_lessons.json`: 38 mashq bitta tur, qo'shnilar 100% bir xil).
 * Shuning uchun son ikkiga ajratiladi:
 *  - `sameNeighbours` — rotatsiyadan keyin qolgan bir xil qo'shnilar;
 *  - `unavoidable` — ulardan nechtasi yagona turli bo'lim tufayli MAJBURIY.
 * `MIN_KIND_GAP` talabi aralash bo'limlarga tegishli, ya'ni
 * `sameNeighbours == unavoidable` bo'lishi kerak (test tekshiradi).
 *
 * Har bo'lim ALOHIDA hisoblanadi — bo'limlar ketma-ketligi bitta mashq oqimi
 * emas, shuning uchun bo'lim chegarasi qo'shni sanalmaydi.
 */
data class ChainAuditReport(
    val sections: Int,
    val plannedSteps: Int,
    val reinforcement: Int,
    val rotationSteps: Int,
    val sameNeighbours: Int,
    val minGap: Int,
    val unavoidable: Int,
)

fun chainAudit(chains: List<DayChain>, knownKind: (String) -> String? = { null }): ChainAuditReport {
    var sections = 0
    var plannedSteps = 0
    var reinforcement = 0
    var same = 0
    var minGap = Int.MAX_VALUE
    var unavoidable = 0
    for (c in chains) {
        for (s in c.steps) {
            if (s.exerciseIds.isEmpty()) continue
            sections++
            val base = lessonSequence(s.dayId, s.exerciseIds, knownKind, reinforce = false)
            val a = sequenceAudit(base, knownKind)
            same += a.getValue("sameNeighbours")
            val planned = lessonSequence(s.dayId, s.exerciseIds, knownKind, reinforce = !s.isTest)
            plannedSteps += planned.size
            reinforcement += planned.size - base.size
            val kinds = base.mapNotNull { knownKind(it) }.toSet()
            if (kinds.size >= 2) {
                // `minGap` faqat TUR ALMASHINUVI QO'LLANADIGAN bo'limlarda
                // o'lchanadi: yagona turli bo'limda masofa tabiiy 1 (DULO
                // `math_l0_lessons.json` — 38 mashq bitta tur). Shunda son
                // "aralash turlarda bir xil tur qo'shni kelmaydi" talabini
                // halol tekshiradi.
                if (a.getValue("minGap") > 0) minGap = minOf(minGap, a.getValue("minGap"))
            } else if (kinds.size == 1 && base.size > 1) {
                // Bitta turli bo'limda qo'shni majburiy: n-1 juftlik. (Tur
                // umuman noma'lum bo'lsa hisob YO'Q — son ixtir qilinmaydi.)
                unavoidable += base.size - 1
            }
        }
    }
    return ChainAuditReport(
        sections = sections,
        plannedSteps = plannedSteps,
        reinforcement = reinforcement,
        rotationSteps = plannedSteps - reinforcement,
        sameNeighbours = same,
        minGap = if (minGap == Int.MAX_VALUE) 0 else minGap,
        unavoidable = unavoidable,
    )
}
