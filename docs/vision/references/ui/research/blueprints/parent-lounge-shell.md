# Parent Lounge Shell (CDO blueprint)

Source: Gemini Vanguard Architect AI · **VS-4a implemented**.

## Architecture

| Layer | Role | Class hook |
|-------|------|------------|
| Z0 | Void canvas | `.parent-lounge-shell` |
| Z1 | Page well (16px inset, 24px gutter) | `.parent-lounge-z1-well` |
| Z2 | Household / dashboard cards | `.parent-lounge-z2-panel` |
| Z4 | Fixed top nav chrome | `.parent-lounge-z4-nav` |

## Palette

| Use | Token |
|-----|-------|
| Panels | `--pd-navy-panel` |
| Borders / labels | `--pd-grey-trim` |
| Active / primary | `--pd-data-cyan` |
| Pending approvals | `--pd-atom-amber` |
| Subtext | `#94a3b8` |
| **REJECTED** | Gold (Player OS only) |

## Geometry

- 8px chamfer on Z2 panels
- 0px border-radius — no soft pills
- 12-column bento grid on dashboard / household

## Rejections

- 24px border-radius soft cards
- Silver markers → grey trim
- Glassmorphism, gold accent

## Implementation

- CSS: `src/lib/styles/parent-lounge-shell.css`
- Layout: `src/routes/(app)/parent/+layout.svelte`
- Pages: `/parent/dashboard`, `/parent/household`

## Sprint

`VS-4a` in [`PLATFORM_VISUAL_REDESIGN_PLAN.md`](../PLATFORM_VISUAL_REDESIGN_PLAN.md)
