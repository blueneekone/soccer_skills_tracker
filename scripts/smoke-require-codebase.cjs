'use strict';

/**
 * Smoke-require a split functions codebase index (optionally one FUNCTION_TARGET).
 *
 *   node scripts/smoke-require-codebase.cjs integrations
 *   node scripts/smoke-require-codebase.cjs integrations getWeatherConditions
 *   node scripts/smoke-require-codebase.cjs integrations --simulate-cloud
 *
 * Run from repo root after `npm run bundle:functions` and `npm ci` in the codebase folder.
 */

const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');

/** @type {Record<string, string>} */
const CODEBASE_DIRS = {
  integrations: 'functions-integrations',
};

const codebase = process.argv[2];
const arg3 = process.argv[3] || '';
const simulateCloud = arg3 === '--simulate-cloud';
const functionTarget = simulateCloud ? '' : arg3;

if (!codebase || !CODEBASE_DIRS[codebase]) {
  console.error(
      'Usage: node scripts/smoke-require-codebase.cjs <integrations> [exportName|--simulate-cloud]',
  );
  process.exit(1);
}

const indexPath = path.join(REPO_ROOT, CODEBASE_DIRS[codebase], 'index.js');

process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'smoke-test';
if (!process.env.FIREBASE_CONFIG) {
  process.env.FIREBASE_CONFIG = JSON.stringify({
    projectId: process.env.GCLOUD_PROJECT,
    storageBucket: `${process.env.GCLOUD_PROJECT}.appspot.com`,
  });
}

delete process.env.K_SERVICE;

if (simulateCloud) {
  process.env.K_SERVICE = 'getweatherconditions';
  process.env.FUNCTION_TARGET = 'integrations-getWeatherConditions';
} else if (functionTarget) {
  process.env.FUNCTION_TARGET = functionTarget;
  delete process.env.K_SERVICE;
} else {
  delete process.env.FUNCTION_TARGET;
  delete process.env.K_SERVICE;
}

/** @returns {boolean} */
function isSharpLoaded() {
  return Object.keys(require.cache).some(
      (key) => key.includes(`${path.sep}sharp${path.sep}`) ||
        key.endsWith(`${path.sep}sharp`) ||
        /[/\\]sharp[/\\]/.test(key),
  );
}

require(indexPath);

const weatherOnly =
  simulateCloud ||
  functionTarget === 'getWeatherConditions' ||
  functionTarget === 'getweatherconditions';

if (weatherOnly) {
  if (isSharpLoaded()) {
    const envLabel = simulateCloud
      ? 'K_SERVICE=getweatherconditions + FUNCTION_TARGET=integrations-getWeatherConditions'
      : `FUNCTION_TARGET=${functionTarget}`;
    console.error(`FAIL: sharp loaded for ${envLabel}`);
    process.exit(1);
  }
}

const label = simulateCloud
  ? `${codebase} OK (Cloud Run simulate, lazy)`
  : functionTarget
    ? `${codebase} OK (${functionTarget}, lazy)`
    : `${codebase} OK (discovery)`;
console.log(label);
