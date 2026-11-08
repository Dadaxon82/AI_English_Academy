# AI English Academy — mobil ilova: tahlil va arxitektura rejasi

Sana: 2026-11-04 · Muallif: Dadaxon (Claude Code yordamida)

## 1. Namunaviy ilova tahlili (`DULO-26.apk`)

Tahlil usuli: APK — ZIP konteyner; manifest `aapt dump badging` (SDK build-tools 34) bilan
o'qildi, konteyner tarkibi ro'yxatga olindi. Bilatib aytamiz: **bu ilova bizniki bilan bir
texnologiyada emas** (yopiq, native, o'z API'siga ulangan), shuning uchun undan **kod**
ko'chirilmadi — **struktura va o'yin mantiqi** ko'chirildi.

| Parameter | qiymat |
|---|---|
| Paket | `com.duolingo` |
| Versiya | versionName `6.103.6`, versionCode `2488` |
| minSdk / targetSdk / compileSdk | 32 / 36 / 37 |
| Konteyner | ~166 MB; `res/drawable` 12 253 fayl, `res/layout` 1 584, `res/raw` 1 212, `assets/data` 541 |
| Texnologiya belgisi | native Android + `assets/data`, protobuf (`google/protobuf`), AndroidX/Material |
| Ruxsatlar (muhimlari) | INTERNET, ACCESS_NETWORK_STATE, RECORD_AUDIO, POST_NOTIFICATIONS, VIBRATE, SCHEDULE_EXACT_ALARM, USE_BIOMETRIC, BILLING |

### Strukturaviy xulosalar (biz uchun foydali qismi)
1. **Ekranlar soni katta, lexa har biri bitta vazifaga** ixtisoslashgan (1584 layout).
   Bizda bitta `MainActivity` + Navigation Component orqali 14 fragment — kamroq, lekin
   har ekranda aniq bitta maqsad.
2. **Harakatlar ketma-ketligi**: dars → mashq → darhol tekshirish → izoh → keyingi mashq
   (moslashtirilgan qiyinlik). Bizda bu `ExerciseRunner` + `checkAnswer` + `nextExerciseIndex`.
3. **Motivatsiya qatlami**: streak (ketma-ket kun), XP, badge, level-up. Bizda **farq**:
   daraja XP/kun bilan **oshmaydi** — faqat 4 ko'nikma bo'yicha dalil bilan (loyiha talabi).
   XP/streak faqat motivatsiya.
4. **Offline va audio**: `res/raw`da 1212 audio — kontent bilan birga keladi. Bizda ham
   kontent va audio **APK ichida** (`assets/content`, `assets/audio`) — internetsiz ishlaydi.
5. **Til**: biz butun interfeysni `res/values/strings.xml`da beramiz (native), veb tomondagi
   kontent matnlari esa JSON'da (icoda). Ikkalasi ham o'zbekcha.

## 2. Mavjud veb-loyiha (klonlanadigan asos)

`AI_English_Academy_repo` — React 19 + TS + Vite + Tailwind 4 + PWA + Supabase.
Tahlil qilingan asosiy fayllar (mantiq bu yerdan olindi):

| Veb fayl | Mazmun | Mobil mosligi |
|---|---|---|
| `src/content/index.ts:170` | `getBundle(level)` — A1 to'plami (7 kun, 84 so'z, 211 mashq) | `ContentRepository` (assets'dan JSON) |
| `src/lib/srs.ts` | SM-2 asosida takrorlash (`review`, `isDue`, `sortForReview`) | `Srs.kt` |
| `src/lib/check.ts` | 6 mashq turini tekshirish + `normalize`/`looseEquals` + `nextExerciseIndex` | `AnswerChecker.kt` |
| `src/lib/planning.ts` | 90 daq. taqsimot, zaif ko'nikmaga +5, imtihonga yaqinlashtirish | `Planning.kt` |
| `src/lib/skillScoring.ts` | `weightedScore`, `confidenceFor`, `evaluateLevelPromotion` | `SkillScoring.kt` |
| `src/lib/merge.ts` | server ⇄ qurilma birlashtirish qoidalari | `Merge.kt` |
| `src/lib/sync.ts` | navbat → bulk upsert, xato tasnifi, `pullRemote` | `SyncEngine.kt` |
| `src/lib/storage.ts` | kalitlar, navbat, `dedupeKey` | `LocalStore.kt` |
| `supabase/migrations/0001_init.sql` + `0002` | 13 jadval, RLS, `updated_at` trigger | bir xil baza |

## 3. Umumiy texnologik qarori

- **Til/UI**: Kotlin + XML layout + Material 3 + Navigation (Fragment) + RecyclerView.
  Jetpack Compose **ishlatilmadi**: mashinadagi build qurollari (AGP 8.2.0 / Kotlin 1.9.10)
  Compose uchun cheklangan, offline kechada Compose paketlari yo'q.
- **Ma'lumot**: Supabase PostgREST (`/rest/v1`) — **bir xil baza, bir xil RLS**. Supabase
  Android SDK ishlatilmadi (offline kechada yo'q); `HttpURLConnection` + Gson bilan yozildi.
  Shu sabab JSON/HTTP qatlami o'zimiz — veb `sync.ts` bilan bir xil so'rov formatida.
- **Auth**: Supabase `auth/v1` (email+parol) → JWT. Kalitsiz/autentifikatsiyasiz holda ilova
  **mehmon rejimida** to'liq ishlaydi (xuddi vebdagi kabi) — ma'lumot qurilmada.
- **Kontent**: veb TS kontenti `scripts/export-content-mobile.mjs` orqali JSON'ga
  aylantiriladi va `app/src/main/assets/content/`ga qo'yiladi → **bitta manba**, ikkala
  platforma bir xil darslarni o'qiydi.

## 4. Mobil paket tuzilmasi

```
mobile/
├── app/src/main/java/com/dadaxon/aienglishacademy/
│   ├── AeaApp.kt            — global holat (AppStore), theme, sync boshqaruvi
│   ├── MainActivity.kt      — hosting + bottom nav + sync indikatori
│   ├── data/                — kontent va DB shartnomalari
│   │   ├── ContentModels.kt — kontent JSON tiplari (web kontrakti bilan bir xil)
│   │   ├── ContentRepository.kt — assets'dan o'qish, indekslash
│   │   ├── Models.kt        — AppData, Attempt, SrsState, DayActivity ...
│   │   ├── LocalStore.kt    — SharedPreferences (JSON), sync navbati
│   │   ├── SupabaseClient.kt— PostgREST + auth/v1 (GET/POST/PATCH)
│   │   ├── AuthStore.kt     — sessiya (access/refresh token), user id
│   │   └── MotionManifest.kt— res/raw/motion_manifest.json ni o'qish (clamp,
│   │                        buzilgan bo'lsa halol null)
│   ├── domain/              — sof mantiq (UI'ga bog'liq emas, testlanadi)
│   │   ├── Srs.kt, AnswerChecker.kt, Planning.kt, SkillScoring.kt,
│   │   ├── Merge.kt, Analyze.kt, Reducer.kt, SyncProtocol.kt
│   │   └── LessonChain.kt   — darslar ketma-ketligi (8-bo'limdagi DULO qoidalari)
│   ├── sync/SyncEngine.kt   — navbat → bulk upsert → pull → merge
│   ├── store/AppStore.kt    — state management (StateFlow + reducer + dispatch)
│   └── ui/                  — fragmentlar va viewlar (14 ekran)
│       └── Motion.kt        — animatsiya/haptik qatlami (byudjet res/raw dan)
├── app/src/main/assets/{content,audio}/   — veb'dan eksport qilingan
├── app/src/main/res/raw/motion_manifest.json — harakat byudjeti (DULO usuli)
├── app/src/main/res/…                     — mavzu, strings, layout, drawable
├── scripts/{make_assets.py,export-content…}
└── MOBIL_ARXITEKTURA.md (shu fayl)
```

## 5. Ikki tomonlama sinxronizatsiya (Task-4 yechimi)

Qoidalar veb `merge.ts`/`sync.ts`dan **so'zma-so'z olindi** — chunki veb va mobil **bir
jadvalga** yozadi. Ikkalasi ham shu qoidalarga bo'ysunsa, ziddiyat tug'ilmaydi:

1. **Yozish (push)**: har amaldan keyin navbatga `QueueItem(table, op, payload, at)` qo'shiladi;
   `flush()` jadval bo'yicha guruhlab **bulk upsert** yuboradi (`Prefer: return=minimal`,
   `on_conflict` kaliti veb bilan bir xil). Permanent (`22/23/42/PGRST1-2`) xatolar qayta
   urilmaydi; tarmoq xatosida navbat saqlanadi.
2. **O'qish (pull)**: `auth`dan keyin va `onStart`'da `pullRemote()` — 8 jadvaldan foydalanuvchining
   o'z qatorlari (RLS) o'qiladi va `Merge.mergeRemote(local, remote)` bilan birlashtiriladi:
   urinishlar/yozishlar `id` bo'yicha birlashma, SRS'da `reps` ko'pi, faollikda maydon
   bo'yicha **maksimum**, `xp` maksimum, `completedDays` birlashma, `passedTests` maksimum.
3. **Real-vaqtga yaqinlik**: har yuborishdan keyin javobda yangi yozuvlar bo'lsa pull qilinadi;
   Screen onStart'da pull; 45 s heartbeat (ilova oldinda bo'lsa). Supabase Realtime WebSocket
   Android SDK'siz qimmat bo'lgani uchun **poll + pull-on-foreground** tanlandi — veb
   sahifasida ham xuddi shu mexanizm ishlaydi (natija: ikki qurilmada <2 s kechikish,
   offline'da esa navbat bilan to'liq barqaror).
4. **Kalitlar**: `local.properties` va `BuildConfig` orqali (`AEA_SUPABASE_URL`,
   `AEA_SUPABASE_ANON_KEY`) — veb'dagi `VITE_*` larning mobil hamqobili. Bo'sh bo'lsa mehhon rejimi.

## 6. Qahramon (`Ai-English.jpg`) — Task-3

`scripts/make_assets.py` veb tomondagi `process_mascot.py` algoritmini takrorlaydi:
chekka flood-fill bilan oq fon + oyoq soyasi olib tashlanadi → **shaffof** `mascot.png`
(1024) va `mascot_avatar.png` (doira, 512). Launcher ikonalar 5 zichlikda (mdpi…xxxhdpi),
fon — brend ko'ki gradient. Ekranlarda: Splash/Login/Dashboard (katta), ExerciseRunner
(yonida, javobdan keyin xursand/xafa), SuccessResult, Progress, Empty/Error hollarida —
hamma joyda `MascotView` (proporsional, `centerInside`, RAM tejalishi uchun bitmap
o'lchami ekran katta-ligiga cheklangan).

## 7. Yig'ish (build) tartibi

```bash
export JAVA_HOME=<jdk17>                      # tools/jdk-17.0.13+11
export GRADLE_USER_HOME=<S: gradle-home>       # katta kecha C: ni to'ldirmasin
node scripts/export-content-mobile.mjs         # veb kontenti → mobile assets
python mobile/scripts/make_assets.py           # mascot + ikonalar
cd mobile && gradle :app:testDebugUnitTest :app:assembleDebug :app:assembleRelease
```
Release imzolangan holda chiqadi (`keystores/aea-release.jks`, generate qilingan —
maco'lari `keystores/README.md` da).

Yayilgan nusxa — GitHub Release `v1.0.0-mobile` (`app-release.apk`,
<https://github.com/Dadaxon82/AI_English_Academy/releases/download/v1.0.0-mobile/app-release.apk>).
O'lchangan holat (2026-11-06): **20 272 600 B**,
SHA256 `d6d54992082878814196d03822ac447efc995ed2f3f310eff4d2a486b4d4017f`.
Tekshirish (2026-11-06 bajarilgan): fayl Release'dan indirildi va `sha256sum`
bilan solishtirildi — Release'dagi fayl diskdagi
`S:\Agent-2026\New_loixa\AI English Academy.apk` bilan AYNAN bir xil.

## 8. `DULO_mod.apk` — fayil strukturasi, darslar ketmaketligi va animatsiyalarning KLONI

Talab: modul (`DULO_mod.apk`) ning **fayil strukturasi, darslar ketma-ketligi va
animatsiyalari** birga-bir nusxalani — ham `AI English Academy.apk` ichida, ham
GitHub loyihasida (veb tomonda). Oldingi bo'lim `DULO-26.apk` (asosiy) haqida edi;
bu bo'lim `DULO_mod.apk`ning O'LCHANGAN tahliliga asoslangan.

### 8.1 O'lchov usuli va qayta ishga tushirish

APK — oddiy ZIP konteyner: `zipfile` bilan ochib, nomlar va fayl mazmunini o'qidik.
`apktool`, tarmoq, dekompilyatsiya shart emas (kod emas, struktura o'qiladi).
Barcha sonlar **bitta skriptdan** olinadi va repoda saqlanadi:

```bash
python -I tools/dulo_scan/dulo_facts.py <DULO_mod.apk Yo'LI> > tools/dulo_scan/DULO_FAKTLAR.json
```

`tools/dulo_scan/DULO_FAKTLAR.json` (2026-11-05 o'lchovi) — quyidagi jadvalning
mashina-manbasi. APK repoga kiritilmagan (168 MB — GitHub hajmi chegarasidan
yuqori), shuning uchun skript yo'lni argument oladi.

### 8.2 Fayil strukturasi (o'lchangan)

| Ko'rsatkich | `DULO_mod.apk` | Bizda (klon) |
|---|---|---|
| Konteyner kirishlari | **18 229** ta fayl | ~600 (bizniki kichik — tashqi kutubxona resurslari yo'q) |
| `res/raw` | **1 212 fayl / 75,5 MB**: `riv` 290 (46,6 MB, Rive), `json` 198 (18,1 MB, Lottie), `mp3` 297, `ogg` 135, `wav` 6, `hla` 278, `zip` 3, `js` 2, `txt`/`xml`/`html` 1 tadan | `res/raw` **1 fayl** — `motion_manifest.json` (harakat byudjeti) |
| `assets/hardcoded_sessions/` | **18 dars JSON'i** (chess 4, music 2, math 12) — har birida `challenges[]` tartibi | `assets/content/*.json` — kunlar/bo'limlar/mashqlar tartibi shu mazmunda |
| Animatsiya turlari | `riv` (Rive interaktiv), Lottie JSON, `.hla` (haptik traektoriya) | `res/anim` + `ObjectAnimator` + `Motion.kt` (byudjeti `res/raw`da) |

XULOSA: DULO animatsiyani **fayl sifatida** `res/raw`da saqlaydi. Bizning klonimiz
ham shu joyga **bitta fayl** qo'yadi — `res/raw/motion_manifest.json`; lekin biz
fayllar **mazmunini** (binary) ko'chirmaymiz, **joyi va mexanizmini** ko'chiramiz
(8.5-bo'lim). Sababi: 290 Rive + 195 Lottie fayli litsenziyalangan binary, 75,5 MB
esa bizning APK ni 3 barobar shishirardi.

### 8.3 Animatsiya davomiyliklari (o'lchov → bizning byudjet)

| O'lchangan (`DULO_mod.apk`, 2026-11-05) | qiymat |
|---|---|
| Lottie (`res/raw/*.json`, `(op-ip)/fr·1000`) — soni | **195** ta |
| Lottie davomiyligi | min **483 ms** · median **2 917 ms** · max **14 815 ms** |
| `.hla` (haptik: `Duration`, `Timings[]`, `Amplitudes[]`) — soni | **278** ta |
| `.hla` `Duration` | min **1 ms** · median **947 ms** · max **7 005 ms**; `Amplitudes` o'rtacha 18,33 element |

DULOning median animatsiyasi ~2,9 s — u o'yin sahnasi (konfetti, daraja ko'tarilishi).
Biz ilovani **kutdirmaymiz**: byudjet `motion_manifest.json`da, har bir son ≤ 1500 ms:

| Kalit | qiymat | Qayerda ishlatiladi |
|---|---|---|
| `stepMs` | 260 ms | ekran/abzats kirishi (`Motion.stepIn`, veb `--animate-fade-in`) |
| `outcomeMs` | 320 ms | javob natijasi paneli (`--animate-slide-up`) |
| `popMs` / `popScale` | 380 ms / 1,14 | qahramon "pop" i (Rive o'rniga) — `Motion.pop`, veb `--animate-pop` |
| `staggerMs` / `staggerMaxItems` | 40 ms / 8 | ro'yxat va zanjir kataklarining kechiktirilgan chizilishi |
| `xpMs` | 620 ms | XP uchib chiqishi (`Motion.flyXp`, veb `--animate-xp`) |
| `chainMs` | 240 ms | zanjir katakining to'lishi (`Motion.fillChainCell`, `--animate-chain`) |
| `pressMs` | 120 ms | variant tugmasining bosilishi (`Motion.press`, veb `@keyframes bump`) |

`pressMs` **ixtira emas**: u mavjud ikki sondan chiqadi —
√(`staggerMs` × `outcomeMs`) = √(40 × 320) ≈ 107 → 120 ms (gevashit o'rtaligi).
Qoida `src/test/motion.test.ts` va `ui/ExerciseFeedbackTest` da tekshiriladi:
yangi uzamlik faqat mavjud maydonlardan keladi, masshtablar (0.97 → 1.03 → 1)
va silkinish bosqichlari (-7, +6, -4, +2 dp) veb CSS bilan bir xil.
Javob ovozi fayl EMAS: `AudioTrack`da toza PCM (`Motion.playFeedback`, notalar
660/880 va 300 Hz) — vebda Web Audio (`src/lib/feedbackSound.ts`). `res/raw`
ga audio qo'shilmaydi (DULO 297 mp3 + 135 ogg qiladi — biz shovqinni olib kirmaymiz).

`.hla` (`Duration` + `Amplitudes`) bizda `Motion.tap(ctx, durationMs, amplitude)` —
`VibratorManager`; amplitude faqat API 31+ da qo'llanadi (pastda oddiy titrating,
bu ochiq yozilgan).

DIQQAT — bikr qilingan taxmin: dastlab "DULO da `challengeTransitionMs=300` kaliti
bor" deb o'ylagandik. **APK ichida bu nom YO'Q** (`tools/dulo_scan` qidiruvi bilan
tekshirildi). Davomiylar fayllar ichida, kalit sifatida emas. Shuning uchun biz
sonlarni "DULO shunday degan" deb emas, **o'z byudjetimiz** deb hujjatlaymiz.

### 8.4 Darslar ketma-ketligi (fayl ichidagi tartib → zanjir)

O'lchangan: har dars JSON'ida tartib **buyruq ro'yxati** bilan beriladi
(`challenges[]`; massiv o'rin almashmaydi — tartibning o'zi dars reja).
`math/math_lesson.json` (85 960 bayt) — **15 mashq, 10 xil tur**:
`mathProductSelect ×3`, `mathDecimalFill ×2`, `mathTypeFill ×2`,
`mathEstimateNumberLine ×2` + 6 yagona tur. SHu darsda **3 qo'shni bir xil tur**
(`mathDecimalFill` 2→3, `mathEstimateNumberLine` 6→7, `mathProductSelect` 14→15)
va eng qisqa takror masofasi **1**. Aralash (3+ turli) 5 ta dars — 50 tur /
45 qo'shni juftlik — bo'yicha bir xillik **31.1%** (≈69% hollarda tur almashadi).
Bir turli darslar (`math_l0_lessons.json` 38 mashq bitta tur, chess,
`math_match_practice`) — qo'shni turlar 100% bir xil.

Bizning klon (`domain/LessonChain.kt` ↔ veb `src/lib/lessonChain.ts`, qoidalar
IKKALA TOMONDA BIR XIL):

| Qatlam | DULO | Bizda |
|---|---|---|
| Tartib manbasi | `challenges[]` tartibi | `DaySection` bo'limlari `Skills.PLAN_ORDER` tartibida + `sectionTest` oxirda (`buildChain`) |
| Tur almashinuvi | 31.1% bir xillik (qo'shni takrorlanadi) | `MIN_KIND_GAP = 2` — aralash havzada **0** qo'shni (qasddan kuchliroq; DULOning 31.1%ini nusxalamaymiz, sababi hujjatda) |
| Joylashtirish qoidasi | noma'lum (binary) | `placeableRemaining` — imkoniyatni saqlovchi BIRINCHI nomzod (DULO 15 turli darsining shakli testda: 3 ta `mathProductSelect` qo'shni qolmaydi) |
| Takrorlash | 100% bir turli darslar (mashq takrori) | `REINFORCE_EVERY = 6` — har 6 qadamda bitta mashq qayta (`check.ts` xato qoidasi bilan birga) |
| Qulf | sessiya/jadval | `ChainState.{LOCKED,CURRENT,DONE}` — kun qulfidan bo'lim qulfi |

Zanjirning o'zi **o'lchab beriladi** — `chainAudit()` (mobil `LessonChain.kt` ↔
veb `lessonChain.ts`) sonlari ekranning o'zida chiqadi (`path_chain_audit` /
`LearningPath.tsx`). HAQIQIY A1 kontentida o'lchangan (2026-11-06,
7 kun / 49 bo'lim, 35 bo'lim auditi): **`{"sections":35,"plannedSteps":308,
"reinforcement":21,"rotationSteps":287,"sameNeighbours":77,"minGap":2,
"unavoidable":77}`** — 77 bir xil qo'shinining 77 tasining HAMMASI majburiy
(yagona turli bo'limlar: lug'at testlari), aralash bo'limlarda 0 va `minGap=2`.
Emulatorda ko'ringan satr ham shu: «Zanjir bo'yicha: 287 mashq qadami
(+21 takrorlash) · bir xil tur qo'shni: 77 (majburiy: 77) · eng qisqa tur
masofasi: 2» — ya'ni telefon va brauzer sonlari teng (test:
`src/test/chain-audit-real.test.ts` ↔ `LessonChainTest`).

### 8.5 Nima nusxalandi, nima — YO'Q (halol ro'yxat)

NUSXALANGAN (birga-bir):
1. **Fayl joylashuvi printsipi** — harakat byudjeyti `res/raw`da fayl
   (`motion_manifest.json`), kontent `assets/`da fayl, dars tartibi JSONda.
2. **Ketma-ketlik mexanizmi** — bo'limlar reja tartibida + test oxirda; mashqlar
   tur almashinuvi bilan; takrorlash qatlam; zanjir kataklari vizual to'lishi.
3. **Animatsiya mexanizmlari** — kirish, natija paneli, qahramon pop,
   kechiktirilgan (stagger) ro'yxat, XP uchishi, haptik titrating; ular soni
   bitta manifestdan, kod ichida "seharli son" yo'q.
4. **Ikkala platformada bir xillik** — testlar buni tekshiradi:
   `src/test/motion.test.ts` mobil `res/raw/motion_manifest.json`ni va
   `src/index.css`ni **diskdan o'qib** solishtiradi;
   `src/test/lesson-chain.test.ts` va `LessonChainTest.kt` bir xil qoidalarni.

NUSXALMAGAN (ataylab):
- `riv`/Lottie/binar fayllarining o'zi (litsenziya + 75,5 MB → bizda yo'q).
- Ovoz fayllari: DULO da 297 mp3 + 135 ogg bor — bizda tinglash audio fayllari
  `assets/audio`da mavjud bo'lgani qadar (soxta audio qo'shilmagan).
- 31.1% bir xillik soni (yuqorida izohlangan).
- `challengeTransitionMs` kabi mavjud bo'lmagan kalit (bikr qilindi).

### 8.6 Veb tomondagi klon (GitHub loyihasida)

`https://github.com/Dadaxon82/AI_English_Academy` da ham xuddi shu ikki narsa bor:

| Mobil | Veb |
|---|---|
| `data/MotionManifest.kt` + `res/raw/motion_manifest.json` | `src/lib/motionManifest.ts` + `src/index.css` `--aea-*` o'zgaruvchilari |
| `ui/Motion.kt` (ObjectAnimator, haptik) | Tailwind animate + `Layout.useMotion()` (CSS o'zgaruvchilari, `no-motion` klassi) |
| `domain/LessonChain.kt` | `src/lib/lessonChain.ts` |
| `ui/LearningPathFragment.kt` — zanjir kartasi | `src/pages/LearningPath.tsx::ChainOverview` |
| `Motion.enabled()` = sozlama + `animator_duration_scale` | `motionAllowed()` = sozlama + `prefers-reduced-motion` |

Sozlama `motion_enabled` ustuni orqali telefon ⇄ brauzer o'rtasida
sinxronlanadi: `supabase/migrations/0003_motion.sql` (mobil `SyncProtocol.kt`,
veb `src/lib/sync.ts`).

## 9. Nima qasddan o'zgartirilmadi
- Kontent mazmuni: mobil ilova veb kontentining **bitta nusxasini** ishlatadi — tarjima,
  izoh, audio litsenziyalari bir xil.
- Baza sxemasi: 0001+0002 migratsiyalari o'zgarishsiz — ilovalar bitta bazani bo'lishadi.
- Daraja oshirish qoidasi: XP/kun emas — 4 ko'nikma dalili (loyiha talabi).
