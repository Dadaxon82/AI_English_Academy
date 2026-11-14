package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.AppData
import com.dadaxon.aienglishacademy.data.AttemptRecord
import com.dadaxon.aienglishacademy.data.DayActivity
import com.dadaxon.aienglishacademy.data.DiagnosticResult
import com.dadaxon.aienglishacademy.data.LearningPath
import com.dadaxon.aienglishacademy.data.SrsState
import com.dadaxon.aienglishacademy.data.UserSettings
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Birlashtirish qoidalari (veb `merge.ts`) — ikkala tomon BIR bazaga yozgani
 * uchun qoidalar mobil va vebda bir xil bo'lishi shart.
 */
class MergeTest {

    private fun attempt(id: String, at: Long, correct: Boolean = true) = AttemptRecord(
        id = id, exerciseId = "ex", skill = "reading", level = "A1",
        correct = correct, partial = if (correct) 1.0 else 0.0, difficulty = 1,
        secondsSpent = 5, source = "practice", answerGiven = "", at = at,
    )

    @Test
    fun pristineDeviceTakesServerSettings() {
        val local = AppData.empty("u-1")
        val remote = RemoteSnapshot(settings = UserSettings(dailyMinutes = 150, currentLevel = "A2"))
        val out = mergeRemote(local, remote)
        assertEquals(150, out.settings.dailyMinutes)
        assertEquals("A2", out.settings.currentLevel)
    }

    @Test
    fun nonPristineKeepsOwnSettings() {
        // Foydalanuvchi shu qurilmada sozlamani o'zgartirgan — server bosmaydi.
        val local = AppData.empty("u-1").copy(
            settings = UserSettings(dailyMinutes = 45),
            attempts = listOf(attempt("a1", 1L)),
        )
        val out = mergeRemote(local, RemoteSnapshot(settings = UserSettings(dailyMinutes = 150)))
        assertEquals(45, out.settings.dailyMinutes)
    }

    @Test
    fun attemptsUnionByIdLocalWins() {
        val local = AppData.empty("u-1").copy(
            attempts = listOf(attempt("a1", 10L, correct = true), attempt("a2", 20L, correct = false)),
        )
        val remote = RemoteSnapshot(attempts = listOf(attempt("a1", 10L, correct = false), attempt("a3", 30L)))
        val out = mergeRemote(local, remote)
        assertEquals(listOf("a1", "a2", "a3"), out.attempts.map { it.id }.sorted())
        assertTrue(out.attempts.first { it.id == "a1" }.correct) // lokal ustun
    }

    @Test
    fun srsMoreRepsWinsTieBreakByRecency() {
        val local = AppData.empty("u-1").copy(
            srs = linkedMapOf(
                "v1" to SrsState(dueAt = 100L, reps = 5, ease = 2.6, lastReviewedAt = 500L),
                "v2" to SrsState(dueAt = 100L, reps = 2, lastReviewedAt = 900L),
            ),
        )
        val remote = RemoteSnapshot(
            srs = linkedMapOf(
                "v1" to SrsState(dueAt = 999L, reps = 1, ease = 2.0),
                "v2" to SrsState(dueAt = 888L, reps = 2, lastReviewedAt = 1000L),
            ),
        )
        val out = mergeRemote(local, remote)
        assertEquals(5, out.srs["v1"]!!.reps)   // ko'proq takror ustun
        assertEquals(100L, out.srs["v1"]!!.dueAt)
        assertEquals(2, out.srs["v2"]!!.reps)
        assertEquals(888L, out.srs["v2"]!!.dueAt) // teng → yangiroq (remote)
    }

    @Test
    fun activityIsFieldWiseMaxNotSum() {
        val local = AppData.empty("u-1").copy(
            activity = linkedMapOf("2026-11-04" to DayActivity(date = "2026-11-04", seconds = 300, attempts = 4, correct = 3, skills = mapOf("reading" to 300))),
        )
        val remote = RemoteSnapshot(
            activity = linkedMapOf("2026-11-04" to DayActivity(date = "2026-11-04", seconds = 900, attempts = 2, correct = 1, skills = mapOf("reading" to 800, "writing" to 100))),
        )
        val out = mergeRemote(local, remote)
        val d = out.activity["2026-11-04"]!!
        // Ikki marta o'qilsa vaqt ikki marta sanalmasligi kerak → maksimum.
        assertEquals(900, d.seconds)
        assertEquals(4, d.attempts)
        assertEquals(3, d.correct)
        assertEquals(800, d.skills["reading"])
        assertEquals(100, d.skills["writing"])
    }

    @Test
    fun xpIsMaxAndDaysAreUnion() {
        val local = AppData.empty("u-1").copy(
            xp = 10,
            path = LearningPath(completedDays = listOf("a1-day-01"), passedTests = mapOf("t1" to 70)),
        )
        val remote = RemoteSnapshot(
            plan = RemotePlan(
                xp = 40,
                path = RemotePath(completedDays = listOf("a1-day-01", "a1-day-02"), passedTests = mapOf("t1" to 55, "t2" to 80), currentDayId = "a1-day-02"),
            ),
        )
        val out = mergeRemote(local, remote)
        assertEquals(40, out.xp)
        assertEquals(listOf("a1-day-01", "a1-day-02"), out.path.completedDays)
        assertEquals(70, out.path.passedTests["t1"]) // maksimum
        assertEquals(80, out.path.passedTests["t2"])
    }

    @Test
    fun currentDayIdComesFromContentOrder() {
        val local = AppData.empty("u-1").copy(
            path = LearningPath(completedDays = listOf("a1-day-01", "a1-day-02")),
        )
        val remote = RemoteSnapshot(plan = RemotePlan(path = RemotePath(completedDays = emptyList(), currentDayId = "a1-day-01")))
        val out = mergeRemote(local, remote, listOf("a1-day-01", "a1-day-02", "a1-day-03"))
        // Kontentdagi tartib bo'yicha tugallanmagan birinchi kun — server taxmini emas.
        assertEquals("a1-day-03", out.path.currentDayId)
    }

    @Test
    fun diagnosticNewerWinsOnboardedIsEarliest() {
        val local = AppData.empty("u-1").copy(
            diagnostic = DiagnosticResult(at = 100L, level = "A1", labelUz = "A1", confidence = 0.5),
            onboardedAt = 500L,
        )
        val remote = RemoteSnapshot(
            plan = RemotePlan(
                diagnostic = DiagnosticResult(at = 200L, level = "A2", labelUz = "A2", confidence = 0.8),
                onboardedAt = 300L,
            ),
        )
        val out = mergeRemote(local, remote)
        assertEquals("A2", out.diagnostic!!.level) // yangiroq
        assertEquals(300L, out.onboardedAt) // birinchi (boshqa qurilmada) onboarding
    }

    @Test
    fun mergeIsIdempotent() {
        // Bir xil server holati ikki marta o'qilsa natija o'zgarmaydi.
        val local = AppData.empty("u-1").copy(
            attempts = listOf(attempt("a1", 10L)),
            activity = linkedMapOf("2026-11-04" to DayActivity("2026-11-04", seconds = 300, attempts = 4)),
            srs = linkedMapOf("v1" to SrsState(dueAt = 10L, reps = 2)),
        )
        val remote = RemoteSnapshot(
            attempts = listOf(attempt("a1", 10L, correct = false), attempt("a2", 20L)),
            activity = linkedMapOf("2026-11-04" to DayActivity("2026-11-04", seconds = 700, attempts = 9)),
            srs = linkedMapOf("v1" to SrsState(dueAt = 20L, reps = 1)),
            plan = RemotePlan(xp = 100),
        )
        val once = mergeRemote(local, remote)
        val twice = mergeRemote(once, remote)
        assertEquals(once.attempts.size, twice.attempts.size)
        assertEquals(once.activity["2026-11-04"]!!.seconds, twice.activity["2026-11-04"]!!.seconds)
        assertEquals(once.srs["v1"]!!.reps, twice.srs["v1"]!!.reps)
        assertEquals(once.xp, twice.xp)
    }

    @Test
    fun pristineDetectionIsHonest() {
        assertTrue(isPristine(AppData.empty("u-1")))
        assertFalse(isPristine(AppData.empty("u-1").copy(attempts = listOf(attempt("a", 1L)))))
        assertFalse(isPristine(AppData.empty("u-1").copy(onboardedAt = 1L)))
        assertFalse(isPristine(AppData.empty("u-1").copy(path = LearningPath(completedDays = listOf("a1-day-01")))))
    }

    @Test
    fun nothingRemoteKeepsLocalEverything() {
        val local = AppData.empty("u-1").copy(xp = 3, settings = UserSettings(dailyMinutes = 60))
        val out = mergeRemote(local, RemoteSnapshot())
        assertEquals(3, out.xp)
        assertEquals(60, out.settings.dailyMinutes)
        assertNull(out.diagnostic)
    }
}
