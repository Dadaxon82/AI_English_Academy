/** Virtual joystik (sensorli ekran): barmoq bilan suriladi, qo'yib yuborilsa — to'xtaydi. */
import { useRef, useState, type PointerEvent } from 'react'
import type { Controls } from './controls'

const R = 44

export default function Joystick({ ctrl }: { ctrl: Controls }) {
  const base = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState<[number, number]>([0, 0])
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = base.current
    if (!el || e.buttons === 0) return
    const r = el.getBoundingClientRect()
    let x = e.clientX - (r.left + r.width / 2)
    let y = e.clientY - (r.top + r.height / 2)
    const d = Math.hypot(x, y)
    if (d > R) {
      x = (x / d) * R
      y = (y / d) * R
    }
    setKnob([x, y])
    ctrl.setJoy(x / R, -y / R)
  }
  const end = () => {
    setKnob([0, 0])
    ctrl.setJoy(0, 0)
  }
  return (
    <div
      ref={base}
      className="absolute bottom-3 left-3 z-10 h-28 w-28 touch-none rounded-full border border-white/50 bg-white/25 backdrop-blur-md"
      role="application"
      aria-label="Joystik: qahramonni yurgiziş"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        move(e)
      }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <span
        className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/85 shadow-lg"
        style={{ marginLeft: knob[0], marginTop: knob[1] }}
      />
    </div>
  )
}
