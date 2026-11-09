package com.dadaxon.aienglishacademy.store

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import com.dadaxon.aienglishacademy.AppContainer
import com.dadaxon.aienglishacademy.R
import com.dadaxon.aienglishacademy.data.AppData
import com.dadaxon.aienglishacademy.data.AttemptRecord
import com.dadaxon.aienglishacademy.data.DayActivity
import com.dadaxon.aienglishacademy.data.MockExamAttempt
import com.dadaxon.aienglishacademy.data.Skills
import com.dadaxon.aienglishacademy.data.SpeakingSession
import com.dadaxon.aienglishacademy.data.UserSettings
import com.dadaxon.aienglishacademy.data.WritingSubmission
import com.dadaxon.aienglishacademy.data.todayKey
import com.dadaxon.aienglishacademy.domain.SrsGrade
import com.dadaxon.aienglishacademy.domain.applySectionJump
import com.dadaxon.aienglishacademy.domain.initialSrsState
import com.dadaxon.aienglishacademy.domain.review
import com.dadaxon.aienglishacademy.domain.streakFor
import com.dadaxon.aienglishacademy.sync.SyncEngine
import com.dadaxon.aienglishacademy.sync.SyncStats
import com.google.gson.Gson
import com.google.gson.JsonObject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.util.concurrent.atomic.AtomicBoolean

/* ------------------------------------------------------------------ */
/*  Holat va harakatlar (veb `src/lib/store.tsx` Action/State bilan    */
/*  bir xil semantikada).                                              */
/* ------------------------------------------------------------------ */

enum class SyncStatus { IDLE, SYNCING, OFFLINE, ERROR, GUEST }

/** Taymer `elapsedRealtime` da yuradi — devor-soat siljishi hisobni buzmaydi. */
data class TimerSnapshot(
    /** Pauzaga qadar yig'ilgan sekundlar */
    val elapsedSec: Int = 0,
    /** Faol bo'lsa: boshyoshlanish momentini `SystemClock.elapsedRealtime()` da */
    val startedAtRealtime: Long? = null,
    val sessionId: String? = null,
    val skill: String? = null,
)

data class StoreState(
    val data: AppData,
    val timer: TimerSnapshot = TimerSnapshot(),
    val busy: Boolean = false,
    val syncStatus: SyncStatus = SyncStatus.IDLE,
    val lastSyncMessage: String? = null,
    /** Dashboard banneri: daraja tavsiyasi (bir marta ko'rsatiladi) */
    val levelUpHint: String? = null,
    /**
     * So'nggi o'yin amali SABABI (gem yetmadi / yuraklar to'la / chegarada).
     * Vebda `buyItem` sababni bevosita chaqiruvchiga qaytaradi; mobil ekran
     * StateFlow orqali o'qiydi — muvaffaqiyatli amalda `null` bo'ladi.
     */
    val gameMessage: String? = null,
)

/** Har ekrandagi tugmalar shu tilda yoziladi — yagona o'tish nuqtasi. */
sealed class StoreAction {
    data class Hydrate(val data: AppData) : StoreAction()
    data class Settings(val patch: UserSettings) : StoreAction()
    data class Attempt(val record: AttemptRecord) : StoreAction()
    data class Srs(val vocabId: String, val grade: SrsGrade) : StoreAction()
    data class SrsAdd(val vocabId: String) : StoreAction()
    data class TimerStart(val sessionId: String, val skill: String) : StoreAction()
    object TimerPause : StoreAction()
    object TimerStop : StoreAction()
    data class WritingAdd(val sub: WritingSubmission) : StoreAction()
    data class SpeakingAdd(val session: SpeakingSession) : StoreAction()
    data class MockAdd(val attempt: MockExamAttempt) : StoreAction()
    data class MockTime(val entries: Map<String, Int>) : StoreAction()
    data class DayComplete(val dayId: String, val testId: String? = null, val testScore: Int? = null) : StoreAction()

    /**
     * Bo'lim sakrash testi natijasi (veb: `section-jump` →
     * `src/lib/sections.ts::applySectionJump`). O'tilsa o'tkazib yuborilgan
     * kunlar `completedDays`ga qo'shiladi, natija `passedTests["jump:<id>"]`ga
     * yoziladi; DARAJAGA (`settings.currentLevel`) TEGILMAYDI.
     */
    data class SectionJump(val sectionId: String, val score: Int) : StoreAction()

    /** O'z-o'zini baholash (Likert 1–5) — veb `self-assess`. Darajaga ta'sir qilmaydi. */
    data class SelfAssess(val id: String, val score: Int, val at: Long) : StoreAction()
    data class Diagnostic(val at: Long, val level: String?, val labelUz: String, val confidence: Double) : StoreAction()
    data class Onboarded(val at: Long) : StoreAction()
    data class LevelSet(val level: String) : StoreAction()

    /* ---- O'yin qatlami (veb: `lesson-complete`, `game-buy`, `game-bet`,
       `game-settle`). Mobil ekranda ham XP bonusi, yurak, quest va gemlar
       yurishi uchun shu harakatlar ishlatiladi. ---- */

    /** Dars (mashq bloki) yakuni: bonus XP + xatosiz dars hisobi. */
    data class LessonComplete(val exercises: Int, val mistakes: Int) : StoreAction()

    /** Do'kon xaridi (gem). */
    data class GameBuy(val item: String) : StoreAction()

    /** "Double or Nothing" garovi. */
    object GameBet : StoreAction()

    /** Vaqtga bog'liq hisoblarni yig'ish (yurak tiklanishi, quest yangilanishi). */
    object GameSettle : StoreAction()

    object Reset : StoreAction()
}

/**
 * UI qatlamining yagona holat manbasi — veb `store.tsx` (Context + reducer)
 * ning mobil moslamasi.
 *
 * Qoidalar (veb bilan bir xil):
 *  1. Har `dispatch` avval MAHALLIY saqlanadi (offline-first), so'ng ma'lumot
 *     o'zgartiruvchi amalda sinxron navbatiga qo'shiladi.
 *  2. Saqlash debounce bilan (500 ms) — ketma-ket mashqlarda diskka bir marta
 *     yoziladi.
 *  3. Taymer `SystemClock.elapsedRealtime()` bilan yuradi va
 *     `LocalStore.saveTimer/loadTimer`da saqlanadi — ilova o'lsa ham sekundlar
 *     yo'qolmaydi, tizim saati siljisa hisob buzilmaydi.
 *
 * `domain/Reducer.kt` paydo bo'lsa, [reduceLocal] shu funksiyani chaqirishi
 * uchun alohida ajratildi — fayl ichidagi almashtirishlar bir maromda.
 */
class AppStore(private val context: Context, private val container: AppContainer) {

    private val gson = Gson()
    private val main = Handler(Looper.getMainLooper())
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val uid: String get() = container.userId()

    private val _state = MutableStateFlow(bootState())
    val state: StateFlow<StoreState> = _state

    init {
        // Oldingi seansda yurayotgan taymerni xavfsiz pauzaga olamiz: qurilma
        // o'chgan oraliq "bajarilgan vaqt" bo'lib yozilmasin.
        val snap = _state.value.timer
        if (snap.startedAtRealtime != null) {
            val extra = timerSeconds(snap) - snap.elapsedSec
            _state.value = _state.value.copy(
                timer = snap.copy(elapsedSec = snap.elapsedSec + extra.coerceIn(0, MAX_CONTINUOUS_SEC), startedAtRealtime = null),
            )
            persistTimer(_state.value.timer)
        }
        // O'yin qatlami VAQTGA bog'liq: yuraklar tiklanadi, XP byust tugaydi, kun
        // o'zgarsa questlar yangilanadi, ochilgan yutuqlar beriladi. Vebda buni
        // daqiqalik `setInterval` + sahifa ko'zga tashlanganda `game-settle`
        // bajaradi (`store.tsx`); mobilda shu fon sikli. `settle()` idempotent va
        // o'zgarish bo'lmasa SAYO BILAN BIR XIL obyek qaytaradi — shuning uchun
        // keraksiz saqlash/sinxron navbati qo'zg'almaydi.
        scope.launch {
            while (true) {
                delay(SETTLE_INTERVAL_MS)
                runOnMain { dispatch(StoreAction.GameSettle) }
            }
        }
    }

    /* --------------------------- boshlang'ich holat --------------------- */

    private fun bootState(): StoreState {
        val data = runCatching { container.local.loadData(uid) }.getOrElse { AppData.empty(uid) }
        return StoreState(
            data = data,
            timer = readTimer(),
            busy = false,
            syncStatus = if (container.supabase == null) SyncStatus.GUEST else SyncStatus.IDLE,
        )
    }

    /* ------------------------------- taymer ---------------------------- */

    /** `LocalStore.loadTimer`dagi JSON → holat (ichki soat orqali tiklanadi). */
    private fun readTimer(): TimerSnapshot {
        val raw = runCatching { container.local.loadTimer(uid) }.getOrNull()
        if (raw.isNullOrBlank()) return TimerSnapshot()
        val t = runCatching { gson.fromJson(raw, JsonObject::class.java) }.getOrNull() ?: return TimerSnapshot()
        val elapsed = (t.opt("elapsedSec")?.asInt ?: 0).coerceAtLeast(0)
        val runningMs = t.opt("runningMs")?.asLong ?: -1L
        val savedRealtime = t.opt("savedRealtime")?.asLong ?: SystemClock.elapsedRealtime()
        val session = t.opt("sessionId")?.asString
        val skill = t.opt("skill")?.asString
        if (runningMs < 0L) return TimerSnapshot(elapsed, null, session, skill)
        // Saqlangan paytdan buyon o'tgan vaqt — ichki soat bilan, chegaralangan.
        val sinceSave = (SystemClock.elapsedRealtime() - savedRealtime).coerceAtLeast(0L)
        val capped = Math.min(sinceSave, MAX_CONTINUOUS_SEC * 1000L)
        val carried = (elapsed + (runningMs / 1000L).toInt()).coerceAtMost(MAX_CONTINUOUS_SEC)
        return TimerSnapshot(carried, SystemClock.elapsedRealtime() - capped, session, skill)
    }

    private fun JsonObject.opt(key: String) = get(key)?.takeIf { it.isJsonPrimitive }

    /** Joriy hisoblangan sekund (render shu sonni ko'rsatadi). */
    fun timerSeconds(snap: TimerSnapshot = _state.value.timer): Int {
        val started = snap.startedAtRealtime ?: return snap.elapsedSec
        val running = (SystemClock.elapsedRealtime() - started).coerceAtLeast(0L)
        return snap.elapsedSec + (Math.min(running, MAX_CONTINUOUS_SEC * 1000L) / 1000L).toInt()
    }

    private fun persistTimer(snap: TimerSnapshot) {
        val obj = JsonObject()
        obj.addProperty("elapsedSec", snap.elapsedSec)
        snap.startedAtRealtime?.let { obj.addProperty("runningMs", (SystemClock.elapsedRealtime() - it).coerceAtLeast(0L)) }
        snap.sessionId?.let { obj.addProperty("sessionId", it) }
        snap.skill?.let { obj.addProperty("skill", it) }
        obj.addProperty("savedRealtime", SystemClock.elapsedRealtime())
        val json = obj.toString()
        scope.launch { runCatching { container.local.saveTimer(uid, json) } }
    }

    /* ------------------------------ dispatch --------------------------- */

    private val saveScheduled = AtomicBoolean(false)

    fun dispatch(action: StoreAction) {
        val before = _state.value
        val next = reduceLocal(before, action)
        _state.value = next
        when (action) {
            is StoreAction.TimerStart, is StoreAction.TimerPause, is StoreAction.TimerStop -> persistTimer(next.timer)
            is StoreAction.Hydrate -> Unit
            else -> {
                if (next.data !== before.data) {
                    scheduleSave()
                    queueSync(next.data)
                }
            }
        }
    }

    /**
     * Sof almashtirish (reducer). `domain/Reducer.kt`da `reduce(state, action)`
     * yozilsa, шу yerga bir qator ulanadi — hozircha mantiq shu faylda.
     */
    private fun reduceLocal(s: StoreState, a: StoreAction): StoreState {
        val d = s.data
        // O'yin qatlami vaqqtga bog'liq (yurak tiklanadi, kun o'zgarsa questlar
        // yangilanadi), shuning uchun harakatlar BIR xil `now`/`key` bilan
        // ishlaydi — veb `store.tsx` (`Date.now()`, `todayKey()`) ham shunday.
        val now = System.currentTimeMillis()
        val key = todayKey(now)
        return when (a) {
            // Ochilishda ham yig'ish (veb: `case 'hydrate'`): kechikkan kun uchun
            // questlar yangilanadi, yuraklar tiklanadi, ochilgan yutuqlar beriladi.
            is StoreAction.Hydrate -> s.copy(data = GameOps.settle(a.data, now, key))

            // XP maqsadi FAQAT bosqich qiymati — bosqichdan tashqari son ENG
            // YAQIN bosqichga qaytariladi (veb: `nearestXpGoal`; DB CHECK ham
            // boshqa sonni rad etadi).
            is StoreAction.Settings -> s.copy(data = GameOps.settings(d, a.patch))

            is StoreAction.Attempt -> s.copy(
                data = GameOps.attempt(
                    d,
                    a.record,
                    key,
                    timerCoversSkill = s.timer.startedAtRealtime != null && s.timer.skill == a.record.skill,
                    now = now,
                ),
            )

            is StoreAction.Srs -> {
                val prev = d.srs[a.vocabId] ?: initialSrsState()
                val next = review(prev, a.grade)
                s.copy(
                    data = GameOps.srs(
                        d,
                        a.vocabId,
                        next,
                        firstLearn = prev.learnedAt == null && next.learnedAt != null,
                        // Birinchi marta o'rganish TAKROR sanalmaydi (quest
                        // mezoni va yurak hisobi shu qoidaga bo'ysunadi).
                        reviewed = prev.learnedAt != null,
                        key = key,
                        now = now,
                    ),
                )
            }

            // "Lug'atimga saqlash" — `again` bahosi EMAS (eski kamchilik:
            // saqlash xato hisoblanardi).
            is StoreAction.SrsAdd ->
                if (d.srs.containsKey(a.vocabId)) s else
                    s.copy(data = d.copy(srs = LinkedHashMap(d.srs).apply { put(a.vocabId, initialSrsState()) }))

            is StoreAction.TimerStart -> {
                val t = s.timer
                val sameSession = t.sessionId == a.sessionId && t.skill == a.skill && t.startedAtRealtime != null
                if (sameSession) return s
                // Pauzadagi XUDDI SHU sessiya + ko'nikma — hisob ustiga DAVOM etadi
                // (veb `timer.ts::startTimer` va `reducer.ts` `timer-start`:
                // "Pauzadan «Davom etish» hisob ustiga qo'shiladi"). ESKI FARQ:
                // mobil bu holatda yig'ilgan sekundlarni yozib, hisobni 0 dan
                // boshlardi — vaqt yo'qolmasdi, lekin «5 daqiqa» kabi sessiya
                // pauzadan keyin qolgan vaqtni yo'qotardi.
                if (t.sessionId == a.sessionId && t.skill == a.skill && t.startedAtRealtime == null) {
                    return s.copy(timer = t.copy(startedAtRealtime = SystemClock.elapsedRealtime()))
                }
                // Boshqa mashg'ulotga o'tishda yig'ilgan vaqt eski ko'nikmaga
                // yoziladi (aks holda "yo'qolgan daqiqalar" bo'lardi).
                val acc = timerSeconds(t)
                val committed =
                    if (acc > 0 && t.skill != null) addActivitySeconds(s.data, acc, t.skill!!) else s.data
                s.copy(
                    data = committed,
                    timer = TimerSnapshot(0, SystemClock.elapsedRealtime(), a.sessionId, a.skill),
                )
            }

            is StoreAction.TimerPause -> {
                val t = s.timer
                if (t.startedAtRealtime == null) s else
                    s.copy(timer = t.copy(elapsedSec = timerSeconds(t), startedAtRealtime = null))
            }

            is StoreAction.TimerStop -> {
                val t = s.timer
                val acc = timerSeconds(t)
                val skill = t.skill ?: Skills.READING
                val committed = addActivitySeconds(s.data, acc, skill)
                s.copy(data = committed, timer = TimerSnapshot(0, null, null, skill))
            }

            is StoreAction.WritingAdd ->
                s.copy(data = d.copy(writing = (d.writing + a.sub).takeLast(AppData.LIMIT_WRITING)))

            is StoreAction.SpeakingAdd ->
                s.copy(data = d.copy(speaking = (d.speaking + a.session).takeLast(AppData.LIMIT_SPEAKING)))

            is StoreAction.MockAdd ->
                s.copy(data = d.copy(mockAttempts = (d.mockAttempts + a.attempt).takeLast(AppData.LIMIT_MOCK)))

            // Mock imtihonda sarflangan vaqt kundalik hisobga yoziladi
            // (attempt qo'shilmaydi — dalil alloqachon mockAttempts'da).
            is StoreAction.MockTime -> {
                var next = s.data
                for ((skill, sec) in a.entries) {
                    next = addActivitySeconds(next, sec.coerceIn(0, MAX_CONTINUOUS_SEC), skill)
                }
                s.copy(data = next)
            }

            is StoreAction.DayComplete -> {
                val done = d.path.completedDays + a.dayId
                val tests =
                    if (a.testId != null && a.testScore != null) {
                        LinkedHashMap(d.path.passedTests).apply {
                            put(a.testId, maxOf(get(a.testId) ?: 0, a.testScore))
                        }
                    } else {
                        d.path.passedTests
                    }
                val dayIds = runCatching { container.content.bundle(d.settings.currentLevel).days.map { it.id } }
                    .getOrElse { emptyList() }
                val currentDay = dayIds.firstOrNull { !done.contains(it) } ?: d.path.currentDayId
                s.copy(data = d.copy(path = d.path.copy(completedDays = done.distinct(), passedTests = tests, currentDayId = currentDay)))
            }

            // Bo'lim sakrash testi (veb `case 'section-jump'` — qoida
            // `domain/Sections.kt::applySectionJump` ichida, u yerda testlanadi).
            is StoreAction.SectionJump -> {
                val nd = applySectionJump(d, a.sectionId, a.score) { lvl ->
                    runCatching { container.content.bundle(lvl).days }.getOrDefault(emptyList())
                }
                if (nd === d) s else s.copy(data = nd)
            }

            is StoreAction.SelfAssess -> {
                val nd = com.dadaxon.aienglishacademy.domain.applySelfAssess(d, a.id, a.score, a.at)
                if (nd === d) s else s.copy(data = nd)
            }

            is StoreAction.Diagnostic -> s.copy(
                data = d.copy(
                    diagnostic = com.dadaxon.aienglishacademy.data.DiagnosticResult(
                        at = a.at,
                        level = a.level,
                        labelUz = a.labelUz,
                        confidence = a.confidence,
                    ),
                ),
            )

            is StoreAction.Onboarded -> if (d.onboardedAt == null) s.copy(data = d.copy(onboardedAt = a.at)) else s

            is StoreAction.LevelSet -> s.copy(data = d.copy(settings = d.settings.copy(currentLevel = a.level)))

            /* ---- O'yin qatlami (veb `store.tsx` bandlari bilan bir xil) ---- */

            is StoreAction.LessonComplete -> s.copy(
                data = GameOps.lesson(d, a.exercises, a.mistakes, key, now),
            )

            // Xarid/garov natijasi: muvaffaqiyatsiz bo'lsa SABAB ochiq saqlanadi
            // (`gameMessage`) — foydalanuvchi nega olmaganini tushunadi, holat esa
            // o'zgarmaydi (veb: `res.ok ? settled(res.data) : state`).
            is StoreAction.GameBuy -> {
                val res = GameOps.buy(d, a.item, key, now)
                if (res.ok) s.copy(data = res.data, gameMessage = null) else s.copy(gameMessage = res.reasonUz)
            }

            is StoreAction.GameBet -> {
                val res = GameOps.bet(d, key, now)
                if (res.ok) s.copy(data = res.data, gameMessage = null) else s.copy(gameMessage = res.reasonUz)
            }

            // Vaqt o'tishi bilan ham yig'ish: yurak tiklanadi, byust tugaydi, kun
            // o'zgarsa questlar yangilanadi (veb: daqiqada bir marta + sahifa
            // ko'zga tashlanganda `game-settle`).
            is StoreAction.GameSettle -> {
                val next = GameOps.settle(d, now, key)
                if (next === d) s else s.copy(data = next)
            }

            is StoreAction.Reset -> s.copy(data = AppData.empty(d.userId), timer = TimerSnapshot(), gameMessage = null)
        }
    }

    private fun activityWith(d: AppData, key: String, act: DayActivity): Map<String, DayActivity> {
        val out = LinkedHashMap(d.activity)
        out[key] = act
        return out
    }

    private fun addActivitySeconds(d: AppData, seconds: Int, skill: String): AppData {
        if (seconds <= 0) return d
        val key = todayKey()
        val cur = d.activity[key] ?: DayActivity(date = key)
        val act = cur.copy(
            seconds = cur.seconds + seconds,
            skills = LinkedHashMap(cur.skills).apply { put(skill, (get(skill) ?: 0) + seconds) },
        )
        return d.copy(activity = activityWith(d, key, act))
    }

    /* ------------------------- saqlash / sinxronlash -------------------- */

    private fun scheduleSave() {
        if (!saveScheduled.compareAndSet(false, true)) return
        main.postDelayed({
            saveScheduled.set(false)
            val snapshot = _state.value.data
            val who = uid
            scope.launch { runCatching { container.local.saveData(who, snapshot) } }
        }, SAVE_DEBOUNCE_MS)
    }

    /** Navbatga qo'sh + internet bo'lsa ~3 s keyin `syncNow`. */
    private fun queueSync(data: AppData) {
        if (container.supabase == null) return
        val who = uid
        scope.launch {
            runCatching { container.sync.pushAppData(data) }
            if (!container.network.isOnline()) {
                runOnMain { if (!_state.value.busy) _state.value = _state.value.copy(syncStatus = SyncStatus.OFFLINE) }
                return@launch
            }
            delay(SYNC_DEBOUNCE_MS)
            runOnMain { _state.value = _state.value.copy(busy = true, syncStatus = SyncStatus.SYNCING) }
            val res = runCatching { container.sync.syncNow(who, false) }
                .getOrElse { SyncStats(false, 0, 0, 0, 0, false, it.message) }
            runOnMain {
                container.local.loadData(who).let { fresh ->
                    _state.value = _state.value.copy(
                        data = fresh,
                        busy = false,
                        syncStatus = if (res.ok) SyncStatus.IDLE else SyncStatus.ERROR,
                        lastSyncMessage = res.reasonUz,
                    )
                }
            }
        }
    }

    private fun runOnMain(block: () -> Unit) {
        if (Looper.myLooper() == Looper.getMainLooper()) block() else main.post(block)
    }

    /** Qo'ldan sinxronlash (Sozlamalar tugmasi). */
    fun syncNow(): SyncStats {
        flushSave()
        val who = uid
        return if (container.supabase == null) {
            _state.value = _state.value.copy(syncStatus = SyncStatus.GUEST, busy = false, lastSyncMessage = null)
            SyncStats(false, 0, 0, 0, 0, false, null)
        } else {
            _state.value = _state.value.copy(busy = true, syncStatus = SyncStatus.SYNCING)
            scope.launch {
                val res = runCatching {
                    container.sync.pushAppData(_state.value.data)
                    container.sync.syncNow(who, true)
                }.getOrElse { SyncStats(false, 0, 0, 0, 0, false, it.message ?: "Sinxronlash xatosi") }
                val fresh = runCatching { container.local.loadData(who) }.getOrElse { _state.value.data }
                runOnMain {
                    _state.value = _state.value.copy(
                        data = fresh,
                        busy = false,
                        syncStatus = when {
                            !container.network.isOnline() -> SyncStatus.OFFLINE
                            res.ok -> SyncStatus.IDLE
                            else -> SyncStatus.ERROR
                        },
                        lastSyncMessage = res.reasonUz,
                    )
                }
            }
            SyncStats(true, 0, 0, 0, 0, false, null)
        }
    }

    /** Sinxron natijani UI'ga xabar qilish (fon oqimidan kelgan qayta). */
    fun reportSync(stats: SyncStats) {
        runOnMain {
            _state.value = _state.value.copy(
                busy = false,
                syncStatus = if (stats.ok) SyncStatus.IDLE else SyncStatus.ERROR,
                lastSyncMessage = stats.reasonUz,
            )
            refresh()
        }
    }

    /** Majburiy saqlash (logout / ekran parchalanishi oldidan). */
    fun flushSave() {
        runCatching { container.local.saveData(uid, _state.value.data) }
        persistTimer(_state.value.timer)
    }

    /** Diskdagi holatni qayta o'qish (boshqa ekran yozgan bo'lsa). */
    fun refresh() {
        _state.value = _state.value.copy(data = runCatching { container.local.loadData(uid) }.getOrElse { _state.value.data })
    }

    fun settings(): UserSettings = _state.value.data.settings
    fun attempts(): List<AttemptRecord> = _state.value.data.attempts
    fun writingAll(): List<WritingSubmission> = _state.value.data.writing
    fun speakingAll(): List<SpeakingSession> = _state.value.data.speaking
    fun mocksAll(): List<MockExamAttempt> = _state.value.data.mockAttempts
    fun todaySeconds(): Int = _state.value.data.activity[todayKey()]?.seconds ?: 0
    fun todaySkillSeconds(skill: String): Int = _state.value.data.activity[todayKey()]?.skills?.get(skill) ?: 0
    fun streakValue(): Int = streakFor(_state.value.data.activity.keys.toList(), todayKey())
    fun queueSize(): Int = runCatching { container.local.queueSize(uid) }.getOrDefault(0)

    companion object {
        const val SAVE_DEBOUNCE_MS = 500L
        const val SYNC_DEBOUNCE_MS = 3000L

        /** O'yin qatlamini yig'ish oralig'i — vebdagi daqiqalik interval bilan bir xil. */
        const val SETTLE_INTERVAL_MS = 60_000L

        /** Xavfsiz chegara — uxlash oralig'i "bajarilgan vaqt" bo'lib qolmasin. */
        const val MAX_CONTINUOUS_SEC = 3 * 3600

        fun skillLabelRes(skill: String): Int = when (skill) {
            Skills.VOCABULARY -> R.string.skill_vocabulary
            Skills.GRAMMAR -> R.string.skill_grammar
            Skills.READING -> R.string.skill_reading
            Skills.LISTENING -> R.string.skill_listening
            Skills.WRITING -> R.string.skill_writing
            Skills.SPEAKING -> R.string.skill_speaking
            else -> R.string.skill_grammar
        }

        fun formatDuration(totalSec: Int): String {
            val s = totalSec.coerceAtLeast(0)
            val h = s / 3600
            val m = (s % 3600) / 60
            val sec = s % 60
            return if (h > 0) String.format("%d:%02d:%02d", h, m, sec) else String.format("%02d:%02d", m, sec)
        }
    }
}
