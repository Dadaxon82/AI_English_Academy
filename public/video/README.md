# Haqiqiy video shortlar

Bu papkaga ona tilida so'zlashuvchi yozib olgan qisqa kliplarni (3–8 soniya, vertikal 9:16, MP4/WebM)
qo'shsangiz, ilova o'sha short uchun animatsion sahna o'rniga **haqiqiy videoni** ko'rsatadi.

1. Faylni shu papkaga qo'ying: `public/video/a1-d5-cafe-0.mp4`.
2. `manifest.json` ga yozuv qo'shing:

```json
{
  "items": [
    {
      "shortId": "a1-d5-cafe-0",
      "src": "video/a1-d5-cafe-0.mp4",
      "poster": "video/a1-d5-cafe-0.jpg",
      "speakerUz": "Emma, London",
      "license": "Muallif roziligi bilan, 2026"
    }
  ]
}
```

`shortId` — `<suhbat id>-<replika raqami>` (Shortlar sahifasida har short ostida yozilgan).
Klipda aynan o'sha replika aytilishi kerak: subtitr va savol shu matndan olinadi.
`license` majburiy — ruxsatsiz (masalan boshqa platformadan olingan) video qo'shilmaydi.
