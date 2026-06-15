'use strict';

/**
 * LAUNCH-deploy-dev — full dev deploy to sports-skill-tracker-dev per FUNCTIONS_DEPLOY.md.
 * Requires: firebase login or FIREBASE_TOKEN, npm run build already run for hosting.
 * Run from repo root: node scripts/deploy-dev-full.cjs
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
    throw new Error(`Missing ${ENV_SRC}`);
  }
  for (const dir of CODEBASES) {
    copyFileSync(ENV_SRC, path.join(REPO_ROOT, dir, '.env'));
  }
}

function main() {
  console.log(`Deploy target: ${DEV_PROJECT}`);
  copyDevEnv();
  run(`npx firebase-tools use ${DEV_PROJECT}`);
  run('npm run deploy:backend:systematic');
  run(`npx firebase-tools deploy --project ${DEV_PROJECT} --only firestore:rules,storage`);
  run(`npx firebase-tools deploy --project ${DEV_PROJECT} --only hosting`);
  run(`npx firebase-tools deploy --project ${DEV_PROJECT} --only functions:default --force`);
  console.log(`\nFull dev deploy complete: ${DEV_PROJECT}\n`);
}

main();
