# Agent — functional-mvp-doc-sync

**Slice ID:** functional-mvp-doc-sync  
**Branch:** `closure/functional-mvp-doc-sync`

**Owns:**
- `docs/vision/FUNCTIONAL_MVP.md` (gaps table + stale rows only)
- `docs/vision/COMPETITIVE_LAUNCH_ASSESSMENT.md` (exec summary launch gate row)
- `docs/vision/PLAYER_OS_RUBRIC_GAP_MATRIX.md` (tracker nav note)

## Task

Register **F-05**, **F-06**, **A-05**:

1. Mark tracker nav gap **Resolved** (in PlayerShell since agent 07).
2. Mark `npm run check` debt **Resolved** (CHECK_ZERO_STATUS).
3. Point COMPETITIVE_LAUNCH assessment to PLATFORM_GAP_REGISTER.
4. **Do not** auto-check FUNCTIONAL_MVP human checkboxes.

## AutomatedVerify

```bash
npm test -- src/lib/gamification/__tests__/personaFunctionalMvp.test.ts src/lib/parent/__tests__/launchWave2Complete.test.ts
npm run check
npm run build
```

## ManualQaId

none

---

Universal rules: Unattended overnight — do not ask questions. Append SLICE_LOG only. If FIREBASE_TOKEN missing, log Blocked and stop slice (do not claim Done). Each commit: npm test (slice), npm run check, npm run build. Permanent rejects #1–#3. Manual testing is OWNER_QA_CHECKLIST only — you ship code + automated verify.
