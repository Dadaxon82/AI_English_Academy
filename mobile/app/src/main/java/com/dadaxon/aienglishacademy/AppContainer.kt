package com.dadaxon.aienglishacademy

import android.content.Context
import com.dadaxon.aienglishacademy.data.AuthStore
import com.dadaxon.aienglishacademy.data.ContentRepository
import com.dadaxon.aienglishacademy.data.LocalStore
import com.dadaxon.aienglishacademy.data.SharedPrefsStore
import com.dadaxon.aienglishacademy.data.SupabaseClient
import com.dadaxon.aienglishacademy.data.SupabaseConfig
import com.dadaxon.aienglishacademy.net.NetworkMonitor
import com.dadaxon.aienglishacademy.store.AppStore
import com.dadaxon.aienglishacademy.sync.SyncEngine
import com.dadaxon.aienglishacademy.sync.SyncProtocol

/**
 * Ilovaning butun hayotiy sikli bo'ylashadigan BITA konteyneri (DI'ning eng
 * sodda ko'rinishi — Hilt/Dagger offline kechada yo'q).
 *
 * Hamma narsa `lazy`: kontent va tarmoq faqat birinchi murojaatda ochiladi
 * (sovuq start tez bo'lsin — JSON asset'lari ~300 KB).
 */
class AppContainer(ctx: Context) {

    private val appCtx: Context = ctx.applicationContext

    /** Kalit→qiymat saqlagichi (SharedPreferences). */
    val keyValue: com.dadaxon.aienglishacademy.data.KeyValueStore by lazy { SharedPrefsStore(appCtx) }

    /** Supabase sozlanmagan bo'lsa `null` — ilova mehmon rejimida ishlaydi. */
    val supabase: SupabaseClient? by lazy {
        val cfg = SupabaseConfig.fromBuildConfig()
        if (cfg == null) null else SupabaseClient(cfg)
    }

    val auth: AuthStore by lazy { AuthStore(keyValue, supabase) }

    val local: LocalStore by lazy { LocalStore(keyValue) }

    /** AI suhbatdosh (4-bosqich) — `ai-roleplay` edge funksiyasi. */
    val roleplay: com.dadaxon.aienglishacademy.data.RoleplayClient by lazy {
        com.dadaxon.aienglishacademy.data.RoleplayClient(SupabaseConfig.fromBuildConfig(), auth)
    }

    /** Hamjamiyat tekshiruvi (3-bosqich) — Supabase + sessiya. */
    val peer: com.dadaxon.aienglishacademy.data.PeerRepository by lazy {
        com.dadaxon.aienglishacademy.data.PeerRepository(supabase, auth)
    }

    val network: NetworkMonitor by lazy { NetworkMonitor(appCtx) }

    val protocol: SyncProtocol by lazy { SyncProtocol(local) }

    /** Veb'dan eksport qilingan kontent (`assets/content/…`). */
    val content: ContentRepository by lazy {
        ContentRepository().init(appCtx.assets)
    }

    val sync: SyncEngine by lazy {
        SyncEngine(
            client = supabase,
            auth = auth,
            local = local,
            protocol = protocol,
            network = network,
            // `learning_plays.day_id` tekshiruvi uchun kun id'lari tartibi.
            dayIds = { level ->
                runCatching { content.bundle(level).days.map { it.id } }.getOrElse { emptyList() }
            },
        )
    }

    /** UI qatlami yagona manbasidan foydalanadigan store. */
    val store: AppStore by lazy {
        AppStore(appCtx, this)
    }

    /** Foydalanuvchi id'si (sessiya bo'lmasa barqaror mahalliy id). */
    fun userId(): String = auth.userId()

    /** Ilova versiyasi (Settings'da ko'rsatiladi). */
    fun versionName(): String =
        runCatching {
            appCtx.packageManager.getPackageInfo(appCtx.packageName, 0).versionName ?: "?"
        }.getOrElse { "?" }
}
