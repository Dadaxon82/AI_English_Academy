package com.dadaxon.aienglishacademy.ui

import android.content.Context
import com.dadaxon.aienglishacademy.domain.UsageStats
import com.dadaxon.aienglishacademy.domain.bumpUsage
import com.dadaxon.aienglishacademy.domain.parseUsage
import com.dadaxon.aienglishacademy.domain.usageToJson

/**
 * Foydalanish hisoblagichi — FAQAT shu qurilmada (SharedPreferences,
 * hisobga sinxronlanmaydi, hech qayerga yuborilmaydi). Veb `trackUsage`.
 */
object UsageTracker {
    private const val PREFS = "aea-device"
    private const val KEY = "aea-usage-v1"

    fun stats(ctx: Context): Map<String, UsageStats> =
        parseUsage(ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null))

    fun track(ctx: Context, id: String, started: Boolean, now: Long = System.currentTimeMillis()) {
        val next = bumpUsage(stats(ctx), id, started, now)
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, usageToJson(next)).apply()
    }

    fun clear(ctx: Context) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY).apply()
    }
}
