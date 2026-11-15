package com.dadaxon.aienglishacademy.data

import com.dadaxon.aienglishacademy.domain.RoleplayTurn
import com.dadaxon.aienglishacademy.domain.parseRoleplayTurn
import com.google.gson.JsonObject
import com.google.gson.JsonParser

/**
 * `ai-roleplay` edge funksiyasini chaqirish (veb `src/lib/roleplay.ts::
 * requestRoleplayTurn`). BLOKLOVCHI — ekran `Dispatchers.IO`da chaqiradi.
 * Kalit faqat serverda; mijoz faqat foydalanuvchi JWT'ini yuboradi.
 * Xato bo'lsa server bergan o'zbekcha sabab (yoki holat kodi) qaytadi —
 * ekran oldindan yozilgan stsenariyga o'tishni taklif qiladi.
 */
class RoleplayClient(
    private val config: SupabaseConfig?,
    private val auth: AuthStore,
    private val transport: HttpTransport = UrlConnectionTransport(),
) {
    sealed class Result {
        data class Ok(val turn: RoleplayTurn) : Result()
        data class Fail(val reasonUz: String) : Result()
    }

    fun request(body: JsonObject): Result {
        val cfg = config ?: return Result.Fail("Server (Supabase) ulanmagan.")
        if (auth.isGuest()) return Result.Fail("AI suhbatdoş uçun hisobga kiring.")
        val (s, err) = auth.ensureFresh()
        if (s == null) return Result.Fail(err ?: "Sessiya muddati tugadi — qaytadan kiring.")
        val url = "${cfg.url.trimEnd('/')}/functions/v1/ai-roleplay"
        val resp = transport.request(
            "POST",
            url,
            mapOf(
                "Content-Type" to "application/json",
                "Authorization" to "Bearer ${s.accessToken}",
                "apikey" to cfg.anonKey,
            ),
            body.toString(),
        )
        if (resp.error != null) return Result.Fail("AI xizmatiga ulanib bölmadi.")
        val json = runCatching { JsonParser.parseString(resp.body).asJsonObject }.getOrNull()
        if (!resp.ok) {
            val why = json?.get("reasonUz")?.takeIf { it.isJsonPrimitive }?.asString
            return Result.Fail(why ?: "AI xizmati javob bermadi (${resp.status}).")
        }
        val turn = parseRoleplayTurn(json?.get("turn")) ?: return Result.Fail("AI javobi sxemaga mos emas.")
        return Result.Ok(turn)
    }
}
