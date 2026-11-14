package com.dadaxon.aienglishacademy.ui

import android.content.Context
import android.graphics.Typeface
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.widget.NestedScrollView
import com.dadaxon.aienglishacademy.R
import com.dadaxon.aienglishacademy.data.Skills
import com.dadaxon.aienglishacademy.domain.ActivityDay
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.google.android.material.progressindicator.LinearProgressIndicator

/**
 * Ekranlarda takrorlanadigan qatorlar (kartalar, sarlavhalar, statistika
 * plitkalari, ko'nikma chiziqlari, hafta diagrammasi).
 *
 * Nima uchun XML emas: 14 ekranning aksariyati BIR XIL ro'yxat qatorlarini
 * kontentdan dinamik yasaydi (kunlar, mavzular, matnlar, xatolar). Qatorlar
 * shu joyda yig'ilsa — layout id'lari chalkashmaydi va har ekranda bir xil
 * vizual til (radius 16dp, oraliq 8/12dp) saqlanadi.
 */
object Rows {

    /**
     * Baho ishonchining past chegarasi — bundan pastida foiz ko'rsatilmaydi
     * (veb: `Progress.tsx` noaniq baholarni son sizi beradi; bizda ham
     * `progress_evidence_hint` shu qoidani aytadi).
     */
    const val CONFIDENCE_FLOOR = 0.5

    fun clear(host: ViewGroup) = host.removeAllViews()

    /** Kontent yo'qligini halol ko'rsatuvchi matn. */
    fun empty(ctx: Context, text: CharSequence): TextView =
        TextView(ctx).apply {
            setTextAppearance(R.style.Text_Aea_Small)
            this.text = text
            setPadding(0, dp(ctx, 8), 0, dp(ctx, 8))
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
            )
        }

    fun title(ctx: Context, text: CharSequence): TextView =
        TextView(ctx).apply {
            setTextAppearance(R.style.Text_Aea_Title)
            this.text = text
        }

    fun sectionTitle(ctx: Context, text: CharSequence): TextView =
        TextView(ctx).apply {
            setTextAppearance(R.style.Text_Aea_Section)
            this.text = text
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
            ).apply { topMargin = dp(ctx, 16) }
        }

    fun body(ctx: Context, text: CharSequence): TextView =
        TextView(ctx).apply {
            setTextAppearance(R.style.Text_Aea_Body)
            this.text = text
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
            ).apply { topMargin = dp(ctx, 8) }
        }

    fun small(ctx: Context, text: CharSequence): TextView =
        TextView(ctx).apply {
            setTextAppearance(R.style.Text_Aea_Small)
            this.text = text
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
            ).apply { topMargin = dp(ctx, 4) }
        }

    /** Xizmatkor (outlined) karta — ro'yxat qatori uchun asos. */
    fun card(ctx: Context): MaterialCardView = MaterialCardView(ctx).apply {
        radius = ctx.resources.getDimension(R.dimen.card_radius)
        cardElevation = 0f
        strokeWidth = dp(ctx, 1)
        setPadding(dp(ctx, 12), dp(ctx, 12), dp(ctx, 12), dp(ctx, 12))
        layoutParams = LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
        ).apply { topMargin = dp(ctx, 8) }
        isClickable = true
        isFocusable = true
    }

    /** Sarlavh + izoh + (ixtiyoriy) o'ng belgi bilan qator-karta. */
    fun row(
        ctx: Context,
        main: CharSequence,
        sub: CharSequence? = null,
        trailing: CharSequence? = null,
        enabled: Boolean = true,
        onClick: (() -> Unit)? = null,
    ): MaterialCardView {
        val c = card(ctx)
        c.isEnabled = enabled
        c.isClickable = onClick != null && enabled
        c.alpha = if (enabled) 1f else 0.55f

        val box = LinearLayout(ctx).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
            )
        }
        val texts = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        }
        texts.addView(TextView(ctx).apply {
            setTextAppearance(R.style.Text_Aea_Body)
            text = main
            setTypeface(typeface, Typeface.BOLD)
        })
        if (sub != null) texts.addView(small(ctx, sub))
        box.addView(texts)
        if (trailing != null) box.addView(TextView(ctx).apply {
            setTextAppearance(R.style.Text_Aea_Small)
            text = trailing
            setTypeface(typeface, Typeface.BOLD)
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
            ).apply { marginStart = dp(ctx, 8) }
        })
        c.addView(box)
        onClick?.let { fn ->
            c.setOnClickListener { fn() }
            c.contentDescription = main
        }
        return c
    }

    /** Statistika plitkasi: katta son + nom + (ixtiyoriy) izoh. */
    fun statTile(ctx: Context, value: CharSequence, label: CharSequence, hint: CharSequence? = null): MaterialCardView {
        val c = MaterialCardView(ctx).apply {
            radius = ctx.resources.getDimension(R.dimen.card_radius)
            cardElevation = 0f
            setPadding(dp(ctx, 12), dp(ctx, 12), dp(ctx, 12), dp(ctx, 12))
        }
        val box = LinearLayout(ctx).apply { orientation = LinearLayout.VERTICAL }
        box.addView(TextView(ctx).apply {
            setTextAppearance(R.style.Text_Aea_Number)
            text = value
        })
        box.addView(TextView(ctx).apply {
            setTextAppearance(R.style.Text_Aea_Small)
            text = label
            setTypeface(typeface, Typeface.BOLD)
        })
        if (hint != null) box.addView(small(ctx, hint))
        c.addView(box)
        return c
    }

    /** Plitkalarni bir qatorga teng bo'lib joylash (Dashboard statistikasi). */
    fun statRow(ctx: Context, vararg tiles: View): LinearLayout = LinearLayout(ctx).apply {
        orientation = LinearLayout.HORIZONTAL
        layoutParams = LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
        ).apply { topMargin = dp(ctx, 8) }
        for (t in tiles) {
            t.layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply {
                marginStart = dp(ctx, 4)
                marginEnd = dp(ctx, 4)
            }
            addView(t)
        }
    }

    /** Ko'nikma balansi: nom + baho + dalil/ishonch + chiziq. */
    fun skillBar(ctx: Context, skill: String, scorePercent: Int, evidenceCount: Int, confidence: Double): LinearLayout {
        val box = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
            ).apply { topMargin = dp(ctx, 10) }
        }
        val unsure = confidence < CONFIDENCE_FLOOR
        val conf = if (unsure) {
            ctx.getString(R.string.dash_confidence_low) + " " + ctx.getString(R.string.dash_confidence_note)
        } else {
            ctx.getString(R.string.dash_confidence_high, (confidence * 100).toInt())
        }
        box.addView(TextView(ctx).apply {
            setTextAppearance(R.style.Text_Aea_Body)
            // `%s` + `%d` — ALOHIDA satr (`skillbar_row`): `skillbar_percent`
            // faqat son uchun, nom bilan chaqirsak format xatosi chiqadi.
            text = if (unsure) {
                ctx.getString(R.string.skillbar_row_unsure, skillName(ctx, skill))
            } else {
                ctx.getString(R.string.skillbar_row, skillName(ctx, skill), scorePercent)
            }
        })
        box.addView(
            small(
                ctx,
                ctx.getString(R.string.progress_evidence_count, evidenceCount) + " · " + conf,
            ),
        )
        box.addView(LinearProgressIndicator(ctx).apply {
            setProgressCompat(scorePercent.coerceIn(0, 100), true)
            trackThickness = dp(ctx, 10)
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
            ).apply { topMargin = dp(ctx, 4) }
        })
        return box
    }

    fun skillName(ctx: Context, skill: String): String = ctx.getString(
        when (skill) {
            Skills.VOCABULARY -> R.string.skill_vocabulary
            Skills.GRAMMAR -> R.string.skill_grammar
            Skills.READING -> R.string.skill_reading
            Skills.LISTENING -> R.string.skill_listening
            Skills.WRITING -> R.string.skill_writing
            Skills.SPEAKING -> R.string.skill_speaking
            else -> R.string.skill_grammar
        },
    )

    /**
     * Hafta diagrammasi — ustunlar `lastNDays` sekundlariga proportsional.
     * Har ustun ostida daqiqa yozilgan: grafik o'qilmasa ham son yo'qolmaydi.
     */
    fun weekBar(ctx: Context, days: List<ActivityDay>): LinearLayout {
        val box = LinearLayout(ctx).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.BOTTOM
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
            ).apply { topMargin = dp(ctx, 8) }
        }
        val maxSec = days.maxOf { it.seconds }.coerceAtLeast(60)
        val labels = intArrayOf(
            R.string.wd_yak, R.string.wd_du, R.string.wd_se, R.string.wd_chor,
            R.string.wd_pay, R.string.wd_jum, R.string.wd_shan,
        )
        val today = com.dadaxon.aienglishacademy.data.todayKey()
        for (d in days) {
            val mins = d.seconds / 60
            val col = LinearLayout(ctx).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER_HORIZONTAL
                layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
            }
            val trackH = ctx.resources.getDimensionPixelSize(R.dimen.weekbar_height)
            val h = (trackH * (d.seconds.toFloat() / maxSec.toFloat())).toInt()
            col.addView(View(ctx).apply {
                layoutParams = LinearLayout.LayoutParams(dp(ctx, 14), if (h > 0) h else dp(ctx, 3))
                background = GradientDrawable().apply {
                    cornerRadius = dp(ctx, 3).toFloat()
                    setColor(
                        when {
                            mins == 0 -> 0xFFCBD5E1.toInt()
                            d.date == today -> 0xFF1D4ED8.toInt()
                            else -> 0xFF0EA5E9.toInt()
                        },
                    )
                }
            })
            col.addView(TextView(ctx).apply {
                setTextAppearance(R.style.Text_Aea_Small)
                gravity = Gravity.CENTER
                text = if (mins == 0) ctx.getString(R.string.weekbar_none)
                else ctx.getString(R.string.weekbar_minutes, mins)
            })
            col.addView(TextView(ctx).apply {
                setTextAppearance(R.style.Text_Aea_Small)
                gravity = Gravity.CENTER
                text = ctx.getString(labels[dayIndex(d.date)])
                setTypeface(typeface, if (d.date == today) Typeface.BOLD else Typeface.NORMAL)
            })
            box.addView(col)
        }
        return box
    }

    /** `YYYY-MM-DD` → 0..6 (0 = yakshanba — `wd_*` tartibi bilan bir xil). */
    private fun dayIndex(dateKey: String): Int = try {
        java.time.LocalDate.parse(dateKey).dayOfWeek.value % 7
    } catch (err: Exception) {
        0
    }

    fun button(ctx: Context, text: CharSequence, style: Int = com.google.android.material.R.attr.materialButtonOutlinedStyle): MaterialButton =
        MaterialButton(ctx, null, style).apply {
            this.text = text
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
            ).apply { topMargin = dp(ctx, 8) }
        }

    fun primaryButton(ctx: Context, text: CharSequence): MaterialButton =
        button(ctx, text, com.google.android.material.R.attr.materialButtonStyle)

    fun dp(ctx: Context, v: Int): Int = (v * ctx.resources.displayMetrics.density).toInt()

    /** Rejalashtirilgan rangni (theme attr) rangga aylantirish. */
    fun themeColor(ctx: Context, attr: Int): Int {
        val tv = TypedValue()
        ctx.theme.resolveAttribute(attr, tv, true)
        return if (tv.resourceId != 0) ctx.getColor(tv.resourceId) else tv.data
    }

    fun ripple(ctx: Context): Drawable? {
        val a = ctx.obtainStyledAttributes(intArrayOf(android.R.attr.selectableItemBackground))
        val d = a.getDrawable(0)
        a.recycle()
        return d
    }

    /** Ichki scroll — uzoq kontentli ekranlar uchun (fragmentlarda XML orqali). */
    fun newScroll(ctx: Context): NestedScrollView = NestedScrollView(ctx)

    /**
     * Joriy bo'lim banneri — veb `src/components/SectionBanner.tsx` ning
     * mobildagi ko'rinishi: "A1.1-BO'LIM · 2-KUN" + kun nomi + "Bo'limlar"
     * tugmasi. MA'LUMOT `domain/currentSectionInfo()`dan — son ixtir EMAS.
     *
     * RANG: mavzudagi `ok` (#059669) — veb'dagi `bg-emerald-600` BILAN BIR
     * XIL son (ikkalasi ham #059669); yangi rang qo'shilmadi. Vebdagi qalin
     * pastki chegara (4dp) shu yerda ham saqlanadi.
     */
    fun sectionBanner(
        ctx: Context,
        info: com.dadaxon.aienglishacademy.domain.CurrentSectionInfo,
        onOpen: () -> Unit,
    ): View {
        val box = LinearLayout(ctx).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(ctx, 16), dp(ctx, 12), dp(ctx, 12), dp(ctx, 12))
            background = GradientDrawable().apply {
                setColor(ctx.getColor(R.color.ok))
                cornerRadius = dp(ctx, 14).toFloat()
            }
            contentDescription = ctx.getString(R.string.sec_banner_alt)
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
            ).apply { topMargin = dp(ctx, 8) }
        }
        val texts = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        }
        texts.addView(TextView(ctx).apply {
            setTextAppearance(R.style.Text_Aea_Small)
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(ctx.getColor(R.color.white))
            text = ctx.getString(R.string.sec_banner_current, info.section.label, info.unitNumber)
        })
        texts.addView(TextView(ctx).apply {
            setTextAppearance(R.style.Text_Aea_Body)
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(ctx.getColor(R.color.white))
            maxLines = 1
            text = info.day.titleUz
        })
        box.addView(texts)
        box.addView(
            MaterialButton(ctx, null, com.google.android.material.R.attr.materialButtonOutlinedStyle).apply {
                text = ctx.getString(R.string.nav_sections)
                setTextColor(ctx.getColor(R.color.white))
                strokeColor = android.content.res.ColorStateList.valueOf(ctx.getColor(R.color.white))
                isAllCaps = true
                setOnClickListener { onOpen() }
            },
        )
        return box
    }
}
