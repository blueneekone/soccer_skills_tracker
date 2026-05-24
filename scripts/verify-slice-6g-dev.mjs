/**
 * Verify Sprint 2.22 slice 6g without Playwright or OTP test credentials.
 *
 * 1. Confirms the local dev server responds
 * 2. Runs structural/regression vitest guards
 * 3. Prints a manual browser QA checklist (use your existing OTP session in the browser)
 *
 * Usage:
 *   npm run dev   (http://127.0.0.1:5173)
 *   node scripts/verify-slice-6g-dev.mjs
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.DEV_BASE_URL ?? 'http://127.0.0.1:5173';
const ROOT = path.resolve(import.meta.dirname, '..');

const TEST_PATHS = [
	'src/lib/components/player/dashboard/__tests__/playerHudSprint236.test.ts',
	'src/lib/components/player/dashboard/__tests__/playerHudSprint225.test.ts',
	'src/lib/components/player/dashboard/__tests__/playerHudSprint220.test.ts',
	'src/lib/components/player/dashboard/__tests__/playerHudSprint216.test.ts',
	'src/lib/components/player/dashboard/__tests__/playerHudSprint233.test.ts',
];

function ok(label) {
	console.log(`  ✓ ${label}`);
}

function fail(label, detail = '') {
	console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
}

async function pingDevServer() {
	try {
		const res = await fetch(BASE, { redirect: 'manual' });
		if (res.status >= 200 && res.status < 500) {
			ok(`Dev server reachable at ${BASE} (${res.status})`);
			return true;
		}
		fail(`Dev server returned ${res.status} at ${BASE}`);
		return false;
	} catch (err) {
		fail(`Dev server not reachable at ${BASE}`, err instanceof Error ? err.message : String(err));
		console.error('\nStart the dev server first: npm run dev');
		return false;
	}
}

function runVitest() {
	console.log('\nRunning structural/regression tests…');
	const result = spawnSync('npm', ['test', '--', ...TEST_PATHS], {
		cwd: ROOT,
		stdio: 'inherit',
		shell: true,
	});
	if (result.status === 0) {
		ok('Vitest slice 6g regression suite passed');
		return true;
	}
	fail('Vitest slice 6g regression suite failed');
	return false;
}

function printManualChecklist() {
	console.log(`
Manual browser QA (no Playwright — use your existing OTP login session):

  1. Open ${BASE}/stats while signed in as a player
  2. DevTools → Elements: root has .player-hud-root.player-dossier-root
  3. VPP section: [data-region="stats-analytics-void"] — no .pd-page-panel on same element
  4. Empty state: inspector whisper ("Awaiting coach telemetry") beside radar, not a big slab
  5. Tap PAC (or any vector): inspector expands with axis detail
  6. Workout band: .stats-workout-band below VPP; chart well uses teal Z1 inset
  7. Toggle Daily / Weekly / Monthly — chart updates without full-page reload
  8. Resize to 390px — VPP + workout stack, no horizontal overflow
  9. Open ${BASE}/player/dashboard — HQ analytics void unchanged

Optional DevTools console checks on /stats:

  document.querySelector('.player-hud-root') !== null
  document.querySelector('[data-region="stats-analytics-void"]') !== null
  !document.querySelector('[data-region="stats-analytics-void"]')?.classList.contains('pd-page-panel')
  document.querySelector('.stats-workout-band .dossier-workout__chart') !== null
`);
}

async function main() {
	console.log('Sprint 2.22 slice 6g — dev-server verification (no Playwright)\n');

	const serverUp = await pingDevServer();
	const testsOk = runVitest();

	printManualChecklist();

	if (!serverUp || !testsOk) {
		process.exit(1);
	}

	console.log('Automated checks passed. Complete manual browser QA above to sign off visuals.');
}

main();
