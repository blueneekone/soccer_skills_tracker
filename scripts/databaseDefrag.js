/**
 * scripts/databaseDefrag.js
 * ---------------------------------------------------------------------------
 * Enterprise Firestore Defragmenter — Pre-Sprint 2.6 Ghost-Data Purge.
 *
 * Purges three classes of malformed / orphaned documents:
 *   1. clubs/*   — missing `name` or `sport`
 *   2. teams/*   — `clubId` does not reference an existing club
 *   3. users/*   — missing `role`
 *
 * Safety model:
 *   • Default mode is DRY-RUN. No writes occur without `--execute`.
 *   • All deletes are written through Firestore batches (max 400 / batch)
 *     so we never exceed the 500-op batch hard-limit.
 *   • Every candidate is logged by path before any write is attempted.
 *
 * Credentials (in priority order):
 *   1. `GOOGLE_APPLICATION_CREDENTIALS` env var pointing to a service
 *      account JSON.
 *   2. `./serviceAccountKey.json` at the repo root (gitignored).
 *   3. `gcloud auth application-default login` ambient credentials.
 * ---------------------------------------------------------------------------
 */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { createRequire } from 'node:module';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

/* ------------------------------------------------------------------ */
/* 1. Resolve firebase-admin (reuse functions/node_modules install)   */
/* ------------------------------------------------------------------ */
const rootRequire = createRequire(import.meta.url);
let admin;
try {
	admin = rootRequire('firebase-admin');
} catch {
	const functionsRequire = createRequire(
		path.join(REPO_ROOT, 'functions', 'package.json')
	);
	admin = functionsRequire('firebase-admin');
}

/* ------------------------------------------------------------------ */
/* 2. CLI flags                                                        */
/* ------------------------------------------------------------------ */
const argv = new Set(process.argv.slice(2));
const EXECUTE = argv.has('--execute');
const VERBOSE = argv.has('--verbose') || argv.has('-v');
const PROJECT_ID =
	process.env.GCLOUD_PROJECT ||
	process.env.FIREBASE_PROJECT ||
	'soccer-skills-tracker';

/* ------------------------------------------------------------------ */
/* 3. Initialise firebase-admin                                        */
/* ------------------------------------------------------------------ */
function initAdmin() {
	if (admin.apps.length) return;

	const localKeyPath = path.join(REPO_ROOT, 'serviceAccountKey.json');

	if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
		admin.initializeApp({ projectId: PROJECT_ID });
		console.log(
			`[auth] Using GOOGLE_APPLICATION_CREDENTIALS → ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`
		);
		return;
	}

	if (fs.existsSync(localKeyPath)) {
		const raw = JSON.parse(fs.readFileSync(localKeyPath, 'utf8'));
		admin.initializeApp({
			credential: admin.credential.cert(raw),
			projectId: raw.project_id || PROJECT_ID
		});
		console.log(`[auth] Using ./serviceAccountKey.json (project=${raw.project_id})`);
		return;
	}

	try {
		admin.initializeApp({ projectId: PROJECT_ID });
		console.log(`[auth] Using Application Default Credentials (project=${PROJECT_ID})`);
	} catch (err) {
		console.error(
			'\n✖ No Firebase credentials found.\n' +
				'  Provide one of:\n' +
				'    • $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\path\\to\\sa.json"\n' +
				'    • Place serviceAccountKey.json at the repo root\n' +
				'    • Run: gcloud auth application-default login\n'
		);
		console.error(err);
		process.exit(1);
	}
}

initAdmin();
const db = admin.firestore();

/* ------------------------------------------------------------------ */
/* 4. Banner                                                           */
/* ------------------------------------------------------------------ */
const RED = '\u001b[31m';
const YEL = '\u001b[33m';
const GRN = '\u001b[32m';
const DIM = '\u001b[2m';
const RST = '\u001b[0m';
const RULE = '─'.repeat(76);

console.log(RULE);
console.log(` Firestore Defrag  │  project=${PROJECT_ID}`);
console.log(
	` ${
		EXECUTE
			? `${RED}▶ LIVE EXECUTE MODE — deletions are PERMANENT.${RST}`
			: `${YEL}▶ DRY-RUN (no writes). Pass --execute to commit deletions.${RST}`
	}`
);
console.log(RULE);

/* ------------------------------------------------------------------ */
/* 5. Batched delete helper (max 400 ops / batch)                      */
/* ------------------------------------------------------------------ */
async function commitDeletes(refs, label) {
	if (refs.length === 0 || !EXECUTE) return;
	const BATCH_SIZE = 400;
	for (let i = 0; i < refs.length; i += BATCH_SIZE) {
		const chunk = refs.slice(i, i + BATCH_SIZE);
		const batch = db.batch();
		for (const ref of chunk) batch.delete(ref);
		await batch.commit();
		console.log(`   ${DIM}↳ committed batch delete (${chunk.length}) → ${label}${RST}`);
	}
}

function logCandidate(pathStr, detail) {
	if (!VERBOSE && !EXECUTE) {
		// Always log candidates even on dry-run; they are the point.
	}
	console.log(`   ${RED}✗${RST} ${pathStr}  ${DIM}${detail}${RST}`);
}

/* ------------------------------------------------------------------ */
/* 6. Scan: clubs missing name OR sport                                */
/* ------------------------------------------------------------------ */
async function scanClubs() {
	console.log(`\n[1/3] Scanning ${GRN}clubs${RST} …`);
	const snap = await db.collection('clubs').get();
	const orphans = [];
	const validClubIds = new Set();

	for (const doc of snap.docs) {
		const d = doc.data() || {};
		const name = typeof d.name === 'string' ? d.name.trim() : '';
		const sport = typeof d.sport === 'string' ? d.sport.trim() : '';

		if (!name || !sport) {
			orphans.push(doc.ref);
			logCandidate(
				`clubs/${doc.id}`,
				`name="${d.name ?? ''}"  sport="${d.sport ?? ''}"`
			);
		} else {
			validClubIds.add(doc.id);
		}
	}

	console.log(
		`   scanned=${snap.size}  ghost=${orphans.length}  valid=${validClubIds.size}`
	);
	await commitDeletes(orphans, 'clubs');
	return { validClubIds, purged: orphans.length };
}

/* ------------------------------------------------------------------ */
/* 7. Scan: teams whose clubId is not in the valid-club set            */
/* ------------------------------------------------------------------ */
async function scanTeams(validClubIds) {
	console.log(`\n[2/3] Scanning ${GRN}teams${RST} …`);
	const snap = await db.collection('teams').get();
	const orphans = [];

	for (const doc of snap.docs) {
		const d = doc.data() || {};
		const clubId = typeof d.clubId === 'string' ? d.clubId.trim() : '';

		if (!clubId || !validClubIds.has(clubId)) {
			orphans.push(doc.ref);
			logCandidate(
				`teams/${doc.id}`,
				`clubId="${clubId || '—'}"  name="${d.name ?? ''}"`
			);
		}
	}

	console.log(`   scanned=${snap.size}  ghost=${orphans.length}`);
	await commitDeletes(orphans, 'teams');
	return { purged: orphans.length };
}

/* ------------------------------------------------------------------ */
/* 8. Scan: users missing role                                         */
/* ------------------------------------------------------------------ */
async function scanUsers() {
	console.log(`\n[3/3] Scanning ${GRN}users${RST} …`);
	const snap = await db.collection('users').get();
	const orphans = [];

	for (const doc of snap.docs) {
		const d = doc.data() || {};
		const role = typeof d.role === 'string' ? d.role.trim() : '';

		if (!role) {
			orphans.push(doc.ref);
			logCandidate(
				`users/${doc.id}`,
				`email="${d.email ?? '—'}"  displayName="${d.displayName ?? '—'}"`
			);
		}
	}

	console.log(`   scanned=${snap.size}  ghost=${orphans.length}`);
	await commitDeletes(orphans, 'users');
	return { purged: orphans.length };
}

/* ------------------------------------------------------------------ */
/* 9. Orchestration                                                    */
/* ------------------------------------------------------------------ */
(async () => {
	const started = Date.now();
	try {
		const clubs = await scanClubs();
		const teams = await scanTeams(clubs.validClubIds);
		const users = await scanUsers();

		const elapsed = ((Date.now() - started) / 1000).toFixed(2);

		console.log('\n' + RULE);
		console.log(` Defrag complete in ${elapsed}s`);
		console.log(` Mode   : ${EXECUTE ? `${RED}LIVE${RST}` : `${YEL}DRY-RUN${RST}`}`);
		console.log(
			` Purged : clubs=${clubs.purged}  teams=${teams.purged}  users=${users.purged}`
		);
		if (!EXECUTE && clubs.purged + teams.purged + users.purged > 0) {
			console.log(
				` ${YEL}Re-run with --execute to permanently delete the ghost documents.${RST}`
			);
		}
		console.log(RULE);
		process.exit(0);
	} catch (err) {
		console.error('\n✖ Defrag failed:');
		console.error(err);
		process.exit(1);
	}
})();
