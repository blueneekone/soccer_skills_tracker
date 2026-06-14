# Agent — player-rl-functional

**Slice ID:** player-rl-functional  
**Branch:** `closure/player-rl-functional`

**Owns:**
- `src/lib/gamification/__tests__/playerRlFunctional.test.ts`
- `functions-rl/index.js`
- `functions/index.js` (re-export wiring if needed)

## Task

Register **G-03**: fix `playerRlFunctional.test.ts` export drift — RL exports live in `functions-rl/index.js`, not monolith-only expectations.

**Acceptance:** `playerRlFunctional.test.ts` passes without skip.

## AutomatedVerify

```bash
npm test -- src/lib/gamification/__tests__/playerRlFunctional.test.ts
npm run check
npm run build
```

## ManualQaId

none

---

Universal rules: Unattended overnight — do not ask questions. Append SLICE_LOG only. If FIREBASE_TOKEN missing, log Blocked and stop slice (do not claim Done). Each commit: npm test (slice), npm run check, npm run build. Permanent rejects #1–#3. Manual testing is OWNER_QA_CHECKLIST only — you ship code + automated verify.
