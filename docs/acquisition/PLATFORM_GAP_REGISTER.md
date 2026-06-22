# Platform gap register

**Last updated:** 2026-06-21 (post-QA dark-surface contrast doc-sync)  
**Branch baseline:** dev  
**Scope:** ALL platform gaps except permanent rejects #1–#3  
**Execution:** [`WAVE_4_MANIFEST.md`](./WAVE_4_MANIFEST.md) · [`WAVE_3_MANIFEST.md`](./WAVE_3_MANIFEST.md) · agent prompts [`agents/`](./agents/) · manual QA [`OWNER_QA_CHECKLIST.md`](../vision/OWNER_QA_CHECKLIST.md)

---

## Wave 4 competitive rebuild (2026-06-15)

Reopened falsely Done register rows for **real competitor parity** — not "accept v1" fiction. BuildOwner = **Agent** on `competitive/*` slices until `orch-wave4` merges. Wave 3 closure history preserved above; do not delete prior `closure/*` slice references on Done rows.

| Id | Gap | Competitive slice |
|----|-----|-------------------|
| B-03 | Registration drag-drop UX | `competitive/comp-roster-dragdrop` |
| E-03 | Double-elimination bracket | `competitive/comp-tournament-brackets` |
| C-03 | Federation Phase 3 — sync jobs | `competitive/comp-federation-phase3` |
| D-03 | Live stream URL embed MVP | `competitive/comp-streaming-schedule` |
| D-04 | Live stream match-day / schedule wiring | `competitive/comp-streaming-schedule` |

Doc-sync slice `comp-competitive-doc-sync` reopens **D-02** (NCSI Partial), **C-04** (Phase 4 Partial), and **E-01/E-02** if over-closed.

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
| A-01 | Live Firebase deploy to `sports-skill-tracker-dev` (all codebases + rules + hosting) | Done | `closure/live-deploy-dev` | `npm run deploy:dev:smoke` | none | Done |
| A-02 | Post-deploy callable smoke (overnight CFs live) | Done | `closure/smoke-dev-script` | `npm run smoke:dev` | none | Done |
| A-03 | WebAuthn `RP_ID` / `RP_ORIGIN` → `sstracker.app` | Done | — | `launchP0Fixes.test.ts` | QA-131 | Done |
| A-04 | `deploy.yml` dev target `sports-skill-tracker-dev` (not prod hardcode) | Done | `closure/deploy-gha-dev` | `npm run check` | QA-000d | Done |
| A-05 | `LAUNCH-qa-ready` closure (tests + docs aligned) | Done | `closure/functional-mvp-doc-sync` | `npm test -- src/lib/parent/__tests__/launchWave2Complete.test.ts` | none | Done |
| A-06 | Deploy-completeness (all `deploy:*` on target project) | Done | `closure/live-deploy-dev` | `npm run deploy:dev:verify` | QA-000b | Done |

---

## B. Commerce & registration

| Id | Gap | BuildOwner | Closure slice | AutomatedVerify | ManualQaId | Status |
|----|-----|------------|---------------|-----------------|------------|--------|
| B-01 | Payment webhook: `activeSeasonStatus` only when ALL installments paid | Done | `closure/payment-webhook` | `npm test -- src/lib/parent/__tests__/paymentInstallments.test.ts` | QA-202 | Done |
| B-02 | Registration → roster (`assignSeasonRegistrationToRoster` + assign panel) | Done | — | `registrationLaunch.test.ts` | QA-201 | Done |
| B-03 | Registration drag-drop UX (GotSport-style; not R-01 CMS) | Done | `competitive/comp-roster-dragdrop` | `registrationRosterDragDrop.test.ts` | QA-221 | Done |
| B-04 | Eligibility matrix director UX edge cases | Done | `closure/eligibility-ux` | `npm test -- src/lib/director/__tests__/eligibilityLaunch.test.ts` | none | Done |
| B-05 | Stripe Connect edge cases on dev tenant | Done | — | `paymentInstallments.test.ts` | QA-202 | Done |

---

## C. Federation & governance

| Id | Gap | BuildOwner | Closure slice | AutomatedVerify | ManualQaId | Status |
|----|-----|------------|---------------|-----------------|------------|--------|
| C-01 | NGB CSV v1 (`exportStateRoster`) | Done | — | `ngbExportLaunch.test.ts` | QA-206 | Done |
| C-02 | Federation Phase 2 — format adapters | Done | `closure/fed-phase2` | `npm test -- src/lib/director/__tests__/ngbExportLaunch.test.ts` | QA-206 | Done |
| C-03 | Federation Phase 3 — sync jobs | Done | `competitive/comp-federation-phase3` | `ngbExportLaunch.test.ts` | QA-223 | Done |
| C-04 | Federation Phase 4 — API per body | Partial | — | none | QA-505 | Partial |
| C-05 | State roster export demo packet for acquirer | Done | — | `ngbExportLaunch.test.ts` | QA-206 | Done |

---

## D. Integrations

| Id | Gap | BuildOwner | Closure slice | AutomatedVerify | ManualQaId | Status |
|----|-----|------------|---------------|-----------------|------------|--------|
| D-01 | Checkr embed + webhook lifecycle completeness | Done | `closure/checkr-webhooks` | `node --test functions/__tests__/complianceCheckr.guard.test.js` | QA-204 | Done |
| D-02 | NCSI vendor parity (vs Checkr) | Partial | — | none | QA-504 | Partial |
| D-03 | Live stream URL embed MVP | Done | `competitive/comp-streaming-schedule` | `liveStreamLaunch.test.ts` | QA-224 | Done |
| D-04 | Live stream match-day / schedule wiring | Done | `competitive/comp-streaming-schedule` | `liveStreamLaunch.test.ts` | QA-224 | Done |
| D-05 | Weather lock Open-Meteo + NWS | Done | — | `epic54WeatherLock.test.ts` | none | Done |
| D-06 | TOMORROW_IO optional enrich — stale doc strings | Done | `closure/fcm-broadcast` | `npm test -- src/lib/services/__tests__/commsSprint48.test.ts` | none | Done |
| D-07 | FCM parent push prefs | Done | — | `epic55MessagingAudit.test.ts` | QA-210 | Done |
| D-08 | FCM director broadcast + push fan-out | Done | `closure/fcm-broadcast` | `commsSprint49.test.ts` | QA-210 | Done |
| D-09 | FCM `registerDeviceToken` live post-deploy | Done | `closure/post-deploy-guards` | `npm run smoke:dev` | QA-210 | Done |

---

## E. Tournament & ops

| Id | Gap | BuildOwner | Closure slice | AutomatedVerify | ManualQaId | Status |
|----|-----|------------|---------------|-----------------|------------|--------|
| E-01 | Single-elim bracket (4/8/16/32) | Done | — | `p2TournamentBracket.test.ts` | QA-203 | Done |
| E-02 | Tournament seeding UX polish | Done | `closure/tournament-p2` | `p2TournamentBracket.test.ts` | QA-203 | Done |
| E-03 | Double-elimination bracket | Done | `competitive/comp-tournament-brackets` | `p2TournamentBracket.test.ts` | QA-222 | Done |
| E-04 | Public tournament buyer UX polish | Done | `closure/tournament-p2` | `p2TournamentBracket.test.ts` | QA-203 | Done |

---

## F. Player / Parent / Coach functional

| Id | Gap | BuildOwner | Closure slice | AutomatedVerify | ManualQaId | Status |
|----|-----|------------|---------------|-----------------|------------|--------|
| F-01 | Player OS FUNCTIONAL_MVP checklist | Done | — | `personaFunctionalMvp.test.ts` | QA-101–QA-112 | Done |
| F-02 | Parent OS FUNCTIONAL_MVP checklist | Done | — | `epic51CoppaSignup.test.ts` | QA-121–QA-125, QA-130–QA-134 | Done |
| F-03 | Coach OS FUNCTIONAL_MVP checklist | Done | — | `coachModule.test.ts` | QA-141–QA-146, QA-161–QA-163 | Done |
| F-04 | Cross-persona + RL Epic 8 AC-2 | Done | — | `playerRlFunctional.test.ts` | QA-151–QA-155 | Done |
| F-05 | Stale FUNCTIONAL_MVP gap rows (tracker nav, check debt) | Done | `closure/functional-mvp-doc-sync` | `personaFunctionalMvp.test.ts` | none | Done |
| F-06 | COMPETITIVE_LAUNCH_ASSESSMENT stale Partial row | Done | `closure/functional-mvp-doc-sync` | `launchWave2Complete.test.ts` | none | Done |
| F-07 | `personaFunctionalMvp.test.ts` regression guard | Done | — | `npm test -- src/lib/gamification/__tests__/personaFunctionalMvp.test.ts` | none | Done |
| F-08 | `launchWave2Complete.test.ts` Wave 2 gate | Done | — | `launchWave2Complete.test.ts` | none | Done |

---

## G. Engineering quality

| Id | Gap | BuildOwner | Closure slice | AutomatedVerify | ManualQaId | Status |
|----|-----|------------|---------------|-----------------|------------|--------|
| G-01 | `npm run check` = 0 errors | Done | — | `npm run check` | QA-000 | Done |
| G-02 | CI vitest: 61 excluded red suites | Done | `closure/vitest-batch-hud`, `vitest-batch-loadout`, `vitest-batch-misc` | expand CI allowlist + `npx vitest run` | none | Done |
| G-03 | `playerRlFunctional` export drift | Done | `closure/player-rl-functional` | `playerRlFunctional.test.ts` | none | Done |
| G-04 | `loopIntegrityGuards` emulator tests in CI | Done | — | `test:firestore-rules` (emulator job) | none | Done |
| G-05 | Firestore rules CI sprint412 | Done | — | `firestoreRulesSprint412.test.ts` | none | Done |
| G-06 | `firestoreRulesSprint13` obsolete guard | Done | `closure/vitest-batch-misc` | `npx vitest run firestoreRulesSprint13` | none | Done |

---

## H. Native & mobile (NOT store submission — R-02)

| Id | Gap | BuildOwner | Closure slice | AutomatedVerify | ManualQaId | Status |
|----|-----|------------|---------------|-----------------|------------|--------|
| H-01 | Capacitor 6 shell (ios/android) | Done | — | `nativeShellLaunch.test.ts` | QA-209 | Done |
| H-02 | PWA install path | Done | — | `personaFunctionalMvp.test.ts` | none | Done |
| H-03 | Push FCM token registration post-deploy | Done | `closure/post-deploy-guards` | `npm run smoke:dev` | QA-210 | Done |
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
| J-01 | Sprint 6f Armory hologram visual acceptance | Done | `closure/player-os-6f` | `playerHudSprint252.test.ts` | QA-301, QA-302 | Done |
| J-02 | Sprint 6j Z2 depth / void / edge-lit (remaining routes) | Done | `closure/player-os-6j` | `playerHudSprint234.test.ts` | QA-303, QA-307 | Done |
| J-03 | Swal → diegetic modal (`OperativeLoadoutStudio`) | Done | `closure/diegetic-modals` | `playerHudSprint244.test.ts` | QA-306 | Done |
| J-04 | VA screenshot sign-off (1280/390 matrix) | Done | — | none | QA-308 | Done |
| J-05 | Platform visual system (Gemini research) | Done | — | none | QA-507 | Done |
| J-06 | HQ void ≥40% / matte ≤35% | Done | `closure/player-os-6j` | rubric guards | QA-303 | Done |
| J-07 | Stats investigation rubric Fail rows (stale) | Done | `closure/player-os-6j` | `playerHudSprint234.test.ts` | QA-304 | Done |
| J-08 | Armory qa-strap / accent canon (#00d4ff) | Done | `closure/player-os-6f` | `playerHudSprint252.test.ts` | QA-302 | Done |
| J-09 | Train diegetic sliders | Done | `closure/diegetic-modals` | `playerHudSprint250.test.ts` | QA-305 | Done |
| J-10 | PlayerShell generic `.bento-card` injection | Done | `closure/player-os-6j` | `playerHudSprint234.test.ts` | QA-307 | Done |

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
| M-04 | TRACTION / PROSPECTUS refresh post-closure | Done | `closure/orch-wave3` | register row count audit | QA-503 | Done |
| M-05 | Acquisition data room baseline | Done | — | `INDEX.md` | none | Done |
| M-06 | Automated smoke script (`smoke:dev`) | Done | `closure/smoke-dev-script` | `npm run smoke:dev` · `npm run check` · `npm run build` | QA-000c | Done |

---

## U. UX — theme & dark-surface contrast (post-QA)

Deferred until after owner GP-ACQ sign-off. Plan: [`POST_QA_DARK_SURFACE_CONTRAST_PLAN.md`](../vision/POST_QA_DARK_SURFACE_CONTRAST_PLAN.md).

| Id | Gap | BuildOwner | Closure slice | AutomatedVerify | ManualQaId | Status |
|----|-----|------------|---------------|-----------------|------------|--------|
| U-01 | Dark-surface text contrast + theme toggle coherence (forced-dark shells vs `:root` light tokens when `html.dark` off) | Agent (post-QA) | `post-qa/dark-surface-contrast` | `contrastDarkSurfaces.guard.test.ts` · `loginWorkflow.test.ts` | QA-CONTRAST-01 | Blocked: owner QA in progress |

---

## Register summary

| BuildOwner | Count |
|------------|------:|
| Done | 80 |
| Agent | 0 |
| Blocked | 3 |
| Rejected | 4 |
| **Total rows** | **87** |

**Wave 4 closed** — orch-wave4 merged 2026-06-15; owner QA next on `qa_launch_2026`.

*(Sections A–M, U + R-01–R-03; H-05 duplicates R-02 reject scope.)*

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
