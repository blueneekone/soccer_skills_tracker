# Agent — vitest-batch-loadout

**Branch:** `closure/vitest-batch-loadout`

**Owns:** `.github/workflows/ci.yml`, `src/lib/gamification/__tests__/playerLoadoutSprint*.test.ts`

## Task

Register **G-02** — triage excluded loadout/avatar sprint guards:

**Excluded:** playerLoadoutSprint31, 32, 34, 35c, 35e, 35f, 35gVision, 35h, 35i-fix, 35i-a, 35i-b, 35mArt

Fix guards for shipped markup **OR** retire with documented reason (deferred avatar track). Expand CI allowlist per green suite.

**Acceptance:** Non-deferred loadout tests green or explicitly retired in ci.yml comment.

---

Universal rules: Append SLICE_LOG.md only. Do NOT build PNG avatar layers (LAUNCH-defer-avatar). Each commit: vitest on touched paths, npm run check, npm run build. Do not ask questions.
