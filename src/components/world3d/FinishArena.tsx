/** Oltin «Finiş» qasri: to'rt minora, darvoza (qulf bo'lsa panjara), yakunlangach — aylanuvchi kubok. */
import { useRef } from 'react'
import { Float, Sparkles } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import type { Group } from 'three'
import type { StationState } from '../../lib/world3d'
import Label from './Label'
import { Gate, Npc, Signpost } from './StationNode'
import { useTex } from './texContext'

export function Trophy({ scale = 1 }: { scale?: number }) {
  const ref = useRef<Group>(null)
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 1.5
  })
  const gold = <meshStandardMaterial color="#facc15" metalness={0.75} roughness={0.25} emissive="#b45309" emissiveIntensity={0.25} />
  return (
    <group ref={ref} scale={scale}>
      <mesh position-y={0.12}>
        <cylinderGeometry args={[0.42, 0.5, 0.24, 16]} />
        <meshStandardMaterial color="#78350f" />
      </mesh>
      <mesh position-y={0.5}>
        <cylinderGeometry args={[0.08, 0.14, 0.55, 10]} />
        {gold}
      </mesh>
      <mesh position-y={1.05}>
        <cylinderGeometry args={[0.5, 0.2, 0.7, 18]} />
        {gold}
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.55, 1.1, 0]} rotation-y={Math.PI / 2} rotation-z={s * 0.2}>
          <torusGeometry args={[0.2, 0.05, 8, 14]} />
          {gold}
        </mesh>
      ))}
    </group>
  )
}

export default function FinishArena({
  state,
  position,
  isTarget,
  getPlayer,
  onPick,
}: {
  state: StationState
  position: [number, number]
  isTarget: boolean
  getPlayer: () => [number, number]
  onPick: () => void
}) {
  const tex = useTex()
  const wall = state === 'locked' ? '#9aa1a8' : '#f6c453'
  const roof = state === 'locked' ? '#7b838c' : '#b45309'
  const pick = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onPick()
  }
  return (
    <group position={[position[0], 0, position[1]]} onPointerDown={pick}>
      <mesh position-y={0.08} receiveShadow>
        <cylinderGeometry args={[4.2, 4.4, 0.16, 32]} />
        <meshStandardMaterial map={tex.stone} color={state === 'locked' ? '#b8bec5' : '#f3dc9a'} roughness={0.9} />
      </mesh>
      <mesh position-y={1.25} castShadow receiveShadow>
        <boxGeometry args={[3.4, 2.3, 2.4]} />
        <meshStandardMaterial map={tex.stone} bumpMap={tex.stone} bumpScale={2} color={wall} metalness={state === 'locked' ? 0 : 0.3} roughness={0.55} />
      </mesh>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <group key={`${sx}${sz}`} position={[sx * 1.9, 0, sz * 1.3]}>
            <mesh position-y={1.6} castShadow receiveShadow>
              <cylinderGeometry args={[0.55, 0.6, 3.2, 14]} />
              <meshStandardMaterial map={tex.stone} bumpMap={tex.stone} bumpScale={2} color={wall} metalness={state === 'locked' ? 0 : 0.3} roughness={0.55} />
            </mesh>
            <mesh position-y={3.75} castShadow>
              <coneGeometry args={[0.78, 1.15, 14]} />
              <meshStandardMaterial map={tex.slate} color={roof} roughness={0.8} />
            </mesh>
          </group>
        )),
      )}
      <mesh position={[0, 0.85, 1.21]}>
        <boxGeometry args={[0.95, 1.5, 0.06]} />
        <meshStandardMaterial map={tex.planks} color="#6b4423" roughness={0.9} />
      </mesh>
      <group position={[0, 0, 0.75]}>
        <Gate state={state} color="#f59e0b" width={2} />
      </group>
      <Signpost text="Finiş" position={[-2.2, 0, 3.4]} />
      <group position={[0.7, 0, 0.9]}>
        <Npc color={state === 'locked' ? '#94a3b8' : '#7c3aed'} getPlayer={getPlayer} />
      </group>
      {state === 'done' && (
        <Float speed={2} floatIntensity={0.6} rotationIntensity={0}>
          <group position-y={4.6}>
            <Trophy scale={1.1} />
          </group>
        </Float>
      )}
      {(isTarget || state === 'done') && <Sparkles count={40} scale={[7, 5, 6]} position-y={2.6} size={6} speed={0.7} color="#fde047" />}
      <Label y={state === 'done' ? 7 : 5.3} height={0.8} bg="rgba(180,83,9,0.9)" text={`${state === 'locked' ? '🔒' : state === 'done' ? '🏆' : '▶'} Finiş`} />
    </group>
  )
}
