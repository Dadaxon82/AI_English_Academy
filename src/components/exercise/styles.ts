/** Mashq ekrani klasslari (variant kartasi, so'z plitkasi). */
import { CHUNKY } from '../chunky'

/** Katta "3D" tugma (pastki chegara — chuqurlik). */
export const chunkyBtn = `min-w-32 sm:min-w-40 ${CHUNKY} px-4 sm:px-6 py-3`

/** Variant kartasi (raqamli belgi bilan). */
export const cardCls =
  'aea-choice w-full flex items-center gap-3 rounded-2xl border-2 border-b-4 px-3.5 py-3 text-sm sm:text-base text-left ' +
  'bg-[var(--panel)] disabled:cursor-default'
export const cardOn = 'border-navy-400 bg-navy-50 text-navy-800 dark:bg-navy-900/40 dark:text-navy-100 dark:border-navy-500 font-bold'

/** So'z plitkasi. */
export const tileCls =
  'aea-choice inline-flex items-center rounded-xl border-2 border-b-4 px-3 py-1.5 text-sm sm:text-base font-semibold ' +
  'bg-[var(--panel)] disabled:cursor-default'
