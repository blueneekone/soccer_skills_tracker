# Functional MVP — Player · Parent · Coach

**Sprint:** **LAUNCH-functional-os**  
**Authority:** [`ROADMAP.md`](../ROADMAP.md) · [`PERSONA_ECOSYSTEM.md`](../PERSONA_ECOSYSTEM.md) · [`COMMS_HUB.md`](COMMS_HUB.md)  
**Launch bar:** functionality over pixels — visual research and avatar art are **TABLED** (see [`references/ui/research/README.md`](references/ui/research/README.md)).

Use checkboxes during QA; leave unchecked until human sign-off on a real tenant + test household.

---

## Player OS

- [ ] Login → HQ loads missions, identity, telemetry
- [ ] Train → log workout → XP/streak updates on HQ
- [ ] Coach-assigned bounty appears on HQ rail
- [ ] Armory Studio SYNC IDENTITY (default portrait OK)
- [ ] Album/set bonus path (3.4) still works
- [ ] VPC/billing gates behave correctly

**Primary routes:** `/player/dashboard`, `/player/workout`, `/player/armory`, `/stats`, `/player/settings`

---

## Parent OS

- [ ] Household + linked operatives
- [ ] VPC consent flow unlocks child training routes
- [ ] Co-op workout log counts toward child progress where configured
- [ ] Bounty terminal visible/functional
- [ ] Car Ride debrief when fixture pending

**Primary routes:** `/parent/household`, `/parent/vpc`, `/parent/dashboard`, `/parent/log-workout`, `/messages`

---

## Coach OS

- [ ] Squad/roster view loads
- [ ] Assign drill/bounty → appears on player HQ
- [ ] Match-day / development routes reachable
- [ ] (After 4.1) Logistics compose + send to parents

**Primary routes:** `/coach`, `/coach/assignments`, `/coach/drills`, `/coach/match-day`, `/coach/forge`, `/coach/scouting`, `/coach/logistics`

---

## Cross-persona

- [ ] Coach bounty → Player mission handoff (6k path)
- [ ] Parent co-op → child XP path
- [ ] No coach→minor unsupervised DM (**4.2 Done** — verify on tenant)

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

1. Super-admin signs in → open `/admin/rl-policy` (or call `initRlPolicy` callable).
2. `initRlPolicy` mints v1 weights to GCS and creates `rl_policy_state/current` with `{ policyVersion: 1, abPercent: 0, frozen: false }`.
3. **Launch default:** leave `abPercent: 0` — all players stay on **heuristic**; transitions still accumulate once inference runs at `abPercent > 0`.
4. Ramp `abPercent` via console when ready (see RL doc cold-boot schedule).

If the doc is missing, `getAdaptiveWorkoutPolicy` returns heuristic (no error); `[ SUGGESTED BY AI ✦ ]` only appears when `mode === 'policy'` and `abPercent` rollout includes the player.

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

- [ ] `/player/dashboard` shows **Adaptive homework** band under mission rail
- [ ] Active `team_assignments` intent → attribute + drill (heuristic OK)
- [ ] With `abPercent > 0` and policy path: `[ SUGGESTED BY AI ✦ ]` pill on suggested drill

**Not chosen:** `/player/homework` redirect — HQ mount is smaller diff and matches AC-2 route.

---

## Gaps (read-only audit — 2026-06-01)

Scan covered `/player/*` (dashboard, workout, armory, stats, settings, tracker), `/parent/*` (dashboard, household, vpc, log-workout, messages), and `/coach` subroutes. No broken imports or compile blockers found on these paths in this sprint (project-wide `npm run check` still reports pre-existing TS debt outside this scope).

| Gap | Severity | Route / surface | Notes | Suggested sprint |
|-----|----------|-----------------|-------|------------------|
| Logistics nav → missing route | **Resolved (4.1 Done)** | `/coach/logistics` | Route mounts `MessagesTab` + `ParentAnnouncementCompose` (`safeSportBroadcast`). | — |
| Assignments not in coach sidebar | Discoverability | `/coach/assignments` | Intent deploy + `team_assignments` handoff is implemented; only linked from `/coach/drills`. | **LAUNCH-functional-os** (nav) or **4.1** |
| Parent Co-op hub off nav | Discoverability | `/parent/dashboard` | Bounty terminal, Co-op arena, Car Ride debrief live here; parent login + sidebar default to `/parent/household` and omit dashboard. | **LAUNCH-functional-os** (nav) |
| Parent messages read-only | Partial | `/messages` | Staff CC inbox + **4.11 household thread** compose; Parent Lounge reply UX remains | **Epic 4.4** |
| Coach→minor DM policy | **Resolved (4.2 Done)** | Messaging stack | `sendCoachPlayerMessage` blocks minors; staff blocked in minor channels | — |
| Scouting mock data | Stub | `/coach/scouting` | `MOCK_PROSPECTS` only — not wired to roster/recruit pipeline. | Post-MVP scouting |
| Match-day mock fallback | Degraded empty state | `/coach/match-day` | Uses `MOCK_OPERATIVES` when roster fetch empty; works with real roster. | **LAUNCH-functional-os** (empty-state copy) |
| Dual player settings paths | Nav inconsistency | `/player/settings` vs `/settings` | PlayerShell uses `/player/settings`; enterprise `workspaceNav` athlete links use `/settings` (broader role terminal). Both load; confusing for QA. | **LAUNCH-functional-os** (nav align) |
| Player tracker off shell nav | Discoverability | `/player/tracker` | Route renders; not in PlayerShell bottom nav (HQ/Stats/Train/Armory/Settings only). | Low — document or add link |
| Enterprise player nav label | Copy drift | `workspaceNav` athlete links | Sidebar label "Command Center" → `/player/workout`; HQ is `/player/dashboard` in PlayerShell. | **LAUNCH-functional-os** (copy) |

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
