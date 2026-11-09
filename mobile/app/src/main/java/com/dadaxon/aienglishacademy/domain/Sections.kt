package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.AppData
import com.dadaxon.aienglishacademy.data.DailyPlanDay
import com.dadaxon.aienglishacademy.data.Exercise
import com.dadaxon.aienglishacademy.data.Levels
import com.dadaxon.aienglishacademy.data.LearningPath
import com.dadaxon.aienglishacademy.data.VocabularyItem

/**
 * BO'LIMLAR (Sections) qatlami — kurs → bo'lim → kun (unit) → qadam.
 *
 * MANBA: veb `src/lib/sections.ts` — funksiya qoidalari SO'ZMA-SO'Z ko'chirildi
 * (testlar ham bir xil da'volarni tekshiradi: `src/test/sections.test.ts` ↔
 * `domain/SectionsTest.kt`). Tahlil: `docs/DUOLINGO_SECTIONS_TAHLIL.md`.
 * Duolingo'dan faqat MEXANIKA olinadi (bo'limlar ro'yxati, holat, progress,
 * sakrash testi); nomlar, matnlar va dizayn — bizniki.
 *
 * Qarorlar (foydalanuvchi bilan kelishilgan, 2026-11-08):
 *  - Har CEFR darajasi 2 bo'limga bo'linadi: `A1.1`, `A1.2`, … `C1.2`.
 *  - Bo'lim kunlarini [SECTION_PLAN] belgilaydi (kun RAQAMLARI bo'yicha).
 *    Kontenti hali yo'q darajalar `empty` — tugma ham, soxta progress ham yo'q.
 *  - SAKRASH TESTI: bo'limga sakrash uchun undan OLDINGI (o'tkazib yuboriladigan)
 *    kunlarning yakuniy test savollaridan tuzilgan test. O'tilsa o'tkazib
 *    yuborilgan kunlar `completedDays`ga qo'shiladi — mobil ham veb ham shu
 *    ro'yxatni o'qiydi, qo'shimcha sxema shart emas; natija
 *    `passedTests["jump:<id>"]` ga yoziladi.
 *  - Sakrash testi DARAJANI KO'TARMAYDI (`settings.currentLevel` o'zgarmaydi):
 *    README qoidasi — daraja faqat ko'p ko'nikma dalili bilan ko'tariladi.
 *
 * MOBIL farq (halol): funksiya SOF, lekin kontent `data/ContentRepository`da
 * turugani uchun kunlar/lug'at PROVIDER orqali beriladi (`daysOf`, `vocabOf`).
 * Shu sabab `domain` qatlami `ContentRepository`ga bog'lanmaydi (LessonChain.kt
 * kabi) va testlar darajani `content/` asset'lari yoki tayyor obyektlar bilan
 * sinab ko'radi.
 */

/** Bo'lim reja yozuvi: qaysi daraja, nechanchi qism, qaysi kun raqamlari. */
data class SectionPlanEntry(
    val id: String,
    val level: String,
    /** Daraja ichidagi qism (1 yoki 2) — `A1.1` ning "1" i. */
    val part: Int,
    /** Daraja kunlari raqamlari (`DailyPlanDay.dayNumber`). Bo'sh — kontent yo'q. */
    val dayNumbers: List<Int>,
    /** Bo'lim nimani o'rgatadi (qisqa, o'zbekcha) — "Batafsil" ichida. */
    val summaryUz: String,
)

/**
 * Bo'limlar rejasi. A1 kontenti 7 kun: 1–4 (asoslar) va 5–7 (kundalik
 * vaziyatlar). Qolgan darajalar uchun kunlar hali yozilmagan — `dayNumbers`
 * bo'sh, karta "Kontent tayyorlanmoqda" deb ochiq yozadi.
 *
 * Ketma-ketlik veb'dagi bilan BIR XIL: A1.1, A1.2, A2.1, A2.2, B1.1, B1.2,
 * B2.1, B2.2, C1.1, C1.2 (`testSectionOrderShart`).
 */
val SECTION_PLAN: List<SectionPlanEntry> =
    listOf(
        SectionPlanEntry(
            id = "a1-1",
            level = Levels.A1,
            part = 1,
            dayNumbers = listOf(1, 2, 3, 4),
            summaryUz = "Salomlashish, oila va egalik, kunlik tartib, uy va xonalar: “to be”, “have got”, Present Simple, “there is / are”.",
        ),
        SectionPlanEntry(
            id = "a1-2",
            level = Levels.A1,
            part = 2,
            dayNumbers = listOf(5, 6, 7),
            summaryUz = "Ovqat va ichimliklar, bo‘sh vaqt va rejalar, sayohat va yo‘l so‘rash: “some / any”, “can”, “going to”, “was / were”.",
        ),
        SectionPlanEntry(
            id = "a2-1",
            level = Levels.A2,
            part = 1,
            dayNumbers = listOf(1, 2, 3, 4),
            summaryUz = "O‘tgan hafta oxiri, bolalik xotiralari, shahar va qishloq, rejalar va ob-havo: Past Simple (to‘g‘ri va noto‘g‘ri fe’llar), qiyosiy daraja, “going to / will”.",
        ),
        SectionPlanEntry(
            id = "a2-2",
            level = Levels.A2,
            part = 2,
            dayNumbers = listOf(5, 6, 7),
            summaryUz = "Hayot tajribalari, sog‘liq va maslahat, oshxona va xarid: Present Perfect, “should / must / have to”, “some / any, much / many”.",
        ),
    ) +
        Levels.ALL.filter { it != Levels.A1 && it != Levels.A2 }.flatMap { level ->
            listOf(1, 2).map { part ->
                SectionPlanEntry(
                    id = "${level.lowercase()}-$part",
                    level = level,
                    part = part,
                    dayNumbers = emptyList(),
                    summaryUz = "",
                )
            }
        }

/** Sakrash testidan o'tish chegarasi (%) — BIZNING qarorimiz (kun testi 70 dan qattiqroq). */
const val JUMP_PASS_SCORE = 80

/** Sakrash testiga har o'tkazib yuboriladigan kundan olinadigan savollar soni — BIZNING qarorimiz. */
const val JUMP_ITEMS_PER_DAY = 3

enum class SectionStatus { DONE, CURRENT, LOCKED, EMPTY }

data class SectionCard(
    val id: String,
    /** `A1.1` ko'rinishidagi yorliq. */
    val label: String,
    val level: String,
    val part: Int,
    val summaryUz: String,
    val status: SectionStatus,
    val days: List<DailyPlanDay>,
    val daysDone: Int,
    /** Sakrash testi natijasi (bo'lsa) — `passedTests["jump:<id>"]`. */
    val jumpScore: Int?,
    /** Shu bo'limga sakrash testi mumkinmi (qulflangan va kontenti bor). */
    val canJump: Boolean,
    /** Namuna ibora — bo'limning birinchi kunidagi birinchi so'z misoli (kontentdan, ixtiro emas). */
    val sampleEn: String?,
    val sampleUz: String?,
)

/** Veb `sectionLabel`. */
fun sectionLabel(level: String, part: Int): String = "$level.$part"

/** Veb `jumpKey`. */
fun jumpKey(sectionId: String): String = "jump:$sectionId"

/**
 * Bo'lim id'sidan yorliq (`a1-2` → `A1.2`). Ekran tugma sarlavhasi va natija
 * xabari uchun — noma'lum id bo'lsa null (son/so'z ixtir qilinmaydi).
 */
fun sectionLabelForId(sectionId: String): String? =
    SECTION_PLAN.firstOrNull { it.id == sectionId }?.let { sectionLabel(it.level, it.part) }

/**
 * Bo'lim kartalari (veb `buildSections`). Holat qoidasi:
 *  - kontenti yo'q → [SectionStatus.EMPTY];
 *  - hamma kuni `completedDays`da → [SectionStatus.DONE];
 *  - birinchi tugallanmagan bo'lim (kontentli) → [SectionStatus.CURRENT];
 *  - qolganlari → [SectionStatus.LOCKED] (sakrash testi bilan ochiladi).
 *
 * [daysOf] daraja bo'yicha kunlarni beradi (veb `getBundle(level).days`),
 * [vocabOf] — lug'at (namuna ibora uchun, veb `getBundle(level).vocab`).
 */
fun buildSections(
    path: LearningPath,
    daysOf: (String) -> List<DailyPlanDay>,
    vocabOf: (String) -> List<VocabularyItem> = { emptyList() },
): List<SectionCard> {
    val done = path.completedDays.toHashSet()
    var currentGiven = false
    return SECTION_PLAN.map { entry ->
        val days = daysOf(entry.level).let { all -> entry.dayNumbers.mapNotNull { n -> all.firstOrNull { it.dayNumber == n } } }
        val daysDone = days.count { done.contains(it.id) }
        val status =
            when {
                days.isEmpty() -> SectionStatus.EMPTY
                daysDone == days.size -> SectionStatus.DONE
                !currentGiven -> {
                    currentGiven = true
                    SectionStatus.CURRENT
                }
                else -> SectionStatus.LOCKED
            }
        val first = days.firstOrNull()
        val sample =
            first?.let { f ->
                vocabOf(entry.level).firstOrNull { v -> f.sections.any { s -> s.itemIds.contains(v.id) } }
            }
        SectionCard(
            id = entry.id,
            label = sectionLabel(entry.level, entry.part),
            level = entry.level,
            part = entry.part,
            summaryUz = entry.summaryUz,
            status = status,
            days = days,
            daysDone = daysDone,
            jumpScore = path.passedTests[jumpKey(entry.id)],
            canJump = status == SectionStatus.LOCKED,
            // Veb'dagi kabi qiymat O'ZGARMAYDI (bo'sh bo'lsa ekranni UI yashiradi) —
            // aks holda "namuna kontentdan" testi ikki platformada farq qilar edi.
            sampleEn = sample?.exampleEn,
            sampleUz = sample?.exampleUz,
        )
    }
}

/** Shu bo'limga sakrashda o'tkazib yuboriladigan (hali tugallanmagan) kunlar (veb `skippedDaysFor`). */
fun skippedDaysFor(
    sectionId: String,
    path: LearningPath,
    daysOf: (String) -> List<DailyPlanDay>,
): List<DailyPlanDay> {
    val idx = SECTION_PLAN.indexOfFirst { it.id == sectionId }
    if (idx < 0) return emptyList()
    val done = path.completedDays.toHashSet()
    return SECTION_PLAN.take(idx)
        .flatMap { daysOf(it.level).let { all -> it.dayNumbers.mapNotNull { n -> all.firstOrNull { d -> d.dayNumber == n } } } }
        .filter { !done.contains(it.id) }
}

/**
 * Sakrash testi savollari (veb `jumpTestExercises`): har o'tkazib yuboriladigan
 * kunning yakuniy testidan birinchi [JUMP_ITEMS_PER_DAY] ta mashq
 * (deterministik — har qurilmada bir xil test).
 */
fun jumpTestExercises(
    sectionId: String,
    path: LearningPath,
    daysOf: (String) -> List<DailyPlanDay>,
): List<Exercise> =
    skippedDaysFor(sectionId, path, daysOf)
        .flatMap { d -> (d.sectionTest?.exercises ?: emptyList()).take(JUMP_ITEMS_PER_DAY) }

/**
 * Sakrash natijasini holatga qo'llash (veb `applySectionJump`; vebda reducer
 * chaqiradi — mobil `Action.SectionJump` chaqiradi). O'tilmasa yoki bo'lim
 * noma'lum bo'lsa — faqat eng yaxshi natija yoziladi, kunlar o'zgarmaydi.
 * Darajaga (`settings.currentLevel`) TEGILMAYDI.
 */
fun applySectionJump(
    data: AppData,
    sectionId: String,
    score: Int,
    daysOf: (String) -> List<DailyPlanDay>,
): AppData {
    if (!SECTION_PLAN.any { it.id == sectionId }) return data
    val key = jumpKey(sectionId)
    val passedTests = LinkedHashMap(data.path.passedTests)
    passedTests[key] = Math.max(data.path.passedTests[key] ?: 0, score)
    // O'tilmagan bo'lsa faqat NATIJA yoziladi (veb shu yerda `return` qiladi) —
    // kunlar TEGILMAYDI. Bu qator tartibi muhim: teskarisi bo'lsa 60 ball ham
    // kunlarni ochib qo'yardi (test `otilmasaKunlarOzgarmaydi…` shuni ushladi).
    if (score < JUMP_PASS_SCORE) {
        return data.copy(path = data.path.copy(passedTests = passedTests))
    }
    val skipped = skippedDaysFor(sectionId, data.path, daysOf).map { it.id }
    val completedDays = data.path.completedDays + skipped.filter { !data.path.completedDays.contains(it) }
    val currentDayId = daysOf(data.settings.currentLevel).firstOrNull { !completedDays.contains(it.id) }?.id ?: data.path.currentDayId
    return data.copy(
        path =
            LearningPath(
                completedDays = completedDays,
                passedTests = passedTests,
                currentDayId = currentDayId,
            ),
    )
}

/** Joriy bo'lim va undagi joriy kun — Bosh sahifa/O'quv yo'li banneri uchun (veb `CurrentSectionInfo`). */
data class CurrentSectionInfo(
    val section: SectionCard,
    /** Bo'lim ichidagi kun tartibi (1 dan). */
    val unitNumber: Int,
    val day: DailyPlanDay,
)

/**
 * Banner ma'lumoti (veb `currentSectionInfo`): joriy ([SectionStatus.CURRENT])
 * bo'lim va `path.currentDayId` kuni. Hamma bo'lim tugagan bo'lsa — oxirgi
 * kontentli bo'lim, oxirgi kuni. Kontent umuman yo'q bo'lsa — null (banner
 * ko'rsatilmaydi).
 */
fun currentSectionInfo(
    path: LearningPath,
    daysOf: (String) -> List<DailyPlanDay>,
    vocabOf: (String) -> List<VocabularyItem> = { emptyList() },
    /** Baholangan daraja — undan PAST bo'limlar "joriy" hisoblanmaydi (veb bilan bir xil). */
    fromLevel: String? = null,
): CurrentSectionInfo? {
    val cards = buildSections(path, daysOf, vocabOf)
    val from = fromLevel?.let { Levels.ALL.indexOf(it) } ?: 0
    val eligible = cards.filter { Levels.ALL.indexOf(it.level) >= from && it.days.isNotEmpty() }
    val done = path.completedDays.toHashSet()
    val section =
        eligible.firstOrNull { c -> c.days.any { !done.contains(it.id) } }
            ?: cards.reversed().firstOrNull { it.status == SectionStatus.DONE }
            ?: eligible.lastOrNull()
    if (section == null || section.days.isEmpty()) return null
    var idx = section.days.indexOfFirst { it.id == path.currentDayId }
    if (idx < 0) idx = section.days.indexOfFirst { !done.contains(it.id) }
    if (idx < 0) idx = section.days.size - 1
    return CurrentSectionInfo(section = section, unitNumber = idx + 1, day = section.days[idx])
}

/**
 * O'quv yo'li darajasi (veb `sections.ts::pathLevel` bilan bir xil): baholangan
 * daraja yoki undan keyingi birinchi tugallanmagan bo'lim darajasi. Baholangan
 * daraja (`settings.currentLevel`) BU YERDA O'ZGARMAYDI.
 */
fun pathLevel(
    path: LearningPath,
    currentLevel: String,
    daysOf: (String) -> List<DailyPlanDay>,
): String = currentSectionInfo(path, daysOf, fromLevel = currentLevel)?.section?.level ?: currentLevel
