'use strict';

/**
 * REGRESSION-AUDIT-BUNDLE — local pre-deploy gate (no Firebase auth required).
 * Run from repo root: npm run audit:pre-deploy
 *
 * After deploy succeeds, re-run smoke probes against live dev:
 *   npm run smoke:dev
 */

const {execSync} = require('node:child_process');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');

/** @param {string} cmd */
function run(cmd) {
  console.log(`\n>> ${cmd}\n`);
  execSync(cmd, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    shell: true,
  });
}

function main() {
  console.log('\n=== REGRESSION-AUDIT-BUNDLE (pre-deploy) ===\n');
  run('npm run test:regression:acquisition');
  run('npm run check');
  run('npm run build');
  console.log(
      '\n=== Pre-deploy regression audit green ===\n' +
      'Re-run after deploy if hosting changed, then:\n' +
      '  npm run smoke:dev\n',
  );
}

main();
