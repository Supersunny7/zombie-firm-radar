# Tech Stack

## Data pipeline (partner owns)
- Python 3.11+, requests, pandas, pytest + hypothesis.
- Sources: SEC EDGAR XBRL frames and companyfacts; FRED (DGS10).
- Output: static JSON in `/data` that follows `data-contract.md`.
- EDGAR fair access: descriptive User-Agent, max 10 requests per second.

## Web app (user owns)
- React 19 + Vite + TypeScript, pnpm.
- Version line: react 19, @react-three/fiber 9, @react-three/drei 10; never mix in fiber 8 or drei 9.
- 3D: @react-three/fiber, @react-three/drei (CameraControls, Decal, useGLTF, Environment), @react-three/postprocessing, three-custom-shader-material (decay shader).
- State: zustand for shared state; a small state machine for game flow.
- Cinematics: Theatre.js (@theatre/core at runtime, @theatre/studio in development only).
- HUD: Tailwind. Sound: Web Audio.

## rescue-engine
- Pure TypeScript in `web/src/engine`; no React or three.js imports.
- Tests: Vitest + fast-check (property-based).
- Runs in a Web Worker.

## Assets
- `.glb` (Meshopt), KTX2 textures, `.hdr` environments.
- Licenses must be allowed by `asset-licensing.md`; every file is listed in `CREDITS.md`.

## Deploy
Vercel (static).

## Performance targets
- >= 50 fps at 1080p on an integrated-GPU laptop.
- A "low quality" toggle.
- Initial download <= 25 MB; lab assets lazy-loaded.

## Conventions
- Pin dependency versions exactly.
- Keep secrets and API keys out of the repo; use environment variables.
- Cache raw EDGAR responses locally and keep them out of git.
- Developers use Windows with PowerShell. Write commands in PowerShell syntax and chain with `;`, not `&&`.

## Common commands
None yet. Add install, build, test, and dev commands here once tooling exists.
