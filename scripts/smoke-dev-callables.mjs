#!/usr/bin/env node
/**
 * Post-deploy smoke for sports-skill-tracker-dev.
 * Agents run after deploy — owner never runs firebase manually.
 *
 * Usage:
 *   npm run smoke:dev
 *   SMOKE_SKIP_CALLABLES=1 npm run smoke:dev   # hosting + static only
 *
 * Requires network. Callable probes expect 401/403 (unauthenticated) = deployed.
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const PROJECT = process.env.SMOKE_FIREBASE_PROJECT ?? 'sports-skill-tracker-dev';
const REGION = process.env.SMOKE_FUNCTIONS_REGION ?? 'us-east1';
const HOSTING = (process.env.SMOKE_HOSTING_URL ?? 'https://sstracker.app').replace(/\/$/, '');
const SKIP_CALLABLES = process.env.SMOKE_SKIP_CALLABLES === '1';
const DEPLOY_RECORD = path.join(ROOT, 'docs', 'acquisition', 'DEPLOY_RECORD.json');

/** @type {{ name: string; region?: string }[]} */
const CALLABLES = [
	{ name: 'logTrainingSession' },
	{ name: 'createRegistrationIntent' },
	{ name: 'assignSeasonRegistrationToRoster' },
	{ name: 'exportStateRoster' },
	{ name: 'parentGrantVpcConsent' },
	{ name: 'parentSignCoppaWaiver' },
	{ name: 'registerDeviceToken' },
];

const HOSTING_ROUTES = ['/login', '/acquisition', '/privacy'];

/** @param {string} msg */
function fail(msg) {
	console.error(`\nSMOKE FAIL: ${msg}\n`);
	process.exit(1);
}

/** @param {string} url @param {RequestInit} [init] */
async function fetchStatus(url, init) {
	const res = await fetch(url, { redirect: 'follow', ...init });
	return res.status;
}

/** @param {string} route */
async function checkHostingRoute(route) {
	const url = `${HOSTING}${route}`;
	let status;
	try {
		status = await fetchStatus(url);
	} catch (err) {
		fail(`Hosting unreachable ${url}: ${err instanceof Error ? err.message : err}`);
	}
	if (status < 200 || status >= 400) {
		fail(`Hosting ${url} returned HTTP ${status} (expected 2xx/3xx)`);
	}
	console.log(`  OK hosting ${route} → ${status}`);
}

/** @param {string} name @param {string} region */
async function probeCallable(name, region) {
	const url = `https://${region}-${PROJECT}.cloudfunctions.net/${name}`;
	let status;
	try {
		status = await fetchStatus(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ data: {} }),
		});
	} catch (err) {
		fail(`Callable ${name} unreachable at ${url}: ${err instanceof Error ? err.message : err}`);
	}
	// Unauthenticated callable → 401/403; CORS preflight quirks → 400/404 on wrong name
	if (status === 404) {
		fail(`Callable ${name} not found (HTTP 404) — deploy may be stale`);
	}
	if (status >= 500) {
		fail(`Callable ${name} server error HTTP ${status}`);
	}
	console.log(`  OK callable ${name} → HTTP ${status} (endpoint live)`);
}

function checkBuildArtifacts() {
	const buildDir = path.join(ROOT, 'build');
	if (!existsSync(buildDir)) {
		fail('Missing build/ — run npm run build before smoke:dev');
	}
	const indexHtml = path.join(buildDir, 'index.html');
	if (!existsSync(indexHtml)) {
		fail('Missing build/index.html');
	}
	console.log('  OK build/index.html present');
}

function runExportGuard() {
	console.log('\n>> functions export guard\n');
	try {
		execSync('npm run test:functions-deploy', { cwd: ROOT, stdio: 'inherit', shell: true });
	} catch {
		fail('test:functions-deploy failed — split codebase exports broken');
	}
}

function writeDeployRecord() {
	let sha = 'unknown';
	try {
		sha = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
	} catch {
		/* optional */
	}
	const record = {
		project: PROJECT,
		hosting: HOSTING,
		region: REGION,
		checkedAt: new Date().toISOString(),
		commit: sha,
		callablesProbed: SKIP_CALLABLES ? [] : CALLABLES.map((c) => c.name),
		hostingRoutes: HOSTING_ROUTES,
	};
	mkdirSync(path.dirname(DEPLOY_RECORD), { recursive: true });
	writeFileSync(DEPLOY_RECORD, JSON.stringify(record, null, 2) + '\n');
	console.log(`\n  Wrote ${path.relative(ROOT, DEPLOY_RECORD)}`);
}

async function main() {
	console.log(`\nSmoke dev — ${PROJECT} @ ${HOSTING}\n`);

	runExportGuard();
	checkBuildArtifacts();

	console.log('\n>> hosting routes\n');
	for (const route of HOSTING_ROUTES) {
		await checkHostingRoute(route);
	}

	if (SKIP_CALLABLES) {
		console.log('\n>> callables skipped (SMOKE_SKIP_CALLABLES=1)\n');
	} else {
		console.log('\n>> callable endpoints (unauthenticated probe)\n');
		for (const { name, region = REGION } of CALLABLES) {
			await probeCallable(name, region);
		}
	}

	writeDeployRecord();
	console.log('\nSMOKE OK\n');
}

main().catch((err) => {
	fail(err instanceof Error ? err.message : String(err));
});
