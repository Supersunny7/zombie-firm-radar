---
inclusion: fileMatch
fileMatchPattern: "web/**"
---

# Design System

## Theme: "Night feed"

A realistic graveyard and an underground lab, seen through a security camera at night. Fear comes from darkness, limited vision and slowness first, blood second. Every spooky element must carry meaning (status, risk, the effect of a treatment). Numbers are serious; copy is short, plain and a little dry.

## Lighting (realistic, physically based)

- The scene is almost black. The player's flashlight (graveyard) and the surgical lamp (lab) are the main light sources.
- Faint cold moonlight for silhouettes.
- One warm practical light (lantern) per scene.
- One red emergency bulb in the lab.
- ACES tone mapping. Exponential fog. Exact values live in `scene-reference.md`.

## Camera look (post-processing, "CCTV")

- Film grain.
- Slight chromatic aberration at the edges.
- Subtle scanlines.
- Strong vignette.
- Partial desaturation with a cold tint.
- Rare short tracking glitch (lights-off only).
- Blood flood on failure: red bleeds in from the screen edges; it never covers the center text.

## HUD colors (on near-black)

| Role | Value |
| --- | --- |
| Text | `#E6E2D6` |
| Secondary text | `#A9B4BF` |
| REC and danger | `#E0473B` |
| Status: healthy | `#8CC2A5` |
| Status: endangered | `#E8B85C` |
| Status: zombie | `#E8665A` |
| Status: not enough data (insufficient_data) | `#A9B4BF` |
| Panel background | `rgba(6,8,11,0.78)` |
| Panel border | `1px solid rgba(230,226,214,0.2)` |
| Panel radius | `6px` |

All text must meet WCAG AA contrast against its panel.

## Typography (Google Fonts, OFL)

- Display, firm names, engravings: Cormorant Garamond 500/600.
- UI: Inter 400/500/600.
- Numbers, HUD, timestamps: JetBrains Mono 400/500.

## HUD layout

- Top-left: "REC · CAM 03 — PLOT 04 / MANUFACTURING" and a running timestamp.
- The 3D stage is never covered by a panel: panels dock to the right and bottom.
- Under 900px wide, panels stack below the stage.

## Gore levels

- Lights off: blood drips on tombstones of zombies, wounds and stitches on the patient, the failure jump scare (one per outcome).
- Lights on: no blood, no jump scare, no glitch, brighter ambient light; same information.
- Never: gore unrelated to a meaning, mutilation beyond the tool mapping, real people, characters from films or games.

## Accessibility

- Never rely on color alone: status also shows in tombstone shape (intact, cracked, broken with a hand) and in text.
- No more than 3 flashes per second, ever.
- `prefers-reduced-motion`: no camera sway, no glitch, cuts instead of camera moves, instant transitions.
- Every 3D interaction has a keyboard and table-view equivalent.
- Every cinematic can be skipped with Esc or a visible "Skip" button.

## Copy

- Sentence case.
- Footer: "Data: SEC EDGAR. Not investment advice."
- Rescue results are hypotheticals: "What it would take…", never "should".

---

Tailwind tokens are created in the app-shell spec from this file.
