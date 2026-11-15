package com.dadaxon.aienglishacademy.data

/**
 * Auth sessiyasini saqlash — veb `supabase.ts` (`persistSession: true`) ning
 * mobil moslamasi. Sessiya bo'lmasa ilova **mehmon** rejimida ishlaydi:
 * ma'lumot faqat qurilmada, hech qanday so'rov yuborilmaydi.
 */
class AuthStore(
    private val store: KeyValueStore,
    private val client: SupabaseClient?,
) {
    private val KEY = "aea:auth:session"
    private val GUEST_KEY = "aea-guest-id"

    fun session(): Session? {
        val raw = store.get(KEY) ?: return null
        val s = try {
            com.google.gson.JsonParser.parseString(raw).asJsonObject.let {
                Session(
                    accessToken = it.get("accessToken")?.asString ?: return null,
                    refreshToken = it.get("refreshToken")?.asString ?: "",
                    expiresAt = it.get("expiresAt")?.asLong ?: 0L,
                    userId = it.get("userId")?.asString ?: return null,
                    email = it.get("email")?.takeIf { e -> !e.isJsonNull }?.asString,
                )
            }
        } catch (err: Exception) {
            null
        } ?: return null
        return s
    }

    fun save(s: Session) {
        val obj = com.google.gson.JsonObject().apply {
            addProperty("accessToken", s.accessToken)
            addProperty("refreshToken", s.refreshToken)
            addProperty("expiresAt", s.expiresAt)
            addProperty("userId", s.userId)
            if (s.email != null) addProperty("email", s.email) else add("email", com.google.gson.JsonNull.INSTANCE)
        }
        store.put(KEY, obj.toString())
    }

    fun clear() = store.remove(KEY)

    /** Sessiya muddati o'tganmi? (yarim daqiqa zaxira bilan) */
    fun isExpired(): Boolean = session()?.isExpired() ?: true

    fun isSignedIn(): Boolean = session() != null

    /**
     * Foydalanuvchi id'si. Auth bo'lmasa — barqaror MAHALLiy id (veb
     * `localGuestId()`: bir qurilmada takrorlanadi, foydalanuvchi id'si kabi
     * ishlatiladi, lekin serverga yuborilmaydi).
     */
    fun userId(): String {
        session()?.let { return it.userId }
        val existing = store.get(GUEST_KEY)
        if (existing != null) return existing
        val fresh = "local-" + java.util.UUID.randomUUID().toString().replace("-", "").take(12)
        store.put(GUEST_KEY, fresh)
        return fresh
    }

    /** Mehmon id'si (auth bo'lmasa) — UI'da "hisobsiz" holatni ko'rsatish uchun. */
    fun isGuest(): Boolean = session() == null

    /**
     * Access token muddati o'tsa — `refresh_token` bilan yangilash.
     * Muvaffaqiyatsiz bo'lsa sessiya O'CHIRILADI (halol: mehmaonga qaytish),
     * sababi qaytariladi.
     */
    fun ensureFresh(): Pair<Session?, String?> {
        val s = session() ?: return null to null
        if (!s.isExpired()) return s to null
        val c = client ?: return null to "Supabase sozlanmagan."
        if (s.refreshToken.isBlank()) {
            clear()
            return null to "Sessiya muddati tugadi — qaytadan kiring."
        }
        val r = c.refreshSession(s.refreshToken)
        val news = r.session
        if (news == null) {
            clear()
            return null to (r.errorUz ?: "Sessiya muddati tugadi — qaytadan kiring.")
        }
        save(news)
        return news to null
    }
}
