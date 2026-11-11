/**
 * Asosiy qahramon — do'ppili bola (loyiha maskoti asosida, oddiy shakllardan).
 * Harakat `Controls`dan o'qiladi: klaviatura/joystik yo'nalishi yoki bosilgan nuqta.
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { Controls, Solid } from './controls'

export default function PlayerCharacter({ ctrl, solids }: { ctrl: Controls; solids: readonly Solid[] }) {
  const root = useRef<Group>(null)
  const armL = useRef<Group>(null)
  const armR = useRef<Group>(null)
  const legL = useRef<Group>(null)
  const legR = useRef<Group>(null)
  const phase = useRef(0)

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const g = root.current
    if (!g) return
    ctrl.step(dt, solids)
    const moving = ctrl.moving
    phase.current += dt * (moving ? 11 : 2)
    g.position.set(ctrl.pos[0], moving ? Math.abs(Math.sin(phase.current)) * 0.08 : Math.sin(phase.current) * 0.015, ctrl.pos[1])
    g.rotation.y = ctrl.heading
    const swing = moving ? Math.sin(phase.current) * 0.7 : 0
    if (armL.current) armL.current.rotation.x = swing
    if (armR.current) armR.current.rotation.x = -swing
    if (legL.current) legL.current.rotation.x = -swing
    if (legR.current) legR.current.rotation.x = swing
  })

  return (
    <group ref={root}>
      {/* soya */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
        <circleGeometry args={[0.5, 20]} />
        <meshBasicMaterial color="#000" transparent opacity={0.22} />
      </mesh>
      {/* oyoqlar */}
      <group ref={legL} position={[-0.16, 0.55, 0]}>
        <mesh position-y={-0.27}>
          <capsuleGeometry args={[0.11, 0.34, 4, 8]} />
          <meshStandardMaterial color="#1e3a8a" />
        </mesh>
      </group>
      <group ref={legR} position={[0.16, 0.55, 0]}>
        <mesh position-y={-0.27}>
          <capsuleGeometry args={[0.11, 0.34, 4, 8]} />
          <meshStandardMaterial color="#1e3a8a" />
        </mesh>
      </group>
      {/* chopon (tana) va belbog' */}
      <mesh position-y={0.92}>
        <capsuleGeometry args={[0.3, 0.42, 6, 12]} />
        <meshStandardMaterial color="#0d9488" />
      </mesh>
      <mesh position-y={0.8}>
        <cylinderGeometry args={[0.315, 0.315, 0.09, 16]} />
        <meshStandardMaterial color="#facc15" />
      </mesh>
      {/* qo'llar */}
      <group ref={armL} position={[-0.4, 1.12, 0]}>
        <mesh position-y={-0.22}>
          <capsuleGeometry args={[0.085, 0.3, 4, 8]} />
          <meshStandardMaterial color="#0f766e" />
        </mesh>
      </group>
      <group ref={armR} position={[0.4, 1.12, 0]}>
        <mesh position-y={-0.22}>
          <capsuleGeometry args={[0.085, 0.3, 4, 8]} />
          <meshStandardMaterial color="#0f766e" />
        </mesh>
      </group>
      {/* bosh */}
      <mesh position-y={1.62}>
        <sphereGeometry args={[0.33, 20, 16]} />
        <meshStandardMaterial color="#f2c9a0" />
      </mesh>
      <mesh position={[-0.12, 1.66, 0.29]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshBasicMaterial color="#1f2937" />
      </mesh>
      <mesh position={[0.12, 1.66, 0.29]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshBasicMaterial color="#1f2937" />
      </mesh>
      <mesh position={[0, 1.53, 0.31]} rotation-x={0.2}>
        <torusGeometry args={[0.08, 0.018, 6, 12, Math.PI]} />
        <meshBasicMaterial color="#b45309" />
      </mesh>
      {/* do'ppi: to'rt qirrali qora qalpoq, oq naqsh */}
      <mesh position-y={1.93} rotation-y={Math.PI / 4}>
        <cylinderGeometry args={[0.2, 0.34, 0.24, 4]} />
        <meshStandardMaterial color="#111827" flatShading />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[Math.sin((i * Math.PI) / 2) * 0.2, 1.92, Math.cos((i * Math.PI) / 2) * 0.2]}>
          <sphereGeometry args={[0.045, 8, 6]} />
          <meshBasicMaterial color="#f8fafc" />
        </mesh>
      ))}
    </group>
  )
}
