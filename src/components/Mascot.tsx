import React, { useMemo } from 'react'

export type MascotMood = 'greeting' | 'cheer' | 'encourage' | 'thinking' | 'proud'

export interface MascotProps {
  mood?: MascotMood
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'hero'
  className?: string
  alt?: string
}

const SIZE_MAP = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
  '2xl': 'w-28 h-28',
  hero: 'w-36 h-36 sm:w-44 sm:h-44',
}

/**
 * AI English Academy Bosh Qahramoni — milliy libosdagi samimiy o'zbek o'quvchi yigit.
 * Barcha sahifalarda o'quvchiga hamrohlik qiladi va motivatsiya beradi.
 */
export function MascotAvatar({
  mood = 'greeting',
  size = 'md',
  className = '',
  alt = 'AI English Academy qahramoni',
}: MascotProps) {
  const glow = useMemo(() => {
    switch (mood) {
      case 'cheer':
      case 'proud':
        return 'ring-2 ring-emerald-400 dark:ring-emerald-500 shadow-emerald-500/20'
      case 'encourage':
        return 'ring-2 ring-amber-400 dark:ring-amber-500 shadow-amber-500/20'
      case 'thinking':
        return 'ring-2 ring-sky-400 dark:ring-sky-500 shadow-sky-500/20'
      case 'greeting':
      default:
        return 'ring-1 ring-indigo-400/50 dark:ring-indigo-500/40 shadow-indigo-500/10'
    }
  }, [mood])

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center rounded-2xl overflow-hidden bg-gradient-to-b from-indigo-50 to-indigo-100 dark:from-slate-800 dark:to-slate-900 shadow-sm ${glow} ${SIZE_MAP[size]} ${className}`}
      aria-label={alt}
    >
      <img
        src={`${import.meta.env.BASE_URL}mascot/mascot-avatar.png`}
        alt={alt}
        className="w-full h-full object-cover object-top select-none transition-transform duration-300 hover:scale-105"
        loading="lazy"
      />
    </div>
  )
}

/**
 * To'liq bo'yli qahramon tasviri (Dashboard, Onboarding va yutuqlar sahifalari uchun)
 */
export function MascotFigure({
  className = '',
  maxHeight = 'max-h-56 sm:max-h-64',
  alt = 'AI English Academy qahramoni',
}: {
  className?: string
  maxHeight?: string
  alt?: string
}) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <img
        src={`${import.meta.env.BASE_URL}mascot/mascot-full.png`}
        alt={alt}
        className={`${maxHeight} w-auto object-contain drop-shadow-md select-none transition-transform duration-500 hover:scale-102`}
      />
    </div>
  )
}

/**
 * Qahramon nutq pufagi (speech bubble) bilan birga motivatsiya xabari
 */
export function MascotSpeechBubble({
  title,
  message,
  mood = 'greeting',
  children,
  className = '',
}: {
  title?: string
  message: React.ReactNode
  mood?: MascotMood
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-start gap-3.5 sm:gap-4 ${className}`}>
      <MascotAvatar mood={mood} size="lg" className="mt-0.5 shadow-md" />
      <div className="relative flex-1 rounded-2xl border p-3.5 sm:p-4 bg-[var(--panel)] text-[var(--text)] shadow-sm">
        {/* Nutq pufagi uchburchak burchagi */}
        <div
          className="absolute -left-2 top-4 w-3 h-3 rotate-45 border-l border-b bg-[var(--panel)]"
          aria-hidden="true"
        />
        {title && <h3 className="font-bold text-sm text-navy-800 dark:text-navy-200 mb-1">{title}</h3>}
        <div className="text-sm leading-relaxed">{message}</div>
        {children && <div className="mt-3 flex flex-wrap gap-2">{children}</div>}
      </div>
    </div>
  )
}

/**
 * Mashq natijasi uchun qahramonning tezkor munosabati
 *
 * `xp` berilsa — XP sonining ko'tarilishi (`--animate-xp`) ko'rsatiladi.
 * Bu mobil ilovadagi `Motion.flyXp()` ning vebdagi ko'rinishi (DULO'da
 * har to'g'ri javobdan keyin ochko/XP animatsiyasi bor — `res/raw`dagi
 * Lottie fayllari orasida `score`/`xp` nomlari uchraydi). Son ixtir
 * EMAS: chaqiruvchi `xpForAttempt()` bilan hisoblab beradi.
 */
export function MascotExerciseFeedback({
  correct,
  expected,
  whyUz,
  xp,
  bare = false,
}: {
  correct: boolean
  expected?: string
  whyUz?: string
  xp?: number
  /** `true` — ramka/fonsiz (rangli pastki panel ichida ishlatiladi). */
  bare?: boolean
}) {
  return (
    <div
      className={`relative flex items-start gap-3 text-sm animate-[var(--animate-pop)] ${
        bare
          ? ''
          : `rounded-2xl border px-4 py-3.5 ${
              correct
                ? 'border-emerald-400/60 bg-emerald-50/90 dark:bg-emerald-950/30'
                : 'border-rose-400/60 bg-rose-50/90 dark:bg-rose-950/30'
            }`
      }`}
      role="status"
      aria-live="polite"
    >
      {xp !== undefined && xp > 0 && (
        <span
          className={`absolute right-3 top-1 text-sm font-bold tabular-nums animate-[var(--animate-xp)] pointer-events-none ${
            correct ? 'text-[var(--ok)]' : 'text-[var(--bad)]'
          }`}
          aria-label={`Bu javob uchun ${xp} XP`}
        >
          +{xp} XP
        </span>
      )}
      <MascotAvatar
        mood={correct ? 'cheer' : 'encourage'}
        size="md"
        className="mt-0.5"
      />
      <div className="flex-1">
        <strong className={correct ? 'text-[var(--ok)]' : 'text-[var(--bad)]'}>
          {correct ? "Ofarin! To'g'ri topdingiz! 🌟" : "Xavotir olmang, harakatdan to'xtamang! 💪"}
        </strong>
        {!correct && expected && (
          <p className="mt-1">
            To‘g‘ri javob: <b className="font-semibold">{expected}</b>
          </p>
        )}
        {whyUz && <p className="mt-1 muted text-xs leading-normal">{whyUz}</p>}
      </div>
    </div>
  )
}
