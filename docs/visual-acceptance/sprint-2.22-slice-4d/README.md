# Sprint 2.22 slice 4d — HQ quick ops grid + unified mission rows visual reference

Captured against `http://localhost:5173` (signed-in player HQ).

## Screenshots

| File | Viewport | Pass criteria |
|------|----------|---------------|
| `hq-1280-quick-ops-three-col-filled.png` | 1280×900 | 3 quick op tiles equal width, full row, no dead right gutter |
| `hq-1280-missions-unified-rows.png` | 1280×900 | Both missions same dense row format; no tall hero card block |
| `hq-1280-primary-mission-gold-cta.png` | 1280×900 | Primary mission CTA gold; secondary mission CTA muted/teal |
| `hq-390-quick-ops-three-col.png` | 390×844 | 3 tiles on one row — NO lone left-aligned orphan on row 2 |
| `hq-1280-pathway-regression.png` | 1280×900 | Pathway still native scroll, LV centered — no 4c regression |

## Re-capture (Playwright)

Requires auth (`E2E_STORAGE_STATE` or `E2E_PLAYER_CALLSIGN` + `E2E_PLAYER_OTP`):

```bash
npx playwright test e2e/player-hq-slice-4d.visual.spec.ts
```

Screenshots overwrite files in this directory.

## Manual QA sign-off (slice 4d)

- [ ] Quick ops: 3 tiles fill row at 1280px
- [ ] Quick ops: no orphaned 3rd tile on 390px
- [ ] Mission 1 and Mission 2 same row density/format
- [ ] No quest-hero tall card block on embedded HQ
- [ ] Primary mission CTA still gold
- [ ] Pathway 4c behavior unchanged (centered current tier, no expand button)
- [ ] Screenshots saved under `docs/visual-acceptance/sprint-2.22-slice-4d/`
