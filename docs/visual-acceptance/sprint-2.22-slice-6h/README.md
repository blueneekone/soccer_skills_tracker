# Sprint 2.22 slice 6h — Train / Tracker terminal chrome

Bring `/player/workout` and `/player/tracker` to Foundation **diegetic terminal** bar — execution column gets ProvingGrounds-style corner brackets + scanline + state copy; threat column reads as tail-log playbook; Tracker gets Tier A capsule + stat-row parity.

Assumes **6a–6g Done**.

## Pass criteria

| Filename | Pass criteria |
|----------|---------------|
| `train-1280-exec-terminal.png` | Corner brackets + scanline on exec column; state copy visible; **no grey matte box** around terminal |
| `train-1280-columns.png` | 4/8 columns equal height at 1280px; mission brief above terminal |
| `train-390-terminal.png` | Mobile stack; no horizontal overflow; transmit CTA ≥44px |
| `tracker-1280-capsule.png` | `dossierMode` premium capsule arena (Tier A frame) |
| `tracker-1280-ghost-whisper.png` | Compact ghost empty state (not large matte panel) |
| `stats-1280-regression.png` | Stats 6g void unchanged (smoke) |

## Material contract

| Surface | Treatment |
|---------|-----------|
| `.pw-panel--term` | Diegetic chrome wrapper; edge-lit frame; no matte Z2 slab |
| `.pw-panel--threat` | Tail-log column; left rail; reduced fill |
| `.pt-stat-void` | Transparent stat strip |
| `.pt-ghost--whisper` | Compact empty state |
| `.player-hud-root .pw-title` | L2 token |
| `.player-hud-root .pw-eyebrow` | L3 token |

**Anti-patterns:** no box-in-box around Z1 wells inside exec terminal; max two decorative layers per surface (Foundation §2).

## Capture

```bash
npx playwright test e2e/player-train-tracker-slice-6h.visual.spec.ts
```

Auth: set `E2E_STORAGE_STATE` or `E2E_PLAYER_CALLSIGN` + `E2E_PLAYER_OTP`, or reuse `e2e/.auth/player.json` from headed capture scripts.

## Files touched

- `src/lib/styles/player-terminal.css` — diegetic terminal primitives
- `src/lib/styles/player-dashboard-hud.css` — Sprint 2.22 slice 6h block
- `src/routes/(app)/player/workout/+page.svelte` — exec terminal chrome + threat column
- `src/routes/(app)/player/tracker/+page.svelte` — stat void + dossier capsule + ghost whisper
- `src/lib/components/player/dashboard/__tests__/playerHudSprint237.test.ts`
- `e2e/player-train-tracker-slice-6h.visual.spec.ts`

## Out of scope

- 6j-a HQ panel depth
- 6j-b route hover/edge-lit batch (Train `pw-panel` depth deferred to 6j-b)
- Settings diegetic controls
- Armory / Skill Tree
- ProvingGrounds feature work or Armory integration
- HQ + Stats layout changes beyond regression smoke
