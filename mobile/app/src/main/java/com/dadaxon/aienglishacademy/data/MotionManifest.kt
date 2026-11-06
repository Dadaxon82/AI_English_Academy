package com.dadaxon.aienglishacademy.data

import com.google.gson.JsonObject
import com.google.gson.JsonParser

/**
 * Animatsiya byudjeti (`res/raw/motion_manifest.json`) — o'qish va tekshirish.
 *
 * Nima uchun alohida fayl: namunaviy ilova barcha harakat fayllarini `res/raw`
 * ichida saqlaydi (o'lchangan, 2026-11-05: `res/raw`da 1212 fayl / 75,5 MB —
 * 290 `.riv` (Rive), 297 `.mp3`, 278 `.hla` (tebranish+hana jufti), 198 `.json`
 * (Lottie), 135 `.ogg`). Biz Rive/Lottie fayllarini ko'chirmaymiz (75 MB va
 * tashqi format), lekin **joyi va mantiqi bir xil**: harakat tanlashimiz shu
 * `res/raw` manifestidan o'qiladi, xarajat sekundlarda emas, millisekundlarda
 * o'lchanadi.
 *
 * DULO o'lchovlari (Lottie `fr/ip/op` maydonlaridan hisoblandi —
 * `New_loixa\dulo_scan\scan7.py`): 195 Lottie fayldan eng qisqasi 483 ms
 * (`progress_bar_loss_aversion_poof.json`), mediana 2917 ms, eng uzoq 14 815 ms;
 * tebranish fayllari (`.hla`, 278 ta) `Duration` 1…7005 ms, mediana 947 ms.
 * Bizning qadamlar qisqa: ekranni kutdirmaymiz (standart Material harakati
 * 200—450 ms atrofida), manifestda ochiq yozilgan.
 *
 * Qiymatlar chegaradan chiqsa KLAMPQILADI (son ixtir qilinmaydi, lekin
 * buzilgan manifest ham ilovani qotirmaydi).
 */
data class MotionSpec(
    /** Bir mashqdan ikkinchisiga o'tish (fade+slide) — ms. */
    val stepMs: Long,
    /** Natija kartasining chiqishi — ms. */
    val outcomeMs: Long,
    /** Qahramon "sakrash" (scale bounce) — ms. */
    val popMs: Long,
    /** Qahramon eng katta masshtabi (1.0 = o'z o'lchami). */
    val popScale: Float,
    /** Ro'yxat elementlarining narigor (stagger) oralig'i — ms. */
    val staggerMs: Long,
    /** Narigor qatoridagi maksimal element soni (byudjet). */
    val staggerMaxItems: Int,
    /** XP sonining uchib chiqishi — ms. */
    val xpMs: Long,
    /** Zanjir kataklari to'lishi — ms. */
    val chainMs: Long,
) {
    companion object {
        /** Manifest bo'lmasa yoki buzilsa ishlatiladigan qiymatlar. */
        fun defaults(): MotionSpec = MotionSpec(
            stepMs = 260L,
            outcomeMs = 320L,
            popMs = 380L,
            popScale = 1.14f,
            staggerMs = 40L,
            staggerMaxItems = 8,
            xpMs = 620L,
            chainMs = 240L,
        )

        /** Chegaralar — manifestda bundan tashqarisi yozilmasligi kerak. */
        const val MIN_MS = 0L
        const val MAX_MS = 1500L

        /**
         * JSON matnini [MotionSpec]ga aylantirish. Noma'lum maydonlar
         * e'tiborga olinmaydi, noto'g'ri son maydoni bo'lsa butun manifest
         * `null` (chaqiruvchi `defaults()` ga qaytadi) — jimgina yarim
         * sozlangan holat qolmaydi.
         */
        fun parse(text: String): MotionSpec? {
            val d = defaults()
            val el = try {
                JsonParser.parseString(text)
            } catch (err: Exception) {
                return null
            }
            if (!el.isJsonObject) return null
            val o = el.asJsonObject

            fun ms(key: String, def: Long): Long? {
                val e = o.get(key) ?: return def
                if (!e.isJsonPrimitive || !e.asJsonPrimitive.isNumber) return null
                // `asDouble` — Double; `.toLong()` metod sifatiga chaqiriladi
                // (`toLong` property emas — kompilyator xatosi shu yerda edi).
                return e.asDouble.toLong().coerceIn(MIN_MS, MAX_MS)
            }

            val step = ms("stepMs", d.stepMs) ?: return null
            val outcome = ms("outcomeMs", d.outcomeMs) ?: return null
            val pop = ms("popMs", d.popMs) ?: return null
            val stagger = ms("staggerMs", d.staggerMs) ?: return null
            val xp = ms("xpMs", d.xpMs) ?: return null
            val chain = ms("chainMs", d.chainMs) ?: return null

            val scaleE = o.get("popScale")
            val scale = when {
                scaleE == null -> d.popScale
                scaleE.isJsonPrimitive && scaleE.asJsonPrimitive.isNumber ->
                    scaleE.asFloat.coerceIn(1.0f, 1.3f)
                else -> null
            } ?: return null

            val maxE = o.get("staggerMaxItems")
            val maxItems = when {
                maxE == null -> d.staggerMaxItems
                maxE.isJsonPrimitive && maxE.asJsonPrimitive.isNumber ->
                    maxE.asInt.coerceIn(1, 24)
                else -> null
            } ?: return null

            return MotionSpec(
                stepMs = step,
                outcomeMs = outcome,
                popMs = pop,
                popScale = scale,
                staggerMs = stagger,
                staggerMaxItems = maxItems,
                xpMs = xp,
                chainMs = chain,
            )
        }

        /** Manifestni to'liq JSON ga qaytarish (test va hisobot uchun). */
        fun toJson(s: MotionSpec): JsonObject {
            val o = JsonObject()
            o.addProperty("stepMs", s.stepMs)
            o.addProperty("outcomeMs", s.outcomeMs)
            o.addProperty("popMs", s.popMs)
            o.addProperty("popScale", s.popScale)
            o.addProperty("staggerMs", s.staggerMs)
            o.addProperty("staggerMaxItems", s.staggerMaxItems)
            o.addProperty("xpMs", s.xpMs)
            o.addProperty("chainMs", s.chainMs)
            return o
        }
    }
}
