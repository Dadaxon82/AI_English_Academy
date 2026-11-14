package com.dadaxon.aienglishacademy.ui

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.view.View
import com.dadaxon.aienglishacademy.R

/**
 * Bugungi reja halqasi — veb Dashboard'dagi doira progress (`planProgress`)
 * ning mobil moslamasi: markazda bajarilgan/reja daqiqa.
 */
class ProgressRingView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
) : View(context, attrs, defStyleAttr) {

    private var doneSec = 0
    private var plannedSec = 90 * 60
    private var captionSec = 0

    private val track = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
    }
    private val arc = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
    }
    private val bigText = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        textAlign = Paint.Align.CENTER
        isFakeBoldText = true
    }
    private val smallText = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        textAlign = Paint.Align.CENTER
    }

    fun setProgress(doneSeconds: Int, plannedSeconds: Int) {
        val d = doneSeconds.coerceAtLeast(0)
        val p = plannedSeconds.coerceAtLeast(1)
        if (d == doneSec && p == plannedSec) return
        doneSec = d
        plannedSec = p
        captionSec = d
        invalidate()
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val wanted = resources.getDimensionPixelSize(R.dimen.ring_size)
        val w = resolveSize(wanted, widthMeasureSpec)
        setMeasuredDimension(w, resolveSize(w, heightMeasureSpec))
    }

    override fun onDraw(canvas: Canvas) {
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0f || h <= 0f) return
        val stroke = resources.getDimension(R.dimen.ring_stroke)
        arc.strokeWidth = stroke
        track.strokeWidth = stroke
        val night = (resources.configuration.uiMode and android.content.res.Configuration.UI_MODE_NIGHT_MASK) ==
            android.content.res.Configuration.UI_MODE_NIGHT_YES
        track.color = if (night) 0xFF334155.toInt() else 0xFFE2E8F0.toInt()
        val frac = (doneSec.toFloat() / plannedSec.toFloat()).coerceIn(0f, 1f)
        arc.color = when {
            frac >= 1f -> 0xFF059669.toInt()
            frac > 0f -> 0xFF1D4ED8.toInt()
            else -> if (night) 0xFF475569.toInt() else 0xFFCBD5E1.toInt()
        }

        val side = Math.min(w, h)
        val inset = stroke / 2 + 2f
        val box = RectF(w / 2 - side / 2 + inset, h / 2 - side / 2 + inset, w / 2 + side / 2 - inset, h / 2 + side / 2 - inset)
        canvas.drawArc(box, 0f, 360f, false, track)
        if (frac > 0f) canvas.drawArc(box, -90f, 360f * frac, false, arc)

        val minsDone = captionSec / 60
        val minsPlan = plannedSec / 60
        bigText.textSize = side * 0.20f
        bigText.color = if (night) 0xFFF1F5F9.toInt() else 0xFF0F172A.toInt()
        smallText.textSize = side * 0.095f
        smallText.color = if (night) 0xFF94A3B8.toInt() else 0xFF475569.toInt()
        canvas.drawText("$minsDone / $minsPlan", w / 2, h / 2 + side * 0.02f, bigText)
        canvas.drawText(context.getString(R.string.dash_task_minutes_of), w / 2, h / 2 + side * 0.15f, smallText)
    }
}
