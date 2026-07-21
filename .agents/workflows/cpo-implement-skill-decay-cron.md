# Workflow: CPO — Implement Skill Decay Cron & gamificationMath Utility

**Owner**: Jules (Backend)
**Priority**: P0 — CRITICAL
**Persona Context**: Chief Product Officer (CPO)

## Objective
Build the 2% daily skill decay backend system that forms the loss-avoidance core of the Dopamine Engine (Epic 4). This workflow is the backend half of `cpo-rebuild-dopamine-engine.md`.

## Step 1: Create gamificationMath.ts Utility
- **File**: `src/lib/utils/gamificationMath.ts`
- **Task**: Implement the following pure, testable functions:
  1. `applySkillDecay(stats: ScoutsSixStats): ScoutsSixStats` — reduces each of the 6 Scout's Six axis values by exactly 2% (multiply by 0.98, floor to 2 decimal places). Must not drop below 0.
  2. `hasActiveStreakFreeze(freezeTokens: string[]): boolean` — returns true if any token in the array is a valid, non-expired freeze token.
  3. `consumeStreakFreeze(tokens: string[]): string[]` — removes the first valid token from the array (immutable — returns new array).
- **Constraint**: Each function must be under 80 lines. If the logic for validating freeze tokens grows complex, extract to a sub-utility.

## Step 2: Create Firebase Scheduled Cloud Function
- **File**: `functions/src/scheduledSkillDecay.ts` (or equivalent based on existing functions structure)
- **Task**: Write a Firebase Scheduled Function (PubSub trigger, run daily at 00:00 UTC) that:
  1. Queries `player_stats` collection for all players where `lastActivityTimestamp` is older than 24 hours.
  2. For each player, query their `streakTokens` sub-collection.
  3. If active `streakFreeze` token exists: call `consumeStreakFreeze()`, write the updated token array via `writeBatch`, skip decay.
  4. If no freeze token: call `applySkillDecay()` on their `scoutsSix` object, update `player_stats` doc via `writeBatch`.
- **Constraint**: Use atomic `writeBatch`, hard-capped at 500 operations per batch. If player count exceeds 500, paginate using cursor-based batching.
- **Constraint**: All functions must be under 80 lines. Extract batch pagination logic into `functions/src/utils/batchPaginator.ts`.

## Step 3: Write Vitest Unit Tests
- **File**: `src/lib/utils/__tests__/gamificationMath.test.ts`
- **Task**: Write failing tests FIRST (TDD mandate):
  - Test that `applySkillDecay` correctly reduces each axis by 2%
  - Test that `applySkillDecay` never allows a value below 0
  - Test that `hasActiveStreakFreeze` returns false on empty array
  - Test that `consumeStreakFreeze` is immutable (returns new array, doesn't mutate original)

## Step 4: Verification
- Run `npm run check` — 0 errors required.
- Run `npx vitest run src/lib/utils/__tests__/gamificationMath.test.ts` — all tests must pass.
