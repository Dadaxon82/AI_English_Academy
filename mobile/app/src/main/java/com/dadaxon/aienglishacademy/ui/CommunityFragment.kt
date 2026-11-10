package com.dadaxon.aienglishacademy.ui

import android.os.Bundle
import android.text.InputFilter
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.dadaxon.aienglishacademy.R
import com.dadaxon.aienglishacademy.container
import com.dadaxon.aienglishacademy.data.PeerResult
import com.dadaxon.aienglishacademy.databinding.FragmentShellBinding
import com.dadaxon.aienglishacademy.domain.PEER_REPORT_REASONS
import com.dadaxon.aienglishacademy.domain.PeerLimits
import com.dadaxon.aienglishacademy.domain.PeerReview
import com.dadaxon.aienglishacademy.domain.PeerSubmission
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Hamjamiyat tekshiruvi (3-bosqich) — veb `src/pages/Community.tsx`.
 *
 *  1) Yuborish — so'nggi yozma javob yoki nutq MATNI (audio emas), rozilik bilan;
 *  2) Mening javoblarim — kelgan baho/izohlar, noo'rin izohga shikoyat;
 *  3) Boshqalarni tekshirish — server bitta javob TAYINLAYDI, baho 1–5 + izoh
 *     yoki shikoyat.
 *
 * Mehmon rejimida / server ulanmaganda faqat SABAB ko'rsatiladi (soxta
 * ro'yxat yo'q). Tarmoq `Dispatchers.IO`da (`data/PeerRepository.kt`).
 */
class CommunityFragment : Fragment() {

    private var _b: FragmentShellBinding? = null
    private val b get() = requireNotNull(_b)

    private var gate: String? = null
    private var gateChecked = false
    private var message: String? = null
    private var consent = false
    private var mine: List<Pair<PeerSubmission, List<PeerReview>>>? = null
    /** null — hali so'ralmagan; Optional bo'sh — tayinlanadigan javob yo'q. */
    private var task: PeerSubmission? = null
    private var taskEmpty = false
    private var score = 0
    private var comment = ""
    private var busy = false

    private data class Candidate(val key: String, val kind: String, val taskId: String, val level: String, val prompt: String, val body: String, val at: Long)

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, saved: Bundle?): View {
        _b = FragmentShellBinding.inflate(inflater, container, false)
        return b.root
    }

    override fun onViewCreated(view: View, saved: Bundle?) {
        b.shellTitle.setText(R.string.com_title)
        b.shellSubtitle.setText(R.string.com_intro)
        b.shellMascot.setMood(MascotView.Mood.HAPPY)
        b.emptyText.visibility = View.GONE
        render()
        io({ container().peer.ready() }) { r ->
            gateChecked = true
            gate = (r as? PeerResult.Fail)?.reasonUz
            render()
            if (gate == null) loadMine()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _b = null
    }

    /** Tarmoq amali fon oqimida, natija asosiy oqimda (ekran yopilgan bo'lsa — e'tiborsiz). */
    private fun <T> io(work: () -> T, done: (T) -> Unit) {
        viewLifecycleOwner.lifecycleScope.launch {
            val r = withContext(Dispatchers.IO) { work() }
            if (_b != null) done(r)
        }
    }

    private fun loadMine() {
        io({ container().peer.mine() }) { r ->
            when (r) {
                is PeerResult.Ok -> mine = r.data
                is PeerResult.Fail -> message = r.reasonUz
            }
            render()
        }
    }

    private fun candidates(): List<Candidate> {
        val c = container()
        val d = c.store.state.value.data
        val levels = runCatching { c.content.levels() }.getOrElse { emptyList() }
        val writing = levels.flatMap { runCatching { c.content.bundle(it).writing }.getOrElse { emptyList() } }
        val speaking = levels.flatMap { runCatching { c.content.bundle(it).speaking }.getOrElse { emptyList() } }
        val out = ArrayList<Candidate>()
        for (w in d.writing) {
            if (w.text.isBlank()) continue
            val t = writing.firstOrNull { it.id == w.taskId }
            out += Candidate("w:${w.id}", "writing", w.taskId, t?.level ?: d.settings.currentLevel, t?.promptEn ?: "", w.text, w.createdAt)
        }
        for (s in d.speaking) {
            val text = (s.transcript ?: s.textAnswer ?: "").trim()
            if (text.isEmpty()) continue
            val t = speaking.firstOrNull { it.id == s.taskId }
            out += Candidate("s:${s.id}", "speaking", s.taskId, t?.level ?: d.settings.currentLevel, t?.questionEn ?: "", text, s.createdAt)
        }
        return out.sortedByDescending { it.at }.take(10)
    }

    private fun kindUz(kind: String) = getString(if (kind == "speaking") R.string.com_kind_speaking else R.string.com_kind_writing)

    private fun render() {
        if (_b == null) return
        val ctx = requireContext()
        Rows.clear(b.rows)
        if (!gateChecked) {
            b.rows.addView(Rows.small(ctx, getString(R.string.com_checking)))
            return
        }
        gate?.let {
            b.shellMascot.setMood(MascotView.Mood.SAD)
            b.rows.addView(Rows.body(ctx, it))
            return
        }
        message?.let { b.rows.addView(Rows.body(ctx, it)) }

        /* -------- 1) Yuborish -------- */
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.com_send_title)))
        val list = candidates()
        if (list.isEmpty()) {
            b.rows.addView(Rows.small(ctx, getString(R.string.com_send_empty)))
        } else {
            b.rows.addView(
                CheckBox(ctx).apply {
                    text = getString(R.string.com_consent, PeerLimits.DAILY_SUBMISSIONS)
                    isChecked = consent
                    setOnCheckedChangeListener { _, on ->
                        consent = on
                        render()
                    }
                },
            )
            val sent = (mine ?: emptyList()).map { "${it.first.kind}:${it.first.task_id}:${it.first.body.trim()}" }.toSet()
            for (cnd in list) {
                val already = "${cnd.kind}:${cnd.taskId}:${cnd.body.trim()}" in sent
                b.rows.addView(Rows.row(ctx, kindUz(cnd.kind) + " · " + cnd.level + (if (already) " · " + getString(R.string.com_sent) else ""), cnd.body.take(200), null))
                b.rows.addView(
                    Rows.button(ctx, getString(R.string.com_send)).apply {
                        isEnabled = consent && !already && !busy
                        setOnClickListener {
                            busy = true
                            UsageTracker.track(requireContext(), "community_submit", started = true)
                            render()
                            io({ container().peer.submit(cnd.kind, cnd.taskId, cnd.level, cnd.prompt, cnd.body) }) { r ->
                                busy = false
                                if (r is PeerResult.Ok) UsageTracker.track(requireContext(), "community_submit", started = false)
                                message = when (r) {
                                    is PeerResult.Ok -> getString(R.string.com_sent_ok)
                                    is PeerResult.Fail -> r.reasonUz
                                }
                                render()
                                if (r is PeerResult.Ok) loadMine()
                            }
                        }
                    },
                )
            }
        }

        /* -------- 2) Mening javoblarim -------- */
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.com_mine_title)))
        val m = mine
        when {
            m == null -> b.rows.addView(Rows.small(ctx, getString(R.string.com_checking)))
            m.isEmpty() -> b.rows.addView(Rows.small(ctx, getString(R.string.com_mine_empty)))
            else -> for ((s, reviews) in m) {
                val status = if (s.status == "hidden") getString(R.string.com_hidden)
                else getString(R.string.com_reviews, reviews.size, PeerLimits.REVIEWS_PER_SUBMISSION)
                b.rows.addView(Rows.row(ctx, kindUz(s.kind) + " · " + s.level + " · " + status, s.body.take(200), null))
                for (r in reviews) {
                    b.rows.addView(Rows.row(ctx, "★".repeat(r.score) + "☆".repeat(5 - r.score), r.comment, null))
                    b.rows.addView(Rows.button(ctx, getString(R.string.com_report)).apply { setOnClickListener { askReport(null, r.id) } })
                }
                b.rows.addView(
                    Rows.button(ctx, getString(R.string.com_delete)).apply {
                        setOnClickListener {
                            io({ container().peer.delete(s.id) }) { r ->
                                message = if (r is PeerResult.Fail) r.reasonUz else getString(R.string.com_deleted)
                                loadMine()
                            }
                        }
                    },
                )
            }
        }

        /* -------- 3) Boshqalarni tekshirish -------- */
        b.rows.addView(Rows.sectionTitle(ctx, getString(R.string.com_review_title)))
        val t = task
        if (t == null) {
            if (taskEmpty) b.rows.addView(Rows.small(ctx, getString(R.string.com_review_none)))
            b.rows.addView(
                Rows.primaryButton(ctx, getString(R.string.com_claim)).apply {
                    isEnabled = !busy
                    setOnClickListener {
                        busy = true
                        render()
                        io({ container().peer.claim() }) { r ->
                            busy = false
                            when (r) {
                                is PeerResult.Ok -> {
                                    if (r.data != null) UsageTracker.track(requireContext(), "community_review", started = true)
                                    task = r.data
                                    taskEmpty = r.data == null
                                    score = 0
                                    comment = ""
                                }
                                is PeerResult.Fail -> message = r.reasonUz
                            }
                            render()
                        }
                    }
                },
            )
            return
        }
        b.rows.addView(Rows.small(ctx, kindUz(t.kind) + " · " + t.level + if (t.prompt.isNotBlank()) " · " + t.prompt else ""))
        b.rows.addView(Rows.row(ctx, t.body, null, null))
        val scores = LinearLayout(ctx).apply { orientation = LinearLayout.HORIZONTAL }
        for (n in 1..5) {
            val btn = if (n == score) Rows.primaryButton(ctx, n.toString()) else Rows.button(ctx, n.toString())
            btn.contentDescription = "$n / 5"
            btn.layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { marginEnd = Rows.dp(ctx, 4) }
            btn.setOnClickListener {
                score = n
                render()
            }
            scores.addView(btn)
        }
        b.rows.addView(scores)
        val input = EditText(ctx).apply {
            setText(comment)
            hint = getString(R.string.com_comment_hint, PeerLimits.COMMENT_MIN)
            minLines = 3
            filters = arrayOf(InputFilter.LengthFilter(PeerLimits.COMMENT_MAX))
            contentDescription = getString(R.string.com_comment_hint, PeerLimits.COMMENT_MIN)
        }
        b.rows.addView(input)
        b.rows.addView(
            Rows.primaryButton(ctx, getString(R.string.com_review_send)).apply {
                isEnabled = !busy
                setOnClickListener {
                    comment = input.text.toString()
                    busy = true
                    io({ container().peer.review(t.id, score, comment) }) { r ->
                        busy = false
                        when (r) {
                            is PeerResult.Ok -> {
                                UsageTracker.track(requireContext(), "community_review", started = false)
                                message = getString(R.string.com_review_ok)
                                task = null
                                taskEmpty = false
                            }
                            is PeerResult.Fail -> message = r.reasonUz
                        }
                        render()
                    }
                }
            },
        )
        b.rows.addView(Rows.button(ctx, getString(R.string.com_report)).apply { setOnClickListener { askReport(t.id, null) } })
    }

    private fun askReport(submissionId: String?, reviewId: String?) {
        val labels = PEER_REPORT_REASONS.map { it.second }.toTypedArray()
        AlertDialog.Builder(requireContext())
            .setTitle(R.string.com_report)
            .setItems(labels) { _, which ->
                val reason = PEER_REPORT_REASONS[which].first
                io({ container().peer.report(submissionId, reviewId, reason) }) { r ->
                    when (r) {
                        is PeerResult.Ok -> {
                            message = getString(R.string.com_report_ok)
                            if (submissionId != null) task = null
                        }
                        is PeerResult.Fail -> message = r.reasonUz
                    }
                    render()
                    if (reviewId != null && r is PeerResult.Ok) loadMine()
                }
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }
}
