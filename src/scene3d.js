import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { Reflector } from 'three/addons/objects/Reflector.js'
import { CATEGORIES, MATERIALS, CAT_MAP, MATERIAL_BY_ID } from './data.js'

const ROOM_RADIUS = 18
const CABINET_WIDTH = 5.8
const BOTTLE_POS = new THREE.Vector3(0, 0.06, 0)

// ---------------------------------------------------------------- 共享几何体
const G = {
  oilBody: new THREE.CylinderGeometry(0.072, 0.084, 0.2, 12),
  oilFill: new THREE.CylinderGeometry(0.052, 0.064, 0.115, 12),
  oilCap: new THREE.CylinderGeometry(0.042, 0.042, 0.062, 10),
  dried: new THREE.DodecahedronGeometry(0.105, 0),
  driedTip: new THREE.ConeGeometry(0.045, 0.12, 5),
  resin: new THREE.OctahedronGeometry(0.118, 0),
  seed: new THREE.SphereGeometry(0.055, 8, 6),
  bark: new THREE.CylinderGeometry(0.1, 0.1, 0.2, 10, 1, true, 0, Math.PI * 1.55),
  root: new THREE.IcosahedronGeometry(0.112, 0),
  wood: new THREE.CylinderGeometry(0.102, 0.102, 0.21, 14),
  woodRing: new THREE.CircleGeometry(0.09, 14),
  absBody: new THREE.CylinderGeometry(0.098, 0.098, 0.14, 14),
  absLid: new THREE.CylinderGeometry(0.104, 0.104, 0.028, 14),
  crystal: new THREE.OctahedronGeometry(0.115, 0),
  foot: new THREE.CylinderGeometry(0.115, 0.125, 0.024, 12),
  particle: new THREE.SphereGeometry(0.05, 8, 6),
}

const matCache = new Map()
function mat(key, factory) {
  if (!matCache.has(key)) matCache.set(key, factory())
  return matCache.get(key)
}

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return Math.abs(h)
}
function variantOf(m) { return hash(m.name) % 3 }
function tint(m) {
  const c = new THREE.Color(m.color)
  const v = variantOf(m)
  c.offsetHSL((v - 1) * 0.018, (v - 1) * 0.03, (v - 1) * 0.045)
  return c
}

function stdMat(m, opts = {}) {
  const { kind = 'a', ...materialOptions } = opts
  const key = `std:${m.cat}:${m.type}:${variantOf(m)}:${kind}`
  return mat(key, () => new THREE.MeshStandardMaterial({
    color: tint(m), roughness: 0.62, metalness: 0.08, flatShading: true, ...materialOptions,
  }))
}
function glassyMat(m, opts = {}) {
  const key = `glassy:${m.cat}:${m.type}:${variantOf(m)}`
  return mat(key, () => new THREE.MeshPhysicalMaterial({
    color: tint(m), transparent: true, opacity: 0.9, roughness: 0.16,
    metalness: 0.05, clearcoat: 0.9, clearcoatRoughness: 0.12,
    emissive: tint(m), emissiveIntensity: 0.16, flatShading: true, ...opts,
  }))
}

function glowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.28, 'rgba(255,255,255,.65)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function makeMarbleTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1024
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#e8e1d5'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  let seed = 1847
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
  // Soft, branching warm-gray and champagne veins in polished ivory stone.
  for (let vein = 0; vein < 12; vein++) {
    let x = rand() * canvas.width
    let y = -100 - rand() * 300
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let segment = 0; segment < 7; segment++) {
      const nextX = x + (rand() - 0.5) * 210
      const nextY = y + 190 + rand() * 90
      ctx.bezierCurveTo(x + (rand() - 0.5) * 120, y + 55, nextX + (rand() - 0.5) * 110, nextY - 70, nextX, nextY)
      x = nextX; y = nextY
    }
    ctx.strokeStyle = vein % 3 === 0 ? 'rgba(170,139,91,.17)' : 'rgba(133,128,117,.15)'
    ctx.lineWidth = 2 + rand() * 4
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,.42)'
    ctx.lineWidth = 1
    ctx.stroke()
  }
  for (let i = 0; i < 900; i++) {
    const x = rand() * canvas.width, y = rand() * canvas.height
    ctx.fillStyle = i % 5 ? 'rgba(122,112,96,.025)' : 'rgba(255,255,255,.12)'
    ctx.fillRect(x, y, 1 + rand() * 2, 1 + rand() * 2)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function makeLabel(cat, count) {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 128
  const ctx = c.getContext('2d')
  ctx.fillStyle = 'rgba(255,255,255,.96)'
  roundRect(ctx, 4, 4, 504, 120, 22); ctx.fill()
  ctx.strokeStyle = cat.color; ctx.lineWidth = 3; ctx.stroke()
  ctx.fillStyle = cat.color
  roundRect(ctx, 22, 28, 8, 72, 4); ctx.fill()
  ctx.fillStyle = '#443b30'
  ctx.font = 'bold 52px "PingFang SC","Microsoft YaHei",sans-serif'
  ctx.fillText(cat.name, 48, 70)
  ctx.fillStyle = cat.color
  ctx.font = 'bold 24px "PingFang SC",sans-serif'
  ctx.fillText(`${cat.en}  ·  ${count} 味`, 48, 108)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  const spr = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
    map: tex, transparent: true, depthWrite: false, fog: false, toneMapped: false,
  }))
  spr.scale.set(2.3, 0.575, 1)
  return spr
}

function makeMaterialNameLabel(material) {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 128
  const ctx = c.getContext('2d')
  ctx.fillStyle = 'rgba(255,255,255,.99)'
  roundRect(ctx, 5, 5, 502, 118, 22); ctx.fill()
  ctx.strokeStyle = 'rgba(153,111,51,.88)'; ctx.lineWidth = 4; ctx.stroke()
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#2f261b'
  let fontSize = 72
  ctx.font = `bold ${fontSize}px "PingFang SC","Microsoft YaHei",sans-serif`
  while (ctx.measureText(material.name).width > 470 && fontSize > 25) {
    fontSize -= 2
    ctx.font = `bold ${fontSize}px "PingFang SC","Microsoft YaHei",sans-serif`
  }
  ctx.fillText(material.name, 256, 64, 470)
  const texture = new THREE.CanvasTexture(c)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, fog: false, toneMapped: false, side: THREE.DoubleSide }),
  )
  label.scale.set(1.65, 0.52, 1)
  label.renderOrder = 5
  return label
}

function makeBrandSprite() {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 128
  const ctx = c.getContext('2d')
  ctx.textAlign = 'center'
  ctx.fillStyle = '#55442e'
  ctx.font = 'bold 42px Georgia,serif'
  ctx.fillText('SCENT · BLENDER', 256, 60)
  ctx.fillStyle = '#a18454'
  ctx.font = '23px "PingFang SC",sans-serif'
  ctx.fillText('香 气 调 配 工 坊', 256, 100)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const spr = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.85, side: THREE.DoubleSide, toneMapped: false }),
  )
  spr.scale.set(2.5, 0.625, 1)
  return spr
}

function makeBottleLabel() {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 256
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, 512, 256)
  ctx.fillStyle = 'rgba(245,238,222,.94)'
  roundRect(ctx, 6, 6, 500, 244, 18); ctx.fill()
  ctx.strokeStyle = '#b08a45'; ctx.lineWidth = 4
  roundRect(ctx, 16, 16, 480, 224, 14); ctx.stroke()
  ctx.textAlign = 'center'
  ctx.fillStyle = '#3a2c1c'
  ctx.font = 'bold 46px Georgia,serif'
  ctx.fillText('Scent·Blender', 256, 96)
  ctx.font = '24px "PingFang SC",sans-serif'
  ctx.fillText('香 调 调 配 工 坊', 256, 140)
  ctx.fillStyle = '#9a7840'
  ctx.font = '19px Georgia,serif'
  ctx.fillText('EAU DE PARFUM  ·  No.001', 256, 190)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** 按形态构造一个香料小模型 */
function buildSpiceModel(m, glowTex) {
  const group = new THREE.Group()
  const footMat = mat(`foot:${m.cat}:${variantOf(m)}`, () => new THREE.MeshStandardMaterial({
    color: new THREE.Color(m.color).multiplyScalar(0.42), roughness: 0.8, metalness: 0.25,
  }))
  const foot = new THREE.Mesh(G.foot, footMat)
  foot.position.y = 0.012
  group.add(foot)

  const add = (geo, material, x = 0, y = 0, z = 0, rot = null, scale = null) => {
    const mesh = new THREE.Mesh(geo, material)
    mesh.position.set(x, y, z)
    if (rot) mesh.rotation.set(...rot)
    if (scale) mesh.scale.set(...scale)
    mesh.userData.materialId = m.id
    group.add(mesh)
    return mesh
  }

  switch (m.type) {
    case 'oil': {
      add(G.oilBody, glassyMat(m, { opacity: 0.88, emissiveIntensity: 0.1 }), 0, 0.13)
      add(G.oilFill, new THREE.MeshStandardMaterial({
        color: new THREE.Color(m.color).lerp(new THREE.Color('#fff1c5'), 0.18), roughness: 0.26, metalness: 0.02,
      }), 0, 0.095)
      add(G.oilCap, mat(`cap:${m.cat}`, () => new THREE.MeshStandardMaterial({ color: '#c8a45e', roughness: 0.35, metalness: 0.75 })), 0, 0.265)
      break
    }
    case 'dried': {
      add(G.dried, stdMat(m, { roughness: 0.9 }), 0, 0.13, 0, [0.3, 0.4, 0.2], [1, 0.85, 1])
      for (let i = 0; i < 3; i++) {
        add(G.driedTip, stdMat(m, { kind: 'tip', roughness: 0.95 }),
          (i - 1) * 0.055, 0.245, (i % 2) * 0.035, [0, 0, (i - 1) * 0.28])
      }
      break
    }
    case 'resin': {
      add(G.resin, glassyMat(m, { opacity: 0.92, emissiveIntensity: 0.28, roughness: 0.1 }), 0, 0.14, 0, [0.3, 0.5, 0.15])
      break
    }
    case 'seed': {
      const sm = stdMat(m, { roughness: 0.72 })
      add(G.seed, sm, -0.05, 0.09, 0.02)
      add(G.seed, sm, 0.05, 0.1, -0.02)
      add(G.seed, sm, 0, 0.17, 0.03, null, [0.9, 0.9, 0.9])
      break
    }
    case 'bark': {
      add(G.bark, stdMat(m, { roughness: 0.95, side: THREE.DoubleSide, color: new THREE.Color(m.color).multiplyScalar(0.8) }), 0, 0.13, 0, [0, 0.4, 0])
      break
    }
    case 'root': {
      add(G.root, stdMat(m, { roughness: 0.92 }), 0, 0.13, 0, [0.5, 0.8, 0.2], [1, 0.8, 0.9])
      break
    }
    case 'wood': {
      const woodMat = stdMat(m, { roughness: 0.85, flatShading: false })
      add(G.wood, woodMat, 0, 0.14, 0, [0, 0, Math.PI / 2])
      const ringMat = mat(`ring:${m.cat}`, () => new THREE.MeshStandardMaterial({ color: new THREE.Color(m.color).multiplyScalar(1.35), roughness: 0.9, side: THREE.DoubleSide }))
      add(G.woodRing, ringMat, 0.107, 0.14, 0, [0, Math.PI / 2, 0])
      add(G.woodRing, ringMat, -0.107, 0.14, 0, [0, -Math.PI / 2, 0])
      break
    }
    case 'absolute': {
      add(G.absBody, stdMat(m, { roughness: 0.45, metalness: 0.35, flatShading: false }), 0, 0.095)
      add(G.absLid, mat('lidgold', () => new THREE.MeshStandardMaterial({ color: '#c9a45c', roughness: 0.3, metalness: 0.8 })), 0, 0.18)
      break
    }
    case 'synthetic': {
      add(G.crystal, glassyMat(m, { opacity: 0.9, emissiveIntensity: 0.7, roughness: 0.08, metalness: 0.35 }), 0, 0.145, 0, [0.2, 0.6, 0.1])
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: m.glow, transparent: true, opacity: 0.42,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }))
      halo.scale.set(0.42, 0.42, 1)
      halo.position.y = 0.145
      group.add(halo)
      break
    }
    default:
      add(G.dried, stdMat(m), 0, 0.13)
  }

  group.userData.materialId = m.id
  group.userData.baseScale = 1.82
  group.userData.targetScale = 1.82
  return group
}

// ---------------------------------------------------------------- 主工厂
export function createScene(container, callbacks = {}) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#f1ede5')
  scene.fog = new THREE.FogExp2('#f1ede5', 0.006)

  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 120)
  camera.position.set(0, 5.0, 9.4)

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.84
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'

  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  pmrem.dispose()

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 1.8, 0)
  controls.enableDamping = true
  controls.dampingFactor = 0.045
  controls.enableZoom = true
  controls.zoomSpeed = 0.9
  controls.enablePan = false
  controls.minDistance = 3.2
  controls.maxDistance = 13.2
  controls.minPolarAngle = 0.38
  controls.maxPolarAngle = 1.52
  controls.rotateSpeed = 0.52
  controls.addEventListener('change', () => callbacks.onCameraChange?.())

  // ---------------- 灯光 ----------------
  scene.add(new THREE.AmbientLight('#fff9ee', 0.58))
  scene.add(new THREE.HemisphereLight('#fff9ec', '#9d8870', 0.68))
  const key = new THREE.DirectionalLight('#fff2d9', 2.25)
  key.position.set(6, 12, 8)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.left = -20; key.shadow.camera.right = 20
  key.shadow.camera.top = 18; key.shadow.camera.bottom = -8
  key.shadow.camera.near = 1; key.shadow.camera.far = 48
  key.shadow.bias = -0.0008
  scene.add(key)
  const fill = new THREE.PointLight('#e8c892', 15, 22, 2)
  fill.position.set(-6, 3.5, 2)
  scene.add(fill)
  const rim = new THREE.PointLight('#fff0d2', 14, 20, 2)
  rim.position.set(6, 4.5, -2)
  scene.add(rim)
  const bottleLight = new THREE.PointLight('#f1d19a', 14, 8, 2)
  bottleLight.position.copy(BOTTLE_POS).add(new THREE.Vector3(0, 1.1, 0))
  scene.add(bottleLight)

  const perfumeSpot = new THREE.SpotLight('#fff0d5', 42, 22, Math.PI / 5, 0.72, 2)
  perfumeSpot.position.set(0, 8.2, 4.2)
  perfumeSpot.target.position.set(0, 0.55, 0)
  scene.add(perfumeSpot, perfumeSpot.target)
  const perfumeRim = new THREE.PointLight('#dcb56f', 12, 9, 2)
  perfumeRim.position.set(-1.8, 2.9, -1.5)
  scene.add(perfumeRim)

  // ---------------- 地面 ----------------
  const marbleTexture = makeMarbleTexture()
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(ROOM_RADIUS + 1.1, 128),
    new THREE.MeshPhysicalMaterial({ map: marbleTexture, color: '#fffaf0', roughness: 0.2, metalness: 0.035, clearcoat: 0.88, clearcoatRoughness: 0.12 }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.29
  floor.receiveShadow = true
  scene.add(floor)
  const marbleReflector = new Reflector(new THREE.CircleGeometry(ROOM_RADIUS + 1.1, 128), {
    color: '#c8bda8', textureWidth: 768, textureHeight: 768, clipBias: 0.003, multisample: 0,
  })
  marbleReflector.rotation.x = -Math.PI / 2
  marbleReflector.position.y = -0.27
  marbleReflector.renderOrder = 1
  marbleReflector.material.transparent = true
  marbleReflector.material.depthWrite = false
  marbleReflector.material.onBeforeCompile = (shader) => {
    shader.uniforms.tMarble = { value: marbleTexture }
    shader.vertexShader = shader.vertexShader
      .replace('varying vec4 vUv;', 'varying vec4 vUv;\n\t\tvarying vec2 vMarbleUv;')
      .replace('vUv = textureMatrix * vec4( position, 1.0 );', 'vUv = textureMatrix * vec4( position, 1.0 );\n\t\t\tvMarbleUv = uv;')
    shader.fragmentShader = shader.fragmentShader
      .replace('uniform sampler2D tDiffuse;', 'uniform sampler2D tDiffuse;\n\t\tuniform sampler2D tMarble;\n\t\tvarying vec2 vMarbleUv;')
      .replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );', 'vec3 reflection = blendOverlay( base.rgb, color );\n\t\t\tvec3 stone = texture2D( tMarble, vMarbleUv ).rgb;\n\t\t\tgl_FragColor = vec4( mix( stone, reflection, 0.58 ), 0.82 );')
  }
  marbleReflector.material.customProgramCacheKey = () => 'scent-marble-reflector-v1'
  scene.add(marbleReflector)
  for (const [inner, outer, opacity] of [[2.2, 2.24, 0.22], [4.8, 4.83, 0.12], [8.0, 8.03, 0.1]]) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 128), new THREE.MeshBasicMaterial({ color: '#b98b4b', transparent: true, opacity, side: THREE.DoubleSide }))
    ring.rotation.x = -Math.PI / 2
    ring.position.y = -0.262
    scene.add(ring)
  }

  const glowTex = glowTexture()
  const materialTargets = []
  const cellTargets = []
  const cellRecords = []
  const modelByCat = {}

  // ---------------- 360° 环绕式香料工坊 ----------------
  const woodFrame = new THREE.MeshStandardMaterial({ color: '#b89a6b', roughness: 0.58, metalness: 0.12 })
  const woodShelf = new THREE.MeshStandardMaterial({ color: '#f2e9da', roughness: 0.52, metalness: 0.06 })
  const brassTrim = new THREE.MeshStandardMaterial({ color: '#c6a15f', roughness: 0.25, metalness: 0.78 })
  const roomWall = new THREE.Mesh(new THREE.CylinderGeometry(ROOM_RADIUS, ROOM_RADIUS, 7.4, 128, 1, true), new THREE.MeshStandardMaterial({ color: '#eee7dc', roughness: 0.88, side: THREE.BackSide }))
  roomWall.position.y = 3.55
  roomWall.receiveShadow = true
  scene.add(roomWall)

  // 圆弧墙面的竖向木饰条、檐口和暖光线，留出完整漫游空间。
  const wallTrim = new THREE.MeshStandardMaterial({ color: '#cbbb9d', roughness: 0.48, metalness: 0.16 })
  for (let i = 0; i < 144; i++) {
    const a = (i / 144) * Math.PI * 2
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.034, 6.8, 0.055), wallTrim)
    rib.position.set(Math.sin(a) * (ROOM_RADIUS - 0.08), 3.45, Math.cos(a) * (ROOM_RADIUS - 0.08))
    rib.rotation.y = a
    scene.add(rib)
  }
  for (const y of [0.12, 6.98]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(ROOM_RADIUS - 0.08, ROOM_RADIUS - 0.08, 0.08, 128, 1, true), brassTrim)
    rail.position.y = y
    scene.add(rail)
  }

  // Continuous curved display ledges echo the reference's wraparound cabinetry.
  for (const [y, radius] of [[0.72, 17.34], [1.78, 17.42], [2.86, 17.34], [3.94, 17.42], [5.02, 17.34], [6.1, 17.42]]) {
    const shelfLine = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.052, 8, 160), brassTrim)
    shelfLine.rotation.x = Math.PI / 2
    shelfLine.position.y = y
    scene.add(shelfLine)
    const led = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.07, 0.026, 6, 160), new THREE.MeshBasicMaterial({ color: '#ffe5b4', transparent: true, opacity: 0.62, toneMapped: false }))
    led.rotation.x = Math.PI / 2
    led.position.y = y - 0.07
    scene.add(led)
  }

  // A recessed circular ceiling with an illuminated champagne ring and small downlights.
  const ceiling = new THREE.Mesh(new THREE.CylinderGeometry(ROOM_RADIUS, ROOM_RADIUS, 0.14, 128), new THREE.MeshStandardMaterial({ color: '#f2ece2', roughness: 0.74, metalness: 0.02, side: THREE.DoubleSide }))
  ceiling.position.y = 7.28
  scene.add(ceiling)
  const ceilingRing = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.075, 12, 160), new THREE.MeshBasicMaterial({ color: '#fff3dc', transparent: true, opacity: 0.94, toneMapped: false }))
  ceilingRing.rotation.x = Math.PI / 2
  ceilingRing.position.y = 7.13
  scene.add(ceilingRing)
  const ceilingGoldRing = new THREE.Mesh(new THREE.TorusGeometry(6.42, 0.022, 8, 160), brassTrim)
  ceilingGoldRing.rotation.x = Math.PI / 2
  ceilingGoldRing.position.y = 7.11
  scene.add(ceilingGoldRing)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const downlight = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff4dd', toneMapped: false }))
    downlight.position.set(Math.sin(a) * 6.2, 7.08, Math.cos(a) * 6.2)
    scene.add(downlight)
  }

  const dustPositions = new Float32Array(110 * 3)
  for (let i = 0; i < 110; i++) {
    const a = Math.random() * Math.PI * 2
    const r = 2.5 + Math.random() * 6.7
    dustPositions[i * 3] = Math.sin(a) * r
    dustPositions[i * 3 + 1] = 0.5 + Math.random() * 5.8
    dustPositions[i * 3 + 2] = Math.cos(a) * r
  }
  const dustGeometry = new THREE.BufferGeometry()
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
  const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: '#d8bc8c', size: 0.028, transparent: true, opacity: 0.34, depthWrite: false, sizeAttenuation: true }))
  scene.add(dust)

  CATEGORIES.forEach((cat, idx) => {
    const angle = (idx / CATEGORIES.length) * Math.PI * 2
    const cabinet = new THREE.Group()
    cabinet.position.set(Math.sin(angle) * 14.25, 0, Math.cos(angle) * 14.25)
    cabinet.rotation.y = angle + Math.PI
    scene.add(cabinet)

    const backMat = new THREE.MeshStandardMaterial({ color: '#f2ebdf', roughness: 0.8, emissive: new THREE.Color(cat.color), emissiveIntensity: 0.04 })
    const back = new THREE.Mesh(new THREE.BoxGeometry(CABINET_WIDTH, 6.82, 0.16), backMat)
    back.position.y = 3.55
    back.receiveShadow = true
    back.userData.catKey = cat.key
    cabinet.add(back); cellTargets.push(back)

    const cabinetLight = new THREE.PointLight('#ffe3b5', 5.5, 7.5, 2)
    cabinetLight.position.set(0, 5.65, 1.15)
    cabinet.add(cabinetLight)

    const top = new THREE.Mesh(new THREE.BoxGeometry(CABINET_WIDTH + 0.16, 0.15, 0.48), woodFrame)
    top.position.set(0, 7.08, 0.12); top.castShadow = true; cabinet.add(top)
    for (const x of [-CABINET_WIDTH / 2 + 0.1, CABINET_WIDTH / 2 - 0.1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 6.85, 0.28), woodFrame)
      post.position.set(x, 3.55, 0.14); post.castShadow = true
      post.userData.catKey = cat.key
      cabinet.add(post); cellTargets.push(post)
      const brass = new THREE.Mesh(new THREE.BoxGeometry(0.025, 5.98, 0.035), brassTrim)
      brass.position.set(x * 0.94, 3.55, 0.3); cabinet.add(brass)
    }

    const strip = new THREE.Mesh(new THREE.BoxGeometry(CABINET_WIDTH - 0.65, 0.035, 0.06), new THREE.MeshBasicMaterial({ color: '#ffe0a8', transparent: true, opacity: 0.82, toneMapped: false }))
    strip.position.set(0, 6.85, 0.35); cabinet.add(strip)
    const list = MATERIALS.filter((m) => m.cat === cat.key)
    modelByCat[cat.key] = {}

    // 四列疏朗陈列，按每味香料单独留位；加入 RAW 的新材料会自动生成瓶子、拾取和标签。
    const columns = 3
    const spacingX = 1.8
    list.forEach((m, i) => {
      const row = Math.floor(i / columns)
      const col = i % columns
      const rowCount = Math.min(columns, list.length - row * columns)
      const x = -((rowCount - 1) * spacingX) / 2 + col * spacingX
      const shelfY = 0.4 + row * 0.92
      const model = buildSpiceModel(m, glowTex)
      model.position.set(x, shelfY + 0.035, 0.46)
      model.scale.setScalar(model.userData.baseScale)
      model.rotation.y = ((hash(m.name) % 30) - 15) * 0.01
      cabinet.add(model)
      modelByCat[cat.key][m.id] = model

      const nameLabel = makeMaterialNameLabel(m)
      nameLabel.position.set(x, shelfY + 0.58, 0.86)
      cabinet.add(nameLabel)
      model.traverse((o) => { if (o.isMesh && o.userData.materialId) materialTargets.push(o) })
    })

    // Keep the cabinetry structurally complete even when a category has no bottles
    // on a level. Empty shelves are intentional display space, not missing geometry.
    for (let row = 0; row < 8; row++) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(CABINET_WIDTH - 0.3, 0.065, 0.72), woodShelf)
      shelf.position.set(0, 0.4 + row * 0.92, 0.37)
      shelf.receiveShadow = true
      cabinet.add(shelf)
      const lip = new THREE.Mesh(new THREE.BoxGeometry(CABINET_WIDTH - 0.3, 0.035, 0.055), brassTrim)
      lip.position.set(0, 0.4 + row * 0.92 - 0.035, 0.74)
      cabinet.add(lip)
      const underShelfGlow = new THREE.Mesh(new THREE.BoxGeometry(CABINET_WIDTH - 0.72, 0.018, 0.035), new THREE.MeshBasicMaterial({ color: '#ffe2b0', transparent: true, opacity: 0.7, toneMapped: false }))
      underShelfGlow.position.set(0, 0.4 + row * 0.92 - 0.052, 0.68)
      cabinet.add(underShelfGlow)
    }

    const label = makeLabel(cat, list.length)
    label.position.set(0, 6.48, 0.34)
    label.scale.set(2.85, 0.71, 1)
    cabinet.add(label)
    cellRecords.push({ key: cat.key, group: cabinet, back, backMat, strip, label })
  })

  // Join the display bays with real curved shelves. Two top rows stay intentionally empty,
  // so the cabinet remains a full-height piece of furniture even where no bottle is stored.
  const cabinetSector = (Math.PI * 2) / CATEGORIES.length
  const cabinetHalfAngle = Math.asin((CABINET_WIDTH / 2) / 14.25)
  const shelfGapAngle = cabinetSector - cabinetHalfAngle * 2
  for (let row = 0; row < 8; row++) {
    const shelfY = 0.4 + row * 0.92
    for (let gap = 0; gap < CATEGORIES.length; gap++) {
      const middleAngle = (gap + 0.5) * cabinetSector
      const geometry = new THREE.RingGeometry(13.5, 14.24, 24, 1, -middleAngle - shelfGapAngle / 2, shelfGapAngle)
      const curvedShelf = new THREE.Mesh(geometry, woodShelf)
      curvedShelf.rotation.x = -Math.PI / 2
      curvedShelf.position.y = shelfY
      curvedShelf.receiveShadow = true
      scene.add(curvedShelf)
    }
    const continuousBrassEdge = new THREE.Mesh(new THREE.TorusGeometry(13.5, 0.024, 8, 192), brassTrim)
    continuousBrassEdge.rotation.x = Math.PI / 2
    continuousBrassEdge.position.y = shelfY - 0.045
    scene.add(continuousBrassEdge)
    const continuousLed = new THREE.Mesh(new THREE.TorusGeometry(13.62, 0.015, 6, 192), new THREE.MeshBasicMaterial({ color: '#ffe5b8', transparent: true, opacity: 0.48, toneMapped: false }))
    continuousLed.rotation.x = Math.PI / 2
    continuousLed.position.y = shelfY - 0.09
    scene.add(continuousLed)
  }

  const brand = makeBrandSprite()
  brand.position.set(0, 5.7, -0.4)
  brand.scale.set(3.2, 0.8, 1)
  scene.add(brand)

  // ---------------- 中央香水瓶 ----------------
  const bottle = new THREE.Group()
  bottle.position.copy(BOTTLE_POS)
  scene.add(bottle)

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(1.12, 1.28, 0.26, 64),
    new THREE.MeshStandardMaterial({ color: '#c5a76f', roughness: 0.28, metalness: 0.62 }),
  )
  pedestal.position.y = -0.14
  pedestal.castShadow = true; pedestal.receiveShadow = true
  bottle.add(pedestal)
  const pedRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.09, 0.018, 8, 72),
    new THREE.MeshBasicMaterial({ color: '#e8bf72', transparent: true, opacity: 0.75 }),
  )
  pedRing.rotation.x = Math.PI / 2
  pedRing.position.y = -0.005
  bottle.add(pedRing)

  const profile = [
    [0, 0], [0.68, 0], [0.77, 0.05], [0.8, 0.16], [0.8, 1.28],
    [0.77, 1.44], [0.56, 1.6], [0.3, 1.67], [0.23, 1.74], [0.23, 1.9], [0, 1.9],
  ].map(([x, y]) => new THREE.Vector2(x, y))
  const glass = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 64),
    new THREE.MeshPhysicalMaterial({
      color: '#f7e8cd', metalness: 0, roughness: 0.065,
      transmission: 0.88, thickness: 0.72, ior: 1.46,
      clearcoat: 1, clearcoatRoughness: 0.035,
      attenuationColor: new THREE.Color('#ddb66e'), attenuationDistance: 2.7,
      transparent: true, opacity: 0.84, side: THREE.DoubleSide, envMapIntensity: 1.55,
    }),
  )
  glass.castShadow = false
  bottle.add(glass)

  const liquidMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#c99735'), transparent: true, opacity: 0.94,
    roughness: 0.13, metalness: 0.14, emissive: new THREE.Color('#c99735'), emissiveIntensity: 0.32,
    side: THREE.DoubleSide,
  })
  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.725, 0.725, 1, 48, 1, true), liquidMat)
  bottle.add(liquid)
  const liquidTop = new THREE.Mesh(
    new THREE.CircleGeometry(0.725, 48),
    new THREE.MeshStandardMaterial({
      color: '#f0cd85', transparent: true, opacity: 0.62, roughness: 0.1, metalness: 0.25,
      side: THREE.DoubleSide, emissive: '#d9a441', emissiveIntensity: 0.25,
    }),
  )
  liquidTop.rotation.x = -Math.PI / 2
  bottle.add(liquidTop)

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.235, 0.235, 0.1, 24),
    new THREE.MeshStandardMaterial({ color: '#b8873e', roughness: 0.2, metalness: 0.94 }),
  )
  neck.position.y = 1.9
  bottle.add(neck)
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.31, 0.29, 0.42, 32),
    new THREE.MeshPhysicalMaterial({ color: '#c39a50', roughness: 0.12, metalness: 0.96, clearcoat: 1 }),
  )
  cap.position.y = 2.16
  cap.castShadow = true
  bottle.add(cap)
  const capTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.31, 0.06, 32),
    new THREE.MeshStandardMaterial({ color: '#e2c17d', roughness: 0.16, metalness: 0.94 }),
  )
  capTop.position.y = 2.39
  bottle.add(capTop)

  const labelPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.4),
    new THREE.MeshStandardMaterial({ map: makeBottleLabel(), transparent: true, roughness: 0.85, metalness: 0 }),
  )
  labelPlane.position.set(0, 0.72, 0.805)
  bottle.add(labelPlane)

  // 瓶内香料粒子
  const particleGroup = new THREE.Group()
  bottle.add(particleGroup)
  const particles = []
  function syncParticles(recipe) {
    const target = Math.min(26, recipe.reduce((s, r) => s + Math.min(r.drops, 3), 0))
    while (particles.length > target) {
      const p = particles.pop()
      particleGroup.remove(p.sprite)
      p.sprite.material.dispose()
    }
    while (particles.length < target) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: '#ffd89a', transparent: true, opacity: 0.8,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }))
      const a = Math.random() * Math.PI * 2
      const r = Math.random() * 0.56
      sprite.position.set(Math.cos(a) * r, 0.3 + Math.random() * 0.9, Math.sin(a) * r)
      const s = 0.1 + Math.random() * 0.13
      sprite.scale.set(s, s, 1)
      particleGroup.add(sprite)
      particles.push({ sprite, phase: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.5, baseY: sprite.position.y })
    }
  }

  // ---------------- 飞入动画 ----------------
  const flights = []
  function spawnFlight(material) {
    const model = modelByCat[material.cat]?.[material.id]
    const from = new THREE.Vector3()
    if (model) model.getWorldPosition(from)
    else from.set((Math.random() - 0.5) * 8, 4, -2)
    from.y += 0.15
    const to = BOTTLE_POS.clone().add(new THREE.Vector3(0, 2.05, 0))
    const ctrl = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 2.4, 0))
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: material.glow, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }))
    sprite.scale.set(0.5, 0.5, 1)
    scene.add(sprite)
    flights.push({ sprite, from, ctrl, to, t: 0, color: new THREE.Color(material.color) })
  }

  // ---------------- 液体 / 颜色 ----------------
  let targetLiquidH = 0.34
  let targetColor = new THREE.Color('#d9a441')
  const WHITE = new THREE.Color('#ffffff')
  const liquidTopTarget = new THREE.Color('#f0cd85')
  function setRecipe(recipe) {
    const total = recipe.reduce((s, r) => s + r.drops, 0)
    targetLiquidH = Math.min(1.24, 0.34 + total * 0.046)
    if (recipe.length) {
      const mix = new THREE.Color('#000000')
      let w = 0
      for (const r of recipe) {
        const m = MATERIALS.find((x) => x.id === r.id)
        if (!m) continue
        mix.add(new THREE.Color(m.color).multiplyScalar(r.drops))
        w += r.drops
      }
      if (w > 0) {
        mix.multiplyScalar(1 / w)
        targetColor = mix.lerp(new THREE.Color('#ffd9a0'), 0.22)
      }
    } else targetColor = new THREE.Color('#d9a441')
    syncParticles(recipe)
  }

  let focusedCat = null
  function focusCategory(catKey) {
    focusedCat = catKey
    for (const rec of cellRecords) {
      const on = !catKey || rec.key === catKey
      rec.backMat.emissiveIntensity = catKey ? (on ? 0.5 : 0.06) : 0.14
      rec.strip.material.opacity = catKey ? (on ? 0.95 : 0.2) : 0.55
      rec.label.scale.set(catKey && on ? 3.02 : 2.85, catKey && on ? 0.76 : 0.71, 1)
    }
  }

  // ---------------- 交互：精准拾取 / 手持拖动 / 双击展柜 ----------------
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2(-10, -10)
  let pointerActive = false
  let hovered = null
  let down = null
  let held = null
  let pointerFinishedNormally = true
  const clock = new THREE.Clock()

  function modelOf(id) { return modelByCat[MATERIAL_BY_ID[id]?.cat]?.[id] || null }

  function toNDC(e) {
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  }
  function pick() {
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects(materialTargets, false)
    if (hits.length) return { type: 'material', id: hits[0].object.userData.materialId, point: hits[0].point }
    const cellHits = raycaster.intersectObjects(cellTargets, false)
    if (cellHits.length) return { type: 'cell', cat: cellHits[0].object.userData.catKey }
    return null
  }
  function overBottle(clientX, clientY) {
    const r = getBottleScreenRect()
    const rect = renderer.domElement.getBoundingClientRect()
    const x = clientX - rect.left, y = clientY - rect.top
    return x >= r.left && x <= r.left + r.width && y >= r.top && y <= r.top + r.height
  }
  function notifyHeld() {
    callbacks.onHeldChange?.(held ? { id: held.id, over: held.over } : null)
  }
  function positionHeld(clientX, clientY) {
    if (!held) return
    const rect = renderer.domElement.getBoundingClientRect()
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1
    const ny = -((clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera)
    raycaster.ray.at(6, held.target)
  }
  function beginHeld(id, e) {
    const m = MATERIAL_BY_ID[id]
    if (!m) return
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: m.glow, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
    }))
    sprite.scale.set(0.66, 0.66, 1)
    sprite.renderOrder = 999
    scene.add(sprite)
    held = { id, sprite, target: new THREE.Vector3(), over: false, armed: false, sx: e.clientX, sy: e.clientY }
    down = null
    setHover(null)
    positionHeld(e.clientX, e.clientY)
    held.sprite.position.copy(held.target)
    held.over = overBottle(e.clientX, e.clientY)
    controls.enabled = false
    renderer.domElement.style.cursor = 'grabbing'
    notifyHeld()
  }
  function clearHeld() {
    if (!held) return
    scene.remove(held.sprite)
    held.sprite.material.dispose()
    held = null
    controls.enabled = true
    renderer.domElement.style.cursor = 'grab'
    notifyHeld()
  }
  function dropHeld() {
    if (!held) return
    const id = held.id
    clearHeld()
    callbacks.onDropMaterial?.(id)
  }

  function setHover(hit) {
    const nextId = hit?.type === 'material' ? hit.id : null
    if (nextId === hovered) return
    if (hovered) { const p = modelOf(hovered); if (p) p.userData.targetScale = p.userData.baseScale || 1 }
    hovered = nextId
    if (hovered) {
      const model = modelOf(hovered)
      if (model) model.userData.targetScale = (model.userData.baseScale || 1) * 1.12
      callbacks.onHoverMaterial?.(MATERIAL_BY_ID[hovered] || null)
    } else callbacks.onHoverMaterial?.(null)
    renderer.domElement.style.cursor = hovered ? 'pointer' : 'grab'
  }

  function onPointerMove(e) {
    if (held) return
    toNDC(e)
    pointerActive = true
    if (down?.hit?.type === 'material' && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) {
      beginHeld(down.hit.id, e)
    }
  }
  function onPointerLeave() { pointerActive = false; if (!held) setHover(null) }
  function onPointerDown(e) {
    if (e.button !== 0) return
    if (held) {
      if (overBottle(e.clientX, e.clientY)) dropHeld()
      return
    }
    pointerFinishedNormally = false
    toNDC(e)
    const hit = pick()
    down = { x: e.clientX, y: e.clientY, t: performance.now(), hit }
    if (hit?.type === 'material') {
      controls.enabled = false
      try { renderer.domElement.setPointerCapture(e.pointerId) } catch { /* noop */ }
    }
  }
  function onPointerUp(e) {
    pointerFinishedNormally = true
    if (held) return
    if (!down) return
    const dist = Math.hypot(e.clientX - down.x, e.clientY - down.y)
    const dt = performance.now() - down.t
    down = null
    controls.enabled = true
    try { renderer.domElement.releasePointerCapture(e.pointerId) } catch { /* noop */ }
    if (dist > 6 || dt > 550) return
    toNDC(e)
    const hit = pick()
    if (!hit) return
    if (hit.type === 'material') {
      // 单击 = 精准取出一瓶拿在手上，不直接投放，防止误触
      beginHeld(hit.id, e)
      const model = modelOf(hit.id)
      if (model) model.userData.pulse = 1
    } else if (hit.type === 'cell') {
      callbacks.onPickCategory?.(hit.cat)
    }
  }
  function onPointerCancel(e) {
    pointerFinishedNormally = true
    down = null
    controls.enabled = true
    try { renderer.domElement.releasePointerCapture(e.pointerId) } catch { /* noop */ }
    if (held) { clearHeld(); callbacks.onHeldCancelled?.() }
  }
  function onLostPointerCapture(e) {
    if (!pointerFinishedNormally) onPointerCancel(e)
  }
  function onWindowMove(e) {
    if (!held) return
    positionHeld(e.clientX, e.clientY)
    if (!held.armed && Math.hypot(e.clientX - held.sx, e.clientY - held.sy) > 4) held.armed = true
    const over = overBottle(e.clientX, e.clientY)
    if (over !== held.over) { held.over = over; notifyHeld() }
  }
  function onWindowUp(e) {
    if (!held || !held.armed) return
    if (overBottle(e.clientX, e.clientY)) dropHeld()
    else { clearHeld(); callbacks.onHeldCancelled?.() }
  }
  function onWindowKey(e) {
    if (e.key === 'Escape' && held) { clearHeld(); callbacks.onHeldCancelled?.() }
  }
  function onDblClick(e) {
    toNDC(e)
    const hit = pick()
    if (!hit) return
    if (hit.type === 'material') callbacks.onMaterialInfo?.(MATERIAL_BY_ID[hit.id])
    else if (hit.type === 'cell') callbacks.onPickCategory?.(hit.cat)
  }
  function onContextMenu(e) {
    e.preventDefault()
    if (held) clearHeld()
    toNDC(e)
    const hit = pick()
    if (hit?.type === 'material') callbacks.onMaterialInfo?.(MATERIAL_BY_ID[hit.id])
  }

  renderer.domElement.addEventListener('pointermove', onPointerMove)
  renderer.domElement.addEventListener('pointerleave', onPointerLeave)
  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  renderer.domElement.addEventListener('pointerup', onPointerUp)
  renderer.domElement.addEventListener('pointercancel', onPointerCancel)
  renderer.domElement.addEventListener('lostpointercapture', onLostPointerCapture)
  renderer.domElement.addEventListener('dblclick', onDblClick)
  renderer.domElement.addEventListener('contextmenu', onContextMenu)
  window.addEventListener('pointermove', onWindowMove)
  window.addEventListener('pointerup', onWindowUp)
  window.addEventListener('keydown', onWindowKey)

  // ---------------- 布局 / 屏幕投影 ----------------
  function resize() {
    const w = container.clientWidth || 800
    const h = container.clientHeight || 600
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
    callbacks.onCameraChange?.()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(container)
  resize()

  const CORNERS = []
  for (const x of [-0.86, 0.86]) for (const y of [0, 2.45]) for (const z of [-0.86, 0.86]) {
    CORNERS.push(new THREE.Vector3(x, y, z))
  }
  function getBottleScreenRect() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    const w = container.clientWidth, h = container.clientHeight
    for (const c of CORNERS) {
      const v = c.clone().add(BOTTLE_POS).project(camera)
      const sx = (v.x * 0.5 + 0.5) * w
      const sy = (-v.y * 0.5 + 0.5) * h
      minX = Math.min(minX, sx); maxX = Math.max(maxX, sx)
      minY = Math.min(minY, sy); maxY = Math.max(maxY, sy)
    }
    return {
      left: Math.max(0, minX - 24), top: Math.max(0, minY - 18),
      width: Math.max(120, maxX - minX + 48), height: Math.max(160, maxY - minY + 36),
    }
  }

  // ---------------- 渲染循环 ----------------
  let running = true
  let raf = 0
  function animate() {
    if (!running) return
    raf = requestAnimationFrame(animate)
    const dt = Math.min(clock.getDelta(), 0.05)
    const t = clock.elapsedTime
    controls.update()
    if (held) held.sprite.position.lerp(held.target, 1 - Math.exp(-dt * 16))
    dust.rotation.y = Math.sin(t * 0.08) * 0.012

    if (pointerActive && !down && !held) setHover(pick())

    // 香料模型轻微漂浮 + hover / 点击缩放
    for (const cat of CATEGORIES) {
      const models = modelByCat[cat.key]
      for (const id in models) {
        const model = models[id]
        const ph = (hash(id) % 100) / 100 * Math.PI * 2
        model.rotation.y += Math.sin(t * 0.6 + ph) * 0.0007
        const target = model.userData.targetScale ?? model.userData.baseScale ?? 1
        const pulse = model.userData.pulse || 0
        model.scale.setScalar(THREE.MathUtils.lerp(model.scale.x, target + pulse * 0.3, 1 - Math.exp(-dt * 10)))
        if (pulse > 0) model.userData.pulse = Math.max(0, pulse - dt * 3.2)
      }
    }

    // 液体平滑过渡
    const curH = liquid.scale.y
    const h = THREE.MathUtils.lerp(curH, targetLiquidH, 0.08)
    liquid.scale.y = h
    liquid.position.y = 0.19 + h / 2
    liquidTop.position.y = 0.19 + h
    liquidMat.color.lerp(targetColor, 0.06)
    liquidMat.emissive.lerp(targetColor, 0.06)
    liquidTopTarget.copy(targetColor).lerp(WHITE, 0.35)
    liquidTop.material.color.lerp(liquidTopTarget, 0.06)
    bottleLight.color.lerp(targetColor, 0.06)
    bottleLight.intensity = 8 + Math.sin(t * 2) * 1.5 + Math.min(10, h * 6)
    pedRing.material.opacity = 0.55 + Math.sin(t * 1.6) * 0.2

    // 瓶内粒子漂浮
    for (const p of particles) {
      p.sprite.position.y = 0.25 + (p.baseY + Math.sin(t * p.speed + p.phase) * 0.28) % 1.0
      p.sprite.material.opacity = 0.55 + Math.sin(t * 2 + p.phase) * 0.25
    }

    // 飞入粒子
    for (let i = flights.length - 1; i >= 0; i--) {
      const f = flights[i]
      f.t += dt / 0.9
      if (f.t >= 1) {
        scene.remove(f.sprite)
        f.sprite.material.dispose()
        flights.splice(i, 1)
        continue
      }
      const u = f.t
      const inv = 1 - u
      f.sprite.position.set(
        inv * inv * f.from.x + 2 * inv * u * f.ctrl.x + u * u * f.to.x,
        inv * inv * f.from.y + 2 * inv * u * f.ctrl.y + u * u * f.to.y,
        inv * inv * f.from.z + 2 * inv * u * f.ctrl.z + u * u * f.to.z,
      )
      f.sprite.material.opacity = 1 - u * 0.35
      const s = 0.5 - u * 0.22
      f.sprite.scale.set(s, s, 1)
    }

    bottle.rotation.y = Math.sin(t * 0.18) * 0.055
    renderer.render(scene, camera)
  }
  animate()
  requestAnimationFrame(() => callbacks.onReady?.())

  return {
    addMaterial: (m) => spawnFlight(m),
    setRecipe,
    focusCategory,
    getBottleScreenRect,
    getFocused: () => focusedCat,
    cancelHeld: clearHeld,
    isHeld: () => !!held,
    resize,
    dispose() {
      running = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      marbleReflector.dispose()
      marbleTexture.dispose()
      window.removeEventListener('pointermove', onWindowMove)
      window.removeEventListener('pointerup', onWindowUp)
      window.removeEventListener('keydown', onWindowKey)
      controls.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    },
  }
}
