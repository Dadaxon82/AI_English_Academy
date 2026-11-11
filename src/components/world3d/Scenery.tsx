/**
 * Orol manzarasi: suv, yashil orol, tosh yo'lak, daraxtlar, butalar.
 * Takrorlanuvchi shakllar InstancedMesh bilan (bitta chizish chaqiruvi) — 60 FPS uchun.
 */
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Color, Object3D, type InstancedMesh, type Mesh } from 'three'
import { ISLAND, pathPoints } from '../../lib/world3d'

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Yo'l bo'ylab teng oraliqli toshlar. */
function stones(): { p: [number, number]; seg: number }[] {
  const pts = pathPoints()
  const out: { p: [number, number]; seg: number }[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!
    const b = pts[i + 1]!
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    const n = Math.max(2, Math.round(len / 1.05))
    for (let k = 1; k < n; k++) {
      const t = k / n
      // ozgina egri — yo'l to'g'ri chiziq bo'lib qolmasin
      const bend = Math.sin(t * Math.PI) * (i % 2 === 0 ? 0.9 : -0.9)
      const nx = -(b[1] - a[1]) / len
      const nz = (b[0] - a[0]) / len
      out.push({ p: [a[0] + (b[0] - a[0]) * t + nx * bend, a[1] + (b[1] - a[1]) * t + nz * bend], seg: i })
    }
  }
  return out
}

export function PathStones({ reached }: { reached: number }) {
  const ref = useRef<InstancedMesh>(null)
  const list = useMemo(() => stones(), [])
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new Object3D()
    const gold = new Color('#fbbf24')
    const plain = new Color('#e7dcc3')
    list.forEach((s, i) => {
      o.position.set(s.p[0], 0.05, s.p[1])
      o.rotation.set(0, i * 1.7, 0)
      o.scale.setScalar(0.85 + ((i * 37) % 10) / 40)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      m.setColorAt(i, s.seg < reached ? gold : plain)
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [list, reached])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, list.length]}>
      <cylinderGeometry args={[0.42, 0.46, 0.1, 7]} />
      <meshStandardMaterial flatShading />
    </instancedMesh>
  )
}

export function Trees({ avoid }: { avoid: readonly [number, number][] }) {
  const trunks = useRef<InstancedMesh>(null)
  const crowns = useRef<InstancedMesh>(null)
  const bushes = useRef<InstancedMesh>(null)
  const spots = useMemo(() => {
    const r = rng(20261111)
    const road = stones().map((s) => s.p)
    const out: { x: number; z: number; s: number; bush: boolean }[] = []
    let guard = 0
    while (out.length < 64 && guard++ < 4000) {
      const x = (r() * 2 - 1) * ISLAND.rx
      const z = (r() * 2 - 1) * ISLAND.rz
      if ((x * x) / (ISLAND.rx * ISLAND.rx) + (z * z) / (ISLAND.rz * ISLAND.rz) > 0.86) continue
      if (road.some((p) => Math.hypot(p[0] - x, p[1] - z) < 2.3)) continue
      if (avoid.some((p) => Math.hypot(p[0] - x, p[1] - z) < 4.4)) continue
      if (out.some((p) => Math.hypot(p.x - x, p.z - z) < 1.3)) continue
      out.push({ x, z, s: 0.55 + r() * 0.45, bush: r() < 0.3 })
    }
    return out
  }, [avoid])
  const trees = useMemo(() => spots.filter((s) => !s.bush), [spots])
  const low = useMemo(() => spots.filter((s) => s.bush), [spots])

  useLayoutEffect(() => {
    const o = new Object3D()
    const greens = ['#16a34a', '#22c55e', '#15803d', '#4ade80'].map((c) => new Color(c))
    trees.forEach((t, i) => {
      o.rotation.set(0, i, 0)
      o.position.set(t.x, 0.45 * t.s, t.z)
      o.scale.setScalar(t.s)
      o.updateMatrix()
      trunks.current?.setMatrixAt(i, o.matrix)
      o.position.set(t.x, 1.75 * t.s, t.z)
      o.updateMatrix()
      crowns.current?.setMatrixAt(i, o.matrix)
      crowns.current?.setColorAt(i, greens[i % greens.length]!)
    })
    low.forEach((t, i) => {
      o.rotation.set(0, i, 0)
      o.position.set(t.x, 0.3 * t.s, t.z)
      o.scale.setScalar(t.s)
      o.updateMatrix()
      bushes.current?.setMatrixAt(i, o.matrix)
    })
    for (const m of [trunks.current, crowns.current, bushes.current]) {
      if (!m) continue
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
  }, [trees, low])

  return (
    <>
      <instancedMesh ref={trunks} args={[undefined, undefined, trees.length]}>
        <cylinderGeometry args={[0.16, 0.22, 0.9, 6]} />
        <meshStandardMaterial color="#92400e" flatShading />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, trees.length]}>
        <coneGeometry args={[0.95, 2.1, 7]} />
        <meshStandardMaterial flatShading />
      </instancedMesh>
      <instancedMesh ref={bushes} args={[undefined, undefined, low.length]}>
        <icosahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial color="#65a30d" flatShading />
      </instancedMesh>
    </>
  )
}

export function Island({ onGround }: { onGround: (x: number, z: number) => void }) {
  const water = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (water.current) water.current.position.y = -0.55 + Math.sin(clock.elapsedTime * 0.8) * 0.04
  })
  const down = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onGround(e.point.x, e.point.z)
  }
  return (
    <>
      <mesh ref={water} rotation-x={-Math.PI / 2} position-y={-0.55}>
        <circleGeometry args={[90, 40]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.35} metalness={0.1} />
      </mesh>
      {/* qum qirg'oq */}
      <mesh position-y={-0.42} scale={[ISLAND.rx + 1.6, 1, ISLAND.rz + 1.6]}>
        <cylinderGeometry args={[1, 1.04, 0.6, 48]} />
        <meshStandardMaterial color="#fde68a" flatShading />
      </mesh>
      {/* yashil orol — bosilsa qahramon o'sha yerga boradi */}
      <mesh position-y={-0.3} scale={[ISLAND.rx + 0.5, 1, ISLAND.rz + 0.5]} onPointerDown={down}>
        <cylinderGeometry args={[1, 1.02, 0.6, 48]} />
        <meshStandardMaterial color="#86efac" flatShading />
      </mesh>
    </>
  )
}

/** Bosilgan nuqta belgisi. */
export function TargetRing({ getTarget }: { getTarget: () => [number, number] | null }) {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    const m = ref.current
    if (!m) return
    const t = getTarget()
    m.visible = t !== null
    if (t) {
      m.position.set(t[0], 0.06, t[1])
      m.scale.setScalar(1 + Math.sin(clock.elapsedTime * 6) * 0.12)
    }
  })
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} visible={false}>
      <ringGeometry args={[0.32, 0.45, 24]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
    </mesh>
  )
}
