'use strict';

/**
 * LAUNCH-deploy-dev — local prep gates (no Firebase auth required).
 * Run from repo root: node scripts/deploy-dev-verify.cjs
 */

const {execSync} = require('node:child_process');
const {copyFileSync, existsSync} = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const DEV_PROJECT = 'sports-skill-tracker-dev';
const ENV_SRC = path.join(REPO_ROOT, 'functions', `.env.${DEV_PROJECT}`);
const CODEBASES = [
  'functions-core',
  'functions-rl',
  'functions-commerce',
  'functions-compliance',
  'functions-integrations',
  'functions-platform',
];

/** @param {string} cmd */
function run(cmd) {
  console.log(`\n>> ${cmd}\n`);
  execSync(cmd, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    shell: true,
    env: {...process.env, FUNCTIONS_DISCOVERY_TIMEOUT: '120'},
  });
}

function copyDevEnv() {
  if (!existsSync(ENV_SRC)) {
    throw new Error(`Missing ${ENV_SRC} — copy from functions/.env.example`);
  }
  for (const dir of CODEBASES) {
    copyFileSync(ENV_SRC, path.join(REPO_ROOT, dir, '.env'));
    console.log(`copied env → ${dir}/.env`);
  }
}

function main() {
  run(
      'npm test -- src/lib/security/__tests__/loopIntegrityGuards.test.ts ' +
      'src/lib/parent/__tests__/launchWave2Complete.test.ts ' +
      'src/lib/gamification/__tests__/personaFunctionalMvp.test.ts',
  );
  run('npm run test:functions-deploy');
  run('npm run predeploy:integrations');
  copyDevEnv();
  console.log(
      `\nLocal deploy gates green for ${DEV_PROJECT}. ` +
      'Live deploy: npm run deploy:dev (requires firebase login or FIREBASE_TOKEN)\n',
  );
}

main();
