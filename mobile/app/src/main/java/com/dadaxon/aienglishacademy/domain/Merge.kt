package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.AppData
import com.dadaxon.aienglishacademy.data.AttemptRecord
import com.dadaxon.aienglishacademy.data.BadgeAward
import com.dadaxon.aienglishacademy.data.DayActivity
import com.dadaxon.aienglishacademy.data.DiagnosticResult
import com.dadaxon.aienglishacademy.data.GameConfig
import com.dadaxon.aienglishacademy.data.GameState
import com.dadaxon.aienglishacademy.data.LearningPath
import com.dadaxon.aienglishacademy.data.LeagueRow
import com.dadaxon.aienglishacademy.data.LeagueSnapshot
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
    /** Yutuq nishonlari — `plan.badges` (veb `merge.ts`). */
    val badges: List<BadgeAward>? = null,
    /** O'yin qatlami — `plan.game` (liga jadvali bu yerda SAQLANMAYDI). */
    val game: GameState? = null,
)

data class RemotePath(
    val completedDays: List<String> = emptyList(),
    val passedTests: Map<String, Int> = emptyMap(),
    val currentDayId: String = "a1-day-01",
)

/**
 * O'qilgan liga tablasi (`weekly_xp`). Snapshot emas — `rank` va
 * `prizeClaimed` bu yerda YO'Q: ular qurilmada hisoblanadi
 * (`applyLeagueSnapshot`).
 */
data class RemoteLeague(
    val weekStart: String,
    val leagueId: String,
    val entries: List<LeagueRow> = emptyList(),
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
    /** Liga jadvali (o'sha hafta + o'sha liga). Bo'sh bo'lsa eski snapshot qoladi. */
    val league: RemoteLeague? = null,
    /** `profiles.display_name` — bo'sh kelsa lokal ism saqlanadi (ism ixtir qilinmaydi). */
    val profileName: String = "",
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

/**
 * O'yin holatini birlashtirish — ikkala qurilmada ham gemlar/questlar/yutuqlar
 * hisoblanadi, shuning uchun qoidalar "bir tomon yutadi" emas, MAYDON BO'YICHA
 * (veb `merge.ts::mergeGame`):
 *  - gem, freeze, xatosiz darslar, questlar sanog'i, yutuq darajasi — MAKSIMUM
 *    (takror sanalmaydi, chunki har bir sovg'a marta belgilangan);
 *  - yurak — `heartsAt` QAYSI TARAFFDA KECH BO'LSA O'SHA SON; tiklanish soati
 *    eng kech `heartsAt` dan davom etadi (ikki qurilma bir tiklanishni IKKI
 *    marta sanamasligi uchun);
 *  - kunlik hisoblar (`today`, `questsDay`) — `today.day` kechroq bo'lgan tara;
 *  - `frozenDays`, `chestsWeeks`, `questsDone` — BIRLASHMA (kalit bo'yicha);
 *  - liga snapshoti — eng yangi `at`;
 *  - `combo` — qurilmadagisi (bu shu mashqning ketma-ketligi, serverda
 *    ma'nosi yo'q — shuning uchun u yuqoridagi ro'yxatda umuman ko'chirilmaydi).
 * Qayta-qaeta birlashtirilsa natija O'WGARMAYDI (idempotent).
 */
fun mergeGame(local: GameState, remoteRaw: GameState?): GameState {
    if (remoteRaw == null) return local
    val r = GameLogic.normalizeGame(remoteRaw, local.today.day)
    val heartsNewer = r.heartsAt > local.heartsAt
    val remoteDayNewer = r.today.day > local.today.day

    val questsDone = ArrayList(r.questsDone)
    val qSeen = questsDone.mapTo(HashSet()) { it.id }
    for (q in local.questsDone) if (qSeen.add(q.id)) questsDone.add(q)

    val achievementLevels = LinkedHashMap(local.achievementLevels)
    for ((k, v) in r.achievementLevels) achievementLevels[k] = max(achievementLevels[k] ?: 0, max(0, v))

    // Garov: ikkalasi bo'lsa — yangiroq boshlangan saqlanadi (eski garov
    // allaqachon yakunlangan bo'lishi ehtimoli kuchli).
    val bet = when {
        local.bet == null -> r.bet
        r.bet == null -> local.bet
        r.bet.startDay > local.bet.startDay -> r.bet
        else -> local.bet
    }

    // Liga snapshoti: serverdan kelgani (bo'sh bo'lmasa) ustun, aks holda
    // `at` kechroq bo'lgan qoladi.
    val league: LeagueSnapshot? = validLeague(r.league)
        ?: local.league?.takeIf { it.at >= (r.league?.at ?: 0L) }
        ?: r.league

    return local.copy(
        hearts = if (heartsNewer) r.hearts else local.hearts,
        heartsAt = max(local.heartsAt, r.heartsAt),
        practiceReviews = max(local.practiceReviews, r.practiceReviews),
        gems = max(local.gems, r.gems),
        freezes = max(local.freezes, r.freezes),
        boostUntil = max(local.boostUntil, r.boostUntil),
        bet = bet,
        frozenDays = (local.frozenDays + r.frozenDays).distinct(),
        today = if (remoteDayNewer) r.today else local.today,
        questsDay = if (remoteDayNewer) r.questsDay else local.questsDay,
        questsDone = questsDone,
        questsTotal = max(local.questsTotal, r.questsTotal),
        goalRewardedDay = if (r.goalRewardedDay > local.goalRewardedDay) r.goalRewardedDay else local.goalRewardedDay,
        achievementLevels = achievementLevels,
        perfectLessonsTotal = max(local.perfectLessonsTotal, r.perfectLessonsTotal),
        chestsWeeks = (local.chestsWeeks + r.chestsWeeks).distinct(),
        league = league,
    )
}

/** Liga snapshoti HAQIQIY jadvalmi (bo'sh bo'lmasa) — aks holda null. */
private fun validLeague(s: LeagueSnapshot?): LeagueSnapshot? =
    if (s != null && s.entries.isNotEmpty()) s else null

/**
 * O'qilgan liga tablasini holatga kiritish (veb `merge.ts::applyLeagueSnapshot`).
 *
 *  - Tablo bo'sh bo'lsa OLDINKI snapshot saqlanadi (internet bo'lmasa ekranda
 *    oxirgi holat ko'rsatiladi — "eski sana" bilan ochiq aytiladi).
 *  - Eski haftaning sovg'asi hali OLINMAGAN bo'lsa (`prizeClaimed: false`)
 *    snapshot ALMASHIRILMAYDI — aks holda pull yakunlangan haftani bosib
 *    ketadi va sovg'a abadiy yo'qoladi. `settleLeaguePrize()` sovg'ani berib
 *    `prizeClaimed: true` qiladi — keyingi o'qish yangi haftani qabul qiladi.
 */
fun applyLeagueSnapshot(
    g: GameState,
    read: RemoteLeague?,
    userId: String,
    at: Long = System.currentTimeMillis(),
): GameState {
    if (read == null || read.entries.isEmpty()) return g
    val cur = g.league
    if (cur != null && !cur.prizeClaimed && cur.weekStart < read.weekStart) return g
    val sorted = read.entries.sortedByDescending { it.xp }.take(GameConfig.LEAGUE_BOARD_SIZE)
    val idx = sorted.indexOfFirst { it.userId == userId }
    return g.copy(
        league = LeagueSnapshot(
            weekStart = read.weekStart,
            leagueId = GameConfig.leagueById(read.leagueId).id,
            rank = if (idx == -1) 0 else idx + 1,
            boardSize = sorted.size,
            at = at,
            entries = sorted,
            prizeClaimed = false,
        ),
    )
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

    // Nishonlar (yutuqlar) serverda `plan.badges` da yuradi — `id` bo'yicha
    // birlashma: ikkala qurilma ham yangi yutuq ochgan bo'lsa, ikkalasi qoladi.
    val badgeMap = LinkedHashMap<String, BadgeAward>()
    for (b in remote.plan?.badges ?: emptyList()) badgeMap[b.id] = b
    for (b in local.badges) badgeMap[b.id] = b
    val badges = badgeMap.values.sortedBy { it.at }

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
        badges = badges,
        // Profil nomi faqat serverdan o'qiladi (`profiles.display_name`); bo'sh
        // kelsa lokal qiymat saqlanadi — ism ixtir qilinmaydi.
        profileName = if (remote.profileName.isNotBlank()) remote.profileName else local.profileName,
        game = applyLeagueSnapshot(mergeGame(local.game, remote.plan?.game), remote.league, local.userId),
    )
}

/** Veb `{...local.settings, ...remote.settings}` — faqat serverda bor maydonlar. */
private fun mergeSettings(local: UserSettings, remote: UserSettings): UserSettings = remote
