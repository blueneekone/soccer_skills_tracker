# Agent — vitest-batch-hud

**Branch:** `closure/vitest-batch-hud`

**Owns:** `.github/workflows/ci.yml`, `src/lib/components/player/dashboard/__tests__/playerHudSprint*.test.ts` (CI-excluded list)

## Task

Register **G-02** — triage excluded HUD sprint guards:

**Excluded files (ci.yml):** playerHudSprint14, 18–21, 24–25, 27–29, 210–214, 216–217, 219, 222–225, 227–243, 246, 249, 256, 260, 282, 312–313

For each file: fix guard to match current markup **OR** delete test with one-line comment in ci.yml exclusion list citing obsolete sprint. Expand CI allowlist for every green fix.

**Acceptance:** More HUD suites green; ci.yml documents any remaining exclusions with reason.

---

Universal rules: Append SLICE_LOG.md only. Do NOT build rejects R-01–R-03. Each commit: `npx vitest run` on touched paths, npm run check, npm run build. Do not ask questions.
