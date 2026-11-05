package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.AppData
import com.dadaxon.aienglishacademy.data.AttemptRecord
import com.dadaxon.aienglishacademy.data.DayActivity
import com.dadaxon.aienglishacademy.data.MockExamAttempt
import com.dadaxon.aienglishacademy.data.MockSectionResult
import com.dadaxon.aienglishacademy.data.Skills
import com.dadaxon.aienglishacademy.data.SpeakingAnalysis
import com.dadaxon.aienglishacademy.data.SpeakingSession
import com.dadaxon.aienglishacademy.data.SrsState
import com.dadaxon.aienglishacademy.data.UserSettings
import com.dadaxon.aienglishacademy.data.WritingAnalysis
import com.dadaxon.aienglishacademy.data.WritingSubmission
import com.dadaxon.aienglishacademy.data.dayKeyAddDays
import com.dadaxon.aienglishacademy.data.todayKey
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Reducer testlari — veb `src/test/activity-time.test.ts` va `timer.test.ts`
 * kutilganlari (vaqt hisobi, ikki marta sanash, sessiya/ko'nikma atributsiyasi)
 * va store actionlarining qolgan qoidalari.
 */
class ReducerTest {
    private val uid = "u1"

    /** "Hozir" — testlar uchun qattiq qo'yilgan vaqt (lokal zonaga mos kun kaliti olinadi). */
    private val t0: Long = System.currentTimeMillis()
    private val today: String = todayKey(t0)

    private fun start(): State = State(AppData.empty(uid), idleTimer(t0))

    private fun secondsOf(
        s: State,
        key: String = today,
    ): Int = s.data.activity[key]?.seconds ?: 0

    private fun skillSeconds(
        s: State,
        skill: String,
        key: String = today,
    ): Int = s.data.activity[key]?.skills?.get(skill) ?: 0

    private fun record(
        id: String,
        skill: String,
        seconds: Int,
        correct: Boolean = true,
        difficulty: Int = 1,
    ): AttemptRecord =
        AttemptRecord(
            id = id,
            exerciseId = "e1",
            skill = skill,
            level = "A1",
            correct = correct,
            partial = if (correct) 1.0 else 0.0,
            difficulty = difficulty,
            secondsSpent = seconds,
            source = "practice",
            answerGiven = "x",
            at = t0,
        )

    /* ---------------------------- attempt / XP ---------------------------- */

    @Test
    fun `attempt - XP va kundalik faollik oshadi`() {
        var s = start()
        s = reduce(s, Action.Attempt(record("a1", "reading", 40)), t0)
        assertEquals(40, secondsOf(s))
        assertEquals(40, skillSeconds(s, "reading"))
        assertEquals(1, s.data.attempts.size)
        assertEquals(8, s.data.xp) // 6 + 1*2
        val day = s.data.activity.getValue(today)
        assertEquals(1, day.attempts)
        assertEquals(1, day.correct)
    }

    @Test
    fun `attempt - noto'g'ri javob 1 XP`() {
        val s = reduce(start(), Action.Attempt(record("a1", "grammar", 12, correct = false)), t0)
        assertEquals(1, s.data.xp)
        assertEquals(0, s.data.activity.getValue(today).correct)
    }

    @Test
    fun `attempt - urinishlar tarixi chegaralangan (LIMIT_ATTEMPTS)`() {
        var s = start()
        for (i in 0 until AppData.LIMIT_ATTEMPTS + 5) {
            s = reduce(s, Action.Attempt(record("a$i", "grammar", 1)), t0)
        }
        assertEquals(AppData.LIMIT_ATTEMPTS, s.data.attempts.size)
        // Eng yangilari saqlanadi
        assertEquals("a${AppData.LIMIT_ATTEMPTS + 4}", s.data.attempts.last().id)
    }

    /* ---------------------------- taymer / ikki marta sanash ---------------------------- */

    @Test
    fun `taymer yurmaganida attempt vaqti kundalik hisobga qo'shiladi`() {
        val s = reduce(start(), Action.Attempt(record("a1", "reading", 40)), t0)
        assertEquals(40, secondsOf(s))
        assertEquals(40, skillSeconds(s, "reading"))
    }

    @Test
    fun `taymer yurganda attempt vaqti IKKI marta sanalmaydi`() {
        var s = reduce(start(), Action.TimerStart("p1", "reading"), t0)
        s = reduce(s, Action.Attempt(record("a1", "reading", 40)), t0 + 5_000L)
        assertEquals(0, secondsOf(s))
        assertEquals(0, skillSeconds(s, "reading"))
        assertEquals(1, s.data.attempts.size)
    }

    @Test
    fun `boshqa sessiya taymeri yurarida boshqa ko'nikma sekundlari YO'QOLMAYDI`() {
        var s = reduce(start(), Action.TimerStart("write-1", "writing"), t0)
        s = reduce(s, Action.Attempt(record("g1", "grammar", 300)), t0 + 1_000L)
        assertEquals(300, skillSeconds(s, "grammar"))
        assertEquals(300, secondsOf(s))
    }

    @Test
    fun `stop → xuddi shu sessiyani qayta ochish - eski sekundlar qayta sanalmaydi`() {
        // Veb testlari soxta taymerlar bilan ishlaydi (`vi.useFakeTimers`):
        // `elapsedSec` qo'lab qo'yilganda `stopTimer` da devor vaqtining
        // qo'shimcha ayirmasi bo'LMAYDI (`currentElapsed = elapsedSec + (end-start)`).
        // Shuning uchun start/stop BIR XIL `now` da — vebdagi kabi.
        var s = reduce(start(), Action.TimerStart("p1", "reading"), t0)
        s = s.copy(timer = s.timer.copy(elapsedSec = 120))
        s = reduce(s, Action.TimerStop, t0)
        assertEquals(120, secondsOf(s))
        assertEquals(0L, s.timer.elapsedSec)

        s = reduce(s, Action.TimerStart("p1", "reading"), t0)
        s = s.copy(timer = s.timer.copy(elapsedSec = 30))
        s = reduce(s, Action.TimerStop, t0)
        assertEquals(150, secondsOf(s))
    }

    @Test
    fun `pause → Davom etish - sekundlar yo'qolmaydi va takrorlanmaydi`() {
        var s = reduce(start(), Action.TimerStart("p1", "reading"), t0)
        s = reduce(s, Action.TimerPause, t0 + 10_000L)
        s = s.copy(timer = s.timer.copy(elapsedSec = 60))
        s = reduce(s, Action.TimerStart("p1", "reading"), t0 + 20_000L)
        assertNotNull(s.timer.startedAt)
        assertEquals(60L, s.timer.elapsedSec)
        assertEquals(0, secondsOf(s)) // hali kundalikka yozilmagan
        s = reduce(s, Action.TimerStop, t0 + 20_000L)
        assertEquals(60, secondsOf(s))
    }

    @Test
    fun `sessiya bir xil ko'nikma o'zgarsa hisoblangan vaqt eski ko'nikmaga yoziladi`() {
        var s = reduce(start(), Action.TimerStart("a1-day-01", "vocabulary"), t0)
        s = s.copy(timer = s.timer.copy(elapsedSec = 600))
        s = reduce(s, Action.TimerStart("a1-day-01", "grammar"), t0)
        assertEquals(600, skillSeconds(s, "vocabulary"))
        assertEquals(0, skillSeconds(s, "grammar"))
        assertEquals(600, secondsOf(s))
        assertEquals("grammar", s.timer.skill)
        assertEquals(0L, s.timer.elapsedSec)
        // Soxta taymer: stop start bilan bir `now` da — devor vaqti qo'shilmaydi.
        s = reduce(s, Action.TimerStop, t0)
        assertEquals("ikki marta sanalmadi", 600, secondsOf(s))
    }

    @Test
    fun `bir sessiyada ko'nikma almashsa yurgan vaqt IKKI marta yozilmaydi`() {
        var s = reduce(start(), Action.TimerStart("a1-day-02", "vocabulary"), t0)
        s = reduce(s, Action.TimerStart("a1-day-02", "grammar"), t0 + 600_000L)
        assertEquals(0L, s.timer.elapsedSec)
        s = reduce(s, Action.TimerStop, t0 + 900_000L)
        assertEquals(600, skillSeconds(s, "vocabulary"))
        assertEquals(300, skillSeconds(s, "grammar"))
        assertEquals(900, secondsOf(s))
    }

    @Test
    fun `boshqa sessiyaga o'tganda ham real vaqt bir marta yoziladi`() {
        var s = reduce(start(), Action.TimerStart("a1-r1", "reading"), t0)
        s = reduce(s, Action.TimerStart("a1-w1", "writing"), t0 + 600_000L)
        assertEquals("a1-w1", s.timer.sessionId)
        assertEquals("writing", s.timer.skill)
        s = reduce(s, Action.TimerStop, t0 + 900_000L)
        assertEquals(600, skillSeconds(s, "reading"))
        assertEquals(300, skillSeconds(s, "writing"))
        assertEquals(900, secondsOf(s))
    }

    @Test
    fun `stop'dan keyin soxta 'Taymer pauzada' holati qolmaydi`() {
        var s = reduce(start(), Action.TimerStart("read-1", "reading"), t0)
        s = reduce(s, Action.TimerStop, t0 + 5_000L)
        assertNull(s.timer.startedAt)
        assertNull(s.timer.sessionId)
    }

    @Test
    fun `bo'sh taymerda stop hech narsa qo'shimaydi`() {
        val s = reduce(start(), Action.TimerStop, t0)
        assertNull(s.timer.sessionId)
        assertEquals(0, secondsOf(s))
    }

    @Test
    fun `clampDelta - manfiy 0, uyqu oralig'i 3 soat bilan chegaralanadi`() {
        assertEquals(0L, clampDelta(-5L))
        assertEquals(0L, clampDelta(0L))
        assertEquals(1500L, clampDelta(1500L))
        assertEquals(MAX_CONTINUOUS_SEC * 1000L, clampDelta(MAX_CONTINUOUS_SEC * 1000L + 999_999L))
        assertEquals(0.0, clampDelta(Double.NaN), 1e-9)
        assertEquals((MAX_CONTINUOUS_SEC * 1000L).toDouble(), clampDelta(1e12), 1e-9)
    }

    @Test
    fun `currentElapsed - yurgan taymerning devor-soat farqi`() {
        val running = TimerState(elapsedSec = 30L, startedAt = t0, skill = "reading", sessionId = "p1")
        assertEquals(30L + 45L, currentElapsed(running, t0 + 45_000L))
        val paused = running.copy(startedAt = null)
        assertEquals(30L, currentElapsed(paused, t0 + 45_000L))
    }

    @Test
    fun `formatDuration`() {
        assertEquals("00:00", formatDuration(0L))
        assertEquals("00:59", formatDuration(59L))
        assertEquals("01:05", formatDuration(65L))
        assertEquals("1:02:03", formatDuration(3723L))
        assertEquals("00:00", formatDuration(-10L))
    }

    @Test
    fun `planProgress`() {
        val p = planProgress(150L, 5)
        assertEquals(2, p.doneMin)
        assertEquals(3, p.leftMin)
        assertEquals(0.4, p.ratio, 1e-9)
        assertEquals(0.0, planProgress(0L, 0).ratio, 1e-9)
        assertEquals(1.0, planProgress(3600L, 5).ratio, 1e-9)
        assertEquals(0, planProgress(3600L, 5).leftMin)
    }

    /* ---------------------------- SRS ---------------------------- */

    @Test
    fun `srs - birinchi muvaffaqiyat newWords keyingi baholar reviewedWords`() {
        var s = start()
        s = reduce(s, Action.Srs("w1", SrsGrade.GOOD), t0)
        assertEquals(1, s.data.activity.getValue(today).newWords)
        assertEquals(0, s.data.activity.getValue(today).reviewedWords)
        s = reduce(s, Action.Srs("w1", SrsGrade.GOOD), t0 + 86_400_000L)
        assertEquals(1, s.data.activity.getValue(todayKey(t0 + 86_400_000L)).reviewedWords)
        assertEquals(1, s.data.srs.size)
        assertNotNull(s.data.srs.getValue("w1").learnedAt)
    }

    @Test
    fun `srs - xato bahoda ham reviewedWords oshadi (learnedAt saqlanadi)`() {
        var s = reduce(start(), Action.Srs("w1", SrsGrade.GOOD), t0)
        s = reduce(s, Action.Srs("w1", SrsGrade.AGAIN), t0)
        val day = s.data.activity.getValue(today)
        assertEquals(1, day.newWords)
        assertEquals(1, day.reviewedWords)
        assertNotNull(s.data.srs.getValue("w1").learnedAt)
    }

    @Test
    fun `srs-add - mavjud bo'lmasa qo'shiladi, mavjud bo'lsa o'zgarmaydi`() {
        var s = reduce(start(), Action.SrsAdd("w9"), t0)
        assertEquals(initialSrsState(t0), s.data.srs.getValue("w9"))
        val before = s
        s = reduce(s, Action.SrsAdd("w9"), t0 + 1000L)
        assertEquals(before, s)
    }

    /* ---------------------------- boshqa actionlar ---------------------------- */

    @Test
    fun `settings patch qisman — belgilanmagan maydon o'zgarmaydi`() {
        var s = reduce(start(), Action.Settings(SettingsPatch(examDate = "2026-12-01", examDateSet = true)), t0)
        assertEquals("2026-12-01", s.data.settings.examDate)
        s = reduce(s, Action.Settings(SettingsPatch(dailyMinutes = 120)), t0)
        assertEquals(120, s.data.settings.dailyMinutes)
        assertEquals("2026-12-01", s.data.settings.examDate)
        // examDateSet=true bilan null qaytarish mumkin
        s = reduce(s, Action.Settings(SettingsPatch(examDateSet = true)), t0)
        assertNull(s.data.settings.examDate)
        assertEquals(UserSettings().theme, s.data.settings.theme)
    }

    @Test
    fun `day-complete - kunlar ro'yxati, test bali maksimumi, joriy kun`() {
        var s = start()
        s = reduce(s, Action.DayComplete("a1-day-01", 55, "t1", listOf("a1-day-01", "a1-day-02")), t0)
        assertEquals(listOf("a1-day-01"), s.data.path.completedDays)
        assertEquals(55, s.data.path.passedTests.getValue("t1"))
        assertEquals("a1-day-02", s.data.path.currentDayId)
        // Takror: kun ikki marta qo'shilmaydi, ball faqat oshsa yoziladi
        s = reduce(s, Action.DayComplete("a1-day-01", 40, "t1", listOf("a1-day-01", "a1-day-02")), t0)
        assertEquals(listOf("a1-day-01"), s.data.path.completedDays)
        assertEquals(55, s.data.path.passedTests.getValue("t1"))
        s = reduce(s, Action.DayComplete("a1-day-01", 90, "t1", listOf("a1-day-01", "a1-day-02")), t0)
        assertEquals(90, s.data.path.passedTests.getValue("t1"))
        // Ballsiz
        s = reduce(s, Action.DayComplete("a1-day-02", daysInLevel = listOf("a1-day-01", "a1-day-02")), t0)
        assertEquals(1, s.data.path.passedTests.size)
        // Veb `store.tsx`: `currentDayId = days.find(d => !completed.includes(d)) ?? state.path.currentDayId`
        // — HAMMA kunlar tugagan bo'lsa JORIY kun eski holatda qoladi (boshiga qaytmaydi).
        assertEquals("a1-day-02", s.data.path.currentDayId)
    }

    @Test
    fun `mock-add va writing-add va speaking-add tarixlari qo'shiladi`() {
        var s = start()
        s = reduce(s, Action.MockAdd(MockExamAttempt(id = "m1", examId = "a1-mock", completedAt = t0)), t0)
        assertEquals(1, s.data.mockAttempts.size)
        s = reduce(s, Action.WritingAdd(WritingSubmission(id = "s1", taskId = "w1", text = "hi", wordCount = 1, secondsSpent = 5, createdAt = t0)), t0)
        assertEquals(1, s.data.writing.size)
        s = reduce(s, Action.SpeakingAdd(SpeakingSession(id = "sp1", taskId = "sp-task", durationSec = 30, createdAt = t0)), t0)
        assertEquals(1, s.data.speaking.size)
    }

    @Test
    fun `mock-time - ko'nikmalar bo'yicha qo'shiladi`() {
        val s =
            reduce(
                start(),
                Action.MockTime(listOf(MockTimeEntry("reading", 1200.0), MockTimeEntry("listening", 600.0))),
                t0,
            )
        assertEquals(1200, skillSeconds(s, "reading"))
        assertEquals(600, skillSeconds(s, "listening"))
        assertEquals(1800, secondsOf(s))
    }

    @Test
    fun `mock-time - manfiy vaqt qo'shilmaydi 3 soatdan ko'pi qisqartiriladi`() {
        val s =
            reduce(
                start(),
                Action.MockTime(listOf(MockTimeEntry("writing", -60.0), MockTimeEntry("speaking", 25.0 * 3600))),
                t0,
            )
        // Veb `addActivitySeconds`: `if (seconds <= 0) return state` — manfiy sekund
        // uchun kundalilikda HECH QANDAY yozuv yaratilmaydi (writing kaliti yo'q),
        // speaking esa MAX_CONTINUOUS_SEC (3 soat) chekkasigacha qisqartiriladi.
        assertEquals(10800, secondsOf(s))
        assertEquals(0, skillSeconds(s, "writing"))
        assertNull(s.data.activity.getValue(today).skills["writing"])
        assertEquals(10800, skillSeconds(s, "speaking"))
    }

    @Test
    fun `mock-time - NaN vaqt 0 hisoblanadi va attempt SANALMAYDI`() {
        val s = reduce(start(), Action.MockTime(listOf(MockTimeEntry("reading", Double.NaN))), t0)
        assertEquals(0, s.data.attempts.size)
        // Veb: NaN → sec = 0, `addActivitySeconds` esa `seconds <= 0` da holatni
        // O'ZGARTMAY qaytaradi — bugun uchun kundalilik yozuvi UMUMAN yaratilmaydi.
        assertNull(s.data.activity[today])
    }

    @Test
    fun `merge-remote - faqat o'z foydalanuvchisi uchun`() {
        val remote = RemoteSnapshot(srs = mapOf("w" to SrsState(reps = 7)))
        var s = reduce(start(), Action.MergeRemote("boshqa-user", remote), t0)
        assertTrue(s.data.srs.isEmpty())
        s = reduce(s, Action.MergeRemote(uid, remote), t0)
        assertEquals(7, s.data.srs.getValue("w").reps)
    }

    @Test
    fun `diagnostic - natija saqlanadi`() {
        val d = diagnose(mapOf("dg-01" to true, "dg-02" to true, "dg-03" to true))
        val s = reduce(start(), Action.Diagnostic(t0, d.level, d.labelUz, d.confidence), t0)
        assertNotNull(s.data.diagnostic)
        assertEquals(d.labelUz, s.data.diagnostic!!.labelUz)
        assertEquals(d.level, s.data.diagnostic!!.level)
    }

    @Test
    fun `onboarded - bir marta`() {
        var s = reduce(start(), Action.Onboarded(10L), t0)
        assertEquals(10L, s.data.onboardedAt)
        s = reduce(s, Action.Onboarded(99L), t0)
        assertEquals(10L, s.data.onboardedAt)
    }

    @Test
    fun `level-set va reset`() {
        var s = reduce(start(), Action.LevelSet("B1"), t0)
        assertEquals("B1", s.data.settings.currentLevel)
        s = reduce(s, Action.Attempt(record("a1", "reading", 30)), t0)
        assertEquals(1, s.data.attempts.size)
        val r = reduce(s, Action.Reset, t0)
        assertTrue(r.data.attempts.isEmpty())
        assertEquals("A1", r.data.settings.currentLevel) // yangi AppData — standart sozlamalar
        assertNull(r.timer.startedAt)
        assertEquals(uid, r.data.userId)
    }

    @Test
    fun `hydrate - butun holat almashtiriladi`() {
        val data = AppData.empty("u2").copy(xp = 500)
        val s = reduce(start(), Action.Hydrate(data), t0)
        assertEquals(500, s.data.xp)
        assertEquals("u2", s.data.userId)
    }

    /* ---------------------------- yordamchi hisoblar ---------------------------- */

    @Test
    fun `streakOf - 60 sekund yoki urinish bo'lgan kunlar sanaladi`() {
        val yesterday = dayKeyAddDays(today, -1)
        val data =
            AppData.empty(uid).copy(
                activity =
                    linkedMapOf(
                        today to DayActivity(today, seconds = 120, attempts = 1),
                        yesterday to DayActivity(yesterday, seconds = 60, attempts = 0),
                    ),
            )
        assertEquals(2, streakOf(data, today))
        // 59 sekund va urinishsiz — zanjir uziladi. Veb `skillScoring.ts::streakFor`
        // BUGUNGI kundan boshlaydi: bugun shartni qanoatlantirmasa zanjir 0
        // (kechagi 600 sekund uni qutqarmaydi).
        val weak =
            data.copy(
                activity = linkedMapOf(today to DayActivity(today, seconds = 59, attempts = 0), yesterday to DayActivity(yesterday, seconds = 600)),
            )
        assertEquals(0, streakOf(weak, today))
        assertEquals(0, streakOf(AppData.empty(uid), today))
    }

    @Test
    fun `lastNDays - so'nggi N kun faolligi`() {
        val data = AppData.empty(uid).copy(activity = mapOf(today to DayActivity(today, seconds = 300, attempts = 3, correct = 2)))
        val days = lastNDays(data, 7, today)
        assertEquals(7, days.size)
        assertEquals(today, days.last().date)
        assertEquals(300, days.last().seconds)
        assertEquals(0, days.first().seconds)
    }

    @Test
    fun `skillEvidence - attempt va mock natijalari o'z ko'nikmasiga yoziladi`() {
        var s = start()
        s = reduce(s, Action.Attempt(record("a1", "reading", 20, correct = true, difficulty = 2)), t0)
        s = reduce(s, Action.Attempt(record("a2", "reading", 20, correct = false, difficulty = 2)), t0)
        s = reduce(
            s,
            Action.MockAdd(
                MockExamAttempt(
                    id = "m1",
                    examId = "a1-mock",
                    sections = listOf(MockSectionResult(sectionId = "r", skill = Skills.READING, answered = 4, total = 4, score = 88.0, startedAt = t0, finishedAt = t0)),
                    completedAt = t0,
                ),
            ),
            t0,
        )
        val ev = skillEvidence(s.data, t0)
        assertEquals(Skills.CORE, ev.map { it.skill })
        val reading = ev.first { it.skill == Skills.READING }
        assertEquals(3, reading.evidenceCount)
        assertTrue(reading.score > 0)
        assertNotNull(reading.lastAt)
        val listening = ev.first { it.skill == Skills.LISTENING }
        assertEquals(0, listening.evidenceCount)
    }

    @Test
    fun `skillEvidence - yozish va gapirish tahlillari har asosiy ko'nikmaga qo'shiladi`() {
        val data =
            AppData.empty(uid).copy(
                writing =
                    listOf(
                        WritingSubmission(
                            id = "s1",
                            taskId = "w1",
                            text = "x",
                            wordCount = 40,
                            secondsSpent = 100,
                            createdAt = t0,
                            analysis = WritingAnalysis(engine = "rule-based", criteriaScores = mapOf("task_achievement" to 4.0, "coherence" to 3.0, "lexical_resource" to 3.0, "grammatical_range" to 3.0, "accuracy" to 4.0)),
                        ),
                    ),
                speaking =
                    listOf(
                        SpeakingSession(
                            id = "sp1",
                            taskId = "t",
                            durationSec = 40,
                            createdAt = t0,
                            analysis = SpeakingAnalysis(engine = "rule-based", mode = "audio", fluency = 5.0, lexis = 3.0, grammar = 4.0, length = 3.0, wordCount = 40, wpm = 60.0),
                        ),
                    ),
            )
        val ev = skillEvidence(data, t0)
        for (e in ev) {
            assertEquals(e.skill, 2, e.evidenceCount)
        }
    }
}
