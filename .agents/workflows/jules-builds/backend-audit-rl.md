# JULES BACKEND PIPELINE: RL & PROGRESSION (PLAYER OS)
## Codebase Target: `functions-rl/`
## Domain: Adaptive Workout Policy, RL Transitions, Physio Self-Reports, Gamification XP, Bounties

### Critical Architectural Constraints:
1. **Canonical Telemetry Path:** All player stats reads and writes must point strictly to `users/{email}` or `users/{uid}` (never obsolete isolated collections).
2. **80-Line Function Limit:** No function handler in `functions-rl/` may exceed 80 lines. Extract reward and state calculations to `src/ml/`.
3. **Atomic Operations:** All XP, streak freeze updates, and transition logging must use atomic Firestore transactions or writeBatches (max 500 ops).
4. **Boot Safety:** Reinforcement learning policy matrices and state vector builders must not perform blocking synchronous I/O at file load time.

### Target Handlers to Audit in `functions-rl/`:
- `getAdaptiveWorkoutPolicy`, `initRlPolicy`, `setPolicyAbPercent`, `freezeRlPolicy`, `rollbackRlPolicy`
- `submitPhysioSelfReport`
- `rlOnWorkoutLogCreated`, `rlOnPhysioReportCreated`
- `trainRlPolicyNightly`

### Verification Steps:
1. Run `node scripts/smoke-require-codebase.cjs rl` — must return OK.
2. Run targeted tests:
   `node --test functions/__tests__/transitionRecorder.guard.test.js`
   `node --test functions/__tests__/transitionRecorderReward.test.js`
   `node --test functions/__tests__/rlBountyWiring.guard.test.js`
3. Verify all tests pass 100% green.

### Commit:
Commit with message: `audit(backend-rl): verify canonical telemetry paths, atomic XP, and RL transition safety`
