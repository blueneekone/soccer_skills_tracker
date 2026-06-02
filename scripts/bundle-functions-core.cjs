'use strict';

/**
 * DEPLOY-O-bundle — legacy entry for functions-core predeploy.
 * Delegates to bundle-functions.cjs (shared + core only).
 */

const {execFileSync} = require('node:child_process');
const path = require('node:path');

execFileSync(
    process.execPath,
    [path.join(__dirname, 'bundle-functions.cjs'), 'shared', 'core'],
    {stdio: 'inherit'},
);
