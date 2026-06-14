# Sprint 2.22 slice 6j closure — Z2 depth + void/matte contract

Wave 3 closure for **J-02**, **J-06**, **J-07**, **J-10**. Assumes **6j-a** (HQ) and **6j-b** (routes) Done.

## Void contract (FOUNDATION §3)

| Metric | Threshold | Token / module |
|--------|-----------|----------------|
| Black canvas at viewport rest | ≥ 40% | `--pd-void-contract-black-min` · `voidContract.ts` `blackCanvasMinRatio: 0.4` |
| Visible matte panel fill | ≤ 35% | `--pd-void-contract-matte-max` · `mattePanelMaxRatio: 0.35` |
| Emissive edges + bloom + light | ≥ 15% of lit pixels | `--pd-void-contract-emissive-min` · `emissiveMinRatio: 0.15` |

**HQ viewport reference:** 1280×900 (`VOID_CONTRACT_HQ_VIEWPORT`).

## Matte reduction tokens

| Token | Role |
|-------|------|
| `--pd-depth-panel-gradient` | Void-first Z2 fill — radial fade to `#000` center |
| `--pd-os-hero-fill` | OperativeHub hero slab — 48%→32% panel mix (lighter than solid `#05050a`) |
| `--pd-os-frame-fill` | Shared Z2 deck plate alias |
| `--pd-z1-well-bg` | Recessed chart/inspector wells inside analytics void |

**Rule:** Player OS surfaces prefer `--pd-depth-panel-gradient` over solid `--pd-panel` for bento/deck fills.

## Closure scope

| Gap | Fix |
|-----|-----|
| **J-02** | 6j Z2 depth complete on HQ + Settings; void-first bento surfaces |
| **J-06** | HQ void-friendly OperativeHub hero; documented void/matte tokens |
| **J-07** | Stats investigation rubric aligned — diegetic chips + edge-lit achievement rows |
| **J-10** | PlayerShell generic `.bento-card` chrome scoped off dossier routes |

## Automated verify

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint234.test.ts
```

## Manual QA (owner)

- **QA-303** — HQ void ≥40% / matte ≤35% at 1280×900
- **QA-304** — Stats investigation workspace telemetry band
- **QA-307** — PlayerShell no generic bento-card injection on player routes
