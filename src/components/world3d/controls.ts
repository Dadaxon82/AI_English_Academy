/**
 * 3D olam boshqaruvi — React holatidan TASHQARIDA (har kadrda o'qiladi, render chaqirmaydi).
 * Klaviatura, virtual joystik va «bosib yurish» shu bitta obyektga yozadi.
 */
import { clampToIsland } from '../../lib/world3d'

/** To'siq: bino markazi (x, z) va radiusi */
export type Solid = [number, number, number]

export const SPEED = 6.2

export class Controls {
  readonly keys = new Set<string>()
  /** Joystik: -1..1 (x — o'ngga, y — oldinga/ekran tepasiga) */
  readonly joy = { x: 0, y: 0 }
  /** Bosilgan nuqta (x, z) — qahramon o'sha yerga boradi */
  target: [number, number] | null = null
  /** Qahramonning joriy o'rni */
  readonly pos: [number, number]
  moving = false
  /** Qaragan yo'nalishi (radian) */
  heading = 0
  /** Suhbat ochiq — harakat to'xtaydi */
  paused = false

  constructor(spawn: [number, number]) {
    this.pos = [spawn[0], spawn[1]]
  }

  setJoy(x: number, y: number): void {
    this.joy.x = x
    this.joy.y = y
  }

  walkTo(p: [number, number] | null): void {
    if (!this.paused) this.target = p ? clampToIsland(p[0], p[1]) : null
  }

  setPaused(v: boolean): void {
    this.paused = v
    if (v) {
      this.keys.clear()
      this.setJoy(0, 0)
    }
  }

  /** Bir kadr: yo'nalish (klaviatura/joystik yoki bosilgan nuqta), to'siqlar, orol chegarasi. */
  step(dt: number, solids: readonly Solid[]): void {
    let [dx, dz] = this.paused ? [0, 0] : inputDirection(this)
    if (dx !== 0 || dz !== 0) this.target = null
    else if (this.target && !this.paused) {
      const tx = this.target[0] - this.pos[0]
      const tz = this.target[1] - this.pos[1]
      const d = Math.hypot(tx, tz)
      if (d < 0.15) this.target = null
      else {
        dx = tx / d
        dz = tz / d
      }
    }
    this.moving = dx !== 0 || dz !== 0
    if (!this.moving) return
    let x = this.pos[0] + dx * SPEED * dt
    let z = this.pos[1] + dz * SPEED * dt
    for (const s of solids) {
      const ox = x - s[0]
      const oz = z - s[1]
      const d = Math.hypot(ox, oz)
      if (d < s[2] && d > 0.0001) {
        x = s[0] + (ox / d) * s[2]
        z = s[1] + (oz / d) * s[2]
      }
    }
    ;[x, z] = clampToIsland(x, z)
    // To'siqqa tiralib qolsa — bosilgan nuqtadan voz kechamiz (joyida depsinmasin)
    if (this.target && Math.hypot(x - this.pos[0], z - this.pos[1]) < SPEED * dt * 0.2) this.target = null
    this.pos[0] = x
    this.pos[1] = z
    const want = Math.atan2(dx, dz)
    const diff = Math.atan2(Math.sin(want - this.heading), Math.cos(want - this.heading))
    this.heading += diff * Math.min(1, dt * 12)
  }
}

export function createControls(spawn: [number, number]): Controls {
  return new Controls(spawn)
}

const MOVE_KEYS: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
}

export function isMoveKey(code: string): boolean {
  return code in MOVE_KEYS
}

/** Klaviatura + joystikdan yo'nalish (x, z), uzunligi ≤ 1. */
export function inputDirection(c: Pick<Controls, 'keys' | 'joy'>): [number, number] {
  let x = c.joy.x
  let z = -c.joy.y
  for (const k of c.keys) {
    const d = MOVE_KEYS[k]
    if (d) {
      x += d[0]
      z += d[1]
    }
  }
  const len = Math.hypot(x, z)
  return len > 1 ? [x / len, z / len] : [x, z]
}

const POS_KEY = 'aea-world-pos'

export function loadPos(dayId: string): [number, number] | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(POS_KEY) ?? 'null') as { d?: string; x?: number; z?: number } | null
    return v && v.d === dayId && typeof v.x === 'number' && typeof v.z === 'number' ? [v.x, v.z] : null
  } catch {
    return null
  }
}

export function savePos(dayId: string, pos: [number, number]): void {
  try {
    sessionStorage.setItem(POS_KEY, JSON.stringify({ d: dayId, x: pos[0], z: pos[1] }))
  } catch {
    /* keyingi safar boshlanish nuqtasidan */
  }
}
