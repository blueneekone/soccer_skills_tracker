/**
 * migrateLegacyHouseholds.js — Server-side data split: legacy “parent email = player” → proxy child + parent shell.
 *
 * Scans `users` for real-email profiles that still carry legacy player fields or no role, mints
 * a COPPA-style proxy at `*@operative.local`, moves player data to that document, and upgrades the
 * original account to `role: 'parent'` with a new `households` row, `player_lookup`, Auth user,
 * and `operative_dispatches` (6-char uppercase A–Z0–9 code) so the child can use operative sign-in.
 *
 * PREREQUISITES
 * ------------
 * - firebase-admin (already in the repo root package.json)
 * - Service account JSON: GOOGLE_APPLICATION_CREDENTIALS or:
 *   node admin-scripts/migrateLegacyHouseholds.js <path-to-serviceAccountKey.json>
 *
 * USAGE
 * -----
 *   # Dry run (default): no Auth creates, no batch.commit — logs only
 *   node admin-scripts/migrateLegacyHouseholds.js
 *
 *   # Plan then execute
 *   node admin-scripts/migrateLegacyHouseholds.js ./secrets/sa.json --execute
 *   node admin-scripts/migrateLegacyHouseholds.js ./secrets/sa.json --execute --only=parent@example.com
 *   node admin-scripts/migrateLegacyHouseholds.js ./secrets/sa.json --execute --aggressive
 *
 *   # Limit scan for a smoke test
 *   node admin-scripts/migrateLegacyHouseholds.js --limit=20
 *
 * FLAGS
 * -----
 *   --execute      Actually run writes (otherwise dry-run).
 *   --aggressive   Also treat any non-@operative.local `role: player` as eligible (use with care).
 *   --only=email   Process a single user doc (email = document id, lowercased).
 *   --limit=N      Stop after N candidates (0 = no limit, default 0 in execute; dry-run can use limit).
 *
 * The Admin SDK uses the project id from the service account; this targets whichever project the key
 * belongs to (dev vs prod is entirely determined by the JSON you pass).
 *
 * EXIT: 0 success, 1 error.
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
 * @param {Record<string, unknown>} d
 * @param {string} realEmail
 * @param {{ aggressive: boolean }} opts
 * @returns {{ reason: string } | null}
 */
function getLegacyEligibility(d, realEmail, opts) {
	if (!realEmail || realEmail.endsWith('@operative.local')) return null;
	const roleStr = typeof d.role === 'string' ? d.role.toLowerCase().trim() : '';
	if (d.migrateLegacySplitComplete === true) return null;
	if (d.parentProvisioned === true && d.operativeCallsign) return null;

	if (
		['super_admin', 'global_admin', 'director', 'coach', 'registrar'].includes(roleStr)
	) {
		return null;
	}
	if (roleStr === 'parent' && d.householdId && !('rosterNames' in d) && !('playerStats' in d)) {
		return null;
	}

	const hasRosterNames = 'rosterNames' in d && d.rosterNames != null;
	const hasPlayerStats = 'playerStats' in d && d.playerStats != null;
	const lacksRole = !roleStr;
	const hasTeamOrName = Boolean(
		(typeof d.teamId === 'string' && d.teamId.trim()) ||
			(typeof d.playerName === 'string' && d.playerName.trim()) ||
			(typeof d.name === 'string' && d.name.trim()) ||
			(typeof d.player === 'string' && d.player.trim()),
	);

	if (hasRosterNames || hasPlayerStats) {
		return { reason: 'rosterNames_or_playerStats' };
	}
	if (lacksRole && hasTeamOrName) {
		return { reason: 'missing_role' };
	}
	if (opts.aggressive && roleStr === 'player') {
		return { reason: 'aggressive_all_players' };
	}
	return null;
}

/**
 * @param {string} name
 * @returns {string} slug 2..32, [a-z0-9]
 */
function nameToOperativeSlug(name) {
	const raw = String(name || '').trim();
	const parts = raw
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.split(/\s+/)
		.filter(Boolean);
	let base =
		parts.length >= 2
			? `${parts[0]}${parts[1]}`
			: parts[0] || 'athlete';
	base = base.replace(/[^a-z0-9]/g, '');
	if (base.length < 2) {
		base = (base + 'athlete').replace(/[^a-z0-9]/g, '').slice(0, 4) + 'x1';
	}
	if (base.length < 2) {
		base = 'ath' + crypto.randomInt(0, 1000).toString(36);
	}
	return base.slice(0, 32);
}

/**
 * @returns {string} 6 char A-Z0-9
 */
function genDispatch6() {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	return Array.from({ length: 6 }, () => chars[crypto.randomInt(0, chars.length)]).join('');
}

function initFirebaseAdmin() {
	const fromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
	/** @type {string[]} */
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
			'[migrate] Missing credentials.\n' +
				'  Set GOOGLE_APPLICATION_CREDENTIALS, or run:\n' +
				'  node admin-scripts/migrateLegacyHouseholds.js <path-to-serviceAccountKey.json> [--execute]\n',
		);
		process.exit(1);
	}
	if (!existsSync(keyPath)) {
		console.error(`[migrate] Service account file not found: ${keyPath}`);
		process.exit(1);
	}
	let credential;
	try {
		const json = readFileSync(keyPath, 'utf8');
		credential = admin.credential.cert(/** @type {import('firebase-admin').ServiceAccount} */ (JSON.parse(json)));
	} catch (e) {
		console.error('[migrate] Could not read or parse the service account JSON.', e);
		process.exit(1);
	}
	admin.initializeApp({ credential });
	return admin.firestore();
}

/**
 * @param {Record<string, unknown>} d
 * @param {string} childName
 */
function buildChildUserPayload(d, childName) {
	/** @type {Record<string, unknown>} */
	const o = { ...d };
	const now = admin.firestore.FieldValue.serverTimestamp();
	for (const k of [
		'migrateLegacySplitComplete',
		'householdId',
		'playerEmails',
		'parentProvisionerEmail',
	]) {
		if (k in o) {
			delete o[k];
		}
	}
	o.role = 'player';
	o.playerName = childName;
	o.parentProvisioned = true;
	o.migrateLegacySplitComplete = true;
	o.operativeMigrated = true;
	o.updatedAt = now;
	return o;
}

/**
 * @param {Record<string, unknown>} d
 * @param {string} _parentEmail
 * @param {string} childProxy
 * @param {string} childName
 * @param {string} householdId
 */
function buildParentStripDeletes(d, _parentEmail, childProxy, childName, householdId) {
	/** @type {Record<string, import('firebase-admin').firestore.FieldValue | string | string[] | boolean>} */
	const out = {
		role: 'parent',
		householdId,
		playerEmails: [childProxy],
		playerNames: [childName],
		migrateLegacySplitComplete: true,
		updatedAt: admin.firestore.FieldValue.serverTimestamp(),
	};

	const stripKeys = new Set(
		[
			'teamId',
			'playerName',
			'name',
			'player',
			'total_xp',
			'xp',
			'level',
			'playerLevel',
			'avatar',
			'avatarUrl',
			'playerStats',
			'rosterNames',
			'currentStreak',
			'longestStreak',
			'lastActivityDate',
			'joinedAt',
			'operativeCallsign',
			'operativeCallsignSlug',
			'parentProvisioned',
			'parentProvisionerEmail',
			'privacyProfile',
			'telemetryOptIn',
			'dateOfBirth',
			'consentPolicyVersion',
			'biometricOrVideoConsentAt',
		].filter((k) => k in d),
	);
	for (const k of Object.keys(d)) {
		if (k === 'migratedFromAccount') {
			stripKeys.add(k);
		}
	}
	for (const k of stripKeys) {
		out[k] = admin.firestore.FieldValue.delete();
	}
	return out;
}

/**
 * @param {import('firebase-admin').firestore.Firestore} db
 * @param {string} fromEmail
 * @param {string} toEmail
 * @param {boolean} execute
 * @param {{ log: (s: string) => void }} io
 */
async function copyWorkoutsSubcollection(db, fromEmail, toEmail, execute, io) {
	const fromRef = db.collection('users').doc(fromEmail).collection('workouts');
	const snap = await fromRef.get();
	if (snap.empty) {
		io.log(`[workouts] none under users/${fromEmail}/workouts`);
		return 0;
	}
	const docs = snap.docs;
	const MAX = 400;
	let n = 0;
	for (let i = 0; i < docs.length; i += MAX) {
		const chunk = docs.slice(i, i + MAX);
		const b = db.batch();
		for (const docSnap of chunk) {
			b.set(
				db.collection('users').doc(toEmail).collection('workouts').doc(docSnap.id),
				docSnap.data(),
			);
		}
		if (execute) {
			await b.commit();
		}
		n += chunk.length;
		io.log(
			`[workouts] ${execute ? 'copied' : 'WOULD copy'} ${chunk.length} doc(s) → users/${toEmail}/workouts (chunk ${i / MAX + 1})`,
		);
	}
	return n;
}

function parseArgs() {
	/** @type {string[]} */
	const argv = process.argv.slice(2);
	const out = {
		execute: false,
		aggressive: false,
		only: /** @type {string | null} */ (null),
		limit: 0,
		credentialPath: /** @type {string | null} */ (null),
	};
	for (const a of argv) {
		if (a === '--execute') {
			out.execute = true;
		} else if (a === '--aggressive') {
			out.aggressive = true;
		} else if (a.startsWith('--only=')) {
			out.only = normEmail(a.slice(7));
		} else if (a.startsWith('--limit=')) {
			const n = parseInt(a.slice(8), 10);
			out.limit = Number.isFinite(n) && n > 0 ? n : 0;
		} else if (a.startsWith('--')) {
			console.warn(`[migrate] unknown flag: ${a}`);
		} else if (a.includes('.json') && !out.credentialPath) {
			out.credentialPath = resolve(a);
		}
	}
	if (out.only && out.only.includes('@')) {
		/* keep */
	} else if (out.only) {
		console.error('[migrate] --only= requires a full email');
		process.exit(1);
	}
	return out;
}

/**
 * @param {import('firebase-admin').firestore.Firestore} db
 * @param {import('firebase-admin').app.App} adminApp
 * @param {string} proxyEmail
 * @param {string} childName
 * @param {string} realEmail
 * @param {boolean} execute
 * @param {{ log: (s: string) => void }} io
 * @returns {Promise<string | null>} child uid
 */
async function ensureChildAuthUser(adminApp, proxyEmail, childName, realEmail, execute, io) {
	const auth = adminApp.auth();
	try {
		const existing = await auth.getUserByEmail(proxyEmail);
		io.log(
			`[auth] child Auth user already exists: ${proxyEmail} uid=${existing.uid} (re-use)`,
		);
		return existing.uid;
	} catch (e) {
		if (/** @type {{ code?: string }} */ (e).code !== 'auth/user-not-found') {
			throw e;
		}
	}
	if (!execute) {
		io.log(
			`[auth] DRY-RUN: would create Auth user for ${proxyEmail} (childName: ${childName}, migrated from ${realEmail})`,
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

/**
 * @param {import('firebase-admin').firestore.Firestore} db
 * @param {import('firebase-admin').app.App} app
 * @param {import('firebase-admin').firestore.QueryDocumentSnapshot} doc
 * @param {{ execute: boolean; log: (s: string) => void; aggressive: boolean }} opts
 * @returns {Promise<boolean>}
 */
async function migrateOne(db, app, doc, opts) {
	const d = /** @type {Record<string, unknown>} */ (doc.data() || {});
	const realEmail = normEmail(doc.id);
	if (!realEmail) {
		opts.log(`[skip] empty doc id`);
		return false;
	}
	const parentEmail = realEmail;
	const elig = getLegacyEligibility(d, realEmail, { aggressive: opts.aggressive });
	if (!elig) {
		return false;
	}
	opts.log(`[ledger] Eligible ${realEmail} (${elig.reason})`);

	const childName =
		(typeof d.playerName === 'string' && d.playerName.trim() && d.playerName.trim().slice(0, 200)) ||
		(typeof d.name === 'string' && d.name.trim() && d.name.trim().slice(0, 200)) ||
		(typeof d.player === 'string' && d.player.trim() && d.player.trim().slice(0, 200)) ||
		realEmail.split('@')[0] ||
		'Athlete';

	let slug = nameToOperativeSlug(childName);
	/** @type {string} */
	let proxyEmail = '';
	for (let attempt = 0; attempt < 25; attempt++) {
		const suffix = attempt === 0 ? '' : String(crypto.randomInt(10, 99));
		const s = (slug + suffix).replace(/[^a-z0-9]/g, '').slice(0, 32) || 'athlete' + attempt;
		const tryEmail = normEmail(`${s}@operative.local`);
		if (!tryEmail) {
			break;
		}
		const uSnap = await db.collection('users').doc(tryEmail).get();
		let authExists = false;
		try {
			await app.auth().getUserByEmail(tryEmail);
			authExists = true;
		} catch (e) {
			if (/** @type {{ code?: string }} */ (e).code === 'auth/user-not-found') {
				authExists = false;
			} else {
				throw e;
			}
		}
		if (!uSnap.exists && !authExists) {
			proxyEmail = tryEmail;
			slug = s;
			break;
		}
	}
	if (!proxyEmail) {
		opts.log(`[error] no free @operative.local for ${realEmail}`);
		return false;
	}
	opts.log(`[mint] ${realEmail}  →  ${proxyEmail} (slug base ${slug})`);
	opts.log(
		`Migrating legacy account: ${realEmail}  →  child ${proxyEmail}  |  name="${childName}"`,
	);

	const clubId =
		typeof d.clubId === 'string' && d.clubId.trim() ? d.clubId.trim() : '';
	if (!clubId) {
		opts.log(`[error] ${realEmail} has no clubId.`);
		return false;
	}

	const teamIdVal =
		typeof d.teamId === 'string' && d.teamId.trim() ? d.teamId.trim() : null;
	const now = admin.firestore.FieldValue.serverTimestamp();

	/** @type {string} */
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

	const householdId = db.collection('households').doc().id;
	const hRef = db.collection('households').doc(householdId);
	const uChild = db.collection('users').doc(proxyEmail);
	const uParent = db.collection('users').doc(parentEmail);
	const plRef = db.collection('player_lookup').doc(proxyEmail);
	const plParentRef = db.collection('player_lookup').doc(parentEmail);
	const dispRef = db.collection('operative_dispatches').doc();
	const dispatchCode = genDispatch6();

	const plParentSnap = await plParentRef.get();
	/** @type {string[] | null} */
	let nextPlayerUids = null;
	if (teamIdVal) {
		const tSnap = await db.collection('teams').doc(teamIdVal).get();
		const cur =
			tSnap.exists && Array.isArray(tSnap.data().playerUids) ?
				[...tSnap.data().playerUids] :
				[];
		const withoutParent = parentUid ? cur.filter((id) => id !== parentUid) : cur;
		nextPlayerUids = [...withoutParent];
		if (childUid && childUid !== 'dry-run-mock-uid' && !nextPlayerUids.includes(childUid)) {
			nextPlayerUids.push(childUid);
		}
		opts.log(`[team] planned playerUids for ${teamIdVal}: ${JSON.stringify(nextPlayerUids)}`);
	}
	opts.log(
		`[dispatch] operative sign-in for ${proxyEmail} — dispatchCode=${dispatchCode} (6-char)`,
	);

	const childPayload = buildChildUserPayload(
		{
			...d,
			migratedFromAccount: parentEmail,
			householdId,
			operativeCallsign: slug,
			operativeCallsignSlug: slug,
		},
		childName,
	);

	const parentUpdate = {
		...buildParentStripDeletes(
			/** @type {Record<string, unknown>} */ (d),
			parentEmail,
			proxyEmail,
			childName,
			householdId,
		),
	};

	const batch = db.batch();
	batch.set(uChild, childPayload, { merge: true });
	batch.set(uParent, parentUpdate, { merge: true });
	batch.set(hRef, {
		clubId,
		parentEmails: [parentEmail],
		playerEmails: [proxyEmail],
		playerNames: [childName],
		playerCallsigns: [slug],
		coppaSigned: true,
		coppaSignedByMigration: true,
		createdAt: now,
		updatedAt: now,
	});
	batch.set(
		plRef,
		{ clubId, teamId: teamIdVal, playerName: childName, role: 'player' },
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
		...(teamIdVal ? { teamId: teamIdVal } : {}),
		createdAt: now,
		migrationScript: 'migrateLegacyHouseholds',
	});

	if (teamIdVal && nextPlayerUids && opts.execute) {
		batch.set(
			db.collection('teams').doc(teamIdVal),
			{ playerUids: nextPlayerUids, updatedAt: now },
			{ merge: true },
		);
	}

	if (plParentSnap.exists) {
		batch.delete(plParentRef);
		opts.log(`[lookup] remove player_lookup for parent email ${parentEmail}`);
	}

	if (!opts.execute) {
		opts.log(
			`[dry-run] WOULD commit batch: householdId=${householdId}, dispatchCode=${dispatchCode}`,
		);
		opts.log(
			'[dry-run] batch.commit() SKIPPED — pass --execute to apply (Auth user + Firestore + team playerUids)',
		);
		await copyWorkoutsSubcollection(db, parentEmail, proxyEmail, false, { log: opts.log });
		return true;
	}

	await batch.commit();
	opts.log(
		`[batch] committed household=${householdId} dispatchCode=${dispatchCode} for ${proxyEmail}`,
	);
	await copyWorkoutsSubcollection(db, parentEmail, proxyEmail, true, { log: opts.log });
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
	console.log(
		`\n══ migrateLegacyHouseholds  project=${projectId}  execute=${args.execute}  aggressive=${args.aggressive} ══\n`,
	);

	/** @type {import('firebase-admin').firestore.QueryDocumentSnapshot[]} */
	const candidates = [];
	if (args.only) {
		const s = await db.collection('users').doc(args.only).get();
		if (s.exists) {
			candidates.push(/** @type {import('firebase-admin').firestore.QueryDocumentSnapshot} */ (s));
		} else {
			console.error(`[migrate] no user doc: ${args.only}`);
			process.exit(1);
		}
	} else {
		const pageSize = 500;
		let last = null;
		for (;;) {
			let q = db.collection('users').orderBy('__name__').limit(pageSize);
			if (last) {
				q = q.startAfter(last);
			}
			const snap = await q.get();
			if (snap.empty) {
				break;
			}
			for (const d of snap.docs) {
				candidates.push(/** @type {import('firebase-admin').firestore.QueryDocumentSnapshot} */ (d));
			}
			last = snap.docs[snap.docs.length - 1];
		}
	}

	let done = 0;
	let scan = 0;
	const io = (line) => console.log(`[${new Date().toISOString()}] ${line}`);

	for (const d of candidates) {
		scan += 1;
		const r = getLegacyEligibility(/** @type {Record<string, unknown>} */ (d.data() || {}), normEmail(d.id), {
			aggressive: args.aggressive,
		});
		if (r) {
			await migrateOne(db, app, d, { execute: args.execute, log: io, aggressive: args.aggressive });
			done += 1;
			if (args.limit && done >= args.limit) {
				io(`[stop] --limit=${args.limit} reached`);
				break;
			}
		}
	}
	console.log(
		`\n[summary] scanned=${scan}  migrations_run=${done}  execute=${args.execute}\n`,
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
