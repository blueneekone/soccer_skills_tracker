# Sprint 2.22 slice 6g — Stats investigation workspace parity

Lift `/stats` (player role) to match HQ analytics void + Foundation investigation workspace — VPP radar/inspector floats in void (no matte box-in-box), workout chart as full-width timeline band below, shared VPP material tokens with HQ.

Assumes **6a–6f**, **6f-c**, and **6f-b Done**.

## Pass criteria

| Filename | Pass criteria |
|----------|---------------|
| `stats-1280-vpp-void.png` | Player `/stats` — VPP radar in void; **no grey slab** around VPP; inspector whisper when empty (6f-b parity) |
| `stats-1280-vpp-vector-selected.png` | Axis selected — inspector readable |
| `stats-1280-workout-band.png` | Workout chart full-width Z1 well band below VPP |
| `stats-390-investigation.png` | Mobile — VPP + workout stack, no overflow |
| `hq-1280-analytics-regression.png` | HQ analytics void unchanged |

## Material contract

| Region | Treatment |
|--------|-----------|
| **Stats root** | `player-hud-root` + `player-dossier-root` on player path only |
| **VPP** | `stats-analytics-void` — transparent shell; Z1 well on `.vpp-chart--premium` only |
| **Workout band** | `stats-workout-band` — transparent outer + teal hairline divider; Z1 well on `.dossier-workout__chart` |
| **Badges** | Unchanged (`dossier-badges pd-page-panel`) — deferred to 6j if depth pass needed |

## Typography (6f-b header ladder)

| Level | Surfaces on Stats |
|-------|-------------------|
| **L1** | Route strap `.pd-strap__title` |
| **L2** | VPP title, `.stats-workout-band__title` |
| **L3** | `.pd-label` eyebrows (Training, Progress) |

## Capture

### Option A — Dev server + existing browser session (no Playwright, no OTP test creds)

With dev server running (`npm run dev` on `http://127.0.0.1:5173`):

```bash
node scripts/verify-slice-6g-dev.mjs
```

Then open `/stats` in your normal browser while logged in via OTP. Use DevTools to confirm:

- `.player-hud-root` on page root
- `[data-region="stats-analytics-void"]` without `.pd-page-panel`
- `.stats-workout-band .dossier-workout__chart` Z1 well

Save screenshots manually to this folder if needed for sign-off.

### Option B — Playwright (requires auth env or saved session)

```bash
npx playwright test e2e/player-stats-slice-6g.visual.spec.ts
```

Auth: set `E2E_STORAGE_STATE` or `E2E_PLAYER_CALLSIGN` + `E2E_PLAYER_OTP`, or reuse `e2e/.auth/player.json` from headed capture scripts.

## Files touched

- `src/routes/(app)/stats/+page.svelte` — `player-hud-root`, void VPP, workout band
- `src/lib/styles/player-dashboard-hud.css` — Sprint 2.22 slice 6g block
- `src/lib/components/player/dashboard/__tests__/playerHudSprint236.test.ts`
- `e2e/player-stats-slice-6g.visual.spec.ts`

## Out of scope

- HQ dashboard layout changes
- Chart.js → SVG migration
- Achievement matrix redesign
- 6j global panel depth (6j-a HQ batch separate)
- Epic 3.5 character studio
- Coach/non-player stats path

## Note on 6j-c

Stats panel depth (**6j-c**) merged into **6g** where overlap — do not duplicate in **6j**.
