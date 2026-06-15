# Slice log (append-only)

Agents append entries below. Do not edit prior rows.

---

## player-rl-functional (G-03) — 2026-06-14

**Branch:** `closure/player-rl-functional`  
**Status:** Done  
**Change:** Fixed `playerRlFunctional.test.ts` export drift — RL callables/triggers asserted on `functions-rl/index.js`; monolith DEPLOY-N guard confirms no duplicate RL exports; AdaptiveHomework goto handoff pattern updated to `goto('/player/workout')`.  
**Verify:** `npm test -- src/lib/gamification/__tests__/playerRlFunctional.test.ts` (19 passed) · `npm run check` (0 errors) · `npm run build`

## vitest-batch-misc — 2026-06-14

**Branch:** `closure/vitest-batch-misc`  
**Status:** Done  
**Gaps closed:** G-06 Done · G-02 partial (−6 suites; 55 red remain for hud/loadout batches)

**Fixed/retired misc excluded suites (6 files → CI allowlist 129 → 135):**
- `playerRlFunctional.test.ts` — RL exports moved to `functions-rl/index.js`; AdaptiveHomework `goto('/player/workout')`
- `firestoreRulesSprint13.test.ts` — clubs top-level read guard (removed obsolete nested `authed()` negative)
- `armory.layout.test.ts` — `.qa-card` backdrop guard reads dossier CSS when page has no local rule
- `armoryAvatar.test.ts` — `syncOperativeIdentityToFirestore` + `OperativePortraitPartPicker` (replaces UPDATE OPERATIVE)
- `workout.layout.test.ts` — pw-theater train layout (replaces 12-col bento span guards)
- `playerDashboard.hud.test.ts` — `--pd-*` tokens, `player-analytics-void`, holo face metrics

**Verify:**
- `npx vitest run` (6 slice paths): 52 passed
- `npx vitest run src/lib/security/__tests__/firestoreRulesSprint13.test.ts`: 6 passed
- `npm run check`: 0 errors
- `npm run build`: pass
