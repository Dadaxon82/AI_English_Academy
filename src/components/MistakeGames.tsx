/**
 * Xatolar daftari — xatolarni o'yin usulida qayta ishlash kartalari.
 * Mantiq: `lib/mistakes.ts` (sof). O'yin: umumiy `LessonPlayer`.
 */

import { TIMED_SECONDS, modeCount, type Mistake, type MistakeMode } from '../lib/mistakes'
import { chunkyGreen } from './chunky'
import { MascotFigure } from './Mascot'
import { Card } from './ui'

const MODES: { mode: MistakeMode; icon: string; title: string; body: string; tone: string }[] = [
  {
    mode: 'fix',
    icon: '🛠️',
    title: 'Xatolarni tuzatish',
    body: 'Hali to‘g‘rilanmagan xatolaringiz — eng yangisidan boshlab.',
    tone: 'border-emerald-300 dark:border-emerald-700',
  },
  {
    mode: 'hard',
    icon: '🎯',
    title: 'Eng qiyinlari',
    body: 'Ikki va undan ko‘p marta xato qilgan mashqlaringiz.',
    tone: 'border-rose-300 dark:border-rose-700',
  },
  {
    mode: 'remix',
    icon: '🔄',
    title: 'Boshqa ko‘rinishda',
    body: 'O‘sha bilim — yangi formatda: bo‘shliq → ro‘yxat, tanlov → eslab yozish, tarjima → so‘zlardan tuzish.',
    tone: 'border-violet-300 dark:border-violet-700',
  },
  {
    mode: 'timed',
    icon: '⏱️',
    title: `Vaqtga qarshi (${TIMED_SECONDS} soniya)`,
    body: 'Vaqt tugaguncha iloji boricha ko‘p xatoni tuzating!',
    tone: 'border-sky-300 dark:border-sky-700',
  },
]

export default function MistakeGames({
  mistakes,
  onStart,
}: {
  mistakes: Mistake[]
  onStart: (mode: MistakeMode) => void
}) {
  return (
    <Card className="grid gap-4 p-4 sm:p-6 border-2 border-emerald-300 dark:border-emerald-700">
      <div className="grid sm:grid-cols-[1fr_auto] items-center gap-3">
        <div className="grid gap-1.5">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-violet-600 dark:text-violet-400">Xatolar ustida ishlash</p>
          <h2 className="text-xl sm:text-2xl font-extrabold">
            {mistakes.length > 0 ? `${mistakes.length} ta xato tuzatishni kutmoqda` : 'Tuzatiladigan xato yo‘q — ofarin!'}
          </h2>
          <p className="text-sm muted">
            To‘g‘ri yechilgan mashq ro‘yxatdan o‘zi chiqadi. Har javob XP va yuraklar hisobiga yoziladi; xato qilingani dars oxirida
            yana bir marta beriladi.
          </p>
        </div>
        <MascotFigure maxHeight="max-h-24 sm:max-h-28" alt="" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {MODES.map((m) => {
          const n = modeCount(m.mode, mistakes)
          return (
            <div key={m.mode} className={`rounded-2xl border-2 border-b-4 p-4 grid gap-2 content-between ${m.tone} ${n === 0 ? 'border-dashed' : ''}`}>
              <div className="grid gap-1">
                <p className="font-extrabold">
                  <span aria-hidden className="mr-1.5">
                    {m.icon}
                  </span>
                  {m.title}
                </p>
                <p className="text-sm muted">{m.body}</p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold muted">{n > 0 ? `${n} ta mashq` : 'Hozircha mos xato yo‘q'}</span>
                <button type="button" className={`${chunkyGreen} !px-4 !py-2`} disabled={n === 0} onClick={() => onStart(m.mode)}>
                  Boshlash
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

