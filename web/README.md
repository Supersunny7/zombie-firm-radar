# Zombie Firm Radar: web app

React 19 + Vite + TypeScript. Requires Node 22+ and pnpm. Run all commands from `web`.

## Commands

```powershell
pnpm install --frozen-lockfile
pnpm dev                # dev server
pnpm build              # tsc -b, vite build, bundle-size check
pnpm preview            # serve the built app
pnpm test               # vitest run
pnpm lint               # eslint
pnpm format             # prettier --check
pnpm format:write       # prettier --write
pnpm typecheck          # tsc -b --noEmit
```

Full check: `pnpm typecheck; pnpm lint; pnpm format; pnpm test; pnpm build`

## Debug bar

The debug bar is always on in `pnpm dev`. In a production build, add `?debug=1` to the URL to show it.

## Data sources

The app reads static JSON from `/data/` (repository `data` folder, see `.kiro/steering/data-contract.md`). Each file is validated on load.

| Source    | When                                                                |
| --------- | ------------------------------------------------------------------- |
| `real`    | `/data/firms_index.json` exists. Production tries this first.       |
| `mock`    | `/data/mock/`. Production falls back to it if real data is missing. |
| `fixture` | Dev only. Used when `/data/mock/` is also missing.                  |

- Dev server: tries `/data/mock/`, then the built-in fixture.
- Build: copies real data (without `schema/` and `mock/`) when `data/firms_index.json` exists, otherwise copies `data/mock/` only.
- A source that is present but invalid is an error. There is no silent fallback to another source.
- The fixture lives in `src/dev/fixtures` and is imported only when `import.meta.env.DEV` is true. It never ships in a production build, and the bundle check fails the build if it does.

## Deploy (Vercel)

`vercel.json` lives at the repository root and sets the install command, the build command and the output directory (`web/dist`). Both commands run `npx --yes pnpm@<version>`, where the version must equal `packageManager` in `web/package.json`; a test checks this. Bump all three together. Keep the Vercel project root at the repository root. Setting it to `web` would skip `vercel.json` and break the `data` folder copy.
