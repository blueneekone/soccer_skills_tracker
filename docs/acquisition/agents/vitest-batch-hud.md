# Agent — vitest-batch-hud

**Slice ID:** vitest-batch-hud  
**Branch:** `closure/vitest-batch-hud`

**Owns:**
- `.github/workflows/ci.yml`
- `src/lib/components/player/dashboard/__tests__/playerHudSprint*.test.ts` (CI excluded list)

## Task

Register **G-02**: triage and fix or retire excluded `playerHudSprint*` red suites; expand CI allowlist.

**Acceptance:** Newly green paths run in CI; no flaky skips without reason in SLICE_LOG.

## AutomatedVerify

```bash
npx vitest run src/lib/components/player/dashboard/__tests__/playerHudSprint252.test.ts
npm run check
```

## ManualQaId

none

---

Universal rules: Unattended overnight — do not ask questions. Append SLICE_LOG only. If FIREBASE_TOKEN missing, log Blocked and stop slice (do not claim Done). Each commit: npm test (slice), npm run check, npm run build. Permanent rejects #1–#3. Manual testing is OWNER_QA_CHECKLIST only — you ship code + automated verify.
