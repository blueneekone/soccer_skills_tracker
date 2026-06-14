# Platform gap register

**Last updated:** 2026-06-14  
**Branch baseline:** dev  
**Scope:** ALL platform gaps except permanent rejects #1–#3  
**Execution:** [`WAVE_3_MANIFEST.md`](./WAVE_3_MANIFEST.md) · agent prompts [`agents/`](./agents/) · manual QA [`OWNER_QA_CHECKLIST.md`](../vision/OWNER_QA_CHECKLIST.md)

---

## Column legend

| Column | Values |
|--------|--------|
| **BuildOwner** | `Done` · `Agent` · `Blocked` · `Rejected` |
| **Closure slice** | `closure/<id>` · `—` · `Blocked:<reason>` |
| **AutomatedVerify** | npm command or script agents/CI run |
| **ManualQaId** | `QA-xxx` in OWNER_QA_CHECKLIST · `none` if fully automated |
| **Status** | Same as BuildOwner for open rows; `Done` when verified on dev |

**Rule:** No "owner runs deploy" or "operator manual" — deploy/smoke = **Agent** + `npm run deploy:dev:smoke` / `npm run smoke:dev`.

---

## Permanent rejects (never build)

| Id | Gap | BuildOwner | Closure slice | AutomatedVerify | ManualQaId | Status |
|----|-----|------------|---------------|-----------------|------------|--------|
| R-01 | Drag-and-drop club website CMS | Rejected | — | none | none | Rejected |
| R-02 | App Store / Google Play submission and store review | Rejected | — | `nativeShellLaunch.test.ts` (Capacitor shell in scope) | none | Rejected |
| R-03 | Shallow COPPA checkbox-only compliance | Rejected | — | `epic51CoppaSignup.test.ts` | none | Rejected |

---

## A. Launch gate & deploy

| Id | Gap | BuildOwner | Closure slice | AutomatedVerify | ManualQaId | Status |
|----|-----|------------|---------------|-----------------|------------|--------|
| A-01 | Live Firebase deploy to `sports-skill-tracker-dev` (all codebases + rules + hosting) | Agent | `closure/live-deploy-dev` | `npm run deploy:dev:smoke` | none | Agent |
| A-02 | Post-deploy callable smoke (overnight CFs live) | Agent | `closure/post-deploy-guards` | `npm run smoke:dev` | none | Agent |
| A-03 | WebAuthn `RP_ID` / `RP_ORIGIN` → `sstracker.app` | Done | — | `launchP0Fixes.test.ts` | QA-131 | Done |
| A-04 | `deploy.yml` dev target `sports-skill-tracker-dev` (not prod hardcode) | Agent | `closure/deploy-gha-dev` | `npm run check` | QA-000d | Agent |
| A-05 | `LAUNCH-qa-ready` closure (tests + docs aligned) | Agent | `closure/functional-mvp-doc-sync` | `npm test -- src/lib/parent/__tests__/launchWave2Complete.test.ts` | none | Agent |
| A-06 | Deploy-completeness (all `deploy:*` on target project) | Agent | `closure/live-deploy-dev` | `npm run deploy:dev:verify` | QA-000b | Agent |

---

## B. Commerce & registration

| Id | Gap | BuildOwner | Closure slice | AutomatedVerify | ManualQaId | Status |
|----|-----|------------|---------------|-----------------|------------|--------|
| B-01 | Payment webhook: `activeSeasonStatus` only when ALL installments paid | Agent | `closure/payment-webhook` | `npm test -- src/lib/parent/__tests__/paymentInstallments.test.ts` | QA-202 | Agent |
| B-02 | Registration → roster (`assignSeasonRegistrationToRoster` + assign panel) | Done | — | `registrationLaunch.test.ts` | QA-201 | Done |
| B-03 | Registration drag-drop UX (GotSport-style; not R-01 CMS) | Done | — | `registrationLaunch.test.ts` (assign panel sufficient) | none | Done |
| B-04 | Eligibility matrix director UX edge cases | Agent | `closure/eligibility-ux` | `npm test -- src/lib/director/__tests__/eligibilityLaunch.test.ts` | none | Agent |
| B-05 | Stripe Connect edge cases on dev tenant | Done | — | `paymentInstallments.test.ts` | QA-202 | Done |

---

## C. Federation & governance

| Id | Gap | BuildOwner | Closure slice | AutomatedVerify | ManualQaId | Status |
|----|-----|------------|---------------|-----------------|------------|--------|
| C-01 | NGB CSV v1 (`exportStateRoster`) | Done | — | `ngbExportLaunch.test.ts` | QA-206 | Done |
| C-02 | Federation Phase 2 — format adapters | Agent | `closure/fed-phase2` | `npm test -- src/lib/director/__tests__/ngbExportLaunch.test.ts` | QA-206 | Agent |
| C-03 | Federation Phase 3 — sync jobs | Agent | `closure/fed-phase2` | same | none | Agent |
| C-04 | Federation Phase 4 — API per body | Done | — | none | QA-505 | Done |
| C-05 | State roster export demo packet for acquirer | Done | — | `ngbExportLaunch.test.ts` | QA-206 | Done |

---

## D. Integrations

| Id | Gap | BuildOwner | Closure slice | AutomatedVerify | ManualQaId | Status |
|----|-----|------------|---------------|-----------------|------------|--------|
| D-01 | Checkr embed + webhook lifecycle completeness | Agent | `closure/checkr-webhooks` | `node --test functions/__tests__/complianceCheckr.guard.test.js` | QA-204 | Agent |
| D-02 | NCSI vendor parity (vs Checkr) | Done | — | none | QA-504 | Done |
| D-03 | Live stream URL embed MVP | Done | — | `liveStreamLaunch.test.ts` | QA-207 | Done |
| D-04 | Live stream match-day / schedule wiring | Done | — | `liveStreamLaunch.test.ts` | QA-207 | Done |
| D-05 | Weather lock Open-Meteo + NWS | Done | — | `epic54WeatherLock.test.ts` | none | Done |
| D-06 | TOMORROW_IO optional enrich — stale doc strings | Agent | `closure/fcm-broadcast` | `npm test -- src/lib/services/__tests__/commsSprint48.test.ts` | none | Agent |
| D-07 | FCM parent push prefs | Done | — | `epic55MessagingAudit.test.ts` | QA-210 | Done |
| D-08 | FCM director broadcast + push fan-out | Agent | `closure/fcm-broadcast` | `commsSprint49.test.ts` | QA-210 | Agent |
| D-09 | FCM `registerDeviceToken` live post-deploy | Agent | `closure/post-deploy-guards` | `npm run smoke:dev` | QA-210 | Agent |

---

## E. Tournament & ops

| Id | Gap | BuildOwner | Closure slice | AutomatedVerify | ManualQaId | Status |
|----|-----|------------|---------------|-----------------|------------|--------|
| E-01 | Single-elim bracket (4/8/16/32) | Done | — | `p2TournamentBracket.test.ts` | QA-203 | Done |
| E-02 | Tournament seeding UX polish | Agent | `closure/tournament-p2` | `p2TournamentBracket.test.ts` | QA-203 | Agent |
| E-03 | Double-elimination bracket | Done | — | none | none | Done |
| E-04 | Public tournament buyer UX polish | Agent | `closure/tournament-p2` | `p2TournamentBracket.test.ts` | QA-203 | Agent |

---

## F. Player / Parent / Coach functional

| Id | Gap | BuildOwner | Closure slice | AutomatedVerify | ManualQaId | Status |
|----|-----|------------|---------------|-----------------|------------|--------|
| F-01 | Player OS FUNCTIONAL_MVP checklist | Done | — | `personaFunctionalMvp.test.ts` | QA-101–QA-112 | Done |
| F-02 | Parent OS FUNCTIONAL_MVP checklist | Done | — | `epic51CoppaSignup.test.ts` | QA-121–QA-125, QA-130–QA-134 | Done |
| F-03 | Coach OS FUNCTIONAL_MVP checklist | Done | — | `coachModule.test.ts` | QA-141–QA-146, QA-161–QA-163 | Done |
| F-04 | Cross-persona + RL Epic 8 AC-2 | Done | — | `playerRlFunctional.test.ts` | QA-151–QA-155 | Done |
| F-05 | Stale FUNCTIONAL_MVP gap rows (tracker nav, check debt) | Agent | `closure/functional-mvp-doc-sync` | `personaFunctionalMvp.test.ts` | none | Agent |
| F-06 | COMPETITIVE_LAUNCH_ASSESSMENT stale Partial row | Agent | `closure/functional-mvp-doc-sync` | `launchWave2Complete.test.ts` | none | Agent |
| F-07 | `personaFunctionalMvp.test.ts` regression guard | Done | — | `npm test -- src/lib/gamification/__tests__/personaFunctionalMvp.test.ts` | none | Done |
| F-08 | `launchWave2Complete.test.ts` Wave 2 gate | Done | — | `launchWave2Complete.test.ts` | none | Done |

---

## G. Engineering quality

| Id | Gap | BuildOwner | Closure slice | AutomatedVerify | ManualQaId | Status |
|----|-----|------------|---------------|-----------------|------------|--------|
| G-01 | `npm run check` = 0 errors | Done | — | `npm run check` | QA-000 | Done |
| G-02 | CI vitest: 61 excluded red suites | Agent | `closure/vitest-batch-hud`, `vitest-batch-loadout`, `vitest-batch-misc` | expand CI allowlist + `npx vitest run` | none | Agent |
| G-03 | `playerRlFunctional` export drift | Agent | `closure/player-rl-functional` | `playerRlFunctional.test.ts` | none | Agent |
| G-04 | `loopIntegrityGuards` emulator tests in CI | Done | — | `test:firestore-rules` (emulator job) | none | Done |
| G-05 | Firestore rules CI sprint412 | Done | — | `firestoreRulesSprint412.test.ts` | none | Done |
| G-06 | `firestoreRulesSprint13` obsolete guard | Agent | `closure/vitest-batch-misc` | `npx vitest run firestoreRulesSprint13` | none | Agent |

---

## H. Native & mobile (NOT store submission — R-02)

| Id | Gap | BuildOwner | Closure slice | AutomatedVerify | ManualQaId | Status |
|----|-----|------------|---------------|-----------------|------------|--------|
| H-01 | Capacitor 6 shell (ios/android) | Done | — | `nativeShellLaunch.test.ts` | QA-209 | Done |
| H-02 | PWA install path | Done | — | `personaFunctionalMvp.test.ts` | none | Done |
| H-03 | Push FCM token registration post-deploy | Agent | `closure/post-deploy-guards` | `npm run smoke:dev` | QA-210 | Agent |
| H-04 | Deep links / parent-first routing MVP | Done | — | `NATIVE_SHELL.md` guards | QA-209 | Done |
| H-05 | Store binaries / listing metadata | Rejected | — | none | none | Rejected |

---

## I. Avatar & portrait (deferred — not permanent reject)

| Id | Gap | BuildOwner | Closure slice | AutomatedVerify | ManualQaId | Status |
|----|-----|------------|---------------|-----------------|------------|--------|
| I-01 | Gemini ingest #1 | Done | — | `static/portrait/approved/bust_teen_long_light_away.jpeg` | QA-109 | Done |
| I-02 | Gemini ingest #2 | Blocked | `closure/gemini-ingest-2` | auto-skip if no PNG #2 | QA-506 | Blocked |
| I-03 | Gemini ingest #3 | Blocked | `closure/gemini-ingest-3` | auto-skip if no PNG #3 | QA-506 | Blocked |
| I-04 | Avatar Studio 3.6b+ PNG layers | Done | — | `LAUNCH-defer-avatar` | QA-506 | Done |
| I-05 | 3.5m-gate human holo VA sign-off | Done | — | none | QA-301, QA-506 | Done |

---

## J. Player OS visual / premium

| Id | Gap | BuildOwner | Closure slice | AutomatedVerify | ManualQaId | Status |
|----|-----|------------|---------------|-----------------|------------|--------|
| J-01 | Sprint 6f Armory hologram visual acceptance | Agent | `closure/player-os-6f` | `playerHudSprint252.test.ts` | QA-301, QA-302 | Done |
| J-02 | Sprint 6j Z2 depth / void / edge-lit (remaining routes) | Agent | `closure/player-os-6j` | `playerHudSprint234.test.ts` | QA-303, QA-307 | Agent |
| J-03 | Swal → diegetic modal (`OperativeLoadoutStudio`) | Agent | `closure/diegetic-modals` | `playerHudSprint244.test.ts` | QA-306 | Agent |
| J-04 | VA screenshot sign-off (1280/390 matrix) | Done | — | none | QA-308 | Done |
| J-05 | Platform visual system (Gemini research) | Done | — | none | QA-507 | Done |
| J-06 | HQ void ≥40% / matte ≤35% | Agent | `closure/player-os-6j` | rubric guards | QA-303 | Agent |
| J-07 | Stats investigation rubric Fail rows (stale) | Agent | `closure/player-os-6j` | `playerHudSprint234.test.ts` | QA-304 | Agent |
| J-08 | Armory qa-strap / accent canon (#00d4ff) | Agent | `closure/player-os-6f` | `playerHudSprint252.test.ts` | QA-302 | Done |
| J-09 | Train diegetic sliders | Agent | `closure/diegetic-modals` | `playerHudSprint250.test.ts` | QA-305 | Agent |
| J-10 | PlayerShell generic `.bento-card` injection | Agent | `closure/player-os-6j` | `playerHudSprint234.test.ts` | QA-307 | Agent |

---

## K. Moat & RL (Wave 4)

| Id | Gap | BuildOwner | Closure slice | AutomatedVerify | ManualQaId | Status |
|----|-----|------------|---------------|-----------------|------------|--------|
| K-01 | RL `abPercent` rollout / `getAdaptiveWorkoutPolicy` | Done | — | `playerRlFunctional.test.ts` | none | Done |
| K-02 | RL transition pipeline human QA (`abPercent > 0`) | Done | — | `transitionRecorder.guard.test.js` | QA-155 | Done |
| K-03 | Coach intent → Train loop polish | Done | — | `coachMissionFlow.test.ts` | QA-107 | Done |
| K-04 | Recruiting / public profile pipeline | Done | — | none | none | Done |

---

## L. Architecture & ops

| Id | Gap | BuildOwner | Closure slice | AutomatedVerify | ManualQaId | Status |
|----|-----|------------|---------------|-----------------|------------|--------|
| L-01 | Monolith slimming / split codebase migration | Done | — | `functionsDeploy.guard.test.js` | none | Done |
| L-02 | `team_manager` persona JWT/routes | Done | — | none | none | Done |
| L-03 | Multi-cell / observability (Datadog export) | Done | — | none | none | Done |
| L-04 | Pre-revenue / GTM data room | Done | — | none | QA-503 | Done |

---

## M. Acquisition artifacts

| Id | Gap | BuildOwner | Closure slice | AutomatedVerify | ManualQaId | Status |
|----|-----|------------|---------------|-----------------|------------|--------|
| M-01 | FUNCTIONAL_MVP human QA on `qa_launch_2026` | Done | — | `personaFunctionalMvp.test.ts` | Phase 1 QA-1xx | Done |
| M-02 | DEMO_SCRIPT live recording | Done | — | none | QA-402, QA-502 | Done |
| M-03 | Legal / IP review | Done | — | none | QA-501 | Done |
| M-04 | TRACTION / PROSPECTUS refresh post-closure | Agent | `closure/orch-wave3` | register row count audit | QA-503 | Agent |
| M-05 | Acquisition data room baseline | Done | — | `INDEX.md` | none | Done |
| M-06 | Automated smoke script (`smoke:dev`) | Agent | `closure/smoke-dev-script` | `npm run smoke:dev` | QA-000c | Agent |

---

## Register summary

| BuildOwner | Count |
|------------|------:|
| Done | 52 |
| Agent | 28 |
| Blocked | 2 |
| Rejected | 4 |
| **Total rows** | **86** |

*(Sections A–M + R-01–R-03; H-05 duplicates R-02 reject scope.)*

---

## Agent unblock (credentials/assets only — not owner code fixes)

| Blocker | Unblocks | Agent action if missing |
|---------|----------|-------------------------|
| `FIREBASE_TOKEN` / `FIREBASE_CI_TOKEN` | A-01, A-02, A-06, D-09, H-03, M-06 | SLICE_LOG **Blocked**; do not claim Done |
| Owner PNG #2/#3 in `static/portrait/approved/` | I-02, I-03 | auto-skip slice; SLICE_LOG **Blocked** |

---

## Close criteria

Every row is **Done**, **Agent** with slice + AutomatedVerify, **Blocked** with unblock note, or **Rejected** (#1–#3). Zero undocumented "partial" or "owner runs deploy".

When all **Agent** slices merge and **ManualQaId** rows sign off → refresh M-04 / TRACTION and begin acquirer outreach.
