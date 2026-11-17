/**
 * Audio fayli yo'q tinglash topshirig'i (foydalanuvchi skrinshoti: A0 1-kun
 * «Audio fayl topilmadi — transkript bilan işlang», javob ekranda turardi).
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TranscriptAudio from '../components/TranscriptAudio'
import { speechText, splitSpeaker } from '../lib/speech'
import { getBundle, loadLevels, LOADED_LEVELS } from '../content'

interface Utter {
  text: string
  pitch: number
  onstart?: () => void
  onend?: () => void
}
let spoken: Utter[] = []

function installTts() {
  spoken = []
  class FakeUtterance {
    text: string
    rate = 1
    pitch = 1
    lang = ''
    voice: unknown = null
    onstart?: () => void
    onend?: () => void
    onerror?: () => void
    constructor(t: string) {
      this.text = t
    }
  }
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: { cancel: vi.fn(), getVoices: () => [], speak: (u: Utter) => spoken.push(u) },
  })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  // @ts-expect-error — test uchun olib tashlaymiz
  delete window.speechSynthesis
})

const transcript = [
  { start: 0, end: 4, text: 'Woman: And your surname?' },
  { start: 4, end: 9, text: 'Man: Usmonov. U-S-M-O-N-O-V.' },
]

describe('so‘zlovchi va harflab aytish', () => {
  it('rol nomi ajratiladi va aytilmaydi', () => {
    expect(splitSpeaker('Woman: Hello!')).toEqual({ speaker: 'Woman', text: 'Hello!' })
    expect(splitSpeaker('Shop assistant: How can I help you?')).toEqual({ speaker: 'Shop assistant', text: 'How can I help you?' })
    expect(splitSpeaker('Dr Yusupova: Good morning.').speaker).toBe('Dr Yusupova')
    expect(splitSpeaker('I wrote my first story at twelve.').speaker).toBeNull()
  })
  it('harflar alohida aytiladi', () => {
    expect(speechText('Usmonov. U-S-M-O-N-O-V.')).toBe('Usmonov. U, S, M, O, N, O, V.')
  })
  it('barcha darajalar: har transkript qatorida rol nomi ajraladi (ikki nuqtali qator qolmaydi)', async () => {
    await loadLevels()
    for (const l of LOADED_LEVELS)
      for (const t of getBundle(l).listening)
        for (const seg of t.audio.transcript) {
          const s = splitSpeaker(seg.text)
          if (!s.speaker) expect(seg.text, t.id).not.toMatch(/^[^.?!]{1,30}:\s/)
        }
  })
})

describe('TranscriptAudio — audio fayli yo‘q tinglash', () => {
  it('matn boshida yashirin, «Tinglaş» rollar bo‘yicha o‘qiydi, nom aytilmaydi', () => {
    installTts()
    render(<TranscriptAudio transcript={transcript} title="Library" />)
    expect(screen.queryByText(/U-S-M-O-N-O-V/)).toBeNull()
    expect(screen.getByText(/qurilmangizning nutq sintezi/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Tinglaş: Library/ }))
    expect(spoken.map((u) => u.text)).toEqual(['And your surname?', 'Usmonov. U, S, M, O, N, O, V.'])
    expect(spoken[0]!.pitch).toBeGreaterThan(spoken[1]!.pitch) // ayol va erkak ovozi farqli
    fireEvent.click(screen.getByRole('button', { name: 'Matnni körsatiş' }))
    expect(screen.getByText(/U-S-M-O-N-O-V/)).toBeTruthy()
  })
  it('nutq sintezi bo‘lmasa — transkript ochiq (ishlamaydigan tugma yo‘q)', () => {
    render(<TranscriptAudio transcript={transcript} title="Library" />)
    expect(screen.queryByRole('button', { name: /Tinglaş/ })).toBeNull()
    expect(screen.getByText(/U-S-M-O-N-O-V/)).toBeTruthy()
  })
})
