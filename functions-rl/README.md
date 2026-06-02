# functions-rl

Firebase Cloud Functions codebase for **RL adaptive workout** callables, transition triggers, and nightly training.

## Status (DEPLOY-F-rl-index)

Thin `index.js` re-exports from monolith `functions/rlOps.js`, `functions/src/ml/transitionRecorder.js`, and `functions/src/ml/trainer.js`. Domain files are **not** moved yet; legacy [`functions/index.js`](../functions/index.js) still exports the same names until **DEPLOY-N**.

**Isolation goal:** `@tensorflow/tfjs-node` loads only in RL containers — not in `functions-core`.

## Exported functions

| Export | Source | Memory |
|--------|--------|--------|
| `submitPhysioSelfReport` | `rlOps` | `512MiB` |
| `initRlPolicy` | `rlOps` | `1GiB` |
| `getAdaptiveWorkoutPolicy` | `rlOps` | `512MiB` |
| `setPolicyAbPercent` | `rlOps` | default |
| `freezeRlPolicy` | `rlOps` | default |
| `rollbackRlPolicy` | `rlOps` | default |
| `rlOnWorkoutLogCreated` | `transitionRecorder` | default |
| `rlOnPhysioReportCreated` | `transitionRecorder` | default |
| `trainRlPolicyNightly` | `trainer` | `2GiB` (scheduler) |

## Dependencies

| Package | Purpose |
|---------|---------|
| `functions-shared` | Shared utilities |
| `firebase-admin` / `firebase-functions` | Runtime |
| `@tensorflow/tfjs-node` | Policy training / inference |

Monolith `functions/node_modules` must be installed for nested requires under `functions/`.

**Excluded:** `sharp`, `pdf-parse`, `stripe`, `@simplewebauthn/server`, `@google/genai`.

## Node version

`engines.node` is **20** (matches CI `deploy.yml`).

## Verify

```bash
cd functions-rl
npm install
node -e "const i=require('./index.js'); ['getAdaptiveWorkoutPolicy','initRlPolicy','rlOnWorkoutLogCreated','rlOnPhysioReportCreated','submitPhysioSelfReport'].forEach(n=>{if(!i[n]) throw new Error(n)}); console.log('OK')"
```

```bash
node --test functions/__tests__/transitionRecorder.guard.test.js functions/__tests__/transitionRecorderReward.test.js
```

## Next

- **DEPLOY-G/H** — `firebase.json` multi-codebase + targeted deploy scripts
- **DEPLOY-N** — retire duplicate exports from monolith `functions/index.js`
