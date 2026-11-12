/** Sahna teksturalari konteksti — bir marta yaratiladi, barcha qismlar bo'lishadi. */
import { createContext, useContext } from 'react'
import type { WorldTextures } from './textures'

export const TexContext = createContext<WorldTextures | null>(null)

export function useTex(): WorldTextures {
  const t = useContext(TexContext)
  if (!t) throw new Error('TexContext yo‘q')
  return t
}

/** Orol qirg'og'i: ellips + mayda to'lqin (burchakka qarab) — tekis oval bo'lib qolmasin. */
export function coastFactor(angle: number): number {
  return 1 + 0.045 * Math.sin(angle * 5 + 0.6) + 0.03 * Math.sin(angle * 9 + 2.1) + 0.02 * Math.sin(angle * 14)
}
