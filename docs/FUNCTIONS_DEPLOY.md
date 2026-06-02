# Cloud Functions deploy — multi-codebase playbook

Firebase hosts multiple function codebases (see [`firebase.json`](../firebase.json)):

| Codebase | Source | Node | Role |
|----------|--------|------|------|
| `default` | `functions/` | 22 (monolith) | Legacy — slim index after **DEPLOY-N** |
| `core` | `functions-core/` | **20** (match CI) | Training + intent callables |
| `rl` | `functions-rl/` | **20** (match CI) | RL adaptive workout + transition triggers |
| `commerce` | `functions-commerce/` | **20** (post-launch) | Stripe, ticketing, subscriptions, rebates |
| `compliance` | `functions-compliance/` | **20** (post-launch) | Vault, COPPA, WebAuthn, clearance, retention |
| `integrations` | `functions-integrations/` | **20** (post-launch) | Media (sharp/Gemini), roster PDF, feeds, weather, uploads |
| `platform` | `functions-platform/` | **20** (post-launch) | `/v1` apiGateway, cell routing, admin ops, analytics |

Split codebases bundle monolith sources at predeploy (**DEPLOY-O-bundle**). Never `require('../functions/…')` from split packages — Firebase uploads only each codebase folder; parent paths do not exist on Cloud Run.

## Firebase project

[`.firebaserc`](../.firebaserc) default alias: `soccer-skills-tracker` (production).

**Dev deploys** use `sports-skill-tracker-dev` — do not change the default project without owner approval:

```bash
firebase use sports-skill-tracker-dev
firebase deploy --project sports-skill-tracker-dev --only functions:core:logTrainingSession
```

## Discovery timeout

**PowerShell:**

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT = "120"
```

**Bash:**

```bash
export FUNCTIONS_DISCOVERY_TIMEOUT=120
```

Set this before any deploy batch. The systematic script echoes the reminder at startup.

## Environment variables (split codebases)

Bundled modules declare Firebase params (e.g. `TREMENDOUS_ENV`, Stripe secrets). Copy project env into each codebase before deploy:

```bash
cp functions/.env.sports-skill-tracker-dev functions-core/.env
cp functions/.env.sports-skill-tracker-dev functions-rl/.env
cp functions/.env.sports-skill-tracker-dev functions-commerce/.env
cp functions/.env.sports-skill-tracker-dev functions-compliance/.env
cp functions/.env.sports-skill-tracker-dev functions-integrations/.env
cp functions/.env.sports-skill-tracker-dev functions-platform/.env
```

Do not commit `.env` files.

## Bundle before deploy (**DEPLOY-O-bundle**)

All split codebases (`core`, `rl`, `commerce`, `compliance`, `integrations`, `platform`) run `node scripts/bundle-functions.cjs` as a **predeploy** hook in [`firebase.json`](../firebase.json).

The orchestrator copies monolith closures from `functions/` into each package:

| Target | Seed modules |
|--------|--------------|
| `functions-shared` | `gamificationWorkoutXp`, auth bouncers, formatters, alphaRunOptions |
| `functions-core` | `src/domains/trainingOps` (+ transitive) |
| `functions-rl` | `rlOps`, `src/ml/transitionRecorder`, `src/ml/trainer` (+ transitive) |
| `functions-commerce` | commerce, ticketing, subscriptions, rebates, webhooksOps subset (+ transitive) |
| `functions-compliance` | vaultOps, shredOps, coppa, webauthn, compliance, verifyDocument, complianceOps (+ transitive) |
| `functions-integrations` | processMedia, ingestRoster, integrations, weather, uploadTokens, webhooksOps (+ transitive) |
| `functions-platform` | tenantUtils, cellRouter, cell bootstrap/provisioning/migration/observability/seed, apiGateway, analytics, adminOps, operativeOps (+ transitive) |

Run manually before local smoke tests or CI that `require()` split indexes:

```bash
npm run bundle:functions
node -e "require('./functions-core/index.js'); console.log('core OK')"
node -e "require('./functions-rl/index.js'); console.log('rl OK')"
```

Bundled files are gitignored; do not commit copies under split codebase folders.

Legacy entry point `scripts/bundle-functions-core.cjs` delegates to the orchestrator (`shared` + `core` only).

## Root npm scripts

```bash
npm run bundle:functions          # copy all monolith closures into split packages
npm run deploy:core               # four core callables
npm run deploy:rl                 # five RL callables + triggers
npm run deploy:platform           # apiGateway, cell ops, admin, analytics
npm run deploy:commerce           # Stripe/commerce exports
npm run deploy:compliance         # vault, COPPA, WebAuthn, clearance, retention
npm run deploy:integrations       # media, ingest, feeds, weather, uploads
npm run deploy:launch-backend     # core then rl (two batches)
npm run deploy:backend:systematic # full ordered ladder with gates (see below)
```

Script bodies use `functions:<codebase>:<name>` (see [`package.json`](../package.json)).

Full monolith (legacy):

```bash
npm run deploy:functions
```

## Systematic deploy ladder (**DEPLOY-O-complete**)

Use `npm run deploy:backend:systematic` for ordered production deploys. The script:

1. Echoes `FUNCTIONS_DISCOVERY_TIMEOUT` reminder
2. Runs `npm run bundle:functions`
3. Runs `deploy:core` — **on failure exits with `DO NOT CONTINUE`** (do not deploy rl/platform/commerce)
4. Waits **120 seconds** between each subsequent codebase (Cloud Run write quota)
5. Runs in order: **rl → platform → commerce → compliance → integrations**
6. Optional default monolith: `node scripts/deploy-backend-systematic.cjs --with-default`

Manual equivalent:

```bash
$env:FUNCTIONS_DISCOVERY_TIMEOUT = "120"
npm run bundle:functions
npm run deploy:core
# wait 2 minutes — verify core succeeded before continuing
npm run deploy:rl
# wait 2 minutes
npm run deploy:platform
npm run deploy:commerce
npm run deploy:compliance
npm run deploy:integrations
# optional legacy:
firebase deploy --only functions:default
```

**Verify gates:**

- If `deploy:core` fails, stop — do not run `deploy:rl`
- Wait 2–3 minutes between codebases on quota-sensitive projects
- First deploy after codebase split: retry with `--force` on the failing codebase if image/build errors recur

## Deploy practice

1. Set `FUNCTIONS_DISCOVERY_TIMEOUT` (above).
2. Run `npm run bundle:functions` if deploying **without** Firebase CLI (predeploy runs it automatically for split codebases).
3. Copy `.env` into target codebase folders when deploying those codebases.
4. **Deploy one codebase at a time** — prefer `deploy:backend:systematic` or manual ladder with waits.
5. Prefer `npm run deploy:launch-backend` only for launch-critical core + rl batches.

## Rollback

Cloud Console → **Cloud Run** → select service → **Revisions** → route **100%** traffic to the last healthy revision. Repeat per function/service if needed.

## Deploy syntax (manual)

```bash
# Core
firebase deploy --only functions:core:logTrainingSession
firebase deploy --only functions:core:secureDeployIntent,functions:core:secureCancelIntent,functions:core:secureExtendIntent

# RL
firebase deploy --only functions:rl:getAdaptiveWorkoutPolicy
firebase deploy --only functions:rl:initRlPolicy,functions:rl:submitPhysioSelfReport
firebase deploy --only functions:rl:rlOnWorkoutLogCreated,functions:rl:rlOnPhysioReportCreated

# Legacy default codebase (monolith prefix)
firebase deploy --only functions:logTrainingSession

# Commerce (post-launch — batch or use npm run deploy:commerce)
firebase deploy --only functions:commerce:stripeWebhook
firebase deploy --only functions:commerce:createRegistrationIntent
```

## Commerce codebase (**DEPLOY-J**)

`functions-commerce/index.js` re-exports 25 handlers from bundled `commerce`, `ticketing`, `ticketReceipts`, `webhooksOps`, `subscription`, `legacyBillingOps`, `hotelRebates`, `hotelPartnerOps`, `recruiterBilling`, `pricingPolicyOps`.

Dependencies: `stripe`, `firebase-admin`, `firebase-functions`, `functions-shared` — **no** tfjs, sharp, pdf-parse, webauthn.

Deploy all commerce exports:

```bash
npm run deploy:commerce
```

## Compliance codebase (**DEPLOY-K**)

`functions-compliance/index.js` re-exports vault (`vaultOps`, `shredOps`), COPPA (`coppa`), passkey auth (`webauthn`), Checkr clearance (`compliance`), document verification (`verifyDocument`), and minor retention purge queue (`complianceOps` subset).

Dependencies: `@simplewebauthn/server`, `firebase-admin`, `firebase-functions`, `functions-shared` — **no** tfjs, sharp, pdf-parse, stripe.

**Secrets:** bind `PII_VAULT_MASTER_KEY` only on compliance deploys (`vaultSealPii` / `vaultUnsealPii` in `vaultOps.js`). Do not duplicate vault secret binding on `core` / `rl` codebases.

Example deploy:

```bash
npm run deploy:compliance
firebase deploy --only functions:compliance:vaultSealPii,functions:compliance:vaultUnsealPii
firebase deploy --only functions:compliance:webauthnRegisterStart
```

## Integrations codebase (**DEPLOY-L**)

`functions-integrations/index.js` re-exports:

- `processMedia` (sharp + `GEMINI_API_KEY`)
- `ingestRoster` (pdf-parse)
- `getSoccerNews`, `searchPodcasts`, `getPodcastEpisodes`
- `getWeatherConditions`
- `getUploadToken`, `deleteAllPlayerMedia`
- `facilityWeatherWebhook` (`webhooksOps`)

Dependencies: `sharp`, `pdf-parse`, `@google/genai`, `firebase-admin`, `firebase-functions`, `functions-shared` — **no** tfjs, stripe, webauthn.

```bash
npm run deploy:integrations
```

## Platform codebase (**DEPLOY-M**)

`functions-platform/index.js` re-exports cell bootstrap/provisioning/migration/observability/seed, **`apiGateway`** (`us-east1`), analytics triggers, `adminOps` roster/admin callables, and `impersonateUserFn` / `purgeUserDataFn`.

Preloads `tenantUtils` + `cellRouter` before `apiGateway` so [`CELL_ROUTING.md`](CELL_ROUTING.md) `register()` routes in `apiGateway.js` bind at cold start.

**Hosting:** [`firebase.json`](../firebase.json) rewrites `/v1/**` → `apiGateway` in `us-east1`. After deploying `functions:platform:apiGateway`, confirm the function name/region still match the rewrite (export name stays `apiGateway`).

Dependencies: `firebase-admin`, `firebase-functions`, `functions-shared`, `@google-cloud/tasks` (car-ride / async tasks via monolith requires) — **no** tfjs, sharp, stripe, webauthn.

```bash
npm run deploy:platform
# Or gateway-only hotfix:
firebase deploy --only functions:platform:apiGateway
```

## Dry-run smoke

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT = "120"
npm run bundle:functions
Copy-Item functions\.env.sports-skill-tracker-dev functions-core\.env
Copy-Item functions\.env.sports-skill-tracker-dev functions-rl\.env
firebase deploy --only functions:core:logTrainingSession --dry-run
firebase deploy --only functions:rl:getAdaptiveWorkoutPolicy --dry-run
```

## Guard tests

```bash
node --test functions/__tests__/functionsDeploy.guard.test.js
```

Asserts: no `../functions/` in split indexes, bundle scripts exist, predeploy hooks registered, monolith slim exports.

## Related

- Tracker: [`ROADMAP.md`](../ROADMAP.md) — Infrastructure — Firebase Functions deploy
- `functions-core/README.md`, `functions-rl/README.md`, `functions-shared/README.md`
