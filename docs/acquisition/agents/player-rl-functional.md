# Agent — player-rl-functional

**Branch:** `closure/player-rl-functional`

**Owns:** `src/lib/gamification/__tests__/playerRlFunctional.test.ts`, `functions-rl/index.js`, `functions/index.js` (re-export assertions only)

## Task

Fix register **G-03** export drift:

1. Update `playerRlFunctional.test.ts` to assert `getAdaptiveWorkoutPolicy` and `rlOnWorkoutLogCreated` exported from **`functions-rl/index.js`** (split codebase), not monolith-only.
2. Optionally assert monolith `functions/index.js` re-exports if present — match actual deploy wiring per `deploy:rl`.
3. Do not change RL behavior — test alignment only.

**Acceptance:** `npm test -- src/lib/gamification/__tests__/playerRlFunctional.test.ts` green locally.

---

Universal rules: Append SLICE_LOG.md only. Do NOT build rejects R-01–R-03. Each commit: playerRlFunctional test path, npm run check, npm run build. Do not ask questions.
