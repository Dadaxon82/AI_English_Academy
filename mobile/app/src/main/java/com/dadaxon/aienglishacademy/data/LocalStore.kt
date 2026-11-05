package com.dadaxon.aienglishacademy.data

import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.google.gson.reflect.TypeToken

/**
 * Qurilmadagi saqlash — veb `src/lib/storage.ts` ning mobil nusxasi.
 *
 * Kalitlar so'zma-so'z bir xil (`aea:…:<uid>`), chunki ularning ma'nosi
 * foydalanuvchi bo'yicha ajratilgan (boshqa foydalanuvchining ma'lumoti
 * aralashmasin — xavfsizlik talabi).
 */
data class QueueItem(
    val id: String,
    val table: String,
    /** "upsert" | "delete" */
    val op: String,
    /** JSON matni (Gson uchun String — payload strukturasini bu qatlam buzmaydi). */
    val payload: String,
    val at: Long,
    val tries: Int,
)

object StoreKeys {
    const val PREFIX = "aea:"
    fun data(uid: String) = "aea:data:$uid"
    fun queue(uid: String) = "aea:queue:$uid"
    fun cache(uid: String) = "aea:cache:$uid"
    fun timer(uid: String) = "aea:timer:$uid"
    /** Serverga yozilgan yozuvlar izi (jadval|kalit → payload xeshi). */
    fun synced(uid: String) = "aea:synced:$uid"
    fun auth(uid: String) = "aea:auth:$uid"
}

class LocalStore(
    private val store: KeyValueStore,
    private val gson: Gson = GsonBuilder().disableHtmlEscaping().create(),
) {

    /* ------------------------------ AppData ------------------------------ */

    fun loadData(uid: String): AppData {
        val raw = store.get(StoreKeys.data(uid)) ?: return AppData.empty(uid)
        val merged = try {
            val el = JsonParser.parseString(raw)
            if (!el.isJsonObject) return AppData.empty(uid)
            val obj = el.asJsonObject
            // `userId` mos kelmasa — bo'sh holat (veb: aralashmaslik kafolati).
            val uidEl = obj.get("userId")
            if (uidEl != null && uidEl.isJsonPrimitive && uidEl.asString != uid) return AppData.empty(uid)
            mergeWithDefaults(JsonParser.parseString(gson.toJson(AppData.empty(uid))).asJsonObject, obj)
        } catch (err: Exception) {
            return AppData.empty(uid)
        }
        val parsed = try {
            gson.fromJson(merged, AppData::class.java)
        } catch (err: Exception) {
            return AppData.empty(uid)
        } ?: return AppData.empty(uid)
        return migrate(parsed).copy(userId = uid)
    }

    fun saveData(uid: String, data: AppData) {
        val withStamp = data.copy(userId = uid, updatedAt = System.currentTimeMillis())
        try {
            store.put(StoreKeys.data(uid), gson.toJson(withStamp))
        } catch (err: Exception) {
            // Katta hajmда ham ishlashda davom etsin — vebdagidek jimgina.
        }
    }

    /**
     * Eski saqlanganma bilan yangi maydonlarni birlashtirish: avval DEFAULT
     * JSON, keyin saqlangan qiymatlar (chuqurlashtirilgan). Gson Kotlin default
     * qiymatlarini chaqirmaydi — shuning uchun yo'q maydon `null` bo'lib
     * qolmasligi uchun bu merge SHART. (veb: `{...base, ...raw}`.)
     */
    private fun mergeWithDefaults(defaults: JsonObject, stored: JsonObject): JsonObject {
        val out = defaults.deepCopy()
        for ((k, v) in stored.entrySet()) {
            val cur = out.get(k)
            out.add(k, if (cur != null && cur.isJsonObject && v.isJsonObject) mergeWithDefaults(cur.asJsonObject, v.asJsonObject) else v)
        }
        return out
    }

    /** Veb `storage.ts::migrate` — versiya migratsiyasi. */
    fun migrate(raw: AppData): AppData {
        var next = raw
        // Eski onboarding 15–25 daqiqaga ruxsat berardi — DB CHECK (30..240)
        // bunday sozlamani rad etib, sinxron navbatini abadiy to'xtatib qo'yardi.
        next = next.copy(settings = next.settings.copy(dailyMinutes = clampDailyMinutes(next.settings.dailyMinutes)))
        // `onboardedAt` keyin qo'shilgan: diagnostikasi yoki mashq tarixi bor
        // eski foydalanuvchi onboarding'dan o'tgan hisoblanadi (banner qayta chiqmasin).
        // Iz BO'Lmasa `null` QOLADI (veb: `... ?? null`). `0L` qo'yish
        // `isPristine` ni abadiy `false` qilardi — yangi qurilma server
        // sozlamalarini (va joriy kunni) hech qachon olmas edi.
        if (next.onboardedAt == null) {
            val stamp = next.diagnostic?.at ?: next.attempts.minOfOrNull { it.at }
            if (stamp != null) next = next.copy(onboardedAt = stamp)
        }
        // Eski SRS kalitini (`<matn>|gl-<so'z>`) yangisiga (`gl-<so'z>`) aylantiradi.
        // Ikkala eski yozuv bitta kalitga to'qlansa — eng keingi (kattaroq dueAt)
        // saqlanadi: foydalanuvchi oxirgi qilgan bahosi muhimroq.
        val migrated = LinkedHashMap<String, SrsState>()
        for ((id, st) in next.srs) {
            if (!migrated.containsKey(id)) migrated[id] = st
        }
        var changed = false
        for ((id, st) in next.srs) {
            val m = LEGACY_GLOSSARY.matchEntire(id) ?: continue
            val nid = "gl-${m.groupValues[2]}"
            changed = true
            val prev = migrated[nid]
            migrated[nid] = if (prev != null && prev.dueAt >= st.dueAt) prev else st
            if (!migrated.containsKey(id) || prev != null) migrated.remove(id)
        }
        if (changed) next = next.copy(srs = migrated)
        return next.copy(version = AppData.APP_DATA_VERSION)
    }

    /* ------------------------------ navbat ------------------------------ */

    fun loadQueue(uid: String): List<QueueItem> {
        val raw = store.get(StoreKeys.queue(uid)) ?: return emptyList()
        return try {
            val list = gson.fromJson(raw, ArrayDequeToken.type) as? Collection<QueueItem> ?: emptyList()
            list.filter { it != null && it.table.isNotBlank() && it.payload.isNotBlank() }
        } catch (err: Exception) {
            emptyList()
        }
    }

    fun updateQueue(uid: String, q: List<QueueItem>) {
        store.put(StoreKeys.queue(uid), gson.toJson(q))
    }

    fun queueSize(uid: String): Int = loadQueue(uid).size

    /**
     * Navbat elementini takrorlanmasdan birlashtrirish uchun barqaror
     * identifikator (veb `storage.ts::dedupeKey`). `payload.id` bo'lmagan
     * jadvallar (user_settings / user_vocabulary / daily_activity) uchun tabiiy
     * kalit ishlatiladi — aks holda "Sinxronizatsiya" tugmasi har bosilganda
     * butun navbat shishib borardi.
     */
    fun dedupeKey(table: String, payloadJson: String): String? {
        val obj = try {
            JsonParser.parseString(payloadJson).takeIf { it.isJsonObject }?.asJsonObject
        } catch (err: Exception) {
            null
        } ?: return null
        val id = strOf(obj, "id")
        if (id != null) return "id:$id"
        if (table == SupabaseClient.Tables.USER_SETTINGS) return "uk:user"
        if (table == SupabaseClient.Tables.USER_VOCABULARY) {
            val v = strOf(obj, "vocabulary_id") ?: return null
            return "uk:v:$v"
        }
        if (table == SupabaseClient.Tables.DAILY_ACTIVITY) {
            val d = strOf(obj, "day") ?: return null
            return "uk:d:$d"
        }
        return null
    }

    /**
     * Ko'p yozuvni BITTA o'qish/yozish bilan navbatga qo'shish (veb
     * `enqueueMany`): kalit takrorlansa eskisi olib tashlanib, yangisi oxirga
     * qo'yiladi (last-write-wins).
     */
    fun enqueueMany(uid: String, items: List<QueueItem>): List<QueueItem> {
        val q = loadQueue(uid)
        if (items.isEmpty()) return q
        fun keyOf(x: QueueItem): String? {
            val k = dedupeKey(x.table, x.payload)
            return k?.let { "${x.table}|${x.op}|$it" }
        }
        // Veb `storage.ts::enqueueMany` bilan bir xil: partiya ICHIDA kalit
        // takrorlansa birinchi o'rinda last-write-wins, navbatdagi eski yozuv
        // esa OLIB TASHLANADI — yangisi oxirga qo'shiladi (`next = kept + fresh`).
        val fresh = ArrayList<QueueItem>()
        val pos = HashMap<String, Int>()
        for (it in items) {
            val k = keyOf(it)
            val at = k?.let { pos[it] }
            if (at != null) {
                fresh[at] = it
            } else {
                if (k != null) pos[k] = fresh.size
                fresh.add(it)
            }
        }
        val kept = q.filter { x -> keyOf(x)?.let { !pos.containsKey(it) } ?: true }
        val next = kept + fresh
        updateQueue(uid, next)
        return next
    }

    /* ------------------------ yuborilganlar izi ------------------------- */

    fun loadSynced(uid: String): MutableMap<String, String> {
        val raw = store.get(StoreKeys.synced(uid)) ?: return mutableMapOf()
        return try {
            val t = object : TypeToken<Map<String, String>>() {}.type
            (gson.fromJson(raw, t) as? Map<String, String>)?.toMutableMap() ?: mutableMapOf()
        } catch (err: Exception) {
            mutableMapOf()
        }
    }

    fun saveSynced(uid: String, map: Map<String, String>) {
        store.put(StoreKeys.synced(uid), gson.toJson(map))
    }

    /* ------------------------- taymer holati ---------------------------- */

    fun loadTimer(uid: String): String? = store.get(StoreKeys.timer(uid))
    fun saveTimer(uid: String, json: String) = store.put(StoreKeys.timer(uid), json)

    /* ---------------------------- tozalash ------------------------------ */

    /**
     * Logout: shu foydalanuvchining SHAXSIY keshini tozalash. Boshqa
     * foydalanuvchining kalitlari tegilmaydi.
     * (Chaqqiruvchi AVVAL `SyncEngine.flush()` qilishi kerak — yuborilmagan
     * navbat yo'qoladi; veb qoidasi shu.)
     */
    fun clearUserData(uid: String) {
        for (k in store.keysWithPrefix(StoreKeys.PREFIX)) {
            if (k.endsWith(":$uid")) store.remove(k)
        }
    }

    private fun strOf(o: JsonObject, key: String): String? {
        val el = o.get(key) ?: return null
        return if (el.isJsonPrimitive) el.asString else null
    }

    private companion object {
        val LEGACY_GLOSSARY = Regex("""^(.+)\|gl-(.+)$""")
        val ArrayDequeToken = object : TypeToken<List<QueueItem>>() {}
    }
}

/** JsonArray ichidan oddiy matn olish (SyncEngine/testlar uchun yordamchi). */
fun JsonArray.strAt(i: Int): String? {
    val el = get(i)
    return if (el != null && el.isJsonPrimitive) el.asString else null
}
