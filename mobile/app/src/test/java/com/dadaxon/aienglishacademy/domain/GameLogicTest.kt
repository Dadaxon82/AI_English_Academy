package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.AppData
import com.dadaxon.aienglishacademy.data.AttemptRecord
import com.dadaxon.aienglishacademy.data.BetState
import com.dadaxon.aienglishacademy.data.DayActivity
import com.dadaxon.aienglishacademy.data.GameConfig
import com.dadaxon.aienglishacademy.data.GameState
import com.dadaxon.aienglishacademy.data.LeagueRow
import com.dadaxon.aienglishacademy.data.LeagueSnapshot
import com.dadaxon.aienglishacademy.data.QuestAward
import com.dadaxon.aienglishacademy.data.SrsState
import com.dadaxon.aienglishacademy.data.TodayCounters
import com.dadaxon.aienglishacademy.data.emptyGame
import com.dadaxon.aienglishacademy.data.todayKey
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * O'yin qatlami mantig'i — yuraklar, questlar, qalqonlar, yutuqlar, do'kon,
 * garov, liga va NORMALIZATSIYA (veb `src/lib/game.ts` ning Kotlin nusxasi).
 *
 * Tarmoq, fayl va soat ishtirok ETMAYDI: barcha vaqtlar argument beriladi
 * (`now`, `today`), shuning uchun natijalar har qachon bir xil.
 */
class GameLogicTest {

    private companion object {
        const val DAY = "2026-11-07"
        const val MIN = 60_000L
        const val DAY_MS = 86_400_000L

        /** Liga haftasi boshi — poneshanba (Node: `Date.UTC(2026,10,2)`). */
        const val WEEK0 = "2026-11-02"
        const val WEEK0_MS = 1_793_577_600_000L
        const val T0 = WEEK0_MS + 3_600_000L
    }

    private fun base(day: String = DAY, now: Long = T0) =
        AppData.empty("u-1").copy(game = emptyGame(day, now))

    private fun act(day: String, seconds: Int = 120) = DayActivity(date = day, seconds = seconds)

    private fun attempt(id: String, at: Long, correct: Boolean = true, difficulty: Int = 1) = AttemptRecord(
        id = id, exerciseId = "ex-1", skill = "reading", level = "A1", correct = correct,
        partial = if (correct) 1.0 else 0.0, difficulty = difficulty, secondsSpent = 10,
        source = "grammar", answerGiven = "a", at = at,
    )

    /* --------------------------------- Yuraklar --------------------------------- */

    @Test
    fun refillAddsOneHeartPerThirtyMinutes() {
        val g = emptyGame(DAY, T0).copy(hearts = 2, heartsAt = T0)
        // 59 daqiqa → BITTA yurak; taymer qolgan 29 daqiqani keyinagiga saqlaydi.
        val r = GameLogic.refillHearts(g, T0 + 59 * MIN)
        assertEquals(3, r.hearts)
        assertEquals(T0 + 30 * MIN, r.heartsAt)
        assertEquals("keyingi yurakka 1 daqiqa qoldi", 1, GameLogic.heartMinutesLeft(r, T0 + 59 * MIN))
        // To'lganda `heartsAt`ga TEKILMAYDI.
        val full = GameLogic.refillHearts(g, T0 + 200 * MIN)
        assertEquals(GameConfig.HEARTS_MAX, full.hearts)
        assertEquals(T0 + 3 * 30 * MIN, full.heartsAt)
        assertEquals(0, GameLogic.heartMinutesLeft(full, T0 + 200 * MIN))
    }

    @Test
    fun fullHeartsAreLeftUntouched() {
        val g = emptyGame(DAY, T0)
        assertSame("to'la holatda obyekt qayta tuzilmasin", g, GameLogic.refillHearts(g, T0 + 10 * DAY_MS))
        assertEquals(0, GameLogic.heartMinutesLeft(g, T0))
        assertSame(g, GameLogic.refillHearts(g, T0 - 5 * MIN))
    }

    @Test
    fun wrongAnswerCostsOneHeartAndResetsTheTimer() {
        val next = GameLogic.afterAttempt(emptyGame(DAY, T0), correct = false, source = "grammar", xp = 1, now = T0 + 10 * MIN)
        assertEquals(4, next.hearts)
        assertEquals("jarima taymeri xatodan qayta boshlanadi", T0 + 10 * MIN, next.heartsAt)
        assertEquals(1, next.today.xp)
        assertEquals(1, next.today.attempts)
        assertEquals("noto'g'ri javob combo'ni uzadi", 0, next.combo)
    }

    @Test
    fun heartFreeSourcesNeverCostHearts() {
        for (src in GameConfig.HEART_FREE_SOURCES) {
            val next = GameLogic.afterAttempt(emptyGame(DAY, T0), false, src, 1, T0)
            assertEquals("$src manbasida yurak jarima qilmasin", GameConfig.HEARTS_MAX, next.hearts)
            assertEquals("$src — taymer ham siljimasin", T0, next.heartsAt)
        }
    }

    @Test
    fun fiveCorrectInARowReturnsOneHeart() {
        var g = emptyGame(DAY, T0).copy(hearts = 2)
        repeat(4) { i -> g = GameLogic.afterAttempt(g, true, "grammar", 8, T0 + i * 1000L) }
        assertEquals(4, g.combo)
        assertEquals(2, g.hearts)
        g = GameLogic.afterAttempt(g, true, "grammar", 8, T0 + 4000L)
        assertEquals(5, g.combo)
        assertEquals("5 ta ketma-ket to'g'ri javob bitta yurak qaytaradi", 3, g.hearts)
        assertEquals("qaytilgan yurak taymerni yangilaydi", T0 + 4000L, g.heartsAt)
        // 6-chi javob yurak QAYTARMASIN (faqat har 5 tada).
        g = GameLogic.afterAttempt(g, true, "grammar", 8, T0 + 5000L)
        assertEquals(3, g.hearts)
    }

    @Test
    fun practiceReviewsReturnAHeartOnlyWhenHeartsAreGone() {
        // Yurak bor bo'lsa takrorlar faqat kundalik hisobga yoziladi.
        val withHearts = GameLogic.afterReview(emptyGame(DAY, T0), reviewed = true, now = T0)
        assertEquals(0, withHearts.practiceReviews)
        assertEquals(GameConfig.HEARTS_MAX, withHearts.hearts)
        assertEquals(1, withHearts.today.reviews)

        // Yuraklar tugagan: 7 takror — hisob yig'iladi, yurak yo'q.
        var g = emptyGame(DAY, T0).copy(hearts = 0, heartsAt = T0)
        repeat(GameConfig.HEART_PRACTICE_REVIEWS - 1) { i -> g = GameLogic.afterReview(g, true, T0 + i) }
        assertEquals(GameConfig.HEART_PRACTICE_REVIEWS - 1, g.practiceReviews)
        assertEquals(0, g.hearts)
        assertEquals("darvoza ochilishigacha qolgan takrorlar", 1, GameLogic.practiceHeartsNeeded(g))

        // 8-chi takror — BITTA yurak, taymer shu zahoti, hisob qayta bo'sh.
        g = GameLogic.afterReview(g, true, T0 + 1000L)
        assertEquals(1, g.hearts)
        assertEquals(T0 + 1000L, g.heartsAt)
        assertEquals(0, g.practiceReviews)
    }

    @Test
    fun newWordsAreNotCountedAsReviews() {
        val g = GameLogic.afterReview(emptyGame(DAY, T0).copy(hearts = 0, heartsAt = T0), reviewed = false, now = T0)
        assertEquals(0, g.today.reviews)
        assertEquals(0, g.practiceReviews)
        assertEquals(0, g.hearts)
    }

    @Test
    fun heartsGateBlocksBelowOneHeart() {
        val data = base().copy(
            game = emptyGame(DAY, T0).copy(hearts = 0, heartsAt = T0, boostUntil = T0 + GameConfig.XP_BOOST_MINUTES * MIN),
        )
        val v = GameLogic.heartsView(data, T0)
        assertTrue("0 yurak — dars darvozasi yopiq", v.blocked)
        assertEquals(0, v.count)
        assertEquals(GameConfig.HEARTS_MAX, v.max)
        assertEquals(GameConfig.HEART_PRACTICE_REVIEWS, v.practiceNeeded)
        assertTrue(v.boostActive)
        assertEquals(GameConfig.XP_BOOST_MINUTES, v.boostMinutesLeft)
        assertTrue(GameLogic.heartsBlocked(data.game, data, T0))

        // Sozlamada o'chirilgan bo'lsa darvoza YO'Q (foydalanuvchi tanlovi).
        val off = data.copy(settings = data.settings.copy(heartsEnabled = false))
        assertFalse("yuraklar o'chirilgan — darvoza yo'q", GameLogic.heartsView(off, T0).blocked)
        assertFalse(GameLogic.heartsBlocked(off.game, off, T0))
        assertFalse(GameLogic.heartsEnabled(off))
    }

    @Test
    fun boostDoublesXpUntilItExpires() {
        val g = emptyGame(DAY, T0).copy(boostUntil = T0 + GameConfig.XP_BOOST_MINUTES * MIN)
        assertTrue(GameLogic.boostActive(g, T0))
        assertEquals(16, GameLogic.xpGain(g, correct = true, difficulty = 1, now = T0))
        assertEquals(2, GameLogic.xpGain(g, correct = false, difficulty = 1, now = T0))
        assertEquals(GameConfig.XP_BOOST_MINUTES, GameLogic.boostMinutesLeft(g, T0))
        assertFalse(GameLogic.boostActive(g, T0 + GameConfig.XP_BOOST_MINUTES * MIN))
        assertEquals(8, GameLogic.xpGain(g, correct = true, difficulty = 1, now = T0 + GameConfig.XP_BOOST_MINUTES * MIN))
        assertEquals(0, GameLogic.boostMinutesLeft(g, T0 + GameConfig.XP_BOOST_MINUTES * MIN))
    }

    /* --------------------------------- Questlar --------------------------------- */

    @Test
    fun questsComeFromRealCountersOnly() {
        val quests = GameLogic.questsForDay(DAY)
        val data = base().copy(
            game = emptyGame(DAY, T0).copy(
                today = TodayCounters(day = DAY, xp = 300, attempts = 5, reviews = 2, perfectLessons = 3),
            ),
            activity = mapOf(
                DAY to DayActivity(
                    date = DAY, seconds = 600, attempts = 5,
                    skills = mapOf("listening" to 200, "speaking" to 60),
                ),
            ),
        )
        val views = GameLogic.questView(data)
        assertEquals("ekrandagi tartib kun tanlovi bilan bir xil", quests.map { it.id }, views.map { it.quest.id })
        for (p in views) {
            val want = when (p.quest.kind) {
                "xp" -> 300
                "attempts" -> 5
                "reviews" -> 2
                "perfect_lesson" -> 3
                "minutes" -> 600
                "listening" -> 200
                else -> 60
            }
            assertEquals("${p.quest.id} — hisob noto'g'ri manbadan olingan", want, p.value)
            assertEquals(p.quest.target, p.target)
            assertEquals("bajarilgan = yetgan", want >= p.target, p.done)
            assertFalse(p.claimed)
        }
    }

    @Test
    fun settleQuestsIsIdempotent() {
        val data = base().copy(
            game = emptyGame(DAY, T0).copy(
                today = TodayCounters(day = DAY, xp = 500, attempts = 30, reviews = 30, perfectLessons = 5),
            ),
            activity = mapOf(
                DAY to DayActivity(
                    date = DAY, seconds = 3600,
                    skills = mapOf("listening" to 900, "speaking" to 900),
                ),
            ),
        )
        // Bugungi tanlov — `GameConfigTest.questsForDayPinTable` dagi jadval:
        // q-lis-180, q-perf-1, q-xp-300. Yuqoridagi hisob UCHTASINI ham bosadi.
        val once = GameLogic.settleQuests(data, T0)
        val ids = once.game.questsDone.map { it.id }
        assertEquals("bir xil quest ikki marta berilmasin", ids.size, ids.toSet().size)
        assertEquals(
            "yetgan har bir quest beriladi",
            listOf("q-lis-180", "q-perf-1", "q-xp-300"),
            ids,
        )
        assertEquals(ids.size * GameConfig.QUEST_GEM_REWARD, once.game.gems)
        assertEquals(ids.size, once.game.questsTotal)

        val twice = GameLogic.settleQuests(once, T0 + 60_000L)
        assertSame("qayta chaqiruvda gem qo'shilmasin", once, twice)

        // Hech narsa yetmagan — holat O'ZGARMAYDI.
        val poor = base()
        assertSame(poor, GameLogic.settleQuests(poor, T0))
    }

    @Test
    fun unmetQuestsAreNotClaimed() {
        // Bugungi tanlov — q-lis-180, q-perf-1, q-xp-300. XP=100 UCHTASIGA ham
        // yetmaydi: BIRTA ham berilmasligi kerak (qisman bonus ixtir qilinmaydi).
        val data = base().copy(game = emptyGame(DAY, T0).copy(today = TodayCounters(day = DAY, xp = 100)))
        assertSame(data, GameLogic.settleQuests(data, T0))
        val views = GameLogic.questView(data)
        assertEquals(3, views.size)
        assertTrue(views.none { it.done })
        // `q-xp-300` esa yetadi — shundagina beriladi.
        val enough = data.copy(game = data.game.copy(today = data.game.today.copy(xp = 300)))
        assertEquals(listOf("q-xp-300"), GameLogic.settleQuests(enough, T0).game.questsDone.map { it.id })
    }

    @Test
    fun freshDayResetsQuestsAndCombo() {
        val yesterday = GameLogic.shiftDay(DAY, -1L)
        val g = emptyGame(yesterday, T0).copy(
            today = TodayCounters(day = yesterday, xp = 50, attempts = 4),
            questsDay = yesterday,
            questsDone = listOf(QuestAward("q-xp-100", T0)),
            questsTotal = 4,
            combo = 7,
        )
        assertEquals(g, GameLogic.ensureFreshDay(g, yesterday))
        val next = GameLogic.ensureFreshDay(g, DAY)
        assertEquals(DAY, next.today.day)
        assertEquals(0, next.today.attempts)
        assertEquals(DAY, next.questsDay)
        assertTrue(next.questsDone.isEmpty())
        assertEquals(0, next.combo)
        assertEquals("kechagi JAMI hisob saqlanadi", 4, next.questsTotal)
    }

    /* --------------------------- Dars bonusi va haftalik sandiq --------------------------- */

    @Test
    fun lessonBonusRequiresEnoughExercises() {
        val d = base()
        val short = GameLogic.lessonComplete(d, exercises = 2, mistakes = 0)
        assertEquals("3 ta mashqdan kamida bonus yo'q", d, short)
        assertEquals(0, short.game.perfectLessonsTotal)

        val ok = GameLogic.lessonComplete(d, exercises = 3, mistakes = 1)
        assertEquals(GameConfig.LESSON_BONUS_XP, ok.xp - d.xp)
        assertEquals(GameConfig.LESSON_BONUS_XP, ok.game.today.xp)
        assertEquals("xato bilan xatosiz hisoblanmaydi", 0, ok.game.perfectLessonsTotal)
        assertEquals(0, ok.game.today.perfectLessons)

        val perfect = GameLogic.lessonComplete(d, exercises = 5, mistakes = 0)
        assertEquals(GameConfig.LESSON_BONUS_XP + GameConfig.PERFECT_LESSON_BONUS_XP, perfect.xp - d.xp)
        assertEquals(1, perfect.game.perfectLessonsTotal)
        assertEquals(1, perfect.game.today.perfectLessons)
    }

    @Test
    fun weeklyChestOpensOnceWithFourActiveDays() {
        val week = GameLogic.weekStartOf(DAY)
        val d = base()
        assertSame("faol kun yo'q — sandiq ochilmaydi", d, GameLogic.settleChest(d))

        val three = listOf("2026-11-02", "2026-11-03", "2026-11-04").associateWith { act(it) }
        val threeData = d.copy(activity = three)
        assertSame("uch faol kun yetmaydi", threeData, GameLogic.settleChest(threeData))

        val days = (0 until GameConfig.CHEST_MIN_ACTIVE_DAYS).map { GameLogic.shiftDay(week, it.toLong()) }
        val four = d.copy(activity = days.associateWith { act(it) })
        val won = GameLogic.settleChest(four)
        assertEquals(GameConfig.CHEST_GEM_REWARD, won.game.gems)
        assertEquals(listOf(week), won.game.chestsWeeks)
        assertSame("haftalik sandiq takror ochilmaydi", won, GameLogic.settleChest(won))

        // 59 sekund — faol kun HISOBLANMAYDI (veb bilan bir xil chegara).
        val weak = d.copy(activity = days.associateWith { act(it, seconds = 59) })
        assertSame(weak, GameLogic.settleChest(weak))
        // Urinish bo'lsa sekund yetishmasa ham faol.
        val byAttempts = d.copy(activity = days.associateWith { DayActivity(date = it, seconds = 10, attempts = 1) })
        assertEquals(GameConfig.CHEST_GEM_REWARD, GameLogic.settleChest(byAttempts).game.gems)
    }

    /* ------------------------------- Qalqonlar (freeze) ------------------------------- */

    @Test
    fun freezeCoversOneGapDay() {
        val d = base().copy(
            game = emptyGame(DAY, T0).copy(freezes = 1),
            activity = listOf(DAY, "2026-11-05", "2026-11-04").associateWith { act(it) },
        )
        assertEquals("zanjir uzilgan kun bilan to'xtaydi", 1, GameLogic.streakWithFreezes(d, DAY))
        val out = GameLogic.applyFreezes(d, DAY)
        assertEquals("uzilgan kun aniq o'zi qoplanadi", listOf("2026-11-06"), out.game.frozenDays)
        assertEquals("qalqon ombordan sarflandi", 0, out.game.freezes)
        assertEquals("qoplangan kun zanjirni uzmaydi", 4, GameLogic.streakWithFreezes(out, DAY))
    }

    @Test
    fun longGapIsCoveredOneFreezePerCall() {
        val d = base().copy(
            game = emptyGame(DAY, T0).copy(freezes = 2),
            activity = listOf(DAY, "2026-10-28").associateWith { act(it) },
        )
        val out1 = GameLogic.applyFreezes(d, DAY)
        assertEquals(listOf("2026-11-06"), out1.game.frozenDays)
        val out2 = GameLogic.applyFreezes(out1, DAY)
        assertEquals(listOf("2026-11-06", "2026-11-05"), out2.game.frozenDays)
        assertEquals(0, out2.game.freezes)
        assertEquals("qoplangan ikki kun zanjirga qo'shiladi", 3, GameLogic.streakWithFreezes(out2, DAY))
        // Izlash oynasi ombordagi sondan KAT'iy bog'liq emas (veb izohi).
        assertTrue(GameConfig.FREEZE_SEARCH_DAYS > GameConfig.MAX_FREEZES)
        // Ombor bo'sh — qalqon qo'yilmaydi.
        assertSame(out2, GameLogic.applyFreezes(out2, DAY))
    }

    @Test
    fun newLearnerDoesNotBurnAFreeze() {
        val d = base().copy(
            game = emptyGame(DAY, T0).copy(freezes = GameConfig.MAX_FREEZES),
            activity = mapOf(DAY to act(DAY)),
        )
        assertSame("yangi o'quvchida qalqon sarflanmaydi", d, GameLogic.applyFreezes(d, DAY))
        assertEquals(GameConfig.MAX_FREEZES, d.game.freezes)
    }

    @Test
    fun unbrokenStreakNeedsNoFreeze() {
        val days = (0..GameConfig.FREEZE_SEARCH_DAYS).map { GameLogic.shiftDay(DAY, -it.toLong()) }
        val d = base().copy(
            game = emptyGame(DAY, T0).copy(freezes = GameConfig.MAX_FREEZES),
            activity = days.associateWith { act(it) },
        )
        assertEquals(days.size, GameLogic.streakWithFreezes(d, DAY))
        assertSame("bo'sh kun yo'q — qalqon kerak emas", d, GameLogic.applyFreezes(d, DAY))
    }

    @Test
    fun gapAnchoredBeyondTheSearchWindowIsIgnored() {
        // Uzilishdan ORTDA faol kun `FREEZE_SEARCH_DAYS + 1` dan ham chuqurda
        // bo'lsa qalqon sarflanmaydi (zanjir qachon uzilgani noma'lum).
        val tooFar = GameLogic.shiftDay(DAY, -(GameConfig.FREEZE_SEARCH_DAYS + 2L))
        val d = base().copy(
            game = emptyGame(DAY, T0).copy(freezes = GameConfig.MAX_FREEZES),
            activity = listOf(DAY, tooFar).associateWith { act(it) },
        )
        assertSame("uzilish Joylashuvi oyna tashqarisida — sarflanmaydi", d, GameLogic.applyFreezes(d, DAY))
        // Oyna CHERRASI: aynan `FREEZE_SEARCH_DAYS + 1` kun ortdagi faol kun topiladi.
        val edge = GameLogic.shiftDay(DAY, -(GameConfig.FREEZE_SEARCH_DAYS + 1L))
        val atEdge = d.copy(activity = listOf(DAY, edge).associateWith { act(it) })
        val covered = GameLogic.applyFreezes(atEdge, DAY)
        assertEquals(listOf(GameLogic.shiftDay(DAY, -1L)), covered.game.frozenDays)
    }

    /* ---------------------------------- Yutuqlar ---------------------------------- */

    @Test
    fun achievementsReallyAwardBadgesGemsAndFreezes() {
        val d = base().copy(
            xp = 1200,
            // 90 urinish — `a-practise` (100 chegarasi) BOSHPASIN: bu test faqat
            // zanjir va XP yutuqlarini sanaydi.
            attempts = (1..90).map { attempt("a$it", T0 + it) },
        )
        assertTrue(d.badges.isEmpty())
        val out = GameLogic.settleAchievements(d, streakDays = 8, now = T0)
        // `a-wildfire` (3, 7 → 2 daraja) + `a-scholar` (1000 → 1 daraja).
        assertEquals(3, out.badges.size)
        assertEquals(
            "nishon id'lari daraja tartibida", listOf("a-wildfire-1", "a-wildfire-2", "a-scholar-1"),
            out.badges.map { it.id },
        )
        assertTrue(out.badges[0].titleUz.contains("1-daraja"))
        assertEquals(T0, out.badges[0].at)
        assertEquals(3 * GameConfig.ACHIEVEMENTS[0].gemReward, out.game.gems)
        // Zanjir 7 bosqichi BITTA qalqon beradi (3 bosqichi bermaydi).
        assertEquals(1, out.game.freezes)
        assertEquals(mapOf("a-wildfire" to 2, "a-scholar" to 1), out.game.achievementLevels)
        // Takror chaqiruv — yangi nishon yo'q.
        assertSame("berilgan daraja qayta berilmaydi", out, GameLogic.settleAchievements(out, 8, T0 + 1000))
    }

    @Test
    fun freezeRewardsAreCappedAndMilestonesAreSourced() {
        val d = base().copy(game = emptyGame(DAY, T0).copy(freezes = GameConfig.MAX_FREEZES))
        val out = GameLogic.settleAchievements(d, streakDays = 400, now = T0)
        assertEquals("ombordagi chegaradan oshmasin", GameConfig.MAX_FREEZES, out.game.freezes)
        // Bosqichlar Duolingo manbasidan (manifestda `freezeMilestonesSource`).
        assertEquals(mapOf(7 to 1, 30 to 1, 90 to 2, 365 to 2), GameConfig.FREEZE_MILESTONES)
        assertEquals(6, GameConfig.ACHIEVEMENTS.size)
        assertEquals(6, GameConfig.ACHIEVEMENT_COUNT)
    }

    @Test
    fun achievementMetricsComeFromData() {
        val d = base().copy(
            xp = 1000,
            attempts = (1..5).map { attempt("a$it", T0 + it) },
            srs = mapOf(
                "w1" to SrsState(learnedAt = T0),
                "w2" to SrsState(learnedAt = null),
                "w3" to SrsState(),
            ),
            activity = mapOf(DAY to DayActivity(date = DAY, seconds = 125)),
            game = emptyGame(DAY, T0).copy(perfectLessonsTotal = 3),
        )
        assertEquals(1000, GameLogic.achievementValue(d, "xp_total", 4))
        assertEquals(4, GameLogic.achievementValue(d, "streak_days", 4))
        assertEquals("faqat o'zlashtirilgan so'zlar sanaladi", 1, GameLogic.achievementValue(d, "words_learned", 0))
        assertEquals(5, GameLogic.achievementValue(d, "attempts_total", 0))
        assertEquals("125 sekund = 2 daqiqa", 2, GameLogic.achievementValue(d, "minutes_total", 0))
        assertEquals(3, GameLogic.achievementValue(d, "lessons_perfect", 0))
        assertEquals("noma'lum mezon — 0 (ixtir yo'q)", 0, GameLogic.achievementValue(d, "xabada", 0))
    }

    @Test
    fun achievementLevelsAndViewsAreHonest() {
        val wild = GameConfig.ACHIEVEMENTS.first { it.id == "a-wildfire" }
        // `levelFor` — ENG OXIRGI bosiqdan o'tilgan chegaralar sanog'i:
        // [3,7,14,30,90,365] da 30 ga yetgan = 4 daraja (3,7,14,30).
        assertEquals(0, GameLogic.levelFor(wild, 2))
        assertEquals(1, GameLogic.levelFor(wild, 3))
        assertEquals(2, GameLogic.levelFor(wild, 13))
        assertEquals(4, GameLogic.levelFor(wild, 30))
        assertEquals(wild.levels.size, GameLogic.levelFor(wild, 100_000))
        val views = GameLogic.achievementViews(base().copy(xp = 600), streakDays = 5)
        assertEquals(GameConfig.ACHIEVEMENT_COUNT, views.size)
        for (v in views) {
            assertTrue("${v.spec.id} nisbat 0..1 dan chiqmasin", v.ratio in 0.0..1.0)
            if (v.level < v.spec.levels.size) {
                assertEquals(v.spec.levels[v.level], v.nextTarget)
            } else {
                assertNull("eng yuqori darajada keyingi maqsad yo'q", v.nextTarget)
                assertEquals(1.0, v.ratio, 0.0)
            }
        }
    }

    @Test
    fun dailyGoalRewardsOncePerDay() {
        val d = base().copy(settings = base().settings.copy(xpGoalXp = 50))
        val v = GameLogic.goalView(d)
        assertEquals(50, v.target)
        assertEquals(50, v.left)
        assertFalse(v.reached)
        assertSame(d, GameLogic.settleGoal(d))

        val reached = d.copy(game = d.game.copy(today = TodayCounters(day = DAY, xp = 50)))
        assertEquals(1.0, GameLogic.goalView(reached).ratio, 0.0)
        assertEquals(0, GameLogic.goalView(reached).left)
        val out = GameLogic.settleGoal(reached)
        assertEquals(GameConfig.GOAL_GEM_REWARD, out.game.gems)
        assertEquals(DAY, out.game.goalRewardedDay)
        assertSame("kuniga bir marta", out, GameLogic.settleGoal(out))

        // Ertasi kunda qayta beriladi.
        val tomorrow = "2026-11-08"
        val next = out.copy(
            game = out.game.copy(today = TodayCounters(day = tomorrow, xp = 60), questsDay = tomorrow),
        )
        assertEquals(out.game.gems + GameConfig.GOAL_GEM_REWARD, GameLogic.settleGoal(next).game.gems)
    }

    /* ----------------------------------- Do'kon ----------------------------------- */

    @Test
    fun shopReasonsAreExplicit() {
        val poor = base()
        val bad = GameLogic.buy(poor, "heart", T0)
        assertFalse(bad.ok)
        assertTrue(bad.reasonUz!!.contains("Gem yetmadi"))
        assertSame("muvaffaqiyatsiz xaridda holat o'zgarmasin", poor, bad.data)

        // Fabulka YARIM yurak bilan: `heart` sotib olinadi (to'la holat quyida).
        val rich = base().copy(game = emptyGame(DAY, T0).copy(gems = 5000, hearts = 3))
        val heart = GameLogic.buy(rich, "heart", T0)
        assertTrue(heart.ok)
        assertEquals(4, heart.data.game.hearts)
        assertEquals(rich.game.gems - GameConfig.priceOf("heart"), heart.data.game.gems)
        assertNull(heart.reasonUz)

        val fullHearts = rich.copy(game = rich.game.copy(hearts = GameConfig.HEARTS_MAX))
        val full = GameLogic.buy(fullHearts, "refill", T0)
        assertFalse("yuraklar to'la — sabab ochiq aytiladi", full.ok)
        assertTrue(full.reasonUz!!.contains("to‘la"))
        assertSame(full.data, fullHearts)

        val low = rich.copy(game = rich.game.copy(hearts = 2, heartsAt = T0 - 10 * MIN, practiceReviews = 3))
        val bought = GameLogic.buy(low, "heart", T0)
        assertTrue(bought.ok)
        assertEquals(3, bought.data.game.hearts)
        assertEquals("sotib olingan yurak taymerni qayta boshlamasin", low.game.heartsAt, bought.data.game.heartsAt)
        assertEquals("takrorlash hisobi ham o'zgarmasin", low.game.practiceReviews, bought.data.game.practiceReviews)

        val refilled = GameLogic.buy(low, "refill", T0 + 42L)
        assertTrue(refilled.ok)
        assertEquals(GameConfig.HEARTS_MAX, refilled.data.game.hearts)
        assertEquals(T0 + 42L, refilled.data.game.heartsAt)
        assertEquals(0, refilled.data.game.practiceReviews)
        assertEquals(low.game.gems - GameConfig.priceOf("refill"), refilled.data.game.gems)
    }

    @Test
    fun shopLimitsFreezesAndBoost() {
        val rich = base().copy(game = emptyGame(DAY, T0).copy(gems = 5000))
        assertEquals(1, GameLogic.buy(rich, "freeze", T0).data.game.freezes)
        val capped = rich.copy(game = rich.game.copy(freezes = GameConfig.MAX_FREEZES))
        assertFalse("ombor to'la", GameLogic.buy(capped, "freeze", T0).ok)
        val boosted = GameLogic.buy(rich, "xpBoost", T0)
        assertTrue(boosted.ok)
        assertEquals(T0 + GameConfig.XP_BOOST_MINUTES * MIN, boosted.data.game.boostUntil)
        val again = GameLogic.buy(boosted.data, "xpBoost", T0)
        assertFalse(again.ok)
        assertTrue(again.reasonUz!!.contains("Byust allaqachon faol"))
        assertEquals(0, GameLogic.priceOf("noma'lum"))
        assertEquals(listOf("refill", "heart", "freeze", "xpBoost"), GameLogic.SHOP_ITEMS.map { it.id })
    }

    @Test
    fun betIsWonOnlyWithBothConditions() {
        val rich = base().copy(game = emptyGame(DAY, T0).copy(gems = 500))
        val placed = GameLogic.placeBet(rich, streakDays = 3)
        assertTrue(placed.ok)
        assertEquals(500 - GameConfig.BET_COST_GEMS, placed.data.game.gems)
        assertEquals(BetState(DAY, 3, GameConfig.BET_COST_GEMS), placed.data.game.bet)
        assertFalse("garov allaqachon ochiq", GameLogic.placeBet(placed.data, 3).ok)
        val poor = rich.copy(game = rich.game.copy(gems = GameConfig.BET_COST_GEMS - 1))
        assertFalse(GameLogic.placeBet(poor, 1).ok)
        assertTrue(GameLogic.placeBet(poor, 1).reasonUz!!.contains("gem kerak"))

        val weekLater = "2026-11-14"
        assertSame(
            "hali ${GameConfig.BET_DAYS} kun bo'lmadi", placed.data,
            GameLogic.settleBet(placed.data, streakDays = 99),
        )

        val ended = placed.data.copy(game = placed.data.game.copy(today = TodayCounters(day = weekLater)))
        val lost = GameLogic.settleBet(ended, streakDays = 5)
        assertNull(lost.game.bet)
        assertEquals("shart bajarilmadi — gem qaytmaydi", placed.data.game.gems, lost.game.gems)
        val won = GameLogic.settleBet(ended, streakDays = 3 + GameConfig.BET_STREAK_DAYS)
        assertEquals(placed.data.game.gems + GameConfig.BET_WIN_GEMS, won.game.gems)
        assertSame("garov yopilgach qayta hisoblanmaydi", won, GameLogic.settleBet(won, 999))
    }

    /* ---------------------------- Haftalik XP va liga ---------------------------- */

    @Test
    fun weeklyXpSumsOnlyAttemptsInsideTheWeek() {
        val data = base().copy(
            attempts = listOf(
                attempt("a1", WEEK0_MS, correct = true, difficulty = 1),
                attempt("a2", WEEK0_MS + 6 * DAY_MS, correct = true, difficulty = 2),
                attempt("a3", WEEK0_MS + 7 * DAY_MS, correct = true, difficulty = 5), // tashqarida
                attempt("a4", WEEK0_MS - 1, correct = true, difficulty = 5), // tashqarida
                attempt("a5", WEEK0_MS + 1000, correct = false, difficulty = 3),
            ),
        )
        val week = GameLogic.weekStartOf(DAY)
        assertEquals(WEEK0, week)
        val expected = xpForAttempt(true, 1, true) + xpForAttempt(true, 2, true) + xpForAttempt(false, 3, true)
        assertEquals(expected, GameLogic.weeklyXp(data, week))
        assertTrue(expected > 0)

        val lw = GameLogic.leagueWeek(data, DAY)
        assertEquals(week, lw.weekStart)
        assertEquals("liga XP'si faqat urinishlardan", expected, lw.xp)
        assertEquals(GameConfig.leagueFor(expected).id, lw.leagueId)
        assertEquals("hafta davomida liga barqaror", lw.leagueId, GameLogic.leagueWeek(data, "2026-11-03").leagueId)
        assertEquals(0, GameLogic.weeklyXp(base(), week))
    }

    @Test
    fun promotionUsesTheTableAndNeverDemotes() {
        // Tartib: b (300), c (200), u-1 (100) → bizning o'rin 3.
        val entries = snapEntries(top = 300, mid = 200, mine = 100)
        assertEquals(1, GameLogic.rankOf(entries, "b"))
        assertEquals(3, GameLogic.rankOf(entries, "u-1"))
        assertEquals("jadvalda biz yo'q — o'rin ixtir qilinmaydi", 0, GameLogic.rankOf(entries, "begona"))
        assertEquals(0, GameLogic.rankOf(emptyList(), "u-1"))

        val promoted = LeagueSnapshot(LAST_WEEK, "bronze", rank = 0, boardSize = 30, at = T0, entries = entries, prizeClaimed = true)
        assertEquals("bronze → silver", "silver", GameLogic.promotedLeague(promoted, "u-1"))

        // `promoteTop` chegarasidan tashqarida — liga O'ZGARMAYDI (obsidian: 5).
        val obsidian = LeagueSnapshot(LAST_WEEK, "obsidian", rank = 6, boardSize = 30, at = T0, entries = entries, prizeClaimed = true)
        assertEquals("chegaradan tashqarida — o'zgarmaydi", "obsidian", GameLogic.promotedLeague(obsidian, "u-1"))
        assertEquals(
            "pastki o'rin pasaytirilmaydi (manbada qoida topilmadi)",
            "diamond",
            GameLogic.promotedLeague(
                LeagueSnapshot(LAST_WEEK, "diamond", rank = 30, boardSize = 30, at = T0, entries = entries, prizeClaimed = true),
                "u-1",
            ),
        )
        assertEquals(10, GameConfig.leagueById("gold").promoteTop)
        assertEquals(
            "gold → sapphire", "sapphire",
            GameLogic.promotedLeague(
                LeagueSnapshot(LAST_WEEK, "gold", rank = 10, boardSize = 30, at = T0, entries = entries, prizeClaimed = true),
                "u-1",
            ),
        )

        // Snapshot HALI davom etayotgan haftaga tegishli bo'lsa — o'sha liga.
        val current = base().copy(game = emptyGame(DAY, T0).copy(league = promoted.copy(weekStart = WEEK0)))
        assertEquals(WEEK0, GameLogic.leagueWeek(current, DAY).weekStart)
        assertEquals("bronze", GameLogic.leagueWeek(current, DAY).leagueId)
        // Snapshot eski hafta — ko'tarilish qoidasi ishlaydi.
        val old = base().copy(game = emptyGame(DAY, T0).copy(league = promoted))
        assertEquals("silver", GameLogic.leagueWeek(old, DAY).leagueId)
        // Snapshot yo'q — XP chegarasiga qarab.
        assertEquals("bronze", GameLogic.leagueWeek(base(), DAY).leagueId)
        // Keyingi haftada ham snapshot eski → ko'tarilish saqlanadi.
        assertEquals("silver", GameLogic.leagueWeek(old, "2026-11-09").leagueId)
    }

    private val LAST_WEEK = "2026-10-26"

    private fun snapEntries(top: Int, mid: Int, mine: Int) = listOf(
        LeagueRow("b", "B", top),
        LeagueRow("c", "C", mid),
        LeagueRow("u-1", "Men", mine),
    )

    @Test
    fun leaguePrizeIsHonestAboutTheBoard() {
        val snap = LeagueSnapshot(
            weekStart = LAST_WEEK, leagueId = "bronze", rank = 0, boardSize = 30, at = T0,
            entries = listOf(LeagueRow("u-1", "Men", 300), LeagueRow("b", "B", 200)),
            prizeClaimed = false,
        )
        val d = base().copy(game = emptyGame(DAY, T0).copy(league = snap))
        val out = GameLogic.settleLeaguePrize(d)
        assertEquals(GameConfig.LEAGUE_PRIZE_GEMS[0], out.game.gems)
        assertTrue(out.game.league!!.prizeClaimed)
        assertSame("sovg'a bir marta", out, GameLogic.settleLeaguePrize(out))

        // 2-o'rin — boshqa summa.
        val second = d.copy(
            game = d.game.copy(league = snap.copy(entries = listOf(LeagueRow("b", "B", 999), LeagueRow("u-1", "Men", 300)))),
        )
        assertEquals(GameConfig.LEAGUE_PRIZE_GEMS[1], GameLogic.settleLeaguePrize(second).game.gems)

        val absent = d.copy(game = d.game.copy(league = snap.copy(entries = listOf(LeagueRow("b", "B", 1)))))
        val marked = GameLogic.settleLeaguePrize(absent)
        assertEquals("o'rin noma'lum — gem YO'Q", 0, marked.game.gems)
        assertTrue("lekin qayta tekshirilmasin deb belgilanadi", marked.game.league!!.prizeClaimed)

        // Hali davom etayotgan hafta (soatga bog'liq emas — o'sha hafta o'zi olinadi).
        val ongoing = d.copy(game = d.game.copy(league = snap.copy(weekStart = GameLogic.weekStartOf(todayKey()))))
        assertSame("hafta hali davom etmoqda", ongoing, GameLogic.settleLeaguePrize(ongoing))
        val noLeague = base()
        assertSame("liga snapshoti yo'q — holat o'zgarmasin", noLeague, GameLogic.settleLeaguePrize(noLeague))
        assertEquals(listOf(100, 50, 30), GameConfig.LEAGUE_PRIZE_GEMS)
    }

    /* ------------------------------ Yig'uvchi (settle) ------------------------------ */

    @Test
    fun settleIsIdempotentAndReturnsTheSameObjectWhenNothingChanged() {
        val d = base()
        val a = GameLogic.settle(d, T0, DAY)
        assertSame("hech narsa o'zgarmadi — saidan bir xil obyekt qaytadi", d, a)
        assertSame(a, GameLogic.settle(a, T0, DAY))

        // Maqsadga yetgan kun — gem beriladi, keyin jim.
        val rich = d.copy(settings = d.settings.copy(xpGoalXp = 50))
        val earned = rich.copy(game = rich.game.copy(today = TodayCounters(day = DAY, xp = 60)))
        val s1 = GameLogic.settle(earned, T0, DAY)
        assertEquals(GameConfig.GOAL_GEM_REWARD, s1.game.gems)
        assertSame(s1, GameLogic.settle(s1, T0, DAY))
    }

    @Test
    fun settleResetsTheDayAndRefillsHearts() {
        val yesterday = GameLogic.shiftDay(DAY, -1L)
        val d = base(yesterday, T0).copy(
            game = emptyGame(yesterday, T0).copy(
                hearts = 1, heartsAt = T0,
                today = TodayCounters(day = yesterday, xp = 40, attempts = 3),
                combo = 4, questsDone = listOf(QuestAward("q-xp-100", T0)),
            ),
        )
        val out = GameLogic.settle(d, T0 + DAY_MS, DAY)
        assertEquals(DAY, out.game.today.day)
        assertEquals(0, out.game.today.attempts)
        assertEquals(0, out.game.combo)
        assertTrue(out.game.questsDone.isEmpty())
        assertTrue("vaqt o'tgani bilan yuraklar tiklandi", out.game.hearts > d.game.hearts)
    }

    @Test
    fun settleRunsEveryRewardAtOnce() {
        val rich = base().copy(
            xp = 1200,
            settings = base().settings.copy(xpGoalXp = 50),
            activity = listOf("2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", DAY)
                .associateWith {
                    if (it == DAY) {
                        DayActivity(date = DAY, seconds = 3000, skills = mapOf("listening" to 900, "speaking" to 900))
                    } else act(it)
                },
            game = emptyGame(DAY, T0).copy(
                today = TodayCounters(day = DAY, xp = 500, attempts = 30, reviews = 30, perfectLessons = 5),
                freezes = 1,
            ),
        )
        val out = GameLogic.settle(rich, T0, DAY)
        assertEquals(3, out.game.questsDone.size)
        assertEquals(DAY, out.game.goalRewardedDay)
        assertEquals(listOf(WEEK0), out.game.chestsWeeks)
        assertEquals(listOf("2026-11-06"), out.game.frozenDays)
        // Yutuqlar: zanjir (qoplangan 6 kun → 3 bosqichi) va 1200 XP.
        assertEquals(listOf("a-wildfire-1", "a-scholar-1"), out.badges.map { it.id })
        assertEquals(
            "quest 3×10 + maqsad 10 + sandiq 50 + yutuq 2×25",
            3 * GameConfig.QUEST_GEM_REWARD + GameConfig.GOAL_GEM_REWARD + GameConfig.CHEST_GEM_REWARD +
                2 * GameConfig.ACHIEVEMENTS[0].gemReward,
            out.game.gems,
        )
        assertSame(out, GameLogic.settle(out, T0 + 1000, DAY))
    }

    /* ------------------------------ Normalizatsiya ------------------------------ */

    @Test
    fun normalizeRepairsNumbersAndLeague() {
        val g = GameLogic.normalizeGame(
            GameState(
                hearts = 99, gems = -5, freezes = 9, practiceReviews = -3, combo = -4,
                perfectLessonsTotal = -7, questsTotal = -2, heartsAt = 0L,
                bet = BetState("", 3, 50),
                frozenDays = listOf("2026-11-05", ""),
                today = TodayCounters(day = ""),
                questsDay = "",
                questsDone = listOf(QuestAward("", T0)),
                chestsWeeks = listOf(WEEK0, ""),
                league = LeagueSnapshot(
                    weekStart = "", leagueId = "platina", rank = -3, boardSize = 0, at = T0,
                    entries = listOf(LeagueRow("a", "B", 10)),
                ),
            ),
            DAY, T0,
        )
        assertEquals(GameConfig.HEARTS_MAX, g.hearts)
        assertEquals(0, g.gems)
        assertEquals(GameConfig.MAX_FREEZES, g.freezes)
        assertEquals(0, g.practiceReviews)
        assertEquals(0, g.combo)
        assertEquals(0, g.perfectLessonsTotal)
        assertEquals(0, g.questsTotal)
        assertEquals("heartsAt=0 — maydon yo'q, hozirgi vaqt qo'yiladi", T0, g.heartsAt)
        assertNull("startDay bo'sh — garov yo'q", g.bet)
        assertEquals(listOf("2026-11-05"), g.frozenDays)
        assertEquals(DAY, g.today.day)
        assertEquals(DAY, g.questsDay)
        assertTrue(g.questsDone.isEmpty())
        assertEquals(listOf(WEEK0), g.chestsWeeks)
        val l = g.league!!
        assertEquals("begona liga id'si eng pastgisiga qaytadi", "bronze", l.leagueId)
        assertEquals(WEEK0, l.weekStart)
        assertEquals(0, l.rank)
        assertEquals(GameConfig.LEAGUE_BOARD_SIZE, l.boardSize)
        assertEquals(listOf("a"), l.entries.map { it.userId })

        // Yaroqli qiymatlar SAQLANADI.
        val keep = GameLogic.normalizeGame(GameState(hearts = 3, heartsAt = T0 + 5, gems = 7), DAY, T0)
        assertEquals(3, keep.hearts)
        assertEquals(T0 + 5, keep.heartsAt)
        assertEquals(7, keep.gems)
        val none = GameLogic.normalizeGame(null, DAY, T0)
        assertEquals(GameConfig.HEARTS_MAX, none.hearts)
        assertEquals(T0, none.heartsAt)
        assertEquals(DAY, none.today.day)
    }

    @Test
    fun normalizeGameJsonRepairsForeignTypes() {
        val raw = JsonParser.parseString(
            """
            {"hearts":4,"gems":"ko'p","heartsAt":0,"today":{"day":5,"xp":250.7},
             "questsDay":null,"league":{"weekStart":5,"leagueId":"platina",
             "entries":[{"userId":"a"},{"userId":7,"name":3,"xp":"10"},{"userId":"c","xp":-4}]},
             "bet":{"gems":0,"startDay":"2026-11-01","streakAtStart":-2},
             "chestsWeeks":["2026-11-02",5,{"x":1}],
             "achievementLevels":{"a-scholar":"2","a-wildfire":9.7}}
            """.trimIndent(),
        ).asJsonObject
        val g = GameLogic.normalizeGameJson(raw, DAY, T0)

        assertEquals(4, g.hearts)
        assertEquals("son bo'lmagan gem — standart", 0, g.gems)
        assertEquals(T0, g.heartsAt)
        assertEquals("son bo'lgan sana tiklanadi", DAY, g.today.day)
        assertEquals("maydon butun songa qaytariladi", 250, g.today.xp)
        assertEquals(DAY, g.questsDay)
        val l = g.league!!
        assertEquals("begona liga → eng pastgisi", "bronze", l.leagueId)
        assertEquals("son bo'lgan hafta boshi tiklanadi", WEEK0, l.weekStart)
        assertEquals("userId son — qator tashlanadi", 2, l.entries.size)
        assertEquals(listOf("a", "c"), l.entries.map { it.userId })
        assertEquals("userId bor, xp yo'q — 0", 0, l.entries[0].xp)
        assertEquals("", l.entries[0].name)
        assertEquals("salbiy xp 0 ga qaytadi", 0, l.entries[1].xp)
        assertEquals("tabla o'lchami maydoni bo'lmasa — jadval o'lchami", GameConfig.LEAGUE_BOARD_SIZE, l.boardSize)
        val bet = checkNotNull(g.bet)
        assertEquals("gems=0 bo'lgan garov narxiga qaytadi", GameConfig.BET_COST_GEMS, bet.gems)
        assertEquals("2026-11-01", bet.startDay)
        assertEquals(0, bet.streakAtStart)
        assertEquals(listOf(WEEK0), g.chestsWeeks)
        assertEquals(mapOf("a-scholar" to 2, "a-wildfire" to 9), g.achievementLevels)

        // Bo'sh obyekt — to'la yangi holat.
        val fresh = GameLogic.normalizeGameJson(JsonObject(), DAY, T0)
        assertEquals(GameConfig.HEARTS_MAX, fresh.hearts)
        assertEquals(T0, fresh.heartsAt)
        assertEquals(DAY, fresh.today.day)
        assertNull(fresh.league)
        assertNull(GameLogic.normalizeGameJson(null, DAY, T0).league)
    }

    @Test
    fun jsonReaderHelpersRejectForeignTypes() {
        val o = JsonParser.parseString(
            """{"s":"x","n":5,"arr":[1,"y"],"obj":{"k":"v"},"b":"ha","empty":""}""",
        ).asJsonObject
        assertEquals("x", o.jStr("s"))
        assertNull("son satr emas", o.jStr("n"))
        assertNull("massiv satr emas", o.jStr("arr"))
        assertNull("objekt satr emas", o.jStr("obj"))
        assertNull("kalit yo'q", o.jStr("yo'q"))
        assertEquals("", o.jStr("empty"))
        // Ko'rsatish uchun `jText` — son ham satrga aylanadi (veb `String(...)`).
        assertEquals("5", o.jText("n"))
        assertEquals("x", o.jText("s"))
        assertEquals("", o.jText("obj"))
        assertEquals("", o.jText("yo'q"))
        assertEquals(listOf("y"), o.jStrList("arr"))
        assertEquals(emptyList<String>(), o.jStrList("s"))
        assertNotNull(o.jObj("obj"))
        assertNull(o.jObj("s"))
        assertEquals(5.0, o.jNum("n")!!, 0.0)
        assertNull("matn son emas", o.jNum("b"))
        assertEquals(5, o.jInt("n"))
        assertEquals(5L, o.jLong("n"))
        // `jQuests` / `jBet` / `jLeague` — begona elementlar tashlanadi.
        val q = JsonParser.parseString("""{"questsDone":[{"id":"a","at":5},{"id":7},{"at":3},{"id":"b"}]}""").asJsonObject
        assertEquals(listOf("a", "b"), q.jQuests("questsDone").map { it.id })
        assertEquals(5L, q.jQuests("questsDone")[0].at)
        val b = JsonParser.parseString("""{"bet":{"startDay":"2026-11-01"},"bet2":{"startDay":5}}""").asJsonObject
        assertEquals(GameConfig.BET_COST_GEMS, b.jBet("bet")!!.gems)
        assertNull("startDay son — garov yo'q", b.jBet("bet2"))
        val lg = JsonParser.parseString("""{"league":{"entries":[{"userId":"a","name":42,"xp":"12"}]}}""").asJsonObject.jLeague("league", DAY, T0)!!
        assertEquals("42", lg.entries[0].name)
        assertEquals(12, lg.entries[0].xp)
        assertFalse(lg.prizeClaimed)
    }
}
