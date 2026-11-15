/** Guvohnoma rasmini `<canvas>`ga chizish (brauzerda; tarmoq kerak emas). */

import { CERTIFICATE_DISCLAIMER_UZ, type CertificateInfo } from './certificate'
import { levelLabel } from './skillScoring'

export function drawCertificate(canvas: HTMLCanvasElement, info: CertificateInfo, name: string, dateUz: string): boolean {
  const ctx = canvas.getContext('2d')
  if (!ctx) return false
  const W = 1600
  const H = 1130
  canvas.width = W
  canvas.height = H
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#1e3a8a'
  ctx.lineWidth = 14
  ctx.strokeRect(40, 40, W - 80, H - 80)
  ctx.lineWidth = 3
  ctx.strokeRect(70, 70, W - 140, H - 140)
  ctx.textAlign = 'center'
  ctx.fillStyle = '#1e3a8a'
  ctx.font = 'bold 40px sans-serif'
  ctx.fillText('AI English Academy', W / 2, 170)
  ctx.fillStyle = '#0f172a'
  ctx.font = 'bold 72px sans-serif'
  ctx.fillText('Yakunlaş guvohnomasi', W / 2, 280)
  ctx.font = '34px sans-serif'
  ctx.fillText('Uşbu guvohnoma egasi', W / 2, 370)
  // Uzun ism ramkadan chiqmasin: sig'guncha shrift kichraytiriladi.
  const shown = name || 'Öquvçi'
  let size = 64
  ctx.font = `bold ${size}px sans-serif`
  while (size > 28 && ctx.measureText(shown).width > W - 260) {
    size -= 4
    ctx.font = `bold ${size}px sans-serif`
  }
  ctx.fillText(shown, W / 2, 460)
  ctx.font = '34px sans-serif'
  ctx.fillText(`${info.level} — ${levelLabel(info.level).titleUz} darajasi öquv yölini yakunladi`, W / 2, 545)
  ctx.font = '30px sans-serif'
  ctx.fillStyle = '#334155'
  const lines = [
    `${info.daysDone}/${info.daysTotal} kun · ${info.attempts} ta maşq${info.accuracy === null ? '' : ` · aniqlik ${info.accuracy}%`}`,
    `${info.wordsLearned} ta söz özlaştirildi · «Men qila olaman»: ${info.canDoConfirmed}/${info.canDoTotal} natija bilan tasdiqlangan`,
    `Sana: ${dateUz}`,
  ]
  lines.forEach((l, i) => ctx.fillText(l, W / 2, 640 + i * 52))
  ctx.fillStyle = '#b91c1c'
  ctx.font = 'bold 26px sans-serif'
  // Ogohlantirish ikki qatorga bo'linadi (rasmda to'liq ko'rinsin).
  const words = CERTIFICATE_DISCLAIMER_UZ.split(' ')
  const half = Math.ceil(words.length / 2)
  ctx.fillText(words.slice(0, half).join(' '), W / 2, 930)
  ctx.fillText(words.slice(half).join(' '), W / 2, 968)
  return true
}
