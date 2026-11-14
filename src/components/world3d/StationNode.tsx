/**
 * Stansiya: 1-stansiya — poxol tomli yog'och kulba, qolganlari — shifer tomli tosh uy.
 * Oldida darvoza (qulf bo'lsa panjara), yonida NPC, bayroq, yog'och lavha, yulduzlar.
 * Qulflangan stansiya xira (kulrang) ko'rinadi.
 */
import { useEffect, useMemo, useRef } from 'react'
import { Sparkles } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { CanvasTexture, SRGBColorSpace, Vector3, type Group, type Mesh } from 'three'
import type { StationState } from '../../lib/world3d'
import Label from './Label'
import { useTex } from './texContext'
import type { MatMaps } from './textures'

const tmp = new Vector3()
const DIM = '#9aa1a8'

export function Npc({ color, getPlayer }: { color: string; getPlayer: () => [number, number] }) {
  const ref = useRef<Group>(null)
  useFrame(({ clock }) => {
    const g = ref.current
    if (!g) return
    g.position.y = Math.sin(clock.elapsedTime * 2.2 + g.position.x) * 0.03
    const p = getPlayer()
    g.getWorldPosition(tmp)
    g.rotation.y = Math.atan2(p[0] - tmp.x, p[1] - tmp.z)
  })
  return (
    <group ref={ref} position={[1.75, 0, 2.1]}>
      {[-0.13, 0.13].map((x) => (
        <mesh key={x} position={[x, 0.3, 0]} castShadow>
          <capsuleGeometry args={[0.1, 0.4, 4, 8]} />
          <meshStandardMaterial color="#4b3b2a" roughness={0.9} />
        </mesh>
      ))}
      <mesh position-y={0.95} castShadow>
        <capsuleGeometry args={[0.28, 0.45, 6, 12]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.36, 0.95, 0]} rotation-z={s * 0.25} castShadow>
          <capsuleGeometry args={[0.08, 0.38, 4, 8]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      ))}
      <mesh position-y={1.58} castShadow>
        <sphereGeometry args={[0.27, 18, 14]} />
        <meshStandardMaterial color="#f1c9a0" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.5, 0.2]}>
        <sphereGeometry args={[0.17, 12, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.5]} />
        <meshStandardMaterial color="#f5f5f4" roughness={1} />
      </mesh>
      {[-0.1, 0.1].map((x) => (
        <mesh key={x} position={[x, 1.63, 0.24]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshBasicMaterial color="#1f2937" />
        </mesh>
      ))}
      {/* shlyapa */}
      <mesh position-y={1.8} castShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.04, 16]} />
        <meshStandardMaterial color="#a16207" roughness={0.9} />
      </mesh>
      <mesh position-y={1.9} castShadow>
        <cylinderGeometry args={[0.2, 0.24, 0.2, 14]} />
        <meshStandardMaterial color="#a16207" roughness={0.9} />
      </mesh>
    </group>
  )
}

/** Ikki nishabli tom (uchburchak prizma): eni w, chuqurligi d, balandligi h; asosi y = 0 da. */
export function GableRoof({ w, d, h, maps, color = '#ffffff' }: { w: number; d: number; h: number; maps: MatMaps; color?: string }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={h / 3} scale={[w / 1.732, d, h / 1.5]} castShadow receiveShadow>
      <cylinderGeometry args={[1, 1, 1, 3, 1]} />
      <meshStandardMaterial {...maps} color={color} roughness={0.95} flatShading />
    </mesh>
  )
}

/** Darvoza: ikki yog'och ustun + to'sin; qulf bo'lsa — temir panjara. */
export function Gate({ state, color, width = 1.5 }: { state: StationState; color: string; width?: number }) {
  const tex = useTex()
  const bars = [-0.45, -0.15, 0.15, 0.45].map((k) => k * width)
  return (
    <group position={[0, 0, 2.15]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * width) / 2 + s * 0.12, 0.95, 0]} castShadow>
          <boxGeometry args={[0.2, 1.9, 0.2]} />
          <meshStandardMaterial {...tex.planks} color="#e6c9a0" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 1.98, 0]} castShadow>
        <boxGeometry args={[width + 0.7, 0.2, 0.26]} />
        <meshStandardMaterial {...tex.planks} color={state === 'locked' ? DIM : color} roughness={0.9} />
      </mesh>
      {state === 'locked' &&
        bars.map((x) => (
          <mesh key={x} position={[x, 0.95, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.045, 1.9, 6]} />
            <meshStandardMaterial color="#3f4650" metalness={0.7} roughness={0.35} />
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
          <meshStandardMaterial color="#fde047" emissive="#f59e0b" emissiveIntensity={0.7} flatShading />
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
    <group position={[-1.9, 0, 1.6]}>
      <mesh position-y={1.7} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 3.4, 6]} />
        <meshStandardMaterial color="#b8906a" roughness={0.9} />
      </mesh>
      <mesh ref={cloth} position={[0.42, 3.05, 0]} castShadow>
        <boxGeometry args={[0.84, 0.52, 0.025]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
    </group>
  )
}

/** Yog'och lavha: ustun + stansiya nomi yozilgan taxta. */
export function Signpost({ text, position }: { text: string; position: [number, number, number] }) {
  const tex = useTex()
  const board = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 384
    c.height = 128
    const g = c.getContext('2d')!
    g.fillStyle = '#b0803f'
    g.fillRect(0, 0, 384, 128)
    g.strokeStyle = 'rgba(70,40,10,0.35)'
    for (let i = 0; i < 14; i++) {
      g.beginPath()
      g.moveTo(0, 6 + i * 9)
      g.bezierCurveTo(130, 2 + i * 9, 260, 11 + i * 9, 384, 6 + i * 9)
      g.stroke()
    }
    g.strokeStyle = '#5b3a17'
    g.lineWidth = 8
    g.strokeRect(4, 4, 376, 120)
    g.fillStyle = '#fff7e6'
    g.font = '700 54px Inter, system-ui, sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.shadowColor = 'rgba(40,20,0,0.7)'
    g.shadowBlur = 6
    g.fillText(text, 192, 68, 350)
    const t = new CanvasTexture(c)
    t.colorSpace = SRGBColorSpace
    return t
  }, [text])
  useEffect(() => () => board.dispose(), [board])
  return (
    <group position={position} rotation-y={-0.25}>
      <mesh position-y={0.45} castShadow>
        <boxGeometry args={[0.1, 0.9, 0.1]} />
        <meshStandardMaterial {...tex.planks} color="#d0a877" roughness={0.9} />
      </mesh>
      <mesh position-y={0.95} castShadow>
        <boxGeometry args={[1.25, 0.42, 0.07]} />
        <meshStandardMaterial {...tex.planks} color="#d0a877" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.95, 0.04]}>
        <planeGeometry args={[1.17, 0.36]} />
        <meshStandardMaterial map={board} roughness={0.85} />
      </mesh>
    </group>
  )
}

function WarmWindow({ position, lit }: { position: [number, number, number]; lit: boolean }) {
  const tex = useTex()
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.6, 0.6, 0.08]} />
        <meshStandardMaterial {...tex.planks} color="#b8906a" roughness={0.9} />
      </mesh>
      <mesh position-z={0.045}>
        <planeGeometry args={[0.46, 0.46]} />
        <meshStandardMaterial color={lit ? '#ffd27a' : '#374151'} emissive={lit ? '#ffb347' : '#000000'} emissiveIntensity={lit ? 1.4 : 0} roughness={0.4} />
      </mesh>
      <mesh position-z={0.05}>
        <boxGeometry args={[0.04, 0.46, 0.02]} />
        <meshStandardMaterial color="#b8906a" />
      </mesh>
      <mesh position-z={0.05}>
        <boxGeometry args={[0.46, 0.04, 0.02]} />
        <meshStandardMaterial color="#b8906a" />
      </mesh>
    </group>
  )
}

/** Poxol tomli yog'och kulba (1-stansiya). */
function Cabin({ dim }: { dim: boolean }) {
  const tex = useTex()
  const tint = dim ? DIM : '#ffffff'
  return (
    <group>
      <mesh position-y={0.85} castShadow receiveShadow>
        <boxGeometry args={[2.7, 1.7, 2.3]} />
        <meshStandardMaterial {...tex.wood} color={tint} roughness={0.9} />
      </mesh>
      {/* burchak xodalari */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * 1.37, 0.85, sz * 1.17]} castShadow>
            <cylinderGeometry args={[0.11, 0.11, 1.74, 8]} />
            <meshStandardMaterial {...tex.planks} color={dim ? DIM : '#d0a877'} roughness={0.9} />
          </mesh>
        )),
      )}
      <group position-y={1.68}>
        <GableRoof w={3.5} d={2.9} h={1.55} maps={tex.thatch} color={tint} />
      </group>
      {/* eshik */}
      <mesh position={[-0.45, 0.62, 1.17]}>
        <boxGeometry args={[0.72, 1.24, 0.07]} />
        <meshStandardMaterial {...tex.planks} color={dim ? DIM : '#b8906a'} roughness={0.9} />
      </mesh>
      <mesh position={[-0.2, 0.62, 1.22]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="#d4a017" metalness={0.8} roughness={0.3} />
      </mesh>
      <WarmWindow position={[0.65, 0.95, 1.17]} lit={!dim} />
      {/* bochka */}
      <mesh position={[1.75, 0.38, 0.6]} castShadow>
        <cylinderGeometry args={[0.3, 0.26, 0.76, 12]} />
        <meshStandardMaterial {...tex.planks} color="#d2ad80" roughness={0.9} />
      </mesh>
      {/* to'siq */}
      {[-1.7, -2.3, -2.9].map((x) => (
        <mesh key={x} position={[x, 0.36, -0.4]} castShadow>
          <boxGeometry args={[0.1, 0.72, 0.1]} />
          <meshStandardMaterial {...tex.planks} color="#dcbb92" roughness={0.9} />
        </mesh>
      ))}
      {[0.28, 0.52].map((y) => (
        <mesh key={y} position={[-2.3, y, -0.4]} castShadow>
          <boxGeometry args={[1.4, 0.07, 0.05]} />
          <meshStandardMaterial {...tex.planks} color="#dcbb92" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/** Shifer tomli tosh uy: arkali eshik, zinapoya, mo'ri, iliq derazalar. */
function StoneHouse({ dim, accent }: { dim: boolean; accent: string }) {
  const tex = useTex()
  const tint = dim ? DIM : '#ffffff'
  return (
    <group>
      <mesh position-y={1} castShadow receiveShadow>
        <boxGeometry args={[2.6, 2, 2.3]} />
        <meshStandardMaterial {...tex.stone} color={tint} roughness={0.95} />
      </mesh>
      <group position-y={1.98}>
        <GableRoof w={3.3} d={2.8} h={1.7} maps={tex.slate} color={tint} />
      </group>
      {/* mo'ri */}
      <mesh position={[0.8, 3.1, -0.5]} castShadow>
        <boxGeometry args={[0.42, 1, 0.42]} />
        <meshStandardMaterial {...tex.stone} color={tint} roughness={0.95} />
      </mesh>
      {/* arkali eshik */}
      <mesh position={[0, 0.68, 1.16]}>
        <boxGeometry args={[0.86, 1.1, 0.08]} />
        <meshStandardMaterial {...tex.planks} color={dim ? DIM : '#b8906a'} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.23, 1.16]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.43, 0.43, 0.08, 20, 1, false, -Math.PI / 2, Math.PI]} />
        <meshStandardMaterial {...tex.planks} color={dim ? DIM : '#b8906a'} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.25, 1.14]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.56, 0.56, 0.1, 20, 1, false, -Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color={dim ? DIM : accent} roughness={0.8} />
      </mesh>
      {/* zinapoya */}
      {[0, 1].map((i) => (
        <mesh key={i} position={[0, 0.07 + i * 0.1, 1.5 - i * 0.2]} receiveShadow castShadow>
          <boxGeometry args={[1.4 - i * 0.25, 0.12, 0.4]} />
          <meshStandardMaterial {...tex.stone} color={tint} roughness={0.95} />
        </mesh>
      ))}
      <WarmWindow position={[-0.85, 1.2, 1.16]} lit={!dim} />
      <WarmWindow position={[0.85, 1.2, 1.16]} lit={!dim} />
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
  const tex = useTex()
  const dim = state === 'locked'
  const pick = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onPick()
  }
  return (
    <group position={[position[0], 0, position[1]]} onPointerDown={pick}>
      {/* hovli: toptalgan yer */}
      <mesh position-y={0.025} receiveShadow>
        <cylinderGeometry args={[3, 3.1, 0.05, 28]} />
        <meshStandardMaterial {...tex.sand} color={state === 'done' ? '#ffe9a8' : '#ead9b6'} roughness={1} />
      </mesh>
      {index === 0 ? <Cabin dim={dim} /> : <StoneHouse dim={dim} accent={color} />}
      <Gate state={state} color={color} />
      <Flag color={dim ? DIM : color} />
      <Signpost text={`${index + 1}. ${label}`} position={[-1.55, 0, 2.6]} />
      <Npc color={dim ? '#8b939b' : color} getPlayer={getPlayer} />
      <Stars count={stars} y={4.7} />
      {isTarget && <Sparkles count={26} scale={[5, 3.2, 5]} position-y={2} size={5} speed={0.6} color="#fde047" />}
      <Label y={4.05} height={0.5} text={`${state === 'locked' ? '🔒' : state === 'done' ? '✅' : '▶'} ${index + 1}. ${label}`} />
    </group>
  )
}
