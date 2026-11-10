package com.dadaxon.aienglishacademy

import java.io.File
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Layout'dagi HAR BIR tugma haqiqatan bosiladigan bo'lishi kerak.
 *
 * Sabab (real xato): `fragment_listening.xml`da `listeningPlayPause` va
 * `listeningReplay` bor edi, lekin `ListeningFragment`da ularga
 * `setOnClickListener` biriktirilmagan — audio ijro etinmasdi, ekran «ijro
 * etildi» deb ham yozmasdi (tugma jim o'lar edi). Bunday xatoni kod ko'rib
 * emas, tekshiruv ushlaydi.
 *
 * Qoida: bizning tugma uslubidagi (`Widget.Aea.Button…`) va `android:id`li
 * har bir View yoki `main` daraxtidagi biror faylda `setOnClickListener`
 * (yoki `onClick` / `performClick`) bilan tilga olingan, yoki quyidagi
 * ruxsat ro'yxatida izohi bilan turibdi.
 */
class LayoutWiringTest {

    private fun appDir(): File {
        val candidates = listOf(File("."), File("app"), File(".."))
        return candidates.firstOrNull { File(it, "src/main/res/layout").isDirectory } ?: File(".")
    }

    /** Tugma uslublari — bizning katalogdagi bosiladigan tugmalar. */
    private val buttonStyles = setOf(
        "Widget.Aea.Button",
        "Widget.Aea.Button.Outlined",
        "Widget.Aea.Button.Text",
        "Widget.Aea.Button.Tonal",
    )

    /**
     * Ruxsat ro'yxati: tugma bor, lekin bosish boshqa yo'l bilan bog'langan.
     * Har bir satrda SABAB yozilgan — ro'yxat "xato yashirish" emas.
     */
    private val allowed = mapOf(
        // Dialog tugmalari MaterialAlertDialogBuilder orqali (`setPositiveButton`).
        "authGuestHintButton" to "alert dialog tugmasi",
        // Ro'yxat/satr ichidagi tugmalar `Rows.button`/adapterda qayta quriladi.
        "rowButton" to "Rows körinişi, listener Rows içida",
    )

    @Test
    fun everyLayoutButtonHasAClickHandler() {
        val app = appDir()
        val layouts = File(app, "src/main/res/layout").listFiles()?.filter { it.isFile } ?: emptyList()
        assertTrue("layout papkasi topilmadi: ${app.absolutePath}", layouts.isNotEmpty())

        // `main` daraxtidagi Kotlin fayllari — tugma SHU FAYLLARNING BIRIDA
        // bog'langan bo'lishi kerak (boshqa fayldagi o'xshash nom aldamasin).
        val sources = ArrayList<Pair<String, String>>()
        File(app, "src/main/java").walkTopDown().filter { it.isFile && it.name.endsWith(".kt") }
            .forEach { sources += it.name to it.readText() }

        val unhandled = ArrayList<String>()
        val idRe = Regex("""android:id="@\+id/(\w+)"""")
        val styleRe = Regex("""style="@style/([\w.]+)"""")

        for (lf in layouts) {
            val xml = lf.readText()
            // Har bir element blokini ko'rib chiqamiz: `<Tag … />` yoki `<Tag …>`.
            for (block in Regex("""<[A-Za-z][\w.]*[^>]*>""").findAll(xml)) {
                val b = block.value
                val style = styleRe.find(b)?.groupValues?.get(1) ?: continue
                if (style !in buttonStyles && !style.endsWith("Button")) continue
                val id = idRe.find(b)?.groupValues?.get(1) ?: continue
                if (b.contains("android:onClick")) continue
                if (allowed.containsKey(id)) continue
                val wired = sources.any { (_, src) ->
                    // 1) oddiy tugma: `b.<id>` … `setOnClickListener`
                    Regex("""[.]$id\b[\s\S]{0,240}?\bsetOnClickListener""").containsMatchIn(src) ||
                        // 2) MaterialButtonToggleGroup a'zosi — bosish guruh
                        //    orqali keladi, `R.id.<id>` shu yerda qayd etilgan.
                        (src.contains("addOnButtonCheckedListener") &&
                            Regex("""R\.id\.$id\b""").containsMatchIn(src))
                }
                if (!wired) unhandled += "${lf.name} → $id"
            }
        }
        assertTrue(
            "Bosilmaydigan tugmalar (listener biriktirilmagan):\n" + unhandled.joinToString("\n"),
            unhandled.isEmpty(),
        )
    }
}
