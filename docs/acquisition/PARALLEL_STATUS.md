# Parallel overnight agents — status

**Last updated:** 2026-06-15 · orch-wave4 merge @ competitive/orch-wave4  
**Poll cycle:** Wave 4 closed · **Orchestrator:** orch-wave4  
**Wave 4 baseline:** merged to `dev` (2026-06-15)  
**Next action:** Owner QA — [`OWNER_QA_CHECKLIST.md`](../vision/OWNER_QA_CHECKLIST.md) Phase 0–4 on `qa_launch_2026`

---

## Wave 3A — closure (2026-06-14)

| ID | Branch | Status | Register gaps |
|----|--------|--------|---------------|
| functional-mvp-doc-sync | closure/functional-mvp-doc-sync | **Done** | F-05, F-06, A-05 |
| deploy-gha-dev | closure/deploy-gha-dev | **Done** | A-04 |
| payment-webhook | closure/payment-webhook | **Done** | B-01 |
| eligibility-ux | closure/eligibility-ux | **Done** | B-04 |
| fcm-broadcast | closure/fcm-broadcast | **Done** | D-06, D-08 |
| checkr-webhooks | closure/checkr-webhooks | **Done** | D-01 |
| fed-phase2 | closure/fed-phase2 | **Done** | C-02, C-03 |
| tournament-p2 | closure/tournament-p2 | **Done** | E-02, E-04 |
| player-rl-functional | closure/player-rl-functional | **Done** | G-03 |
| vitest-batch-misc | closure/vitest-batch-misc | **Done** | G-02, G-06 |
| vitest-batch-loadout | closure/vitest-batch-loadout | **Done** | G-02 |
| vitest-batch-hud | closure/vitest-batch-hud | **Done** | G-02 |
| diegetic-modals | closure/diegetic-modals | **Done** | J-03, J-09 |
| player-os-6f | closure/player-os-6f | **Done** | J-01, J-08 |
| player-os-6j | closure/player-os-6j | **Done** | J-02, J-06, J-07, J-10 |
| smoke-dev-script | closure/smoke-dev-script | **Done** | M-06, A-02 |
| orch-wave3 | closure/orch-wave3 | **Done** | M-04 (merge + doc sync) |

## Wave 3B — deploy closure (2026-06-14)

| ID | Branch | Status | Register gaps |
|----|--------|--------|---------------|
| post-deploy-guards | closure/post-deploy-guards | **Done** | D-09, H-03 |
| live-deploy-dev | closure/live-deploy-dev | **Done** | A-01, A-06 |

**Wave 3C (blocked):** `gemini-ingest-2`, `gemini-ingest-3` — no owner PNG #2/#3

## Wave 4 — competitive parity (2026-06-15)

| ID | Branch | Status | Register gaps |
|----|--------|--------|---------------|
| comp-competitive-doc-sync | competitive/comp-competitive-doc-sync | **Done** | D-02/C-04 Partial truth |
| comp-roster-dragdrop | competitive/comp-roster-dragdrop | **Done** | B-03 |
| comp-tournament-brackets | competitive/comp-tournament-brackets | **Done** | E-03 |
| comp-checkr-lifecycle | competitive/comp-checkr-lifecycle | **Done** | D-01 extend |
| comp-federation-phase3 | competitive/comp-federation-phase3 | **Done** | C-03 |
| comp-streaming-schedule | competitive/comp-streaming-schedule | **Done** | D-03, D-04 |
| comp-capacitor-polish | competitive/comp-capacitor-polish | **Skipped** | nativeShellLaunch tests green on dev |
| orch-wave4 | competitive/orch-wave4 | **Done** | merge + register sync |

---

## Overnight agents 01–24 (2026-06-13)

| ID | Branch | Status | Owner paths |
|----|--------|--------|-------------|
| 01-docs-dataroom | overnight/docs-dataroom | **Done** | docs/acquisition/** |
| 02-launch-p0 | overnight/launch-p0 | **Done** | parent/household, vpc-pending, scripts/dev-tenant-reset.mjs |
| 03-p2-reg-roster | overnight/p2-reg-roster | **Done** | registration→roster assign UX |
| 04-p2-payments | overnight/p2-payments | **Done** | src/lib/parent/** |
| 05-p2-tournament | overnight/p2-tournament | **Done** | tournament bracket polish |
| 06-p2-checkr | overnight/p2-checkr | **Done** | Checkr embed polish |
| 07-p2-tracker-nav | overnight/p2-tracker-nav | **Done** | PlayerShell nav /player/tracker |
| 08-check-routes | overnight/check-routes | **Done** | src/routes/** (200→0) |
| 09-check-components | overnight/check-components | **Done** | src/lib/components/** (164→0) |
| 10-check-stores | overnight/check-stores | **Done** | src/lib/stores/**, src/lib/auth/** |
| 11-check-coach-dir | overnight/check-coach-dir | **Done** | coach/**, director/**, compliance/** |
| 12-check-parent-admin | overnight/check-parent-admin | **Done** | parent/**, admin/** (7→0) |
| 13-check-player | overnight/check-player | **Done** | player/**, gamification/**, hud/** |
| 14-fed-ngb | overnight/fed-ngb | **Done** | exportStateRoster, StateRosterExportPanel, FEDERATION_ROADMAP |
| 15-live-stream | overnight/live-stream | **Done** | liveStreamUrl + embed MVP |
| 16-marketing-acq | overnight/marketing-acq | **Done** | /acquisition route |
| 17-native-shell | overnight/native-shell | **Done** | Capacitor ios/android, docs/NATIVE_SHELL.md |
| 18-gemini-ingest-1 | overnight/gemini-ingest-1 | **Done** | bust_teen_long_light_away.jpeg wired |
| 19-gemini-ingest-2 | overnight/gemini-ingest-2 | **Blocked** | no second owner-approved PNG |
| 20-gemini-ingest-3 | overnight/gemini-ingest-3 | **Blocked** | no third owner-approved asset |
| 21-orch | overnight/orch | **Done** | SLICE_LOG poll, PARALLEL_SUMMARY, ROADMAP sync |
| 22-check-final | overnight/check-final | **Done** | full repo check=0 + CI typecheck gate |
| 23-vitest-ci | overnight/vitest-ci | **Done** | CI vitest allowlist 129 green files |
| 24-deploy-verify | overnight/deploy-verify | **Partial** | deploy:dev scripts green; live Firebase = Wave 3B |

**Summary:** [`PARALLEL_SUMMARY.md`](./PARALLEL_SUMMARY.md) · **Slice log:** [`SLICE_LOG.md`](./SLICE_LOG.md) · **Gap register:** [`PLATFORM_GAP_REGISTER.md`](./PLATFORM_GAP_REGISTER.md)
