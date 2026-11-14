package com.dadaxon.aienglishacademy.ui

import android.content.Context

/**
 * QURILMA sozlamalari (hisobga sinxronlanmaydi) — veb `src/lib/prefs.ts`.
 * Immersion rejimi: o'zbekcha tarjima yashirin, «Tarjimani ko'rsatish» bilan ochiladi.
 */
object DevicePrefs {
    private const val PREFS = "aea-device"
    private const val IMMERSION = "aea-immersion"

    fun immersion(ctx: Context): Boolean =
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(IMMERSION, false)

    fun setImmersion(ctx: Context, on: Boolean) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(IMMERSION, on).apply()
    }
}
