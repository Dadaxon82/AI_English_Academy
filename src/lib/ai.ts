/**
 * AI holati — interfeysda "AI" so'zi FAQAT shu funksiya `true` qaytarganda chiqadi.
 *
 * Talab: "AI xizmatini ulangan deb ko'rsatib, amalda mavjud bo'lmagan natija
 * yasama." Hozircha AI serverless funksiyasi yo'q — barcha tahlil qoidaviy
 * (`analyze.ts`). `VITE_AI_ENABLED=true` faqat haqiqiy AI funksiyasi
 * joylashtirilgandan keyin qo'yiladi.
 *
 * ESKI BUG: Yozish sahifasi bu shartni tekshirmay, sozlamadagi bayroq va
 * internet bor bo'lsa "qoidaviy + AI" deb yozardi.
 */
export function aiRuntimeEnabled(userFlag: boolean, online: boolean): boolean {
  return userFlag && online && import.meta.env.VITE_AI_ENABLED === 'true'
}
