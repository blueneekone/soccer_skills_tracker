/**
 * functionsDeploy.guard.test.js — multi-codebase export wiring regression guards.
 *
 * Run from repo root:
 *   node --test functions/__tests__/functionsDeploy.guard.test.js
 */

'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const FUNCTIONS_ROOT = path.join(REPO_ROOT, 'functions');

/** @param {string} rel @returns {string} */
function readRepo(rel) {
  return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

/** @param {string} exportName @param {string} src */
function assertExportLine(exportName, src) {
  const re = new RegExp(
      `exports\\.${exportName}\\s*=`,
  );
  assert.match(src, re, `missing exports.${exportName}`);
}

describe('functionsDeploy guard — codebase indexes', () => {
  const SPLIT_INDEXES = [
    'functions-core/index.js',
    'functions-rl/index.js',
    'functions-commerce/index.js',
    'functions-compliance/index.js',
    'functions-integrations/index.js',
    'functions-platform/index.js',
    'functions-shared/index.js',
  ];

  for (const rel of SPLIT_INDEXES) {
    it(`${rel} does not require ../functions/`, () => {
      const src = readRepo(rel);
      assert.doesNotMatch(
          src,
          /require\(['"]\.\.\/functions\//,
          `${rel} must use local bundled paths`,
      );
    });
  }

  it('functions-core/index.js exports launch training + intent callables', () => {
    const src = readRepo('functions-core/index.js');
    for (const name of [
      'logTrainingSession',
      'secureDeployIntent',
      'secureCancelIntent',
      'secureExtendIntent',
    ]) {
      assertExportLine(name, src);
    }
    assert.match(
        src,
        /require\(['"]\.\/src\/domains\/trainingOps['"]\)/,
        'functions-core must require bundled local trainingOps',
    );
  });

  it('functions-rl/index.js exports launch RL callables + triggers', () => {
    const src = readRepo('functions-rl/index.js');
    for (const name of [
      'getAdaptiveWorkoutPolicy',
      'initRlPolicy',
      'rlOnWorkoutLogCreated',
      'rlOnPhysioReportCreated',
      'submitPhysioSelfReport',
    ]) {
      assertExportLine(name, src);
    }
    assert.match(src, /require\(['"]\.\/rlOps['"]\)/);
    assert.match(
        src,
        /require\(['"]\.\/src\/ml\/transitionRecorder['"]\)/,
    );
  });
});

describe('functionsDeploy guard — DEPLOY-O bundle scripts', () => {
  const BUNDLE_SCRIPTS = [
    'scripts/bundle-functions-lib.cjs',
    'scripts/bundle-functions.cjs',
    'scripts/bundle-functions-core.cjs',
  ];

  for (const rel of BUNDLE_SCRIPTS) {
    it(`${rel} exists`, () => {
      assert.ok(
          fs.existsSync(path.join(REPO_ROOT, rel)),
          `missing ${rel}`,
      );
    });
  }

  it('bundle-functions.cjs copies closures into split codebases', () => {
    execFileSync(
        process.execPath,
        ['scripts/bundle-functions.cjs'],
        {cwd: REPO_ROOT, stdio: 'pipe'},
    );
    const samples = [
      'functions-core/src/domains/trainingOps.js',
      'functions-rl/rlOps.js',
      'functions-rl/src/ml/trainer.js',
      'functions-commerce/commerce.js',
      'functions-compliance/src/domains/vaultOps.js',
      'functions-integrations/processMedia.js',
      'functions-platform/apiGateway.js',
      'functions-shared/src/utils/alphaRunOptions.js',
    ];
    for (const rel of samples) {
      assert.ok(
          fs.existsSync(path.join(REPO_ROOT, rel)),
          `expected ${rel} after bundle`,
      );
    }
  });
});

describe('functionsDeploy guard — firebase.json codebases', () => {
  const EXPECTED_CODEBASES = [
    'default',
    'core',
    'rl',
    'commerce',
    'compliance',
    'integrations',
    'platform',
  ];

  it('registers all split codebases with bundle predeploy', () => {
    const firebase = JSON.parse(readRepo('firebase.json'));
    const entries = firebase.functions;
    assert.ok(Array.isArray(entries), 'firebase.json must have functions array');
    const codebases = entries.map((e) => e.codebase);
    for (const name of EXPECTED_CODEBASES) {
      assert.ok(codebases.includes(name), `missing codebase "${name}"`);
    }
    assert.equal(
        entries.find((e) => e.codebase === 'core')?.source,
        'functions-core',
    );
    assert.equal(
        entries.find((e) => e.codebase === 'platform')?.source,
        'functions-platform',
    );
    for (const name of ['core', 'rl', 'commerce', 'compliance', 'integrations', 'platform']) {
      const entry = entries.find((e) => e.codebase === name);
      assert.ok(entry?.predeploy?.length, `${name} must have predeploy bundle hook`);
      assert.match(
          entry.predeploy.join(' '),
          /bundle-functions\.cjs/,
          `${name} predeploy must run bundle-functions.cjs`,
      );
    }
  });
});

describe('functionsDeploy guard — monolith slim (DEPLOY-N)', () => {
  const MIGRATED_FROM_DEFAULT = [
    'logTrainingSession',
    'secureDeployIntent',
    'secureCancelIntent',
    'secureExtendIntent',
    'initRlPolicy',
    'getAdaptiveWorkoutPolicy',
    'rlOnWorkoutLogCreated',
    'apiGateway',
    'createStripeCheckoutSession',
    'stripeWebhook',
    'vaultSealPii',
    'processMedia',
    'webauthnRegisterStart',
  ];

  it('functions/index.js does not export symbols owned by split codebases', () => {
    const src = readRepo('functions/index.js');
    for (const name of MIGRATED_FROM_DEFAULT) {
      assert.doesNotMatch(
          src,
          new RegExp(`exports\\.${name}\\s*=`),
          `default index must not export ${name}`,
      );
    }
    assert.match(
        src,
        /logger\.warn\([\s\S]*Legacy monolith index/,
        'default index should warn that split codebases own production surfaces',
    );
  });

  it('all functions package.json engines.node are 20', () => {
    const pkgs = [
      'functions/package.json',
      'functions-shared/package.json',
      'functions-core/package.json',
      'functions-rl/package.json',
      'functions-commerce/package.json',
      'functions-compliance/package.json',
      'functions-integrations/package.json',
      'functions-platform/package.json',
    ];
    for (const rel of pkgs) {
      const pkg = JSON.parse(readRepo(rel));
      assert.equal(
          pkg.engines?.node,
          '20',
          `${rel} engines.node must be "20"`,
      );
    }
  });
});

describe('functionsDeploy guard — dependency isolation', () => {
  it('functions-core/package.json excludes @tensorflow/tfjs-node', () => {
    const pkg = JSON.parse(readRepo('functions-core/package.json'));
    const deps = {...pkg.dependencies, ...pkg.devDependencies};
    assert.equal(
        deps['@tensorflow/tfjs-node'],
        undefined,
        'functions-core must not depend on tfjs-node',
    );
  });

  it('functions-rl/package.json includes @tensorflow/tfjs-node', () => {
    const pkg = JSON.parse(readRepo('functions-rl/package.json'));
    assert.ok(
        pkg.dependencies?.['@tensorflow/tfjs-node'],
        'functions-rl must depend on @tensorflow/tfjs-node',
    );
  });
});

describe('functionsDeploy guard — launch callable memory', () => {
  const LAUNCH_CALLABLES = [
    'logTrainingSession',
    'secureDeployIntent',
    'secureCancelIntent',
    'secureExtendIntent',
  ];

  it('trainingOps launch callables use 512MiB (LAUNCH_CORE_CALLABLE_OPTS)', () => {
    const src = fs.readFileSync(
        path.join(FUNCTIONS_ROOT, 'src/domains/trainingOps.js'),
        'utf8',
    );
    assert.match(
        src,
        /LAUNCH_CORE_CALLABLE_OPTS\s*=\s*\{[^}]*memory:\s*['"]512MiB['"]/,
        'LAUNCH_CORE_CALLABLE_OPTS must set memory 512MiB',
    );
    for (const name of LAUNCH_CALLABLES) {
      const block = src.match(
          new RegExp(
              `exports\\.${name}\\s*=\\s*onCall\\([\\s\\S]*?async\\s*\\(`,
          ),
      );
      assert.ok(block, `${name} onCall block not found`);
      assert.match(
          block[0],
          /LAUNCH_CORE_CALLABLE_OPTS/,
          `${name} must use LAUNCH_CORE_CALLABLE_OPTS`,
      );
    }
  });
});
