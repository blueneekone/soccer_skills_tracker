# Agent — vitest-batch-loadout

**Slice ID:** vitest-batch-loadout  
**Branch:** `closure/vitest-batch-loadout`

**Owns:**
- `.github/workflows/ci.yml`
- `src/lib/gamification/__tests__/playerLoadoutSprint*.test.ts`

## Task

Register **G-02**: triage excluded `playerLoadoutSprint*` suites; expand CI allowlist.

## AutomatedVerify

```bash
npx vitest run src/lib/gamification/__tests__/playerLoadoutSprint35mArt.test.ts
npm run check
```

## ManualQaId

none

---

Universal rules: Unattended overnight — do not ask questions. Append SLICE_LOG only. If FIREBASE_TOKEN missing, log Blocked and stop slice (do not claim Done). Each commit: npm test (slice), npm run check, npm run build. Permanent rejects #1–#3. Manual testing is OWNER_QA_CHECKLIST only — you ship code + automated verify.
