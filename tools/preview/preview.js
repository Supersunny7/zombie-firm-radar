import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const q = new URLSearchParams(location.search);
const model = q.get("model");
const view = q.get("view") ?? "three-quarter";
const size = Number(q.get("size") ?? 0);
const silhouette = q.get("silhouette") === "1";

// Silhouette canvas is square; lit canvas defaults to 1024x640.
const W = silhouette ? size || 200 : size || 1024;
const H = silhouette ? W : Math.round(W * 0.625);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(silhouette ? 0xffffff : 0x0b0d12);

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder); // WebP textures decode natively via EXT_texture_webp

function fail(msg) {
  window.__error = msg;
  console.error(msg);
}

if (!model) {
  fail("missing ?model=<path under /assets>");
} else {
  loader.load(
    `/assets/${model.replace(/^\/+/, "")}`,
    (gltf) => {
      const root = gltf.scene;
      scene.add(root);
      root.updateMatrixWorld(true);

      const meshes = [];
      let triangles = 0;
      root.traverse((o) => {
        if (!o.isMesh) return;
        meshes.push(o.name);
        const g = o.geometry;
        triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
        if (silhouette) o.material = new THREE.MeshBasicMaterial({ color: 0x000000 });
      });

      const box = new THREE.Box3().setFromObject(root);
      const c = box.getCenter(new THREE.Vector3());
      const s = box.getSize(new THREE.Vector3());
      window.__stats = {
        triangles,
        bbox: { min: box.min.toArray(), max: box.max.toArray(), size: s.toArray() },
        meshes,
      };

      let camera;
      // Directions are from the target towards the camera.
      const dirs = {
        front: new THREE.Vector3(0, 0.1, 1),
        "three-quarter": new THREE.Vector3(0.7, 0.45, 1),
        top: new THREE.Vector3(0, 1, 0.001),
        head: new THREE.Vector3(0.25, 0.1, 1),
      };
      const dir = (dirs[view] ?? dirs["three-quarter"]).clone().normalize();
      let target = c.clone();
      let radius = s.length() / 2;

      if (view === "head") {
        // Frame the top 15% of the bounding box.
        const h = s.y * 0.15;
        target = new THREE.Vector3(c.x, box.max.y - h / 2, c.z);
        radius = Math.max(h, s.x * 0.15) * 0.7;
      }

      radius /= Number(q.get("zoom") ?? 1) || 1; // optional closer framing

      if (silhouette) {
        const half = radius * 1.05;
        camera = new THREE.OrthographicCamera(-half, half, half, -half, 0.01, radius * 10);
        // Silhouette views look along the same direction but are centred on the bbox.
      } else {
        camera = new THREE.PerspectiveCamera(35, W / H, radius / 100, radius * 100);
        const fov = THREE.MathUtils.degToRad(camera.fov);
        const dist = (radius / Math.sin(Math.min(fov, fov * (W / H)) / 2)) * 1.0;
        camera.position.copy(target).addScaledVector(dir, dist);
      }
      if (silhouette) camera.position.copy(target).addScaledVector(dir, radius * 4);
      camera.lookAt(target);

      if (!silhouette) {
        scene.add(new THREE.AmbientLight(0x202838, 0.6));
        const key = new THREE.DirectionalLight(q.get("light") === "neutral" ? 0xffffff : 0xffb070, 3.2); // warm key (light=neutral: white, to judge albedo)
        key.position.copy(target).add(new THREE.Vector3(radius * 2, radius * 2, radius * 2));
        scene.add(key);
        const rim = new THREE.DirectionalLight(0x6a8cff, 0.8); // faint cold rim
        rim.position.copy(target).add(new THREE.Vector3(-radius * 2, radius, -radius * 2));
        scene.add(rim);
      }

      renderer.render(scene, camera);
      requestAnimationFrame(() => {
        renderer.render(scene, camera);
        window.__ready = true;
      });
    },
    undefined,
    (e) => fail(`load failed: ${e?.message ?? e}`),
  );
}
