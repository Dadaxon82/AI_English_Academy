package com.dadaxon.aienglishacademy

import com.dadaxon.aienglishacademy.ui.MascotView
import java.io.File
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * 3-VAZIFA: qahramon (Ai-English.jpg / `MascotView`) HAR BIR ekranda va
 * muloqotda bo'lishi kerak — bu test shu talabni statik tekshiradi.
 *
 * Qoidalar:
 *  1. Har bir `fragment_*.xml`da `MascotView` bo'lishi shart (ekran layout'i
 *     qahramonsiz qolmasin).
 *  2. Har bir ekran (`*Fragment`) kamida bitta `setMood(...)` chaqirishi yoki
 *     `MascotDialog.header(...)` orqali qahramonni ko'rsatishi shart — qahramon
 *     faqat rasm emas, kayfiyati vaziyatga qarab o'zgaradi.
 *  3. Muloqotda (`MaterialAlertDialogBuilder`) qatorlar `setView` ichida
 *     qurilsa, qator bosilganda `dismiss()` chaqirilishi shart. Aks holda
 *     keyingi ekran ochiladi, lekin ro'yxat ustida qoladi (real xato: kunni
 *     boshlash dialogi yopilmay qolgandi).
 */
class MascotPresenceTest {

    private fun appDir(): File {
        val candidates = listOf(File("."), File("app"), File(".."))
        return candidates.firstOrNull { File(it, "src/main/res/layout").isDirectory } ?: File(".")
    }

    private fun sources(): List<Pair<String, String>> {
        val out = ArrayList<Pair<String, String>>()
        File(appDir(), "src/main/java").walkTopDown().filter { it.isFile && it.name.endsWith(".kt") }
            .forEach { out += it.name to it.readText() }
        return out
    }

    @Test
    fun everyScreenLayoutShowsTheMascot() {
        val layouts = File(appDir(), "src/main/res/layout").listFiles()
            ?.filter { it.isFile && it.name.startsWith("fragment_") } ?: emptyList()
        assertTrue("fragment_*.xml layoutlari topilmadi", layouts.isNotEmpty())

        val missing = layouts.filter { !it.readText().contains("MascotView") }.map { it.name }
        assertTrue(
            "Qahramon bölmagan ekranlar:\n" + missing.joinToString("\n"),
            missing.isEmpty(),
        )
    }

    @Test
    fun everyFragmentPaintsTheMascotMood() {
        val frags = sources().filter { (name, src) ->
            name.endsWith("Fragment.kt") && src.contains(": Fragment()")
        }
        assertTrue("Fragment sinflari topilmadi", frags.isNotEmpty())

        val missing = frags.filter { (_, src) ->
            !src.contains("setMood(") && !src.contains("MascotDialog.header")
        }.map { (name, _) -> name }
        assertTrue(
            "Qahramon kayfiyati belgilanmagan ekranlar:\n" + missing.joinToString("\n"),
            missing.isEmpty(),
        )
    }

    /** Match'dan oldin boshlanadigan `fun` gövdesini qavslarni sanab qaytaradi. */
    private fun enclosingFun(src: String, at: Int): String {
        val head = Regex("""\bfun \w+""").findAll(src).lastOrNull { it.range.first < at }
            ?: return src
        val open = src.indexOf('{', head.range.last)
        if (open < 0) return src
        var depth = 0
        var i = open
        while (i < src.length) {
            when (src[i]) {
                '{' -> depth++
                '}' -> {
                    depth--
                    if (depth == 0) return src.substring(head.range.first, i + 1)
                }
            }
            i++
        }
        return src.substring(head.range.first)
    }

    /**
     * Qahramon — faqat rasm emas, holat belgisi (halqa rangi). Kod orqali
     * yaratilgan `MascotView`da (dialoglar) `contentDescription` bo'lmasa,
     * ekran o'quvchisi va `uiautomator` dumpida u umumin ko'rinmaydi —
     * "qahramon barcha ekranlarda" talabini text asosida tekshirib bo'lmaydi
     * (o'lchangan: kunni boshlash dialogida mascot node'i yo'q edi).
     */
    @Test
    fun mascotIsAnnouncedToAccessibility() {
        val src = File(appDir(), "src/main/java/com/dadaxon/aienglishacademy/ui/MascotView.kt").readText()
        assertTrue(
            "MascotView `contentDescription` bermaydi — dialog qahramoni ekran " +
                "öquvçisi uçun körinmas",
            src.contains("contentDescription ="),
        )
        for (m in MascotView.Mood.entries) {
            val key = "mascot_mood_" + m.name.lowercase()
            assertTrue(
                "$m kayfiyati uçun matn (`$key`) yöq",
                Regex("""<string\s+name="$key"""").containsMatchIn(
                    File(appDir(), "src/main/res/values/strings.xml").readText(),
                ),
            )
        }
    }

    @Test
    fun customRowDialogsDismissOnPick() {
        val problems = ArrayList<String>()
        for ((name, src) in sources()) {
            if (!src.contains("MaterialAlertDialogBuilder")) continue
            // Faqat o'z ko'rinishi (`setView(box)`) bilan qurilgan ro'yxatli
            // dialoglar: `setView(MascotDialog.header(...))` — tugmalari
            // `setPositiveButton` orqali keladi va o'zi yopiladi.
            for (m in Regex("""\.setView\((\w+)\)""").findAll(src)) {
                val body = enclosingFun(src, m.range.first)
                if (!Regex("""Rows\.row\(""").containsMatchIn(body)) continue
                if (!body.contains(".dismiss()")) {
                    problems += "$name: `${m.groupValues[1]}` röyxati bilan qurilgan dialog " +
                        "`dismiss()` çaqirmaydi — tanlovdan keyin dialog yangi ekranning " +
                        "ustida qoladi"
                }
            }
        }
        assertTrue(
            problems.joinToString("\n"),
            problems.isEmpty(),
        )
    }
}
