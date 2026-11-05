package com.dadaxon.aienglishacademy

import java.io.File
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * `getString(R.string.X, …)` chaqiruvlari resursdagi FORMAT BILAN mos bo'lishi
 * kerak — son soniga, joylashuv tartibiga va TURNIGA.
 *
 * Sabab (real xato): `Rows.skillBar`da
 * `getString(R.string.skillbar_percent, skillName(ctx, skill), scorePercent)`
 * yozilgan edi, `skillbar_percent`da esa faqat `%1$d` bor. Natijada
 * `IllegalFormatConversionException: d != java.lang.String` — Boshqaruv va
 * Progress ekranlarida qator tuzilayotgan joyda uziladi, keyingi qatorlar umuman
 * chizilmaydi va ekran qotadi (emulatorda ANR dalili bilan topildi). Bunday
 * xato unit testda o'qilmaydi (formatni faqat android `Resources`i bajaradi),
 * shuning uchun bu test resurslarni va chaqiruvlarni MATN darajasida
 * solishtiradi.
 */
class StringFormatArgsTest {

    private fun appDir(): File {
        val candidates = listOf(File("."), File("app"), File(".."))
        return candidates.firstOrNull { File(it, "src/main/res/values").isDirectory } ?: File(".")
    }

    /**
     * Resurs formatining tavsifi: har bir pozitsion indeks -> konversiya harfi.
     * `needed` — argumentlar soni; `convAt(i)` — i-argument qanday turda.
     */
    private class Spec(private val convs: Map<Int, Char>) {
        val needed: Int get() = convs.keys.maxOrNull() ?: 0
        fun convAt(index: Int): Char? = convs[index]
        override fun toString(): String = convs.toSortedMap().toString()
    }

    /**
     * Resurs matnidan format t وصfini ajratish. `%%` — oddiy foiz belgisi,
     * konversiya EMAS. Pozitsiyasiz ko'rinish (`%d`, `%s`) tartibi bo'yicha
     * 1, 2, 3… indekslarga aylantiriladi (Java `Formatter` xulosasi shunday).
     */
    private fun specOf(text: String): Spec {
        val found = ArrayList<Char>()
        val named = HashMap<Int, Char>()
        val re = Regex("""%(\d+\$)?[-+ #0]*[0-9]*(?:\.[0-9]+)?([dfFscxXeEgGbob])""")
        var i = 0
        while (i < text.length) {
            if (text[i] == '%' && i + 1 < text.length && text[i + 1] == '%') {
                i += 2
                continue
            }
            val m = re.find(text, i) ?: break
            val pos = m.groupValues[1].removeSuffix("$").toIntOrNull()
            if (pos != null) named[pos] = m.groupValues[2][0] else found += m.groupValues[2][0]
            i = m.range.last + 1
        }
        val map = HashMap<Int, Char>()
        if (named.isEmpty()) {
            found.forEachIndexed { n, c -> map[n + 1] = c }
        } else {
            map.putAll(named)
        }
        return Spec(map)
    }

    /** `res/values*` dagi barcha `<string name=…>` resurslari. */
    private fun strings(): Map<String, Spec> {
        val res = File(appDir(), "src/main/res")
        val valuesDirs = res.listFiles()?.filter { it.isDirectory && it.name.startsWith("values") }
            ?: emptyList()
        assertTrue("res/values topilmadi: ${res.absolutePath}", valuesDirs.isNotEmpty())

        val out = HashMap<String, Spec>()
        val entry = Regex("""<string\s+name="(\w+)"[^>]*>([\s\S]*?)</string>""")
        for (dir in valuesDirs) {
            for (f in dir.listFiles()?.filter { it.name.endsWith(".xml") } ?: emptyList()) {
                for (m in entry.findAll(f.readText())) {
                    out[m.groupValues[1]] = specOf(m.groupValues[2])
                }
            }
        }
        assertTrue("string resurslari o'qilmadi", out.isNotEmpty())
        return out
    }

    /** `getString(R.string.id, arg1, arg2 …)` chaqiruvi (matndan topilgan). */
    private class Call(val resource: String, val args: List<String>, val at: String)

    /** `open` belgisidan keyin tegishli `)` gacha bo'lgan argument ro'yxati. */
    private fun splitArgs(src: String, open: Int): List<String> {
        val parts = ArrayList<String>()
        val cur = StringBuilder()
        var depth = 1
        var i = open
        var inString = false
        var escape = false
        while (i < src.length) {
            val c = src[i]
            if (inString) {
                if (escape) escape = false
                else when (c) {
                    '\\' -> escape = true
                    '"' -> inString = false
                }
                cur.append(c)
                i++
                continue
            }
            when (c) {
                '"' -> { inString = true; cur.append(c) }
                '(', '[', '{' -> { depth++; cur.append(c) }
                ')', ']', '}' -> {
                    depth--
                    if (depth == 0) {
                        if (cur.isNotBlank()) parts += cur.toString().trim()
                        return parts
                    }
                    cur.append(c)
                }
                ',' -> if (depth == 1) { parts += cur.toString().trim(); cur.setLength(0) } else cur.append(c)
                else -> cur.append(c)
            }
            i++
        }
        return parts
    }

    private fun calls(): List<Call> {
        val out = ArrayList<Call>()
        val re = Regex("""(?<!\w)getString\(\s*R\.string\.(\w+)""")
        File(appDir(), "src/main/java").walkTopDown().filter { it.isFile && it.name.endsWith(".kt") }
            .forEach { f ->
                val src = f.readText()
                for (m in re.findAll(src)) {
                    val open = src.indexOf('(', m.range.first)
                    // Birinchi "argument" — resursning o'zi (`R.string.x`), uni tashlaymiz.
                    val args = splitArgs(src, open + 1).drop(1)
                    val line = src.take(m.range.first).count { it == '\n' } + 1
                    out += Call(m.groupValues[1], args, "${f.name}:$line")
                }
            }
        return out
    }

    /**
     * Argument ANIQ matn: qo'shtirli satr, boshqa resurs, yoki matn maydoni.
     * Matn ifodalari (`formatDuration(…)`, `takeIf`) bu yo'lga kirmaydi —
     * ular noto'g'ri aylov beradi.
     */
    private fun looksText(arg: String): Boolean =
        arg.startsWith("\"") || arg.contains("R.string.") || arg.contains("getString(") ||
            Regex("""\.text\b""").containsMatchIn(arg) || arg.endsWith("toString()") ||
            Regex("""\b\w*(label|title|name|hint|note)Uz$""").containsMatchIn(arg) ||
            Regex("""^[A-Za-z_]\w*Uz$""").matches(arg)

    /** Argument ANIQ son: literal, son sonisi yoki son qaytargan metod. */
    private fun looksNumber(arg: String): Boolean =
        Regex("""^-?\d+$""").matches(arg) ||
            Regex("""\.(size|count|toInt|toLong|toIntOrNull|hashCode)\(\)?${'$'}""").containsMatchIn(arg) ||
            Regex("""\d\)$""").matches(arg)

    @Test
    fun everyGetStringCallMatchesItsResourceFormat() {
        val specs = strings()
        val found = calls()
        assertTrue("getString chaqiruvlari topilmadi", found.isNotEmpty())

        val problems = ArrayList<String>()
        for (call in found) {
            val s = specs[call.resource]
            if (s == null) {
                problems += "${call.at}: R.string.${call.resource} resursi topilmadi"
                continue
            }
            if (call.args.size != s.needed) {
                problems += "${call.at}: ${call.resource} da ${s.needed} ta format joyi bor, " +
                    "chaqiruvda ${call.args.size} ta argument: ${call.args}"
                continue
            }
            for ((n, arg) in call.args.withIndex()) {
                val conv = s.convAt(n + 1) ?: continue
                val numeric = conv in "dfFeEgG"
                // `%d` ga matn — HALQI XATO (`IllegalFormatConversionException`).
                // `%s` ga son berilishi esa xato emas (Formatter qabul qiladi),
                // shuning uchun u tekshirilmaydi.
                if (numeric && looksText(arg) && !looksNumber(arg)) {
                    problems += "${call.at}: ${call.resource} %$conv (${n + 1}-argument) son bo'lishi " +
                        "kerak, lekin matn ko'rinadi: $arg"
                }
            }
        }
        assertTrue(
            "Format/argument mos emas:\n" + problems.joinToString("\n"),
            problems.isEmpty(),
        )
    }

    /**
     * Format joylari soni resurs O'ZIDA ham to'g'ri o'qilishini tekshirish —
     * testning o'zi noto'g'ri bo'lib qolmasin (regression ushlagichi).
     */
    @Test
    fun formatParsingHandlesPositionalAndPlainSpecifiers() {
        assertTrue(specOf("Baho: %1\$d%%").needed == 1)
        assertTrue(specOf("Baho: %1\$d%%").convAt(1) == 'd')
        assertTrue("`%%` — konversiya emas", specOf("Baho: %1\$d%%").convAt(2) == null)
        assertTrue(specOf("%d va %s").needed == 2)
        assertTrue(specOf("%d va %s").convAt(1) == 'd')
        assertTrue(specOf("%2\$s va %1\$d").convAt(1) == 'd')
        assertTrue(specOf("hech narsa yo'q").needed == 0)
        assertTrue(specOf("100% tasdiq").needed == 0)
    }
}
