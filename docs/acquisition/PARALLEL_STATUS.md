# Parallel overnight agents — status

**Last updated:** 2026-06-13 · **Poll cycle:** closed · **Orchestrator:** agent 21-orch  
**Phase 1 + Phase 2:** complete · merged to `dev` @ `7adb90ae`  
**Next action:** [`GAP_CLOSURE_PLAN.md`](./GAP_CLOSURE_PLAN.md) slice 1 (owner live deploy)

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
| 24-deploy-verify | overnight/deploy-verify | **Partial** | deploy:dev scripts green; live Firebase = owner token |

**Summary:** [`PARALLEL_SUMMARY.md`](PARALLEL_SUMMARY.md) · **Slice log:** [`SLICE_LOG.md`](SLICE_LOG.md) · **Gap backlog:** [`GAP_CLOSURE_PLAN.md`](GAP_CLOSURE_PLAN.md)
