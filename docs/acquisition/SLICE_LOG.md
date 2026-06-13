# Slice log (append-only)

Agents append entries below. Do not edit prior rows.

---

## 23-vitest-ci — PHASE 2 (2026-06-13)

**Branch:** `overnight/vitest-ci`  
**Scope:** `.github/workflows/ci.yml` — expand vitest allowlist 117 → 129 green files

**Added to CI unit job (12 newly green, verified locally):**
- `src/lib/coach/comms/__tests__`
- `src/lib/coach/logistics/__tests__`
- `src/lib/coach/scouting/__tests__/coachScouting.test`
- `src/lib/components/director/os/__tests__`
- `src/lib/components/marketing/__tests__`
- `src/lib/household/__tests__`
- `src/lib/registrar/__tests__`
- `src/lib/security/__tests__/firestoreRulesSprint412.test`
- `src/lib/security/__tests__/loopIntegrityGuards.test` (skips without emulator; source-scan + emulator in firestore-rules job)

**Verify:**
- `npx vitest run` (new paths): 11 passed, 1 skipped / 70 tests passed
- `npm run check`: 391 errors (pre-existing; agent 22 scope)
- `npm run build`: pass

**Still excluded (61 red):** playerHudSprint14/18–21/24–25/27–29/210–214/216–217/219/222–225/227–243/246/249/256/260/282/312–313, playerLoadoutSprint31/32/34/35c/35e/35f/35gVision/35h/35i-*, playerLoadoutSprint35mArt, playerRlFunctional, firestoreRulesSprint13, armory.layout/Avatar, playerDashboard.hud, workout.layout

---
