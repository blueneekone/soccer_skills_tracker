'use strict';

/**
 * Full dev deploy + post-deploy smoke (agents only — requires FIREBASE_TOKEN or firebase login).
 * Run from repo root: npm run deploy:dev:smoke
 */

const { execSync } = require('node:child_process');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');

/** @param {string} cmd */
function run(cmd) {
	console.log(`\n>> ${cmd}\n`);
	execSync(cmd, {
		cwd: REPO_ROOT,
		stdio: 'inherit',
		shell: true,
		env: { ...process.env, FUNCTIONS_DISCOVERY_TIMEOUT: '120' },
	});
}

function main() {
	const hasToken = Boolean(process.env.FIREBASE_TOKEN || process.env.FIREBASE_CI_TOKEN);
	if (!hasToken) {
		console.warn(
			'WARN: FIREBASE_TOKEN / FIREBASE_CI_TOKEN not set — deploy may prompt or fail in CI.\n' +
				'Agent slices: append SLICE_LOG Blocked and exit if deploy fails.\n',
		);
	}
	run('npm run build');
	run('npm run deploy:dev');
	run('npm run deploy:dev:verify');
	run('npm run smoke:dev');
	console.log('\nDeploy + smoke complete.\n');
}

main();
