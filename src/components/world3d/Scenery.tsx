/**
 * Orol manzarasi: jonli suv (shader: to'lqin, qirg'oq ko'pigi, quyosh yaltirashi),
 * qumli sohil, o'tloq, oltin tosh yo'lak, bargli daraxtlar, butalar, o't va gullar.
 * Takrorlanuvchi shakllar InstancedMesh bilan (bitta chizish chaqiruvi) — 60 FPS uchun.
 */
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Color, DoubleSide, Object3D, PlaneGeometry, Shape, ShapeGeometry, type InstancedMesh, type ShaderMaterial } from 'three'
import { ISLAND, pathPoints } from '../../lib/world3d'
import { coastFactor, useTex } from './texContext'

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

/** Nuqtaning orolga nisbatan «masofa koeffitsienti»: 1 — o'tloq chegarasi. */
function islandK(x: number, z: number): number {
  const a = Math.atan2(z / ISLAND.rz, x / ISLAND.rx)
  return Math.hypot(x / ISLAND.rx, z / ISLAND.rz) / coastFactor(a)
}

const GRASS_K = 1.05
const SAND_K = 1.3
const WATER_Y = -0.32

/** Yo'l o'qi bo'ylab nuqtalar (egri) — tosh yo'lak va daraxtlardan tozalash uchun. */
function roadSamples(step: number): { p: [number, number]; n: [number, number]; seg: number }[] {
  const pts = pathPoints()
  const out: { p: [number, number]; n: [number, number]; seg: number }[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!
    const b = pts[i + 1]!
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    const n = Math.max(2, Math.round(len / step))
    const nx = -(b[1] - a[1]) / len
    const nz = (b[0] - a[0]) / len
    for (let k = 0; k <= n; k++) {
      const t = k / n
      const bend = Math.sin(t * Math.PI) * (i % 2 === 0 ? 0.9 : -0.9)
      out.push({ p: [a[0] + (b[0] - a[0]) * t + nx * bend, a[1] + (b[1] - a[1]) * t + nz * bend], n: [nx, nz], seg: i })
    }
  }
  return out
}

/* ------------------------------ suv ------------------------------ */

const WATER_VERT = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    w.y += sin(w.x * 0.35 + uTime * 0.9) * 0.05 + sin(w.z * 0.28 - uTime * 0.7) * 0.05;
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`
const WATER_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec2 uR;
  uniform vec3 uSun;
  varying vec3 vWorld;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float coast(float a) { return 1.0 + 0.045 * sin(a * 5.0 + 0.6) + 0.03 * sin(a * 9.0 + 2.1) + 0.02 * sin(a * 14.0); }
  void main() {
    vec2 q = vWorld.xz / uR;
    float k = length(q) / coast(atan(q.y, q.x));
    float shore = k - 1.17;                       // 0 — suv chizig'i
    vec3 shallow = vec3(0.16, 0.78, 0.74);
    vec3 mid = vec3(0.03, 0.50, 0.72);
    vec3 deep = vec3(0.01, 0.24, 0.52);
    vec3 col = mix(shallow, mid, smoothstep(0.0, 0.22, shore));
    col = mix(col, deep, smoothstep(0.2, 1.1, shore));
    // to'lqin normali (analitik) → quyosh yaltirashi
    vec2 p = vWorld.xz;
    float t = uTime;
    vec3 n = normalize(vec3(
      cos(p.x * 0.9 + t * 1.3) * 0.10 + cos(p.x * 2.3 - p.y * 1.7 + t * 1.9) * 0.07 + (noise(p * 1.7 + t * 0.4) - 0.5) * 0.25,
      1.0,
      cos(p.y * 0.8 - t * 1.1) * 0.10 + cos(p.y * 2.1 + p.x * 1.3 - t * 1.6) * 0.07 + (noise(p * 1.9 - t * 0.35) - 0.5) * 0.25));
    vec3 v = normalize(cameraPosition - vWorld);
    float spec = pow(max(dot(reflect(-normalize(uSun), n), v), 0.0), 90.0);
    float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    col = mix(col, vec3(0.70, 0.88, 1.0), fres * 0.14);
    col += vec3(1.0, 0.93, 0.78) * spec * 0.9;
    // qirg'oq ko'pigi: suv chizig'ida doimiy hoshiya + qirg'oqqa kelayotgan to'lqin chiziqlari
    float nz = noise(p * 1.4 + t * 0.25);
    float edge = 1.0 - smoothstep(0.0, 0.035 + nz * 0.03, shore);
    float band = sin(shore * 95.0 + t * 1.6 + nz * 5.0);
    float waves = smoothstep(0.80, 1.0, band) * (1.0 - smoothstep(0.0, 0.2, shore)) * (0.55 + nz * 0.6);
    float foam = clamp(edge + waves, 0.0, 1.0);
    col = mix(col, vec3(1.0), foam * 0.85);
    float alpha = mix(0.72, 0.98, smoothstep(0.0, 0.18, shore));
    alpha = max(alpha, foam);
    // ufq: osmon rangiga singadi
    float far = smoothstep(55.0, 140.0, length(vWorld.xz));
    col = mix(col, vec3(0.80, 0.90, 0.98), far);
    // Ranglar sRGB'da tanlangan — chiqishdagi sRGB o'girishdan oldin chiziqli fazoga o'tkazamiz
    gl_FragColor = vec4(pow(col, vec3(2.2)), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function Water({ sun }: { sun: [number, number, number] }) {
  const mat = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uR: { value: [ISLAND.rx, ISLAND.rz] }, uSun: { value: sun } }), [sun])
  useFrame(({ clock }) => {
    if (mat.current) mat.current.uniforms.uTime!.value = clock.elapsedTime
  })
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={WATER_Y} renderOrder={1}>
      <planeGeometry args={[320, 320, 96, 96]} />
      <shaderMaterial ref={mat} vertexShader={WATER_VERT} fragmentShader={WATER_FRAG} uniforms={uniforms} transparent depthWrite={false} />
    </mesh>
  )
}

/* ------------------------------ yer ------------------------------ */

export function Island({ onGround }: { onGround: (x: number, z: number) => void }) {
  const tex = useTex()
  // Sohil va dengiz tubi: balandlik qirg'oqdan uzoqlashgan sari pasayadi
  const beach = useMemo(() => {
    const g = new PlaneGeometry(64, 84, 110, 140)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position as BufferAttribute
    const col = new Float32Array(pos.count * 3)
    // Tekstura o'zi qum rangida — bu yerda faqat quruq/ho'l farqi (ko'paytiruvchi)
    const dry = new Color('#ffffff')
    const wet = new Color('#bfae92')
    const c = new Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const k = islandK(x, z)
      const t = Math.min(1, Math.max(0, (k - 1.0) / (SAND_K - 1.0)))
      const bumps = Math.sin(x * 1.7) * Math.cos(z * 1.3) * 0.03
      pos.setY(i, k < 1 ? -0.02 : -0.02 - t * t * 1.1 - Math.max(0, k - SAND_K) * 1.5 + bumps * (1 - t))
      c.copy(dry).lerp(wet, Math.min(1, Math.max(0, (k - 1.1) / 0.12)))
      col.set([c.r, c.g, c.b], i * 3)
    }
    g.setAttribute('color', new BufferAttribute(col, 3))
    g.computeVertexNormals()
    return g
  }, [])
  // O'tloq: qirg'oq chizig'i bo'ylab to'lqinli shakl
  const meadow = useMemo(() => {
    const s = new Shape()
    const N = 160
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2
      const f = coastFactor(a) * GRASS_K
      const x = Math.cos(a) * ISLAND.rx * f
      const y = -Math.sin(a) * ISLAND.rz * f // aylantirilgach z = +sin(a) bo'ladi (suv va sohil bilan mos)
      if (i === 0) s.moveTo(x, y)
      else s.lineTo(x, y)
    }
    const g = new ShapeGeometry(s, 1)
    // Shape XY tekisligida: y → -z (yuqoridan qaraganda bir xil), UV — dunyo koordinatasidan
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position as BufferAttribute
    const uv = new Float32Array(pos.count * 2)
    for (let i = 0; i < pos.count; i++) uv.set([pos.getX(i) / 30, pos.getZ(i) / 30], i * 2)
    g.setAttribute('uv', new BufferAttribute(uv, 2))
    return g
  }, [])
  useLayoutEffect(
    () => () => {
      beach.dispose()
      meadow.dispose()
    },
    [beach, meadow],
  )
  const down = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onGround(e.point.x, e.point.z)
  }
  return (
    <>
      <mesh geometry={beach} receiveShadow onPointerDown={down}>
        <meshStandardMaterial {...tex.sand} vertexColors roughness={0.95} />
      </mesh>
      <mesh geometry={meadow} position-y={0.012} receiveShadow onPointerDown={down}>
        <meshStandardMaterial {...tex.grass} roughness={0.9} side={DoubleSide} />
      </mesh>
    </>
  )
}

/* ------------------------------ tosh yo'lak ------------------------------ */

export function PathStones({ reached }: { reached: number }) {
  const tex = useTex()
  // Yo'l o'qi bo'ylab lenta: UV uzunlik bo'yicha takrorlanadi; o'tilgan qism oltin, qolgani och rang
  const geo = useMemo(() => {
    const W = 1.05
    const pts = roadSamples(0.5)
    const pos: number[] = []
    const uv: number[] = []
    const col: number[] = []
    const idx: number[] = []
    const gold = new Color('#ffd257')
    const pale = new Color('#efe3c6')
    let len = 0
    pts.forEach((s, i) => {
      if (i > 0) len += Math.hypot(s.p[0] - pts[i - 1]!.p[0], s.p[1] - pts[i - 1]!.p[1])
      const c = s.seg < reached ? gold : pale
      for (const side of [-1, 1]) {
        pos.push(s.p[0] + s.n[0] * W * side, 0.03, s.p[1] + s.n[1] * W * side)
        uv.push(side < 0 ? 0 : 1, len / (W * 2))
        col.push(c.r, c.g, c.b)
      }
      if (i > 0) {
        const k = i * 2
        idx.push(k - 2, k, k - 1, k - 1, k, k + 1)
      }
    })
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
    g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2))
    g.setAttribute('color', new BufferAttribute(new Float32Array(col), 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }, [reached])
  useLayoutEffect(() => () => geo.dispose(), [geo])
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial {...tex.cobble} vertexColors roughness={0.85} side={DoubleSide} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  )
}

/* ------------------------------ o'simliklar ------------------------------ */

export function Trees({ avoid }: { avoid: readonly [number, number][] }) {
  const tex = useTex()
  const trunks = useRef<InstancedMesh>(null)
  const blobs = useRef<InstancedMesh>(null)
  const pines = useRef<InstancedMesh>(null)
  const bushes = useRef<InstancedMesh>(null)
  const tufts = useRef<InstancedMesh>(null)
  const flowers = useRef<InstancedMesh>(null)

  const data = useMemo(() => {
    const r = rng(20261111)
    const road = roadSamples(1).map((s) => s.p)
    const free = (x: number, z: number, roadGap: number, stGap: number) =>
      islandK(x, z) < 0.97 && !road.some((p) => Math.hypot(p[0] - x, p[1] - z) < roadGap) && !avoid.some((p) => Math.hypot(p[0] - x, p[1] - z) < stGap || (Math.abs(p[0] - x) < 3.4 && z > p[1] && z - p[1] < 8.5))
    const spots: { x: number; z: number; s: number; kind: 'leaf' | 'pine' | 'bush' }[] = []
    let guard = 0
    while (spots.length < 84 && guard++ < 8000) {
      const x = (r() * 2 - 1) * ISLAND.rx * 1.05
      const z = (r() * 2 - 1) * ISLAND.rz * 1.05
      if (!free(x, z, 2.5, 4.6)) continue
      if (spots.some((p) => Math.hypot(p.x - x, p.z - z) < 1.9)) continue
      const v = r()
      spots.push({ x, z, s: 0.62 + r() * 0.4, kind: v < 0.58 ? 'leaf' : v < 0.76 ? 'pine' : 'bush' })
    }
    const small: { x: number; z: number; s: number; rot: number; flower: boolean; c: number }[] = []
    guard = 0
    while (small.length < 460 && guard++ < 12000) {
      const x = (r() * 2 - 1) * ISLAND.rx * 1.05
      const z = (r() * 2 - 1) * ISLAND.rz * 1.05
      if (!free(x, z, 1.35, 2.9)) continue
      small.push({ x, z, s: 0.6 + r() * 0.9, rot: r() * 6.28, flower: r() < 0.24, c: Math.floor(r() * 3) })
    }
    return { spots, small, r }
  }, [avoid])

  const leaf = useMemo(() => data.spots.filter((s) => s.kind === 'leaf'), [data])
  const pine = useMemo(() => data.spots.filter((s) => s.kind === 'pine'), [data])
  const bush = useMemo(() => data.spots.filter((s) => s.kind === 'bush'), [data])
  const grassTufts = useMemo(() => data.small.filter((s) => !s.flower), [data])
  const flowerList = useMemo(() => data.small.filter((s) => s.flower), [data])
  const BLOBS = 5

  useLayoutEffect(() => {
    const o = new Object3D()
    const r = rng(4242)
    const greens = ['#5fbf45', '#74d058', '#4daa3a', '#8ade66', '#57b741'].map((c) => new Color(c))
    const tuftGreens = ['#8fd866', '#7ccb55', '#a2e27a'].map((c) => new Color(c))
    const trunkList = [...leaf, ...pine]
    trunkList.forEach((t, i) => {
      const tall = t.kind === 'leaf' ? 1.5 : 0.9
      o.rotation.set((r() - 0.5) * 0.12, r() * 6, (r() - 0.5) * 0.12)
      o.position.set(t.x, (tall * t.s) / 2, t.z)
      o.scale.set(t.s, tall * t.s, t.s)
      o.updateMatrix()
      trunks.current?.setMatrixAt(i, o.matrix)
    })
    leaf.forEach((t, i) => {
      for (let b = 0; b < BLOBS; b++) {
        const top = b === 0
        const a = (b / (BLOBS - 1)) * Math.PI * 2 + r()
        const rad = top ? 0 : 0.62 * t.s
        o.rotation.set(r() * 3, r() * 3, r() * 3)
        o.position.set(t.x + Math.cos(a) * rad, (top ? 2.55 : 1.85 + r() * 0.35) * t.s, t.z + Math.sin(a) * rad)
        o.scale.setScalar((top ? 0.95 : 0.72 + r() * 0.2) * t.s)
        o.updateMatrix()
        blobs.current?.setMatrixAt(i * BLOBS + b, o.matrix)
        blobs.current?.setColorAt(i * BLOBS + b, greens[Math.floor(r() * greens.length)]!)
      }
    })
    pine.forEach((t, i) => {
      for (let b = 0; b < 3; b++) {
        o.rotation.set(0, r() * 6, 0)
        o.position.set(t.x, (1.25 + b * 0.78) * t.s, t.z)
        o.scale.setScalar((1 - b * 0.24) * t.s)
        o.updateMatrix()
        pines.current?.setMatrixAt(i * 3 + b, o.matrix)
        pines.current?.setColorAt(i * 3 + b, new Color(b === 2 ? '#4fa85a' : '#3a9048'))
      }
    })
    bush.forEach((t, i) => {
      for (let b = 0; b < 3; b++) {
        o.rotation.set(r() * 3, r() * 3, 0)
        o.position.set(t.x + (b - 1) * 0.42 * t.s, 0.34 * t.s, t.z + (r() - 0.5) * 0.4)
        o.scale.setScalar((0.5 + r() * 0.2) * t.s)
        o.updateMatrix()
        bushes.current?.setMatrixAt(i * 3 + b, o.matrix)
        bushes.current?.setColorAt(i * 3 + b, greens[Math.floor(r() * greens.length)]!)
      }
    })
    grassTufts.forEach((t, i) => {
      o.rotation.set(0, t.rot, 0)
      o.position.set(t.x, 0.11 * t.s, t.z)
      o.scale.set(t.s, t.s, t.s)
      o.updateMatrix()
      tufts.current?.setMatrixAt(i, o.matrix)
      tufts.current?.setColorAt(i, tuftGreens[t.c]!)
    })
    const petals = ['#fde047', '#ffffff', '#fbbf24'].map((c) => new Color(c))
    flowerList.forEach((t, i) => {
      o.rotation.set(0, 0, 0)
      o.position.set(t.x, 0.13, t.z)
      o.scale.setScalar(0.55 + t.s * 0.3)
      o.updateMatrix()
      flowers.current?.setMatrixAt(i, o.matrix)
      flowers.current?.setColorAt(i, petals[t.c]!)
    })
    for (const m of [trunks.current, blobs.current, pines.current, bushes.current, tufts.current, flowers.current]) {
      if (!m) continue
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
  }, [leaf, pine, bush, grassTufts, flowerList])

  return (
    <>
      <instancedMesh ref={trunks} args={[undefined, undefined, leaf.length + pine.length]} castShadow>
        <cylinderGeometry args={[0.13, 0.2, 1, 7]} />
        <meshStandardMaterial {...tex.bark} roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={blobs} args={[undefined, undefined, leaf.length * BLOBS]} castShadow receiveShadow>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial {...tex.leaves} roughness={0.85} flatShading />
      </instancedMesh>
      <instancedMesh ref={pines} args={[undefined, undefined, pine.length * 3]} castShadow>
        <coneGeometry args={[0.95, 1.5, 9]} />
        <meshStandardMaterial {...tex.leaves} roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh ref={bushes} args={[undefined, undefined, bush.length * 3]} castShadow receiveShadow>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial {...tex.leaves} roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh ref={tufts} args={[undefined, undefined, grassTufts.length]}>
        <coneGeometry args={[0.07, 0.2, 4]} />
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
      <instancedMesh ref={flowers} args={[undefined, undefined, flowerList.length]}>
        <sphereGeometry args={[0.07, 6, 5]} />
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>
    </>
  )
}

/** Bosilgan nuqta belgisi. */
export function TargetRing({ getTarget }: { getTarget: () => [number, number] | null }) {
  const ref = useRef<import('three').Mesh>(null)
  useFrame(({ clock }) => {
    const m = ref.current
    if (!m) return
    const t = getTarget()
    m.visible = t !== null
    if (t) {
      m.position.set(t[0], 0.09, t[1])
      m.scale.setScalar(1 + Math.sin(clock.elapsedTime * 6) * 0.12)
    }
  })
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} visible={false}>
      <ringGeometry args={[0.32, 0.45, 24]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.9} depthTest={false} />
    </mesh>
  )
}
