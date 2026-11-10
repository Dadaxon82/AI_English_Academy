/**
 * AI SUHBATDOSH — rol o'yini (g'oya: Memrise / Ling chatbot; dizayn bizniki).
 *
 * Stsenariy tanlanadi (real hayot suhbatlari bilan bir xil vaziyatlar),
 * o'quvchi yozadi yoki gapiradi (brauzer qo'llasa). Dvigatel ekranda doim
 * ochiq yoziladi:
 *  - AI ulangan → `ai-roleplay` hamsuhbat rolida javob beradi va xatolarni tuzatadi;
 *  - aks holda → oldindan yozilgan stsenariy, javob namuna bilan solishtiriladi.
 *
 * Yakunda: AI topgan tuzatishlar «to'g'ri gapni tuzing» mashqlariga aylanadi
 * (o'quvchi ularni darhol ishlaydi; xato qilsa — Xatolar daftariga tushadi),
 * AI aytgan so'zlardan LUG'ATIMIZDA bor bo'lganlari SRS'ga saqlanadi.
 */

import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import LessonPlayer from '../components/LessonPlayer'
import UzTranslation from '../components/UzTranslation'
import { Button, Card, Chip, InfoBanner, LoadingBlock, SpeakButton, inputCls } from '../components/ui'
import { allGlossaryVocab, allVocab, roleplayFixExercise, roleplayFixId } from '../content'
import { dialoguesFor } from '../content/dialogues'
import type { CefrLevel, Dialogue, VocabularyItem } from '../content/types'
import type { RoleplayCorrection } from '../../supabase/functions/_shared/roleplay'
import { aiRuntimeEnabled } from '../lib/ai'
import type { LessonStep } from '../lib/lessons'
import { compareWithModel, historyForRequest, matchVocab, requestRoleplayTurn, scriptTurns, type RoleplayEngine } from '../lib/roleplay'
import { useStore } from '../lib/storeContext'
import { SPEECH_UNSUPPORTED_UZ, useSpeechInput } from '../lib/useSpeechInput'

const LEVELS: CefrLevel[] = ['A1', 'A2']
/** AI rejimida o'quvchining eng ko'p navbati (server tarix chegarasi 24 replika). */
const MAX_LEARNER_TURNS = 10

interface ChatLine {
  speaker: 'partner' | 'learner'
  text: string
  corrections?: RoleplayCorrection[]
  compare?: { modelEn: string; modelUz: string; matched: string[]; missing: string[] }
}

export default function Conversation() {
  const { data, ready, netOnline, actions } = useStore()
  const aiOn = aiRuntimeEnabled(data.settings.aiEnabled, netOnline)
  const [level, setLevel] = useState<CefrLevel>(LEVELS.includes(data.settings.currentLevel) ? data.settings.currentLevel : 'A1')
  const [d, setD] = useState<Dialogue | null>(null)
  const [engine, setEngine] = useState<RoleplayEngine>('script')
  const [lines, setLines] = useState<ChatLine[]>([])
  const [pos, setPos] = useState(0)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const [words, setWords] = useState<{ word: string; translationUz: string }[]>([])
  const [fixLesson, setFixLesson] = useState<LessonStep[] | null>(null)
  const [savedWords, setSavedWords] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)

  const speech = useSpeechInput((r) => setInput((t) => (t ? `${t} ${r.text}` : r.text)))
  const vocabPool = useMemo<VocabularyItem[]>(() => [...allVocab(), ...allGlossaryVocab()], [])
  const script = useMemo(() => (d ? scriptTurns(d) : null), [d])

  if (!ready) return <LoadingBlock label="Suhbatdosh tayyorlanmoqda…" />

  const scroll = () => window.setTimeout(() => endRef.current?.scrollIntoView?.({ block: 'end' }), 0)

  const start = (dlg: Dialogue, eng: RoleplayEngine) => {
    const s = scriptTurns(dlg)
    setD(dlg)
    setEngine(eng)
    setPos(0)
    setFinished(false)
    setError(null)
    setWords([])
    setSavedWords(false)
    setFixLesson(null)
    setInput('')
    // Ochilish: stsenariydagi birinchi hamsuhbat replikalari (bo'lmasa — o'quvchi boshlaydi).
    setLines((s.turns[0]?.partner ?? []).map((text) => ({ speaker: 'partner', text })))
  }

  const finish = () => {
    speech.stop()
    setFinished(true)
    scroll()
  }

  const sendScript = (text: string) => {
    if (!script) return
    const turn = script.turns[pos]
    if (!turn) return
    const cmp = compareWithModel(text, turn.modelEn)
    const next: ChatLine[] = [...lines, { speaker: 'learner', text, compare: { modelEn: turn.modelEn, modelUz: turn.modelUz, ...cmp } }]
    const nextTurn = script.turns[pos + 1]
    if (nextTurn) next.push(...nextTurn.partner.map((p): ChatLine => ({ speaker: 'partner', text: p })))
    else next.push(...script.closing.map((p): ChatLine => ({ speaker: 'partner', text: p })))
    setLines(next)
    setPos(pos + 1)
    if (!nextTurn) finish()
    scroll()
  }

  const sendAi = async (text: string) => {
    if (!d) return
    const withMine: ChatLine[] = [...lines, { speaker: 'learner', text }]
    setLines(withMine)
    setBusy(true)
    setError(null)
    const r = await requestRoleplayTurn({
      level: d.level,
      situation: d.situationUz,
      partnerRole: d.roles.a,
      learnerRole: d.roles.b,
      history: historyForRequest(withMine.map((l) => ({ speaker: l.speaker, text: l.text }))),
    })
    setBusy(false)
    if (!r.ok) {
      // O'quvchi replikasi qaytariladi — qayta yuborish yoki stsenariyga o'tish mumkin.
      setLines(lines)
      setInput(text)
      setError(r.reasonUz)
      return
    }
    const turn = r.feedback
    const updated = [...withMine]
    updated[updated.length - 1] = { speaker: 'learner', text, corrections: turn.corrections }
    updated.push({ speaker: 'partner', text: turn.reply })
    setLines(updated)
    setWords((w) => [...w, ...turn.newWords.filter((n) => !w.some((x) => x.word.toLowerCase() === n.word.toLowerCase()))])
    const learnerTurns = updated.filter((l) => l.speaker === 'learner').length
    if (turn.done || learnerTurns >= MAX_LEARNER_TURNS) finish()
    scroll()
  }

  const send = () => {
    const text = input.trim()
    if (!text || busy || finished) return
    setInput('')
    if (engine === 'ai') void sendAi(text)
    else sendScript(text)
  }

  /* ------------------------------ tuzatish darsi ------------------------------ */
  if (fixLesson && d) {
    return (
      <Card className="p-4 sm:p-6">
        <LessonPlayer steps={fixLesson} onClose={() => setFixLesson(null)} />
      </Card>
    )
  }

  /* ------------------------------ tanlash ------------------------------ */
  if (!d) {
    return (
      <div className="grid content-start gap-4">
        <Card className="grid gap-3">
          <h1 className="text-xl sm:text-2xl font-extrabold">Suhbatdosh</h1>
          <p className="text-sm muted">
            Vaziyatni tanlang va hamsuhbat bilan ingliz tilida gaplashing — yozib yoki gapirib. Javoblaringizdagi xatolar suhbat
            oxirida mashqqa aylanadi.
          </p>
          {aiOn ? (
            <InfoBanner>AI ulangan: hamsuhbat erkin javob beradi va xatolaringizni tuzatadi (kunlik AI limiti hisoblanadi).</InfoBanner>
          ) : (
            <InfoBanner tone="muted">
              AI ulanmagan{!netOnline ? ' (internet yo‘q)' : data.settings.aiEnabled ? '' : ' (sozlamada o‘chirilgan)'} — suhbat oldindan
              yozilgan stsenariy bo‘yicha boradi: har javobingiz namuna bilan solishtiriladi.
            </InfoBanner>
          )}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Daraja">
            {LEVELS.map((l) => (
              <Button key={l} size="sm" variant={l === level ? 'primary' : 'secondary'} aria-pressed={l === level} onClick={() => setLevel(l)}>
                {l}
              </Button>
            ))}
          </div>
        </Card>
        <div className="grid sm:grid-cols-2 gap-3">
          {dialoguesFor(level).map((dlg) => (
            <Card key={dlg.id} as="article" className="grid gap-2 content-between">
              <div className="grid gap-1">
                <h2 className="font-bold">{dlg.titleUz}</h2>
                <p className="text-sm muted">{dlg.situationUz}</p>
                <p className="text-xs muted">
                  Hamsuhbat: <b>{dlg.roles.a}</b> · Siz: <b>{dlg.roles.b}</b>
                </p>
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => start(dlg, aiOn ? 'ai' : 'script')}>
                  Gaplashish
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  /* ------------------------------ suhbat ------------------------------ */
  const turn = engine === 'script' ? script?.turns[pos] : undefined
  const corrections = lines.flatMap((l) => l.corrections ?? [])
  const fixIds = corrections.map((c) => roleplayFixId(c, d.level)).filter((x): x is string => x !== null)
  const known = matchVocab(words, vocabPool)

  return (
    <div className="grid content-start gap-4">
      <Card className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-extrabold">{d.titleUz}</h1>
          <Chip tone={engine === 'ai' ? 'brand' : 'default'}>{engine === 'ai' ? 'AI hamsuhbat' : 'Oldindan yozilgan stsenariy'}</Chip>
          <span className="flex-1" />
          <Button size="sm" variant="ghost" onClick={() => setD(null)}>
            ← Vaziyatlar
          </Button>
        </div>
        <p className="text-sm muted">{d.situationUz}</p>
      </Card>

      <Card className="grid gap-2.5" aria-live="polite">
        <ol className="grid gap-2">
          {lines.map((l, i) => (
            <li key={i} className={`flex ${l.speaker === 'learner' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[88%] rounded-2xl border-2 px-3 py-2 grid gap-1.5 ${
                  l.speaker === 'learner' ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800' : 'bg-[var(--panel-2)]'
                }`}
              >
                <span className="text-[11px] font-extrabold uppercase tracking-wider muted">{l.speaker === 'learner' ? d.roles.b : d.roles.a}</span>
                <span className="flex items-start gap-2">
                  <span className="text-sm leading-relaxed">{l.text}</span>
                  {l.speaker === 'partner' && <SpeakButton text={l.text} label="Tinglash" />}
                </span>
                {l.corrections && l.corrections.length > 0 && (
                  <ul className="grid gap-1 text-xs">
                    {l.corrections.map((c, k) => (
                      <li key={k} className="rounded-lg bg-[var(--panel)] border px-2 py-1">
                        <span className="line-through">{c.original}</span> → <b>{c.corrected}</b>
                        <span className="block muted">{c.whyUz}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {l.corrections && l.corrections.length === 0 && <span className="text-xs muted">Xato topilmadi.</span>}
                {l.compare && (
                  <div className="text-xs grid gap-0.5 rounded-lg bg-[var(--panel)] border px-2 py-1">
                    <span>
                      Namuna: <b>{l.compare.modelEn}</b>
                    </span>
                    <span className="muted">
                      Namunadagi so‘zlardan {l.compare.matched.length}/{l.compare.matched.length + l.compare.missing.length} tasi bor
                      {l.compare.missing.length > 0 ? ` · yo‘q: ${l.compare.missing.join(', ')}` : ''}. Bir ma’noni boshqa so‘z bilan ham aytish mumkin — bu baho emas.
                    </span>
                  </div>
                )}
              </div>
            </li>
          ))}
          {busy && <li className="text-sm muted">{d.roles.a} yozmoqda…</li>}
        </ol>
        <div ref={endRef} />

        {!finished && (
          <div className="grid gap-2">
            {turn && (
              <p className="text-xs muted">
                Aytmoqchi bo‘lgan fikringiz:{' '}
                <b>
                  <UzTranslation>{turn.modelUz}</UzTranslation>
                </b>
              </p>
            )}
            {engine === 'ai' && lines.length === 0 && <p className="text-xs muted">Suhbatni siz boshlang — {d.roles.b} sifatida birinchi gapni yozing.</p>}
            <label className="sr-only" htmlFor="conv-input">
              Javobingiz
            </label>
            <textarea
              id="conv-input"
              className={`${inputCls} min-h-16`}
              value={input}
              maxLength={400}
              placeholder="Inglizcha javobingiz…"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={send} disabled={!input.trim() || busy} busy={busy}>
                Yuborish
              </Button>
              <Button
                variant="secondary"
                disabled={!speech.supported || busy}
                onClick={speech.listening ? speech.stop : speech.start}
                aria-pressed={speech.listening}
              >
                {speech.listening ? '■ To‘xtatish' : '🎤 Gapirish'}
              </Button>
              <span className="flex-1" />
              <Button variant="ghost" onClick={finish} disabled={lines.every((l) => l.speaker !== 'learner')}>
                Suhbatni yakunlash
              </Button>
            </div>
            {!speech.supported && <p className="text-xs muted">{SPEECH_UNSUPPORTED_UZ}</p>}
            {speech.error && <InfoBanner tone="warn">{speech.error}</InfoBanner>}
            {error && (
              <InfoBanner tone="warn">
                <div className="grid gap-2">
                  <span className="text-sm">{error}</span>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={send} disabled={!input.trim()}>
                      Qayta yuborish
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => start(d, 'script')}>
                      Oldindan yozilgan stsenariy bilan boshidan
                    </Button>
                  </div>
                </div>
              </InfoBanner>
            )}
          </div>
        )}
      </Card>

      {finished && (
        <Card className="grid gap-3">
          <h2 className="font-bold">Suhbat yakunlandi</h2>
          {engine === 'ai' ? (
            <>
              <p className="text-sm">
                {corrections.length === 0 ? 'AI javoblaringizda xato topmadi.' : `AI ${corrections.length} ta tuzatish berdi.`}
                {corrections.length > fixIds.length && ` ${corrections.length - fixIds.length} tasi juda uzun yoki qisqa — mashqqa aylantirilmadi.`}
              </p>
              {fixIds.length > 0 && (
                <div>
                  <Button
                    onClick={() =>
                      setFixLesson(
                        fixIds
                          .map((id) => roleplayFixExercise(id))
                          .filter((e): e is NonNullable<typeof e> => e !== undefined)
                          .map((e, i): LessonStep => ({ type: 'exercise', id: `${e.id}#${i}`, exercise: e, badge: 'Suhbatdagi xato', badgeTone: 'fix' })),
                      )
                    }
                  >
                    Xatolar ustida ishlash ({fixIds.length} ta mashq)
                  </Button>
                  <p className="text-xs muted mt-1">Noto‘g‘ri yechilgani Xatolar daftari va Takrorlash menejeriga tushadi.</p>
                </div>
              )}
              {words.length > 0 && (
                <div className="grid gap-1.5">
                  <p className="text-sm font-semibold">Suhbatdagi foydali so‘zlar</p>
                  <div className="flex flex-wrap gap-1.5">
                    {words.map((w) => (
                      <Chip key={w.word} tone={known.some((k) => k.word.toLowerCase() === w.word.toLowerCase()) ? 'ok' : 'default'}>
                        {w.word} — {w.translationUz}
                      </Chip>
                    ))}
                  </div>
                  {known.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={savedWords}
                        onClick={() => {
                          for (const v of known) actions.saveVocab(v.id)
                          setSavedWords(true)
                        }}
                      >
                        {savedWords ? 'Lug‘atga saqlandi' : `Lug‘atimga saqlash (${known.length} ta)`}
                      </Button>
                      <span className="text-xs muted">Faqat lug‘atimizda bor so‘zlar saqlanadi (yashil).</span>
                    </div>
                  ) : (
                    <p className="text-xs muted">Bu so‘zlar lug‘atimizda yo‘q — takrorlash jadvaliga qo‘shilmaydi.</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm">
              Stsenariy yakunlandi. Har javobingiz namuna bilan solishtirildi. Xatolar tahlili uchun AI kerak — u ulangan bo‘lsa, suhbat
              erkin bo‘ladi va xatolar mashqqa aylanadi.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => start(d, aiOn ? 'ai' : 'script')}>
              Qaytadan
            </Button>
            <Link to="/dialogues" className="inline-flex items-center px-4 py-2.5 text-sm font-semibold rounded-xl border">
              Suhbat darslari
            </Link>
          </div>
        </Card>
      )}
    </div>
  )
}
