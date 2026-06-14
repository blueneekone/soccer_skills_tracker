# Agent — post-deploy-guards

**Slice ID:** post-deploy-guards  
**Branch:** `closure/post-deploy-guards`

**Owns:**
- `src/lib/parent/__tests__/launchWave2Complete.test.ts`
- `src/lib/gamification/__tests__/personaFunctionalMvp.test.ts`
- `scripts/smoke-dev-callables.mjs` (expand callable list if needed)

## Task

Register **A-02**, **D-09**, **H-03** — post-deploy guards after `live-deploy-dev`:

1. Expand `launchWave2Complete.test.ts` if deploy/smoke scripts added new gates.
2. Ensure `npm run smoke:dev` covers `registerDeviceToken` + VPC callables.
3. Depends on `closure/live-deploy-dev` merged or dev already deployed.

**Acceptance:** `npm run smoke:dev` green; launch wave guards pass.

## AutomatedVerify

```bash
npm run smoke:dev
npm test -- src/lib/parent/__tests__/launchWave2Complete.test.ts src/lib/gamification/__tests__/personaFunctionalMvp.test.ts
npm run check
npm run build
```

## ManualQaId

QA-000c, QA-210

---

Universal rules: Unattended overnight — do not ask questions. Append SLICE_LOG only. If FIREBASE_TOKEN missing, log Blocked and stop slice (do not claim Done). Each commit: npm test (slice), npm run check, npm run build. Permanent rejects #1–#3. Manual testing is OWNER_QA_CHECKLIST only — you ship code + automated verify.
