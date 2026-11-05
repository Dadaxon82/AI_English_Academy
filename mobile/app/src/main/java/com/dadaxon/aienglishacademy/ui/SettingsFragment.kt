package com.dadaxon.aienglishacademy.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import androidx.fragment.app.Fragment
import com.dadaxon.aienglishacademy.R
import com.dadaxon.aienglishacademy.MainActivity
import com.dadaxon.aienglishacademy.container
import com.dadaxon.aienglishacademy.data.Session
import com.dadaxon.aienglishacademy.data.THEME_DARK
import com.dadaxon.aienglishacademy.data.THEME_LIGHT
import com.dadaxon.aienglishacademy.data.THEME_SYSTEM
import com.dadaxon.aienglishacademy.data.UserSettings
import com.dadaxon.aienglishacademy.data.clampDailyMinutes
import com.dadaxon.aienglishacademy.databinding.FragmentShellBinding
import com.dadaxon.aienglishacademy.domain.computeAllocation
import com.dadaxon.aienglishacademy.domain.daysUntil
import com.dadaxon.aienglishacademy.domain.skillEvidence
import com.dadaxon.aienglishacademy.store.StoreAction
import com.google.android.material.button.MaterialButtonToggleGroup
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.slider.Slider
import com.google.android.material.textfield.TextInputEditText
import java.util.Calendar

/**
 * Sozlamalar — veb `src/pages/Settings.tsx` ning mobil moslamasi.
 *
 * MANBA: veb `Settings.tsx` + `planning.ts` (`computeAllocation`) +
 * `storage.ts`. Kunlik daqiqa (30..240 — DB CHECK bilan bir xil
 * `clampDailyMinutes`), joriy/maqsad daraja, imtihon sanasi (30 kun ichida
 * reja avtomatik moslashadi), taqsimot (hisoblanadi, qo'ldan o'rnatilmaydi —
 * vebda ham shunday), mavzu, AI tahlili, hisob/chiqish va versiya.
 *
 * Chiqishdan oldin `flushSave()` + `syncNow()` chaqiriladi: yuborilmagan
 * navbat yo'qolmasin (veb: `logout` da `flushSync()`).
 */
class SettingsFragment : Fragment() {

    private var _b: FragmentShellBinding? = null
    private val b get() = requireNotNull(_b)

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, saved: Bundle?): View {
        _b = FragmentShellBinding.inflate(inflater, container, false)
        return b.root
    }

    override fun onViewCreated(view: View, saved: Bundle?) {
        (activity as? AppCompatActivity)?.supportActionBar?.title = getString(R.string.settings_title)
        b.shellTitle.setText(R.string.settings_title)
        b.shellMascot.setMood(MascotView.Mood.HAPPY)
        b.emptyText.visibility = View.GONE
        render()
    }

    private fun render() {
        val ctx = requireContext()
        val c = container()
        val st = c.store.settings()
        Rows.clear(b.rows)

        /* ---- kunlik daqiqa ---- */
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.settings_minutes_title)))
        val minutesText = android.widget.TextView(ctx).apply {
            setTextAppearance(R.style.Text_Aea_Number)
            text = getString(R.string.settings_minutes_value, st.dailyMinutes)
        }
        b.rows.addView(minutesText)
        val slider = Slider(ctx).apply {
            valueFrom = 30f
            valueTo = 240f
            stepSize = 15f
            value = clampDailyMinutes(st.dailyMinutes).toFloat()
        }
        slider.addOnChangeListener { _, value, fromUser ->
            if (!fromUser) return@addOnChangeListener
            val m = clampDailyMinutes(value.toInt())
            minutesText.text = getString(R.string.settings_minutes_value, m)
        }
        slider.addOnSliderTouchListener(object : Slider.OnSliderTouchListener {
            override fun onStartTrackingTouch(s: Slider) = Unit
            // Material 1.9.0 metod nomi: `onStopTrackingTouch`.
            override fun onStopTrackingTouch(s: Slider) {
                patch { it.copy(dailyMinutes = clampDailyMinutes(s.value.toInt())) }
            }
        })
        b.rows.addView(slider)

        /* ---- darajalar ---- */
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.settings_level_title)))
        val available = runCatching { c.content.levels() }.getOrElse { emptyList() }
        b.rows.addView(Rows.small(ctx, getString(R.string.settings_level_current)))
        b.rows.addView(levelToggle(st.currentLevel, available) { level ->
            patch { it.copy(currentLevel = level) }
            c.store.dispatch(StoreAction.LevelSet(level))
        })
        b.rows.addView(Rows.small(ctx, getString(R.string.settings_level_target)))
        b.rows.addView(levelToggle(st.targetLevel, available) { level ->
            patch { it.copy(targetLevel = level) }
        })

        /* ---- imtihon sanasi ---- */
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.settings_exam_title)))
        b.rows.addView(Rows.small(ctx, getString(R.string.settings_exam_hint)))
        val left = daysUntil(st.examDate)
        b.rows.addView(
            android.widget.TextView(ctx).apply {
                setTextAppearance(R.style.Text_Aea_Body)
                text = when {
                    st.examDate == null -> getString(R.string.settings_exam_none)
                    left == null -> getString(R.string.settings_exam_none)
                    left < 0 -> getString(R.string.settings_exam_passed)
                    else -> st.examDate + " · " + getString(R.string.settings_exam_days_left, left)
                }
            },
        )
        b.rows.addView(
            Rows.button(ctx, getString(R.string.settings_exam_pick)).apply {
                setOnClickListener { pickDate() }
            },
        )
        if (st.examDate != null) {
            b.rows.addView(
                Rows.button(ctx, getString(R.string.settings_exam_clear)).apply {
                    setOnClickListener { patch { it.copy(examDate = null) } }
                },
            )
        }

        /* ---- taqsimot (hisoblangan) ---- */
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.settings_allocation_title)))
        val alloc = computeAllocation(st, skillEvidence(c.store.state.value.data))
        for ((skill, minutes) in alloc.minutes) {
            b.rows.addView(
                Rows.row(
                    ctx,
                    Rows.skillName(ctx, skill),
                    getString(R.string.dash_task_minutes, minutes),
                ),
            )
        }
        b.rows.addView(Rows.small(ctx, getString(R.string.dash_task_minutes, alloc.total)))
        for (r in alloc.reasonUz) b.rows.addView(Rows.small(ctx, r))

        /* ---- mavzu ---- */
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.settings_theme_title)))
        val themeGroup = MaterialButtonToggleGroup(ctx).apply {
            isSingleSelection = true
            // Material 1.9.0: property emas, setter orqali.
            setSelectionRequired(true)
        }
        // Kalitlar bazasi (`strings.xml`) ekran bo'limlariga ajratilgan va
        // "Yorug'/Tungi/Tizim" alohida kalitlari yo'q — mavjud
        // `settings_theme_title` tagiga texnik nom qo'shiladi (ixtira emas).
        for ((key, tag) in listOf(
            THEME_LIGHT to "light",
            THEME_DARK to "dark",
            THEME_SYSTEM to "system",
        )) {
            val btn = com.google.android.material.button.MaterialButton(
                ctx, null, com.google.android.material.R.attr.materialButtonOutlinedStyle,
            ).apply {
                text = "${getString(R.string.settings_theme_title)} · $tag"
                id = View.generateViewId()
                this.tag = key
            }
            themeGroup.addView(btn)
        }
        if (themeGroup.childCount > 0) {
            themeGroup.check(
                (0 until themeGroup.childCount)
                    .firstOrNull { themeGroup.getChildAt(it).tag == st.theme }
                    ?.let { themeGroup.getChildAt(it).id } ?: View.NO_ID,
            )
            themeGroup.addOnButtonCheckedListener { group, checkedId, isChecked ->
                if (!isChecked) return@addOnButtonCheckedListener
                val key = (0 until group.childCount)
                    .firstOrNull { group.getChildAt(it).id == checkedId }
                    ?.let { group.getChildAt(it) as? com.google.android.material.button.MaterialButton }
                    ?.tag as? String ?: return@addOnButtonCheckedListener
                patch { it.copy(theme = key) }
                applyTheme(key)
            }
            b.rows.addView(themeGroup)
        }

        /* ---- AI tahlili ---- */
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.settings_ai_title)))
        b.rows.addView(
            Rows.row(
                ctx,
                getString(if (st.aiEnabled) R.string.settings_ai_on else R.string.settings_ai_off),
                null,
                null,
                onClick = { patch { it.copy(aiEnabled = !st.aiEnabled) } },
            ),
        )

        /* ---- hisob ---- */
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.settings_account_title)))
        val session: Session? = runCatching { c.auth.session() }.getOrNull()
        val email = session?.email
        b.rows.addView(
            Rows.body(
                ctx,
                if (email.isNullOrBlank()) getString(R.string.settings_account_guest)
                else getString(R.string.settings_account_user, email),
            ),
        )
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.settings_sync_title)))
        b.rows.addView(Rows.small(ctx, getString(R.string.settings_queue_size, c.store.queueSize())))
        b.rows.addView(
            Rows.button(ctx, getString(R.string.sync_now)).apply {
                setOnClickListener {
                    val stats = c.store.syncNow()
                    (activity as? MainActivity)?.toastSync(stats)
                }
            },
        )
        if (session != null) {
            b.rows.addView(
                Rows.button(ctx, getString(R.string.settings_logout)).apply {
                    setOnClickListener { confirmLogout() }
                },
            )
        }

        /* ---- xatolar kundaligi + versiya ---- */
        b.rows.addView(
            Rows.button(ctx, getString(R.string.settings_open_mirror)).apply {
                setOnClickListener { Nav.open(this@SettingsFragment, R.id.errorLogFragment, "", getString(R.string.errlog_title)) }
            },
        )
        b.rows.addView(Rows.small(ctx, getString(R.string.settings_version, c.versionName())))
    }

    /** Daraja tanlash tugmalari (kontentda bo'lmagan daraja o'chiriladi). */
    private fun levelToggle(selected: String, available: List<String>, onPick: (String) -> Unit): MaterialButtonToggleGroup {
        val ctx = requireContext()
        val group = MaterialButtonToggleGroup(ctx).apply {
            isSingleSelection = true
            // Material 1.9.0: property emas, setter orqali.
            setSelectionRequired(true)
        }
        for (level in com.dadaxon.aienglishacademy.data.Levels.ALL) {
            val has = available.contains(level)
            val btn = com.google.android.material.button.MaterialButton(
                ctx, null, com.google.android.material.R.attr.materialButtonOutlinedStyle,
            ).apply {
                text = level
                id = View.generateViewId()
                isEnabled = has
                // `isEnabled=false` YETARLI EMAS: `MaterialButtonToggleGroup`
                // `addView` ichida tugmani qayta faollashtiradi (o'lchangan:
                // kontenti yo'q B1 qurilmada bosilib, daraja "0 kun"ga
                // o'tib qoldi). Shuning uchun bosish ham o'chiriladi.
                isClickable = has
                isFocusable = has
                alpha = if (has) 1f else 0.4f
                tag = level
            }
            group.addView(btn)
        }
        group.check(
            (0 until group.childCount)
                .firstOrNull { group.getChildAt(it).tag == selected }
                ?.let { group.getChildAt(it).id } ?: View.NO_ID,
        )
        group.addOnButtonCheckedListener { g, checkedId, isChecked ->
            if (!isChecked) return@addOnButtonCheckedListener
            val level = (0 until g.childCount)
                .firstOrNull { g.getChildAt(it).id == checkedId }
                ?.let { g.getChildAt(it) as? com.google.android.material.button.MaterialButton }
                ?.tag as? String ?: return@addOnButtonCheckedListener
            // Ikkinchi himoya: kontentda yo'q daraja tanlanmasligi kerak
            // (veb `Progress.tsx`: «…kontenti hali tayyor emas — o'tish
            // tugmasi kontent yuklangandan keyin ishlaydi»).
            if (!available.contains(level)) return@addOnButtonCheckedListener
            onPick(level)
        }
        return group
    }

    /** Imtihon sanasi — Material date picker (veb: `<input type="date">`). */
    private fun pickDate() {
        com.google.android.material.datepicker.MaterialDatePicker.Builder.datePicker()
            .setTitleText(R.string.settings_exam_pick)
            .setSelection(com.google.android.material.datepicker.MaterialDatePicker.todayInUtcMilliseconds())
            .build()
            .also { picker ->
                picker.addOnPositiveButtonClickListener { utc ->
                    val pcal = Calendar.getInstance(java.util.TimeZone.getTimeZone("UTC")).apply {
                        timeInMillis = utc
                    }
                    // Kalit — UTC yarim tungi ISO sana (veb `YYYY-MM-DD`).
                    val iso = String.format(
                        java.util.Locale.ROOT, "%04d-%02d-%02d",
                        pcal.get(Calendar.YEAR), pcal.get(Calendar.MONTH) + 1, pcal.get(Calendar.DAY_OF_MONTH),
                    )
                    patch { it.copy(examDate = iso) }
                }
            }
            .show(parentFragmentManager, "exam_date")
    }

    /** Sozlamani saqlash — store orqali (debounce'li yozuv + sinxron navbat). */
    private fun patch(f: (UserSettings) -> UserSettings) {
        val next = f(container().store.settings())
        container().store.dispatch(StoreAction.Settings(next))
        // Sarlavha/plitkalar yangilanishi uchun qayta render.
        render()
    }

    private fun applyTheme(key: String) {
        val mode = when (key) {
            THEME_LIGHT -> AppCompatDelegate.MODE_NIGHT_NO
            THEME_DARK -> AppCompatDelegate.MODE_NIGHT_YES
            else -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
        }
        if (AppCompatDelegate.getDefaultNightMode() != mode) AppCompatDelegate.setDefaultNightMode(mode)
    }

    /**
     * Chiqish: avval saqlash va sinxron (navbat yo'qolmasin), keyin sessiya
     * tozalanadi. Ma'lumot qurilmada qoladi — vebdagi `logout` xulqi bilan
     * bir xil (`progress_delete_text`da ham shu aytilgan).
     */
    private fun confirmLogout() {
        val ctx = requireContext()
        MaterialAlertDialogBuilder(ctx)
            .setTitle(R.string.settings_logout)
            .setView(MascotDialog.header(ctx, MascotView.Mood.NEUTRAL))
            .setMessage(R.string.settings_logout_confirm)
            .setNegativeButton(R.string.cancel, null)
            .setPositiveButton(R.string.yes) { _, _ ->
                val c = container()
                c.store.flushSave()
                runCatching { c.store.syncNow() }
                val token = runCatching { c.auth.session()?.accessToken }.getOrNull()
                runCatching { if (token != null) c.supabase?.signOut(token) }
                c.auth.clear()
                android.widget.Toast.makeText(ctx, R.string.settings_logout_done, android.widget.Toast.LENGTH_SHORT).show()
                findNavController().navigate(R.id.authFragment)
            }
            .show()
    }

    private fun findNavController(): androidx.navigation.NavController =
        androidx.navigation.fragment.NavHostFragment.findNavController(this)

    override fun onDestroyView() {
        super.onDestroyView()
        _b = null
    }
}
