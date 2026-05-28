# RL Adaptive Workout Engine

**Phase 3, Epic 4 (deliverable 2)**

> A Double DQN policy (TF.js, Cloud Functions) that prescribes per-player `(drill, volume, intensity)` actions trained nightly from subjective post-workout feedback and behavioral signals. Backed by a safety constraint layer, a soft A/B rollout switch, and a super-admin console at `/admin/rl-policy`.

---

## Architecture Diagram

```
Player Dashboard
      │ completes session
      ▼
logTrainingSession CF ──► workout_logs/{logId}
                                    │
                        onWorkoutLogCreated trigger
                                    │
                                    ▼
                         recordRlTransition CF ──► rl_transitions/{tid}
                                                    ▲
                         onPhysioReportCreated ──── physio_self_reports/{uid}/daily/{date}
                                    │                  (MorningReadinessCard)
                                    │
trainRlPolicyNightly (04:00 UTC) ◄──┘
          │
          ├─► TF.js Trainer (prioritised replay, Huber loss)
          │       │
          │       ├── validation gate (KL ≤ 0.5, meanQError ≤ 1.5x)
          │       │
          │       ├── PASS ─► GCS: rl_models/policy/v{n}/
          │       │               rl_policy_state/current (version bump)
          │       └── FAIL ─► rl_training_runs/{date} (rejected)
          │
Player Dashboard ──► getAdaptiveWorkoutPolicy CF
                          │
                          ├─ buildStateVector(uid)
                          ├─ enumerateCandidates(sportId, ageBand)
                          ├─ PolicyModel.loadFromGcs(version) [cached]
                          ├─ ε-greedy action selection
                          ├─ applySafetyConstraints(...)
                          ├─ rl_inference_log/{logId}
                          └─► { recommendedDrillId, durationMinutes, targetRpe }

Super-Admin ──► /admin/rl-policy
                    ├─ setPolicyAbPercent
                    ├─ freezeRlPolicy
                    └─ rollbackRlPolicy
```

---

## Architectural Decisions (locked)

| Decision | Choice |
|---|---|
| Signals | Subjective + behavioral only (RPE, soreness, sleep, mood, adherence) |
| Algorithm | Double DQN + prioritized experience replay (TF.js) |
| Training | Nightly Cloud Function (04:00 UTC, `us-east1`, 2GiB, 540s timeout) |
| Inference | Server-only, `getAdaptiveWorkoutPolicy` onCall, `minInstances: 0` (alpha scale-to-zero) |
| Safety | Hard constraint layer — age-band caps, overtraining override, re-onboarding |
| Rollout | `rl_policy_state/current.abPercent` (0–100); `frozen: true` = full kill-switch |
| PII | State vector is pure numerics only. No name, email, DOB, location |

---

## State Vector Specification

The `buildStateVector(uid)` function produces a **50-element Float32 vector** with all values normalised to approximately [0, 1].

| Index | Feature Name | Normalisation | Source |
|---|---|---|---|
| 0 | `rollingRpe7d` | ÷ 10 | `workout_logs` (last 7 days) |
| 1 | `rollingRpe28d` | ÷ 10 | `workout_logs` (last 28 days) |
| 2 | `rollingSoreness3d` | ÷ 5 | `physio_self_reports` (last 3 reports) |
| 3 | `lastNightSleep` | ÷ 12 | Latest `physio_self_reports` |
| 4 | `mood7dAvg` | ÷ 5 | `physio_self_reports` (last 7 days) |
| 5 | `streakDays` | ÷ 60, cap 1.0 | `player_stats.streak_days` |
| 6 | `sessionsLast7` | ÷ 7 | `workout_logs` (last 7 days count) |
| 7 | `daysSinceLastWorkout` | ÷ 30, cap 1.0 | Latest `workout_logs.timestamp` |
| 8 | `acuteLoad` | ÷ 2000 | Σ(RPE × durationMin) 7 days |
| 9 | `chronicLoad` | ÷ 8000 | Σ(RPE × durationMin) 28 days |
| 10 | `acwr` | (acute/chronic) ÷ 2.0 | Derived |
| 11 | `completedAssignments30d` | ratio | `assignments` |
| 12 | `trainingAgeDays` | ÷ 365 | Days since first log |
| 13–18 | `coachIntentAttrIdx{0-5}` | onehot | `team_assignments.targetAttributeId` |
| 19 | `coachIntentXpNorm` | ÷ 500, cap 1.0 | `team_assignments.requiredXp` |
| 20 | `ageBandUnder13` | 0/1 | `player_stats.ageBand` |
| 21 | `ageBandTeen13to16` | 0/1 | `player_stats.ageBand` |
| 22 | `ageBandAdult` | 0/1 | `player_stats.ageBand` |
| 23–28 | `attrRating{0-5}` | ÷ 9900 | `player_stats.xpByAttribute` |
| 29 | `lastSessionDuration` | ÷ 90 | Latest `workout_logs.duration` |
| 30 | `lastSessionRpe` | ÷ 10 | Latest `workout_logs.subjectiveRpe` |
| 31 | `lastSessionSoreness` | ÷ 5 | Latest `workout_logs.soreness` |
| 32–38 | `weekday{Mon-Sun}` | onehot | UTC day of week |
| 39 | `sessionTimeAm` | 0/1 | UTC hour < 12 |
| 40 | `hasActiveAssignment` | 0/1 | `assignments` |
| 41 | `assignmentDaysRemaining` | ÷ 7, cap 1.0 | `assignments.dueAt` |
| 42 | `restingFeel7dAvg` | ÷ 5 | `physio_self_reports.restingFeel` |
| 43 | `gritBonusEarned30d` | ÷ 10, cap 1.0 | `grit_awards` |
| 44 | `totalXpNorm` | ÷ 50000, cap 1.0 | `player_stats.total_xp` |
| 45–49 | `reserved{45-49}` | 0 | Future signals (wearables, etc.) |

---

## Action Space

Each action is a triple: `(drillId, volumeBucket, intensityBucket)`.

| Dimension | Values | Notes |
|---|---|---|
| `drillId` | Any `global_drills` document ID | Filtered by sport + age-band tier |
| `volumeBucket` | `-2, -1, 0, +1, +2` | Relative to last session; each step ≈ ±5 min |
| `intensityBucket` | `recovery, low, medium, high` | Maps to RPE targets 3, 4, 6, 8 |

The Q-network takes a **71-float input** vector:

```
state(50) + drillEmbedding(12) + volumeOnehot(5) + intensityOnehot(4) = 71
```

Drill embedding (12 floats): `attrOnehot(6) + tierOnehot(3) + baseXpNorm + gritBonusNorm + isTacticalSvg`.

---

## Reward Formula

Composite scalar reward `r ∈ [-1, +1]`:

| Term | Weight | Condition | Source |
|---|---|---|---|
| `engagementTerm` | +0.40 | `tanh(earnedXP / expectedXP)` | `workout_logs.earnedXP` |
| `adherenceTerm` | +0.25 | Coach-intent attribute was serviced | Coach's `team_assignments` |
| `learningTerm` | +0.15 | `tanh(skill_delta_target_attr_30d)` | `player_stats.xpByAttribute` |
| `overtrainingPenalty` | -0.20 | ACWR > 1.5 OR soreness > 4 next-morning OR rolling 7d RPE > 8.5 | State vector + `physio_self_reports` |
| `recoverySkipPenalty` | -0.10 | Policy prescribed `recovery` but player pushed RPE > 7 | `rl_inference_log` + `workout_logs` |
| `gritBonus` | +0.10 | A `grit_awards` row tied to this drill was earned | `grit_awards` |

---

## Safety Constraint Matrix

The `applySafetyConstraints` function applies these **hard constraints** (non-bypassable):

| Code | Trigger | Override Applied |
|---|---|---|
| `AGE_DURATION_CAP` | Always | under13 → 30 min max; teen13to16 → 45 min; adult → 90 min |
| `OVERTRAINING_RECOVERY_FORCE` | rolling7dRpe > 8.5 OR soreness3d > 4 OR ACWR > 1.5 | `intensityBucket = 'recovery'`, `volumeBucket = -2` |
| `REONBOARDING_CAP` | daysSinceLastWorkout > 14 | `intensityBucket ≤ 'low'`, `volumeBucket ≤ 0` |
| `ADVANCED_DRILL_DOWNGRADE` | drill.tier = 'advanced' AND ageBand = 'under13' | Downgrade to nearest `intermediate` drill of same `attributeId` |

Every override is audited to `rl_safety_overrides/{eventId}` with a SHA-256 hashed UID (no raw PII).

---

## Network Architecture

```
Input (71 floats)
    │
Dense(128, ReLU)
    │
Dense(128, ReLU)
    │
Dense(1, linear)  ──► scalar Q value
```

- **Optimizer:** Adam, lr = 1e-4
- **Loss:** Huber (smooth L1)
- **Gradient clipping:** 1.0
- **Target network τ:** 0.005 (soft-update every training step)
- **Discount γ:** 0.99

---

## Nightly Training Runbook

The scheduler runs at 04:00 UTC in `us-east1`.

| Step | Description |
|---|---|
| 1 | Read `rl_policy_state/current`. Skip if `frozen: true`. |
| 2 | Page `rl_transitions` (last 30 days, `nextState != null`), cap 100k rows. |
| 3 | Compute `|TD error|` for each transition with current policy. |
| 4 | Prioritised replay: sample 4096 transitions (β annealing). |
| 5 | 200 gradient steps, batch 512. |
| 6 | Validation gate on 1024-row held-out slice: KL ≤ 0.5 AND meanQError ≤ 1.5× prior. |
| 7 | PASS → `saveToGcs(version+1)`, update `rl_policy_state/current`. |
| 8 | Always write `rl_training_runs/{yyyy-mm-dd}`. |

---

## Cold-Boot Protocol

Run when no policy exists yet (first deployment or full reset):

1. **Super-admin calls `initRlPolicy`** (or `initRlPolicy({ force: true })` to reset).
2. v1 with random weights is minted and saved to GCS.
3. `rl_policy_state/current` is created with `abPercent: 0, frozen: false`.
4. **Ramp schedule (recommended):**
   - Week 1: set `abPercent: 0` — all players on heuristic, transitions accumulate.
   - Week 2: set `abPercent: 10` — 10% rollout for sanity check.
   - Week 3: set `abPercent: 50` — half rollout; monitor `rl_training_runs`.
   - Week 5: set `abPercent: 100` — full deployment.

Use the `/admin/rl-policy` console slider to adjust `abPercent` at each step.

---

## Policy Rollback Runbook

If the policy produces bad recommendations:

**Option A — Emergency kill-switch (instant, no data loss):**
1. Go to `/admin/rl-policy`.
2. Click **FREEZE POLICY**.
3. All players immediately fall back to the legacy heuristic.

**Option B — Rollback to prior version:**
1. In `/admin/rl-policy`, enter a prior version number in the rollback input.
2. Click **ROLLBACK**.
3. `rl_policy_state/current.policyVersion` updates; inference function picks up the change on next call (module-level model cache refreshes on version change).

**Manual GCS path:**
The GCS path is `gs://soccer-skills-tracker.appspot.com/rl_models/policy/v{N}/`.
Use `gsutil` or the Firebase Console's Storage browser to verify artifact existence before rollback.

---

## PII / Privacy Review

| Data Element | Status |
|---|---|
| Player name | **Never stored** in any `rl_*` collection |
| Player email | **Never stored** in any `rl_*` collection |
| Player DOB | **Never stored** (ageBand onehot only) |
| Firebase Auth UID | Stored in `rl_inference_log` and `rl_transitions`; read-gated to super_admin |
| UID in safety overrides | **SHA-256 hashed** before storage; original UID never persisted |
| `physio_self_reports` | Owner-read-only; immutable once created; no update/delete |
| Teen (13–16) players | All `rl_*` log reads restricted to super_admin (mirrors COPPA ad-block pattern) |
| State vector | Pure numerical features; no PII |

---

## File Map

| File | Description |
|---|---|
| `src/lib/types/rlPolicy.ts` | TypeScript types for all RL documents |
| `src/lib/components/player/MorningReadinessCard.svelte` | Daily self-report Bento glass panel |
| `src/routes/(app)/player/dashboard/AdaptiveHomework.svelte` | Player dashboard with policy integration |
| `src/routes/(app)/player/workout/+page.svelte` | `applyMission` reads policy duration/RPE |
| `src/routes/(app)/admin/rl-policy/+page.svelte` | Admin console shell |
| `src/routes/(app)/admin/rl-policy/RlPolicyEngine.svelte.ts` | Admin console state engine |
| `src/routes/(app)/admin/rl-policy/RlPolicyArena.svelte` | Training run table + controls |
| `src/routes/(app)/admin/rl-policy/RlPolicyHUD.svelte` | Floating status strip |
| `functions/rlOps.js` | All RL Cloud Function callables |
| `functions/src/ml/featureBuilder.js` | 50-dim state vector builder |
| `functions/src/ml/drillCandidates.js` | Drill enumeration + 12-dim embedding |
| `functions/src/ml/policyModel.js` | PolicyModel (Double DQN, GCS I/O) |
| `functions/src/ml/transitionRecorder.js` | Firestore triggers for rl_transitions |
| `functions/src/ml/trainer.js` | Nightly training scheduler |
| `functions/src/ml/safetyLayer.js` | Safety constraint layer |
| `firestore.rules` | Security rules for all 6 new RL collections |
