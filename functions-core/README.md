# functions-core

Firebase Cloud Functions codebase for **launch-critical training + intent** callables.

## Status (DEPLOY-D-core-index)

Thin `index.js` re-exports four callables from monolith [`functions/src/domains/trainingOps.js`](../functions/src/domains/trainingOps.js). Domain files are **not** moved yet; legacy [`functions/index.js`](../functions/index.js) still exports the same names until **DEPLOY-N**.

## Exported functions

| Export | Source | Memory (DEPLOY-A) |
|--------|--------|-------------------|
| `logTrainingSession` | `trainingOps` | `512MiB` |
| `secureDeployIntent` | `trainingOps` | `512MiB` |
| `secureCancelIntent` | `trainingOps` | `512MiB` |
| `secureExtendIntent` | `trainingOps` | `512MiB` |

**Not exported here** (optional later for intent lifecycle QA): `scheduledExpireIntents`, `onUserXpUpdateIntentLifecycle` — remain on monolith only.

## Dependencies

| Package | Purpose |
|---------|---------|
| `functions-shared` | Shared XP, auth bouncers, formatters, alpha run options |
| `firebase-admin` / `firebase-functions` | Runtime |
| `@google/genai` | Training domain (tactical AI when invoked) |

Monolith `functions/node_modules` must be installed — `trainingOps` resolves sibling requires under `functions/`.

**Excluded** from this codebase: `@tensorflow/tfjs-node`, `sharp`, `pdf-parse`, `@simplewebauthn/server`.

## Node version

`engines.node` is **20** to match [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

## Verify

```bash
cd functions-core
npm install
node -e "const i=require('./index.js'); ['logTrainingSession','secureDeployIntent','secureCancelIntent','secureExtendIntent'].forEach(n=>{if(!i[n]) throw new Error('missing '+n)}); console.log('OK')"
```

Also run monolith domain tests from `functions/` (see ROADMAP **DEPLOY-D-core-index**).

## Next

- **DEPLOY-G/H** — `firebase.json` multi-codebase + `deploy:core` targeting `functions-core`
- **DEPLOY-N** — retire duplicate exports from monolith `functions/index.js`
