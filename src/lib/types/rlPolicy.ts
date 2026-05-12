/**
 * rlPolicy.ts
 * ───────────
 * Phase 3, Epic 4 (deliverable 2) — RL Adaptive Workout Engine
 *
 * TypeScript types for the deep RL policy pipeline:
 *   • Feature extraction (state vector)
 *   • Action space (drill × volume × intensity)
 *   • Transition recording (experience replay buffer rows)
 *   • Inference logging (per-call audit)
 *   • Policy versioning + A/B deployment state
 *   • Training run reports
 *   • Safety constraint audit
 *   • Subjective physiological self-reports
 *
 * No PII enters any of these types: `uid` refers to Firebase Auth UID only.
 */

type AnyTimestamp = { toDate(): Date; seconds: number; nanoseconds: number } | Date | string | null;

// ── Volume + Intensity action buckets ─────────────────────────────────────────

/**
 * Volume adjustment relative to last session (+2 = maximum ramp, -2 = max taper).
 * Drives `recommendedDurationMinutes` in the inference response.
 */
export type VolumeBucket = -2 | -1 | 0 | 1 | 2;

/** Perceived-exertion target bucket surfaced to the player as a training zone. */
export type IntensityBucket = 'recovery' | 'low' | 'medium' | 'high';

// ── Core action ───────────────────────────────────────────────────────────────

/**
 * The policy's prescribed action for one player session.
 *
 * `drillId` is the Firestore document ID from `global_drills/{drillId}`.
 * `volumeBucket` and `intensityBucket` are applied by the inference callable
 * to compute `recommendedDurationMinutes` and `recommendedTargetRpe`.
 */
export interface RlAction {
  drillId: string;
  volumeBucket: VolumeBucket;
  intensityBucket: IntensityBucket;
}

// ── State vector ──────────────────────────────────────────────────────────────

/**
 * Canonical 50-element state vector built by `featureBuilder.buildStateVector`.
 *
 * Indices are stable; consumers must NOT rely on positional access — always
 * use `featureNames[i]` for readability and robustness to future extension.
 *
 * Feature list (all values in [0, 1] unless noted):
 *  [0]  rollingRpe7d             avg RPE over last 7 days (÷10)
 *  [1]  rollingRpe28d            avg RPE over last 28 days (÷10)
 *  [2]  rollingSoreness3d        avg soreness over last 3 physio reports (÷5)
 *  [3]  lastNightSleep           hours ÷ 12 (capped at 1.0)
 *  [4]  mood7dAvg                avg mood over last 7 physio reports (÷5)
 *  [5]  streakDays               days ÷ 60 (capped at 1.0)
 *  [6]  sessionsLast7            sessions in last 7 days ÷ 7
 *  [7]  daysSinceLastWorkout     ÷ 30 (capped at 1.0)
 *  [8]  acuteLoad                sum(RPE×durationMin) 7d ÷ 2000
 *  [9]  chronicLoad              sum(RPE×durationMin) 28d ÷ 8000
 *  [10] acwr                     acuteLoad / max(chronicLoad, 0.01) ÷ 2.0
 *  [11] completedAssignments30d  completed / (assigned + 1) ratio
 *  [12] trainingAgeDays          days since first workout ÷ 365
 *  [13] coachIntentAttrIdx0      onehot: targetAttribute == attributes[0]
 *  [14] coachIntentAttrIdx1
 *  [15] coachIntentAttrIdx2
 *  [16] coachIntentAttrIdx3
 *  [17] coachIntentAttrIdx4
 *  [18] coachIntentAttrIdx5
 *  [19] coachIntentXpNorm        requiredXp ÷ 500 (capped at 1.0)
 *  [20] ageBandUnder13           1 if ageBand === 'under13'
 *  [21] ageBandTeen13to16        1 if ageBand === 'teen13to16'
 *  [22] ageBandAdult             1 if ageBand === 'adult'
 *  [23] attrRating0              attributes[0] current rating ÷ 99
 *  [24] attrRating1
 *  [25] attrRating2
 *  [26] attrRating3
 *  [27] attrRating4
 *  [28] attrRating5
 *  [29] lastSessionDuration      durationMin ÷ 90 (last workout)
 *  [30] lastSessionRpe           rpe ÷ 10 (last workout)
 *  [31] lastSessionSoreness      soreness ÷ 5 (last workout physio)
 *  [32] weekdayMon               1 if today is Monday
 *  [33] weekdayTue
 *  [34] weekdayWed
 *  [35] weekdayThu
 *  [36] weekdayFri
 *  [37] weekdaySat
 *  [38] weekdaySun
 *  [39] sessionTimeAm            1 if inference time < 12:00 local
 *  [40] hasActiveAssignment      1 if open assignment exists
 *  [41] assignmentDaysRemaining  daysUntilDue ÷ 7 (capped at 1.0)
 *  [42] restingFeel7dAvg         avg restingFeel ÷ 5 (physio reports)
 *  [43] gritBonusEarned30d       grit bonus events in 30d ÷ 10
 *  [44] totalXpNorm              total_xp ÷ 50000 (capped at 1.0)
 *  [45-49] reserved              padding zeros for future signals
 */
export interface RlState {
  /** Float32 feature values, length always === 50. */
  vector: number[];
  /** Human-readable name for each feature dimension, same length as vector. */
  featureNames: string[];
  /** Server timestamp when this vector was computed. */
  builtAt: AnyTimestamp;
}

// ── Reward ────────────────────────────────────────────────────────────────────

/** Composite reward signal written alongside each rl_transition. */
export interface RlReward {
  /** Final scalar reward in approximately [-1, +1]. */
  total: number;
  /** +0.40 * tanh(earnedXP / expectedXP) */
  engagementTerm: number;
  /** +0.25 if coach-intent attribute was serviced */
  adherenceTerm: number;
  /** +0.15 * tanh(skill_delta_target_attribute_30d) */
  learningTerm: number;
  /** -0.20 if ACWR > 1.5 OR soreness > 4 OR rolling 7d RPE > 8.5 */
  overtrainingPenalty: number;
  /** -0.10 if recovery mode was forced but player pushed high-intensity */
  recoverySkipPenalty: number;
  /** +0.10 if a grit_awards row tied to this drill was earned */
  gritBonus: number;
}

// ── Experience replay transition ──────────────────────────────────────────────

/**
 * Firestore document in `rl_transitions/{tid}`.
 *
 * Written by `onWorkoutLogCreated` (state + action + reward, nextState: null)
 * then patched by `onPhysioReportCreated` (fills nextState).
 *
 * The training scheduler streams these docs for prioritised replay.
 */
export interface RlTransitionDoc {
  /** Opaque transition ID = auto-generated Firestore ID. */
  tid: string;
  /** Firebase Auth UID (not email, not name). */
  uid: string;
  state: RlState;
  action: RlAction;
  reward: RlReward;
  /**
   * Next-state vector, filled by the morning physio report trigger.
   * `null` until the player submits their next readiness report.
   */
  nextState: RlState | null;
  /** True for terminal transitions (player account closed, season end). */
  terminal: boolean;
  /** Firestore document ID of the matching rl_inference_log entry. */
  inferenceLogId: string | null;
  /** |TD error| from the most recent training run; drives sampling priority. */
  tdErrorAbs: number | null;
  createdAt: AnyTimestamp;
  patchedAt: AnyTimestamp;
  /** UTC date string 'yyyy-mm-dd' of the workout log that created this row. */
  workoutDateUtc: string;
}

// ── Inference log ─────────────────────────────────────────────────────────────

/**
 * Audit record for every call to `getAdaptiveWorkoutPolicy`.
 * Stored in `rl_inference_log/{logId}`, read by super_admin only.
 */
export type ExplanationCode =
  | 'RESTING'
  | 'BUILDING'
  | 'PEAK'
  | 'RECOVERY_FORCED'
  | 'COACH_PRIORITY'
  | 'EXPLORATION';

export interface RlInferenceLogDoc {
  logId: string;
  uid: string;
  policyVersion: number;
  state: RlState;
  /** IDs of drills that were candidates for selection. */
  candidateDrillIds: string[];
  chosenAction: RlAction;
  /** Raw Q-value for the chosen action before safety clamping. */
  qValue: number;
  /** ε value used at inference time. */
  epsilonUsed: number;
  /** True if the action was drawn randomly (exploration). */
  explorationFlag: boolean;
  /** Model's own reward estimate (argmax Q). */
  modeledRewardEstimate: number;
  explanationCode: ExplanationCode;
  /** Whether a safety override was applied. */
  safetyOverrideApplied: boolean;
  safetyOverrideCode: string | null;
  createdAt: AnyTimestamp;
}

// ── Policy state ──────────────────────────────────────────────────────────────

/**
 * Singleton document at `rl_policy_state/current`.
 * Acts as the global deployment switch for the RL pipeline.
 *
 * `abPercent: 0` or `frozen: true` → all players get the legacy heuristic.
 * `abPercent: 100` → all players get policy recommendations.
 */
export interface RlPolicyStateDoc {
  /** Monotonically increasing model version number. */
  policyVersion: number;
  /** GCS path: `gs://{bucket}/rl_models/policy/v{policyVersion}/`. */
  gcsPath: string;
  /**
   * Fraction of players (by hash(uid) % 100) receiving policy recommendations.
   * 0 = fully off, 100 = fully on.
   */
  abPercent: number;
  /**
   * Emergency kill-switch. When true, all players get the legacy heuristic
   * regardless of abPercent. Can only be flipped by super_admin callables.
   */
  frozen: boolean;
  /** Timestamp of the most recent successful training run deployment. */
  deployedAt: AnyTimestamp;
  /** UID of the super_admin who last modified this doc. */
  updatedByUid: string | null;
  updatedAt: AnyTimestamp;
}

// ── Training run report ───────────────────────────────────────────────────────

/**
 * Written to `rl_training_runs/{yyyy-mm-dd}` after every nightly scheduler run.
 */
export interface RlTrainingRunDoc {
  runDate: string;
  policyVersionBefore: number;
  policyVersionAfter: number | null;
  /** Whether the validation gate accepted the new weights. */
  accepted: boolean;
  /** Reason for rejection if `accepted === false`. */
  rejectionReason: string | null;
  /** Number of transitions sampled from the replay buffer. */
  sampleCount: number;
  /** Mean |TD error| across sampled batch. */
  meanTdError: number;
  /** Mean Q prediction error on the held-out validation slice. */
  meanQError: number;
  /** KL divergence of action distribution: new vs old policy over eval states. */
  klDivergence: number;
  /** Histogram of chosen actions by intensityBucket on eval states. */
  actionHistogram: Record<string, number>;
  /** Number of gradient update steps taken. */
  gradientSteps: number;
  durationSeconds: number;
  createdAt: AnyTimestamp;
}

// ── Safety override audit ─────────────────────────────────────────────────────

export type SafetyOverrideCode =
  | 'AGE_DURATION_CAP'
  | 'OVERTRAINING_RECOVERY_FORCE'
  | 'REONBOARDING_CAP'
  | 'ADVANCED_DRILL_DOWNGRADE';

/**
 * Written to `rl_safety_overrides/{eventId}` whenever a constraint fires.
 * Read: super_admin + tenant director.
 */
export interface RlSafetyOverrideDoc {
  eventId: string;
  /** SHA-256 hash of uid — no raw PII stored. */
  uidHash: string;
  policyVersion: number;
  originalAction: RlAction;
  finalAction: RlAction;
  overrideCode: SafetyOverrideCode;
  overrideReason: string;
  /** Subset of state features relevant to the constraint that fired. */
  stateSnapshot: Record<string, number>;
  createdAt: AnyTimestamp;
}

// ── Physiological self-report ─────────────────────────────────────────────────

/**
 * Daily self-report document at `physio_self_reports/{uid}/daily/{yyyy-mm-dd}`.
 *
 * Immutable once created (Firestore rule: create only, no update/delete).
 * One doc per player per UTC day; enforced server-side by `submitPhysioSelfReport`.
 */
export interface PhysioSelfReportDoc {
  uid: string;
  /** UTC date string 'yyyy-mm-dd'. */
  dateUtc: string;
  /**
   * Hours of sleep last night. Range [0, 12]; 0 = missing/skipped.
   * Stored as float (e.g. 7.5).
   */
  sleepHours: number;
  /**
   * Muscle/joint soreness level. 1 = none, 5 = severe.
   * 0 = not reported.
   */
  soreness: number;
  /**
   * Subjective mood / energy. 1 = very low, 5 = excellent.
   * 0 = not reported.
   */
  mood: number;
  /**
   * Resting physical feel (pre-workout readiness). 1 = fatigued, 5 = fresh.
   * 0 = not reported.
   */
  restingFeel: number;
  createdAt: AnyTimestamp;
}

// ── Callable I/O ──────────────────────────────────────────────────────────────

export interface SubmitPhysioSelfReportInput {
  sleepHours: number;
  soreness: number;
  mood: number;
  restingFeel: number;
}

export interface SubmitPhysioSelfReportResult {
  dateUtc: string;
  alreadySubmittedToday: boolean;
}

export interface GetAdaptiveWorkoutPolicyInput {
  sportId?: string;
}

export type PolicyMode = 'policy' | 'heuristic';

export interface GetAdaptiveWorkoutPolicyResult {
  mode: PolicyMode;
  recommendedDrillId: string | null;
  /** Duration in minutes derived from volumeBucket and last-session baseline. */
  recommendedDurationMinutes: number | null;
  /** RPE target (1-10) derived from intensityBucket. */
  recommendedTargetRpe: number | null;
  policyVersion: number | null;
  explorationFlag: boolean;
  explanationCode: ExplanationCode | null;
  /** Human-readable explanation for why this drill was chosen. */
  explanationText: string | null;
}

export interface SetPolicyAbPercentInput { abPercent: number }
export interface SetPolicyAbPercentResult { abPercent: number; policyVersion: number }

export interface FreezeRlPolicyInput { frozen: boolean }
export interface FreezeRlPolicyResult { frozen: boolean; policyVersion: number }

export interface RollbackRlPolicyInput { targetVersion: number }
export interface RollbackRlPolicyResult { policyVersion: number; gcsPath: string }

export interface InitRlPolicyInput { force?: boolean }
export interface InitRlPolicyResult { policyVersion: number; gcsPath: string }
