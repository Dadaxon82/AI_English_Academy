# Duolingo `/sections` sahifasi — tahlil (keyingi topshiriq uchun)

> Sana: 2026-11-08. Maqsad: `https://ru.duolingo.com/sections` sahifasining tuzilishi
> va mexanikasini o'rganib, AI English Academy'ga **o'zimizning dizaynimizda**
> "Bo'limlar" (Sections) qatlamini qo'shish uchun asos tayyorlash.

## 0. Manba holati (halollik)

| Manba | Holat |
|---|---|
| `ru.duolingo.com/sections` (jonli sahifa) | **Ochilmadi** — sessiya tarmog'i `*.duolingo.com` ni bloklaydi. Sahifa baribir login talab qiladi (foydalanuvchining kursi va progressiga bog'liq). |
| duoplanet.com, blog.duolingo.com, duolingodata.com | Ochilmadi (tarmoq). Faqat qidiruv natijalaridagi parchalar o'qildi. |
| Veb-qidiruv natijalari (3-tomon qo'llanmalari) | O'qildi. **Sonlar bir-biriga zid** (pastda). |

Shu sabab quyidagi har bir da'vo belgilangan:
- **[M]** — qidiruvda topilgan manba bilan tasdiqlangan;
- **[X]** — Duolingo veb-ilovasi haqidagi umumiy ma'lumot (xotiradan), jonli sahifada **tekshirilmagan**;
  keyingi bosqichdan oldin skrinshot bilan tasdiqlash tavsiya etiladi.

---

## 1. Kurs ierarxiyasi

```
Kurs (masalan: ingliz tili, rus tilida so'zlashuvchilar uchun)
└── Bo'lim / Section ("Раздел 1…N")      ← /sections sahifasi shu darajani ko'rsatadi
    └── Blok / Unit ("Блок 1…")           ← /learn sahifasidagi yo'l xaritasidagi rangli banner
        └── Qadam / Level (yo'l tuguni)   ← doira tugun: dars, hikoya, takrorlash, sandiq
            └── Dars / Lesson
                └── Mashq / Challenge (≈12–15 ta)
```

- Sections → Units → Lessons ierarxiyasi; katta kurslar CEFR bo'yicha qayta qurilgan. **[M]**
- Bo'lim — CEFR'ga (kursga qarab) moslangan unitlar to'plami. **[M]**
- Eski "daraxt" davrida dars ≈ 12–15 mashq (Duolingo tadqiqot maqolasi). **[M]**
- Yangi "yo'l"da har ko'nikma 3 darajaga siqilgan, yo'lga mashq va hikoyalar bilan birga joylangan. **[M]**
- Oddiy qadam va "shaxsiy mashq" bir nechta darsdan iborat; unit-review, hikoya, radio, roleplay — bitta darsdan. **[M]**
- Unit oxiridagi takrorlash — kubok (trophy) ikonkasi. **[M]**

### Sonlar (manbalar zid — ishonchsiz)

| Kurs | Bo'limlar | Unitlar | CEFR xaritasi |
|---|---|---|---|
| Ispan (ingliz tilidan) | 8 yoki 9 | 225–286 | Bo'lim 3 ≈ A1, 4 ≈ A2 **[M]** |
| Ingliz (ispan tilidan) | ~8 | 100+ | Bo'lim 3 ≈ A2, 5+ ≈ B1, B2 lug'at **[M]** |
| Ingliz (fransuz tilidan, eski blog) | 8 | — | 5–6 = B1, 7–8 = B2 **[M]** |
| Ingliz (rus tilidan) | **topilmadi** | **topilmadi** | — |

Xulosa: aniq son nusxalanmaydi — bizda bo'lim = CEFR darajasi qilib **o'zimiz** belgilaymiz.

Bo'lim nomlari (3-tomon qo'llanmalarida): Rookie, Explorer, Traveler, Trailblazer,
Discoverer, Navigator… **[M]** — bu Duolingo brendi, **biz nusxalamaymiz**.

---

## 2. `/sections` sahifasi anatomiyasi **[X]**

```
┌ chap nav ─┐┌──────────── markaz ─────────────┐┌── o'ng panel ──┐
│ Обучение  ││ ← Назад                          ││ streak/gem/    │
│ Звуки     ││ ┌─ Раздел 1 ───────────────────┐ ││ yurak          │
│ Лиги      ││ │ [Завершено ✓] / ████░░ 5/10  │ ││ Liga           │
│ Задания   ││ │ [Продолжить] / [Перейти…]    │ ││ Kunlik questlar│
│ Магазин   ││ │ Подробнее ▾   (CEFR: A1)     │ ││                │
│ Профиль   ││ │            🙂💬 "namuna ibora"│ ││                │
│ Ещё       ││ └──────────────────────────────┘ ││                │
│           ││ ┌─ Раздел 2 … (qulf 🔒) ───────┐ ││                │
└───────────┘└──────────────────────────────────┘└────────────────┘
```

Har bir bo'lim kartasida:
1. **Sarlavha** — "Раздел N" (+ ba'zi kurslarda CEFR yorlig'i).
2. **Holat** — uchtadan biri:
   - *tugatilgan*: "Завершено" + belgi;
   - *joriy*: progress bar "X / Y блоков" + **«Продолжить»** tugmasi;
   - *qulflangan*: **«Перейти к разделу N?»** — sakrash testi (jump/test-out) taklifi.
3. **«Подробнее»** (batafsil) — ochilganda bo'lim nimani o'rgatishi (qisqa tavsif, unit mavzulari).
4. **Illyustratsiya** — personaj va gap pufagida shu bo'limdagi namuna ibora (o'quvchi oldindan "ta'm" ko'radi).
5. Karta bosilganda — `/learn` ga, shu bo'limning joriy unitiga qaytadi.

Atrofdagi mexanika:
- **Jump here / test-out** — keyingi bo'lim yoki unitga sakrash testi (o'tolmasang — joyida qolasan). **[M]**
- Placement test onboardingda — "boshidan" yoki "sakrab o'tish". **[M]**
- Bo'lim tugaganda progress bar to'lib "spring bounce" animatsiyasi; scrollda sticky header'ga o'tadi (Chess kursi). **[M]**
- Unit ichida **Guidebook** (Справочник) — grammatika maslahatlari va kalit iboralar. **[M]**
- Unit oxirida bir nechta darajali challenge; davom etish uchun faqat 1-si shart. **[M]**
- Duolingo yo'lni doim A/B test qiladi — turli akkauntlarda tuzilma farq qilishi mumkin. **[M]**

---

## 3. Bizning loyihadagi hozirgi holat

| Duolingo qatlami | Bizda hozir | Fayl |
|---|---|---|
| Kurs | A1→C1 bitta kurs | `src/content/index.ts` (`LevelBundle`) |
| **Section** | **YO'Q** (faqat `CefrLevel` maydoni; `levelLabel()` nomlari bor) | `src/lib/skillScoring.ts:131` |
| Unit | Kun (`DailyPlanDay`, 7 ta, faqat A1) — xaritada banner | `src/lib/pathMap.ts`, `src/components/DuoPathMap.tsx` |
| Level/tugun | Kun ichidagi ko'nikma bo'limi + kun testi | `src/lib/lessonChain.ts` |
| Mashq | `Exercise` | `src/components/ExerciseRunner.tsx` |
| Placement | Diagnostik test (onboarding) | `src/content/diagnostic.ts`, `src/pages/Onboarding.tsx` |
| Guidebook | Grammar sahifasi (alohida) | `src/pages/Grammar.tsx` |
| O'ng panel | `LeaguePanel` (liga, quest, streak) | `src/components/LeaguePanel.tsx` |
| Mobil | `LessonChain.kt` — veb bilan bir xil qoida | `mobile/…/domain/` |

---

## 4. Keyingi topshiriq uchun taklif: "Bo'limlar" sahifasi (`/sections`)

### 4.1. Model
- **Bo'lim = CEFR darajasi** (A1, A2, B1, B2, C1 — 5 ta). Unit = mavjud "kun".
- Yangi sof funksiya `src/lib/sections.ts`:
  `buildSections(bundles, progress) → SectionCard[]`
  (`level`, `titleUz`, `descriptionUz`, `unitsDone`, `unitsTotal`, `status: done|current|locked|empty`, `sampleEn`, `topicsUz[]`).
- `empty` holati — kontenti hali yo'q darajalar (A2…C1). README qoidasi: **soxta tugma yo'q** → karta
  "Kontent tayyorlanmoqda" deb ochiq yoziladi, harakat tugmasi ko'rsatilmaydi.

### 4.2. UI (o'z uslubimiz)
- Marshrut `/sections` (`src/App.tsx`), `Layout` ichida; Learning Path sarlavhasiga "Bo'limlar" havolasi.
- Karta: daraja nomi (`levelLabel`) + CEFR, progress bar, "Davom etish" / "Batafsil" / (qulflangan bo'lsa) "Sakrash testi".
- Illyustratsiya — **bizning qahramon** (`Mascot.tsx`) va shu darajadagi haqiqiy namuna ibora kontentdan (`vocab`/`reading`dan olinadi, ixtiro qilinmaydi).
- Loading / empty / error holatlari, dark/light, 375px'da overflow yo'q.

### 4.3. Sakrash testi — MUHIM cheklov
README: *daraja faqat ko'p ko'nikma dalili bilan ko'tariladi*. Shuning uchun sakrash testi
**kontentni ochadi**, lekin `currentLevel`ni **ko'tarmaydi**. Test — diagnostik/mock savollaridan
shu daraja bo'yicha to'plam; o'tish chegarasi `gameConfig.ts` da "bizning qarorimiz" deb belgilanadi.

### 4.4. Paritet va testlar
- `buildSections` uchun vitest (holatlar, bo'sh darajalar, progress hisobi).
- Mobil: `domain/Sections.kt` + unit test, veb bilan bir xil natija (mavjud paritet testlari kabi).
- `render-check.mjs` ga `/sections` marshrutini qo'shish.

### 4.5. Nusxalanmaydigan narsalar
Duolingo nomi, logotipi, personajlari, bo'lim nomlari (Rookie/Traveler…), ranglari va matnlari.
Faqat **mexanika** (ierarxiya, holatlar, sakrash testi, oldindan ko'rish) o'zimizcha amalga oshiriladi.

---

## 5. Ochiq savollar (keyingi topshiriqdan oldin)
1. Bo'lim = bitta CEFR darajasimi, yoki har darajani 2 bo'limga bo'lamizmi (masalan A1.1 / A1.2)?
2. Sakrash testi kerakmi, yoki hozircha faqat ko'rinish (progress + batafsil)?
3. Jonli sahifani aniq takrorlash kerak bo'lsa — `ru.duolingo.com/sections` skrinshotlarini repoga
   qo'shing (sessiya tarmog'idan ochib bo'lmaydi), shunda **[X]** belgili joylarni tasdiqlaymiz.
