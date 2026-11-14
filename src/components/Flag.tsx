/**
 * Davlat bayroqlari — inline SVG (emoji bayroqlar Windows'da harf bo'lib
 * chiqadi, rasm fayllari esa qo'shimcha so'rov). Nisbat 3:2, soddalashtirilgan.
 */
import type { LanguageCode } from '../lib/languages'

/** 5 burchakli yulduz yo'li (markaz, tashqi radius, burilish gradusda). */
function star(cx: number, cy: number, r: number, rotDeg = 0): string {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const rad = ((rotDeg - 90 + i * 36) * Math.PI) / 180
    const rr = i % 2 === 0 ? r : r * 0.382
    pts.push(`${(cx + rr * Math.cos(rad)).toFixed(2)},${(cy + rr * Math.sin(rad)).toFixed(2)}`)
  }
  return `M${pts.join('L')}Z`
}

/** Koreya bayrog'idagi uchlik (trigramma): `pattern` — 3 chiziq, true = butun, false = bo'lingan. */
function Trigram({ x, y, angle, pattern }: { x: number; y: number; angle: number; pattern: [boolean, boolean, boolean] }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`} fill="#000">
      {pattern.map((solid, i) =>
        solid ? (
          <rect key={i} x={-2} y={-1.6 + i * 1.2} width={4} height={0.8} />
        ) : (
          <g key={i}>
            <rect x={-2} y={-1.6 + i * 1.2} width={1.7} height={0.8} />
            <rect x={0.3} y={-1.6 + i * 1.2} width={1.7} height={0.8} />
          </g>
        ),
      )}
    </g>
  )
}

function FlagShapes({ code }: { code: LanguageCode }) {
  switch (code) {
    case 'en': // Angliya — Avliyo Georgiy xochi
      return (
        <>
          <rect width="30" height="20" fill="#fff" />
          <rect x="13" width="4" height="20" fill="#CE1124" />
          <rect y="8" width="30" height="4" fill="#CE1124" />
        </>
      )
    case 'de':
      return (
        <>
          <rect width="30" height="20" fill="#FFCE00" />
          <rect width="30" height="13.34" fill="#DD0000" />
          <rect width="30" height="6.67" fill="#000" />
        </>
      )
    case 'ru':
      return (
        <>
          <rect width="30" height="20" fill="#D52B1E" />
          <rect width="30" height="13.34" fill="#0039A6" />
          <rect width="30" height="6.67" fill="#fff" />
        </>
      )
    case 'zh':
      return (
        <>
          <rect width="30" height="20" fill="#EE1C25" />
          <g fill="#FFFF00">
            <path d={star(5, 5, 3)} />
            <path d={star(10, 2, 1, 23)} />
            <path d={star(12, 4, 1, 45)} />
            <path d={star(12, 7, 1, 0)} />
            <path d={star(10, 9, 1, 21)} />
          </g>
        </>
      )
    case 'ko': // Janubiy Koreya — taegeuk va to'rt trigramma
      return (
        <>
          <rect width="30" height="20" fill="#fff" />
          <g transform="rotate(33.7 15 10)">
            <circle cx="15" cy="10" r="5" fill="#0047A0" />
            <path d="M10 10a5 5 0 0 1 10 0z" fill="#CD2E3A" />
            <circle cx="12.5" cy="10" r="2.5" fill="#CD2E3A" />
            <circle cx="17.5" cy="10" r="2.5" fill="#0047A0" />
          </g>
          <Trigram x={6.3} y={4.2} angle={-56.3} pattern={[true, true, true]} />
          <Trigram x={23.7} y={15.8} angle={-56.3} pattern={[false, false, false]} />
          <Trigram x={23.7} y={4.2} angle={56.3} pattern={[false, true, false]} />
          <Trigram x={6.3} y={15.8} angle={56.3} pattern={[true, false, true]} />
        </>
      )
  }
}

export default function Flag({ code, className = '' }: { code: LanguageCode; className?: string }) {
  return (
    <svg viewBox="0 0 30 20" className={className} aria-hidden="true" focusable="false">
      <FlagShapes code={code} />
    </svg>
  )
}
