package com.dadaxon.aienglishacademy.ui

import android.content.Context
import android.view.Gravity
import android.view.View
import android.widget.LinearLayout
import com.dadaxon.aienglishacademy.R

/**
 * Dialoglarga qahramon qo'shish (3-vazifa: qahramon HAR ekranda va HAR
 * muloqotda — suhbat oynasi, tasdiqlash, tanlov).
 *
 * Material `AlertDialog`da maxsus sarlavha o'rni cheklangan, shuning uchun
 * qahramon `setView` bilan matnning USTIGA qo'yiladi: markazda, `mascot_sm`
 * (40 dp) — muloqot kichkina, rasm uni bosib yubormasin.
 *
 * `MascotView` proporsional (`centerInside`) — qanday o'lcham berilsa ham
 * rasm buzilmaydi va kesilmaydi.
 */
object MascotDialog {

    /** Muloqot tepasidagi qator: qahramon + (ixtiyoriy) yonida izoh. */
    fun header(ctx: Context, mood: MascotView.Mood): View {
        val row = LinearLayout(ctx).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            val pad = ctx.resources.getDimensionPixelSize(R.dimen.screen_pad)
            setPadding(pad, pad, pad, 0)
        }
        val m = MascotView(ctx).apply {
            setAvatarMode(true)
            setMood(mood)
            val side = ctx.resources.getDimensionPixelSize(R.dimen.mascot_sm)
            layoutParams = LinearLayout.LayoutParams(side, side)
        }
        row.addView(m)
        return row
    }
}
