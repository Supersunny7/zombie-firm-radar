// Preview scene "horror-stones" (task 3.31): close-up of the three scanned stone models side by side,
// one panel each, in the lights-off look of web/src/scenes/graveyard/look.ts (fog, hemisphere, moon,
// camera-mounted flashlight, ACES exposure 1, environment 0). No CCTV grade (post-processing).
// ?material=app      (default) the app's StoneMaterial setup after task 3.31: opaque, FrontSide, map +
//                    normalMap + roughnessMap + metalnessMap from the glb, metalness = the glb
//                    metallicFactor, colour * (0.62, 0.68, 0.78) * 0.55 (cold tint and
//                    LOOK_STONE_COLOR_FACTOR, decay 0)
// ?material=prefix   the StoneMaterial setup before task 3.31: as app, without the metalnessMap
//                    (used for horror-batch2b-stone-before.png)
// ?material=metalmap diagnostic from the first attempt: prefix plus the glb metalnessMap (= app)
// ?material=gltf     the GLTFLoader material unchanged
// Camera and light setup is fixed in SETUP below, so before and after shots are identical.
// Sets window.__ready (after render) or window.__error, and window.__stats (per-model report).
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const q = new URLSearchParams(location.search);
const mode = q.get("material") ?? q.get("shot") ?? "app"; // screenshot.mjs passes ?shot=
const W = Number(q.get("w") ?? 1920);
const H = Number(q.get("h") ?? 1080);

const MODELS = [
  { id: "sketchfab-small-gravestone-drydoctoregg", yaw: 0 },
  { id: "sketchfab-damaged-tombstone-drydoctoregg", yaw: 0 },
  { id: "own-headstone-cracked", yaw: 0 },
];

// Recorded setup (all panels identical, relative to the stone's bbox centre; stone height 0.9 m).
export const SETUP = {
  stoneHeight: 0.9,
  fovDeg: 46,
  camera: [0.35, 0.2, 1.55], // offset from the stone centre
  flashlightFromCamera: [0.12, -0.08, 0], // camera-mounted flashlight offset
  flashlight: { color: 0xffe7c4, intensity: 55, distance: 26, angle: 0.36, penumbra: 0.95, decay: 2, bias: -0.0004 },
  moon: { color: 0x7f9cd6, intensity: 1.1, offset: [-4, 9, -22] },
  hemisphere: { sky: 0x3a4a66, ground: 0x0a0806, intensity: 0.18 },
  fog: { color: 0x0a0d13, density: 0.075 },
  tint: [0.62 * 0.55, 0.68 * 0.55, 0.78 * 0.55],
};

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

function fail(msg) {
  window.__error = String(msg);
  console.error(msg);
}

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

function stoneMaterial(src) {
  if (mode === "gltf") return src;
  const color = src.color.clone().multiply(new THREE.Color(...SETUP.tint));
  return new THREE.MeshStandardMaterial({
    map: src.map ?? null,
    normalMap: src.normalMap ?? null,
    roughnessMap: src.roughnessMap ?? null,
    metalnessMap: mode === "prefix" ? null : src.metalnessMap ?? null,
    color,
    roughness: src.roughness,
    metalness: src.metalness,
    side: THREE.FrontSide,
    transparent: false,
  });
}

async function buildPanel(m) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SETUP.fog.color);
  scene.fog = new THREE.FogExp2(SETUP.fog.color, SETUP.fog.density);

  const gltf = await loader.loadAsync(`/assets/models/${m.id}/${m.id}.glb`);
  const root = gltf.scene;
  const stats = { id: m.id, materials: [] };
  root.traverse((o) => {
    if (!o.isMesh) return;
    const src = o.material;
    stats.materials.push({
      name: src.name,
      transparent: src.transparent,
      metalness: src.metalness,
      roughness: src.roughness,
      metalnessMap: !!src.metalnessMap,
      side: src.side,
    });
    o.material = stoneMaterial(src);
    o.castShadow = true;
    o.receiveShadow = true;
  });
  root.rotation.y = m.yaw;
  root.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(root);
  const s = SETUP.stoneHeight / (box.max.y - box.min.y);
  root.scale.setScalar(s);
  root.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(root);
  const c = box.getCenter(new THREE.Vector3());
  root.position.set(-c.x, -box.min.y, -c.z);
  root.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(root);
  stats.size = box.getSize(new THREE.Vector3()).toArray().map((v) => +v.toFixed(3));
  scene.add(root);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x0b0806, roughness: 1, metalness: 0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const center = box.getCenter(new THREE.Vector3());
  const camera = new THREE.PerspectiveCamera(SETUP.fovDeg, W / 3 / H, 0.05, 100);
  camera.position.copy(center).add(new THREE.Vector3(...SETUP.camera));
  camera.lookAt(center);

  const h = SETUP.hemisphere;
  scene.add(new THREE.HemisphereLight(h.sky, h.ground, h.intensity));
  const moon = new THREE.DirectionalLight(SETUP.moon.color, SETUP.moon.intensity);
  moon.position.copy(center).add(new THREE.Vector3(...SETUP.moon.offset));
  moon.target.position.copy(center);
  moon.castShadow = true;
  scene.add(moon, moon.target);
  const f = SETUP.flashlight;
  const spot = new THREE.SpotLight(f.color, f.intensity, f.distance, f.angle, f.penumbra, f.decay);
  spot.position.copy(camera.position).add(new THREE.Vector3(...SETUP.flashlightFromCamera));
  spot.target.position.copy(center);
  spot.castShadow = true;
  spot.shadow.bias = f.bias;
  scene.add(spot, spot.target);
  return { scene, camera, stats };
}

async function main() {
  const panels = await Promise.all(MODELS.map(buildPanel));
  window.__stats = { mode, setup: SETUP, models: panels.map((p) => p.stats) };
  const pw = Math.floor(W / 3);
  const render = () => {
    renderer.setScissorTest(true);
    panels.forEach((p, i) => {
      renderer.setViewport(i * pw, 0, pw, H);
      renderer.setScissor(i * pw, 0, pw, H);
      renderer.render(p.scene, p.camera);
    });
    renderer.setScissorTest(false);
  };
  render();
  requestAnimationFrame(() => {
    render();
    window.__ready = true;
  });
}

main().catch(fail);
