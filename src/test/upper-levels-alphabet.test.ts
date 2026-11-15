/**
 * B1–C1 kontenti yangi alifboda (ö, ğ, ş, ç) yozilgan bo'lishi shart
 * (CLAUDE.md: «Brendga mos uslub»). Eski «o‘ / g‘» har qanday *Uz maydonida,
 * «sh / ch» esa faqat sof o'zbekcha maydonlarda (tarjima, misol) tutiladi —
 * izohlarda inglizcha so'zlar (which, teacher) bo'lishi tabiiy.
 */
import { describe, expect, it } from 'vitest'
import { getBundle } from '../content'

const OLD_OG = /[oOgG][‘’'ʻ`][a-z]/
const PURE_UZ_KEYS = new Set(['translationUz', 'exampleUz', 'uz', 'titleUz', 'topicUz'])

function walk(node: unknown, key: string, path: string, out: string[]) {
  if (typeof node === 'string') {
    if (!/Uz$|^uz$/.test(key)) return
    const s = node.replace(/o’clock/g, '')
    if (OLD_OG.test(s)) out.push(`${path}: eski o‘/g‘ — ${node.slice(0, 80)}`)
    if (PURE_UZ_KEYS.has(key) && /sh|ch/i.test(s) && !/[A-Z][a-z]+ (Perfect|Simple|Continuous)|Which|English/.test(s))
      out.push(`${path}: eski sh/ch — ${node.slice(0, 80)}`)
    return
  }
  if (Array.isArray(node)) node.forEach((v, i) => walk(v, key, `${path}[${i}]`, out))
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, k, `${path}.${k}`, out)
}

describe.each(['B1', 'B2', 'C1'] as const)('%s — yangi alifbo', (LVL) => {
  it('o‘zbekcha maydonlarda eski yozuv qolmagan', () => {
    const out: string[] = []
    walk(getBundle(LVL), '', LVL, out)
    expect(out, out.join('\n')).toEqual([])
  })
})
