# Coach Tactics Stratagem V1 (CDO blueprint)

Source: Gemini Vanguard Architect AI · **VS-3b implemented**.

## Architecture

| Layer | Role | Class hook |
|-------|------|------------|
| Z0 | `--pd-void-base` canvas | `.coach-tactics-shell` |
| Z1 | Timeline well (bottom tray) | `.coach-tac-z1-well` |
| Z2 | Drill / squad sidebar | `.coach-tac-z2-drawer` |
| Z3 | Central pitch visualization | `.coach-tac-z3-pitch` |
| Z4 | Commit / Export HUD | `.coach-tac-z4-btn--deploy` |

## Palette

| Use | Token | Hex |
|-----|-------|-----|
| Tactical nodes / vectors | `--pd-data-cyan` | `#14b8a6` |
| Warnings / overlap | `--pd-atom-amber` | `#d97706` |
| Borders | `--pd-grey-trim` | `#334155` |
| Panel fill | `--pd-navy-panel` | `#0f172a` |
| **REJECTED** | `--pd-action-gold` | Player OS only |

## Geometry

- 8px chamfer on Z2/Z4 containers (`clip-path`)
- 0px border-radius — no pills

## Rejections

- Gold accent, glassmorphism, blur, gradient route fills, neon glow

## Implementation

- CSS: `src/lib/styles/coach-tactics-stratagem.css`
- Route: `src/routes/(app)/coach/tactical/+page.svelte`
- HUD: `TacticalDock.svelte`, `CommandDrawer.svelte`
- Grid: `TacticalPitchBoard.svelte`, `GridPitch.svelte`, `GridRoute.svelte`, `GridEntity.svelte`
- Firestore auto-save + deploy preserved

## Sprint

`VS-3b` in [`PLATFORM_VISUAL_REDESIGN_PLAN.md`](../PLATFORM_VISUAL_REDESIGN_PLAN.md)
