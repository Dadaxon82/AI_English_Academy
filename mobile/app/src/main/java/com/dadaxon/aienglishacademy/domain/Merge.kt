package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.AppData
import com.dadaxon.aienglishacademy.data.AttemptRecord
import com.dadaxon.aienglishacademy.data.DayActivity
import com.dadaxon.aienglishacademy.data.DiagnosticResult
import com.dadaxon.aienglishacademy.data.LearningPath
import com.dadaxon.aienglishacademy.data.MockExamAttempt
import com.dadaxon.aienglishacademy.data.SpeakingSession
import com.dadaxon.aienglishacademy.data.SrsState
import com.dadaxon.aienglishacademy.data.UserSettings
import com.dadaxon.aienglishacademy.data.WritingSubmission
import kotlin.math.max

/**
 * Serverdagi holatni qurilmadagi holat bilan birlashtirish (toza funksiya).
 * MANBA: veb `src/lib/merge.ts` — qoidalar so'zma-so'z olindi (veb va mobil
 * BIR jadvalga yozgani uchun ikkala tomon ham shu qoidalarga bo'ysunadi).
 *
 * ESKI BUG: ilova serverdan HECH NARSA o'qimasdi, logout esa lokal keshni
 * tozalardi — qayta kirganda yoki boshqa qurilmada progress noldan boshlanardi.
 *
 * Qoidalar (qayta-qayta chaqirilsa ham natija o'zgarmaydi):
 *  - urinishlar, yozish/gapirish ishlari, mock natijalari — `id` bo'yicha birlashma;
 *  - SRS — ko'proq takrorlangan (`reps`) holat ustun, teng bo'lsa keyingisi;
 *  - kunlik faollik — har maydon bo'yicha maksimum (bir xil kun ikki marta
 *    o'qilsa ham vaqt ikki marta sanalmaydi);
 *  - sozlamalar — qurilmada hali hech narsa bo'lmasa serverdagisi, aks holda
 *    qurilmadagisi (foydalanuvchi shu yerda o'zgartirgan);
 *  - o'quv yo'li — tugatilgan kunlar birlashmasi, test ballari maksimumi.
 */

/** Serverdan o'qilgan holat (faqat foydalanuvchining o'z qatorlari — RLS). */
data class RemotePlan(
    val path: RemotePath? = null,
    val xp: Int? = null,
    val diagnostic: DiagnosticResult? = null,
    val onboardedAt: Long? = null,
)

data class RemotePath(
    val completedDays: List<String> = emptyList(),
    val passedTests: Map<String, Int> = emptyMap(),
    val currentDayId: String = "a1-day-01",
)

data class RemoteSnapshot(
    val settings: UserSettings? = null,
    val plan: RemotePlan? = null,
    val attempts: List<AttemptRecord> = emptyList(),
    val srs: Map<String, SrsState> = emptyMap(),
    val activity: Map<String, DayActivity> = emptyMap(),
    val writing: List<WritingSubmission> = emptyList(),
    val speaking: List<SpeakingSession> = emptyList(),
    val mockAttempts: List<MockExamAttempt> = emptyList(),
)

/** Qurilmada hali hech qanday o'quv izi yo'q (yangi qurilma yoki chiqishdan keyin). */
fun isPristine(d: AppData): Boolean =
    d.attempts.isEmpty() &&
        d.srs.isEmpty() &&
        d.activity.isEmpty() &&
        d.writing.isEmpty() &&
        d.speaking.isEmpty() &&
        d.mockAttempts.isEmpty() &&
        d.path.completedDays.isEmpty() &&
        d.diagnostic == null &&
        d.onboardedAt == null

private fun <T : Any> unionById(local: List<T>, remote: List<T>, id: (T) -> String, at: (T) -> Long, cap: Int): List<T> {
    val map = LinkedHashMap<String, T>()
    for (r in remote) map[id(r)] = r
    // Lokal yozuv ustun: unda serverga yuborilmaydigan maydonlar ham bor
    // (masalan gapirish yozuvining qurilmadagi audio belgisi).
    for (l in local) map[id(l)] = l
    return map.values.sortedBy(at).takeLast(cap)
}

private fun pickSrs(local: SrsState, remote: SrsState): SrsState {
    if (local.reps != remote.reps) return if (local.reps > remote.reps) local else remote
    return if ((remote.lastReviewedAt ?: 0L) > (local.lastReviewedAt ?: 0L)) remote else local
}

private fun mergeDay(local: DayActivity, remote: DayActivity): DayActivity {
    val skills = LinkedHashMap(local.skills)
    for ((k, v) in remote.skills) skills[k] = max(skills[k] ?: 0, v)
    return DayActivity(
        date = local.date,
        seconds = max(local.seconds, remote.seconds),
        attempts = max(local.attempts, remote.attempts),
        correct = max(local.correct, remote.correct),
        newWords = max(local.newWords, remote.newWords),
        reviewedWords = max(local.reviewedWords, remote.reviewedWords),
        skills = skills,
    )
}

/**
 * `daysInLevel` — joriy darajaning kun id'lari TARTIBI bilan (ContentRepository
 * `bundle(level).days.map { it.id }` dan). Vebda bu `getBundle(level).days`.
 * Bo'sh bo'lsa joriy kun lokal qiymatda qoladi.
 */
fun mergeRemote(local: AppData, remote: RemoteSnapshot, daysInLevel: List<String> = emptyList()): AppData {
    val pristine = isPristine(local)
    val settings: UserSettings =
        if (pristine && remote.settings != null) mergeSettings(local.settings, remote.settings) else local.settings

    val srs = LinkedHashMap(local.srs)
    for ((id, st) in remote.srs) {
        val mine = srs[id]
        srs[id] = if (mine != null) pickSrs(mine, st) else st
    }

    val activity = LinkedHashMap(local.activity)
    for ((day, act) in remote.activity) {
        val mine = activity[day]
        activity[day] = if (mine != null) mergeDay(mine, act) else act
    }

    val rp = remote.plan?.path
    val completedDays = ArrayList(local.path.completedDays)
    for (d in rp?.completedDays ?: emptyList()) if (!completedDays.contains(d)) completedDays.add(d)
    val passedTests = LinkedHashMap(local.path.passedTests)
    for ((k, v) in rp?.passedTests ?: emptyMap()) passedTests[k] = max(passedTests[k] ?: 0, v)
    val fallbackDay = if (pristine && rp != null) rp.currentDayId else local.path.currentDayId
    val currentDayId = daysInLevel.firstOrNull { !completedDays.contains(it) } ?: fallbackDay

    val ld = local.diagnostic
    val rd = remote.plan?.diagnostic
    val diagnostic = when {
        rd == null -> ld
        ld == null -> rd
        rd.at > ld.at -> rd
        else -> ld
    }
    // Onboarding bir marta (istalgan qurilmada) yakunlangan bo'lsa yetarli — eng birinchisi.
    val ro = remote.plan?.onboardedAt
    val onboardedAt = when {
        local.onboardedAt == null -> ro
        ro == null -> local.onboardedAt
        else -> minOf(local.onboardedAt, ro)
    }

    return local.copy(
        settings = settings,
        srs = srs,
        activity = activity,
        attempts = unionById(local.attempts, remote.attempts, { it.id }, { it.at }, AppData.LIMIT_ATTEMPTS),
        writing = unionById(local.writing, remote.writing, { it.id }, { it.createdAt }, AppData.LIMIT_WRITING),
        speaking = unionById(local.speaking, remote.speaking, { it.id }, { it.createdAt }, AppData.LIMIT_SPEAKING),
        mockAttempts = unionById(local.mockAttempts, remote.mockAttempts, { it.id }, { it.completedAt }, AppData.LIMIT_MOCK),
        xp = max(local.xp, remote.plan?.xp ?: 0),
        path = LearningPath(completedDays = completedDays, passedTests = passedTests, currentDayId = currentDayId),
        diagnostic = diagnostic,
        onboardedAt = onboardedAt,
    )
}

/** Veb `{...local.settings, ...remote.settings}` — faqat serverda bor maydonlar. */
private fun mergeSettings(local: UserSettings, remote: UserSettings): UserSettings = remote
