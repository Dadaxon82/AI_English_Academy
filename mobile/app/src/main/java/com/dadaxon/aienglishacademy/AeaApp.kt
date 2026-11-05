package com.dadaxon.aienglishacademy

import android.app.Application
import android.content.Context

/**
 * Ilovaning kirish nuqtasi — yagona [AppContainer] butun seans bo'ylab
 * saqlanadi (kontent, saqlagich, sinxron dvigateli, store).
 *
 * Konteyner `lazy`: sovuq startda ~300 KB JSON o'qilmaydi, birinchi murojaatda
 * ochiladi. Xato bo'lsa ilova qulab tushmaydi — sabab logga yoziladi va
 * ekran "kontent o'qilmadi" holatini halol ko'rsatadi.
 */
class AeaApp : Application() {

    private var holder: AppContainer? = null

    /** Konteyner (birinchi murojaatda tuziladi). */
    fun container(): AppContainer {
        holder?.let { return it }
        val made = runCatching { AppContainer(this) }
            .getOrElse {
                android.util.Log.e(TAG, "AppContainer tuzilmadi: ${it.message}", it)
                // Xato qaytsa ham ilova ishlashi uchun yana bir marta urinamiz:
                // `lazy` maydonlar ochilganda xato bo'lsa, UI buni alohida
                // ushlaydi (ContentRepository / SyncEngine halol null qaytaradi).
                AppContainer(this)
            }
        holder = made
        return made
    }

    /**
     * Xatoni LOGGA yozamiz, lekin JIM CIMDIKLMAYMIZ: avvalgi standart
     * handler ham chaqiriladi.
     *
     * Sabab (dalil — emulator ANR jurnali): handler xatoni faqat log qilib
     * qaytarganda `main` o'qimi tugaydi, jarayon esa tirik qoladi — ekran
     * qotadi va tizim "is javob bermayapti" (ANR) deb yozadi. Foydalanuvchi
     * "Kutish"ni bosganda ham o'limagan ekranni ko'radi.
     */
    override fun onCreate() {
        super.onCreate()
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { t, e ->
            android.util.Log.e(TAG, "Tugallanmagan xato (${t.name}): ${e.message}", e)
            // Ma'lumot yo'qolmasin — xatoda ham so'nggi holat diskka yoziladi.
            runCatching { holder?.store?.flushSave() }
            previous?.uncaughtException(t, e)
        }
    }

    override fun attachBaseContext(base: Context) {
        super.attachBaseContext(base)
    }

    companion object {
        private const val TAG = "AeaApp"
    }
}
