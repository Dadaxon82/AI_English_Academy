/**
 * "Chunky" 3D tugmalar — bitta manba (dars, mashq, bo'limlar, o'yinlar).
 * Ranglar CSS tokenlarida (`index.css`: --btn-go / --btn-no / --btn-alt / --btn-off),
 * ya'ni yorug' va qorong'i mavzuda bir joydan boshqariladi.
 *
 * O'lcham chaqiruvchida (px/py, w-full, min-w) — shakl va holatlar shu yerda.
 */
export const CHUNKY =
  'inline-flex items-center justify-center rounded-2xl text-sm font-extrabold uppercase tracking-wide border-b-4 ' +
  'transition-all active:translate-y-0.5 active:border-b-2 focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'disabled:cursor-not-allowed'

/** Rang variantlari (oq matnlilari ≥4.5:1). */
export const CHUNKY_GO = 'bg-[var(--btn-go)] hover:bg-[var(--btn-go-hover)] text-white border-[var(--btn-go-edge)]'
export const CHUNKY_NO = 'bg-[var(--btn-no)] hover:bg-[var(--btn-no-hover)] text-white border-[var(--btn-no-edge)]'
export const CHUNKY_ALT = 'bg-[var(--btn-alt)] hover:bg-[var(--btn-alt-hover)] text-white border-[var(--btn-alt-edge)]'
export const CHUNKY_PLAIN = 'bg-[var(--panel)] hover:bg-[var(--panel-2)] text-[var(--text)] border-2 border-b-4'
export const CHUNKY_OFF = 'bg-[var(--btn-off)] text-[var(--btn-off-text)] border-[var(--btn-off-edge)]'

/** Tayyor kombinatsiyalar (dars pleyeri o'lchami). */
export const chunkyGreen = `${CHUNKY} px-6 py-3 disabled:opacity-50 ${CHUNKY_GO}`
export const chunkyPlain = `${CHUNKY} px-6 py-3 disabled:opacity-50 ${CHUNKY_PLAIN}`
