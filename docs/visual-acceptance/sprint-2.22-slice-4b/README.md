# Sprint 2.22 slice 4b — Pathway consolidation visual reference

Captured **2026-05-23** against `http://localhost:5173` (signed-in player HQ).

## Screenshots

| File | Viewport | State | Pass criteria |
|------|----------|-------|---------------|
| `hq-1280-hero-mission-gold-accept.png` | 1280×900 | HQ top | Hero mission ACCEPT still gold |
| `hq-1280-quick-ops-pathway-compact.png` | 1280×900 | HQ scrolled | 3 quick ops tiles; compact 3-tier pathway; Expand pathway button |
| `hq-1280-pathway-expanded.png` | 1280×900 | HQ expanded | Full 50-tier horizontal scroll inline; Collapse pathway button |
| `armory-1280-no-pathway-quartermaster.png` | 1280×900 | Armory | No pathway shell; strap + quartermaster tabs |
| `hq-390-quick-ops-pathway-compact.png` | 390×844 | HQ mobile | 3 tappable quick ops (2+1 grid); compact pathway |
| `hq-390-pathway-expanded-horizontal-scroll.png` | 390×844 | HQ mobile expanded | Pathway scrolls inside track, not whole page |
| `armory-390-no-pathway.png` | 390×844 | Armory mobile | No pathway block at top |

## Re-capture (Playwright)

Requires auth (`E2E_STORAGE_STATE` or `E2E_PLAYER_CALLSIGN` + `E2E_PLAYER_OTP`):

```bash
npx playwright test e2e/player-pathway-slice-4b.visual.spec.ts
```

Screenshots overwrite files in this directory.

## Manual QA sign-off (slice 4b)

- [x] HQ 1280px — 3 quick ops (no Pathway tile)
- [x] HQ 1280px — compact preview + expand/collapse inline
- [x] HQ 1280px — hero ACCEPT gold
- [x] Armory 1280px — no pathway section
- [x] HQ 390px — 3 quick ops + pathway expand scrolls in track
- [x] Armory 390px — quartermaster loads without pathway
