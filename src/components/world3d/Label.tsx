/**
 * Sahnadagi yorliq — CanvasTexture'li sprite (tashqi shrift yuklanmaydi, CSP buzilmaydi).
 * Tekstura komponent olib tashlanganda bo'shatiladi.
 */
import { useEffect, useMemo } from 'react'
import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three'

export default function Label({ text, y, bg = 'rgba(15,23,42,0.82)', height = 0.62 }: { text: string; y: number; bg?: string; height?: number }) {
  const { tex, aspect } = useMemo(() => {
    const c = document.createElement('canvas')
    const g = c.getContext('2d')!
    const font = '700 44px Inter, system-ui, "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
    g.font = font
    const w = Math.ceil(g.measureText(text).width) + 56
    c.width = w
    c.height = 76
    g.font = font
    g.fillStyle = bg
    g.beginPath()
    g.roundRect(2, 2, w - 4, 72, 36)
    g.fill()
    g.strokeStyle = 'rgba(255,255,255,0.6)'
    g.lineWidth = 3
    g.stroke()
    g.fillStyle = '#fff'
    g.textBaseline = 'middle'
    g.textAlign = 'center'
    g.fillText(text, w / 2, 40)
    const t = new CanvasTexture(c)
    t.colorSpace = SRGBColorSpace
    t.minFilter = LinearFilter
    return { tex: t, aspect: w / 76 }
  }, [text, bg])
  useEffect(() => () => tex.dispose(), [tex])
  return (
    <sprite position-y={y} scale={[height * aspect, height, 1]}>
      <spriteMaterial map={tex} transparent depthTest={false} />
    </sprite>
  )
}
