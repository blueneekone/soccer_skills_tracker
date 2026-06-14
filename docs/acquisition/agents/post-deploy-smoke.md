# Agent — post-deploy-smoke

**Branch:** `closure/post-deploy-smoke`

**Owns:** `scripts/deploy-dev-verify.cjs`, `docs/acquisition/` (smoke checklist doc if new)

## Task

Register **A-02**, **D-09** — post-deploy callable verification:

1. Document or script smoke checks for: `assignSeasonRegistrationToRoster`, `exportStateRoster`, `createRegistrationIntent`, `getAdaptiveWorkoutPolicy`, `registerDeviceToken`.
2. Use `httpsCallable` against `sports-skill-tracker-dev` / `us-east1` with super_admin test creds OR document owner manual steps in checklist.
3. Depends on `live-deploy-dev` merge.

**Acceptance:** Checklist in repo; `launchWave2Complete.test.ts` still passes.

---

Universal rules: Append SLICE_LOG.md only. Do NOT build rejects R-01–R-03. Each commit: `npm test -- src/lib/parent/__tests__/launchWave2Complete.test.ts`, npm run check, npm run build. Do not ask questions.
