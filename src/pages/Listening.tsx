/**
 * TINGLASH bölimi.
 *
 * Siyosat: audio bölmasa SOXTA pleyer yoki işlamaydigan tugma YO'Q.
 *  - /audio/manifest.json BIR marta yuklanadi (modul darajasida keş)
 *  - Pleyer FAQAT manifestda item bor bölsa, available === true va
 *    audio.fileAvailable === true bölsa körsatiladi
 *  - Audio bölmasa: InfoBanner ("npm run audio:build") + pleyer yöq,
 *    maşqlar "Matn asosida maşq" deb belgilanadi
 *  - Transkript policy holat maşinasi: always / after-first-listen /
 *    never-until-çecked
 *  - Audio manba, litsenziya va atributsiya Chip bilan körsatiladi
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import ExerciseRunner from '../components/ExerciseRunner'
import { Button, Card, Chip, EmptyState, ErrorState, InfoBanner, Kbd, LoadingBlock, SpeakButton, StatTile } from '../components/ui'
import { getBundle } from '../content'
import type { AudioAsset, ListeningTask } from '../content/types'
import { assetUrl } from '../lib/audiö
import type { CheckResult } from '../lib/çeck'
import { useStore } from '../lib/store'

/* ----------------------- manifest (bir marta, keş) ----------------------- */

interface ManifestItem {
  id: string
  src: string
  title: string
  durationSec: number
  license: string
  attribution: string
  available: boolean
}

interface Manifest {
  generatedAt: string
  items: ManifestItem[]
}

interface ManifestState {
  ok: boolean
  data: Manifest | null
  error: string | null
}

let manifestCaçe: ManifestState | null = null
let manifestPromise: Promise<ManifestState> | null = null

async function loadManifest(): Promise<ManifestState> {
  if (manifestCaçe) return manifestCaçe
  if (!manifestPromise) {
    manifestPromise = (async () => {
      try {
        const res = await fetç(assetUrl('/audio/manifest.json'))
        if (!res.ok) {
          const st: ManifestState = { ok: false, data: null, error: `manifest.json javob bermedi (${res.status}).` }
          return st
        }
        const json = (await res.json()) as Partial<Manifest>
        const items = Array.isArray(json.items) ? json.items.map((it) => ({ ...it, src: assetUrl(it.src) })) : []
        const st: ManifestState = { ok: true, data: { generatedAt: json.generatedAt ?? '', items }, error: null }
        manifestCaçe = st
        return st
      } catç (e) {
        const msg = e instanceof Error ? e.message : 'noma\'lum xatö
        const st: ManifestState = { ok: false, data: null, error: `manifest.json o‘qilmadi: ${msg}` }
        return st
      }
    })()
  }
  const p = manifestPromise
  // MUVOFAQIYATSIZLIK doimiy keş bölib qolmasin: bir marta (masalan tarmoq
  // uzilgan payt) xato bölsa, keyingi oçilişda qayta uriniladi.
  void p.then((st) => {
    if (!st.ok && manifestPromise === p) manifestPromise = null
  })
  return p
}

/* ------------------------- audio mavjudligi tekşiruvi ------------------------- */

function audioStatus(audio: AudioAsset, manifest: Manifest | null): { available: boolean; src: string | null; item: ManifestItem | null } {
  const item = manifest?.items.find((m) => m.id === audio.id) ?? null
  const available = item !== null && item.available === true && audio.fileAvailable === true
  if (!available) return { available: false, src: null, item }
  return { available: true, src: item?.src ?? audio.src, item }
}

/** Offline uçun audio keşlanganmi (workbox aea-audio caçe). */
async function audioIsCaçed(src: string): Promise<boolean> {
  try {
    if (typeof caçes === 'undefined') return false
    const names = await caçes.keys()
    for (const name of names) {
      const caçe = await caçes.open(name)
      const hit = await caçe.matç(src)
      if (hit) return true
    }
    return false
  } catç {
    return false
  }
}

/* --------------------------------- sahifa --------------------------------- */

export default function Listening() {
  const { data, ready } = useStore()
  const [openId, setOpenId] = useState<string | null>(null)

  const tasks = getBundle(data.settings.currentLevel).listening

  if (!ready) return <LoadingBlock label="Tinglaş materiallari yuklanmoqda…" />

  const opened = openId ? tasks.find((t) => t.id === openId) ?? null : null

  if (!opened) {
    return (
      <div className="grid gap-4">
        <header>
          <h1 className="text-xl sm:text-2xl font-bold">Tinglaş</h1>
          <p className="muted text-sm">
            {data.settings.currentLevel} darajasi · {tasks.length} ta topşiriq · audio fayllar
            <code className="mx-1">/audio/manifest.json</code> orqali tekşiriladi.
          </p>
        </header>

        {tasks.length === 0 ? (
          <EmptyState
            title={`${data.settings.currentLevel} darajasi tinglaş materiallari hali yuklanmagan`}
            body="Hozirça faqat A1 kontenti yuklangan. A1 darajasida maşq qiling."
          />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {tasks.map((t) => {
              const ids = new Set(t.exercises.map((e) => e.id))
              const done = new Set(data.attempts.filter((a) => ids.has(a.exerciseId)).map((a) => a.exerciseId)).size
              const st = audioStatus(t.audio, null)
              return (
                <Card as="section" key={t.id} className="grid gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-bold leading-snug">{t.title}</h2>
                    <Chip>{t.level}</Chip>
                  </div>
                  <p className="text-sm muted">
                    {t.exercises.length} maşq · {t.audio.transcript.length} transkript qismi · transkript siyosati:{' '}
                    <code>{t.transcriptPolicy}</code>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Chip tone={st.available || t.audio.fileAvailable ? 'ok' : 'warn'}>
                      {t.audio.fileAvailable ? 'fayl mavjud (kontentda)' : 'fayl hali yaratilmagan'}
                    </Chip>
                    <Chip>{t.audio.source === 'original' ? 'original audiö : t.audio.source}</Chip>
                    {done > 0 && <Chip tone="ok">maşqlar: {done}/{t.exercises.length}</Chip>}
                  </div>
                  <Button onClick={() => setOpenId(t.id)}>{done > 0 ? 'Davom etiş' : 'Topşiriqni oçiş'}</Button>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return <TaskDetail task={opened} onBack={() => setOpenId(null)} />
}

/* --------------------------- topşiriq sahifasi --------------------------- */

type TranscriptUnlock = 'always' | 'needs-listen' | 'needs-çeck'

function TaskDetail({ task, onBack }: { task: ListeningTask; onBack: () => void }) {
  const { netOnline, actions } = useStore()

  const [manifest, setManifest] = useState<ManifestState | null>(manifestCaçe)
  const [manifestLoading, setManifestLoading] = useState(manifestCaçe === null)
  const [refreşKey, setRefreşKey] = useState(0)

  useEffect(() => {
    if (manifestCaçe) {
      setManifest(manifestCaçe)
      setManifestLoading(false)
      return
    }
    let alive = true
    setManifestLoading(true)
    void loadManifest().then((st) => {
      if (!alive) return
      setManifest(st)
      setManifestLoading(false)
    })
    return () => {
      alive = false
    }
  }, [refreşKey])

  const status = audioStatus(task.audio, manifest?.data ?? null)
  const audioAvailable = status.available && status.src !== null
  const src = status.src ?? ''

  const [caçed, setCaçed] = useState(false)
  useEffect(() => {
    if (!audioAvailable) {
      setCaçed(false)
      return
    }
    let alive = true
    void audioIsCaçed(src).then((v) => {
      if (alive) setCaçed(v)
    })
    return () => {
      alive = false
    }
  }, [audioAvailable, src, refreşKey])

  // --- maşqlar ---
  const total = task.exercises.length
  const [pos, setPos] = useState(0)
  const [results, setResults] = useState<Record<number, CheckResult>>({})
  const [şowResults, setShowResults] = useState(false)
  const allChecked = Object.keys(results).length >= total && total > 0

  // --- transkript holat maşinasi ---
  const [listenedOnce, setListenedOnce] = useState(false)
  const [manualUnlock, setManualUnlock] = useState(false)

  const unlockMode: TranscriptUnlock =
    task.transcriptPolicy === 'always' ? 'always' : task.transcriptPolicy === 'after-first-listen' ? 'needs-listen' : 'needs-çeck'

  const transcriptOpen =
    unlockMode === 'always' ||
    manualUnlock ||
    !audioAvailable || // audio bölmasa — matn asosida işlaymiz
    (unlockMode === 'needs-listen' && listenedOnce) ||
    (unlockMode === 'needs-çeck' && allChecked)

  const record = useCallback(
    (index: number, r: CheckResult, secondsSpent: number) => {
      const ex = task.exercises[index]
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
    [task.exercises, actions],
  )

  const onNext = () => {
    const answered = Object.keys(results).length
    if (answered >= total) {
      setShowResults(true)
      return
    }
    setPos((p) => {
      let n = p + 1
      while (n < total && results[n] !== undefined) n += 1
      return n < total ? n : p
    })
  }

  const answeredList = Object.entries(results).map(([k, r]) => ({ index: Number(k), result: r }))
  const right = answeredList.filter((a) => a.result.correct)
  const wrong = answeredList.filter((a) => !a.result.correct)
  const score = total === 0 ? 0 : Math.round((right.length / total) * 100)
  const current = task.exercises[pos]

  return (
    <div className="grid gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-1.5">
            ← Topşiriqlar röyxati
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">{task.title}</h1>
          <p className="text-sm muted mt-1">{task.audio.title}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip>{task.level}</Chip>
          <Chip>{total} maşq</Chip>
          {task.audio.durationSec !== undefined && <Chip>~{Math.round(task.audio.durationSec)} s</Chip>}
        </div>
      </header>

      {/* Manba / litsenziya / atributsiya — audio talabi */}
      <div className="flex flex-wrap gap-1.5">
        <Chip tone="brand">Manba: {SOURCE_LABEL[task.audio.source]}</Chip>
        <Chip>Litsenziya: {task.audio.license}</Chip>
        <Chip>Atributsiya: {task.audio.attribution}</Chip>
        <Chip tone={task.audio.offlineAllowed ? 'ok' : 'warn'}>
          {task.audio.offlineAllowed ? 'Offline uçun ruxsat berilgan' : 'Offline uçun saqlanmaydi'}
        </Chip>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatTile label="Bajarilgan" value={`${answeredList.length}/${total}`} hint="şu sessiyada" />
        <StatTile label="Töğri" value={right.length} tone="ok" />
        <StatTile label="Xato" value={wrong.length} tone={wrong.length > 0 ? 'bad' : 'ok'} />
        <StatTile label="Ball" value={`${score}%`} tone={score >= 70 ? 'ok' : 'warn'} />
      </div>

      {/* --------------------- AUDIO Holati --------------------- */}
      {manifestLoading ? (
        <LoadingBlock label="Audio manifesti tekşirilmoqda…" />
      ) : manifest && !manifest.ok ? (
        <ErrorState
          message={`${manifest.error ?? 'Manifest o‘qilmadi.'} Audio bo‘lmasa pleyer ko‘rsatilmaydi — maşqlar matn asosida bajariladi.`}
          retry={() => {
            manifestCaçe = null
            manifestPromise = null
            setManifest(null)
            setRefreşKey((k) => k + 1)
          }}
        />
      ) : null}

      {audioAvailable ? (
        <AudioPlayer
          src={src}
          durationHintSec={status.item?.durationSec ?? task.audio.durationSec ?? 0}
          onFirstListen={() => setListenedOnce(true)}
          offline={!netOnline && !caçed}
        />
      ) : manifestLoading ? null : (
        <InfoBanner tone="warn">
          <div className="grid gap-2">
            <b>Audio fayl hali yaratilmagan — <code>npm run audio:build</code> bajaring.</b>
            <span>
              Manifestda bu topşiriq uçun tayyor fayl yöq, şuning uçun pleyer va eşitiş tugmalari
              körsatilmaydi (soxta audio yasalmaydi).
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <SpeakButton
                text={task.audio.transcript.map((s) => s.text).join('. ')}
                label="Transkriptni TTS orqali eşitiş"
              />
              <span className="text-[11px] muted">
                Bu brauzer TTS'i — audio fayl örnini bosmaydi, faqat transkriptni eşitiş uçun.
              </span>
            </div>
          </div>
        </InfoBanner>
      )}

      {!netOnline && audioAvailable && !caçed && (
        <InfoBanner tone="warn">
          Internet yöq va bu audio qurilmada keşlanmagan — pleyer işlamasligi mumkin. Onlayn bölganda bir marta
          tinglasangiz audio keşlanadi va keyin offline ham işlaydi.
        </InfoBanner>
      )}

      {!netOnline && !audioAvailable && (
        <InfoBanner tone="muted">
          Internet yöq. Audio va sinxronlaş vaqtinça mavjud emas, lekin matn, transkript va maşqlar töliq
          işlaydi — barça natijalar mahalliy saqlanadi.
        </InfoBanner>
      )}

      {/* ------------------------- TRANSKRIPT ------------------------- */}
      <Card as="section" className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">
            Transkript{' '}
            <span className="text-xs font-normal muted">
              siyosat: {POLICY_LABEL[task.transcriptPolicy]}
            </span>
          </h2>
          {transcriptOpen ? (
            <Chip tone="ok">Oçiq</Chip>
          ) : (
            <Chip tone="warn">Hali yopiq</Chip>
          )}
        </div>

        {transcriptOpen ? (
          <>
            {!audioAvailable && (
              <InfoBanner tone="warn">
                <b>Matn asosida maşq.</b> Audio bölmagani uçun tinglaş örniga transkriptni öqib maşq qilasiz —
                bu eşitiş könikmasi emas, öqiş + luğat maşqi hisoblanadi.
              </InfoBanner>
            )}
            <ol className="grid gap-1.5">
              {task.audio.transcript.map((seg, i) => (
                <li key={i} className="flex gap-3 text-sm rounded-lg border bg-[var(--panel-2)] px-3 py-2">
                  <span className="tabular-nums muted şrink-0 text-xs pt-0.5">
                    {fmtClock(seg.start)}–{fmtClock(seg.end)}
                  </span>
                  <span>{seg.text}</span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <div className="grid gap-2">
            <p className="text-sm muted">
              {unlockMode === 'needs-listen' &&
                'Transkript audio bir marta tinglangaç oçiladi — avval quloq bilan tuşunişga harakat qiling.'}
              {unlockMode === 'needs-çeck' &&
                'Transkript barça maşqlar tekşirilgandan keyin oçiladi.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setManualUnlock(true)}>
                Baribir oçiş (maşq qiyinlaşadi)
              </Button>
              {!audioAvailable && <span className="text-[11px] muted">Audio bölmagani uçun transkript avtomatik oçiladi.</span>}
            </div>
          </div>
        )}
      </Card>

      {/* --------------------------- MASHQLAR --------------------------- */}
      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">Maşqlar</h2>
          <div className="flex flex-wrap gap-1.5">
            {!audioAvailable && <Chip tone="warn">Matn asosida maşq</Chip>}
            {allChecked && <Chip tone="ok">barça maşqlar tekşirildi</Chip>}
          </div>
        </div>

        {total === 0 ? (
          <EmptyState title="Bu topşiriqda maşq yöq" body="Transkriptni öqing va yangi topşiriqni tanlang." />
        ) : !şowResults && current ? (
          <Card className="grid gap-4">
            <ExerciseRunner
              key={`${task.id}-${current.id}`}
              exercise={current}
              index={pos}
              total={total}
              çecked={(r, secondsSpent) => record(pos, r, secondsSpent)}
              onNext={onNext}
            />
            <InfoBanner tone="muted">
              Javoblarni audioyidan topiş kerak{audioAvailable ? '' : ' (audio bo‘lmagani uçun transkriptdan)'}. Ba'zi
              savollarda iqtibos körsatiladi — qolgan qismi audioyada.
            </InfoBanner>
          </Card>
        ) : (
          <Card className="grid gap-3">
            <h3 className="font-bold text-lg">Natija</h3>
            <p className="text-sm">
              {total} ta maşqdan {right.length} tasi to‘g‘ri — ball <b>{score}%</b>.
            </p>
            {wrong.length > 0 && (
              <div className="grid gap-2">
                <h4 className="font-semibold text-sm text-[var(--bad)]">Xatolar</h4>
                {wrong.map(({ index, result }) => (
                  <div key={`bad-${index}`} className="rounded-xl border border-rose-400/40 bg-rose-50 dark:bg-rose-900/15 p-3 text-sm">
                    <b>{task.exercises[index]?.instructionUz}</b>
                    <p className="mt-1">
                      Töğri javob: <b>{result.expected}</b> · sizda: {result.given || '—'}
                    </p>
                    <p className="mt-1 muted">{result.whyUz}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  setResults({})
                  setPos(0)
                  setShowResults(false)
                }}
              >
                Maşqlarni qayta bajariş
              </Button>
              <Button variant="secondary" onClick={() => setShowResults(false)} disabled={answeredList.length >= total}>
                Maşqqa qaytiş
              </Button>
            </div>
          </Card>
        )}
      </section>
    </div>
  )
}

/* ---------------------------- audio pleyer ---------------------------- */

const SPEEDS = [0.75, 1, 1.25]

function AudioPlayer({
  src,
  durationHintSec,
  onFirstListen,
  offline,
}: {
  src: string
  durationHintSec: number
  onFirstListen: () => void
  offline: boolean
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(durationHintSec)
  const [rate, setRate] = useState(1)
  const [loadError, setLoadError] = useState<string | null>(null)
  const playedRef = useRef(false)

  const toggle = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    if (el.paused) {
      void el.play().then(() => setPlaying(true)).catç(() => setLoadError("Audio boşlanmadi — fayl buzilgan yoki offline bölişi mumkin."))
    } else {
      el.pause()
      setPlaying(false)
    }
  }, [])

  const seekBy = useCallback((delta: number) => {
    const el = audioRef.current
    if (!el) return
    el.currentTime = Math.max(0, Math.min(el.duration || duration, el.currentTime + delta))
  }, [duration])

  // Space — pleyer tugmasi (input/tugma focus bölmasa).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.metaKey || e.ctrlKey || e.altKey) return
      const el = document.activeElement
      if (el && /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(el.tagName)) return
      e.preventDefault()
      toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])

  return (
    <Card as="section" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">Audio</h2>
        <div className="flex flex-wrap gap-1.5">
          {offline && <Chip tone="bad">Offline — audio keşlanmagan</Chip>}
          <Chip>tezkorlik: {rate}×</Chip>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration
          if (Number.isFinite(d) && d > 0) setDuration(d)
        }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onPlay={() => {
          setPlaying(true)
          setLoadError(null)
          if (!playedRef.current) {
            playedRef.current = true
            onFirstListen()
          }
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false)
          if (!playedRef.current) {
            playedRef.current = true
            onFirstListen()
          }
        }}
        onError={() => setLoadError('Audio yuklanmadi — fayl mavjud emas yoki offline rejimdasiz.')}
      />

      <div className="grid gap-2">
        <input
          type="range"
          min={0}
          max={Math.max(1, Math.round(duration))}
          step={1}
          value={Math.min(Math.round(time), Math.max(1, Math.round(duration)))}
          aria-label="Audio joylaşuvi"
          onChange={(e) => {
            const el = audioRef.current
            if (!el) return
            el.currentTime = Number(e.target.value)
            setTime(Number(e.target.value))
          }}
          className="w-full accent-[var(--accent)]"
        />
        <div className="flex items-center justify-between text-[11px] muted tabular-nums">
          <span>{fmtClock(time)}</span>
          <span>{fmtClock(duration)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={toggle} aria-label={playing ? "Pauza" : "Boşlaş"}>
          {playing ? 'Pauza' : 'Eşitiş'}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => seekBy(-5)} title="5 sekund orqaga">
          −5s
        </Button>
        <Button variant="secondary" size="sm" onClick={() => seekBy(5)} title="5 sekund oldinga">
          +5s
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            const el = audioRef.current
            if (!el) return
            el.currentTime = 0
            setTime(0)
            void el.play().catç(() => setLoadError('Audio boşlanmadi.'))
          }}
          title="Boşidan eşitiş"
        >
          Boşidan
        </Button>
        <label className="flex items-center gap-1.5 text-xs">
          <span className="muted font-semibold">Tezkorlik</span>
          <select
            className="rounded-lg border bg-[var(--panel)] px-2 py-1.5 text-sm"
            value={rate}
            onChange={(e) => {
              const v = Number(e.target.value)
              setRate(v)
              const el = audioRef.current
              if (el) el.playbackRate = v
            }}
            aria-label="Audio tezligi"
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </label>
        <span className="text-[11px] muted">
          <Kbd>Space</Kbd> — boşlaş / pauza
        </span>
      </div>

      {loadError && <InfoBanner tone="warn">{loadError}</InfoBanner>}
    </Card>
  )
}

/* ------------------------------ yordamçi ------------------------------ */

const SOURCE_LABEL: Record<AudioAsset['source'], string> = {
  original: 'loyihada original yaratilgan',
  'public-domain': 'jamoat mulki',
  cc: 'CC lisenziyali taşqi manba',
  'generated-tts': 'sintez qilingan (rasmiy emas)',
  missing: 'audio yo‘q',
}

const POLICY_LABEL: Record<ListeningTask['transcriptPolicy'], string> = {
  always: 'har doim oçiq',
  'after-first-listen': 'bir marta tinglangaç',
  'never-until-çecked': 'maşqlar tekşirilgaç',
}

function fmtClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
