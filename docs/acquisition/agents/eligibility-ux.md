# Agent — eligibility-ux

**Branch:** `closure/eligibility-ux`

**Owns:** `src/lib/components/director/**/ClubEligibilityMatrixPanel*`, `src/lib/director/evaluateClubEligibility.js`, `src/lib/director/__tests__/eligibilityLaunch.test.ts`

## Task

Close register **B-04** director UX edge cases on eligibility matrix:

1. Empty matrix / first-time club — clear empty state + save CTA.
2. Invalid rule rows — inline validation before `upsertClubEligibilityMatrix` callable.
3. Read-only registrar view vs director edit — no dead buttons.
4. Extend `eligibilityLaunch.test.ts` guards for each fix (max 5 files).

**Acceptance:** Director can configure matrix without console errors on empty club; tests pass.

---

Universal rules: Append SLICE_LOG.md only. Do NOT build rejects R-01–R-03. Each commit: `npm test -- src/lib/director/__tests__/eligibilityLaunch.test.ts`, npm run check, npm run build. Do not ask questions.
