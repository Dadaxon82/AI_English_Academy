package com.dadaxon.aienglishacademy.domain

/**
 * Writing / Speaking tahlili — QOIDAVIY (rule-based) dvigatel.
 *
 * MANBA: veb `src/lib/analyze.ts` — barcha qoidalar (16 ta imlo/punktuation
 * qoidasi, mezon formulalari, chegara qiymatlari) va o'zbekcha matnlar
 * SO'ZMA-SO'Z ko'chirildi.
 *
 * Loyiha talabi: "AI Writing tahlili mavjud bo'lmasa, sodda qoidaviy
 * tekshiruv va foydali ko'rsatmalardan foydalaning. AI xizmatini ulangan
 * deb ko'rsatib, amalda mavjud bo'lmagan natija yasama."
 *
 * Shuning uchun bu yerda har bir baholashning OCHIG'ICH qoidasi bor va
 * natijada `engine: 'rule-based'` ko'rsatiladi.
 */

import com.dadaxon.aienglishacademy.data.Criterion
import com.dadaxon.aienglishacademy.data.SpeakingAnalysis
import com.dadaxon.aienglishacademy.data.SpeakingTask
import com.dadaxon.aienglishacademy.data.WritingAnalysis
import com.dadaxon.aienglishacademy.data.WritingError
import com.dadaxon.aienglishacademy.data.WritingTask
import java.util.Locale

/** Veb: `CRITERIA_UZ` (tartibi ham bir xil). */
private val CRITERIA_UZ: Map<String, String> =
    linkedMapOf(
        Criterion.TASK_ACHIEVEMENT to "Topşiriq bajarilişi",
        Criterion.COHERENCE to "Mantiqiy boğlaniş",
        Criterion.LEXICAL_RESOURCE to "Luğat boyligi",
        Criterion.GRAMMATICAL_RANGE to "Grammatik qamrov",
        Criterion.ACCURACY to "Aniqlik",
    )

fun criterionLabelUz(k: String): String = CRITERIA_UZ[k] ?: k

/** Veb: `countWords` — harfidan/raqamdan iborat bo'lmagan tokenlar sanalmaydi. */
fun countWords(text: String): Int =
    text.trim().split(SPLIT_WS).filter { w -> HAS_WORD_CHAR.containsMatchIn(w) }.size

/** Veb: `sentences`. */
private fun sentences(text: String): List<String> =
    text.split(SPLIT_SENTENCE).map { it.trim() }.filter { it.isNotEmpty() }

/**
 * Yozma matnni qoida bilan tekshirish. Veb: `analyzeWriting`.
 *
 * `WritingAnalysis.criteriaScores` qiymatlari 0..5 (vebdagi `number`).
 */
fun analyzeWriting(text: String, task: WritingTask): WritingAnalysis {
    val words = countWords(text)
    val sents = sentences(text)
    val unique = LinkedHashSet<String>().apply { MATCH_APOSTROPHE.findAll(text.lowercase(Locale.ROOT)).forEach { add(it.value) } }
    val errors = mutableListOf<WritingError>()
    val strengthsUz = mutableListOf<String>()
    val weaknessesUz = mutableListOf<String>()

    // --- 1. Aniq, tez tekshiriladigan xatolar ---
    val rules = ruleList()

    val seen = LinkedHashSet<String>()
    for (r in rules) {
        val m = r.re.matcher(text)
        while (m.find()) {
            val matched = m.group()
            val key = "${r.kind}:${matched.lowercase(Locale.ROOT)}"
            if (seen.contains(key)) continue
            seen.add(key)
            errors.add(
                WritingError(
                    excerpt = sliceAround(text, m.start(), matched.length),
                    kind = r.kind,
                    correction = r.fix(m),
                    whyUz = r.why,
                ),
            )
            if (errors.size >= 12) break
        }
    }

    // --- 2. So'z xilma-xilligi (lexical variety) ---
    val lexical: Int =
        if (unique.isEmpty()) {
            0
        } else {
            val ratio = unique.size.toDouble() / Math.max(1.0, words.toDouble())
            clamp(Math.round(ratio * 10).toInt(), 0, 5)
        }

    // --- 3. Bog'lanish (linkers) va nuqtali belgilar ---
    val linkers = MATCH_LINKERS.findAll(text.lowercase(Locale.ROOT)).count()
    val coherence = clamp(1 + Math.round(linkers / 2.0).toInt() + (if (sents.size >= 3) 1 else 0), 0, 5)

    // --- 4. Topshiriq bajarilishi: hajm + mustInclude ---
    var hit = 0
    for (need in task.mustInclude ?: emptyList()) {
        val found = containsLoose(text, need.pattern)
        if (!found) {
            errors.add(WritingError(excerpt = "—", kind = "content", correction = need.pattern, whyUz = "Topşiriqda bu ma’no kutiladi: ${need.whyUz}"))
        } else {
            hit++
        }
    }
    val lenScore =
        if (words < task.minWords) {
            if (words >= task.minWords * 0.7) 2 else 0
        } else if (words > task.maxWords) {
            3
        } else {
            4
        }
    val needCount = (task.mustInclude ?: emptyList()).size
    val taskAchievement = clamp(Math.round(lenScore * 0.5 + (if (needCount == 0) 2.5 else (hit / needCount.toDouble()) * 2.5)).toInt(), 0, 5)

    // --- 5. Grammatik qamrov: zamon xilma-xilligi ---
    val tenses =
        listOf(
            MATCH_TENSE_PRESENT.containsMatchIn(text),
            MATCH_TENSE_PAST.containsMatchIn(text),
            MATCH_ING.containsMatchIn(text),
            MATCH_MODAL.containsMatchIn(text),
            MATCH_TENSE_PERFECT.containsMatchIn(text),
        ).count { it }
    val grammarRange = clamp(1 + tenses, 0, 5)

    // --- 6. Aniqlik: xatolar zichligi ---
    val accuracy = clamp(5 - Math.round((errors.size / Math.max(1.0, sents.size.toDouble())) * 2).toInt(), 0, 5)

    val criteriaScores: Map<String, Double> =
        linkedMapOf(
            Criterion.TASK_ACHIEVEMENT to taskAchievement.toDouble(),
            Criterion.COHERENCE to coherence.toDouble(),
            Criterion.LEXICAL_RESOURCE to lexical.toDouble(),
            Criterion.GRAMMATICAL_RANGE to grammarRange.toDouble(),
            Criterion.ACCURACY to accuracy.toDouble(),
        )

    if (words >= task.minWords) strengthsUz.add("Hajm talabi bajarildi: $words söz.")
    if (linkers >= 3) strengthsUz.add("Gaplar boğlovçilar bilan mantiqiy boğlangan.")
    if (unique.size >= words * 0.55 && words > 20) strengthsUz.add("Söz boyligi yaxşi — takrorlar kam.")
    if (errors.isEmpty()) strengthsUz.add("Tekşirilgan asosiy xatolar topilmadi.")

    if (words < task.minWords) weaknessesUz.add("Matn qisqa: $words söz, kamida ${task.minWords} kerak.")
    if (linkers < 2) weaknessesUz.add("Boğlovçilar kam: and, but, because, then, so qöşing.")
    if (sents.size < 3) weaknessesUz.add("Gaplar soni kam — fikrlarni alohida gaplarga böling.")
    if (errors.isNotEmpty()) weaknessesUz.add("${errors.size} ta tuzatiladigan xato bor (pastda körsatilgan).")

    val suggestionsUz = buildSuggestions(criteriaScores, task)

    return WritingAnalysis(
        engine = "rule-based",
        criteriaScores = criteriaScores,
        errors = errors,
        strengthsUz = strengthsUz,
        weaknessesUz = weaknessesUz,
        suggestionsUz = suggestionsUz,
        wordCount = words,
    )
}

private fun buildSuggestions(scores: Map<String, Double>, task: WritingTask): List<String> {
    val out = mutableListOf<String>()
    if ((scores[Criterion.TASK_ACHIEVEMENT] ?: 0.0) < 3) {
        out.add("Topşiriqdagi har bir bandni alohida gap bilan javoblang (hajm: ${task.minWords}–${task.maxWords} söz).")
    }
    if ((scores[Criterion.COHERENCE] ?: 0.0) < 3) out.add("Fikrlarni first / next / then / finally bilan tartiblang.")
    if ((scores[Criterion.LEXICAL_RESOURCE] ?: 0.0) < 3) out.add("Bir sözni takrorlamang — sinonim izlang (vocabulary bölimidan foydalaning).")
    if ((scores[Criterion.GRAMMATICAL_RANGE] ?: 0.0) < 3) {
        out.add(
            if (task.genre == "email") {
                "Hozirgi va ötmiş zamonlarini birga işlatişga harakat qiling."
            } else {
                "Ikki xil zamonni işlatişga harakat qiling."
            },
        )
    }
    if ((scores[Criterion.ACCURACY] ?: 0.0) < 3) out.add("Yozganingizdan söng har bir fe’lga e’tibor bering: kim işlayapti — -s kerakmi?")
    out.add("Qayta yozib, eski va yangi versiyani soliştiring — ösiş şu taqqoslaşda körinadi.")
    return out.take(5)
}

private fun containsLoose(text: String, pattern: String): Boolean {
    val t = text.lowercase(Locale.ROOT)
    val p = pattern.lowercase(Locale.ROOT)
    if (t.contains(p)) return true
    // So'zlarni tartibdagi oraliq bilan ham qidirish (a ... b).
    // ESKI BUG: qator boshiga `^` va oxiriga `$` qo'yilgani uchun naqsh faqat
    // matnning BOSHIDA va OXIRIDA to'g'ri kelganda ishlardi — "my family went
    // out last weekend blah" topilmas, `task_achievement` asossiz jarimaga
    // borardi. Endi anchor yo'q.
    val parts = p.split(SPLIT_WS).filter { it.isNotEmpty() }
    if (parts.size <= 1) return false
    val re = parts.joinToString("[\\s\\S]{0,40}?") { Regex.escape(it) }
    return Regex(re, RegexOption.IGNORE_CASE).containsMatchIn(t)
}

private fun sliceAround(text: String, idx: Int, len: Int): String {
    val from = Math.max(0, idx - 24)
    val to = Math.min(text.length, idx + len + 24)
    val head = if (from > 0) "…" else ""
    val tail = if (to < text.length) "…" else ""
    return "$head${text.substring(from, to).trim()}$tail"
}

private fun clamp(n: Int, lo: Int, hi: Int): Int = Math.max(lo, Math.min(hi, n))

/* -------------------- Qoida ro'yxati (veb `rules` bilan bir xil) -------------------- */

private class Rule(val re: java.util.regex.Pattern, val kind: String, val fix: (java.util.regex.Matcher) -> String, val why: String)

private val AGREEMENT_MAP: Map<String, String> =
    mapOf("go" to "goes", "do" to "does", "have" to "has", "like" to "likes", "want" to "wants", "need" to "needs")

private fun ruleList(): List<Rule> =
    listOf(
        Rule(pat("\\bi\\b(?!')"), "capitalization", { "I" }, "Ingliz tilida “I” har doim katta harf bilan yoziladi."),
        Rule(pati("\\bdont\\b"), "punctuation", { "don't" }, "Apostrof tuşib qolgan."),
        Rule(pati("\\bcant\\b"), "punctuation", { "can't" }, "Apostrof tuşib qolgan."),
        Rule(pati("\\bim\\b(?=\\s)"), "contraction", { "I'm" }, "Qisqartirma apostrof bilan yoziladi."),
        Rule(pati("\\bive\\b"), "contraction", { "I've" }, "Apostrof kerak."),
        Rule(pat("\\ba m\\b"), "spacing", { "am" }, "“am” bir söz."),
        Rule(pati("\\bisnt\\b"), "punctuation", { "isn't" }, "Apostrof tuşib qolgan."),
        Rule(pati("\\bgonna\\b"), "register", { "going to" }, "Rasmiy yozuvda “gonna” işlatilmaydi."),
        Rule(pati("\\bthx\\b"), "register", { "thanks" }, "Qisqartirma rasmiy uslubga mos emas."),
        Rule(pati("\\bwich\\b"), "spelling", { "which" }, "Imlo xatosi."),
        Rule(pati("\\bbecouse\\b"), "spelling", { "because" }, "Imlo xatosi."),
        Rule(pati("\\bteh\\b"), "spelling", { "the" }, "Imlo xatosi."),
        Rule(pati("\\brecieve\\b"), "spelling", { "receive" }, "Imlo xatosi."),
        Rule(pati("\\b(alot)\\b"), "spacing", { "a lot" }, "Ikki söz bilan yoziladi."),
        Rule(
            // FaqAT uchinchi shaxs birlikdagi xato tutadi: "he go" → "he goes".
            // Birinchi/ikkinchi shaxs ("I go", "we like") AVTODAN TO'G'RI — ularni
            // xato deb sanash toza A1 matnini sun'iy pasaytirardi (ESKI BUG).
            pati("\\b(he|she|it)\\s+(go|do|have|like|want|need)\\b(?!e?s\\b|n't)"),
            "agreement",
            { m ->
                // `group()` nazariy jihatdan null qaytishi mumkin — `orEmpty`
                // bilan yopiladi, aks holda qator "null" ga aylanardi.
                val verb = m.group(2).orEmpty()
                "${m.group(1).orEmpty()} ${AGREEMENT_MAP[verb] ?: verb}"
            },
            "Uçinçi şaxs birlikda fe’lga -s/-es qöşiladi.",
        ),
    )

private fun pat(re: String): java.util.regex.Pattern = java.util.regex.Pattern.compile(re)

private fun pati(re: String): java.util.regex.Pattern = java.util.regex.Pattern.compile(re, java.util.regex.Pattern.CASE_INSENSITIVE)

/* --------------------------- Regexlar (veb bilan bir xil) --------------------------- */

private val SPLIT_WS = Regex("\\s+")
private val SPLIT_SENTENCE = Regex("[.!?]+")
private val HAS_WORD_CHAR = Regex("[a-z0-9]", RegexOption.IGNORE_CASE)
private val MATCH_APOSTROPHE = Regex("[a-z']+")
private val MATCH_LINKERS =
    Regex("\\b(and|but|because|so|then|after|before|when|also|first|next|finally|however)\\b")
private val MATCH_TENSE_PRESENT = Regex("\\b(am|is|are)\\b", RegexOption.IGNORE_CASE)
private val MATCH_TENSE_PAST = Regex("\\b(was|were)\\b", RegexOption.IGNORE_CASE)
private val MATCH_ING = Regex("\\b[a-z]+ing\\b", RegexOption.IGNORE_CASE)
private val MATCH_MODAL = Regex("\\b(can|must|should|will|would|could)\\b", RegexOption.IGNORE_CASE)
private val MATCH_TENSE_PERFECT = Regex("\\b(ed|gone|been|done|had|went|saw)\\b", RegexOption.IGNORE_CASE)

/**
 * Speaking tahlili (transkript + davomiylik asosida). Veb: `analyzeSpeaking`.
 * Baho rasmiy imtihon natijasi EMMAS — disclaimer bilan qaytadi.
 */
fun analyzeSpeaking(
    transcript: String,
    durationSec: Int,
    minSeconds: Int,
    targetSeconds: Int,
): SpeakingAnalysis {
    val words = countWords(transcript)
    val sents = sentences(transcript)
    val wpm: Int = if (durationSec > 0) Math.round((words / durationSec.toDouble()) * 60).toInt() else 0

    val lengthScore =
        clamp(
            if (durationSec < minSeconds) {
                if (durationSec >= minSeconds * 0.6) 1 else 0
            } else if (durationSec >= targetSeconds) {
                5
            } else {
                3
            },
            0,
            5,
        )

    val unique = uniqueWords(transcript)
    val lexis = speakingLexis(unique, words)
    val grammar = speakingGrammar(transcript)

    // Ravonlik: so'z tezligi A1 uchun 60-140 wpm normal oralig'i.
    // ESKI BUG: 50-59 wpm (izohda "Gapirish sekin" deyilgan) baribir 5 ball
    // olardi — baho bilan izoh bir-biriga zid edi.
    val fluency = if (wpm == 0) 0 else if (wpm < 60) 2 else if (wpm > 190) 3 else 5

    val notesUz = mutableListOf<String>()
    if (durationSec < minSeconds) notesUz.add("Javob qisqa: ${durationSec}s. Kamida ${minSeconds} sekund gapirişga harakat qiling.")
    if (wpm > 0 && wpm < 60) notesUz.add("Gapiriş sekin — gaplar orasidagi pauzalarni kamaytiring, kunni şu mavzuda 1 daqiqa maşq qilib köring.")
    if (unique.size <= 8 && words > 0) notesUz.add("Kam söz işlatdingiz — kunlik luğatdan 3–4 ta yangi sözni şu javobga qöşib köring.")
    if (sents.size < 3) notesUz.add("Fikrlarni alohida gaplarga böling: kim, nima, qaçon, nega.")
    if (notesUz.isEmpty()) notesUz.add("Yaxşi javob: davomiylik va tuziliş A1 me’yoriga mos.")

    return SpeakingAnalysis(
        engine = "rule-based",
        mode = "audio",
        fluency = fluency.toDouble(),
        lexis = lexis.toDouble(),
        grammar = grammar.toDouble(),
        length = lengthScore.toDouble(),
        wordCount = words,
        wpm = wpm.toDouble(),
        notesUz = notesUz,
        disclaimerUz =
            "Bu baho maşq maqsadida berildi — rasmiy imtihon natijasi emas. Transkript avtomatik va aniq bölmasligi mumkin.",
    )
}

/** Veb: `analyzeSpeaking(transcript, durationSec, task)` — SpeakingTask orqali. */
fun analyzeSpeaking(
    transcript: String,
    durationSec: Int,
    task: SpeakingTask,
): SpeakingAnalysis = analyzeSpeaking(transcript, durationSec, task.minSeconds, task.targetSeconds)

/**
 * Matnli muqobil javob tahlili — mikrofon yoki transkripsiya ishlamaganda.
 * Veb: `analyzeSpeakingText`.
 *
 * ESKI BUG: tahlil faqat transkript bo'lsa ishlardi — Firefox'da yoki
 * mikrofonsiz foydalanuvchi gapirish bo'yicha dalil to'play olmas, shuning
 * uchun keyingi daraja unga hech qachon tavsiya qilinmasdi.
 *
 * Ravonlik (tezlik, pauzalar) matndan O'LCHAB BO'LMAYDI: `mode: 'text'`,
 * `fluency`/`wpm` = 0 va u bahoga kirmaydi (`speakingScore`). Hajm og'zaki
 * me'yorga aylantiriladi: A1 uchun pastki chegara 60 wpm — topshiriqdagi har
 * sekundga ~1 so'z.
 */
fun analyzeSpeakingText(
    text: String,
    minSeconds: Int,
    targetSeconds: Int,
): SpeakingAnalysis {
    val words = countWords(text)
    val sents = sentences(text)
    val unique = uniqueWords(text)
    val minWords = Math.round(minSeconds.toDouble()).toInt()
    val targetWords = Math.round(targetSeconds.toDouble()).toInt()
    val length =
        clamp(
            if (words < minWords) {
                if (words >= minWords * 0.6) 1 else 0
            } else if (words >= targetWords) {
                5
            } else {
                3
            },
            0,
            5,
        )

    val notesUz = mutableListOf("Matnli javob: ravonlik va talaffuz baholanmadi — imkon bölsa javobni ovoz bilan ham yozib köring.")
    if (words < minWords) notesUz.add("Javob qisqa: $words söz. Kamida $minWords söz yozişga harakat qiling.")
    if (unique.size <= 8 && words > 0) notesUz.add("Sözlar kam — kunlik luğatdan 3–4 ta yangi sözni şu javobga qöşib köring.")
    if (sents.size < 3) notesUz.add("Fikrlarni alohida gaplarga böling: kim, nima, qaçon, nega.")

    return SpeakingAnalysis(
        engine = "rule-based",
        mode = "text",
        fluency = 0.0,
        lexis = speakingLexis(unique, words).toDouble(),
        grammar = speakingGrammar(text).toDouble(),
        length = length.toDouble(),
        wordCount = words,
        wpm = 0.0,
        notesUz = notesUz,
        disclaimerUz = "Bu baho maşq maqsadida berildi — rasmiy imtihon natijasi emas. Matnli javobda ravonlik ölçanmaydi.",
    )
}

/** Veb: `analyzeSpeakingText(text, task)` — SpeakingTask orqali. */
fun analyzeSpeakingText(
    text: String,
    task: SpeakingTask,
): SpeakingAnalysis = analyzeSpeakingText(text, task.minSeconds, task.targetSeconds)

/** Gapirish bahosi 0..100. Matnli javobda ravonlik o'lchanmagani uchun hisobga olinmaydi. Veb: `speakingScore`. */
fun speakingScore(a: SpeakingAnalysis): Int {
    val avg = if (a.mode == "text") (a.grammar + a.lexis) / 2 else (a.fluency + a.grammar + a.lexis) / 3
    return Math.round((avg / 5) * 100).toInt()
}

private fun uniqueWords(text: String): Set<String> {
    val out = LinkedHashSet<String>()
    MATCH_APOSTROPHE.findAll(text.lowercase(Locale.ROOT)).forEach { out.add(it.value) }
    return out
}

private fun speakingLexis(unique: Set<String>, words: Int): Int =
    clamp(if (unique.size <= 5) 1 else Math.round((unique.size / Math.max(1.0, words.toDouble())) * 8).toInt(), 0, 5)

/** Tuzilmalar xilma-xilligi (0..5) — ovozli va matnli javob uchun bir xil qoida. */
private fun speakingGrammar(text: String): Int {
    val structures =
        listOf(
            Regex("\\b(i|we)\\s+(am|'m)\\s+", RegexOption.IGNORE_CASE).containsMatchIn(text),
            Regex("\\b(go|goes|went|going)\\b", RegexOption.IGNORE_CASE).containsMatchIn(text),
            Regex("\\b(can|cannot|can't)\\b", RegexOption.IGNORE_CASE).containsMatchIn(text),
            Regex("\\b(because|so|but|and then)\\b", RegexOption.IGNORE_CASE).containsMatchIn(text),
            Regex("\\b(yesterday|last week|tomorrow|usually|every day)\\b", RegexOption.IGNORE_CASE).containsMatchIn(text),
        ).count { it }
    return clamp(1 + structures, 0, 5)
}
