/**
 * LUG'AT bo'limi.
 *
 * Qilinadi:
 *  - Yuklangan so'zlar ro'yxati, qidiruv (so'z yoki tarjima), mavzu va CEFR
 *    darajasi filtrlari
 *  - Har kartochkada: so'z, IPA, tarjima, izoh, misol, pos, topic, level
 *  - Talaffuz (brauzer TTS), "Lug'atimga saqlash", "Bilaman" / "Qayta mashq qilish"
 *  - Flashcard rejimi — SRS bo'yicha avval bugungi takrorlar
 *  - Test rejimi — 10 ta so'z, tarjima tanlovi (inline), oxirida natija
 *
 * AI ishtirok ETMAYDI: faqat lokal kontent va src/lib/srs.ts qoidalari.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { allVocab, getBundle } from '../content'
import { CEFR_LEVELS, type CefrLevel, type MultipleChoiceExercise, type PartOfSpeech, type VocabularyItem } from '../content/types'
import { checkAnswer, type CheckResult } from '../lib/check'
import { initialSrsState, isDue, review } from '../lib/srs'
import type { SrsGrade, SrsState } from '../lib/srs'
import { useStore } from '../lib/store'
import { Button, Card, Chip, EmptyState, InfoBanner, Kbd, LoadingBlock, SpeakButton, StatTile, SuccessBanner, inputCls } from '../components/ui'

type Mode = 'browse' | 'flash' | 'test'

const POS_UZ: Record<PartOfSpeech, string> = {
  noun: 'ot',
  verb: 'fe\'l',
  adjective: 'sifat',
  adverb: 'ravish',
  pronoun: 'olmos',
  preposition: 'kelik',
  conjunction: 'bog\'lovchi',
  determiner: 'belgilovchi',
  interjection: 'undosh',
}

const GRADE_LABELS: { grade: SrsGrade; label: string }[] = [
  { grade: 'again', label: 'Qayta mashq qilish' },
  { grade: 'hard', label: 'Qiyin bo\'ldi' },
  { grade: 'good', label: 'Bilaman' },
  { grade: 'easy', label: 'Juda oson' },
]

/* --------------------------- mayda yordamchilar --------------------------- */

function flat(s: string): string {
  return s
    .toLocaleLowerCase('en')
    .replace(/[‘’`´ʻ]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function srsOf(all: Record<string, SrsState>, id: string): SrsState | undefined {
  return all[id]
}

/** Tushunarli muddat: "hozir" / "3 kundan so'ng". */
function whenLabel(state: SrsState, now = Date.now()): string {
  const diff = state.dueAt - now
  if (diff <= 0) return 'hozir takrorlash kerak'
  const min = Math.round(diff / 60_000)
  if (min < 60) return `${min} daqiqadan so'ng`
  const hours = Math.round(min / 60)
  if (hours < 24) return `${hours} soatdan so'ng`
  return `${Math.round(hours / 24)} kundan so'ng`
}

function gapLabel(state: SrsState, now = Date.now()): string {
  const diff = Math.max(0, state.dueAt - now)
  const min = Math.round(diff / 60_000)
  if (min < 60) return `${min} daqiqa`
  const hours = Math.round(min / 60)
  if (hours < 24) return `${hours} soat`
  return `${Math.round(hours / 24)} kun`
}

function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = out[i] as T
    out[i] = out[j] as T
    out[j] = t
  }
  return out
}

/* -------------------------------- sahifa -------------------------------- */

export default function Vocabulary() {
  const { data, ready, learnedCount, dueCount, actions } = useStore()

  const [mode, setMode] = useState<Mode>('browse')
  const [query, setQuery] = useState('')
  const [topic, setTopic] = useState<string | null>(null)
  const [levelF, setLevelF] = useState<CefrLevel | null>(null)
  const [dueOnly, setDueOnly] = useState(false)

  const bundle = getBundle(data.settings.currentLevel)
  const pool = useMemo(() => (bundle.vocab.length > 0 ? bundle.vocab : allVocab()), [bundle.vocab])

  const topics = useMemo(() => {
    const counts = new Map<string, number>()
    for (const v of pool) counts.set(v.topic, (counts.get(v.topic) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [pool])

  const levelsPresent = useMemo(() => CEFR_LEVELS.filter((l) => pool.some((v) => v.level === l)), [pool])

  const filtered = useMemo(() => {
    const needle = flat(query)
    const now = Date.now()
    return pool
      .filter((v) => (topic === null || v.topic === topic) && (levelF === null || v.level === levelF))
      .filter((v) => {
        if (!needle) return true
        return flat(v.word).includes(needle) || flat(v.translationUz).includes(needle)
      })
      .filter((v) => {
        if (!dueOnly) return true
        const st = srsOf(data.srs, v.id)
        return st ? isDue(st, now) : false
      })
      .sort((a, b) => a.word.localeCompare(b.word))
  }, [pool, query, topic, levelF, dueOnly, data.srs])

  // Eski bug: bu yerda SRS holati BO'LMAGAN so'zlar ham `initialSrsState()`
  // orqali "due" deb sanalar edi (dueAt = now), tugma masalan "100" ko'rsatardi,
  // lekin filtr ro'yxati ularni chiqarmasdi → bosilganda bo'sh sahifa.
  // Endi hisob filtr bilan BIR XIL: faqat boshlangan va muddati yetgan so'zlar.
  const poolDue = useMemo(() => {
    const now = Date.now()
    return pool.filter((v) => {
      const st = srsOf(data.srs, v.id)
      return st ? isDue(st, now) : false
    }).length
  }, [pool, data.srs])

  const resetFilters = () => {
    setQuery('')
    setTopic(null)
    setLevelF(null)
    setDueOnly(false)
  }

  if (!ready) return <LoadingBlock label={'Lug\'at ma\'lumotlari yuklanmoqda…'} />

  return (
    <div className="grid gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{'Lug\'at'}</h1>
          <p className="muted text-sm">
            {data.settings.currentLevel} darajasi · {pool.length} ta so'z · takrorlash jadvali SM-2 qoidasi (srs.ts)
            bo'yicha hisoblanadi.
          </p>
        </div>
        <div className="flex gap-1.5 p-1 rounded-xl bg-[var(--panel-2)]">
          {(['browse', 'flash', 'test'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m === mode ? 'browse' : m)}
              aria-pressed={mode === m}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold ${mode === m ? 'bg-[var(--panel)] shadow-sm' : 'muted hover:text-[var(--text)]'}`}
            >
              {m === 'browse' ? 'Ro\'yxat' : m === 'flash' ? 'Flashcard' : 'Test'}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatTile label="Bugun takror" value={dueCount} hint="jadval bo'yicha yetib kelganlar" tone={dueCount > 0 ? 'warn' : 'ok'} />
        <StatTile label="O'zlashtirilgan" value={learnedCount} hint="har bir so'z BIR marta sanaladi" tone="ok" />
        <StatTile label="Ro'yxatdan takrori yetgan" value={poolDue} hint={`jami ${pool.length} so'z ichida`} />
        <StatTile label="Filtr natijasi" value={filtered.length} hint={topic ? `mavzu: ${topic}` : 'barcha mavzular'} />
      </div>

      {mode === 'browse' && (
        <>
          <Card as="section" className="grid gap-3">
            <div className="grid sm:grid-cols-[1fr_auto] gap-2.5 items-end">
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide muted">Qidiruv (so'z yoki tarjima)</span>
                <input
                  className={inputCls}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="masalan: book yoki kitob"
                  aria-label="Lug'atdan qidirish"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={dueOnly ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setDueOnly((v) => !v)}
                  aria-pressed={dueOnly}
                  title="Faqat takrorlashi yetib kelgan so'zlar"
                >
                  Faqat bugun takror ({poolDue})
                </Button>
                <Button variant="ghost" size="sm" onClick={resetFilters} title="Barcha filtrlarni tozalash">
                  Filtrlarni tozalash
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Chip tone="brand">Daraja</Chip>
              {levelsPresent.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLevelF(levelF === l ? null : l)}
                  aria-pressed={levelF === l}
                  className={`chip cursor-pointer ${levelF === l ? '!text-navy-700 dark:!text-navy-300 !border-navy-400 bg-navy-50 dark:bg-navy-900/40' : 'hover:bg-[var(--panel)]'}`}
                >
                  {l}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Chip tone="brand">Mavzu</Chip>
              {topics.map(([name, count]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setTopic(topic === name ? null : name)}
                  aria-pressed={topic === name}
                  className={`chip cursor-pointer ${topic === name ? '!text-navy-700 dark:!text-navy-300 !border-navy-400 bg-navy-50 dark:bg-navy-900/40' : 'hover:bg-[var(--panel)]'}`}
                >
                  {name} · {count}
                </button>
              ))}
            </div>
          </Card>

          {filtered.length === 0 ? (
            <EmptyState
              title="Hech narsa topilmadi"
              body={'Boshqa so\'z bilan qidirib ko\'ring yoki filtrlarni tozalang. Mavzular ro\'yxati yuqorida.'}
              action={
                <Button variant="secondary" onClick={resetFilters}>
                  Filtrlarni tozalash
                </Button>
              }
            />
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {filtered.map((v) => (
                <WordCard key={v.id} item={v} state={srsOf(data.srs, v.id)} onGrade={(id, g) => actions.gradeVocab(id, g)} />
              ))}
            </div>
          )}
        </>
      )}

      {mode === 'flash' && <Flashcards deck={filtered} srs={data.srs} onGrade={(id, g) => actions.gradeVocab(id, g)} />}

      {mode === 'test' && (
        <TestMode
          pool={filtered.length > 0 ? filtered : pool}
          srs={data.srs}
          onRecord={(exercise, r, seconds) =>
            actions.recordAttempt({
              exercise,
              correct: r.correct,
              partial: r.partial,
              given: r.given,
              secondsSpent: seconds,
              source: 'practice',
            })
          }
        />
      )}
    </div>
  )
}

/* ------------------------------ kartochka ------------------------------ */

function WordCard({
  item,
  state,
  onGrade,
}: {
  item: VocabularyItem
  state: SrsState | undefined
  onGrade: (id: string, grade: SrsGrade) => void
}) {
  const [preview, setPreview] = useState<{ grade: SrsGrade; next: SrsState } | null>(null)
  const now = Date.now()

  const grade = (g: SrsGrade) => {
    const base = state ?? initialSrsState(now)
    setPreview({ grade: g, next: review(base, g, now) })
    onGrade(item.id, g)
  }

  return (
    <Card as="article" className="grid gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="text-lg font-bold">{item.word}</h3>
            {item.ipa && <span className="muted text-sm font-mono">{item.ipa}</span>}
          </div>
          <p className="font-semibold text-[var(--accent)] dark:text-navy-300">{item.translationUz}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip>{item.level}</Chip>
          <Chip>{POS_UZ[item.pos]}</Chip>
          <Chip>{item.topic}</Chip>
        </div>
      </div>

      <p className="text-sm">{item.explanationEn}</p>

      <blockquote className="rounded-xl border bg-[var(--panel-2)] p-3 grid gap-1 text-sm">
        <span className="italic">"{item.exampleEn}"</span>
        <span className="muted">{item.exampleUz}</span>
      </blockquote>

      {item.relations && (item.relations.synonym?.length || item.relations.antonym?.length) ? (
        <div className="flex flex-wrap gap-1.5">
          {item.relations.synonym?.map((s) => (
            <Chip key={`syn-${s}`} tone="ok">
              ≈ {s}
            </Chip>
          ))}
          {item.relations.antonym?.map((a) => (
            <Chip key={`ant-${a}`} tone="warn">
              ≠ {a}
            </Chip>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5 text-[11px] muted">
        {state ? (
          <>
            <Chip tone={isDue(state, now) ? 'warn' : 'ok'}>{isDue(state, now) ? 'Bugun takror' : 'Jadvalda'}</Chip>
            <span>{whenLabel(state, now)}</span>
            <span>· takrorlar: {state.reps}</span>
            {state.learnedAt !== null && <span>· o'zlashtirilgan</span>}
          </>
        ) : (
          <Chip>Hali lug'atingizda yo'q</Chip>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <SpeakButton text={item.pronunciation?.ttsText ?? item.word} label={`${item.word} — talaffuz`} />
        {!state && (
          <Button variant="secondary" size="sm" onClick={() => grade('again')} title="So'z takrorlash jadvaliga kiritiladi">
            Lug'atimga saqlash
          </Button>
        )}
        <Button variant="success" size="sm" onClick={() => grade('good')}>
          Bilaman
        </Button>
        <Button variant="danger" size="sm" onClick={() => grade('again')}>
          Qayta mashq qilish
        </Button>
      </div>

      {preview && (
        <p className="text-[11px] muted">
          {GRADE_LABELS.find((g) => g.grade === preview.grade)?.label} deb belgilandi → keyingi takror{' '}
          <b>{gapLabel(preview.next, Date.now())}</b>dan so'ng (interval {preview.next.intervalDays} kun).
        </p>
      )}
    </Card>
  )
}

/* ---------------------------- flashcard rejimi ---------------------------- */

interface DeckCard {
  item: VocabularyItem
  state: SrsState
}

/**
 * Flashcard navbatini SRS bo'yicha tuzadi:
 *  1) takrorlashi yetib kelganlar (isDue) — eng avval,
 *  2) lug'atga kiritilmagan yangi so'zlar,
 *  3) qolganlari dueAt bo'yicha.
 */
function orderForReview(deck: readonly VocabularyItem[], srs: Record<string, SrsState>): DeckCard[] {
  const now = Date.now()
  const withState: DeckCard[] = deck.map((item) => ({ item, state: srsOf(srs, item.id) ?? initialSrsState(now) }))
  return [...withState].sort((a, b) => {
    const aDue = isDue(a.state, now) ? 0 : 1
    const bDue = isDue(b.state, now) ? 0 : 1
    if (aDue !== bDue) return aDue - bDue
    const aNew = a.state.reps === 0 && a.state.learnedAt === null ? 0 : 1
    const bNew = b.state.reps === 0 && b.state.learnedAt === null ? 0 : 1
    if (aNew !== bNew) return aNew - bNew
    return a.state.dueAt - b.state.dueAt
  })
}

function Flashcards({
  deck,
  srs,
  onGrade,
}: {
  deck: VocabularyItem[]
  srs: Record<string, SrsState>
  onGrade: (id: string, grade: SrsGrade) => void
}) {
  const [queue, setQueue] = useState<DeckCard[]>(() => orderForReview(deck, srs))
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [log, setLog] = useState<{ word: string; grade: SrsGrade }[]>([])

  // Sessiya navbati — SNAPSHOT. Baholash SRS holatini o'zgartirsa ham joriy
  // sessiya tartibi adashmaydi; filtrlar o'zgarsa yangi sessiya boshlanadi.
  //
  // ESKI BUG: bog'liqlik `[deck]` edi — `deck` (`filtered`) esa `data.srs`ga
  // bog'liq, ya'ni HAR BIR baholashda yangi massiv identifikatori kelar edi va
  // sessiya boshiga qaytardi ("1/37" hech qachon tugamardi). Endi faqat
  // so'zlar TUPLAMI o'zgarsa (filtr o'zgarsa) sessiya yangilanadi.
  const deckRef = useRef<VocabularyItem[]>(deck)
  const srsRef = useRef<Record<string, SrsState>>(srs)
  const deckKey = deck.map((d) => d.id).join(',')
  useEffect(() => {
    deckRef.current = deck
    setQueue(orderForReview(deck, srsRef.current))
    setIdx(0)
    setFlipped(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckKey])
  useEffect(() => {
    srsRef.current = srs
  }, [srs])

  const startSession = () => {
    setQueue(orderForReview(deckRef.current, srsRef.current))
    setIdx(0)
    setFlipped(false)
    setLog([])
  }

  // Space — kartani ochish/yopish (yozuv maydoni yoki tugma focus bo'lmasa).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.metaKey || e.ctrlKey || e.altKey) return
      const el = document.activeElement
      if (el && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(el.tagName)) return
      e.preventDefault()
      setFlipped((v) => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (deck.length === 0) {
    return (
      <EmptyState
        title="Flashcard uchun so'z yo'q"
        body={'Filtrlarni tozalasangiz butun lug\'at ro\'yxati bo\'yicha ishlaysiz.'}
      />
    )
  }

  const card = queue[idx]
  const finished = card === undefined

  const grade = (g: SrsGrade) => {
    if (!card) return
    onGrade(card.item.id, g)
    setLog((prev) => [...prev, { word: card.item.word, grade: g }])
    setFlipped(false)
    if (g === 'again') {
      // Xato so'z navbatning oxiriga qaytadi — sessiya ichida mustahklanadi.
      const refreshed: DeckCard = { item: card.item, state: review(card.state, g) }
      setQueue((q) => [...q, refreshed])
    }
    setIdx((n) => n + 1)
  }

  if (finished) {
    const known = log.filter((l) => l.grade === 'good' || l.grade === 'easy').length
    return (
      <Card className="grid gap-3">
        <h2 className="font-bold text-lg">Flashcard sessiyasi tugadi</h2>
        {log.length === 0 ? (
          <InfoBanner tone="muted">Bu safar birorta kartochka baholanmadi — sessiyani qayta boshlang.</InfoBanner>
        ) : (
          <>
            <SuccessBanner>
              {`${log.length} ta kartochka baholandi — ${known} tasini bildingiz.`}
            </SuccessBanner>
            <div className="flex flex-wrap gap-1.5">
              {log.map((l, i) => (
                <Chip key={`${l.word}-${i}`} tone={l.grade === 'again' ? 'bad' : l.grade === 'hard' ? 'warn' : 'ok'}>
                  {l.word}
                </Chip>
              ))}
            </div>
          </>
        )}
        <div className="flex flex-wrap gap-2">
          <Button onClick={startSession}>Yangi sessiya</Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold muted tabular-nums">
          {idx + 1} / {queue.length}
        </span>
        <div className="flex flex-wrap gap-1.5">
          <Chip tone={isDue(card.state) ? 'warn' : 'default'}>
            {isDue(card.state) ? 'Bugungi takror' : "Navbatdagi so'z"}
          </Chip>
          <Chip>{card.item.level}</Chip>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((v) => !v)}
        aria-label={flipped ? 'Tarjimani yopish' : 'Tarjimani ko\'rish'}
        className="min-h-44 rounded-2xl border bg-[var(--panel-2)] p-5 grid place-items-center text-center animate-[var(--animate-pop)]"
      >
        <span className="grid gap-2">
          <span className="text-2xl sm:text-3xl font-bold">{card.item.word}</span>
          {card.item.ipa && <span className="muted font-mono text-sm">{card.item.ipa}</span>}
          {flipped ? (
            <>
              <span className="text-lg font-semibold text-[var(--accent)] dark:text-navy-300">{card.item.translationUz}</span>
              <span className="muted text-sm italic">"{card.item.exampleEn}"</span>
              <span className="text-[11px] muted">
                {card.item.topic} · {POS_UZ[card.item.pos]}
              </span>
            </>
          ) : (
            <span className="muted text-sm">
              Ma'noni ko'rish uchun bosing yoki <Kbd>Space</Kbd>
            </span>
          )}
        </span>
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <SpeakButton text={card.item.pronunciation?.ttsText ?? card.item.word} label={`${card.item.word} — talaffuz`} size="md" />
        <span className="text-[11px] muted">
          <Kbd>Space</Kbd> — kartani ochish · baholash keyingi kartaga o'tkazadi
        </span>
      </div>

      <div className="grid sm:grid-cols-4 gap-2">
        {GRADE_LABELS.map((g) => (
          <Button
            key={g.grade}
            variant={g.grade === 'good' ? 'success' : g.grade === 'again' ? 'danger' : 'secondary'}
            onClick={() => grade(g.grade)}
          >
            {g.label}
          </Button>
        ))}
      </div>
    </Card>
  )
}

/* ------------------------------ test rejimi ------------------------------ */

interface QuizItem {
  exercise: MultipleChoiceExercise
  vocab: VocabularyItem
}

/** 10 ta so'z: avval due, keyin yangi; variantlar shu ro'yxatdan yasaladi. */
function buildQuiz(pool: readonly VocabularyItem[], srs: Record<string, SrsState>, limit: number): QuizItem[] {
  if (pool.length === 0) return []
  const now = Date.now()
  const due: VocabularyItem[] = []
  const fresh: VocabularyItem[] = []
  const rest: VocabularyItem[] = []
  for (const v of pool) {
    const st = srsOf(srs, v.id)
    if (st && isDue(st, now)) due.push(v)
    else if (!st) fresh.push(v)
    else rest.push(v)
  }
  const order = [...shuffle(due), ...shuffle(fresh), ...shuffle(rest)]
  const picked = order.slice(0, Math.min(limit, pool.length))

  return picked.map((v) => {
    const distractors = shuffle(pool.filter((o) => o.id !== v.id && flat(o.translationUz) !== flat(v.translationUz)))
      .slice(0, 3)
      .map((o) => o.translationUz)
    const options = shuffle([v.translationUz, ...distractors])
    const exercise: MultipleChoiceExercise = {
      id: `vocab-quiz-${v.id}`,
      kind: 'multiple-choice',
      instructionUz: `“${v.word}” so‘zining o‘zbekcha ma‘nosini tanlang.`,
      level: v.level,
      skill: 'vocabulary',
      explanationUz: `${v.word} — ${v.translationUz}. ${v.explanationEn}`,
      difficulty: v.level === 'A1' ? 1 : 2,
      tags: ['vocab quiz', v.topic],
      question: `What does “${v.word}” mean?`,
      options,
    answerIndex: options.indexOf(v.translationUz),
    }
    return { exercise, vocab: v }
  })
}

function TestMode({
  pool,
  srs,
  onRecord,
}: {
  pool: VocabularyItem[]
  srs: Record<string, SrsState>
  onRecord: (exercise: MultipleChoiceExercise, r: CheckResult, secondsSpent: number) => void
}) {
  const [quiz, setQuiz] = useState<QuizItem[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [result, setResult] = useState<CheckResult | null>(null)
  const [score, setScore] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 })
  // ESKI BUG: `startedAt` butun viktorinaga nisbatan edi — 10-savolda
  // oxirgi savolga ~10 daqiqa "sarflangan" deb yozilardi va Dashboard
  // "Bajarildi" belgisini asossiz yoqardi. Endi har savol uchun alohida.
  const [qStart, setQStart] = useState(() => Date.now())

  const start = () => {
    setQuiz(buildQuiz(pool, srs, 10))
    setIdx(0)
    setChosen(null)
    setResult(null)
    setScore({ correct: 0, total: 0 })
    setQStart(Date.now())
  }

  if (!quiz) {
    return (
      <Card className="grid gap-3">
        <h2 className="font-bold text-lg">Test: tarjima tanlovi</h2>
        <p className="text-sm muted">
          10 ta so'z tanlanadi — avval takrori yetib kelganlar, so'ng yangi so'zlar. Har bir javob mashq sifatida
          yoziladi (source: practice), shuning uchun Xatolar daftariga ham tushadi.
        </p>
        {pool.length < 4 && (
          <InfoBanner tone="warn">
            Filtrlangan ro'yxatda variantlar yasash uchun so'z yetarli emas — kamida 4 ta kerak. Filtrlarni tozalang.
          </InfoBanner>
        )}
        <div>
          <Button size="lg" onClick={start} disabled={pool.length < 4}>
            Testni boshlash ({pool.length} ta so'zdan)
          </Button>
        </div>
      </Card>
    )
  }

  const q = quiz[idx]

  if (!q) {
    const pct = score.total === 0 ? 0 : Math.round((score.correct / score.total) * 100)
    return (
      <Card className="grid gap-3">
        <h2 className="font-bold text-lg">Test yakunlandi</h2>
        <SuccessBanner>
          {`Natija: ${score.correct}/${score.total} (${pct}%).`}{' '}
          {pct >= 70
            ? "Bu natija o'zlashtirilgan so'zlarni mustahkamlagani ko'rinadi — jadval bo'yicha davom eting."
            : 'Past ball — Flashcard rejimida takrorlang, soʻng qayta urinib koʻring.'}
        </SuccessBanner>
        <div className="flex flex-wrap gap-2">
          <Button onClick={start}>Yana bir test</Button>
          <Button variant="secondary" onClick={() => setQuiz(null)}>
            Ro'yxatga qaytish
          </Button>
        </div>
      </Card>
    )
  }

  const pick = (i: number) => {
    if (chosen !== null) return
    const r = checkAnswer(q.exercise, i)
    setChosen(i)
    setResult(r)
    setScore((s) => ({ correct: s.correct + (r.correct ? 1 : 0), total: s.total + 1 }))
    onRecord(q.exercise, r, Math.max(1, Math.round((Date.now() - qStart) / 1000)))
  }

  const next = () => {
    setIdx((n) => n + 1)
    setChosen(null)
    setResult(null)
    setQStart(Date.now())
  }

  return (
    <Card className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold muted tabular-nums">
          {idx + 1} / {quiz.length}
        </span>
        <Chip tone="ok">ball: {score.correct}</Chip>
      </div>

      <div className="grid gap-1.5">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-2xl font-bold">{q.vocab.word}</span>
          {q.vocab.ipa && <span className="muted font-mono text-sm">{q.vocab.ipa}</span>}
          <SpeakButton text={q.vocab.pronunciation?.ttsText ?? q.vocab.word} label={`${q.vocab.word} — talaffuz`} />
        </div>
        <p className="text-sm italic muted">"{q.vocab.exampleEn}"</p>
      </div>

      <div className="grid gap-2" role="radiogroup" aria-label="Tarjima variantlari">
        {q.exercise.options.map((opt, i) => {
          const isRight = i === q.exercise.answerIndex
          const isChosen = chosen === i
          const locked = chosen !== null
          return (
            <button
              key={`${q.exercise.id}-${i}`}
              type="button"
              role="radio"
              aria-checked={isChosen}
              disabled={locked}
              onClick={() => pick(i)}
              className={`text-left px-3.5 py-2.5 rounded-xl border text-sm transition-colors ${
                locked && isRight
                  ? 'border-emerald-400/70 bg-emerald-50 dark:bg-emerald-900/20 font-semibold'
                  : locked && isChosen
                    ? 'border-rose-400/70 bg-rose-50 dark:bg-rose-900/15'
                    : isChosen
                      ? 'border-[var(--accent)] bg-navy-50 dark:bg-navy-900/40 font-semibold'
                      : 'hover:bg-[var(--panel-2)]'
              }`}
            >
              <span className="inline-grid place-items-center w-5 h-5 rounded-full border text-[10px] mr-2">
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          )
        })}
      </div>

      {result && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm animate-[var(--animate-pop)] ${
            result.correct ? 'border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20' : 'border-rose-400/60 bg-rose-50 dark:bg-rose-900/15'
          }`}
          role="status"
          aria-live="polite"
        >
          <strong className={result.correct ? 'text-[var(--ok)]' : 'text-[var(--bad)]'}>
            {result.correct ? 'To‘g‘ri!' : 'Noto‘g‘ri'}
          </strong>
          {!result.correct && (
            <p className="mt-1">
              To‘g‘ri javob: <b>{result.expected}</b>
            </p>
          )}
          <p className="mt-1 muted">{result.whyUz}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {chosen !== null && <Button onClick={next}>{idx + 1 < quiz.length ? 'Keyingi savol' : 'Natijani ko‘rish'}</Button>}
        <Button variant="ghost" size="sm" onClick={() => setQuiz(null)}>
          Testni tugatish
        </Button>
      </div>
    </Card>
  )
}
