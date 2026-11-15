package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.DailyPlanDay
import com.dadaxon.aienglishacademy.data.DaySection
import com.dadaxon.aienglishacademy.data.Exercise
import com.dadaxon.aienglishacademy.data.Kinds
import com.dadaxon.aienglishacademy.data.SectionTest
import com.dadaxon.aienglishacademy.data.Skills
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Darslar ketma-ketligi (zanjir) — namunaviy ilovaning tartib sxemasining
 * tekshiruvi. DALILLAR `domain/LessonChain.kt` izohida (DULO
 * `assets/hardcoded_sessions/` ichida — 18 dars fayli, `challenges` massivi tartibi
 * o'quv tartibidir; `math/math_lesson.json`da 15 tur / 10 xil tur, bir xil tur
 * qo'shni qadamda takrorlanmaydi).
 */
class LessonChainTest {

    /* ----------------------- ketma-ketlik (`lessonSequence`) ----------------------- */

    /** Tur noma'lum bo'lsa tartib O'ZGARMAYDI — id'lar ixtir qilinmaydi. */
    @Test
    fun unknownKindsKeepContentOrder() {
        val ids = listOf("a", "b", "c", "d")
        assertEquals(ids, lessonSequence("day", ids))
    }

    /** DULO qoidasi: bir xil tur qo'shni qadamda kelmaydi. */
    @Test
    fun sameKindNeverAdjacent() {
        val ids = listOf("g1", "g2", "g3", "m1", "m2")
        val kind = mapOf(
            "g1" to Kinds.GAP_FILL,
            "g2" to Kinds.GAP_FILL,
            "g3" to Kinds.GAP_FILL,
            "m1" to Kinds.MULTIPLE_CHOICE,
            "m2" to Kinds.MULTIPLE_CHOICE,
        )
        val out = lessonSequence("day", ids, knownKind = { kind[it] }, reinforce = false)
        assertEquals(ids.size, out.size)
        assertEquals("id'lar saqlanişi kerak", ids.toSet(), out.toSet())
        val audit = sequenceAudit(out) { kind[it] }
        assertEquals("bir xil turli qöşni bölmasligi kerak: $out", 0, audit.getValue("sameNeighbours"))
    }

    /**
     * DULO `math_lesson.json` — 15 mashq, 10 xil tur (ba'zi turlar 2–3 marta
     * uchraydi). Vebdagi `src/test/lesson-chain.test.ts`da HAM shu ma'lumot
     * bilan tekshiriladi: id'lar saqlanadi, hech biri yo'qolmaydi, bir xil turli
     * qo'shni 0 ta va eng qisqa takror masofasi [MIN_KIND_GAP].
     *
     * Bu test "birinchi yaroqlisini ol" qoidasi bilan SINALDI (3 ta
     * `productSelect` oxirga to'planardi) — shundan keyin `placeableRemaining`
     * qoidasi qo'shildi.
     */
    @Test
    fun duloMathLessonShapeIsSpread() {
        val ids = listOf(
            "m1", "d1", "d2", "f1", "t1", "e1", "e2", "n1", "b1", "s1", "w1", "p1", "p2", "p3", "q1",
        )
        val kind = mapOf(
            "m1" to "mathMatch",
            "d1" to "mathDecimalFill", "d2" to "mathDecimalFill",
            "f1" to "mathFractionFill",
            "t1" to "mathTypeFill",
            "e1" to "mathEstimateNumberLine", "e2" to "mathEstimateNumberLine",
            "n1" to "mathIntegerNumberLineFill",
            "b1" to "mathExpressionBuild",
            "s1" to "mathMultiSelect",
            "w1" to "mathWordProblemTokenDrag",
            "p1" to "mathProductSelect", "p2" to "mathProductSelect", "p3" to "mathProductSelect",
            "q1" to "mathWordProblem",
        )
        val out = lessonSequence("day", ids, knownKind = { kind[it] }, reinforce = false)
        assertEquals(ids.size, out.size)
        assertEquals("heç qaysi maşq yöqolmaganligi kerak", ids.toSet(), out.toSet())
        val audit = sequenceAudit(out) { kind[it] }
        assertEquals("bir xil turli qöşni: $out", 0, audit.getValue("sameNeighbours"))
        assertTrue("takror masofasi: $audit", audit.getValue("minGap") >= MIN_KIND_GAP)
    }

    /** Noma'lum tur (`kind == null`) cheklovga tushmaydi. */
    @Test
    fun unknownKindIsUnconstrained() {
        val ids = listOf("x1", "x2", "g1")
        val out = lessonSequence("day", ids, knownKind = { if (it.startsWith("g")) Kinds.GAP_FILL else null }, reinforce = false)
        assertEquals(3, out.size)
        assertEquals(ids.toSet(), out.toSet())
        assertEquals(
            0,
            sequenceAudit(out) { if (it.startsWith("g")) Kinds.GAP_FILL else null }.getValue("sameNeighbours"),
        )
    }

    /**
     * Bitta turli ro'yxat (DULO `math_l0_lessons.json`: 38 mashq, bitta tur).
     * Ajratib bo'lmaydi — baribir HAMMA mashq qatnashadi (yo'qolish YO'Q).
     */
    @Test
    fun singleKindPoolKeepsEverything() {
        val ids = (1..8).map { "g$it" }
        val out = lessonSequence("day", ids, knownKind = { Kinds.GAP_FILL }, reinforce = false)
        assertEquals(ids.size, out.size)
        assertEquals(ids.toSet(), out.toSet())
    }

    /**
     * Mustahkamlash: har [REINFORCE_EVERY]-qadamda bitta mashq qayta qo'shiladi.
     * Qo'shiladigan id KONTEHDAGI id'dir — hech qanday yangi id paydo bo'lmaydi.
     */
    @Test
    fun reinforceDuplicatesExistingIdsOnly() {
        val ids = (1..13).map { "e$it" }
        val out = lessonSequence("day", ids, reinforce = true)
        assertTrue("takror qöşilişi kerak: $out", out.size > ids.size)
        assertTrue("faqat kontent id'lari: $out", ids.toSet().containsAll(out.toSet()))
        // Shu o'lchamda qo'shilishi kutiladi (har REINFORCE_EVERY qadamda bitta).
        assertEquals(ids.size + ids.size / REINFORCE_EVERY, out.size)
    }

    /** Qisqa ro'yxatda son shishmaydi. */
    @Test
    fun shortPoolNotInflated() {
        assertEquals(listOf("only"), lessonSequence("day", listOf("only"), reinforce = true))
        assertEquals(2, lessonSequence("day", listOf("a", "b"), reinforce = true).size)
    }

    @Test
    fun emptyPoolGivesEmptyChain() {
        assertTrue(lessonSequence("day", emptyList()).isEmpty())
    }

    /* ---------------------------- kun zanjiri ---------------------------- */

    private fun ex(id: String, skill: String = Skills.VOCABULARY, kind: String = Kinds.MULTIPLE_CHOICE) =
        Exercise(id = id, kind = kind, skill = skill, level = "A1")

    private fun day(
        id: String = "a1-day-01",
        sections: List<DaySection>,
        test: SectionTest? = null,
    ) = DailyPlanDay(
        id = id,
        level = "A1",
        dayNumber = 1,
        titleUz = "Birinçi kun",
        goalUz = "",
        sections = sections,
        sectionTest = test,
    )

    private fun test(id: String) = SectionTest(
        id = id,
        level = "A1",
        section = Skills.VOCABULARY,
        titleUz = "Luğat testi",
        passScore = 70,
        exercises = listOf(ex("$id-1")),
    )

    /** Bo'limlar `Skills.PLAN_ORDER` tartibida, test OXIRIDA turadi. */
    @Test
    fun chainFollowsPlanOrderAndTestIsLast() {
        // Bo'limlar ataylab teskari tartibda (kontent shunday beradi) —
        // zanjir baribir reja tartibini oladi.
        val d = day(
            sections = listOf(
                DaySection(Skills.READING, 15, listOf("r1"), "Öqiş"),
                DaySection(Skills.VOCABULARY, 10, listOf("v1", "v2"), "Luğat"),
            ),
            test = test("a1-day-01-test"),
        )
        val chain = buildChain(
            d,
            mapOf(Skills.VOCABULARY to listOf("v1", "v2"), Skills.READING to listOf("r1")),
            isCurrent = true,
        )
        assertEquals(listOf(Skills.VOCABULARY, Skills.READING, TEST_STEP), chain.steps.map { it.skill })
        assertTrue(chain.steps.last().isTest)
        assertEquals(listOf("v1", "v2"), chain.steps[0].exerciseIds)
        // `SectionTest`da daqiqa maydoni YO'Q — son ixtir qilinmaydi.
        assertEquals(0, chain.steps.last().minutes)
        assertEquals(15, chain.steps[1].minutes)
        assertEquals(listOf(0, 1, 2), chain.steps.map { it.index })
        assertEquals("Luğat testi", chain.steps.last().titleUz)
    }

    /** Mashqi bo'lmagan bo'lim zanjirga KIRMAYDI (yozish/gapirishdan tashqari). */
    @Test
    fun emptySectionSkippedButTextTasksStay() {
        val d = day(
            sections = listOf(
                DaySection(Skills.VOCABULARY, 10, listOf("v1"), "Luğat"),
                DaySection(Skills.LISTENING, 15, emptyList(), "Tinglaş"),
                DaySection(Skills.WRITING, 20, emptyList(), "Yoziş"),
            ),
        )
        val chain = buildChain(d, mapOf(Skills.VOCABULARY to listOf("v1")), isCurrent = true)
        assertEquals(listOf(Skills.VOCABULARY, Skills.WRITING), chain.steps.map { it.skill })
    }

    /** Qulf qoidasi: oldingi kunlar DONE, joriy CURRENT, keyingilari LOCKED. */
    @Test
    fun dayLockStates() {
        val chains = buildDayChains(
            days = listOf(
                day("d1", listOf(DaySection(Skills.VOCABULARY, 10, listOf("v1"), "Luğat"))),
                day("d2", listOf(DaySection(Skills.VOCABULARY, 10, listOf("v2"), "Luğat"))),
                day("d3", listOf(DaySection(Skills.VOCABULARY, 10, listOf("v3"), "Luğat"))),
            ),
            exerciseIdsByDayAndSkill = mapOf(
                "d1" to mapOf(Skills.VOCABULARY to listOf("v1")),
                "d2" to mapOf(Skills.VOCABULARY to listOf("v2")),
                "d3" to mapOf(Skills.VOCABULARY to listOf("v3")),
            ),
            completedDays = listOf("d1"),
            currentDayId = "d2",
        )
        assertEquals(ChainState.DONE, chains[0].state)
        assertEquals(ChainState.CURRENT, chains[1].state)
        assertEquals(ChainState.LOCKED, chains[2].state)
        // Ochilgan kunning istalgan bo'limi ochiq — `openDay` tanlovga ruxsat beradi.
        assertEquals(
            listOf(ChainState.CURRENT),
            chains[1].steps.map { chains[1].stepState(it.index) },
        )
        assertEquals(ChainState.LOCKED, chains[2].stepState(0))
        assertEquals(0, chains[2].openSteps())
        assertEquals(1, chains[1].openSteps())
    }

    /** Bo'lim testi zanjirda `testStepOf` orqali topiladi (pleyerga id'lar beriladi). */
    @Test
    fun testStepExposed() {
        val d = day(sections = listOf(DaySection(Skills.VOCABULARY, 10, listOf("v1"), "Luğat")), test = test("t9"))
        val chain = buildChain(d, mapOf(Skills.VOCABULARY to listOf("v1")), isCurrent = true)
        val t = testStepOf(d)
        assertTrue(t != null && t.id == "t9")
        assertEquals(listOf("t9-1"), chain.steps.last().exerciseIds)
    }

    /**
     * `chainAudit` — bo'limlar ALOHIDA hisoblanadi, yagona turli bo'limning
     * majburiy takrorlari `unavoidable` ga yoziladi (veb
     * `src/test/chain-audit-real.test.ts`da HAQIQIY A1 kontentida:
     * 35 bo'lim, 287 mashq qadami + 21 takrorlash, 77 bir xil qo'shni —
     * 77 tasining HAMMASI majburiy, `minGap` aralash bo'limlarda 2).
     */
    @Test
    fun chainAuditSeparatesUnavoidableRepeats() {
        val kind = mapOf(
            "v1" to Kinds.MULTIPLE_CHOICE, "v2" to Kinds.MULTIPLE_CHOICE, "v3" to Kinds.MULTIPLE_CHOICE,
            "g1" to Kinds.GAP_FILL, "g2" to Kinds.MULTIPLE_CHOICE, "g3" to Kinds.GAP_FILL,
        )
        val d = day(
            sections = listOf(
                // yagona turli bo'lim: 3 mashq → 2 MAJBURIY qo'shni
                DaySection(Skills.VOCABULARY, 10, listOf("v1", "v2", "v3"), "Luğat"),
                // aralash bo'lim: `gap_fill` 1 va 3-o'rinlarda (ajratilgan) → 0 qo'shni
                DaySection(Skills.GRAMMAR, 15, listOf("g1", "g2", "g3"), "Grammatika"),
            ),
        )
        val chain = buildChain(
            d,
            mapOf(
                Skills.VOCABULARY to listOf("v1", "v2", "v3"),
                Skills.GRAMMAR to listOf("g1", "g2", "g3"),
            ),
            isCurrent = true,
        )
        val a = chainAudit(listOf(chain)) { kind[it] }
        assertEquals("bölimlar soni", 2, a.sections)
        assertEquals("majburiy qöşni — yagona turli bölimda 2 ta", 2, a.unavoidable)
        assertEquals("aralaş bölimda qöşni qolmaydi: hammasi majburiy", a.unavoidable, a.sameNeighbours)
        assertEquals("aralaş bölimda eng qisqa masofa 2", 2, a.minGap)
        assertEquals("rotatsiya qadamlari", 6, a.rotationSteps)
        // Bo'limlar kichik (3 va 3) — `REINFORCE_EVERY=6` shishirmaydi.
        assertEquals("qisqa bölimda takror qöşilmaydi", 0, a.reinforcement)
        assertEquals(a.rotationSteps + a.reinforcement, a.plannedSteps)
    }

    /** Audit sonlari ixtira EMAS — ro'yxatdan hisoblanadi. */
    @Test
    fun sequenceAuditCounts() {
        val a = sequenceAudit(listOf("a", "b"), knownKind = { Kinds.MULTIPLE_CHOICE })
        assertEquals(2, a.getValue("steps"))
        assertEquals(1, a.getValue("sameNeighbours"))
        assertEquals(1, a.getValue("minGap"))
        // Tur noma'lum — hisob YO'Q (soxta foiz chiqmaydi).
        val e = sequenceAudit(listOf("a", "b"))
        assertEquals(0, e.getValue("sameNeighbours"))
        assertEquals(0, e.getValue("minGap"))
    }
}
