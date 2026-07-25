import * as THREE from 'three';

gsap.registerPlugin(ScrollTrigger);
gsap.ticker.lagSmoothing(0);

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// keep the intro deterministic — never restore a previous scroll position
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

/* ================================================================
   THREE — RENDERER / SCENE / CAMERA
================================================================ */
const canvas = document.getElementById('webgl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06080f);
scene.fog = new THREE.FogExp2(0x06080f, 0.028);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 200);
camera.position.set(0, 3.6, 11);

/* ---------- lights ---------- */
scene.add(new THREE.AmbientLight(0x8899bb, 0.35));
const keyLight = new THREE.DirectionalLight(0xbcd8ff, 0.9);
keyLight.position.set(4, 8, 6);
scene.add(keyLight);
const screenGlow = new THREE.PointLight(0x7dd3fc, 2.2, 7, 2);
screenGlow.position.set(0, 1.4, 1.2);
scene.add(screenGlow);

/* ================================================================
   LAPTOP SCENE (intro)
================================================================ */
const introGroup = new THREE.Group();
scene.add(introGroup);

// desk
const desk = new THREE.Mesh(
  new THREE.CircleGeometry(10, 48),
  new THREE.MeshStandardMaterial({ color: 0x0a0d18, roughness: 0.9, metalness: 0.1 })
);
desk.rotation.x = -Math.PI / 2;
introGroup.add(desk);

const grid = new THREE.GridHelper(36, 36, 0x1d2a45, 0x121a2e);
grid.position.y = 0.002;
introGroup.add(grid);

// laptop
const laptop = new THREE.Group();
introGroup.add(laptop);

const alu = new THREE.MeshStandardMaterial({ color: 0x2a2f3d, roughness: 0.45, metalness: 0.75 });
const base = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.13, 2.1), alu);
base.position.y = 0.065;
laptop.add(base);

// keyboard keys (single instanced-ish merged look via small boxes in one geometry group)
const keys = new THREE.Group();
const keyGeo = new THREE.BoxGeometry(0.155, 0.02, 0.155);
const keyMat = new THREE.MeshStandardMaterial({ color: 0x11141f, roughness: 0.6, metalness: 0.3 });
for (let r = 0; r < 5; r++) {
  for (let c = 0; c < 14; c++) {
    const k = new THREE.Mesh(keyGeo, keyMat);
    k.position.set(-1.24 + c * 0.19, 0.14, -0.62 + r * 0.19);
    keys.add(k);
  }
}
// trackpad
const pad = new THREE.Mesh(
  new THREE.BoxGeometry(0.95, 0.012, 0.6),
  new THREE.MeshStandardMaterial({ color: 0x181c29, roughness: 0.4, metalness: 0.5 })
);
pad.position.set(0, 0.135, 0.62);
keys.add(pad);
laptop.add(keys);

// lid (hinged at back edge)
const lid = new THREE.Group();
lid.position.set(0, 0.13, -1.02);
laptop.add(lid);

const lidPanel = new THREE.Mesh(new THREE.BoxGeometry(3.1, 2.05, 0.09), alu);
lidPanel.position.y = 1.025;
lid.add(lidPanel);

// terminal screen texture
const termCanvas = document.createElement('canvas');
termCanvas.width = 768;
termCanvas.height = 480;
const tctx = termCanvas.getContext('2d');
const termTexture = new THREE.CanvasTexture(termCanvas);
termTexture.colorSpace = THREE.SRGBColorSpace;

const screenMat = new THREE.MeshBasicMaterial({ map: termTexture });
const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.86, 1.82), screenMat);
screen.position.set(0, 1.025, 0.047);
lid.add(screen);

lid.rotation.x = -0.32; // opened, tilted back

/* ---------- terminal typing ---------- */
const bootLines = [
  '> boot sushrith_os --v2.0.26',
  '> init neural_cores .......... OK',
  '> loading rag_pipelines ...... OK',
  '> mounting agentic_ai ........ OK',
  '> quests found: 6',
  '> trophies found: 3',
  '> cgpa check: 8.83 / 10 ...... PASS',
  '> starting desktop_env ....... OK',
  '> welcome, player_1 _'
];
const shutdownLines = [
  '> sudo shutdown -h now',
  '> saving session .......... OK',
  '> unmounting quests ....... OK',
  '> goodbye, player_1'
];
let termLines = bootLines;
let termProgress = 0; // total chars revealed
let termDark = false;

function drawTerminal() {
  const w = termCanvas.width, h = termCanvas.height;
  if (termDark) {
    tctx.fillStyle = '#010204';
    tctx.fillRect(0, 0, w, h);
    termTexture.needsUpdate = true;
    return;
  }
  tctx.fillStyle = '#04070c';
  tctx.fillRect(0, 0, w, h);
  // window chrome
  tctx.fillStyle = '#0b1220';
  tctx.fillRect(0, 0, w, 44);
  ['#ff6b6b', '#fbc531', '#4cd137'].forEach((c, i) => {
    tctx.beginPath();
    tctx.arc(30 + i * 34, 22, 8, 0, Math.PI * 2);
    tctx.fillStyle = c;
    tctx.fill();
  });
  tctx.fillStyle = '#5b6b85';
  tctx.font = '600 17px monospace';
  tctx.fillText('sushrith@portfolio: ~', 130, 28);

  tctx.font = '500 21px monospace';
  let remaining = termProgress;
  let y = 90;
  for (const line of termLines) {
    if (remaining <= 0) break;
    const shown = line.slice(0, Math.min(line.length, remaining));
    tctx.fillStyle = shown.includes('OK') || shown.includes('PASS') ? '#7ee8a2' : '#7dd3fc';
    tctx.fillText(shown, 36, y);
    remaining -= line.length;
    y += 40;
  }
  // scanlines
  tctx.fillStyle = 'rgba(0,0,0,0.16)';
  for (let sy = 0; sy < h; sy += 4) tctx.fillRect(0, sy, w, 2);
  termTexture.needsUpdate = true;
}
drawTerminal();

/* ================================================================
   BACKGROUND SCENE (after intro)
================================================================ */
const bgGroup = new THREE.Group();
bgGroup.visible = false;
scene.add(bgGroup);

// starfield — kept modest for perf
const starCount = 900;
const starPos = new Float32Array(starCount * 3);
const starCol = new Float32Array(starCount * 3);
const palette = [new THREE.Color(0x7dd3fc), new THREE.Color(0xa5b4fc), new THREE.Color(0xdde3ef)];
for (let i = 0; i < starCount; i++) {
  const r = 14 + Math.random() * 40;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
  starPos[i * 3 + 2] = r * Math.cos(phi);
  const c = palette[(Math.random() * palette.length) | 0];
  starCol[i * 3] = c.r; starCol[i * 3 + 1] = c.g; starCol[i * 3 + 2] = c.b;
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
  size: 0.09, vertexColors: true, transparent: true, opacity: 0.75,
  depthWrite: false, blending: THREE.AdditiveBlending
}));
bgGroup.add(stars);

/* ---------- dusk-mountain "wallpaper", fully 3D ---------- */
// gradient sky dome
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: {
    cTop: { value: new THREE.Color(0x131226) },
    cMid: { value: new THREE.Color(0x653a55) },
    cBot: { value: new THREE.Color(0xcf7b52) }
  },
  vertexShader: 'varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader:
    'varying vec3 vPos; uniform vec3 cTop; uniform vec3 cMid; uniform vec3 cBot;' +
    'void main(){ float h = normalize(vPos).y;' +
    'vec3 c = h > 0.1 ? mix(cMid, cTop, smoothstep(0.1, 0.7, h)) : mix(cBot, cMid, smoothstep(-0.15, 0.1, h));' +
    'gl_FragColor = vec4(c, 1.0); }'
});
bgGroup.add(new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), skyMat));

// sun glow billboard
const glowCanvas = document.createElement('canvas');
glowCanvas.width = glowCanvas.height = 256;
const gctx = glowCanvas.getContext('2d');
// crisp bright disc with a tight falloff, then a wide soft halo
const grad = gctx.createRadialGradient(128, 128, 0, 128, 128, 128);
grad.addColorStop(0, 'rgba(255, 236, 140, 1)');
grad.addColorStop(0.13, 'rgba(255, 214, 64, 1)');
grad.addColorStop(0.19, 'rgba(255, 200, 60, 0.5)');
grad.addColorStop(0.5, 'rgba(255, 190, 70, 0.14)');
grad.addColorStop(1, 'rgba(255, 190, 70, 0)');
gctx.fillStyle = grad;
gctx.fillRect(0, 0, 256, 256);
// normal blending (not additive) so the golden core keeps its color over a bright sky
const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: new THREE.CanvasTexture(glowCanvas),
  transparent: true, depthWrite: false
}));
sunGlow.scale.set(44, 44, 1);
sunGlow.position.set(16, 0, -72);
bgGroup.add(sunGlow);

// moon — cool small disc, fades in as night falls
const moonCanvas = document.createElement('canvas');
moonCanvas.width = moonCanvas.height = 256;
const mctx = moonCanvas.getContext('2d');
const mgrad = mctx.createRadialGradient(128, 128, 0, 128, 128, 128);
mgrad.addColorStop(0, 'rgba(238, 242, 255, 1)');
mgrad.addColorStop(0.15, 'rgba(212, 222, 250, 0.95)');
mgrad.addColorStop(0.2, 'rgba(180, 200, 240, 0.32)');
mgrad.addColorStop(0.5, 'rgba(160, 185, 235, 0.08)');
mgrad.addColorStop(1, 'rgba(160, 185, 235, 0)');
mctx.fillStyle = mgrad;
mctx.fillRect(0, 0, 256, 256);
const moon = new THREE.Sprite(new THREE.SpriteMaterial({
  map: new THREE.CanvasTexture(moonCanvas),
  transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending
}));
moon.scale.set(26, 26, 1);
bgGroup.add(moon);

const C = (hex) => new THREE.Color(hex);

/* ---------- shared terrain height field (drives the mesh AND prop placement) ---------- */
const TERRAIN_Z = -50;
const TERRAIN_MAX_H = 14;
const GROUND_Y = -11;
const WATER_LEVEL = -0.5;                       // relative to GROUND_Y
const LAKE = { x: -12, z: -36, rx: 30, rz: 13 };

// deterministic RNG so the scene is identical on every load
let __seed = 20260726;
const rnd = () => { __seed = (__seed * 1664525 + 1013904223) % 4294967296; return __seed / 4294967296; };

function lakeMask(x, worldZ) {
  const dx = (x - LAKE.x) / LAKE.rx, dz = (worldZ - LAKE.z) / LAKE.rz;
  const d = Math.sqrt(dx * dx + dz * dz);
  return d >= 1 ? 0 : THREE.MathUtils.smoothstep(1 - d, 0, 0.7);
}

function terrainHeight(x, worldZ) {
  const far = Math.min(1, Math.max(0, (-worldZ - 28) / 58)); // 0 near camera -> 1 at the back
  let h = Math.abs(Math.sin(x * 0.05 + 3.7) * 0.55 + Math.sin(x * 0.115 + 8.5) * 0.45);
  h += Math.abs(Math.sin((x - worldZ) * 0.06 + 6.3)) * 0.4;
  h = Math.pow(h, 1.5) * TERRAIN_MAX_H * far * far;
  h += Math.abs(Math.sin(x * 0.16 + worldZ * 0.13 + 11.4)) * (0.35 + far * 0.8);
  const m = lakeMask(x, worldZ);
  return m > 0 ? h * (1 - m) + -1.9 * m : h; // carve the lake basin
}

// grass -> moss -> rock -> slate -> snow, with a sandy shoreline
const cSand = C(0x8f8064), cGrass = C(0x3f6f4a), cMoss = C(0x5d7d46),
      cRock = C(0x6f6352), cSlate = C(0x7d7692), cSnow = C(0xeee8e4);
function terrainColor(h) {
  const t = h / TERRAIN_MAX_H;
  if (h < WATER_LEVEL + 0.45) return cSand.clone();
  if (t < 0.06) return cGrass.clone().lerp(cMoss, t / 0.06);
  if (t < 0.30) return cMoss.clone().lerp(cRock, (t - 0.06) / 0.24);
  if (t < 0.60) return cRock.clone().lerp(cSlate, (t - 0.30) / 0.30);
  return cSlate.clone().lerp(cSnow, Math.min(1, (t - 0.60) / 0.25));
}

const terrainGeo = new THREE.PlaneGeometry(380, 130, 140, 54);
terrainGeo.rotateX(-Math.PI / 2);
{
  const pos = terrainGeo.attributes.position;
  const colors = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const h = terrainHeight(x, TERRAIN_Z + pos.getZ(i));
    pos.setY(i, h);
    const c = terrainColor(h);
    colors.push(c.r, c.g, c.b);
  }
  terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();
}
const terrain = new THREE.Mesh(terrainGeo, new THREE.MeshStandardMaterial({
  vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0
}));
terrain.position.set(0, GROUND_Y, TERRAIN_Z);
bgGroup.add(terrain);

/* ---------- lake: rippling water with sky reflection + sun glitter ---------- */
const waterGeo = new THREE.PlaneGeometry(LAKE.rx * 2.3, LAKE.rz * 2.7, 64, 40);
waterGeo.rotateX(-Math.PI / 2);
const waterMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uDeep: { value: C(0x1d3f5e) },
    uSky:  { value: C(0x8fb2cc) },
    uSun:  { value: C(0xffd670) },
    uSunDir: { value: new THREE.Vector3(16, 20, -60) },
    uCam:  { value: new THREE.Vector3() }
  },
  vertexShader: `
    uniform float uTime;
    varying vec3 vWorld;
    void main() {
      vec3 p = position;
      p.y += sin(p.x * 0.33 + uTime * 1.05) * 0.07
           + sin(p.z * 0.47 - uTime * 0.85) * 0.055
           + sin((p.x + p.z) * 0.20 + uTime * 0.60) * 0.04;
      vec4 wp = modelMatrix * vec4(p, 1.0);
      vWorld = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uDeep, uSky, uSun, uSunDir, uCam;
    varying vec3 vWorld;
    void main() {
      vec3 V = normalize(uCam - vWorld);
      float nx = cos(vWorld.x * 0.33 + uTime * 1.05) * 0.10
               + cos((vWorld.x + vWorld.z) * 0.20 + uTime * 0.60) * 0.06;
      float nz = cos(vWorld.z * 0.47 - uTime * 0.85) * 0.09
               + cos((vWorld.x + vWorld.z) * 0.20 + uTime * 0.60) * 0.06;
      vec3 N = normalize(vec3(nx, 1.0, nz));
      float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
      vec3 col = mix(uDeep, uSky, clamp(fres * 1.5, 0.0, 0.9));
      vec3 L = normalize(uSunDir);
      vec3 H = normalize(L + V);
      col += uSun * pow(max(dot(N, H), 0.0), 120.0) * 2.4;   // glitter
      col += uSun * pow(max(dot(N, H), 0.0), 12.0) * 0.16;   // broad sheen
      gl_FragColor = vec4(col, 1.0);
    }`
});
const water = new THREE.Mesh(waterGeo, waterMat);
water.position.set(LAKE.x, GROUND_Y + WATER_LEVEL, LAKE.z);
bgGroup.add(water);

/* ---------- cabin on the far shore, windows lit after dark ---------- */
// right-hand shore: the hero text and sticky note occupy the left of the screen
const HOUSE = { x: 16, z: -28 };
// slope of the camera -> cabin sightline, used to keep that corridor free of trees
const SIGHT = (0 - HOUSE.x) / (9 - HOUSE.z);
const house = new THREE.Group();
const wallMat = new THREE.MeshStandardMaterial({ color: 0x7d5539, roughness: 0.9, flatShading: true });
const roofMat = new THREE.MeshStandardMaterial({ color: 0x59394b, roughness: 0.9, flatShading: true });
const winMat = new THREE.MeshStandardMaterial({ color: 0xffcf7a, emissive: 0xffb347, emissiveIntensity: 0.15 });
const hBody = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.6, 3.6), wallMat);
hBody.position.y = 1.3;
const hRoof = new THREE.Mesh(new THREE.ConeGeometry(3.3, 2.0, 4), roofMat);
hRoof.position.y = 3.6;
hRoof.rotation.y = Math.PI / 4;
const hChim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), wallMat);
hChim.position.set(1.3, 3.9, 0.6);
const winL = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.7), winMat);
winL.position.set(-1.0, 1.5, 1.81);
const winR = winL.clone();
winR.position.x = 1.0;
house.add(hBody, hRoof, hChim, winL, winR);
house.position.set(HOUSE.x, GROUND_Y + terrainHeight(HOUSE.x, HOUSE.z), HOUSE.z);
house.rotation.y = -0.5; // angled back toward the viewer
house.scale.setScalar(1.35); // reads clearly against the treeline
bgGroup.add(house);
const hearth = new THREE.PointLight(0xffa94d, 0, 16, 2);
hearth.position.set(HOUSE.x, house.position.y + 1.8, HOUSE.z + 1.5);
bgGroup.add(hearth);

/* ---------- pine forest (instanced — 2 draw calls for ~200 trees) ---------- */
const TREE_N = 200;
const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 1.1, 5);
trunkGeo.translate(0, 0.55, 0);
const leafGeo = new THREE.ConeGeometry(0.95, 3.2, 7);
leafGeo.translate(0, 2.3, 0);
const trunks = new THREE.InstancedMesh(trunkGeo,
  new THREE.MeshStandardMaterial({ color: 0x4a3527, roughness: 1, flatShading: true }), TREE_N);
const leaves = new THREE.InstancedMesh(leafGeo,
  new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true }), TREE_N);
{
  const dummy = new THREE.Object3D();
  const greens = [C(0x2f5638), C(0x3a6440), C(0x274a34), C(0x466f42), C(0x1f5140)];
  let placed = 0, tries = 0;
  while (placed < TREE_N && tries++ < TREE_N * 30) {
    const x = -78 + rnd() * 156;
    const z = -14 - rnd() * 66;
    if (lakeMask(x, z) > 0.02) continue;                       // not in the lake
    // clearing around the cabin, plus an open sightline from the camera to it
    if (Math.hypot(x - HOUSE.x, z - HOUSE.z) < 12) continue;
    if (z > HOUSE.z && z < HOUSE.z + 26 &&
        Math.abs(x - (HOUSE.x + (z - HOUSE.z) * SIGHT)) < 10.5) continue;
    const h = terrainHeight(x, z);
    if (h < WATER_LEVEL + 0.6 || h > 7.5) continue;            // above shore, below tree line
    const s = 0.75 + rnd() * 0.95;
    dummy.position.set(x, GROUND_Y + h - 0.1, z);
    dummy.rotation.set(0, rnd() * Math.PI * 2, 0);
    dummy.scale.set(s, s * (0.85 + rnd() * 0.5), s);
    dummy.updateMatrix();
    trunks.setMatrixAt(placed, dummy.matrix);
    leaves.setMatrixAt(placed, dummy.matrix);
    leaves.setColorAt(placed, greens[(rnd() * greens.length) | 0]);
    placed++;
  }
  trunks.count = leaves.count = placed;
  trunks.instanceMatrix.needsUpdate = leaves.instanceMatrix.needsUpdate = true;
  if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
}
bgGroup.add(trunks, leaves);

/* ---------- drifting clouds (sprites, tinted by the day cycle) ---------- */
const cloudCanvas = document.createElement('canvas');
cloudCanvas.width = 256; cloudCanvas.height = 128;
{
  const cc = cloudCanvas.getContext('2d');
  const puff = (x, y, r) => {
    const g = cc.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    cc.fillStyle = g;
    cc.beginPath(); cc.arc(x, y, r, 0, Math.PI * 2); cc.fill();
  };
  puff(88, 78, 42); puff(132, 66, 50); puff(178, 80, 38); puff(58, 86, 30); puff(210, 88, 26);
}
const cloudTex = new THREE.CanvasTexture(cloudCanvas);
const clouds = [];
for (let i = 0; i < 8; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: cloudTex, transparent: true, opacity: 0.5, depthWrite: false
  }));
  s.scale.set(34 + rnd() * 30, 10 + rnd() * 8, 1);
  s.position.set(-80 + rnd() * 160, 10 + rnd() * 13, -66 - rnd() * 26);
  s.userData.speed = 0.25 + rnd() * 0.5;
  clouds.push(s);
  bgGroup.add(s);
}

// sun + ambient, scoped to the desktop scene (colors driven by the day cycle)
const duskSun = new THREE.DirectionalLight(0xf2a468, 1.15);
duskSun.position.set(16, 4, -60);
bgGroup.add(duskSun);
const duskAmb = new THREE.AmbientLight(0x3a3355, 0.55);
bgGroup.add(duskAmb);

/* ---------- day cycle: morning -> afternoon -> sunset -> night, driven by scroll ---------- */
const dayCycle = [
  { top: C(0x1b2f52), mid: C(0x4b6d9e), bot: C(0xf2b984), sun: C(0xffd670), sunI: 1.0,  glow: 0.6,  fog: C(0x5c749c), stars: 0.05, amb: C(0x7d95b5), ambI: 0.65, deep: C(0x1d4463), cloud: C(0xf6cda6), cloudO: 0.55 },
  { top: C(0x1d4e8f), mid: C(0x4f8cc9), bot: C(0xa5cbe4), sun: C(0xffeb9e), sunI: 1.25, glow: 0.42, fog: C(0x6d93bd), stars: 0.0,  amb: C(0x93aec8), ambI: 0.8,  deep: C(0x1c5a82), cloud: C(0xffffff), cloudO: 0.62 },
  { top: C(0x241b3e), mid: C(0x83415f), bot: C(0xf2814e), sun: C(0xffbe54), sunI: 1.15, glow: 0.95, fog: C(0x3a2547), stars: 0.45, amb: C(0x453a5c), ambI: 0.55, deep: C(0x3b2a4c), cloud: C(0xff9d6b), cloudO: 0.68 },
  { top: C(0x030510), mid: C(0x0e1530), bot: C(0x1d2b52), sun: C(0xaec2e8), sunI: 0.5,  glow: 0.0,  fog: C(0x0a0f22), stars: 0.9,  amb: C(0x1c2440), ambI: 0.5,  deep: C(0x070f22), cloud: C(0x2b3552), cloudO: 0.4 }
];
function applyDayCycle(p, t) {
  const cyc = Math.min(0.9999, Math.max(0, p)) * (dayCycle.length - 1);
  const i = Math.floor(cyc);
  const f = cyc - i;
  const a = dayCycle[i], b = dayCycle[i + 1];
  skyMat.uniforms.cTop.value.lerpColors(a.top, b.top, f);
  skyMat.uniforms.cMid.value.lerpColors(a.mid, b.mid, f);
  skyMat.uniforms.cBot.value.lerpColors(a.bot, b.bot, f);
  duskSun.color.lerpColors(a.sun, b.sun, f);
  duskSun.intensity = a.sunI + (b.sunI - a.sunI) * f;
  scene.fog.color.lerpColors(a.fog, b.fog, f);
  stars.material.opacity = a.stars + (b.stars - a.stars) * f;
  duskAmb.color.lerpColors(a.amb, b.amb, f);
  duskAmb.intensity = a.ambI + (b.ambI - a.ambI) * f;

  // sun rides an arc across the sky: rises on the right, sets on the left
  const th = (0.12 + 0.91 * p) * Math.PI;
  const sx = 46 * Math.cos(th);
  const sy = -6 + 40 * Math.sin(th);
  sunGlow.position.set(sx, sy, -72);
  sunGlow.material.color.copy(duskSun.color);
  const aboveHorizon = THREE.MathUtils.smoothstep(Math.sin(th), -0.08, 0.08);
  sunGlow.material.opacity = ((a.glow + (b.glow - a.glow) * f) + Math.sin(t * 0.7) * 0.05) * aboveHorizon;

  // moon rises on the right as the sun sets
  const nightF = THREE.MathUtils.smoothstep(p, 0.72, 0.96);
  const mth = (0.14 + 0.35 * nightF) * Math.PI;
  moon.position.set(40 * Math.cos(mth), -6 + 36 * Math.sin(mth), -70);
  moon.material.opacity = nightF * 0.9;

  // the key light tracks whichever body is up
  const ly = Math.max(2, sy);
  duskSun.position.set(
    sx * (1 - nightF) + moon.position.x * nightF,
    ly * (1 - nightF) + moon.position.y * nightF,
    -60
  );

  // lake picks up the sky + whichever light is in the sky
  waterMat.uniforms.uDeep.value.lerpColors(a.deep, b.deep, f);
  waterMat.uniforms.uSky.value.lerpColors(a.mid, b.mid, f).lerp(skyMat.uniforms.cBot.value, 0.35);
  waterMat.uniforms.uSun.value.copy(duskSun.color);
  waterMat.uniforms.uSunDir.value.copy(duskSun.position);

  // clouds catch the sunset, then go dark
  const cloudCol = a.cloud.clone().lerp(b.cloud, f);
  const cloudOpa = a.cloudO + (b.cloudO - a.cloudO) * f;
  for (const cl of clouds) { cl.material.color.copy(cloudCol); cl.material.opacity = cloudOpa; }

  // cabin lights up after dark
  winMat.emissiveIntensity = 0.15 + nightF * 2.4;
  hearth.intensity = nightF * 2.2;
}

/* ================================================================
   RENDER LOOP
================================================================ */
const mouse = { x: 0, y: 0 };
window.addEventListener('pointermove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
});

let mode = 'intro'; // 'intro' | 'site' | 'outro'
let lenis = null;
let scrollProgress = 0;
const camTarget = new THREE.Vector3(0, 1.0, 0);
const clock = new THREE.Clock();

function animate() {
  const t = clock.getElapsedTime();

  if (mode === 'intro' || mode === 'outro') {
    camera.lookAt(camTarget);
    // subtle idle float on the laptop before/while zooming
    laptop.position.y = Math.sin(t * 1.2) * 0.012;
  } else {
    // background mode — parallax + scroll-driven motion
    const px = mouse.x * 0.55;
    const py = -mouse.y * 0.35;
    camera.position.x += (px - camera.position.x) * 0.04;
    camera.position.y += (py - camera.position.y) * 0.04;
    camera.position.z = 9 - scrollProgress * 2.2;
    camera.lookAt(0, 0, -2);

    applyDayCycle(scrollProgress, t);

    // flowing water + drifting clouds
    waterMat.uniforms.uTime.value = t;
    waterMat.uniforms.uCam.value.copy(camera.position);
    for (const cl of clouds) {
      cl.position.x += cl.userData.speed * 0.02;
      if (cl.position.x > 95) cl.position.x = -95;
    }

    stars.rotation.y = t * 0.012 + scrollProgress * 0.9;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ================================================================
   OS WINDOWS — wrap each section's content in app-window chrome
================================================================ */
const appTitles = {
  about: 'about.app', skills: 'skilltree.app', projects: 'quests.app',
  achievements: 'trophies.app', education: 'academia.app',
  certs: 'scrolls.app', contact: 'mail.app'
};
Object.entries(appTitles).forEach(([id, title]) => {
  const sec = document.getElementById(id);
  if (!sec) return;
  const win = document.createElement('div');
  win.className = 'window';
  win.innerHTML =
    '<div class="win-bar mono"><span class="win-dots"><i></i><i></i><i></i></span>' +
    `<span class="win-title">${title} — ~/sushrith</span><span class="win-min">— □ ×</span></div>`;
  const body = document.createElement('div');
  body.className = 'win-body';
  while (sec.firstChild) body.appendChild(sec.firstChild);
  win.appendChild(body);
  sec.appendChild(win);
});

/* ================================================================
   INTRO SEQUENCE
================================================================ */
const overlay = document.getElementById('enter-overlay');
const enterBtn = document.getElementById('enter-btn');
const skipBtn = document.getElementById('skip-intro');
const flash = document.getElementById('flash');

document.documentElement.classList.add('no-scroll');
window.scrollTo(0, 0);

let introTl = null;
let entered = false;

function startIntro() {
  if (entered) return;
  entered = true;
  overlay.classList.add('gone');

  if (prefersReduced) { enterSite(true); return; }

  skipBtn.hidden = false;

  // terminal typing driven by a proxy tween
  const totalChars = bootLines.reduce((a, l) => a + l.length, 0);
  const typeProxy = { n: 0 };

  introTl = gsap.timeline({ onComplete: () => enterSite(false) });
  introTl
    .to(typeProxy, {
      n: totalChars, duration: 3.6, ease: 'none',
      onUpdate: () => { termProgress = Math.floor(typeProxy.n); drawTerminal(); }
    }, 0)
    .to(camera.position, { x: 0, y: 1.6, z: 4.6, duration: 2.2, ease: 'power2.inOut' }, 0.3)
    .to(camTarget, { y: 1.15, duration: 2.2, ease: 'power2.inOut' }, 0.3)
    .to(camera.position, { x: 0, y: 1.16, z: 0.72, duration: 1.9, ease: 'power3.in' }, 2.6)
    .to(camTarget, { y: 1.16, z: -0.9, duration: 1.9, ease: 'power3.in' }, 2.6)
    .to(flash, { opacity: 1, duration: 0.28, ease: 'power2.in' }, 4.25);
}

function enterSite(instant) {
  if (mode === 'site') return;
  mode = 'site';
  if (introTl) introTl.kill();
  skipBtn.hidden = true;

  // swap scenes
  introGroup.visible = false;
  bgGroup.visible = true;
  screenGlow.intensity = 0;
  scene.fog.color.set(0x2b2140); // dusk haze over the mountain ranges
  scene.fog.density = 0.008;
  camera.position.set(0, 0, 9);
  camera.lookAt(0, 0, -2);

  document.documentElement.classList.remove('no-scroll');
  window.scrollTo(0, 0);
  document.getElementById('site').classList.add('live');
  ['dock', 'topnav'].forEach(id => document.getElementById(id).classList.remove('hud-hidden'));

  if (!instant) gsap.to(flash, { opacity: 0, duration: 0.9, ease: 'power2.out', delay: 0.05 });

  initSite();
}

enterBtn.addEventListener('click', startIntro);
window.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !entered) startIntro(); });
skipBtn.addEventListener('click', () => enterSite(false));

/* ================================================================
   SITE — SMOOTH SCROLL + ANIMATIONS
================================================================ */
let siteInited = false;

function initSite() {
  if (siteInited) return;
  siteInited = true;

  /* ---------- Lenis smooth scroll ---------- */
  lenis = new Lenis({ duration: 1.15, smoothWheel: !prefersReduced });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));

  // anchor links via lenis
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      launchWindow(target); // open the app right away so it never reads as a blank page
      lenis.scrollTo(target, { offset: -20, duration: 1.4 });
    });
  });

  /* ---------- global scroll progress (drives 3D + HUD) ---------- */
  const hudFill = document.getElementById('hud-fill');
  const hudPct = document.getElementById('hud-pct');
  ScrollTrigger.create({
    trigger: document.body,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      scrollProgress = self.progress;
      const pct = Math.round(self.progress * 100);
      hudFill.style.width = pct + '%';
      hudPct.textContent = pct + '%';
    }
  });

  /* ---------- reveals ---------- */
  gsap.utils.toArray('.reveal').forEach(el => {
    el._reveal = gsap.fromTo(el,
      { opacity: 0, y: 42 },
      {
        opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      }
    );
  });

  /* ---------- app windows launch open on scroll OR on click ---------- */
  const launched = new Set();
  function launchWindow(sec) {
    if (prefersReduced || !sec || !sec.id) return;
    const win = sec.querySelector('.window');
    if (!win || launched.has(sec.id)) return;
    launched.add(sec.id);
    gsap.to(win, { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: 'back.out(1.3)', overwrite: 'auto' });
    // fast-start the window's content too, so a click-jump never lands on an empty app
    sec.querySelectorAll('.reveal').forEach(el => { if (el._reveal) el._reveal.play(); });
  }
  if (!prefersReduced) {
    gsap.utils.toArray('.window').forEach(win => {
      gsap.set(win, { opacity: 0, scale: 0.88, y: 60, transformOrigin: '50% 12%' });
      ScrollTrigger.create({
        trigger: win,
        start: 'top 85%',
        onEnter: () => launchWindow(win.closest('section'))
      });
    });
  }

  /* ---------- counters ---------- */
  gsap.utils.toArray('.stat-num').forEach(el => {
    const end = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const obj = { v: 0 };
    gsap.to(obj, {
      v: end, duration: 1.6, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      onUpdate: () => { el.textContent = prefix + obj.v.toFixed(decimals) + suffix; }
    });
  });

  /* ---------- skill bars ---------- */
  gsap.utils.toArray('.skill').forEach(el => {
    gsap.to(el.querySelector('.skill-fill'), {
      width: el.dataset.level + '%', duration: 1.3, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    });
  });

  /* ---------- typewriter ---------- */
  const roles = ['AIML ENGINEER', 'FULL-STACK DEVELOPER', 'AGENTIC AI BUILDER', 'RAG SYSTEMS TINKERER', 'GENAI EXPLORER'];
  const tw = document.getElementById('typewriter');
  let roleIdx = 0, charIdx = 0, deleting = false;
  function typeLoop() {
    const word = roles[roleIdx];
    tw.textContent = word.slice(0, charIdx);
    let delay = deleting ? 38 : 74;
    if (!deleting && charIdx === word.length) { deleting = true; delay = 1600; }
    else if (deleting && charIdx === 0) { deleting = false; roleIdx = (roleIdx + 1) % roles.length; delay = 350; }
    else charIdx += deleting ? -1 : 1;
    setTimeout(typeLoop, delay);
  }
  typeLoop();

  /* ---------- current app tracking (menubar + dock) ---------- */
  const dockApps = document.querySelectorAll('#dock .dock-app');
  const sections = document.querySelectorAll('main section');
  const mbApp = document.getElementById('mb-app');

  // dock icons bounce like a launching app when clicked
  dockApps.forEach(a => {
    a.addEventListener('click', () => {
      a.classList.remove('bounce');
      void a.offsetWidth;
      a.classList.add('bounce');
    });
  });

  // a section is "the app you're in" while it spans the middle of the viewport —
  // works for sections taller than the screen, unlike an IntersectionObserver threshold
  sections.forEach(sec => {
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 55%',
      end: 'bottom 45%',
      onToggle: (self) => {
        if (!self.isActive) return;
        dockApps.forEach(d => d.classList.toggle('active', d.getAttribute('href') === '#' + sec.id));
        mbApp.textContent = appTitles[sec.id] || 'desktop';
      }
    });
  });

  /* ---------- custom cursor ---------- */
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const ringPos = { x: pos.x, y: pos.y };
  window.addEventListener('pointermove', (e) => { pos.x = e.clientX; pos.y = e.clientY; });
  gsap.ticker.add(() => {
    dot.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%,-50%)`;
    ringPos.x += (pos.x - ringPos.x) * 0.16;
    ringPos.y += (pos.y - ringPos.y) * 0.16;
    ring.style.transform = `translate(${ringPos.x}px, ${ringPos.y}px) translate(-50%,-50%)`;
  });
  document.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('pointerenter', () => ring.classList.add('grow'));
    el.addEventListener('pointerleave', () => ring.classList.remove('grow'));
  });

  /* ---------- power off — zoom back out of the laptop ---------- */
  let poweredOff = false;
  document.getElementById('power-off').addEventListener('click', () => {
    if (mode !== 'site' || poweredOff) return;
    poweredOff = true;

    document.documentElement.classList.add('no-scroll');
    lenis.stop();
    document.getElementById('dock').classList.add('hud-hidden');
    document.getElementById('topnav').classList.add('hud-hidden');
    const site = document.getElementById('site');
    site.style.transition = 'none';

    const typeProxy = { n: 0 };
    const total = shutdownLines.reduce((a, l) => a + l.length, 0);

    gsap.timeline()
      .to(site, { opacity: 0, duration: 0.45, ease: 'power2.in' }, 0)
      .to(flash, { opacity: 1, duration: 0.3, ease: 'power2.in' }, 0.2)
      .add(() => {
        // back into the laptop scene, camera right at the screen
        mode = 'outro';
        bgGroup.visible = false;
        introGroup.visible = true;
        screenGlow.intensity = 2.2;
        scene.fog.color.set(0x06080f);
        scene.fog.density = 0.028;
        termLines = shutdownLines;
        termProgress = 0;
        termDark = false;
        drawTerminal();
        camera.position.set(0, 1.16, 0.72);
        camTarget.set(0, 1.16, -0.9);
      })
      .to(flash, { opacity: 0, duration: 0.5, ease: 'power2.out' })
      .to(typeProxy, {
        n: total, duration: 1.7, ease: 'none',
        onUpdate: () => { termProgress = Math.floor(typeProxy.n); drawTerminal(); }
      })
      // screen dies
      .add(() => { termDark = true; drawTerminal(); }, '+=0.4')
      .to(screenGlow, { intensity: 0, duration: 0.5 }, '<')
      // pull back out of the laptop
      .to(camera.position, { x: 0, y: 2.6, z: 7.4, duration: 2.1, ease: 'power2.inOut' }, '<0.15')
      .to(camTarget, { y: 0.6, z: 0, duration: 2.1, ease: 'power2.inOut' }, '<')
      // lid closes
      .to(lid.rotation, { x: 1.52, duration: 1.15, ease: 'power2.in' }, '-=1.35')
      .to('#shutdown-overlay', { autoAlpha: 1, duration: 1.1, ease: 'power2.inOut' }, '-=0.35');
  });
  document.getElementById('reboot-btn').addEventListener('click', () => window.location.reload());

  /* ---------- menubar clock ---------- */
  const clockEl = document.getElementById('os-clock');
  function tickClock() {
    const d = new Date();
    // date is split out so narrow screens can drop it and keep just the time
    clockEl.innerHTML =
      '<span class="clk-date">' +
      d.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short' }) +
      '</span>' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  tickClock();
  setInterval(tickClock, 15000);

  ScrollTrigger.refresh();
}
