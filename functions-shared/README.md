# functions-shared

Local npm package for utilities shared by **functions-core** and **functions-rl** without duplicating business logic during the multi-codebase migration.

## Strategy (DEPLOY-B)

This package is a **re-export bridge**: `index.js` `require()`s canonical modules from the monolith `functions/` tree. Domain files are **not** moved yet; `functions/index.js` is unchanged.

When **DEPLOY-C/D** or **DEPLOY-E/F** split codebases, consumers should import from `functions-shared` (or copy leaf modules here once circular deps are resolved).

## Canonical paths (monolith)

| Export namespace | Monolith path |
|------------------|---------------|
| `gamificationWorkoutXp` | [`functions/gamificationWorkoutXp.js`](../functions/gamificationWorkoutXp.js) |
| `authBouncers` | [`functions/src/middleware/authBouncers.js`](../functions/src/middleware/authBouncers.js) |
| `formatters` | [`functions/src/utils/formatters.js`](../functions/src/utils/formatters.js) |
| `alphaRunOptions` | [`functions/src/utils/alphaRunOptions.js`](../functions/src/utils/alphaRunOptions.js) |

## Public API (minimum for core + RL)

### `gamificationWorkoutXp`

- `MAX_PLAYER_LEVEL`, `xpToAdvanceFromLevel`, `trainingLevelFromTotalXp`
- `calculateWorkoutXp`, `calculateTrainingSessionEarnedXp`, `calculateRepsEarnedXp`
- `computeMatchTelemetryParlayXp`, `grantTrainingXpAfterRepCreated`

### `authBouncers`

- `assertDirectorOrSuper`, `assertClubSubscriptionWritable`, `assertSuperAdmin`
- `assertCanSecureAddPlayer`, `assertParent`, `assertClubStaff`, `assertCoachMessageSender`
- `assertActorCanAccessTeam`, `assertPlayer`, `assertDirectorClubOrSuper`, `assertClubStaffOrSuper`

### `formatters`

- `normEmail`, `workoutAttestationHmac`, `leaderboardPublicPlayerKey`, `utcYmdAddDays`
- `lastActivityToUtcYmd`, `utcWeekMondayKey`, `isLeaderboardPlayerRow`, `computeAgeYears`, …
- (full list: `module.exports` in canonical file)

### `alphaRunOptions`

- `ALPHA_CALLABLE_OPTS`, `ALPHA_HTTP_OPTS`

## Usage

From repo root (smoke test):

```bash
node -e "require('./functions-shared'); console.log('shared OK')"
```

From `functions/` after linking:

```json
"dependencies": {
  "functions-shared": "file:../functions-shared"
}
```

```javascript
const {
  calculateTrainingSessionEarnedXp,
  assertCanSecureAddPlayer,
  normEmail,
  ALPHA_CALLABLE_OPTS,
} = require('functions-shared');
// or namespaced:
const {authBouncers, formatters} = require('functions-shared');
```

## Dependencies

Runtime deps (`firebase-admin`, `firebase-functions`, etc.) resolve from **`functions/node_modules`** when loading monolith sources. Install/link `functions` before requiring this package in CI or local scripts.

## Verify (DEPLOY-B)

```bash
node -e "require('./functions-shared'); console.log('shared OK')"
npm run check
```
