# Sprint 2.22 slice 4d-revert — Hero mission restored + banner fix visual reference

Captured against `http://localhost:5173` (signed-in player HQ).

## Screenshots

| File | Viewport | Pass criteria |
|------|----------|---------------|
| `hq-1280-hero-mission-restored.png` | 1280×900 | quest-hero card with full title + gold ACCEPT; rail mission below as dense row |
| `hq-1280-onboarding-banner-full.png` | 1280×900 | "Complete operative profile" banner fully readable, not cut off |
| `hq-1280-quick-ops-three-col-regression.png` | 1280×900 | 3 quick op tiles still fill row |
| `hq-1280-pathway-regression.png` | 1280×900 | Pathway native scroll, current tier centered, no expand button |
| `hq-390-hero-and-banner.png` | 390×844 | Hero card + banner readable on mobile |

## Re-capture (Playwright)

Requires auth (`E2E_STORAGE_STATE` or `E2E_PLAYER_CALLSIGN` + `E2E_PLAYER_OTP`):

```bash
npx playwright test e2e/player-hq-slice-4d-revert.visual.spec.ts
```

Screenshots overwrite files in this directory.

## Manual QA sign-off (slice 4d-revert)

- [ ] Primary mission: quest-hero premium card restored (NOT flat row)
- [ ] Secondary mission: dense rail row below hero (polished, 2-line title ok)
- [ ] Gold ACCEPT only on hero CTA
- [ ] Onboarding banner fully visible, not truncated
- [ ] Quick ops: 3-col grid unchanged
- [ ] Pathway 4c unchanged
- [ ] Screenshots saved under `docs/visual-acceptance/sprint-2.22-slice-4d-revert/`
