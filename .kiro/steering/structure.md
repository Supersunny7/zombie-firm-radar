# Project Structure

```
/pipeline              Python pipeline and tests (partner)
/data                  Generated JSON
  /mock                Fake data
  /schema              JSON Schemas
/web
  /src
    /engine            rescue-engine (pure TS) and its tests
    /state             zustand store and game-flow state machine
    /scenes
      /graveyard
      /lab
    /fx                Post-processing, decay shader, decals
    /cinematics        Theatre.js state JSON and players
    /ui                HUD, patient file, tool panel, table view
    /types             TypeScript types generated from data-contract.md
  /public/assets       Models, textures, HDRIs, sounds (every file listed in CREDITS.md)
/reference             Screenshots, recordings, storyboards from design prototypes; never imported by code
/tools                 Asset conversion and retargeting scripts
/docs                  kiro-evidence screenshots, reviews, write-ups
/.kiro                 Steering, specs, hooks, agents, settings; always committed, never git-ignored
```

## Ownership
- Partner: `/pipeline` and `/data` generation.
- User: `/web` and `/tools`.

## Rules
- Keep ingestion (`/pipeline`), metric computation (`/web/src/engine`) and presentation (`/web/src/scenes`, `/fx`, `/ui`) separate.
- `/web/src/engine` must not import React or three.js.
- Never change the data contract without updating `data-contract.md`, the JSON Schemas in `/data/schema` and the TypeScript types in `/web/src/types` together.
- Git-ignore only the raw EDGAR/FRED cache (/pipeline/.cache) and local tool output. Final JSON in /data and /data/mock is committed, because the deployed app reads it and the repository must contain everything needed to run the project. Never git-ignore /.kiro.
- Update this file when top-level folders change.
