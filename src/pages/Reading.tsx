/**
 * O'QISH bo'limi.
 *
 * Qilinadi:
 *  - Matnlar ro'yxati (sarlavha, daraja, taxminiy daqiqa, provenance)
 *  - Matn sahifasi: katta qator oralig'i bilan o'qish, glossariy, haqiqiy
 *    taymer (store ichida saqlanadi — navigatsiyada reset bo'lmaydi)
 *  - "Vaqt bilan mashq" rejimi — estMinutes dan countdown, 0 da to'xtaydi va
 *    natijani ko'rsatadi
 *  - Mashqlar ExerciseRunner orqali (barcha turlar, True/False/Not Given ham)
 *  - So'zlarni lug'atga saqlash: glossariy + matndan ajratib olingan so'z
 *  - Natija: ball, to'g'ri/xato ro'yxati izoh bilan, Xatolar daftariga havola
 *
 * Provenance: 'original' matnlar rasmiy imtihon savoli deb atalmaydi.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ExerciseRunner from '../components/ExerciseRunner'
import { Button, Card, Chip, EmptyState, InfoBanner, Kbd, LoadingBlock, SpeakButton, StatTile, SuccessBanner } from '../components/ui'
import { allVocab, getBundle } from '../content'
import type { ReadingPassage, VocabularyItem } from '../content/types'
import { formatDuration } from '../lib/timer'
import type { CheckResult } from '../lib/check'
import { useStore } from '../lib/store'

const wordKey = (s: string): string =>
  s
    .toLocaleLowerCase('en')
    .replace(/[‘’`´ʻ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/** Glossariy so'zi uchun barqaror SRS id'si (lug'atda bo'lmasa shu ishlatiladi). */
function glossaryId(passageId: string, word: string): string {
  return `${passageId}|gl-${wordKey(word)}`
}

interface Saver {
  /** SRS kaliti */
  id: string
  word: string
  uz: string
  /** lug'atda topilgan item bo'lsa uning id'si */
  fromVocab: boolean
}

/* ------------------------------- sahifa ------------------------------- */

export default function Reading() {
  const { data, ready, timerLabel } = useStore()
  const [openId, setOpenId] = useState<string | null>(null)

  const passages = getBundle(data.settings.currentLevel).reading

  if (!ready) return <LoadingBlock label={'O\'qish matnlari yuklanmoqda…'} />

  const opened = openId ? passages.find((p) => p.id === openId) ?? null : null

  if (!opened) {
    return (
      <div className="grid gap-4">
        <header>
          <h1 className="text-xl sm:text-2xl font-bold">O'qish</h1>
          <p className="muted text-sm">
            {data.settings.currentLevel} darajasi · {passages.length} ta matn · o'qish vaqti taymer bilan
            o'lchanadi, mashqlar matn asosida.
          </p>
        </header>

        {passages.length === 0 ? (
          <EmptyState
            title={`${data.settings.currentLevel} darajasi matnlari hali yuklanmagan`}
            body="Hozircha faqat A1 kontenti yuklangan. A1 darajasida ishlab, keyinroq qaytaning."
          />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {passages.map((p) => {
              const ids = new Set(p.exercises.map((e) => e.id))
              const mine = data.attempts.filter((a) => ids.has(a.exerciseId))
              const done = new Set(mine.map((a) => a.exerciseId)).size
              const readTime = data.timer.sessionId === p.id ? timerLabel : null
              return (
                <Card as="section" key={p.id} className="grid gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-bold leading-snug">{p.title}</h2>
                    <Chip>{p.level}</Chip>
                  </div>
                  <p className="text-sm muted">
                    {p.paragraphs.length} paragraf · {p.exercises.length} mashq · {p.glossary?.length ?? 0} ta
                    glossariy so'zi
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Chip>{p.estMinutes} daqiqa</Chip>
                    {p.provenance === 'original' ? (
                      <Chip tone="warn">Original mashq matni</Chip>
                    ) : (
                      <Chip tone="brand">Moslashtirilgan matn</Chip>
                    )}
                    {done > 0 && <Chip tone="ok">mashqlar: {done}/{p.exercises.length}</Chip>}
                    {readTime && <Chip tone="brand">taymer: {readTime}</Chip>}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setOpenId(p.id)}>{done > 0 ? 'Davom etish' : 'Matnni ochish'}</Button>
                    {data.timer.sessionId === p.id && (
                      <Button variant="secondary" size="sm" onClick={() => setOpenId(p.id)}>
                        Taymer bu matnda yurmoqda
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return <PassageDetail passage={opened} onBack={() => setOpenId(null)} />
}

/* ---------------------------- matn sahifasi ---------------------------- */

function PassageDetail({ passage, onBack }: { passage: ReadingPassage; onBack: () => void }) {
  const { data, timerLabel, actions } = useStore()

  const textRef = useRef<HTMLDivElement>(null)
  const exercisesRef = useRef<HTMLDivElement>(null)

  // --- mashqlar holati ---
  const total = passage.exercises.length
  const [pos, setPos] = useState(0)
  const [results, setResults] = useState<Record<number, CheckResult>>({})
  const [showResults, setShowResults] = useState(false)

  // --- vaqt bilan mashq ---
  const [timedMode, setTimedMode] = useState(false)
  const [deadline, setDeadline] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const autoStopped = useRef(false)

  // --- lug'atga saqlash ---
  const [selection, setSelection] = useState<string>('')
  const [savedIds, setSavedIds] = useState<string[]>([])

  const vocabIndex = useMemo(() => {
    const m = new Map<string, VocabularyItem>()
    for (const v of allVocab()) m.set(wordKey(v.word), v)
    return m
  }, [])

  const glossaryIds = useMemo(() => (passage.glossary ?? []).map((g) => glossaryId(passage.id, g.word)), [passage])

  // Taymer holati (store ichida — sahifani almashtirsak ham yo'qolmaydi).
  const timerHere = data.timer.sessionId === passage.id
  const timerRunning = timerHere && data.timer.startedAt !== null

  // Countdown ticklari
  useEffect(() => {
    if (deadline === null) return
    const iv = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(iv)
  }, [deadline])

  const remainingSec = deadline === null ? passage.estMinutes * 60 : Math.max(0, Math.round((deadline - now) / 1000))
  const timeUp = deadline !== null && remainingSec <= 0

  // Muddat tugasa: mashq to'xtaydi, natija ko'rsatiladi (javobsiz savollar
  // noto'g'ri deb baholanmaydi — shunchaki hisobga olinmaydi).
  useEffect(() => {
    if (!timeUp || autoStopped.current) return
    autoStopped.current = true
    setShowResults(true)
    if (timerHere) actions.stopTimer()
  }, [timeUp, timerHere, actions])

  const startTimed = () => {
    autoStopped.current = false
    setNow(Date.now())
    setDeadline(Date.now() + passage.estMinutes * 60_000)
    actions.startTimer(passage.id, 'reading')
    exercisesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const stopTimed = () => {
    setDeadline(null)
    autoStopped.current = false
    actions.stopTimer()
  }

  const record = useCallback(
    (index: number, r: CheckResult, secondsSpent: number) => {
      const ex = passage.exercises[index]
      if (!ex) return
      setResults((prev) => ({ ...prev, [index]: r }))
      actions.recordAttempt({
        exercise: ex,
        correct: r.correct,
        partial: r.partial,
        given: r.given,
        secondsSpent,
        source: 'practice',
      })
    },
    [passage.exercises, actions],
  )

  const onNext = () => {
    const answered = Object.keys(results).length
    if (answered >= total) {
      setShowResults(true)
      if (timerHere) actions.stopTimer()
      return
    }
    setPos((p2) => {
      let n = p2 + 1
      while (n < total && results[n] !== undefined) n += 1
      return n < total ? n : p2
    })
  }

  const takeSelection = () => {
    const sel = window.getSelection()?.toString() ?? ''
    setSelection(sel)
  }

  // Matn ichidan ajratib olingan so'z/dastur: glossariy va lug'at bo'yicha tekshiriladi.
  const picked: Saver | null = useMemo(() => {
    const key = wordKey(selection)
    if (!key || key.split(' ').length > 3) return null
    const gl = (passage.glossary ?? []).find((g) => wordKey(g.word) === key)
    if (gl) {
      const item = vocabIndex.get(key)
      return { id: item?.id ?? glossaryId(passage.id, gl.word), word: gl.word, uz: gl.uz, fromVocab: item !== undefined }
    }
    const item = vocabIndex.get(key)
    if (item) return { id: item.id, word: item.word, uz: item.translationUz, fromVocab: true }
    return null
  }, [selection, passage.glossary, passage.id, vocabIndex])

  const saveWord = (s: Saver, grade: 'again' | 'good') => {
    actions.gradeVocab(s.id, grade)
    setSavedIds((prev) => (prev.includes(s.id) ? prev : [...prev, s.id]))
  }

  const answeredList = Object.entries(results).map(([k, r]) => ({ index: Number(k), result: r }))
  const wrong = answeredList.filter((a) => !a.result.correct)
  const right = answeredList.filter((a) => a.result.correct)
  const score = total === 0 ? 0 : Math.round((right.length / total) * 100)

  const current = passage.exercises[pos]

  return (
    <div className="grid gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-1.5">
            ← Matnlar ro'yxati
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">{passage.title}</h1>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Chip>{passage.level}</Chip>
            <Chip>{passage.estMinutes} daqiqa</Chip>
            <Chip>{total} mashq</Chip>
            {passage.provenance === 'original' ? (
              <Chip tone="warn">Original mashq matni</Chip>
            ) : (
              <Chip tone="brand">Moslashtirilgan matn</Chip>
            )}
          </div>
        </div>
        <div className="panel p-3 grid gap-1.5 min-w-44">
          <span className="text-[11px] font-semibold uppercase tracking-wider muted">O'qish taymeri</span>
          <span className="text-2xl font-bold tabular-nums">{timerHere ? timerLabel : '—:—'}</span>
          <span className="text-[11px] muted">
            {timerRunning
              ? "Yurmoqda — sahifani almashtirsangiz ham to'xtamaydi."
              : timerHere
                ? 'To\'xtatilgan / pauzada.'
                : 'Bu matn uchun boshlanmagan.'}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {!timerRunning ? (
              <Button size="sm" onClick={() => actions.startTimer(passage.id, 'reading')}>
                Taymer
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => actions.pauseTimer()}>
                Pauza
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => actions.stopTimer()} disabled={!timerHere}>
              To'xtatish
            </Button>
          </div>
        </div>
      </header>

      {passage.provenance === 'original' && (
        <InfoBanner tone="muted">
          Bu matn loyihada original yozilgan — rasmiy imtihon (IELTS/CEFR) savoli emas. Savollar shu matn asosida
          tuzilgan, shuning uchun javoblarni matndan topish mumkin.
        </InfoBanner>
      )}

      {!timerHere && data.timer.sessionId !== null && data.timer.sessionId !== passage.id && (
        <InfoBanner tone="warn">
          Taymer hozir boshqa mashg'ulotda yurmoqda (<code>{data.timer.sessionId}</code>). Bu matn uchun boshlasangiz
          oldingi hisob shu mashg'ulotga yoziladi.
        </InfoBanner>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatTile label="Bajarilgan" value={`${answeredList.length}/${total}`} hint="shu sessiyada" />
        <StatTile label="To'g'ri" value={right.length} tone="ok" />
        <StatTile label="Xato" value={wrong.length} tone={wrong.length > 0 ? 'bad' : 'ok'} />
        <StatTile
          label={timedMode ? 'Qolgan vaqt' : 'Bu matnda o\'qilgan'}
          value={timedMode ? formatDuration(remainingSec) : timerHere ? timerLabel : '—:—'}
          tone={timedMode && deadline !== null && remainingSec < 60 ? 'bad' : 'default'}
          hint={timedMode ? `${passage.estMinutes} daqiqalik muddatdan` : 'taymer yuritilsa ko‘rinadi'}
        />
      </div>

      {/* ------------------------------- MATN ------------------------------- */}
      <article ref={textRef} className="panel p-4 sm:p-6 grid gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold">Matn</h2>
          <span className="text-[11px] muted">So‘zni ajratib oling — pastdagi panelga qo‘shiladi</span>
        </div>
        <div className="grid gap-4 text-[15px] sm:text-base leading-9 sm:leading-10 selection:bg-navy-200 dark:selection:bg-navy-800">
          {passage.paragraphs.map((par, i) => (
            <p key={i}>{par}</p>
          ))}
        </div>
        <div onMouseUp={takeSelection} onKeyDown={takeSelection} className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={takeSelection} title="Matndan ajratib olingan so'zni tekshirish">
              Ajratib olingan so'zni aniqlash
            </Button>
            <span className="text-[11px] muted">
              Matnda so'zni sichqoncha bilan belgilang (<Kbd>Ctrl</Kbd>+<Kbd>C</Kbd> shart emas) va tugmani bosing.
            </span>
          </div>
          {selection.trim() !== '' && (
            <InfoBanner tone={picked ? 'info' : 'warn'}>
              Tanlangan matn: <b className="select-text">{selection.trim().slice(0, 60)}</b>
              {picked ? null : (
                <span className="block mt-1">
                  Bu so'z glossariyda va lug'at ro'yxatida yo'q — lug'atga saqlab bo'lmaydi. Glossariydagi so'zlardan
                  yoki matndagi boshqa so'zlardan foydalaning.
                </span>
              )}
            </InfoBanner>
          )}
          {picked && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3 grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">
                  {picked.word} — <span className="text-[var(--accent)] dark:text-navy-300">{picked.uz}</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <Chip tone={picked.fromVocab ? 'ok' : 'warn'}>
                    {picked.fromVocab ? 'lug\'at ro\'yxatida bor' : 'faqat matn glossariyasida'}
                  </Chip>
                  <SpeakButton text={picked.word} label={`${picked.word} — talaffuz`} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => saveWord(picked, 'again')}>
                  Lug'atga saqlash (takrorlashga)
                </Button>
                <Button size="sm" variant="success" onClick={() => saveWord(picked, 'good')}>
                  Bilaman
                </Button>
              </div>
              <p className="text-[11px] muted">
                "Qayta mashq qilish" ma'nosida <code>again</code> baholanadi — so'z SRS jadvaliga kiritiladi.
              </p>
            </div>
          )}
        </div>
      </article>

      {/* --------------------------- GLOSSARIY --------------------------- */}
      <Card as="section" className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">
            So'zlarni lug'atga saqlash{' '}
            <span className="text-xs font-normal muted">({glossaryIds.length} ta glossariy so'zi)</span>
          </h2>
          <span className="text-[11px] muted">Saqlangan: {savedIds.length}</span>
        </div>
        {(passage.glossary?.length ?? 0) === 0 ? (
          <InfoBanner tone="muted">Bu matnda glossariy berilmagan — matndan ajratib olingan so'zlardan foydalaning.</InfoBanner>
        ) : (
          <div className="flex flex-wrap gap-2">
            {passage.glossary?.map((g) => {
              const id = vocabIndex.get(wordKey(g.word))?.id ?? glossaryId(passage.id, g.word)
              const known = data.srs[id] !== undefined || savedIds.includes(id)
              return (
                <div key={g.word} className="rounded-xl border bg-[var(--panel-2)] px-3 py-2 grid gap-1.5">
                  <span className="text-sm">
                    <b>{g.word}</b> — {g.uz}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <SpeakButton text={g.word} label={`${g.word} — talaffuz`} />
                    <Button size="sm" variant={known ? 'ghost' : 'secondary'} onClick={() => actions.gradeVocab(id, 'again')}>
                      {known ? 'Qayta mashq qilish' : "Lug'atga"}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* ---------------------------- MASHQLAR ---------------------------- */}
      <section ref={exercisesRef} className="grid gap-3 scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">Matn ustidagi mashqlar</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={timedMode ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => {
                if (timedMode) {
                  setTimedMode(false)
                  stopTimed()
                } else {
                  setTimedMode(true)
                  startTimed()
                }
              }}
              aria-pressed={timedMode}
              title={`${passage.estMinutes} daqiqa ichida bajarish`}
            >
              {timedMode ? 'Vaqt bilan mashq: davom etmoqda' : 'Vaqt bilan mashq'}
            </Button>
            {timedMode && deadline !== null && (
              <Button variant="ghost" size="sm" onClick={stopTimed}>
                Taymerni to'xtatish
              </Button>
            )}
          </div>
        </div>

        {timedMode && deadline !== null && (
          <div className="panel p-3 flex items-center justify-between gap-3">
            <span className="text-sm">
              Muddat tugaguncha: <b className="tabular-nums text-lg">{formatDuration(remainingSec)}</b>
            </span>
            <span className="w-40 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
              <span
                className="block h-full bg-navy-600 dark:bg-navy-400 transition-[width] duration-1000"
                style={{ width: `${(remainingSec / (passage.estMinutes * 60)) * 100}%` }}
              />
            </span>
          </div>
        )}

        {timeUp && (
          <InfoBanner tone="warn">
            Muddat tugadi — mashq shu yerda to'xtatildi. Javob berilmagan savollar noto'g'ri deb hisoblanmadi, pastdagi
            natijada faqat javob berilganlari sanaldi.
          </InfoBanner>
        )}

        {total === 0 ? (
          <EmptyState title="Bu matnda mashq yo'q" body="Matnni o'qib, glossariydagi so'zlarni lug'atingizga saqlang." />
        ) : !showResults && current ? (
          <Card className="grid gap-4">
            <ExerciseRunner
              key={`${passage.id}-${current.id}`}
              exercise={current}
              index={pos}
              total={total}
              checked={(r, secondsSpent) => record(pos, r, secondsSpent)}
              onNext={onNext}
            />
            <InfoBanner tone="muted">
              Bu mashqlar <b>matn asosida</b> — javoblarni yuqoridagi matndan topish mumkin. True / False / Not Given
              savollarida matnda javob bo'lmasa <b>Not Given</b> deb belgilang.
            </InfoBanner>
          </Card>
        ) : (
          <Card className="grid gap-3">
            <h3 className="font-bold text-lg">Natija</h3>
            <SuccessBanner>
              {total} ta mashqdan {right.length} tasi to'g'ri — ball <b>{score}%</b>.
            </SuccessBanner>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <h4 className="font-semibold text-sm text-[var(--ok)]">To'g'ri javoblar ({right.length})</h4>
                {right.length === 0 ? (
                  <p className="text-sm muted">Hozircha to'g'ri javob yo'q.</p>
                ) : (
                  right.map(({ index, result }) => (
                    <div key={`ok-${index}`} className="rounded-xl border border-emerald-400/40 bg-emerald-50 dark:bg-emerald-900/15 p-3 text-sm">
                      <b>{passage.exercises[index]?.instructionUz}</b>
                      <p className="mt-1 muted">Sizning javobingiz: {result.given}</p>
                      <p className="mt-1">{result.whyUz}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="grid gap-2">
                <h4 className="font-semibold text-sm text-[var(--bad)]">Xatolar ({wrong.length})</h4>
                {wrong.length === 0 ? (
                  <p className="text-sm muted">Xato topilmadi — davom eting.</p>
                ) : (
                  wrong.map(({ index, result }) => (
                    <div key={`bad-${index}`} className="rounded-xl border border-rose-400/40 bg-rose-50 dark:bg-rose-900/15 p-3 text-sm">
                      <b>{passage.exercises[index]?.instructionUz}</b>
                      <p className="mt-1">
                        To'g'ri javob: <b>{result.expected}</b> · sizda: {result.given || '—'}
                      </p>
                      <p className="mt-1 muted">{result.whyUz}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  setResults({})
                  setPos(0)
                  setShowResults(false)
                  autoStopped.current = false
                  setNow(Date.now())
                  if (timedMode) setDeadline(Date.now() + passage.estMinutes * 60_000)
                }}
              >
                Mashqlarni qayta bajarish
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowResults(false)}
                disabled={answeredList.length >= total || timeUp}
              >
                Mashqqa qaytish
              </Button>
              <Link to="/errors" className="inline-flex items-center text-sm font-semibold text-[var(--accent)] dark:text-navy-300 underline">
                Xatolar daftarini ochish
              </Link>
            </div>
          </Card>
        )}
      </section>
    </div>
  )
}
