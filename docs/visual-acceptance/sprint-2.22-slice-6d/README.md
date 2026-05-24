# Sprint 2.22 slice 6d — Train hero + HQ chrome

Visual acceptance references for Train mission briefing hero, Quick Ops icon contrast, identity stat badges, and ultrawide identity density.

## Screenshots

| File | Pass criteria |
|------|---------------|
| `train-1280-mission-hero-briefing.png` | Medium teal briefing above execution terminal; no Accept on hero |
| `train-390-mission-hero.png` | Briefing stacks above terminal on mobile |
| `hq-1280-quick-ops-contrast.png` | Three Quick Ops tiles — distinct icon accent colors visible |
| `hq-1280-identity-stat-badges.png` | Streak + XP show filled colored icons in operative info area |
| `hq-1920-identity-density.png` | Ultrawide — reduced dead space in identity stage; metrics readable |
| `hq-1280-rail-regression.png` | Mission rail + analytics void unchanged from 6b/6c |

## Capture

```bash
npx playwright test e2e/player-train-slice-6d.visual.spec.ts e2e/player-hq-slice-6d-chrome.visual.spec.ts
```

Requires `E2E_STORAGE_STATE` or `E2E_PLAYER_CALLSIGN` + `E2E_PLAYER_OTP`.

## Manual QA

- [ ] Train: briefing shows daily training mission when not trained today
- [ ] Train: no duplicate Accept on hero — submit via terminal only
- [ ] Train: ingest queue + terminal still work
- [ ] HQ: Quick Ops icons visually distinct from each other and mission teal
- [ ] HQ: Streak/XP read as filled badges, not empty outline chips
- [ ] HQ: 1920px+ identity stage doesn't feel like an empty warehouse
- [ ] HQ: 6b mission rail + 6c analytics void unchanged
