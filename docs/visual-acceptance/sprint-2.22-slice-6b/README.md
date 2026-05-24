# Sprint 2.22 slice 6b — HQ mission theater

Mission rail reads as **game mission select** — one dominant **gold** primary hero (Z3 focal) + secondary missions as **compact teal** cards or rail rows. `OperativeHub` is an **edge-lit frame in void** with transparent center and teal emissive border.

## Pass criteria

| Filename | Pass criteria |
|----------|---------------|
| `hq-1280-mission-theater-one-gold.png` | One dominant gold hero mission; hub edge frame visible |
| `hq-1280-mission-theater-two-missions.png` | Gold primary + compact teal secondary (when 2 dailies) |
| `hq-1280-mission-theater-three-missions.png` | Gold + compact teal + rail row (when 3 visible) |
| `hq-1280-identity-6a-regression.png` | Hologram identity unchanged from 6a |
| `hq-390-mission-theater.png` | Mobile: primary hero readable; secondary stacks below |

## Capture

```bash
npx playwright test e2e/player-hq-slice-6b.visual.spec.ts
```

Requires `E2E_STORAGE_STATE` or `E2E_PLAYER_CALLSIGN` + `E2E_PLAYER_OTP`.

## Files touched

- `src/lib/components/hud/ActiveBounties.svelte` — tiered primary/secondary/rail mission deck
- `src/lib/player/dashboard/activeBounties.ts` — `splitEmbeddedMissionDeck` helper
- `src/lib/styles/player-missions.css` — primary gold + compact teal theater styles
- `src/lib/styles/player-dashboard-hud.css` — hub edge frame + missions column void
- `src/lib/components/player/dashboard/__tests__/playerHudSprint228.test.ts`
- `e2e/player-hq-slice-6b.visual.spec.ts`

## Anti-patterns avoided

- No two equal full `quest-hero--premium` cards
- No gold accent on secondary mission CTA
- No changes to `HologramCardShell` / identity layout (6a)
- No atmosphere opacity re-run (slice 5)
