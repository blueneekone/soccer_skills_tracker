/**
 * database-reset-v1.cjs
 * ─────────────────────
 * Nuclear reset: purge ALL test data, preserve whitelisted production
 * accounts/clubs/teams, and repair RBAC Custom Claims.
 *
 * USAGE:
 *   node admin-scripts/database-reset-v1.cjs
 *
 * PREREQUISITES:
 *   serviceAccountKey.json must exist at the project root.
 */
'use strict';

const { readFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');
const admin = require('firebase-admin');

// ── Whitelist ────────────────────────────────────────────────────────────────
const WHITELIST_EMAILS = new Set([
	'ecwaechtler@gmail.com',
	'ecwaechtler+director@gmail.com',
	'ecwaechtler+coach@gmail.com',
	'ecwaechtler+parent@gmail.com',
]);

const ROLE_MAP = {
	'ecwaechtler@gmail.com': 'admin',
	'ecwaechtler+director@gmail.com': 'director',
	'ecwaechtler+coach@gmail.com': 'coach',
	'ecwaechtler+parent@gmail.com': 'parent',
};

const KEEP_CLUB_NAME = 'Aggies FC';
const KEEP_TEAM_ID = 'aggiesfc_u11_16gew';
const MAX_BATCH = 450; // sub-500 safety margin

// ── Init ─────────────────────────────────────────────────────────────────────
function initAdmin() {
	const keyPath = resolve(__dirname, '..', 'serviceAccountKey.json');
	if (!existsSync(keyPath)) {
		console.error('[FATAL] serviceAccountKey.json not found at:', keyPath);
		process.exit(1);
	}
	const json = readFileSync(keyPath, 'utf8');
	const credential = admin.credential.cert(JSON.parse(json));
	admin.initializeApp({ credential });
	return { db: admin.firestore(), auth: admin.auth() };
}

/** Normalize email for comparison. */
function norm(e) {
	return typeof e === 'string' ? e.trim().toLowerCase() : '';
}

/**
 * Batch-delete an array of DocumentReferences respecting the 500-op limit.
 * @param {FirebaseFirestore.Firestore} db
 * @param {FirebaseFirestore.DocumentReference[]} refs
 * @param {string} label
 * @returns {Promise<number>} count deleted
 */
async function batchDelete(db, refs, label) {
	let total = 0;
	for (let i = 0; i < refs.length; i += MAX_BATCH) {
		const slice = refs.slice(i, i + MAX_BATCH);
		const batch = db.batch();
		for (const ref of slice) batch.delete(ref);
		await batch.commit();
		total += slice.length;
		console.log(`  [batch] ${label}: deleted ${slice.length} docs (cumulative: ${total})`);
	}
	return total;
}

/**
 * Recursively delete all subcollections of a document, then the document.
 */
async function deepDelete(db, docRef, label) {
	const cols = await docRef.listCollections();
	for (const col of cols) {
		const snap = await col.get();
		if (!snap.empty) {
			await batchDelete(db, snap.docs.map((d) => d.ref), `${label}/${col.id}`);
		}
	}
	await docRef.delete();
}

// ── STEP 1: Purge Auth Users ─────────────────────────────────────────────────
async function purgeAuthUsers(auth) {
	console.log('\n═══ STEP 1: PURGE AUTH USERS ═══');
	let deletedCount = 0;
	let keptCount = 0;
	let nextPageToken;

	do {
		const listResult = await auth.listUsers(1000, nextPageToken);
		for (const user of listResult.users) {
			const email = norm(user.email || '');
			if (WHITELIST_EMAILS.has(email)) {
				keptCount++;
				console.log(`  [KEEP] ${email} (uid: ${user.uid})`);
				continue;
			}
			try {
				await auth.deleteUser(user.uid);
				deletedCount++;
				console.log(`  [DELETE] Auth user: ${email || user.uid}`);
			} catch (e) {
				console.warn(`  [WARN] Failed to delete auth user ${user.uid}:`, e.message);
			}
		}
		nextPageToken = listResult.pageToken;
	} while (nextPageToken);

	console.log(`  Auth purge complete. Deleted: ${deletedCount}, Kept: ${keptCount}`);
	return deletedCount;
}

// ── STEP 2: Purge Firestore `users` Collection ──────────────────────────────
async function purgeFirestoreUsers(db) {
	console.log('\n═══ STEP 2: PURGE FIRESTORE USERS ═══');
	const snap = await db.collection('users').get();
	const toDelete = [];
	let kept = 0;

	for (const doc of snap.docs) {
		const data = doc.data() || {};
		const email = norm(data.email || doc.id);
		if (WHITELIST_EMAILS.has(email)) {
			kept++;
			console.log(`  [KEEP] users/${doc.id} (${email})`);
			continue;
		}
		toDelete.push(doc.ref);
	}

	// Deep-delete each user doc (subcollections first)
	let count = 0;
	for (const ref of toDelete) {
		await deepDelete(db, ref, `users/${ref.id}`);
		count++;
	}
	console.log(`  Firestore users purge complete. Deleted: ${count}, Kept: ${kept}`);
	return count;
}

// ── STEP 3: Purge Clubs ─────────────────────────────────────────────────────
async function purgeClubs(db) {
	console.log('\n═══ STEP 3: PURGE CLUBS ═══');
	const snap = await db.collection('clubs').get();
	let deleted = 0;
	let kept = 0;
	const keptClubIds = [];

	for (const doc of snap.docs) {
		const data = doc.data() || {};
		const name = typeof data.name === 'string' ? data.name : '';
		if (name.includes(KEEP_CLUB_NAME) || doc.id.includes('aggiesfc')) {
			kept++;
			keptClubIds.push(doc.id);
			console.log(`  [KEEP] clubs/${doc.id} ("${name}")`);
			continue;
		}
		await deepDelete(db, doc.ref, `clubs/${doc.id}`);
		deleted++;
		console.log(`  [DELETE] clubs/${doc.id} ("${name}")`);
	}
	console.log(`  Clubs purge complete. Deleted: ${deleted}, Kept: ${kept}`);
	return { deleted, keptClubIds };
}

// ── STEP 4: Purge Teams ─────────────────────────────────────────────────────
async function purgeTeams(db) {
	console.log('\n═══ STEP 4: PURGE TEAMS ═══');
	const snap = await db.collection('teams').get();
	let deleted = 0;
	let kept = 0;

	for (const doc of snap.docs) {
		const data = doc.data() || {};
		const name = typeof data.name === 'string' ? data.name : '';
		if (doc.id === KEEP_TEAM_ID || name.includes(KEEP_TEAM_ID)) {
			kept++;
			console.log(`  [KEEP] teams/${doc.id} ("${name}")`);
			continue;
		}
		await deepDelete(db, doc.ref, `teams/${doc.id}`);
		deleted++;
		console.log(`  [DELETE] teams/${doc.id} ("${name}")`);
	}
	console.log(`  Teams purge complete. Deleted: ${deleted}, Kept: ${kept}`);
	return deleted;
}

// ── STEP 5: Purge Orphaned Top-Level Collections ────────────────────────────
async function purgeOrphans(db) {
	console.log('\n═══ STEP 5: PURGE ORPHAN COLLECTIONS ═══');
	const orphanCollections = [
		'workouts', 'assignments', 'team_workouts', 'rosters',
		'consents', 'passports', 'player_lookup',
	];
	let totalDeleted = 0;

	for (const colName of orphanCollections) {
		const snap = await db.collection(colName).get();
		if (snap.empty) {
			console.log(`  [SKIP] ${colName}: empty`);
			continue;
		}
		const refs = snap.docs.map((d) => d.ref);
		const count = await batchDelete(db, refs, colName);
		totalDeleted += count;
		console.log(`  [DELETE] ${colName}: ${count} documents`);
	}
	console.log(`  Orphan purge complete. Total deleted: ${totalDeleted}`);
	return totalDeleted;
}

// ── STEP 6: RBAC Repair ─────────────────────────────────────────────────────
async function repairRBAC(db, auth) {
	console.log('\n═══ STEP 6: RBAC CUSTOM CLAIMS REPAIR ═══');

	for (const [email, role] of Object.entries(ROLE_MAP)) {
		let uid;
		try {
			const userRecord = await auth.getUserByEmail(email);
			uid = userRecord.uid;
		} catch (e) {
			console.warn(`  [SKIP] ${email}: Auth account not found (${e.message})`);
			continue;
		}

		// 1. Set Custom Claims on Firebase Auth
		const claims = { role };
		await auth.setCustomUserClaims(uid, claims);
		console.log(`  [CLAIMS] ${email} → role: "${role}" (uid: ${uid})`);

		// 2. Upsert Firestore `users` document with correct role
		const userRef = db.collection('users').doc(uid);
		const userSnap = await userRef.get();
		const existingData = userSnap.exists ? userSnap.data() : {};
		const mergePayload = {
			email,
			role,
			...(!existingData.playerName && { playerName: email.split('@')[0] }),
		};
		await userRef.set(mergePayload, { merge: true });
		console.log(`  [FIRESTORE] users/${uid} → role: "${role}"`);

		// 3. Verify the claim was applied
		const verifyRecord = await auth.getUser(uid);
		const appliedRole = verifyRecord.customClaims?.role;
		if (appliedRole === role) {
			console.log(`  [VERIFIED] ✓ ${email} customClaims.role = "${appliedRole}"`);
		} else {
			console.error(`  [FAILED] ✗ ${email} expected "${role}" but got "${appliedRole}"`);
		}
	}
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
	console.log('╔════════════════════════════════════════════════╗');
	console.log('║  DATABASE RESET v1 — SYSTEM RECOVERY SCRIPT   ║');
	console.log('║  Project: sports-skill-tracker-dev             ║');
	console.log('╚════════════════════════════════════════════════╝');

	const { db, auth } = initAdmin();

	const authDeleted = await purgeAuthUsers(auth);
	const usersDeleted = await purgeFirestoreUsers(db);
	const { deleted: clubsDeleted } = await purgeClubs(db);
	const teamsDeleted = await purgeTeams(db);
	const orphansDeleted = await purgeOrphans(db);
	await repairRBAC(db, auth);

	console.log('\n╔════════════════════════════════════════════════╗');
	console.log('║             RESET COMPLETE — SUMMARY           ║');
	console.log('╠════════════════════════════════════════════════╣');
	console.log(`║  Auth users deleted:       ${String(authDeleted).padStart(6)}`);
	console.log(`║  Firestore users deleted:  ${String(usersDeleted).padStart(6)}`);
	console.log(`║  Clubs deleted:            ${String(clubsDeleted).padStart(6)}`);
	console.log(`║  Teams deleted:            ${String(teamsDeleted).padStart(6)}`);
	console.log(`║  Orphan docs deleted:      ${String(orphansDeleted).padStart(6)}`);
	console.log('║  RBAC Claims:              REPAIRED');
	console.log('╚════════════════════════════════════════════════╝');
}

main().catch((err) => {
	console.error('\n[FATAL] Unhandled error during reset:', err);
	process.exit(1);
});
