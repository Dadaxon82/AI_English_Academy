package com.dadaxon.aienglishacademy

import android.os.Bundle
import android.view.View
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.navigation.NavController
import androidx.navigation.fragment.NavHostFragment
import com.dadaxon.aienglishacademy.data.THEME_DARK
import com.dadaxon.aienglishacademy.data.THEME_LIGHT
import com.dadaxon.aienglishacademy.data.THEME_SYSTEM
import com.dadaxon.aienglishacademy.store.StoreState
import com.dadaxon.aienglishacademy.store.SyncStatus
import com.dadaxon.aienglishacademy.ui.MascotView
import kotlinx.coroutines.launch

/**
 * Yagona faoliyat: yuqori panel + navigatsiya. Barcha ma'lumot `AppStore`
 * orqali keladi — faoliyat hech qanday mantiq o'zi saqlamaydi.
 *
 * Mavzu (yorug'/tungi/tizim) sozlamadan olinadi va `setTheme` EMAS,
 * `AppCompatDelegate` orqali qo'llaniladi — chunki Material3 DayNight
 * tungi ranglar `values-night` dan shu yo'l bilan keladi.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var navController: NavController
    private var exitAt: Long = 0L

    /** "Ikki marta bosib chiqish" callback'i — faqat asosiy ekranlarda yoqiladi. */
    private var exitCallback: OnBackPressedCallback? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        // Mavzu kontent yuklanishidan OLDIN qo'yiladi — aks holda bir kadrdan
        // tungi rejim yorug' ko'rinar edi.
        applyTheme(runCatching { container().store.settings().theme }.getOrNull() ?: THEME_SYSTEM)
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val host = supportFragmentManager.findFragmentById(R.id.navHost) as NavHostFragment
        navController = host.navController
        setSupportActionBar(findViewById(R.id.toolbar))
        supportActionBar?.setDisplayShowTitleEnabled(true)

        val bottom = findViewById<com.google.android.material.bottomnavigation.BottomNavigationView>(R.id.bottomNav)
        bottom.setOnItemSelectedListener { item ->
            if (item.itemId == navController.currentDestination?.id) return@setOnItemSelectedListener true
            navController.navigate(item.itemId)
            true
        }
        // Panel faqat 5 ta asosiy ekranda ko'rinadi — mashq/matn ekranlarida
        // butun balandlik o'quv materialiga beriladi.
        // Asosiy ekranlar — panel ko'rinadi va orqaga-qaytish o'rniga "chiqish"
        // qoidasi ishlaydi (pastdagi `installBackHandling` bilan bir xil ro'yxat).
        navController.addOnDestinationChangedListener { _, dest, _ ->
            bottom.visibility = if (TOP_LEVEL.contains(dest.id)) View.VISIBLE else View.GONE
            // Batafsil ekranda orqaga tugmasi — panel yonida.
            supportActionBar?.setDisplayHomeAsUpEnabled(!TOP_LEVEL.contains(dest.id) &&
                dest.id != R.id.authFragment && dest.id != R.id.onboardingFragment)
            syncPillVisible(TOP_LEVEL.contains(dest.id) || dest.id == R.id.dashboardFragment)
            // Auth/onboarding'da orqaga qaytish YO'Q (skipping auth xavfi) —
            // shu sababli u yerda ham bizning "chiqish" qoidamiz ishlaydi.
            setBackMode(
                TOP_LEVEL.contains(dest.id) ||
                    dest.id == R.id.authFragment ||
                    dest.id == R.id.onboardingFragment,
            )
        }
        installBackHandling()
        findViewById<View>(R.id.syncPill).setOnClickListener {
            val stats = container().store.syncNow()
            toastSync(stats)
        }

        val store = container().store
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                store.state.collect { render(it) }
            }
        }
    }

    /** Yuqori panel: sinxron holati + qahramon (har ekranda — 3-vazifa talabi). */
    private fun render(state: StoreState) {
        val text = when (state.syncStatus) {
            SyncStatus.IDLE -> getString(R.string.sync_idle)
            SyncStatus.SYNCING -> getString(R.string.sync_busy)
            SyncStatus.OFFLINE -> getString(R.string.sync_offline)
            SyncStatus.ERROR -> state.lastSyncMessage ?: getString(R.string.sync_error)
            SyncStatus.GUEST -> getString(R.string.sync_guest)
        }
        findViewById<android.widget.TextView>(R.id.syncText).text = text
        findViewById<MascotView>(R.id.toolbarMascot).setMood(
            when (state.syncStatus) {
                SyncStatus.ERROR, SyncStatus.OFFLINE -> MascotView.Mood.SAD
                SyncStatus.SYNCING -> MascotView.Mood.NEUTRAL
                else -> MascotView.Mood.HAPPY
            },
        )
    }

    private fun syncPillVisible(show: Boolean) {
        findViewById<View>(R.id.syncPill).visibility = if (show) View.VISIBLE else View.GONE
    }

    fun toastSync(stats: com.dadaxon.aienglishacademy.sync.SyncStats) {
        val msg = stats.reasonUz ?: if (stats.ok) {
            getString(R.string.sync_result_ok, stats.done, stats.failed + stats.rejected)
        } else {
            getString(R.string.sync_error)
        }
        android.widget.Toast.makeText(this, msg, android.widget.Toast.LENGTH_SHORT).show()
    }

    fun applyTheme(theme: String) {
        val mode = when (theme) {
            THEME_LIGHT -> AppCompatDelegate.MODE_NIGHT_NO
            THEME_DARK -> AppCompatDelegate.MODE_NIGHT_YES
            else -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
        }
        if (AppCompatDelegate.getDefaultNightMode() != mode) AppCompatDelegate.setDefaultNightMode(mode)
    }

    override fun onOptionsItemSelected(item: android.view.MenuItem): Boolean {
        if (item.itemId == android.R.id.home) {
            if (!navController.popBackStack()) finish()
            return true
        }
        return super.onOptionsItemSelected(item)
    }

    /**
     * Orqaga tugma: asosiy ekranda bir marta bosish — ogohlantirish, ikkinchisi
     * chiqish. Foydalanuvchi tasodifan chiqib ketmasligi uchun (DULO namunasida
     * shu xulq).
     *
     * `onBackPressed` ENDI eskirgan — Android 13+ predictiv-back tizimida tugma
     * bizning metod orqali EMAS, `OnBackPressedDispatcher` orqali yuradi.
     * Shuning uchun qoida dispatcher'ga CALLBACK bo'lib qo'yiladi va FAQAT
     * 5 ta asosiy ekranda yoqiladi (`setBackMode`): og'ir ekranda NavHostFragment
     * o'z callback'i orqali ortga qaytadi — chunki asosiy ekranda orqaga
     * qaytish yo'li yo'q, u yerda "chiqish" kerak.
     */
    private fun installBackHandling() {
        val made = object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                val now = System.currentTimeMillis()
                if (now - exitAt < EXIT_WINDOW_MS) {
                    container().store.flushSave()
                    finish()
                    return
                }
                exitAt = now
                android.widget.Toast.makeText(this@MainActivity, R.string.exit_hint, android.widget.Toast.LENGTH_SHORT).show()
            }
        }
        onBackPressedDispatcher.addCallback(this, made)
        exitCallback = made
    }

    /** Asosiy ekranda — "ikki marta bosib chiqish", batafsil ekranda — oddiy orqaga. */
    private fun setBackMode(topLevel: Boolean) {
        exitCallback?.isEnabled = topLevel
    }

    override fun onPause() {
        super.onPause()
        // Ekran tark etilganda saqlash debounce'i ishlamasligi mumkin —
        // majburiy yozamiz (5-vazifa: ma'lumot yo'qolmasin).
        runCatching { container().store.flushSave() }
    }

    private companion object {
        /** Pastki panel ko'rinadigan 5 ta asosiy ekran (`bottom_nav.xml` bilan bir xil). */
        val TOP_LEVEL = setOf(
            R.id.dashboardFragment,
            R.id.learningPathFragment,
            R.id.vocabularyFragment,
            R.id.progressFragment,
            R.id.settingsFragment,
        )

        /** "Chiqish" uchun ikkinchi bosishga ruxsat beriladigan oynа (ms). */
        const val EXIT_WINDOW_MS = 2500L
    }
}
