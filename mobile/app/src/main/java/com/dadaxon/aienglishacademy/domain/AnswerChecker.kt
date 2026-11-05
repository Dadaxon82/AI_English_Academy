package com.dadaxon.aienglishacademy.domain

/**
 * Javoblarni tekshirish — qoidaviy, ishonchli.
 *
 * MANBA: veb `src/lib/check.ts` — barcha qoidalar, chegara qiymatlari va
 * o'zbekcha xabar matnlari so'zma-so'z ko'chirildi.
 *
 * Mashq turi `data/ContentModels.kt`dagı YASSILANGAN `Exercise`da (`kind`).
 * word-order javob ro'yxati vebda `answer: string[]`, true-false-notgiven'da
 * esa `answer: string`; yassilangan modelda `answer: String?` bo'lgani uchun
 * `ContentRepository` JSON'dagi word-order `answer` ro'yxatini `answers`
 * maydoniga yuklaydi (JSON fayli o'zgarishsiz — veb eksport skripti
 * qanday yozgan bo'lsa shunday o'qiladi).
 *
 * Funksiya toza qiymat oladi va natija qaytaradi, shuning uchun test qilish
 * oson (nativ HTML elementlari ishlatilmaydi).
 */

import com.dadaxon.aienglishacademy.data.Exercise
import java.text.Normalizer
import java.util.Locale

/** Tekshiruv natijasi — veb `CheckResult`. */
data class CheckOutcome(
    val correct: Boolean,
    /** Foydalanuvchi javobi (qayta ko'rsatish uchun normallashtirilgan) */
    val given: String,
    /** To'g'ri javob matni */
    val expected: String,
    /** Xato sababi — o'zbekcha tushuntirish */
    val whyUz: String,
    /** Qisman to'g'ri bo'lsa (gap-fill / matching) hissa 0..1 */
    val partial: Double,
)

private val COMBINING_MARKS = "\\p{M}+".toRegex()
private val APOSTROPHES = "[’‘`ʼʻʹ´]".toRegex()
private val NOT_ALLOWED = "[^a-z0-9' -]".toRegex()
private val SPACES = "\\s+".toRegex()

/**
 * Veb: `normalize`. Matn avval NFD shakliga keltiriladi (harflar asos +
 * diakritik belgilarga ajraladi), so'ng `\p{M}+` — barcha biriktirilgan
 * belgilar — o'chiriladi. Natija veb regexi (`[̀-ͯ]`) bilan bir xil:
 * "cäfe" → "cafe".
 *
 * O'zbek lotin yozuvida ikki xil apostrof ishlatiladi: ʻ (U+02BB, rasmiy)
 * va o‘ (U+2018/2019 klaviatura variantlari). Ikkalasi ham bitta belgiga
 * keltiriladi — aks holda o'quvchining normal klaviatura holatidagi javobi
 * ("oʻn ikki") noto'g'ri deb baholanardi.
 */
fun normalize(value: String): String =
    Normalizer.normalize(value.lowercase(Locale.ROOT), Normalizer.Form.NFD)
        .replace(COMBINING_MARKS, "")
        .replace(APOSTROPHES, "'")
        .replace(NOT_ALLOWED, " ")
        .replace(SPACES, " ")
        .trim()

private val APROROPH = "'".toRegex()

/**
 * Bo'shliq/apostrofga bardoshli taqqoslash (caseSensitive=false rejallar uchun).
 * Talab: "to'g'ri javob nuqta, vergul, qo'shimcha bo'shliq yoki apostrof
 * tufayli noto'g'ri deb belgilanmasin". Shuning uchun qo'shimcha ravishda
 * apostrofsiz ko'rinishi ham qabul qilinadi ("doesnt" ≈ "doesn't").
 */
fun looseEquals(a: String, b: String): Boolean {
    if (normalize(a) == normalize(b)) return true
    return normalize(a).replace(APROROPH, "") == normalize(b).replace(APROROPH, "")
}

/** Veb: `checkAnswer` — `kind` bo'yicha yo'naltirish. */
fun checkAnswer(exercise: Exercise, answer: Any?): CheckOutcome =
    when (exercise.kind) {
        com.dadaxon.aienglishacademy.data.Kinds.MULTIPLE_CHOICE -> checkChoice(exercise, answer)
        com.dadaxon.aienglishacademy.data.Kinds.TRUE_FALSE_NOTGIVEN -> checkTfng(exercise, answer)
        com.dadaxon.aienglishacademy.data.Kinds.MATCHING -> checkMatching(exercise, answer)
        com.dadaxon.aienglishacademy.data.Kinds.GAP_FILL -> checkGapFill(exercise, answer)
        com.dadaxon.aienglishacademy.data.Kinds.WORD_ORDER -> checkWordOrder(exercise, answer)
        com.dadaxon.aienglishacademy.data.Kinds.TRANSLATION -> checkTranslation(exercise, answer)
        // Vebda union to'liq bo'lgani uchun `default` yo'q; bu yerda turi
        // noma'lum bo'lsa javob BERILMAGAN deb hisoblanadi (yalon "to'g'ri"
        // chiqmasligi kerak).
        else -> CheckOutcome(false, "", "", exercise.explanationUz, 0.0)
    }

private fun toList(answer: Any?): List<String> =
    when (answer) {
        is List<*> -> answer.map { it?.toString() ?: "" }
        null -> emptyList()
        else -> listOf(answer.toString())
    }

/** Mashqning `options` ro'yxati (yo'q bo'lsa bo'sh). */
private fun optionsOf(exercise: Exercise): List<String> = exercise.options ?: emptyList()

fun checkChoice(exercise: Exercise, answer: Any?): CheckOutcome {
    // Javob BERILMAGAN bo'lsa (bo'sh setr / null) `Number('') === 0` 0-variantni
    // "tanlangan" deb yuborardi — Xatolar daftarida javobsiz savol "to'g'ri"
    // bo'lib ko'rinardi. Endi bunday holat aniq noto'g'ri hisoblanadi.
    val answered: Boolean =
        when (answer) {
            is Number -> answer.toDouble().isFinite()
            else -> answer != null && answer.toString().trim() != ""
        }
    // Veb: `idx = answered ? (typeof answer === 'number' ? answer : Number(answer)) : -1`
    // — son bo'lmagan satr `NaN` beradi (indekslanmaydi, `===` ham yutonmaydi).
    val idx: Double? =
        if (!answered) {
            null
        } else {
            when (answer) {
                is Number -> answer.toDouble()
                else -> jsNumber(answer.toString())
            }
        }

    val opts = optionsOf(exercise)
    val useIndex = idx != null && idx >= 0 && idx == Math.floor(idx)
    val chosen = if (useIndex) opts.getOrNull(idx!!.toInt()) ?: "" else ""
    val correct = answered && idx != null && idx == exercise.answerIndex.toDouble()

    return CheckOutcome(
        correct = correct,
        given = chosen,
        expected = opts.getOrNull(exercise.answerIndex) ?: "",
        whyUz = if (correct) exercise.explanationUz else "Tanlovingiz noto‘g‘ri. ${exercise.explanationUz}",
        partial = if (correct) 1.0 else 0.0,
    )
}

/** JS `Number(...)` ga yaqin tahlil: son bo'lmasa `null` (vebda `NaN`). */
private fun jsNumber(raw: String): Double? {
    val s = raw.trim()
    if (s.isEmpty()) return null
    return s.toDoubleOrNull()
}

private val TFNG_LABEL: Map<String, String> =
    linkedMapOf("true" to "True", "false" to "False", "notgiven" to "Not Given")

fun checkTfng(exercise: Exercise, answer: Any?): CheckOutcome {
    val given = answer?.toString() ?: ""
    val expectedKey = exercise.answer ?: ""
    val correct = given == expectedKey
    var why = exercise.explanationUz
    val evidence = exercise.evidence
    if (!correct) {
        why = "To‘g‘ri javob — ${TFNG_LABEL[expectedKey]}. ${exercise.explanationUz}"
        if (!evidence.isNullOrEmpty()) why += " Matndagi asos: “$evidence”."
    } else if (!evidence.isNullOrEmpty()) {
        why += " Matndagi asos: “$evidence”."
    }
    return CheckOutcome(
        correct = correct,
        given = TFNG_LABEL[given] ?: "",
        expected = TFNG_LABEL[expectedKey] ?: "",
        whyUz = why,
        partial = if (correct) 1.0 else 0.0,
    )
}

fun checkMatching(exercise: Exercise, answer: Any?): CheckOutcome {
    val pairs = exercise.pairs ?: emptyList()
    // Veb: `const map = (answer ?? {}) as Record<string, string>` — obyekt
    // bo'lmagan javobda barcha qidiruvlar `undefined` (bo'sh satr) bo'ladi.
    val map: Map<String, String> =
        if (answer is Map<*, *>) {
            // Wildcard tipli map: kalit/qiymatlar satrga aylantiriladi (vebda
            // barcha qiymatlar `string`).
            val out = LinkedHashMap<String, String>()
            for (e in answer.entries) out[e.key?.toString() ?: ""] = e.value?.toString() ?: ""
            out
        } else {
            emptyMap()
        }

    var ok = 0
    val wrongPairs = mutableListOf<String>()
    for (pair in pairs) {
        if (normalize(map[pair.left] ?: "") == normalize(pair.right)) ok += 1 else wrongPairs.add("“${pair.left}” → ${pair.right}")
    }
    val total = pairs.size
    val partial = if (total == 0) 0.0 else ok.toDouble() / total
    return CheckOutcome(
        correct = ok == total,
        given = pairs.joinToString("; ") { "${it.left} → ${map[it.left] ?: "—"}" },
        expected = pairs.joinToString("; ") { "${it.left} → ${it.right}" },
        whyUz =
            if (ok == total) {
                exercise.explanationUz
            } else {
                "$ok/$total juftlik to‘g‘ri. Xatolar: ${wrongPairs.take(4).joinToString(", ")}. ${exercise.explanationUz}"
            },
        partial = partial,
    )
}

fun checkGapFill(exercise: Exercise, answer: Any?): CheckOutcome {
    val given = toList(answer)
    val alternatives = exercise.acceptAlternatives ?: emptyList()
    val expectedList = exercise.answers ?: emptyList()
    var ok = 0
    val detail = mutableListOf<String>()

    expectedList.forEachIndexed { i, expected ->
        val user = given.getOrNull(i) ?: ""
        val acceptable = listOf(expected) + (alternatives.getOrNull(i) ?: emptyList())
        val hit = acceptable.any { if (exercise.caseSensitive == true) it == user else looseEquals(it, user) }
        if (hit) {
            ok += 1
        } else {
            detail.add("${i + 1}-bo‘shliq: sizda “${if (user.isEmpty()) "bo‘sh" else user}”, to‘g‘ri: “$expected”")
        }
    }

    val total = expectedList.size
    val partial = if (total == 0) 0.0 else ok.toDouble() / total
    return CheckOutcome(
        correct = ok == total,
        given = given.joinToString(" / "),
        expected = expectedList.joinToString(" / "),
        whyUz = if (ok == total) exercise.explanationUz else "${detail.joinToString("; ")}. ${exercise.explanationUz}",
        partial = partial,
    )
}

/**
 * word-order javob ro'yxati — yassilangan modelda `answers`da saqlanadi
 * (fayl kaliti `answer`, `ContentRepository` уни ko'chiradi).
 */
fun wordOrderAnswer(exercise: Exercise): List<String> = exercise.answers ?: emptyList()

fun checkWordOrder(exercise: Exercise, answer: Any?): CheckOutcome {
    // `answer` bazan BITTA satr bo'lib keladi (ErrorLog qayta baholash,
    // MockExam tiklash) — tokenlarga ajratamiz, aks holda "qaysi o'rinda xato"
    // tushuntirishi Butun gapni 1-tekt deb ko'rsatardi.
    val tokens = "\\s+".toRegex()
    val given = toList(answer).flatMap { it.split(tokens) }.filter { it.isNotEmpty() }
    val expectedList = wordOrderAnswer(exercise)
    val correctSeq = given.joinToString(" ")
    val expectedSeq = expectedList.joinToString(" ")
    val correct = normalize(correctSeq) == normalize(expectedSeq)

    var why = exercise.explanationUz
    if (!correct) {
        // Qaysi so'z noto'g'ri joyda — buni ko'rsatamiz (tuzilish xatosini tushuntirish).
        var firstWrong = -1
        for (i in expectedList.indices) {
            if (normalize(given.getOrNull(i) ?: "") != normalize(expectedList[i])) {
                firstWrong = i
                break
            }
        }
        val pos = firstWrong + 1
        val sizda = given.getOrNull(firstWrong)
        why =
            "Tartibda xato bor: $pos-o‘rinda “${expectedList.getOrNull(firstWrong) ?: "—"}” turishi kerak edi" +
                (if (!sizda.isNullOrEmpty()) ", sizda “$sizda”." else ".") +
                " ${exercise.noteUz ?: ""} ${exercise.explanationUz}".trim()
    }

    return CheckOutcome(
        correct = correct,
        given = correctSeq,
        expected = expectedSeq,
        whyUz = why,
        partial = if (correct) 1.0 else 0.0,
    )
}

fun checkTranslation(exercise: Exercise, answer: Any?): CheckOutcome {
    val given = toList(answer).getOrNull(0) ?: ""
    val accepted = exercise.accepted ?: emptyList()
    val correct = accepted.any { looseEquals(it, given) }
    return CheckOutcome(
        correct = correct,
        given = given,
        expected = accepted.getOrNull(0) ?: "",
        whyUz =
            if (correct) {
                exercise.explanationUz
            } else {
                "Qabul qilingan variantlar: ${accepted.joinToString(", ") { "“$it”" }}. ${exercise.explanationUz}"
            },
        partial = if (correct) 1.0 else 0.0,
    )
}

/**
 * Natijaga moslashtirish: keyingi mashqni tanlash.
 * To'g'ri javoblar -> qiyinlik oshadi, xatolar -> shu mavzu qaytadi.
 */
fun nextExerciseIndex(currentIndex: Int, results: List<CheckOutcome>, poolSize: Int): Int {
    if (poolSize <= 1) return 0
    val recent = results.takeLast(3)
    val avg = if (recent.isEmpty()) 0.5 else recent.sumOf { it.partial } / recent.size
    val last = results.lastOrNull()

    if (last != null && !last.correct) {
        // Xato: o'sha qiyinlikda qolamiz, lekin bitta oldingi/keyingi bilan mustahkamlaymiz.
        return Math.max(0, Math.min(poolSize - 1, currentIndex - 1))
    }
    if (avg >= 0.8) return Math.min(poolSize - 1, currentIndex + 1)
    return Math.max(0, Math.min(poolSize - 1, currentIndex))
}
