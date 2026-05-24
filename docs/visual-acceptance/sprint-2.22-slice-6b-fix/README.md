# Sprint 2.22 slice 6b-fix — Mission tile hierarchy

Visual acceptance for the **6b-fix** pass. Supersedes the secondary-mission layout in `sprint-2.22-slice-6b/` — logic from 6b is unchanged; this pass fixes visual hierarchy only.

## Pass criteria (1280px)

| Element | Target |
|---------|--------|
| **Primary mission** | Full gold `quest-hero--primary` — tallest element in rail |
| **Secondary mission** | Horizontal teal tile ~44–52px (`quest-row--secondary-teal`) |
| **Third mission** | Standard `quest-row--rail` embedded row |

At a glance: **gold hero card >> thin teal strip >> rail row**.

## Screenshots

| File | State |
|------|-------|
| `hq-1280-mission-theater-one-gold.png` | Single gold primary only |
| `hq-1280-mission-theater-two-missions.png` | Primary + secondary tile — obvious size gap |
| `hq-1280-mission-theater-three-missions.png` | Primary + tile + rail row (when test account has ≥3 missions) |
| `hq-1280-identity-6a-regression.png` | Identity hologram unchanged from 6a |
| `hq-390-mission-theater.png` | Mobile mission rail |

## Capture

```bash
npx playwright test e2e/player-hq-slice-6b.visual.spec.ts
```

Requires `E2E_STORAGE_STATE` or `E2E_PLAYER_CALLSIGN` + `E2E_PLAYER_OTP`.
