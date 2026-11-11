/**
 * Stansiya: rangli uycha, oldida darvoza (qulf bo'lsa — panjara), yonida NPC,
 * tepasida bayroq va (yakunlangan bo'lsa) yulduzlar, ustida yorliq.
 */
import { useRef } from 'react'
import { Sparkles } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Vector3, type Group, type Mesh } from 'three'
import type { StationState } from '../../lib/world3d'
import Label from './Label'

const tmp = new Vector3()

export function Npc({ color, getPlayer }: { color: string; getPlayer: () => [number, number] }) {
  const ref = useRef<Group>(null)
  useFrame(({ clock }) => {
    const g = ref.current
    if (!g) return
    g.position.y = Math.sin(clock.elapsedTime * 2.2 + g.position.x) * 0.04
    // NPC qahramonga qarab turadi
    const p = getPlayer()
    g.getWorldPosition(tmp)
    g.rotation.y = Math.atan2(p[0] - tmp.x, p[1] - tmp.z)
  })
  return (
    <group ref={ref} position={[1.55, 0, 1.7]}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
        <circleGeometry args={[0.42, 16]} />
        <meshBasicMaterial color="#000" transparent opacity={0.2} />
      </mesh>
      <mesh position-y={0.7}>
        <capsuleGeometry args={[0.3, 0.6, 6, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position-y={1.45}>
        <sphereGeometry args={[0.3, 18, 14]} />
        <meshStandardMaterial color="#f5d0a9" />
      </mesh>
      <mesh position={[-0.1, 1.5, 0.27]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#1f2937" />
      </mesh>
      <mesh position={[0.1, 1.5, 0.27]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#1f2937" />
      </mesh>
      <mesh position-y={1.78}>
        <coneGeometry args={[0.34, 0.3, 12]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
    </group>
  )
}

/** Darvoza: ikki ustun + to'sin; qulf bo'lsa — panjara. */
export function Gate({ state, color, width = 1.5 }: { state: StationState; color: string; width?: number }) {
  const bars = [-0.45, -0.15, 0.15, 0.45].map((k) => k * width)
  return (
    <group position={[0, 0, 1.75]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * width) / 2 + s * 0.12, 0.95, 0]}>
          <boxGeometry args={[0.24, 1.9, 0.24]} />
          <meshStandardMaterial color="#f8fafc" flatShading />
        </mesh>
      ))}
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[width + 0.7, 0.26, 0.3]} />
        <meshStandardMaterial color={state === 'locked' ? '#94a3b8' : color} flatShading />
      </mesh>
      {state === 'locked' &&
        bars.map((x) => (
          <mesh key={x} position={[x, 0.95, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 1.9, 6]} />
            <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.4} />
          </mesh>
        ))}
    </group>
  )
}

export function Stars({ count, y }: { count: number; y: number }) {
  const ref = useRef<Group>(null)
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 1.2
  })
  if (count <= 0) return null
  return (
    <group ref={ref} position-y={y}>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} position={[(i - (count - 1) / 2) * 0.6, 0, 0]}>
          <octahedronGeometry args={[0.22, 0]} />
          <meshStandardMaterial color="#fde047" emissive="#f59e0b" emissiveIntensity={0.6} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function Flag({ color }: { color: string }) {
  const cloth = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (cloth.current) cloth.current.rotation.y = Math.sin(clock.elapsedTime * 3) * 0.35
  })
  return (
    <group position={[-1.2, 0, -0.2]}>
      <mesh position-y={2.2}>
        <cylinderGeometry args={[0.04, 0.04, 4.4, 6]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      <mesh ref={cloth} position={[0.4, 4, 0]}>
        <boxGeometry args={[0.8, 0.5, 0.03]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
}

export default function StationNode({
  index,
  label,
  color,
  state,
  stars,
  position,
  isTarget,
  getPlayer,
  onPick,
}: {
  index: number
  label: string
  color: string
  state: StationState
  stars: number
  position: [number, number]
  isTarget: boolean
  getPlayer: () => [number, number]
  onPick: () => void
}) {
  const tint = state === 'locked' ? '#cbd5e1' : color
  const pick = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onPick()
  }
  return (
    <group position={[position[0], 0, position[1]]} onPointerDown={pick}>
      <mesh position-y={0.06}>
        <cylinderGeometry args={[2.5, 2.7, 0.14, 24]} />
        <meshStandardMaterial color={state === 'done' ? '#fde68a' : '#f1f5f9'} flatShading />
      </mesh>
      {/* uycha */}
      <mesh position-y={0.95}>
        <boxGeometry args={[2.1, 1.7, 1.9]} />
        <meshStandardMaterial color={tint} flatShading />
      </mesh>
      <mesh position-y={2.35} rotation-y={Math.PI / 4}>
        <coneGeometry args={[1.85, 1.2, 4]} />
        <meshStandardMaterial color={state === 'locked' ? '#94a3b8' : '#1e293b'} flatShading />
      </mesh>
      <mesh position={[0, 0.7, 0.96]}>
        <boxGeometry args={[0.6, 1.1, 0.06]} />
        <meshStandardMaterial color="#78350f" />
      </mesh>
      <Gate state={state} color={color} />
      <Flag color={tint} />
      <Npc color={state === 'locked' ? '#94a3b8' : color} getPlayer={getPlayer} />
      <Stars count={stars} y={4.55} />
      {isTarget && <Sparkles count={24} scale={[4.5, 3, 4.5]} position-y={1.8} size={5} speed={0.6} color="#fde047" />}
      <Label y={3.75} text={`${state === 'locked' ? '🔒' : state === 'done' ? '✅' : '▶'} ${index + 1}. ${label}`} />
    </group>
  )
}
