# Parent VPC Trust Band (CDO blueprint)

Source: Gemini Vanguard Architect AI · **VS-4b implemented**.

## Architecture

| Layer | Role | Class hook |
|-------|------|------------|
| Z0 | Void canvas | `.parent-lounge-shell` (layout) |
| Z1 | 2px grey-trim well indent | `.parent-vpc-z1-well` |
| Z2 | Navy compliance panel | `.parent-vpc-z2-panel` |
| Z3 | Shield hero + minimal badge overlay | `.parent-vpc-z3-shield`, `.parent-vpc-minimal-badge` |
| Z1 sub | Athlete rows / wizard below trust band | `.parent-vpc-z1-stack` |

## Palette

| Use | Token |
|-----|-------|
| Panels | `--pd-navy-panel` (#0f172a) |
| Borders / trim | `--pd-grey-trim` (#334155) |
| Verified status | `--pd-data-cyan` (#14b8a6) |
| Pending / required | `--pd-atom-amber` (#d97706) |
| Header text | #ffffff |
| **REJECTED** | Gold, nav cyan (#06b6d4) for status, neon, purple gradients |

## Typography

- Header: monospace bold, white
- Status label: data-driven verified (cyan) / pending (amber)

## Actions

- Primary: **Update consent** — chamfer, grey trim border, white text (`.parent-vpc-btn-update`)
- Minimal badge: top-right Z2 overlay, 12px height, uppercase

## Geometry

- 8px chamfer on Z1/Z2; 4px on buttons/chips
- 0% border-radius — no pills

## Rejections

- Rounded pill status badges
- Neon / arcade cyan for trust controls
- Purple gradient overlays
- Drop shadows (Z-layer elevation only)
- Gold primary buttons

## Implementation

- CSS: `src/lib/styles/parent-vpc-trust-band.css`
- Route: `src/routes/(app)/parent/vpc/+page.svelte`
- Preserved: `parentGrantVpcConsent` Cloud Function, wizard stages, Firestore reads

## Sprint

`VS-4b` in [`CDO_PROMPT_LIBRARY.md`](../CDO_PROMPT_LIBRARY.md)
