# Sprint 2.22 slice 6a — HQ identity hologram artifact

HQ operative identity reads as a **Z3 holographic collectible** — `HologramCardShell` with operative portrait, display callsign on card face, pointer tilt + foil shimmer + teal/gold edge-glow + diagonal scanlines. Identity stage background is **transparent** (void shows through).

## Pass criteria

| Filename | Pass criteria |
|----------|---------------|
| `hq-1280-identity-hologram.png` | Hologram card visible left; rank/stats right; no grey inset well; void at edges |
| `hq-1280-identity-hologram-hover.png` | Pointer over card — visible tilt/foil (capture mid-hover if possible) |
| `hq-390-identity-hologram.png` | Card + stats stack/wrap readably; touch targets ≥44px |
| `hq-1280-missions-regression.png` | Mission rail + dual hero cards unchanged layout |

## Capture

```bash
npx playwright test e2e/player-hq-slice-6a.visual.spec.ts
```

Requires `E2E_STORAGE_STATE` or `E2E_PLAYER_CALLSIGN` + `E2E_PLAYER_OTP`.

## Files touched

- `src/lib/components/player/HologramCardShell.svelte` — reusable Z3 wrapper (tilt, foil, edge-glow, scanlines)
- `src/lib/components/player/dashboard/IdentityBentoModule.svelte` — embedded HQ holo card + metrics row
- `src/lib/styles/player-dashboard-hud.css` — transparent identity stage + holo face typography
- `src/lib/components/player/dashboard/__tests__/playerHudSprint227.test.ts`
- `e2e/player-hq-slice-6a.visual.spec.ts`

## Anti-patterns avoided

- No raw `VanguardCard` / Scout's Six on HQ
- No grey Z1 inset well on identity stage
- No vertical tower identity revert
- No matte panel wrapper around hologram shell
