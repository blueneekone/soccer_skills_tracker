'use strict';

/**
 * DEPLOY-O — ordered multi-codebase deploy with bundle + failure gates.
 * Run from repo root: node scripts/deploy-backend-systematic.cjs [--with-default]
 */

const {execSync} = require('node:child_process');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const WITH_DEFAULT = process.argv.includes('--with-default');
const SLEEP_MS = 120_000;

/** @param {number} ms */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** @param {string} cmd */
function run(cmd) {
  console.log(`\n>> ${cmd}\n`);
  execSync(cmd, {cwd: REPO_ROOT, stdio: 'inherit', shell: true});
}

/** @param {string} label */
async function sleepGate(label) {
  console.log(
      `\n--- Waiting ${SLEEP_MS / 1000}s before ${label} ` +
      '(Cloud Run write quota) ---\n',
  );
  await sleep(SLEEP_MS);
}

async function main() {
  console.log(
      'Reminder: set FUNCTIONS_DISCOVERY_TIMEOUT=120 before deploy ' +
      '(PowerShell: $env:FUNCTIONS_DISCOVERY_TIMEOUT = "120")',
  );

  run('npm run bundle:functions');

  const steps = [
    {name: 'core', cmd: 'npm run deploy:core', stopOnFail: true},
    {name: 'rl', cmd: 'npm run deploy:rl'},
    {name: 'platform', cmd: 'npm run deploy:platform'},
    {name: 'commerce', cmd: 'npm run deploy:commerce'},
    {name: 'compliance', cmd: 'npm run deploy:compliance'},
    {name: 'integrations', cmd: 'npm run deploy:integrations'},
  ];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (i > 0) {
      await sleepGate(step.name);
    }
    try {
      run(step.cmd);
    } catch (err) {
      if (step.stopOnFail) {
        console.error(
            '\n*** deploy:core FAILED — DO NOT CONTINUE to rl/platform/commerce. ***\n',
        );
        process.exit(1);
      }
      throw err;
    }
  }

  if (WITH_DEFAULT) {
    await sleepGate('default monolith');
    run('firebase deploy --only functions:default');
  }

  console.log('\nSystematic backend deploy complete.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
