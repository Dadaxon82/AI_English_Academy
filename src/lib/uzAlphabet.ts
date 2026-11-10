/**
 * O'zbek lotin yozuvi — yangi alifbo (ö, ğ, ş, ç) va eski yozuv (o‘, g‘, sh,
 * ch) bir-biriga TENG hisoblanishi uchun.
 *
 * Ilova matnlari yangi alifboda. O'quvchi esa klaviaturada ko'pincha eski
 * shaklda yozadi ("o'qituvchi", "kechirasiz"). Javob tekshiruvi va qidiruv
 * ikkala tomonni shu funksiya bilan bir xil ko'rinishga keltiradi: shunda
 * «öqituvçi» ham, «o'qituvchi» ham to'g'ri.
 */

const FOLD: Record<string, string> = {
  ö: "o'",
  Ö: "O'",
  ğ: "g'",
  Ğ: "G'",
  ş: 'sh',
  Ş: 'Sh',
  ç: 'ch',
  Ç: 'Ch',
}

/** Yangi harflarni eski ikki belgili shaklga, apostrof turlarini `'` ga keltiradi. */
export function foldUzLatin(s: string): string {
  return s
    .normalize('NFC')
    .replace(/[öÖğĞşŞçÇ]/g, (c) => FOLD[c] ?? c)
    .replace(/[’‘`´ʻʼʹ]/g, "'")
}
