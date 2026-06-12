# Director Command Center (CDO blueprint)

Source: Gemini Vanguard Architect AI · **VS-5a implemented**.

## Architecture

| Layer | Role | Class hook |
|-------|------|------------|
| Z0 | Void canvas | `.director-command-center-shell` |
| Z1 | Secondary metrics well | `.director-command-center` / `.wsd-body` |
| Z2 | Bento KPI tiles | `.wsd-metric`, `.wsd-ribbon__cell`, `.director-cc-z2-panel` |
| Z4 | Header + mobile tab rail | `.director-console-page__header`, `.director-z4-tab-rail` |

## Palette

| Use | Token |
|-----|-------|
| Z2 panels | `--pd-navy-panel` (#0f172a) |
| Nav / tab chrome | `--pd-nav-cyan` (#06b6d4) |
| Firestore KPI values | `--pd-data-cyan` (#14b8a6) |
| Compliance alerts | `--pd-atom-amber` (#d97706) |
| Dividers | `--pd-grey-trim` (#334155) |
| **REJECTED** | Gold, neon glow, gradient ribbons |

## Geometry

- 8px chamfer on Z2 KPI tiles; 4px on ribbon cells
- 1px grey trim dividers — no zebra striping
- Monospace caps headers; tabular KPI readouts

## Rejections

- Rounded pills (mobile tabs → chamfer links)
- Neon glow / gradient KPI cards
- Soft-green live badges (nav cyan flat chip)
- Gold VPC section chrome

## Implementation

- CSS: `src/lib/styles/director-command-center.css`
- Layout: `src/routes/(app)/director/+layout.svelte`
- Page: `src/routes/(app)/director/+page.svelte`
- Home module: `src/lib/components/director/os/DirectorCommandCenter.svelte`
- Preserved: Firestore KPI queries, tab routing, module wiring

## Sprint

`VS-5a` in [`CDO_PROMPT_LIBRARY.md`](../CDO_PROMPT_LIBRARY.md)
