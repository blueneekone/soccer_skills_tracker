# Sprint 2.22 slice 4d-fix-b — Teal hero hover + identity metrics row + typography

Captured against `http://localhost:5173` (signed-in player HQ).

## Screenshots

| File | Viewport | Pass criteria |
|------|----------|---------------|
| `hq-1280-mission2-teal-hover.png` | 1280×900 | Hover mission 2 CTA — teal not gold |
| `hq-1280-identity-metrics-row.png` | 1280×900 | Streak/XP row below progress bar with visible gap |
| `hq-1280-typography-hierarchy.png` | 1280×900 | Quick ops + Pathway — eyebrow clearly smaller than title |
| `hq-1280-dual-hero-regression.png` | 1280×900 | Both hero cards present; mission 1 gold |
| `hq-390-identity-metrics-mobile.png` | 390×844 | Metrics row not beside progress on mobile |

## Re-capture (Playwright)

Requires auth (`E2E_STORAGE_STATE` or `E2E_PLAYER_CALLSIGN` + `E2E_PLAYER_OTP`):

```bash
npx playwright test e2e/player-hq-slice-4d-fix-b.visual.spec.ts
```

Screenshots overwrite files in this directory. Hover screenshot uses Playwright `hover()` on `.quest-hero--teal .quest-hero__cta` before capture.

## Manual QA sign-off (slice 4d-fix-b)

- [ ] Mission 2 hero CTA hover stays teal
- [ ] Mission 1 hero CTA hover stays gold
- [ ] Streak/XP pills on row below progress — not beside bar
- [ ] Eyebrows smaller than section titles (Quick ops, Pathway, etc.)
- [ ] 4d-fix dual hero cards unchanged
- [ ] Screenshots saved under `docs/visual-acceptance/sprint-2.22-slice-4d-fix-b/`
