package com.dadaxon.aienglishacademy.store

import com.dadaxon.aienglishacademy.data.AppData
import com.dadaxon.aienglishacademy.data.AttemptRecord
import com.dadaxon.aienglishacademy.data.DayActivity
import com.dadaxon.aienglishacademy.data.GameConfig
import com.dadaxon.aienglishacademy.data.SrsState
import com.dadaxon.aienglishacademy.data.UserSettings
import com.dadaxon.aienglishacademy.data.emptyGame
import com.dadaxon.aienglishacademy.domain.GameLogic
import com.dadaxon.aienglishacademy.domain.xpForAttempt
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * [GameOps] — jonli do'kon ([AppStore.reduceLocal]) chaqiradigan sof funksiyalar.
 *
 * [AppStore] Android `Context` talab qilgani uchun unit testda qurilmaydi; shu
 * sinf aynan shu «ko'prik»ni tekshiradi: o'yin qatlami HAQIQATAN qo'llaniladi
 * mi (yuraklar, byust, questlar, do'kon), yoki `AppStore` eski o'z mantig'ida
 * qolib ketganmi. Tarmoq, fayl va soat ishtirok ETMAYDI — vaqtlar argument.
 *
 * MANBA: veb `src/lib/store.tsx` reducer bandlari (`attempt`, `srs`,
 * `settings`, `lesson-complete`, `game-buy`, `game-bet`, `game-settle`).
 */
class GameOpsTest {

    private companion object {
        const val DAY = "2026-11-07"
        const val MIN = 60_000L
        const val DAY_MS = 86_400_000L

        /** 2026-11-07 01:00 UTC — lokal zonada (UTC+5) ham shu kunga to'g'ri. */
        const val T0 = 1_794_013_200_000L
    }

    private fun base() = AppData.empty("u-1").copy(game = emptyGame(DAY, T0))

    private fun attempt(correct: Boolean, difficulty: Int = 1, seconds: Int = 10) = AttemptRecord(
        id = "at-$correct-$difficulty", exerciseId = "ex-1", skill = "reading", level = "A1",
        correct = correct, partial = if (correct) 1.0 else 0.0, difficulty = difficulty,
        secondsSpent = seconds, source = "grammar", answerGiven = "a", at = T0,
    )

    /* ---------------------------- Yig'uvchi (settle) ---------------------------- */

    @Test
    fun settleIsIdentityWhenNothingChanged() {
        val d: AppData = base()
        // `settle` o'zgarish bo'lmasa SAYO BILAN BIR XIL obyektni qaytaradi —
        // `AppStore` shu qoidaga tayanib keraksiz saqlashni qo'zg'atmaydi.
        assertSame(d, GameOps.settle(d, T0, DAY))
        // Ikki marta chaqirish ham bir xil (idempotent).
        val once = GameOps.settle(d, T0, DAY)
        assertSame(once, GameOps.settle(once, T0, DAY))
    }

    @Test
    fun settleAppliesHeartRepair() {
        val d = base().copy(game = emptyGame(DAY, T0).copy(hearts = 1, heartsAt = T0))
        val r = GameOps.settle(d, T0 + 61 * MIN, DAY)
        // 30 daqiqa oralig'i: 61 daqiqada 2 ta yurak qaytadi.
        assertEquals(3, r.game.hearts)
        assertFalse("holat o'zgargan bo'lishi kerak edi", d === r)
    }

    /* -------------------------------- Mashq (attempt) -------------------------------- */

    @Test
    fun attemptGrowsTotalXpAndTodayXpTogether() {
        val d = base()
        val r = GameOps.attempt(d, attempt(correct = true), DAY, timerCoversSkill = false, now = T0)
        val plain = xpForAttempt(true, 1, true)
        assertEquals(plain, r.xp)
        assertEquals(plain, r.game.today.xp)
        assertEquals("umumiy XP bilan kundalik XP BIR XIL o'sishi shart", r.xp, r.game.today.xp)
        val act = checkNotNull(r.activity[DAY])
        assertEquals(1, act.attempts)
        assertEquals(1, act.correct)
        assertEquals(10, act.seconds)
        assertEquals(10, checkNotNull(act.skills["reading"]))
        assertEquals(1, r.attempts.size)

        // Ikkinchi (noto'g'ri) mashqdan keyin ham ikkala hisob teng.
        val r2 = GameOps.attempt(r, attempt(correct = false), DAY, timerCoversSkill = false, now = T0 + MIN)
        val gain2 = xpForAttempt(false, 1, true)
        assertEquals(r.xp + gain2, r2.xp)
        assertEquals(r.game.today.xp + gain2, r2.game.today.xp)
        assertEquals(2, checkNotNull(r2.activity[DAY]).attempts)
        assertEquals(1, checkNotNull(r2.activity[DAY]).correct)
        assertEquals(2, r2.attempts.size)
    }

    @Test
    fun wrongAttemptCostsAHeartAndBoostDoublesBothXpCounters() {
        val d = base()
        val wrong = GameOps.attempt(d, attempt(correct = false), DAY, false, T0)
        // Biznik: har noto'g'ri javob −1 yurak (sozlamada o'chirilsa darvoza yo'l qo'yadi — quyida).
        assertEquals(GameConfig.HEARTS_MAX - GameConfig.HEARTS_COST_WRONG, wrong.game.hearts)
        val right = GameOps.attempt(d, attempt(correct = true), DAY, false, T0)
        assertEquals(GameConfig.HEARTS_MAX, right.game.hearts)

        val boosted = d.copy(game = d.game.copy(boostUntil = T0 + 60 * MIN))
        val r = GameOps.attempt(boosted, attempt(correct = true), DAY, false, T0)
        val plain = xpForAttempt(true, 1, true)
        assertEquals(plain * GameConfig.XP_BOOST_MULT, r.xp)
        assertEquals(plain * GameConfig.XP_BOOST_MULT, r.game.today.xp)
    }

    @Test
    fun heartsGateOpensWhenSettingIsOff() {
        // Sozlamada o'chirilgan yuraklar darsni TO'XMAYDI (veb: `blocked =
        // hearts.blocked && !heartFree`, `heartsBlocked` `heartsEnabled`ni o'qiydi).
        val drained = base().copy(game = emptyGame(DAY, T0).copy(hearts = 0, heartsAt = T0))
        assertTrue("yurak 0 — darvoza yopiq bo'lishi kerak", GameLogic.heartsBlocked(drained.game, drained, T0))
        val off = drained.copy(settings = UserSettings(heartsEnabled = false))
        assertFalse(GameLogic.heartsBlocked(off.game, off, T0))
        // Darvozadan o'tgach mashq baribir qabul qilinadi.
        val r = GameOps.attempt(off, attempt(correct = true), DAY, false, T0)
        assertEquals(1, checkNotNull(r.activity[DAY]).attempts)
    }

    @Test
    fun timerCoveredSkillIsNotCountedTwice() {
        val seeded = DayActivity(date = DAY, seconds = 40, skills = mapOf("reading" to 40))
        val d = base().copy(activity = mapOf(DAY to seeded))
        val r = GameOps.attempt(d, attempt(correct = true, seconds = 10), DAY, timerCoversSkill = true, now = T0)
        val act = checkNotNull(r.activity[DAY])
        // Taymer yurari vaqtni allaqachon devor-soat bo'yicha yozgan — qayta qo'shilmaydi.
        assertEquals(40, act.seconds)
        assertEquals(40, checkNotNull(act.skills["reading"]))
        assertEquals(1, act.attempts)

        val plain = GameOps.attempt(d, attempt(correct = true, seconds = 10), DAY, timerCoversSkill = false, now = T0)
        val act2 = checkNotNull(plain.activity[DAY])
        assertEquals(50, act2.seconds)
        assertEquals(50, checkNotNull(act2.skills["reading"]))
    }

    /* ---------------------------------- SRS ---------------------------------- */

    @Test
    fun firstLearnCountsAsWordButNotAsReview() {
        val d = base().copy(srs = mapOf("w-9" to SrsState(learnedAt = null, dueAt = T0)))
        val next = SrsState(learnedAt = T0, dueAt = T0 + DAY_MS, intervalDays = 1, reps = 1)
        val r = GameOps.srs(d, "w-9", next, firstLearn = true, reviewed = false, key = DAY, now = T0)
        assertEquals(next, checkNotNull(r.srs["w-9"]))
        val act = checkNotNull(r.activity[DAY])
        assertEquals(1, act.newWords)
        assertEquals(0, act.reviewedWords)
        // Birinchi marta o'rganish «amaliyot» hisoblanmaydi → quest mezoni o'smaydi.
        assertEquals(0, r.game.today.reviews)
    }

    @Test
    fun practiceReviewsReturnAHeartOnceTheTargetIsReached() {
        var d = base().copy(game = emptyGame(DAY, T0).copy(hearts = 0, heartsAt = T0))
        val next = SrsState(learnedAt = T0 - DAY_MS, dueAt = T0 + DAY_MS, intervalDays = 2, reps = 3)
        repeat(GameConfig.HEART_PRACTICE_REVIEWS - 1) { i ->
            d = GameOps.srs(d, "w-$i", next, firstLearn = false, reviewed = true, key = DAY, now = T0)
            assertEquals(i + 1, checkNotNull(d.activity[DAY]).reviewedWords)
            assertEquals(i + 1, d.game.practiceReviews)
            assertEquals(0, d.game.hearts)
        }
        // `HEART_PRACTICE_REVIEWS` ta haqiqiy takror — bitta yurak qaytadi.
        d = GameOps.srs(d, "w-x", next, firstLearn = false, reviewed = true, key = DAY, now = T0)
        assertEquals(1, d.game.hearts)
        // Hisob to'liq aylanadi — keyingi 8 takror uchun nol dan boshlanadi.
        assertEquals(0, d.game.practiceReviews)
        assertEquals(GameConfig.HEART_PRACTICE_REVIEWS, d.game.today.reviews)
    }

    /* ------------------------------ Sozlamalar ------------------------------ */

    @Test
    fun xpGoalIsSnappedToADocumentedTier() {
        // DB `CHECK (50,100,200,300,500)` — ro'yxatdan tashqari son qaytadi.
        assertEquals(100, GameOps.settings(base(), UserSettings(xpGoalXp = 137)).settings.xpGoalXp)
        assertEquals(200, GameOps.settings(base(), UserSettings(xpGoalXp = 180)).settings.xpGoalXp)
        assertEquals(50, GameOps.settings(base(), UserSettings(xpGoalXp = -7)).settings.xpGoalXp)
        assertEquals(500, GameOps.settings(base(), UserSettings(xpGoalXp = 9_999)).settings.xpGoalXp)
        assertEquals(GameConfig.XP_GOAL_DEFAULT_XP, GameOps.settings(base(), UserSettings()).settings.xpGoalXp)
        // Haqiqiy tugma qiymatlari o'zgarmaydi.
        for (t in GameConfig.XP_GOAL_TIERS) {
            assertEquals(t.xp, GameOps.settings(base(), UserSettings(xpGoalXp = t.xp)).settings.xpGoalXp)
        }
    }

    /* --------------------------- Darsni yakunlash --------------------------- */

    @Test
    fun lessonBonusAndPerfectLessonAreAwarded() {
        val d = base()
        val r = GameOps.lesson(d, exercises = 5, mistakes = 0, key = DAY, now = T0)
        assertEquals(1, r.game.perfectLessonsTotal)
        assertEquals(
            GameConfig.LESSON_BONUS_XP + GameConfig.PERFECT_LESSON_BONUS_XP,
            r.xp - d.xp,
        )
        assertEquals(1, r.game.today.perfectLessons)

        // Xatoli dars — bonus bor, «xatosiz» bonusi yo'q.
        val messy = GameOps.lesson(d, exercises = 5, mistakes = 2, key = DAY, now = T0)
        assertEquals(0, messy.game.perfectLessonsTotal)
        assertEquals(GameConfig.LESSON_BONUS_XP, messy.xp - d.xp)

        // Juda qisqa «dars» bonus olmaydi (veb: `LESSON_MIN_EXERCISES`).
        val tiny = GameOps.lesson(d, exercises = GameConfig.LESSON_MIN_EXERCISES - 1, mistakes = 0, key = DAY, now = T0)
        assertEquals(0, tiny.game.perfectLessonsTotal)
        assertEquals("bonus berilmagan bo'lishi kerak edi", d.xp, tiny.xp)
    }

    /* ------------------------------ Do'kon / garov ------------------------------ */

    @Test
    fun buyIsRefusedHonestWhenGemsAreShort() {
        val poor = base().copy(game = emptyGame(DAY, T0).copy(gems = 0))
        val res = GameOps.buy(poor, "refill", DAY, T0)
        assertFalse(res.ok)
        assertNotNull(res.reasonUz)
        assertTrue((res.reasonUz ?: "").contains("Gem yetmadi"))
        assertSame(poor, res.data)
    }

    @Test
    fun boughtFreezeSettlesTheDayAroundIt() {
        val rich = base().copy(game = emptyGame(DAY, T0).copy(gems = 5_000))
        val res = GameOps.buy(rich, "freeze", DAY, T0)
        assertTrue(res.reasonUz ?: "sotib olinishi kerak edi", res.ok)
        assertEquals(1, res.data.game.freezes)
        assertEquals(5_000 - GameConfig.priceOf("freeze"), res.data.game.gems)
        // Muvaffaqiyatdan keyin holat YIG'ILGAN (`settle`) bo'ladi — xom holat
        // hech qachon do'konda qolmaydi.
        assertSame(res.data, GameOps.settle(res.data, T0, DAY))
    }

    @Test
    fun betIsRejectedHonestlyWhenAlreadyOpen() {
        val rich = base().copy(game = emptyGame(DAY, T0).copy(gems = 5_000))
        val first = GameOps.bet(rich, DAY, T0)
        assertTrue(first.reasonUz ?: "garov ochilishi kerak edi", first.ok)
        assertEquals(GameConfig.BET_COST_GEMS, checkNotNull(first.data.game.bet).gems)
        assertEquals(DAY, checkNotNull(first.data.game.bet).startDay)

        val again = GameOps.bet(first.data, DAY, T0)
        assertFalse(again.ok)
        assertTrue((again.reasonUz ?: "").contains("allaqachon"))
        assertSame(first.data, again.data)

        // Gem yetmasa — sabab ochiq, son ixtir qilinmaydi.
        val poor = GameOps.bet(base(), DAY, T0)
        assertFalse(poor.ok)
        assertTrue((poor.reasonUz ?: "").contains("gem kerak"))
    }

    /* ------------------- O'yin qatlami jonli oqimga qo'shiladi ------------------- */

    @Test
    fun anAttemptMovesTodayCountersAndQuestProgress() {
        // Bu test «o'yin qatlami jonli do'konda qo'llaniladimi» savoliga javob:
        // `AppStore` o'z eski mantig'ida qolib ketgan bo'lsa bunday o'sish bo'lmaydi.
        val d = base()
        val quests = GameLogic.questsForDay(DAY)
        assertEquals(GameConfig.QUESTS_PER_DAY, quests.size)

        val r = GameOps.attempt(d, attempt(correct = true, seconds = 120), DAY, false, T0)
        assertEquals(1, r.game.today.attempts)
        assertTrue(r.game.today.xp > 0)
        // Quest progressi kun hisoblaridan o'lchanadi (veb ekrani ham shu sonni chizadi).
        val act = r.activity[DAY]
        val touched = quests.filter { q ->
            GameLogic.questProgressOf(q, r.game.today, act, r.game.questsDone.map { it.id }).value > 0
        }
        assertTrue("mashqdan keyin kamida bitta quest mezoni o'sishi kerak", touched.isNotEmpty())
        assertEquals("quest hovuzi kunga bog'langan — tartib o'zgarmasin", quests.map { q -> q.id }, GameLogic.questsForDay(DAY).map { q -> q.id })
    }

    @Test
    fun everyOperationEndsWithSettleSoStateIsNeverLeftRaw() {
        val d = base().copy(game = emptyGame(DAY, T0).copy(hearts = 0, heartsAt = T0))
        // 0 yurak bilan mashq: kirishdan OLDIN `settle` 60 daqiqalik tiklanishni
        // qo'llaydi — shuning uchun natijada kamida bitta yurak bo'ladi.
        val r = GameOps.attempt(d, attempt(correct = true), DAY, false, T0 + 61 * MIN)
        assertTrue(r.game.hearts >= 2)
        assertSame(r, GameOps.settle(r, T0 + 61 * MIN, DAY))

        // Dars bonusi ham yig'ilmagan holda qolmaydi.
        val l = GameOps.lesson(d, exercises = 4, mistakes = 0, key = DAY, now = T0)
        assertSame(l, GameOps.settle(l, T0, DAY))
    }
}
