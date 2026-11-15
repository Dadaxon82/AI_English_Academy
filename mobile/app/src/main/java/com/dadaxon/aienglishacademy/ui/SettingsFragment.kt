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

    /**
     * Bir martalik xarid/garov xabari (veb `shopMsg` holatiga mos). Store
     * faqat RAD ETISH sababini saqlaydi (`gameMessage`), muvaffaqiyat matni
     * esa shu yerda yuradi va bir marta ko'rsatilib tozalanadi.
     */
    private var pendingGameMsg: String? = null

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

        /* ---- o'yin qatlami (veb Settings tsx 'O'yin qatlami' kartasi) ---- */
        // Turli turdagi bosqichlar: sozlama + kundalik XP + do'kon. Yurak
        // sozlamasi veb va mobil o'rtasida sinxronlanadi.
        addGameSection()

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

        /* ---- harakatlar (animatsiya) ---- */
        // Namunaviy ilova barcha harakatni `res/raw`da saqlaydi; bizda byudjet
        // `res/raw/motion_manifest.json`da, chizish `Motion`da. Foydalanuvchi
        // o'chirsa — hammasi darhol holatida ko'rinadi (qoida: joyidan siljimaydi).
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.settings_motion_title)))
        b.rows.addView(
            Rows.row(
                ctx,
                getString(if (st.motionEnabled) R.string.settings_motion_on else R.string.settings_motion_off),
                null,
                null,
                onClick = {
                    patch { it.copy(motionEnabled = !st.motionEnabled) }
                    Motion.reset()
                },
            ),
        )
        b.rows.addView(Rows.small(ctx, getString(R.string.settings_motion_hint)))
        if (st.motionEnabled && !Motion.enabled(ctx)) {
            // Halol izoh: kalit yoniq, lekin tizim animatsiyalari o'chirilgan
            // bo'lishi mumkin — sabab ochiq aytiladi (holat ixtir qilinmaydi).
            b.rows.addView(Rows.small(ctx, getString(R.string.settings_motion_scale_off)))
        }

        /* ---- Immersion (qurilma sozlamasi) — veb Sozlamalar «Immersion rejimi» ---- */
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.imm_title)))
        val imm = DevicePrefs.immersion(ctx)
        b.rows.addView(
            Rows.row(
                ctx,
                getString(if (imm) R.string.imm_on else R.string.imm_off),
                null,
                null,
                onClick = {
                    DevicePrefs.setImmersion(ctx, !imm)
                    render()
                },
            ),
        )
        b.rows.addView(Rows.small(ctx, getString(R.string.imm_hint)))

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

    /**
     * O'yin qatlami bloki — veb `Settings.tsx` «O'yin qatlami» kartasining
     * mobil moslamasi: yuraklar sozlamasi + soni, kunlik XP maqsadi
     * bosqichlari va gem do'koni.
     *
     * Barcha sonlar `GameConfig`dan olinadi (matnda qattiq yozilmagan),
     * shuning uchun konfig o'zgarsa ekran ham o'zgaradi. Xarid rad etilsa
     * SABABI ochiq ko'rsatiladi (`gameMessage`) — holat o'zgarmaydi.
     */
    private fun addGameSection() {
        val ctx = requireContext()
        val store = container().store
        val st = store.settings()
        val data = store.state.value.data
        val hearts = com.dadaxon.aienglishacademy.domain.GameLogic.heartsView(data, System.currentTimeMillis())
        val goal = com.dadaxon.aienglishacademy.domain.GameLogic.goalView(data)
        val streak = com.dadaxon.aienglishacademy.domain.GameLogic.streakWithFreezes(data, com.dadaxon.aienglishacademy.data.todayKey())

        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.settings_game_title)))
        b.rows.addView(
            Rows.small(
                ctx,
                getString(if (st.heartsEnabled) R.string.settings_hearts_state_on else R.string.settings_hearts_state_off) +
                    " · " + getString(R.string.settings_goal_today, goal.value, goal.target),
            ),
        )

        /* ---- yuraklar ---- */
        b.rows.addView(
            Rows.row(
                ctx,
                getString(R.string.settings_hearts_on),
                getString(R.string.settings_hearts_count, hearts.count, hearts.max) +
                    if (hearts.count < hearts.max && hearts.minutesLeft > 0) {
                        getString(R.string.settings_hearts_next, hearts.minutesLeft)
                    } else {
                        ""
                    },
                null,
                onClick = { patch { it.copy(heartsEnabled = !it.heartsEnabled) } },
            ),
        )
        b.rows.addView(
            Rows.small(
                ctx,
                getString(
                    R.string.settings_hearts_hint,
                    com.dadaxon.aienglishacademy.data.GameConfig.HEARTS_MAX,
                    com.dadaxon.aienglishacademy.data.GameConfig.HEARTS_COST_WRONG,
                    com.dadaxon.aienglishacademy.data.GameConfig.HEART_REFILL_MINUTES,
                    com.dadaxon.aienglishacademy.data.GameConfig.HEART_PRACTICE_REVIEWS,
                    com.dadaxon.aienglishacademy.data.GameConfig.HEART_COMBO_STREAK,
                ),
            ),
        )

        /* ---- kunlik XP maqsadi ---- */
        b.rows.addView(Rows.small(ctx, getString(R.string.settings_xp_goal_title)))
        val goalGroup = MaterialButtonToggleGroup(ctx).apply {
            isSingleSelection = true
            setSelectionRequired(true)
        }
        for (tier in com.dadaxon.aienglishacademy.data.GameConfig.XP_GOAL_TIERS) {
            val btn = com.google.android.material.button.MaterialButton(
                ctx, null, com.google.android.material.R.attr.materialButtonOutlinedStyle,
            ).apply {
                text = getString(R.string.settings_xp_goal_row, tier.titleUz, tier.xp)
                id = View.generateViewId()
                tag = tier.xp
            }
            goalGroup.addView(btn)
        }
        goalGroup.check(
            (0 until goalGroup.childCount)
                .firstOrNull { goalGroup.getChildAt(it).tag == st.xpGoalXp }
                ?.let { goalGroup.getChildAt(it).id } ?: View.NO_ID,
        )
        goalGroup.addOnButtonCheckedListener { g, checkedId, isChecked ->
            if (!isChecked) return@addOnButtonCheckedListener
            val xp = (0 until g.childCount)
                .firstOrNull { g.getChildAt(it).id == checkedId }
                ?.let { g.getChildAt(it) as? com.google.android.material.button.MaterialButton }
                ?.tag as? Int ?: return@addOnButtonCheckedListener
            patch { it.copy(xpGoalXp = xp) }
        }
        b.rows.addView(goalGroup)
        b.rows.addView(
            Rows.small(
                ctx,
                getString(
                    R.string.settings_xp_goal_hint,
                    com.dadaxon.aienglishacademy.data.GameConfig.GOAL_GEM_REWARD,
                    st.dailyMinutes,
                ),
            ),
        )

        /* ---- do'kon ---- */
        b.rows.addView(Rows.small(ctx, getString(R.string.settings_shop_title, data.game.gems)))
        b.rows.addView(
            Rows.small(
                ctx,
                getString(R.string.settings_shop_freezes, data.game.freezes) + " · " +
                    if (hearts.boostActive) {
                        getString(R.string.settings_boost_active, hearts.boostMinutesLeft)
                    } else {
                        getString(R.string.settings_boost_none)
                    },
            ),
        )
        for (item in com.dadaxon.aienglishacademy.data.GameConfig.SHOP_ITEMS) {
            b.rows.addView(
                Rows.row(
                    ctx,
                    item.titleUz,
                    item.noteUz,
                    getString(R.string.settings_shop_price, item.price),
                    // Yuraklar to'la / qalqon ko'p / byust faol — buyum
                    // baribir bosiladi: rad ETISH SABABI ochiq ko'rsatiladi.
                    onClick = { buyAndReport(item.id, item.titleUz, item.price) },
                ),
            )
        }
        b.rows.addView(
            Rows.button(
                ctx,
                getString(
                    R.string.settings_bet_button,
                    com.dadaxon.aienglishacademy.data.GameConfig.BET_COST_GEMS,
                    com.dadaxon.aienglishacademy.data.GameConfig.BET_STREAK_DAYS,
                    com.dadaxon.aienglishacademy.data.GameConfig.BET_WIN_GEMS,
                ),
            ).apply {
                setOnClickListener {
                    val before = store.state.value.data.game.gems
                    store.dispatch(StoreAction.GameBet)
                    pendingGameMsg = if (store.state.value.data.game.gems < before) {
                        getString(R.string.settings_bet_ok, com.dadaxon.aienglishacademy.data.GameConfig.BET_COST_GEMS)
                    } else {
                        null
                    }
                    render()
                }
            },
        )
        val bet = data.game.bet
        if (bet != null) {
            b.rows.addView(Rows.small(ctx, getString(R.string.settings_bet_open, bet.startDay, bet.gems)))
        }
        b.rows.addView(
            Rows.small(
                ctx,
                getString(R.string.settings_shop_hint, com.dadaxon.aienglishacademy.data.GameConfig.MAX_FREEZES) +
                    " · zanjir: $streak kun",
            ),
        )

        // Xarid/garov javobi — muvaffaqiyat yoki RAD ETISH sababi (veb:
        // `shopMsg`). `gameMessage` do'konda saqlanadi (holat o'zgarmagan
        // holda sabab ko'rinadi), muvaffaqiyat matni esa shu ekranning
        // bir martalik xabati (`pendingGameMsg`).
        val msg = store.state.value.gameMessage ?: pendingGameMsg
        pendingGameMsg = null
        if (!msg.isNullOrBlank()) b.rows.addView(Rows.small(ctx, msg))
    }

    /**
     * Do'kon buyumi: `GameOps.buy` reducerda bajariladi, bizga esa natija
     * `gameMessage` orqali keladi. Gem kamaygan bo'lsa — sotib olindi (son
     * taxmin qilinmaydi, holatdan o'qiladi); aks holda sabab `gameMessage`da.
     */
    private fun buyAndReport(itemId: String, titleUz: String, price: Int) {
        val store = container().store
        val before = store.state.value.data.game.gems
        store.dispatch(StoreAction.GameBuy(itemId))
        pendingGameMsg = if (store.state.value.data.game.gems < before) {
            getString(R.string.settings_shop_ok, titleUz, price)
        } else {
            null
        }
        render()
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
