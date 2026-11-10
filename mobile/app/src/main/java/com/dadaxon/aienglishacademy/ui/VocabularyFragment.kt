package com.dadaxon.aienglishacademy.ui

import android.content.Context
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.dadaxon.aienglishacademy.R
import com.dadaxon.aienglishacademy.container
import com.dadaxon.aienglishacademy.data.Levels
import com.dadaxon.aienglishacademy.data.SrsState
import com.dadaxon.aienglishacademy.data.VocabularyItem
import com.dadaxon.aienglishacademy.databinding.FragmentVocabularyBinding
import com.dadaxon.aienglishacademy.domain.isDue
import com.dadaxon.aienglishacademy.store.StoreAction
import com.dadaxon.aienglishacademy.store.StoreState
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Locale

/**
 * Lug'at ekrani — so'zlar ro'yxati + qidiruv + SRS filtrlari.
 *
 * MANBA: veb `src/pages/Vocabulary.tsx` (`mode = "browse"` bo'limi) — havuz
 * tarkibi, qidiruv (`flat()` bilan so'z YOKI tarjima), daraja filtri va
 * "takror navbatida" hisobi shu fayldagi qoidalar bilan bir xil. AI/tarmoq
 * ishtirok ETMAYDI: faqat APK asset'lari (`container().content`) va
 * `domain/Srs.kt` qoidalari.
 *
 * Holat manbasi — `store.state` (StateFlow): `repeatOnLifecycle(STARTED)` bilan
 * yig'iladi, ekranda parallel ma'lumot holati saqlanmaydi. Ekranda saqlangan
 * yagona narsa — foydalanuvchining O'Z tanlovi (filtr, qidiruv matni, daraja
 * filtri), chunki bu interfeys holati (`UI_KONTRAKTI.md`).
 *
 * Halol qoida: material bo'lmasa `content_empty`, filtr bo'yicha bo'sh bo'lsa
 * `vocab_empty` deyiladi; sonlar (`vocab_found`, statistika plitkalari)
 * hisoblanadi, ixtir qilinmaydi.
 */
class VocabularyFragment : Fragment() {

    private var _b: FragmentVocabularyBinding? = null
    private val b get() = requireNotNull(_b)

    /** UI tanlovi — ma'lumot holati EMAS (kontraktdagi ruxsat etilgan istisno). */
    private enum class VocabFilter { ALL, NEW, DUE, LEARNED }

    /** Ro'yxat oxiridagi "Ko'proq ko'rsatish" tugmasining belgisi. */
    private companion object {
        /** Bir bo'lakdagi kartalar soni (`shown` izohidagi o'lchovga qarab). */
        const val PAGE = 12
        const val MORE_TAG = "aea_vocab_more"
    }

    private var filter = VocabFilter.ALL
    private var query = ""
    private var levelFilter: String? = null

    /**
     * Bir zamlda chiziladigan kartalar soni.
     *
     * SABAB (emulatorda o'lchangan): A1 havuzida 117 ta so'z bor, har karta
     * ~8 ta View (matn + 2 tugma). Hammasini birga qurish asosiy o'qimini
     * ~10 s band qildi — tizim "is javob bermayapti" (ANR) deb yozdi, dalil:
     * `/data/anr/anr_2026-11-05-17-43-31-296` — `main` o'qimi
     * `Rows.small → VocabularyFragment.wordCard` ichida Runnable.
     * Veb sahifasi buni React ro'yxati bilan yechadi; mobil to'g'ri yechimi —
     * bo'laklab chizish (`Lazy`/RecyclerView mantiqi).
     */
    private var shown = PAGE

    /** Sig'imda HAQIQQIY qurilgan kartalar soni (bo'lak qo'shish shundan boshlanadi). */
    private var rendered = 0

    /**
     * Chizilgan bo'lakning kaliti (filtr + qidiruv + daraja). Kalit o'zgarsa
     * ro'yxat boshidan sanaladi — qaysi o'zgarish bo'lishidan qat'iy
     * (`pick`, qidiruv, daraja tugmasi), shuning uchun har bir joyda alohida
     * "tozalash" chaqirilmaydi: bittasi ham unutib qo'yilmasligi uchun.
     */
    private var pageKey = ""

    /** Talaffuz dvigateli — `vocab_speak`; bo'lmasa `vocab_tts_missing`. */
    private var tts: TextToSpeech? = null
    private var ttsReady = false

    /** TTS init javobi — tugmalar holati shundan yangilanadi (holat ixtir emas). */
    private var ttsUnavailable = false

    /** Filtr/matn o'zgarganda so'nggi yig'ilgan holat bilan qayta chizish. */
    private fun refresh() = render(container().store.state.value)

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, saved: Bundle?): View {
        _b = FragmentVocabularyBinding.inflate(inflater, container, false)
        return b.root
    }

    override fun onViewCreated(view: View, saved: Bundle?) {
        b.vocabMascot.setMood(MascotView.Mood.NEUTRAL)
        b.vocabMascot.setAvatarMode(true)

        // Qidiruv — har belgida qayta hisob (filtr tanlovi kabi).
        b.vocabSearchField.addTextChangedListener(watcher)
        if (query.isNotEmpty()) b.vocabSearchField.setText(query)

        b.vocabFilterAll.setOnClickListener { pick(VocabFilter.ALL) }
        b.vocabFilterNew.setOnClickListener { pick(VocabFilter.NEW) }
        b.vocabFilterDue.setOnClickListener { pick(VocabFilter.DUE) }
        b.vocabFilterLearned.setOnClickListener { pick(VocabFilter.LEARNED) }

        initTts()
        observeStore()
        render(container().store.state.value)
    }

    /** Yagona holat oqimi — ekran qayta tiklansa ham shu yerdan chiziladi. */
    private fun observeStore() {
        val store = container().store
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                store.state.collect { render(it) }
            }
        }
    }

    private val watcher = object : TextWatcher {
        override fun beforeTextChanged(s: CharSequence?, st: Int, c: Int, a: Int) = Unit
        override fun onTextChanged(s: CharSequence?, st: Int, c: Int, a: Int) = Unit
        override fun afterTextChanged(s: Editable?) {
            query = s?.toString() ?: ""
            refresh()
        }
    }

    /** Bir martalik filtr: faol filtrni qayta bosish — hammasini tozalash. */
    private fun pick(f: VocabFilter) {
        filter = if (filter == f && f != VocabFilter.ALL) VocabFilter.ALL else f
        refresh()
    }

    /* ------------------------------ render ------------------------------ */

    private fun render(state: StoreState) {
        val ctx = requireContext()
        val srs = state.data.srs
        val level = state.data.settings.currentLevel

        val pool = poolFor(level)
        val filtered = filterPool(pool, srs)

        b.vocabTitle.setText(R.string.vocab_title)
        b.vocabSubtitle.text = level + " · " + getString(R.string.vocab_found, pool.size)

        // Filtrlar — faol belgisi "•" (matn manbadan qayta olinadi, aralashmaydi).
        label(b.vocabFilterAll, R.string.vocab_filter_all, filter == VocabFilter.ALL)
        label(b.vocabFilterNew, R.string.vocab_filter_new, filter == VocabFilter.NEW)
        label(b.vocabFilterDue, R.string.vocab_filter_due, filter == VocabFilter.DUE)
        label(b.vocabFilterLearned, R.string.vocab_filter_learned, filter == VocabFilter.LEARNED)

        Rows.clear(b.vocabRows)
        Rows.clear(b.vocabLevelRow)
        b.vocabEmpty.visibility = View.GONE

        if (pool.isEmpty()) {
            // Material yo'q — son/holat ixtir qilinmaydi.
            b.vocabCount.text = ""
            b.vocabMascot.setMood(MascotView.Mood.SAD)
            b.vocabEmpty.setText(R.string.content_empty)
            b.vocabEmpty.visibility = View.VISIBLE
            return
        }

        // Statistika — faqat shu havuz bo'yicha HISOBLANGAN sonlar
        // (`domain/Srs.kt`). ESKI BUG izohi (veb `Vocabulary.tsx`): SRS holati
        // BO'LMAGAN so'zlar "takror navbatida" deb sanalmasligi kerak — aks
        // holda raqam ro'yxat bilan kelishmaydi.
        val now = System.currentTimeMillis()
        b.vocabRows.addView(
            Rows.statRow(
                ctx,
                Rows.statTile(
                    ctx,
                    pool.count { v -> srs[v.id]?.let { isDue(it, now) } == true }.toString(),
                    getString(R.string.vocab_filter_due),
                    getString(R.string.vocab_found, pool.size),
                ),
                Rows.statTile(
                    ctx,
                    pool.count { v -> srs[v.id]?.learnedAt != null }.toString(),
                    getString(R.string.vocab_filter_learned),
                ),
                Rows.statTile(
                    ctx,
                    pool.count { v -> srs[v.id] == null }.toString(),
                    getString(R.string.vocab_filter_new),
                ),
            ),
        )

        renderLevelChips(ctx, pool)

        b.vocabCount.text = getString(R.string.vocab_found, filtered.size)
        if (filtered.isEmpty()) {
            b.vocabMascot.setMood(MascotView.Mood.SAD)
            b.vocabEmpty.setText(R.string.vocab_empty)
            b.vocabEmpty.visibility = View.VISIBLE
            return
        }
        b.vocabMascot.setMood(if (filter == VocabFilter.DUE) MascotView.Mood.NEUTRAL else MascotView.Mood.HAPPY)

        // ---- Bo'laklab chizish (yuqoridagi `shown` izohi) ----
        renderCards(ctx, filtered, srs)
    }

    /**
     * Kartalarni faqat YANGI bo'lak uchun quradi.
     *
     * `pageKey` o'zgarasa (filtr/qidiruv/daraja) — sig'im tozalanadi va
     * boshidan sanaladi; o'zgarmasa — `rendered` dan `shown` gacha bo'lgan
     * qo'shimcha qismgina qo'shiladi. Shu sababli "Ko'proq ko'rsatish"
     * bosilganda 24 emas, 12 ta karta quriladi.
     */
    private fun renderCards(ctx: Context, filtered: List<VocabularyItem>, srs: Map<String, SrsState>) {
        val key = "$filter|$query|$levelFilter"
        if (key != pageKey) {
            pageKey = key
            shown = PAGE
            rendered = 0
            Rows.clear(b.vocabCards)
        }
        // Oldingi "Ko'proq ko'rsatish" tugmasi — yangi bo'lak ostida qolmasligi
        // uchun avval olib tashlanadi (`tag` orqali: boshqa View adashmaydi).
        val last = b.vocabCards.getChildAt(b.vocabCards.childCount - 1)
        if (last?.tag == MORE_TAG) b.vocabCards.removeView(last)

        val take = shown.coerceIn(1, filtered.size)
        for (i in rendered until take) {
            val v = filtered[i]
            b.vocabCards.addView(wordCard(ctx, v, srs[v.id]))
        }
        rendered = take

        if (take < filtered.size) {
            b.vocabCount.text = getString(R.string.vocab_shown, take, filtered.size)
            b.vocabCards.addView(
                Rows.button(ctx, getString(R.string.vocab_show_more, filtered.size - take)).apply {
                    tag = MORE_TAG
                    setOnClickListener {
                        shown += PAGE
                        render(container().store.state.value)
                    }
                },
            )
        }
    }

    private fun label(btn: MaterialButton, res: Int, active: Boolean) {
        btn.text = (if (active) "• " else "") + getString(res)
    }

    /**
     * Daraja tugmalari — havuzda HAQIQATAN mavjud darajalar (`Levels.ALL`
     * bo'yicha tartiblanadi). Soni kontentdan olinadi, ixtir qilinmaydi.
     */
    private fun renderLevelChips(ctx: Context, pool: List<VocabularyItem>) {
        val present = Levels.ALL.filter { lvl -> pool.any { it.level == lvl } }
        for (lvl in present.ifEmpty { pool.map { it.level }.distinct() }) {
            val btn = Rows.button(ctx, (if (levelFilter == lvl) "• " else "") + lvl)
            btn.layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply {
                marginEnd = Rows.dp(ctx, 8)
            }
            btn.setOnClickListener {
                levelFilter = if (levelFilter == lvl) null else lvl
                refresh()
            }
            b.vocabLevelRow.addView(btn)
        }
    }

    /* ------------------------------ kontent ----------------------------- */

    /**
     * So'zlar havizi (veb `Vocabulary.tsx`): daraja to'plami; bo'sh bo'lsa butun
     * lug'at. Reading'da "Lug'atga" saqlangan glossariy so'zlari ham shu
     * havuzga qo'shiladi — aks holda saqlash ma'nosiz qolardi (ESKI KAMCHILIK).
     */
    private fun poolFor(level: String): List<VocabularyItem> {
        val cr = container().content
        val main = runCatching { cr.bundle(level).vocab }.getOrElse { emptyList() }
        val base = if (main.isNotEmpty()) main else runCatching { cr.allVocab() }.getOrElse { emptyList() }
        val extra = runCatching { cr.allGlossaryVocab() }.getOrElse { emptyList() }.filter { it.level == level }
        return (base + extra).distinctBy { it.id }
    }

    /** Qidiruv + filtr + daraja; tartib — so'z bo'yicha (vebdagi `sort`). */
    private fun filterPool(pool: List<VocabularyItem>, srs: Map<String, SrsState>): List<VocabularyItem> {
        val needle = flat(query)
        val now = System.currentTimeMillis()
        return pool
            .filter { levelFilter == null || it.level == levelFilter }
            .filter { v ->
                if (needle.isEmpty()) return@filter true
                flat(v.word).contains(needle) || flat(v.translationUz).contains(needle)
            }
            .filter { v ->
                val st = srs[v.id]
                when (filter) {
                    // Holati yo'q so'z — "yangi".
                    VocabFilter.NEW -> st == null
                    // Faqat HAQIQATAN jadvalga kirgan va muddati yetganlar.
                    VocabFilter.DUE -> st != null && isDue(st, now)
                    VocabFilter.LEARNED -> st != null && st.learnedAt != null
                    VocabFilter.ALL -> true
                }
            }
            .sortedWith(compareBy(String.CASE_INSENSITIVE_ORDER) { it.word })
    }

    /** Veb `flat()`: apostroflar olib tashlanadi, qolgan belgilar bo'shliq. */
    private fun flat(s: String): String = s.lowercase(Locale.ROOT)
        .replace("[‘’`´ʻ]".toRegex(), "")
        .replace("[^a-z0-9\\s-]".toRegex(), " ")
        .replace("\\s+".toRegex(), " ")
        .trim()

    /* ------------------------------ kartochka --------------------------- */

    /**
     * Bitta so'z kartasi. KARTANI BOSISH — flashcard ekraniga o'tadi
     * (`Nav.open` orqali, faqat id): kontent obyekti bundle'da tashlanmaydi.
     */
    private fun wordCard(ctx: Context, v: VocabularyItem, st: SrsState?): MaterialCardView {
        val card = Rows.card(ctx)
        card.isClickable = true
        card.contentDescription = v.word
        card.setOnClickListener { Nav.open(this, R.id.vocabReviewFragment, v.id, v.word) }

        val box = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
            )
        }
        box.addView(labelled(ctx, v.word, R.style.Text_Aea_Body, true))
        v.ipa?.takeIf { it.isNotBlank() }?.let { box.addView(labelled(ctx, getString(R.string.vocab_ipa, it), R.style.Text_Aea_Small, false)) }
        // Immersion: tarjima yashirin, bosilsa ochiladi (veb `UzTranslation`).
        if (DevicePrefs.immersion(ctx)) {
            box.addView(
                labelled(ctx, getString(R.string.imm_reveal), R.style.Text_Aea_Small, true).apply {
                    isClickable = true
                    isFocusable = true
                    setOnClickListener { text = v.translationUz; setTextAppearance(R.style.Text_Aea_Body); isClickable = false }
                },
            )
        } else {
            box.addView(labelled(ctx, v.translationUz, R.style.Text_Aea_Body, false))
        }
        if (v.explanationEn.isNotBlank()) box.addView(Rows.small(ctx, v.explanationEn))

        // Misola jumlalar — kontentda yozilgan bo'lsa chiziladi; bo'lmasa
        // satr yo'q (matn ixtir qilinmaydi).
        if (v.exampleEn.isNotBlank()) box.addView(Rows.small(ctx, getString(R.string.vocab_example, v.exampleEn)))
        if (v.exampleUz.isNotBlank()) box.addView(Rows.small(ctx, getString(R.string.vocab_example_uz, v.exampleUz)))

        // Meta — kontentda yozilgan (level / so'z turi / mavzu).
        box.addView(Rows.small(ctx, listOf(v.level, v.pos, v.topic).filter { it.isNotBlank() }.joinToString(" · ")))

        // SRS holati — mavjud stringlar (`vocab_filter_*`) + hisoblangan sana.
        box.addView(Rows.small(ctx, srsLine(st)))

        // Talaffuz va "Lug'atimga saqlash" (saqlash — `SrsAdd`, xato baho EMAS).
        val actions = LinearLayout(ctx).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
            ).apply { topMargin = Rows.dp(ctx, 8) }
        }
        val speakBtn = miniButton(ctx, if (ttsUnavailable) getString(R.string.vocab_tts_missing) else getString(R.string.vocab_speak), !ttsUnavailable)
        speakBtn.setOnClickListener { speak(v) }
        actions.addView(speakBtn)
        if (st == null) {
            val saveBtn = miniButton(ctx, getString(R.string.vocab_save), true)
            saveBtn.setOnClickListener {
                container().store.dispatch(StoreAction.SrsAdd(v.id))
                Toast.makeText(ctx, R.string.vocab_saved, Toast.LENGTH_SHORT).show()
            }
            actions.addView(saveBtn)
        }
        box.addView(actions)

        card.addView(box)
        return card
    }

    private fun miniButton(ctx: Context, text: CharSequence, enabled: Boolean): MaterialButton {
        val made = Rows.button(ctx, text)
        made.layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply {
            marginEnd = Rows.dp(ctx, 8)
        }
        made.isEnabled = enabled
        return made
    }

    /** SRS qatori: holat nomi + keyingi takror sanasi (yo'q bo'lsa — "yangi"). */
    private fun srsLine(st: SrsState?): String {
        if (st == null) return getString(R.string.vocab_filter_new)
        val now = System.currentTimeMillis()
        val name = when {
            isDue(st, now) -> getString(R.string.vocab_filter_due)
            st.learnedAt != null -> getString(R.string.vocab_filter_learned)
            else -> getString(R.string.vocab_filter_new)
        }
        if (st.dueAt <= now) return name + " · " + getString(R.string.vocab_next_review_today)
        val date = SimpleDateFormat("dd.MM.yyyy", Locale.getDefault()).format(java.util.Date(st.dueAt))
        return name + " · " + getString(R.string.vocab_next_review, date)
    }

    /** Uslub + (ixtiyoriy) qalin matn — `Rows`da bunday kombinasiya yo'q. */
    private fun labelled(ctx: Context, text: CharSequence, style: Int, bold: Boolean) =
        android.widget.TextView(ctx).apply {
            setTextAppearance(style)
            this.text = text
            if (bold) setTypeface(typeface, android.graphics.Typeface.BOLD)
        }

    /* ------------------------------ talaffuz ---------------------------- */

    /** `TextToSpeech` — bir marta ochiladi; tili ENGLISH (kontent inglizcha). */
    private fun initTts() {
        if (tts != null) return
        val ctx = requireContext().applicationContext
        // Dvigatel holati init回调da `status` bilan keladi; til sozlamasi esa
        // birinchi talaffuzda qo'yiladi (lambda ichida `made` hali e'lon
        // qilinmagan — shuning uchun callback faqat statusni o'qiydi).
        val made = TextToSpeech(ctx) { status ->
            ttsReady = status == TextToSpeech.SUCCESS
            if (!ttsReady) {
                ttsUnavailable = true
                if (_b != null) refresh()
            }
        }
        tts = made
    }

    private fun setEnglish(engine: TextToSpeech): Boolean {
        val res = runCatching { engine.setLanguage(Locale.ENGLISH) }.getOrNull() ?: return false
        return res != TextToSpeech.LANG_MISSING_DATA && res != TextToSpeech.LANG_NOT_SUPPORTED
    }

    /**
     * Talaffuz. Dvigatel bo'lmasa yoki til yo'q bo'lsa — `vocab_tts_missing`
     * halol aytiladi (ovoz ixtir qilinmaydi, "bajarildi" deb yozilmaydi).
     */
    private fun speak(v: VocabularyItem) {
        val engine = tts
        // Til sozlamasi shu yerda qo'yiladi: init callback'ida `engine`
        // berilmaydi, `tts` maydoni esa callback paytida hali yozilmagan.
        if (engine == null || !ttsReady || !setEnglish(engine)) {
            ttsUnavailable = true
            Toast.makeText(requireContext(), R.string.vocab_tts_missing, Toast.LENGTH_SHORT).show()
            refresh()
            return
        }
        val text = v.pronunciation?.ttsText?.takeIf { it.isNotBlank() } ?: v.word
        val ok = runCatching { engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, "vocab-" + v.id) }.getOrDefault(-1)
        if (ok != TextToSpeech.SUCCESS) {
            ttsReady = false
            ttsUnavailable = true
            Toast.makeText(requireContext(), R.string.vocab_tts_missing, Toast.LENGTH_SHORT).show()
            refresh()
        }
    }

    /* --------------------------- yopish tartibi -------------------------- */

    override fun onDestroyView() {
        super.onDestroyView()
        _b?.vocabSearchField?.removeTextChangedListener(watcher)
        // Ekran parchalansa talaffuz to'xtaydi (o'qib bo'lmagan gap qolmasin).
        runCatching { tts?.stop() }
        _b = null
    }

    override fun onDestroy() {
        super.onDestroy()
        // Dvigatel bilan ish tugadi — manba qaytariladi.
        val made = tts
        tts = null
        ttsReady = false
        runCatching { made?.shutdown() }
    }
}
