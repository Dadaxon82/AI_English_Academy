package com.dadaxon.aienglishacademy.ui

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import android.util.AttributeSet
import android.view.View
import com.dadaxon.aienglishacademy.R

/**
 * Qahramon (`mascot.png` / `mascot_avatar.png`) — veb `components/Mascot.tsx`
 * ning mobil moslamasi. Har ekranda bor: bo'sh, xato va muvaffaqiyat hollarida.
 *
 * XOTIRA: bitmap BIR marta, ko'ringan o'lchamga mos `inSampleSize` bilan
 * dekodlanadi — 1024px PNG butunlay xotiraga yuklanmaydi (RAM cheklangan
 * mashina). O'lcham o'zgarsa keyin dekodlanadi.
 *
 * Mood (`NEUTRAL / HAPPY / SAD / CHEER`) — vebdagi halqa ranglari bilan bir
 * xil: rangli ring + yengil soya. Rasm o'zi bitta (vebda ham shunday).
 */
class MascotView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
) : View(context, attrs, defStyleAttr) {

    enum class Mood { NEUTRAL, HAPPY, SAD, CHEER }

    private var mood = Mood.NEUTRAL
    private var avatar = true

    private val ringPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val imgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        isFilterBitmap = true
        isDither = true
    }

    /** Dekodlangan bitmap va u qaysi px chegarasi bilan olingani. */
    private var bmp: Bitmap? = null
    private var bmpForMaxPx: Int = -1

    init {
        // `setMood` birinchi chaqiruvda NEUTRAL bo'lsa darrov qaytadi —
        // shuning uchun matn shu yerda ham beriladi (yoksa qahramon
        // ekran o'quvchisi ko'ziga ko'rinmas).
        applyDescription()
    }

    fun setMood(m: Mood) {
        if (mood == m) return
        mood = m
        applyDescription()
        invalidate()
    }

    fun getMood(): Mood = mood

    /**
     * Qahramon — bezak EMAS, holatni bildiradi (halqa rangi + kayfiyat),
     * shuning uchun ekran o'quvchisi (TalkBack) uchun matn beriladi.
     *
     * Sabab (o'lchangan): dialoglardagi `MascotView` `MascotDialog.header`da
     * kod orqali yaratiladi va `contentDescription` berilmagani uchun
     * `uiautomator` dumpida umumin ko'rinmasdi — qahramon "bor"ligini
     * text asosida tekshirib bo'lmardi.
     */
    private fun applyDescription() {
        contentDescription = context.getString(R.string.mascot_alt) +
            " — " +
            context.getString(
                when (mood) {
                    Mood.HAPPY -> R.string.mascot_mood_happy
                    Mood.SAD -> R.string.mascot_mood_sad
                    Mood.CHEER -> R.string.mascot_mood_cheer
                    Mood.NEUTRAL -> R.string.mascot_mood_neutral
                },
            )
    }

    /** true — doira avatar (ro'yxat/sarlavha), false — to'liq bo'yli rasm. */
    fun setAvatarMode(useAvatar: Boolean) {
        if (avatar == useAvatar) return
        avatar = useAvatar
        bmp = null
        bmpForMaxPx = -1
        invalidate()
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val wanted = resources.getDimensionPixelSize(R.dimen.mascot_md)
        val w = resolveSize(wanted, widthMeasureSpec)
        val h = resolveSize(wanted, heightMeasureSpec)
        setMeasuredDimension(w, h)
    }

    /** Bitmapni kerakli chegaragacha kichraytirib dekodlash (RAM cheklovi). */
    private fun loadBitmap(maxPx: Int): Bitmap? {
        if (bmp != null && bmpForMaxPx >= maxPx) return bmp
        val res = if (avatar) R.drawable.mascot_avatar else R.drawable.mascot
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeResource(resources, res, bounds)
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
        var sample = 1
        while (bounds.outWidth / (sample * 2) >= maxPx || bounds.outHeight / (sample * 2) >= maxPx) sample *= 2
        val opts = BitmapFactory.Options().apply {
            inSampleSize = sample
            inPreferredConfig = Bitmap.Config.ARGB_8888
        }
        val made = try {
            BitmapFactory.decodeResource(resources, res, opts)
        } catch (err: OutOfMemoryError) {
            null
        }
        bmp?.takeIf { it !== made && !it.isRecycled }?.recycle()
        bmp = made
        bmpForMaxPx = maxPx
        return made
    }

    override fun onDraw(canvas: Canvas) {
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0f || h <= 0f) return
        val side = Math.min(w, h)
        val cx = w / 2f
        val cy = h / 2f
        val radius = side / 2f

        // Fon — vebdagi `bg-gradient-to-b from-indigo-50 to-indigo-100`.
        bgPaint.color = if (isNightMode()) 0xFF1E293B.toInt() else 0xFFEEF2FF.toInt()
        val bg = RectF(cx - radius, cy - radius, cx + radius, cy + radius)
        canvas.drawRoundRect(bg, side * 0.22f, side * 0.22f, bgPaint)

        // Mood halqasi — rang orqali (veb: ring-emerald / ring-amber / ring-sky).
        ringPaint.color = moodColor()
        ringPaint.strokeWidth = (side * 0.045f).coerceAtLeast(2f)
        val inset = ringPaint.strokeWidth
        canvas.drawRoundRect(
            RectF(bg.left + inset / 2, bg.top + inset / 2, bg.right - inset / 2, bg.bottom - inset / 2),
            side * 0.22f, side * 0.22f, ringPaint,
        )

        val b = loadBitmap(side.toInt().coerceAtLeast(24)) ?: run {
            // Rasm yo'q bo'lsa ham qahramon "bor" ko'rinadi: ko'z/og'iz belgisi.
            drawFallbackFace(canvas, cx, cy, side)
            return
        }
        // centerInside — proporsional, hech narsa kesilmaydi.
        val src = Rect(0, 0, b.width, b.height)
        val scale = Math.min((side - inset * 2) / b.width, (side - inset * 2) / b.height)
        val dw = b.width * scale
        val dh = b.height * scale
        val dst = RectF(cx - dw / 2, cy - dh / 2, cx + dw / 2, cy + dh / 2)
        canvas.drawBitmap(b, src, dst, imgPaint)

        if (mood == Mood.CHEER) drawSparkles(canvas, cx, cy, side)
    }

    private fun isNightMode(): Boolean =
        (resources.configuration.uiMode and android.content.res.Configuration.UI_MODE_NIGHT_MASK) ==
            android.content.res.Configuration.UI_MODE_NIGHT_YES

    private fun moodColor(): Int = when (mood) {
        Mood.HAPPY, Mood.CHEER -> 0xFF34D399.toInt() // emerald
        Mood.SAD -> 0xFFF59E0B.toInt() // amber — "qo'llab-quvvatlash"
        Mood.NEUTRAL -> 0xFF60A5FA.toInt() // indigo/sky
    }

    /** Bitmap o'rniga oddiy yuz — hech qachon "bo'sh kvadrat" bo'lmasligi uchun. */
    private fun drawFallbackFace(canvas: Canvas, cx: Float, cy: Float, side: Float) {
        val p = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFF1D4ED8.toInt() }
        val r = side * 0.06f
        canvas.drawCircle(cx - side * 0.16f, cy - side * 0.08f, r, p)
        canvas.drawCircle(cx + side * 0.16f, cy - side * 0.08f, r, p)
        val smile = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = side * 0.04f
            color = if (mood == Mood.SAD) 0xFFDC2626.toInt() else 0xFF1D4ED8.toInt()
        }
        val arc = RectF(cx - side * 0.22f, cy - side * 0.05f, cx + side * 0.22f, cy + side * 0.28f)
        // Kulgi — pastki yoy (20°..160°), g'amgin — yuqori yoy (200°..340°).
        val start = if (mood == Mood.SAD) 200f else 20f
        canvas.drawArc(arc, start, 140f, false, smile)
    }

    private fun drawSparkles(canvas: Canvas, cx: Float, cy: Float, side: Float) {
        val p = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFFBBF24.toInt() }
        val r = side * 0.04f
        canvas.drawCircle(cx + side * 0.40f, cy - side * 0.38f, r, p)
        canvas.drawCircle(cx - side * 0.42f, cy + side * 0.40f, r * 0.8f, p)
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        // Xotira tejalishi: view o'chsa bitmap bo'shatiladi (kichik, qayta
        // dekodlash arzon — `inSampleSize` bilan).
        bmp?.takeIf { !it.isRecycled }?.recycle()
        bmp = null
        bmpForMaxPx = -1
    }

    companion object {
        fun moodFromCorrect(correct: Boolean, partial: Double = if (correct) 1.0 else 0.0): Mood = when {
            correct && partial >= 0.999 -> Mood.CHEER
            correct -> Mood.HAPPY
            partial > 0.0 -> Mood.NEUTRAL
            else -> Mood.SAD
        }

        val COLOR_NEUTRAL = Color.parseColor("#60A5FA")
    }
}
