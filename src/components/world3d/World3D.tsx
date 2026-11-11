/**
 * 3D sahna (Canvas): orol, yo'lak, stansiyalar, Finiş qasri, qahramon va kamera.
 * Bu fayl alohida chunk — `three` faqat 3D rejim tanlanganda yuklanadi.
 *
 * Harakat `Controls` orqali (React holatidan tashqarida), shuning uchun yurish
 * paytida React qayta chizilmaydi. Canvas olib tashlanganda R3F geometriya va
 * materiallarni o'zi bo'shatadi; tinglovchilar effektlarda tozalanadi.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Sky } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { frontOf, nearestPoint, type World } from '../../lib/world3d'
import { skillLabelUz } from '../../lib/planning'
import FinishArena from './FinishArena'
import PlayerCharacter from './PlayerCharacter'
import { Island, PathStones, TargetRing, Trees, Water } from './Scenery'
import { TexContext } from './texContext'
import { createTextures, disposeTextures } from './textures'
import StationNode from './StationNode'
import type { Controls, Solid } from './controls'

export type NearId = string | null

/** Quyosh yo'nalishi — yorug'lik, osmon va suv yaltirashi uchun bitta manba. */
const SUN: [number, number, number] = [26, 20, 14]

function Rig({ ctrl, world, onNear }: { ctrl: Controls; world: World; onNear: (id: NearId) => void }) {
  const { camera, size } = useThree()
  const look = useRef(new Vector3(ctrl.pos[0], 1, ctrl.pos[1]))
  const want = useRef(new Vector3())
  const last = useRef<NearId>(null)
  const acc = useRef(0)
  useFrame((_, dt) => {
    // Tor (telefon) ekranda kamera uzoqroq — stansiyalar sig'sin
    const narrow = size.width < 640
    want.current.set(ctrl.pos[0] * 0.75, narrow ? 21 : 15.5, ctrl.pos[1] + (narrow ? 17 : 14))
    const k = 1 - Math.exp(-dt * 4)
    camera.position.lerp(want.current, k)
    look.current.lerp(want.current.set(ctrl.pos[0], 1, ctrl.pos[1]), k)
    camera.lookAt(look.current)
    acc.current += dt
    if (acc.current > 0.12) {
      acc.current = 0
      const hit = nearestPoint(world, ctrl.pos[0], ctrl.pos[1])
      const id: NearId = hit === null ? null : hit.kind === 'finish' ? 'finish' : hit.station.skill
      if (id !== last.current) {
        last.current = id
        onNear(id)
      }
    }
  })
  return null
}

export default function World3D({ world, ctrl, onNear }: { world: World; ctrl: Controls; onNear: (id: NearId) => void }) {
  // Protsedura teksturalari: sahna bilan birga yaratiladi va bo'shatiladi
  const tex = useMemo(() => createTextures(), [])
  useEffect(() => () => disposeTextures(tex), [tex])
  // Telefonda yengilroq: soya xaritasi va piksel zichligi kichikroq
  const [lite] = useState(() => window.matchMedia('(pointer: coarse)').matches)
  const getPlayer = useMemo(() => () => ctrl.pos, [ctrl])
  const solids = useMemo<Solid[]>(
    () => [...world.stations.map((s): Solid => [s.pos[0], s.pos[1], 2.3]), ...(world.finish ? [[world.finish.pos[0], world.finish.pos[1], 3.3] as Solid] : [])],
    [world],
  )
  const avoid = useMemo<[number, number][]>(() => solids.map((s) => [s[0], s[1]]), [solids])
  const reached = world.stations.filter((s) => s.state === 'done').length + 1
  const targetKey = world.target ? world.target.join(',') : ''

  // Klaviatura: WASD / strelkalar (matn maydonida yozilayotgan bo'lsa — tegilmaydi)
  useEffect(() => {
    const typing = (e: KeyboardEvent) => e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)
    const down = (e: KeyboardEvent) => {
      if (typing(e) || ctrl.paused) return
      if (/^(Key[WASD]|Arrow(Up|Down|Left|Right))$/.test(e.code)) {
        ctrl.keys.add(e.code)
        if (e.code.startsWith('Arrow')) e.preventDefault()
      }
    }
    const up = (e: KeyboardEvent) => ctrl.keys.delete(e.code)
    const clear = () => ctrl.keys.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
      ctrl.keys.clear()
    }
  }, [ctrl])

  const walkTo = (x: number, z: number) => ctrl.walkTo([x, z])

  return (
    <Canvas
      shadows
      dpr={[1, lite ? 1.5 : 1.75]}
      camera={{ fov: 42, near: 0.5, far: 220, position: [ctrl.pos[0], 15.5, ctrl.pos[1] + 14] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ touchAction: 'none' }}
    >
      {/* Oltin soat: iliq quyosh (soya bilan), yumshoq osmon yorug'i, yengil tuman */}
      <Sky distance={4500} sunPosition={SUN} turbidity={5} rayleigh={1.4} mieCoefficient={0.006} mieDirectionalG={0.85} />
      <fogExp2 attach="fog" args={['#dfeaf2', 0.0075]} />
      <hemisphereLight args={['#eaf4ff', '#6fa85a', 0.75]} />
      <ambientLight intensity={0.12} />
      <directionalLight
        position={SUN}
        intensity={3.1}
        color="#ffe0ad"
        castShadow
        shadow-mapSize={lite ? [1024, 1024] : [2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      >
        {/* Soya kamerasi butun orolni qamraydi (prop orqali berilsa proyeksiya yangilanmaydi) */}
        <orthographicCamera attach="shadow-camera" args={[-26, 26, 30, -30, 1, 95]} />
      </directionalLight>
      <TexContext.Provider value={tex}>
      <Rig ctrl={ctrl} world={world} onNear={onNear} />
      <Water sun={SUN} />
      <Island onGround={walkTo} />
      <PathStones reached={reached} />
      <Trees avoid={avoid} />
      <TargetRing getTarget={() => ctrl.target} />
      {world.stations.map((s) => (
        <StationNode
          key={s.skill}
          index={s.index}
          label={skillLabelUz(s.skill)}
          color={s.color}
          state={s.state}
          stars={s.stars}
          position={s.pos}
          isTarget={targetKey === s.pos.join(',')}
          getPlayer={getPlayer}
          onPick={() => walkTo(...frontOf(s.pos))}
        />
      ))}
      {world.finish && (
        <FinishArena
          state={world.finish.state}
          position={world.finish.pos}
          isTarget={targetKey === world.finish.pos.join(',')}
          getPlayer={getPlayer}
          onPick={() => walkTo(...frontOf(world.finish!.pos, true))}
        />
      )}
      <PlayerCharacter ctrl={ctrl} solids={solids} />
      </TexContext.Provider>
    </Canvas>
  )
}
