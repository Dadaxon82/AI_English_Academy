# AI English Academy — to'liq audit va AI uchun ish prompti

> Sana: 2026-11-09. Manba: `main` @ `9f4b109` (PR #9 dan keyin).
> Barcha raqamlar shu sessiyada **o'lchangan** (build, lint, test, axe-core, Playwright) — taxmin emas.

---

## 1. Hozirgi holat (o'lchangan)

| Ko'rsatkich | Qiymat |
|---|---|
| Veb kod | 104 ta TS/TSX fayl, ~19 700 qator (testlarsiz) |
| Mobil (Kotlin) | ~17 700 qator, 24 ta ekran (Fragment) |
| Testlar | 32 fayl, ~365 ta `it()`; hammasi o'tadi |
| Xavfsizlik (`npm audit --omit=dev`) | **0** zaiflik |
| Konsol xatolari (14 marshrut × 2 ekran) | **0** |
| Telefon (375px) gorizontal scroll | **yo'q** (14/14) |
| Sahifa yuklanishi (lokal preview) | ~1,0 s; DOMContentLoaded ~90 ms |
| JS bundle | **1 054 KB bitta fayl** (gzip'siz), CSS 64 KB |
| `React.lazy` / kod bo'linishi | **0** |
| ESLint | 0 xato, **27 ogohlantirish** (`react-hooks/purity` 11, `set-state-in-effect` 7, `only-export-components` 7, `exhaustive-deps` 1, `immutability` 1) |
| Accessibility (axe, WCAG 2 A/AA) | **rang kontrasti** — 10 sahifada (Bo'limlar: 25 element); xaritada `nested-interactive`, `aria-prohibited-attr`, `aria-progressbar-name` |
| Kontent | Faqat **A1**: 7 kun, 119 ta lug‘at yozuvi, 203 + 35 = 238 mashq (kunlar fayllari + yangi turlar), 9 ta audio fayl; **A2–C1 bo‘sh** |
| AI | `.env`da `AI_PROVIDER/AI_API_KEY` bor, lekin **server funksiyasi yo'q** (`supabase/functions` mavjud emas) — tahlil faqat qoidaviy |
| CI | Faqat `deploy.yml` (main'ga push) — **PR'larda test ishlamaydi** |
| Eskirgan paketlar | eslint 10, @vitejs/plugin-react 6, jsdom 31, @testing-library/jest-dom 7 (major) |

Kuchli tomonlar: halol muhandislik qoidalari (soxta tugma/audio yo'q, daraja faqat dalil bilan), PWA + offline,
Supabase RLS, veb ↔ mobil sinxron, keng unit testlar, Duolingo uslubidagi dars mexanikasi (dars rejimi, so'z o'yini,
bo'limlar, sakrash testi, xatolar o'yinlari, xarita).

---

## 2. Xato va kamchiliklar (ustuvorlik bo'yicha)

### P0 — darhol (sifat va ishonch)
1. **"AI" nomi bor, AI yo'q.** Yozish/gapirish tahlili qoidaviy (`src/lib/analyze.ts`); `AI_*` kalitlari ishlatiladigan
   server qismi yozilmagan. Kerak: Supabase Edge Function (kalit faqat serverda), kunlik limit (`AI_DAILY_LIMIT`),
   qoidaviy fallback, UI'da qaysi dvigatel ishlagani ochiq yozilishi.
2. **Accessibility (WCAG AA) buzilishlari:** oq matn + `emerald-500` tugmalar (~2,5:1), sariq/kulrang yozuvlar;
   `DuoPathMap`da `role="img"` SVG ichida `role="button"` tugunlar (ichma-ich interaktiv), `<g aria-label>` rolsiz,
   "Keyingi maqsad" progress barida nom yo'q.
3. **PR'larda CI yo'q.** `tsc`, `eslint`, `vitest`, `build` faqat main'ga push'da ishlaydi — buzuq kod merge bo'lib,
   keyin deploy yiqiladi. `scripts/render-check.mjs` faqat Windows Chrome yo'llarini qidiradi (CI'da o'tkazib yuboriladi).
4. **1 MB bitta JS bundle.** Marshrutlar `lazy()` emas; sekin mobil internetda birinchi ochilish og'ir.

### P1 — yaqin vaqtda
5. **Kontent faqat A1.** "A1 → C1" va'dasi bajarilmagan: A2, B1, B2, C1 bo'limlari bo'sh ("Tayyorlanmoqda").
   Audio 9 ta fayl (Windows SAPI sintezi).
6. **Mobil paritet bo'shliqlari:** dars rejimi (`LessonPlayer`), so'z o'yini, xatolar o'yinlari, Likert UI, yangi xarita
   (3D tangalar, sovrin tuguni) faqat vebda. Yangi 5 mashq turi uchun `ExerciseFragment` UI Android SDK'da
   **yig'ilmagan** (sessiyada SDK yo'q edi). `remix-*` id'lari mobil Xatolar daftarida tiklanmaydi.
7. **Lint ogohlantirishlari (27):** render paytida `Date.now()`, effekt ichida `setState`, komponent fayllaridan
   konstanta eksporti — React 19 / React Compiler bilan muammo manbai.
8. **Katta fayllar va takror kod:** `ExerciseRunner.tsx` 1257, `sync.ts` 1080, `store.tsx` 886, `game.ts` 875 qator;
   "chunky" 3D tugma uslubi 3 joyda nusxa (`ExerciseRunner`, `LessonPlayer`, `Sections`) — dizayn tokenlari yo'q.
9. **Xaritadagi vazifa soni kun darajasida:** kun ichida bitta qadam tugasa "N ta vazifa qoldi" kamaymaydi.
10. **Gapirish:** `SpeechRecognition` faqat Chrome/Edge'da; talaffuz bahosi oddiy so'z mosligi (70%).

### P2 — sifatni oshirish
11. Xato monitoringi va anonim foydalanish metrikalari yo'q (maxfiylikka mos, rozilik bilan).
12. E2E testlar repoda yo'q (faqat bir martalik Playwright skriptlari) — CI'ga kiritilmagan.
13. Tungi rejimda xarita qulf ranglari qattiq kodlangan (`#e2e8f0`), CSS tokenlarga o'tkazilmagan.
14. Major paket yangilanishlari (eslint 10, plugin-react 6, jsdom 31, jest-dom 7).
15. README'dagi sonlar qo'lda yangilanadi — avtomatik (skript) bo'lishi kerak.
16. SEO/OG meta, PWA manifest skrinshotlari, interfeys tili tanlovi (uz/ru) yo'q.

---

## 3. Yo'l xaritasi (bosqichlar)

| Bosqich | Maqsad | Natija mezoni |
|---|---|---|
| 1. Barqarorlik | PR CI, lint 0 ogohlantirish, a11y AA | Har PR'da tsc+lint+vitest+build+e2e yashil; axe 0 serious |
| 2. Tezlik | Kod bo'linishi | Boshlang'ich JS ≤ 300 KB (gzipsiz), qolgani lazy |
| 3. Haqiqiy AI | Edge Function + limit + fallback | Yozish/gapirish tahlili AI bilan, kalit klientga chiqmaydi |
| 4. Kontent | A2 (7 kun) → B1 | Audit testlari o'tadi, audio manifestda |
| 5. Mobil paritet | Dars rejimi, o'yinlar, xarita, Likert | Android build + unit testlar yashil |
| 6. Sifat | Monitoring, e2e, refaktor, tokenlar | Fayllar ≤ 500 qator, dizayn tokenlari bitta joyda |

---

## 4. AI uchun PROMPT (nusxa olib ishlating)

```text
Sen — tajribali full-stack muhandis va ingliz tili metodisti. "AI English Academy" loyihasida ishlaysan:
GitHub: Dadaxon82/AI_English_Academy, sayt: https://dadaxon82.github.io/AI_English_Academy/
Stack: React 19 + TypeScript + Vite 7 + Tailwind 4 + PWA + Supabase (RLS) + vitest; mobil — Kotlin (mobile/).
Interfeys to'liq O'ZBEK tilida. Duolingo MEXANIKASI ishlatiladi, lekin brend/personaj/matnlar bizniki (o'z qahramonimiz).

MAJBURIY QOIDALAR (buzilmasin):
1. Halollik: soxta tugma, soxta audio, soxta son yo'q. Har tugma haqiqiy ish bajaradi. AI ishlamasa — "qoidaviy
   dvigatel" deb ochiq yoziladi.
2. Daraja (currentLevel) faqat ko'p ko'nikma dalili bilan ko'tariladi (skillScoring.ts) — XP, kunlar, sakrash testi
   yoki o'z-o'zini baholash darajani o'zgartirmaydi.
3. Veb ↔ mobil paritet: ma'lumot shakli o'zgarsa — sync.ts, merge.ts va mobil Models/Merge/SyncEngine/SyncProtocol
   bir xil yangilanadi; eski saqlanmalar migrate() orqali buzilmaydi.
4. Har o'zgarishdan oldin va keyin: `npm run typecheck`, `npx eslint src scripts` (0 xato), `npx vitest run`,
   `npm run build`; UI o'zgarsa Playwright bilan 1280px va 375px'da tekshir (konsol xatosi va gorizontal scroll yo'q).
5. Har vazifa — alohida commit (o'zbekcha izoh) va alohida PR; PR tavsifida nima qilingani va qanday tekshirilgani.
6. Mavjud testlarni o'chirma/o'tkazib yuborma; yangi mantiq uchun test yoz.

HOZIRGI HOLAT (o'lchangan): 365 unit test o'tadi; npm audit 0; konsol xatosi 0; JS bundle 1054 KB bitta fayl,
lazy() yo'q; ESLint 27 ogohlantirish; axe: rang kontrasti 10 sahifada, DuoPathMap'da nested-interactive /
aria-prohibited-attr / aria-progressbar-name; PR'larda CI yo'q; AI server qismi yo'q (supabase/functions yo'q);
kontent faqat A1 (7 kun), A2–C1 bo'sh; mobilda dars rejimi, so'z o'yini, xatolar o'yinlari, Likert UI va yangi
xarita yo'q.

VAZIFALAR (shu tartibda bajar; har birini tugatib, tekshirib, keyingisiga o't):

1) CI: .github/workflows/ci.yml — pull_request va push uchun: npm ci, typecheck, eslint, vitest, build;
   Playwright e2e (5 asosiy oqim: onboarding→dashboard, dars rejimi, so'z o'yini, sakrash testi, xatolar o'yini).
   scripts/render-check.mjs Linux'da Playwright Chromium'ni ishlatsin.
   Mezon: PR'da barcha tekshiruvlar yashil, buzuq kod merge bo'lmaydi.

2) Accessibility (WCAG 2.1 AA): rang tokenlarini kontrast ≥ 4.5:1 ga keltir (yashil "3D" tugmalar — emerald-600/700
   yoki qora matn; sariq/kulrang matnlar); DuoPathMap: SVG'dan role="img" ni olib tashla yoki tugunlarni SVG
   tashqarisidagi tugmalar bilan almashtir, <g aria-label> ga role ber yoki olib tashla, progress barga aria-label.
   axe-core testini e2e'ga qo'sh. Mezon: barcha marshrutlarda axe "serious/critical" = 0.

3) Lint: 27 ogohlantirishni 0 ga tushir (render ichida Date.now() → useState(() => Date.now()) / props;
   effekt ichidagi setState → hosila qiymat yoki hodisa; konstantalarni alohida modulga). Lint'da ogohlantirish = xato.

4) Tezlik: barcha sahifalarni React.lazy + Suspense (LoadingBlock) bilan yukla; kontentni darajalar bo'yicha
   dinamik import qil; manualChunks (react, supabase). Mezon: boshlang'ich JS ≤ 300 KB (gzipsiz), PWA offline
   ishlashi saqlanadi (precache).

5) Haqiqiy AI: supabase/functions/ai-feedback (Deno) — yozma matn va gapirish transkripti uchun CEFR mezonlari
   bo'yicha JSON tahlil (mavjud WritingAnalysis/SpeakingAnalysis tiplariga mos). Kalit faqat serverda
   (AI_PROVIDER, AI_MODEL, AI_API_KEY), foydalanuvchi bo'yicha kunlik limit (AI_DAILY_LIMIT), RLS bilan.
   Klient: src/lib/ai.ts orqali chaqirish, xato/limit/offline'da qoidaviy dvigatelga qaytish, UI'da engine: 'ai' |
   'rule-based' ochiq ko'rsatiladi. Testlar: fetch mock bilan muvaffaqiyat/limit/xato/offline holatlari.

6) Kontent A2: src/content/a2/day-01…07.ts — A1 tuzilmasida (lug'at 17/kun, grammatika mavzusi, o'qish matni,
   tinglash transkripti, yozish/gapirish topshiriqlari, kun testi, 5 ta yangi turdan ham), SECTION_PLAN'da A2.1/A2.2
   kunlari, LOADED_LEVELS ga A2. Barcha content-audit testlari o'tsin; audio npm run audio:build bilan (yoki audio
   bo'lmasa pleyer ko'rsatilmaydi — soxta audio yo'q). Inglizcha matnlar CEFR A2 ga mos, o'zbekcha tarjimalar to'g'ri.

7) Mobil paritet (Kotlin): dars rejimi (LessonPlayer mantiqi: xatoni oxirida qayta berish, ketma-ket to'g'ri,
   "Dars tugadi" ekrani), so'z o'yini, Xatolar daftari o'yinlari (remix-* id'larni tiklash bilan), Likert UI,
   yangi xarita (3D tugunlar, sovrin tuguni, "N ta vazifa qoldi"). Mezon: ./gradlew test va assembleDebug yashil;
   veb bilan bir xil natija beruvchi paritet testlari.

8) Refaktor va dizayn tizimi: ExerciseRunner (har tur uchun alohida input komponenti), sync.ts, store.tsx, game.ts
   ni ≤ 500 qatorli modullarga bo'l; "chunky" tugma, badge, kartalar uchun bitta komponent/tokenlar;
   xarita ranglarini CSS tokenlarga (tungi rejimda ham to'g'ri).

9) Mayda tuzatishlar: xaritada qolgan vazifalar qadam darajasida hisoblansin (bugungi bajarilgan qadamlar);
   SpeechRecognition yo'q brauzerlarda (Safari/Firefox) aniq fallback; README sonlarini skript bilan yangilash;
   OG/SEO meta va PWA manifest skrinshotlari.

ISH USLUBI: har vazifa boshida rejani 3–5 qatorda yoz; o'zgartirishdan oldin tegishli fayllarni o'qi; taxmin
qilma — o'lcha (testlar, build hajmi, axe natijasi); oxirida "nima qilindi / qanday tekshirildi / nima qoldi"
hisobotini o'zbek tilida ber. Tekshirilmagan narsani "ishlaydi" dema.
```
