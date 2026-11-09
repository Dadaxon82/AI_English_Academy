package com.dadaxon.aienglishacademy.data

/**
 * Kontent registri — veb `src/content/index.ts` funksiya larining mobil
 * nusxısı (`getBundle`, `allVocab`, `findVocab`, `allExercises`,
 * `vocabQuizExercise`, `findExercise`).
 *
 * MANBA: veb `src/content/index.ts` + `scripts/export-content-mobile.mjs`.
 * Mobil ilova HTML/JS o'qimaydi — veb kontenti JSON qilib eksport qilingan
 * (`content/manifest.json`, `content/a1.json`), shuning uchun BITTA o'quv
 * materiali ikkala platformada.
 *
 * JSON fayllari asset'lardan o'qiladi: `content/manifest.json`,
 * `content/<level>.json` (LevelBundle). Fayl manzillari eksport skripti bilan
 * bir xil. Bir marta KESHLANADI (vebdagi `bundleCache` kabi).
 */

import android.content.res.AssetManager
import com.dadaxon.aienglishacademy.domain.GeneratedLookup
import com.dadaxon.aienglishacademy.domain.generatedExercise
import com.google.gson.Gson
import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.google.gson.JsonSyntaxException
import java.io.File
import java.nio.charset.StandardCharsets
import java.util.Locale

/**
 * Kontent fayllarini o'qish kanali. `ApkAssetSource` — APK asset'lari,
 * `FsAssetSource` — laboratoria/test papkasi (shu interfeys orqali testda
 * haqiqiy `assets/content/` JSON'lari o'qiladi).
 */
interface AssetSource {
    fun read(path: String): String

    fun exists(path: String): Boolean
}

/** APK asset'lari (`android.content.res.AssetManager`). */
class ApkAssetSource(private val assets: AssetManager) : AssetSource {
    override fun read(path: String): String =
        assets.open(path).use { input -> String(input.readBytes(), StandardCharsets.UTF_8) }

    override fun exists(path: String): Boolean {
        return try {
            assets.open(path).use { it.available() }
            true
        } catch (e: Exception) {
            false
        }
    }
}

/** Papkadagi fayllar (test/laboratoriya uchun). */
class FsAssetSource(private val rootDir: File) : AssetSource {
    constructor(rootDirPath: String) : this(File(rootDirPath))

    override fun read(path: String): String = File(rootDir, path).readText(StandardCharsets.UTF_8)

    override fun exists(path: String): Boolean = File(rootDir, path).isFile
}

/** Veb: `DAILY_PLAN_TOTAL = 90`. */
const val DAILY_PLAN_TOTAL = 90

/** Veb: `VOCAB_QUIZ_PREFIX = 'vocab-quiz-'`. */
const val VOCAB_QUIZ_PREFIX = "vocab-quiz-"

/**
 * Kontent bazasi. `init(source)` bilan bir marta ulanadi so'ng daraja
 * to'plamlari keshlanadi. `normalizeDayMinutes` veb registridagi kabi
 * qo'llaniladi (kun bo'limlari yig'indisi aniq `DAILY_PLAN_TOTAL`).
 */
class ContentRepository {
    private val gson = Gson()

    private var source: AssetSource? = null

    /** Veb `bundleCache` — har daraja bir marta o'qiladi. */
    private val bundleCache = LinkedHashMap<String, LevelBundle>()

    /** `findVocab` uchun indeks (vebda har chaqiruvda `find`, bu yerda kesh). */
    private val vocabIndexCache = LinkedHashMap<String, VocabularyItem>()

    /** Veb `glossaryCache` — `allGlossaryVocab` bir marta tuziladi. */
    private var glossaryCache: List<VocabularyItem>? = null

    /** Manifest bir marta o'qiladi. */
    private var manifestCache: ContentManifest? = null

    /** Har daraja mashqlari ro'yxati bir marta tuziladi (veb `bundleCache`). */
    private val allExercisesCache = LinkedHashMap<String, List<Exercise>>()

    constructor()

    constructor(source: AssetSource) {
        init(source)
    }

    /** Kontent kanalini ulash (APK asset'lari yoki papka). Qayta ulash keshni tozalaydi. */
    fun init(source: AssetSource): ContentRepository {
        this.source = source
        bundleCache.clear()
        vocabIndexCache.clear()
        glossaryCache = null
        manifestCache = null
        allExercisesCache.clear()
        return this
    }

    /** APK asset'lari bilan ulanish (`AssetManager`). */
    fun init(assets: AssetManager): ContentRepository = init(ApkAssetSource(assets))

    private fun src(): AssetSource =
        source ?: throw IllegalStateException("ContentRepository init() bilan ulanmagan — kontent o'qilmaydi")

    /** `content/manifest.json` — bir marta o'qiladi. */
    fun manifest(): ContentManifest {
        manifestCache?.let { return it }
        if (!src().exists(MANIFEST_PATH)) return ContentManifest().also { manifestCache = it }
        val parsed =
            try {
                gson.fromJson(src().read(MANIFEST_PATH), ContentManifest::class.java) ?: ContentManifest()
            } catch (e: JsonSyntaxException) {
                throw IllegalStateException("$MANIFEST_PATH o'qilmadi: ${e.message}", e)
            }
        manifestCache = parsed
        return parsed
    }

    /** Manifest'dagi darajalar (veb: `LOADED_LEVELS`). */
    fun levels(): List<String> = manifest().levels.map { it.level }

    /** Manifest'dagi daraja ma'lumoti (kunlar / so'zlar / mashqlar soni). */
    fun levelInfo(level: String): ContentLevelInfo? = manifest().levels.firstOrNull { it.level == level }

    /**
     * Daraja to'plami — `content/<level>.json`. Bundan keyin kunlar
     * `normalizeDayMinutes` dan o'tadi (veb `getBundle` aynan shunday qiladi).
     */
    fun bundle(level: String): LevelBundle {
        bundleCache[level]?.let { return it }
        val path = levelPath(level)
        if (!src().exists(path)) {
            // Vebda: A1 bo'lmasa bo'sh to'plam.
            return LevelBundle(level = level).also { bundleCache[level] = it }
        }
        val made = normalizeBundle(parseBundle(path))
        bundleCache[level] = made
        return made
    }

    /** Veb: `allVocab(levels)` — bu repodagi darajalar bo'yicha yassi ro'yxat. */
    fun allVocab(levels: List<String> = levels()): List<VocabularyItem> = levels.flatMap { bundle(it).vocab }

    /** Veb: `findVocab(id)` — asosiy lug'at, so'ng matn glossariysi. */
    fun findVocab(id: String): VocabularyItem? {
        if (vocabIndexCache.isEmpty()) {
            for (v in allVocab()) vocabIndexCache[v.id] = v
        }
        vocabIndexCache[id]?.let { return it }
        // Matndan saqlangan glossariy so'zlari ham shu izlovga kiradi
        // (veb `findExercise` ularni ham qidiradi).
        return allGlossaryVocab().firstOrNull { it.id == id }
    }

    /** Veb: `allExercises(level)` — grammar/reading/listening/tests. */
    fun allExercises(level: String): List<Exercise> {
        allExercisesCache[level]?.let { return it }
        val b = bundle(level)
        val made =
            b.grammar.flatMap { it.exercises } +
                b.reading.flatMap { it.exercises } +
                b.listening.flatMap { it.exercises } +
                b.tests.flatMap { it.exercises }
        allExercisesCache[level] = made
        return made
    }

    /** Mock Exam mashqlari (veb `findExercise` ularni alohida qidiradi). */
    fun mockExamExercises(level: String): List<Exercise> =
        bundle(level).mockExam?.sections?.flatMap { it.exercises } ?: emptyList()

    /**
     * Lug'at testi savoli (tarjima tanlovi) — veb `vocabQuizExercise`.
     * Variantlar test paytida aralashtiriladi; berilmasa — faqat to'g'ri javob
     * (Xatolar daftarida "to'g'ri javob"ni ko'rsatish uchun).
     */
    fun vocabQuizExercise(v: VocabularyItem, options: List<String> = listOf(v.translationUz)): Exercise =
        Exercise(
            id = "$VOCAB_QUIZ_PREFIX${v.id}",
            kind = Kinds.MULTIPLE_CHOICE,
            instructionUz = "“${v.word}” so‘zining o‘zbekcha ma’nosini tanlang.",
            level = v.level,
            skill = Skills.VOCABULARY,
            explanationUz = "${v.word} — ${v.translationUz}. ${v.explanationEn}",
            difficulty = if (v.level == Levels.A1) 1 else 2,
            tags = listOf("vocab quiz", v.topic),
            question = "What does “${v.word}” mean?",
            options = options,
            answerIndex = options.indexOf(v.translationUz),
        )

    /**
     * Veb: `findExercise(id)` — lug'at testi savollari (`vocab-quiz-<vocabId>`)
     * hech qayerda ro'yxatda yo'q, ular so'z idsidan QAYTA QURILADI
     * (ESKI KAMCHILIK: Xatolar daftari ularda to'g'ri javob o'rniga "—"
     * ko'rsatardi).
     */
    fun findExercise(id: String): Exercise? {
        // Veb yasagan (id'dan tiklanadigan) mashqlar: lug'at o'yini, dars, remix.
        generatedExercise(id, generatedLookup)?.let { return it }
        if (id.startsWith(VOCAB_QUIZ_PREFIX)) {
            val vocabId = id.substring(VOCAB_QUIZ_PREFIX.length)
            val v = findVocab(vocabId)
            return v?.let { vocabQuizExercise(it) }
        }
        for (lvl in levels()) {
            val hit = allExercises(lvl).firstOrNull { e -> e.id == id }
            if (hit != null) return hit
        }
        for (lvl in levels()) {
            val exam = bundle(lvl).mockExam ?: continue
            val hit = exam.sections.flatMap { s -> s.exercises }.firstOrNull { e -> e.id == id }
            if (hit != null) return hit
        }
        return null
    }

    private var canDoCache: com.dadaxon.aienglishacademy.domain.CanDoFile? = null

    /** O'z-o'zini baholash da'volari (`content/can-do.json`); fayl yo'q bo'lsa — bo'sh (soxta da'vo yo'q). */
    fun canDo(): com.dadaxon.aienglishacademy.domain.CanDoFile {
        canDoCache?.let { return it }
        val path = "content/can-do.json"
        val made = if (!src().exists(path)) com.dadaxon.aienglishacademy.domain.CanDoFile()
        else gson.fromJson(src().read(path), com.dadaxon.aienglishacademy.domain.CanDoFile::class.java) ?: com.dadaxon.aienglishacademy.domain.CanDoFile()
        canDoCache = made
        return made
    }

    /** `domain/GeneratedExercises.kt` uchun kontent qidiruvlari (veb `findExercise` bilan bir xil manbalar). */
    private val generatedLookup: GeneratedLookup by lazy {
        GeneratedLookup(
            vocabById = { findVocab(it) },
            grammarTopics = { levels().flatMap { bundle(it).grammar } },
            writingTasks = { levels().flatMap { l -> bundle(l).writing + (bundle(l).mockExam?.sections?.mapNotNull { it.writingTask } ?: emptyList()) } },
            speakingTasks = { levels().flatMap { l -> bundle(l).speaking + (bundle(l).mockExam?.sections?.mapNotNull { it.speakingTask } ?: emptyList()) } },
            plainExercise = { pid -> findPlainExercise(pid) },
        )
    }

    private fun findPlainExercise(id: String): Exercise? {
        for (lvl in levels()) allExercises(lvl).firstOrNull { it.id == id }?.let { return it }
        for (lvl in levels()) bundle(lvl).mockExam?.sections?.flatMap { it.exercises }?.firstOrNull { it.id == id }?.let { return it }
        return null
    }

    /* --------------------------- YARDAMCHI NORMALIZATSIYA --------------------------- */

    /**
     * Veb: `normalizeDayMinutes(day, DAILY_PLAN_TOTAL)` — kun bo'limlari
     * yig'indisini aniq `total` ga keltiradi (kasr qoldig'i eng katta
     * bo'limlarga beriladi, nisbat buzilmaydi).
     */
    fun normalizeDayMinutes(day: DailyPlanDay, total: Int = DAILY_PLAN_TOTAL): DailyPlanDay {
        val raw = day.sections.sumOf { it.minutes }
        if (raw == total || raw <= 0 || day.sections.isEmpty()) return day
        val weights = day.sections.map { it.minutes.toDouble() / raw }
        val exact = weights.map { total * it }
        val scaled = exact.map { Math.floor(it).toInt() }.toMutableList()
        val order =
            exact.mapIndexed { i, x -> i to (x - scaled[i]) }
                .sortedByDescending { it.second }
        var assigned = scaled.sum()
        for (o in order) {
            if (assigned >= total) break
            scaled[o.first] += 1
            assigned += 1
        }
        return day.copy(sections = day.sections.mapIndexed { i, s -> s.copy(minutes = scaled[i]) })
    }

    /**
     * JSON'ni o'qib `LevelBundle` ga aylantirish.
     *
     * Vebda mashq turlari UNION: word-order'da `answer: string[]`,
     * true-false-notgiven'da `answer: string`. Mobil model YASSILANGAN
     * (`answer: String?`), shuning uchun word-order ro'yxati `answers`
     * maydoniga ko'chiriladi — JSON fayli O'ZGARMAYDI, veb eksport skripti
     * qanday yozgan bo'lsa shunday o'qiladi.
     */
    private fun parseBundle(path: String): LevelBundle {
        val root = JsonParser.parseString(src().read(path))
        fixWordOrderAnswers(root)
        return try {
            gson.fromJson(root, LevelBundle::class.java)
                ?: throw IllegalStateException("$path bo'sh yoki buzilgan")
        } catch (e: JsonSyntaxException) {
            throw IllegalStateException("$path parses qilinmadi: ${e.message}", e)
        }
    }


    private fun normalizeBundle(raw: LevelBundle): LevelBundle =
        raw.copy(
            days = raw.days.map { normalizeDayMinutes(it) },
        )

    /* ---------------------- MATN (GLOSSARIY) SO'ZLARI ---------------------- */

    /** Veb: `wordKeyOf`. */
    fun wordKeyOf(s: String): String =
        s.lowercase(Locale.ROOT)
            .replace("[‘’`´ʻ]".toRegex(), "")
            .replace("[^a-z0-9\\s-]".toRegex(), "")
            .replace("\\s+".toRegex(), " ")
            .trim()

    /** Veb: `glossaryVocabId(word)`. */
    fun glossaryVocabId(word: String): String = "gl-${wordKeyOf(word)}"

    /** Veb: `allGlossaryVocab(levels)` — asosiy lug'atdagi so'zlar qayta qo'shilmaydi. */
    fun allGlossaryVocab(levels: List<String> = levels()): List<VocabularyItem> {
        glossaryCache?.let { return it }
        val mainKeys = allVocab(levels).map { wordKeyOf(it.word) }.toSet()
        val seen = LinkedHashSet<String>()
        val out = mutableListOf<VocabularyItem>()
        for (lvl in levels) {
            for (p in bundle(lvl).reading) {
                for (g in p.glossary ?: emptyList()) {
                    val key = wordKeyOf(g.word)
                    if (key.isEmpty() || mainKeys.contains(key) || seen.contains(key)) continue
                    seen.add(key)
                    out.add(
                        VocabularyItem(
                            id = glossaryVocabId(g.word),
                            word = g.word,
                            translationUz = g.uz,
                            explanationEn = "Bu so‘z “${p.title}” matnining glossariyidan olindi.",
                            exampleEn = "",
                            exampleUz = "",
                            pos = "noun",
                            topic = "matndan olingan",
                            level = p.level,
                        ),
                    )
                }
            }
        }
        glossaryCache = out
        return out
    }

    companion object {
        const val MANIFEST_PATH = "content/manifest.json"

        /**
         * Daraxtdagi har bir `exercises` ro'yxatini kezib, word-order'dagi
         * `answer` MASSIVINI `answers` maydoniga ko'chiradi (JSON fayli
         * o'zgarishsiz qoladi). `DiagnosticLoader` ham shundan foydalanadi —
         * diagnostikada `dg-11` word-order, aksi holda Gson `answer` ustida
         * «Expected STRING but was BEGIN_ARRAY» bilan butun faylni yo'qotardi.
         */
        internal fun fixWordOrderAnswers(el: JsonElement) {
            if (el is JsonArray) {
                for (c in el) fixWordOrderAnswers(c)
                return
            }
            if (el !is JsonObject) return
            for ((k, v) in el.entrySet()) {
                if (k == "exercises" && v is JsonArray) {
                    for (e in v) {
                        if (e !is JsonObject) continue
                        val ans = e.get("answer")
                        if (ans is JsonArray) {
                            e.remove("answer")
                            if (!e.has("answers")) e.add("answers", ans)
                        }
                    }
                }
                fixWordOrderAnswers(v)
            }
        }


        /** Eksport skripti darajani shu nomda yozadi: `content/a1.json`. */
        fun levelPath(level: String): String = "content/${level.lowercase(Locale.ROOT)}.json"
    }
}
