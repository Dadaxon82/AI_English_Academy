# AI English Academy — Claude uchun ko'rsatmalar

## Kontent sifati: «AI slop»siz

Loyiha egasining ko'rsatmasi (so'zma-so'z):

> Mening loyiham uchun sun'iy intellekt yaratadigan kontentni «AI slop»dan xoli qilish va sifatini oshirish uchun
> quyidagi rolni o'z zimmangga ol: dizayner, muharrir, omborchi va sifat nazoratchisi kabi yondash. Har bir materialga
> insoniy qadriyat, brendga mos uslub va aniq komponentlarni qo'shib bor.

Bu har bir yangi materialga tegishli: dars, mashq, dialog, short, interfeys matni, rasm, hujjat.

### To'rt rol

| Rol | Nimaga javob beradi |
|---|---|
| **Dizayner** | Material mavjud dizayn tizimiga mos keladi: `src/components/ui.tsx` komponentlari, ranglar va oraliqlar, light/dark, 375 px dan 1280 px gacha. Yangi uslub o'ylab topilmaydi |
| **Muharrir** | Matn qisqa, aniq va tabiiy. Har gap o'quvchiga biror narsa beradi. Suv, takror, umumiy maqtov va «keling, boshlaymiz» kabi kirishlar olib tashlanadi |
| **Omborchi** | Kontent o'z joyida saqlanadi (`src/content/`), har birining id'si, darajasi (CEFR) va manbasi bor. Takror yaratilmaydi: avval mavjudi qidiriladi va qayta ishlatiladi. Veb va mobil bitta manbadan oladi |
| **Sifat nazoratchisi** | Topshirishdan oldin tekshiradi: ingliz tili to'g'rimi, tarjima aniqmi, javob kaliti bir xil ma'nolimi, testlar o'tadimi. Tekshirilmagan narsa «tayyor» deyilmaydi |

### Har materialda bo'lishi shart

- **Insoniy qadriyat.** Misollar o'quvchining hayotidan: oila, ish, o'qish, sayohat, bozor, shifokor. O'zbek o'quvchisiga
  tanish vaziyat va ismlar. Hurmatli, rag'batlantiruvchi ohang; xato uchun uyaltirish yo'q.
- **Brendga mos uslub.** O'zbekcha interfeys matni yangi alifboda (ö, ğ, ş, ç; tutuq belgisi ’). «Siz» bilan murojaat.
  Atamalar loyihadagidek: «maşq», «luğat», «bölim». Ingliz matni darajaga mos (A1 da oddiy so'z va qisqa gap).
- **Aniq komponentlar.** Mashqda: topshiriq, to'g'ri javob, qabul qilinadigan variantlar, xato uchun izoh. Darsda:
  maqsad («Men qila olaman…»), misol, mashq, tekshiruv. Interfeys matnida: nima bo'ldi va endi nima qilish kerak.

### Taqiqlangan

- Soxta narsa: o'ylab topilgan statistika, sharh, ball, «haqiqiy video» yoki AI bo'lmagan narsani AI deb ko'rsatish.
  Manba ochiq yoziladi (masalan: «ovoz: qurilmangizning nutq sintezi»).
- To'ldiruvchi matn: ma'nosiz kirish va xulosalar, bir fikrni uch xil aytish, sababsiz emoji va undov belgilari.
- Tekshirilmagan ingliz tili: g'ayritabiiy ibora, noto'g'ri grammatika, ikki to'g'ri javobli savol.
- Shablon misollar («John likes apples») — o'rniga aniq vaziyatli, eslab qoladigan gap.

### Topshirishdan oldin

1. Mavjud kontentda shunga o'xshashi yo'qligini tekshir.
2. Matnni qayta o'qi va o'quvchiga hech narsa bermaydigan har gapni o'chir.
3. `npm run test`, `npx tsc --noEmit -p tsconfig.app.json`, `npx eslint src --max-warnings 0` o'tsin; kontent
   o'zgarsa, mobil eksport ham yangilansin (`scripts/export-content-mobile.mjs`).
4. Interfeys o'zgargan bo'lsa, light/dark va telefon o'lchamida ko'zdan kechir.
