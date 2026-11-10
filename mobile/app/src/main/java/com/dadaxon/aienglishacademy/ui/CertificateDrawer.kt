package com.dadaxon.aienglishacademy.ui

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import com.dadaxon.aienglishacademy.domain.CertificateInfo

/**
 * Guvohnoma rasmi — veb `src/lib/certificateDraw.ts` bilan bir xil joylashuv
 * (1600×1130, ikki ramka, «rasmiy sertifikat emas» qizil rangda pastda).
 * Tarmoq kerak emas; uzun ism ramkaga sig'guncha kichraytiriladi.
 */
object CertificateDrawer {
    fun draw(info: CertificateInfo, name: String, dateText: String, disclaimer: String, accuracyText: String): Bitmap {
        val w = 1600
        val h = 1130
        val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        val c = Canvas(bmp)
        c.drawColor(Color.WHITE)
        val frame = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; color = Color.rgb(30, 58, 138) }
        frame.strokeWidth = 14f
        c.drawRect(40f, 40f, (w - 40).toFloat(), (h - 40).toFloat(), frame)
        frame.strokeWidth = 3f
        c.drawRect(70f, 70f, (w - 70).toFloat(), (h - 70).toFloat(), frame)

        fun text(s: String, y: Float, size: Float, bold: Boolean, color: Int) {
            val p = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                textAlign = Paint.Align.CENTER
                textSize = size
                this.color = color
                typeface = if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
            }
            while (p.textSize > 26f && p.measureText(s) > w - 260) p.textSize -= 4f
            c.drawText(s, w / 2f, y, p)
        }
        val ink = Color.rgb(15, 23, 42)
        val muted = Color.rgb(51, 65, 85)
        text("AI English Academy", 170f, 40f, true, Color.rgb(30, 58, 138))
        text("Yakunlash guvohnomasi", 280f, 72f, true, ink)
        text("Ushbu guvohnoma egasi", 370f, 34f, false, ink)
        text(name, 460f, 64f, true, ink)
        text("${info.level} darajasi o‘quv yo‘lini yakunladi", 545f, 34f, false, ink)
        text("${info.daysDone}/${info.daysTotal} kun · ${info.attempts} ta mashq · $accuracyText", 640f, 30f, false, muted)
        text("${info.wordsLearned} ta so‘z o‘zlashtirildi · «Men qila olaman»: ${info.canDoConfirmed}/${info.canDoTotal} natija bilan tasdiqlangan", 692f, 30f, false, muted)
        text("Sana: $dateText", 744f, 30f, false, muted)
        val words = disclaimer.split(" ")
        val half = (words.size + 1) / 2
        text(words.take(half).joinToString(" "), 930f, 26f, true, Color.rgb(185, 28, 28))
        text(words.drop(half).joinToString(" "), 968f, 26f, true, Color.rgb(185, 28, 28))
        return bmp
    }
}
