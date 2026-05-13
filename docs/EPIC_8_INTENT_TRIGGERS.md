# Epic 8 — Intent-Based Homework Triggers: QA Checklist

**Phase**: Phase 3 – Adult EQ Interceptors  
**Epic**: 8 – Intent-Based Homework Triggers  
**Status**: Implemented (see `MASTER_BUILD_ROADMAP.md`)  
**Linked Plan**: `.cursor/plans/epic_8_intent_triggers_cc00e612.plan.md`

---

## Acceptance Criteria Matrix

### AC-1: Coach Deploys a Scoped Intent

- [ ] Sign in as `coach` role on a team with ≥ 4 players
- [ ] Navigate to `/coach/assignments`
- [ ] Verify page loads with the `[ INTENT ENGINE ]` header and fixed HUD panel
- [ ] Select attribute (e.g. "Pace"), set Required XP to 300, Duration 14 days
- [ ] Set Scope to **OPERATIVES** and select exactly 4 players from roster
- [ ] Click **[ DEPLOY TACTICAL INTENT ]**
- [ ] Confirm `deployPhase` transitions: idle → saving → success
- [ ] Inspect Firestore `team_assignments/{intentId}`:
  - `scope === 'players'`, `targetUids.length === 4`
  - `status === 'active'`, `intentVersion === 1`, `priority === 100`
  - `tenantId` and `clubId` match the coach's JWT claims
  - `expiresAt` ≈ now + 14 days
- [ ] Inspect `security_audit` for row with `action === 'secureDeployIntent'`
- [ ] Verify the intent card appears in IntentArena immediately via onSnapshot

### AC-2: Individualized Drill via RL

- [ ] Sign in as one of the 4 targeted players
- [ ] Open `/player/dashboard`
- [ ] Verify `AdaptiveHomework` shows a drill suggestion with `[ SUGGESTED BY AI ✦ ]`
- [ ] Sign in as a **different** targeted player
- [ ] Confirm the suggested drill is different (may require different XP state vectors)
- [ ] Sign in as a **non-targeted player** on the same team
- [ ] Confirm they do NOT see the pace intent (scope='players' filter)

### AC-3: XP Fulfillment → Lifecycle Trigger (60s SLA)

- [ ] Submit a workout rep via `submitWorkoutRep` that will grant XP in `targetAttributeId`
- [ ] Or: directly write `users/{email}.xpByAttribute.pace = requiredXp` via Admin SDK
- [ ] Within 60 seconds (trigger latency), verify:
  - `team_assignments/{intentId}.fulfilledByUids` includes the player's UID
  - `team_assignments/{intentId}.updatedAt` updated
- [ ] When ALL 4 players fulfilled: verify `status === 'fulfilled'`
- [ ] Confirm IntentArena heat-map updates (green fulfilled pip)

### AC-4: Intent Expiry (Scheduled Function)

- [ ] Set an intent's `expiresAt` to 1 minute in the future (Admin SDK direct write)
- [ ] Wait ≤ 60 minutes for `scheduledExpireIntents` (or trigger manually via emulator)
- [ ] Confirm `status === 'expired'`
- [ ] Confirm player no longer sees this intent in `AdaptiveHomework` (status filter)
- [ ] Confirm it disappears from IntentArena onSnapshot

### AC-5: Cancel Intent

- [ ] Open `/coach/assignments` as coach
- [ ] Click **CANCEL** on an active intent card
- [ ] Confirm `secureCancelIntent` callable is invoked
- [ ] Verify Firestore: `status === 'cancelled'`, `lastModifiedByUid` = coach UID
- [ ] Verify `security_audit` row: `action === 'secureCancelIntent'`
- [ ] Confirm card disappears from IntentArena immediately

### AC-6: Extend Intent

- [ ] Click **EXTEND +7d** on an active intent card
- [ ] Verify `secureExtendIntent` callable invoked with `additionalDays: 7`
- [ ] Confirm Firestore `expiresAt` advanced by 7 days
- [ ] Confirm IntentArena card shows updated `daysRemaining`

### AC-7: Legacy Mission Deploy Removed

- [ ] Navigate to `/coach/drills`
- [ ] Confirm there is NO "Mission deploy" tab (only: Intent deploy link, Drill library, Spatial designer, Team schedule)
- [ ] Confirm "Intent deploy" link navigates to `/coach/assignments`
- [ ] Confirm `MISSION_DRILLS`, `deployMission()`, `assigned_missions` writes are absent from source
- [ ] Run `rg "assigned_missions" src/routes/` — must return 0 results

### AC-8: RL Policy Frozen → Heuristic Fallback

- [ ] Set `rl_policy_state/global.frozen = true` via Admin SDK
- [ ] Open AdaptiveHomework as a targeted player
- [ ] Verify the drill suggestion uses `policyResult.mode === 'heuristic'`
- [ ] Confirm `[ SUGGESTED BY AI ✦ ]` label still appears (graceful fallback)
- [ ] Verify `team_assignments` intent xp tracking still works (lifecycle is independent of RL)

### AC-9: Multi-Intent Queue Pill

- [ ] Deploy 3 active intents for a player (different attributes)
- [ ] Open AdaptiveHomework
- [ ] Confirm **+2 QUEUED** pill is shown in the header
- [ ] Top intent (lowest `priority` number) is passed to `getAdaptiveWorkoutPolicy`
- [ ] Player workout page `/player/workout` shows 3 "ACTIVE TACTICAL INTENTS" cards

### AC-10: Strict Tenant Isolation

- [ ] Attempt to deploy an intent with a `tenantId` that does not match JWT `clubId`
- [ ] Confirm Cloud Function returns `permission-denied`
- [ ] Attempt to read `team_assignments` for a different team as a player
- [ ] Confirm Firestore rules deny the read

### AC-11: Firestore Rules & Indexes

- [ ] Run `firebase firestore:rules:validate` — confirm no errors
- [ ] Run `firebase deploy --only firestore:indexes` — confirm all 3 new indexes deploy
- [ ] Test player `list` query: `where('teamId', '==', myTeamId).where('status', '==', 'active').orderBy('priority', 'asc')` — must succeed without missing index error

---

## Unit Test Locations

| Test file | Coverage |
|---|---|
| `functions/src/domains/__tests__/intentOps.test.js` | `secureDeployIntent`, `secureCancelIntent` input validation, audit trail, cross-tenant guard |
| `src/lib/services/__tests__/dopamine.test.ts` | (pre-existing) |

### Running the functions unit tests

```bash
cd functions
npx jest src/domains/__tests__/intentOps.test.js --verbose
```

> Requires Jest config. Add to `functions/package.json`:
> ```json
> "jest": {
>   "testEnvironment": "node",
>   "testMatch": ["**/src/domains/__tests__/**/*.test.js"]
> }
> ```

---

## Data Flow Quick Reference

```
Coach (IntentHUD) → secureDeployIntent CF
  → team_assignments/{intentId} (status: 'active')

Player opens dashboard → AdaptiveHomework.svelte
  → onSnapshot(team_assignments where status=active + in scope)
  → sorts by priority asc → passes [0] to getAdaptiveWorkoutPolicy
  → RL resolves recommendedDrillId → shows drill + queue pill

Player completes workout → XP written to users/{uid}.xpByAttribute
  → onUserXpUpdateIntentLifecycle trigger fires
  → if xp >= requiredXp → uid appended to fulfilledByUids
  → if all targets fulfilled → status = 'fulfilled'

scheduledExpireIntents (hourly) → expired intents → status = 'expired'
```

---

## Out of Scope (Deferred)

- Auto-chained intent queues ("on fulfil, issue next")
- Per-player intent overrides beyond targetUids[] (no per-uid requiredXp deltas)
- CV biomechanics gating (feature-flagged under `feature_cv_bounty_enabled`)
- "Car Ride Home" Protocol (Epic 8 deliverable 2 — separate plan)
