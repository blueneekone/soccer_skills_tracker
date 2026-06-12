# Comms Hub Persona Skins (CDO blueprint)

Source: Gemini Vanguard Architect AI · **VS-6a implemented**.

## Architecture

| Layer | Role | Class hook |
|-------|------|------------|
| Z0 | Void canvas | `.comms-hub` |
| Z1 | Thread well (20px inset from Z4) | `.comms-hub-z1-well` |
| Z2 | Message list / thread panels | `.comms-hub-z2-msg-card`, `.ann-card`, `.hht-root`, `.plp-root` |
| Z3 | Focus hero (inbox) | `.comms-hub-z3-inbox` |
| Z4 | Persona chrome strap | `.comms-hub-z4-chrome__strap` |

## Persona tokens

| Persona | Primary action | Chrome notes |
|---------|----------------|--------------|
| Player | `--pd-action-gold` (#fbbf24) | Gold top-right strap accent |
| Coach | `--pd-nav-cyan` (#06b6d4) | SIEM density; data-cyan metadata |
| Parent | `--pd-nav-cyan` | Reduced density; grey-trim Z2 legibility |
| Director | `--pd-nav-cyan` | Amber (#d97706) system-critical flags |

Role-based injection: `messages/+layout.svelte` sets `comms-hub--{persona}` from `authStore.role`.

## Palette

| Use | Token |
|-----|-------|
| Void | `--pd-void-base` (#000000) |
| Panels | `--pd-navy-panel` (#0f172a) |
| Borders | `--pd-grey-trim` (#334155) |
| System logs / metadata | `--pd-data-cyan` (#14b8a6) |
| Primary action (non-Player) | `--pd-nav-cyan` (#06b6d4) |
| Urgent / policy flags | `--pd-atom-amber` (#d97706) |
| Player primary only | `--pd-action-gold` (#fbbf24) |

## Typography

- Headers: uppercase, 0.1em tracking, monospace
- User message body: neutral grey on navy
- Coach metadata: monospace data cyan

## Geometry

- 0px border-radius on all Z2/Z3/Z4 elements
- 4px chamfer on Z2/Z3 controls; 8px on Z1/Z4 straps
- Solid fills only — no glass/blur on Z2 panels

## Rejections

- Gold accents on Coach, Parent, or Director chrome
- Rounded pill buttons or badges
- Neon / fluorescent hex codes
- Glassmorphism / alpha-transparency on Z2 panels

## Implementation

- CSS: `src/lib/styles/comms-hub-persona-skins.css`
- Layout: `src/routes/(app)/messages/+layout.svelte`
- Route: `src/routes/(app)/messages/+page.svelte`
- Comms panels: `AnnouncementsInbox`, `HouseholdThreadPanel`, `ParentLoungePanel`, `ReportMessageIncident`
- Preserved: Firestore queries, CommsEngine send paths, role-gated lounge/household wiring

## Sprint

`VS-6a` in [`CDO_PROMPT_LIBRARY.md`](../CDO_PROMPT_LIBRARY.md)
