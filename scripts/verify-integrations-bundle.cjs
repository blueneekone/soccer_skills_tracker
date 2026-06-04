'use strict';

/**
 * DEPLOY-P-shared-bootstrap — assert integrations bundle includes bootstrapAdmin.
 *
 * Run from repo root after bundle:
 *   node scripts/verify-integrations-bundle.cjs
 */

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const BOOTSTRAP = path.join(
    REPO_ROOT,
    'functions-integrations',
    'bootstrapAdmin.js',
);

if (!fs.existsSync(BOOTSTRAP)) {
  console.error(
      'missing functions-integrations/bootstrapAdmin.js — run: npm run bundle:functions',
  );
  process.exit(1);
}

console.log('verify-integrations-bundle: OK');
