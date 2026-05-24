# Sprint 2.22 slice 4d-fix — Dual hero missions + identity full-width + XP copy

Captured against `http://localhost:5173` (signed-in player HQ).

## Screenshots

| File | Viewport | Pass criteria |
|------|----------|---------------|
| `hq-1280-dual-hero-missions.png` | 1280×900 | Two hero cards, same layout; gold + teal CTAs |
| `hq-1280-identity-full-width.png` | 1280×900 | Operative info spans card, banner readable |
| `hq-1280-xp-copy-accept-state.png` | 1280×900 | Accept shows "earn on completion" not misleading +XP |
| `hq-1280-quick-ops-regression.png` | 1280×900 | 3-col quick ops intact |
| `hq-1280-pathway-regression.png` | 1280×900 | 4c pathway unchanged |
| `hq-390-dual-hero-identity.png` | 390×844 | Mobile: both hero cards + identity readable |

## Re-capture (Playwright)

Requires auth (`E2E_STORAGE_STATE` or `E2E_PLAYER_CALLSIGN` + `E2E_PLAYER_OTP`):

```bash
npx playwright test e2e/player-hq-slice-4d-fix.visual.spec.ts
```

Screenshots overwrite files in this directory.

## Manual QA sign-off (slice 4d-fix)

- [ ] Primary mission: quest-hero premium card (NOT flat row)
- [ ] Secondary mission: second quest-hero card (teal CTA), NOT rail row when 2 visible
- [ ] Gold ACCEPT only on first accept-state hero card
- [ ] Accept state shows "Earn +N XP on completion" — not bare +XP
- [ ] Onboarding banner fully visible, identity uses full width
- [ ] Quick ops: 3-col grid unchanged
- [ ] Pathway 4c unchanged
- [ ] Screenshots saved under `docs/visual-acceptance/sprint-2.22-slice-4d-fix/`
