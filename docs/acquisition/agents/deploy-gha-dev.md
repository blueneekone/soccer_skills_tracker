# Agent — deploy-gha-dev

**Slice ID:** deploy-gha-dev  
**Branch:** `closure/deploy-gha-dev`

**Owns:**
- `.github/workflows/deploy.yml`

## Task

Register **A-04**: workflow_dispatch dev target uses `sports-skill-tracker-dev`; completion echo must not say "production" when environment=dev.

1. Verify `FIREBASE_PROJECT_ID` conditional for dev vs prod.
2. Fix completion/summary strings to reflect dev deploy.
3. Optional: add post-deploy `npm run smoke:dev` job when secret available.

**Acceptance:** deploy.yml dev path targets correct project; `npm run check` passes.

## AutomatedVerify

```bash
npm run check
```

## ManualQaId

QA-000d

---

Universal rules: Unattended overnight — do not ask questions. Append SLICE_LOG only. If FIREBASE_TOKEN missing, log Blocked and stop slice (do not claim Done). Each commit: npm test (slice), npm run check, npm run build. Permanent rejects #1–#3. Manual testing is OWNER_QA_CHECKLIST only — you ship code + automated verify.
