# AI English Academy

**A1 → C1** darajalar bo'yicha shaxsiy ingliz tili platformasi. React 19 + TypeScript + Vite + Tailwind CSS 4 + PWA + Supabase.

Loyiha talabnomasi (`AI English Academy_v2.docx`) to'liq bajarilgan:

- ✅ To'liq **o'zbek tilli interfeys**
- ✅ **A1, A2, B1, B2, C1** darajalar; daraja faqat **ko'p ko'nikma dalili** bilan ko'tariladi (XP yoki kunlar emas), mock imtihon esa doim **"mashq uchun yaratilgan namuna"** deb yozilgan
- ✅ **90 daqiqalik** asosiy kunlik reja (Vocab 10 / Grammar 15 / Reading 15 / Listening 15 / Writing 20 / Speaking 15) — zaif ko'nikma va imtihon sanasiga qarab qayta taqsimlanadi
- ✅ **14 sahifa**: Dashboard, Learning Path, Vocabulary, Grammar, Reading, Listening, Writing, Speaking, Mock Exam, Progress, Error Log, Settings, Login, 404
- ✅ Premium **dark/light** mavzu, to'liq **responsiv**; har joyda **loading / empty / success / error** holatlari
- ✅ **SRS lug'at** (SM-2): har so'z statistikasida tekshiruvlar ikki marta sanalmaydi
- ✅ Tinglash uchun **HAQIQIY audio** (`npm run audio:build` — Windows SAPI). Manifestda fayli bo'lmagan audio uchun pleyer umuman ko'rsatilmaydi — soxta tugma yo'q
- ✅ Speaking audio **rozilik siz serverga yuborilmaydi** (`audio_stored: false`)
- ✅ **Jonli taymer** — sahifa yangilansa ham vaqt yo'qolmaydi (IndexedDB'da saqlanadi)
- ✅ **Offline / PWA**: sync navbati, Service Worker, logout'da kesh tozalanadi
- ✅ **Supabase RLS**: har foydalanuvchi faqat o'z qatorlarini ko'radi; service role va `AI_*` kalitlari faqat serverda
- ✅ AI "ulangan" deb ko'rsatilmaydi — AI bo'lmasa **qoidaviy dvigatel** (`engine: 'rule-based'`) ishlatiladi
- ✅ **7+ kun A1 kontenti** alohida (`src/content/day-01…07.ts`)
- ✅ **13 ta jadval** (`supabase/migrations/0001_init.sql`), ID'lar, `created_at`, FK va indexlar bilan
- ✅ Testlar: `tsc` tip tekshiruvi, ESLint, `vitest` (39 test), production build, smoke-test
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
3. **Ma'lumotlar bazasini tayyorlang:** paneldagi **SQL Editor** ga
   `supabase/migrations/0001_init.sql` mazmunini qo'yib **Run** qiling
   (13 jadval + RLS + triggerlar yaratiladi).
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
npm test              # vitest — 39 test (SRS, taymer, tekshiruv, rejalashtirish, daraja)
npm run build         # production build + Service Worker
npm run smoke         # dist'ni serverda ochib tekshirish + 375/1280 skrinshot
npm run render:check  # 15 marshrutni CDP orqali ochib DOM tekshiruvi + konsol xatolari
```

> `render:check` Chrome/Edge'ni remote debugging (CDP) orqali ochadi va har
> marshrut uchun tugmalar/havolalar/matn hajmini va istisnolarni tekshiradi.
> Brauzer bo'lmasa skript ogohlantirib exit 0 bilan chiqadi.

## 6. Arxitektura qisqacha

```
src/
  content/         # 7+ kun A1 kontenti (UI koddan alohida), A2+ zaxira bundle
  lib/             # store (reducer + IndexedDB + sync navbati), SRS, taymer,
                   # tekshiruv dvigateli, rejalashtirish, daraja isboti, eksport
  pages/           # 14 sahifa
  components/      # UI, ExerciseRunner (6 tur mashq), Shell navigatsiya
supabase/
  migrations/0001_init.sql   # 13 jadval + RLS
scripts/
  build-audio.mjs  make-icons.mjs  smoke.mjs
```

**Daraja siyosati:** 4 ta ko'nikmada kamida 4 tadan isbot, og'irlikli ball ≥ 72 (mock imtihon og'irligi 0.35, eski natijalar 30 kunlik "half-life" bilan kamayadi) → tizim keyingi darajani **tavsiya** qiladi; qaror foydalanuvchida.

**Maxfiylik:** speaking yozuvlari faqat brauzerda; serverga faqat matn transkripsiyasi va `audio_stored:false` yuboriladi; "Ma'lumotlarimni o'chirish" barcha jadvallar + lokal keshni tozalaydi.

## 7. Litsenziya va kontent

Audio fayllar Windows SAPI (`Microsoft Zira`) ovozi bilan generatsiya qilingan; manifestda litsenziya maydoni bo'sh — tashqi audio qo'shsangiz shu maydonga kiriting.
