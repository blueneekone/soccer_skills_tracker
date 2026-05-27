# Sprint 2.22 slice 6k — Coach mission handoff smoke test

## Automated (Playwright)

```bash
npm test -- src/lib/player/workout/__tests__/coachMissionFlow.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint239.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint240.test.ts

npx playwright test e2e/player-mission-handoff-slice-6k.spec.ts
```

**Auth:** set `E2E_STORAGE_STATE` or `E2E_PLAYER_CALLSIGN` + `E2E_PLAYER_OTP`, or reuse `e2e/.auth/player.json` from a headed login capture.

## Manual checklist (5 min)

### A — Free log path

1. Open **Train** (`/player/workout`) with no active mission.
2. Confirm execution terminal loads, **Log session** works with a manual drill pick.
3. If coach intents exist and nothing is armed, confirm **Coach missions on HQ →** link shows.

### B — Coach intent (requires active `team_assignments`)

1. **HQ** → mission rail → coach challenge shows hint + **Suggested: …** line.
2. **Accept →** then **Start session →**.
3. **Train** opens with **Armed mission** banner, pre-filled focus/drill.
4. Confirm HQ still shows **Start session** (not **Claim**) before you log.
5. **Log session** → return HQ → **Claim** when backend marks intent fulfilled (attribute XP threshold).

### C — Coach homework (requires pending `assignments`)

1. Same Accept → Start session flow.
2. Log session with armed homework → assignment completes server-side.
3. HQ quest moves to **Claim** after log.

### D — Stale / cancel guards

1. Accept mission, **Start session**, then **Free log instead** — banner clears, handoff removed.
2. (Optional) Accept, wait 24h+ or clear sessionStorage — handoff ignored on Train mount.

## Pass criteria

| Check | Pass |
|-------|------|
| HQ shows drill preview on coach intents | ✓ |
| Start session → Train pre-fill | ✓ |
| No Claim before log | ✓ |
| Homework closes via `assignmentId` on log | ✓ |
| Intent fulfillment via attribute XP (backend) | ✓ |
| Free log always available | ✓ |
