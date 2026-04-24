/**
 * surgicalWipe.js — Phase 4 surgical Firestore cleanup (keeps two clubs, removes legacy data)
 *
 * Collections touched: `clubs`, `teams` (+ its subcollections), `rosters`, `users`,
 * top-level `workouts`, `assignments` (Sprint 2.6.4 Action Board + homework), and
 * `team_workouts` (teamId-scoped; removed when a team is removed).
 * This project uses `clubs` for organization records; there is no separate top-level `organizations` collection in the default schema.
 *
 * PREREQUISITES
 * ─────────────
 * 1. From the project root (once), ensure the Admin SDK is available:
 *    npm install firebase-admin
 *
 * 2. Download a Firebase service account key JSON (Firebase Console → Project settings
 *    → Service accounts → Generate new private key). Do NOT commit the key; keep it
 *    outside the repo or in .gitignore.
 *
 * 3. Point Node at the key with ONE of:
 *    A) Environment variable (recommended):
 *       set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\serviceAccountKey.json   (cmd)
 *       $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\serviceAccountKey.json"   (PowerShell)
 *       export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json   (Unix)
 *    B) A non-flag path argument (same as auditDatabase.js):
 *       node admin-scripts/surgicalWipe.js C:\path\to\serviceAccountKey.json
 *       node admin-scripts/surgicalWipe.js C:\path\to\serviceAccountKey.json --execute
 *    If the env var is set, it wins over a path in argv.
 *
 * HOW TO RUN
 * ──────────
 * From the repository root:
 *    DRY-RUN (default; no deletes — only logs the plan):
 *      node admin-scripts/surgicalWipe.js
 *      node admin-scripts/surgicalWipe.js ./path/to/key.json
 *
 *    LIVE DELETE (batches + deep team deletes):
 *      node admin-scripts/surgicalWipe.js --execute
 *      node admin-scripts/surgicalWipe.js ./path/to/key.json --execute
 *
 * EXIT CODES: 0 = finished, 1 = config error or thrown exception
 *
 * SAFETY: Without `--execute`, this script performs NO `delete()` or `batch.delete()`.
 * With `--execute`, deletions are irreversible — use a backup or a staging project first.
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Club document IDs to keep; all other `clubs` documents are removed. */
const KEEP_CLUBS = ['ab001', 'aggiesfc'];

const MAX_FIRESTORE_BATCH = 450;

const rawArgs = process.argv.slice(2);
const EXECUTE = rawArgs.includes('--execute');
const keyPathArg = rawArgs.find((a) => a !== '--execute' && !a.startsWith('--'));

/**
 * @param {unknown} v
 * @returns {string}
 */
function normEmail(v) {
	if (typeof v !== 'string') return '';
	return v.trim().toLowerCase();
}

function initFirebaseAdmin() {
	const fromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
	const fromArg = keyPathArg ? resolve(keyPathArg) : '';

	let keyPath = '';
	if (fromEnv && String(fromEnv).trim()) {
		keyPath = resolve(String(fromEnv).trim());
	} else if (fromArg) {
		keyPath = fromArg;
	}

	if (!keyPath) {
		console.error(
			'[surgicalWipe] Missing credentials.\n' +
				'  Set GOOGLE_APPLICATION_CREDENTIALS, or run:\n' +
				'  node admin-scripts/surgicalWipe.js <path-to-serviceAccountKey.json> [--execute]\n',
		);
		process.exit(1);
	}

	if (!existsSync(keyPath)) {
		console.error(`[surgicalWipe] Service account file not found: ${keyPath}`);
		process.exit(1);
	}

	let credential;
	try {
		const json = readFileSync(keyPath, 'utf8');
		credential = admin.credential.cert(/** @type {import('firebase-admin').ServiceAccount} */ (JSON.parse(json)));
	} catch (e) {
		console.error('[surgicalWipe] Could not read or parse the service account JSON.', e);
		process.exit(1);
	}

	admin.initializeApp({ credential });
	return admin.firestore();
}

/**
 * @param {FirebaseFirestore.QueryDocumentSnapshot} doc
 * @returns {string}
 */
function userEmailFromDoc(doc) {
	const d = doc.data() || {};
	const e = d.email;
	if (typeof e === 'string' && e.trim()) return normEmail(e);
	return normEmail(doc.id);
}

/**
 * @param {FirebaseFirestore.Firestore} db
 * @param {FirebaseFirestore.DocumentReference} docRef
 * @param {boolean} doIt
 * @param {string} label
 */
async function deleteSubcollectionsOfDocument(db, docRef, doIt, label) {
	const cols = await docRef.listCollections();
	for (const col of cols) {
		const snap = await col.get();
		if (snap.empty) {
			if (!doIt) console.log(`[dry-run]   ${label} subcollection ${col.id}: 0 docs`);
			continue;
		}
		if (!doIt) {
			console.log(`[dry-run]   ${label} subcollection ${col.id}: would delete ${snap.size} document(s)`);
			continue;
		}
		const refs = snap.docs.map((d) => d.ref);
		await commitDeleteBatch(db, refs, `${label} / ${col.id}`);
	}
}

/**
 * @param {FirebaseFirestore.Firestore} db
 * @param {FirebaseFirestore.DocumentReference[]} refs
 * @param {string} [ctx]
 */
async function commitDeleteBatch(db, refs, ctx = 'batch') {
	for (let i = 0; i < refs.length; i += MAX_FIRESTORE_BATCH) {
		const slice = refs.slice(i, i + MAX_FIRESTORE_BATCH);
		const batch = db.batch();
		for (const r of slice) {
			batch.delete(r);
		}
		await batch.commit();
		console.log(`[execute] ${ctx}: committed delete of ${slice.length} document(s).`);
	}
}

/**
 * @param {string[]} emails
 * @param {import('firebase-admin').auth.Auth} auth
 * @returns {Promise<Map<string, string>>} email -> uid
 */
async function mapEmailsToUids(emails, auth) {
	/** @type {Map<string, string>} */
	const out = new Map();
	const uniq = [...new Set(emails.filter((e) => e))];
	const chunk = 20;
	for (let i = 0; i < uniq.length; i += chunk) {
		const part = uniq.slice(i, i + chunk);
		const results = await Promise.all(
			part.map(async (em) => {
				try {
					const u = await auth.getUserByEmail(em);
					return /** @type {const} */ ([em, u.uid]);
				} catch {
					return /** @type {const} */ ([em, null]);
				}
			}),
		);
		for (const [em, uid] of results) {
			if (uid) out.set(em, uid);
		}
	}
	return out;
}

/**
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} teamId
 * @param {boolean} doIt
 */
async function deleteOneTeamAndSubs(db, teamId, doIt) {
	const teamRef = db.collection('teams').doc(teamId);
	if (!doIt) {
		const cols = await teamRef.listCollections();
		for (const col of cols) {
			const n = (await col.get()).size;
			if (n) console.log(`[dry-run]   team ${teamId} · ${col.id}: would delete ${n} row(s)`);
		}
		console.log(`[dry-run]   team ${teamId}: would delete team document after subcollections`);
		return;
	}
	await deleteSubcollectionsOfDocument(db, teamRef, true, `team ${teamId}`);
	await teamRef.delete();
	console.log(`[execute] deleted teams/${teamId} (incl. known subcollections).`);
}

/**
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} clubId
 * @param {boolean} doIt
 */
async function deleteOneClubAndSubs(db, clubId, doIt) {
	const clubRef = db.collection('clubs').doc(clubId);
	if (!doIt) {
		const cols = await clubRef.listCollections();
		for (const col of cols) {
			const n = (await col.get()).size;
			if (n) console.log(`[dry-run]   club ${clubId} · ${col.id}: would delete ${n} row(s)`);
		}
		console.log(`[dry-run]   club ${clubId}: would delete club document after subcollections`);
		return;
	}
	await deleteSubcollectionsOfDocument(db, clubRef, true, `club ${clubId}`);
	await clubRef.delete();
	console.log(`[execute] deleted clubs/${clubId} (incl. subcollections).`);
}

/**
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} userDocId
 * @param {boolean} doIt
 */
async function deleteOneUserAndSubs(db, userDocId, doIt) {
	const userRef = db.collection('users').doc(userDocId);
	if (!doIt) {
		const cols = await userRef.listCollections();
		for (const col of cols) {
			const n = (await col.get()).size;
			if (n) console.log(`[dry-run]   users ${userDocId} · ${col.id}: would delete ${n} row(s)`);
		}
		console.log(`[dry-run]   users ${userDocId}: would delete user document after subcollections`);
		return;
	}
	await deleteSubcollectionsOfDocument(db, userRef, true, `users ${userDocId}`);
	await userRef.delete();
	console.log(`[execute] deleted users/${userDocId} (incl. subcollections).`);
}

/**
 * @param {FirebaseFirestore.CollectionReference} colRef
 * @param {FirebaseFirestore.QueryDocumentSnapshot[]} docs
 * @param {string} reason
 * @param {boolean} doIt
 * @param {FirebaseFirestore.Firestore} db
 */
async function processDeletes(colRef, docs, reason, doIt, db) {
	if (docs.length === 0) return;
	if (!doIt) {
		const sample = docs.slice(0, 8).map((d) => d.id);
		console.log(
			`[dry-run] ${colRef.id}: would delete ${docs.length} document(s) (${reason}). Sample ids: ${sample.join(', ')}${docs.length > 8 ? ' …' : ''}`,
		);
		return;
	}
	const refs = docs.map((d) => d.ref);
	await commitDeleteBatch(db, refs, `${colRef.id} (${reason})`);
}

async function main() {
	const db = initFirebaseAdmin();
	const auth = admin.auth();
	const keepSet = new Set(KEEP_CLUBS);

	console.log('\n══ Phoenix · Surgical database wipe (Phase 4 prep) ══');
	console.log(
		`   Mode:   ${EXECUTE ? 'LIVE (writes enabled)' : 'DRY-RUN (no writes — add --execute to delete)'}`,
	);
	console.log(`   Keep:   ${KEEP_CLUBS.join(', ')}`);
	console.log(`   Time:   ${new Date().toISOString()}\n`);

	// ---- Load clubs
	const clubsSnap = await db.collection('clubs').get();
	const allClubIds = new Set();
	clubsSnap.forEach((d) => allClubIds.add(d.id));
	const deleteClubIds = [...allClubIds].filter((id) => !keepSet.has(id));
	const keepClubs = [...allClubIds].filter((id) => keepSet.has(id));
	if (keepClubs.length < KEEP_CLUBS.length) {
		const miss = KEEP_CLUBS.filter((c) => !allClubIds.has(c));
		console.warn(
			`[warn] The following IDs are in KEEP_CLUBS but have no \`clubs\` document yet: ${miss.join(', ') || '(none)'}`,
		);
	}
	console.log(
		`[plan] clubs:  keep ${keepClubs.length}  ·  would delete ${deleteClubIds.length} legacy org document(s)`,
	);

	// ---- Load teams, partition by club
	const teamsSnap = await db.collection('teams').get();
	/** @type {string[]} */
	const preserveTeamIds = [];
	/** @type {string[]} */
	const deleteTeamIds = [];
	/** @type {Set<string>} */
	const linkedEmails = new Set();

	teamsSnap.forEach((d) => {
		const t = d.data() || {};
		const cid = typeof t.clubId === 'string' ? t.clubId.trim() : '';
		if (cid && keepSet.has(cid)) {
			preserveTeamIds.push(d.id);
			const c = normEmail(t.coachEmail);
			if (c) linkedEmails.add(c);
			const asst = Array.isArray(t.assistants) ? t.assistants : [];
			for (const a of asst) {
				const n = normEmail(a);
				if (n) linkedEmails.add(n);
			}
		} else {
			deleteTeamIds.push(d.id);
		}
	});

	/** @type {Set<string>} */
	const preserveTeam = new Set(preserveTeamIds);

	// Director emails on preserved clubs
	for (const cid of keepClubs) {
		const cdoc = await db.collection('clubs').doc(cid).get();
		if (!cdoc.exists) continue;
		const c = cdoc.data() || {};
		const d = normEmail(c.directorEmail);
		if (d) linkedEmails.add(d);
		if (Array.isArray(c.directorEmails)) {
			for (const x of c.directorEmails) {
				const n = normEmail(x);
				if (n) linkedEmails.add(n);
			}
		}
	}

	// `player_lookup` / roster-linked players: emails for preserved teams
	const plSnap = await db.collection('player_lookup').get();
	let plCount = 0;
	plSnap.forEach((d) => {
		const t = d.data() || {};
		const tid = typeof t.teamId === 'string' ? t.teamId : '';
		if (tid && preserveTeam.has(tid)) {
			linkedEmails.add(normEmail(d.id));
			plCount++;
		}
	});
	console.log(
		`[plan] teams:  keep ${preserveTeamIds.length}  ·  delete ${deleteTeamIds.length}  ·  player_lookup rows on kept teams: ${plCount} (emails added to "linked")`,
	);

	// ---- Users: who to keep
	const usersSnap = await db.collection('users').get();
	/**
	 * @param {import('firebase-admin/firestore').QueryDocumentSnapshot} d
	 */
	function shouldKeepUser(d) {
		const u = d.data() || {};
		const roleRaw = u.role;
		const role = typeof roleRaw === 'string' ? roleRaw.toLowerCase().trim() : '';
		if (role === 'super_admin' || role === 'global_admin') return true;
		const cid = typeof u.clubId === 'string' ? u.clubId.trim() : '';
		if (cid && keepSet.has(cid)) return true;
		const tid = typeof u.teamId === 'string' ? u.teamId.trim() : '';
		if (tid && preserveTeam.has(tid)) return true;
		const em = userEmailFromDoc(d);
		if (em && linkedEmails.has(em)) return true;
		return false;
	}

	const userDocsToDelete = usersSnap.docs.filter((d) => !shouldKeepUser(d));
	const userIdsToDelete = userDocsToDelete.map((d) => d.id);
	const userEmailsToDelete = userDocsToDelete.map((d) => userEmailFromDoc(d));

	// UIDs for deleted users (workouts/assignments use auth uid for player identity)
	const emailToUidDelete = await mapEmailsToUids(userEmailsToDelete, auth);
	const deleteUids = [...emailToUidDelete.values()];
	/** @type {Set<string>} */
	const deleteUidSet = new Set(deleteUids);

	// `playerUids` from preserved user docs (for clarity in logs)
	const playerUidsKept = usersSnap.docs
		.filter(
			(d) =>
				shouldKeepUser(d) &&
				String((d.data() || {}).role || '')
					.toLowerCase()
					.trim() === 'player' &&
				/** @type {string} */ ((d.data() || {}).uid || '') &&
				typeof (d.data() || {}).uid === 'string',
		)
		.map((d) => (d.data() || {}).uid)
		.filter(/** @returns {x is string} */ (x) => typeof x === 'string');

	console.log(
		`[plan] users:  keep ${usersSnap.size - userIdsToDelete.length}  ·  delete ${userIdsToDelete.length}  ·  resolved ${deleteUids.length} delete-auth-uid(s)  ·  kept roles super/global preserved automatically`,
	);
	if (playerUidsKept.length) {
		console.log(`[plan]        kept player uids (field on user doc, sample of ${playerUidsKept.length}): first=${playerUidsKept[0] ?? '—'}`);
	}

	// ---- Rosters: one doc per teamId; delete when team not preserved
	const rostersSnap = await db.collection('rosters').get();
	/** @type {FirebaseFirestore.QueryDocumentSnapshot[]} */
	const rosterToDelete = [];
	rostersSnap.forEach((d) => {
		if (!preserveTeam.has(d.id)) rosterToDelete.push(d);
	});
	console.log(`[plan] rosters: keep ${preserveTeam.size}  ·  delete ${rosterToDelete.length} row(s) (key = teamId)\n`);

	// ---- top-level workouts (Action board): userId + teamId
	const workoutsSnap = await db.collection('workouts').get();
	/** @type {FirebaseFirestore.QueryDocumentSnapshot[]} */
	const wDel = [];
	workoutsSnap.forEach((d) => {
		const w = d.data() || {};
		const tid = typeof w.teamId === 'string' ? w.teamId : '';
		const userId = typeof w.userId === 'string' ? w.userId : '';
		const teamRemoved = tid && !preserveTeam.has(tid);
		const userRemoved = userId && deleteUidSet.has(userId);
		if (teamRemoved || userRemoved) wDel.push(d);
	});
	console.log(
		`[plan] workouts (root):  total ${workoutsSnap.size}  ·  would delete ${wDel.length} (orphan / deleted user or team)`,
	);

	// ---- assignments: teamId, playerId
	const assignSnap = await db.collection('assignments').get();
	/** @type {FirebaseFirestore.QueryDocumentSnapshot[]} */
	const aDel = [];
	assignSnap.forEach((d) => {
		const a = d.data() || {};
		const tid = typeof a.teamId === 'string' ? a.teamId : '';
		const pid = typeof a.playerId === 'string' ? a.playerId : '';
		const badTeam = tid && !preserveTeam.has(tid);
		const badPlayer = pid && deleteUidSet.has(pid);
		if (badTeam || badPlayer) aDel.push(d);
	});
	console.log(
		`[plan] assignments:  total ${assignSnap.size}  ·  would delete ${aDel.length} (orphan / deleted user or team)`,
	);

	// ---- team_workouts (team-scoped; not the same as root `workouts` or `teams/.../workouts`)
	const twSnap = await db.collection('team_workouts').get();
	/** @type {FirebaseFirestore.QueryDocumentSnapshot[]} */
	const twDel = [];
	twSnap.forEach((d) => {
		const t = d.data() || {};
		const tid = typeof t.teamId === 'string' ? t.teamId : '';
		if (tid && !preserveTeam.has(tid)) twDel.push(d);
	});
	console.log(
		`[plan] team_workouts:  total ${twSnap.size}  ·  would delete ${twDel.length} (team not preserved)\n`,
	);

	if (!EXECUTE) {
		console.log('── DRY-RUN — no writes. Re-run with --execute to perform deletes. ──\n');
		process.exit(0);
	}

	// ==== EXECUTE (ordered: dependent rows first, then teams/clubs, then users) ====
	console.log('── EXECUTE — applying deletes. ──\n');

	await processDeletes(db.collection('workouts'), wDel, 'orphan workouts', true, db);
	await processDeletes(db.collection('assignments'), aDel, 'orphan assignments', true, db);
	await processDeletes(db.collection('team_workouts'), twDel, 'non-preserved team', true, db);

	// rosters (non-preserved teams)
	for (const d of rosterToDelete) {
		await d.ref.delete();
		console.log(`[execute] deleted rosters/${d.id}`);
	}

	for (const teamId of deleteTeamIds) {
		await deleteOneTeamAndSubs(db, teamId, true);
	}

	for (const clubId of deleteClubIds) {
		await deleteOneClubAndSubs(db, clubId, true);
	}

	// user documents last (emails in linked set already reflected in shouldKeep)
	for (const userDocId of userIdsToDelete) {
		await deleteOneUserAndSubs(db, userDocId, true);
	}

	console.log(`\n[execute] finished at ${new Date().toISOString()}`);
	console.log('Note: This script removes Firestore `users` documents only. Firebase Auth accounts are left unchanged; remove auth users in Console if you need accounts deleted as well.\n');
	process.exit(0);
}

main().catch((err) => {
	console.error('[surgicalWipe] Unhandled error:', err);
	process.exit(1);
});
