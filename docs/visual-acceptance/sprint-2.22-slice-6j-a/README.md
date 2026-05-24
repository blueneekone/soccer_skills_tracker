# Sprint 2.22 slice 6j-a — HQ Z2 depth + pd-os-deck kit

Reduce flat matte-panel dominance on HQ command deck surfaces using a **translatable depth kit** (`pd-os-deck`) that can roll out to Stats / Settings / Armory in 6j-b.

Assumes **6a–6h Done**. Batch 1 of 6j — HQ only.

## Pass criteria

| Filename | Pass criteria |
|----------|---------------|
| `hq-1280-quick-ops-edge.png` | Quick Ops on raised `pd-os-deck`; tiles Z3 lift; icon badges visible; **no brackets/scanline** |
| `hq-1280-quick-ops-hover.png` | One tile hovered — border/glow lift |
| `hq-1280-hub-missions-rail.png` | OperativeHub `pd-os-deck--hero` + mission rail read as raised decks in void |
| `hq-1280-capsules-ghost.png` | Capsules ghost inset well under analytics recess |
| `hq-390-hq-scroll.png` | Mobile HQ — no overflow; touch targets OK |
| `hq-1280-analytics-regression.png` | 6c void + VPP inside `pd-os-deck--recessed` |
| `hq-1280-pathway-regression.png` | 6e pathway track inside `pd-os-deck__well` |

## Material contract

| Surface | Treatment |
|---------|-----------|
| `.pd-os-deck` | Z2 raised deck — `--pd-depth-panel-gradient`, top highlight (`::before`), bottom-right glow (`::after`) |
| `.pd-os-deck--hero` | Z3 lift for OperativeHub command deck |
| `.pd-os-deck--recessed` | Z1 inset for analytics void |
| `.pd-os-deck__well` | Recessed track well for pathway progression |
| `.oqo-op` | Z3 action tiles on deck; gold edge frame; hover lift gated |
| `.quest-log-panel--rail` | Raised Z2 deck plate; `--pd-edge-teal` frame |
| `.lobby-capsule-ghost-card` | Inset well whisper (`--pd-z1-well-bg`) |

**Reserved for terminal execute surfaces only (Train / ProvingGrounds):** corner brackets + scanline (`player-terminal.css`). **Not** on HQ identity hub.

**Anti-patterns:** no box-in-box around Quick Ops tiles; no hairline dividers between sections (use cast shadow + gap); max two decorative layers per surface (Foundation §2).

## Capture

```bash
npx playwright test e2e/player-hq-slice-6j-a.visual.spec.ts
```

Auth: set `E2E_STORAGE_STATE` or `E2E_PLAYER_CALLSIGN` + `E2E_PLAYER_OTP`, or reuse `e2e/.auth/player.json`.

## Files touched

- `player-dossier.css` — **`pd-os-deck` depth kit** (canonical, cross-route)
- `OperativeQuickOps.svelte` — `oqo-deck pd-os-deck`
- `OperativeHub.svelte` — `pd-os-deck pd-os-deck--hero` (no scanline/brackets)
- `OperativePathwayPreview.svelte` — deck + `pd-os-deck__well`
- `+page.svelte` — grain, analytics recess, ghost wrap
- `player-dashboard-hud.css` — HQ spatial composition, tiles, ghost
- `player-missions.css` — rail panel + idle row baseline
- `playerHudSprint234.test.ts`
- `e2e/player-hq-slice-6j-a.visual.spec.ts`

## Out of scope

Train/Tracker/Armory/Settings routes → **6j-b**. Analytics void internals (6c), pathway Tier A nodes (6e), hologram bezel (6a/6f-c), VPP internals.
