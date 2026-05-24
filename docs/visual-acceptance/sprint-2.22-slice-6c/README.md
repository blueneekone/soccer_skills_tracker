# Sprint 2.22 slice 6c — HQ analytics void island

Remove the grey **analytics deck slab** on HQ. VPP radar + inspector float as **Z1 islands in void**; the capsules strip is a **separate lightweight footer** — not one matte `bento-card` wrapper.

## Pass criteria

| Filename | Pass criteria |
|----------|---------------|
| `hq-1280-analytics-void.png` | Full analytics band — **no grey outer slab**; radar Z1 well visible in void; pathway above unchanged |
| `hq-1280-analytics-void-compact.png` | `!telemetryReady` — compact radar + ghost inspector; still no matte wrapper |
| `hq-1280-mission-hub-regression.png` | OperativeHub + mission rail + 6a hologram unchanged |
| `hq-390-analytics-void.png` | Mobile — VPP + capsules readable, no horizontal overflow |

## Capture

```bash
npx playwright test e2e/player-hq-slice-6c.visual.spec.ts
```

Requires `E2E_STORAGE_STATE` or `E2E_PLAYER_CALLSIGN` + `E2E_PLAYER_OTP`.

Compact capture (`hq-1280-analytics-void-compact.png`) is clearest when the operative account has no vanguard telemetry (`player-analytics-void--compact` on the section).

## Files touched

- `src/routes/(app)/player/dashboard/+page.svelte` — `player-analytics-void` wrapper
- `src/lib/styles/player-dashboard-hud.css` — void island + capsules strip hairline
- `src/lib/components/player/dashboard/__tests__/playerHudSprint229.test.ts`
- `e2e/player-hq-slice-6c.visual.spec.ts`

## Anti-patterns avoided

- No outer `bento-card pd-surface-premium` on analytics region
- No `::before`/`::after` decorative frames around `.vpp-chart--premium` (Foundation §9)
- No DOM clone hacks in visual spec

## Next

Train hero briefing + Quick Ops polish = slice **6d** (planned after 6c).
