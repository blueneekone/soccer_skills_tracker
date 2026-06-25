# Functional MVP — Player · Parent · Coach

**Sprint:** **LAUNCH-functional-os**  
**Authority:** [`PRODUCT_SURFACE_REGISTRY.md`](PRODUCT_SURFACE_REGISTRY.md) · [`ROADMAP.md`](../ROADMAP.md) · [`PERSONA_ECOSYSTEM.md`](../PERSONA_ECOSYSTEM.md) · [`COMMS_HUB.md`](COMMS_HUB.md)  
**Launch bar:** functionality over pixels — visual research and avatar art are **TABLED** (see [`references/ui/research/README.md`](references/ui/research/README.md)).

**Owner QA sync 2026-05-22:** Phase 5 / exec cut steps 1–5 signed on [`OWNER_QA_CHECKLIST.md`](./OWNER_QA_CHECKLIST.md). GP-ACQ-06 (SafeSport messages) pending. Tier 1 checkboxes below remain human-owned — check only rows that map 1:1 to passed QA IDs if unambiguous; otherwise leave `[ ]` and cite OWNER_QA_CHECKLIST as authority.

**Platform vision:** SSTracker is a **youth sports OS for any team sport** — player training/gaming HUD, parent co-op, coach development loop, and club ops in one tenant. Sport semantics configure via `sports_configs/{sportId}`; QA tenant `qa_launch_2026` is **soccer-configured** for gold-path testing.

**Tier 1 (required):** Surfaces marked Tier 1 in [`PRODUCT_SURFACE_REGISTRY.md`](PRODUCT_SURFACE_REGISTRY.md) §1 — must pass owner QA or explicit waiver.  
**Tier 2 (optional):** Shipped routes marked Tier 2 — waivable without blocking functional sale.

Use checkboxes during QA; leave unchecked until human sign-off on a real tenant + test household.

---

## Player OS — Tier 1 (required)

- [x] Login → HQ loads missions, identity, telemetry (`/player/dashboard`)
- [x] Train → log workout → XP/streak updates on HQ (`/player/workout`)
- [x] **XP smoke — Train prescription volume** (armed mission or free log; confirm EST. YIELD before transmit matches post-log earned XP):
  - [x] 3 sets × 25 reps, **bilateral off** → **75** total reps sent to `logTrainingSession` (rep component in earned XP)
  - [x] 1 set × 10 reps, **bilateral on** → **20** total reps (10 × 2 sides)
  - [x] **30 min + RPE 5**, time-only coach prescription (**no** `repsPerSet`) — session still logs; XP from duration + RPE path (rep count 0 OK)
- [x] Coach-assigned bounty appears on HQ rail
- [x] Accept coach intent → **Start session** → Train shows **locked by coach** (read-only focus/drill/duration/RPE; session notes editable only)
- [x] Free log (no armed mission) — duration input max **120 min** (not 1440 slider)
- [ ] Stats telemetry loads (`/stats`)
- [ ] VPC/billing gates behave correctly

**Tier 1 routes:** `/player/dashboard`, `/player/workout`, `/stats`

## Player OS — Tier 2 (optional / waivable)

- [ ] Armory Studio SYNC IDENTITY (default portrait OK) — `/player/armory`
- [ ] Album/set bonus path (3.4) still works
- [ ] Tracker shell parity — `/player/tracker`
- [ ] Player settings diegetic path — `/player/settings`

**Settings paths:** Player OS shell nav uses **`/player/settings`** (PlayerSettingsPanel, diegetic strap). **`/settings`** remains the cross-role Settings Terminal (profile, notifications, billing, family unit) for staff and parents — reachable from enterprise shell or direct URL; not linked from PlayerShell bottom rail.

---

## Parent OS — Tier 1 (required)

- [x] Household + linked operatives (`/parent/household`)
- [x] VPC consent flow unlocks child training routes (`/parent/vpc`)
- [x] Dashboard co-op / schedule strip loads (`/parent/dashboard`)

**Tier 1 routes:** `/parent/household`, `/parent/vpc`, `/parent/dashboard`, `/messages`

## Parent OS — Tier 2 (optional / waivable)

- [ ] Co-op workout log counts toward child progress where configured (`/parent/log-workout`)
- [ ] Bounty terminal visible/functional
- [ ] Car Ride debrief when fixture pending
- [ ] Payments / push prefs (`/parent/payments`)

### Permanent VPC golden path

Production QA tenant: club **`qa_launch_2026`**, team **`qa_launch_2026_ppc`** (see `scripts/dev-tenant-reset.mjs --provision`). Three accounts only: `ecwaechtler@gmail.com` (super_admin), `ecwaechtler+parent@gmail.com`, `ecwaechtler+coach@gmail.com`.

1. **Admin bootstrap** — super_admin provisions club + team + parent/coach users.
2. **Parent sign-in** — magic link → passkey enrollment → **Household waiver** (`parentSignCoppaWaiver` / `households.coppaSigned`) on `/parent/household`.
3. **VPC ceremony per child** (`/parent/vpc`, `parentGrantVpcConsent`) — server **auto-finalizes** in the same request: `users.vpcStatus = verified`, `coppaStatus = granted` (minors), `consent_records` + `security_audit` written. No director step.
4. **Parent (optional)** — provision operative via household flow (`parentProvisionOperative`; child starts `vpcStatus: pending_parent` until step 3 completes).
5. **Child** — operative dispatch login → Train / HQ (no `/vpc-pending` block when consent is complete).
6. **Coach** — assign bounty → appears on player HQ → child trains and earns XP.

**Director approval is not part of SSTracker VPC.** `directorApproveVpc` remains a super_admin support override only. Director OS shows read-only consent audit (`VpcApprovalQueue` / `consent_records`) — no approve action required for operations.

---

## Coach OS — Tier 1 (required)

- [x] Squad/roster view loads (`/coach`)
- [x] Assign drill/bounty via Forge → appears on player HQ (`/coach/forge`)

**Tier 1 routes:** `/coach`, `/coach/forge`

## Coach OS — Tier 2 (optional / waivable)

- [ ] Intent Engine sub-drill picker loads **team + club** drills (not global catalog) — QA-143
- [ ] Team drill spatial designer saves to `teams/{teamId}/drills` — QA-144
- [ ] (Optional) **Share with director** on team drill — full promote workflow tracked as **LAUNCH-club-drill-promote**
- [ ] (Optional) Coach intent deploy may include `prescription` on `team_assignments` — `sets`, optional `repsPerSet` (omit for time-only), `bilateral` (doubles effective reps per side), optional `targetDurationMin` / `targetRpe` (1–10), `teamDrillId` / `clubDrillId`. Train locks prescription when armed from HQ handoff.
- [ ] Match-day / development routes reachable (`/coach/match-day`, `/coach/scouting`)
- [ ] Logistics compose + send to parents (`/coach/logistics`)
- [ ] War Room tactical board deep-link only (`/coach/tactical`) — not acquisition nav

---

## Cross-persona

- [x] Coach bounty → Player mission handoff (6k path)
- [ ] Parent co-op → child XP path
- [ ] No coach→minor unsupervised DM (**4.2 Done** — GP-ACQ-06 pending; verify on tenant)

### Coach → player loop — multi-day cadence & drill adaptation

**GP-ACQ-04c — Multi-day cadence QA (human)**

1. Coach deploys intent in Forge with **Sessions/week = 5** (or high-XP goal that auto-defaults to 5×/week).
2. Player **Accept** on HQ → **Start session** (Accept alone must not auto-arm Train).
3. Log one session → HQ shows **`1/5 this week`**, XP progress line, **Today's session complete ✓**; CTA **Next session tomorrow**.
4. Second log same UTC day → blocked on Train or rejected server-side (`Cadence limit: one session per day…`).
5. Next UTC day → second session credits; cadence count advances.

**Training adaptation (shipped path)**

Canonical drill resolution on Train / HQ handoff: **`coachMissionFlow.resolveAdaptiveDrill`** — team drill library → club drill → platform basics → `global_drills` heuristic fallback. RL policy callable may recommend a drill id when `abPercent > 0`; prescription volume from Forge is never overridden.

---

## RL — Adaptive homework & policy path (audit — 2026-06-01, Sprint RL-audit)

**Authority:** [`docs/RL_ADAPTIVE_WORKOUTS.md`](../RL_ADAPTIVE_WORKOUTS.md) · Epic 8 AC-2 in [`docs/EPIC_8_INTENT_TRIGGERS.md`](../EPIC_8_INTENT_TRIGGERS.md)

### What works today

| Surface | Status | Notes |
|---------|--------|-------|
| `AdaptiveHomework.svelte` | **Mounted on HQ** | Wired in `src/routes/(app)/player/dashboard/+page.svelte` below `OperativeHub` / `ActiveBounties` (full-width `bento-span-12`). Was orphaned before RL-audit. |
| `getAdaptiveWorkoutPolicy` | **Deployed callable** | Exported from `functions/index.js`; client calls via `httpsCallable` in `AdaptiveHomework`. |
| Heuristic homework | **Works without GCS model** | When `rl_policy_state/current` is missing, `frozen: true`, or `abPercent: 0`, CF returns `mode: 'heuristic'`; component still lists active `team_assignments` and picks a drill from `global_drills`. |
| Coach intents on HQ rail | **Parallel path** | `ActiveBounties` + Train `coachMissionFlow` handle `coach_intent` / `coach_homework` handoff; AdaptiveHomework is the Epic 8 intent + RL drill queue (not a duplicate of homework bounties). |
| Admin policy console | **Route exists** | `/admin/rl-policy` — `initRlPolicy`, A/B slider, freeze/rollback (super_admin). |
| Transition recording | **Separate CF trigger** | `rlOnWorkoutLogCreated` in `functions/index.js` (implementation: `functions/src/ml/transitionRecorder.js`). |

### `rl_policy_state/current` on dev

Expected cold-boot (no trained policy required for QA):

1. Sign in as **super_admin** → open **`/admin/rl-policy`** → click **Initialize policy (v1)** when policy state is missing (or call `initRlPolicy` callable).
2. Confirm Firestore **`rl_policy_state/current`** exists with `{ policyVersion: 1, abPercent: 0, frozen: false }` (`initRlPolicy` also mints v1 weights to GCS).
3. **Launch default:** leave **`abPercent` at 0** — all players stay on **heuristic**; no `rl_inference_log` or `rl_transitions` until ramp. See **[Rollout Playbook](../RL_ADAPTIVE_WORKOUTS.md#rollout-playbook-sprint-rl-ramp-ops)** in `RL_ADAPTIVE_WORKOUTS.md`.

If `rl_policy_state/current` is missing, `getAdaptiveWorkoutPolicy` returns heuristic (no error); `[ SUGGESTED BY AI ✦ ]` only appears when `mode === 'policy'` and `abPercent` rollout includes the player.

### Rollout ramp (operator)

When moving past launch default, follow the **[Rollout Playbook](../RL_ADAPTIVE_WORKOUTS.md#rollout-playbook-sprint-rl-ramp-ops)** — cold-boot → `abPercent: 5` → monitor inference/transitions → safety overrides → freeze/rollback if needed.

### `onWorkoutLogCreated` → transition chain

Two independent triggers on `workout_logs/{logId}`:

```
workout_logs/{logId} created
  ├─► onWorkoutLogCreated (profileTriggers) — rebuild public profile / XP history
  └─► rlOnWorkoutLogCreated (transitionRecorder.onWorkoutLogCreated)
        └─► if matching rl_inference_log within 24h prior
              └─► rl_transitions/{tid} { state, action, reward, nextState: null }
```

`onPhysioReportCreated` (`rlOnPhysioReportCreated`) patches `nextState` when `physio_self_reports/{uid}/daily/{date}` arrives (Morning Readiness in AdaptiveHomework).

Architecture diagram label `recordRlTransition` in [`RL_ADAPTIVE_WORKOUTS.md`](../RL_ADAPTIVE_WORKOUTS.md) maps to **transitionRecorder** logic above (no separate `recordRlTransition` export).

### Epic 8 AC-2 visibility (human QA)

- [x] `/player/dashboard` shows **Adaptive homework** band under mission rail
- [ ] Active `team_assignments` intent → attribute + drill (heuristic OK)
- [ ] With `abPercent > 0` and policy path: `[ SUGGESTED BY AI ✦ ]` pill on suggested drill
- [ ] Rollout playbook human QA: in-bucket vs out-of-bucket heuristic; prescription volume unchanged when policy shifts duration/RPE (see [Rollout Playbook](../RL_ADAPTIVE_WORKOUTS.md#rollout-playbook-sprint-rl-ramp-ops))

**Not chosen:** `/player/homework` redirect — HQ mount is smaller diff and matches AC-2 route.

### Transition pipeline smoke (human QA — Sprint RL-transition-guards)

Requires **`abPercent > 0`** and player in rollout cohort — at launch default (`abPercent: 0`) policy path is heuristic, **`rl_inference_log` is not written**, and **`rl_transitions` stay empty** (expected).

- [ ] After policy inference (HQ AdaptiveHomework or armed Train session), **log a workout within 24h** of that inference (`workout_logs` + `subjectiveRpe` on Player Train)
- [ ] Firestore **`rl_transitions/{tid}`** appears with **`nextState: null`**, linked via **`inferenceLogId`**
- [ ] Submit **Morning Readiness** (`physio_self_reports/{uid}/daily/{date}`) → same transition row gets **`nextState`** patched (`patchedAt` set)

**Regression guards:** `functions/__tests__/transitionRecorder.guard.test.js` · `playerRlFunctional.test.ts` (export wiring).

---

## Gaps (read-only audit — 2026-06-01)

Scan covered `/player/*` (dashboard, workout, armory, stats, settings, tracker), `/parent/*` (dashboard, household, vpc, log-workout, messages), and `/coach` subroutes. No broken imports or compile blockers found on these paths in this sprint. Project-wide **`npm run check` = 0 errors** (see [`CHECK_ZERO_STATUS.md`](../acquisition/CHECK_ZERO_STATUS.md)).

| Gap | Severity | Route / surface | Notes | Suggested sprint |
|-----|----------|-----------------|-------|------------------|
| Logistics nav → missing route | **Resolved (4.1 Done)** | `/coach/logistics` | Route mounts `MessagesTab` + `ParentAnnouncementCompose` (`safeSportBroadcast`). | — |
| Assignments not in coach sidebar | **Resolved (LAUNCH-nav)** | `/coach/forge` | Intent Engine in The Forge (`workspaceNav` coachLinks). | — |
| Parent Co-op hub off nav | **Resolved (LAUNCH-nav)** | `/parent/dashboard` | Co-op Command in parent sidebar; login still defaults to `/parent/household`. | — |
| Parent messages read-only | **Resolved (Epic 4.4 Done)** | `/messages` | Staff CC inbox + 4.11 household thread + **Parent Lounge** initiate/reply (`ParentLoungePanel`, `sendChannelMessage`); SafeSport-monitored. | — |
| Coach→minor DM policy | **Resolved (4.2 Done)** | Messaging stack | `sendCoachPlayerMessage` blocks minors; staff blocked in minor channels | — |
| Scouting mock data | **Resolved (LAUNCH-scouting)** | `/coach/scouting` | Wired to `player_lookup` recruit pipeline; mock prospects removed. | — |
| Match-day mock fallback | **Resolved (LAUNCH-functional-os)** | `/coach/match-day` | `MOCK_OPERATIVES` removed; roster is `player_lookup`-only with explicit empty state (select-team / no-roster copy). | — |
| Dual player settings paths | **Documented (LAUNCH-nav)** | `/player/settings` vs `/settings` | PlayerShell + `workspaceNav` athlete links → `/player/settings`; `/settings` = cross-role terminal (see Player OS section above). | — |
| Player tracker off shell nav | **Resolved (07-p2-tracker-nav)** | `/player/tracker` | Tracker in `PlayerShell` bottom rail + `workspaceNav` athlete links (`personaFunctionalMvp.test.ts`). | — |
| Enterprise player nav label | **Resolved (LAUNCH-nav)** | `workspaceNav` athlete links | Labels aligned to HQ / Train / Stats / Settings (PlayerShell parity). | — |

### Not gaps (expected / deferred)

- **Avatar PNG layers / Gemini bust ingest** — deferred post-launch (`LAUNCH-defer-avatar`, `3.6b+`).
- **Platform visual system from Gemini research** — read-only in [`references/ui/research/`](references/ui/research/README.md).
- **Epic 4.1 logistics compose** — **Done** (`/coach/logistics`, `commsSprint41.test.ts`).
- **Epic 4.2 SafeSport block** — **Done** (`commsSprint42.test.ts` — coach→minor blocked, `consentComms` enforced).
- **Epic 4.11 household threads** — **Done** (`commsSprint411.test.ts` — `/messages` household panel).

---

## Verify

```bash
npm test -- src/lib/gamification/__tests__/personaFunctionalMvp.test.ts
npm test -- playerRlFunctional.test.ts
npm run check
```
