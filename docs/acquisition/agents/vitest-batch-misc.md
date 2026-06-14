# Agent — vitest-batch-misc

**Slice ID:** vitest-batch-misc  
**Branch:** `closure/vitest-batch-misc`

**Owns:**
- `.github/workflows/ci.yml`
- `src/lib/gamification/__tests__/playerRlFunctional.test.ts`
- `src/lib/security/__tests__/firestoreRulesSprint13.test.ts`
- `src/routes/(app)/player/armory/__tests__/*`
- `src/routes/(app)/player/workout/__tests__/workout.layout.test.ts`

## Task

Register **G-02**, **G-06**: fix or retire misc excluded suites (RL functional, firestoreRulesSprint13, armory layout, workout layout, playerDashboard.hud).

## AutomatedVerify

```bash
npx vitest run src/lib/security/__tests__/firestoreRulesSprint13.test.ts
npm run check
```

## ManualQaId

none

---

Universal rules: Unattended overnight — do not ask questions. Append SLICE_LOG only. If FIREBASE_TOKEN missing, log Blocked and stop slice (do not claim Done). Each commit: npm test (slice), npm run check, npm run build. Permanent rejects #1–#3. Manual testing is OWNER_QA_CHECKLIST only — you ship code + automated verify.
