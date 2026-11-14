/**
 * O'yin belgilari (yurak, gem, olov, yulduz, qalqon, kubok, sandiq, chaqmoq,
 * qilf). Bitta geometriya ikki tomonda ishlatiladi: veb — shu SVG yo'llari,
 * mobil — `mobile/app/src/main/res/drawable/ic_*.xml` (ayni yo'llar).
 *
 * Nega alohida fayl: rang so'zlari (yurak=qizil, gem=ko'k, olov=to'q sariq)
 * butun ilovada BIR XIL bo'lishi kerak. Ranglar `src/index.css`dag
 * `--heart / --gem / --star / --league` o'zgaruvchilaridan olinadi, mobil
 * tomonda `colors.xml` dag `heart / gem / star / league` ranglari bilan
 * bir xil (`src/test/game-icons.test.ts` shu tenglikni tekshiradi).
 *
 * `filled` — yurak holati (bor/yo'q) va boshqa holatlarda to'ldirilgan yoki
 * faqat kontur chizib beriladi. `aria-hidden` — belga matn hamdo'st bo'lmasa
 * o'quvchi uchun ma'nosi yo'q (ekranlarda yonida son/so'z yoziladi).
 */

export type GameIconName =
  | 'heart'
  | 'gem'
  | 'flame'
  | 'star'
  | 'shield'
  | 'trophy'
  | 'chest'
  | 'bolt'
  | 'lock'
  | 'check'

/** Yo'llar — `fill` uchun yopilgan, `stroke` uchun ochiq qoldiriladi. */
const PATHS: Record<GameIconName, string[]> = {
  heart: ['M12 20.7 4.6 13.4a5 5 0 1 1 7.4-6.7 5 5 0 1 1 7.4 6.7z'],
  gem: ['M7 3h10l4 6-9 12L3 9z', 'M3 9h18', 'M9.5 3 7 9l5 12 5-12-2.5-6'],
  flame: [
    'M12 2c3 4 6 6 6 10a6 6 0 0 1-12 0c0-2 1-3.4 2.2-4.4C8.5 9.4 9.6 10.6 10 12c1.4-3.2-1.2-6.4 2-10z',
  ],
  star: ['M12 3.5 14.6 9l6 .7-4.5 4 1.3 5.9L12 16.5 6.6 19.6 7.9 13.7l-4.5-4 6-.7z'],
  shield: ['M12 3 4.5 6v6c0 4.5 3.2 7.7 7.5 9 4.3-1.3 7.5-4.5 7.5-9V6z'],
  trophy: ['M7 4h10v4.5a5 5 0 0 1-10 0z', 'M4.5 6H7v3.2A2.6 2.6 0 0 1 4.5 6.8z', 'M19.5 6H17v3.2a2.6 2.6 0 0 0 2.5-2.4z', 'M9.5 14h5l.8 6h-6.6z'],
  chest: ['M4 8.5h16V19H4z', 'M4 8.5 6 4.5h12l2 4', 'M10.5 8.5V12h3V8.5'],
  bolt: ['M13 2 5 14h5.5L10 22l8-12h-5.5z'],
  lock: ['M7.5 10V8a4.5 4.5 0 0 1 9 0v2', 'M5.5 10h13v9.5h-13z'],
  check: ['M5 13l4.5 4.5L19 7'],
}

/** To'ldiriladigan belgilar (qolganlari kontur bilan yaxshi ko'rinadi). */
const SOLID: GameIconName[] = ['heart', 'flame', 'star', 'shield', 'trophy', 'chest', 'bolt', 'lock']

export function GameIcon({
  name,
  size = 18,
  filled = true,
  className,
  title,
}: {
  name: GameIconName
  size?: number
  /** false — faqat kontur (masalan yurak tugaganida). */
  filled?: boolean
  className?: string
  /** Matn berilsa — belga ma'nomli bo'ladi (aks holda aria-hidden). */
  title?: string
}) {
  const solid = filled && SOLID.includes(name)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name].map((d, i) => (
        <path
          key={i}
          d={d}
          fill={solid ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={solid ? 1 : 2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}
