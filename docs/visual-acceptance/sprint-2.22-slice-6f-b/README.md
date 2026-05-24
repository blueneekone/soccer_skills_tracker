# Sprint 2.22 slice 6f-b — HQ header ladder + VPP inspector whisper

Fix HQ typography hierarchy so only the callsign strap reads as route hero (L1). Unify section titles (Quick ops, Pathway, TELEMETRY, capsules, mission rail) at L2. Shrink the idle VPP inspector beside the radar to a whisper — not a second panel slab.

Analytics void architecture from **6c** unchanged. Identity telemetry bezel from **6f-c** unchanged.

## Pass criteria

| Filename | Pass criteria |
|----------|---------------|
| `hq-1280-header-ladder.png` | Strap title clearly L1; Quick ops / Pathway / TELEMETRY subordinate and similar scale |
| `hq-1280-vpp-inspector-whisper.png` | Empty "Awaiting coach telemetry" **small** beside radar — not a second big panel |
| `hq-1280-vpp-vector-selected.png` | Tap/select vector — inspector expands and remains readable |
| `hq-1280-identity-bezel-regression.png` | 6f-c holo telemetry bezel unchanged |
| `hq-390-header-vpp.png` | Mobile hierarchy + compact inspector |

## Typography ladder (`.player-hud-root`)

| Level | Token | Surfaces |
|-------|-------|----------|
| **L1** | `--pd-hud-title-l1` | `.pd-strap__title` only |
| **L2** | `--pd-hud-title-l2` | Quick ops, Pathway, TELEMETRY, capsules, mission rail |
| **L3** | `--pd-hud-eyebrow-l3` | `.pd-label`, deck/pathway/VPP/capsule eyebrows |

## VPP idle inspector

- Grid caps idle column at `minmax(120px, 200px)` beside radar hero
- `.vpp-inspector--idle` / `:not(.vpp-inspector--selected)` — transparent Z1 whisper, ≤64px empty state
- Vector select restores full inspector panel styling

## Capture

With dev server running (`npm run dev` on `http://127.0.0.1:5173`):

```bash
node scripts/capture-slice-6f-b-visuals.mjs
```

First run (no saved session): log in once with a headed browser, then re-run headless:

```bash
HEADED=1 node scripts/capture-slice-6f-b-visuals.mjs
```

Session persists in `e2e/.auth/profile`; storage state is written to `e2e/.auth/player.json` for Playwright specs.

Alternatively (against an already-open logged-in session in Cursor browser, or after auth above):

```bash
npx playwright test e2e/player-hq-slice-6f-b.visual.spec.ts
```

## Files touched

- `src/lib/styles/player-dashboard-hud.css` — Sprint 2.22 slice 6f-b tokens + whisper rules
- `src/lib/components/player/dashboard/VanguardProtocolPanel.svelte` — idle class + shortened empty copy
- `src/lib/components/player/dashboard/__tests__/playerHudSprint233.test.ts`
- `e2e/player-hq-slice-6f-b.visual.spec.ts`

## Out of scope

- Identity telemetry bezel (6f-c)
- Armory Studio / Epic 3.5 characters
- Stats route (6g)
- Global Z2 panel depth (6j)

## Next

Stats investigation workspace parity = slice **6g** (run after 6f-b).
