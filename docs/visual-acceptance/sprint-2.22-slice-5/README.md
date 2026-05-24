# Sprint 2.22 slice 5 — Player OS atmosphere / void tokens

Atmosphere-only CSS pass: Z0 canvas amplification (grid, glow, vignette, scanlines) + Z2 panel fill reduction so Player OS reads as a command deck in void space.

## Token before → after

| Token | Before | After |
|-------|--------|-------|
| `.ps-ambient__grid` opacity (dossier) | 0.40 | **0.50** |
| `.ps-ambient__glow` opacity (dossier) | 0.28 | **0.34** |
| `.ps-ambient__glow--a` teal mix | rgba(20,184,166,0.08) | **rgba(20,184,166,0.12)** |
| `.ps-ambient::after` scanlines | 0.055 | **0.09** |
| `.ps-canvas-bg` opacity (dossier) | 0.22 | **0.14** |
| `.ps-root::after` vignette edge | rgba(0,0,0,0.62) @ 38% | **rgba(0,0,0,0.72) @ 32%** |
| `--pd-depth-panel-gradient` center mix | #0e0e16 @ 92% | **#0a0a12 @ 65% → #000 outer** |
| `.player-capsules-strip--premium` panel mix | 88% | **72%** |
| Hub / analytics Z2 background | flat gradient token | **radial transparent bleed (52%/48%)** |

## Void contract (qualitative)

| Metric | Threshold | Assessment |
|--------|-----------|------------|
| Black canvas pixels | ≥ 40% | Improved — vignette opens earlier (32%); canvas wash reduced (0.14) |
| Matte panel fill | ≤ 35% | Improved — Z2 gradients bleed to transparent; hub/analytics recessed |
| Emissive edges + bloom | ≥ 15% | Maintained — teal borders, radar bloom, strap hairlines unchanged |
| Scanline opacity on Z0 | ≤ 0.10 | **0.09** — canvas only |
| Grain opacity | ≤ 0.07 | **0.07** — unchanged |

## Screenshots

Capture with:

```bash
npx playwright test e2e/player-atmosphere-slice-5.visual.spec.ts
```

Requires `E2E_STORAGE_STATE` or `E2E_PLAYER_CALLSIGN` + `E2E_PLAYER_OTP`.

| Filename | Pass criteria |
|----------|---------------|
| `hq-1280-void-atmosphere.png` | Grid/glow visible at edges; panels recessed in void |
| `hq-390-void-atmosphere.png` | Atmosphere readable on mobile; text legible |
| `armory-1280-void-regression.png` | Command deck + tabs unchanged; atmosphere consistent |
| `stats-1280-void-regression.png` | Chart panels unchanged layout; void visible |
| `train-1280-void-regression.png` | Terminal panels unchanged; void visible |

## Files touched

- `src/lib/styles/player-shell.css` — Z0 atmosphere
- `src/lib/styles/player-dossier.css` — depth panel gradient token
- `src/lib/styles/player-dashboard-hud.css` — surgical Z2 fill reduction
- `src/lib/components/player/dashboard/__tests__/playerHudSprint226.test.ts`
- `e2e/player-atmosphere-slice-5.visual.spec.ts`
