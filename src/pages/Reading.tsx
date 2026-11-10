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
import { allVocab, getBundle, glossaryVocabId, wordKeyOf } from '../content'
import type { ReadingPassage, VocabularyItem } from '../content/types'
import { formatDuration } from '../lib/timer'
import type { CheckResult } from '../lib/check'
import { useStore } from '../lib/storeContext'
import { LessonStartCard, ReadingLesson } from '../components/SectionLessons'
import { readingLesson } from '../lib/lessons'

/**
 * Kalit va SRS idsi LUG'AT sahifasi bilan BIR XIL manbadan (content/index) —
 * eski xato: sahifalar bitta kalitni ikki marta yozib olgani uchun birida
 * o'zgartirilsa, saqlangan so'z Lug'at bo'limida topilmay qolardi.
 */
const wordKey = wordKeyOf
const glossaryId = glossaryVocabId

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
  const [lessonId, setLessonId] = useState<string | null>(null)

  const passages = getBundle(data.settings.currentLevel).reading

  if (!ready) return <LoadingBlock label={'O\'qiş matnlari yuklanmoqda…'} />

  const opened = openId ? passages.find((p) => p.id === openId) ?? null : null
  const lessonPassage = lessonId ? passages.find((p) => p.id === lessonId) ?? null : null
  if (lessonPassage) return <ReadingLesson passage={lessonPassage} onClose={() => setLessonId(null)} />
  // Tavsiya: mashqlari hali tugallanmagan birinchi matn.
  const nextPassage =
    passages.find((p) => {
      const ids = new Set(p.exercises.map((e) => e.id))
      return new Set(data.attempts.filter((a) => ids.has(a.exerciseId)).map((a) => a.exerciseId)).size < p.exercises.length
    }) ?? passages[0]

  if (!opened) {
    return (
      <div className="grid gap-4">
        <header>
          <h1 className="text-xl sm:text-2xl font-bold">Öqiş</h1>
          <p className="muted text-sm">
            {data.settings.currentLevel} darajasi · {passages.length} ta matn · öqiş vaqti taymer bilan
            ölçanadi, maşqlar matn asosida.
          </p>
        </header>

        {nextPassage && (
          <LessonStartCard
            kicker="Öqiş darsi"
            title={nextPassage.title}
            body="Matnni öqing, söng savollarga javob bering"
            steps={readingLesson(nextPassage)}
            onStart={() => setLessonId(nextPassage.id)}
          />
        )}

        {passages.length === 0 ? (
          <EmptyState
            title={`${data.settings.currentLevel} darajasi matnlari hali yuklanmagan`}
            body="Hozirça faqat A1 kontenti yuklangan. A1 darajasida işlab, keyinroq qaytaning."
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
                    {p.paragraphs.length} paragraf · {p.exercises.length} maşq · {p.glossary?.length ?? 0} ta
                    glossariy sözi
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Chip>{p.estMinutes} daqiqa</Chip>
                    {p.provenance === 'original' ? (
                      <Chip tone="warn">Original maşq matni</Chip>
                    ) : (
                      <Chip tone="brand">Moslaştirilgan matn</Chip>
                    )}
                    {done > 0 && <Chip tone="ok">maşqlar: {done}/{p.exercises.length}</Chip>}
                    {readTime && <Chip tone="brand">taymer: {readTime}</Chip>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="success" onClick={() => setLessonId(p.id)}>
                      Darsni boşlaş
                    </Button>
                    <Button variant="secondary" onClick={() => setOpenId(p.id)}>{done > 0 ? 'Davom etiş' : 'Matnni oçiş'}</Button>
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

  const glossaryIds = useMemo(() => (passage.glossary ?? []).map((g) => glossaryId(g.word)), [passage])

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
      // Dars yakuni: bonus XP + xatosiz dars hisobi (`lessonComplete`).
      // Muddat tugab, natija o'z-o'zidan ochilganda (~167-qator) bu chaqiruv
      // YUBORILMAYDI — dars tugagani yo'q, javobsiz savollar qolgan; halol bo'lgani shu.
      actions.completeLesson(answered, Object.values(results).filter((r) => !r.correct).length)
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
      return { id: item?.id ?? glossaryId(gl.word), word: gl.word, uz: gl.uz, fromVocab: item !== undefined }
    }
    const item = vocabIndex.get(key)
    if (item) return { id: item.id, word: item.word, uz: item.translationUz, fromVocab: true }
    return null
    // `passage.id` bog'liq EMAS: SRS kaliti endi matndan qat'iy emas.
  }, [selection, passage.glossary, vocabIndex])

  // "Saqlash" — takrorlash jadvaliga qo'shish (xato emas); "Bilaman" — haqiqiy baho.
  const saveWord = (s: Saver, how: 'save' | 'good') => {
    if (how === 'save') actions.saveVocab(s.id)
    else actions.gradeVocab(s.id, 'good')
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
            ← Matnlar röyxati
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">{passage.title}</h1>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Chip>{passage.level}</Chip>
            <Chip>{passage.estMinutes} daqiqa</Chip>
            <Chip>{total} maşq</Chip>
            {passage.provenance === 'original' ? (
              <Chip tone="warn">Original maşq matni</Chip>
            ) : (
              <Chip tone="brand">Moslaştirilgan matn</Chip>
            )}
          </div>
        </div>
        <div className="panel p-3 grid gap-1.5 min-w-44">
          <span className="text-[11px] font-semibold uppercase tracking-wider muted">Öqiş taymeri</span>
          <span className="text-2xl font-bold tabular-nums">{timerHere ? timerLabel : '—:—'}</span>
          <span className="text-[11px] muted">
            {timerRunning
              ? "Yurmoqda — sahifani almaştirsangiz ham töxtamaydi."
              : timerHere
                ? 'To\'xtatilgan / pauzada.'
                : 'Bu matn uçun boşlanmagan.'}
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
              Töxtatiş
            </Button>
          </div>
        </div>
      </header>

      {passage.provenance === 'original' && (
        <InfoBanner tone="muted">
          Bu matn loyihada original yozilgan — rasmiy imtihon (IELTS/CEFR) savoli emas. Savollar şu matn asosida
          tuzilgan, şuning uçun javoblarni matndan topiş mumkin.
        </InfoBanner>
      )}

      {!timerHere && data.timer.sessionId !== null && data.timer.sessionId !== passage.id && (
        <InfoBanner tone="warn">
          Taymer hozir boşqa maşğulotda yurmoqda (<code>{data.timer.sessionId}</code>). Bu matn uçun boşlasangiz
          oldingi hisob şu maşğulotga yoziladi.
        </InfoBanner>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatTile label="Bajarilgan" value={`${answeredList.length}/${total}`} hint="şu sessiyada" />
        <StatTile label="Töğri" value={right.length} tone="ok" />
        <StatTile label="Xato" value={wrong.length} tone={wrong.length > 0 ? 'bad' : 'ok'} />
        <StatTile
          label={timedMode ? 'Qolgan vaqt' : 'Bu matnda o\'qilgan'}
          value={timedMode ? formatDuration(remainingSec) : timerHere ? timerLabel : '—:—'}
          tone={timedMode && deadline !== null && remainingSec < 60 ? 'bad' : 'default'}
          hint={timedMode ? `${passage.estMinutes} daqiqalik muddatdan` : 'taymer yuritilsa körinadi'}
        />
      </div>

      {/* ------------------------------- MATN ------------------------------- */}
      <article ref={textRef} className="panel p-4 sm:p-6 grid gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold">Matn</h2>
          <span className="text-[11px] muted">Sözni ajratib oling — pastdagi panelga qöşiladi</span>
        </div>
        <div className="grid gap-4 text-[15px] sm:text-base leading-9 sm:leading-10 selection:bg-navy-200 dark:selection:bg-navy-800">
          {passage.paragraphs.map((par, i) => (
            <p key={i}>{par}</p>
          ))}
        </div>
        <div onMouseUp={takeSelection} onKeyDown={takeSelection} className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={takeSelection} title="Matndan ajratib olingan sözni tekşiriş">
              Ajratib olingan sözni aniqlaş
            </Button>
            <span className="text-[11px] muted">
              Matnda sözni siçqonça bilan belgilang (<Kbd>Ctrl</Kbd>+<Kbd>C</Kbd> şart emas) va tugmani bosing.
            </span>
          </div>
          {selection.trim() !== '' && (
            <InfoBanner tone={picked ? 'info' : 'warn'}>
              Tanlangan matn: <b className="select-text">{selection.trim().slice(0, 60)}</b>
              {picked ? null : (
                <span className="block mt-1">
                  Bu söz glossariyda va luğat röyxatida yöq — luğatga saqlab bölmaydi. Glossariydagi sözlardan
                  yoki matndagi boşqa sözlardan foydalaning.
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
                <Button size="sm" variant="secondary" onClick={() => saveWord(picked, 'save')}>
                  Luğatga saqlaş (takrorlaşga)
                </Button>
                <Button size="sm" variant="success" onClick={() => saveWord(picked, 'good')}>
                  Bilaman
                </Button>
              </div>
              <p className="text-[11px] muted">
                Saqlangan söz takrorlaş jadvaliga qöşiladi va bugun takrorlanadi — bu xato deb sanalmaydi.
              </p>
            </div>
          )}
        </div>
      </article>

      {/* --------------------------- GLOSSARIY --------------------------- */}
      <Card as="section" className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">
            Sözlarni luğatga saqlaş{' '}
            <span className="text-xs font-normal muted">({glossaryIds.length} ta glossariy sözi)</span>
          </h2>
          <span className="text-[11px] muted">Saqlangan: {savedIds.length}</span>
        </div>
        {(passage.glossary?.length ?? 0) === 0 ? (
          <InfoBanner tone="muted">Bu matnda glossariy berilmagan — matndan ajratib olingan sözlardan foydalaning.</InfoBanner>
        ) : (
          <div className="flex flex-wrap gap-2">
            {passage.glossary?.map((g) => {
              const id = vocabIndex.get(wordKey(g.word))?.id ?? glossaryId(g.word)
              const known = data.srs[id] !== undefined || savedIds.includes(id)
              return (
                <div key={g.word} className="rounded-xl border bg-[var(--panel-2)] px-3 py-2 grid gap-1.5">
                  <span className="text-sm">
                    <b>{g.word}</b> — {g.uz}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <SpeakButton text={g.word} label={`${g.word} — talaffuz`} />
                    <Button
                      size="sm"
                      variant={known ? 'ghost' : 'secondary'}
                      onClick={() => (known ? actions.gradeVocab(id, 'again') : actions.saveVocab(id))}
                    >
                      {known ? 'Qayta maşq qiliş' : "Luğatga"}
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
          <h2 className="font-bold">Matn ustidagi maşqlar</h2>
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
              title={`${passage.estMinutes} daqiqa içida bajariş`}
            >
              {timedMode ? 'Vaqt bilan maşq: davom etmoqda' : 'Vaqt bilan maşq'}
            </Button>
            {timedMode && deadline !== null && (
              <Button variant="ghost" size="sm" onClick={stopTimed}>
                Taymerni töxtatiş
              </Button>
            )}
          </div>
        </div>

        {timedMode && deadline !== null && (
          <div className="panel p-3 flex items-center justify-between gap-3">
            <span className="text-sm">
              Muddat tugagunça: <b className="tabular-nums text-lg">{formatDuration(remainingSec)}</b>
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
            Muddat tugadi — maşq şu yerda töxtatildi. Javob berilmagan savollar notöğri deb hisoblanmadi, pastdagi
            natijada faqat javob berilganlari sanaldi.
          </InfoBanner>
        )}

        {total === 0 ? (
          <EmptyState title="Bu matnda maşq yöq" body="Matnni öqib, glossariydagi sözlarni luğatingizga saqlang." />
        ) : !showResults && current ? (
          <Card className="grid gap-4">
            <ExerciseRunner
              key={`${passage.id}-${current.id}`}
              exercise={current}
              index={pos}
              total={total}
              checked={(r, secondsSpent) => record(pos, r, secondsSpent)}
              onNext={onNext}
              /* `record()` har javobni `actions.recordAttempt(...)` bilan yozadi
                 — combo store'da o'sadi, shuning uchun chiziq haqiqiy. */
              comboTracked
            />
            <InfoBanner tone="muted">
              Bu maşqlar <b>matn asosida</b> — javoblarni yuqoridagi matndan topiş mumkin. True / False / Not Given
              savollarida matnda javob bölmasa <b>Not Given</b> deb belgilang.
            </InfoBanner>
          </Card>
        ) : (
          <Card className="grid gap-3">
            <h3 className="font-bold text-lg">Natija</h3>
            <SuccessBanner>
              {total} ta maşqdan {right.length} tasi töğri — ball <b>{score}%</b>.
            </SuccessBanner>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <h4 className="font-semibold text-sm text-[var(--ok)]">Töğri javoblar ({right.length})</h4>
                {right.length === 0 ? (
                  <p className="text-sm muted">Hozirça töğri javob yöq.</p>
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
                        Töğri javob: <b>{result.expected}</b> · sizda: {result.given || '—'}
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
                Maşqlarni qayta bajariş
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowResults(false)}
                disabled={answeredList.length >= total || timeUp}
              >
                Maşqqa qaytiş
              </Button>
              <Link to="/errors" className="inline-flex items-center text-sm font-semibold text-[var(--accent)] dark:text-navy-300 underline">
                Xatolar daftarini oçiş
              </Link>
            </div>
          </Card>
        )}
      </section>
    </div>
  )
}
