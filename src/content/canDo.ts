/**
 * O'z-o'zini baholash (Likert shkalasi) — CEFR "Can-do" da'volari.
 *
 * Har daraja uchun 6 ta da'vo (har ko'nikmadan bittadan). O'quvchi har biriga
 * 1–5 baho beradi. BU BAHO DARAJANI O'ZGARTIRMAYDI va XP bermaydi — faqat
 * o'quvchining o'z his-tuyg'usi (README: daraja faqat ko'p ko'nikma dalili
 * bilan ko'tariladi). Matnlar CEFR umumiy tavsiflari asosida, soddalashtirib
 * o'zbekchaga moslab yozilgan (rasmiy sertifikat matni emas).
 */

import type { CefrLevel, Skill } from './types'

export interface CanDoStatement {
  id: string
  level: CefrLevel
  skill: Skill
  textUz: string
}

export const LIKERT_LABELS: readonly string[] = [
  'Umuman qila olmayman',
  'Qiyinçilik bilan',
  'Qisman',
  'Ança yaxşi',
  'Bemalol qila olaman',
]

export const CAN_DO: readonly CanDoStatement[] = [
  // ------------------------------ A1 ------------------------------
  { id: 'cd-a1-speak', level: 'A1', skill: 'speaking', textUz: 'Özimni taniştira olaman: ismim, yoşim, qayerda yaşaşim.' },
  { id: 'cd-a1-listen', level: 'A1', skill: 'listening', textUz: 'Sekin va aniq aytilgan oddiy savollarni (ism, yoş, soat) tuşunaman.' },
  { id: 'cd-a1-read', level: 'A1', skill: 'reading', textUz: 'Oila, uy, maktab haqidagi qisqa va oddiy matnni tuşunaman.' },
  { id: 'cd-a1-write', level: 'A1', skill: 'writing', textUz: 'Özim va oilam haqida 3–5 ta oddiy gap yoza olaman.' },
  { id: 'cd-a1-vocab', level: 'A1', skill: 'vocabulary', textUz: 'Sonlar, ranglar, ovqat va uy-rözğor buyumlarining nomlarini bilaman.' },
  { id: 'cd-a1-grammar', level: 'A1', skill: 'grammar', textUz: '“am / is / are”, “have got” va “there is / are”ni töğri işlataman.' },
  // ------------------------------ A2 ------------------------------
  { id: 'cd-a2-speak', level: 'A2', skill: 'speaking', textUz: 'Dökonda xarid qiliş yoki yöl söraş kabi oddiy vaziyatlarda gaplaşa olaman.' },
  { id: 'cd-a2-listen', level: 'A2', skill: 'listening', textUz: 'Kundalik mavzudagi qisqa e’lon va xabarlarning asosiy ma’nosini tuşunaman.' },
  { id: 'cd-a2-read', level: 'A2', skill: 'reading', textUz: 'Qisqa xat, menyu va jadvaldan kerakli ma’lumotni topa olaman.' },
  { id: 'cd-a2-write', level: 'A2', skill: 'writing', textUz: 'Döstimga dam oliş kunlari haqida qisqa xabar yoza olaman.' },
  { id: 'cd-a2-vocab', level: 'A2', skill: 'vocabulary', textUz: 'Sayohat, iş, soğliq kabi kundalik mavzular sözlarini bilaman.' },
  { id: 'cd-a2-grammar', level: 'A2', skill: 'grammar', textUz: 'Past Simple va kelasi zamon (going to / will) bilan gap tuza olaman.' },
  // ------------------------------ B1 ------------------------------
  { id: 'cd-b1-speak', level: 'B1', skill: 'speaking', textUz: 'Tajribam, rejalarim va fikrimni sabablari bilan aytib bera olaman.' },
  { id: 'cd-b1-listen', level: 'B1', skill: 'listening', textUz: 'Taniş mavzudagi radio yoki video asosiy fikrlarini tuşunaman.' },
  { id: 'cd-b1-read', level: 'B1', skill: 'reading', textUz: 'Kundalik mavzudagi maqolaning asosiy ğoyasi va tafsilotlarini tuşunaman.' },
  { id: 'cd-b1-write', level: 'B1', skill: 'writing', textUz: 'Taniş mavzuda boğlangan matn (inşo, xat) yoza olaman.' },
  { id: 'cd-b1-vocab', level: 'B1', skill: 'vocabulary', textUz: 'Notaniş söz ma’nosini kontekstdan taxmin qila olaman.' },
  { id: 'cd-b1-grammar', level: 'B1', skill: 'grammar', textUz: 'Present Perfect va şart gaplarni (if …) işlata olaman.' },
  // ------------------------------ B2 ------------------------------
  { id: 'cd-b2-speak', level: 'B2', skill: 'speaking', textUz: 'Ona tilida sözlaşuvçi bilan erkin, tabiiy suhbat qura olaman.' },
  { id: 'cd-b2-listen', level: 'B2', skill: 'listening', textUz: 'Ma’ruza va yangiliklardagi murakkab fikrlarni tuşunaman.' },
  { id: 'cd-b2-read', level: 'B2', skill: 'reading', textUz: 'Muallif nuqtai nazarini bildiruvçi maqolalarni tuşunaman.' },
  { id: 'cd-b2-write', level: 'B2', skill: 'writing', textUz: 'Dalillar bilan “tarafdor / qarşi” inşo yoza olaman.' },
  { id: 'cd-b2-vocab', level: 'B2', skill: 'vocabulary', textUz: 'Bir fikrni turli söz va iboralar bilan ifoda eta olaman.' },
  { id: 'cd-b2-grammar', level: 'B2', skill: 'grammar', textUz: 'Majhul nisbat (passive) va murakkab zamonlarni xatosiz işlataman.' },
  // ------------------------------ C1 ------------------------------
  { id: 'cd-c1-speak', level: 'C1', skill: 'speaking', textUz: 'Murakkab mavzularda ravon va aniq, söz izlamasdan gapiraman.' },
  { id: 'cd-c1-listen', level: 'C1', skill: 'listening', textUz: 'Aniq tuzilmagan, tez nutqni ham qiyinçiliksiz tuşunaman.' },
  { id: 'cd-c1-read', level: 'C1', skill: 'reading', textUz: 'Uzun va murakkab matnlardagi yaşirin ma’nolarni ilğayman.' },
  { id: 'cd-c1-write', level: 'C1', skill: 'writing', textUz: 'Aniq tuzilgan, puxta asoslangan rasmiy matn yoza olaman.' },
  { id: 'cd-c1-vocab', level: 'C1', skill: 'vocabulary', textUz: 'Idioma va sözlaşuv iboralarini örinli işlataman.' },
  { id: 'cd-c1-grammar', level: 'C1', skill: 'grammar', textUz: 'Murakkab grammatik tuzilmalarni uslubga mos tanlay olaman.' },
]

export function canDoFor(level: CefrLevel): CanDoStatement[] {
  return CAN_DO.filter((s) => s.level === level)
}
