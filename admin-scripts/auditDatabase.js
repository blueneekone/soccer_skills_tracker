/**
 * auditDatabase.js — READ-ONLY Firestore integrity scan (Phase 4 pre-migration)
 *
 * Collections scanned: `users`, `teams`, `clubs` (this project uses `clubs` as org records; there is no separate `organizations` top-level collection in the default schema).
 *
 * PREREQUISITES
 * ─────────────
 * 1. Install the Admin SDK in the project root (once):
 *    npm install firebase-admin
 *
 * 2. Download a Firebase service account key JSON from
 *    Firebase Console → Project settings → Service accounts → Generate new private key.
 *    Do NOT commit this file; keep it outside the repo or add it to .gitignore.
 *
 * 3. Point Node at the key file using ONE of:
 *
 *    A) Environment variable (recommended, matches gcloud / Firebase tools):
 *       set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\serviceAccountKey.json   (Windows cmd)
 *       $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\serviceAccountKey.json"   (PowerShell)
 *       export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json   (macOS / Linux)
 *
 *    B) First CLI argument (path to the same JSON file):
 *       node admin-scripts/auditDatabase.js C:\path\to\serviceAccountKey.json
 *
 *    If GOOGLE_APPLICATION_CREDENTIALS is set, it takes precedence over the CLI path.
 *
 * HOW TO RUN
 * ──────────
 * From the repository root:
 *    node admin-scripts/auditDatabase.js
 *
 * Or with an explicit key path:
 *    node admin-scripts/auditDatabase.js ./secrets/serviceAccountKey.json
 *
 * EXIT CODES: 0 = success (report printed), 1 = configuration or runtime error
 *
 * SAFETY: This script performs NO writes, deletes, or batch mutations — GET / list reads only.
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * @param {unknown} v
 * @returns {string}
 */
function normEmail(v) {
	if (typeof v !== 'string') return '';
	return v.trim().toLowerCase();
}

/**
 * @param {unknown} v
 * @returns {boolean}
 */
function isEmptyHouseholdId(v) {
	if (v == null) return true;
	if (typeof v === 'string') return v.trim() === '';
	return true;
}

function initFirebaseAdmin() {
	const fromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
	const fromArg = process.argv[2] ? resolve(process.argv[2]) : '';

	let keyPath = '';
	if (fromEnv && String(fromEnv).trim()) {
		keyPath = resolve(String(fromEnv).trim());
	} else if (fromArg) {
		keyPath = fromArg;
	}

	if (!keyPath) {
		console.error(
			'[audit] Missing credentials.\n' +
				'  Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path, or run:\n' +
				'  node admin-scripts/auditDatabase.js <path-to-serviceAccountKey.json>\n',
		);
		process.exit(1);
	}

	if (!existsSync(keyPath)) {
		console.error(`[audit] Service account file not found: ${keyPath}`);
		process.exit(1);
	}

	let credential;
	try {
		const json = readFileSync(keyPath, 'utf8');
		credential = admin.credential.cert(/** @type {import('firebase-admin').ServiceAccount} */ (JSON.parse(json)));
	} catch (e) {
		console.error('[audit] Could not read or parse the service account JSON.', e);
		process.exit(1);
	}

	admin.initializeApp({ credential });
	return admin.firestore();
}

/**
 * @param {FirebaseFirestore.QueryDocumentSnapshot} doc
 */
function userEmailFromDoc(doc) {
	const d = doc.data() || {};
	const e = d.email;
	if (typeof e === 'string' && e.trim()) return normEmail(e);
	// `users` documents are often keyed by lowercased email
	return normEmail(doc.id);
}

async function main() {
	const db = initFirebaseAdmin();

	console.log('\n══ Phoenix · Firestore READ-ONLY audit ══');
	console.log(
		`   Project: ${process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || '(see service account JSON)'}`,
	);
	console.log(`   Started: ${new Date().toISOString()}\n`);

	// ---- clubs (org catalog) — build id set
	const clubsSnap = await db.collection('clubs').get();
	/** @type {Set<string>} */
	const clubIds = new Set();
	clubsSnap.forEach((d) => clubIds.add(d.id));
	console.log(`[scan] clubs:   ${clubIds.size} document(s)\n`);

	// ---- teams — staff roster + orphan check
	const teamsSnap = await db.collection('teams').get();
	/** @type {Set<string>} */
	const staffEmails = new Set();
	/** @type {Array<{ teamId: string; clubId: unknown; reason: string; detail?: string }>} */
	const orphanedTeams = [];

	teamsSnap.forEach((d) => {
		const t = d.data() || {};
		const teamId = d.id;
		const rawCid = t.clubId;
		const cid = typeof rawCid === 'string' ? rawCid.trim() : rawCid;

		if (cid == null || cid === '') {
			orphanedTeams.push({ teamId, clubId: rawCid, reason: 'missing_clubId' });
		} else if (typeof cid === 'string' && !clubIds.has(cid)) {
			orphanedTeams.push({ teamId, clubId: cid, reason: 'club_not_found' });
		}

		const head = normEmail(t.coachEmail);
		if (head) staffEmails.add(head);
		const assistants = Array.isArray(t.assistants) ? t.assistants : [];
		for (const a of assistants) {
			const n = normEmail(a);
			if (n) staffEmails.add(n);
		}
	});

	console.log(`[scan] teams:   ${teamsSnap.size} document(s) · unique staff emails (head + assistants): ${staffEmails.size}\n`);

	// ---- users
	const usersSnap = await db.collection('users').get();
	/** @type {Array<{ userDocId: string; email: string; role: string; householdId: unknown }>} */
	const playersNoHousehold = [];
	/** @type {Array<{ userDocId: string; email: string; role: string }>} */
	const unassignedCoaches = [];

	usersSnap.forEach((d) => {
		const u = d.data() || {};
		const roleRaw = u.role;
		const role = typeof roleRaw === 'string' ? roleRaw.toLowerCase().trim() : '';
		const userDocId = d.id;
		const email = userEmailFromDoc(d);

		if (role === 'player') {
			if (isEmptyHouseholdId(u.householdId)) {
				playersNoHousehold.push({
					userDocId,
					email: email || '(no email field)',
					role: String(roleRaw ?? 'player'),
					householdId: u.householdId,
				});
			}
		}

		if (role === 'coach') {
			if (!email) {
				unassignedCoaches.push({
					userDocId,
					email: '— (cannot determine email; check doc id & email field)',
					role: String(roleRaw ?? 'coach'),
				});
			} else if (!staffEmails.has(email)) {
				unassignedCoaches.push({ userDocId, email, role: String(roleRaw ?? 'coach') });
			}
		}
	});

	console.log(`[scan] users:   ${usersSnap.size} document(s)\n`);
	console.log('─'.repeat(60));

	// ---- Report
	console.log('\n▶ 1) PLAYERS without householdId (null / missing / empty string)\n');
	if (playersNoHousehold.length === 0) {
		console.log('   None detected.\n');
	} else {
		console.log(`   Count: ${playersNoHousehold.length}\n`);
		for (const row of playersNoHousehold) {
			console.log(
				`   · doc=${row.userDocId}  email=${row.email}  householdId=${JSON.stringify(row.householdId)}`,
			);
		}
		console.log('');
	}

	console.log('▶ 2) ORPHANED TEAMS (missing clubId or clubId not in `clubs`)\n');
	if (orphanedTeams.length === 0) {
		console.log('   None detected.\n');
	} else {
		console.log(`   Count: ${orphanedTeams.length}\n`);
		for (const row of orphanedTeams) {
			const extra = row.reason === 'missing_clubId' ? '' : `  (referenced clubId: ${row.clubId})`;
			console.log(`   · teamId=${row.teamId}  reason=${row.reason}${extra}`);
		}
		console.log('');
	}

	console.log('▶ 3) COACHES not on any team (coachEmail / assistants)\n');
	console.log('   (Users with role coach whose email is not found on any team.)\n');
	if (unassignedCoaches.length === 0) {
		console.log('   None detected.\n');
	} else {
		console.log(`   Count: ${unassignedCoaches.length}\n`);
		for (const row of unassignedCoaches) {
			console.log(`   · doc=${row.userDocId}  email=${row.email}  role=${row.role}`);
		}
		console.log('');
	}

	console.log('─'.repeat(60));
	console.log(`Finished: ${new Date().toISOString()}`);
	console.log('This run was read-only. No data was modified.\n');

	process.exit(0);
}

main().catch((err) => {
	console.error('[audit] Unhandled error:', err);
	process.exit(1);
});
