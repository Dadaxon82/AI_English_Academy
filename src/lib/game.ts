/**
 * O'yin qatlamining mantig'i — SOF funksiqlar (React'ga bog'liq emas).
 *
 * Barcha sonlar `gameConfig.ts` dan olinadi; mobil tomonda shu funksiqlarning
 * Kotlin nusxasi bor (`domain/GameLogic.kt`) va `src/test/game-config.test.ts`
 * ikkala tarafning JADVAL sonlarini solishtiradi.
 *
 * Halollik qoidasi: bu fayl hech qachon son "ixtiro" qilmaydi — har bir
 * o'zgarish `AppData` dagi mavjud hisoblamalardan (attempts, activity, srs)
 * yoki `gameConfig` dagi e'lon qilingan qiymatdan kelib chiqadi.
 */

// Kod ikki modulga bo'lingan (har biri ≤500 qator); ochiq API shu fayl orqali o'zgarmaydi.
export * from './gameCore'
export * from './gameMeta'
