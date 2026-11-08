# "Test — 16 xil topshiriq" (PDF) — tahlil va loyihaga moslash

> Manba: `test_-16-xil_topshiriq.pdf` (11 sahifa). Bu test yaratish dasturidagi (iSpring QuizMaker
> uslubidagi) "Вопросы" menyusining skrinshotlari: har savol turi uchun belgi, namuna va qisqa ta'rif.
> Sana: 2026-11-08.

## 0. Muhim kuzatuv

Fayl nomida **16 xil** deyilgan, lekin PDF'da aniq **14 ta** savol turi ko'rsatilgan (menyuda ham 14 ta belgi).
Qolgan 2 tasi PDF'da yo'q. iSpring'ning boshqa versiyalarida odatda "So'z banki" va "Raqamli slayder"
turlari ham uchraydi, lekin bu **PDF'dan tasdiqlanmagan**. Shuning uchun quyida faqat 14 ta tur tahlil qilinadi.

## 1. PDF'dagi 14 ta tur

| # | Tur (ruscha → o'zbekcha) | Kod | Foydalanuvchi nima qiladi | PDF'dagi namuna |
|---|---|---|---|---|
| 1 | Выбор одного ответа → **Bitta javob tanlash** | C | Variantlardan bittasini tanlaydi | Dostoyevskiy tug'ilgan shahar |
| 2 | Выбор нескольких ответов → **Bir nechta javob tanlash** | R | Bir yoki bir nechta variantni belgilaydi (checkbox) | Aholisi 1 mln dan ortiq shaharlar |
| 3 | Верно/Неверно → **To'g'ri / Noto'g'ri** | T | Da'voga rozi yoki rozi emas | Davlat tili haqidagi da'vo |
| 4 | Краткий ответ → **Qisqa javob** | A | Bo'sh maydonga so'z/ibora yozadi | "Baykal" |
| 5 | Числовой ответ → **Raqamli javob** | N | Son kiritadi | "1" (maydon bo'yicha o'rin) |
| 6 | Последовательность → **Ketma-ketlik** | S | Elementlarni to'g'ri tartibga qo'yadi (rasmli) | Imperatorlar xronologiyasi |
| 7 | Соответствие → **Moslashtirish** | M | Chap va o'ng ustun elementlarini juftlaydi | Shahar ↔ viloyat |
| 8 | Заполнить пропуски → **Bo'shliqlarni to'ldirish** | B | Matndagi bo'shliqlarga yozadi | Petrograd / Leningrad |
| 9 | Выбор из списков → **Ro'yxatdan tanlash** | I | Matn ichidagi ochiluvchi ro'yxatlardan tanlaydi | Rassom va kartina |
| 10 | Перетаскивание слов → **So'zlarni sudrab qo'yish** | W | So'zlar to'plamidan bo'shliqlarga sudraydi (chalg'ituvchilar bilan) | Federatsiya subyektlari |
| 11 | Выбор области → **Rasmda hudud belgilash** | H | Rasmdagi joyni bosadi | Xaritada Vayoming shtati |
| 12 | Перетаскивание объектов → **Obyektlarni sudrash** | D | Rasmlarni kerakli joyga (masalan, likopchaga) sudraydi | A vitaminli mahsulotlar |
| 13 | Шкала Лайкерта → **Likert shkalasi** | L | Har da'voga 1–5 baho beradi (baholanmaydi, so'rovnoma) | Masofaviy ta'lim afzalliklari |
| 14 | Эссе → **Esse** | E | Kengaytirilgan javob yozadi (avtomatik baholanmaydi) | Sayt haqida fikr |

Umumiy jihatlar (skrinshotlardan): har savolda **"Обратная связь и ветвление"** bor — to'g'ri yoki
noto'g'ri javobga alohida izoh va keyingi savolga o'tish. Bizda bu `explanationUz` va LessonPlayer'ning
"Xatolarni tuzatamiz" navbati orqali qisman bor.

## 2. Loyihada hozir bor bo'lgan turlar bilan solishtirish

Bizdagi mashq turlari (`src/content/types.ts` → `ExerciseKind`): `multiple-choice` (73),
`true-false-notgiven` (55), `gap-fill` (42), `translation` (27), `matching` (20), `word-order` (18).
Qavs ichida A1 kontentidagi soni.

| PDF turi | Bizda | Holat | Izoh |
|---|---|---|---|
| 1. Bitta javob | `multiple-choice` | ✅ To'liq | Raqamli kartalar, 1–9 tugmalari, rasmli variant (Lug'at o'yini) |
| 2. Bir nechta javob | — | ❌ Yo'q | Yangi tur kerak |
| 3. To'g'ri / Noto'g'ri | `true-false-notgiven` | ✅ Kengroq | Bizda 3 variant (+ Not Given — IELTS uslubi) |
| 4. Qisqa javob | `translation` (qisman), `gap-fill` | 🟡 Qisman | Erkin bitta javob yozish alohida tur sifatida yo'q (tarjima yoki bo'shliq orqali) |
| 5. Raqamli javob | — | ❌ Yo'q | Ingliz tili uchun kam foydali (pastga qarang) |
| 6. Ketma-ketlik | `word-order` (faqat so'zlar) | 🟡 Qisman | Gap yoki voqealarni tartiblash yo'q |
| 7. Moslashtirish | `matching` | ✅ To'liq | Ikki ustun plitkalar |
| 8. Bo'shliqlarni to'ldirish | `gap-fill` | ✅ To'liq | Yozib to'ldirish + bank |
| 9. Ro'yxatdan tanlash | — | ❌ Yo'q | Matn ichida ochiluvchi ro'yxat |
| 10. So'zlarni sudrash | `gap-fill` + `wordBank` | 🟡 Qisman | Bosib qo'yiladi (sudrash emas); chalg'ituvchi so'zlar kontentga bog'liq |
| 11. Rasmda hudud | — | ❌ Yo'q | Rasm/sahna kerak |
| 12. Obyektlarni sudrash | — | ❌ Yo'q | "Saralash" (guruhlarga ajratish) ko'rinishida foydali |
| 13. Likert | — | ❌ Yo'q | Baholanmaydi — o'z-o'zini baholash uchun |
| 14. Esse | **Yozish** sahifasi (alohida) | ✅ Boshqa shaklda | Mashq turi emas, `WritingTask` + qoidaviy/AI tahlil |

**Xulosa:** 14 turdan **5 tasi to'liq bor**, **3 tasi qisman**, **6 tasi yo'q**.

## 3. Ingliz tili o'rganish uchun foydaliligi va tavsiya

| Ustuvorlik | Tur | Ingliz tilida qo'llanishi | Murakkablik |
|---|---|---|---|
| **1 — yuqori** | Bir nechta javob (`multi-select`) | "Qaysi gaplar to'g'ri?", "Qaysi so'zlar fe'l?", O'qishda "matnda aytilgan barcha faktlar" | Past |
| **1 — yuqori** | Ro'yxatdan tanlash (`dropdown-cloze`) | Grammatika: *She ___ (go/goes/going) to school* — gap ichida tanlov; imtihon formati (Cambridge, IELTS) | Past–o'rta |
| **1 — yuqori** | Ketma-ketlik (`sequence`) | Dialog qatorlarini, hikoya voqealarini, kun tartibini tartiblash (O'qish/Tinglash) | O'rta |
| **2 — o'rta** | Saralash (`categorize`, PDF №12 ning soddalashtirilgani) | Countable/uncountable, a/an, fe'l zamonlari, mavzu bo'yicha so'zlar | O'rta |
| **2 — o'rta** | Qisqa javob (`short-answer`) | "Savolga 1–3 so'z bilan javob bering" (O'qish, Tinglash) | Past |
| **3 — past** | Rasmda hudud (`hotspot`) | "Oshxonani bosing" — rasm yoki sahna kerak (hozir rasm fayllari yo'q; emoji-sahna mumkin) | Yuqori |
| **3 — past** | Likert | Darajani o'zi baholash: CEFR "Can-do" da'volari ("Men o'zimni tanishtira olaman" 1–5). Baholanmaydi, ball qo'shilmaydi | Past |
| **4 — kerak emas** | Raqamli javob | Ingliz tilida sonni so'z bilan yozish muhim (*fifteen*); raqam kiritish tilni o'rgatmaydi | Past |

Esse allaqachon Yozish bo'limida bor. Sudrash (drag) o'rniga telefonda qulay **bosib qo'yish** usuli
qoladi (Duolingo ham shunday ishlaydi).

## 4. Yangi turlar uchun texnik loyiha (keyingi topshiriq uchun)

Har yangi tur uchun o'zgaradigan joylar:
1. `src/content/types.ts` — `ExerciseKind` ga tur va interfeys.
2. `src/lib/check.ts` — tekshiruvchi (`checkAnswer` switch) + qisman ball (`partial`).
3. `src/components/ExerciseRunner.tsx` — `AnswerInput` UI, `initialAnswer`, `isAnswerEmpty`, `kindLabel`.
4. Kontent — har turdan A1 uchun kamida 5–7 ta mashq (`src/content/a1/day-0X.ts`).
5. Testlar — `check.test.ts`, `content-audit.test.ts`.
6. **Mobil** — `mobile/.../data/ContentModels.kt` (`Kinds`), `ExerciseFragment.kt`. Hozir noma'lum turda
   mobil `supported = false` qiladi (ilova qulamaydi, mashq o'tkazib yuboriladi). Ammo veb ↔ mobil paritet
   qoidasi uchun Kotlin tomoni ham yozilishi kerak. Sessiyada Android SDK yo'q, shuning uchun mobil qism
   kompyuteringizda yig'ib tekshiriladi.

Taklif etilgan ma'lumot shakllari:

```ts
// 1) Bir nechta javob
interface MultiSelectExercise extends ExerciseBase {
  kind: 'multi-select'; question: string; options: string[]; answerIndexes: number[]
}
// tekshiruv: to'plamlar teng → to'g'ri; partial = (to'g'ri belgilangan − noto'g'ri belgilangan) / to'g'rilar soni (0 dan past emas)

// 2) Ro'yxatdan tanlash (gap ichida)
interface DropdownClozeExercise extends ExerciseBase {
  kind: 'dropdown-cloze'; text: string /* ___ bilan */; choices: string[][]; answers: string[]
}

// 3) Ketma-ketlik (gaplar/voqealar)
interface SequenceExercise extends ExerciseBase {
  kind: 'sequence'; items: string[] /* to'g'ri tartibda */; shuffled: string[]
}
// partial = to'g'ri o'rindagi elementlar ulushi

// 4) Saralash
interface CategorizeExercise extends ExerciseBase {
  kind: 'categorize'; categories: string[]; items: { text: string; category: number }[]
}

// 5) Qisqa javob
interface ShortAnswerExercise extends ExerciseBase {
  kind: 'short-answer'; question: string; accepted: string[]; maxWords?: number
}
```

UI (dars rejimi bilan bir xil uslubda):
- **multi-select**: raqamli kartalar + belgi; "Barcha to'g'ri javoblarni tanlang" yozuvi.
- **dropdown-cloze**: gap ichida bosiladigan bo'shliq → variantlar ochiladi (telefonda pastdan chiqadigan panel).
- **sequence**: kartalar ro'yxati; bosilgan karta navbat bilan yuqoridagi raqamlangan joylarga tushadi
  (word-order mexanikasi, lekin butun gaplar bilan).
- **categorize**: tepada 2–3 savat (masalan, "Countable" / "Uncountable"); so'zni bosib, keyin savatni bosish.
- **short-answer**: bitta maydon; `looseEquals` bilan bardoshli tekshiruv (apostrof va registrga sezgir emas).

## 5. Ochiq savollar

1. Qaysi turlardan boshlaymiz? Tavsiya: **multi-select, dropdown-cloze, sequence** (1-ustuvorlik), keyin
   categorize va short-answer.
2. Yangi turlar uchun A1 kontentini men yozaymi (har turdan 5–7 ta, mavjud kunlar mavzulari bo'yicha)?
3. Likert'ni "o'z-o'zini baholash" sifatida Progress sahifasiga qo'shamizmi (ball bermaydi)?
4. Mobil (Kotlin) qismini ham shu bosqichda yozamizmi? Sessiyada Android SDK yo'q, shuning uchun yig'ish
   va testni siz kompyuteringizda bajarasiz.
