# Agent — eligibility-ux

**Slice ID:** eligibility-ux  
**Branch:** `closure/eligibility-ux`

**Owns:**
- `src/lib/components/director/**/ClubEligibilityMatrixPanel*`
- `src/lib/director/**`

## Task

Register **B-04**: polish director eligibility matrix UX edge cases (empty state, save errors, matrix validation feedback).

**Acceptance:** `eligibilityLaunch.test.ts` green; no regressions on `upsertClubEligibilityMatrix`.

## AutomatedVerify

```bash
npm test -- src/lib/director/__tests__/eligibilityLaunch.test.ts
npm run check
npm run build
```

## ManualQaId

none

---

Universal rules: Unattended overnight — do not ask questions. Append SLICE_LOG only. If FIREBASE_TOKEN missing, log Blocked and stop slice (do not claim Done). Each commit: npm test (slice), npm run check, npm run build. Permanent rejects #1–#3. Manual testing is OWNER_QA_CHECKLIST only — you ship code + automated verify.
