/**
 * Platformadagi tillar — header'dagi bayroqlar shu ro'yxatdan chiziladi.
 *
 * Hozircha faqat ingliz tili kursi tayyor (`ready: true`). Qolgan tillar
 * uchun bayroq bosilsa o'sha tilning sahifasi (`/lang/<code>`) ochiladi —
 * kurs kontenti keyinchalik shu sahifaga qo'shiladi.
 */

export type LanguageCode = 'en' | 'de' | 'ru' | 'zh' | 'ko'

export interface Language {
  code: LanguageCode
  /** Til nomi (o'zbekcha). */
  nameUz: string
  /** Til o'z nomi bilan. */
  nativeName: string
  /** Bayroq egasi davlat (o'zbekcha) — bayroq tagidagi yozuv / title. */
  countryUz: string
  /** Shu tilda salomlashish (sahifa sarlavhasi ostida namunaviy ibora). */
  hello: string
  /** Kurs tayyormi. */
  ready: boolean
}

export const LANGUAGES: readonly Language[] = [
  { code: 'en', nameUz: 'Ingliz tili', nativeName: 'English', countryUz: 'Angliya', hello: 'Hello!', ready: true },
  { code: 'de', nameUz: 'Nemis tili', nativeName: 'Deutsch', countryUz: 'Germaniya', hello: 'Hallo!', ready: false },
  { code: 'ru', nameUz: 'Rus tili', nativeName: 'Русский', countryUz: 'Rossiya', hello: 'Привет!', ready: false },
  { code: 'zh', nameUz: 'Xitoy tili', nativeName: '中文', countryUz: 'Xitoy', hello: '你好！', ready: false },
  { code: 'ko', nameUz: 'Koreys tili', nativeName: '한국어', countryUz: 'Koreya', hello: '안녕하세요!', ready: false },
]

export function findLanguage(code: string | undefined): Language | undefined {
  return LANGUAGES.find((l) => l.code === code)
}

/** Bayroq bosilganda ochiladigan sahifa: ingliz tili — asosiy kurs, qolganlari — til sahifasi. */
export function languageHref(code: LanguageCode): string {
  return code === 'en' ? '/dashboard' : `/lang/${code}`
}

/** Joriy manzil qaysi tilga tegishli (header'da faol bayroqni belgilash uchun). */
export function activeLanguage(pathname: string): LanguageCode {
  const m = /^\/lang\/([a-z]+)/.exec(pathname)
  return findLanguage(m?.[1])?.code ?? 'en'
}
