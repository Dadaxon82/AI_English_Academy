/**
 * Speaking — mikrofon orqali yozish, transkripsiya, tahlil.
 *
 * Talablar: mikrofon ruxsat holatini tekshirish; yozishni boshlash/
 * tugatish/qayta eshitish; transkripsiya mavjud bo'lsa nutqni matnga
 * aylantirish; ovoz foydalanuvchi roziligisiz serverga yuborilmaydi;
 * audio ishlamasa matnli muqobil usul; baho rasmiy imtihon natijasi
 * emasligi ko'rsatiladi.
 */

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Card, Chip, EmptyState, InfoBanner, LoadingBlock, SuccessBanner } from '../components/ui'
import { useStore } from '../lib/store'
import { getBundle } from '../content'
import { formatDuration } from '../lib/timer'
import type { SpeakingTask } from '../content/types'

type RecState = 'idle' | 'recording' | 'ready' | 'denied' | 'unsupported'

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null
  onerror: ((e: { error?: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

type RecognizerCtor = new () => SpeechRecognitionLike

function getRecognizer(): RecognizerCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognizerCtor; webkitSpeechRecognition?: RecognizerCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export default function Speaking() {
  const { data, actions, ready } = useStore()
  const [params, setParams] = useSearchParams()
  const bundle = getBundle(data.settings.currentLevel)
  const tasks: SpeakingTask[] = [
    ...bundle.speaking,
    ...(bundle.mockExam?.sections.flatMap((s) => (s.speakingTask ? [s.speakingTask] : [])) ?? []),
  ]
  const selectedId = params.get('task') ?? tasks[0]?.id ?? ''
  const task = tasks.find((t) => t.id === selectedId)

  const [recState, setRecState] = useState<RecState>('idle')
  const [seconds, setSeconds] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [transcript, setTranscript] = useState('')
  const [textAnswer, setTextAnswer] = useState('')
  const [engineUsed, setEngineUsed] = useState<'browser-speech' | 'none'>('none')
  const [recError, setRecError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const urlRef = useRef<string | null>(null)

  useEffect(
    () => () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      recognitionRef.current?.stop()
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    [],
  )

  // Foydalanuvchi roziligi faqat yozishni bosganda so'raladi.
  const startRecording = async () => {
    setSaved(false)
    setTranscript('')
    setRecError(null)

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setRecState('unsupported')
      setRecError('Bu brauzer audio yozishni qo‘llab-quvvatlamaydi — matnli usuldan foydalaning.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data)
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
        const url = URL.createObjectURL(blob)
        if (urlRef.current) URL.revokeObjectURL(urlRef.current)
        urlRef.current = url
        setAudioUrl(url)
        stream.getTracks().forEach((t) => t.stop())
      }
      rec.start()
      recorderRef.current = rec
      setRecState('recording')
      setSeconds(0)
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000)

      // Transkripsiya: brauzer qo'llasa ishlatiladi, aks holda "mavjud emas".
      const Ctor = getRecognizer()
      if (Ctor) {
        const r = new Ctor()
        r.lang = 'en-US'
        r.continuous = true
        r.interimResults = true
        r.onresult = (e) => {
          let final = ''
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const res = e.results[i]
            if (res?.isFinal) final += res[0].transcript + ' '
          }
          if (final) setTranscript((t) => (t + ' ' + final).trim())
        }
        r.onerror = (e) => {
          if (e.error === 'not-allowed') setRecError('Mikrofon ruxsati berthlmadi — matnli usulni ishlating.')
          else if (e.error === 'no-speech') setRecError('Ovoz eshitilmadi. Mikrofonni tekshiring.')
        }
        r.onend = () => {
          setEngineUsed((cur) => (cur === 'none' ? 'none' : cur))
        }
        recognitionRef.current = r
        setEngineUsed('browser-speech')
        try {
          r.start()
        } catch {
          setEngineUsed('none')
        }
      } else {
        setEngineUsed('none')
      }
    } catch {
      setRecState('denied')
      setRecError('Mikrofonga ruxsat berthlmadi. Brauzer sozlamalaridan ruxsat bering yoki matnli usuldan foydalaning.')
    }
  }

  const stopRecording = () => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    recorderRef.current?.stop()
    recorderRef.current = null
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setRecState('ready')
  }

  if (!ready) return <LoadingBlock label="Gapirish ma'lumotlari yuklanmoqda…" />

  if (tasks.length === 0) {
    return <EmptyState title="Gapirish topshiriqlari topilmadi" body="Ushbu daraja uchun kontent hali yuklanmagan." />
  }

  const history = data.speaking.filter((s) => s.taskId === selectedId)
  const canRecordButDenied = recState === 'denied' || recState === 'unsupported'

  return (
    <div className="grid gap-4">
      <Card className="grid gap-3">
        <h1 className="text-xl font-bold">G‘apirish</h1>
        <p className="muted text-sm">
          Kunlik mavzu va savollar. Ovoz yozuvi faqat shu brauzer seansida turadi (sahifa yopilsa o‘chadi) —
          roziligingizsiz serverga hech qachon yuborilmaydi.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {tasks.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={selectedId === t.id}
              onClick={() => {
                setParams({ task: t.id })
                setAudioUrl(null)
                setTranscript('')
                setRecState('idle')
              }}
              className={`chip cursor-pointer ${selectedId === t.id ? '!border-[var(--accent)] !text-[var(--accent)] font-bold' : ''}`}
            >
              {t.level} · {t.topicUz}
            </button>
          ))}
        </div>
      </Card>

      {task && (
        <Card className="grid gap-4">
          <div>
            <Chip tone="brand">{task.topicUz}</Chip>
            <p className="mt-2 text-base font-medium">{task.questionEn}</p>
            {task.hintUz && <p className="text-sm muted mt-1">{task.hintUz}</p>}
          </div>

          <div className="rounded-xl bg-[var(--panel-2)] p-3.5 grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {recState !== 'recording' ? (
                <Button onClick={() => void startRecording()} disabled={false}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <circle cx="12" cy="12" r="7" />
                  </svg>
                  Yozishni boshlash
                </Button>
              ) : (
                <Button variant="danger" onClick={stopRecording}>
                  To‘xtatish ({formatDuration(seconds)})
                </Button>
              )}
              {recState === 'recording' && <span className="text-xs text-[var(--bad)] animate-pulse">● Yozilmoqda…</span>}
              {engineUsed === 'browser-speech' && recState === 'recording' && <Chip tone="ok">Transkripsiya faol</Chip>}
              {engineUsed === 'none' && recState === 'recording' && <Chip tone="warn">Transkripsiya mavjud emas</Chip>}
            </div>

            {audioUrl && (
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold muted">Yozuvni qayta tinglash</label>
                <audio src={audioUrl} controls className="w-full" />
              </div>
            )}

            {recError && <InfoBanner tone="warn">{recError}</InfoBanner>}
            {canRecordButDenied && <InfoBanner tone="warn">Mikrofon mavjud emas — quyidagi matnli maydondan foydalaning.</InfoBanner>}

            <div className="flex flex-wrap gap-2 text-xs muted">
              <span>Maqsad: {task.targetSeconds}s (kamida {task.minSeconds}s)</span>
              <span>Hozir: {formatDuration(seconds)}</span>
              {engineUsed === 'browser-speech' && <Chip tone="ok">Transkripsiya: brauzer</Chip>}
            </div>

            {transcript && (
              <div>
                <div className="text-xs font-semibold muted mb-1">Transkript (avtomatik)</div>
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border bg-[var(--panel)] p-3 text-sm"
                  aria-label="Transkript"
                />
              </div>
            )}

            <div>
              <div className="text-xs font-semibold muted mb-1">
                Matnli javob {transcript ? '(qo‘shimcha)' : '(muqobil usul)'}
              </div>
              <textarea
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                rows={4}
                placeholder={task.textAlternative}
                className="w-full rounded-xl border bg-[var(--panel)] p-3 text-sm"
                aria-label="Matnli javob"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {recState === 'ready' && (
                <Button variant="ghost" onClick={() => void startRecording()}>
                  Qayta yozish
                </Button>
              )}
              {/* BUG: transkript bo'lmasa tugma o'chib qolardi — brauzeri
                  transkripsiyani qo'llab-quvvatlamasa (Firefox) yozib
                  olingan audio butunlay yo'qolardi. Endi yozuv bo'lsa ham
                  saqlanadi. */}
              <Button
                variant="secondary"
                disabled={!transcript && !textAnswer && recState !== 'ready'}
                onClick={() => {
                  actions.addSpeaking({
                    taskId: task.id,
                    transcript: transcript || null,
                    engine: engineUsed === 'browser-speech' ? 'browser-speech' : 'none',
                    durationSec: seconds,
                    audioStored: Boolean(audioUrl),
                    textAnswer: textAnswer || null,
                  })
                  setSaved(true)
                }}
              >
                Saqlash va tahlil
              </Button>
            </div>

            {saved && <SuccessBanner>Yozuv saqlandi va tahlil qilindi (pastda).</SuccessBanner>}
          </div>

          <LastAttempts history={history} />
        </Card>
      )}
    </div>
  )
}

function LastAttempts({ history }: { history: ReturnType<typeof useStore>['data']['speaking'] }) {
  if (history.length === 0) {
    return <EmptyState title="Tarix bo'sh" body="Birinchi javobingizni yozing — statistika shu yerda paydo bo'ladi." />
  }
  return (
    <Card className="grid gap-3">
      <h2 className="font-bold">Bu mavzudagi javoblar</h2>
      {[...history].reverse().map((s) => (
        <div key={s.id} className="rounded-xl border p-3 grid gap-2">
          <div className="flex flex-wrap gap-2 text-xs">
            <Chip>{s.durationSec}s</Chip>
            <Chip>{s.transcriptionEngine === 'browser-speech' ? 'Brauzer transkripsiyasi' : 'Transkripsiya yo‘q'}</Chip>
            <Chip tone={s.audioBlobStored ? 'ok' : 'default'}>{s.audioBlobStored ? 'Ovoz qurilmada' : 'Ovoz saqlanmagan'}</Chip>
          </div>
          {s.transcript && <p className="text-sm italic">“{s.transcript}”</p>}
          {s.textAnswer && <p className="text-sm whitespace-pre-wrap">{s.textAnswer}</p>}
          {s.analysis && (
            <div className="grid sm:grid-cols-4 gap-2 text-center">
              {(
                [
                  ['Ravonlik', s.analysis.fluency],
                  ['Lug‘at', s.analysis.lexis],
                  ['Grammatika', s.analysis.grammar],
                  ['Davomiylik', s.analysis.length],
                ] as const
              ).map(([label, v]) => (
                <div key={label} className="rounded-lg bg-[var(--panel-2)] p-2">
                  <div className="text-[10px] muted">{label}</div>
                  <div className="font-bold tabular-nums">{v}/5</div>
                </div>
              ))}
            </div>
          )}
          {s.analysis && (
            <>
              <ul className="text-sm list-disc pl-5">
                {s.analysis.notesUz.map((n) => <li key={n}>{n}</li>)}
              </ul>
              <p className="text-[11px] muted">{s.analysis.disclaimerUz}</p>
            </>
          )}
        </div>
      ))}
    </Card>
  )
}
