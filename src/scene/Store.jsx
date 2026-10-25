import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  SECTIONS,
  SHELF_TOPS,
  UNIT_W,
  CAMERA_START_Z,
  CHECKOUT_Z,
  sectionStartZ,
  unitBooks,
  bookInfo,
} from '../data'
import { rig, cameraZ, clampT, nudge } from './rig'
import { floorTexture, wallTexture, runnerTexture, signTexture, fontsReady } from './textures'

const WALL_X = 3.2
const CEIL = 3.6
const STORE_FRONT = 6
const STORE_BACK = CHECKOUT_Z - 4
const STORE_LEN = STORE_FRONT - STORE_BACK
const STORE_MID = (STORE_FRONT + STORE_BACK) / 2

const mat = {
  walnut: new THREE.MeshStandardMaterial({ color: '#5a3b28', roughness: 0.75 }),
  walnutDark: new THREE.MeshStandardMaterial({ color: '#3b261a', roughness: 0.8 }),
  oak: new THREE.MeshStandardMaterial({ color: '#a8743f', roughness: 0.7 }),
  cream: new THREE.MeshStandardMaterial({ color: '#efe6d6', roughness: 0.95 }),
  green: new THREE.MeshStandardMaterial({ color: '#1d2a22', roughness: 0.6 }),
  brass: new THREE.MeshStandardMaterial({ color: '#c9a04a', roughness: 0.35, metalness: 0.8 }),
  bulb: new THREE.MeshStandardMaterial({ color: '#fff3d1', emissive: '#ffd58a', emissiveIntensity: 3 }),
  pot: new THREE.MeshStandardMaterial({ color: '#b5653f', roughness: 0.9 }),
  leaf: new THREE.MeshStandardMaterial({ color: '#3f7d4a', roughness: 0.8, flatShading: true }),
  paper: new THREE.MeshStandardMaterial({ color: '#f4ecdc', roughness: 0.9 }),
}
const box = new THREE.BoxGeometry(1, 1, 1)

function Box({ s, p, r, m = mat.walnut, ...rest }) {
  return <mesh geometry={box} material={m} scale={s} position={p} rotation={r} {...rest} />
}

/* ------------------------------------------------------------------ */
/* Camera + input                                                      */
/* ------------------------------------------------------------------ */

function damp(a, b, lambda, dt) {
  return a + (b - a) * (1 - Math.exp(-lambda * dt))
}

function CameraRig() {
  const { camera } = useThree()
  const keys = useRef({})
  const cur = useRef({ yaw: 0, pitch: 0 })

  useEffect(() => {
    const inUI = (e) => e.target instanceof Element && e.target.closest('[data-ui]')
    const onWheel = (e) => {
      if (inUI(e)) return
      nudge(e.deltaY * 0.006)
    }
    const onKey = (down) => (e) => {
      keys.current[e.key.toLowerCase()] = down
    }
    const onMove = (e) => {
      if (e.pointerType !== 'mouse') return
      rig.look.x = (e.clientX / window.innerWidth) * 2 - 1
      rig.look.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    let lastY = null
    const onTouchStart = (e) => {
      lastY = inUI(e) ? null : e.touches[0].clientY
    }
    const onTouchMove = (e) => {
      if (lastY == null) return
      const y = e.touches[0].clientY
      nudge((lastY - y) * 0.03)
      lastY = y
    }
    const down = onKey(true)
    const up = onKey(false)
    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  useFrame((state, dt) => {
    dt = Math.min(dt, 0.05)
    const k = keys.current
    const walk = (k.w || k.arrowup ? 1 : 0) - (k.s || k.arrowdown ? 1 : 0)
    if (walk) nudge(walk * 5 * dt)

    const goal = rig.focus ? rig.focus.t : rig.target
    rig.t = damp(rig.t, goal, rig.focus ? 3 : 4, dt)

    let lookX = rig.look.x
    let lookY = rig.look.y
    if (!rig.enabled) {
      lookX = Math.sin(state.clock.elapsedTime * 0.25) * 0.5
      lookY = -0.15
    }
    const yawGoal = -lookX * 0.55 + (rig.focus ? rig.focus.yaw : 0)
    const pitchGoal = -lookY * 0.22 + (rig.focus ? -0.06 : 0)
    cur.current.yaw = damp(cur.current.yaw, yawGoal, 4, dt)
    cur.current.pitch = damp(cur.current.pitch, pitchGoal, 4, dt)

    camera.position.set(0, 1.62 + Math.sin(rig.t * 2.4) * 0.012, cameraZ(rig.t))
    camera.rotation.set(cur.current.pitch, cur.current.yaw, 0, 'YXZ')
  })
  return null
}

// Two warm lights that travel with the visitor so whatever is nearby is lit.
// Wider lens on tall phone screens so the shelves on both sides stay in view.
function AdaptiveFov() {
  const { camera, size } = useThree()
  useEffect(() => {
    const aspect = size.width / size.height
    camera.fov = aspect < 0.8 ? 78 : aspect < 1.2 ? 70 : 62
    camera.updateProjectionMatrix()
  }, [camera, size])
  return null
}

function FollowLights() {
  const a = useRef()
  const b = useRef()
  useFrame(({ camera }) => {
    a.current.position.set(0, 3.1, camera.position.z - 2.5)
    b.current.position.set(0, 3.1, camera.position.z - 8.5)
  })
  return (
    <>
      <pointLight ref={a} color="#ffd9a0" intensity={14} distance={11} decay={1.6} />
      <pointLight ref={b} color="#ffd9a0" intensity={12} distance={11} decay={1.6} />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Bookshelves                                                         */
/* ------------------------------------------------------------------ */

function ShelfFrame() {
  const H = 2.4
  return (
    <group>
      <Box s={[0.04, H, 0.42]} p={[-UNIT_W / 2, H / 2, 0]} />
      <Box s={[0.04, H, 0.42]} p={[UNIT_W / 2, H / 2, 0]} />
      <Box s={[UNIT_W + 0.04, H, 0.02]} p={[0, H / 2, -0.2]} m={mat.walnutDark} />
      {SHELF_TOPS.map((y) => (
        <Box key={y} s={[UNIT_W - 0.02, 0.03, 0.4]} p={[0, y - 0.015, 0]} />
      ))}
      <Box s={[UNIT_W + 0.1, 0.06, 0.48]} p={[0, H + 0.03, 0.01]} m={mat.walnutDark} />
      <Box s={[UNIT_W, 0.12, 0.02]} p={[0, 0.06, 0.2]} m={mat.walnutDark} />
    </group>
  )
}

const PULL_HOVER = 0.07
const PULL_SELECTED = 0.24

function BookUnit({ sectionIdx, unitIdx, position, rotation, selectedIdx, onSelect }) {
  const books = useMemo(() => unitBooks(sectionIdx, unitIdx), [sectionIdx, unitIdx])
  const spines = useRef()
  const bands = useRef()
  const hovered = useRef(-1)
  const pulls = useMemo(() => new Float32Array(books.length), [books])
  const moving = useRef(new Set())
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const write = (i) => {
    const b = books[i]
    dummy.position.set(b.x, b.y, b.z + pulls[i])
    dummy.scale.set(b.w, b.h, b.d)
    dummy.updateMatrix()
    spines.current.setMatrixAt(i, dummy.matrix)
    if (b.band) {
      dummy.position.set(b.x, b.y + b.h * 0.3, b.z + pulls[i])
      dummy.scale.set(b.w * 1.02, 0.018, b.d * 1.02)
    } else {
      dummy.scale.set(0, 0, 0)
    }
    dummy.updateMatrix()
    bands.current.setMatrixAt(i, dummy.matrix)
  }

  useLayoutEffect(() => {
    const c = new THREE.Color()
    books.forEach((b, i) => {
      write(i)
      spines.current.setColorAt(i, c.set(b.color))
      bands.current.setColorAt(i, c.set(b.band || '#000'))
    })
    spines.current.instanceMatrix.needsUpdate = true
    bands.current.instanceMatrix.needsUpdate = true
    spines.current.instanceColor.needsUpdate = true
    bands.current.instanceColor.needsUpdate = true
    spines.current.computeBoundingSphere()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books])

  const selRef = useRef(selectedIdx)
  useEffect(() => {
    if (selRef.current >= 0) moving.current.add(selRef.current)
    if (selectedIdx >= 0) moving.current.add(selectedIdx)
    selRef.current = selectedIdx
  }, [selectedIdx])

  useFrame((_, dt) => {
    if (!moving.current.size) return
    const k = 1 - Math.exp(-Math.min(dt, 0.05) * 12)
    for (const i of moving.current) {
      const goal = i === selRef.current ? PULL_SELECTED : i === hovered.current ? PULL_HOVER : 0
      pulls[i] += (goal - pulls[i]) * k
      if (Math.abs(goal - pulls[i]) < 0.0005) {
        pulls[i] = goal
        moving.current.delete(i)
      }
      write(i)
    }
    spines.current.instanceMatrix.needsUpdate = true
    bands.current.instanceMatrix.needsUpdate = true
  })

  const setHover = (i) => {
    if (i === hovered.current) return
    if (hovered.current >= 0) moving.current.add(hovered.current)
    hovered.current = i
    if (i >= 0) moving.current.add(i)
    document.body.style.cursor = i >= 0 ? 'pointer' : ''
  }

  return (
    <group position={position} rotation={rotation}>
      <ShelfFrame />
      <instancedMesh
        ref={spines}
        args={[box, undefined, books.length]}
        onPointerMove={(e) => {
          e.stopPropagation()
          if (rig.enabled) setHover(e.instanceId)
        }}
        onPointerOut={() => setHover(-1)}
        onClick={(e) => {
          e.stopPropagation()
          if (!rig.enabled) return
          const i = e.instanceId
          const left = e.point.x < 0
          onSelect({
            ...bookInfo(sectionIdx, unitIdx, i),
            color: books[i].color,
            band: books[i].band,
            sectionIdx,
            unitIdx,
            idx: i,
            focus: {
              t: clampT(CAMERA_START_Z - (e.point.z + 1.7)),
              yaw: left ? 0.78 : -0.78,
            },
          })
        }}
      >
        <meshStandardMaterial roughness={0.65} />
      </instancedMesh>
      <instancedMesh ref={bands} args={[box, undefined, books.length]} raycast={() => null}>
        <meshStandardMaterial roughness={0.35} metalness={0.4} />
      </instancedMesh>
    </group>
  )
}

function HangingSign({ z, title, sub, ready, width = 2.6, y = 2.95 }) {
  const tex = useMemo(() => (ready ? signTexture(title, sub) : null), [ready, title, sub])
  const materials = useMemo(() => {
    const front = new THREE.MeshStandardMaterial({ map: tex, color: tex ? '#fff' : '#1d2a22', roughness: 0.6, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.18 })
    return [mat.walnutDark, mat.walnutDark, mat.walnutDark, mat.walnutDark, front, mat.green]
  }, [tex])
  const h = width * (320 / 1024)
  return (
    <group position={[0, y, z]}>
      <mesh geometry={box} material={materials} scale={[width, h, 0.05]} />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * width * 0.4, (CEIL - y) / 2 + h / 4, 0]} material={mat.brass}>
          <cylinderGeometry args={[0.008, 0.008, CEIL - y - h / 2, 6]} />
        </mesh>
      ))}
    </group>
  )
}

function Section({ i, ready, selected, onSelect }) {
  const z0 = sectionStartZ(i)
  const units = [
    { u: 0, x: -2.45, z: z0 - 1.3, rot: Math.PI / 2 },
    { u: 1, x: -2.45, z: z0 - 3.8, rot: Math.PI / 2 },
    { u: 2, x: 2.45, z: z0 - 1.3, rot: -Math.PI / 2 },
    { u: 3, x: 2.45, z: z0 - 3.8, rot: -Math.PI / 2 },
  ]
  return (
    <group>
      <HangingSign z={z0} title={SECTIONS[i].name} sub={SECTIONS[i].sub} ready={ready} />
      {units.map(({ u, x, z, rot }) => (
        <BookUnit
          key={u}
          sectionIdx={i}
          unitIdx={u}
          position={[x, 0, z]}
          rotation={[0, rot, 0]}
          selectedIdx={selected && selected.sectionIdx === i && selected.unitIdx === u ? selected.idx : -1}
          onSelect={onSelect}
        />
      ))}
      <Plant position={[-2.55, 0, z0 - 5.5]} seed={i * 2} />
      <Plant position={[2.55, 0, z0 - 5.5]} seed={i * 2 + 1} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Room + props                                                        */
/* ------------------------------------------------------------------ */

function Plant({ position, seed = 0, scale = 1 }) {
  const leaves = useMemo(() => {
    let s = seed * 9301 + 49297
    const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
    return Array.from({ length: 7 }, () => ({
      p: [(r() - 0.5) * 0.35, 0.75 + r() * 0.55, (r() - 0.5) * 0.35],
      s: 0.18 + r() * 0.14,
    }))
  }, [seed])
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.25, 0]} material={mat.pot}>
        <cylinderGeometry args={[0.2, 0.15, 0.5, 16]} />
      </mesh>
      <mesh position={[0, 0.5, 0]} material={mat.walnutDark}>
        <cylinderGeometry args={[0.19, 0.19, 0.02, 16]} />
      </mesh>
      {leaves.map((l, k) => (
        <mesh key={k} position={l.p} scale={l.s} material={mat.leaf}>
          <icosahedronGeometry args={[1, 0]} />
        </mesh>
      ))}
    </group>
  )
}

function PendantLamp({ z }) {
  return (
    <group position={[0, CEIL, z]}>
      <mesh position={[0, -0.3, 0]} material={mat.walnutDark}>
        <cylinderGeometry args={[0.006, 0.006, 0.6, 4]} />
      </mesh>
      <mesh position={[0, -0.68, 0]} material={mat.green}>
        <cylinderGeometry args={[0.06, 0.26, 0.2, 20, 1, true]} />
      </mesh>
      <mesh position={[0, -0.74, 0]} material={mat.bulb}>
        <sphereGeometry args={[0.06, 12, 8]} />
      </mesh>
    </group>
  )
}

function Room({ ready }) {
  const floor = useMemo(floorTexture, [])
  const wall = useMemo(wallTexture, [])
  const runner = useMemo(runnerTexture, [])
  const lamps = []
  for (let z = 1; z > STORE_BACK + 2; z -= 3) lamps.push(z)
  const beams = []
  for (let z = STORE_FRONT - 1; z > STORE_BACK; z -= 3) beams.push(z)

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, STORE_MID]}>
        <planeGeometry args={[WALL_X * 2, STORE_LEN]} />
        <meshStandardMaterial map={floor} roughness={0.55} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, STORE_MID - 2]}>
        <planeGeometry args={[1.3, STORE_LEN - 8]} />
        <meshStandardMaterial map={runner} roughness={1} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, CEIL, STORE_MID]} material={mat.cream}>
        <planeGeometry args={[WALL_X * 2, STORE_LEN]} />
      </mesh>
      {beams.map((z) => (
        <Box key={z} s={[WALL_X * 2, 0.16, 0.2]} p={[0, CEIL - 0.08, z]} m={mat.walnutDark} />
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * WALL_X, CEIL / 2, STORE_MID]} rotation={[0, -s * Math.PI / 2, 0]}>
          <planeGeometry args={[STORE_LEN, CEIL]} />
          <meshStandardMaterial map={wall} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, CEIL / 2, STORE_BACK]}>
        <planeGeometry args={[WALL_X * 2, CEIL]} />
        <meshStandardMaterial map={wall} roughness={0.9} />
      </mesh>
      <mesh position={[0, CEIL / 2, STORE_FRONT]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[WALL_X * 2, CEIL]} />
        <meshStandardMaterial map={wall} roughness={0.9} />
      </mesh>
      {lamps.map((z) => (
        <PendantLamp key={z} z={z} />
      ))}
      <HangingSign z={0.6} title="Lantern & Leaf" sub="Booksellers · Est. 1987" ready={ready} width={3.2} y={2.85} />
    </group>
  )
}

function BookStack({ position, seed, count = 6 }) {
  const items = useMemo(() => {
    let s = seed * 7919 + 17
    const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
    const palette = SECTIONS[0].palette
    let y = 0
    return Array.from({ length: count }, () => {
      const h = 0.035 + r() * 0.03
      const item = { y: y + h / 2, h, w: 0.24 + r() * 0.06, d: 0.17 + r() * 0.04, rot: (r() - 0.5) * 0.4, color: palette[Math.floor(r() * palette.length)] }
      y += h
      return item
    })
  }, [seed, count])
  return (
    <group position={position}>
      {items.map((b, k) => (
        <mesh key={k} geometry={box} position={[0, b.y, 0]} rotation={[0, b.rot, 0]} scale={[b.w, b.h, b.d]}>
          <meshStandardMaterial color={b.color} roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

function DisplayTable({ position, seed }) {
  return (
    <group position={position}>
      <Box s={[1.2, 0.05, 0.8]} p={[0, 0.76, 0]} m={mat.oak} />
      {[[-0.55, -0.35], [0.55, -0.35], [-0.55, 0.35], [0.55, 0.35]].map(([x, z]) => (
        <Box key={`${x}${z}`} s={[0.05, 0.74, 0.05]} p={[x, 0.37, z]} m={mat.walnutDark} />
      ))}
      <BookStack position={[-0.32, 0.785, -0.12]} seed={seed} count={7} />
      <BookStack position={[0.05, 0.785, 0.15]} seed={seed + 3} count={4} />
      <BookStack position={[0.36, 0.785, -0.1]} seed={seed + 5} count={9} />
    </group>
  )
}

function Checkout({ ready }) {
  const z = CHECKOUT_Z
  return (
    <group>
      <Box s={[2.2, 1.0, 0.7]} p={[1.6, 0.5, z - 0.8]} m={mat.walnut} />
      <Box s={[2.3, 0.05, 0.8]} p={[1.6, 1.02, z - 0.8]} m={mat.oak} />
      <Box s={[0.36, 0.22, 0.3]} p={[1.9, 1.16, z - 0.85]} r={[0, -0.3, 0]} m={mat.green} />
      <Box s={[0.3, 0.02, 0.2]} p={[1.9, 1.29, z - 0.9]} r={[-0.5, -0.3, 0]} m={mat.brass} />
      <BookStack position={[1.1, 1.045, z - 0.75]} seed={42} count={5} />
      <Box s={[0.25, 0.32, 0.01]} p={[1.45, 1.2, z - 0.95]} r={[0, 0, 0]} m={mat.paper} />
      {/* reading nook */}
      <group position={[-1.9, 0, z - 1.2]} rotation={[0, 0.5, 0]}>
        <Box s={[0.9, 0.42, 0.85]} p={[0, 0.21, 0]} m={new THREE.MeshStandardMaterial({ color: '#7a2e2a', roughness: 0.9 })} />
        <Box s={[0.9, 0.6, 0.18]} p={[0, 0.7, -0.34]} m={new THREE.MeshStandardMaterial({ color: '#7a2e2a', roughness: 0.9 })} />
        <Box s={[0.16, 0.3, 0.85]} p={[-0.4, 0.55, 0]} m={new THREE.MeshStandardMaterial({ color: '#6a2724', roughness: 0.9 })} />
        <Box s={[0.16, 0.3, 0.85]} p={[0.4, 0.55, 0]} m={new THREE.MeshStandardMaterial({ color: '#6a2724', roughness: 0.9 })} />
      </group>
      <group position={[-2.6, 0, z - 2.2]}>
        <mesh position={[0, 0.8, 0]} material={mat.brass}>
          <cylinderGeometry args={[0.015, 0.015, 1.6, 6]} />
        </mesh>
        <mesh position={[0, 1.65, 0]} material={mat.cream}>
          <cylinderGeometry args={[0.12, 0.2, 0.25, 16, 1, true]} />
        </mesh>
        <pointLight position={[0, 1.55, 0.3]} color="#ffcf8a" intensity={4} distance={4} decay={1.8} />
      </group>
      <Plant position={[2.7, 0, z - 2.5]} seed={99} scale={1.3} />
      <HangingSign z={STORE_BACK + 0.05} title="Checkout" sub="Thank you for reading" ready={ready} width={2.8} y={2.3} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* The trolley you push around                                         */
/* ------------------------------------------------------------------ */

function TrolleyBook({ item, k }) {
  const ref = useRef()
  const col = k % 2
  const layer = Math.floor(k / 2)
  const target = 0.05 + layer * 0.05 + 0.025
  useLayoutEffect(() => {
    ref.current.position.y = target + 0.7
  }, [target])
  useFrame((_, dt) => {
    ref.current.position.y = damp(ref.current.position.y, target, 9, Math.min(dt, 0.05))
  })
  return (
    <mesh
      ref={ref}
      geometry={box}
      position={[-0.17 + col * 0.34, target, 0]}
      rotation={[0, ((k * 37) % 10) / 40 - 0.12, 0]}
      scale={[0.3, 0.045, 0.22]}
    >
      <meshStandardMaterial color={item.color} roughness={0.7} />
    </mesh>
  )
}

function Trolley({ items }) {
  const ref = useRef()
  const fwd = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera }) => {
    const yaw = camera.rotation.y * 0.55
    fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw))
    ref.current.position.copy(camera.position).addScaledVector(fwd, 1.7)
    ref.current.position.y = camera.position.y - 0.92
    ref.current.rotation.y = yaw
  })
  return (
    <group ref={ref}>
      {/* basket */}
      <Box s={[0.8, 0.03, 0.52]} p={[0, 0.03, 0]} m={mat.oak} />
      <Box s={[0.8, 0.16, 0.02]} p={[0, 0.11, 0.26]} m={mat.oak} />
      <Box s={[0.8, 0.16, 0.02]} p={[0, 0.11, -0.26]} m={mat.oak} />
      <Box s={[0.02, 0.16, 0.52]} p={[-0.4, 0.11, 0]} m={mat.oak} />
      <Box s={[0.02, 0.16, 0.52]} p={[0.4, 0.11, 0]} m={mat.oak} />
      {/* handle */}
      {[-0.36, 0.36].map((x) => (
        <Box key={x} s={[0.025, 0.3, 0.025]} p={[x, 0.3, 0.3]} r={[0.35, 0, 0]} m={mat.brass} />
      ))}
      <mesh position={[0, 0.44, 0.35]} rotation={[0, 0, Math.PI / 2]} material={mat.green}>
        <cylinderGeometry args={[0.022, 0.022, 0.78, 10]} />
      </mesh>
      {items.slice(-16).map((item, k) => (
        <TrolleyBook key={item.key} item={item} k={k} />
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */

export default function Store({ selected, onSelect, cart }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    fontsReady().then(() => setReady(true))
  }, [])

  useEffect(() => {
    rig.focus = selected ? selected.focus : null
  }, [selected])

  return (
    <>
      <color attach="background" args={['#1d2a22']} />
      <fog attach="fog" args={['#1d2a22', 9, 28]} />
      <hemisphereLight args={['#fff1d6', '#3b2a1e', 1.1]} />
      <ambientLight intensity={0.25} />
      <FollowLights />
      <AdaptiveFov />
      <CameraRig />

      <Room ready={ready} />
      <DisplayTable position={[-1.55, 0, -1.4]} seed={3} />
      <DisplayTable position={[1.55, 0, -1.4]} seed={11} />
      <Plant position={[-2.7, 0, 4.5]} seed={5} scale={1.2} />
      <Plant position={[2.7, 0, 4.5]} seed={6} scale={1.2} />
      {SECTIONS.map((s, i) => (
        <Section key={s.id} i={i} ready={ready} selected={selected} onSelect={onSelect} />
      ))}
      <Checkout ready={ready} />
      <Trolley items={cart} />
    </>
  )
}

