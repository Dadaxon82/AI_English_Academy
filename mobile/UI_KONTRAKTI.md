# UI qatlami shartnomasi (AI English Academy — Android)

Bu fayl ekranlarni yozuvchilar uchun **yagona kontrakt**. Kod yozishdan oldin
o'qing; agarchi qarama-qarshilik bo'lsa shu fayl va mavjud `AppStore.kt`,
`ContentRepository.kt` asos olinadi.

## Umumiy qoidalar

- Til: izohlar O'zbek tilida (texnik atamalar inglizcha). `TODO()`,
  `Placeholder`, `not implemented` — **taqiqlangan**. Hech qanday tarmoq
  so'rovi unit test talab qilmaydi; UI sinovlari shart emas (gradle
  `:app:assembleDebug` kompilyatsiyasi tekshiriladi).
- **Har ekranda qahramon** (`com.dadaxon.aienglishacademy.ui.MascotView` —
  `Ai-English.jpg` dan yasalgan `drawable-nodpi/mascot.png`). 3-vazifa talabi.
- Ma'lumot-manba — **faqat** `container().store` (`AppExt.kt` da
  `Fragment.container()`), mahalliy saqlagich `container().local`,
  kontent `container().content`. Ekran o'zida holat saqlanmaydi (faqt UI).
- Sonlar **hech qachon ixtir qilinmaydi**: kontent/Hisobot yo'q bo'lsa
  `empty_generic` / `content_error` kabi mavjud string ishlatiladi.
- Kontent id orqali o'qiladi (obyekt bundle'da tashlanmaydi) — `Nav.kt`.
- **Uzoq ro'yxatlar BO'LAKLAB chiziladi.** 20+ elementli ro'yxatni bitta `for`
  sikli bilan qatorga qo'shish TAQIQLANGAN: emulatorda ANR yozilgan
  (`/data/anr/anr_2026-11-05-17-43-31-296` — Lug'atdagi 117 karta main o'qimini
  ~10 s band qilgan). Andoza: `VocabularyFragment` — `PAGE = 12`,
  `rendered until shown.coerceIn(...)`, "Ko'proq ko'rsatish" tugmasi va
  ochiq hisob (`vocab_shown` — `12 / 117 ta ko'rsatilmoqda`). Kartalar
  sig'imi statistika sig'imidan ALOHIDA bo'lsin (`vocabCards` vs `vocabRows`),
  aks holda bo'lak qo'shishda `Rows.clear` hammasini qayta quradi.
  Qayta tekshiruv (2026-11-05, emulator): ANR yo'q, `dumpsys gfxinfo`
  95-persent kadr 57 ms, bo'lak almashinuvi ~1 s.

## Mavjud resurslar (boshqa string/id IXTIRO QILMANG)

- Mavzular: `Theme.Aea`, uslublar `Widget.Aea.Card`, `Widget.Aea.Card.Flat`,
  `Text.Aea.Title|Section|Body|Small|Number`, `Widget.Aea.Button|Button.Text|Button.Outlined`,
  `Widget.Aea.Chip`, `Widget.Aea.Field`.
- Ölçov: `screen_pad 16dp, gap_s 8dp, gap_m 12dp, gap_l 16dp, card_radius 16dp,
  ring_size 132dp, mascot_sm 40dp, mascot_md 64dp, mascot_lg 96dp, mascot_hero 160dp,
  weekbar_height 72dp, skillbar_height 10dp, text_* ...`.
- Ranglar: `colors.xml` (`brand_blue, accent, ok, warn, err, streak, white…`).
  Tungi rejim `?attr/colorOnSurface` / `?attr/colorSurface` orqali.
- Stringlar: `res/values/strings.xml` (+ `strings_extra.xml`) — **barchasi
  yozilgan**. Kalit nomlari ekran bo'limlariga ajratilgan:
  `vocab_*`, `grammar_*`, `reading_*`, `listening_*`, `writing_*`,
  `speaking_*`, `mock_*`, `errlog_*`, `progress_*`, `settings_*`, `ex_*`,
  `skill_*`, `wd_*`, `dash_*`, `path_*`, `onb_*`, `auth_*`, `sync_*`.
  Kerakli kalit bo'lmasa — **mavjud boshqa kalitni tanlang** (masalan
  `empty_generic`), yangisini qo'shmang (parallel tahrir çatishadi).
- Yordamchi: `ui/Rows.kt` — `Rows.row/sectionTitle/body/small/empty/
  statTile/statRow/skillBar/weekBar/button/primaryButton/card/clear/dp/skillName`.
  Ro'yxat qatorlarini shu yerdan yarating.

## Ekran skeleti

Listali ekranlar `res/layout/fragment_shell.xml` dan foydalanadi:

```kotlin
class XFragment : Fragment() {
    private var _b: FragmentShellBinding? = null
    private val b get() = requireNotNull(_b)

    override fun onCreateView(i: LayoutInflater, c: ViewGroup?, s: Bundle?) =
        FragmentShellBinding.inflate(i, c, s).also { _b = it }.root

    override fun onViewCreated(v: View, s: Bundle?) {
        b.shellTitle.text = Nav.titleArg(this, R.string.x_title)
        b.shellMascot.setMood(MascotView.Mood.HAPPY)
        render()                       // store.state collect bilan ham
    }
}
```

`shellRows` idsi `binding.rows`. Bo'sh holat: `b.emptyText`.
Kontent bo'limlari `b.rows` ga `Rows.*` orqali qo'shiladi.
Formali ekranlar o'z layoutini yozadi (`fragment_x.xml`).

## Navigatsiya (`ui/Nav.kt`)

```kotlin
Nav.open(this, R.id.grammarTopicFragment, topic.id, topic.titleUz)
Nav.openExercises(this, ids, contentId, dayId, source, title)
```

- `Nav.ARG_ID` — batafsil ekran kontent id'si (`Nav.idArg(this)`).
- `Nav.ARG_SOURCE` — `Source.PRACTICE | Source.SECTION_TEST | Source.MOCK_EXAM`.
- Mashq pleyeri: `R.id.exerciseFragment` (boshqa ekranlar USTIGA navigate).

## Store API (`store/AppStore.kt`)

```kotlin
val st = container().store.state.value       // StoreState(data, timer, …)
container().store.state                      // StateFlow<StoreState>
container().store.dispatch(StoreAction.Xxx(...))
container().store.settings()/attempts()/writingAll()/speakingAll()/mocksAll()
container().store.todaySeconds()/todaySkillSeconds(skill)/streakValue()/queueSize()
container().store.timerSeconds()
container().store.syncNow(): SyncStats       // qo'ldan sinxron
container().store.flushSave()
AppStore.formatDuration(sec)                 // mm:ss yoki h:mm:ss
```

`StoreAction` turlari: `Settings(patch: UserSettings)`,
`Attempt(AttemptRecord)`, `Srs(vocabId, SrsGrade)`, `SrsAdd(vocabId)`,
`TimerStart(sessionId, skill)`, `TimerPause`, `TimerStop`,
`WritingAdd(WritingSubmission)`, `SpeakingAdd(SpeakingSession)`,
`MockAdd(MockExamAttempt)`, `MockTime(Map<String,Int>)`,
`DayComplete(dayId, testId?, testScore?)`,
`Diagnostic(at, level?, labelUz, confidence)`, `Onboarded(at)`,
`LevelSet(level)`, `Reset`, `Hydrate(data)`.

## Kontent API (`data/ContentRepository.kt`)

```kotlin
val cr = container().content
cr.levels()                       // manifestdagi mavjud darajalar
cr.bundle(level)                  // LevelBundle(days, vocab, grammar, reading,
                                  //   listening, writing, speaking, tests, mockExam)
cr.allVocab(listOf(level))        // lug'at
cr.findVocab(id); cr.findExercise(id)
cr.allExercises(level)            // mockExamdan tashqari
cr.vocabQuizExercise(v, options)  // lug'at kartasidan mashq
cr.mockExamExercises(level)
```

Modellar: `data/ContentModels.kt` (`GrammarTopic, ReadingPassage, ListeningTask,
WritingTask, SpeakingTask, SectionTest, DailyPlanDay, MockExamSpec, Exercise`).
`Exercise` YASSILANGAN: `kind` (`Kinds.*`) va maydonlar (`options, statement,
pairs, text/answers/wordBank, bank, source/accepted`).

## Domen (`domain/*`)

- `AnswerChecker.checkAnswer(exercise, answer: Any?): CheckOutcome` — matching
  uchun `Map<String,String>` (kalit `pair.left`), gap-fill `List<String>`
  (pozitsion), word-order **bitta satr**, translation `List<String>` yoki satr,
  tfng `"true"|"false"|"notgiven"`. `nextExerciseIndex(i, results, size)`.
- `domain/Srs.kt`: `Srs.review(state, grade)`, `initialSrsState()`, `isDue(st, now)`,
  `countLearned(...)`, `countDue(...)`, `sortForReview(...)`, `SrsGrade.{AGAIN,HARD,GOOD,EASY}`.
- `domain/Analyze.kt`: `analyzeWriting(text, task) -> WritingAnalysis`,
  `analyzeSpeaking(transcript, durationSec, task)`, `analyzeSpeakingText(text, task)`,
  `speakingScore(analysis)`, `countWords(text)`.
- `domain/Planning.kt`: `computeAllocation(settings, skillEvidence(data))`,
  `buildDayTasks(day, alloc, doneBySkill)`, `skillLabelUz(skill)`,
  `daysUntil(dateStr)`, `nextDayId(level, dayIds, completed)`.
- `domain/Reducer.kt`: `skillEvidence(data)`, `lastNDays(data, n)`,
  `planProgress(elapsedSec, plannedMinutes)`, `formatDuration(Long)`.
- `domain/SkillScoring.kt`: `evaluateLevelPromotion(current, evidence)`,
  `xpForAttempt(correct, difficulty, firstTry)`, `streakFor(dates, today)`,
  `levelLabel(level)`.
- `domain/Diagnostic.kt`: `diagnose(mapOf("dg-01" to true, …))`.

## Harakat (animatsiya) va darslar zanjiri — MAJBURIY QOIDALAR

- Harakat sonlari **kodda yo'q** — yagona manba `res/raw/motion_manifest.json`
  (`stepMs 260, outcomeMs 320, popMs 380, popScale 1.14, staggerMs 40,
  staggerMaxItems 8, xpMs 620, chainMs 240`). O'qiysiz: `ui/Motion.kt::spec(ctx)`
  (bir marta keshlanadi; `Motion.reset()` test/sozlama uchun). Byudjet chegarasi
  0…1500 ms (`data/MotionManifest.kt`). Veb tomoni: `src/lib/motionManifest.ts`
  + `src/index.css` `--aea-*`; ikkala tomonning tengligi
  `src/test/motion.test.ts`da diskdan o'qib tekshiriladi.
- Ekranlarni `Motion.*` bilan harakatlantiring (qo'lda `ObjectAnimator` sonlari
  yozmang):
  - `Motion.enabled(ctx)` — sozlama (`settings.motionEnabled`) VA telefon
    `animator_duration_scale > 0`. **Har bir harakatdan oldin shu tekshiriladi**;
    false bo'lsa hech narsa animatsiyalanmaydi (foydalanuvchi tanlovi).
  - `Motion.stepIn(v)` — ekran/abzats kirishi; `Motion.pop(mascot)` — qahramon
    "pop"i (javobdan keyin); `Motion.stagger(host, from)` — ro'yxat elementlari
    (≤ `staggerMaxItems` ta kechiktirish, qolgani darhol);
    `Motion.fillChainCell(cell, filled, order)` — zanjir kataki;
    `Motion.flyXp(anchor, text)` — XP yozuvi ko'tarilib yo'qoladi (overlay).
  - `Motion.tap(ctx, ms, amplitude)` — haptik. `VIBRATE` ruxsati manifesda bor;
    amplitude faqat API 31+ da qo'llanadi (undan pastda oddiy titrating —
    ixtiro EMAS, Android shunday).
- Darslar ketma-ketligi: `domain/LessonChain.kt` — `buildChain/buildDayChains`
  (bo'limlar `Skills.PLAN_ORDER`, test oxirda), `lessonSequence` (tur
  almashinuvi `MIN_KIND_GAP=2` + `REINFORCE_EVERY=6` takrorlash),
  `sequenceAudit` (bir bo'lim), `chainAudit` (butun zanjir — undagi
  `unavoidable` yagona turli bo'limning ajratib bo'lmaydigan takrorlari).
  PRACTICE oqimi `Nav.openExercises`
  da `lessonSequence` bilan qayta tartiblanadi; bo'lim testi va mock imtihon
  kontent tartibida qoladi (test savollari takrorlanmaydi). O'quv yo'lidagi
  zanjir kartasi: `LearningPathFragment.addChainCard()`, audit satri
  `path_chain_audit`.
- Zanjir auditi: `chainAudit(chains, knownKind)` — sonlar ekranda ochiq
  ko'rsatiladi (`path_chain_audit`). Veb `chainAudit` bilan bir xil; A1
  kontentida o'lchangan sonlar `src/test/chain-audit-real.test.ts`da, mobil
  tomoni `LessonChainTest.chainAuditSeparatesUnavoidableRepeats`da.
  Bo'limlar ALOHIDA sanaladi, `minGap` faqat
  2+ turlu bo'limlarda, yagona turli bo'limning takrorlari `unavoidable`da.
- **Javob yig'ish — interfeys ↔ domen kalitlari teng bo'lishi shart.**
  `ExerciseFragment`dagi har bir tur o'z kalit so'zini `checkAnswer` qabul
  qiladigan shaklda beradi. REAL XATO (2026-11-06): `firstOrNull` INDEKS
  qaytaradi (View emas) — `(v as? RadioButton)` abadiy `null` edi, true/false/
  notgiven javoblari jim yo'qolardi. Bunday xato vizual ham ko'rinmaydi —
  `ExerciseAnswerKeyWiringTest` kodning shakli + round-trip bilan ushlaydi.
  `firstOrNull` natijasini View'ga `as?` bilan kastemaq.
- Yangi string kalitlari (allaqachon `strings_extra.xml` da, IXTIRO QILMANG):
  `settings_motion_title|on|off|hint|scale_off`,
  `path_chain_title|hint|steps|minutes|state_done|state_current|state_locked|test|audit`.

## Audio

Tinglash audio fayllari `assets/audio/<id>.wav` + `assets/audio/manifest.json`
(`AudioAsset.src` veb’dagi `/audio/...` yo'li — fayl nomi `src` dan olinadi).
`android MediaPlayer` `assetFd` orqali: `assets.openFd("audio/<fayl>")`.
Fayl bo'lmasa `listening_audio_missing` / `listening_no_audio` — HALOL aytiladi.

## Mikrofon / nutq (Speaking)

`RECORD_AUDIO` ruxsati manifesda bor. Rekord: `MediaRecorder` (maxsus ixtisos
talab qilinmaydi), nutqni tanib olish (`RecognizerIntent`) bo'lmasa
`speaking_no_speech` deyiladi va **matnli javob** taklif qilinadi. Ovoz
fayl/serverga yuborilmaydi — `audioBlobStored = false` (maxfiylik kelishuvi).

## Natija talabi

Faylni BITTA `Write` bilan yozing (har fayl alohida). Gradle Ishga
TUSHIRMANG (kompilyatsiyani asosiy seans tekshiradi). Yozilgan fayllar:
`ui/<X>Fragment.kt` + kerak bo'lsa `res/layout/fragment_<x>.xml`.
