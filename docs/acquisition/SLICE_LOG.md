# Slice log (append-only)

Agents append entries below. Do not edit prior rows.

---

**Register:** E-02, E-04 → Done in `PLATFORM_GAP_REGISTER.md`

### Notes
- Each installment uses existing `createRegistrationIntent` with partial `feeAmountDollars`; full-season unlock on first partial payment remains a backend follow-up (webhook sets `activeSeasonStatus` on any succeeded PI).

| Slice | Branch | Tests | Check | Build | Notes |
|-------|--------|-------|-------|-------|-------|
| 16-marketing-acq | overnight/marketing-acq | marketingLanding.test.ts | 391 errors (pre-existing) | pass | `/acquisition` route, acquisitionContent.ts, landing CTA + footer links, test guards |

## P2-reg-roster — Agent 03 (2026-06-13)

**Branch:** `overnight/p2-reg-roster`

**Slice:** Registration→roster assign UX for paid `season_registrations`.

**Shipped:**
- `assignSeasonRegistrationToRoster` CF — director/registrar assigns paid registration to team; writes `player_lookup`, `users`, `rosters`, seat entitlements, and `assignedTeamId` on registration.
- `RegistrationRosterAssignPanel` on Director Licenses tab — lists paid registrants, team picker, assign/reassign.
- Firestore composite index: `season_registrations` tenantId + seasonId + paymentStatus.
- Tests extended in `registrationLaunch.test.ts`.

**Verify:** `npm test -- src/lib/coach/logistics/__tests__/registrationLaunch.test.ts` · `npm run check` · `npm run build` · `npm run deploy:core` + firestore indexes

| Slice | Branch | Agent | Status | Proof |
|-------|--------|-------|--------|-------|
| LAUNCH-fed-ngb | overnight/fed-ngb | 14 | Done | `exportStateRoster` callable (director/registrar, clubId, optional teamId) → CSV v1 from `player_lookup` + `households`; `StateRosterExportPanel` on Director Roster tab; `FEDERATION_ROADMAP.md` Phases 1–4; `ngbExportLaunch.test.ts` |

## 15-live-stream — overnight/live-stream

- `liveStreamUrl` on `team_workouts` scheduled events + `teams/{teamId}/match_sessions`
- Coach paste: YouTube / Vimeo / Mux in schedule panel + match-day sideline
- Parent `LiveStreamWatch` — Watch live with allowlisted iframe embed
- Teen 13–16 guard: external link fallback (no third-party iframe)
- Guards: `src/lib/live-stream/__tests__/liveStreamLaunch.test.ts`

## Agent 10 — check-stores (2026-06-13)

**Branch:** `overnight/check-stores`  
**Scope:** `src/lib/stores/**`, `src/lib/auth/**`  
**Check (scope):** 1 → 0 errors  
**Check (repo):** 391 → 390 errors  
**Fix:** `passkeys.ts` — double-cast legacy raw-options response to `PublicKeyCredentialRequestOptionsJSON` after `challenge` guard.  
**Tests:** `npm test -- src/lib/stores/auth/__tests__/ src/lib/auth/__tests__/` — 52 passed  
**Files:** 1 (`src/lib/auth/passkeys.ts`)

---

## 11-check-coach-dir — 2026-06-13

**Branch:** `overnight/check-coach-dir`  
**Scope:** `src/lib/coach/**`, `src/lib/director/**`, `src/lib/compliance/**`  
**Check (scope):** 8 → 0 errors (full repo: 391 → 383)  
**Files (4):** `CoachDrillsView.svelte`, `IntentEngine.svelte.ts`, `IntentHUD.svelte`, `CoachIntentEngineView.svelte`  
**Fixes:** typed `scheduleEventKind`; Modal `titleSlot` snippets; `expiresAt` cast via `unknown`; `MouseEventHandler` prop defaults; `resolve(route, {})` for typed route ID  
**Tests:** 11 files, 100 passed  
**Build:** pass

## Agent 13 — check-player (2026-06-13)

- **Branch:** `overnight/check-player`
- **Scope:** `src/lib/player/**`, `src/lib/gamification/**`, `src/lib/hud/**`
- **Check errors:** 2 → 0 (repo total 391 → 389)
- **Files:** `rlPolicyCache.ts` (parse `ExplanationCode` union), `CoachMissionDrillExecutionPanel.svelte` (complexityRank cast via unknown)
- **Tests:** `npm test -- src/lib/player/workout/__tests__/coachMissionFlow.test.ts src/lib/player/__tests__/ src/lib/player/dashboard/__tests__/ src/lib/hud/__tests__/` — 115 passed
- **Build:** `npm run build` — ok

## 23-vitest-ci — PHASE 2 (2026-06-13)

**Branch:** `overnight/vitest-ci`  
**Scope:** `.github/workflows/ci.yml` — expand vitest allowlist 117 → 129 green files

**Added to CI unit job (12 newly green, verified locally):**
- `src/lib/coach/comms/__tests__`
- `src/lib/coach/logistics/__tests__`
- `src/lib/coach/scouting/__tests__/coachScouting.test`
- `src/lib/components/director/os/__tests__`
- `src/lib/components/marketing/__tests__`
- `src/lib/household/__tests__`
- `src/lib/registrar/__tests__`
- `src/lib/security/__tests__/firestoreRulesSprint412.test`
- `src/lib/security/__tests__/loopIntegrityGuards.test` (skips without emulator; source-scan + emulator in firestore-rules job)

**Verify:**
- `npx vitest run` (new paths): 11 passed, 1 skipped / 70 tests passed
- `npm run check`: 391 errors (pre-existing; agent 22 scope)
- `npm run build`: pass

**Still excluded (61 red):** playerHudSprint14/18–21/24–25/27–29/210–214/216–217/219/222–225/227–243/246/249/256/260/282/312–313, playerLoadoutSprint31/32/34/35c/35e/35f/35gVision/35h/35i-*, playerLoadoutSprint35mArt, playerRlFunctional, firestoreRulesSprint13, armory.layout/Avatar, playerDashboard.hud, workout.layout

---

## 2026-06-13 — Agent 24 deploy-verify (PHASE 2)

| Field | Value |
|-------|-------|
| Branch | `overnight/deploy-verify` |
| Status | **Partial** — local gates green; live Firebase deploy blocked (no `FIREBASE_TOKEN` / `firebase login` in cloud agent) |
| Tests | `loopIntegrityGuards` (23 skipped, emulator) + `launchWave2Complete` (pass) + `personaFunctionalMvp` (76 pass) — fixed 3 stale ROADMAP/README/dashboard guards |
| check | 391 errors, 162 warnings (pre-existing; agent 22 owns check=0) |
| build | pass |
| deploy gates | `npm run deploy:dev:verify` green — bundle, `test:functions-deploy` (58), `predeploy:integrations`, env copy to split codebases |
| live deploy | **Blocked** — `firebase deploy --project sports-skill-tracker-dev` requires owner `FIREBASE_CI_TOKEN`; operator run: `npm run build && npm run deploy:dev` |
| artifacts | `.firebaserc` dev alias · `scripts/deploy-dev-verify.cjs` · `scripts/deploy-dev-full.cjs` · `npm run deploy:dev` / `deploy:dev:verify` |

---

## doc-sync (Phase 3) — 2026-06-13

**Branch:** dev  
**Status:** Done  
**Created:** `GAP_CLOSURE_PLAN.md`, `DOC_SYNC_REPORT.md`  
**Updated:** NOTABLE_GAPS, COMPETITIVE_LAUNCH_ASSESSMENT, PROSPECTUS, TRACTION, PARALLEL_STATUS, PARALLEL_SUMMARY, INDEX, CHECK_ZERO_STATUS, ROADMAP sprint line  
**check:** 0  
**Next:** execute GAP_CLOSURE_PLAN slice 1 (owner live deploy)

---

## platform-gap-register — 2026-06-14

**Branch:** dev @ `42a3bffbf879fb64c3fabfcff3f7f0e780351af3`  
**Status:** Done  
**Created:** `PLATFORM_GAP_REGISTER.md`, `WAVE_3_MANIFEST.md`, 22 agent prompts under `docs/acquisition/agents/` (Wave 3 closure fleet)  
**Updated:** `GAP_CLOSURE_PLAN.md` (superseded header), `INDEX.md`, `ROADMAP.md` sprint line, `scripts/launch-overnight-agents.mjs` (--wave 3a/3b), `.github/workflows/deploy.yml` (dev FIREBASE_PROJECT_ID + completion echo)  
**Register counts:** 95 total · 38 Done · 24 Agent · 28 Owner · 2 Blocked · 3 Rejected  
**Verify:** `npm run check` · `npm test -- src/lib/parent/__tests__/launchWave2Complete.test.ts src/lib/gamification/__tests__/personaFunctionalMvp.test.ts`  
**Next:** launch Wave 3A agents (`node scripts/launch-overnight-agents.mjs --wave 3a`)

---

## platform-gap-register-v2 — 2026-06-14 (BUILD vs MANUAL QA split)

**Branch:** dev  
**Status:** Done  
**Created:** `docs/vision/OWNER_QA_CHECKLIST.md`, `scripts/smoke-dev-callables.mjs`, `scripts/deploy-dev-and-smoke.cjs`, `docs/acquisition/agents/smoke-dev-script.md`, `docs/acquisition/agents/post-deploy-guards.md`  
**Updated:** `PLATFORM_GAP_REGISTER.md` (BuildOwner + AutomatedVerify + ManualQaId columns), `WAVE_3_MANIFEST.md` (unattended rules, 3A/3B/3C/orch), all 21 Wave 3 agent prompts, `launch-overnight-agents.mjs` (--wave 3a|3b|3c|orch), `package.json` (smoke:dev, deploy:dev:smoke), `QA_DEV_PERSONA_VERIFICATION.md` (superseded banner), `INDEX.md`, `GAP_CLOSURE_PLAN.md`, `ROADMAP.md`  
**Removed:** `agents/post-deploy-smoke.md` → renamed `post-deploy-guards.md`  
**Completion checklist:**
- Agent .md files (Wave 3 slices): **21** (= manifest Agent slice count)
- `launch-overnight-agents.mjs` updated: **yes** (WAVE_3A, WAVE_3B, WAVE_3C, WAVE_ORCH, --wave 3a|3b|3c|orch)
- `smoke:dev` script added: **yes** (`scripts/smoke-dev-callables.mjs`)
- OWNER_QA_CHECKLIST QA-id count: **47** (QA-000–QA-507)
- PLATFORM_GAP_REGISTER row count: **86** (sections A–M + rejects)
**Verify:** `npm run check` · `npm test -- src/lib/parent/__tests__/launchWave2Complete.test.ts src/lib/gamification/__tests__/personaFunctionalMvp.test.ts` · `node scripts/launch-overnight-agents.mjs --wave 3a --dry-run`

---

## player-rl-functional (G-03) — 2026-06-14

**Branch:** `closure/player-rl-functional`  
**Status:** Done  
**Change:** Fixed `playerRlFunctional.test.ts` export drift — RL callables/triggers asserted on `functions-rl/index.js`; monolith DEPLOY-N guard confirms no duplicate RL exports; AdaptiveHomework goto handoff pattern updated to `goto('/player/workout')`.  
**Verify:** `npm test -- src/lib/gamification/__tests__/playerRlFunctional.test.ts` (19 passed) · `npm run check` (0 errors) · `npm run build`
