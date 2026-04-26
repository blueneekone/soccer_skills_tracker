/**
 * rebuildFromLookup.js — “Data resurrection” from `player_lookup` for surviving legacy link rows
 * (document ID = a real parent/player email, not *@operative.local). Rebuilds the modern
 * parent + child-proxy split, household, dispatch code, and migrates the lookup to the proxy key.
 *
 * PREREQUISITES
 * - firebase-admin (package.json)
 * - Service account: GOOGLE_APPLICATION_CREDENTIALS or the first .json path on the command line
 *
 * USAGE
 *   # Dry run (default): no writes, only logs planned actions
 *   node admin-scripts/rebuildFromLookup.js
 *   node admin-scripts/rebuildFromLookup.js ./secrets/sa.json
 *
 *   # Apply (writes + auth child user)
 *   node admin-scripts/rebuildFromLookup.js ./secrets/sa.json --execute
 *   node admin-scripts/rebuildFromLookup.js --execute --only=parent@example.com
 *   node admin-scripts/rebuildFromLookup.js --limit=5
 *
 * FLAGS
 *   --execute   Commit batches, create child Auth user, and delete legacy player_lookup rows
 *   --only=...  Process a single document id (email) if present
 *   --limit=N   After N successful migrations, stop
 *
 * EXIT: 0 on success, 1 on error.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import crypto from 'node:crypto';
import admin from 'firebase-admin';

/** @param {unknown} v @returns {string} */
function normEmail(v) {
	if (typeof v !== 'string') return '';
	return v.trim().toLowerCase();
}

/**
 * @returns {string} 6 char A–Z0–9
 */
function genDispatch6() {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	return Array.from({ length: 6 }, () => chars[crypto.randomInt(0, chars.length)]).join('');
}

/**
 * firstname.lastname@operative.local from display name; collision-safe with suffixes.
 * @param {string} name
 * @param {string} [suffix]  optional extra slug without @
 */
function nameToOperativeLocal(name, suffix = '') {
	const raw = String(name || '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9\s.]/g, ' ');
	const parts = raw.split(/\s+/).filter(Boolean);
	let local;
	if (parts.length >= 2) {
		const a = parts[0].replace(/[^a-z0-9]/g, '') || 'athlete';
		const b = parts[1].replace(/[^a-z0-9]/g, '') || 'p';
		local = `${a}.${b}`.replace(/\.+/g, '.').replace(/^\.|\.$/g, '');
	} else if (parts.length === 1) {
		const a = parts[0].replace(/[^a-z0-9]/g, '') || 'athlete';
		local = `${a}.player`.replace(/\.+/g, '.');
	} else {
		local = 'athlete.legacy';
	}
	if (suffix) {
		const s = String(suffix).replace(/[^a-z0-9]/g, '').slice(0, 12);
		if (s) {
			local = `${local}${local.endsWith(s) ? '' : '.' + s}`.replace(/\.+/g, '.');
		}
	}
	if (local.length > 100) {
		local = local.slice(0, 100);
	}
	return `${local}@operative.local`;
}

/**
 * @param {import('firebase-admin').firestore.Firestore} db
 * @param {import('firebase-admin').app.App} adminApp
 * @param {string} playerName
 * @param {string} _legacyEmail
 * @returns {Promise<string | null>}
 */
async function mintProxyEmail(db, adminApp, playerName, _legacyEmail) {
	const base = nameToOperativeLocal(playerName, '');
	for (let attempt = 0; attempt < 40; attempt++) {
		const tryEmail =
			attempt === 0
				? base
				: nameToOperativeLocal(playerName, `x${crypto.randomInt(1, 9999)}${attempt}`);
		const n = normEmail(tryEmail);
		if (!n) {
			return null;
		}
		const uSnap = await db.collection('users').doc(n).get();
		let authExists = false;
		try {
			await adminApp.auth().getUserByEmail(n);
			authExists = true;
		} catch (e) {
			if (/** @type {{ code?: string }} */ (e).code === 'auth/user-not-found') {
				authExists = false;
			} else {
				throw e;
			}
		}
		const plSnap = await db.collection('player_lookup').doc(n).get();
		if (!uSnap.exists && !authExists && !plSnap.exists) {
			return n;
		}
	}
	return null;
}

/**
 * @param {import('firebase-admin').app.App} adminApp
 * @param {string} proxyEmail
 * @param {string} childName
 * @param {string} legacyEmail
 * @param {boolean} execute
 * @param {{ log: (s: string) => void }} io
 * @returns {Promise<string | null>}
 */
async function ensureChildAuthUser(adminApp, proxyEmail, childName, legacyEmail, execute, io) {
	const auth = adminApp.auth();
	try {
		const existing = await auth.getUserByEmail(proxyEmail);
		io.log(
			`[auth] child user already exists: ${proxyEmail} uid=${existing.uid} (re-use)`,
		);
		return existing.uid;
	} catch (e) {
		if (/** @type {{ code?: string }} */ (e).code !== 'auth/user-not-found') {
			throw e;
		}
	}
	if (!execute) {
		io.log(
			`[auth] DRY-RUN: would create Auth user for ${proxyEmail} (child: ${childName}, legacy: ${legacyEmail})`,
		);
		return 'dry-run-mock-uid';
	}
	const rec = await auth.createUser({
		email: proxyEmail,
		password: crypto.randomBytes(32).toString('hex'),
		displayName: childName,
	});
	io.log(`[auth] created child uid=${rec.uid} for ${proxyEmail}`);
	return rec.uid;
}

function initFirebaseAdmin() {
	const fromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
	const argv = process.argv.slice(2);
	const pathArg = argv.find((a) => !a.startsWith('--') && a.includes('.json'));
	const fromArg = pathArg ? resolve(pathArg) : '';
	let keyPath = '';
	if (fromEnv && String(fromEnv).trim()) {
		keyPath = resolve(String(fromEnv).trim());
	} else if (fromArg) {
		keyPath = fromArg;
	}
	if (!keyPath) {
		console.error(
			'[rebuild] Missing credentials. Set GOOGLE_APPLICATION_CREDENTIALS or run:\n' +
				'  node admin-scripts/rebuildFromLookup.js <path-to-serviceAccountKey.json> [--execute]\n',
		);
		process.exit(1);
	}
	if (!existsSync(keyPath)) {
		console.error(`[rebuild] Service account file not found: ${keyPath}`);
		process.exit(1);
	}
	try {
		const json = readFileSync(keyPath, 'utf8');
		const credential = admin.credential.cert(/** @type {import('firebase-admin').ServiceAccount} */ (JSON.parse(json)));
		admin.initializeApp({ credential });
	} catch (e) {
		console.error('[rebuild] Could not read or parse the service account JSON.', e);
		process.exit(1);
	}
	return admin.firestore();
}

function parseArgs() {
	/** @type {string[]} */
	const argv = process.argv.slice(2);
	const out = {
		execute: false,
		only: /** @type {string | null} */ (null),
		limit: 0,
		credentialPath: /** @type {string | null} */ (null),
	};
	for (const a of argv) {
		if (a === '--execute') {
			out.execute = true;
		} else if (a.startsWith('--only=')) {
			out.only = normEmail(a.slice(7));
		} else if (a.startsWith('--limit=')) {
			const n = parseInt(a.slice(8), 10);
			out.limit = Number.isFinite(n) && n > 0 ? n : 0;
		} else if (a.startsWith('--') && a !== '--execute') {
			console.warn(`[rebuild] unknown flag: ${a}`);
		} else if (a.includes('.json') && !out.credentialPath) {
			out.credentialPath = resolve(a);
		}
	}
	if (out.only && !out.only.includes('@')) {
		console.error('[rebuild] --only= must be a full email');
		process.exit(1);
	}
	return out;
}

/**
 * @param {import('firebase-admin').firestore.Firestore} db
 * @param {import('firebase-admin').app.App} app
 * @param {string} legacyEmail
 * @param {Record<string, unknown>} d
 * @param {{ execute: boolean; log: (s: string) => void }} opts
 * @returns {Promise<boolean>}
 */
async function processOneFromLookup(db, app, legacyEmail, d, opts) {
	const parentEmail = normEmail(legacyEmail);
	if (!parentEmail) {
		opts.log(`[skip] empty legacy id`);
		return false;
	}
	if (parentEmail.endsWith('@operative.local')) {
		opts.log(`[skip] ${parentEmail} is already a proxy lookup id`);
		return false;
	}
	const playerName = typeof d.playerName === 'string' && d.playerName.trim() ? d.playerName.trim().slice(0, 200) : '';
	const clubId = typeof d.clubId === 'string' && d.clubId.trim() ? d.clubId.trim() : '';
	const teamId = typeof d.teamId === 'string' && d.teamId.trim() ? d.teamId.trim() : '';
	if (!playerName || !clubId || !teamId) {
		opts.log(
			`[skip] ${parentEmail} missing required fields (playerName, clubId, teamId). Got: ${JSON.stringify(
				{ playerName, clubId, teamId },
			)}`,
		);
		return false;
	}
	const proxyEmail = await mintProxyEmail(db, app, playerName, parentEmail);
	if (!proxyEmail) {
		opts.log(`[error] no free @operative.local slot for name="${playerName}"`);
		return false;
	}

	const childName = playerName;
	let parentUid = '';
	try {
		const pu = await app.auth().getUserByEmail(parentEmail);
		parentUid = pu.uid;
	} catch (e) {
		if (/** @type {{ code?: string }} */ (e).code === 'auth/user-not-found') {
			parentUid = '';
		} else {
			throw e;
		}
	}

	const childUid = await ensureChildAuthUser(
		app,
		proxyEmail,
		childName,
		parentEmail,
		opts.execute,
		{ log: opts.log },
	);
	if (!childUid) {
		return false;
	}

	const now = admin.firestore.FieldValue.serverTimestamp();
	const householdId = db.collection('households').doc().id;
	const hRef = db.collection('households').doc(householdId);
	const uParent = db.collection('users').doc(parentEmail);
	const uChild = db.collection('users').doc(proxyEmail);
	const plRef = db.collection('player_lookup').doc(proxyEmail);
	const legacyRef = db.collection('player_lookup').doc(parentEmail);
	const dispRef = db.collection('operative_dispatches').doc();
	const dispatchCode = genDispatch6();

	/** @type {string[] | null} */
	let nextPlayerUids = null;
	const teamRef = db.collection('teams').doc(teamId);
	const tSnap = await teamRef.get();
	if (tSnap.exists) {
		const cur = Array.isArray(tSnap.data()?.playerUids) ? [...tSnap.data().playerUids] : [];
		const withoutParent = parentUid ? cur.filter((id) => id !== parentUid) : cur;
		nextPlayerUids = [...withoutParent];
		const uid = childUid === 'dry-run-mock-uid' ? null : childUid;
		if (uid && !nextPlayerUids.includes(uid)) {
			nextPlayerUids.push(uid);
		}
	}

	/** @type {Record<string, unknown>} */
	const parentDoc = {
		role: 'parent',
		householdId,
		// app convention (see migrateLegacyHouseholds, provisionParentChildOperatives)
		playerEmails: [proxyEmail],
		playerNames: [childName],
		rebuildFromLookup: true,
		updatedAt: now,
	};

	/** @type {Record<string, unknown>} */
	const childDoc = {
		role: 'player',
		playerName: childName,
		clubId,
		teamId,
		householdId,
		parentProvisioned: true,
		rebuildFromLookup: true,
		updatedAt: now,
	};

	opts.log(
		`[plan] parent=${parentEmail}  child=${proxyEmail}  team=${teamId}  club=${clubId}  dispatch=${dispatchCode}  household=${householdId}`,
	);

	const batch = db.batch();
	batch.set(hRef, {
		clubId,
		parentEmails: [parentEmail],
		playerEmails: [proxyEmail],
		playerNames: [childName],
		coppaSigned: true,
		coppaSignedByLookupRebuild: true,
		createdAt: now,
		updatedAt: now,
	});
	batch.set(uParent, parentDoc, { merge: true });
	batch.set(uChild, childDoc, { merge: true });
	batch.set(
		plRef,
		{ clubId, teamId, playerName: childName, role: 'player' },
		{ merge: true },
	);
	batch.set(dispRef, {
		householdId,
		childEmail: proxyEmail,
		childName,
		dispatchCode,
		childUid: childUid === 'dry-run-mock-uid' ? null : childUid,
		parentUid: parentUid || null,
		parentEmail,
		teamId,
		createdAt: now,
		migrationScript: 'rebuildFromLookup',
	});
	batch.delete(legacyRef);
	if (tSnap.exists && nextPlayerUids && opts.execute) {
		batch.set(teamRef, { playerUids: nextPlayerUids, updatedAt: now }, { merge: true });
	}
	if (tSnap.exists && nextPlayerUids && !opts.execute) {
		opts.log(
			`[dry-run] WOULD set teams/${teamId} playerUids len=${nextPlayerUids.length}`,
		);
	}

	if (!opts.execute) {
		opts.log(
			`[dry-run] WOULD commit batch: delete player_lookup/${parentEmail} → create proxy chain + dispatch`,
		);
		opts.log('[dry-run] pass --execute to apply');
		return true;
	}
	await batch.commit();
	opts.log(`[batch] committed; legacy lookup removed. Dispatch code ${dispatchCode} for ${proxyEmail}`);
	return true;
}

async function main() {
	const args = parseArgs();
	if (args.credentialPath) {
		process.env.GOOGLE_APPLICATION_CREDENTIALS = args.credentialPath;
	}
	const db = initFirebaseAdmin();
	const app = admin.app();
	const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'unknown';
	const io = (line) => console.log(`[${new Date().toISOString()}] ${line}`);

	console.log(
		`\n══ rebuildFromLookup  project=${projectId}  execute=${args.execute}  only=${args.only || 'all'}  limit=${args.limit || '∞'} ══\n`,
	);

	/** @type {import('firebase-admin').firestore.QueryDocumentSnapshot[]} */
	const plDocs = [];
	if (args.only) {
		const s = await db.collection('player_lookup').doc(args.only).get();
		if (s.exists) {
			plDocs.push(/** @type {import('firebase-admin').firestore.QueryDocumentSnapshot} */ (s));
		} else {
			console.error(`[rebuild] no player_lookup document: ${args.only}`);
			process.exit(1);
		}
	} else {
		const pageSize = 500;
		/** @type {import('firebase-admin').firestore.QueryDocumentSnapshot | null} */
		let last = null;
		for (;;) {
			let q = db.collection('player_lookup').orderBy('__name__').limit(pageSize);
			if (last) {
				q = q.startAfter(last);
			}
			const snap = await q.get();
			if (snap.empty) {
				break;
			}
			for (const d of snap.docs) {
				const id = d.id;
				if (id.toLowerCase().endsWith('@operative.local')) {
					continue;
				}
				plDocs.push(/** @type {import('firebase-admin').firestore.QueryDocumentSnapshot} */ (d));
			}
			last = /** @type {import('firebase-admin').firestore.QueryDocumentSnapshot} */ (
				snap.docs[snap.docs.length - 1]
			);
		}
	}

	let migrated = 0;
	let considered = 0;
	for (const d of plDocs) {
		considered += 1;
		const data = d.data() || {};
		/** @param {string} s */
		const log = (s) => io(s);
		const ok = await processOneFromLookup(
			db,
			app,
			d.id,
			/** @type {Record<string, unknown>} */ (data),
			{ execute: args.execute, log },
		);
		if (ok) {
			migrated += 1;
			if (args.limit > 0 && migrated >= args.limit) {
				io(`[stop] --limit=${args.limit} successful migrations reached`);
				break;
			}
		}
	}
	console.log(
		`\n[summary] considered=${considered}  successful_plans_or_runs=${migrated}  execute=${args.execute}\n`,
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
