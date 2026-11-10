# AI English Academy

**A1 → C1** darajalar bo'yicha shaxsiy ingliz tili platformasi. React 19 + TypeScript + Vite + Tailwind CSS 4 + PWA + Supabase.

Loyiha talabnomasi (`AI English Academy_v2.docx`) to'liq bajarilgan:

- ✅ To'liq **o'zbek tilli interfeys**
- ✅ **A1, A2, B1, B2, C1** darajalar; daraja faqat **ko'p ko'nikma dalili** bilan ko'tariladi (XP yoki kunlar emas), mock imtihon esa doim **"mashq uchun yaratilgan namuna"** deb yozilgan
- ✅ **90 daqiqalik** asosiy kunlik reja (Vocab 10 / Grammar 15 / Reading 15 / Listening 15 / Writing 20 / Speaking 15) — zaif ko'nikma va imtihon sanasiga qarab qayta taqsimlanadi
- ✅ **Foydalanish o'lchovi** (Progress, faqat qurilmada) — 5o-bo'lim
- ✅ **Talaffuz mashqi** (`/pronunciation`) va **Immersion rejimi** (tarjimasiz) — 5n-bo'lim
- ✅ **AI suhbatdosh** (`/conversation`) — rol o'yini, AI bo'lmasa stsenariy, xatolar mashqqa aylanadi (5m-bo'lim)
- ✅ **Hamjamiyat tekshiruvi** (`/community`), «Men qila olaman» dalili va yakunlash guvohnomasi — 5l-bo'lim
- ✅ **Real hayot suhbatlari** (`/dialogues`) — A1/A2 da 14 stsenariy va **Takrorlash menejeri** (xatolar + so'zlar bitta navbatda) — 5k-bo'lim
- ✅ **«5 daqiqa» tezkor sessiya** (`/quick`) — takror + bitta mavzudan yangi so'zlar, surish bilan baholash (5j-bo'lim)
- ✅ **14 sahifa**: Dashboard, Learning Path, Vocabulary, Grammar, Reading, Listening, Writing, Speaking, Mock Exam, Progress, Error Log, Settings, Login, 404
- ✅ Premium **dark/light** mavzu, to'liq **responsiv**; har joyda **loading / empty / success / error** holatlari
- ✅ **SRS lug'at** (SM-2): har so'z statistikasida tekshiruvlar ikki marta sanalmaydi; Reading matnidan saqlangan glossariy so'zlari ham Lug'at bo'limida qayta ko'rinadi va takrorlanadi
- ✅ Tinglash uchun **HAQIQIY audio** (`npm run audio:build` — Windows SAPI). Manifestda fayli bo'lmagan audio uchun pleyer umuman ko'rsatilmaydi — soxta tugma yo'q
- ✅ Speaking audio **rozilik siz serverga yuborilmaydi** (`audio_stored: false`)
- ✅ **Jonli taymer** — sahifa yangilansa ham vaqt yo'qolmaydi (IndexedDB'da saqlanadi)
- ✅ **Offline / PWA**: sync navbati, Service Worker; logout'da avval sinxronlanadi (yuborilmagan narsa qolsa tasdiq so'raladi), so'ng kesh tozalanadi
- ✅ **Mobil ilova**: Dashboard yuqorisidagi blok PWA'ni bosh ekranga o'rnatadi (Android/kompyuter — "Ilovani o'rnatish" tugmasi, iPhone — yo'riqnoma); APK fayl shart emas
- ✅ **Native Android ilovasi** (`mobile/` — Kotlin + XML Views, `com.dadaxon.aienglishacademy`): bitta baza va bitta auth, **422 unit test**, qahramon har ekranda; DULO_mod.apk dan o'lchangan **darslar ketma-ketligi va harakat byudjeti** ikkala platformada — quyida 5b-bo'lim va
`mobile/MOBIL_ARXITEKTURA.md` 8-bo'limi
- ✅ **Server bilan ikki tomonlama**: hisobga kirganda progress serverdan tiklanadi va qurilmadagisi bilan birlashtiriladi
- ✅ **Baza eski sxemada ham sinxron islaydi** (2026-11-08): `0003/0004` migratsiyalari qo'llanmagan bazada sozlamalar
  yozuvi yetib boradi (rad etilgan ustunlar tushiriladi), liga yozuvi navbatda saqlanadi va migratsiyadan keyin
  **o'zi** qayta yuboriladi; sabab foydalanuvchiga migratsiya fayli nomi bilan ochiq aytiladi — quyida 3b-bo'lim
- ✅ **Supabase RLS**: har foydalanuvchi faqat o'z qatorlarini ko'radi; service role va `AI_*` kalitlari faqat serverda
- ✅ AI "ulangan" deb ko'rsatilmaydi — AI bo'lmasa **qoidaviy dvigatel** (`engine: 'rule-based'`) ishlatiladi
- ✅ **A1 va A2 kontenti** — har biri 7 kun (`src/content/a1/`, `src/content/a2/`); aniq sonlar pastdagi o‘lchangan jadvalda
- ✅ **13 ta jadval** (`supabase/migrations/0001_init.sql`), ID'lar, `created_at`, FK va indexlar bilan; keyin `0002_fix_content_fk.sql` (FK), `0003_motion.sql` (harakat sozlamasi — `motion_enabled`) va `0004_weekly_xp.sql` (haftalik XP — real ligalar)
- ✅ Testlar: `tsc` tip tekshiruvi, ESLint (0 ogohlantirish), `vitest`, Playwright e2e + axe, production build, render tekshiruvi — har PR'da CI

### Joriy sonlar

<!-- STATS:START -->
_Avtomatik o‘lchandi (`npm run stats`, 2026-11-10). Qo‘lda tahrirlamang._

**Testlar:** vitest **490/490** (49 fayl) · **Kod:** veb 178 fayl / 43859 qator (TS/TSX), mobil 119 fayl / 29262 qator (Kotlin)

| Daraja | Kun | Lug‘at | Mashq | Turlar | Audio fayl / tinglash | Mock |
|---|---|---|---|---|---|---|
| A1 | 7 | 84 + 35 glossariy | 238 | multiple-choice 62, true-false-notgiven 49, gap-fill 37, translation 22, matching 18, word-order 15, multi-select 7, dropdown-cloze 7, categorize 7, sequence 7, short-answer 7 | 7/7 | bor |
| A2 | 7 | 84 + 35 glossariy | 238 | multiple-choice 69, gap-fill 42, true-false-notgiven 36, translation 21, matching 21, word-order 14, multi-select 7, dropdown-cloze 7, categorize 7, sequence 7, short-answer 7 | 0/7 | yo‘q |
<!-- STATS:END -->
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
   **Qaysilari qo'llanilganini bilish uchun:** `python -I scripts/check_supabase_schema.py`
   bazani faqat o'qib tekshiradi va nomlab aytadi (3b-bo'lim; 2026-11-09
   o'lchovda ham bu bazada 0003 va 0004 qo'llanmagan — jadval va ustunlar
   yo'qligi HTTP 404 `PGRST205` / 400 `42703` bilan tasdiqlangan).
4. **Lokal ishga tushirish:** `cp .env.example .env` ichiga ikki qiymatni yozing.
5. **GitHub Pages uchun:** GitHub'da repo → **Settings → Secrets and variables →
   Actions → Repository variables** ga `VITE_SUPABASE_URL` va `VITE_SUPABASE_ANON_KEY`
   ni qo'ying — keyingi deploy'lar ulangan holicha quriladi (workflow bu
   qiymatlarni o'qiydi). Barqaror qurilish uchun push qayta ishga tushirilsin.

| O'zgaruvchi | Qayerda | Izoh |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |frontend (build paytida qadoqlanadi) | Anon/publishable — omboraxona (public) hisoblanadi va RLS bilan himolanadi. Bo'sh → mahalliy rejim |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | **faqat server** | Service role kaliti hech qachon brauzerga chiqmaydi |
| `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY` (yoki `ANTHROPIC_API_KEY`), `AI_DAILY_LIMIT`… | **faqat server** | Bo'sh bo'lsa tahlil qoidaviy dvigatel bilan bajariladi |

### 3b. Baza sxemasi tekshiruvi — `scripts/check_supabase_schema.py`

**Nima uchun (2026-11-08, jonli o'lchov).** Ushbu loyihaning bazasida
(`igrzbfnsunedgyivmqlz`) 0001 va 0002 qo'llanilgan, **0003 va 0004 hali
qo'llanmagan edi** — bu jimgina ko'rinardi (`user_settings` yozuvi har safar
rad etilar, liga jadvali umuman yo'q). O'lchangan javoblar:

| So'rov | Javob |
|---|---|
| `GET /rest/v1/weekly_xp?select=*&limit=0` | **404, `PGRST205`** — "Could not find the table 'public.weekly_xp' in the schema cache" |
| `GET /rest/v1/user_settings?select=motion_enabled&limit=0` | **400, `42703`** — ustun bazada yo'q |
| `POST /rest/v1/user_settings` (3 ustun bilan) | **400, `PGRST204`** — matn konkret ustunni aytadi |

Skript shu tekshiruvni **faqat o'qib** qaytadi (POST/PATCH/DELETE yo'q,anon
kalit yetarli) va qaysi migratsiya yetishmayapti — aniq aytadi:

```bash
python -I scripts/check_supabase_schema.py            # .env / build.gradle dan oladi
python -I scripts/check_supabase_schema.py --json     # skriptlar uchun JSON
python -I scripts/check_supabase_schema.py --url https://xxxx.supabase.co --key sb_publishable_…
```

Chiqish kodi: **1** — migratsiya yetishmayapti, **0** — hamma qator BOR,
**2** — manzil/kalit topilmadi.

DDL (`alter table` / `create table`) anon kalit bilan **bajarilmaydi** —
PostgREST ixtiyoriy SQL qabul qilmaydi. Shuning uchun ikki yo'l:

1. **SQL Editor** (kalit talab qilmaydi): `0003_motion.sql` va
   `0004_weekly_xp.sql` ni ketma-ket Run qilib, skriptni qayta ishga tushirish.
   Tekshiruv so'rovi `jadval_bor=1, ustunlar=6, politsiyalar=4,
   sozlama_ustunlari=2` qaytishi kerak.
2. **`scripts/apply_migrations.py`** — Supabase **Management API** orqali
   (shaxsiy access token: https://supabase.com/dashboard/account/tokens):

```bash
python -I scripts/apply_migrations.py --dry-run              # reja, tarmoq yo'q
python -I scripts/apply_migrations.py --token-stdin --from 3 # token faylga TEGINMAYDI
python -I scripts/apply_migrations.py --token-file pat.txt --from 3
```

Skript tartibni saqlaydi, har faylni BUTUN holda yuboradi, birinchi xatoda
to'xtaydi, token matni chop etilmaydi/diskka yozilmaydi va oxirida avtomatik
qayta tekshiradi.

**Nega DDL'ni o'zimiz bajara olmadik (2026-11-08/09 o'lchovlari).** Har bir
yo'l tekshirildi va natijasi yozilgan — taxmin emas:

| Yo'l | O'lchangan natija |
|---|---|
| Anon kalit bilan `POST /rest/v1/...` DDL | PostgREST ixtiyoriy SQL qabul qilmaydi |
| RPC orqali (`/rpc/execute_sql`, `/rpc/exec_sql`, `/rpc/sql`) | **404 `PGRST202`** — bunday funksiya bazada yo'q |
| PostgREST OpenAPI speksi (`GET /rest/v1/`) | **401** — "Only secret API keys can be used for this endpoint" |
| GitHub Actions makronlari | `variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY`; **secrets: 0 ta** |
| Credential Manager (`jarvis-aqdu` xizmati) | `SUPABASE_ACCESS_TOKEN / SERVICE_ROLE / DB_PASSWORD` — **yo'q** (nomlar bo'yicha tekshirildi, qiymat o'qilmadi) |
| Brauzer sessiyasi (SQL Editor) | CDP bilan: SQL sahifasi `/sign-in?returnTo=…` ga qaytardi, monaco yo'q — **Supabase'ga kirilgan sessiya yo'q** |
| Management API (`api.supabase.com/v1/projects`) | Tarmoq ochiq, javob **401** — token so'raydi |

Ya'ni yetishmayotgan yagona narsa — **bitta PAT** (`SUPABASE_ACCESS_TOKEN`).
U berilsa 2-yo'l to'liq avtomatik ishlaydi; aks holda ilova eski sxemada ham
to'g'ri ishlaydi (quyidagi 5 band — veb va mobil testlarda qoplangan).

**Ilova bunday holatda nima qiladi (veb `src/lib/sync.ts` va mobil
`SyncEngine.kt` — ikkalasi BIR XIL siyosat):**

1. `user_settings` — PostgREST matni aytagan **ixtiyoriy** ustunni
   (`motion_enabled`, `xp_goal_xp`, `hearts_enabled`) so'rovdan tushirib
   qayta yuboradi: yozuv eski bazaga ham yetadi. Matn **biznik bo'lmagan**
   ustunni aytsa — hech narsa tushirilmaydi, yozuv ochiq "server qabul
   qilmadi" deb sanaladi (jimgina yo'qotish yo'q).
2. `weekly_xp` — jadval yo'q bo'lsa qator **navbatda qoladi** (fingerprint izi
   yozilmaydi), shuning uchun migratsiya qo'llanilgach keyingi sinxron uni
   **o'zi** qayta yuboradi.
3. Ustun tushirib yuborilgan bo'lsa iz **haqiqiy yozilgan** qator bo'yicha
   qo'yiladi — migratsiyadan keyin holat o'zgarmasa ham qator qayta
   navbatga tushadi va yetishmayotgan ustunlar to'ldiriladi.
4. `pullRemote` da `profiles` / `weekly_xp` o'qilmasa o'qish **yiqilmaydi**:
   progress qaytadi, liga maydoni bo'sh qoladi (`merge` eski snapshotni
   saqlaydi — **son ixtir qilinmaydi**).
5. Xulosa foydalanuvchiga ko'rsatiladi: «Baza eski sxemada — baza eski:
   `0004_weekly_xp.sql` migratsiyasi qo'llanmagan… Supabase SQL Editor'ida
   shu skriptni bir marta bajaring» (vebda sinxron tugmasi ostida, mobilida
   sinxron xabari sifatida). "Barcha ma'lumotni o'chirish" ham jadval yo'q
   bo'lsa to'xtab qolmaydi (eski holatda u tugma butunlay ishlamasdi).


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
npm run lint          # eslint — 0 xato (CI: npm run lint:ci — ogohlantirish ham xato)
npm test              # vitest — aniq son «Joriy sonlar» blokida (npm run stats)
npm run build         # production build + Service Worker
npm run smoke         # dist'ni serverda ochib tekshirish + 375/1280 skrinshot
npm run render:check  # 16 marshrut CDP orqali: DOM + konsol xatolari + 375px telefonda yonga surilmasligi
npm run e2e           # Playwright: asosiy oqimlar + axe (WCAG AA), 1280px va 375px
npm run bundle:check  # boshlang'ich JS byudjeti (gzip ≤ 300 KB)
npm run stats         # README «Joriy sonlar» blokini o'lchab yangilaydi (CI: --check)
node scripts/make-share-images.mjs  # og-image.png + PWA manifest skrinshotlari (preview server kerak)
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

Tekshirilgan holat (2026-11-09): **397 unit test o'tdi** (36 klass, 0 fail /
0 error / 0 skip — `:app:testDebugUnitTest` XML laridan sanalgan). Son zanjiri
halol yozib qo'yiladi: 2026-11-06 dagi 268 → o'yin qatlami va mashq jarayoni
qo'shilgach **349** (§5d–§5e) → §5f Bo'limlar ikki klassi (`domain/SectionsTest`
12 ta, `domain/SectionJumpLogicTest` 7 ta) bilan **368 / 30 klass** → PR #6 ning
mobil klasslari (`domain/NewKindsCheckerTest` 7, `domain/ExportedContentParityTest` 1,
`domain/SelfAssessmentMergeTest` 1) rebase'dan keyin **377 / 33 klass**. → keyingi PR'larda (A2 pariteti va boshqalar) **387**; 2026-11-09 o'lchovida
ulardan bittasi eskirgan edi (`ContentRepositoryTest` — A2 qo'shilgach `[A1]` kutardi) →
tuzatildi; §5j «5 daqiqa» (`domain/QuickSessionTest` 10 ta) bilan **397 / 36 klass, 0 fail**.
`store/GameOpsTest` 15 ta — jonli do'kon `AppStore.reduceLocal` o'yin qatlamini
HAQIQATAN qo'llashini tekshiradi. API 26+
emulatorda barcha ekranlar ochiladi, ANR yo'q (`/data/anr/` bo'sh; Lug'at 117
so'zi bo'laklab chiziladi — `UI_KONTRAKTI.md`dagi qoida), `dumpsys gfxinfo`
95-persent kadr 61 ms. Emulatorda qayta tasdiqlangan: o'quv yo'lida zanjir
auditi satri **bir marta** ko'rsatiladi (sonlar vebda o'lchangani bilan bir xil),
Sozlamalarda harakat tugmasi "Yoniq ⇄ O'chiq" holatini almashtiradi,
true/false/notgiven mashqida javob qabul qilinadi (2/2 · 100%).
Supabase `publishable` kaliti mijozda ochiq ishlatiladi; **service-role kaliti
hech qaysi mijozga tushmaydi**. AI ulanmagan holda ilova halol
"Qoidaviy tahlil" deb yozadi (`engine: "rule-based"`).

Baza **eski sxemada** bo'lgan holat (0003/0004 qo'llanmagan) mobil tomonda ham
jonli transport soxtasi bilan tekshiriladi: `weekly_xp` 404 `PGRST205` javobida
qator navbatda qoladi va migratsiyadan keyingi `flush`da o'zi yetib boradi;
`user_settings`da rad etilgan 3 ustun tushirilib, yozuv yetkaziladi;
`pullRemote`da `weekly_xp`/`profiles` yo'q bo'lsa ham o'qish ok qaytadi.

Tayyor APK — GitHub Release [`v1.3.0-mobile`](https://github.com/Dadaxon82/AI_English_Academy/releases/tag/v1.3.0-mobile)
(**2026-11-09**, 1.3.0 / versionCode 4 — **BO'LIMLAR mobilda**, §5f): `app-release.apk`,
20 376 210 B (o'lchangan), SHA256
`54202620d522fc1ccb29d09ca893e0b9000e82c62701c2a04a42fb207ef25b69`. Imzo build'dan
keyin qayta tekshirildi (`apksigner verify --print-certs` — xato yo'q):
`Signer #1 CN=AI English Academy, OU=AEA, O=Dadaxon, L=Kokand, ST=Fergana, C=UZ`,
sertifikat SHA-256 `d59a899ff5b03a8d691df1e72afd99b66984bd5f5cd17bd1fd51311faf587e55`
(1.0.0, 1.1.0 va 1.2.0 bilan BIR XIL imzo kaliti — eski ustiga yangilanadi).
`aapt2 dump badging` — `versionCode='4' versionName='1.3.0'`; `resources.arsc`da
yangi bo'lim matnlari bor. Shu APK emulatorda (Pixel 3a API 34) jonli quvildi:
onboarding → Bo'limlar → A1.2 sakrash testi → natija kartasi va qayta chizilgan
holatlar; `logcat`da `FATAL EXCEPTION` 0.

Oldingi release — [`v1.2.0-mobile`](https://github.com/Dadaxon82/AI_English_Academy/releases/tag/v1.2.0-mobile)
(2026-11-08, 1.2.0 / versionCode 3 — mashq JARAYONI bilan, 5e-bo'lim): `app-release.apk`,
20 341 114 B; SHA256 `433abd3ee6e891a361748311850a37c28b07554e43f5d98b5f814db3386f5708`.

**1.2.0 APK build'dan KEYIN kiritilgan o'zgarishlar** (2026-11-09):
(1) 5d-bo'limdagi «sana izchilligi» — `settleLeaguePrize()` kunni devoldan o'zi
o'qimasligi tuzatildi (foydalanuvchi ko'radigan xulq O'ZGARMADI — prod'da `today`
har doim `todayKey()` (`store.tsx:101`, `GameOps.settle(...)`));
(2) **BO'LIMLAR pariteti** (PR #8 — §5f). Ikkalasi ham **v1.3.0 APK'siga kirdi**
(versionCode 4) — shuning uchun 1.2.0 hash'i o'zgarmadi, yangi release yangi
hash bilan chiqdi. Sonlar zanjiri halol: mobil 349 → 368 → **377**; veb PR #2–#4
dan keyin 314, PR #6 dan keyin 347, PR #7 dan keyin **355 test / 30 fayl**.

Oldingi release — [`v1.1.0-mobile`](https://github.com/Dadaxon82/AI_English_Academy/releases/tag/v1.1.0-mobile)
(2026-11-08, 1.1.0 / versionCode 2 — o'yin qatlami, mashq jarayonisisiz): `app-release.apk`,
20 336 378 B; SHA256
`0020345103c03dbaa9dac60c1c659296dcfbac038aca05707123341ac0664c09`. 2026-11-08 kuni
Release'dan **qayta indirib** `sha256sum` bilan solishtirilgan edi — hajm va SHA mos;
nusxa `S:\Agent-2026\AI_English_Academy_1.1.0_release.apk` da. Signer sertifikati
yuqoridagi bilan bir xil.

Undan oldingi release — [`v1.0.0-mobile`](https://github.com/Dadaxon82/AI_English_Academy/releases/tag/v1.0.0-mobile)
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
| Harakat mexanizmlari | `ui/Motion.kt` (stepIn, pop, stagger, fillChainCell, flyXp, tap, shake, press, playFeedback) | `Layout.useMotion()`, `animate-[var(--animate-*)]`, XP ko'rsatmasi, `lib/feedbackSound.ts` (Web Audio) |
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

**Sana izchilligi (2026-11-09 da tuzatildi).** `settle()` butun zanjirga kunni
BITTA marta beradi (`settle(data, now, today)`) — hech bir qadam devolni qayta
o'qimasligi shart. `settleLeaguePrize()` da bu buzilgan edi: «hafta hali davom
etmoqda» qarorini `weekStartOf(todayKey())` bilan o'zi hal qilardi, ya'ni BIR
XIL saqlanganma BIR XIL `today` bilan chaqirilsa ham natija kunga qarab
o'zgarardi. Natija testning o'zi ham kunga bog'lanib qolgandi (2026-11-09 da
aynan shu sababli vitest sinovi yiqildi). Ikkala tomonda bir xil tuzatildi:
veb `game.ts::settleLeaguePrize(data, today)` va mobil
`GameLogic.settleLeaguePrize(data, today)`; zanjir endi `settleLeaguePrize(d,
today)` deydi. Foydalanuvchi ko'rgan xulq O'ZGARMADI — prod'da `today` har doim
`todayKey()` (`store.tsx:101`, `AppStore.kt`/`GameOps.kt`), shuning uchun chiqarilgan
1.1.0/1.2.0 APK'larda ham xato yo'q edi. Regressiya endi ikkala tomonda ham sinovda:
`src/test/game-logic.test.ts` (bir snapshot, ikki xil `today`) va
`GameLogicTest::leaguePrizeUsesTheGivenDayNotTheWallClock`.

**Halol qoidalar:** yuraklar mock imtihon, diagnostika va bo'lim testlarida
jarima qilinmaydi (`HEART_FREE_SOURCES`, ekranda ochiq aytiladi); sozlamada
o'chirilsa darvoza butunlay yo'l qo'yadi; buyum/garov rad etilsa SABAB ochiq
ko'rsatiladi (`reasonUz`), son ixtir qilinmaydi; liga offline bo'lsa oxirgi
snapshot «halol» belgisi bilan ko'rsatiladi. Garov tugmasining HAQIQIY ishlashi
vebda `src/test/pages.test.tsx`da tekshiriladi: gem yetarli bo'lsa gem yechiladi
va ochiq garov ko'rsatiladi, yetmasa SABAB chiqadi, shartlar matni esa `gameConfig`
sonlari bilan bir xil ekanini solishtiradi.

## 5e. Mashq JARAYONI — jonli feedback (veb ↔ mobil, 2026-11-08)

Duolingo'dagi "jarayon hissi" **mexanikasi** olindi (brend/rang/maskot emas —
bosh qahramon bizniki: `Mascot.tsx` / `MascotView.kt`).

| Qism | Veb | Mobil | Son manbasi |
|---|---|---|---|
| Tepadagi siljiydigan jarayon chizig'i (eski `1/5` matni o'rniga; son `aria-valuetext`/`contentDescription`da qoldi) | `ExerciseRunner.tsx` `.aea-step-bar` | `fragment_exercise.xml` → `exBar` (`LinearProgressIndicator`) | mavjud `stepMs` (260 ms) — YANGI SON YO'Q |
| To'g'ri javob — zarba halqasi + qahramon "cheer" + XP otilishi | `@keyframes impact-ring`, `--animate-pop`, `--animate-xp` | `Motion.pop()`, `Motion.flyXp()` | `popMs` / `xpMs` |
| Noto'g'ri javob — silkinish, qahramon "encourage" (masxaralama YO'Q) | `@keyframes shake` (−7/+6/−4/+2 px), `.aea-outcome-wrong` | `Motion.shake()` (dp(7), `outcomeMs/5`) | `outcomeMs` (320 ms) |
| Javob ovozi — **fayl emas, sintez** (660+880 / 300 Gs) | `src/lib/feedbackSound.ts` (Web Audio) | `Motion.playFeedback()` (`AudioTrack` PCM) | `popMs/2` va `outcomeMs` |
| Combo chipi — `game.combo` HAQIQIY soni, `comboTracked` bo'lsa | `ExerciseRunner.tsx` | `exCombo` + `showCombo()` | `gameConfig.ts` ↔ `GameConfig.kt` (`HEART_COMBO_STREAK=5`) |
| Variant tugmasining bosilishi (o'sib joyiga tushadi) | `.aea-choice`, `@keyframes bump` (0.97→1.03→1) | `Motion.press()` + `pressOnTouch` (5 tugma turi) | **yangi maydon `pressMs` = 120 ms** |

**`pressMs` ixtira emas:** u byudjetdagi mavjud ikki sondan chiqadi —
√(`staggerMs` × `outcomeMs`) = √(40×320) ≈ 107 → 120 ms. Uchala manba bir xil:
`src/lib/motionManifest.ts` ↔ `data/MotionManifest.kt` ↔ `res/raw/motion_manifest.json`;
masshtab/uzamlik tengligi `src/test/motion.test.ts` va
`mobile/.../ui/ExerciseFeedbackTest.kt`da tekshiriladi.

**Halol qoidalar (testlar bilan qo'yilgan):**
- progress chizig'ida **faqat javob berilgan** mashqlar sanaladi (`index` + `checked`),
  `results` sanog'idan emas — ikkala tomonda bir xil;
- harakat o'chirilsa (`settings.motionEnabled`, `prefers-reduced-motion`,
  `animator_duration_scale`) chiziq **siljimaydi, joyiga o'tadi** — bar
  `transition` bilan ishlaydi, mavjud `html.no-motion` qoidasi uni o'chiradi;
- combo chipi `recordAttempt` chaqirmaydigan sahifalarda (`MockExam`, `Onboarding`)
  **chizilmaydi** — `game.combo` o'tgan darsdan qolgan son bo'lgani uchun;
  yurak allaqachon qaytgan bo'lsa "yana N — yurak qaytadi" deb aldashmaydi;
- ovoz uchun audio **fayl qo'shilmadi** (`public/audio/manifest.json` 8 yozuvda
  qoldi, `res/raw` da audio yo'q) — shu qoidaga zid soxta audio yo'q;
  ovoz bitta mavjud tugmadan boshqariladi (`settings.motionEnabled`), chunki
  alohida sozlama yangi DB ustuni + migratsiya + parallel ish degani (sabab
  kodda yozilgan); `prefers-reduced-motion` ovozni o'chirmaydi — u harakat so'rovi.

## 5f. Bo'limlar, yo'l xaritasi, dars rejimi va lug'at o'yini (2026-11-09)

PR #2/#3/#4 (commitlar `c5ad6d6`, `a612a41`, `22857df`, `387b5f7`; merelar
`4c3ded1`, `a3a3051`) qo'shdi:

| Qism | Fayl(qalar) | Izoh |
|---|---|---|
| Bo'limlar sahifasi (`/sections`) | `src/pages/Sections.tsx`, `src/lib/sections.ts` | A1.1…C1.2 rejalari; mavjud `skippedDays/completedDays` va `passedTests['jump:<id>']` ga yozadi — YANGI DB ustuni yo'q, `settings.currentLevel` o'zgarmaydi |
| Joriy bo'lim banneri va kartalar | `src/components/SectionBanner.tsx` | Duolingo mexanikasi, brendi emas |
| Zigzag yo'l xaritasi | `src/lib/pathMap.ts`, `src/components/DuoPathMap.tsx` | `LearningPath` va `Dashboard` shu ma'lumotni o'qiydi |
| Liga paneli | `src/components/LeaguePanel.tsx` | mavjud `game.league` snapshoti |
| Dars rejimi (barcha savollar bitta oqimda) | `src/components/ExerciseRunner.tsx` | jarayon chizig'i/combo/bosish qoidalari (§5e) saqlangan |
| Lug'at o'yini | `src/lib/wordGame.ts`, `src/components/WordGame.tsx`, `src/content/vocabEmoji.ts` | har javob `recordAttempt('practice')` + SRS bahosi; rasm — tizim emoji (fayl/tarmoq yo'q) |
| Tahlil hujjati | `docs/DUOLINGO_SECTIONS_TAHLIL.md` | har bir da'vo `[M]` (o'lchangan) yoki `[X]` (taxmin) deb belgilangan |
| Testlar | `src/test/sections.test.ts`, `src/test/word-game.test.ts` | veb testlari soni 297 → **314** (26 fayl) |

**Halol holat — veb ↔ mobil farqi (2026-11-09, yangilandi):** PR #2–#4 mobilda
hamdardisiz qoldi (`git diff --stat ee3d0f9 a3a3051 -- mobile` BO'SH edi).
**BO'LIMLAR qismi endi mobilda ham bor** (`claude/mobile-parity-boimlar` — PR #8,
`3d8dd32` + keyingi hujjat/test commitlari):

| Mobil qism | Fayl(lar) | Paritet dalili |
|---|---|---|
| Bo'limlar mantig'i | `domain/Sections.kt` | `src/lib/sections.ts` qoidalari 1:1; testlar `src/test/sections.test.ts` da'volari bilan moslama (12 ta), HAQIQIY `assets/content/a1.json` ustida |
| Sakrash testi mantig'i | `domain/SectionJumpLogic.kt` | `jumpPlan` (to'plam ochilishda qotiriladi), `jumpScore` (hissa = to'g'ri ? 1 : `partial`, bo'luvchi — savollar soni, mashq id'i bo'yicha), `jumpPassed` — 7 ta test; `chegaralarVebBilanBirXil` `src/lib/sections.ts`ni O'QIB `JUMP_PASS_SCORE`/`JUMP_ITEMS_PER_DAY` tengligini tekshiradi |
| Holat yozuvi | `store/AppStore.kt` → `StoreAction.SectionJump` | veb `store.tsx::section-jump` (`completedDays`, `passedTests['jump:<id>']`, daraja o'zgarmaydi) |
| Bo'limlar ekrani | `ui/SectionsFragment.kt` + `nav_graph` (`sectionsFragment`) | kartalar, progress chizig'i, to'rt holat, akkordeon, kontentdan namunaviy ibora, uch haqiqiy tugma; kontenti yo'q bo'limda tugma YO'Q |
| Joriy bo'lim banneri | `Rows.sectionBanner`, `ui/SectionBannerUi.kt`, `fragment_shell.xml` (`bannerBox`) | veb `SectionBanner.tsx` BILAN BIR XIL joyda — Dashboard va O'quv yo'li; rang mavzudagi `ok` = veb `bg-emerald-600` (#059669), yangi rang qo'shilmadi |
| Sakrash oqimi pleyerda | `ui/runner/ExerciseFragment.kt` (`ARG_SECTION_ID`, `jumpOutcomes`, `finishJump`, `restartJump`) + `jumpResultCard` | yuraklar sarflanmaydi (`HEART_FREE_SOURCES` — ikkala tomonda), dars bonusi beriladi (veb `completeLesson`), natija kartasi faqat sakrashda ko'rinadi |

Mobil testlar: 349 → 361 (`SectionsTest`) → 368 (`SectionJumpLogicTest`) →
PR #6 uch klassi rebase'dan keyin **377 test / 33 klass, 0 fail/skip**
(`:app:testDebugUnitTest`). Emulatorda (Pixel 3a API 34, debug APK) JONLI
tasdiqlangan: Boshqaruv tepasida «A1.1-bo'lim · 1-kun — Salomlashish va sinf
tanishuvi» banneri va «BO'LIMLAR» tugmasi; Bo'limlar ekranida A1.1 Joriy
(0 / 4 kun), A1.2 Qulflangan (0 / 3 kun) + «A1.2 ga sakrash testi», A2.1 va
qolganlari «Tayyorlanmoqda» (tugmasiz), namunaviy iboralar kontentdan
(«Hello, my name is Samir.»); sakrash dialogi «12 ta savol, oldingi 4 ta kunning
yakuniy testlaridan… 80% kerak»; 12 savolli testni 1 to'g'ri javob bilan
tugatganda umumiy hisob «1/1 to'g'ri · 100%» (javob berilganlarga) va sakrash
natijasi **8%** (`round(1/12·100)`) — «Natija: 8% < 80% — sakrash uchun yetarli
emas» + «Qayta urinish»/«Yopish» tugmalari. Bo'sh javobda halol «0%».
**O'TISH YO'LI ham jonli tasdiqlangan:** `tools/jump_drive3.py` (emulator
yordamchisi, repoga kiritilmagan) testni HAQIQIY kontent javoblari bilan 12/12 tugatdi —
natija kartasi «Sakrash testi topshirildi: 100% ≥ 80% — A1.2 ochildi» +
«O‘quv yo‘liga o‘tish»/«Yopish» («Qayta urinish» yashirin, vebdagidek); keyin
Bo'limlar qayta chizilganda **A1.1 ✓ Yakunlangan — «Barcha 4 kun yakunlangan»**,
**A1.2 Joriy bo'lim · 0 / 3 kun** (+ «Davom etish»), A2.1 «Tayyorlanmoqda»;
Boshqaruv banneri «A1.2-bo'lim · 1-kun — Ovqat va ichimliklar…» ga o'zgardi.
Yuraklar sarflanmadi, xulosa satri o'zgarmadi: «Daraja oshirish uchun kamida 4
ko'nikma bo'yicha dalil kerak… XP va kunlar soni darajani o'zgartirmaydi».
Pleyer xulqi (o'lchangan, yordamchi shunga mos yozildi): matchingda «Tekshirish»
tugmasi YO'Q — juftliklar yopilganda avtomatik tekshiriladi; `wordBank` li
gap-fill-da chip bosilsa NAVBATDAGI bo'shliq to'ladi (`fillFirstEmptyGap`);
oxirgi savolda tugma «Yakunlash» (`ex_finish`).

**Hali mobilda YO'Q** (vebda bor, keyingi mobil ish): zigzag yo'l xaritasi
(`pathMap.ts`/`DuoPathMap.tsx`), `LeaguePanel`, dars rejimi (bitta oqim),
lug'at o'yini (`wordGame.ts`/`WordGame.tsx`) va **Xatolar daftarining 4 o'yin
usuli** (`mistakes.ts`/`remix.ts`/`MistakeGames.tsx` — §5h) — `mobile/` da bu
nomlarda fayl yo'qligi qayta ro'yxatdan tekshirildi. **Mobil APK v1.3.0** §5d/§5e
bilan birga **§5f Bo'limlar** qatlamini ham o'z ichiga oladi (release note'ida
ro'yxat qilingan); qolganlari keyingi mobil ish.

## 5g. PR #6 — 5 yangi mashq turi, o'z-o'zini baholash (2026-11-08, main)

PR #6 (`0a5634c`, merge `4ef3c38`) veb va mobilni BIRGA o'zgartirdi:

| Qism | Veb | Mobil |
|---|---|---|
| Yangi mashq turlari (5 ta): `multi-select`, `dropdown-cloze`, `sequence`, `categorize`, `short-answer` | `src/lib/check.ts` (+ qisman ball), `src/components/ExerciseRunner.tsx` | `domain/AnswerChecker.kt` (5 tekshiruvchi — veb bilan bir xil), `ui/runner/ExerciseFragment.kt` |
| A1 kontenti: har turdan 7 tadan (35 mashq) | `src/content/a1/new-types.ts` | `assets/content/a1.json` qayta eksport qilingdi (`manifest`: 211 → **246** eksport, core 203 → **238**, mock 8 o'zgarishsiz) |
| O'z-o'zini baholash (CEFR «Men … qila olaman», 1–5 Likert) — darajaga va XP'ga TA'SIR QILMAYDI | `src/components/SelfAssessment.tsx`, `src/content/canDo.ts`, `plan.selfAssessment` orqali sinxron | `Models/Merge/SyncEngine/SyncProtocol` — o'qiladi, birlashtiriladi (veb baholari o'chmaydi), qayta yuboriladi |
| Kontent auditi: yangi 6 qoida | `src/test/content-audit.test.ts` | `domain/ExportedContentParityTest.kt` (haqiqiy `a1.json` Gson bilan o'qilib 35 mashq yechiladi) |
| Dars rejimi / testlar | `src/lib/lessons.ts`, `LessonPlayer.tsx`, `SectionLessons.tsx`, `src/test/lessons.test.ts` | `domain/NewKindsCheckerTest.kt`, `SelfAssessmentMergeTest.kt` |
| Tahlil hujjati | `docs/TOPSHIRIQ_TURLARI_TAHLIL.md` («16 xil topshiriq» PDF bo'yicha 14 tur + loyihadagilar bilan solishtirish) | — |

Eslatma: PR #6 eksportni yangilagan, ammo `ContentRepositoryTest.kt` dagi A1
kuchalarini (211 / 203 / tur jadvali) yangilmagan — CI mobil testni ishga
tushirmagani uchun uzilish sezilmagan (`deploy.yml` mobil gradle bosqichi
yo'q). `13ae16d` da (`claude/mobile-parity-boimlar`) bu kuchalar fayldan
qayta o'lchangan qiymatlarga
keltirildi (246 / 238 + 5 yangi tur soni), ya'ni test endi HAQIQIY eksportni
kuzatadi, eski sonni emas.

Mobil testlar to'plami qayta o'lchandi (rebase'dan keyin, `:app:testDebugUnitTest`):
**377 test / 33 klass, 0 fail / 0 skip** — PR #8 main'ga birlashganidan KEYIN ham
shu sonlar o'zgarmadi (PR #7 faqat veb fayllarga tegdi, `mobile/` ga tegmadi).
Veb: `tsc` 0 xato, ESLint 0 xato
(27 ogohlantirish — bazaviy), `vitest` **355 test / 30 fayl** (main'da, PR #7
bilan — qayta o'lchandi), build, smoke,
`render:check` 16 marshrut (375 px yonga surilmasligi bilan) — hammasi OK.

Bo'limlar qo'shilgan branchda **release** yo'li ham tekshirildi (2026-11-09):
`:app:assembleRelease` BUILD SUCCESSFUL (1 m 14 s) va `:app:lintVitalRelease`
BUILD SUCCESSFUL (52 s) — `app-release.apk` 20 376 206 B, SHA256
`e74c2accdca14aa044956632cd6be8cb2c9605491b2334d1e40c09dc16441228`, imzo
`apksigner verify` OK (sertifikat SHA-256 `d59a899f…87e55` — 1.0.0/1.1.0/1.2.0
bilan BIR XIL kalit); `aapt2 dump badging` — `versionCode='3' versionName='1.2.0'`,
`resources.arsc`da yangi bo'lim matnlari bor («sakrash testi», «Yakunlangan»,
«Joriy bo'lim», «O'quv yo'liga», «Barcha %1$d kun»). **Shu APK emulatorda
jonli quvildi** (uninstall → install, chunki imzo kaliti rasm bilan farq qiladi):
onboarding → Bo'limlar → sakrash testi 12/12 → «Sakrash testi topshirildi:
100% ≥ 80% — A1.2 ochildi», Bo'limlarda A1.1 ✓ Yakunlangan / A1.2 Joriy;
`logcat`da `FATAL EXCEPTION` soni **0**. Keyin PR #8 main'ga birlashdi
(`aaee1d8`), `versionCode` 3 → 4 / `versionName` 1.2.0 → 1.3.0 ko'tarildi va
**v1.3.0-mobile** release'i shu main'dan chiqarildi (yuan blokda — hajmi va
SHA256 diskdan o'lchangan).

## 5h. PR #7 — Xatolar daftarining 4 o'yin usuli (2026-11-09, main)

PR #7 (`71b1a91`, merge `9001763`) — foydalanuvchi xatolarini qayta ishlashni
o'yin ko'rinishiga keltirdi. **Faqat veb.**

| Qism | Fayl | Mantiq |
|---|---|---|
| 4 o'yin rejimi | `src/lib/mistakes.ts` (sof funksiya) | `fix` — tuzatilmagan xatolar (eng yangisi birinchi, ≤10); `hard` — 2+ marta xato qilinganlar (≤8); `remix` — xato mashq BOSHQA formatda (≤8); `timed` — vaqtga qarshi, aralash tartibda (≤15). «Tuzatilmagan xato» = mashqning ENG OXIRGI urinishi noto'g'ri; to'g'ri yechilsa ro'yxatdan O'ZI chiqadi (alohida «o'chirish» holati yo'q) |
| «Boshqa ko'rinishda» qayta qurish | `src/content/remix.ts` | `gap-fill → dropdown-cloze` (to'g'ri javob + o'quvchining xato javobi + bankdagi chalg'ituvchi), `dropdown-cloze → gap-fill`, `multiple-choice → short-answer` (1–3 so'z bo'lsa), `translation → word-order`. Boshqa turlarda `null` — o'yin asl mashqni beradi. Deterministik aralashtirish (id bo'yicha) |
| `findExercise` remix'ni tiklaydi | `src/content/index.ts` | `remix-<id>` → asl mashqdan qayta quriladi (son ixtir qilinmaydi, faqat format o'zgaradi) |
| O'yin ekrani | `src/components/MistakeGames.tsx`, `src/pages/ErrorLog.tsx` | kartalar + umumiy `LessonPlayer`; qahramon — `MascotFigure` (bizniki); `LessonStep.badgeTone: 'new'|'fix'` (`src/lib/lessons.ts`) |
| Testlar | `src/test/mistakes.test.ts` | veb testlari **347 → 355** (29 → 30 fayl) |
| Skrinshotlar | `docs/screenshots/errors-*.png` | 5 ta (rejim + mobil taqqoslash) |

**Mobilda hali YO'Q** — `git ls-files mobile` da `mistakes`/`remix`/`MistakeGames`
nomlari yo'q (qayta ro'yxatdan ko'rildi). Bu keyingi mobil ish: mavjud
`Attempts`/urinishlar ma'lumoti va `AnswerChecker` bilan qurilishi mumkin,
lekin hozircha mobil Xatolar ekranda bu 4 rejim yo'q — §5fdagi «Hali mobilda
YO'Q» ro'yxatiga qo'shildi.

## 5i. PR #9 — yo'l xaritasining ko'rinmasligi va yangi ko'rinish (2026-11-09, main)

PR #9 (`f4a2b9c`, merge `9f4b109`) — **faqat veb**, `mobile/` ga umuman tegmagan
(`git diff aaee1d8..f4a2b9c -- mobile` bo'sh). Xarita ekrani (zigzag yo'l) oldin
buzilgan edi: har tugunning O'Z `<g transform="translate(…)">`iga CSS animatsiyasi
(`transform: scale`) qo'yilgan, CSS esa SVG atributini bosib tugunlarni (0,0) ga
yig'ardi — ekranda faqat chiziq qolardi. Qahramon ham pikselda joylanib SVG
masshtablangani uchun yuqorida kesilardi. Endi joylashuv tashqi `<g>`da, animatsiya
ichki `<g>`da (`transform-box: fill-box`), qahramon SVG ichida.

- Ko'rinish (dizayn va qahramon BIZNIKI — Duolingo brendi/rangi nusxalanmagan):
  tugunlar yumshoq to'lqin bo'ylab, joriy tugunda halqa + «BOSHLASH», kun yakuniy
  testida kubok, kun yarmida sandiq, kunlar orasida ajratgich; bo'lim oxirida sovrin
  tuguni «A1.2-bo'lim — N ta vazifa qoldi»; tepada «Keyingi maqsad» yo'l-progressi.
- Sonlar ixtir emas: `src/lib/sections.ts::pathMilestoneSpecs(level)` HAQIQIY kun
  va testlar sonidan chiqadi; `pathMap.ts` banner/sovrin uchun alohida vertikal joy
  ajratadi.
- Skrinshotlar: `docs/screenshots/map-path.png`, `map-dashboard.png`,
  `map-milestone.png`, `map-mobile.png`.

`sections.ts` o'zgargani uchun mobil to'plam qayta o'lchandi: **377 test / 33 klass,
0 fail / 0 skip** — `SectionJumpLogicTest.chegaralarVebBilanBirXil` yashil
(`JUMP_PASS_SCORE = 80`, `JUMP_ITEMS_PER_DAY = 3` o'zgarmagan). Veb darvozalar ham
shu main'da qayta o'lchangan: `tsc` 0 xato, ESLint 0 xato (27 ogohlantirish —
bazaviy), `vitest` **355 test / 30 fayl** (PR #9 test fayli qo'shmagan), build,
smoke, `render:check` 16 marshrut.

**Mobilda hali YO'Q** — xarita (`DuoPathMap`/`pathMap`) mobil tomonda yo'q (§5f
ro'yxatidagidek); PR #9 shu paritetni ochiq qoldiradi.

## 5j. «5 daqiqa» tezkor sessiya — Drops g'oyasi, 1-bosqich (2026-11-09)

`docs/TIL_PLATFORMALARI_TAHLIL_VA_PROMPT.md` dagi rejaning 1-bosqichi. G'oya Drops'dan
olingan (qisqa kunlik odat + vizual karta + surish), nom, dizayn va kontent bizniki.
Veb va mobil ilovada bir xil ishlaydi (mobil: 1.4.0 / versionCode 5).

| Nima | Qayerda |
|---|---|
| Karta navbati: avval muddati kelgan SRS so'zlari (xato qilinganlar birinchi, ko'pi bilan 12 ta), keyin **bitta mavzudan** 5 ta yangi so'z (faqat asosiy lug'atdan, chunki glossariy so'zlarida misol gap yo'q) | `src/lib/quickSession.ts::buildQuickDeck` |
| Surish: o'ngga «Bilaman» (`good`), chapga «Yana» (`again`). Chegara 80 px yoki karta enining 25 % i (qaysi biri katta bo'lsa) | `swipeGrade` |
| Sahifa `/quick`: rasm (`vocabEmoji.ts`, faqat aniq tasvirlanadigan so'zlarda), talaffuz, ← / → / Space, har harakatning tugma muqobili | `src/pages/QuickSession.tsx` |
| Dashboard kartasi «5 daqiqa boshlash» | `src/pages/Dashboard.tsx` |

**Halol qoidalar:**
- Vaqt mavjud devor-soat taymeri bilan o'lchanadi (`timer.ts`, sessiya kaliti `quick-<kun>`).
  Sahifa yangilansa qolgan vaqt saqlanadi. Sahifadan chiqilsa taymer **pauza** qilinadi,
  ko'rilmagan vaqt sanalmaydi.
- Vaqt yoki kartalar tugasa taymer to'xtaydi va haqiqatan o'tgan sekundlar kunlik faollikka
  (`activity[kun].skills.vocabulary`) yoziladi.
- Zanjir (streak) uchun yangi qoida yo'q. Mavjud `gameCore.ts::activeDayKeys` qoidasi
  (kunda ≥ 60 s faollik) 5 daqiqalik sessiyani o'zi qamraydi, bu testda tekshirilgan.
- 90 daqiqalik kunlik reja (`planning.ts`) o'zgarmaydi, «5 daqiqa» qo'shimcha «minimal kun».
- Karta yo'q bo'lsa (navbat bo'sh, hamma so'z o'rganilgan) «Boshlash» tugmasi ko'rsatilmaydi,
  o'rniga sababi va Lug'at bo'limiga havola chiqadi.

**Mobil (`mobile/`)** — bir xil qoidalar:

| Nima | Qayerda |
|---|---|
| Navbat, surish, qolgan vaqt (veb `quickSession.ts` ning nusxasi) | `domain/QuickSession.kt` |
| So'z rasmlari (veb `vocabEmoji.ts` bilan juftma-juft bir xil) | `data/VocabEmoji.kt` |
| Ekran: kirish / davom etish / ish / natija; barmoq bilan surish, «← Yana» / «Bilaman →» tugmalari, TTS talaffuz | `ui/QuickSessionFragment.kt` (`R.id.quickSessionFragment`) |
| Dashboard kartasi «5 daqiqa boshlash» | `ui/DashboardFragment.kt::addQuickCard` |
| Matnlar (`quick_*`) | `res/values/strings_extra.xml` |

Ekran ko'rinmay qolsa (`onPause`) taymer pauza qilinadi, qaytganda «Davom etish» chiqadi.
**Taymer pariteti tuzatildi:** mobil `TimerStart` pauzadagi XUDDI SHU sessiyani endi davom
ettiradi (veb `timer.ts::startTimer` bilan bir xil). Oldin yig'ilgan sekundlarni yozib, hisobni
noldan boshlardi: vaqt yo'qolmasdi, lekin sessiyaning qolgan vaqti tiklanmasdi.

**Testlar:** `src/test/quick-session.test.ts` (navbat tartibi, chegaralar, surish, zanjir),
`src/test/quick-session-page.test.tsx` (boshlash, klaviatura/tugma baholash, vaqt tugashi,
pauza va qayta ochilganda davom etish), e2e `flows.spec.ts` (Dashboard → sessiya → surish),
`a11y.spec.ts` (`/quick` va sessiya ichida, light/dark, kompyuter va 375 px). Mobil:
`QuickSessionTest.kt` (10 test: veb bilan bir xil holatlar, veb fayllaridan o'qib sonlar va
89 ta so'z rasmi pariteti, zanjir qoidasi). `gradle testDebugUnitTest`: **397/397**
(2026-11-09). Shu o'lchovda eskirgan bitta test ham tuzatildi:
`ContentRepositoryTest` manifestda faqat `[A1]` kutardi, A2 esa `7df8def` da qo'shilgan edi.

## 5k. Real hayot suhbatlari va Takrorlash menejeri — Babbel g'oyasi, 2-bosqich (2026-11-09)

`docs/TIL_PLATFORMALARI_TAHLIL_VA_PROMPT.md` rejasining 2-bosqichi. G'oya Babbel'dan
olingan (real vaziyatdagi dialoglar + xatoga asoslangan takrorlash), matnlar va dizayn
bizniki. **Faqat veb**: mobil ilovaga keyingi PR'da qo'shiladi.

| Nima | Qayerda |
|---|---|
| Kontent turi `Dialogue` (rollar, replikalar, o'zbekcha tarjima, bo'shliq + izoh, «Nega shunday?») | `src/content/types.ts` |
| 14 ta suhbat: A1 va A2 ning har kuniga bittadan, kun mavzusiga mos (kafe, vokzal, shifokor, ish suhbati…), har birida 3 ta bo'shliq | `src/content/dialogues.ts` |
| Bo'shliq → tanlov mashqi `dlg-<suhbat>-<qator>`; `findExercise()` uni id'dan tiklaydi | `dialogueExercise`, `src/content/index.ts` |
| Dars: o'qish (tarjima tugmasi, TTS) → 3 bo'shliq (suhbat qayta ochiladi) → «Nega shunday?» | `src/lib/lessons.ts::dialogueLesson`, `src/pages/Dialogues.tsx` (`/dialogues`, menyuda «Suhbatlar») |
| Takrorlash menejeri: tuzatilmagan xatolar va muddati kelgan so'zlar bitta navbatda (navbatma-navbat, ko'pi bilan 12) | `src/lib/reviewManager.ts`, `src/pages/ErrorLog.tsx` |

**Halol qoidalar:**
- Suhbat holati alohida saqlanmaydi: «2/3 to‘g‘ri» har bo'shliqning eng oxirgi urinishidan
  hisoblanadi (`dialogueProgress`).
- Har javob `recordAttempt` orqali yoziladi. XP, yuraklar va xatolar daftari alohida kodsiz ishlaydi.
- **Bitta xato ikki marta sanalmaydi.** Agar xato so'z bilan bog'liq bo'lsa (`vocab-quiz-`,
  `vocab-pic-`, `vocab-sent-`) va o'sha so'zning takrorlash vaqti ham kelgan bo'lsa, ular
  bitta qadamga birlashadi. Javob SRS'ga **qadam uchun bir marta** yoziladi: dars oxiridagi
  qayta urinish ikkinchi baho bermaydi.
- Lug'at savoli id'dan tiklanganda faqat to'g'ri javobga ega bo'ladi. Shuning uchun
  Takrorlash menejeri bunday savolni to'liq variantlar bilan qayta yasaydi (id o'zgarmaydi).
- Kontent auditi (`src/test/dialogues.test.ts`) quyidagilarni tekshiradi: har kunga bitta
  suhbat, 3 ta bo'shliq, `___` aynan bitta, javob variantlar ichida bir marta, variantlar
  takrorlanmaydi, tarjima va izoh bo'sh emas, to'g'ri javob o'rni har xil.

**Yo'l-yo'lakay tuzatilgan:** dars ichidagi «Matnni ko‘rish» tugmasi (`LessonPlayer`, O'qish
darslarida ham bor) `text-sky-600` rangda edi va oq fonda kontrast ~4,1:1 bo'lardi. Endi
`sky-700 / dark:sky-300` (WCAG AA). Buni yangi a11y testi (dars ichida savol qadami) topdi.

**Testlar:** `dialogues.test.ts` (kontent auditi, id'dan tiklash, xatolar daftari, dars
tuzilmasi, holat), `review-manager.test.ts` (birlashtirish, tartib, chegara),
`dialogues-page.test.tsx` (suhbat oxirigacha; menejerda SRS bir marta baholanishi),
e2e `flows.spec.ts` (suhbat → xatolar menejerda) va `a11y.spec.ts` (`/dialogues` hamda
dars ichida; light/dark; 1280 va 375 px).

## 5l. «Men qila olaman» dalili, hamjamiyat tekshiruvi va guvohnoma — Busuu g'oyasi, 3-bosqich (2026-11-10)

`docs/TIL_PLATFORMALARI_TAHLIL_VA_PROMPT.md` rejasining 3-bosqichi. **Faqat veb** (mobil — keyinroq).

| Nima | Qayerda |
|---|---|
| Har «Men qila olaman» da'vosi ostida haqiqiy dalil: shu daraja va ko'nikma bo'yicha urinishlar + mock imtihon bo'limlari. Holat: «dalil yo'q / yetarli emas / mashq kerak / natija bilan tasdiqlandi» | `src/lib/canDoEvidence.ts`, `src/components/SelfAssessment.tsx` (Progress) |
| Hamjamiyat tekshiruvi: yozma javob yoki nutq **matni** (audio emas) rozilik bilan yuboriladi. Server tekshiruvchiga bitta javob **tayinlaydi**: baho 1–5 va izoh 10–1000 belgi. Shikoyat va avtomatik yashirish bor | `supabase/migrations/0006_peer_review.sql`, `src/lib/peer.ts`, `src/pages/Community.tsx` (`/community`, menyuda «Hamjamiyat») |
| Daraja yakunlash guvohnomasi (PNG, brauzerda chiziladi). Ochilish sharti — darajaning barcha kunlari yakunlangan bo'lishi. Matnda doim **«rasmiy sertifikat emas»** deb yoziladi | `src/lib/certificate.ts`, `src/lib/certificateDraw.ts`, `src/components/CertificateCard.tsx` (Progress) |

**Server qoidalari (0006):**
- Tekshiruvchi faqat o'ziga tayinlangan va yashirilmagan javobni ko'radi.
- Muallif faqat o'zinikini va unga kelgan yashirilmagan izohlarni ko'radi.
- Bir javobga bir tekshiruvchi bitta izoh yozadi. Har javobga ko'pi bilan 2 ta izoh.
- Tayinlovni yig'ib olib bo'lmaydi: bir vaqtda bitta ochiq tayinlov.
- Kuniga ko'pi bilan 5 ta javob yuborish mumkin.
- Javobga 2 ta shikoyat tushsa u yashiriladi. Izohga muallif shikoyat qilsa izoh yashiriladi.
- Shikoyat qilgan tekshiruvchiga o'sha javob qayta tayinlanmaydi.
- Hech bir jadvalda UPDATE ruxsati yo'q: holatni faqat triggerlar o'zgartiradi.

Migratsiya qo'llanmagan bazada sahifa buni ochiq aytadi va fayl nomini ko'rsatadi
(`peerErrorUz`). Mehmon rejimida yoki server ulanmaganda ham faqat sabab ko'rsatiladi,
soxta ro'yxat chiqmaydi.

**SQL testlari (yangi):** `supabase/tests/peer_review.test.sql`. Ular lokal Postgres'da
`_supabase_stub.sql` orqali Supabase'ning `auth.uid()` va rollarini taqlid qiladi.

```bash
PGHOST=/var/run/postgresql PGUSER=postgres bash scripts/test-sql.sh   # → peer_review: OK
```

CI'da alohida `sql` job (Postgres 16 xizmati) ularni har PR'da ishga tushiradi. Testlarning
o'zi ham tekshirildi: bitta RLS qoidasi ataylab buzilganda test darhol yiqildi.

**Testlar:** `peer.test.ts` (chegaralar, xato → sabab, so'rovlar, mehmon/server yo'q holati),
`community-page.test.tsx`, `cando-certificate.test.ts`; a11y: `/community` (light/dark, 1280 va 375 px).

**Qilinmagan:** tekshiruvchiga gem mukofoti. O'yin sonlari veb, `game_manifest.json` va
`GameConfig.kt` da bir xil turishi shart, shuning uchun mukofot mobil parite bilan birga
qo'shiladi.

## 5m. AI suhbatdosh (rol o'yini) — Memrise / Ling g'oyasi, 4-bosqich (2026-11-10)

`docs/TIL_PLATFORMALARI_TAHLIL_VA_PROMPT.md` rejasining 4-bosqichi. **Faqat veb** (mobil — keyinroq).

| Nima | Qayerda |
|---|---|
| Server: hamsuhbat rolida keyingi replika, o'quvchining oxirgi replikasidagi xatolar (≤ 3) va foydali so'zlar (≤ 3). Javob JSON schema bilan tuzilgan. Model `claude-opus-5-5`, `effort: low`. Zaxira model (`fallbacks: default`) va `ai_usage` kunlik limiti `ai-feedback` bilan umumiy | `supabase/functions/ai-roleplay/index.ts`, `supabase/functions/_shared/roleplay.ts` |
| Mijoz: chaqiruv, stsenariy rejimi, namuna bilan solishtirish, lug'atdagi so'zni topish | `src/lib/roleplay.ts`, `src/lib/ai.ts::callAiFunction` |
| Sahifa `/conversation`: vaziyat tanlanadi (14 ta suhbat bilan bir xil), javob yoziladi yoki aytiladi (Web Speech API, qo'llanmasa sabab aytiladi) | `src/pages/Conversation.tsx`, `src/lib/useSpeechInput.ts`; havolalar «Suhbatlar» va «Gapirish» sahifalarida |
| Tuzatish → «to'g'ri gapni tuzing» mashqi. Ma'lumot to'liq id ichida (`rpfix-` + base64url), `findExercise()` uni tiklaydi | `src/content/index.ts::roleplayFixId / roleplayFixExercise` |

**Halol qoidalar:**
- Dvigatel ekranda doim yoziladi: «AI hamsuhbat» yoki «Oldindan yozilgan stsenariy».
- AI ulanmagan bo'lsa (bayroq o'chiq, internet yo'q yoki server sozlanmagan) suhbat stsenariy
  bo'yicha boradi. Javob namuna bilan so'zma-so'z solishtiriladi va «bu baho emas» deb yoziladi;
  soxta ball yoki soxta xato chiqmaydi.
- AI xatosida (limit, tarmoq, sxemaga mos emas) o'quvchi replikasi yo'qolmaydi. Sabab ko'rsatiladi
  va ikki tanlov taklif qilinadi: qayta yuborish yoki stsenariy bilan boshidan boshlash.
- Suhbatdagi xato «noto'g'ri urinish» sifatida yozilmaydi: aks holda o'quvchi har xato uchun yurak
  yo'qotardi. Buning o'rniga yakunda «Xatolar ustida ishlash» darsi taklif qilinadi. Unda
  noto'g'ri yechilgan mashq Xatolar daftari va Takrorlash menejeriga tushadi.
- AI aytgan so'zlardan faqat **lug'atimizda bor** bo'lganlari SRS'ga saqlanadi. Lug'atda yo'qlari
  shunchaki ko'rsatiladi, yangi lug'at yozuvi yaratilmaydi.
- Audio hech qayerga yuborilmaydi: faqat brauzer tanigan matn ketadi.

**Joylash:** `supabase functions deploy ai-roleplay` (sekretlar `ai-feedback` bilan umumiy,
`VITE_AI_ENABLED=true`).

**Testlar:** `roleplay.test.ts` (so'rov va javob tekshiruvi, sxema, mijoz, stsenariy, solishtirish,
tuzatish mashqi), `conversation-page.test.tsx` (stsenariy oxirigacha; AI javobi → mashq va SRS;
AI xatosi → sabab va stsenariyga o'tish); e2e `flows.spec.ts` va a11y `/conversation`.

**Qilinmagan:** «real nutq klipi» (ona tili egasining audio yoki videosi). Litsenziyasi aniq
yozuvlar yo'q, shuning uchun bo'lim umuman ko'rsatilmaydi: soxta audio yoki video qo'shilmagan.
Edge funksiya bu muhitda Deno'da ishga tushirib ko'rilmadi (Deno yo'q). Umumiy mantiq
`_shared/roleplay.ts` vitest bilan tekshirilgan, funksiyaning o'zi esa `ai-feedback` andozasini
qatorma-qator takrorlaydi.

## 5n. Talaffuz mashqi va Immersion rejimi — Rosetta Stone g'oyasi, 5-bosqich (2026-11-10)

`docs/TIL_PLATFORMALARI_TAHLIL_VA_PROMPT.md` rejasining 5-bosqichi. **Faqat veb** (mobil — keyinroq).

| Nima | Qayerda |
|---|---|
| Talaffuz: gap tinglanadi (TTS) → aytiladi → brauzer tanigan matn namuna bilan so'zma-so'z (LCS) solishtiriladi. Natija: yashil (tanildi), qizil (tanilmadi), ortiqcha so'zlar va **taxminiy** moslik %. Gaplar suhbatlar kontentidan (3–12 so'z) | `src/lib/pronunciation.ts`, `src/pages/Pronunciation.tsx` (`/pronunciation`, havola Gapirish sahifasida) |
| Nutqni tanish (Web Speech API), umumiy hook | `src/lib/useSpeechInput.ts` |
| Immersion: o'zbekcha tarjima yashiriladi, so'z ma'nosi inglizcha izoh va misol orqali beriladi. «Tarjimani ko'rsatish» tugmasi doim bor | `src/lib/prefs.ts`, `src/components/UzTranslation.tsx`; Sozlamalar → «Immersion rejimi» |

**Halol qoidalar:**
- Talaffuz natijasi «taxminiy moslik» deb yoziladi, rasmiy talaffuz bahosi emas: brauzer nutqni qanday
  tanigani o'lchanadi. Brauzer nutqni tanimasa (Safari/Firefox) sabab oldindan aytiladi,
  «Aytish» o'chiriladi va ball chiqmaydi. Tinglash baribir ishlaydi.
- Brauzer bergan ishonch darajasi (`confidence`) faqat brauzer uni bersagina ko'rsatiladi.
- Talaffuz urinishlari kundalik urinishlarga (`attempts`) yozilmaydi: nutqni tanish xatosi
  ko'nikma dalilini buzmasligi uchun. Sessiya hisobi faqat ekranda ko'rinadi.
- Immersion rejimi **qurilma sozlamasi** (`localStorage`): hisob sozlamalari `user_settings`
  ustunlari orqali mobil ilova bilan bo'lishiladi, yangi ustun esa migratsiya va mobil paritetni
  talab qiladi. Bu Sozlamalarda ochiq yozilgan.
- Tarjima yashiriladigan joylar: lug'at ro'yxati va kartalari, «5 daqiqa», O'quv yo'li so'zlari,
  Suhbatdosh maslahati. Topshiriq va izohlar o'zbekcha qoladi.
- Karta `<button>` ichida bo'lgani uchun «Tarjimani ko'rsatish» tugmasi kartadan tashqariga
  qo'yilgan (ichma-ich interaktiv element bo'lmasin, axe talabi).

**Testlar:** `pronunciation-immersion.test.tsx` (moslash: tinish belgisi, apostrof, raqam,
tushib qolgan va ortiqcha so'z; gaplar ro'yxati; Immersion o'chiq/yoqilgan/ochish; sahifa nutqni
tanish yo'q va bor holatlarda, soxta `SpeechRecognition` bilan); e2e: Sozlama → lug'at kartasi,
a11y `/pronunciation`.

## 5o. Yangi funksiyalardan foydalanish o'lchovi — 6-bosqich (2026-11-10)

`docs/TIL_PLATFORMALARI_TAHLIL_VA_PROMPT.md` rejasining 6-bosqichi: qaysi funksiya haqiqatan
ishlatilayotganini va oxirigacha yetkazilayotganini ko'rish uchun.

| Nima | Qayerda |
|---|---|
| 8 ta funksiya uchun «boshlangan / yakunlangan» hisoblagichi va oxirgi sana. «Yakunlangan»ning ma'nosi har funksiyada ochiq yozilgan: masalan «5 daqiqa» — vaqt yoki kartalar tugaguncha, talaffuz — moslik ≥ 80% | `src/lib/usage.ts` (`FEATURES`) |
| Progress → «Yangi funksiyalardan foydalanish» jadvali: soni, tugatish foizi, «Tozalash» tugmasi | `src/components/UsageCard.tsx` |
| Hodisalar ulangan joylar: «5 daqiqa», Suhbatlar, Takrorlash menejeri, Suhbatdosh, Talaffuz, Hamjamiyat (yuborish va tekshirish), Guvohnoma | tegishli sahifalar |

**Maxfiylik:** hisob faqat shu qurilmada (`localStorage`) saqlanadi va hech qayerga
yuborilmaydi. Matn yoki javob saqlanmaydi, faqat sonlar va sana. Saqlov buzilgan bo'lsa,
noma'lum kalitlar va noto'g'ri sonlar tashlanadi (`parseUsage`). «Yakunlangan» soni hech qachon
«boshlangan»dan oshmaydi. Server jadvali ataylab qo'shilmadi: foydalanish ma'lumotini serverga
yig'ish alohida rozilik va maxfiylik siyosatini talab qiladi.

**Testlar:** `usage.test.tsx` (hisob, foiz, buzilgan saqlov, karta va tozalash) hamda sahifa
testlarida haqiqiy hodisa: «5 daqiqa» va Suhbat darsi tugaganda `finished` oshadi.

## 5p. Mobil ilova: 2–6-bosqichlar pariteti (2026-11-10, 1.5.0 / versionCode 6)

Vebdagi 2–6-bosqichlar Android ilovaga ko'chirildi. Qoidalar veb bilan bir xil, domen mantiqi
Kotlin'ga satrma-satr ko'chirilgan va testlar ham vebdagi holatlarni takrorlaydi.

| Bosqich | Mobil fayllar |
|---|---|
| 2. Suhbatlar + Takrorlash menejeri | `domain/Dialogues.kt`, `domain/ReviewManager.kt`, `ui/DialoguesFragment.kt`, `ErrorLogFragment` (menejer), `assets/content/dialogues.json` (eksport: veb `dialogues.ts` — bitta manba) |
| 3. «Men qila olaman» dalili, hamjamiyat, guvohnoma | `domain/CanDoEvidence.kt`, `domain/Peer.kt`, `data/PeerRepository.kt` (`SupabaseClient.insert/rpc`), `ui/CommunityFragment.kt`, `domain/Certificate.kt`, `ui/CertificateDrawer.kt` (Progress) |
| 4. AI suhbatdosh | `domain/Roleplay.kt`, `data/RoleplayClient.kt`, `ui/ConversationFragment.kt` (`BuildConfig.AI_ENABLED=false` — veb deploy bilan bir xil) |
| 5. Talaffuz + Immersion | `domain/Pronunciation.kt`, `ui/PronunciationFragment.kt`, `ui/DevicePrefs.kt` (Sozlamalar; lug'at ro'yxati, flashcard, «5 daqiqa», Talaffuz) |
| 6. Foydalanish o'lchovi | `domain/Usage.kt`, `ui/UsageTracker.kt` (faqat qurilmada), Progress jadvali |

Kirish nuqtalari Dashboard'da: Suhbatlar, Hamjamiyat, Suhbatdosh, Talaffuz.

**Paritet kafolatlari (testlar):**
- `DialoguesParityTest`: 42 ta `dlg-` mashq veb eksporti bilan maydonma-maydon bir xil.
- `RoleplayTest`: `rpfix-` id'si veb `roleplayFixId` bilan baytma-bayt bir xil (pin qiymatlar).
- `PeerAndCertificateTest`: hamjamiyat chegaralari veb `peer.ts` faylidan o'qib solishtiriladi;
  soxta HTTP transport bilan so'rov shakli (muallif id'si yuborilmaydi, JWT bor) tekshiriladi.
- `PronunciationTest`: A1 bo'yicha 43 ta gap, xuddi vebdagi kabi.

**Yo'l-yo'lakay tuzatilgan:** mobil mashq pleyerida id'dan tiklangan lug'at savoli bitta variantga
ega edi (xatolar o'yinlarida ham). Endi havuzdan 3 ta boshqa tarjima barqaror tasodifiy usulda
qo'shiladi (seed — mashq id'si).

**Tekshiruv:** `testDebugUnitTest` **422/422**, `assembleDebug` va imzolangan `assembleRelease` o'tdi.
Qurilmada sinalmagan: bu muhitda KVM yo'q, shuning uchun emulyator ishga tushirilmadi.

## 5q. Admin panel (`/admin`) — statistika va foydalanuvchilarni boshqarish (2026-11-10)

Faqat **faol admin** kiradi (`AdminRoute`), boshqalar Dashboard'ga qaytariladi. Menyuda «Admin panel»
havolasi faqat adminga ko'rinadi. Haqiqiy himoya **serverda**: UI'ni chetlab o'tish hech narsa bermaydi.

| Qism | Fayl |
|---|---|
| SQL: `profiles.role` / `status` / `avatar_url`, `is_admin()`, himoya trigger'i, admin RLS, bloklash, `admin_stats` / `admin_list_users` / `admin_delete_user` RPC'lari | `supabase/migrations/0007_admin.sql` |
| Mijoz qatlami (so'rovlar, xato → o'zbekcha sabab, `useIsAdmin`) | `src/lib/admin.ts` |
| Sahifa: 4 ta KPI, 30 kunlik ro'yxatdan o'tish (LineChart), darajalar taqsimoti (BarChart), jadval: qidiruv, rol/holat filtri, sahifalash, rolni joyida o'zgartirish | `src/pages/admin/AdminDashboard.tsx`, `src/components/admin/AdminCharts.tsx` |
| Tahrirlash modali: ism, rasm havolasi, rol, holat; xavfli zona — email qayta yozilganda hisobni o'chirish | `src/components/admin/UserManagementModal.tsx` |
| ProtectedRoute, skeleton, toast | `src/components/admin/AdminRoute.tsx`, `Skeleton.tsx`, `Toasts.tsx`, `useToasts.ts` |

**Xavfsizlik qoidalari (SQL testlari bilan tasdiqlangan — `supabase/tests/admin.test.sql`):**
- Mavjud «profiles: own row» siyosati o'z qatorini yozishga ruxsat beradi, shuning uchun `role` va `status`ni
  **trigger** himoya qiladi. Oddiy foydalanuvchi o'zini admin qila olmaydi, o'chirib qayta yaratib ham bo'lmaydi
  (INSERT'da rol majburan `user`).
- Oxirgi faol admin rolidan tushirilmaydi va bloklanmaydi. Admin o'zini bloklay olmaydi, adminni o'chirib bo'lmaydi.
- Admin RPC'lari `is_admin()`ni tekshiradi. Moderator va oddiy foydalanuvchiga ular yopiq, boshqalarning profili ko'rinmaydi.
- **Bloklash haqiqiy ta'sir qiladi:** bloklangan foydalanuvchi hamjamiyatga javob, izoh yoki shikoyat yubora olmaydi,
  javobni tekshirishga ololmaydi va AI xizmatidan foydalana olmaydi (RESTRICTIVE siyosatlar va trigger'lar).
  Shaxsiy o'quv ma'lumoti o'chirilmaydi.
- **Moderator** roli hozircha qo'shimcha huquq bermaydi: bu belgi kelajakdagi moderatsiya uchun.

**Talabdan ongli chetga chiqishlar:**
- XP, streak va daraja **qo'lda tahrirlanmaydi**. Ular o'quvchining haqiqiy yozuvlaridan hisoblanadi: XP `weekly_xp`dan
  (urinishlardan), streak `daily_activity`dan (bugun yoki kecha bilan tugaydigan ketma-ket faol kunlar), daraja
  `user_settings.current_level`dan. Qo'lda yozilgan son ilovaning o'z hisobi bilan zid bo'lib qolardi va loyiha
  qoidasini buzardi (dalilsiz ball yo'q).
- `full_name` mavjud `display_name` ustuni. Email nusxa qilinmaydi, `auth.users`dan o'qiladi.
- Darajalar: Beginner — A1–A2, Intermediate — B1–B2, Advanced — C1.
- Kod TypeScript'da, loyihaning mavjud tuzilmasiga mos. `supabaseClient.js` o'rniga mavjud `src/lib/supabase.ts` ishlatiladi.

**O'rnatish:**

```bash
npm install --save-exact recharts@3.10.1 lucide-react@1.61.0 react-is@19.3.1
```

`.env` — mavjud `VITE_SUPABASE_URL` va `VITE_SUPABASE_ANON_KEY` yetarli. Migratsiya: `0007_admin.sql`.
Birinchi adminni SQL Editor'da (server huquqi bilan) tayinlang:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'SIZNING@EMAIL');
```

**Bundle:** Recharts va ikonkalar alohida `admin-vendor` chunk'ida, faqat `/admin` ochilganda yuklanadi. Ular
PWA oflayn keshiga ham kirmaydi. Boshlang'ich JS 296.5 dan **182.6 KB gzip**ga tushdi: avval umumiy `vendor`
chunk'iga tushib qolgan edi.

**Testlar:** `admin.test.ts` (yordamchilar va so'rov shakli), `admin-route.test.tsx` (admin bo'lmagan foydalanuvchi
yo'naltiriladi), `admin-page.test.tsx` (KPI, rolni o'zgartirish va toast, qidiruv debounce, filtr, modal, o'chirishni
tasdiqlash, server xatosi), SQL `admin.test.sql`. Brauzerda soxta server javoblari bilan light/dark, 1280/375 px
holatlarida axe xato topmadi va gorizontal siljish yo'q.

## 5r. O'zbek lotin yozuvining yangi alifbosi: ö, ğ, ş, ç (2026-11-10)

Ilovadagi barcha o'zbekcha matnlar (veb, mobil, kontent, AI xabarlari) yangi alifboga o'tkazildi:
`o‘ → ö`, `g‘ → ğ`, `sh → ş`, `ch → ç`. Tutuq belgisi (`ma’lumot`) saqlanadi.

**Qanday o'tkazildi.** Matnlar TypeScript AST orqali o'tkazildi: faqat satr qiymatlari, JSX matni va
regexlar. Izohlar, CSS klasslari, id'lar va kod nomlari (`matchMedia`, `checkAnswer`) tegilmadi.
Inglizcha so'z va gaplar (`teacher`, `fish`, `o’clock`, `Laylo’s`, inglizcha o'qish matnlari) ham
o'zgarmadi. Ismlar inglizcha gap ichida inglizcha yozilishida qoldi (`Tashkent`, `Dilshod`).
Mobilda `strings.xml`, Kotlin satrlari va o'yin manifesti o'tkazildi; kontent esa
`scripts/export-content-mobile.mjs` bilan vebdan qayta eksport qilindi.

**O'quvchi eski yozuvda yozsa ham to'g'ri.** Javob tekshiruvi va lug'at qidiruvi ikkala yozuvni teng
ko'radi: veb `src/lib/uzAlphabet.ts` (`foldUzLatin`), mobil `AnswerChecker.kt`. «öqituvçi» ham,
«o'qituvchi» ham, «oʻqituvchi» ham to'g'ri. AI funksiyalarining system prompt'lari endi yangi alifboni
so'raydi.

**Imlo tuzatishlari (shu bilan birga):** Hayrli → **Xayrli**, xola, hola → xola, **amma**,
Birinci → **Birinçi**, Beket → **Bekat**, Samarkandga → **Samarqandga**, paragrafta → **paragrafda**,
bu yerde → bu **yerda**, «fe’l olga -s … qöşadi» → «**fe’lga** -s … **qöşiladi**», poneshanba →
**dushanba** (izohlarda). Tutuq belgisi noto'g'ri turdagi apostrof bilan yozilgan joylar tuzatildi
(fe‘l → fe’l, ma‘no → ma’no). 300 dan ortiq yopilmagan qo'shtirnoq tuzatildi (“can“ → “can”).

**Testlar:** `uz-alphabet.test.ts` (yozuvlar tengligi, kontentda eski «o‘/g‘» qolmagani), `check.test.ts`
va Kotlin `AnswerCheckerTest` (har xil apostrof va yangi alifbo bilan javob).

## 5s. Video shortlar — Memrise «Learn with Locals» g'oyasi (2026-11-10)

Memrise'da ona tilida so'zlashuvchilar real joylarda suratga olingan qisqa kliplarda iboralarni aytadi. O'quvchi
klipni ko'radi, keyin savolga javob beradi. Biz shu g'oyani mashq jarayoniga qo'shdik, lekin Memrise videolaridan
foydalanilmadi (mualliflik huquqi) va «haqiqiy odam» deb soxta video ko'rsatilmaydi.

| Qism | Fayl |
|---|---|
| Shortlar: 14 ta real hayot suhbatining har replikasi (85 ta: A1 — 43, A2 — 42), mashqlar `short-<suhbat>-<qator>-<m\|l>` (`findExercise` tiklaydi, Xatolar daftariga tushadi) | `src/content/shorts.ts` |
| Pleyer: gorizontal 16:9 oyna (dars ustuni kengligida), sahna (kafe, vokzal, shifoxona…), personajlar (gapirayotgani oldinda), ovoz — qurilmaning ingliz TTS'i, aytilayotgan so'z subtitrda yonadi, «🐢 Sekin», qayta ko'rish | `src/components/ShortPlayer.tsx`, `src/lib/shortPlayback.ts`, `src/components/shortScene.ts` |
| Mashq oqimi: suhbat darsiga 2 ta short (suhbatdoshning replikalari — bo'shliq javoblarini oshkor qilmaydi), `/shorts` sahifasida suhbat bo'yicha playlistlar | `src/lib/lessons.ts`, `src/pages/Shorts.tsx`, `ExerciseRunner` |

**Mashq (Memrise uslubi):** avval tomosha → savol. **Eshitish** («Qaysi gapni eshitdingiz?») va **ma'no**
(«Nima demoqchi?») navbatma-navbat. Subtitr va tarjima **javobdan keyin** ochiladi. Variantlar avval o'sha
suhbatdan olinadi, ya'ni mavzu bir xil bo'ladi va topish oson bo'lmaydi. Tartib id bo'yicha barqaror.

**Halollik:**
- Pleyer ostida har doim manba yoziladi: «Animatsion short · ovoz: qurilmangizning ingliz nutq sintezi».
- Qurilmada TTS ishlamasa, bu ochiq aytiladi va subtitr ochiladi. Ovozsiz «video» ko'rsatilmaydi.

**Haqiqiy video qo'shish:** klipni `public/video/` ga qo'ying va `public/video/manifest.json` ga
`{ shortId, src, speakerUz, license }` yozing (yo'riqnoma: `public/video/README.md`). O'sha short avtomatik
haqiqiy video bilan ko'rsatiladi, gapiruvchi va litsenziya ham yoziladi. Litsenziyasiz yoki noto'g'ri manzilli yozuv
qabul qilinmaydi.

**Testlar:** `shorts.test.ts` (kontent qoidalari, id tiklash, takrorsiz variantlar), `short-player.test.tsx` (TTS va
so'z yonishi, subtitr javobdan keyin, TTS yo'q holati, video manifesti, sahifa). `dialogues*.test` dars
tuzilmasi bilan, e2e: playlist oxirigacha va `/shorts` axe (light/dark, 1280/375).

**Personajlar (2026-11-10):** loyiha egasi bergan qahramon rasmlaridan fonsiz qirqib olingan:
`public/characters/teacher.webp` (Teacher), `doctor.webp` (Doctor), `traveler.webp` (Friend, New friend, Classmate),
`learner.webp` (o'quvchi, maskot). Sahnada ikkalasi butun bo'yi bilan turadi, gapirayotgani tebranadi va «•••» pufagi
chiqadi. Rasmi yo'q rollar (Waiter, Shop assistant, Ticket clerk, Landlord, Manager, Colleague, Passer-by) hozircha
emoji bilan ko'rsatiladi. Rasm qo'shilsa, `src/components/shortScene.ts` dagi `ROLE_ART`ga yoziladi.

**Hali qilinmagan:** mobil ilovada shortlar yo'q. Haqiqiy video kliplar ham yo'q, ularni yozib olish kerak.

## 6. Arxitektura qisqacha

```
src/
  content/         # 7+ kun A1 kontenti (UI koddan alohida), A2+ zaxira bundle,
                   # vocabEmoji.ts (lug'at o'yini rasmlari — tizim emoji),
                   # a1/new-types.ts (5 yangi tur — 35 mashq, §5g), canDo.ts
                   # (o'z-o'zini baholash da'volari), remix.ts (xato mashqni
                   # boshqa formatda qayta qurish — §5h)
  lib/             # store (reducer + IndexedDB + sync navbati), SRS, taymer,
                   # tekshiruv dvigateli, rejalashtirish, daraja isboti, eksport,
                   # motionManifest (harakat byudjeti), feedbackSound (Web Audio),
                   # sections.ts (A1.1…C1.2 bo'lim rejalari + sakrash testi),
                   # pathMap.ts (zigzag yo'l xaritasi ma'lumotlari),
                   # wordGame.ts (lug'at o'yini zanjiri — sof funksiya),
                   # lessons.ts (dars rejimi — bitta oqim),
                   # mistakes.ts (xatolar daftari o'yinlari — sof funksiya, §5h)
  pages/           # 15 sahifa (/sections bilan)
  components/      # UI, ExerciseRunner (11 tur mashq + jarayon chizig'i/combo/bosish +
                   # dars rejimi), LessonPlayer / SectionLessons (dars oqimi),
                   # MistakeGames (xatolarni 4 usulda qayta ishlash — §5h),
                   # Shell navigatsiya, Mascot (qahramon — bizniki),
                   # DuoPathMap (zigzag yo'l), SectionBanner, LeaguePanel,
                   # WordGame (lug'at o'yini — ExerciseRunner ustida),
                   # SelfAssessment (Likert baholash — darajaga ta'sir qilmaydi)
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
