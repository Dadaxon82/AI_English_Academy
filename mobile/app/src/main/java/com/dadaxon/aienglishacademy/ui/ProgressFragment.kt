package com.dadaxon.aienglishacademy.ui

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import androidx.fragment.app.Fragment
import com.dadaxon.aienglishacademy.R
import com.dadaxon.aienglishacademy.container
import com.dadaxon.aienglishacademy.databinding.FragmentShellBinding
import com.dadaxon.aienglishacademy.domain.SKILLS_REQUIRED_TO_PROMOTE
import com.dadaxon.aienglishacademy.domain.evaluateLevelPromotion
import com.dadaxon.aienglishacademy.domain.lastNDays
import com.dadaxon.aienglishacademy.domain.skillEvidence
import com.dadaxon.aienglishacademy.store.AppStore
import com.dadaxon.aienglishacademy.store.StoreAction
import com.google.android.material.chip.Chip
import com.google.android.material.chip.ChipGroup
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import java.io.File
import java.util.Locale

/**
 * Progress — veb `src/pages/Progress.tsx` ning mobil moslamasi.
 *
 * MANBA: veb `Progress.tsx` (oraliq tanlash 7/30/hammasi, umumiy hisob,
 * ko'nikma dalillari, daraja tavsiyasi, so'zlar statistikasi, eksport,
 * ma'lumotni o'chirish, yutuqlar).
 *
 * Hisob qoidalari domen qatlamidan olinadi: `skillEvidence` (vahy bilan
 * og'irlikli ball + ishonch), `evaluateLevelPromotion` (4 ko'nikma ≥72 ball,
 * ≥4 dalil), `lastNDays`. Eksport — `cacheDir`ga yoziladi va FileProvider
 * orqali ulashiladi (tarmoqqa hech narsa chiqmaydi).
 */
class ProgressFragment : Fragment() {

    private var _b: FragmentShellBinding? = null
    private val b get() = requireNotNull(_b)

    /** Oraliq: 7 / 30 kun yoki hammasi (-1). */
    private var rangeDays = 30

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, saved: Bundle?): View {
        _b = FragmentShellBinding.inflate(inflater, container, false)
        return b.root
    }

    override fun onViewCreated(view: View, saved: Bundle?) {
        (activity as? AppCompatActivity)?.supportActionBar?.title = getString(R.string.progress_title)
        b.shellTitle.setText(R.string.progress_title)
        b.shellMascot.setMood(MascotView.Mood.HAPPY)
        b.emptyText.visibility = View.GONE
        render()
    }

    private fun render() {
        val ctx = requireContext()
        val c = container()
        val d = c.store.state.value.data
        Rows.clear(b.rows)

        b.shellSubtitle.text = getString(R.string.path_subtitle, d.settings.currentLevel, lastNDays(d, rangeDaysOrAll()).size)

        /* ---- oraliq tanlash ---- */
        val chips = ChipGroup(ctx).apply {
            isSingleSelection = true
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT,
            ).apply { topMargin = Rows.dp(ctx, 8) }
        }
        for ((label, days) in listOf(
            getString(R.string.progress_range_7) to 7,
            getString(R.string.progress_range_30) to 30,
            getString(R.string.progress_range_all) to -1,
        )) {
            val chip = Chip(ctx).apply {
                text = label
                isCheckable = true
                isChecked = days == rangeDays
            }
            chip.setOnClickListener {
                rangeDays = days
                render()
            }
            chips.addView(chip)
        }
        b.rows.addView(chips)

        /* ---- umumiy hisob (faqat tanlangan oraliq) ---- */
        val attempts = attemptsInRange(d.attempts)
        val total = attempts.size
        val correct = attempts.count { it.correct }
        val percent = if (total == 0) 0 else correct * 100 / total
        val secs = attempts.sumOf { it.secondsSpent.coerceAtLeast(0) }
        b.rows.addView(
            Rows.sectionTitle(
                ctx,
                getString(R.string.progress_summary, total, percent, AppStore.formatDuration(secs)),
            ),
        )
        if (total > 0) {
            b.rows.addView(Rows.weekBar(ctx, lastNDays(d, rangeDaysOrAll())))
        } else {
            b.rows.addView(Rows.small(ctx, getString(R.string.dash_errors_empty_no_attempts)))
        }

        /* ---- ko'nikma dalillari ---- */
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.progress_evidence_title)))
        b.rows.addView(Rows.small(ctx, getString(R.string.progress_evidence_hint)))
        val evidence = skillEvidence(d)
        for (e in evidence) {
            b.rows.addView(Rows.skillBar(ctx, e.skill, e.score.toInt(), e.evidenceCount, e.confidence))
        }
        // Har ko'nikma uchun sonlar (veb: ball/dalil matn ko'rinishi ham bor).
        for (e in evidence) {
            val card = Rows.card(ctx)
            val box = LinearLayout(ctx).apply { orientation = LinearLayout.VERTICAL }
            box.addView(android.widget.TextView(ctx).apply {
                setTextAppearance(R.style.Text_Aea_Body)
                text = Rows.skillName(ctx, e.skill)
            })
            val scoreText = if (e.evidenceCount == 0) {
                getString(R.string.weekbar_none)
            } else {
                String.format(Locale.getDefault(), "%.0f", e.score)
            }
            box.addView(Rows.small(ctx, getString(R.string.progress_evidence_score, scoreText)))
            box.addView(Rows.small(ctx, getString(R.string.progress_evidence_count, e.evidenceCount)))
            card.addView(box)
            b.rows.addView(card)
        }

        /* ---- daraja tavsiyasi ---- */
        val promo = evaluateLevelPromotion(d.settings.currentLevel, evidence)
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.progress_promotion_title)))
        if (promo.recommendedLevel != null) {
            b.rows.addView(Rows.body(ctx, getString(R.string.ex_level_up, promo.recommendedLevel)))
        }
        b.rows.addView(Rows.body(ctx, promo.reasonUz))
        if (promo.readySkills.isNotEmpty()) {
            b.rows.addView(
                Rows.small(
                    ctx,
                    getString(R.string.progress_promotion_ready, promo.readySkills.joinToString(", ") { Rows.skillName(ctx, it) }),
                ),
            )
        }
        if (promo.weakSkills.isNotEmpty()) {
            b.rows.addView(
                Rows.small(
                    ctx,
                    getString(R.string.progress_promotion_weak, promo.weakSkills.joinToString(", ") { Rows.skillName(ctx, it) }),
                ),
            )
        }
        if (promo.recommendedLevel == null && promo.readySkills.size < com.dadaxon.aienglishacademy.domain.SKILLS_REQUIRED_TO_PROMOTE) {
            b.rows.addView(Rows.small(ctx, getString(R.string.progress_promotion_none)))
        }

        /* ---- o'z-o'zini baholash (Likert) — veb `SelfAssessment.tsx` ---- */
        addSelfAssessment(d)

        /* ---- so'zlar statistikasi ---- */
        val srs = d.srs.values.toList()
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.progress_words_title)))
        b.rows.addView(
            Rows.statRow(
                ctx,
                Rows.statTile(
                    ctx,
                    com.dadaxon.aienglishacademy.domain.countLearned(srs).toString(),
                    getString(R.string.dash_stat_words),
                    getString(R.string.progress_words_learned, com.dadaxon.aienglishacademy.domain.countLearned(srs)),
                ),
                Rows.statTile(
                    ctx,
                    com.dadaxon.aienglishacademy.domain.countDue(srs).toString(),
                    getString(R.string.dash_stat_due),
                    getString(R.string.progress_words_due, com.dadaxon.aienglishacademy.domain.countDue(srs)),
                ),
            ),
        )

        /* ---- eksport ---- */
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.progress_write_title)))
        b.rows.addView(
            Rows.button(ctx, getString(R.string.progress_export_csv)).apply {
                setOnClickListener { exportCsv() }
            },
        )
        b.rows.addView(
            Rows.button(ctx, getString(R.string.progress_export_json)).apply {
                setOnClickListener { exportJson() }
            },
        )

        /* ---- yutuqlar ---- */
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.progress_badges)))
        if (d.badges.isEmpty()) {
            b.rows.addView(Rows.small(ctx, getString(R.string.progress_badges_empty)))
        } else {
            for (badge in d.badges) {
                b.rows.addView(
                    Rows.row(
                        ctx,
                        badge.titleUz,
                        android.text.format.DateFormat.format("yyyy-MM-dd HH:mm", badge.at).toString(),
                    ),
                )
            }
        }

        /* ---- ma'lumotni o'chirish ---- */
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.progress_delete_title)))
        b.rows.addView(Rows.small(ctx, getString(R.string.progress_delete_text)))
        b.rows.addView(
            Rows.button(ctx, getString(R.string.progress_delete_btn)).apply {
                setOnClickListener { confirmDelete() }
            },
        )
    }

    /** Oraliq kunlari soni (`-1` = hammasi → 365 kunlik oynaga tengelash). */
    /**
     * Joriy daraja da'volari, har biriga 1–5 tugma. Baho DARAJANI O'ZGARTIRMAYDI
     * (faqat o'quvchining o'z bahosi; sinxron orqali vebga ham boradi).
     */
    private fun addSelfAssessment(d: com.dadaxon.aienglishacademy.data.AppData) {
        val ctx = requireContext()
        val file = runCatching { container().content.canDo() }.getOrNull() ?: return
        val items = file.statements.filter { it.level == d.settings.currentLevel }
        if (items.isEmpty() || file.labels.size != 5) return
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.progress_self_title)))
        b.rows.addView(Rows.small(ctx, getString(R.string.progress_self_hint)))
        for (st in items) {
            val cur = d.selfAssessment[st.id]?.score
            val card = Rows.card(ctx)
            val box = LinearLayout(ctx).apply {
                orientation = LinearLayout.VERTICAL
                val p = Rows.dp(ctx, 12)
                setPadding(p, p, p, p)
            }
            box.addView(Rows.body(ctx, st.textUz))
            val row = LinearLayout(ctx).apply { orientation = LinearLayout.HORIZONTAL }
            for (score in 1..5) {
                val btn = if (score == cur) Rows.primaryButton(ctx, score.toString()) else Rows.button(ctx, score.toString())
                btn.contentDescription = "$score — ${file.labels[score - 1]}"
                btn.layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
                    marginEnd = Rows.dp(ctx, 4)
                }
                btn.setOnClickListener {
                    container().store.dispatch(StoreAction.SelfAssess(st.id, score, System.currentTimeMillis()))
                    render()
                }
                row.addView(btn)
            }
            box.addView(row)
            box.addView(Rows.small(ctx, cur?.let { file.labels[it - 1] } ?: getString(R.string.progress_self_none)))
            card.addView(box)
            b.rows.addView(card)
        }
    }

    private fun rangeDaysOrAll(): Int = if (rangeDays <= 0) 365 else rangeDays

    private fun attemptsInRange(attempts: List<com.dadaxon.aienglishacademy.data.AttemptRecord>): List<com.dadaxon.aienglishacademy.data.AttemptRecord> {
        if (rangeDays <= 0) return attempts
        val from = System.currentTimeMillis() - rangeDays.toLong() * DAY_MS
        return attempts.filter { it.at >= from }
    }

    /* -------------------------- eksport -------------------------------- */

    private fun exportCsv() {
        val ctx = requireContext()
        val attempts = attemptsInRange(container().store.attempts())
        val sb = StringBuilder()
        sb.append("id,exercise_id,skill,level,correct,partial,difficulty,seconds,source,answer_given,at\r\n")
        for (a in attempts) {
            sb.append(csv(a.id)).append(',')
                .append(csv(a.exerciseId)).append(',')
                .append(csv(a.skill)).append(',')
                .append(csv(a.level)).append(',')
                .append(if (a.correct) 1 else 0).append(',')
                .append(a.partial).append(',')
                .append(a.difficulty).append(',')
                .append(a.secondsSpent).append(',')
                .append(csv(a.source)).append(',')
                .append(csv(a.answerGiven)).append(',')
                .append(a.at).append("\r\n")
        }
        writeAndShare("aea_attempts.csv", sb.toString(), "text/csv")
        android.widget.Toast.makeText(
            ctx,
            getString(R.string.progress_export_done, "aea_attempts.csv"),
            android.widget.Toast.LENGTH_SHORT,
        ).show()
    }

    private fun exportJson() {
        val d = container().store.state.value.data
        val gson = com.google.gson.GsonBuilder().setPrettyPrinting().create()
        val json = gson.toJson(d)
        writeAndShare("aea_data.json", json, "application/json")
        android.widget.Toast.makeText(
            requireContext(),
            getString(R.string.progress_export_done, "aea_data.json"),
            android.widget.Toast.LENGTH_SHORT,
        ).show()
    }

    /** CSV maydonini qo'shtirnoq bilan himoyalash (Excel/Sheets uchun). */
    private fun csv(value: String): String {
        val v = value.replace("\"", "\"\"")
        return if (v.any { it == ',' || it == '\r' || it == '\n' || it == '"' }) "\"$v\"" else v
    }

    /**
     * Fayl `cacheDir`ga yoziladi (tarmoq YO'Q) va FileProvider orqali
     * ulashiladi. Xato bo'lsa `progress_export_error` halol aytiladi.
     */
    private fun writeAndShare(name: String, content: String, mime: String) {
        val ctx = requireContext()
        runCatching {
            val f = File(ctx.cacheDir, name)
            f.writeText(content, Charsets.UTF_8)
            val uri = FileProvider.getUriForFile(ctx, ctx.packageName + ".fileprovider", f)
            val send = Intent(Intent.ACTION_SEND).apply {
                type = mime
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            startActivity(Intent.createChooser(send, getString(R.string.progress_export_share)))
        }.onFailure {
            android.widget.Toast.makeText(ctx, R.string.progress_export_error, android.widget.Toast.LENGTH_SHORT).show()
        }
    }

    /* -------------------------- o'chirish ------------------------------ */

    private fun confirmDelete() {
        val ctx = requireContext()
        MaterialAlertDialogBuilder(ctx)
            // Sarlavha + izoh: `progress_delete_text` — nima yo'qolishini ochiq aytadi
            // (`progress_delete_yes` tugma matni, izoh emas).
            .setTitle(R.string.progress_delete_title)
            .setView(MascotDialog.header(ctx, MascotView.Mood.SAD))
            .setMessage(R.string.progress_delete_text)
            .setNegativeButton(R.string.cancel, null)
            .setPositiveButton(R.string.progress_delete_btn) { _, _ ->
                container().store.dispatch(StoreAction.Reset)
                android.widget.Toast.makeText(ctx, R.string.progress_delete_done, android.widget.Toast.LENGTH_SHORT).show()
                render()
            }
            .show()
    }

    private companion object {
        /** Bir kun — oraliq hisobi uchun (veb: `Date.now() - n*86400000`). */
        const val DAY_MS = 24L * 60L * 60L * 1000L
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _b = null
    }
}
