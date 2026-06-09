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

Each split `index.js` must call `require('./bootstrapAdmin')` as its **first** require (before `tenantUtils`, `apiGateway`, or any domain module that touches `admin.firestore()` at load time). The monolith `functions/index.js` no longer runs before split packages during Firebase discovery or deploy — without this bootstrap, `partnerHandlers/hotelRebates.js` and similar modules throw `FirebaseAppError: The default Firebase app does not exist`.

**Do not** `require('functions-shared/bootstrapAdmin')` from split indexes. Firebase uploads only each codebase folder (e.g. `functions-integrations/`); the parent `functions-shared` package and `file:../functions-shared` npm link are **not** present in Cloud Build `/workspace`, so that path fails at cold start with `Cannot find module 'functions-shared/bootstrapAdmin'`. Predeploy `bundle-functions.cjs` copies `functions-shared/bootstrapAdmin.js` → `<codebase>/bootstrapAdmin.js`; production code must use the local copy. Canonical source remains `functions-shared/bootstrapAdmin.js`.

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

### WebAuthn RP identity (compliance)

Passkey callables (`webauthnRegisterStart` / `Finish`, `webauthnLoginStart` / `Finish`) read **`WEBAUTHN_RP_ID`** and **`WEBAUTHN_RP_ORIGIN`** from the copied `.env` at deploy time. If unset, bundled `webauthn.js` defaults to `localhost` / `http://localhost:5173` and browsers show localhost errors on production hosting.

| Variable | Dev / canonical user URL | Notes |
|----------|--------------------------|-------|
| `WEBAUTHN_RP_ID` | `sstracker.app` | Parent RP ID; valid for `soccer.sstracker.app` subdomain |
| `WEBAUTHN_RP_ORIGIN` | `https://sstracker.app` | Must match the **exact** page origin (scheme + host, no trailing slash) |

Copy into `functions-compliance/.env` before compliance deploy (same source file as other codebases):

```bash
cp functions/.env.sports-skill-tracker-dev functions-compliance/.env
```

**Canonical hosting:** `APP_BASE_URL` and primary passkey surface → `https://sstracker.app` (see `firebase.json` CSP `connect-src`). CI production hosting URL may be `https://soccer.sstracker.app`; one origin per deploy — if users only open the subdomain, set `WEBAUTHN_RP_ORIGIN=https://soccer.sstracker.app` on that project's compliance deploy (do not mix two origins in one `.env` without owner approval).

**Redeploy after env change:**

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT = "120"
firebase use sports-skill-tracker-dev
cp functions/.env.sports-skill-tracker-dev functions-compliance/.env
npm run deploy:compliance
# Or WebAuthn-only hotfix:
firebase deploy --project sports-skill-tracker-dev --only functions:compliance:webauthnRegisterStart,functions:compliance:webauthnRegisterFinish,functions:compliance:webauthnLoginStart,functions:compliance:webauthnLoginFinish
```

**Verify:** signed-in session → Network → `webauthnRegisterStart` response → `rp.id` is `sstracker.app` (not `localhost`). Google sign-in still bypasses passkey enrollment until magic-link users enroll.

Template: [`functions/.env.example`](../functions/.env.example).

## Bundle before deploy (**DEPLOY-O-bundle**)

All split codebases (`core`, `rl`, `commerce`, `compliance`, `integrations`, `platform`) run `node scripts/bundle-functions.cjs` as a **predeploy** hook in [`firebase.json`](../firebase.json).

The orchestrator copies monolith closures from `functions/` into each package:

| Target | Seed modules |
|--------|--------------|
| `functions-shared` | `gamificationWorkoutXp`, auth bouncers, formatters, alphaRunOptions |
| `functions-core` | `src/domains/trainingOps` (+ transitive) |
| `functions-rl` | `rlOps`, `src/ml/transitionRecorder`, `src/ml/trainer` (+ transitive) |
| `functions-commerce` | commerce, ticketing, subscriptions, rebates, webhooksOps subset (+ transitive) |
| `functions-compliance` | vaultOps, shredOps, coppa, webauthn, compliance, verifyDocument, complianceOps, operativeOps (+ transitive) |
| `functions-integrations` | processMedia, ingestRoster, integrations, weather, uploadTokens, facilityWeatherWebhook (+ transitive; **no** webhooksOps / Stripe) |
| `functions-platform` | tenantUtils, cellRouter, cell bootstrap/provisioning/migration/observability/seed, apiGateway, analytics, adminOps, operativeOps (+ transitive) |

Run manually before local smoke tests or CI that `require()` split indexes:

```bash
npm run bundle:functions
node -e "require('./functions-core/index.js'); console.log('core OK')"
node -e "require('./functions-rl/index.js'); console.log('rl OK')"
```

After bundle, install dependencies **per codebase** (Firebase uploads only that folder; `node_modules` is not shared across codebases):

```bash
cd functions-integrations && npm ci
# processMedia registers a Storage trigger — needs a bucket in FIREBASE_CONFIG for local require()
export GCLOUD_PROJECT=smoke-test
export FIREBASE_CONFIG='{"projectId":"smoke-test","storageBucket":"smoke-test.appspot.com"}'
node -e "require('./index.js'); console.log('integrations OK')"
cd ../functions-commerce && npm ci && node -e "require('./index.js'); console.log('commerce OK')"
```

Dependency parity guard (scans bundled `.js` for `require('pkg')` vs `package.json`):

```bash
node scripts/verify-codebase-deps.cjs
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
npm run deploy:compliance         # vault, COPPA, WebAuthn, clearance, retention, household + VPC + operative login
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

Dependencies: `stripe`, `qrcode`, `@sendgrid/mail`, `firebase-admin`, `firebase-functions`, `functions-shared` — **no** tfjs, sharp, pdf-parse, webauthn.

**Pre-deploy smoke** (after `npm run bundle:functions`):

```bash
cd functions-commerce && npm ci
node -e "require('./index.js'); console.log('commerce OK')"
```

Deploy **one function first** to confirm Cloud Run health before the full batch:

```bash
firebase deploy --only functions:commerce:stripeWebhook
```

When that revision is healthy, deploy the rest:

```bash
npm run deploy:commerce
```

## Compliance codebase (**DEPLOY-K** / **DEPLOY-N-household**)

`functions-compliance/index.js` re-exports vault (`vaultOps`, `shredOps`), COPPA (`coppa`), passkey auth (`webauthn`), Checkr clearance (`compliance`), document verification (`verifyDocument`), minor retention purge queue (`complianceOps` subset), and the **launch household golden path**:

| Export | Module | Launch surface |
|--------|--------|----------------|
| `linkHousehold` | `complianceOps` | Parent household linking |
| `parentGrantVpcConsent` | `complianceOps` | `/parent/vpc` — VPC ceremony |
| `parentSignCoppaWaiver` | `operativeOps` | `/parent/household` — COPPA waiver |
| `parentProvisionOperative` | `operativeOps` | `/parent/household` — child provisioning |
| `operativeSignInWithDispatch` | `operativeOps` | `/login` — operative dispatch |
| `generatePlayerOTP` | `operativeOps` | `/parent/household` — OTP generation |
| `validatePlayerOTP` | `operativeOps` | `/login` — OTP validation |

Frontend `httpsCallable` names are unchanged — only the deploy target codebase moves from `default` to `compliance`.

Dependencies: `@simplewebauthn/server`, `firebase-admin`, `firebase-functions`, `functions-shared` — **no** tfjs, sharp, pdf-parse, stripe.

**Secrets:** bind `PII_VAULT_MASTER_KEY` only on compliance deploys (`vaultSealPii` / `vaultUnsealPii` in `vaultOps.js`). Do not duplicate vault secret binding on `core` / `rl` codebases.

Example deploy:

```bash
npm run deploy:compliance
firebase deploy --only functions:compliance:vaultSealPii,functions:compliance:vaultUnsealPii
firebase deploy --only functions:compliance:webauthnRegisterStart
```

## Integrations codebase (**DEPLOY-L** / **DEPLOY-P** lazy index)

`functions-integrations/index.js` re-exports nine functions. Each Cloud Run service sets `FUNCTION_TARGET` to one export name at cold start; the index **only** `require()`s that handler’s module so lightweight callables (weather, feeds, uploads) never load `sharp` or `pdf-parse`.

| Export | Module | Heavy deps |
|--------|--------|------------|
| `processMedia` | `./processMedia` | sharp, Gemini |
| `ingestRoster` | `./ingestRoster` | pdf-parse, Gemini |
| `getSoccerNews`, `searchPodcasts`, `getPodcastEpisodes` | `./integrations` | — |
| `getWeatherConditions` | `./weather` | — |
| `getUploadToken`, `deleteAllPlayerMedia` | `./uploadTokens` | — |
| `facilityWeatherWebhook` | `./src/domains/facilityWeatherWebhook` | — (**not** `webhooksOps`) |

Discovery / local full smoke (`FUNCTION_TARGET` and `K_SERVICE` both unset) still eager-loads all modules.

**Cloud Run env resolution (`resolveTarget.js`):** at cold start Cloud Run sets `K_SERVICE` to the lowercase service id (e.g. `getweatherconditions`). Firebase may also set `FUNCTION_TARGET` (camelCase, `integrations.<export>`, or `integrations-<export>`). Production often sets **both**; resolution tries `FUNCTION_TARGET` first (stripping `integrations.` / `integrations-` prefixes), then falls back to `K_SERVICE`. The index uses the Firebase per-export lazy pattern so healthchecks never eager-load `sharp` / `pdf-parse`.

Dependencies: `sharp`, `pdf-parse`, `@google/genai`, `firebase-admin`, `firebase-functions`, `functions-shared` — **no** tfjs, stripe, webauthn.

**Smoke (repo root, after bundle):**

```bash
npm run bundle:functions
cd functions-integrations && npm ci
node ../../scripts/smoke-require-codebase.cjs integrations getWeatherConditions
node ../../scripts/smoke-require-codebase.cjs integrations --simulate-cloud
node ../../scripts/smoke-require-codebase.cjs integrations
```

`--simulate-cloud` sets `K_SERVICE=getweatherconditions` with no `FUNCTION_TARGET` (mirrors Cloud Run healthcheck) and asserts `sharp` is not loaded.

**Predeploy gate:**

```bash
npm run predeploy:integrations
# runs bundle + test:functions-deploy + both smoke paths above
```

**Canary deploy order (256MiB healthcheck):** deploy one light function first; if the revision is **Ready**, deploy the rest.

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT = "120"
Copy-Item functions\.env.sports-skill-tracker-dev functions-integrations\.env
firebase deploy --only functions:integrations:getWeatherConditions
# revision Ready → then:
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
npm run test:functions-deploy
# or:
node --test functions/__tests__/functionsDeploy.guard.test.js
node scripts/verify-codebase-deps.cjs
```

Asserts: no `../functions/` in split indexes, bundle scripts exist, predeploy hooks registered, monolith slim exports, per-codebase npm deps, integrations/commerce `require('./index.js')` smoke after `npm install`, integrations Cloud Run env simulation (`K_SERVICE` lowercase, prefixed `FUNCTION_TARGET`, `--simulate-cloud` smoke script).

## Related

- Tracker: [`ROADMAP.md`](../ROADMAP.md) — Infrastructure — Firebase Functions deploy
- `functions-core/README.md`, `functions-rl/README.md`, `functions-shared/README.md`
