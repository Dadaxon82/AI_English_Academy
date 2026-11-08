package com.dadaxon.aienglishacademy.domain

import com.dadaxon.aienglishacademy.data.AppData
import com.dadaxon.aienglishacademy.data.BadgeAward
import com.dadaxon.aienglishacademy.data.BetState
import com.dadaxon.aienglishacademy.data.DayActivity
import com.dadaxon.aienglishacademy.data.GameConfig
import com.dadaxon.aienglishacademy.data.GameState
import com.dadaxon.aienglishacademy.data.LeagueRow
import com.dadaxon.aienglishacademy.data.LeagueSnapshot
import com.dadaxon.aienglishacademy.data.QuestAward
import com.dadaxon.aienglishacademy.data.TodayCounters
import com.dadaxon.aienglishacademy.data.dayKeyAddDays
import com.dadaxon.aienglishacademy.data.emptyGame
import com.dadaxon.aienglishacademy.data.todayKey
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import java.time.LocalDate
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToLong

/**
 * O'yin qatlami mantig'i — SOF funksiqlar (veb `src/lib/game.ts` ning
 * Kotlin nusxasi). Barcha sonlar `GameConfig` dan olinadi.
 *
 * HALOLLIK QOIDASI: bu fayl hech qachon son "ixtiro" qilmaydi — har bir
 * o'zgarish `AppData` dagi mavjud hisoblamalardan (attempts, activity, srs)
 * yoki `GameConfig` dagi e'lon qilingan qiymatdan kelib chiqadi.
 *
 * BIR XILLIK sharti: veb va mobil BIR bazaga yozadi, shuning uchun sana,
 * hash va tanlov arifmetikasi JS'dagi bilan AYNAN bir xil (32 bitli Int
 * ko'paytirish — JS `Math.imul` ga mos; `GameConfigTest` kun hashi va
 * quest tanlovining PIN jadvalini sanaydi).
 */
object GameLogic {

    const val MINUTE_MS = 60_000L
    const val DAY_MS = 86_400_000L

    /* ---------------------------- Sana yordamchilari ---------------------------- */

    /** `day` (YYYY-MM-DD) dan `n` kun keyin/oldingi sana (veb: `shiftDay`). */
    fun shiftDay(day: String, n: Long): String = dayKeyAddDays(day, n)

    /** Hafta boshi — PONESHANBA (liga haftasi shu yerda boshlanadi). */
    fun weekStartOf(day: String): String {
        // JS `getUTCDay()`: yakshanba = 0; `(kun + 6) % 7` → poneshanba = 0.
        // Kotlin `dayOfWeek.value`: poneshanba = 1 … yakshanba = 7 — formula bir xil.
        val wd = (LocalDate.parse(day).dayOfWeek.value + 6) % 7
        return shiftDay(day, -wd.toLong())
    }

    /* -------------------------------- Yuraklar -------------------------------- */

    /** Yuraklar tizimi bu foydalanuvchi uchun yoniqmi (sozlamadan o'chiriladi). */
    fun heartsEnabled(data: AppData): Boolean = data.settings.heartsEnabled

    /** Sinov/sanovlarda va bo'lim testlarida yurak ishlatilmaydi (ro'yxat `GameConfig` da). */
    fun heartFreeSource(source: String): Boolean = GameConfig.HEART_FREE_SOURCES.contains(source)

    /**
     * Vaqt o'tishi bilan qaytarilgan yuraklar. `heartsAt` — oxirgi o'zgarish
     * payti: oradan N × `HEART_REFILL_MINUTES` o'tsa N yurak qo'shiladi
     * (chegara `HEARTS_MAX`). Yangi `heartsAt` shunda siljitiladi — qolgan
     * qism keyingi tiklanishga yozib qo'yiladi.
     */
    fun refillHearts(g: GameState, now: Long): GameState {
        // Yuraklar to'la — `heartsAt`ga TEKILMAYMIZ. Aks holda har `settle()`
        // chaqiruvi holatni o'zgartirib, keraksiz saqlash siklini qo'zg'atardi.
        if (g.hearts >= GameConfig.HEARTS_MAX) return g
        val due = floor((now - g.heartsAt).toDouble() / (GameConfig.HEART_REFILL_MINUTES * MINUTE_MS)).toInt()
        if (due <= 0) return g
        val gained = min(GameConfig.HEARTS_MAX - g.hearts, due)
        if (gained <= 0) return g
        return g.copy(
            hearts = g.hearts + gained,
            heartsAt = g.heartsAt + gained * GameConfig.HEART_REFILL_MINUTES * MINUTE_MS,
            // Yuraklar to'lganda "takrorlash darsi" hisobi boshdan boshlanadi.
            practiceReviews = if (g.hearts + gained >= GameConfig.HEARTS_MAX) 0 else g.practiceReviews,
        )
    }

    /** Keyingi yurakgacha qolgan daqiqalar (to'la bo'lsa 0). */
    fun heartMinutesLeft(g: GameState, now: Long): Int {
        if (g.hearts >= GameConfig.HEARTS_MAX) return 0
        val leftMs = GameConfig.HEART_REFILL_MINUTES * MINUTE_MS - (now - g.heartsAt)
        return max(0, ceil(leftMs.toDouble() / MINUTE_MS).toInt())
    }

    /**
     * "Takrorlash darsi" darvozasi: yuraklar tugaganda o'quvchi SRS takrorlashi
     * orqali yurak qaytaradi (Duolingo: "practice to earn hearts", bitta
     * practice darsi = 1 yurak). Bizda bitta dars = `HEART_PRACTICE_REVIEWS` ta takror.
     */
    fun practiceHeartsNeeded(g: GameState): Int = max(0, GameConfig.HEART_PRACTICE_REVIEWS - g.practiceReviews)

    /**
     * SRS takrorlashidan keyingi holat. `reviewed` — haqiqiy TAKRORLASH (so'z
     * avval o'zlashtirilgan); yangi so'z birinchi marta o'rganganida takror
     * sanalmaydi. Yuraklar tugagan bo'lsa har bir takror "takrorlash darsi"
     * hisobiga yoziladi; `HEART_PRACTICE_REVIEWS` ta yetganda BITTA yurak qaytadi.
     */
    fun afterReview(g: GameState, reviewed: Boolean, now: Long): GameState {
        var next = refillHearts(g, now)
        if (!reviewed) return next
        next = bumpToday(next, reviews = 1)
        if (next.hearts >= 1) return next
        val acc = next.practiceReviews + 1
        if (acc < GameConfig.HEART_PRACTICE_REVIEWS) return next.copy(practiceReviews = acc)
        return next.copy(
            practiceReviews = acc - GameConfig.HEART_PRACTICE_REVIEWS,
            hearts = min(GameConfig.HEARTS_MAX, next.hearts + 1),
            heartsAt = now,
        )
    }

    /** Yuraklar holati (ekran uchun) — sonlar `AppData`dan, ixtir yo'q. */
    data class HeartsView(
        val enabled: Boolean,
        val count: Int,
        val max: Int,
        /** Keyingi yurakgacha daqiqa (to'la bo'lsa 0). */
        val minutesLeft: Int,
        /** Hozir dars qilib bo'lmaydi (darvoza). */
        val blocked: Boolean,
        /** Darvoza ochilishi uchun qolgan takrorlar (yurak bor bo'lsa 0). */
        val practiceNeeded: Int,
        /** Byust faolmi (2× XP). */
        val boostActive: Boolean,
        val boostMinutesLeft: Int,
    )

    fun heartsView(data: AppData, now: Long = System.currentTimeMillis()): HeartsView {
        val g = data.game
        val enabled = heartsEnabled(data)
        val live = refillHearts(g, now)
        // Darvoza sharti: `hearts < HEART_GATE_MIN` (biznik — yurak 0 ga tushsa
        // dars darvozasi yopiladi).
        val blocked = enabled && live.hearts < GameConfig.HEART_GATE_MIN
        return HeartsView(
            enabled = enabled,
            count = live.hearts,
            max = GameConfig.HEARTS_MAX,
            minutesLeft = heartMinutesLeft(live, now),
            blocked = blocked,
            practiceNeeded = if (blocked) practiceHeartsNeeded(live) else 0,
            boostActive = boostActive(live, now),
            boostMinutesLeft = boostMinutesLeft(live, now),
        )
    }

    /* ------------------- Kun yangilanishi va kundalik hisoblar ------------------- */

    /** Kun o'zgarsa kundalik hisoblar va questlar qayta boshlanadi. */
    fun ensureFreshDay(g: GameState, day: String): GameState {
        if (g.today.day == day && g.questsDay == day) return g
        return g.copy(
            today = TodayCounters(day = day),
            questsDay = day,
            // Kechagi bajarilgan questlar sanog'i `questsTotal` da saqlanib
            // qoladi, bugungi "bajarildi" belgilari tozalanadi (yangi kunga
            // yangi questlar).
            questsDone = emptyList(),
            combo = 0,
        )
    }

    /** Bugungi hisobga biror natija qo'shish (menfiy qo'shilmaydi). */
    fun bumpToday(
        g: GameState,
        xp: Int = 0,
        attempts: Int = 0,
        reviews: Int = 0,
        perfectLessons: Int = 0,
    ): GameState {
        val t = g.today
        return g.copy(
            today = t.copy(
                xp = t.xp + max(0, xp),
                attempts = t.attempts + max(0, attempts),
                reviews = t.reviews + max(0, reviews),
                perfectLessons = t.perfectLessons + max(0, perfectLessons),
            ),
        )
    }

    /* ------------------------------ XP, byust, combo ------------------------------ */

    /** Byust yurayaptimi? */
    fun boostActive(g: GameState, now: Long): Boolean = g.boostUntil > now

    /** Byustga qolgan daqiqalar. */
    fun boostMinutesLeft(g: GameState, now: Long): Int =
        if (boostActive(g, now)) max(0, ceil((g.boostUntil - now).toDouble() / MINUTE_MS).toInt()) else 0

    /** Bir mashq uchun BERILADIGAN XP (byust bilan). Asos son `xpForAttempt` dan. */
    fun xpGain(g: GameState, correct: Boolean, difficulty: Int, now: Long): Int {
        val base = xpForAttempt(correct, difficulty, true)
        return base * (if (boostActive(g, now)) GameConfig.XP_BOOST_MULT else 1)
    }

    /**
     * Mashq natijasidan keyingi holat: yurak, combo, kundalik hisob. `source`
     * muof saifalardan bo'lsa (mock/diagnostic/bo'lim testi) yurak JARIMA
     * QILINMAYDI — foydalanuvchi tanlovi.
     */
    fun afterAttempt(g: GameState, correct: Boolean, source: String, xp: Int, now: Long): GameState {
        val base = bumpToday(refillHearts(g, now), xp = xp, attempts = 1)
        val combo = if (correct) base.combo + 1 else 0
        var next = base.copy(combo = combo)
        val free = heartFreeSource(source)
        if (correct) {
            // Duolingo'ning Energy tizimidan: ketma-ket to'g'ri javob resurs qaytaradi.
            if (!free && combo > 0 && combo % GameConfig.HEART_COMBO_STREAK == 0 && next.hearts < GameConfig.HEARTS_MAX) {
                next = next.copy(hearts = min(GameConfig.HEARTS_MAX, next.hearts + 1), heartsAt = now)
            }
        } else if (!free) {
            next = next.copy(
                hearts = max(0, next.hearts - GameConfig.HEARTS_COST_WRONG),
                // Tiklanish hisobi xatodan boshlanadi (Duolingo'da ham xatodan
                // keyin kutish boshqa boshlanadi).
                heartsAt = now,
            )
        }
        return next
    }

    /** O'quvchi hozir dars boshlay oladimi (yurak darvozasi)? */
    fun heartsBlocked(g: GameState, data: AppData, now: Long): Boolean =
        heartsEnabled(data) && refillHearts(g, now).hearts < GameConfig.HEART_GATE_MIN

    /* ------------------------------ Kundalik questlar ------------------------------ */

    /**
     * Kun kalitining FNV-1 hashi. JS tomoni `Math.imul` — 32 BITLI ko'paytirish
     * (oddiy `*` 2^53 dan oshganda aniqlik yo'qotadi). Kotlin `Int` ko'paytirish
     * two's complement bilan shu bit natijasini beradi — shuning uchun bitta
     * kunning questlari vebda va mobildda BIR XIL.
     *
     * Qaytish — BELGILI Int (JS'dagi `h>>>0` natiqasining bit andozasi). JS
     * tomondagi belgisiz ko'rinishi uchun [dayHashUnsigned] dan foydalaniladi.
     */
    fun dayHash(s: String): Int {
        var h = 0x811C9DC5.toInt() // 2166136261 (32 bitli)
        // FNV-1 primes = 16777619 = 0x01000193 (veb: `Math.imul(h ^ ch, 16777619)`).
        // ESKI XATO: bu yerda `0x0193` (403) yozilgan edi — Natijasi JS bilan
        // solishtirilmagan va bitta kunning questlari telefon va brauzerda
        // XILMA-XIL bo'lib qolardi (`GameConfigTest.dayHashPinTable` shu
        // jadvalni qayta o'qitadi).
        for (ch in s) h = (h xor ch.code) * 0x01000193
        return h
    }

    /** JS `h >>> 0` ga mos belgisiz qiymat (PIN jadvali shu ko'rinishda). */
    fun dayHashUnsigned(s: String): Long = dayHash(s).toLong() and 0xFFFFFFFFL

    /**
     * Bugungi [GameConfig.QUESTS_PER_DAY] quest — KUN KALITIGA qarab tanlanadi
     * (tasodifiy emas: ikkala qurilmada va qayta yuklanganda BIR XIL).
     * TARTIB ham muhim — `questsDone` va ekran shu tartibga qaraydi.
     */
    fun questsForDay(day: String): List<GameConfig.QuestSpec> {
        val pool = ArrayList(GameConfig.QUEST_POOL)
        var i = dayHash(day)
        val out = ArrayList<GameConfig.QuestSpec>()
        for (k in 0 until min(GameConfig.QUESTS_PER_DAY, pool.size)) {
            // Yana 32 bitli ko'paytirish (`Math.imul` moslamasi) — Int o'rash
            // JS'dagi ToInt32 bilan aynan bir xil natija beradi.
            i = ((i * 1103515245) + 12345) and 0x7fffffff
            val j = i % pool.size
            out.add(pool.removeAt(j))
        }
        return out
    }

    /** Bitta questning joriy holati. */
    data class QuestProgress(
        val quest: GameConfig.QuestSpec,
        val value: Int,
        val target: Int,
        val done: Boolean,
        val claimed: Boolean,
    )

    /**
     * Quest bajarilishi — `AppData` dagi haqiqiy hisobdan:
     *  - xp / attempts / reviews / perfect_lesson → `game.today`;
     *  - minutes / listening / speaking → `activity[day]` sekundlari.
     * Sun'iy sanov YO'Q: hech qaysi quest "o'z hisobini" yuritmaydi.
     */
    fun questProgressOf(
        quest: GameConfig.QuestSpec,
        today: TodayCounters,
        activity: DayActivity?,
        claimedIds: List<String>,
    ): QuestProgress {
        val skills = activity?.skills ?: emptyMap()
        val value = when (quest.kind) {
            "xp" -> today.xp
            "attempts" -> today.attempts
            "reviews" -> today.reviews
            "perfect_lesson" -> today.perfectLessons
            "minutes" -> activity?.seconds ?: 0
            "listening" -> skills["listening"] ?: 0
            else -> skills["speaking"] ?: 0
        }
        return QuestProgress(
            quest = quest,
            value = value,
            target = quest.target,
            done = value >= quest.target,
            claimed = claimedIds.contains(quest.id),
        )
    }

    /** Bugungi questlar holati (gem berish — `settleQuests`). */
    fun questView(data: AppData): List<QuestProgress> {
        val day = data.game.today.day
        val claimed = data.game.questsDone.map { it.id }
        return questsForDay(day).map { q -> questProgressOf(q, data.game.today, data.activity[day], claimed) }
    }

    /**
     * Bajarilgan questlarga gem berish (bir marta). Qayta chaqirilsa takror
     * berilmaydi — `questsDone` da id saqlanadi.
     */
    fun settleQuests(data: AppData, now: Long = System.currentTimeMillis()): AppData {
        val g = data.game
        val day = g.today.day
        val list = questsForDay(day)
        val claimed = g.questsDone.map { it.id }.toMutableList()
        var gems = g.gems
        var total = g.questsTotal
        val added = ArrayList<QuestAward>()
        for (q in list) {
            if (claimed.contains(q.id)) continue
            val p = questProgressOf(q, g.today, data.activity[day], claimed)
            if (!p.done) continue
            added.add(QuestAward(q.id, now))
            claimed.add(q.id)
            gems += GameConfig.QUEST_GEM_REWARD
            total += 1
        }
        if (added.isEmpty()) return data
        return data.copy(game = g.copy(gems = gems, questsDone = g.questsDone + added, questsTotal = total))
    }

    /* ------------------------- Dars yakunidagi bonuslar ------------------------- */

    /**
     * Dars (mashq bloki) yakunlandi: bonus XP va, agar HAMMA javob to'g'ri
     * bo'lsa, "xatosiz dars" hisobi. `exercises` soni `LESSON_MIN_EXERCISES`
     * dan kam bo'lsa bonus berilmaydi (1 savollik blokkarga bonus berish
     * iqtisodiyotni buzadi).
     */
    fun lessonComplete(data: AppData, exercises: Int, mistakes: Int): AppData {
        val counts = exercises >= GameConfig.LESSON_MIN_EXERCISES
        val perfect = counts && mistakes == 0
        val bonus = if (counts) GameConfig.LESSON_BONUS_XP + (if (perfect) GameConfig.PERFECT_LESSON_BONUS_XP else 0) else 0
        val g0 = if (bonus > 0) bumpToday(data.game, xp = bonus) else data.game
        val withBonus = data.copy(xp = data.xp + bonus, game = g0)
        if (!perfect) return withBonus
        val g1 = withBonus.game.copy(perfectLessonsTotal = withBonus.game.perfectLessonsTotal + 1)
        return withBonus.copy(game = bumpToday(g1, perfectLessons = 1))
    }

    /* ------------------------------ Haftalik sandiq ------------------------------ */

    /** Shu haftada faol bo'lgan kunlar soni (sekund ≥ 60 yoki urinish > 0). */
    private fun activeDaysInWeek(data: AppData, weekStart: String): Int {
        var n = 0
        for (i in 0 until 7) {
            val a = data.activity[shiftDay(weekStart, i.toLong())]
            if (a != null && (a.seconds >= 60 || a.attempts > 0)) n += 1
        }
        return n
    }

    /** Haftalik sandiq: kamida `CHEST_MIN_ACTIVE_DAYS` faol kun → gem (bir marta). */
    fun settleChest(data: AppData): AppData {
        val g = data.game
        val week = weekStartOf(g.today.day)
        if (g.chestsWeeks.contains(week)) return data
        if (activeDaysInWeek(data, week) < GameConfig.CHEST_MIN_ACTIVE_DAYS) return data
        return data.copy(game = g.copy(gems = g.gems + GameConfig.CHEST_GEM_REWARD, chestsWeeks = g.chestsWeeks + week))
    }

    /* ------------------------------ Streak va qalqonlar ------------------------------ */

    /** Faol kunlar ro'yxati (zanjir uchun): sekund ≥ 60 yoki urinish > 0. */
    fun activeDayKeys(data: AppData): List<String> =
        data.activity.values.filter { it.seconds >= 60 || it.attempts > 0 }.map { it.date }

    /**
     * Zanjir — qalqon (freeze) kunlari HISOBGA OLINIB hisoblanadi. Duolingo'da
     * 1 freeze = 1 o'tkazib yuborilgan kun; bu yerda `frozenDays` dagi sanalar
     * "faol" deb qo'shiladi, shuning uchun qoplangan kun zanjirni uzmaydi.
     */
    fun streakWithFreezes(data: AppData, today: String = todayKey()): Int {
        val days = activeDayKeys(data) + data.game.frozenDays
        return streakFor(days.distinct(), today)
    }

    /**
     * Uzilgan kunga qalqon qo'yish. Duolingo qoidasi: BITTA freeze BITTA
     * o'tkazib yuborilgan kunni qoplaydi — shuning uchun chaqiruvda ENG KO'PI
     * BITTA kun qoplanadi (uzilish uzun bo'lsa keyingi `settle()` — daqiqada
     * bir — navbatdagi kunni ham qoplaydi).
     *
     * IKKI SHART (2026-11-07 qayta ko'rib chiqildi, veb `game.ts` bilan bir xil):
     *  1. Qoplanadigan kun zanjir DAMIGA qo'shni bo'lishi kerak — ya'ni
     *     bugundan orthga ketma-ket qoplangan kunlardan keyin kelgan BIRINCHI
     *     bo'sh kun. Hammasi qoplangan bo'lsa qalqon kerak emas.
     *  2. Uzilishdan ORTDA ham faol (yoki qoplangan) kun bo'lishi kerak —
     *     shunda zanjir haqiqatan UZILGAN hisoblanadi. Yangi o'quvchida tarix
     *     yo'q, shuning uchun unga birorta qalqon SARFLANMAYDI (eski kod
     *     sarflardi). Izlash oynasi — `FREEZE_SEARCH_DAYS`; ESKI XATO: oyna
     *     `MAX_FREEZES` (ombordagi son) edi, chuqurroq uzilish ko'rinmasdi.
     *     Qalqon izlanadigan oynaning OMBORDAGI sondan QAT'IY bog'liq emasligi
     *     shu yerdan chiqadi — bu veb tomondagi izohning takrori.
     */
    fun applyFreezes(data: AppData, today: String = todayKey()): AppData {
        val g = data.game
        if (g.freezes <= 0) return data
        val active = activeDayKeys(data).toHashSet()
        val frozen = g.frozenDays.toHashSet()
        fun covered(d: String): Boolean = active.contains(d) || frozen.contains(d)

        // Bugundan ortga: zanjir damidan keyingi BIRINCHI bo'sh kun.
        var gap = ""
        var gapBack = 0
        var back = 1
        while (back <= GameConfig.FREEZE_SEARCH_DAYS) {
            val d = shiftDay(today, -back.toLong())
            if (!covered(d)) {
                gap = d
                gapBack = back // zanjir dami shu yerda tugadi
                break
            }
            back++
        }
        if (gap.isEmpty()) return data // butun — qalqon kerak emas

        // Uzilishdan ortda faol (yoki qoplangan) kun bormi? Yo'q bo'lsa zanjir
        // uzilmagan hisoblanadi — qalqon sarflanmaydi.
        var anchored = false
        var k = gapBack + 1
        while (k <= GameConfig.FREEZE_SEARCH_DAYS + 1) {
            if (covered(shiftDay(today, -k.toLong()))) {
                anchored = true
                break
            }
            k++
        }
        if (!anchored) return data

        return data.copy(game = g.copy(freezes = g.freezes - 1, frozenDays = g.frozenDays + gap))
    }

    /* --------------------------------- Yutuqlar --------------------------------- */

    /** Yutuq mezonining JORIY qiymati — hammasi `AppData` dan hisoblanadi. */
    fun achievementValue(data: AppData, metric: String, streakDays: Int): Int = when (metric) {
        "xp_total" -> data.xp
        "streak_days" -> streakDays
        "lessons_perfect" -> data.game.perfectLessonsTotal
        // Faqat o'zlashtirilgan so'zlar (`learnedAt` bor) sanaladi.
        "words_learned" -> data.srs.values.count { it.learnedAt != null }
        "attempts_total" -> data.attempts.size
        "minutes_total" -> data.activity.values.sumOf { floor(it.seconds / 60.0).toInt() }
        else -> 0
    }

    /** Nechta daraja bosib o'tgan (chegalardan kichigi bo'lsa sanalmaydi). */
    fun levelFor(spec: GameConfig.AchievementSpec, value: Int): Int {
        var lvl = 0
        for (t in spec.levels) if (value >= t) lvl += 1
        return lvl
    }

    /** Yutuq ekrani uchun holat. */
    data class AchievementView(
        val spec: GameConfig.AchievementSpec,
        val level: Int,
        val value: Int,
        /** Keyingi darajagacha son (eng yuqori bo'lsa null). */
        val nextTarget: Int?,
        /** 0..1 — joriy bosqich ichidagi progress. */
        val ratio: Double,
    )

    fun achievementViews(data: AppData, streakDays: Int): List<AchievementView> =
        GameConfig.ACHIEVEMENTS.map { spec ->
            val value = achievementValue(data, spec.metric, streakDays)
            val level = levelFor(spec, value)
            val nextTarget = if (level < spec.levels.size) spec.levels[level] else null
            val prev = if (level > 0) spec.levels[level - 1] else 0
            val ratio = when {
                nextTarget == null -> 1.0
                nextTarget == prev -> 1.0
                else -> min(1.0, max(0.0, (value - prev).toDouble() / (nextTarget - prev).toDouble()))
            }
            AchievementView(spec = spec, level = level, value = value, nextTarget = nextTarget, ratio = ratio)
        }

    /**
     * Yangi ochilgan yutuq darajalari: nishon (`badges` — bu ro'yxat endi
     * HAQIQIY to'ldiriladi), gem va streak bosqichlarida qalqon beriladi.
     * `achievementLevels` da nechinchi daraja berilgan saqlanadi — qayta
     * hisoblansa ham takror sovg'a yo'q.
     */
    fun settleAchievements(data: AppData, streakDays: Int, now: Long = System.currentTimeMillis()): AppData {
        val g = data.game
        var gems = g.gems
        var freezes = g.freezes
        val levels = LinkedHashMap(g.achievementLevels)
        val newBadges = ArrayList<BadgeAward>()
        for (spec in GameConfig.ACHIEVEMENTS) {
            val value = achievementValue(data, spec.metric, streakDays)
            val reached = levelFor(spec, value)
            val given = levels[spec.id] ?: 0
            for (lvl in given + 1..reached) {
                newBadges.add(BadgeAward("${spec.id}-$lvl", "${spec.titleUz} — ${lvl}-daraja", now))
                gems += spec.gemReward
                if (spec.metric == "streak_days") {
                    val days = spec.levels[lvl - 1]
                    freezes = min(GameConfig.MAX_FREEZES, freezes + (GameConfig.FREEZE_MILESTONES[days] ?: 0))
                }
            }
            if (reached > given) levels[spec.id] = reached
        }
        if (newBadges.isEmpty()) return data
        return data.copy(
            badges = data.badges + newBadges,
            game = g.copy(gems = gems, freezes = freezes, achievementLevels = levels),
        )
    }

    /* ------------------------------ Kunlik maqsad ------------------------------ */

    /** Kunlik XP maqsadi holati (ekran uchun). */
    data class GoalView(val target: Int, val value: Int, val reached: Boolean, val ratio: Double, val left: Int)

    fun goalView(data: AppData): GoalView {
        // Veb `Math.round(settings.xpGoalXp)` — Kotlin tomonida maydon allaqachon
        // butun son (`UserSettings.xpGoalXp: Int`), shuning uchun yaxlitlash shart
        // emas; DB `CHECK` ham faqat ro'yxatdagi sonlarni qabul qiladi.
        val target = data.settings.xpGoalXp
        val value = data.game.today.xp
        return GoalView(
            target = target,
            value = value,
            reached = value >= target,
            ratio = if (target <= 0) 0.0 else min(1.0, value.toDouble() / target.toDouble()),
            left = max(0, target - value),
        )
    }

    /** Kunlik maqsadga BIRINCHI MARTA yetish — gem (kuniga bir marta). */
    fun settleGoal(data: AppData): AppData {
        val g = data.game
        if (g.goalRewardedDay == g.today.day) return data
        if (!goalView(data).reached) return data
        return data.copy(game = g.copy(gems = g.gems + GameConfig.GOAL_GEM_REWARD, goalRewardedDay = g.today.day))
    }

    /* -------------------------------- Do'kon (gem) -------------------------------- */

    /** Xarid natijasi: `ok=false` bo'lsa SABABI ochiq qaytadi. */
    data class BuyOutcome(val data: AppData, val ok: Boolean, val reasonUz: String?)

    /** Do'kon ro'yxati — narxlar `GameConfig.SHOP` da (mobil jadval veb bilan bir xil). */
    val SHOP_ITEMS: List<GameConfig.ShopItem> = GameConfig.SHOP_ITEMS

    fun priceOf(item: String): Int = GameConfig.priceOf(item)

    /**
     * Xarid. Gem yetmasa yoki buyum chegarasida bo'lsa SABABI ochiq qaytadi.
     *
     * `heart`da `heartsAt`ga TEKILMAYMIZ: sotib olingan yurak tiklanish
     * taymerini QAYTA BOSHLAMAYDI — aks holda xarid foydasi bilan birga
     * kutayotgan yurak ham kechikardi. `refill` esa taymerni yangilaydi
     * (`heartsAt = now`) va "takrorlash darsi" hisobini nolga tushiradi.
     */
    fun buy(data: AppData, item: String, now: Long = System.currentTimeMillis()): BuyOutcome {
        val g = data.game
        val price = priceOf(item)
        if (g.gems < price) {
            return BuyOutcome(data, false, "Gem yetmadi: $price kerak, sizda ${g.gems}.")
        }
        if ((item == "heart" || item == "refill") && g.hearts >= GameConfig.HEARTS_MAX) {
            return BuyOutcome(data, false, "Yuraklar allaqachon to‘la (${GameConfig.HEARTS_MAX}).")
        }
        if (item == "freeze" && g.freezes >= GameConfig.MAX_FREEZES) {
            return BuyOutcome(data, false, "Omborda allaqachon ${GameConfig.MAX_FREEZES} ta qalqon bor.")
        }
        if (item == "xpBoost" && boostActive(g, now)) {
            return BuyOutcome(data, false, "Byust allaqachon faol.")
        }
        val base = g.copy(gems = g.gems - price)
        val next = when (item) {
            "heart" -> base.copy(hearts = min(GameConfig.HEARTS_MAX, g.hearts + 1))
            "refill" -> base.copy(hearts = GameConfig.HEARTS_MAX, heartsAt = now, practiceReviews = 0)
            "freeze" -> base.copy(freezes = g.freezes + 1)
            "xpBoost" -> base.copy(boostUntil = now + GameConfig.XP_BOOST_MINUTES * MINUTE_MS)
            else -> base
        }
        return BuyOutcome(data.copy(game = next), true, null)
    }

    /** "Double or Nothing" garovi (narxlar/kunlar `GameConfig` da — Duolingo 50→100). */
    fun placeBet(data: AppData, streakDays: Int): BuyOutcome {
        val g = data.game
        if (g.bet != null) return BuyOutcome(data, false, "Garov allaqachon ochiq.")
        if (g.gems < GameConfig.BET_COST_GEMS) {
            return BuyOutcome(data, false, "Garov uchun ${GameConfig.BET_COST_GEMS} gem kerak.")
        }
        return BuyOutcome(
            data.copy(
                game = g.copy(
                    gems = g.gems - GameConfig.BET_COST_GEMS,
                    bet = BetState(g.today.day, streakDays, GameConfig.BET_COST_GEMS),
                ),
            ),
            true,
            null,
        )
    }

    /**
     * Garovni yakunlash: garov ochilgan kundan `BET_DAYS` kun o'tgan bo'lsa va
     * zanjir `BET_STREAK_DAYS` ga o'sgan bo'lsa gem qaytadi (g'alaba). Shart
     * bajarilmasa gem yo'qolgan hisoblanadi — garovning mohiyati shu.
     */
    fun settleBet(data: AppData, streakDays: Int): AppData {
        val g = data.game
        val bet = g.bet ?: return data
        val daysGone = floor((dayToMillis(g.today.day) - dayToMillis(bet.startDay)).toDouble() / DAY_MS).toInt()
        if (daysGone < GameConfig.BET_DAYS) return data
        val won = streakDays >= bet.streakAtStart + GameConfig.BET_STREAK_DAYS
        return data.copy(game = g.copy(bet = null, gems = g.gems + (if (won) GameConfig.BET_WIN_GEMS else 0)))
    }

    /* -------------------------- Haftalik XP va liga -------------------------- */

    /**
     * Liga haftasidagi XP: [`weekStart`, `weekStart`+7) oralig'idagi mashq
     * XP'larining yig'indisi. HALOL IZOH: byust va dars bonuslari bu yig'indiga
     * KIRMAYDI — ular `game.today.xp` da alohida yuriladi va qurilmadan
     * qurilmaga farq qilishi mumkin; liga jadvaliga faqat urinishlardan aniq
     * hisoblanadigan qism yuboriladi (ikki qurilma bir xil son yuborishi uchun).
     */
    fun weeklyXp(data: AppData, weekStart: String): Int {
        val from = dayToMillis(weekStart)
        val to = from + 7 * DAY_MS
        var sum = 0
        for (a in data.attempts) {
            if (a.at < from || a.at >= to) continue
            sum += xpForAttempt(a.correct, a.difficulty, true)
        }
        return sum
    }

    /**
     * O'tgan hafta snapshotiga qarab KEYINGI hafta ligasi.
     *
     * Duolingo qoidasi: hafta yakunida tablaning yuqori qatoridagilar yuqoriga
     * ko'tariladi (`promoteTop`: bronze 20, silver 15, gold 10, keyingi 5 tasi
     * 7, obsidian 5, diamond — ko'tarilish yo'q). **Pasaytirish** qoidasi
     * manbalarda TOPILMADI, shuning uchun bu yerda ham yo'q — ixtir qilinmagan.
     *
     * O'rin aniq bo'lmasa (jadvalda biz yo'q edik yoki hafta hali yakunlanmagan)
     * liga O'ZGARMAYDI.
     */
    fun promotedLeague(snap: LeagueSnapshot, userId: String): String {
        val cur = GameConfig.leagueById(snap.leagueId)
        val rank = if (snap.rank > 0) snap.rank else rankOf(snap.entries, userId)
        if (cur.promoteTop <= 0 || rank < 1 || rank > cur.promoteTop) return cur.id
        val idx = GameConfig.leagueIndexOf(cur.id)
        return GameConfig.LEAGUES[min(GameConfig.LEAGUES.size - 1, idx + 1)].id
    }

    /** Joriy liga haftasi: hafta boshi, undagi XP va liga id'si. */
    data class LeagueWeek(val weekStart: String, val xp: Int, val leagueId: String)

    /**
     * Liga HAFTA DAVOMIDA BARQAROR: XP o'sib, chegara bosgani uchun o'rtada liga
     * almashtirmaymiz (Duolingo'da ham hafta oxirigacha shu tabloda qolasiz).
     *  - snapshot shu haftaga tegishli bo'lsa — O'SHA liga;
     *  - snapshot oldingi haftaga tegishli bo'lsa — ko'tarilish qoidasi;
     *  - snapshot bo'lmasa (birinchi marta) — XP chegarasiga qarab (`minXp`).
     */
    fun leagueWeek(data: AppData, today: String = todayKey()): LeagueWeek {
        val weekStart = weekStartOf(today)
        val xp = weeklyXp(data, weekStart)
        val snap = data.game.league
        if (snap != null && snap.weekStart == weekStart) return LeagueWeek(weekStart, xp, GameConfig.leagueById(snap.leagueId).id)
        if (snap != null && snap.weekStart < weekStart) return LeagueWeek(weekStart, xp, promotedLeague(snap, data.userId))
        return LeagueWeek(weekStart, xp, GameConfig.leagueFor(xp).id)
    }

    /**
     * Tablodagi o'rin (1 dan). Bizning qatorimiz bo'lmasa 0 — ya'ni hali
     * yuborilmagan; son IXTIR QILINMAYDI.
     */
    fun rankOf(board: List<LeagueRow>, userId: String): Int {
        val sorted = board.sortedByDescending { it.xp }
        val i = sorted.indexOfFirst { it.userId == userId }
        return if (i == -1) 0 else i + 1
    }

    /**
     * Liga sovg'asi: hafta YAKUNLANGAN snapshot uchun bir marta (top-3).
     *
     * `today` qabul qilinadi, sana qayta O'QILMAYDI — `settle()` ning boshqa
     * qadamlari bilan BIR XIL kun hisoblansin uchun. Avval funksiya sanani
     * o'zi qayta olardi (`weekStartOf(todayKey())`), ya'ni «hafta hali davom
     * etmoqda» qarori `settle()` belgilagan kundan mustaqil edi — kun
     * o'tganda xulq o'zgarardi (veb tomonda 2026-11-09 kuni aynan shu sababli
     * sinov yiqildi; ikkala tomon BIR XIL tuzatildi).
     *
     * HALOLLIK: o'rnimiz aniq bo'lmasa (`rankOf` = 0 — jadvalda biz yo'q)
     * SOVGA BERILMAYDI, lekin `prizeClaimed: true` qo'yiladi — aks holda
     * snapshot har `settle()` da qayta tekshirilib turadi. Bu ixtir emas:
     * o'rin o'qilgan jadvaldan keladi, unda biz yo'q bo'lsa his ham yo'q.
     */
    fun settleLeaguePrize(data: AppData, today: String = todayKey()): AppData {
        val g = data.game
        val snap = g.league ?: return data
        if (snap.prizeClaimed) return data
        if (snap.weekStart == weekStartOf(today)) return data // hafta hali davom etmoqda
        val rank = rankOf(snap.entries, data.userId)
        if (rank < 1 || rank > GameConfig.LEAGUE_PRIZE_GEMS.size) {
            return data.copy(game = g.copy(league = snap.copy(prizeClaimed = true)))
        }
        // Yuqoridagi shart indeksni tekshirgan — `getOrElse` shuni ochiq
        // qaytaradi (veb `LEAGUE_PRIZE_GEMS[rank-1] ?? 0`; mobil `get` esa
        // kompilyatorda solishtirib, keraksiz elvis operatorini qoldirardi).
        val gems = GameConfig.LEAGUE_PRIZE_GEMS.getOrElse(rank - 1) { 0 }
        return data.copy(
            game = g.copy(
                gems = g.gems + gems,
                league = snap.copy(prizeClaimed = true),
            ),
        )
    }

    /* --------------------------- Birlashtiruvchi nuqta --------------------------- */

    /**
     * Har qanday o'zgarishdan keyin chaqiriladigan "yig'uvchi": kunni
     * yangilaydi, yuraklarni vaqt bo'yicha tiklaydi, quest/maqsad/sandiq/qalqon/
     * yutuq/garov/liga sovg'alarini beradi. Qayta-qaeta chaqirilsa HAM natija
     * O'WGARMAYDI (idempotent) — har bir sovg'a marta belgilanadi.
     *
     * Hech narsa o'zgarmasa SAYO BILAN BIR XIL obyek qaytamiz (`===`) —
     * chaqiruvchi (store) shu orqali qayta render va saqlashni oldini oladi.
     */
    fun settle(data: AppData, now: Long = System.currentTimeMillis(), today: String = todayKey()): AppData {
        val fresh = ensureFreshDay(refillHearts(data.game, now), today)
        var d = if (fresh === data.game) data else data.copy(game = fresh)
        d = settleQuests(d, now)
        d = settleGoal(d)
        d = settleChest(d)
        d = applyFreezes(d, today)
        d = settleAchievements(d, streakWithFreezes(d, today), now)
        d = settleBet(d, streakWithFreezes(d, today))
        d = settleLeaguePrize(d, today)
        return d
    }

    /* ------------------------ Saqlanganma normalizatsiyasi ------------------------ */

    /**
     * TYP versiyasi — veb `normalizeGame(raw: Partial<GameState>)` ning
     * to'g'ridan-to'g'ri nusxasi. `LocalStore.migrate()` va `Merge` shu
     * yo'ldan o'tadi (ma'lumot allaqachon `GameState` ko'rinishida), serverdan
     * kelgan jsonb esa yuqoridagi `JsonObject` versiyasidan.
     *
     * `heartsAt == 0` — maydon UMUMAN YO'Q degani (`emptyGame` har doim hozirgi
     * vaqtni qo'yadi); 0 qolsa tiklanish hisobi «mangu vaqt o'tgan» bo'lib,
     * yuraklar darhol to'lib qolardi.
     */
    fun normalizeGame(raw: GameState?, day: String = todayKey(), now: Long = System.currentTimeMillis()): GameState {
        val base = emptyGame(day, now)
        if (raw == null) return base
        val next = base.copy(
            version = raw.version,
            hearts = raw.hearts,
            heartsAt = if (raw.heartsAt == 0L) now else raw.heartsAt,
            practiceReviews = raw.practiceReviews,
            combo = raw.combo,
            gems = raw.gems,
            freezes = raw.freezes,
            boostUntil = raw.boostUntil,
            bet = raw.bet?.takeIf { it.startDay.isNotBlank() },
            frozenDays = raw.frozenDays.filter { it.isNotBlank() },
            today = raw.today.copy(day = raw.today.day.ifBlank { day }),
            questsDay = raw.questsDay.ifBlank { day },
            questsDone = raw.questsDone.filter { it.id.isNotBlank() },
            questsTotal = raw.questsTotal,
            goalRewardedDay = raw.goalRewardedDay,
            achievementLevels = raw.achievementLevels,
            perfectLessonsTotal = raw.perfectLessonsTotal,
            chestsWeeks = raw.chestsWeeks.filter { it.isNotBlank() },
            league = raw.league,
        )
        return clampGame(next)
    }

    /**
     * `normalizeGame` ning CHECK qismi — sonlar chegaraga keltiriladi.
     * Vebda ketma-ketlik qanday bo'lsa, bu yerda ham shu (natija farq qilmasin).
     */
    private fun clampGame(out: GameState): GameState {
        val league = out.league
        val bet = out.bet?.let {
            // Veb `normalizeGame`: `streakAtStart` — manfiy emas, `gems` 0 bo'lsa
            // garov narxi (garov ochilganda aynan shu yozilgan).
            it.copy(
                streakAtStart = max(0, it.streakAtStart),
                gems = if (it.gems == 0) GameConfig.BET_COST_GEMS else max(0, it.gems),
            )
        }
        return out.copy(
            hearts = GameConfig.clampNumber(out.hearts.toDouble(), 0.0, GameConfig.HEARTS_MAX.toDouble()).toInt(),
            gems = max(0.0, floor(GameConfig.clampNumber(out.gems.toDouble(), 0.0, 1_000_000_000.0))).toInt(),
            freezes = GameConfig.clampNumber(out.freezes.toDouble(), 0.0, GameConfig.MAX_FREEZES.toDouble())
                .roundToLong().toInt(),
            practiceReviews = max(0, out.practiceReviews),
            combo = max(0, out.combo),
            perfectLessonsTotal = max(0, out.perfectLessonsTotal),
            questsTotal = max(0, out.questsTotal),
            bet = bet,
            // `boostUntil` yetishmovchi bo'lsa — 0 (`jLong` null bo'lsa 0 beradi).
            league = league?.let {
                it.copy(
                    weekStart = it.weekStart.ifBlank { weekStartOf(out.today.day) },
                    leagueId = GameConfig.leagueById(it.leagueId).id,
                    rank = max(0, it.rank),
                    // 0 — maydon yo'q: tabla o'lchami `LEAGUE_BOARD_SIZE` (veb
                    // `Number(l.boardSize) || LEAGUE_BOARD_SIZE` ham shunday).
                    boardSize = if (it.boardSize == 0) GameConfig.LEAGUE_BOARD_SIZE else max(1, it.boardSize),
                    entries = it.entries.take(GameConfig.LEAGUE_BOARD_SIZE),
                )
            },
        )
    }

    /**
     * SERVER jsonb versiyasi (`learning_plans.plan.game`). Har bir maydon
     * alohida o'qiladi, chunki Gson Kotlin default'larini chaqirmaydi: son
     * o'rniga satr kelsa yoki maydon bo'lmasa — standart qiymatga tushadi va
     * keyin yuqoridagi typ versiyasidan o'tadi (bir xil chegaralar).
     */
    fun normalizeGameJson(raw: JsonObject?, day: String = todayKey(), now: Long = System.currentTimeMillis()): GameState {
        val base = emptyGame(day, now)
        if (raw == null) return base
        val rawToday = raw.jObj("today")
        val read = base.copy(
            version = raw.jInt("version") ?: base.version,
            hearts = raw.jInt("hearts") ?: base.hearts,
            heartsAt = raw.jLong("heartsAt") ?: base.heartsAt,
            practiceReviews = raw.jInt("practiceReviews") ?: base.practiceReviews,
            combo = raw.jInt("combo") ?: base.combo,
            gems = raw.jInt("gems") ?: base.gems,
            freezes = raw.jInt("freezes") ?: base.freezes,
            boostUntil = raw.jLong("boostUntil") ?: base.boostUntil,
            frozenDays = raw.jStrList("frozenDays"),
            today = TodayCounters(
                day = rawToday?.jStr("day") ?: day,
                xp = rawToday?.jInt("xp") ?: 0,
                attempts = rawToday?.jInt("attempts") ?: 0,
                reviews = rawToday?.jInt("reviews") ?: 0,
                perfectLessons = rawToday?.jInt("perfectLessons") ?: 0,
            ),
            questsDay = raw.jStr("questsDay") ?: day,
            questsDone = raw.jQuests("questsDone"),
            questsTotal = raw.jInt("questsTotal") ?: 0,
            goalRewardedDay = raw.jStr("goalRewardedDay") ?: "",
            achievementLevels = raw.jIntRecord("achievementLevels"),
            perfectLessonsTotal = raw.jInt("perfectLessonsTotal") ?: 0,
            chestsWeeks = raw.jStrList("chestsWeeks"),
            bet = raw.jBet("bet"),
            league = raw.jLeague("league", day, now),
        )
        return normalizeGame(read, day, now)
    }

    /** `YYYY-MM-DD` → UTC millisekundlar (veb `Date.parse(day+"T00:00:00Z")`). */
    private fun dayToMillis(day: String): Long = LocalDate.parse(day).toEpochDay() * DAY_MS
}

/* ------------------------- JSON o'qish yordamchilari ------------------------- */

/**
 * `plan.game` (jsonb) va `weekly_xp` satrlarini o'qish uchun MAYDA yordamchilar.
 * Tashqi ma'lumot ISHONCHSIZ: son o'rniga satr, massiv o'rniga `null` kelishi
 * mumkin — shuning uchun har bir o'qish `null` qaytarsa bo'ladi (standartga
 * tushadi), ilova qulab tushmaydi. `SyncEngine` ham shulardan foydalanadi.
 */
internal fun JsonObject.jNum(key: String): Double? {
    val e = get(key) ?: return null
    if (!e.isJsonPrimitive || e.isJsonNull) return null
    return try {
        e.asDouble
    } catch (err: NumberFormatException) {
        null
    } catch (err: IllegalStateException) {
        null
    }
}

internal fun JsonObject.jInt(key: String): Int? = jNum(key)?.let { if (it.isNaN() || it.isInfinite()) null else floor(it).toInt() }

internal fun JsonObject.jLong(key: String): Long? =
    jNum(key)?.let { if (it.isNaN() || it.isInfinite()) null else it.toLong() }

/**
 * HAMHIQIQIY satr qaytaradi; son/massiv/objekt kelsa `null` — veb tomondagi
 * `typeof x === 'string'` tekshiruvi bilan BIR XIL (`normalizeGame` shu qoida
 * bilan tuzatadi: masalan `weekStart: 5` → `weekStartOf(day)`).
 */
internal fun JsonObject.jStr(key: String): String? {
    val e = get(key) ?: return null
    if (!e.isJsonPrimitive || e.isJsonNull || !e.asJsonPrimitive.isString) return null
    return try {
        e.asString
    } catch (err: IllegalStateException) {
        null
    }
}

/**
 * KO'RSATISH uchun satr (`name` kabi): son ham satrga aylanadi — veb
 * `String(e.name ?? '')` ham shunday qiladi. Kalit/identifikator maydonlar
 * uchun emas, ular `jStr` bilan qattiqlanadi.
 */
internal fun JsonObject.jText(key: String): String {
    val e = get(key) ?: return ""
    if (!e.isJsonPrimitive || e.isJsonNull) return ""
    return try {
        e.asString
    } catch (err: IllegalStateException) {
        ""
    }
}

internal fun JsonObject.jObj(key: String): JsonObject? {
    val e = get(key) ?: return null
    return if (e.isJsonObject) e.asJsonObject else null
}

internal fun JsonObject.jArr(key: String): JsonArray? {
    val e = get(key) ?: return null
    return if (e.isJsonArray) e.asJsonArray else null
}

/** Satrlar ro'yxati — begona turdagi element tashlab yuboriladi (veb: `filter(typeof === 'string')`). */
internal fun JsonObject.jStrList(key: String): List<String> =
    jArr(key)?.mapNotNull { if (it.isJsonPrimitive && !it.isJsonNull && it.asJsonPrimitive.isString) it.asString else null } ?: emptyList()

internal fun JsonObject.jQuests(key: String): List<QuestAward> =
    jArr(key)?.mapNotNull { e ->
        if (!e.isJsonObject) return@mapNotNull null
        val o = e.asJsonObject
        val id = o.jStr("id") ?: return@mapNotNull null
        QuestAward(id, o.jLong("at") ?: 0L)
    } ?: emptyList()

/** `achievementLevels` va boshqa `string → son` xaritalari. */
internal fun JsonObject.jIntRecord(key: String): Map<String, Int> {
    val o = jObj(key) ?: return emptyMap()
    val out = LinkedHashMap<String, Int>()
    for ((k, v) in o.entrySet()) {
        if (!v.isJsonPrimitive || v.isJsonNull) continue
        val d = try {
            v.asDouble
        } catch (err: NumberFormatException) {
            continue
        } catch (err: IllegalStateException) {
            continue
        }
        if (d.isNaN() || d.isInfinite()) continue
        out[k] = max(0, floor(d).toInt())
    }
    return out
}

/** Garov bloki: `startDay` satr bo'lmasa garov YO'Q deb hisoblanadi. */
internal fun JsonObject.jBet(key: String): BetState? {
    val o = jObj(key) ?: return null
    val startDay = o.jStr("startDay") ?: return null
    val gems = max(0, floor(o.jNum("gems") ?: 0.0).toInt())
    return BetState(
        startDay = startDay,
        streakAtStart = max(0, floor(o.jNum("streakAtStart") ?: 0.0).toInt()),
        // `gems` 0 bo'lsa — garov narxi (`BET_COST_GEMS`), chunka garov ochilganda
        // aynan shu summa yozilgan (veb `normalizeGame` ham shu standartni oladi).
        gems = if (gems == 0) GameConfig.BET_COST_GEMS else gems,
    )
}

/** Liga snapshoti — har bir son chegaralanadi (tashqi ma'lumot ishonchsiz). */
internal fun JsonObject.jLeague(key: String, day: String, now: Long): LeagueSnapshot? {
    val o = jObj(key) ?: return null
    val entries = o.jArr("entries")?.mapNotNull { e ->
        if (!e.isJsonObject) return@mapNotNull null
        val r = e.asJsonObject
        val userId = r.jStr("userId") ?: return@mapNotNull null
        LeagueRow(userId, r.jText("name"), max(0, floor(r.jNum("xp") ?: 0.0).toInt()))
    }?.take(GameConfig.LEAGUE_BOARD_SIZE) ?: emptyList()
    val boardSizeRaw = floor(o.jNum("boardSize") ?: 0.0).toInt()
    return LeagueSnapshot(
        weekStart = o.jStr("weekStart") ?: GameLogic.weekStartOf(day),
        leagueId = GameConfig.leagueById(o.jStr("leagueId") ?: "bronze").id,
        rank = max(0, floor(o.jNum("rank") ?: 0.0).toInt()),
        boardSize = max(1, if (boardSizeRaw == 0) GameConfig.LEAGUE_BOARD_SIZE else boardSizeRaw),
        at = o.jLong("at") ?: now,
        entries = entries,
        prizeClaimed = o.get("prizeClaimed")?.takeIf { it.isJsonPrimitive && !it.isJsonNull }?.asBoolean == true,
    )
}
