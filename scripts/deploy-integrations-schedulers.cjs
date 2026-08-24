'use strict';

/**
 * Deploy integrations schedulers (gated behind SCHEDULERS_ENABLED in functions-integrations/index.js).
 * Dev `.env` sets SCHEDULERS_ENABLED=false — this script forces true for discovery only.
 *
 * Run from repo root: node scripts/deploy-integrations-schedulers.cjs
 */

const {execSync} = require('node:child_process');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');

const ONLY = 'functions:integrations:evaluateFieldWeatherLock';

const env = {
  ...process.env,
  SCHEDULERS_ENABLED: 'true',
};

console.log(
    '[deploy-integrations-schedulers] SCHEDULERS_ENABLED=true for Firebase discovery',
);
console.log(`[deploy-integrations-schedulers] --only ${ONLY}`);

execSync(`firebase deploy --only "${ONLY}"`, {
  cwd: REPO_ROOT,
  stdio: 'inherit',
  shell: true,
  env,
});
