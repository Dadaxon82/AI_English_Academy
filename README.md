# AI English Academy

**A1 → C1** darajalar bo'yicha shaxsiy ingliz tili platformasi. React 19 + TypeScript + Vite + Tailwind CSS 4 + PWA + Supabase.

Loyiha talabnomasi (`AI English Academy_v2.docx`) to'liq bajarilgan:

- ✅ To'liq **o'zbek tilli interfeys**
- ✅ **A1, A2, B1, B2, C1** darajalar; daraja faqat **ko'p ko'nikma dalili** bilan ko'tariladi (XP yoki kunlar emas), mock imtihon esa doim **"mashq uchun yaratilgan namuna"** deb yozilgan
- ✅ **90 daqiqalik** asosiy kunlik reja (Vocab 10 / Grammar 15 / Reading 15 / Listening 15 / Writing 20 / Speaking 15) — zaif ko'nikma va imtihon sanasiga qarab qayta taqsimlanadi
- ✅ **14 sahifa**: Dashboard, Learning Path, Vocabulary, Grammar, Reading, Listening, Writing, Speaking, Mock Exam, Progress, Error Log, Settings, Login, 404
- ✅ Premium **dark/light** mavzu, to'liq **responsiv**; har joyda **loading / empty / success / error** holatlari
- ✅ **SRS lug'at** (SM-2): har so'z statistikasida tekshiruvlar ikki marta sanalmaydi; Reading matnidan saqlangan glossariy so'zlari ham Lug'at bo'limida qayta ko'rinadi va takrorlanadi
- ✅ Tinglash uchun **HAQIQIY audio** (`npm run audio:build` — Windows SAPI). Manifestda fayli bo'lmagan audio uchun pleyer umuman ko'rsatilmaydi — soxta tugma yo'q
- ✅ Speaking audio **rozilik siz serverga yuborilmaydi** (`audio_stored: false`)
- ✅ **Jonli taymer** — sahifa yangilansa ham vaqt yo'qolmaydi (IndexedDB'da saqlanadi)
- ✅ **Offline / PWA**: sync navbati, Service Worker; logout'da avval sinxronlanadi (yuborilmagan narsa qolsa tasdiq so'raladi), so'ng kesh tozalanadi
- ✅ **Mobil ilova**: Dashboard yuqorisidagi blok PWA'ni bosh ekranga o'rnatadi (Android/kompyuter — "Ilovani o'rnatish" tugmasi, iPhone — yo'riqnoma); APK fayl shart emas
- ✅ **Native Android ilovasi** (`mobile/` — Kotlin + XML Views, `com.dadaxon.aienglishacademy`): bitta baza va bitta auth, **336 unit test**, qahramon har ekranda; DULO_mod.apk dan o'lchangan **darslar ketma-ketligi va harakat byudjeti** ikkala platformada — quyida 5b-bo'lim va
`mobile/MOBIL_ARXITEKTURA.md` 8-bo'limi
- ✅ **Server bilan ikki tomonlama**: hisobga kirganda progress serverdan tiklanadi va qurilmadagisi bilan birlashtiriladi
- ✅ **Supabase RLS**: har foydalanuvchi faqat o'z qatorlarini ko'radi; service role va `AI_*` kalitlari faqat serverda
- ✅ AI "ulangan" deb ko'rsatilmaydi — AI bo'lmasa **qoidaviy dvigatel** (`engine: 'rule-based'`) ishlatiladi
- ✅ **7+ kun A1 kontenti** alohida (`src/content/day-01…07.ts`)
- ✅ **13 ta jadval** (`supabase/migrations/0001_init.sql`), ID'lar, `created_at`, FK va indexlar bilan; keyin `0002_fix_content_fk.sql` (FK), `0003_motion.sql` (harakat sozlamasi — `motion_enabled`) va `0004_weekly_xp.sql` (haftalik XP — real ligalar)
- ✅ Testlar: `tsc` tip tekshiruvi, ESLint, `vitest` (**267 test**), production build, smoke + render tekshiruvi
- ✅ JSON/CSV **eksport** va **ma'lumotlarni o'chirish**
- ✅ **HECH QANDAY TUGMA DEKORATSIYA EMAS** — har bir tugma haqiqiy harakat bajaradi

---

## 1. Ishga tushirish

Talab: **Node.js ≥ 22.12** (portable nusxa ishlatilsa, avval `PATH` ga qo'shing):

```bash
export PATH="/c/Users/user/tools/node-22:$PATH"   # Windows Git Bash, portable Node
npm install          # birinchi marta
npm run dev          # → http://localhost:5173
```

> `npm install` `esbuild` skriptini bajarishga ruxsat so'rasa — `package.json`
> ichidagi `allowScripts` ruxsatnamedir; kerak bo'lsa `npm approve-scripts --allow-scripts-pending` bosing.

Supabase sozlanmagan bo'lsa ham ilova **to'liq ishlaydi** — "mahalliy mehmon" rejimida, barcha ma'lumot brauzerda (IndexedDB) saqlanadi.

## 2. Muhit o'zgaruvchilari

```bash
cp .env.example .env
```

## 3. Supabase (ixtiyoriy) — kalitlar qayerdan olinadi

> **Eslatma:** kalitlar SHART EMAS. Ular bo'lmasa ilova **mehmon (mahalliy)**
> rejimida to'liq ishlaydi — ma'lumotlar brauzerda (IndexedDB) saqlanadi,
> faqat hisob yaratib boshqa qurilmaga o'tkazib bo'lmaydi.

1. **Loyiha yarating:** [supabase.com](https://supabase.com) → *New project*
   (bepul "Free" tier yetadi). Namuna: nomi `english-academy`, region `Singapore`/eu-central.
2. **Kalitlarni oling:** loyiha paneli → **Project Settings → API** (yoki
   "Connect / API keys" bo'limi). U yerda:
   - **Project URL** → `VITE_SUPABASE_URL` (ko'rinishi: `https://abcd1234.supabase.co`)
   - **Project API keys → `anon` / `public`** (boshlanishi `eyJ…`) → `VITE_SUPABASE_ANON_KEY`.
     Yangi loyihlarda `sb_publishable_…` ko'rinishidagi "Publishable key" ham
     beriladi — xuddi shu ma'noda, ikkalasi ham ishlataveradi.
   - `service_role` kalitini **bu yerga kiritmang** — u faqat serverda.
3. **Ma'lumotlar bazasini tayyorlang:** paneldagi **SQL Editor** ga ketma-ket
   to'rt skriptni qo'yib **Run** qiling:
   1. `supabase/migrations/0001_init.sql` — 13 jadval + RLS + triggerlar;
   2. `supabase/migrations/0002_fix_content_fk.sql` — bo'sh kontent jadvallariga
      qo'yilgan FK'larni olib tashlaydi (ular sinxronlashni butunlay to'sib
      qo'yardi) va kontent jadvallariga service_role yozish policylarini qo'shadi.
   3. `supabase/migrations/0003_motion.sql` — `user_settings.motion_enabled`
      ustuni (telefon ⇄ brauzer harakat sozlamasi). Bu ustun bo'lmasa sinxron
      yozuvi `PGRST204` bilan rad etiladi; skript oxirida tekshiruv `SELECT` bor.
   4. `supabase/migrations/0004_weekly_xp.sql` — liga uchun `weekly_xp` jadvali
      (haftalik XP, rakiblar qatorlarini o'qish siyosati bilan) va
      `user_settings.xp_goal_xp` + `hearts_enabled` ustunlari. Bo'lmasa o'yin
      qatlamining sinxron yozuvi rad etiladi. Tekshiruv `SELECT`:
      `jadval_bor = 1`, `ustunlar = 6`, `politsiyalar = 4`, `sozlama_ustunlari = 2`.
   Skript oxirida tekshiruv `SELECT` bor: `fk_qoldi = 0` va `policies_soni = 21`
   chiqishi kerak. **0002 qo'llanilmasa Supabase'ga hech qanday yozuv kirmaydi**
   (FK'lar bo'sh kontent jadvallariga bog'langan). Ushbu loyihaning bazasida
   (`igrzbfnsunedgyivmqlz`) 0001 qo'llanilgan — 0002 ham albatta qo'llanilishi
   kerak.
4. **Lokal ishga tushirish:** `cp .env.example .env` ichiga ikki qiymatni yozing.
5. **GitHub Pages uchun:** GitHub'da repo → **Settings → Secrets and variables →
   Actions → Repository variables** ga `VITE_SUPABASE_URL` va `VITE_SUPABASE_ANON_KEY`
   ni qo'ying — keyingi deploy'lar ulangan holicha quriladi (workflow bu
   qiymatlarni o'qiydi). Barqaror qurilish uchun push qayta ishga tushirilsin.

| O'zgaruvchi | Qayerda | Izoh |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |frontend (build paytida qadoqlanadi) | Anon/publishable — omboraxona (public) hisoblanadi va RLS bilan himolanadi. Bo'sh → mahalliy rejim |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | **faqat server** | Service role kaliti hech qachon brauzerga chiqmaydi |
| `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`, `AI_DAILY_LIMIT`… | **faqat server** | Bo'sh bo'lsa tahlil qoidaviy dvigatel bilan bajariladi |

## 4. Audio va ikonalar

```bash
npm run audio:build   # 8 ta HAQIQIY WAV (Windows SAPI) + public/audio/manifest.json
npm run icons:build   # PWA ikonalaria (0 bog'liqlik, sof Node)
```

- Audio skripti Windows talab qiladi (tizim ovozi). Boshqa OS'da manifest `available:false` qoladi va ilova pleyerni ko'rsatmaydi — **soxta audio yo'q**.
- WAV'lar precache'ga kiritilmaydi (16 MB); birinchi tinglashdan keyin Service Worker keshida offline ishlaydi.

## 5. To'liq tekshiruv

```bash
npm run typecheck     # tsc — 0 xato
npm run lint          # eslint — 0 xato
npm test              # vitest — 267 test (SRS, taymer/vaqt hisobi, tekshiruv, kontent auditi, audio yaxlitligi, rejalashtirish, daraja, sync, server birlashmasi, sahifalar, darslar zanjiri + HAQIQIY A1 kontentida zanjir auditi, harakat manifesti (mobil res/raw bilan solishtiradi), O'YIN QATLAMI: yurak/quest/gem/liga + o'yin manifesti (mobil GameConfig.kt bilan solishtiradi))
npm run build         # production build + Service Worker
npm run smoke         # dist'ni serverda ochib tekshirish + 375/1280 skrinshot
npm run render:check  # 15 marshrut CDP orqali: DOM + konsol xatolari + 375px telefonda yonga surilmasligi
```

> `render:check` Chrome/Edge'ni remote debugging (CDP) orqali ochadi va har
> marshrut uchun tugmalar/havolalar/matn hajmini va istisnolarni tekshiradi.
> Brauzer bo'lmasa skript ogohlantirib exit 0 bilan chiqadi.

## 5b. Native Android ilovasi (`mobile/`)

PWA'dan tashqari **mustaqil Kotlin ilovasi** yozilgan — veb kodining nusxasi
emas, lekin **bitta Supabase bazasi, bitta auth va bitta kontent** bilan ishlaydi:

```
mobile/
├── MOBIL_ARXITEKTURA.md   # namunaviy ilova tahlili + moslashtirish rejasi (Task-1/2)
├── UI_KONTRAKTI.md        # ekranlar shartnomasi (qahramon, bo'laklab ro'yxatlar, stringlar)
├── app/src/main/java/com/dadaxon/aienglishacademy/
│   ├── data/    AppStore, AppDatabase, ContentRepository, Models, MotionManifest
│   ├── domain/  Analyze (qoidaviy dvigatel), Srs, Reducer, SkillScoring, AnswerChecker,
│   │            LessonChain (darslar ketma-ketligi — DULO qoidalari)
│   ├── sync/    SyncEngine + SyncProtocol (veb bilan bir javat/tizma)
│   └── ui/      14 ekran + MascotView (qahramon) + Rows yordamchilari + Motion (harakat)
├── app/src/main/res/raw/motion_manifest.json  # harakat byudjeti (DULO usuli)
└── scripts/make_assets.py # qahramon rasm + ikonalar
```

Yig'ish (tarmoq talab qilmaydi — kecha oldindan yuklangan):

```bash
node scripts/export-content-mobile.mjs      # veb kontenti → mobile/assets (bitta manba)
python mobile/scripts/make_assets.py        # mascot + ikonalar
cd mobile
JAVA_HOME=<jdk17> GRADLE_USER_HOME=<kecha papkasi> \
  gradle --offline :app:testDebugUnitTest :app:assembleDebug
# Release (imzo `mobile/keystores/aea-release.jks` da — repoda):
gradle --offline :app:assembleRelease      # 2026-11-08: lint-gradle kechada bo'lmagani
                                           # uchun `:app:lintVitalRelease` alohida tarmoqda bajarildi
```

Tekshirilgan holat (2026-11-08): **336 unit test o'tdi** (26 klass — 2026-11-06
dagi 268 taga o'yin qatlami qo'shilgach 68 ta qo'shildi; `GameOpsTest` 15 ta —
jonli do'kon `AppStore.reduceLocal` o'yin qatlamini HAQIQATAN qo'llashini
tekshiradi), API 26+
emulatorda barcha ekranlar ochiladi, ANR yo'q (`/data/anr/` bo'sh; Lug'at 117
so'zi bo'laklab chiziladi — `UI_KONTRAKTI.md`dagi qoida), `dumpsys gfxinfo`
95-persent kadr 61 ms. Emulatorda qayta tasdiqlangan: o'quv yo'lida zanjir
auditi satri **bir marta** ko'rsatiladi (sonlar vebda o'lchangani bilan bir xil),
Sozlamalarda harakat tugmasi "Yoniq ⇄ O'chiq" holatini almashtiradi,
true/false/notgiven mashqida javob qabul qilinadi (2/2 · 100%).
Supabase `publishable` kaliti mijozda ochiq ishlatiladi; **service-role kaliti
hech qaysi mijozga tushmaydi**. AI ulanmagan holda ilova halol
"Qoidaviy tahlil" deb yozadi (`engine: "rule-based"`).

Tayyor APK — GitHub Release [`v1.1.0-mobile`](https://github.com/Dadaxon82/AI_English_Academy/releases/tag/v1.1.0-mobile)
(**2026-11-08**, 1.1.0 / versionCode 2 — o'yin qatlami bilan): `app-release.apk`,
20 336 378 B (o'lchangan), SHA256
`0020345103c03dbaa9dac60c1c659296dcfbac038aca05707123341ac0664c09`. 2026-11-08 kuni
Release'dan **qayta indirib** `sha256sum` bilan solishtirildi — hajm va SHA mos;
nusxa `S:\Agent-2026\AI_English_Academy_1.1.0_release.apk` da. Imzo yangi faylda
qayta tekshirildi (`apksigner verify --print-certs` — xato yo'q):
`Signer #1 CN=AI English Academy, OU=AEA, O=Dadaxon, L=Kokand, ST=Fergana, C=UZ`,
sertifikat SHA-256 `d59a899ff5b03a8d691df1e72afd99b66984bd5f5cd17bd1fd51311faf587e55`
(2026-11-06 bilan bir xil imzo kaliti).

Eski release — [`v1.0.0-mobile`](https://github.com/Dadaxon82/AI_English_Academy/releases/tag/v1.0.0-mobile)
(2026-11-06, 1.0.0 / versionCode 1, 20 272 600 B; SHA256
`d6d54992082878814196d03822ac447efc995ed2f3f310eff4d2a486b4d4017f`) — **o'yin
qatlamisiz** (5d-bo'lim: yuraklar, questlar, gem/do'kon, liga). `versionCode`
1 → 2 ko'tarildi: aksi holda eski 1.0.0 ustiga yangi APK o'rnatilmasdi.

Yig'ish (offline): `gradle --offline :app:assembleRelease`. 2026-11-08 da
`lint-gradle:31.2.0` kechada yo'qligi uchun avval bosqich alohida **tarmoqda**
bajarildi (`:app:lintVitalRelease` — BUILD SUCCESSFUL, xato yo'q), keyin
`assembleRelease` to'liq bosqichlar bilan yig'ildi.

## 5c. `DULO_mod.apk` kloni: fayil strukturasi, darslar ketma-ketligi, animatsiyalar

Namunaviy ilova (`DULO_mod.apk`, 168 MB) **o'lchab** chiqarilgan struktura,
dars tartibi va animatsiya mexanizmlari ikkala platformaga kiritildi.
Sonlarning manbasi — repodagi skript (qayta ishga tushirib bo'ladi):

```bash
python -I tools/dulo_scan/dulo_facts.py <DULO_mod.apk> > tools/dulo_scan/DULO_FAKTLAR.json
```

O'lchangan (2026-11-05): 18 229 kirish; `res/raw` 1 212 fayl / 75,5 MB
(290 Rive `.riv`, 195 Lottie JSON, 278 `.hla` haptik traektoriya, 297 mp3,
135 ogg); Lottie davomiyligi 483 ms / median 2 917 ms / 14 815 ms; `.hla`
`Duration` 1 ms / median 947 ms / 7 005 ms; `assets/hardcoded_sessions/`da
18 dars JSON'i — har birida `challenges[]` tartibi o'quv tartibidir.
`math/math_lesson.json`: 15 mashq / 10 tur, **3 qo'shni bir xil tur**, eng
qisqa takror masofasi 1; aralash 5 darsda (45 qo'shni juftlik) bir xillik
**31.1%**.

Bizda (klon):

| Nima | mobil | veb |
|---|---|---|
| Harakat byudjeyti — fayl `res/raw`da (DULO usuli) | `res/raw/motion_manifest.json` + `data/MotionManifest.kt` | `src/lib/motionManifest.ts` + `src/index.css` `--aea-*` |
| Harakat mexanizmlari | `ui/Motion.kt` (stepIn, pop, stagger, fillChainCell, flyXp, tap) | `Layout.useMotion()`, `animate-[var(--animate-*)]`, XP ko'rsatmasi |
| Darslar zanjiri va tur almashinuvi | `domain/LessonChain.kt` | `src/lib/lessonChain.ts` |
| Zanjir ko'rinishi | `LearningPathFragment.addChainCard()` | `LearningPath.tsx::ChainOverview` |
| Sozlama (harakat yoqilsin/yo'q) | `settings.motionEnabled` + `animator_duration_scale` | `settings.motionEnabled` + `prefers-reduced-motion` |

Sonlar **ikki tomonda teng** — buni `src/test/motion.test.ts` diskdan o'qib
tekshiradi (mobil `res/raw/motion_manifest.json` va `src/index.css`ni),
zanjir qoidalari esa `src/test/lesson-chain.test.ts` va
`mobile/.../LessonChainTest.kt`da bir xil holatlar bilan.

Zanjir auditi (`chainAudit`) HAQIQIY A1 kontentida o'lchangan (2026-11-06,
`src/test/chain-audit-real.test.ts` — 7 kun / 49 bo'lim, 35 bo'lim auditi):
**287 mashq qadami + 21 takrorlash = 308 rejalashtirilgan qadam; bir xil turli
qo'shni 77 ta va ularning HAMMASI majburiy** (yagona turli bo'limlar — masalan
lug'at testlari), `minGap = 2`. Ya'ni aralash turlu bo'limlarda bir xil qo'shni
0 ga tushgan. Sonlar kunlar/bo'limlar tartibiga bog'liq emas (test shuni ham
tekshiradi), ekranda esa bitta satr bo'lib chiqadi (`path_chain_audit` /
`LearningPath.tsx`).
**Nusxalanmagan (ataylab):** Rive/Lottie binar fayllari va ularning litsenziyasi,
DULO ovoz fayllari, hamda DULO ning 31.1% bir xillik soni — biz aralash havzada
`MIN_KIND_GAP=2` bilan 0 ga tushiramiz (asosi hujjatda izohlangan).
Mavjud bo'lmagan narsa ham ochiq aytilgan: `challengeTransitionMs` kaliti APK
ichida **yo'q** (dastlabki taxmin bikr qilindi).

## 5d. O'yin qatlami — Duolingo mexanikasi (veb va mobil bir xil)

2026-11-08 qo'shildi. Mexanika namunaviy DULO/APK'dan **o'lchab** olingan Duolingo
qoidalariga asoslanadi; sonlarning aksari manbali, «biznik» deb belgilanganlari
`gameConfig.ts` izohlarida ochiq yozilgan (ixtira son yo'q).

| Qatlam | Veb | Mobil | Sonlar manbasi |
|---|---|---|---|
| Yuraklar (5 ta, xatoda −1, 30 da: +1, tugasa darvoza) | `game.ts::heartsView/afterAttempt`, `ExerciseRunner.tsx` darvozasi | `GameLogic.kt`, `ExerciseFragment.heartsGateBlocked()` | `gameConfig.ts` ↔ `GameConfig.kt` ↔ `res/raw/game_manifest.json` |
| Kunlik XP maqsadi (5 pog'ona 50/100/200/300/500) | `Settings.tsx` tugmalari, `goalView` | `SettingsFragment` (`MaterialButtonToggleGroup`) | DB `CHECK` bilan bir xil |
| Questlar (kuniga 3 tasi, kun kaliti bilan), gem | `Dashboard.tsx` «Bugungi questlar» | `DashboardFragment` (2c bo'limi) | `QUEST_POOL` + FNV-1a/LCG kun kaliti |
| Qalqon (streak freeze), 2× XP byusti, do'kon | `Settings.tsx` «Do'kon» | `SettingsFragment` «Do'kon» | `SHOP_ITEMS` |
| «Double or Nothing» garovi (50 gem → 7 kun → 100 gem) | `Settings.tsx` | `SettingsFragment` | `BET_*` |
| Yutuqlar/badges (6 ta, darajalar, halol beriladi) | `game.ts::settleAchievements` | `GameLogic.settleAchievements` | `ACHIEVEMENTS` |
| Liga (haftalik XP) | `weekly_xp` + `0004_weekly_xp.sql` | `SupabaseClient`/`SyncProtocol` | server jadvali |

**Bir xillik sharti:** `src/test/game-config.test.ts` va mobil
`GameManifestTest.kt` barcha sonlar bilan birga `titleUz` matnlarini ham
uchala manba (`gameConfig.ts`, `game_manifest.json`, `GameConfig.kt`) bo'yicha
solishtiradi; farq bo'lsa test yiqiladi. Quest tanlash kaliti ham ikkala
tomonda bir xil (`2026-11-07 → dayHash = 1 864 244 822`, questlar
`q-lis-180 / q-perf-1 / q-xp-300`) — shuning uchun foydalanuvchi telefon va
brauzerda BIR XIL kunlik questlarni ko'radi.

**Halol qoidalar:** yuraklar mock imtihon, diagnostika va bo'lim testlarida
jarima qilinmaydi (`HEART_FREE_SOURCES`, ekranda ochiq aytiladi); sozlamada
o'chirilsa darvoza butunlay yo'l qo'yadi; buyum/garov rad etilsa SABAB ochiq
ko'rsatiladi (`reasonUz`), son ixtir qilinmaydi; liga offline bo'lsa oxirgi
snapshot «halol» belgisi bilan ko'rsatiladi. Garov tugmasining HAQIQIY ishlashi
vebda `src/test/pages.test.tsx`da tekshiriladi: gem yetarli bo'lsa gem yechiladi
va ochiq garov ko'rsatiladi, yetmasa SABAB chiqadi, shartlar matni esa `gameConfig`
sonlari bilan bir xil ekanini solishtiradi.

## 6. Arxitektura qisqacha

```
src/
  content/         # 7+ kun A1 kontenti (UI koddan alohida), A2+ zaxira bundle
  lib/             # store (reducer + IndexedDB + sync navbati), SRS, taymer,
                   # tekshiruv dvigateli, rejalashtirish, daraja isboti, eksport
  pages/           # 14 sahifa
  components/      # UI, ExerciseRunner (6 tur mashq), Shell navigatsiya
supabase/
  migrations/0001_init.sql           # 13 jadval + RLS + triggerlar
  migrations/0002_fix_content_fk.sql # FK'larni olish + kontent yozish policylari
  migrations/0003_motion.sql         # user_settings.motion_enabled (harakat sozlamasi)
  migrations/0004_weekly_xp.sql      # weekly_xp (liga) + xp_goal_xp/hearts_enabled
src/lib/
  lessonChain.ts                      # darslar zanjiri (mobil LessonChain.kt bilan bir xil)
  motionManifest.ts                   # harakat byudjeti (mobil res/raw bilan bir xil)
tools/dulo_scan/
  dulo_facts.py  DULO_FAKTLAR.json    # namunaviy APK dan o'lchangan sonlar (qayta ishga tushiriladi)
scripts/
  build-audio.mjs  make-icons.mjs  smoke.mjs  render-check.mjs
```

**Vaqt hisobi (yagona manba):** kundalik sekundlar `activity[kun].seconds`da saqlanadi.
Taymer yurgan bo'lsa vaqt devor-soat bo'yicha (`timer-start`/`timer-stop`) yuritiladi va
shu holatda `attempt` sekundlari qo'shilmaydi — ikki marta sanash yo'q. Hisobga yozilgan
sekundlar darhol nollanadi, shuning uchun sessiyani qayta ochish ham takrorlamaydi.

**Lug'at va SRS kalitlari:** asosiy lug'at so'zlari `a1-v*` idsi bilan yuradi. Reading
matnidan saqlangan glossariy so'zlari `gl-<so'z>` kaliti saqlanadi va Lug'at bo'limida
"matndan olingan" mavzusi bilan ko'rinadi (bir so'z nechta matnda uchramasin — bitta kalit).
Eski keshdagi `<matn>|gl-<so'z>` kalitlari `storage.migrate()`da avtomatik aylantiriladi.
Mock imtihonda sarflangan vaqt ham kundalik hisobga yoziladi (`mock-time`), lekin ball
dalili `mockAttempts`da qayta sanalmaydi.

**Sinxronlash:** "Hoziroq sinxronizatsiya qilish" avval serverdagi ma'lumotni o'qib qurilmadagisi bilan
birlashtiradi (`lib/merge.ts`: urinishlar/ishlar `id` bo'yicha, SRS — ko'proq takrorlangani, kunlik faollik —
maksimum), so'ng BUTUN navbatni jadval bo'yicha bulk so'rovlar bilan yuboradi. Serverga aynan shu ko'rinishda
yozilgan yozuvlar (`aea:synced:<uid>` izi) qayta yuborilmaydi. O'quv yo'li, XP va diagnostika
`learning_plans.plan` ustunida saqlanadi. Hisobga kirganda progress serverdan tiklanadi.

**AI holati:** interfeysda AI faqat HAQIQIY ulanganda "AI" deb ko'rsatiladi (`lib/ai.ts`). Serverless
funksiya joylashtirilmagan hozirgi holatda barcha tahlil `engine: 'rule-based'` bilan
bajariladi.

**Daraja siyosati:** 4 ta ko'nikmada kamida 4 tadan isbot, og'irlikli ball ≥ 72 (mock imtihon og'irligi 0.35, eski natijalar 30 kunlik "half-life" bilan kamayadi) → tizim keyingi darajani **tavsiya** qiladi; qaror foydalanuvchida.

**Maxfiylik:** speaking yozuvlari faqat brauzerda; serverga faqat matn transkripsiyasi va `audio_stored:false` yuboriladi; "Barcha ma'lumotni o'chirish" hisobga kirgan foydalanuvchida avval serverdagi barcha shaxsiy yozuvlarni o'chiradi (`profiles` qatori — hisobning o'zi — qoladi), so'ng qurilmadagi kesh, navbat va offline fayllarni tozalaydi. Server o'chira olmasa (masalan internet yo'q), qurilmadagi ma'lumot ham tegilmaydi.

## 7. Litsenziya va kontent

Audio fayllar Windows SAPI (`Microsoft Zira`) ovozi bilan generatsiya qilingan; manifestda litsenziya maydoni bo'sh — tashqi audio qo'shsangiz shu maydonga kiriting.
