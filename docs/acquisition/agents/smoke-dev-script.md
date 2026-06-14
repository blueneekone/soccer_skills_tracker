# Agent — smoke-dev-script

**Slice ID:** smoke-dev-script  
**Branch:** `closure/smoke-dev-script`

**Owns:**
- `scripts/smoke-dev-callables.mjs`
- `scripts/deploy-dev-and-smoke.cjs`
- `package.json` (smoke:dev, deploy:dev:smoke scripts)
- `docs/acquisition/DEPLOY_RECORD.json` (generated artifact path)

## Task

Register **M-06**, **A-02** — automated post-deploy smoke (agents run; owner never runs firebase manually):

1. Ensure `npm run smoke:dev` probes hosting (https://sstracker.app) + key callables (`logTrainingSession`, `createRegistrationIntent`, `assignSeasonRegistrationToRoster`, `exportStateRoster`, VPC/parent callables, `registerDeviceToken`).
2. Unauthenticated callable → 401/403 = pass (endpoint live); 404 = fail.
3. `npm run deploy:dev:smoke` = build + deploy:dev + verify + smoke:dev.
4. Document in PLATFORM_GAP_REGISTER AutomatedVerify column.

**Acceptance:** `npm run smoke:dev` exits 0 against dev (or SLICE_LOG Blocked if no network/token for deploy slice).

## AutomatedVerify

```bash
npm run smoke:dev
npm run check
npm run build
```

## ManualQaId

QA-000c

---

Universal rules: Unattended overnight — do not ask questions. Append SLICE_LOG only. If FIREBASE_TOKEN missing, log Blocked and stop slice (do not claim Done). Each commit: npm test (slice), npm run check, npm run build. Permanent rejects #1–#3. Manual testing is OWNER_QA_CHECKLIST only — you ship code + automated verify.
