# Agent — vitest-batch-misc

**Branch:** `closure/vitest-batch-misc`

**Owns:** `.github/workflows/ci.yml`, `src/lib/gamification/__tests__/playerRlFunctional.test.ts`, `src/lib/security/__tests__/firestoreRulesSprint13.test.ts`, `src/lib/components/player/**/armory*.test.ts`, `playerDashboard.hud.test.ts`, `workout.layout.test.ts`

## Task

Register **G-02**, **G-06** — misc excluded suites:

1. `playerRlFunctional` — prefer fix via `player-rl-functional` slice if merged first; else fix here.
2. `firestoreRulesSprint13` — update to current rules structure or retire with reason.
3. `armory.layout`, `armoryAvatar`, `playerDashboard.hud`, `workout.layout` — fix token/markup guards or retire (avatar tests → defer reason).

Expand CI allowlist for each green suite.

---

Universal rules: Append SLICE_LOG.md only. Do NOT build rejects R-01–R-03. Each commit: vitest on touched paths, npm run check, npm run build. Do not ask questions.
