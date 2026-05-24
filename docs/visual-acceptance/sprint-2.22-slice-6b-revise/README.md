# Sprint 2.22 slice 6b-revise — HQ mission rail (overview, no hero cards)

HQ mission rail is a **scannable command overview** — up to 3 rail rows with sender · title · reward line · CTA. No hero cards on the dashboard. Coach/parent bounties use **gold left border + gold CTA** on the rail row.

## Pass criteria

| Filename | Pass criteria |
|----------|---------------|
| `hq-1280-mission-rail-two-dailies.png` | Two teal rail rows, no hero cards |
| `hq-1280-mission-rail-identity.png` | 6a hologram + hub edge frame unchanged |
| `hq-390-mission-rail.png` | Rows stack on mobile |

## Capture

```bash
npx playwright test e2e/player-hq-slice-6b-revise.visual.spec.ts
```

Requires `E2E_STORAGE_STATE` or `E2E_PLAYER_CALLSIGN` + `E2E_PLAYER_OTP`.

## Files touched

- `src/lib/components/hud/ActiveBounties.svelte` — rail-only embedded feed
- `src/lib/player/dashboard/activeBounties.ts` — `isPromotedQuest`
- `src/lib/styles/player-missions.css` — promoted rail + lede styles
- `src/lib/components/player/dashboard/__tests__/playerHudSprint228.test.ts`
- `e2e/player-hq-slice-6b-revise.visual.spec.ts`

## Anti-patterns avoided

- No `quest-hero--premium` in embedded HQ mode
- No DOM clone hacks in visual spec
- Slice 6b hub edge frame CSS retained in `player-dashboard-hud.css`

## Next

Train hero briefing = slice **6d** (planned after 6c analytics deck).
