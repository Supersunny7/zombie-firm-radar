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
const $ = (id) => document.getElementById(id);

// ---------- patient (fictional sample firm) ----------
const SHOCK = parseFloat(Q.get('shock') || '1.5');
const F = {
  name: Q.get('firm') || 'Fallowmere Manufacturing', no: 404,
  R: 1.2e9, ebit: 71e6, D: 1.05e9, A: 1.6e9, E: 0.42e9, r: 61e6 / 1.05e9, employees: 6400,
};
const delta = SHOCK / 100;

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
$('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#050506'); scene.fog = new THREE.FogExp2('#050506', 0.06);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 60);

const hemi = new THREE.HemisphereLight('#4a5468', '#0b0908', 0.25); scene.add(hemi);
const lamp = new THREE.SpotLight('#e4ecff', 34, 9, 0.62, 0.55, 1.6); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.0005;
scene.add(lamp, lamp.target);
const red = new THREE.PointLight('#ff2a1a', 0.0, 7, 2); scene.add(red);
const spark = new THREE.PointLight('#bcd6ff', 0, 5, 2); scene.add(spark);

const TL = new THREE.TextureLoader();
const tex = (u, srgb, rep) => { const t = TL.load(A + u); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); return t; };
{
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshStandardMaterial({ map: tex('polyhaven-slate-floor_diffuse.webp', true, 4), normalMap: tex('polyhaven-slate-floor_nor-gl.webp', false, 4), roughnessMap: tex('polyhaven-slate-floor_rough.webp', false, 4), color: '#77706a' }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wm = new THREE.MeshStandardMaterial({ map: tex('polyhaven-dark-brick-wall_diffuse.webp', true, 3), normalMap: tex('polyhaven-dark-brick-wall_nor-gl.webp', false, 3), roughnessMap: tex('polyhaven-dark-brick-wall_rough.webp', false, 3), color: '#6f625c' });
  for (const [x, z, ry] of [[0, -3.2, 0], [-3.2, 0, Math.PI / 2], [3.2, 0, -Math.PI / 2]]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.4), wm); w.position.set(x, 1.7, z); w.rotation.y = ry; w.receiveShadow = true; scene.add(w); }
}

// ---------- loading ----------
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
let loaded = 0; const TOTAL = 6;
const load = async (u) => { const mod = await import(new URL(A + u + '.glb.js', location.href).href); const bin = Uint8Array.from(atob(mod.default), c => c.charCodeAt(0)).buffer; const g = await loader.parseAsync(bin, ''); loaded++; $('bar').style.width = (loaded / TOTAL) * 100 + '%'; return g; };
const MODEL = ['pos', 'pxl', 'mix'].includes(Q.get('model')) ? Q.get('model') : 'pos';
const MODEL_FILE = { pos: 'sketchfab-possessed-undead-giantswing', pxl: 'sketchfab-zombie-pxltiger', mix: 'sketchfab-zombie-walk-oscar' }[MODEL];
const [gPack, gCart, gSwitch, gIV, gChains, gPos] = await Promise.all(['sketchfab-autopsy-lab-assets', 'sketchfab-medical-props-cart', 'sketchfab-knife-switch-type-d', 'sketchfab-crutch-and-iv-drip', 'sketchfab-rusty-chains-amanda98', MODEL_FILE].map(load));

function place(gltf, h, x, z, ry = 0, y = null, dim = 1) {
  const m = gltf.scene.clone(true);
  m.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.material = o.material.clone(); if (o.material.color) o.material.color.multiplyScalar(dim); } });
  const b = new THREE.Box3().setFromObject(m); const s = h / (b.max.y - b.min.y);
  m.scale.setScalar(s); m.position.set(x, y ?? -b.min.y * s, z); m.rotation.y = ry; scene.add(m); m.updateMatrixWorld(true); return m;
}
// the table pack (table + screen + lamp); find the table top by casting down
const pack = place(gPack, 1.95, 0, 0, 0);
const pb = new THREE.Box3().setFromObject(pack);
const ray = new THREE.Raycaster();
let top = 0.9, tCx = (pb.min.x + pb.max.x) / 2 + (pb.max.x - pb.min.x) * 0.12, tCz = (pb.min.z + pb.max.z) / 2;
ray.set(V(tCx, 5, tCz), V(0, -1, 0)); { const h = ray.intersectObject(pack, true)[0]; if (h) top = h.point.y; }
place(gCart, 1.0, tCx + 1.6, tCz - 1.1, -0.5);
place(gIV, 1.9, tCx - 1.3, tCz - 0.7, 0.3);
const sw = place(gSwitch, 0.55, -3.12, 0.6, Math.PI / 2, 1.05);
const swHandle = []; sw.traverse(o => { if (o.name === 'handle' || o.name === 'blade') swHandle.push(o); });
place(gChains, 1.4, 2.4, -3.0, 0, 1.2, 0.8);

lamp.position.set(tCx, top + 2.2, tCz + 0.1); lamp.target.position.set(tCx, top, tCz);
red.position.set(-2.6, 2.6, -2.6);
spark.position.set(-2.9, 1.3, 0.6);
camera.position.set(tCx + 2.5, top + 1.85, tCz + 2.4); const LOOK = V(tCx - 0.1, top + 0.15, tCz - 0.1); camera.lookAt(LOOK);

// ---------- the patient on the table ----------
const MAPS = {
  pos: { up: s => `Arm1${s}_`, fore: s => `Arm2${s}_`, hand: s => `Wrist${s}_`, neck: 'Neck_', head: 'Head_', spine: 'Spine2_', chest: 'Spine3_', fingers: s => ['Index', 'Middle', 'Ring', 'Pinky'].map(f => [`${f}1${s}_`, `${f}2${s}_`, `${f}3${s}_`]) },
  pxl: { up: s => `${s}ArmUpperarm`, fore: s => `${s}ArmForearm`, hand: s => `${s}ArmPalm`, neck: 'HumanNeck', head: 'HumanHead_', spine: 'HumanSpine2', chest: 'HumanRibcage', fingers: s => [1, 2, 3, 4, 5].map(i => [`${s}ArmDigit${i}1`, `${s}ArmDigit${i}2`, `${s}ArmDigit${i}3`]) },
  mix: { up: s => `${s === 'R' ? 'Right' : 'Left'}Arm_`, fore: s => `${s === 'R' ? 'Right' : 'Left'}ForeArm`, hand: s => `${s === 'R' ? 'Right' : 'Left'}Hand_`, neck: 'Neck', head: 'Head_', spine: 'Spine1', chest: 'Spine2', fingers: s => ['Index', 'Middle', 'Ring', 'Pinky'].map(f => [1, 2, 3].map(k => `${s === 'R' ? 'Right' : 'Left'}Hand${f}${k}`)) },
};
const PM = MAPS[MODEL];
const zm = SkeletonUtils.clone(gPos.scene); zm.traverse(o => { if (o.isMesh && MODEL !== 'pos' && o.material.color) o.material.color.multiplyScalar(0.85); });
zm.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.frustumCulled = false; o.material = o.material.clone(); o.material.roughness = Math.max(o.material.roughness ?? 0.8, 0.7); } });
const body = new THREE.Group(); body.add(zm); scene.add(body);
zm.updateMatrixWorld(true);
{ const box = new THREE.Box3().setFromObject(zm, true); const sc = 1.8 / (box.max.y - box.min.y); zm.scale.multiplyScalar(sc); zm.position.y -= box.min.y * sc; zm.position.x -= (box.min.x + box.max.x) / 2 * sc; zm.position.z -= (box.min.z + box.max.z) / 2 * sc; }
body.rotation.x = -Math.PI / 2; body.position.set(tCx, top + 0.14, tCz + 0.9); body.updateMatrixWorld(true);
const bones = []; zm.traverse(o => { if (o.isBone) bones.push(o); }); const rest = bones.map(b => b.quaternion.clone());
const B = (k) => bones.find(o => o.name.includes(k));
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), _bw = new THREE.Quaternion(), _pw = new THREE.Quaternion();
function aim(bone, child, dir) { if (!bone || !child) return; bone.updateWorldMatrix(true, true); const cur = child.getWorldPosition(_b).sub(bone.getWorldPosition(_a)).normalize(); _q.setFromUnitVectors(cur, _a.copy(dir).normalize()); bone.getWorldQuaternion(_bw); bone.parent.getWorldQuaternion(_pw); bone.quaternion.copy(_pw.invert().multiply(_q.multiply(_bw))); bone.updateWorldMatrix(false, true); }
function arm(side, upper, fore, curl) {
  const up = B(PM.up(side)), fo = B(PM.fore(side)), ha = B(PM.hand(side)); aim(up, fo, upper); aim(fo, ha, fore);
  const chains = PM.fingers(side).map(c => c.map(n => B(n)).filter(Boolean)).filter(c => c.length >= 2); if (!chains.length || !ha) return;
  const hp = ha.getWorldPosition(new THREE.Vector3()), f0 = chains[0][0].getWorldPosition(new THREE.Vector3()), f1 = chains[chains.length - 1][0].getWorldPosition(new THREE.Vector3());
  const fdir = f0.clone().add(f1).multiplyScalar(0.5).sub(hp).normalize(); const palm = new THREE.Vector3().crossVectors(f1.clone().sub(f0).normalize(), fdir).normalize(); if (side === 'L') palm.negate();
  chains.forEach((c, ci) => { for (let i = 0; i < c.length - 1; i++) { const d = c[i + 1].getWorldPosition(new THREE.Vector3()).sub(c[i].getWorldPosition(new THREE.Vector3())).normalize(); const ang = (curl + 0.3 * Math.sin(ci * 1.7 + i)) * (i === 0 ? 0.55 : 1); aim(c[i], c[i + 1], d.multiplyScalar(Math.cos(ang)).addScaledVector(palm, Math.sin(ang))); } });
}
const FEET = V(0, 0, 1), UP = V(0, 1, 0);
const BODY0 = { p: body.position.clone(), r: body.rotation.clone() }; let lunging = false;
const SLOW = parseFloat(Q.get('slow') || '1');
function lungePose(target) {
  const flat = camera.position.clone().sub(target); flat.y = 0; flat.normalize();
  body.rotation.set(0, Math.atan2(flat.x, flat.z), 0); body.position.copy(target); body.position.y -= 1.5;
  bones.forEach((b, i) => b.quaternion.copy(rest[i])); body.updateMatrixWorld(true);
  const to = camera.position.clone().sub(target).normalize(), side = new THREE.Vector3().crossVectors(to, UP).normalize();
  aim(B(PM.spine), B(PM.chest), to.clone().multiplyScalar(0.6).add(V(0, 0.8, 0)));
  arm('R', to.clone().addScaledVector(side, 0.32).add(V(0, 0.22, 0)), to.clone().addScaledVector(side, 0.12).add(V(0, 0.18, 0)), 1.05);
  arm('L', to.clone().addScaledVector(side, -0.32).add(V(0, 0.22, 0)), to.clone().addScaledVector(side, -0.12).add(V(0, 0.18, 0)), 1.05);
  aim(B(PM.neck), B(PM.head), V(0, 1, 0).addScaledVector(to, 0.38));
  const hb = B(PM.head); if (hb) { body.position.add(target.clone().sub(hb.getWorldPosition(new THREE.Vector3()))); body.updateMatrixWorld(true); }
}
function thud() {
  if (!ac || muted) return; const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
  o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(32, t + 0.3); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.45);
}
function restoreBody() { lunging = false; body.position.copy(BODY0.p); body.rotation.copy(BODY0.r); body.updateMatrixWorld(true); camera.position.copy(camBase); camera.quaternion.copy(camQ0); }
let convulse = 0, headSnap = 0, calm = 1;
function poseBody(now) {
  bones.forEach((b, i) => b.quaternion.copy(rest[i])); body.updateMatrixWorld(true);
  const j = convulse, n = (k) => (Math.sin(now * 37 + k * 11) + Math.sin(now * 53 + k * 7)) * 0.5;
  const breathe = Math.sin(now * (calm > 0.5 ? 1.1 : 3.2)) * 0.03;
  aim(B(PM.spine), B(PM.chest), V(0 + n(1) * 0.15 * j, 0.05 + breathe + n(2) * 0.25 * j, -1));
  arm('R', V(-0.32 + n(3) * 0.4 * j, -0.12 + n(4) * 0.5 * j, 1), V(-0.12 + n(5) * 0.5 * j, -0.05 + n(6) * 0.6 * j, 1), 0.7 + j * 0.8 + n(7) * 0.3 * j);
  arm('L', V(0.32 + n(8) * 0.4 * j, -0.12 + n(9) * 0.5 * j, 1), V(0.12 + n(10) * 0.5 * j, -0.05 + n(11) * 0.6 * j, 1), 0.7 + j * 0.8 + n(12) * 0.3 * j);
  const hb = B(PM.head);
  let hd = V(n(13) * 0.35 * j + Math.sin(now * 0.7) * 0.04, 1, -0.25 + n(14) * 0.3 * j);
  if (headSnap > 0 && hb) { const toCam = camera.position.clone().sub(hb.getWorldPosition(new THREE.Vector3())).normalize(); hd.normalize().lerp(toCam, headSnap); }
  aim(B(PM.neck), hb, hd);
}

// ---------- post: CCTV ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera)); composer.addPass(new OutputPass());
const cctv = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, glitch: { value: 0 }, stat: { value: 0 }, res: { value: new THREE.Vector2(innerWidth, innerHeight) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, glitch, stat; uniform vec2 res; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + time*37.0) * 43758.5453); }
    void main(){ vec2 uv=vUv;
      if (glitch>0.0){ float band=floor(uv.y*28.0); float s=fract(sin(band*91.7+floor(time*30.0)*13.1)*4375.5); uv.x+=(s-0.5)*0.08*glitch*step(0.55,s); }
      vec3 c=texture2D(tDiffuse,uv).rgb; c.r=mix(c.r,texture2D(tDiffuse,uv-vec2(2.0/res.x,0.0)).r,0.4);
      float l=dot(c,vec3(0.3,0.59,0.11)); c=mix(vec3(l),c,0.6); c=pow(clamp(c*1.4+0.015,0.0,1.0),vec3(0.9));
      float r=length((vUv-0.5)*2.0); c*=clamp(1.0-0.38*pow(r,2.5),0.0,1.0); c+=(hash(gl_FragCoord.xy)-0.5)*0.11;
      if (mod(gl_FragCoord.y,3.0)<1.0) c*=0.88;
      if (stat>0.0){ float n=hash(floor(gl_FragCoord.xy/2.0)); c=mix(c,vec3(n*0.9),stat); }
      gl_FragColor=vec4(c,1.0); }`,
});
composer.addPass(cctv);
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); cctv.uniforms.res.value.set(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

// ---------- audio ----------
let ac = null, muted = false; const bufs = {}; const loops = {};
async function startAudio() {
  ac = new (window.AudioContext || window.webkitAudioContext)();
  const names = ['freesound-smice-6-hum-loop', 'freesound-sidequesting-steady-heart-rate-monitor-loop', 'freesound-thegreatperson-heart-rate-cardiac-arrest-flatline', 'freesound-zhro-heartbeat-loopable', 'freesound-bigkahuna360-electrical-shock-zap', 'freesound-joelaudio-electric-zap-001', 'freesound-qubodup-vibrating-jumpscare', 'freesound-tonsil5-zombie-growl-5', 'freesound-lennartgreen-low-rumble-loopable'];
  await Promise.all(names.map(async n => { const r = await fetch(A + n + '.mp3'); bufs[n] = await ac.decodeAudioData(await r.arrayBuffer()); }));
  loops.hum = loop('freesound-smice-6-hum-loop', 0.18); loops.ecg = loop('freesound-sidequesting-steady-heart-rate-monitor-loop', 0.0); loops.rumble = loop('freesound-lennartgreen-low-rumble-loopable', 0.05);
}
function loop(n, v) { const s = ac.createBufferSource(); s.buffer = bufs[n]; s.loop = true; const g = ac.createGain(); g.gain.value = v; s.connect(g).connect(ac.destination); s.start(); return g; }
function play(n, v = 1, rate = 1) { if (!ac || muted || !bufs[n]) return null; const s = ac.createBufferSource(); s.buffer = bufs[n]; s.playbackRate.value = rate; const g = ac.createGain(); g.gain.value = v; s.connect(g).connect(ac.destination); s.start(); return s; }
const fade = (g, v, t = 0.3) => { if (g && ac) g.gain.setTargetAtTime(v, ac.currentTime, t); };

// ---------- the rescue model (demo version of the engine) ----------
const tools = { cut: 0, sell: 0, swap: 0, refi: false };
function post() {
  const sellVal = F.A * tools.sell / 100, proceeds = sellVal * 0.8;
  const ebitLost = F.ebit * (sellVal / F.A) * 0.6;
  const ebit = F.ebit + F.R * (tools.cut / 100) * 0.7 - ebitLost;
  let D = Math.max(0, F.D - proceeds); const swapped = D * tools.swap / 100; D -= swapped;
  const fee = tools.refi ? D * 0.02 : 0; D += fee;
  const rate = (tools.refi ? Math.min(F.r, 0.047) : F.r) + delta;
  const I = D * rate;
  const keep = F.E / (F.E + swapped);
  return { ebit, D, I, icr: I > 0 ? ebit / I : Infinity, jobs: Math.round(F.employees * tools.cut / 100 * 2.2), keep, plants: Math.round(tools.sell / 8), rate };
}
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gauss(rnd) { return Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd()); }
function simulate(p, n = 1000, seed = 7) {
  const rnd = mulberry(seed); let ok = 0; const m0 = p.ebit / F.R, mBar = 0.055, phi = 0.6, sd = 0.018; const fails = [0, 0, 0];
  for (let k = 0; k < n; k++) {
    let m = m0, R = F.R, dead = -1;
    for (let y = 0; y < 3; y++) { m = mBar + phi * (m - mBar) + sd * gauss(rnd); R *= 1 + 0.01 + 0.03 * gauss(rnd); if (R * m < p.I) { dead = y; break; } }
    if (dead < 0) ok++; else fails[dead]++;
  }
  return { odds: ok / n, fails };
}
function drawOutcome(p) {
  const rnd = mulberry((Math.random() * 1e9) | 0); let m = p.ebit / F.R, R = F.R;
  for (let y = 0; y < 3; y++) { m = 0.055 + 0.6 * (m - 0.055) + 0.018 * gauss(rnd); R *= 1 + 0.01 + 0.03 * gauss(rnd); if (R * m < p.I) return { rescued: false, year: 2025 + y + 1, icr: (R * m) / p.I }; }
  return { rescued: true, icr: (R * m) / p.I };
}

// ---------- UI ----------
const fmt$ = (x) => x >= 1e9 ? '$' + (x / 1e9).toFixed(2) + 'B' : '$' + Math.round(x / 1e6) + 'M';
function refresh() {
  const p = post(), s = simulate(p);
  $('v-cut').textContent = tools.cut + '%'; $('v-sell').textContent = tools.sell + '%'; $('v-swap').textContent = tools.swap + '%';
  $('icr').textContent = p.icr.toFixed(2); $('icr').className = 'big ' + (p.icr < 1 ? 'bad' : p.icr < 1.3 ? 'warn' : 'ok');
  $('icr0').textContent = (F.ebit / (F.D * (F.r + delta))).toFixed(2);
  $('debt').textContent = fmt$(p.D); $('int').textContent = fmt$(p.I) + '/yr';
  $('odds').textContent = Math.round(s.odds * 100) + '%';
  $('oddsbar').style.width = Math.round(s.odds * 100) + '%';
  $('pain').innerHTML = [p.jobs ? `${p.jobs.toLocaleString()} jobs cut` : null, p.plants ? `${p.plants} plant${p.plants > 1 ? 's' : ''} sold` : null, tools.swap ? `old shareholders keep ${Math.round(p.keep * 100)}%` : null, tools.refi ? `refinanced at ${(p.rate * 100).toFixed(1)}% · 2% fee` : null].filter(Boolean).map(x => `<li>${x}</li>`).join('') || '<li class="dim">no treatment yet</li>';
  ecgTarget = Math.max(0.15, Math.min(1, p.icr / 1.6));
  return { p, s };
}
for (const k of ['cut', 'sell', 'swap']) $(k).addEventListener('input', e => { tools[k] = +e.target.value; refresh(); if (ac) play('freesound-joelaudio-electric-zap-001', 0.05, 2.5); });
$('refi').addEventListener('change', e => { tools.refi = e.target.checked; refresh(); });
$('mute').addEventListener('click', e => { muted = !muted; e.currentTarget.textContent = muted ? 'SOUND OFF' : 'SOUND ON'; if (ac) muted ? ac.suspend() : ac.resume(); });
$('pname').textContent = F.name.toUpperCase(); $('shock').textContent = '+' + SHOCK.toFixed(2) + ' pp';

// ECG canvas
const ecg = $('ecg'), eg = ecg.getContext('2d'); let ecgX = 0, ecgPhase = 0, ecgTarget = 0.5, ecgMode = 'weak', lastY = 0;
function ecgTick(dt) {
  const w = ecg.width, h = ecg.height, speed = 140 * dt;
  for (let s = 0; s < speed; s++) {
    ecgX = (ecgX + 1) % w; eg.fillStyle = '#020604'; eg.fillRect(ecgX, 0, 10, h);
    let y = 0;
    if (ecgMode === 'flat') y = 0;
    else if (ecgMode === 'chaos') y = (Math.random() - 0.5) * 1.6;
    else {
      const bpm = ecgMode === 'strong' ? 72 : 48 + 40 * (1 - ecgTarget); ecgPhase += bpm / 60 / 140;
      const ph = ecgPhase % 1, amp = ecgMode === 'strong' ? 1 : ecgTarget;
      y = (ph < 0.04 ? Math.sin(ph / 0.04 * Math.PI) * 0.15 : 0) + (ph > 0.1 && ph < 0.13 ? -0.2 : 0) + (ph > 0.13 && ph < 0.16 ? (1 - Math.abs(ph - 0.145) / 0.015) * amp : 0) + (ph > 0.16 && ph < 0.19 ? -0.3 * amp : 0) + (ph > 0.3 && ph < 0.4 ? Math.sin((ph - 0.3) / 0.1 * Math.PI) * 0.18 : 0);
      if (ecgMode === 'weak' && Math.random() < 0.002) y += 0.6;
    }
    const py = h * 0.55 - y * h * 0.38;
    eg.strokeStyle = ecgMode === 'flat' ? '#e0342a' : '#5dff8a'; eg.lineWidth = 2; eg.beginPath(); eg.moveTo(ecgX - 1, lastY); eg.lineTo(ecgX, py); eg.stroke(); lastY = py;
  }
}

// the switch
let state = 'idle', t0 = 0, outcome = null, statT = 0, glitchT = 0;
$('pull').addEventListener('click', () => {
  if (state !== 'idle') return; const { p, s } = refresh(); outcome = drawOutcome(p); if (Q.get('force')) outcome.rescued = Q.get('force') === 'ok'; if (!outcome.rescued && !outcome.year) { outcome.year = 2027; outcome.icr = 0.71; } outcome.odds = s.odds; outcome.p = p;
  state = 'shock'; t0 = performance.now(); document.body.classList.add('busy');
  play('freesound-bigkahuna360-electrical-shock-zap', 1.0); fade(loops.rumble, 0.6, 0.1); fade(loops.ecg, 0, 0.05);
});
$('again').addEventListener('click', () => { $('result').hidden = true; restoreBody(); body.visible = true; state = 'idle'; headSnap = 0; convulse = 0; calm = 1; ecgMode = 'weak'; document.body.classList.remove('busy'); fade(loops.hum, 0.18); fade(loops.rumble, 0.05); refresh(); });
$('back').addEventListener('click', () => { statT = 0.5; setTimeout(() => location.href = 'index.html?skip=1', 350); });
function showResult() {
  const o = outcome, r = $('result'); r.hidden = false; r.className = o.rescued ? 'ok' : 'bad';
  $('r-title').textContent = o.rescued ? 'RESCUED' : 'DECEASED';
  $('r-line').textContent = o.rescued ? `${F.name} covers its interest for three years in this future (ICR ${o.icr.toFixed(2)} in 2028).` : `${F.name} died in ${o.year}: profits fell below interest (ICR ${o.icr.toFixed(2)}). The table is empty.`;
  $('r-odds').textContent = o.rescued ? `It survived in ${Math.round(o.odds * 1000)} of 1,000 simulated futures. This was one of them.` : `It survived in ${Math.round(o.odds * 1000)} of 1,000 simulated futures. This was not one of them.`;
  $('r-pain').innerHTML = $('pain').innerHTML;
}

// ---------- loop ----------
const clock = new THREE.Clock(); const camBase = camera.position.clone(), camQ0 = camera.quaternion.clone();
function frame() {
  const rawDt = clock.getDelta(), dt = Math.min(rawDt, 0.05), now = clock.elapsedTime; const el = (performance.now() - t0) / 1000;
  lamp.intensity = 34 * (0.97 + 0.03 * Math.sin(now * 50)); camera.position.copy(camBase); spark.intensity = 0; hemi.intensity = 0.25; red.intensity = 0;
  if (state === 'shock') { // 1.6 s of current
    convulse = 1; ecgMode = 'chaos'; glitchT = 0.05; spark.intensity = Math.random() < 0.5 ? 9 : 0; lamp.intensity = Math.random() < 0.35 ? 4 : 60;
    camera.position.x += (Math.random() - 0.5) * 0.03; camera.position.y += (Math.random() - 0.5) * 0.03;
    for (const h of swHandle) h.rotation.z = -0.9;
    if (el > 1.6) { state = 'verdict'; t0 = performance.now(); convulse = 0; lamp.intensity = 34; fade(loops.rumble, 0.05, 0.4); }
  } else if (state === 'verdict') {
    if (outcome.rescued) {
      ecgMode = 'strong'; calm = 1; fade(loops.ecg, 0.35, 0.2);
      if (el > 0.2 && !outcome.beat) { outcome.beat = true; play('freesound-zhro-heartbeat-loopable', 0.5); }
      if (el > 2.6) { state = 'done'; showResult(); }
    } else {
      // flatline and false calm; the head turns; the lights stutter and the table is empty; red light, it comes from the side and knocks the camera down
      const e = Math.min(el / SLOW, parseFloat(Q.get('hold') || '1e9')); document.body.dataset.e = e.toFixed(2);
      if (!outcome.flat) { outcome.flat = true; ecgMode = 'flat'; play('freesound-thegreatperson-heart-rate-cardiac-arrest-flatline', 0.7); fade(loops.hum, 0.0, 0.2); }
      if (e > 3.0 && e < 4.2) headSnap = Math.min(1, (e - 3.0) / 1.2);
      const off = (e > 4.6 && e < 4.75) || (e > 5.3 && e < 5.5) || e > 6.7;
      if (off) { lamp.intensity = 0; hemi.intensity = 0.02; }
      if (e > 4.6 && !outcome.flick) { outcome.flick = true; play('freesound-joelaudio-electric-zap-001', 0.35); }
      if (e > 5.5 && !outcome.gone) { outcome.gone = true; body.visible = false; glitchT = 0.08; fade(loops.rumble, 0, 0.05); }
      if (e > 6.7) { red.position.copy(camera.position).add(V(-0.5, 0.6, -0.6)); red.distance = 9; red.intensity = 2.2 + Math.random() * 0.8; }
      const ST = [2.2, 1.5, 1.0, 0.7, 0.52], T0 = 7.4, DT = 0.12;
      if (e > T0 && !outcome.lost) {
        const i = Math.min(ST.length - 1, Math.floor((e - T0) / DT));
        if (i !== outcome.i) {
          outcome.i = i; lunging = true; body.visible = true; glitchT = 0.08; statT = 0.07;
          if (i === 1) { play('freesound-qubodup-vibrating-jumpscare', 1); play('freesound-tonsil5-zombie-growl-5', 1, 0.6); }
          const fwd = camera.getWorldDirection(new THREE.Vector3()), dir0 = fwd.clone().applyAxisAngle(UP, -0.62), u = 1 - ST[i] / ST[0];
          const dir = dir0.lerp(fwd, Math.min(1, u * 1.35)).normalize();
          lungePose(camera.position.clone().addScaledVector(dir, ST[i]).add(V(0, -0.03 * ST[i], 0)));
        }
        red.intensity = 0.5 + 3.2 * ST[i] * ST[i]; red.position.copy(camera.position).add(V(-0.2, -0.25, -0.05));
      }
      const F0 = T0 + 5 * DT + 0.06;
      if (e > F0 && !outcome.lost) { // knocked over: the camera drops and rolls onto the floor
        if (!outcome.hit) { outcome.hit = true; thud(); document.body.classList.add('shake'); setTimeout(() => document.body.classList.remove('shake'), 500); }
        const f = Math.min(1, (e - F0) / 0.32), k = 1 - (1 - f) * (1 - f), bounce = f >= 1 ? Math.sin((e - F0 - 0.32) * 40) * Math.exp(-(e - F0 - 0.32) * 9) * 0.03 : 0;
        camera.position.lerpVectors(camBase, V(camBase.x - 0.4, 0.12 + Math.abs(bounce), camBase.z - 0.2), k);
        camera.quaternion.copy(camQ0).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), k * 1.45)).multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -k * 0.35));
        if (k > 0.3) body.visible = false;
        red.intensity = 2.5 + Math.random(); red.position.set(camBase.x - 0.9, 0.9, camBase.z - 0.8);
        glitchT = Math.max(glitchT, 0.05);
      }
      if (e > F0 + 0.9 && !outcome.lost) { outcome.lost = true; $('lost').hidden = false; statT = 99; body.visible = false; }
      if (e > F0 + 0.9 && outcome.lost) { camera.position.copy(V(camBase.x - 0.4, 0.12, camBase.z - 0.2)); }
      if (e > F0 + 2.9) { $('lost').hidden = true; statT = 0.3; state = 'done'; headSnap = 0; restoreBody(); body.visible = false; showResult(); }
    }
  }
  for (const h of swHandle) h.rotation.z *= state === 'shock' ? 1 : 0.9;
  if (!lunging) poseBody(now);
  ecgTick(dt);
  if (glitchT > 0) glitchT -= rawDt; if (statT > 0) statT -= rawDt;
  cctv.uniforms.glitch.value = glitchT > 0 ? 1 : (Math.random() < 0.003 ? 0.6 : 0); cctv.uniforms.stat.value = Math.max(0, Math.min(1, statT / 0.18)); cctv.uniforms.time.value = now;
  composer.render(); requestAnimationFrame(frame);
}
const clockEl = $('clock'); const tc = Date.UTC(2026, 10, 13, 3, 31, 2);
setInterval(() => { clockEl.textContent = new Date(tc + performance.now()).toISOString().slice(0, 19).replace('T', ' '); }, 250);
$('enter').addEventListener('click', async () => { statT = 0.45; $('intro').classList.add('out'); setTimeout(() => $('intro').remove(), 500); try { await startAudio(); } catch (e) { console.warn(e); } });
if (Q.get('skip')) $('intro').remove();

refresh();
window.__lab = { B, PM, camera, THREE, body }; $('loading').remove(); document.body.dataset.ready = 'true'; statT = 0.4;
if (Q.get('hands')) { const h = $('hands'); h.hidden = false; setTimeout(() => h.classList.add('fade'), 2500); setTimeout(() => (h.hidden = true), 9000); }
if (Q.get('test')) { for (const k of ['cut', 'sell', 'swap']) { $(k).value = Q.get(k) || 0; tools[k] = +$(k).value; } refresh(); if (Q.get('pull')) setTimeout(() => $('pull').click(), 600); }
requestAnimationFrame(frame);
