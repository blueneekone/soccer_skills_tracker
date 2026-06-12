# ARMORY_STATS_TELEMETRY_PASS — VS-2b

**Persona:** Player OS · Armory + Stats telemetry  
**Routes:** `/player/armory`, `/stats` (player role)  
**Status:** `player-armory-stats-telemetry.css`

## Z-layers

| Z | Armory | Stats |
|---|--------|-------|
| Z0 | Void canvas | Void canvas |
| Z1 | — | VPP radar/inspector wells, grey trim |
| Z2 | Quartermaster `qa-card` navy panels | Workout band, achievement rows |

## Tokens

- Telemetry: `--pd-data-cyan` only
- Trim: `--pd-grey-trim`
- Warnings: `--pd-atom-amber` (physical pill)
- Deploy: solid teal chamfer (no gold)
- Gold reserved for single directive elsewhere

## Layout

- Stats player grid: `bento-grid--12col bento-grid--liquid`

## Rejections

- Rounded pills, gradients, shadows, nav chrome in Z1 wells, neon hex
