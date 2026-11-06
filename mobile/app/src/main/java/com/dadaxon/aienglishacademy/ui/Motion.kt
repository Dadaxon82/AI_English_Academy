package com.dadaxon.aienglishacademy.ui

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.content.Context
import android.graphics.Color
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.View
import android.view.ViewGroup
import android.view.animation.DecelerateInterpolator
import android.view.animation.OvershootInterpolator
import android.widget.FrameLayout
import android.widget.TextView
import com.dadaxon.aienglishacademy.AeaApp
import com.dadaxon.aienglishacademy.R
import com.dadaxon.aienglishacademy.data.KEY_MOTION
import com.dadaxon.aienglishacademy.data.MotionSpec

/**
 * Harakat (animatsiya) qatlami — mashq pleyeri va o'quv yo'lida ishlatiladi.
 *
 * NAMUNAVI ILOVA (DULO_mod.apk) qanday qiladi (fayllar ochib o'lchangan,
 * 2026-11-05): barcha harakat `res/raw`da — 290 Rive (`.riv`) + 198 Lottie
 * (`.json`) fayl, ovozy 297 `.mp3`/135 `.ogg` va 278 tebranish bilan
 * bog'langan (`.hla`: `{"Duration":50,"Timings":[50],"Amplitudes":[127]}`).
 * Lottie fayllarining HAQIQY davomiyligi `fr/ip/op` dan hisoblandi: eng
 * qisqasi 483 ms, mediana 2917 ms.
 *
 * Biz Rive/Lottie fayllarini ko'chirmaymiz — ular tashqi format va 75 MB
 * (bizning butun APK ~20 MB). Buning o'rniga:
 *  1. harakat tanlash **xuddi shu joyda** — `res/raw/motion_manifest.json`
 *     (byudjet millisekundlarda ochiq yozilgan);
 *  2. chizish `ViewPropertyAnimator` bilan (qo'shimcha bog'liqlik talab
 *     qilmaydi — offline Gradle kechasiga hech narsa qo'shilmaydi);
 *  3. tebranish DULO `.hla` sxemasiga mos: qisqa impul + amplitude
 *     (`VibrationEffect.createOneShot`, amplitude API 31+).
 *
 * Hamma funksiya **xavfsiz**: `animate().cancel()` oldin chaqiriladi,
 * `alpha` oxirida 1.0 ga qaytadi, o'chirilgan sozlamada (`motionEnabled =
 * false`) yoki tizim animatsiyalari o'chirilganida hech narsa chizilmaydi
 * (view darhol holatida ko'rinadi) — "joyidan siljiydigan" layout qolmaydi.
 */
object Motion {

    /** Manifest bir marta o'qiladi (har ekran qayta ochganda emas). */
    private var cached: MotionSpec? = null

    /** Kontekstdan konteynerni olish (Activity/Fragment emas — `View.context`). */
    private fun containerOf(ctx: Context): com.dadaxon.aienglishacademy.AppContainer? =
        runCatching { (ctx.applicationContext as? AeaApp)?.container() }.getOrNull()

    /**
     * Byudjetni yuklash: avval foydalanuvchi kaliti (`aea:motion`), so'ng
     * `res/raw/motion_manifest.json`, aks holda [MotionSpec.defaults].
     * Fayl bo'lmasa yoki buzilsa — halol default (ilova qotmaydi).
     */
    fun spec(ctx: Context): MotionSpec {
        cached?.let { return it }
        val userJson = runCatching { containerOf(ctx)?.keyValue?.get(KEY_MOTION) }.getOrNull()
        val src = userJson ?: runCatching {
            ctx.resources.openRawResource(R.raw.motion_manifest).bufferedReader().use { it.readText() }
        }.getOrNull()
        val s = (src?.let { MotionSpec.parse(it) }) ?: MotionSpec.defaults()
        cached = s
        return s
    }

    /** Manifestni qayta o'qish (sozlama o'zgarganda). */
    fun reset() { cached = null }

    /**
     * Harakat yoqilganmi: sozlama + tizim animatsiyalar ko'rsatkichi.
     * `uiautomator` / `gfxinfo` o'lchovlarimiz uzilmasligi uchun tizim
     * animatsiyalari o'chirilganida (`animator_duration_scale = 0`) ham chizmaymiz.
     */
    fun enabled(ctx: Context): Boolean {
        val c = containerOf(ctx) ?: return false
        if (!c.store.settings().motionEnabled) return false
        val scale = runCatching {
            android.provider.Settings.Global.getFloat(ctx.contentResolver, "animator_duration_scale", 1f)
        }.getOrDefault(1f)
        return scale > 0f
    }

    /** Ekranga kirayotgan blok: pastdan 8 dp + fade ([MotionSpec.stepMs]). */
    fun stepIn(v: View, enter: Boolean = true) {
        val ctx = v.context
        val sp = spec(ctx)
        if (!enabled(ctx) || sp.stepMs <= 0) {
            v.alpha = 1f
            v.translationY = 0f
            return
        }
        v.animate().cancel()
        if (enter) {
            v.alpha = 0f
            v.translationY = dp(ctx, 8).toFloat()
            v.animate()
                .alpha(1f)
                .translationY(0f)
                .setDuration(sp.stepMs)
                .setInterpolator(DecelerateInterpolator())
                .start()
        } else {
            v.animate().alpha(0f).setDuration(sp.stepMs / 2).start()
        }
    }

    /**
     * Qahramon "quvoncli sakrashi" — DULO'dagi `duo_perfect_*.riv`
     * (masshtabli qahramon animatsiyasi) o'rniga: scale bounce + halqa
     * qayta chizilishi. [MascotView.setMood] allaqachon qayta chizadi.
     */
    fun pop(mascot: MascotView) {
        val ctx = mascot.context
        val sp = spec(ctx)
        if (!enabled(ctx) || sp.popMs <= 0) {
            mascot.scaleX = 1f
            mascot.scaleY = 1f
            return
        }
        mascot.animate().cancel()
        mascot.pivotX = mascot.width / 2f
        mascot.pivotY = mascot.height / 2f
        // [MotionSpec.popScale] manifestdagi qiymat (1.0 = o'z o'lchami):
        // avval biroz kichrayadi, so'ng manifest masshtabigacha "sakraydi"
        // va o'z holatiga qaytadi.
        val peak = sp.popScale
        mascot.scaleX = 0.9f
        mascot.scaleY = 0.9f
        mascot.animate()
            .scaleX(peak)
            .scaleY(peak)
            .setDuration(sp.popMs / 2)
            .setInterpolator(DecelerateInterpolator())
            .withEndAction {
                mascot.animate()
                    .scaleX(1f)
                    .scaleY(1f)
                    .setDuration(sp.popMs / 2)
                    .setInterpolator(DecelerateInterpolator())
                    .start()
            }
            .start()
    }

    /**
     * Ro'yxat elementlarini narigor bilan chizish (DULO o'quv yo'lidagi
     * "kunlar birma-bir to'ladi" xulqining bizdagi ko'rinishi).
     *
     * BYUDJET: faqat [MotionSpec.staggerMaxItems] tagacha qator harakatlanadi
     * — qolganlari darhol ko'rinadi (uzun ro'yxatda harakat qatori
     * kutdiradi; `UI_KONTRAKTI.md`dagi bo'laklab chizish qoidasi bilan
     * bir yo'nalishda).
     */
    fun stagger(host: ViewGroup, fromIndex: Int = 0) {
        val ctx = host.context
        val sp = spec(ctx)
        if (!enabled(ctx) || sp.staggerMs <= 0) return
        var drawn = 0
        for (i in fromIndex until host.childCount) {
            val child = host.getChildAt(i)
            if (i >= sp.staggerMaxItems) { child.alpha = 1f; child.translationY = 0f; continue }
            child.animate().cancel()
            child.alpha = 0f
            child.translationY = 0f
            child.animate()
                .alpha(1f)
                .setStartDelay((drawn * sp.staggerMs))
                .setDuration(spec(ctx).stepMs)
                .setInterpolator(DecelerateInterpolator())
                .start()
            drawn++
        }
    }

    /**
     * XP sonining ko'tarilib yo'qolishi (DULO `…xp_boost…`/`score_*`
     * animatsiyalarining mohiyati: son ko'tariladi va so'nadi).
     * O'lchovga zararsiz bo'lishi uchun label `contentDescription` bermaydi.
     */
    fun flyXp(anchor: View, text: String, colorRes: Int = R.color.ok) {
        val ctx = anchor.context
        val sp = spec(ctx)
        val root = anchor.rootView as? ViewGroup ?: return
        if (!enabled(ctx) || sp.xpMs <= 0) return
        val label = TextView(ctx).apply {
            this.text = text
            setTextColor(ctx.getColor(colorRes))
            setTextAppearance(R.style.Text_Aea_Section)
            // Setter ALOHIDA chaqiriladi: `View`da `importantForAccessibility`
            // ochiq MAYDON (field) — birinchi urinishda (`isImportant…`) Kotlin
            // maydoniga yozib "val cannot be reassigned" deb xato berdi.
            setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO)
        }
        val holder = FrameLayout(ctx).apply {
            setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO)
            addView(
                label,
                FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                ),
            )
        }
        val off = IntArray(2)
        anchor.getLocationInWindow(off)
        val win = IntArray(2)
        root.getLocationInWindow(win)
        val params = FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
        )
        params.leftMargin = off[0] - win[0]
        params.topMargin = off[1] - win[1]
        root.addView(holder, params)
        holder.alpha = 0f
        holder.translationY = 0f
        holder.animate()
            .alpha(1f)
            .translationY(-dp(ctx, 36).toFloat())
            .setDuration(sp.xpMs / 2)
            .setInterpolator(DecelerateInterpolator())
            .withEndAction {
                holder.animate()
                    .alpha(0f)
                    .translationY(-dp(ctx, 64).toFloat())
                    .setDuration(sp.xpMs / 2)
                    .setListener(object : AnimatorListenerAdapter() {
                        override fun onAnimationEnd(a: Animator) {
                            (holder.parent as? ViewGroup)?.removeView(holder)
                        }
                    })
                    .start()
            }
            .start()
    }

    /**
     * Zanjir kataгинi to'ldirish (o'quv yo'lidagi "darslar ketma-ketligi"
     * kartasi). Rangi bajarilgan/bajarilmagan holatini bildiradi; harakat
     * o'chirilgan bo'lsa katak darhol to'la ko'rinadi.
     */
    fun fillChainCell(cell: View, filled: Boolean, order: Int) {
        val ctx = cell.context
        val sp = spec(ctx)
        cell.animate().cancel()
        if (!enabled(ctx) || sp.chainMs <= 0) {
            cell.alpha = 1f
            cell.scaleX = 1f
            cell.scaleY = 1f
            return
        }
        cell.alpha = if (filled) 0f else 1f
        if (filled) {
            cell.scaleX = 0.6f
            cell.scaleY = 0.6f
        }
        cell.animate()
            .alpha(1f)
            .scaleX(1f)
            .scaleY(1f)
            .setStartDelay(order * sp.chainMs / 4)
            .setDuration(sp.chainMs)
            .setInterpolator(OvershootInterpolator(1.6f))
            .start()
    }

    /**
     * Tebranish — DULO `.hla` fayllaridagi "Duration/Timings/Amplitudes"
     * juftligining bizdagi mosligi. Amplitude API 31+ da bor; undan oldin
     * oddiy impuls ( amplitude ixtir qilinmaydi, format aytiladi).
     */
    fun tap(ctx: Context, durationMs: Long = 30, amplitude: Int = 127) {
        if (!enabled(ctx)) return
        val vib = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            (ctx.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            ctx.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        } ?: return
        if (!vib.hasVibrator()) return
        val fx = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            VibrationEffect.createOneShot(
                durationMs,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) amplitude.coerceIn(1, 255)
                else VibrationEffect.DEFAULT_AMPLITUDE,
            )
        } else {
            null
        }
        try {
            if (fx != null) vib.vibrate(fx) else @Suppress("DEPRECATION") vib.vibrate(durationMs)
        } catch (err: Exception) {
            // Tebranish rad etilsa ham ilova ishlashda davom etadi.
        }
    }

    private fun dp(ctx: Context, v: Int): Int = (v * ctx.resources.displayMetrics.density).toInt()

    /** Testlar uchun: manifest rangi haqiqatan to'g'ri o'qilishini tekshirish. */
    fun contrastOk(fg: Int, bg: Int): Boolean {
        fun lum(c: Int): Double {
            fun ch(v: Int): Double {
                val s = v / 255.0
                return if (s <= 0.03928) s / 12.92 else Math.pow((s + 0.055) / 1.055, 2.4)
            }
            return 0.2126 * ch(Color.red(c)) + 0.7152 * ch(Color.green(c)) + 0.0722 * ch(Color.blue(c))
        }
        val a = lum(fg)
        val b = lum(bg)
        val hi = maxOf(a, b)
        val lo = minOf(a, b)
        return (hi + 0.05) / (lo + 0.05) >= 3.0
    }
}
