# Slice log (append-only)

Agents append entries below. Do not edit prior rows.

---

## functional-mvp-doc-sync — 2026-06-14

**Branch:** `closure/functional-mvp-doc-sync`  
**Status:** Done  
**Gap register:** F-05, F-06, A-05 → Done  
**Updated:** `FUNCTIONAL_MVP.md` (tracker nav + check debt gaps resolved), `COMPETITIVE_LAUNCH_ASSESSMENT.md` (launch gate → `PLATFORM_GAP_REGISTER.md`), `PLAYER_OS_RUBRIC_GAP_MATRIX.md` (tracker nav note), `PLATFORM_GAP_REGISTER.md`  
**Verify:** `npm test -- src/lib/gamification/__tests__/personaFunctionalMvp.test.ts src/lib/parent/__tests__/launchWave2Complete.test.ts` · `npm run check` · `npm run build`

## deploy-gha-dev (A-04) — 2026-06-14

**Branch:** `closure/deploy-gha-dev`  
**Slice:** `deploy-gha-dev` · **Register:** A-04 · **ManualQaId:** QA-000d  
**Status:** **Done**

**Shipped:**
- `DEPLOY_TARGET` + `FIREBASE_PROJECT_ID` env: `workflow_dispatch` **dev** → `sports-skill-tracker-dev`; **prod** or `push` to `main` → `soccer-skills-tracker`
- `VITE_USE_PROD` mirrors target (`false` for dev builds)
- Deploy job name + GitHub environment URL keyed to target project
- Completion echo + `GITHUB_STEP_SUMMARY`: dev path says **development** / `sports-skill-tracker-dev` (never bare "production")
- Optional `smoke-dev` job after deploy when `DEPLOY_TARGET=dev` and `FIREBASE_CI_TOKEN` secret is set (`npm run smoke:dev`)

**Verify:** `npm run check` (0 errors) · `npm run build` (pass)
