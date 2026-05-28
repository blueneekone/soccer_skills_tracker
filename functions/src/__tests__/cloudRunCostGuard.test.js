/**
 * cloudRunCostGuard.test.js — forbid warm Cloud Run minInstances in alpha/dev.
 *
 * Run from functions/: npm test -- src/__tests__/cloudRunCostGuard.test.js
 * Or: node --test src/__tests__/cloudRunCostGuard.test.js
 */

'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const FUNCTIONS_ROOT = path.resolve(__dirname, '..', '..');

/** @param {string} dir @returns {string[]} */
function listJsFiles(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === 'lib') continue;
      out.push(...listJsFiles(full));
    } else if (ent.isFile() && ent.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

describe('cloudRunCostGuard', () => {
  it('rejects minInstances >= 1 anywhere under functions/', () => {
    const files = listJsFiles(FUNCTIONS_ROOT);
    const warmMin = /minInstances:\s*[1-9]/;
    const violations = [];

    for (const file of files) {
      const src = fs.readFileSync(file, 'utf8');
      if (warmMin.test(src)) {
        violations.push(path.relative(FUNCTIONS_ROOT, file));
      }
    }

    assert.equal(
        violations.length,
        0,
        `minInstances >= 1 found in: ${violations.join(', ')}`,
    );
  });

  it('getAdaptiveWorkoutPolicy uses alpha scale-to-zero callable opts', () => {
    const rlOps = fs.readFileSync(
        path.join(FUNCTIONS_ROOT, 'rlOps.js'),
        'utf8',
    );
    const alphaOpts = fs.readFileSync(
        path.join(FUNCTIONS_ROOT, 'src/utils/alphaRunOptions.js'),
        'utf8',
    );
    const block = rlOps.match(
        /exports\.getAdaptiveWorkoutPolicy\s*=\s*onCall\([\s\S]*?async\s*\(/,
    );
    assert.ok(block, 'getAdaptiveWorkoutPolicy onCall block not found');
    assert.match(
        block[0],
        /\.\.\.ALPHA_CALLABLE_OPTS/,
        'getAdaptiveWorkoutPolicy must spread ALPHA_CALLABLE_OPTS',
    );
    assert.match(
        alphaOpts,
        /minInstances:\s*0/,
        'ALPHA_CALLABLE_OPTS must set minInstances: 0',
    );
  });
});
