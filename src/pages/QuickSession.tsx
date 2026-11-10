/**
 * «5 daqiqa» — tezkor kunlik sessiya (g'oya: Drops; mexanika va dizayn bizniki).
 *
 * Qilinadi:
 *  - Muddati kelgan so'zlar (SRS) + bitta mavzudan yangi so'zlar
 *    (`src/lib/quickSession.ts::buildQuickDeck`).
 *  - Har kartada so'z rasmi (`vocabEmoji.ts`, faqat ANIQ tasvirlanadigan
 *    so'zlarda — rasm ixtiro qilinmaydi), talaffuz tugmasi.
 *  - Surish: o'ngga — «Bilaman», chapga — «Yana». Klaviatura: → / ←,
 *    Space — kartani ochish. Har harakatning oddiy tugma muqobili bor.
 *  - Vaqt devor-soat taymeri bilan (`timer.ts`) o'lchanadi va kunlik faollikka
 *    yoziladi — sahifa yangilansa ham qolgan vaqt saqlanadi. Sahifadan
 *    chiqilsa taymer PAUZA qilinadi (ko'rilmagan vaqt sanalmaydi).
 */

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { allGlossaryVocab, allVocab, getBundle } from '../content'
import { vocabEmoji } from '../content/vocabEmoji'
import { Button, Card, Chip, EmptyState, InfoBanner, Kbd, LoadingBlock, SpeakButton, SuccessBanner } from '../components/ui'
import { QUICK_SESSION_SEC, buildQuickDeck, quickRemaining, quickSessionId, swipeGrade, type QuickCard } from '../lib/quickSession'
import { useStore } from '../lib/storeContext'
import { formatDuration } from '../lib/timer'
import { todayKey } from '../lib/types'
import { useNow } from '../lib/clock'
import { useImmersion } from '../lib/prefs'

type Phase = 'intro' | 'run' | 'done'

interface LogEntry {
  word: string
  grade: 'good' | 'again'
  isNew: boolean
}

export default function QuickSession() {
  const { data, ready, timerElapsed, streak, actions } = useStore()
  const level = data.settings.currentLevel
  const sid = quickSessionId(todayKey())

  // Takror — Lug'at sahifasidagi havuz bilan bir xil (asosiy + saqlangan glossariy);
  // yangi so'zlar — faqat asosiy lug'atdan (misol gapi bor).
  const { pool, mainPool } = useMemo(() => {
    const bundle = getBundle(level)
    const main = bundle.vocab.length > 0 ? bundle.vocab : allVocab()
    return { mainPool: main, pool: [...main, ...allGlossaryVocab().filter((g) => g.level === level)] }
  }, [level])
  const deckOf = (srs: typeof data.srs, at: number) => buildQuickDeck(pool, srs, at, { newPool: mainPool })

  const mine = ready && data.timer.sessionId === sid
  const running = mine && data.timer.startedAt !== null
  const elapsed = mine ? timerElapsed : 0
  const remaining = quickRemaining(elapsed)

  // Bosqich HOLATDAN hosil qilinadi (effect ichida setState yo'q):
  //  - `queue` — shu sahifada tuzilgan karta navbati (null — hali tuzilmagan);
  //  - `startedHere` — sessiya shu sahifada boshlangan (taymer to'xtagach natija ko'rsatiladi).
  const [queue, setQueue] = useState<QuickCard[] | null>(null)
  const [startedHere, setStartedHere] = useState(false)
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const immersion = useImmersion()
  const [revealUz, setRevealUz] = useState(false)
  const [log, setLog] = useState<LogEntry[]>([])
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef<{ x: number; id: number } | null>(null)
  const moved = useRef(false)

  const phase: Phase | 'resume' = mine ? (queue === null ? 'resume' : 'run') : startedHere ? 'done' : 'intro'

  const now = useNow()
  const preview = useMemo(() => buildQuickDeck(pool, data.srs, now, { newPool: mainPool }), [pool, mainPool, data.srs, now])

  // Sahifadan chiqilsa taymer pauzaga olinadi.
  const pauseRef = useRef<() => void>(() => {})
  useEffect(() => {
    pauseRef.current = running ? actions.pauseTimer : () => {}
  }, [running, actions])
  useEffect(() => () => pauseRef.current(), [])

  const card = queue?.[idx]
  const outOfCards = phase === 'run' && card === undefined
  const outOfTime = phase === 'run' && remaining <= 0

  // Vaqt yoki kartalar tugasa — taymer to'xtatiladi (vaqt kunlik hisobga yoziladi),
  // shundan so'ng bosqich o'zi «natija»ga o'tadi.
  useEffect(() => {
    if (outOfCards || outOfTime) actions.stopTimer()
  }, [outOfCards, outOfTime, actions])

  /** Navbatni tuzish va taymerni yurgizish (yangi sessiya yoki pauzadan davom). */
  const begin = (fresh: boolean) => {
    setQueue(deckOf(data.srs, Date.now()).cards)
    setIdx(0)
    setFlipped(false)
    if (fresh) setLog([])
    setStartedHere(true)
    actions.startTimer(sid, 'vocabulary')
  }

  const start = () => begin(true)

  const grade = (g: 'good' | 'again') => {
    if (!card || !running || !queue) return
    actions.gradeVocab(card.item.id, g)
    setLog((prev) => [...prev, { word: card.item.word, grade: g, isNew: card.isNew }])
    // «Yana» — karta navbat oxiriga qaytadi (sessiya ichida mustahkamlanadi).
    if (g === 'again') setQueue((q) => [...(q ?? []), { item: card.item, isNew: false }])
    setFlipped(false)
    setRevealUz(false)
    setDrag(0)
    setIdx((n) => n + 1)
  }
  const gradeRef = useRef(grade)
  useEffect(() => {
    gradeRef.current = grade
  })

  // Klaviatura: → Bilaman, ← Yana, Space — ochish.
  useEffect(() => {
    if (phase !== 'run') return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = document.activeElement
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        gradeRef.current('good')
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        gradeRef.current('again')
      } else if (e.code === 'Space' && !(el && el.tagName === 'BUTTON')) {
        e.preventDefault()
        setFlipped((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase])

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    dragStart.current = { x: e.clientX, id: e.pointerId }
    moved.current = false
    setDragging(true)
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const s = dragStart.current
    if (!s || s.id !== e.pointerId) return
    const dx = e.clientX - s.x
    if (Math.abs(dx) > 8) moved.current = true
    setDrag(dx)
  }
  const onPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const s = dragStart.current
    dragStart.current = null
    setDragging(false)
    if (!s || s.id !== e.pointerId) return
    const g = swipeGrade(e.clientX - s.x, e.currentTarget.getBoundingClientRect().width)
    if (g) grade(g)
    else setDrag(0)
  }

  if (!ready) return <LoadingBlock label="Sessiya tayyorlanmoqda…" />

  /* ------------------------ davom etish (qayta ochilgan) ------------------------ */
  if (phase === 'resume') {
    return (
      <div className="grid content-start gap-4 max-w-2xl mx-auto w-full">
        <Card as="section" className="grid gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight">⚡ Bugungi 5 daqiqa davom etmoqda</h1>
          <p className="text-sm">
            Qolgan vaqt: <b className="tabular-nums">{formatDuration(remaining)}</b>. Takror navbati hozirgi holatdan qayta tuziladi.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="lg" onClick={() => begin(false)} disabled={remaining <= 0}>
              Davom etish
            </Button>
            <Button variant="secondary" onClick={() => actions.stopTimer()}>
              Sessiyani yakunlash
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  /* ------------------------------ kirish ------------------------------ */
  if (phase === 'intro') {
    const empty = preview.cards.length === 0
    return (
      <div className="grid content-start gap-4 max-w-2xl mx-auto w-full">
        <Card as="section" className="grid gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight">⚡ 5 daqiqa — tezkor takror</h1>
          <p className="text-sm leading-relaxed">
            Qisqa, har kungi odat: avval takrorlash navbatidagi so‘zlar, keyin bitta mavzudan yangi so‘zlar.
            Kartani o‘ngga suring — <b>«Bilaman»</b>, chapga — <b>«Yana»</b>.
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Chip tone={preview.dueCount > 0 ? 'warn' : 'default'}>{preview.dueCount} ta takror</Chip>
            <Chip tone="brand">{preview.newCount} ta yangi so‘z</Chip>
            {preview.newTopic && <Chip>Mavzu: {preview.newTopic}</Chip>}
            <Chip>Daraja: {level}</Chip>
          </div>
          <InfoBanner tone="muted">
            Bu kunlik {data.settings.dailyMinutes} daqiqalik rejaning o‘rnini bosmaydi — band kunlar uchun «minimal kun».
            Sarflangan vaqt bugungi faollikka yoziladi va ketma-ket kun zanjirini saqlaydi.
          </InfoBanner>
          {empty ? (
            <EmptyState
              title="Hozir kartalar yo‘q"
              body="Takrorlash navbati bo‘sh va bu darajaning barcha so‘zlari allaqachon lug‘atingizda. Lug‘at bo‘limida boshqa mashqlarni sinab ko‘ring."
              action={
                <Link to="/vocabulary" className="font-semibold underline">
                  Lug‘at bo‘limiga o‘tish
                </Link>
              }
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button size="lg" onClick={start}>
                Boshlash ({formatDuration(QUICK_SESSION_SEC)})
              </Button>
              <Link to="/dashboard" className="inline-flex items-center px-4 py-2.5 text-sm font-semibold rounded-xl border">
                Bosh sahifa
              </Link>
            </div>
          )}
        </Card>
      </div>
    )
  }

  /* ------------------------------ natija ------------------------------ */
  if (phase === 'done') {
    const known = log.filter((l) => l.grade === 'good').length
    const again = log.length - known
    const fresh = log.filter((l) => l.isNew && l.grade === 'good').length
    return (
      <div className="grid content-start gap-4 max-w-2xl mx-auto w-full">
        <Card as="section" className="grid gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight">Sessiya yakunlandi</h1>
          {log.length === 0 ? (
            <InfoBanner tone="muted">Bu safar birorta karta baholanmadi.</InfoBanner>
          ) : (
            <SuccessBanner>
              {`${log.length} ta karta: ${known} tasini bildingiz, ${again} tasi qayta takrorlanadi. Yangi o‘rganilgan: ${fresh} ta so‘z.`}
            </SuccessBanner>
          )}
          <p className="text-sm">
            Ketma-ket kun: <b>{streak}</b>
          </p>
          {log.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {log.map((l, i) => (
                <Chip key={`${l.word}-${i}`} tone={l.grade === 'good' ? 'ok' : 'bad'}>
                  {l.word}
                </Chip>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={start} disabled={preview.cards.length === 0}>
              Yana 5 daqiqa
            </Button>
            <Link to="/dashboard" className="inline-flex items-center px-4 py-2.5 text-sm font-semibold rounded-xl border">
              Bosh sahifa
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  /* ------------------------------ ish holati ------------------------------ */
  const pct = Math.round(((QUICK_SESSION_SEC - remaining) / QUICK_SESSION_SEC) * 100)
  const emoji = card ? vocabEmoji(card.item.word) : null
  const hint = drag > 30 ? 'Bilaman' : drag < -30 ? 'Yana' : null

  return (
    <div className="grid content-start gap-4 max-w-2xl mx-auto w-full">
      <Card className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-2xl font-bold tabular-nums" aria-label={`Qolgan vaqt ${formatDuration(remaining)}`}>
            ⏱ {formatDuration(remaining)}
          </span>
          <span className="text-xs font-semibold muted tabular-nums">
            {Math.min(idx + 1, queue?.length ?? 0)} / {queue?.length ?? 0}
          </span>
        </div>
        <div
          className="h-2 rounded-full bg-[var(--panel-2)] overflow-hidden"
          role="progressbar"
          aria-label="Sessiya vaqti"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div className="h-full bg-emerald-700 transition-[width] duration-1000" style={{ width: `${pct}%` }} />
        </div>
      </Card>

      {!running && (
        <InfoBanner tone="warn">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">Sessiya pauzada — qolgan vaqt saqlangan.</span>
            <span className="flex-1" />
            <Button size="sm" onClick={() => actions.startTimer(sid, 'vocabulary')}>
              Davom etish
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => actions.stopTimer()}
            >
              Yakunlash
            </Button>
          </div>
        </InfoBanner>
      )}

      {card && (
        <Card className="grid gap-4">
          <div className="flex flex-wrap gap-1.5">
            <Chip tone={card.isNew ? 'brand' : 'warn'}>{card.isNew ? 'Yangi so‘z' : 'Takror'}</Chip>
            <Chip>{card.item.topic}</Chip>
          </div>

          <button
            type="button"
            disabled={!running}
            onClick={() => {
              if (moved.current) {
                moved.current = false
                return
              }
              setFlipped((v) => !v)
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              dragStart.current = null
              setDragging(false)
              setDrag(0)
            }}
            aria-label={flipped ? `${card.item.word} — tarjimani yopish` : `${card.item.word} — tarjimani ko‘rish`}
            className="touch-pan-y select-none min-h-56 rounded-2xl border bg-[var(--panel-2)] p-5 grid place-items-center text-center disabled:opacity-60"
            style={{
              transform: `translateX(${drag}px) rotate(${drag / 30}deg)`,
              transition: dragging ? 'none' : 'transform 150ms ease-out',
            }}
          >
            <span className="grid gap-2 pointer-events-none">
              {emoji && (
                <span className="text-6xl leading-none" aria-hidden="true">
                  {emoji}
                </span>
              )}
              <span className="text-3xl font-bold">{card.item.word}</span>
              {card.item.ipa && <span className="muted font-mono text-sm">{card.item.ipa}</span>}
              {flipped ? (
                <>
                  {immersion && !revealUz ? (
                    <span className="text-sm">{card.item.explanationEn}</span>
                  ) : (
                    <span className="text-lg font-semibold text-[var(--accent)] dark:text-navy-300">{card.item.translationUz}</span>
                  )}
                  {card.item.exampleEn.trim() !== '' && <span className="muted text-sm italic">"{card.item.exampleEn}"</span>}
                </>
              ) : (
                <span className="muted text-sm">Ma’nosi uchun bosing</span>
              )}
              {hint && <span className="text-sm font-bold">{hint === 'Bilaman' ? 'Bilaman →' : '← Yana'}</span>}
            </span>
          </button>

          {immersion && flipped && !revealUz && (
            <div>
              <Button size="sm" variant="ghost" onClick={() => setRevealUz(true)}>
                Tarjimani ko‘rsatish
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <SpeakButton text={card.item.pronunciation?.ttsText ?? card.item.word} label={`${card.item.word} — talaffuz`} size="md" />
            <span className="text-[11px] muted">
              <Kbd>←</Kbd> Yana · <Kbd>→</Kbd> Bilaman · <Kbd>Space</Kbd> ochish
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="danger" size="lg" disabled={!running} onClick={() => grade('again')}>
              ← Yana
            </Button>
            <Button variant="success" size="lg" disabled={!running} onClick={() => grade('good')}>
              Bilaman →
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
