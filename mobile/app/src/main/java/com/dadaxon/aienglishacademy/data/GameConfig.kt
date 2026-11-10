package com.dadaxon.aienglishacademy.data

import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.google.gson.JsonParser

/**
 * O'yin qatlami sonlarining MOBIL manbasi — veb `src/lib/gameConfig.ts` ning
 * so'zma-so'z nusxasi.
 *
 * HALOLLIK QOIDASI (vebdagi bilan bir xil): bu yerdagi har bir son — manbada
 * tekshirilgan DUOLINGO FAKTI yoki BIZNING qarorimiz. Qaysi biri qaysi —
 * `res/raw/game_manifest.json`ning `*Source` maydonlarida ochiq yozilgan.
 * [GameManifest.mismatches] manifestdagi BARCHA sonlarni shu obyektdagi
 * sonlar BILAN solishtiradi (`data/GameManifestTest.kt`) — sonlar tillarga
 * tarqalmasin (veb tomonda shu tenglikni `src/test/game-config.test.ts` sanaydi).
 */
object GameConfig {

    /* ------------------------------ Yuraklar ------------------------------ */

    /** Bir paytda bo'lishi mumkin bo'lgan yuraklar (Duolingo: 5 — manbada tasdiqlangan). */
    const val HEARTS_MAX = 5

    /** Bita xato javob nechta yurak oladi (Duolingo: aynan 1, xato og'irligiga qaramaydi). */
    const val HEARTS_COST_WRONG = 1

    /** Yurak tiklanish oralig'i (daqiqa) — manbalar ZID (1/4/5 soat), 30 daqiqa BIZNIK. */
    const val HEART_REFILL_MINUTES = 30

    /**
     * "Takrorlash darsi" nechta so'z takrorlashdan iborat — shuncha takror
     * tugaganda BITTA yurak qaytadi (Duolingo: "practice to earn hearts").
     */
    const val HEART_PRACTICE_REVIEWS = 8

    /** Ketma-ket nechta to'g'ri javob uchun bitta yurak qaytariladi (Energy tizimi). */
    const val HEART_COMBO_STREAK = 5

    /** Yurak JARIMA QILINMAYDIGAN manbalar (`AttemptSource` bilan bir xil). */
    val HEART_FREE_SOURCES: List<String> = listOf("mock_exam", "diagnostic", "section_test")

    /** Yuraklar yoqilganda xatosiz davom etish uchun minimal yurak (0 = darvoza yo'q). */
    const val HEART_GATE_MIN = 1

    /* ------------------------- XP va kunlik maqsad ------------------------- */

    /** XP maqsad bosqichi (veb: `XpGoalTier`). */
    data class XpGoalTier(val id: String, val titleUz: String, val xp: Int)

    /**
     * Duolingo'ning 5 bosqichi (Basic 1 XP … Intense 50 XP). Bizning XP
     * masshtabimiz boshqa: bitta mashq `6 + 2×qiyinlik` XP beradi, shuning
     * uchun har bir bosqich ≈ 10 marta kattalashtirilgan — bosqichLAR soni va
     * tartibi Duolingo'dek.
     */
    val XP_GOAL_TIERS: List<XpGoalTier> = listOf(
        XpGoalTier("basic", "Boşlanğiç", 50),
        XpGoalTier("casual", "Oddiy", 100),
        XpGoalTier("regular", "Muntazam", 200),
        XpGoalTier("serious", "Jiddiy", 300),
        XpGoalTier("intense", "Faol", 500),
    )

    /** Standart bosqich — Duolingo'da "Regular" (20 XP), bizda 200 XP. */
    const val XP_GOAL_DEFAULT_ID = "regular"

    /** Standart XP maqsadi (`XP_GOAL_TIERS` uchinchi qatori — veb bilan bir xil). */
    val XP_GOAL_DEFAULT_XP: Int = XP_GOAL_TIERS[2].xp

    fun xpGoalFor(tierId: String): Int = XP_GOAL_TIERS.firstOrNull { it.id == tierId }?.xp ?: XP_GOAL_DEFAULT_XP

    /**
     * Maqsadni ro'yxatdagilardan ENG YAQIN bosqichga qaytaradi (veb
     * `nearestXpGoal`). Son ixtir qilinmaydi — ro'yxatdagilardan biri qaytadi
     * (bo'sh/buziq kelsa standart bosqich).
     */
    fun nearestXpGoal(xp: Int): Int {
        var best = XP_GOAL_DEFAULT_XP
        var bestDiff = Int.MAX_VALUE
        for (t in XP_GOAL_TIERS) {
            val d = Math.abs(t.xp - xp)
            if (d < bestDiff) {
                bestDiff = d
                best = t.xp
            }
        }
        return best
    }

    /** XP byust: 2× va 15 daqiqa (Duolingo'da aynan shu — manbada tasdiqlangan). */
    const val XP_BOOST_MINUTES = 15
    const val XP_BOOST_MULT = 2

    /** Dars (mashq bloki) yakunidagi bonus XP. */
    const val LESSON_BONUS_XP = 10

    /** Xatosiz (barcha javob to'g'ri) dars bonusi — BIZNING qarorimiz. */
    const val PERFECT_LESSON_BONUS_XP = 10

    /** Kamida shuncha mashq bo'lgan dars "dars" hisoblanadi (bonus uchun). */
    const val LESSON_MIN_EXERCISES = 3

    /* --------------------------- Kundalik questlar --------------------------- */

    /** Kuniga 3 quest (Duolingo: 3 ta, 24 soatda yangilanadi — manbada tasdiqlangan). */
    const val QUESTS_PER_DAY = 3

    /** Bitta quest mukofoti (gem). Duolingo chestida 4–15 gem — o'rtasi. */
    const val QUEST_GEM_REWARD = 10

    /** Kunlik maqsadga yetganda beriladigan gem (BIZNING qarorimiz). */
    const val GOAL_GEM_REWARD = 10

    /** Haftalik sandiq (faollik sharti bilan) — BIZNING qarorimiz. */
    const val CHEST_GEM_REWARD = 50
    const val CHEST_MIN_ACTIVE_DAYS = 4

    /** Quest turlari — veb `QUEST_KINDS` bilan bir xil ro'yxat (test sanaydi). */
    val QUEST_KINDS: List<String> = listOf("xp", "attempts", "reviews", "perfect_lesson", "minutes", "listening", "speaking")

    /** Bitta quest (veb: `QuestSpec`). */
    data class QuestSpec(val id: String, val kind: String, val target: Int, val titleUz: String)

    /**
     * Kunlik questlar hovuzi. Kun sayin TANLANADI (`GameLogic.questsForDay`),
     * shuning uchun bugun nima so'ralishi oldindan aniq va ikkala qurilmada
     * hamda qayta yuklanganda BIR XIL. TARTIB ham muhim — tanlov shu tartibga
     * qarab hisoblanadi.
     */
    val QUEST_POOL: List<QuestSpec> = listOf(
        QuestSpec("q-xp-100", "xp", 100, "100 XP yiğiring"),
        QuestSpec("q-att-10", "attempts", 10, "10 maşq bajaring"),
        QuestSpec("q-rev-8", "reviews", 8, "8 ta sözni takrorlang"),
        QuestSpec("q-perf-1", "perfect_lesson", 1, "Bitta darsni xatosiz tugating"),
        QuestSpec("q-min-900", "minutes", 900, "15 daqiqa şuğullaning"),
        QuestSpec("q-lis-180", "listening", 180, "Tinglaşga 3 daqiqa sarflang"),
        QuestSpec("q-spk-120", "speaking", 120, "Gapirişga 2 daqiqa sarflang"),
        QuestSpec("q-xp-300", "xp", 300, "300 XP yiğiring"),
        QuestSpec("q-att-20", "attempts", 20, "20 maşq bajaring"),
        QuestSpec("q-rev-15", "reviews", 15, "15 ta sözni takrorlang"),
    )

    /* --------------------------- Yutuqlar (achievements) --------------------------- */

    /** Bitta yutuq (veb: `AchievementSpec`). */
    data class AchievementSpec(
        val id: String,
        val metric: String,
        /** Darajalar — ketma-ket sonlar (masalan [50, 150, 500]). */
        val levels: List<Int>,
        val titleUz: String,
        /** Har yangi daraja ochilganda bir marta beriladigan gem. */
        val gemReward: Int,
    )

    /**
     * Darajalar Duolingo jadvalidan (Wildfire, Word Collector, Flawless
     * Finisher, XP Olympian — XP masshtabimiz ×10 bilan moslashtirilgan).
     * Bizda har bir yutuqda 4–6 daraja: o'quvchi ilg'ay oladigan oralikda
     * qoldirilgan (10 darajaning oxirlari bir necha yillik).
     */
    val ACHIEVEMENTS: List<AchievementSpec> = listOf(
        AchievementSpec("a-wildfire", "streak_days", listOf(3, 7, 14, 30, 90, 365), "Ketma-ketlik", 25),
        AchievementSpec("a-scholar", "xp_total", listOf(1000, 5000, 10000, 25000, 100000), "Ta’limgon", 25),
        AchievementSpec("a-linguist", "words_learned", listOf(50, 100, 250, 500, 2000), "Luğatçi", 25),
        AchievementSpec("a-sharp", "lessons_perfect", listOf(1, 5, 10, 25, 100), "Aniq otiş", 25),
        AchievementSpec("a-practise", "attempts_total", listOf(100, 500, 2000, 5000), "Maşqparvar", 25),
        AchievementSpec("a-dedicated", "minutes_total", listOf(60, 300, 900, 1800), "Sadoqatli", 25),
    )

    /** Yutuqlar soni — test sanaydi (yangi yutuq qo'shilsa test yangilanadi). */
    const val ACHIEVEMENT_COUNT = 6

    /* ------------------------------ Streak himoyasi ------------------------------ */

    /**
     * Streak freeze (Duolingo: 200 gem, oldindan sotib olinadi, 1 ta = 1
     * o'tkazib yuborilgan kun, BIR VAQTDa 2 tasi saqlanadi — manbada tasdiqlangan).
     */
    const val FREEZE_GEM_COST = 200
    const val MAX_FREEZES = 2

    /**
     * Qalqon qayergacha izlanadi (kun). Bu ombordagi son (`MAX_FREEZES`) EMAS:
     * uzilish kecha emas, bir necha kun oldin ham bo'lishi mumkin. Duolingo'da
     * freeze avtomatik ishlatiladi, qayergacha izlanishi aniq aytilmagan —
     * 14 kun BIZNING qarorimiz (oyiga bir marta uzilishni qoplashga yetadi).
     */
    const val FREEZE_SEARCH_DAYS = 14

    /** Streak bosqichlari (qaysi kunlarda qo'shimcha qalqon beriladi). */
    val STREAK_MILESTONES: List<Int> = listOf(7, 30, 90, 365)

    /** Qaysi bosqichda nechta qalqon beriladi — BIZNING qarorimiz. */
    val FREEZE_MILESTONES: Map<Int, Int> = linkedMapOf(7 to 1, 30 to 1, 90 to 2, 365 to 2)

    /**
     * "Double or Nothing" garovi (Duolingo: 50 gem tikiladi, 7 kun streak
     * bo'lsa 100 gem qaytadi).
     */
    const val BET_COST_GEMS = 50
    const val BET_WIN_GEMS = 100
    const val BET_STREAK_DAYS = 7
    const val BET_DAYS = 7

    /* ------------------------------ Do'kon narxlari ------------------------------ */

    /** Do'kon buyumlari (`id` → narx). `freeze` narxi `FREEZE_GEM_COST` bilan bir xil. */
    val SHOP: Map<String, Int> = linkedMapOf(
        "heart" to 70,
        "refill" to 350,
        "freeze" to FREEZE_GEM_COST,
        "xpBoost" to 100,
    )

    fun priceOf(item: String): Int = SHOP[item] ?: 0

    /** Do'kon buyumi (ekranda ko'rsatiladigan matnlar bilan). */
    data class ShopItem(val id: String, val titleUz: String, val price: Int, val noteUz: String)

    /** Do'kon ro'yxati — TARTIBI veb `SHOP_ITEMS` bilan bir xil (ekran shu tartibda chizadi). */
    val SHOP_ITEMS: List<ShopItem> = listOf(
        ShopItem("refill", "Yuraklarni töldiriş", SHOP.getValue("refill"), "Barça yuraklar darhol $HEARTS_MAX tagaça qaytadi."),
        ShopItem("heart", "Bitta yurak", SHOP.getValue("heart"), "Bitta yurak qöşiladi (keyingi xatoga bardoş)."),
        ShopItem("freeze", "Streak qalqoni", SHOP.getValue("freeze"), "1 kun uzilişni saqlaydi. Omborda eng köp $MAX_FREEZES ta."),
        ShopItem("xpBoost", "2× XP byusti", SHOP.getValue("xpBoost"), "$XP_BOOST_MINUTES daqiqa davomida har javob $XP_BOOST_MULT× XP oladi."),
    )

    /* -------------------------------- Ligalar -------------------------------- */

    /** Bitta liga (veb: `LEAGUES` qatori). */
    data class LeagueSpec(val id: String, val titleUz: String, val minXp: Int, val promoteTop: Int)

    /**
     * Duolingo'da 10 liga (manbada tasdiqlangan tartib). `promoteTop` —
     * ligadan yuqoriga chiqish uchun kirish o'rni (bronze top 20, silver 15,
     * gold 10, keyingi 5 tasi top 7, obsidian top 5, diamond — ko'tarilish
     * yo'q). `minXp` — ligaga BIRINCHI MARTA kirish chegarasi: Duolingo'da
     * bunday shart aytilmagan, bu — real jadval bilan ishlaydigan aniqlik
     * uchun BIZNING jadvalimiz. **Pasaytirish** qoidasi manbalarda TOPILMADI,
     * shuning uchun bu yerda ham yo'q — ixtir qilinmagan.
     */
    val LEAGUES: List<LeagueSpec> = listOf(
        LeagueSpec("bronze", "Bronza", 0, 20),
        LeagueSpec("silver", "Kumuş", 100, 15),
        LeagueSpec("gold", "Oltin", 250, 10),
        LeagueSpec("sapphire", "Sapfir", 450, 7),
        LeagueSpec("ruby", "Rubin", 700, 7),
        LeagueSpec("emerald", "Zumrad", 1000, 7),
        LeagueSpec("amethyst", "Ametist", 1500, 7),
        LeagueSpec("pearl", "Marvarid", 2200, 7),
        LeagueSpec("obsidian", "Obsidian", 3000, 5),
        LeagueSpec("diamond", "Olmos", 4000, 0),
    )

    /** Haftalik tabloda nechta o'yinchi ko'rsatiladi (Duolingo: har ligada 30 kishi). */
    const val LEAGUE_BOARD_SIZE = 30

    /** Liga yakunida top-3 ga beriladigan gem (Duolingo: "top 3 earns gems"; sonlar BIZNIK). */
    val LEAGUE_PRIZE_GEMS: List<Int> = listOf(100, 50, 30)

    /* --------------------------------- Umumiy --------------------------------- */

    /** `plan.game` sxemasi versiyasi (veb `GAME_DATA_VERSION` bilan bir xil). */
    const val GAME_DATA_VERSION = 1

    /** Veb `clampNumber`: NaN/musbat cheksizlik → `min`, aks holda chegaraga keltiriladi. */
    fun clampNumber(v: Double, min: Double, max: Double): Double =
        if (v.isNaN() || v.isInfinite()) min else v.coerceIn(min, max)

    /** Joriy haftalik XP bo'yicha liga (`diamond`dan yuqori YO'Q). */
    fun leagueFor(weeklyXp: Int): LeagueSpec {
        var cur = LEAGUES[0]
        for (l in LEAGUES) if (weeklyXp >= l.minXp) cur = l
        return cur
    }

    /** `id` bo'yicha liga (noma'lum bo'lsa eng pastgi — son ixtir qilinmaydi). */
    fun leagueById(id: String): LeagueSpec = LEAGUES.firstOrNull { it.id == id } ?: LEAGUES[0]

    /** Liga indeksi (yo'q bo'lsa -1). */
    fun leagueIndexOf(id: String): Int = LEAGUES.indexOfFirst { it.id == id }
}

/**
 * `res/raw/game_manifest.json` — mobil o'yin sonlarining JSON fayli.
 *
 * Bu fayl veb `src/lib/gameConfig.ts` NUSXASI. Har bir sonning manbasi
 * `*Source` maydonlarida ochiq yozilgan — "biznik" yoki manba URL'i.
 *
 * Parse uslubi `data/MotionManifest.kt` bilan bir xil: Gson (`org.json`
 * oflayn gradle kechasida yo'q), buzilgan maydon `null` qaytaradi.
 */
data class GameManifest(
    val version: Int,
    val heartsMax: Int,
    val heartsCostWrong: Int,
    val heartRefillMinutes: Int,
    val heartPracticeReviews: Int,
    val heartComboStreak: Int,
    val heartGateMin: Int,
    val heartFreeSources: List<String>,
    val xpGoalTiers: List<GameConfig.XpGoalTier>,
    val xpGoalDefaultId: String,
    val xpBoostMinutes: Int,
    val xpBoostMult: Int,
    val lessonBonusXp: Int,
    val perfectLessonBonusXp: Int,
    val lessonMinExercises: Int,
    val questsPerDay: Int,
    val questGemReward: Int,
    val goalGemReward: Int,
    val chestGemReward: Int,
    val chestMinActiveDays: Int,
    val questPool: List<GameConfig.QuestSpec>,
    val achievements: List<GameConfig.AchievementSpec>,
    val achievementCount: Int,
    val freezeGemCost: Int,
    val maxFreezes: Int,
    val freezeSearchDays: Int,
    val streakMilestones: List<Int>,
    val freezeMilestones: Map<Int, Int>,
    val betCostGems: Int,
    val betWinGems: Int,
    val betStreakDays: Int,
    val betDays: Int,
    val shop: Map<String, Int>,
    val leagues: List<GameConfig.LeagueSpec>,
    val leagueBoardSize: Int,
    val leaguePrizeGems: List<Int>,
    val gameDataVersion: Int,
    /** Manifestning izohi (`_comment`) — manbalar shu yerda ochiq yozilgan. */
    val comment: String,
    /** Manifestda yozilgan `*Source` izohlari (kalit → matn). */
    val sources: Map<String, String>,
    /** Har bir XP bosqichi / quest / yutuq satridagi `src` izohlari. */
    val tierSrcs: List<String>,
    val questSrcs: List<String>,
    val achSrcs: List<String>,
) {
    /**
     * Manifest sonlari [GameConfig] bilan solishtirish — HAR BIR son alohida
     * qatorda. Bo'sh ro'yxat = hammasi bir xil. Veb tomonda shu tenglikni
     * `src/test/game-config.test.ts` sanaydi.
     */
    fun mismatches(): List<String> {
        val out = ArrayList<String>()
        fun eq(name: String, a: Any?, b: Any?) {
            if (a != b) out.add("$name: manifest=$a, GameConfig=$b")
        }
        eq("version", version, GameConfig.GAME_DATA_VERSION)
        eq("gameDataVersion", gameDataVersion, GameConfig.GAME_DATA_VERSION)
        eq("heartsMax", heartsMax, GameConfig.HEARTS_MAX)
        eq("heartsCostWrong", heartsCostWrong, GameConfig.HEARTS_COST_WRONG)
        eq("heartRefillMinutes", heartRefillMinutes, GameConfig.HEART_REFILL_MINUTES)
        eq("heartPracticeReviews", heartPracticeReviews, GameConfig.HEART_PRACTICE_REVIEWS)
        eq("heartComboStreak", heartComboStreak, GameConfig.HEART_COMBO_STREAK)
        eq("heartGateMin", heartGateMin, GameConfig.HEART_GATE_MIN)
        eq("heartFreeSources", heartFreeSources, GameConfig.HEART_FREE_SOURCES)
        eq("xpGoalTiers", xpGoalTiers, GameConfig.XP_GOAL_TIERS)
        eq("xpGoalDefaultId", xpGoalDefaultId, GameConfig.XP_GOAL_DEFAULT_ID)
        eq("xpBoostMinutes", xpBoostMinutes, GameConfig.XP_BOOST_MINUTES)
        eq("xpBoostMult", xpBoostMult, GameConfig.XP_BOOST_MULT)
        eq("lessonBonusXp", lessonBonusXp, GameConfig.LESSON_BONUS_XP)
        eq("perfectLessonBonusXp", perfectLessonBonusXp, GameConfig.PERFECT_LESSON_BONUS_XP)
        eq("lessonMinExercises", lessonMinExercises, GameConfig.LESSON_MIN_EXERCISES)
        eq("questsPerDay", questsPerDay, GameConfig.QUESTS_PER_DAY)
        eq("questGemReward", questGemReward, GameConfig.QUEST_GEM_REWARD)
        eq("goalGemReward", goalGemReward, GameConfig.GOAL_GEM_REWARD)
        eq("chestGemReward", chestGemReward, GameConfig.CHEST_GEM_REWARD)
        eq("chestMinActiveDays", chestMinActiveDays, GameConfig.CHEST_MIN_ACTIVE_DAYS)
        eq("questPool", questPool, GameConfig.QUEST_POOL)
        eq("achievements", achievements, GameConfig.ACHIEVEMENTS)
        eq("achievementCount", achievementCount, GameConfig.ACHIEVEMENT_COUNT)
        eq("freezeGemCost", freezeGemCost, GameConfig.FREEZE_GEM_COST)
        eq("maxFreezes", maxFreezes, GameConfig.MAX_FREEZES)
        eq("freezeSearchDays", freezeSearchDays, GameConfig.FREEZE_SEARCH_DAYS)
        eq("streakMilestones", streakMilestones, GameConfig.STREAK_MILESTONES)
        eq("freezeMilestones", freezeMilestones, GameConfig.FREEZE_MILESTONES)
        eq("betCostGems", betCostGems, GameConfig.BET_COST_GEMS)
        eq("betWinGems", betWinGems, GameConfig.BET_WIN_GEMS)
        eq("betStreakDays", betStreakDays, GameConfig.BET_STREAK_DAYS)
        eq("betDays", betDays, GameConfig.BET_DAYS)
        eq("shop.heart", shop["heart"], GameConfig.SHOP["heart"])
        eq("shop.refill", shop["refill"], GameConfig.SHOP["refill"])
        eq("shop.freeze", shop["freeze"], GameConfig.SHOP["freeze"])
        eq("shop.xpBoost", shop["xpBoost"], GameConfig.SHOP["xpBoost"])
        eq("leagues", leagues, GameConfig.LEAGUES)
        eq("leagueBoardSize", leagueBoardSize, GameConfig.LEAGUE_BOARD_SIZE)
        eq("leaguePrizeGems", leaguePrizeGems, GameConfig.LEAGUE_PRIZE_GEMS)
        return out
    }

    /**
     * Har bir sonning MANBASI manifestda ochiq yozilganmi (`*Source` / `src`) —
     * ixtir sonlarga qarshi himoya. Ro'yxat veb `game-config.test.ts` dagi bilan
     * bir xil (`freezeSearchDays` ham shu ro'yxatga qo'shilgan).
     */
    fun missingSources(): List<String> {
        val out = ArrayList<String>()
        for (key in SOURCE_KEYS) if (sources[key].isNullOrBlank()) out.add("${key}Source")
        for (i in xpGoalTiers.indices) if (tierSrcs.getOrNull(i).isNullOrBlank()) out.add("xpGoalTiers[$i].src")
        for (i in questPool.indices) if (questSrcs.getOrNull(i).isNullOrBlank()) out.add("questPool[$i].src")
        for (i in achievements.indices) if (achSrcs.getOrNull(i).isNullOrBlank()) out.add("achievements[$i].src")
        return out
    }

    /** Manifestda `section_test` (bo'lim testi) yurak jarimasidan HOLMIQimi. */
    fun sectionTestIsFree(): Boolean = heartFreeSources.contains("section_test")

    companion object {
        /** `*Source` majburiy maydonlar — veb testi bilan bir xil ro'yxat. */
        val SOURCE_KEYS = listOf(
            "heartRefillMinutes", "heartPracticeReviews", "heartComboStreak", "heartFreeSources", "heartGateMin",
            "xpBoost", "lessonBonusXp", "perfectLessonBonusXp", "lessonMinExercises", "questsPerDay",
            "questGemReward", "goalGemReward", "chestGemReward", "chestMinActiveDays", "achievementCount",
            "freezeGemCost", "maxFreezes", "freezeSearchDays", "streakMilestones", "freezeMilestones", "bet",
            "leagues", "leaguePrize", "gameDataVersion",
        )
    }
}

/**
 * Manifest matnini [GameManifest]ga aylantirish. Maydonlardan biri yo'q yoki
 * son bo'lmasa `null` — jimgina "yarim sozlangan" holat qolmaydi (chaqiruvchi
 * ogohlantiriladi).
 *
 * `freezeSearchDays` ESKI manifestda yo'q edi: bo'lmasa [GameConfig] qiymati
 * (14) olinadi, lekin [GameManifest.missingSources] uning `*Source` izohini
 * alohida sanaydi — "maydon yo'q" holati testda ko'rinib turadi.
 */
fun parseGameManifest(text: String): GameManifest? {
    val el = try {
        JsonParser.parseString(text)
    } catch (err: Exception) {
        return null
    }
    if (!el.isJsonObject) return null
    val o = el.asJsonObject

    // `*Source` izohlari — nomdan "Source" qismi olib tashlanadi (veb testi
    // shu kalitlar bilan solishtiradi: `heartGateMin` → `heartGateMinSource`).
    val srcs = LinkedHashMap<String, String>()
    for ((k, v) in o.entrySet()) {
        if (k.endsWith("Source") && v.isJsonPrimitive && !v.isJsonNull) srcs[k.removeSuffix("Source")] = v.asString
    }

    val tierSrc = ArrayList<String>()
    val questSrc = ArrayList<String>()
    val achSrc = ArrayList<String>()

    fun JsonObject.fieldInt(key: String): Int? {
        val e = get(key) ?: return null
        if (!e.isJsonPrimitive || e.isJsonNull) return null
        return try {
            e.asDouble.toInt()
        } catch (err: Exception) {
            null
        }
    }

    fun JsonObject.fieldStr(key: String): String? {
        val e = get(key) ?: return null
        return if (e.isJsonPrimitive && !e.isJsonNull) e.asString else null
    }

    fun JsonObject.fieldArr(key: String): JsonArray? {
        val a = get(key) ?: return null
        return if (a.isJsonArray) a.asJsonArray else null
    }

    fun JsonObject.fieldObj(key: String): JsonObject? {
        val a = get(key) ?: return null
        return if (a.isJsonObject) a.asJsonObject else null
    }

    fun intList(a: JsonArray?): List<Int>? {
        if (a == null) return null
        val out = ArrayList<Int>()
        for (e in a) {
            if (!e.isJsonPrimitive || e.isJsonNull) return null
            val v = try {
                e.asDouble.toInt()
            } catch (err: Exception) {
                return null
            }
            out.add(v)
        }
        return out
    }

    val tiers = o.fieldArr("xpGoalTiers")?.let { arr ->
        arr.map { e ->
            val t = if (e.isJsonObject) e.asJsonObject else return null
            val id = t.fieldStr("id") ?: return null
            val title = t.fieldStr("titleUz") ?: return null
            val xp = t.fieldInt("xp") ?: return null
            tierSrc.add(t.fieldStr("src") ?: "")
            GameConfig.XpGoalTier(id, title, xp)
        }
    } ?: return null

    val pool = o.fieldArr("questPool")?.let { arr ->
        arr.map { e ->
            val t = if (e.isJsonObject) e.asJsonObject else return null
            val id = t.fieldStr("id") ?: return null
            val kind = t.fieldStr("kind") ?: return null
            val target = t.fieldInt("target") ?: return null
            val title = t.fieldStr("titleUz") ?: return null
            questSrc.add(t.fieldStr("src") ?: "")
            GameConfig.QuestSpec(id, kind, target, title)
        }
    } ?: return null

    val ach = o.fieldArr("achievements")?.let { arr ->
        arr.map { e ->
            val t = if (e.isJsonObject) e.asJsonObject else return null
            val id = t.fieldStr("id") ?: return null
            val metric = t.fieldStr("metric") ?: return null
            val levels = intList(t.fieldArr("levels")) ?: return null
            val gem = t.fieldInt("gem") ?: return null
            val title = t.fieldStr("titleUz") ?: return null
            achSrc.add(t.fieldStr("src") ?: "")
            GameConfig.AchievementSpec(id, metric, levels, title, gem)
        }
    } ?: return null

    val leagues = o.fieldArr("leagues")?.let { arr ->
        arr.map { e ->
            val t = if (e.isJsonObject) e.asJsonObject else return null
            val id = t.fieldStr("id") ?: return null
            val title = t.fieldStr("titleUz") ?: return null
            val minXp = t.fieldInt("minXp") ?: return null
            val promoteTop = t.fieldInt("promoteTop") ?: return null
            GameConfig.LeagueSpec(id, title, minXp, promoteTop)
        }
    } ?: return null

    val shop = o.fieldObj("shop") ?: return null
    val shopMap = LinkedHashMap<String, Int>()
    for (key in listOf("heart", "refill", "freeze", "xpBoost")) {
        shopMap[key] = shop.fieldInt(key) ?: return null
    }

    val fm = LinkedHashMap<Int, Int>()
    o.fieldObj("freezeMilestones")?.entrySet()?.forEach { (k, v) ->
        val day = k.toIntOrNull() ?: return null
        if (!v.isJsonPrimitive || v.isJsonNull) return null
        fm[day] = try {
            v.asDouble.toInt()
        } catch (err: Exception) {
            return null
        }
    } ?: return null
    if (fm.isEmpty()) return null

    return GameManifest(
        version = o.fieldInt("version") ?: return null,
        heartsMax = o.fieldInt("heartsMax") ?: return null,
        heartsCostWrong = o.fieldInt("heartsCostWrong") ?: return null,
        heartRefillMinutes = o.fieldInt("heartRefillMinutes") ?: return null,
        heartPracticeReviews = o.fieldInt("heartPracticeReviews") ?: return null,
        heartComboStreak = o.fieldInt("heartComboStreak") ?: return null,
        heartGateMin = o.fieldInt("heartGateMin") ?: return null,
        heartFreeSources = o.fieldArr("heartFreeSources")?.let { a ->
            a.mapNotNull { if (it.isJsonPrimitive && !it.isJsonNull) it.asString else return null }
        } ?: return null,
        xpGoalTiers = tiers,
        xpGoalDefaultId = o.fieldStr("xpGoalDefaultId") ?: return null,
        xpBoostMinutes = o.fieldInt("xpBoostMinutes") ?: return null,
        xpBoostMult = o.fieldInt("xpBoostMult") ?: return null,
        lessonBonusXp = o.fieldInt("lessonBonusXp") ?: return null,
        perfectLessonBonusXp = o.fieldInt("perfectLessonBonusXp") ?: return null,
        lessonMinExercises = o.fieldInt("lessonMinExercises") ?: return null,
        questsPerDay = o.fieldInt("questsPerDay") ?: return null,
        questGemReward = o.fieldInt("questGemReward") ?: return null,
        goalGemReward = o.fieldInt("goalGemReward") ?: return null,
        chestGemReward = o.fieldInt("chestGemReward") ?: return null,
        chestMinActiveDays = o.fieldInt("chestMinActiveDays") ?: return null,
        questPool = pool,
        achievements = ach,
        achievementCount = o.fieldInt("achievementCount") ?: return null,
        freezeGemCost = o.fieldInt("freezeGemCost") ?: return null,
        maxFreezes = o.fieldInt("maxFreezes") ?: return null,
        freezeSearchDays = o.fieldInt("freezeSearchDays") ?: GameConfig.FREEZE_SEARCH_DAYS,
        streakMilestones = intList(o.fieldArr("streakMilestones")) ?: return null,
        freezeMilestones = fm,
        betCostGems = o.fieldInt("betCostGems") ?: return null,
        betWinGems = o.fieldInt("betWinGems") ?: return null,
        betStreakDays = o.fieldInt("betStreakDays") ?: return null,
        betDays = o.fieldInt("betDays") ?: return null,
        shop = shopMap,
        leagues = leagues,
        leagueBoardSize = o.fieldInt("leagueBoardSize") ?: return null,
        leaguePrizeGems = intList(o.fieldArr("leaguePrizeGems")) ?: return null,
        gameDataVersion = o.fieldInt("gameDataVersion") ?: return null,
        comment = o.fieldStr("_comment") ?: "",
        sources = srcs,
        tierSrcs = tierSrc,
        questSrcs = questSrc,
        achSrcs = achSrc,
    )
}
