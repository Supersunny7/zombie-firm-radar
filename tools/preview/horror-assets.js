// Preview scene "horror-assets": Ground_Texture on a plane plus the four Character_Models,
// lit with the lights-off values of scene-reference.md (fog, moon, hemisphere, flashlight).
// ?shot=assets | ground | possessed-undead | zombie-pxltiger | zombie-walk-oscar | hooded-woman
// Sets window.__ready (after render) or window.__error, and window.__stats (per-model report).
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const q = new URLSearchParams(location.search);
const shot = q.get("shot") ?? "assets";
const W = Number(q.get("w") ?? 1920);
const H = Number(q.get("h") ?? 1080);

const MODELS = [
  { id: "possessed-undead", file: "sketchfab-possessed-undead-giantswing", x: -2.4 },
  { id: "zombie-pxltiger", file: "sketchfab-zombie-pxltiger", x: -0.8, clip: "Idle" },
  { id: "zombie-walk-oscar", file: "sketchfab-zombie-walk-oscar", x: 0.8 },
  { id: "hooded-woman", file: "sketchfab-hooded-horror-woman-purplepoint", x: 2.4 },
];
const GROUND = "polyhaven-brown-mud-leaves-01";
const TILE_M = 4;

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = Number(q.get("exposure") ?? 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x171b21);
scene.fog = new THREE.FogExp2(0x171b21, 0.085);

function fail(msg) {
  window.__error = String(msg);
  console.error(msg);
}

function loadTexture(name, srgb) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      `/assets/textures/${GROUND}/${GROUND}_${name}.webp`,
      (t) => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(60 / TILE_M, 60 / TILE_M);
        t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        resolve(t);
      },
      undefined,
      reject,
    );
  });
}

async function buildGround() {
  const [map, normalMap, roughnessMap] = await Promise.all([
    loadTexture("diffuse", true),
    loadTexture("nor-gl", false),
    loadTexture("rough", false),
  ]);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ map, normalMap, roughnessMap, roughness: 1 }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

async function loadModel(m) {
  const gltf = await loader.loadAsync(`/assets/models/${m.file}/${m.file}.glb`);
  const root = gltf.scene;
  scene.add(root);
  const stats = { id: m.id, clips: gltf.animations.map((a) => `${a.name} ${a.duration.toFixed(2)}s`) };
  let skinned = 0;
  const maps = new Set();
  root.traverse((o) => {
    if (o.isSkinnedMesh) skinned++;
    if (o.isMesh) {
      o.castShadow = true;
      o.frustumCulled = false;
      const mat = o.material;
      for (const k of ["map", "normalMap", "metalnessRoughnessMap", "roughnessMap", "emissiveMap"]) {
        if (mat[k]) maps.add(k);
      }
      stats.sample = stats.sample ?? { color: mat.color?.getHexString(), metalness: mat.metalness, roughness: mat.roughness };
    }
  });
  stats.skinnedMeshes = skinned;
  stats.textures = [...maps];

  let mixer = null;
  if (m.clip) {
    const clip = THREE.AnimationClip.findByName(gltf.animations, m.clip);
    if (!clip) throw new Error(`${m.id}: clip ${m.clip} missing`);
    mixer = new THREE.AnimationMixer(root);
    mixer.clipAction(clip).play();
    mixer.update(0.5); // fixed time so the screenshot is deterministic
  }
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  stats.nativeSize = size.toArray().map((v) => +v.toFixed(3));
  // Report the native scale; do not rescale (task 3.14 owns scaling). Stand on the ground.
  root.position.set(m.x, -box.min.y, 0);
  root.updateMatrixWorld(true);
  stats.height = +size.y.toFixed(3);
  return { root, stats, mixer, box: new THREE.Box3().setFromObject(root) };
}

function lights(target, spread) {
  scene.add(new THREE.HemisphereLight(0x3a4a66, 0x0b0806, 0.03));
  const moon = new THREE.DirectionalLight(0x8ea9d6, 0.12);
  moon.position.set(-14, 18, -22);
  scene.add(moon);
  // Flashlight: scene-reference values, positioned like a camera-mounted light.
  const spot = new THREE.SpotLight(0xfff1d6, 240, 34, spread, 0.5, 1.7);
  spot.position.copy(target).add(new THREE.Vector3(1.2, 1.3, 6.2));
  spot.target.position.copy(target);
  spot.castShadow = true;
  scene.add(spot, spot.target);
}

async function main() {
  await buildGround();
  const wanted = shot === "assets" ? MODELS : shot === "ground" ? [] : MODELS.filter((m) => m.id === shot);
  if (shot !== "assets" && shot !== "ground" && wanted.length === 0) throw new Error(`unknown shot ${shot}`);
  const loaded = await Promise.all(wanted.map(loadModel));
  window.__stats = loaded.map((l) => l.stats);
  // A single model stands in the middle.
  if (wanted.length === 1) {
    loaded[0].root.position.x = 0;
    loaded[0].root.updateMatrixWorld(true);
  }

  const camera = new THREE.PerspectiveCamera(52, W / H, 0.05, 200);
  if (shot === "ground") {
    camera.position.set(0, 1.1, 2.4);
    camera.lookAt(0, 0, -0.6);
    lights(new THREE.Vector3(0, 0, -0.8), 0.6);
  } else if (shot === "assets") {
    camera.position.set(0, 1.5, 6.4);
    camera.lookAt(0, 0.9, 0);
    lights(new THREE.Vector3(0, 0.9, 0), 0.5);
  } else {
    const box = new THREE.Box3().setFromObject(loaded[0].root);
    const h = box.max.y - box.min.y;
    const c = box.getCenter(new THREE.Vector3());
    const dist = (h * 0.62) / Math.tan(THREE.MathUtils.degToRad(52 / 2)) + 0.8;
    camera.position.set(c.x, c.y + h * 0.12, c.z + dist);
    camera.lookAt(c);
    lights(c, 0.45);
  }

  const render = () => renderer.render(scene, camera);
  render();
  requestAnimationFrame(() => {
    render();
    window.__ready = true;
  });
}

main().catch(fail);
