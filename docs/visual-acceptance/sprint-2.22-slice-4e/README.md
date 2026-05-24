# Sprint 2.22 slice 4e — Stats workout chart parity + workout slider focus

Captured against `http://localhost:5173` (signed-in player).

## Screenshots

| File | Route | Viewport | Pass criteria |
|------|-------|----------|---------------|
| `stats-1280-vpp-workout-full-width.png` | `/stats` | 1280×900 | VPP + workout panels full width; workout chart fills container |
| `stats-1280-workout-chart-detail.png` | `/stats` | 1280×900 | Clip/zoom workout chart region — line area uses horizontal space |
| `workout-1280-slider-click-no-outline.png` | `/player/workout` | 1280×900 | After clicking slider — no rectangular outline around thumb/track |
| `hq-1280-pathway-regression.png` | `/player/dashboard` | 1280×900 | Quick sanity — pathway 4c unchanged |

## Re-capture (Playwright)

Requires auth (`E2E_STORAGE_STATE` or `E2E_PLAYER_CALLSIGN` + `E2E_PLAYER_OTP`):

```bash
npx playwright test e2e/player-stats-slice-4e.visual.spec.ts
```

Screenshots overwrite files in this directory. Slider screenshot uses Playwright `click()` on the first `.pw-range` before capture.

## Manual QA sign-off (slice 4e)

- [ ] `/stats` workout chart same full-row width as VPP panel
- [ ] `/stats` workout chart height ~300px, not short narrow box
- [ ] `/player/workout` slider click — no outline
- [ ] `/player/workout` slider keyboard tab — focus ring visible
- [ ] HQ pathway/missions unchanged
- [ ] Screenshots saved under `docs/visual-acceptance/sprint-2.22-slice-4e/`
