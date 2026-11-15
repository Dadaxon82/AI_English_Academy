package com.dadaxon.aienglishacademy.ui

import android.media.MediaPlayer
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.dadaxon.aienglishacademy.R
import com.dadaxon.aienglishacademy.container
import com.dadaxon.aienglishacademy.data.VocabularyItem
import com.dadaxon.aienglishacademy.databinding.FragmentVocabReviewBinding
import com.dadaxon.aienglishacademy.domain.SrsGrade
import com.dadaxon.aienglishacademy.domain.initialSrsState
import com.dadaxon.aienglishacademy.domain.isDue
import com.dadaxon.aienglishacademy.domain.review
import com.dadaxon.aienglishacademy.domain.sortForReview
import com.dadaxon.aienglishacademy.domain.ReviewEntry
import com.dadaxon.aienglishacademy.store.StoreAction
import com.dadaxon.aienglishacademy.store.StoreState
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * SRS flashcard ekrani — kartani aylantirish, 4 baho, keyingi takror muddati,
 * "Keyingi so'z", talaffuz (TTS yoki APK audio fayli).
 *
 * MANBA: veb `src/pages/Vocabulary.tsx` (`mode = "review"`) — navbat tartibi,
 * seans snapshot'i, "again" kartani navbat oxiriga qaytarishi;
 * `domain/Srs.kt` — baholash hisobi (veb `src/lib/srs.ts`).
 *
 * Holat manbasi — `store.state` (`repeatOnLifecycle(STARTED)`). Ekranda
 * saqlanadigan narsalar FAQAT interfeys holati: kartaning burilishi, navbatdagi
 * o'rin, shu seansda nechta baholanganligi (`UI_KonTRAKTI.md`da ruxsat etilgan
 * istisno). Ma'lumning o'zi (SRS holati, keyingi takror) store'dan o'qiladi.
 *
 * Navbat SEANS SNAPSHOT'I: bir marta yig'iladi — baholash navbatni qayta
 * tartiblamaydi (veb'dagi `queueRef` xulqi). `AGAIN` kartani oxirga qo'shadi.
 *
 * Halol qoida: so'z topilmasa `content_error`, material bo'lmasa `content_empty`,
 * talaffuz vositasi bo'lmasa `vocab_tts_missing`; sonlar (`ex_index`) navbatning
 * haqiqiy o'lchamidan olinadi.
 */
class VocabReviewFragment : Fragment() {

    private var _b: FragmentVocabReviewBinding? = null
    private val b get() = requireNotNull(_b)

    /** Seans snapshot'i — `onViewCreated`da bir marta yig'iladi. */
    private val queue = ArrayList<VocabularyItem>()

    /** Interfeys holati: navbatdagi o'rin, kartaning burilishi, sessiya hisobi. */
    private var pos = 0
    private var flipped = false
    /** Immersion rejimida joriy kartaning tarjimasi ochildimi. */
    private var revealUz = false
    private var graded = 0
    private var known = 0

    /** So'z topilmagan holda ko'rsatiladigan holat (`content_error`). */
    private var contentMissing = false

    /** Talaffuz: TTS dvigateli va (kontentda audio bo'lsa) MediaPlayer. */
    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private var ttsUnavailable = false
    private var player: MediaPlayer? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, saved: Bundle?): View {
        _b = FragmentVocabReviewBinding.inflate(inflater, container, false)
        return b.root
    }

    override fun onViewCreated(view: View, saved: Bundle?) {
        b.vrMascot.setMood(MascotView.Mood.NEUTRAL)
        b.vrTitle.setText(R.string.vocab_card_title)
        b.vrSrsTitle.setText(R.string.vocab_srs_title)
        b.vrFlipHint.setText(R.string.vocab_flip)
        b.vrSpeak.setText(R.string.vocab_speak)
        b.vrNext.setText(R.string.vocab_open_next)

        buildQueue()
        initTts()

        b.vrCard.setOnClickListener { flip() }
        b.vrGradeAgain.setOnClickListener { grade(SrsGrade.AGAIN) }
        b.vrGradeHard.setOnClickListener { grade(SrsGrade.HARD) }
        b.vrGradeGood.setOnClickListener { grade(SrsGrade.GOOD) }
        b.vrGradeEasy.setOnClickListener { grade(SrsGrade.EASY) }
        b.vrSpeak.setOnClickListener { speak(current()) }
        b.vrNext.setOnClickListener { advance() }

        observeStore()
        render(container().store.state.value)
    }

    /** Batafsil ekran sarlavhasi — Nav bergan title (`vocab_card_title` fallback). */
    override fun onResume() {
        super.onResume()
        // Toolbar sarlavhasi `MainActivity` tomonidan `ARG_TITLE` dan olinadi.
    }

    private fun observeStore() {
        val store = container().store
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                store.state.collect { render(it) }
            }
        }
    }

    /* ------------------------- navbat (snapshot) ------------------------- */

    /**
     * Veb `orderForReview`: avval HAQIQATAN muddati yetganlar (xato qilinganlar
     * ustuvor — `domain/Srs.kt::sortForReview`), keyin SRS holati yo'q yangi
     * so'zlar, keyin muddati kelgusida bo'lganlar.
     *
     * ESKI BUG izohi (veb `Vocabulary.tsx`): holati bo'lmagan so'zlar "due"
     * deb sanalmaydi — shuning uchun bu yerda ham faqat mavjud `SrsState`
     * ko'riladi.
     */
    private fun buildQueue() {
        val cr = container().content
        val level = container().store.state.value.data.settings.currentLevel
        val main = runCatching { cr.bundle(level).vocab }.getOrElse { emptyList() }
        val base = if (main.isNotEmpty()) main else runCatching { cr.allVocab() }.getOrElse { emptyList() }
        val pool = (base + runCatching { cr.allGlossaryVocab() }.getOrElse { emptyList() }.filter { it.level == level })
            .distinctBy { it.id }
        if (pool.isEmpty()) return

        val srs = container().store.state.value.data.srs
        val now = System.currentTimeMillis()

        // Muddati yetganlar — faqat HAQIQATAN `SrsState` mavjud so'zlar.
        val dueIds = pool.mapNotNull { v -> srs[v.id]?.takeIf { isDue(it, now) }?.let { v.id } }.toSet()
        val dueEntries = pool.mapNotNull { v -> srs[v.id]?.takeIf { v.id in dueIds }?.let { ReviewEntry(it, v) } }
        val due = sortForReview(dueEntries)
        val fresh = pool.filter { v -> srs[v.id] == null }
        val later = pool.filter { v -> srs[v.id] != null && v.id !in dueIds }
            .sortedBy { srs.getValue(it.id).dueAt }

        queue.clear()
        queue.addAll(due + fresh + later)

        // Lug'at kartasidan ochilgan so'z — navbatning BOSHIDA bo'ladi.
        val wanted = Nav.idArg(this)
        if (wanted != null) {
            val at = queue.indexOfFirst { it.id == wanted }
            if (at > 0) queue.add(0, queue.removeAt(at)) else if (at < 0) {
                val v = runCatching { cr.findVocab(wanted) }.getOrNull()
                if (v != null) queue.add(0, v) else contentMissing = true
            }
        }
    }

    private fun current(): VocabularyItem? = queue.getOrNull(pos)

    /* ------------------------------ render ------------------------------ */

    private fun render(state: StoreState) {
        val ctx = requireContext()

        b.vrEmpty.visibility = View.GONE
        b.vrDone.visibility = View.GONE
        b.vrCard.visibility = View.VISIBLE
        b.vrSpeak.visibility = View.VISIBLE
        b.vrIndex.visibility = View.VISIBLE

        if (contentMissing) {
            b.vrMascot.setMood(MascotView.Mood.SAD)
            b.vrSubtitle.text = Nav.titleArg(this, R.string.vocab_card_title)
            showEmpty(R.string.content_error, card = false, speak = false, index = false)
            return
        }
        if (queue.isEmpty()) {
            b.vrMascot.setMood(MascotView.Mood.SAD)
            b.vrSubtitle.setText(R.string.vocab_srs_title)
            setGradesEnabled(false)
            showEmpty(R.string.content_empty, card = false, speak = false, index = false)
            return
        }

        val v = current()
        if (v == null) {
            // Seans tugadi — hisob shu seansning haqiqiy sonlari.
            b.vrCard.visibility = View.GONE
            b.vrSpeak.visibility = View.GONE
            b.vrNext.visibility = View.GONE
            setGradesEnabled(false)
            b.vrIndex.text = getString(R.string.ex_index, queue.size, queue.size)
            b.vrSubtitle.text = Nav.titleArg(this, R.string.vocab_card_title)
            b.vrMascot.setMood(MascotView.Mood.CHEER)
            b.vrDone.text = getString(R.string.vocab_found, graded) + " · " +
                getString(R.string.progress_words_learned, known)
            b.vrDone.visibility = View.VISIBLE
            return
        }

        b.vrSubtitle.text = listOf(v.level, v.topic, v.pos).filter { it.isNotBlank() }.joinToString(" · ")
        b.vrIndex.text = getString(R.string.ex_index, pos + 1, queue.size)
        b.vrWord.text = v.word
        b.vrIpa.text = v.ipa?.takeIf { it.isNotBlank() }?.let { getString(R.string.vocab_ipa, it) } ?: ""
        // Immersion: tarjima (va o'zbekcha misol) yashirin — inglizcha izoh qoladi; bosilsa ochiladi.
        val hideUz = DevicePrefs.immersion(ctx) && !revealUz
        b.vrTranslation.text = if (hideUz) getString(R.string.imm_reveal) else v.translationUz
        b.vrTranslation.isClickable = hideUz
        b.vrTranslation.setOnClickListener(if (hideUz) View.OnClickListener { revealUz = true; render(container().store.state.value) } else null)
        b.vrExplanation.text = v.explanationEn
        b.vrExample.text = v.exampleEn.takeIf { it.isNotBlank() }?.let { getString(R.string.vocab_example, it) } ?: ""
        b.vrExampleUz.text = if (hideUz) "" else v.exampleUz.takeIf { it.isNotBlank() }?.let { getString(R.string.vocab_example_uz, it) } ?: ""
        b.vrMeta.text = srsLine(ctx, state, v)

        // Burilmaganda javob yashirinadi va baholash so'ralmaydi (veb xulqi).
        b.vrBack.visibility = if (flipped) View.VISIBLE else View.GONE
        b.vrFlipHint.visibility = if (flipped) View.GONE else View.VISIBLE
        setGradesEnabled(flipped)

        // Bahodan keyin ham "Keyingi so'z" ko'rinadi — aks holda foydalanuvchi
        // keyingi kartochkaga o'ta olmas edi.
        b.vrNext.visibility =
            if (flipped || !b.vrNextReview.text.isNullOrBlank()) View.VISIBLE else View.GONE
    }

    /** `vocab_next_review` — mavjud SRS holatidan (yoki holat bo'lmasa "yangi"). */
    private fun srsLine(ctx: android.content.Context, state: StoreState, v: VocabularyItem): String {
        val st = state.data.srs[v.id] ?: return getString(R.string.vocab_filter_new)
        val now = System.currentTimeMillis()
        val name = when {
            isDue(st, now) -> getString(R.string.vocab_filter_due)
            st.learnedAt != null -> getString(R.string.vocab_filter_learned)
            else -> getString(R.string.vocab_filter_new)
        }
        return name + " · " + whenLabel(st.dueAt, now)
    }

    /**
     * Muddatmatn: "Bugun" (`vocab_next_review_today`) yoki sana
     * (`vocab_next_review`). Veb `whenLabel`ning mobil nusxasi — mavjud
     * stringlar bilan, yangi kalit qo'shilmaydi.
     */
    private fun whenLabel(dueAt: Long, now: Long): String {
        if (dueAt <= now) return getString(R.string.vocab_next_review_today)
        val date = SimpleDateFormat("dd.MM.yyyy HH:mm", Locale.getDefault()).format(Date(dueAt))
        return getString(R.string.vocab_next_review, date)
    }

    private fun showEmpty(res: Int, card: Boolean, speak: Boolean, index: Boolean) {
        b.vrCard.visibility = if (card) View.VISIBLE else View.GONE
        b.vrSpeak.visibility = if (speak) View.VISIBLE else View.GONE
        b.vrIndex.visibility = if (index) View.VISIBLE else View.GONE
        b.vrEmpty.setText(res)
        b.vrEmpty.visibility = View.VISIBLE
        b.vrNext.visibility = View.GONE
        b.vrNextReview.text = ""
    }

    private fun setGradesEnabled(on: Boolean) {
        b.vrGradeRow1.visibility = if (on) View.VISIBLE else View.GONE
        b.vrGradeRow2.visibility = if (on) View.VISIBLE else View.GONE
        b.vrSrsTitle.visibility = if (on) View.VISIBLE else View.GONE
    }

    /* -------------------------- interfeys amallari ----------------------- */

    private fun flip() {
        if (current() == null) return
        flipped = !flipped
        render(container().store.state.value)
    }

    /**
     * Baho → `StoreAction.Srs`. Keyingi takror muddati store'dagi HISOB bilan
     * ko'rsatiladi: avval mavjud holatga `review(...)` qo'llanadi (dispatch
     * bilan bir xil hisob), so'ng natija store'dan qayta o'qiladi.
     */
    private fun grade(g: SrsGrade) {
        val v = current() ?: return
        val prev = container().store.state.value.data.srs[v.id] ?: initialSrsState()
        val next = review(prev, g)

        container().store.dispatch(StoreAction.Srs(v.id, g))

        graded += 1
        if (g == SrsGrade.GOOD || g == SrsGrade.EASY) known += 1
        b.vrNextReview.text = whenLabel(next.dueAt, System.currentTimeMillis())

        // Veb xulqi: "bilmadim" kartani seans OXIRIGA qaytaradi — navbatda
        // allaqachon keyin turgan bo'lsa qayta qo'shilmaydi (takror sanamaslik).
        val scheduledLater = (pos + 1 until queue.size).any { queue[it].id == v.id }
        if (g == SrsGrade.AGAIN && !scheduledLater) queue.add(v)

        b.vrMascot.setMood(
            when (g) {
                SrsGrade.AGAIN -> MascotView.Mood.SAD
                SrsGrade.HARD -> MascotView.Mood.NEUTRAL
                SrsGrade.GOOD -> MascotView.Mood.HAPPY
                SrsGrade.EASY -> MascotView.Mood.CHEER
            },
        )
        flipped = false
        revealUz = false
        render(container().store.state.value)
    }

    private fun advance() {
        if (queue.isEmpty()) return
        revealUz = false
        pos = (pos + 1).coerceAtMost(queue.size)
        flipped = false
        b.vrNextReview.text = ""
        releasePlayer()
        render(container().store.state.value)
    }

    /* ------------------------------ talaffuz ---------------------------- */

    private fun initTts() {
        if (tts != null) return
        val app = requireContext().applicationContext
        // Dvigatel tayyor bo'lish callback'ida faqat `status` beriladi —
        // lokal `made` lambda ichida hali e'lon qilinmagan (Kotlin xatosi),
        // shuning uchun til sozlamasi `speak()` ichida qo'yiladi.
        val made = TextToSpeech(app) { status ->
            ttsReady = status == TextToSpeech.SUCCESS
            if (!ttsReady) ttsUnavailable = true
        }
        tts = made
    }

    private fun setEnglish(engine: TextToSpeech): Boolean {
        val res = runCatching { engine.setLanguage(Locale.ENGLISH) }.getOrNull() ?: return false
        return res != TextToSpeech.LANG_MISSING_DATA && res != TextToSpeech.LANG_NOT_SUPPORTED
    }

    /**
     * Talaffuz. Kontentda audio fayl bo'lsa (`pronunciation.src`) — APK
     * asset'idan `MediaPlayer` (`ListeningFragment`dagi yo'l); bo'lmasa
     * `TextToSpeech`. Ikkalasi ham bo'lmasa `vocab_tts_missing` halol aytiladi.
     */
    private fun speak(v: VocabularyItem?) {
        if (v == null) return
        val ctx = requireContext()
        playAssetAudio(v)?.let { return }

        val engine = tts
        // Til sozlamasi shu yerda: init callback'ida `engine` berilmaydi.
        if (engine == null || !ttsReady || !setEnglish(engine)) {
            ttsUnavailable = true
            b.vrSpeak.setText(R.string.vocab_tts_missing)
            Toast.makeText(ctx, R.string.vocab_tts_missing, Toast.LENGTH_SHORT).show()
            return
        }
        val text = v.pronunciation?.ttsText?.takeIf { it.isNotBlank() } ?: v.word
        val ok = runCatching { engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, "review-" + v.id) }.getOrDefault(-1)
        if (ok != TextToSpeech.SUCCESS) {
            ttsReady = false
            ttsUnavailable = true
            b.vrSpeak.setText(R.string.vocab_tts_missing)
            Toast.makeText(ctx, R.string.vocab_tts_missing, Toast.LENGTH_SHORT).show()
        }
    }

    /** `audio-file` turi va `src` bo'lsa —Asset'dan ijro. Bo'lmasa `null`. */
    private fun playAssetAudio(v: VocabularyItem): Boolean? {
        val src = v.pronunciation?.src?.takeIf { it.isNotBlank() } ?: return null
        releasePlayer()
        // `src` veb yo'li (`/audio/a.wav`) — APK asset'i `audio/a.wav`.
        val assetPath = "audio/" + src.trimEnd('/').substringAfterLast('/')
        return try {
            val fd = requireContext().assets.openFd(assetPath)
            val made = MediaPlayer()
            try {
                made.setDataSource(fd.fileDescriptor, fd.startOffset, fd.length)
                made.prepare()
            } finally {
                fd.close()
            }
            made.setOnCompletionListener { releasePlayer() }
            made.setOnErrorListener { _, _, _ -> releasePlayer(); true }
            player = made
            made.start()
            true
        } catch (err: Exception) {
            // Fayl yo'q — ovoz ixtir qilinmaydi, TTS zaxirasi sinaladi.
            releasePlayer()
            null
        }
    }

    private fun releasePlayer() {
        val made = player
        player = null
        runCatching { made?.stop() }
        runCatching { made?.release() }
    }

    /* --------------------------- yopish tartibi -------------------------- */

    override fun onDestroyView() {
        super.onDestroyView()
        releasePlayer()
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
