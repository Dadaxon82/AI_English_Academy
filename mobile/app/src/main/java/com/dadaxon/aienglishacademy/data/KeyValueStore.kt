package com.dadaxon.aienglishacademy.data

import android.content.Context
import android.content.SharedPreferences

/**
 * Kalit→qiymat saqlash abstraksiyasi.
 *
 * Veb manbasida (`src/lib/storage.ts`) bu IndexedDB/localStorage. Android'da
 * `SharedPreferences` — lekin sinovda real preferencelar kerak emas: sun'iy
 * `MemoryStore` ishlatiladi, shuning uchun mantiq (deduplikat, migratsiya,
 * kalitlar) JVM unit testda tekshiriladi.
 */
interface KeyValueStore {
    fun get(key: String): String?
    fun put(key: String, value: String)
    fun remove(key: String)
    /** Berilgan prefiks bilan qoid kalitlar (logout tozalashi uchun). */
    fun keysWithPrefix(prefix: String): List<String>
}

class SharedPrefsStore(context: Context, name: String = "aea") : KeyValueStore {
    private val sp: SharedPreferences = context.applicationContext.getSharedPreferences(name, Context.MODE_PRIVATE)

    override fun get(key: String): String? = sp.getString(key, null)

    override fun put(key: String, value: String) {
        sp.edit().putString(key, value).apply()
    }

    override fun remove(key: String) {
        sp.edit().remove(key).apply()
    }

    override fun keysWithPrefix(prefix: String): List<String> =
        sp.all.keys.filter { it.startsWith(prefix) }
}

/** Test/laboratoriya uchun xotiradagi versiyasi. */
class MemoryStore : KeyValueStore {
    private val map = LinkedHashMap<String, String>()
    override fun get(key: String): String? = map[key]
    override fun put(key: String, value: String) {
        map[key] = value
    }

    override fun remove(key: String) {
        map.remove(key)
    }

    override fun keysWithPrefix(prefix: String): List<String> = map.keys.filter { it.startsWith(prefix) }
    fun size(): Int = map.size
}
