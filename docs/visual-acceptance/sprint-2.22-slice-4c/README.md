# Sprint 2.22 slice 4c — HQ native pathway scroll visual reference

Captured **2026-05-23** against `http://localhost:5173` (signed-in player HQ).

## Screenshots

| File | Viewport | Pass criteria |
|------|----------|---------------|
| `hq-1280-pathway-native-scroll-current-centered.png` | 1280×900 | Pathway region visible; current tier (~LV 6) near center; NO expand button; NO inner `Scroll · LV` line |
| `hq-1280-pathway-section-full.png` | 1280×900 | Full pathway section from header through scroll track |
| `hq-1280-hero-mission-gold-accept.png` | 1280×900 | Regression — hero ACCEPT still gold |
| `hq-390-pathway-native-scroll.png` | 390×844 | Mobile pathway scrolls inside track |
| `hq-390-pathway-no-expand-button.png` | 390×844 | Confirm no expand/collapse control |

## Re-capture (Playwright)

Requires auth (`E2E_STORAGE_STATE` or `E2E_PLAYER_CALLSIGN` + `E2E_PLAYER_OTP`):

```bash
npx playwright test e2e/player-pathway-slice-4c.visual.spec.ts
```

Screenshots overwrite files in this directory.

## Manual QA sign-off (slice 4c)

- [x] No Expand/Collapse pathway button on HQ
- [x] Level shown once in section header only (not duplicated in track HUD)
- [x] Current tier visible and centered on load (screenshot proof)
- [x] Can scroll horizontally through all tiers inside track
- [x] Current tier ACTIVE label is teal
- [x] Hero mission ACCEPT still gold
- [x] Screenshots saved under `docs/visual-acceptance/sprint-2.22-slice-4c/`
