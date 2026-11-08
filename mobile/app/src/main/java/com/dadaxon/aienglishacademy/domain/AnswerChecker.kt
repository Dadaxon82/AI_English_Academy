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
        com.dadaxon.aienglishacademy.data.Kinds.MULTI_SELECT -> checkMultiSelect(exercise, answer)
        com.dadaxon.aienglishacademy.data.Kinds.DROPDOWN_CLOZE -> checkDropdown(exercise, answer)
        com.dadaxon.aienglishacademy.data.Kinds.SEQUENCE -> checkSequence(exercise, answer)
        com.dadaxon.aienglishacademy.data.Kinds.CATEGORIZE -> checkCategorize(exercise, answer)
        com.dadaxon.aienglishacademy.data.Kinds.SHORT_ANSWER -> checkShortAnswer(exercise, answer)
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

/* ------------------- 2026-11-08: yangi turlar (veb `check.ts` bilan bir xil) ------------------- */

/** Bir nechta javob: to'plam aniq teng bo'lsa to'g'ri; ortiqcha tanlov ballni kamaytiradi. */
fun checkMultiSelect(exercise: Exercise, answer: Any?): CheckOutcome {
    val opts = optionsOf(exercise)
    val raw: List<Any?> = if (answer is List<*>) answer else emptyList()
    val chosen =
        raw.mapNotNull { (it as? Number)?.toDouble() ?: it?.toString()?.toDoubleOrNull() }
            .filter { it == Math.floor(it) && it >= 0 && it < opts.size }
            .map { it.toInt() }
            .distinct()
            .sorted()
    val right = (exercise.answerIndexes ?: emptyList()).distinct().sorted()
    val hits = chosen.count { it in right }
    val extra = chosen.size - hits
    val correct = hits == right.size && extra == 0
    val partial = if (right.isEmpty()) 0.0 else Math.max(0.0, (hits - extra).toDouble() / right.size)
    var why = exercise.explanationUz
    if (!correct) {
        val bits = mutableListOf<String>()
        val missed = right.filter { it !in chosen }.map { "“${opts[it]}”" }
        val wrong = chosen.filter { it !in right }.map { "“${opts[it]}”" }
        if (missed.isNotEmpty()) bits.add("belgilanmagan to‘g‘ri javob: ${missed.joinToString(", ")}")
        if (wrong.isNotEmpty()) bits.add("ortiqcha belgilangan: ${wrong.joinToString(", ")}")
        why = "${bits.joinToString("; ")}. ${exercise.explanationUz}"
    }
    return CheckOutcome(
        correct = correct,
        given = chosen.joinToString(", ") { opts[it] },
        expected = right.mapNotNull { opts.getOrNull(it) }.joinToString(", "),
        whyUz = why,
        partial = if (correct) 1.0 else partial,
    )
}

/** Ochiluvchi ro'yxat: har bo'shliq alohida baholanadi. */
fun checkDropdown(exercise: Exercise, answer: Any?): CheckOutcome {
    val given = toList(answer)
    val expectedList = exercise.answers ?: emptyList()
    var ok = 0
    val detail = mutableListOf<String>()
    expectedList.forEachIndexed { i, expected ->
        val user = given.getOrNull(i) ?: ""
        if (normalize(user) == normalize(expected)) {
            ok += 1
        } else {
            detail.add("${i + 1}-bo‘shliq: “${if (user.isEmpty()) "—" else user}” emas, “$expected”")
        }
    }
    val total = expectedList.size
    return CheckOutcome(
        correct = ok == total && total > 0,
        given = given.joinToString(" / "),
        expected = expectedList.joinToString(" / "),
        whyUz = if (ok == total) exercise.explanationUz else "${detail.joinToString("; ")}. ${exercise.explanationUz}",
        partial = if (total == 0) 0.0 else ok.toDouble() / total,
    )
}

/** Ketma-ketlik: to'liq tartib mos bo'lsa to'g'ri; qisman — o'z joyidagilar ulushi. */
fun checkSequence(exercise: Exercise, answer: Any?): CheckOutcome {
    val given = toList(answer)
    val items = exercise.items ?: emptyList()
    val n = items.size
    var ok = 0
    items.forEachIndexed { i, it -> if (normalize(given.getOrNull(i) ?: "") == normalize(it)) ok += 1 }
    val correct = ok == n && given.size == n
    var why = exercise.explanationUz
    if (!correct) {
        val first = items.indices.firstOrNull { normalize(given.getOrNull(it) ?: "") != normalize(items[it]) } ?: -1
        why = "$ok/$n ta element o‘z joyida. ${first + 1}-o‘rinda “${items.getOrNull(first) ?: "—"}” turishi kerak edi. ${exercise.explanationUz}"
    }
    return CheckOutcome(
        correct = correct,
        given = given.mapIndexed { i, g -> "${i + 1}) $g" }.joinToString(" "),
        expected = items.mapIndexed { i, g -> "${i + 1}) $g" }.joinToString(" "),
        whyUz = why,
        partial = if (n == 0) 0.0 else ok.toDouble() / n,
    )
}

/** Saralash: javob — element matni → guruh indeksi. */
fun checkCategorize(exercise: Exercise, answer: Any?): CheckOutcome {
    val cats = exercise.categories ?: emptyList()
    val sortItems = exercise.sortItems ?: emptyList()
    val map: Map<String, Int?> =
        if (answer is Map<*, *>) {
            answer.entries.associate { (k, v) ->
                (k?.toString() ?: "") to ((v as? Number)?.toInt() ?: v?.toString()?.toIntOrNull())
            }
        } else {
            emptyMap()
        }
    var ok = 0
    val wrong = mutableListOf<String>()
    for (it in sortItems) {
        if (map[it.text] == it.category) ok += 1 else wrong.add("“${it.text}” → ${cats.getOrNull(it.category) ?: "—"}")
    }
    val total = sortItems.size
    fun grouped(pick: (SortItemView) -> Boolean): String =
        cats.mapIndexed { ci, c ->
            "$c: " + sortItems.filter { pick(SortItemView(it.text, it.category, map[it.text], ci)) }.joinToString(", ") { it.text }
        }.joinToString(" | ")
    return CheckOutcome(
        correct = ok == total && total > 0,
        given = grouped { it.chosen == it.groupIndex },
        expected = grouped { it.category == it.groupIndex },
        whyUz =
            if (ok == total) {
                exercise.explanationUz
            } else {
                "$ok/$total to‘g‘ri. To‘g‘risi: ${wrong.take(4).joinToString("; ")}. ${exercise.explanationUz}"
            },
        partial = if (total == 0) 0.0 else ok.toDouble() / total,
    )
}

private data class SortItemView(val text: String, val category: Int, val chosen: Int?, val groupIndex: Int)

/** Qisqa javob: qabul qilinadigan variantlardan biriga bardoshli tenglik. */
fun checkShortAnswer(exercise: Exercise, answer: Any?): CheckOutcome {
    val given = toList(answer).getOrNull(0) ?: ""
    val accepted = exercise.accepted ?: emptyList()
    val correct = given.isNotBlank() && accepted.any { looseEquals(it, given) }
    return CheckOutcome(
        correct = correct,
        given = given,
        expected = accepted.getOrNull(0) ?: "",
        whyUz =
            if (correct) {
                exercise.explanationUz
            } else {
                "Kutilgan javob: ${accepted.joinToString(" yoki ") { "“$it”" }}. ${exercise.explanationUz}"
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
