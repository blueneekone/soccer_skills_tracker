#!/usr/bin/env node
/**
 * Seed QA operative with demo precomposed bust parts (no avatar builder).
 *
 * Usage:
 *   node scripts/seed-demo-operative-avatar.mjs --operative-email child@operative.local
 *   node scripts/seed-demo-operative-avatar.mjs --operative-email child@operative.local --execute
 *
 * Default: dry-run. --execute writes merge to users/{email}.
 * Project: sports-skill-tracker-dev only (same guards as dev-tenant-reset).
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { seedDemoOperativeAvatar } from './lib/seed-demo-operative-avatar.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_PROJECT = 'sports-skill-tracker-dev';
const BLOCKED_PROJECTS = new Set(['soccer-skills-tracker', 'soccer-skills-tracker-prod']);

const argv = process.argv.slice(2);
const hasFlag = (f) => argv.includes(f);
const flagVal = (f, fallback) => {
	const hit = argv.find((a) => a.startsWith(`${f}=`));
	if (hit) return hit.slice(f.length + 1);
	const i = argv.indexOf(f);
	return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};

const PROJECT_ID = flagVal('--project', DEFAULT_PROJECT);
const EXECUTE = hasFlag('--execute');
const operativeEmail = String(flagVal('--operative-email', '') || '')
	.trim()
	.toLowerCase();

function resolveAdmin() {
	const rootRequire = createRequire(import.meta.url);
	let admin;
	try {
		admin = rootRequire('firebase-admin');
	} catch {
		const fnReq = createRequire(path.join(REPO_ROOT, 'functions', 'package.json'));
		admin = fnReq('firebase-admin');
	}
	const saPath = path.join(REPO_ROOT, 'serviceAccountKey.json');
	if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
		admin.initializeApp({ projectId: PROJECT_ID });
	} else if (fs.existsSync(saPath)) {
		const raw = JSON.parse(fs.readFileSync(saPath, 'utf8'));
		admin.initializeApp({
			credential: admin.credential.cert(raw),
			projectId: raw.project_id || PROJECT_ID,
		});
	} else {
		admin.initializeApp({ projectId: PROJECT_ID });
	}
	return admin;
}

async function main() {
	if (BLOCKED_PROJECTS.has(PROJECT_ID) && !hasFlag('--i-know-prod')) {
		console.error(`[seed-demo-operative-avatar] Refusing project "${PROJECT_ID}".`);
		process.exit(1);
	}
	if (!operativeEmail) {
		console.error('Usage: node scripts/seed-demo-operative-avatar.mjs --operative-email <email> [--execute]');
		process.exit(1);
	}

	const admin = resolveAdmin();
	const db = admin.firestore();
	const result = await seedDemoOperativeAvatar(db, operativeEmail, !EXECUTE);
	console.log(
		EXECUTE ?
			`[execute] Seeded demo avatar on users/${operativeEmail}` :
			`[dry-run] Would seed demo avatar on users/${operativeEmail}`,
	);
	console.log(JSON.stringify(result.payload, null, 2));
}

main().catch((e) => {
	console.error('[seed-demo-operative-avatar] Fatal:', e);
	process.exit(1);
});
