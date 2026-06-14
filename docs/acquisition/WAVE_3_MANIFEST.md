# Wave 3 manifest — parallel closure fleet

**Last updated:** 2026-06-14  
**Branch baseline:** dev @ `42a3bffbf879fb64c3fabfcff3f7f0e780351af3`  
**Authority:** [`PLATFORM_GAP_REGISTER.md`](./PLATFORM_GAP_REGISTER.md)  
**Branch prefix:** `closure/<slice-id>` from `dev`  
**Rules:** Max 5 files per agent (unless vitest batch lists explicit paths) · one directory owner where possible · append [`SLICE_LOG.md`](./SLICE_LOG.md) only · never build rejects R-01–R-03

---

## Merge order (orchestrator)

1. **Wave 3A** — parallel (no deploy auth): merge in any order except note dependencies below  
2. **Wave 3B** — after 3A merges OR `FIREBASE_CI_TOKEN` available: `live-deploy-dev` → `post-deploy-smoke`  
3. **Wave 3C** — owner/blocked: no merge until unblock  
4. **`closure/orch-wave3`** — poll SLICE_LOG, merge `closure/*` → `dev` in dependency order, update PARALLEL_STATUS

### 3A dependency notes

| Slice | Depends on |
|-------|------------|
| `post-deploy-smoke` | `live-deploy-dev` |
| `functional-mvp-doc-sync` | none (doc-only; run early) |
| `fed-phase2` | none (may touch functions-core + director) |
| `player-os-6j` | prefer after `diegetic-modals` if same CSS files — otherwise parallel with care |
| `orch-wave3` | all 3A + 3B agent slices merged or marked Blocked/Owner |

---

## Wave 3A — parallel (no deploy auth)

| Slice ID | Branch | Priority | Register rows | Owns (paths) | Verify |
|----------|--------|----------|---------------|--------------|--------|
| `deploy-gha-dev` | `closure/deploy-gha-dev` | **P0** | A-04 | `.github/workflows/deploy.yml` | `npm run check` |
| `payment-webhook` | `closure/payment-webhook` | **P0** | B-01 | `functions/commerce.js`, `functions-commerce/**`, `functions/__tests__/*commerce*` | `npm test -- src/lib/parent/__tests__/paymentInstallments.test.ts` + commerce webhook tests |
| `eligibility-ux` | `closure/eligibility-ux` | **P1** | B-04 | `src/lib/components/director/**/ClubEligibilityMatrixPanel*`, `src/lib/director/**` | `npm test -- src/lib/director/__tests__/eligibilityLaunch.test.ts` |
| `fcm-broadcast` | `closure/fcm-broadcast` | **P2** | D-06, D-08 | `docs/FCM_AND_MESSAGING_MATRIX.md`, `src/lib/services/__tests__/commsSprint48.test.ts`, `src/lib/services/__tests__/commsSprint49.test.ts` | `npm test -- src/lib/services/__tests__/commsSprint48.test.ts src/lib/services/__tests__/commsSprint49.test.ts` |
| `checkr-webhooks` | `closure/checkr-webhooks` | **P1** | D-01 | `functions/compliance.js`, `functions-compliance/**`, `src/lib/compliance/**` | `node --test functions/__tests__/complianceCheckr.guard.test.js` · `npm test -- src/lib/compliance/__tests__/checkrCoachClearance.urls.test.ts` |
| `fed-phase2` | `closure/fed-phase2` | **P2** | C-02 | `functions-core/**/ngbExportOps.js`, `src/lib/director/**/StateRosterExportPanel*`, `docs/acquisition/FEDERATION_ROADMAP.md` | `npm test -- src/lib/director/__tests__/ngbExportLaunch.test.ts` |
| `tournament-p2` | `closure/tournament-p2` | **P2** | E-02, E-04 | `src/lib/tournament/**`, `src/lib/components/director/**/Tournament*` | `npm test -- src/lib/tournament/__tests__/p2TournamentBracket.test.ts` |
| `player-rl-functional` | `closure/player-rl-functional` | **P1** | G-03 | `src/lib/gamification/__tests__/playerRlFunctional.test.ts`, `functions-rl/index.js`, `functions/index.js` | `npm test -- src/lib/gamification/__tests__/playerRlFunctional.test.ts` |
| `vitest-batch-hud` | `closure/vitest-batch-hud` | **P2** | G-02 | `.github/workflows/ci.yml`, `src/lib/components/player/dashboard/__tests__/playerHudSprint*.test.ts` (excluded list in ci.yml L47–48) | Expand allowlist + `npx vitest run` on fixed paths |
| `vitest-batch-loadout` | `closure/vitest-batch-loadout` | **P2** | G-02 | `.github/workflows/ci.yml`, `src/lib/gamification/__tests__/playerLoadoutSprint*.test.ts` | Same |
| `vitest-batch-misc` | `closure/vitest-batch-misc` | **P2** | G-02, G-06 | `.github/workflows/ci.yml`, `playerRlFunctional.test.ts`, `firestoreRulesSprint13.test.ts`, `armory*.test.ts`, `workout.layout.test.ts`, `playerDashboard.hud.test.ts` | Same |
| `functional-mvp-doc-sync` | `closure/functional-mvp-doc-sync` | **P0** | F-05, F-06, A-05 | `docs/vision/FUNCTIONAL_MVP.md` (gaps table only), `docs/vision/COMPETITIVE_LAUNCH_ASSESSMENT.md` (exec summary row), `docs/vision/PLAYER_OS_RUBRIC_GAP_MATRIX.md` (tracker nav note) | `npm test -- src/lib/gamification/__tests__/personaFunctionalMvp.test.ts` · no checkbox edits |
| `player-os-6f` | `closure/player-os-6f` | **P2** | J-01, J-08 | `src/routes/(app)/player/armory/**`, `OperativeLoadoutStudio.svelte`, `docs/visual-acceptance/sprint-2.22-slice-6f/**` | `npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint252.test.ts` |
| `player-os-6j` | `closure/player-os-6j` | **P2** | J-02, J-06, J-07, J-10 | `src/lib/styles/player-dossier.css`, Player route pages, `playerHudSprint234.test.ts` | `npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint234.test.ts` |
| `diegetic-modals` | `closure/diegetic-modals` | **P1** | J-03, J-09 | `src/lib/components/player/OperativeLoadoutStudio.svelte`, `PlayerDiegeticOverlay*`, `src/routes/(app)/player/workout/+page.svelte` | `npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint244.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint250.test.ts` |

**Agent prompts:** `docs/acquisition/agents/<slice-id>.md`

---

## Wave 3B — after 3A merges OR credential available

| Slice ID | Branch | Priority | Register rows | Owns | Depends on | Verify |
|----------|--------|----------|---------------|------|------------|--------|
| `live-deploy-dev` | `closure/live-deploy-dev` | **P0** | A-01, A-06 | operator: `npm run build`, `npm run deploy:dev`, all `deploy:*` per FUNCTIONS_DEPLOY | 3A code merges | `npm run deploy:dev:verify` |
| `post-deploy-smoke` | `closure/post-deploy-smoke` | **P0** | A-02, D-09 | `scripts/deploy-dev-verify.cjs`, new smoke doc or script | `live-deploy-dev` | Callable smoke doc + `launchWave2Complete.test.ts` |

---

## Wave 3C — blocked on owner

| Slice ID | Branch | Priority | Register rows | Blocker | Agent prompt |
|----------|--------|----------|---------------|---------|--------------|
| `gemini-ingest-2` | `closure/gemini-ingest-2` | **P3** | I-02 | Owner PNG #2 in `static/portrait/approved/` | `agents/gemini-ingest-2.md` |
| `gemini-ingest-3` | `closure/gemini-ingest-3` | **P3** | I-03 | Owner PNG #3 | `agents/gemini-ingest-3.md` |
| `functional-mvp-qa` | `owner/functional-mvp-qa` | **P0** | F-01–F-04, M-01 | Human only | `agents/functional-mvp-qa.md` |
| `demo-video` | `owner/demo-video` | **P1** | M-02 | Human recording | `agents/demo-video.md` |

---

## Wave 3 orchestrator

| Slice ID | Branch | Priority | Register rows | Owns | Verify |
|----------|--------|----------|---------------|------|--------|
| `orch-wave3` | `closure/orch-wave3` | **P0** | M-04, all | `docs/acquisition/SLICE_LOG.md`, `PARALLEL_STATUS.md`, `ROADMAP.md` (sprint line), `TRACTION.md`, `GAP_CLOSURE_PLAN` header | Register row counts match summary |

**Prompt:** [`agents/orch-wave3.md`](./agents/orch-wave3.md)

---

## Launch overnight agents

```bash
node scripts/launch-overnight-agents.mjs --wave 3a
node scripts/launch-overnight-agents.mjs --wave 3b   # after FIREBASE_CI_TOKEN set
node scripts/launch-overnight-agents.mjs --agent payment-webhook
```

Do **not** relaunch overnight agents 01–24.

---

## Slice index (quick lookup)

| Agent slice | Prompt file |
|-------------|-------------|
| deploy-gha-dev | [`agents/deploy-gha-dev.md`](./agents/deploy-gha-dev.md) |
| payment-webhook | [`agents/payment-webhook.md`](./agents/payment-webhook.md) |
| eligibility-ux | [`agents/eligibility-ux.md`](./agents/eligibility-ux.md) |
| fcm-broadcast | [`agents/fcm-broadcast.md`](./agents/fcm-broadcast.md) |
| checkr-webhooks | [`agents/checkr-webhooks.md`](./agents/checkr-webhooks.md) |
| fed-phase2 | [`agents/fed-phase2.md`](./agents/fed-phase2.md) |
| tournament-p2 | [`agents/tournament-p2.md`](./agents/tournament-p2.md) |
| player-rl-functional | [`agents/player-rl-functional.md`](./agents/player-rl-functional.md) |
| vitest-batch-hud | [`agents/vitest-batch-hud.md`](./agents/vitest-batch-hud.md) |
| vitest-batch-loadout | [`agents/vitest-batch-loadout.md`](./agents/vitest-batch-loadout.md) |
| vitest-batch-misc | [`agents/vitest-batch-misc.md`](./agents/vitest-batch-misc.md) |
| functional-mvp-doc-sync | [`agents/functional-mvp-doc-sync.md`](./agents/functional-mvp-doc-sync.md) |
| player-os-6f | [`agents/player-os-6f.md`](./agents/player-os-6f.md) |
| player-os-6j | [`agents/player-os-6j.md`](./agents/player-os-6j.md) |
| diegetic-modals | [`agents/diegetic-modals.md`](./agents/diegetic-modals.md) |
| live-deploy-dev | [`agents/live-deploy-dev.md`](./agents/live-deploy-dev.md) |
| post-deploy-smoke | [`agents/post-deploy-smoke.md`](./agents/post-deploy-smoke.md) |
| orch-wave3 | [`agents/orch-wave3.md`](./agents/orch-wave3.md) |
| gemini-ingest-2 | [`agents/gemini-ingest-2.md`](./agents/gemini-ingest-2.md) |
| gemini-ingest-3 | [`agents/gemini-ingest-3.md`](./agents/gemini-ingest-3.md) |
| functional-mvp-qa | [`agents/functional-mvp-qa.md`](./agents/functional-mvp-qa.md) |
| demo-video | [`agents/demo-video.md`](./agents/demo-video.md) |
