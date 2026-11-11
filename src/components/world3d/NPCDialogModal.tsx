/**
 * NPC bilan suhbat: NPC inglizcha gapiradi (qurilmaning nutq sintezi), o'quvchi
 * mikrofon orqali yoki tugma bilan javob beradi — shundan keyin topshiriqlar ochiladi.
 * Ovoz ishlamasa ham matn bilan to'liq ishlaydi.
 */
import { useEffect, useState } from 'react'
import { Button } from '../ui'
import Panel from './Panel'
import UzTranslation from '../UzTranslation'
import { speechMatch } from '../../lib/lessons'
import { skillLabelUz } from '../../lib/planning'
import { ttsSupported } from '../../lib/shortPlayback'
import { useSpeechInput } from '../../lib/useSpeechInput'
import type { FinishZone, NpcLine, Station, StationState, World } from '../../lib/world3d'

export type DialogTarget = { kind: 'station'; station: Station } | { kind: 'finish'; finish: FinishZone }

/** Javob qabul qilinadigan chegara (kutilgan gap so'zlarining ulushi). */
const REPLY_PASS = 0.6

function speak(text: string) {
  if (!ttsSupported()) return
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = 0.92
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}

function lineFor(t: DialogTarget, world: World): { npc: NpcLine; state: StationState; en: string; uz: string } {
  const npc = t.kind === 'station' ? t.station.npc : t.finish.npc
  const state = t.kind === 'station' ? t.station.state : t.finish.state
  if (state === 'locked') {
    const before = t.kind === 'station' ? world.stations[t.station.index - 1] : world.stations.find((s) => s.state !== 'done')
    const name = before ? skillLabelUz(before.skill) : ''
    return { npc, state, en: 'Sorry, this gate is closed. Please finish the station before this one.', uz: `Keçirasiz, bu darvoza yopiq. Avval «${name}» stansiyasini yakunlang.` }
  }
  if (state === 'done') return { npc, state, en: 'Great job! You finished this station. Do you want to play again?', uz: 'Barakalla! Bu stansiyani yakunladingiz. Yana öynaysizmi?' }
  return { npc, state, en: npc.en, uz: npc.uz }
}

export default function NPCDialogModal({ target, world, onStart, onClose }: { target: DialogTarget | null; world: World; onStart: (t: DialogTarget) => void; onClose: () => void }) {
  if (!target) return null
  // `key` — har yangi suhbatda holat (eshitilgan javob) tozalanadi
  return <Dialog key={target.kind === 'station' ? target.station.skill : 'finish'} target={target} world={world} onStart={onStart} onClose={onClose} />
}

function Dialog({ target, world, onStart, onClose }: { target: DialogTarget; world: World; onStart: (t: DialogTarget) => void; onClose: () => void }) {
  const { npc, state, en, uz } = lineFor(target, world)
  const [heard, setHeard] = useState<{ text: string; ok: boolean } | null>(null)
  const mic = useSpeechInput((r) => {
    const ok = speechMatch(npc.replyEn, r.text) >= REPLY_PASS
    setHeard({ text: r.text, ok })
    if (ok) setTimeout(() => onStart(target), 700)
  })

  // NPC gapini avtomatik aytadi; oyna yopilsa ovoz to'xtaydi
  useEffect(() => {
    speak(en)
    return () => {
      if (ttsSupported()) window.speechSynthesis.cancel()
    }
  }, [en])

  const title = target.kind === 'station' ? `${target.station.index + 1}-stansiya: ${skillLabelUz(target.station.skill)}` : 'Finiş: yakuniy sinov'
  const tasks = target.kind === 'station' ? target.station.tasks : target.finish.tasks
  const close = () => {
    mic.stop()
    onClose()
  }

  return (
    <Panel title={title} onClose={close}>
      <div className="grid gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-black/5 dark:bg-white/10 text-3xl" aria-hidden>
            {npc.emoji}
          </span>
          <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-black/10 dark:border-white/15 bg-black/5 dark:bg-white/10 px-3.5 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wide muted">{npc.name}</p>
            <p className="font-semibold" lang="en">
              {en}
            </p>
            <p className="text-sm muted">
              <UzTranslation>{uz}</UzTranslation>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {ttsSupported() ? (
            <Button variant="ghost" size="sm" onClick={() => speak(en)}>
              🔊 Qayta eşitiş
            </Button>
          ) : (
            <span className="muted">Bu qurilmada ingliz ovozi yöq — matnni öqing.</span>
          )}
          <span className="rounded-full border px-2.5 py-1 font-semibold">{tasks} ta topşiriq</span>
          {target.kind === 'finish' && <span className="rounded-full border px-2.5 py-1 font-semibold">Ötiş bali: {target.finish.passScore}</span>}
          {target.kind === 'station' && target.station.score !== null && (
            <span className="rounded-full border px-2.5 py-1 font-semibold">
              Natija: {target.station.score}% {'⭐'.repeat(target.station.stars)}
            </span>
          )}
        </div>

        {state === 'locked' ? (
          <Button variant="secondary" onClick={close}>
            Tuşunarli
          </Button>
        ) : (
          <div className="grid gap-2 rounded-2xl border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide muted">Sizning javobingiz</p>
            <p className="font-semibold" lang="en">
              “{npc.replyEn}” <span className="text-sm font-normal muted">— {npc.replyUz}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {mic.supported && (
                <Button variant="secondary" onClick={mic.listening ? mic.stop : mic.start} aria-pressed={mic.listening}>
                  {mic.listening ? '⏹ Tinglayapman…' : '🎤 Ovoz bilan aytiş'}
                </Button>
              )}
              <Button onClick={() => onStart(target)}>{state === 'done' ? 'Qayta öynaş' : target.kind === 'finish' ? 'Sinovni boşlaş' : 'Javob beriş va boşlaş'}</Button>
            </div>
            {heard && (
              <p className={`text-sm ${heard.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-800 dark:text-amber-300'}`} role="status">
                Eşitildi: “{heard.text}”. {heard.ok ? 'Zör! Boşlaymiz…' : 'Yana bir bor aytib köring yoki tugmani bosing.'}
              </p>
            )}
            {mic.error && (
              <p className="text-sm text-[var(--bad)]" role="alert">
                {mic.error}
              </p>
            )}
          </div>
        )}
      </div>
    </Panel>
  )
}
