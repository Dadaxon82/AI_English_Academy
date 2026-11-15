/**
 * Davlat bayroqlari — inline SVG (emoji bayroqlar Windows'da harf bo'lib
 * chiqadi, rasm fayllari esa qo'shimcha so'rov). Nisbat 3:2, soddalashtirilgan.
 */
import { useId } from 'react'
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

/** Union Jack: ko'k fon, oq-qizil diagonallar (qizil chiziq soat yo'nalishida siljigan) va oq hoshiyali qizil xoch. */
function UnionJack() {
  // Bir sahifada bir nechta bayroq bo'lishi mumkin — clipPath id'lari noyob bo'lsin.
  const id = useId().replace(/:/g, '')
  return (
    <g transform="scale(0.5 0.6667)">
      <defs>
        <clipPath id={`uj-s-${id}`}>
          <path d="M0,0 v30 h60 v-30 z" />
        </clipPath>
        <clipPath id={`uj-t-${id}`}>
          <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#uj-s-${id})`}>
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#uj-t-${id})`} stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </g>
  )
}

function FlagShapes({ code }: { code: LanguageCode }) {
  switch (code) {
    case 'en': // Buyuk Britaniya — Union Jack (60×30 andozada chizilib, 30×20 ga moslanadi)
      return <UnionJack />
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
