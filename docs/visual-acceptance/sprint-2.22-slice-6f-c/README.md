# Sprint 2.22 slice 6f-c — HQ identity telemetry bezel

Move streak + XP from `HudStatCell` icon chips onto the **6a hologram card** as emissive, tappable telemetry. Embedded HQ identity only.

**Layout:** single **instrument rail** in the holo card foot — streak readout left (`game.flame` + days), **career XP total** right (`3.5k CAREER`). No rank progress bar on the card; tier progress stays in the identity column beside the holo.

## Pass criteria

| Filename | Pass criteria |
|----------|---------------|
| `hq-1280-identity-bezel.png` | Streak corner pip + XP foot conduit on holo card; **no chip row** below identity text |
| `hq-1280-identity-bezel-streak-at-risk.png` | Amber emissive streak bezel when `currentStreak > 0` (at-risk pulse) |
| `hq-390-identity-bezel.png` | Bezel controls readable; touch targets ≥44px |
| `hq-1280-hub-regression.png` | Mission rail + analytics void unchanged |

## Interaction contract

| Control | Meaning on holo card | Action |
|---------|---------------------|--------|
| **Streak** (`STRK`) | Active day streak — protect by training | Links to `/player/workout` |
| **Career XP** (`CAREER`) | **Lifetime XP earned** (ledger total) — not rank tier progress | Links to `/stats` |

Rank tier progress (`1.5k XP TO Operative` + gold bar) stays in the **identity column beside the card** only — do not duplicate as a conduit on the holo artifact.

Train `/player/workout` stat row keeps `HudStatCell` chips unchanged (non-embedded).

## Capture

With dev server running (`npm run dev` on `http://localhost:5173`):

```bash
node scripts/capture-slice-6f-c-visuals.mjs
```

First run (no saved session): log in once with a headed browser, then re-run headless:

```bash
HEADED=1 node scripts/capture-slice-6f-c-visuals.mjs
```

Session persists in `e2e/.auth/profile`; storage state is written to `e2e/.auth/player.json` for Playwright specs.

Alternatively:

```bash
npx playwright test e2e/player-hq-slice-6f-c.visual.spec.ts
```

Playwright auto-starts the dev server via `playwright.config.ts` when none is running. The spec still needs auth (`E2E_STORAGE_STATE`, `E2E_PLAYER_CALLSIGN` + `E2E_PLAYER_OTP`, or `e2e/.auth/player.json` from the capture script above).

## Files touched

- `src/lib/components/player/dashboard/IdentityTelemetryBezel.svelte` — streak + XP bezel controls
- `src/lib/components/player/HologramCardShell.svelte` — optional `telemetry` snippet slot
- `src/lib/components/player/dashboard/IdentityBentoModule.svelte` — embedded HQ wiring only
- `src/lib/styles/player-dashboard-hud.css` — Sprint 2.22 slice 6f-c emissive bezel CSS
- `src/lib/components/player/dashboard/__tests__/playerHudSprint235.test.ts`
- `e2e/player-hq-slice-6f-c.visual.spec.ts`

## Anti-patterns avoided

- No Lucide-in-box stat chips on embedded HQ holo card
- No Bauhaus / character art changes (Epic 3.5)
- No VPP/header typography changes (6f-b)

## Next

HQ header ladder + VPP inspector whisper = slice **6f-b** (run after 6f-c).
