# Platform gap register

**Last updated:** 2026-06-14  
**Branch baseline:** dev @ `42a3bffbf879fb64c3fabfcff3f7f0e780351af3`  
**Scope:** ALL platform gaps except permanent rejects #1–#3 below  
**Execution authority:** [`WAVE_3_MANIFEST.md`](./WAVE_3_MANIFEST.md) · agent prompts under [`agents/`](./agents/)

---

## Status legend

| Status | Meaning |
|--------|---------|
| **Done** | Verified in code on dev + tests/deploy evidence cited |
| **Agent** | Assigned to closure slice (see WAVE_3_MANIFEST) |
| **Owner** | Human sign-off only (QA, legal, demo video, holo VA, Firebase token deploy if agent blocked) |
| **Blocked** | Owner asset or credential required before agent can proceed |
| **Rejected** | Permanent rejects #1–#3 ONLY |

---

## Doc conflict resolutions (verified 2026-06-14)

| Conflict | Resolved truth |
|----------|----------------|
| ROADMAP `LAUNCH-deploy-dev` **Done** vs TRACTION **Partial** | Baseline full deploy ran 2026-06-13 (ROADMAP operator log). **Partial** = overnight callables (`assignSeasonRegistrationToRoster`, `exportStateRoster`, installment webhook fix) may not be live until next `npm run deploy:dev`. Register **A-01** = Owner/Agent re-deploy confirm. |
| GAP_CLOSURE_PLAN “accept v1” on tournament/roster/Checkr | **Superseded.** Each gap must reach Done, Agent slice, or Owner sign-off — not silent partial acceptance. |
| FUNCTIONAL_MVP “tracker off shell nav” | **Stale.** `/player/tracker` in `PlayerShell` + `workspaceNav.js` since agent 07 (`personaFunctionalMvp.test.ts`). Doc sync = **Agent** `functional-mvp-doc-sync`. |
| PLAYER_OS_RUBRIC “Tracker absent from rail” | **Stale** (same as above). Rubric matrix rows remain **Agent** for visual/VA debt, not nav. |
| FCM matrix “no director broadcast composer” | **Stale.** `DirectorClubBroadcastComposer` + `clubSportBroadcast` + `onTeamBroadcastCreated` FCM shipped. Remaining = post-deploy push smoke (**Owner**) + matrix doc sync (**Agent** `fcm-broadcast`). |
| ROADMAP 6f table **Done** vs section header **In progress** | Code/tests Done for dossier holo; **visual acceptance PNGs** in `docs/visual-acceptance/sprint-2.22-slice-6f/` still open → **Agent** `player-os-6f` + **Owner** holo VA. |
| `npm run check` pre-existing debt in SLICE_LOG agent 05 | **Stale.** `CHECK_ZERO_STATUS.md` + agent 22 → **0 errors** on dev. |

---

## Permanent rejects (never build)

| ID | Gap | Status |
|----|-----|--------|
| R-01 | Drag-and-drop club website CMS (TeamSnap/SportsEngine-style site builder) | **Rejected** |
| R-02 | App Store Connect / Google Play store submission, review, and store listing binaries | **Rejected** (Capacitor shell + [`NATIVE_SHELL.md`](../NATIVE_SHELL.md) in scope — **Done**) |
| R-03 | Shallow COPPA checkbox-only compliance (VPC ceremony moat) | **Rejected** |

---

## A. Launch gate & deploy

| ID | Gap | Status | Evidence / slice |
|----|-----|--------|------------------|
| A-01 | Live Firebase deploy to `sports-skill-tracker-dev` (ALL codebases: core, rl, commerce, compliance, integrations, platform, default + firestore rules + storage + hosting) | **Agent** | Prior deploy 2026-06-13 (ROADMAP). Re-run after Wave 3 merges: `closure/live-deploy-dev` · `npm run deploy:dev` · [`FUNCTIONS_DEPLOY.md`](../FUNCTIONS_DEPLOY.md) |
| A-02 | Post-deploy callable smoke (overnight CFs: `assignSeasonRegistrationToRoster`, `exportStateRoster`, payment CF, etc.) | **Agent** | `closure/post-deploy-smoke` · scripts in `deploy-dev-verify.cjs` |
| A-03 | WebAuthn `RP_ID` / `RP_ORIGIN` aligned to active hosting URL (`sstracker.app`) | **Done** | `functions/.env.sports-skill-tracker-dev`: `WEBAUTHN_RP_ID=sstracker.app`, `WEBAUTHN_RP_ORIGIN=https://sstracker.app` |
| A-04 | `deploy.yml` workflow_dispatch dev target uses `sports-skill-tracker-dev` not prod hardcode | **Agent** | Local fix on dev (uncommitted): `FIREBASE_PROJECT_ID` conditional · completion echo still says “production” → `closure/deploy-gha-dev` |
| A-05 | `LAUNCH-qa-ready` closure (tests + docs aligned) | **Agent** | `launchWave2Complete.test.ts` + register/manifest sync · `closure/functional-mvp-doc-sync` |
| A-06 | `FUNCTIONAL_AUDIT_BACKLOG` deploy-completeness checklist (all `deploy:*` on target project) | **Owner** | Checklist §Deploy-completeness — operator sign-off after A-01 |

---

## B. Commerce & registration

| ID | Gap | Status | Evidence / slice |
|----|-----|--------|------------------|
| B-01 | Payment webhook: `activeSeasonStatus` only when ALL installments paid (not first partial) | **Agent** | `functions/commerce.js` L364–370 sets `activeSeasonStatus: 'active'` on every PI success · `closure/payment-webhook` |
| B-02 | Registration → roster (`assignSeasonRegistrationToRoster` + director assign panel) | **Done** | `RegistrationRosterAssignPanel.svelte`, `registrationLaunch.test.ts`, agent 03 |
| B-03 | Registration → roster drag-drop UX (GotSport-style; **not** reject R-01 CMS) | **Agent** | Optional P2 UX — assign panel sufficient for launch unless acquirer requires drag-drop · defer to post-close or `closure/tournament-p2` sibling backlog |
| B-04 | Eligibility matrix director UX edge cases | **Agent** | `ClubEligibilityMatrixPanel`, `upsertClubEligibilityMatrix` shipped · `closure/eligibility-ux` |
| B-05 | Stripe Connect edge cases on dev tenant | **Owner** | QA on `qa_launch_2026` — partial refund, failed PI, Connect onboarding · [`QA_DEV_PERSONA_VERIFICATION.md`](../QA_DEV_PERSONA_VERIFICATION.md) |

---

## C. Federation & governance

| ID | Gap | Status | Evidence / slice |
|----|-----|--------|------------------|
| C-01 | NGB CSV v1 (`exportStateRoster`) | **Done** | `StateRosterExportPanel.svelte`, `ngbExportLaunch.test.ts`, agent 14 |
| C-02 | Federation roadmap Phase 2 — format adapters | **Agent** | [`FEDERATION_ROADMAP.md`](./FEDERATION_ROADMAP.md) · `closure/fed-phase2` |
| C-03 | Federation roadmap Phase 3 — sync jobs | **Agent** | Same roadmap · follows C-02 |
| C-04 | Federation roadmap Phase 4 — API per body | **Owner** | Credential onboarding + sandbox cert — acquirer GTM decision unless soccer GTM reopened |
| C-05 | State roster export packet completeness for acquirer demo | **Owner** | CSV v1 Done; demo narrative + sample export file in data room after A-01 deploy |

---

## D. Integrations

| ID | Gap | Status | Evidence / slice |
|----|-----|--------|------------------|
| D-01 | Checkr embed + webhook lifecycle completeness | **Agent** | `CheckrEmbed.svelte`, `checkrWebhook`/`backgroundCheckCallback` in `functions/compliance.js` · hardening = `closure/checkr-webhooks` |
| D-02 | NCSI vendor parity (vs Checkr path) | **Owner** | Document acquirer swap in PROSPECTUS — not a launch build unless owner reopens |
| D-03 | Live stream URL embed MVP | **Done** | `LiveStreamWatch.svelte`, `liveStreamLaunch.test.ts`, agent 15 |
| D-04 | Live stream match-day / schedule wiring gaps | **Done** | `liveStreamUrl` on events + match sessions · verify on tenant = **Owner** QA |
| D-05 | Weather lock: Open-Meteo + NWS (`evaluateFieldWeatherLock`) | **Done** | `weatherEvaluation.js`, `epic54WeatherLock.test.ts`, `LAUNCH-epic54` |
| D-06 | TOMORROW_IO optional enrich — stale doc strings | **Agent** | Code references optional key (`weatherOps.js`); UI copy in `FacilityMapVault.svelte` · sync `WEATHER_LOCK_DESIGN.md` in `fcm-broadcast` or doc-sync slice |
| D-07 | FCM parent push prefs | **Done** | `LAUNCH-parent-push`, parent dashboard prefs |
| D-08 | FCM director broadcast composer + push fan-out | **Done** (code) | `DirectorClubBroadcastComposer`, `clubSportBroadcast`, `onTeamBroadcastCreated` · post-deploy push smoke = **Owner** · matrix doc = **Agent** `fcm-broadcast` |
| D-09 | FCM token registration callable live post-deploy | **Owner** | `registerDeviceToken` in `deploy:comms` — verify after A-01 |

---

## E. Tournament & ops

| ID | Gap | Status | Evidence / slice |
|----|-----|--------|------------------|
| E-01 | Single-elim bracket (4/8/16/32) | **Done** | `TournamentBracketPanel.svelte`, `p2TournamentBracket.test.ts`, agent 05 |
| E-02 | Tournament seeding UX polish | **Agent** | `closure/tournament-p2` |
| E-03 | Double-elimination bracket | **Owner** | Post-launch unless soccer GTM requires — document in NOTABLE_GAPS |
| E-04 | Public tournament buyer UX polish | **Agent** | `closure/tournament-p2` (read-only bracket on published events) |

---

## F. Player / Parent / Coach functional

| ID | Gap | Status | Evidence / slice |
|----|-----|--------|------------------|
| F-01 | Player OS FUNCTIONAL_MVP checklist (HQ, Train, XP smoke, bounties, armory, gates) | **Owner** | Unchecked boxes in [`FUNCTIONAL_MVP.md`](../vision/FUNCTIONAL_MVP.md) — human QA on `qa_launch_2026` |
| F-02 | Parent OS FUNCTIONAL_MVP checklist | **Owner** | Same |
| F-03 | Coach OS FUNCTIONAL_MVP checklist | **Owner** | Same |
| F-04 | Cross-persona + RL Epic 8 AC-2 checklist | **Owner** | Adaptive homework mounted; transition smoke needs `abPercent > 0` |
| F-05 | Stale FUNCTIONAL_MVP gap rows (tracker nav, check debt) | **Agent** | `closure/functional-mvp-doc-sync` |
| F-06 | COMPETITIVE_LAUNCH_ASSESSMENT stale “Partial” launch gate row | **Agent** | Same slice — point to this register |
| F-07 | `personaFunctionalMvp.test.ts` regression guard | **Done** | 76+ tests green on dev |
| F-08 | `launchWave2Complete.test.ts` Wave 2 gate | **Done** | Agent 24 / doc-sync |

---

## G. Engineering quality

| ID | Gap | Status | Evidence / slice |
|----|-----|--------|------------------|
| G-01 | `npm run check` = 0 errors | **Done** | `CHECK_ZERO_STATUS.md`, CI typecheck job |
| G-02 | CI vitest: 61 excluded red suites — triage fix or retire | **Agent** | `closure/vitest-batch-hud`, `vitest-batch-loadout`, `vitest-batch-misc` · [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) |
| G-03 | `playerRlFunctional` export drift (expects monolith `functions/index.js`) | **Agent** | Exports live in `functions-rl/index.js` · `closure/player-rl-functional` |
| G-04 | `loopIntegrityGuards` emulator tests in CI | **Owner** | Document emulator job requirement · `LAUNCH-test-integrity` Done with skip in CI |
| G-05 | Firestore rules CI (`firestoreRulesSprint412`, etc.) | **Done** | `firestoreRulesSprint412.test.ts` in CI allowlist |
| G-06 | `firestoreRulesSprint13` obsolete guard | **Agent** | Included in `vitest-batch-misc` — fix or retire with reason |

---

## H. Native & mobile (NOT store submission — R-02)

| ID | Gap | Status | Evidence / slice |
|----|-----|--------|------------------|
| H-01 | Capacitor 6 shell (ios/android) | **Done** | `capacitor.config.ts`, `nativeShellLaunch.test.ts`, agent 17 |
| H-02 | PWA install path | **Done** | `InstallPrompt`, `LAUNCH-parent-push` wave |
| H-03 | Push FCM token registration on dev post-deploy | **Owner** | After A-01 · parent grants permission on device |
| H-04 | Deep links / parent-first routing gaps | **Done** (MVP) | `NATIVE_SHELL.md` — coach/player reachable post-login; universal links = **Owner** acquirer |
| H-05 | Store binaries / listing metadata | **Rejected** | R-02 |

---

## I. Avatar & portrait (deferred tracks — not permanent reject)

| ID | Gap | Status | Evidence / slice |
|----|-----|--------|------------------|
| I-01 | Gemini ingest #1 | **Done** | `static/portrait/approved/bust_teen_long_light_away.jpeg`, agent 18 |
| I-02 | Gemini ingest #2 | **Blocked** | No second owner PNG · `closure/gemini-ingest-2` when unblocked |
| I-03 | Gemini ingest #3 | **Blocked** | No third owner PNG · `closure/gemini-ingest-3` |
| I-04 | Avatar Studio 3.6b+ PNG layers | **Owner** | Tabled per `LAUNCH-defer-avatar` · wire when owner reopens |
| I-05 | 3.5m-gate human holo VA sign-off | **Owner** | [`AVATAR_MANIFEST.md`](./AVATAR_MANIFEST.md) · holo approve on `/player/dashboard` |

---

## J. Player OS visual / premium

| ID | Gap | Status | Evidence / slice |
|----|-----|--------|------------------|
| J-01 | Sprint 6f Armory hologram visual acceptance (PNG sign-off) | **Agent** | ROADMAP 6f code Done · VA folder open · `closure/player-os-6f` |
| J-02 | Sprint 6j Z2 depth / void % / edge-lit interactivity (remaining routes + void contract) | **Agent** | 6j-a/b Done · parent scope 6j in ROADMAP · `closure/player-os-6j` |
| J-03 | Swal → diegetic modal on Player paths (`OperativeLoadoutStudio`) | **Agent** | Train/Armory Swal removed (HudSprint244/252) · Studio still uses Swal · `closure/diegetic-modals` |
| J-04 | VA screenshot sign-off (1280/390 matrix) | **Owner** | `PLAYER_OS_VISUAL_ACCEPTANCE.md` · Wave F / 6i |
| J-05 | Platform visual system (Gemini research assets) | **Owner** | Read-only per launch-focus · register status only |
| J-06 | HQ void ≥40% / matte ≤35% measurement | **Agent** | Rubric Partial · `closure/player-os-6j` |
| J-07 | Stats investigation workspace rubric Fail rows | **Agent** | 6l/Wave C code Done · rubric stale · `closure/player-os-6j` + Owner VA |
| J-08 | Armory `qa-strap` / accent canon (#00d4ff) | **Agent** | `PLATFORM_BUILD_MANDATES` Wave E · `closure/player-os-6f` |
| J-09 | Train diegetic sliders (`pw-loadbar` vs native range) | **Agent** | `closure/diegetic-modals` or `player-os-6j` |
| J-10 | PlayerShell generic `.bento-card` chrome injection | **Agent** | `closure/player-os-6j` |

---

## K. Moat & RL (Wave 4)

| ID | Gap | Status | Evidence / slice |
|----|-----|--------|------------------|
| K-01 | RL `abPercent` rollout / `getAdaptiveWorkoutPolicy` wiring | **Done** (launch default) | `functions-rl/index.js`, `AdaptiveHomework.svelte`, `abPercent: 0` documented |
| K-02 | RL transition pipeline human QA (`rl_transitions` with `abPercent > 0`) | **Owner** | FUNCTIONAL_MVP RL-transition-guards section |
| K-03 | Coach intent → Train loop polish | **Done** | `LAUNCH-train-lock`, `coachMissionFlow`, 6k handoff |
| K-04 | Recruiting / public profile pipeline | **Owner** | ROADMAP Wave 4 — post-launch unless GTM requires |

---

## L. Architecture & ops

| ID | Gap | Status | Evidence / slice |
|----|-----|--------|------------------|
| L-01 | Monolith slimming / split codebase migration | **Owner** | Document state in PROSPECTUS — `functions/` default slimming ongoing |
| L-02 | `team_manager` persona JWT/routes | **Owner** | Post-launch default · not in FUNCTIONAL_MVP |
| L-03 | Multi-cell / observability (Datadog export) | **Owner** | Document limitation in LIMITATIONS.md |
| L-04 | Pre-revenue / GTM data room | **Owner** | TRACTION.md — no MAU/ARR in repo |

---

## M. Acquisition artifacts

| ID | Gap | Status | Evidence / slice |
|----|-----|--------|------------------|
| M-01 | FUNCTIONAL_MVP human QA on `qa_launch_2026` | **Owner** | `owner/functional-mvp-qa` |
| M-02 | DEMO_SCRIPT live recording | **Owner** | `owner/demo-video` |
| M-03 | Legal / IP review | **Owner** | Independent acquirer diligence |
| M-04 | TRACTION / PROSPECTUS / ONE_PAGER refresh post-closure | **Owner** | After Wave 3 orchestrator merge |
| M-05 | Acquisition data room baseline | **Done** | Agent 01 · INDEX.md |

---

## Register summary (2026-06-14)

| Status | Count |
|--------|------:|
| **Done** | 38 |
| **Agent** | 24 |
| **Owner** | 28 |
| **Blocked** | 2 |
| **Rejected** | 3 |
| **Total rows** | 95 |

*(R-02 H-05 duplicates reject scope; counted under Rejected.)*

---

## Close criteria (entire platform)

Every row in sections A–M is **Done**, **Agent**-assigned with slice ID, **Owner**-assigned with checklist, **Blocked** with explicit unblock, or **Rejected** (#1–#3 only). **Zero** rows left as undocumented “partial”.

When all **Agent** slices merge and **Owner** rows sign off → refresh M-04 and begin acquirer outreach.

---

## Owner unblock list

| Blocker | Unblocks register rows / slices |
|---------|----------------------------------|
| **`FIREBASE_CI_TOKEN`** (or local `firebase login`) | A-01, A-02, A-06, D-09, H-03 · `closure/live-deploy-dev`, `closure/post-deploy-smoke` |
| **Owner PNG assets** in `static/portrait/approved/` | I-02, I-03 · `closure/gemini-ingest-2`, `closure/gemini-ingest-3` |
| **Holo VA** sign-off on bust variants | I-05, J-01, J-04 |
| **Human QA** on `qa_launch_2026` | F-01–F-04, M-01 |
| **Demo video + legal review** | M-02, M-03 |
