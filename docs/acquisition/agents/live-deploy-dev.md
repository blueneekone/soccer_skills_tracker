# Agent — live-deploy-dev

**Branch:** `closure/live-deploy-dev`

**Owns:** operator deploy only — `scripts/deploy-dev-full.cjs`, `package.json` deploy scripts (no logic change unless verify fails)

## Task

Register **A-01**, **A-06** — live deploy to `sports-skill-tracker-dev`:

1. `npm run build`
2. `npm run deploy:dev` (or sequential `deploy:core`, `deploy:rl`, `deploy:commerce`, `deploy:compliance`, `deploy:integrations`, `deploy:platform`, `deploy:comms`, default functions, firestore rules, storage, hosting per FUNCTIONS_DEPLOY.md)
3. `npm run deploy:dev:verify` green
4. Append SLICE_LOG with deploy timestamp + commit SHA

**Blocked without:** `FIREBASE_CI_TOKEN` or local `firebase login`.

---

Universal rules: Append SLICE_LOG.md only. Do NOT build rejects R-01–R-03. Do not ask questions.
