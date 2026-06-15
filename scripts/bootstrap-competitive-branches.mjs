#!/usr/bin/env node
/**
 * Bootstrap competitive/* branches from dev for Wave 4 fleet.
 * Run before: node scripts/launch-overnight-agents.mjs --wave 4a
 *
 * Usage: node scripts/bootstrap-competitive-branches.mjs
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const WAVE_4A = [
	'comp-competitive-doc-sync',
	'comp-roster-dragdrop',
	'comp-tournament-brackets',
	'comp-checkr-lifecycle',
];

const WAVE_4B = ['comp-federation-phase3', 'comp-streaming-schedule'];

const WAVE_4C = ['comp-capacitor-polish'];

const WAVE_ORCH4 = ['orch-wave4'];

const ALL_SLICES = [...WAVE_4A, ...WAVE_4B, ...WAVE_4C, ...WAVE_ORCH4];

function run(cmd) {
	return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' }).trim();
}

function main() {
	run('git checkout dev');
	run('git pull origin dev');

	let ok = 0;
	const failed = [];

	for (const id of ALL_SLICES) {
		const branch = `competitive/${id}`;
		try {
			run(`git branch -f ${branch} dev`);
			run(`git push -u origin ${branch}`);
			console.log(`OK ${branch}`);
			ok += 1;
		} catch (err) {
			console.error(`FAIL ${branch}: ${err.message}`);
			failed.push(branch);
		}
	}

	console.log(`\nBootstrapped ${ok}/${ALL_SLICES.length} competitive branches from dev.`);

	if (failed.length > 0) {
		console.error(`Failed: ${failed.join(', ')}`);
		process.exit(1);
	}

	process.exit(0);
}

main();
