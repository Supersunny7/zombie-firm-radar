import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

const Q = new URLSearchParams(location.search);
const A = 'assets/';
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- seeded random ----------
let seed = 1337;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const R = (a, b) => a + rnd() * (b - a);

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);

const FOG = new THREE.Color('#0a0d13');
const scene = new THREE.Scene();
scene.background = FOG;
scene.fog = new THREE.FogExp2(FOG, 0.075);
const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.05, 120);
const CAM_POS = V(-0.55, 1.2, 1.35), CAM_LOOK = V(0.35, 0.6, -2.0);
camera.position.copy(CAM_POS); camera.lookAt(CAM_LOOK);

// ---------- lights ----------
scene.add(new THREE.HemisphereLight('#3a4a66', '#0a0806', 0.18));
const moon = new THREE.DirectionalLight('#7f9cd6', 1.1);
moon.position.set(-4, 9, -22); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024);
Object.assign(moon.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 });
scene.add(moon);
const flash = new THREE.SpotLight('#ffe7c4', 55, 26, 0.36, 0.95, 2);
flash.position.set(-0.45, 1.15, 1.25); flash.castShadow = true; flash.shadow.mapSize.set(1024, 1024); flash.shadow.bias = -0.0004;
flash.target.position.set(0.3, 0.45, -2.1);
scene.add(flash, flash.target);

// ---------- loading ----------
const TL = new THREE.TextureLoader();
const tex = (u, srgb) => { const t = TL.load(A + u); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
const gA = tex('polyhaven-brown-mud-leaves-01_diffuse.webp', true), gN = tex('polyhaven-brown-mud-leaves-01_nor-gl.webp'), gR = tex('polyhaven-brown-mud-leaves-01_rough.webp');
for (const t of [gA, gN, gR]) t.repeat.set(30, 30);
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
let loaded = 0; const TOTAL = 11;
const bar = document.getElementById('bar');
const load = async (u) => {
  const mod = await import(/* @vite-ignore */ new URL(A + u + '.glb.js', location.href).href);
  const bin = Uint8Array.from(atob(mod.default), c => c.charCodeAt(0)).buffer;
  const g = await loader.parseAsync(bin, '');
  loaded++; bar.style.width = (loaded / TOTAL) * 100 + '%'; return g;
};

// ---------- ground ----------
{
  const geo = new THREE.PlaneGeometry(90, 90, 200, 200); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, 0.05 * Math.sin(x * 1.7) * Math.cos(z * 1.3) + 0.03 * Math.sin(x * 4.1 + z * 3.3)); }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: gA, normalMap: gN, roughnessMap: gR, color: '#8a6a58' }));
  m.receiveShadow = true; scene.add(m);
}

// grass cards
function grassTex() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const x = c.getContext('2d');
  for (let i = 0; i < 26; i++) {
    const bx = 10 + rnd() * 108, lean = (rnd() - 0.5) * 60, h = 120 + rnd() * 130, tone = 70 + rnd() * 50;
    const g = x.createLinearGradient(0, 256, 0, 256 - h);
    g.addColorStop(0, `rgb(${tone * 0.55},${tone * 0.45},${tone * 0.3})`); g.addColorStop(1, `rgb(${tone},${tone * 0.85},${tone * 0.55})`);
    x.strokeStyle = g; x.lineWidth = 1.5 + rnd() * 2;
    x.beginPath(); x.moveTo(bx, 256); x.quadraticCurveTo(bx + lean * 0.3, 256 - h * 0.6, bx + lean, 256 - h); x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- graves ----------
const GRAVES = [
  { x: 0.4, z: -1.75, sx: 0.85, sz: 1.05, at: 1.0 },   // hero
  { x: -1.55, z: -3.6, sx: 0.7, sz: 0.9, at: 2.5 },    // crawler
  { x: 2.2, z: -3.9, sx: 0.7, sz: 0.9, at: 4.0 },      // gaunt
];
const nearGrave = (x, z, r) => GRAVES.some(g => Math.hypot(x - g.x, z - g.z) < r);

function moundGeo(sx, sz, h, torn) {
  const g = new THREE.SphereGeometry(1, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i);
    const n = 1 + 0.06 * Math.sin(vx * 9 + vz * 7) * Math.cos(vz * 11) + 0.04 * Math.sin(vx * 23 + vy * 17);
    let y = vy * h * n;
    if (torn) { const d = Math.hypot(vx, vz); y = d < 0.55 ? -0.25 + 0.4 * d : y * 0.9; }
    p.setXYZ(i, vx * sx * n, y, vz * sz * n);
  }
  g.computeVertexNormals(); return g;
}
const moundMat = (() => { const a = gA.clone(), n = gN.clone(); a.repeat.set(2, 2); n.repeat.set(2, 2); a.needsUpdate = n.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: a, normalMap: n, roughness: 1, color: '#7a5e4c' }); })();
const clodMat = new THREE.MeshStandardMaterial({ color: '#3b2c1f', roughness: 1, flatShading: true });
for (const g of GRAVES) {
  g.closed = new THREE.Mesh(moundGeo(g.sx, g.sz, 0.22, false), moundMat); g.closed.position.set(g.x, -0.02, g.z);
  g.torn = new THREE.Group(); g.torn.position.set(g.x, 0, g.z); g.torn.visible = false;
  const tm = new THREE.Mesh(moundGeo(g.sx, g.sz, 0.2, true), moundMat); tm.position.y = -0.02; g.torn.add(tm);
  const pit = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), new THREE.MeshBasicMaterial({ color: '#030202' }));
  pit.rotation.x = -Math.PI / 2; pit.scale.set(g.sx, g.sz, 1); pit.position.y = 0.012; g.torn.add(pit);
  for (const m of [g.closed, tm]) { m.castShadow = m.receiveShadow = true; }
  g.clods = [];
  for (let i = 0; i < 40; i++) {
    const a = rnd() * Math.PI * 2, r = 0.5 + rnd();
    const c = new THREE.Mesh(new THREE.DodecahedronGeometry(0.02 + rnd() * 0.045, 0), clodMat);
    c.userData.to = V(Math.cos(a) * r * g.sx * 0.85, 0.03, Math.sin(a) * r * g.sz * 0.7);
    c.userData.h = 0.08 + rnd() * 0.22; c.rotation.set(rnd() * 3, rnd() * 3, 0); c.scale.y = 0.6; c.castShadow = true;
    g.torn.add(c); g.clods.push(c);
  }
  scene.add(g.closed, g.torn);
}

// ---------- scene build after load ----------
const [sInt, sCrk, sBrk, trunk, gate, lantern, statue, gPos, gPxl, gOscar, gWoman] = await Promise.all([
  'sketchfab-small-gravestone-drydoctoregg', 'own-headstone-cracked', 'sketchfab-damaged-tombstone-drydoctoregg',
  'polyhaven-dead-tree-trunk', 'polyhaven-large-iron-gate', 'polyhaven-lantern-01', 'polyhaven-gothic-statue',
  'sketchfab-possessed-undead-giantswing', 'sketchfab-zombie-pxltiger', 'sketchfab-zombie-walk-oscar', 'sketchfab-hooded-horror-woman-purplepoint',
].map(load));

function place(gltf, h, x, z, ry = 0, tx = 0, tz = 0, sink = 0.12, dim = 0.55) {
  const m = gltf.scene.clone(true);
  m.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.material = o.material.clone(); o.material.transparent = false; o.material.side = THREE.FrontSide; if (o.material.color) o.material.color.multiplyScalar(dim); } });
  const b = new THREE.Box3().setFromObject(m); const s = h / (b.max.y - b.min.y);
  m.scale.setScalar(s); m.position.set(x, -b.min.y * s - h * sink, z); m.rotation.set(tx, ry, tz, 'YXZ'); scene.add(m); return m;
}
const kinds = [sInt, sInt, sCrk, sCrk, sBrk];
for (let row = 0; row < 9; row++) {
  const z = -0.6 - row * 2.6 + R(-0.3, 0.3);
  for (let col = -4; col <= 4; col++) {
    if (rnd() < 0.12) continue;
    const x = col * 1.55 + R(-0.35, 0.35) + (row % 2) * 0.5;
    if (row === 0 && x < 1.0 && x > -2.5) continue;
    if (nearGrave(x, z, 1.25)) continue;
    const fallen = row > 1 && rnd() < 0.07;
    place(kinds[Math.floor(rnd() * kinds.length)], R(0.75, 1.25), x, z, R(-0.35, 0.35), fallen ? -1.35 : R(-0.16, 0.12), fallen ? 0 : R(-0.14, 0.14), fallen ? -0.05 : 0.14);
  }
}
// each grave's own stone, leaning
place(sCrk, 1.15, 0.45, -2.85, 0.15, -0.22, 0.08, 0.1);
place(sBrk, 1.0, -1.6, -4.55, -0.2, -0.1, -0.12, 0.1);
place(sInt, 1.05, 2.25, -4.85, 0.3, -0.15, 0.1, 0.1);
for (const [x, z, h, r] of [[-3.8, -5, 0.45, 0.4], [4.2, -8, 0.5, 2.1]]) place(trunk, h, x, z, r, 0, 0, 0.1);
place(gate, 3.2, 0.5, -24, 0, 0, 0, 0);
place(statue, 2.1, -3.1, -6.2, 0.6, 0, 0, 0.02);
place(lantern, 0.36, -1.0, -1.1, 0.3, 0, 0, 0, 1);
const lanLight = new THREE.PointLight('#ff9a4a', 1.2, 4, 2); lanLight.position.set(-1.0, 0.28, -1.1); scene.add(lanLight);
{
  const gm = new THREE.MeshStandardMaterial({ map: grassTex(), alphaTest: 0.35, side: THREE.DoubleSide, roughness: 1, color: '#6f6450' });
  const geo = new THREE.PlaneGeometry(0.45, 0.24); geo.translate(0, 0.12, 0);
  const n = 1400, inst = new THREE.InstancedMesh(geo, gm, n * 2); const o = new THREE.Object3D(); let k = 0;
  for (let i = 0; i < n; i++) {
    const x = (rnd() - 0.5) * 22, z = 3 - rnd() * 30;
    if (nearGrave(x, z, 1.3)) continue;
    const s = 0.6 + rnd() * 0.9, ry = rnd() * Math.PI;
    for (const d of [0, Math.PI / 2]) { o.position.set(x, 0, z); o.rotation.set(0, ry + d, (rnd() - 0.5) * 0.25); o.scale.setScalar(s); o.updateMatrix(); inst.setMatrixAt(k++, o.matrix); }
  }
  inst.count = k; inst.receiveShadow = true; scene.add(inst);
}

// ---------- rigs ----------
const MAPS = {
  pos: { up: s => `Arm1${s}_`, fore: s => `Arm2${s}_`, hand: s => `Wrist${s}_`, neck: 'Neck_', head: 'Head_', spine: 'Spine2_', chest: 'Spine3_',
    fingers: s => ['Index', 'Middle', 'Ring', 'Pinky'].map(f => [`${f}1${s}_`, `${f}2${s}_`, `${f}3${s}_`]) },
  pxl: { up: s => `${s}ArmUpperarm`, fore: s => `${s}ArmForearm`, hand: s => `${s}ArmPalm`, neck: 'HumanNeck', head: 'HumanHead_', spine: 'HumanSpine2', chest: 'HumanRibcage',
    fingers: s => [1, 2, 3, 4, 5].map(i => [`${s}ArmDigit${i}1`, `${s}ArmDigit${i}2`, `${s}ArmDigit${i}3`]) },
  mix: { up: s => `${s === 'R' ? 'Right' : 'Left'}Arm_`, fore: s => `${s === 'R' ? 'Right' : 'Left'}ForeArm`, hand: s => `${s === 'R' ? 'Right' : 'Left'}Hand_`, neck: 'Neck', head: 'Head_', spine: 'Spine1', chest: 'Spine2',
    fingers: s => ['Index', 'Middle', 'Ring', 'Pinky'].map(f => [1, 2, 3].map(k => `${s === 'R' ? 'Right' : 'Left'}Hand${f}${k}`)) },
};
function zombie(gltf, map, height, k = 1, clip = null) {
  const m = SkeletonUtils.clone(gltf.scene);
  m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; o.material = o.material.clone(); o.material.color.multiplyScalar(k); o.material.roughness = Math.max(o.material.roughness ?? 0.8, 0.75); } });
  const holder = new THREE.Group(); holder.add(m); scene.add(holder);
  let mixer = null;
  if (clip) { mixer = new THREE.AnimationMixer(m); mixer.clipAction(gltf.animations.find(a => a.name === clip)).play(); mixer.update(0); }
  m.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(m, true); const sc = height / (box.max.y - box.min.y);
  m.scale.multiplyScalar(sc); m.position.y -= box.min.y * sc; m.position.x -= (box.min.x + box.max.x) / 2 * sc; m.position.z -= (box.min.z + box.max.z) / 2 * sc;
  holder.updateMatrixWorld(true);
  const bones = []; m.traverse(o => { if (o.isBone) bones.push(o); });
  const rest = bones.map(b => b.quaternion.clone());
  const B = (key) => bones.find(o => o.name.includes(key));
  return { m: holder, mesh: m, B, map, bones, rest, mixer, clips: gltf.animations };
}
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), _bw = new THREE.Quaternion(), _pw = new THREE.Quaternion();
function aim(bone, child, dir) {
  if (!bone || !child) return;
  bone.updateWorldMatrix(true, true);
  const cur = child.getWorldPosition(_b).sub(bone.getWorldPosition(_a)).normalize();
  _q.setFromUnitVectors(cur, _a.copy(dir).normalize());
  bone.getWorldQuaternion(_bw); bone.parent.getWorldQuaternion(_pw);
  bone.quaternion.copy(_pw.invert().multiply(_q.multiply(_bw)));
  bone.updateWorldMatrix(false, true);
}
function arm(z, side, upper, fore, curl, jitter = 0) {
  const M = z.map, up = z.B(M.up(side)), fo = z.B(M.fore(side)), ha = z.B(M.hand(side));
  aim(up, fo, upper); aim(fo, ha, fore);
  const chains = M.fingers(side).map(c => c.map(n => z.B(n)).filter(Boolean)).filter(c => c.length >= 2);
  if (!chains.length || !ha) return;
  const hp = ha.getWorldPosition(new THREE.Vector3());
  const f0 = chains[0][0].getWorldPosition(new THREE.Vector3()), f1 = chains[chains.length - 1][0].getWorldPosition(new THREE.Vector3());
  const fdir = f0.clone().add(f1).multiplyScalar(0.5).sub(hp).normalize();
  const palm = new THREE.Vector3().crossVectors(f1.clone().sub(f0).normalize(), fdir).normalize();
  if (side === 'L') palm.negate();
  chains.forEach((c, ci) => {
    for (let i = 0; i < c.length - 1; i++) {
      const d = c[i + 1].getWorldPosition(new THREE.Vector3()).sub(c[i].getWorldPosition(new THREE.Vector3())).normalize();
      const ang = (curl + jitter * Math.sin(ci * 1.7 + i)) * (i === 0 ? 0.55 : 1);
      aim(c[i], c[i + 1], d.multiplyScalar(Math.cos(ang)).addScaledVector(palm, Math.sin(ang)));
    }
  });
}
const look = (z, d) => aim(z.B(z.map.neck), z.B(z.map.head), d);
const bend = (z, d) => aim(z.B(z.map.spine), z.B(z.map.chest), d);
const resetPose = (z) => { z.bones.forEach((b, i) => b.quaternion.copy(z.rest[i])); z.m.updateMatrixWorld(true); };

// rise keyframes: t (s), root y, root tilt x, R upper, R fore, L upper, L fore, curl, spine, head
const L3 = (a, b, t) => V(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
const KEYS = [
  { t: 0.0, y: -1.8, tx: 0.0, Ru: V(-0.05, 1, 0.1), Rf: V(-0.05, 1, 0.15), Lu: V(0.1, -1, 0), Lf: V(0.05, -1, 0.1), c: 0.2, sp: V(0, 1, 0.1), hd: V(0, 1, 0.2) },
  { t: 0.7, y: -1.62, tx: 0.0, Ru: V(-0.1, 1, 0.25), Rf: V(-0.05, 1, 0.35), Lu: V(0.1, -1, 0), Lf: V(0.05, -1, 0.1), c: 1.35, sp: V(0, 1, 0.15), hd: V(0.1, 1, 0.3) },
  { t: 1.5, y: -1.32, tx: 0.08, Ru: V(-0.45, 0.35, 0.8), Rf: V(-0.3, -0.15, 0.9), Lu: V(0.3, 1, 0.3), Lf: V(0.2, 1, 0.45), c: 1.2, sp: V(0.02, 0.9, 0.35), hd: V(0.3, 0.8, 0.5) },
  { t: 2.3, y: -1.12, tx: 0.1, Ru: V(-0.45, -0.15, 0.9), Rf: V(-0.2, -0.85, 0.5), Lu: V(0.45, -0.2, 0.9), Lf: V(0.2, -0.85, 0.5), c: 1.3, sp: V(0.05, 0.75, 0.65), hd: V(0.2, 0.3, 0.95) },
  { t: 3.2, y: -0.95, tx: 0.1, Ru: V(-0.3, 0.15, 1), Rf: V(-0.15, -0.05, 1), Lu: V(0.45, -0.2, 0.9), Lf: V(0.2, -0.85, 0.5), c: 1.1, sp: V(0.05, 0.8, 0.6), hd: V(0.35, 0.55, 0.75) },
];
const RISE_T = 3.2;
const jerk = (f) => { // holds, then a fast lurch
  if (f < 0.4) return 0.08 * (f / 0.4);
  const u = (f - 0.4) / 0.6; return 0.08 + 0.92 * (1 - Math.pow(1 - u, 3));
};
function riseFrame(t) {
  t = Math.min(t, RISE_T);
  let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++;
  const a = KEYS[i], b = KEYS[i + 1]; const f = jerk(Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))));
  const o = {}; for (const k of ['y', 'tx', 'c']) o[k] = a[k] + (b[k] - a[k]) * f;
  for (const k of ['Ru', 'Rf', 'Lu', 'Lf', 'sp', 'hd']) o[k] = L3(a[k], b[k], f);
  return o;
}

const risers = [
  { z: zombie(gPos, MAPS.pos, 1.85, 0.9), g: GRAVES[0], ry: 0.3, extraY: 0, lean: 0 },
  { z: zombie(gOscar, MAPS.mix, 1.8, 0.75), g: GRAVES[1], ry: 0.45, extraY: 0.05, lean: 0.25 },
  { z: zombie(gPxl, MAPS.pxl, 1.8, 0.8), g: GRAVES[2], ry: -0.35, extraY: 0, lean: 0.1 },
];
for (const r of risers) { r.state = 'buried'; r.t = 0; r.z.m.visible = false; r.twitch = 0; r.twitchDir = V(0, 0, 0); r.nextTwitch = 2; }

// already-undead shambler
const walker = zombie(gPxl, MAPS.pxl, 1.8, 0.85, 'Walk1_InPlace');
walker.m.position.set(2.7, 0, -9.5); walker.m.rotation.y = -0.25;
const walkerIdle = walker.mixer.clipAction(gPxl.animations.find(a => a.name === 'Idle'));
let walkerStopped = false;

// watcher
const woman = zombie(gWoman, MAPS.mix, 2.05, 0.6);
woman.m.position.set(-0.6, 0, -11.5); woman.m.rotation.y = 0.1;
look(woman, V(0.25, 0.85, 0.5));
const WATCH_SPOTS = [V(-0.6, 0, -11.5), V(3.8, 0, -10), V(-3.4, 0, -9), V(1.6, 0, -8.2), V(-2.2, 0, -7.4)];
let watchIdx = 0, watchGone = 0, watchSeen = 0;

// ---------- post: CCTV ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());
const cctv = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, glitch: { value: 0 }, res: { value: new THREE.Vector2(innerWidth, innerHeight) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, glitch; uniform vec2 res; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + time*37.0) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      if (glitch > 0.0) { float band = floor(uv.y*28.0); float s = fract(sin(band*91.7 + floor(time*30.0)*13.1)*4375.5); uv.x += (s-0.5)*0.08*glitch*step(0.55,s); }
      vec3 c = texture2D(tDiffuse, uv).rgb;
      c.r = mix(c.r, texture2D(tDiffuse, uv - vec2(2.0/res.x, 0.0)).r, 0.4);
      float l = dot(c, vec3(0.3,0.59,0.11)); c = mix(vec3(l), c, 0.6);
      c = pow(clamp(c*1.4 + 0.015, 0.0, 1.0), vec3(0.9));
      float r = length((vUv-0.5)*2.0); c *= clamp(1.0 - 0.38*pow(r, 2.5), 0.0, 1.0);
      c += (hash(gl_FragCoord.xy) - 0.5) * 0.11;
      if (mod(gl_FragCoord.y, 3.0) < 1.0) c *= 0.88;
      if (glitch > 0.0) c = mix(c, vec3(hash(vUv*7.0)), 0.25*glitch);
      gl_FragColor = vec4(c, 1.0);
    }`,
});
composer.addPass(cctv);

// ---------- audio ----------
let ac = null; const bufs = {}; let windGain = null;
async function startAudio() {
  ac = new (window.AudioContext || window.webkitAudioContext)();
  const names = ['freesound-tomhannen-howling-wind-tower', 'freesound-tonsil5-zombie-growl-5', 'freesound-ezcah-zombie-growl-01', 'freesound-giddster-crows-cawing', 'freesound-indieground-pas-zombie-route'];
  await Promise.all(names.map(async n => { const r = await fetch(A + n + '.mp3'); bufs[n] = await ac.decodeAudioData(await r.arrayBuffer()); }));
  windGain = ac.createGain(); windGain.gain.value = 0.35; windGain.connect(ac.destination);
  const w = ac.createBufferSource(); w.buffer = bufs['freesound-tomhannen-howling-wind-tower']; w.loop = true; w.connect(windGain); w.start();
  shamble.src = ac.createBufferSource(); shamble.src.buffer = bufs['freesound-indieground-pas-zombie-route']; shamble.src.loop = true;
  shamble.gain = ac.createGain(); shamble.gain.gain.value = 0; shamble.src.connect(shamble.gain).connect(ac.destination); shamble.src.start();
  scheduleCrows();
}
const shamble = {};
function scheduleCrows() { setTimeout(() => { if (!muted && ac && performance.now() > quietUntil) play('freesound-giddster-crows-cawing', 0.25, (rnd() - 0.5) * 1.2, 1); scheduleCrows(); }, 18000 + rnd() * 30000); }
let quietUntil = 0, muted = false;
function play(name, vol, pan, rate) {
  if (!ac || muted) return;
  const s = ac.createBufferSource(); s.buffer = bufs[name]; s.playbackRate.value = rate;
  const g = ac.createGain(); g.gain.value = vol; const p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan));
  s.connect(g).connect(p).connect(ac.destination); s.start();
}
function duckWind(sec) { if (!windGain) return; const t = ac.currentTime; windGain.gain.cancelScheduledValues(t); windGain.gain.setTargetAtTime(0.1, t, 0.15); windGain.gain.setTargetAtTime(0.35, t + sec, 0.8); quietUntil = performance.now() + 5000; }
function screenPan(v) { const p = v.clone().project(camera); return p.x; }
let lastGrowl = 0;

// ---------- input ----------
const pointer = new THREE.Vector2(0.15, -0.2); let pointerMoved = false;
addEventListener('pointermove', e => { pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); pointerMoved = true; });
addEventListener('pointerdown', e => { if (e.target.closest('.ui')) return; pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); pointerMoved = true; });
const ray = new THREE.Raycaster(), groundPlane = new THREE.Plane(V(0, 1, 0), -0.3), hit = new THREE.Vector3();
let autoAim = null;
const slider = document.getElementById('shock'), shockLabel = document.getElementById('shockv'), risenEl = document.getElementById('risen');
slider.addEventListener('input', updateShock);
function updateShock() {
  const v = parseFloat(slider.value); shockLabel.textContent = '+' + v.toFixed(2);
  let n = 0;
  for (const r of risers) {
    if (v >= r.g.at) {
      n++;
      if (r.state === 'buried') { r.state = 'rising'; r.t = 0; r.z.m.visible = true; r.broke = false; autoAim = { p: V(r.g.x, 0.5, r.g.z), until: performance.now() + 2200 }; pointerMoved = false; duckWind(3.5); }
    } else if (r.state !== 'buried') { r.state = 'buried'; r.z.m.visible = false; r.g.torn.visible = false; r.g.closed.visible = true; }
  }
  risenEl.textContent = n;
}
document.getElementById('mute').addEventListener('click', e => { muted = !muted; e.target.textContent = muted ? 'Sound off' : 'Sound on'; if (ac) muted ? ac.suspend() : ac.resume(); });
document.getElementById('enter').addEventListener('click', async () => { document.getElementById('gate').remove(); try { await startAudio(); } catch (e) { console.warn(e); } });
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); cctv.uniforms.res.value.set(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

// ---------- clock ----------
const clockEl = document.getElementById('clock'); const t0 = Date.UTC(2026, 10, 13, 3, 14, 7);
setInterval(() => { const d = new Date(t0 + performance.now()); clockEl.textContent = d.toISOString().slice(0, 19).replace('T', ' '); }, 250);

// ---------- loop ----------
const clock = new THREE.Clock(); let glitchT = 0;
const flashDir = new THREE.Vector3(), toW = new THREE.Vector3();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05), now = clock.elapsedTime;

  // flashlight target
  let goal;
  if (autoAim && !pointerMoved && performance.now() < autoAim.until) goal = autoAim.p;
  else { ray.setFromCamera(pointer, camera); goal = ray.ray.intersectPlane(groundPlane, hit) ? hit : V(0.3, 0.45, -6); }
  flash.target.position.lerp(goal, 1 - Math.exp(-dt * 6));
  flash.target.position.x += Math.sin(now * 1.3) * 0.004; flash.target.position.y += Math.sin(now * 1.9) * 0.003;
  flash.intensity = 55 * (rnd() < 0.006 ? 0.35 : 1);
  lanLight.intensity = 1.2 * (0.85 + 0.15 * Math.sin(now * 13.0) * Math.sin(now * 7.3));

  // risers
  for (const r of risers) {
    if (r.state === 'buried') continue;
    r.t += dt;
    const z = r.z, g = r.g;
    resetPose(z);
    const k = riseFrame(r.t);
    z.m.position.set(g.x, k.y + r.extraY, g.z + 0.15);
    z.m.rotation.set(k.tx + r.lean, r.ry, 0.05);
    z.m.updateMatrixWorld(true);
    let hd = k.hd.clone();
    if (r.t > RISE_T) { // idle: breathing, random head twitches, clawing fingers
      r.state = 'risen';
      const br = Math.sin(now * 1.6) * 0.04;
      z.m.position.y += br * 0.3;
      r.nextTwitch -= dt;
      if (r.nextTwitch < 0) { r.twitch = 0.18; r.twitchDir.set(R(-0.6, 0.6), R(-0.3, 0.2), 0); r.nextTwitch = R(1.2, 3.5); }
      if (r.twitch > 0) { r.twitch -= dt; hd.add(r.twitchDir); }
      k.c += Math.sin(now * 5 + g.x) * 0.15;
    }
    bend(z, k.sp);
    arm(z, 'R', k.Ru, k.Rf, k.c, 0.25);
    arm(z, 'L', k.Lu, k.Lf, k.c, 0.25);
    look(z, hd);
    // soil breaks
    if (!r.broke && r.t > 0.55) {
      r.broke = true; g.closed.visible = false; g.torn.visible = true; r.burst = 0;
    }
    if (r.broke && r.burst < 1) {
      r.burst = Math.min(1, r.burst + dt / 0.45);
      for (const c of g.clods) { const u = r.burst; const s0 = 0.35 + 0.65 * u; c.position.set(c.userData.to.x * s0, 0.03 + c.userData.h * 4 * u * (1 - u), c.userData.to.z * s0); c.visible = u > 0.02; }
    }
    if (!r.growled && r.t > RISE_T - 0.1) {
      r.growled = true;
      if (performance.now() - lastGrowl > 1000) {
        lastGrowl = performance.now();
        const d = camera.position.distanceTo(z.m.position);
        play(rnd() < 0.5 ? 'freesound-tonsil5-zombie-growl-5' : 'freesound-ezcah-zombie-growl-01', Math.min(1, 2.2 / d), screenPan(z.m.position), R(0.85, 1.05));
      }
    }
  }

  // walker
  if (walker.mixer) walker.mixer.update(dt);
  if (!walkerStopped) {
    walker.m.position.z += dt * 0.28; walker.m.position.x -= dt * 0.07;
    if (walker.m.position.z > -5.4) { walkerStopped = true; walker.mixer.stopAllAction(); walkerIdle.play(); }
  }
  if (shamble.gain) { const d = camera.position.distanceTo(walker.m.position); shamble.gain.gain.value = walkerStopped ? 0 : Math.max(0, Math.min(1, 1 - (d - 2) / 10)) * 0.3; }

  // watcher: vanishes when the beam finds her
  if (woman.m.visible) {
    flashDir.copy(flash.target.position).sub(flash.position).normalize();
    toW.copy(woman.m.position).add(V(0, 1.4, 0)).sub(flash.position).normalize();
    if (flashDir.angleTo(toW) < flash.angle * 0.9) { watchSeen += dt; if (watchSeen > 0.12) { woman.m.visible = false; glitchT = 0.35; watchGone = R(6, 12); watchSeen = 0; play('freesound-ezcah-zombie-growl-01', 0.12, screenPan(woman.m.position), 0.55); } }
    else watchSeen = 0;
  } else {
    watchGone -= dt;
    if (watchGone < 0) { watchIdx = (watchIdx + 1 + Math.floor(rnd() * 3)) % WATCH_SPOTS.length; const s = WATCH_SPOTS[watchIdx]; woman.m.position.copy(s); woman.m.lookAt(camera.position.x, 0, camera.position.z); woman.m.visible = true; }
  }
  if (glitchT > 0) glitchT -= dt;
  cctv.uniforms.glitch.value = glitchT > 0 ? 1 : (rnd() < 0.002 ? 0.6 : 0);
  cctv.uniforms.time.value = now;

  composer.render();
  requestAnimationFrame(frame);
}
document.getElementById('loading').remove();
document.body.dataset.ready = 'true';
if (Q.get('shock')) { slider.value = Q.get('shock'); updateShock(); for (const r of risers) if (r.state !== 'buried') r.t = parseFloat(Q.get('rt') || '10'); }
requestAnimationFrame(frame);
