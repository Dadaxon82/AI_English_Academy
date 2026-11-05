package com.dadaxon.aienglishacademy.domain

/**
 * Holat reduceri — har bir o'zgarish BIR joyda, toza funksiya bilan.
 *
 * MANBA: veb `src/lib/store.tsx` (`reducer`, `addActivitySeconds`) va
 * `src/lib/timer.ts` (taymer qoidalari) — ikki marta sanash qoidalari,
 * `xpForAttempt`, `newWords`/`reviewedWords`, `day-complete` test bali x.KK
 * va boshqa barcha qoidalar SO'ZMA-SO'Z ko'chirildi.
 *
 * Mobil farq: vebda `timer` maydoni `AppData` ichida yurgani uchun butun
 * holat bitta obyekt edi; mobil `AppData`da (data/Models.kt) `timer` YO'Q —
 * shuning uchun reducer `State(data, timer)` qaytaradi. Taymer qurilmadagi
 * jarayat holati, foydalanuvchi ma'lumoti emas (serverga yuborilmaydi).
 */

import com.dadaxon.aienglishacademy.data.AppData
import com.dadaxon.aienglishacademy.data.AttemptRecord
import com.dadaxon.aienglishacademy.data.DayActivity
import com.dadaxon.aienglishacademy.data.DiagnosticResult
import com.dadaxon.aienglishacademy.data.MockExamAttempt
import com.dadaxon.aienglishacademy.data.Skills
import com.dadaxon.aienglishacademy.data.SpeakingSession
import com.dadaxon.aienglishacademy.data.UserSettings
import com.dadaxon.aienglishacademy.data.WritingSubmission
import com.dadaxon.aienglishacademy.data.todayKey

/**
 * Veb `TimerState` (src/lib/timer.ts). Mobil `AppData`da taymer saqlanmaydi,
 * shuning uchun u alohida holatda yuradi.
 */
data class TimerState(
    /** Faol o'lchangan sekundlar soni (pauzada hisoblanmaydi) */
    val elapsedSec: Long = 0L,
    /** startedAt === null bo'lsa taymer to'xtatilgan/pauzada */
    val startedAt: Long? = null,
    val skill: String? = null,
    /** Bugungi bog'langan mashg'ulot idsi (bo'sh bo'lsa bog'lanmagan) */
    val sessionId: String? = null,
    /** So'nggi marta saqlangan vaqt — qulashdan tiklash uchun */
    val updatedAt: Long = 0L,
)

/** Veb: `idleTimer`. */
fun idleTimer(now: Long = System.currentTimeMillis()): TimerState = TimerState(updatedAt = now)

/** Reducer holati (vebda bitta `AppData`, bu yerda `timer` alohida). */
data class State(val data: AppData = AppData.empty(), val timer: TimerState = idleTimer())

/**
 * Veb: `MAX_CONTINUOUS_SEC` — uyqu/sahifa yopiq oralig'i cheklangani uchun.
 * 3 soat — real seans uchun chegara.
 */
const val MAX_CONTINUOUS_SEC = 3 * 3600L

/** Veb Action birlashmasi. */
sealed class Action {
    data class Hydrate(val data: AppData) : Action()

    data class Settings(val patch: SettingsPatch) : Action()

    data class Attempt(val record: AttemptRecord) : Action()

    data class Srs(val vocabId: String, val grade: SrsGrade) : Action()

    data class SrsAdd(val vocabId: String) : Action()

    data class TimerStart(val sessionId: String, val skill: String) : Action()

    object TimerPause : Action()

    object TimerStop : Action()

    data class WritingAdd(val sub: WritingSubmission) : Action()

    data class SpeakingAdd(val session: SpeakingSession) : Action()

    data class MockAdd(val attempt: MockExamAttempt) : Action()

    /** `seconds` — Double: vebda `Number.isFinite` tekshiriladi (NaN → 0). */
    data class MockTime(val entries: List<MockTimeEntry>) : Action()

    data class MergeRemote(val userId: String, val remote: RemoteSnapshot, val daysInLevel: List<String> = emptyList()) : Action()

    /** `testScore` null bo'lsa — test balli yo'q (vebdagi `?: number`). */
    data class DayComplete(val dayId: String, val testScore: Int? = null, val testId: String? = null, val daysInLevel: List<String> = emptyList()) : Action()

    data class Diagnostic(
        val at: Long,
        val level: String?,
        val labelUz: String,
        val confidence: Double,
    ) : Action()

    data class Onboarded(val at: Long) : Action()

    data class LevelSet(val level: String) : Action()

    object Reset : Action()
}

/** `UserSettings` qisman yangilanishi (veb: `Partial<UserSettings>`). */
data class SettingsPatch(
    val dailyMinutes: Int? = null,
    val currentLevel: String? = null,
    val targetLevel: String? = null,
    val examDate: String? = null,
    /** `examDateSet = true` bo'lsa `examDate` qiymati (null ham) qo'llanadi. */
    val examDateSet: Boolean = false,
    val allocation: Map<String, Int>? = null,
    val theme: String? = null,
    val aiEnabled: Boolean? = null,
)

/** Veb: `{ skill: CoreSkill; seconds: number }`. */
data class MockTimeEntry(val skill: String, val seconds: Double)

/** Kundalik faollikka daqiqa/sekund qo'shish (taymer hisobi uchun umumiy). */
private fun addActivitySeconds(
    state: AppData,
    seconds: Int,
    skill: String,
    now: Long,
): AppData {
    if (seconds <= 0) return state
    val key = todayKey(now)
    val cur =
        state.activity[key] ?: DayActivity(
            date = key,
            seconds = 0,
            attempts = 0,
            correct = 0,
            newWords = 0,
            reviewedWords = 0,
            skills = emptyMap(),
        )
    val skills = LinkedHashMap(cur.skills)
    skills[skill] = (skills[skill] ?: 0) + seconds
    val day =
        cur.copy(
            seconds = cur.seconds + seconds,
            skills = skills,
        )
    val activity = LinkedHashMap(state.activity)
    activity[key] = day
    return state.copy(activity = activity)
}

/** Veb: `reducer(state, action)` — bu yerda vaqt paramatr bilan beriladi (testlar uchun). */
fun reduce(
    state: State,
    action: Action,
    now: Long = System.currentTimeMillis(),
): State {
    val st = state.data
    when (action) {
        is Action.Hydrate -> return state.copy(data = action.data)

        is Action.Settings -> return state.copy(data = st.copy(settings = applySettings(st.settings, action.patch)))

        is Action.Attempt -> {
            val r = action.record
            val key = todayKey(now)
            val cur =
                st.activity[key] ?: DayActivity(
                    date = key,
                    seconds = 0,
                    attempts = 0,
                    correct = 0,
                    newWords = 0,
                    reviewedWords = 0,
                    skills = emptyMap(),
                )
            // Ikki marta sanash qoidasi: taymer yurayotgan bo'lsa vaqt devor-soat
            // bo'yicha ALLOQACHON hisoblanadi — lekin FaqAT shu taymer sessiyasining
            // ko'nikmasi uchun. Boshqa ko'nikma bo'yicha attempt (masalan Yozish
            // taymeri yurarida 300 sekundlik Grammatika mashqi) o'z sekundlarini
            // olib keladi va ULAR YO'QOLMASLIGI kerak (eski bug: grammar=0).
            val timerCoversThisSkill = state.timer.startedAt != null && state.timer.skill == r.skill
            val skills = LinkedHashMap(cur.skills)
            if (!timerCoversThisSkill) {
                skills[r.skill] = (skills[r.skill] ?: 0) + Math.max(0, r.secondsSpent)
            } else if (skills[r.skill] == null) {
                skills[r.skill] = 0
            }
            val day =
                cur.copy(
                    attempts = cur.attempts + 1,
                    correct = cur.correct + (if (r.correct) 1 else 0),
                    // MUHIM: mashqda sarflangan vaqt kundalik hisobga qo'shiladi —
                    // oldin Dashboard/Progress grafigi bo'sh qolardi ("Bajarildi"
                    // yashil, "0/90 daq" — ziddiyat). LEKIN taymer yurayotgan bo'lsa
                    // (Reading/LearningPath) vaqt ALLOQACHON devor-soat bo'yicha
                    // hisoblanadi — ikki marta sanamaslik uchu shu yerda qo'shmaymiz.
                    // `skills` taqsimoti ham shu qoidaga BO'YSINADI — aks holda
                    // ko'nikma yig'indisi umumiy sekunddan oshib ketardi.
                    seconds = if (timerCoversThisSkill) cur.seconds else cur.seconds + Math.max(0, r.secondsSpent),
                    skills = skills,
                )
            val activity = LinkedHashMap(st.activity)
            activity[key] = day
            return state.copy(
                data =
                    st.copy(
                        attempts = (st.attempts + r).takeLast(AppData.LIMIT_ATTEMPTS),
                        xp = st.xp + xpForAttempt(r.correct, r.difficulty, true),
                        activity = activity,
                    ),
            )
        }

        is Action.Srs -> {
            val prev = st.srs[action.vocabId] ?: initialSrsState(now)
            val next = review(prev, action.grade, now)
            val key = todayKey(now)
            val cur =
                st.activity[key] ?: DayActivity(
                    date = key,
                    seconds = 0,
                    attempts = 0,
                    correct = 0,
                    newWords = 0,
                    reviewedWords = 0,
                    skills = emptyMap(),
                )
            val firstLearn = prev.learnedAt == null && next.learnedAt != null
            val day =
                cur.copy(
                    // Takrorlangan so'z IKKI marta hisoblanmaydi: `newWords` faqat
                    // birinchi marta o'zlashtirilganda oshadi.
                    newWords = cur.newWords + (if (firstLearn) 1 else 0),
                    reviewedWords = cur.reviewedWords + (if (firstLearn) 0 else 1),
                )
            val activity = LinkedHashMap(st.activity)
            activity[key] = day
            val srs = LinkedHashMap(st.srs)
            srs[action.vocabId] = next
            return state.copy(data = st.copy(srs = srs, activity = activity))
        }

        is Action.SrsAdd -> {
            // "Lug'atimga saqlash": so'z takrorlash jadvaliga qo'shiladi (bugun
            // takrorlanadi). ESKI KAMCHILIK: bu `again` bahosi bilan qilinardi —
            // saqlash xato (lapse) va "takrorlangan so'z" sifatida sanalardi.
            if (st.srs.containsKey(action.vocabId)) return state
            val srs = LinkedHashMap(st.srs)
            srs[action.vocabId] = initialSrsState(now)
            return state.copy(data = st.copy(srs = srs))
        }

        is Action.TimerStart -> {
            // MUHIM: boshqa mashg'ulotga o'tishda oldingi sessiyaning yig'ilgan
            // vaqti AVVAL kundalik hisobga yoziladi. Oldin `startTimer` bu sekundlarni
            // jimgina tashlab yuborardi — foydalanuvchi "yo'qolgan daqiqalar"ni
            // ko'rardi (O'qishda 25 daq → Yozishga o'tsa hisob 0).
            //
            // Xuddi shu SESSIYA + xuddi shu ko'nikma qayta boshlansa (sahifaga
            // qaytish, "Davom etish") yig'ilgan sekundlar hali hisobga YOZILMAGAN
            // bo'ladi — ularni qayta yozib, keyin yana sanash IKKI marta hisob
            // bergani (ESKI BUG).
            //
            // SESSIYA bir xil, lekin KO'NIKMA boshqa bo'lsa (LearningPath: `a1-day-01`
            // sessiyasi bilan Lug'at → Grammatika) — hisoblangan sekundlar AVVAL
            // eski ko'nikmaga yoziladi, keyin tozalanadi. Aks holda butun sessiya
            // vaqti oxirgi ko'nikmaga yozilib, grafigi buzilardi.
            val sameSession =
                state.timer.sessionId != null &&
                    state.timer.sessionId == action.sessionId &&
                    state.timer.skill == action.skill
            if (sameSession) {
                return state.copy(timer = startTimer(state.timer, action.sessionId, action.skill, now))
            }
            val prevElapsed = currentElapsed(state.timer, now)
            val committed =
                if (prevElapsed > 0 && state.timer.skill != null) {
                    addActivitySeconds(st, prevElapsed.toInt(), state.timer.skill!!, now)
                } else {
                    st
                }
            return State(
                committed,
                // Yig'ilgan VA hozir yurayotgan vaqt yuqorida eski ko'nikmaga yozildi —
                // yangi taymer noldan boshlanadi. ESKI BUG: `startedAt` saqlanib
                // qolgani uchun `startTimer` (bir sessiya, boshqa ko'nikma) yurgan
                // vaqtni yana `elapsedSec`ga qo'shardi va u ikkinchi marta hisobga
                // yozilardi (2-kun: 10 daq lug'at + 5 daq test → 25 daq).
                startTimer(state.timer.copy(elapsedSec = 0L, startedAt = null), action.sessionId, action.skill, now),
            )
        }

        is Action.TimerPause -> return state.copy(timer = pauseTimer(state.timer, now))

        is Action.TimerStop -> {
            val elapsed = currentElapsed(state.timer, now)
            val skill = state.timer.skill ?: "reading"
            val stopped = stopTimer(state.timer, state.timer.sessionId ?: "", skill, now)
            // Hisobga yozilgan sekundlar darhol NOLLANADI — aks holda sessiyani
            // qayta ishga tushirganda xuddi shu vaqt ikkinchi marta yozilardi.
            return State(addActivitySeconds(st, elapsed.toInt(), skill, now), stopped.copy(elapsedSec = 0L))
        }

        is Action.WritingAdd ->
            return state.copy(data = st.copy(writing = (st.writing + action.sub).takeLast(AppData.LIMIT_WRITING)))

        is Action.SpeakingAdd ->
            return state.copy(data = st.copy(speaking = (st.speaking + action.session).takeLast(AppData.LIMIT_SPEAKING)))

        is Action.MockAdd ->
            return state.copy(data = st.copy(mockAttempts = (st.mockAttempts + action.attempt).takeLast(AppData.LIMIT_MOCK)))

        is Action.MockTime -> {
            // Mock imtihonda sarflangan vaqt kundalik hisobga yoziladi.
            // ESKI BUG: MockExam bo'limlari real taymer yurar, lekin hech qachon
            // `activity`ga yozilmasdi — Dashboard'da "0/90 daq" ko'rsatilardi.
            // Ball/zanjar dalili `skillEvidence()`da mockAttempts orqali ALLOQACHON
            // hisoblanadi, shuning uchun bu yerda attempt QO'SHILMAYDI (ikki marta
            // sanash bo'lardi).
            //
            // Sekundlar — bo'lim haqiqatan OCHIQ turgan vaqt (MockExam hisoblaydi),
            // "boshlanish → yakunlash" ayirmasi emas: ochilmagan bo'limlar ham butun
            // imtihon vaqtini olib, hisob bir necha barobar oshib ketardi.
            var next = st
            for (e in action.entries) {
                val sec =
                    if (e.seconds.isNaN() || e.seconds.isInfinite()) {
                        0
                    } else {
                        Math.min(MAX_CONTINUOUS_SEC, Math.max(0L, Math.round(e.seconds))).toInt()
                    }
                next = addActivitySeconds(next, sec, e.skill, now)
            }
            return state.copy(data = next)
        }

        is Action.MergeRemote -> {
            // Boshqa foydalanuvchiga tegishli (kechikkan) javob bu holatga aralashmaydi.
            if (action.userId != st.userId) return state
            return state.copy(data = mergeRemote(st, action.remote, action.daysInLevel))
        }

        is Action.DayComplete -> {
            val completedDays =
                if (st.path.completedDays.contains(action.dayId)) {
                    st.path.completedDays
                } else {
                    st.path.completedDays + action.dayId
                }
            val passedTests =
                if (action.testId != null && action.testScore != null) {
                    LinkedHashMap(st.path.passedTests).apply {
                        this[action.testId] = Math.max(this[action.testId] ?: 0, action.testScore)
                    }
                } else {
                    st.path.passedTests
                }
            val currentDayId = action.daysInLevel.firstOrNull { !completedDays.contains(it) } ?: st.path.currentDayId
            return state.copy(
                data =
                    st.copy(
                        path =
                            st.path.copy(
                                completedDays = completedDays,
                                passedTests = passedTests,
                                currentDayId = currentDayId,
                            ),
                    ),
            )
        }

        is Action.Diagnostic ->
            return state.copy(
                data =
                    st.copy(
                        diagnostic =
                            DiagnosticResult(
                                at = action.at,
                                level = action.level,
                                labelUz = action.labelUz,
                                confidence = action.confidence,
                            ),
                    ),
            )

        is Action.Onboarded -> {
            if (st.onboardedAt != null) return state
            return state.copy(data = st.copy(onboardedAt = action.at))
        }

        is Action.LevelSet ->
            return state.copy(data = st.copy(settings = st.settings.copy(currentLevel = action.level)))

        is Action.Reset -> return State(AppData.empty(st.userId), idleTimer(now))
    }
}

/** Veb: `{ ...state.settings, ...patch }` — `undefined` maydonlar o'zgarmaydi. */
private fun applySettings(
    settings: UserSettings,
    patch: SettingsPatch,
): UserSettings {
    val examDate =
        when {
            patch.examDateSet -> patch.examDate
            else -> settings.examDate
        }
    return settings.copy(
        dailyMinutes = patch.dailyMinutes ?: settings.dailyMinutes,
        currentLevel = patch.currentLevel ?: settings.currentLevel,
        targetLevel = patch.targetLevel ?: settings.targetLevel,
        examDate = examDate,
        allocation = patch.allocation ?: settings.allocation,
        theme = patch.theme ?: settings.theme,
        aiEnabled = patch.aiEnabled ?: settings.aiEnabled,
    )
}

/* ------------------------- Taymer (veb `src/lib/timer.ts`) ------------------------- */

/**
 * Veb: `clampDelta` — soat siljishi / tizim saati o'zgarsa manfiy bo'lmasligi
 * va uxlash oralig'i cheklanishi uchun.
 */
fun clampDelta(deltaMs: Long): Long {
    if (deltaMs <= 0) return 0L
    return Math.min(deltaMs, MAX_CONTINUOUS_SEC * 1000L)
}

fun clampDelta(deltaMs: Double): Double {
    if (deltaMs.isNaN() || deltaMs.isInfinite() || deltaMs <= 0) return 0.0
    return Math.min(deltaMs, (MAX_CONTINUOUS_SEC * 1000L).toDouble())
}

/** Veb: `startTimer` — bir vaqtda faqat bitta mashg'ulot taymeri yuradi. */
fun startTimer(
    prev: TimerState,
    sessionId: String,
    skill: String,
    now: Long = System.currentTimeMillis(),
): TimerState {
    // Xuddi shu sessiya + xuddi shu ko'nikma: hech narsa qilmaymiz (pauzadan
    // "Davom etish" hisob ustiga qo'shiladi).
    if (prev.startedAt != null && prev.sessionId == sessionId && prev.skill == skill) return prev
    // Sessiya bir xil, lekin KO'NIKMA o'zgarsa (LearningPath: `day-01` sessiyasi
    // bilan vocab → grammar) — oldingi ko'nikmaning hisoblanmagan sekundlarini
    // yig'ib, yangi ko'nikmaga o'tamiz. Aks holda butun sessiya vaqti noto'g'ri
    // ko'nikmaga yozilardi.
    val sameSessionOtherSkill = prev.startedAt != null && prev.sessionId == sessionId && prev.skill != skill
    val base: TimerState =
        when {
            sameSessionOtherSkill -> {
                val runningFor = Math.floor(clampDelta((now - (prev.startedAt ?: now)).toDouble()) / 1000.0).toLong()
                prev.copy(elapsedSec = prev.elapsedSec + runningFor, startedAt = null, updatedAt = now)
            }
            prev.startedAt != null -> stopTimer(prev, sessionId, skill, now)
            else -> prev
        }
    return TimerState(
        elapsedSec = if (base.sessionId == sessionId || base.sessionId == null) base.elapsedSec else 0L,
        startedAt = now,
        sessionId = sessionId,
        skill = skill,
        updatedAt = now,
    )
}

fun pauseTimer(
    prev: TimerState,
    now: Long = System.currentTimeMillis(),
): TimerState {
    if (prev.startedAt == null) return prev
    return prev.copy(
        elapsedSec = prev.elapsedSec + Math.floor(clampDelta((now - (prev.startedAt ?: now)).toDouble()) / 1000.0).toLong(),
        startedAt = null,
        updatedAt = now,
    )
}

fun stopTimer(
    prev: TimerState,
    sessionId: String,
    skill: String,
    now: Long = System.currentTimeMillis(),
): TimerState {
    val paused = pauseTimer(prev, now)
    // Boshqa mashg'ulotga o'tilsa hisob tozalanadi — aralashmasligi uchun.
    if (prev.sessionId != null && prev.sessionId != sessionId) {
        return TimerState(skill = skill, sessionId = null, updatedAt = now)
    }
    // Sessiya tugadi: `sessionId` ham `null` qilinadi — aks holda Dashboard
    // `paused = startedAt === null && sessionId !== null` sharti bilan "Taymer
    // pauzada — 00:00" soxta kartasini chizadi va "Davom etish" o'lik taymerni
    // tiriklashtiradi.
    return paused.copy(sessionId = null, updatedAt = now)
}

/** Veb: `currentElapsed` — devor-soat farqi, rendersiz toza funksiya. */
fun currentElapsed(
    state: TimerState,
    now: Long = System.currentTimeMillis(),
): Long {
    val started = state.startedAt ?: return state.elapsedSec
    return state.elapsedSec + Math.floor(clampDelta((now - started).toDouble()) / 1000.0).toLong()
}

/**
 * Veb: `skillEvidence(data)` — har asosiy ko'nikma uchun ball/dalil/ishonch.
 *
 * Qoida veb bilan bir xil: `attempts` va Mock Exam bo'limlari faqat O'Z
 * ko'nikmasi bo'yicha olinadi (`if (a.skill !== skill) continue`), Yozish va
 * Gapirish tahlillari esa (`skill` maydoni yo'q) HAR bir asosiy ko'nikma
 * dalillariga qo'shiladi.
 */
fun skillEvidence(
    data: AppData,
    now: Long = System.currentTimeMillis(),
): List<SkillEvidence> =
    Skills.CORE.map { skill ->
        val samples = mutableListOf<ScoreSample>()
        for (a in data.attempts) {
            if (a.skill != skill) continue
            samples.add(ScoreSample(if (a.correct) 100.0 else Math.round(a.partial * 100).toDouble(), a.at, a.source))
        }
        for (m in data.mockAttempts) {
            for (s in m.sections) {
                val sc = s.score
                if (s.skill == skill && sc != null) samples.add(ScoreSample(sc, m.completedAt, "mock_exam"))
            }
        }
        for (w in data.writing) {
            val an = w.analysis ?: continue
            val avg = an.criteriaScores.values.sum() / 5
            samples.add(ScoreSample(Math.round((avg / 5) * 100).toDouble(), w.createdAt, "writing_task"))
        }
        for (sp in data.speaking) {
            val an = sp.analysis ?: continue
            samples.add(ScoreSample(speakingScore(an).toDouble(), sp.createdAt, "speaking_task"))
        }
        val kinds = LinkedHashSet(samples.map { it.kind })
        SkillEvidence(
            skill = skill,
            score = Math.round(weightedScore(samples, now)).toDouble(),
            evidenceCount = samples.size,
            confidence = confidenceFor(samples.size, kinds.size),
            lastAt = if (samples.isEmpty()) null else samples.maxOf { it.at },
        )
    }

/**
 * Veb: zanjar hisobi — `store.tsx`da `activity`dan chiqariladi
 * (`seconds >= 60 || attempts > 0` kunlar soni, bugundan orqaga).
 */
fun streakOf(
    data: AppData,
    today: String = todayKey(),
): Int {
    val days = data.activity.values.filter { it.seconds >= 60 || it.attempts > 0 }.map { it.date }
    return streakFor(days, today)
}

/** Veb: `lastNDays` — so'nggi N kun faolligi (grafik uchun). */
data class ActivityDay(val date: String, val seconds: Int, val attempts: Int, val correct: Int)

fun lastNDays(
    data: AppData,
    n: Int = 7,
    today: String = todayKey(),
): List<ActivityDay> =
    (n - 1 downTo 0).map { i ->
        val key = com.dadaxon.aienglishacademy.data.dayKeyAddDays(today, -i.toLong())
        val a = data.activity[key]
        ActivityDay(
            date = key,
            seconds = a?.seconds ?: 0,
            attempts = a?.attempts ?: 0,
            correct = a?.correct ?: 0,
        )
    }

/** Veb: `planProgress` — kundalik reja bosqichi (daqika). */
data class PlanProgress(val doneMin: Int, val leftMin: Int, val ratio: Double)

fun planProgress(
    elapsedSec: Long,
    plannedMinutes: Int,
): PlanProgress {
    val doneMin = Math.floor(elapsedSec / 60.0).toInt()
    val leftMin = Math.max(0, plannedMinutes - doneMin)
    return PlanProgress(doneMin, leftMin, if (plannedMinutes == 0) 0.0 else Math.min(1.0, doneMin / plannedMinutes.toDouble()))
}

/** Veb: `formatDuration`. */
fun formatDuration(totalSec: Long): String {
    val s = Math.max(0L, totalSec)
    val h = s / 3600
    val m = (s % 3600) / 60
    val sec = s % 60
    return if (h > 0) "$h:${pad2(m)}:${pad2(sec)}" else "${pad2(m)}:${pad2(sec)}"
}

private fun pad2(n: Long): String = if (n < 10) "0$n" else n.toString()
