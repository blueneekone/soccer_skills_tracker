# Coach Drill Library Z2 (CDO blueprint)

Source: Gemini Vanguard Architect AI · **VS-3c implemented**.

## Architecture

| Layer | Role | Class hook |
|-------|------|------------|
| Z0 | Void canvas `#000000` | `.coach-drill-lib` |
| Z1 | Drill grid well (no border) | `.coach-drill-z1-well` |
| Z2 | Drill cards | `.coach-drill-z2-card` |
| Z4 | Header nav + NEW DRILL CTA | `.coach-drill-z4`, `.coach-drill-z4-cta` |

## Palette

| Use | Token | Hex |
|-----|-------|-----|
| Card fill | `--pd-navy-panel` | `#0f172a` |
| Borders / labels | `--pd-grey-trim` | `#334155` |
| Create / Assign | `--pd-data-cyan` | `#14b8a6` |
| Warnings | `--pd-atom-amber` | `#d97706` |
| **REJECTED** | Gold | Player OS only |

## Geometry

- 8px chamfer on Z2 cards (`clip-path`)
- 0px border-radius — no pills

## Actions

- **NEW DRILL** — Z4 primary CTA (cyan fill, black text)
- **ASSIGN** — card-level secondary (cyan stroke)
- **ARCHIVED/ERROR** — amber text

## Implementation

- CSS: `src/lib/styles/coach-drill-library.css`
- View: `src/lib/coach/drills/CoachDrillsView.svelte`
- Route: `/coach/drills`

## Sprint

`VS-3c` in [`PLATFORM_VISUAL_REDESIGN_PLAN.md`](../PLATFORM_VISUAL_REDESIGN_PLAN.md)
