# Gemini Deep Research — UI visual system

**Status:** **TABLED (post-launch visual system)** — functional launch gate closed; see [`ROADMAP.md`](../../../../ROADMAP.md) · owner QA next

Gemini Deep Research exports and derived engineering notes live here. Agents may **read** this folder for token/layout authority during **post-launch** visual sprints only. Do **not** wire PNG chrome from §C into production bundles until an explicit sprint scopes asset ingest.

## Ingested artifacts

| File | Purpose |
|------|---------|
| [`SSTracker-Visual-System-Research-Report.pdf`](./SSTracker-Visual-System-Research-Report.pdf) | Canonical 18-page spec (§A–I) |
| [`TOKEN_GAP_ANALYSIS.md`](./TOKEN_GAP_ANALYSIS.md) | Research §B vs `app.css` / `player-dossier.css` gap table |
| [`OWNER_DECISION_CHECKLIST.md`](./OWNER_DECISION_CHECKLIST.md) | §H — eight owner choices before PNG/chamfer sweeps |
| [`PLATFORM_VISUAL_REDESIGN_PLAN.md`](./PLATFORM_VISUAL_REDESIGN_PLAN.md) | Iterative VS-* sprint phases |
| [`CDO_PROMPT_LIBRARY.md`](./CDO_PROMPT_LIBRARY.md) | Copy-paste prompts for Gemini Vanguard Architect AI |

## What belongs here

- Gemini Deep Research exports (`.pdf`, derived `.md`)
- Owner annotations on visual system direction
- Flow asset generation briefs (reference only — generation is a **separate owner session** per §D)

## Rules (agents + contributors)

- **Phase 1 build:** CSS tokens + layout grammar — **no PNG requirement**
- **Phase 2 polish:** Platform chrome PNGs (§C manifest) → reference folders under [`../`](../README.md), not `static/` until sprint says so
- **Avatar / character art:** [`../../character/`](../../character/README.md) — reference only; launch ships `defaultPortraitV2` + initials
- Functional launch invariants still apply: bento 12-col, persona separation, COPPA gates

## Reference image folders (§G)

Drop layout/chrome mocks here (not character busts):

```
docs/vision/references/ui/{player,coach,parent,shared}/
ref-{persona}-{category}-{name}-option-{a-d}.png
```

Example: `ref-player-z2panel-edgeglass-option-a.png`

## When implementing

1. Read [`TOKEN_GAP_ANALYSIS.md`](./TOKEN_GAP_ANALYSIS.md)
2. Complete [`OWNER_DECISION_CHECKLIST.md`](./OWNER_DECISION_CHECKLIST.md) (owner)
3. Add sprint row to `ROADMAP.md` with explicit file list
4. Map tokens to `var(--pd-color-*)` — avoid new hard-coded hex in components

## Cross-links

- UI ref index: [`../README.md`](../README.md)
- Launch focus: [`.cursor/rules/launch-focus.mdc`](../../../../.cursor/rules/launch-focus.mdc)
- Avatar defer: [`../../character/README.md`](../../character/README.md)
- Player instruments: [`../../../PLAYER_OS_INSTRUMENT_TAXONOMY.md`](../../../PLAYER_OS_INSTRUMENT_TAXONOMY.md)
