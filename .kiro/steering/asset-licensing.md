---
inclusion: always
---

# Asset Licensing

## Allowed licenses

- CC0
- CC BY (attribution required)
- MIT
- Apache-2.0
- SIL OFL
- Our own work
- CMU Graphics Lab motion capture (credit required)
- Sketchfab CC BY uploads whose model page has no AI-generated tag (tags checked 2026-11-12). Named models: possessed-undead by giantSwing, Zombie by pxltiger, Zombie Walk Test by OSCAR CREATIVO, Terrifying Hooded Horror Woman by Purple.Point. Any other Sketchfab upload needs its page checked first.
- A CC BY uploader's own mesh and skeleton on a Mixamo-style rig is allowed. Mixamo animation clips and Mixamo-hosted files stay forbidden (see below).

## Forbidden

- Anything NonCommercial (CC BY-NC*).
- Mixamo files.
- Paid marketplace assets (CGTrader, Fab, TurboSquid).
- AI-generated assets of unknown origin.
- Anything showing real people.
- Film or game characters, logos or trademarks.
- Copyrighted music.

## Rule: every asset is listed

Every asset under `web/public/assets` must have one row in `CREDITS.md`:

| Path | Title | Author | Source URL | License | Changes we made |
| --- | --- | --- | --- | --- | --- |

Only add rows for files that exist in the repository.

## Current sources

- Poly Haven (CC0): textures, models and HDRIs.
- Microsoft Rocketbox avatars and animations (MIT). Include its LICENSE file next to the avatars.
- Sketchfab CC BY zombie and hand scans. Author name and link are required.
  - possessed-undead by giantSwing (CC BY).
  - Zombie by pxltiger (CC BY).
  - Zombie Walk Test by OSCAR CREATIVO (CC BY).
  - Terrifying Hooded Horror Woman by Purple.Point (CC BY).
- CMU motion capture (credit required; fixed line in `CREDITS.md`).
- Google Fonts (OFL).
- Freesound: CC0 sounds only.

## Before adding an asset

Check its license page. If unsure, do not add it.
