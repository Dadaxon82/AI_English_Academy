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
│   │   └── AuthStore.kt     — sessiya (access/refresh token), user id
│   ├── domain/              — sof mantiq (UI'ga bog'liq emas, testlanadi)
│   │   ├── Srs.kt, AnswerChecker.kt, Planning.kt, SkillScoring.kt,
│   │   ├── Merge.kt, Analyze.kt, Reducer.kt, SyncProtocol.kt
│   ├── sync/SyncEngine.kt   — navbat → bulk upsert → pull → merge
│   ├── store/AppStore.kt    — state management (StateFlow + reducer + dispatch)
│   └── ui/                  — fragmentlar va viewlar (14 ekran)
├── app/src/main/assets/{content,audio}/   — veb'dan eksport qilingan
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

## 8. Nima qasddan o'zgartirilmadi
- Kontent mazmuni: mobil ilova veb kontentining **bitta nusxasini** ishlatadi — tarjima,
  izoh, audio litsenziyalari bir xil.
- Baza sxemasi: 0001+0002 migratsiyalari o'zgarishsiz — ilovalar bitta bazani bo'lishadi.
- Daraja oshirish qoidasi: XP/kun emas — 4 ko'nikma dalili (loyiha talabi).
