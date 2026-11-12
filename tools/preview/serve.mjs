// Static preview server. Node built-ins only, 127.0.0.1 only, read-only, no outbound requests.
// Usage: node tools/preview/serve.mjs [--port 4173] [--timeout 600]
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..");

export const ROOTS = [
  { prefix: "/assets/", dir: path.join(repo, "web", "public", "assets") },
  { prefix: "/vendor/three/", dir: path.join(repo, "web", "node_modules", "three") },
  { prefix: "/", dir: here },
];

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".wasm": "application/wasm",
  ".md": "text/plain; charset=utf-8",
};

/** Map a URL path to an absolute file path inside one of the three roots, or null. */
export function resolveRequest(urlPath, roots = ROOTS) {
  let p;
  try {
    p = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  } catch {
    return null;
  }
  if (p.includes("\0") || p.includes("\\") || !p.startsWith("/")) return null;
  if (p.split("/").some((s) => s === "..")) return null;
  if (p.endsWith("/")) p += "index.html";
  const root = roots.find((r) => p.startsWith(r.prefix));
  if (!root) return null;
  const rel = p.slice(root.prefix.length);
  const full = path.resolve(root.dir, rel);
  const base = path.resolve(root.dir);
  if (full !== base && !full.startsWith(base + path.sep)) return null;
  return full;
}

export function createServer(roots = ROOTS) {
  return http.createServer((req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405).end();
      return;
    }
    const file = resolveRequest(req.url ?? "/", roots);
    if (!file) {
      res.writeHead(403).end("forbidden");
      return;
    }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) {
        res.writeHead(404).end("not found");
        return;
      }
      res.writeHead(200, {
        "content-type": TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream",
        "content-length": st.size,
        "cache-control": "no-store",
      });
      if (req.method === "HEAD") res.end();
      else fs.createReadStream(file).pipe(res);
    });
  });
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const server = createServer();
  const port = Number(arg("--port") ?? 0);
  const timeout = Number(arg("--timeout") ?? 0);
  server.listen(port, "127.0.0.1", () => {
    console.log(`http://127.0.0.1:${server.address().port}/`);
  });
  const stop = () => server.close(() => process.exit(0));
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  if (timeout > 0) setTimeout(stop, timeout * 1000).unref();
  // server.close waits for keep-alive sockets; force exit shortly after.
  server.on("close", () => process.exit(0));
}
