/**
 * scripts/dedupeUsers.js
 * ---------------------------------------------------------------------------
 * Sprint 2.6.5 — Canonicalise the `users` collection to UID-keyed docs.
 *
 * During Sprints 2.x we wrote user profiles under BOTH:
 *   • users/{emailKey}  ← legacy key, still read by src/lib/auth/profile.js
 *   • users/{uid}       ← CTO-mandated canonical key (Sprint 2.6.4)
 *
 * That duplication is acceptable for reads, but creates a consistency hazard
 * for writes (role, clubId, seat allocations, streaks). This script walks the
 * entire `users` collection, groups documents by email, KEEPS the document
 * whose `docId === uid` (canonical), MERGES every loser's field tree into
 * the winner using last-write-wins on non-null values, and finally DELETES
 * the rogue email-keyed document.
 *
 * Strict rules (enterprise):
 *   • Default mode is DRY-RUN. No writes unless `--execute` is provided.
 *   • A document can never be deleted unless its data has been merged into a
 *     survivor FIRST, and the merge write has already landed (sequential).
 *   • If the survivor cannot be identified (e.g. Auth record missing for the
 *     email, or both docs look UID-ish, or neither does), the group is SKIPPED
 *     and printed in the `unresolved` summary — no data is lost.
 *   • Batch deletes cap at 400/batch (Firestore max is 500).
 *   • Every deletion writes a `security_audit` row:
 *         action: 'DEDUPE_USER'
 *         keptDocId / deletedDocId / email / mergedFieldCount
 *
 * Credentials (in priority order):
 *   1. `GOOGLE_APPLICATION_CREDENTIALS` env var → path to SA JSON.
 *   2. `./serviceAccountKey.json` at the repo root.
 *   3. `gcloud auth application-default login` ambient credentials.
 *
 * Usage:
 *   node scripts/dedupeUsers.js                    # dry-run (recommended first)
 *   node scripts/dedupeUsers.js --execute          # commit
 *   node scripts/dedupeUsers.js --verbose          # print per-field merge diffs
 *   node scripts/dedupeUsers.js --limit=100        # process only first N groups
 * ---------------------------------------------------------------------------
 */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { createRequire } from 'node:module';
import { promptUserForWinner } from './utils/cliPromptUtils.js';

/* ------------------------------------------------------------------ */
/* 0. Console helpers                                                  */
/* ------------------------------------------------------------------ */
const RED = '\u001b[31m';
const YEL = '\u001b[33m';
const GRN = '\u001b[32m';
const CYA = '\u001b[36m';
const MAG = '\u001b[35m';
const DIM = '\u001b[2m';
const BLD = '\u001b[1m';
const RST = '\u001b[0m';
const RULE = '─'.repeat(76);

let stepNum = 0;
function stamp() {
	return new Date().toISOString().replace('T', ' ').replace('Z', '');
}
function step(label) {
	stepNum += 1;
	console.log(
		`${DIM}[${stamp()}]${RST} ${CYA}▸ step ${String(stepNum).padStart(2, '0')}${RST} ${BLD}${label}${RST}`
	);
}
function info(msg) {
	console.log(`${DIM}[${stamp()}]${RST}   ${msg}`);
}
function ok(msg) {
	console.log(`${DIM}[${stamp()}]${RST}   ${GRN}✓${RST} ${msg}`);
}
function warn(msg) {
	console.log(`${DIM}[${stamp()}]${RST}   ${YEL}⚠${RST} ${msg}`);
}
function fail(msg) {
	console.log(`${DIM}[${stamp()}]${RST}   ${RED}✖${RST} ${msg}`);
}

/* ------------------------------------------------------------------ */
/* Utilities                                                           */
/* ------------------------------------------------------------------ */
/** Firebase Auth UIDs are 28 URL-safe chars with no `@` / `.`. */
function looksLikeUid(id) {
	return (
		typeof id === 'string' &&
		id.length >= 20 &&
		id.length <= 128 &&
		!/[@.\s]/.test(id)
	);
}
/** Anything with an `@` is an email key (the legacy doc id style). */
function looksLikeEmailKey(id) {
	return typeof id === 'string' && id.includes('@');
}

/**
 * Merge `loser.data` into `winner.data` using last-write-wins on non-null
 * values. `winner` always wins on scalar conflicts; for fields missing on the
 * winner but present on the loser we promote the loser's value. Server
 * timestamps and Firestore sentinels are preserved as-is.
 * @returns {{ patch: Record<string, unknown>, changedCount: number }}
 */
function buildMergePatch(winnerData, loserData) {
	/** @type {Record<string, unknown>} */
	const patch = {};
	let changed = 0;
	for (const [k, v] of Object.entries(loserData || {})) {
		if (v === undefined || v === null) continue;
		const wv = winnerData ? winnerData[k] : undefined;
		const winnerHasValue = wv !== undefined && wv !== null && wv !== '';
		if (!winnerHasValue) {
			// Zero-Trust Security Payload Stripping
			if (k !== 'role' && k !== 'clubId') {
				patch[k] = v;
				changed += 1;
			}
		}
	}
	return { patch, changedCount: changed };
}

/* ------------------------------------------------------------------ */
/* Main — top-level try/catch                                          */
/* ------------------------------------------------------------------ */
async function main() {
	console.log(RULE);
	console.log(
		` ${BLD}users/ Dedupe${RST}  │  ${DIM}verbose-debug mode${RST}`
	);
	console.log(RULE);

	step('Resolving script location');
	const __filename = url.fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const REPO_ROOT = path.resolve(__dirname, '..');
	info(`node=${process.version} platform=${process.platform}`);
	info(`REPO_ROOT=${REPO_ROOT}`);

	step('Resolving firebase-admin');
	const rootRequire = createRequire(import.meta.url);
	let admin;
	try {
		admin = rootRequire('firebase-admin');
		ok('firebase-admin resolved from repo-root node_modules');
	} catch (err) {
		warn(`repo-root resolve failed (${err.code || err.message}); trying functions/…`);
		const functionsRequire = createRequire(
			path.join(REPO_ROOT, 'functions', 'package.json')
		);
		admin = functionsRequire('firebase-admin');
		ok('firebase-admin resolved from ./functions/node_modules');
	}

	step('Parsing CLI flags');
	const argv = process.argv.slice(2);
	const hasFlag = (n) => argv.includes(n);
	const getFlag = (n) => {
		const hit = argv.find((a) => a.startsWith(`${n}=`));
		return hit ? hit.slice(n.length + 1) : '';
	};
	const EXECUTE = hasFlag('--execute');
	const VERBOSE = hasFlag('--verbose') || hasFlag('-v');
	const LIMIT = Number(getFlag('--limit')) || 0;
	const PROJECT_ID =
		process.env.GCLOUD_PROJECT ||
		process.env.FIREBASE_PROJECT ||
		'soccer-skills-tracker';
	info(`argv          = ${JSON.stringify(argv)}`);
	info(`EXECUTE       = ${EXECUTE ? `${RED}LIVE${RST}` : `${YEL}dry-run${RST}`}`);
	info(`VERBOSE       = ${VERBOSE}`);
	info(`LIMIT         = ${LIMIT || '(all groups)'}`);
	info(`PROJECT_ID    = ${PROJECT_ID}`);

	step('Initialising firebase-admin');
	const sa = path.join(REPO_ROOT, 'serviceAccountKey.json');
	if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
		info(`credential: GOOGLE_APPLICATION_CREDENTIALS → ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
		admin.initializeApp({ projectId: PROJECT_ID });
	} else if (fs.existsSync(sa)) {
		info('credential: ./serviceAccountKey.json');
		const raw = JSON.parse(fs.readFileSync(sa, 'utf8'));
		admin.initializeApp({
			credential: admin.credential.cert(raw),
			projectId: raw.project_id || PROJECT_ID
		});
		info(`  project_id=${raw.project_id}  client_email=${raw.client_email}`);
	} else {
		info('credential: Application Default Credentials');
		admin.initializeApp({ projectId: PROJECT_ID });
	}
	const db = admin.firestore();
	const auth = admin.auth();
	ok(`firebase-admin ready (apps.length=${admin.apps.length})`);

	/* ---------------------------------------------------------------- */
	/* Load users                                                       */
	/* ---------------------------------------------------------------- */
	step('Loading every document from users/');
	if (!db) {
		fail('Hydration Error: db is undefined. Aborting to prevent quota loop.');
		return 1;
	}
	const snap = await db.collection('users').get();
	ok(`fetched ${snap.size} user document${snap.size === 1 ? '' : 's'}`);

	/** @typedef {{ id: string, data: Record<string, unknown>, email: string | null, uid: string | null }} Row */
	/** @type {Row[]} */
	const rows = [];
	snap.forEach((d) => {
		const data = /** @type {Record<string, unknown>} */ (d.data() || {});
		const rawEmail =
			(typeof data.email === 'string' && data.email) ||
			(typeof data.emailLower === 'string' && data.emailLower) ||
			(looksLikeEmailKey(d.id) ? d.id : '');
		const email = rawEmail ? String(rawEmail).toLowerCase().trim() : null;
		const uid = typeof data.uid === 'string' && data.uid.trim() ? data.uid.trim() : null;
		rows.push({ id: d.id, data, email, uid });
	});

	step('Grouping rows by email');
	/** @type {Map<string, Row[]>} */
	const byEmail = new Map();
	/** @type {Row[]} */
	const emailless = [];
	for (const r of rows) {
		if (!r.email) {
			emailless.push(r);
			continue;
		}
		const list = byEmail.get(r.email) || [];
		list.push(r);
		byEmail.set(r.email, list);
	}
	ok(`grouped into ${byEmail.size} email bucket${byEmail.size === 1 ? '' : 's'}`);
	if (emailless.length) {
		warn(
			`${emailless.length} row${
				emailless.length === 1 ? '' : 's'
			} have no resolvable email — they will be IGNORED (safe):`
		);
		for (const r of emailless.slice(0, 10)) info(`  · users/${r.id}`);
		if (emailless.length > 10) info(`  · …and ${emailless.length - 10} more`);
	}

	const duplicateBuckets = Array.from(byEmail.entries())
		.filter(([, list]) => list.length > 1)
		.sort((a, b) => b[1].length - a[1].length);

	ok(
		`${duplicateBuckets.length} email${duplicateBuckets.length === 1 ? '' : 's'} ` +
			`have duplicate docs`
	);
	if (duplicateBuckets.length === 0) {
		console.log(RULE);
		console.log(` ${GRN}Nothing to dedupe. users/ is already canonical.${RST}`);
		console.log(RULE);
		return 0;
	}

	console.log(RULE);
	console.log(
		` ${
			EXECUTE
				? `${RED}▶ LIVE EXECUTE MODE — duplicates WILL be merged + deleted.${RST}`
				: `${YEL}▶ DRY-RUN (no writes). Re-run with --execute to commit.${RST}`
		}`
	);
	console.log(RULE);

	/* ---------------------------------------------------------------- */
	/* Process each duplicate bucket                                    */
	/* ---------------------------------------------------------------- */
	const results = {
		merged: 0,
		deleted: 0,
		skippedUnresolved: 0,
		errors: 0
	};

	const buckets = LIMIT ? duplicateBuckets.slice(0, LIMIT) : duplicateBuckets;

	for (const [email, list] of buckets) {
		console.log('');
		console.log(`${MAG}──── ${email}  (${list.length} docs) ────${RST}`);
		for (const r of list) info(`  · users/${r.id}   uid-field=${r.uid || '(unset)'}`);

		try {
			// ── Step 1: canonical UID via Firebase Auth ──────────────────────
			step(`[${email}] Resolving canonical UID via getUserByEmail`);
			let canonicalUid = null;
			try {
				const userRec = await auth.getUserByEmail(email);
				canonicalUid = userRec.uid;
				ok(`auth UID = ${canonicalUid}`);
			} catch (err) {
				if (err && err.code === 'auth/user-not-found') {
					warn(
						`no Firebase Auth record for ${email}. Falling back to any doc ` +
							`whose id/uid-field looks UID-shaped.`
					);
				} else {
					throw err;
				}
			}

			// ── Step 2: pick the winner ──────────────────────────────────────
			step(`[${email}] Selecting the survivor doc`);
			/** @type {Row | null} */
			let winner = null;
			if (canonicalUid) {
				winner =
					list.find((r) => r.id === canonicalUid) ||
					list.find((r) => r.uid === canonicalUid) ||
					null;
			}
			if (!winner) {
				// No matching UID-keyed doc — pick the first that *looks* UID-shaped.
				winner =
					list.find((r) => looksLikeUid(r.id)) ||
					list.find((r) => r.uid && looksLikeUid(r.uid)) ||
					null;
			}
			if (!winner) {
				winner = await promptUserForWinner(email, list);
			}

			if (!winner) {
				warn(`Skipping group for ${email} as no survivor was selected.`);
				results.skippedUnresolved += 1;
				continue;
			}
			ok(`winner = users/${winner.id}   (docId=uid: ${looksLikeUid(winner.id)})`);

			const losers = list.filter((r) => r.id !== winner.id);
			info(`losers to merge+delete: ${losers.map((r) => r.id).join(', ')}`);

			// ── Step 3: fold each loser into the winner ──────────────────────
			let mergedFieldsTotal = 0;
			/** @type {Record<string, unknown>} */
			let accumulatedPatch = {};
			for (const L of losers) {
				const { patch, changedCount } = buildMergePatch(
					{ ...winner.data, ...accumulatedPatch },
					L.data
				);
				mergedFieldsTotal += changedCount;
				if (VERBOSE) {
					if (changedCount === 0) info(`  · users/${L.id}: no new fields to merge`);
					else {
						info(`  · users/${L.id}: +${changedCount} field(s):`);
						for (const [k, v] of Object.entries(patch)) {
							const preview =
								typeof v === 'string'
									? v.slice(0, 60)
									: JSON.stringify(v).slice(0, 60);
							info(`      ${k} = ${preview}`);
						}
					}
				}
				accumulatedPatch = { ...accumulatedPatch, ...patch };
			}

			/** @type {Record<string, unknown>} */
			const finalWinnerPatch = {
				...accumulatedPatch,
				email,
				emailLower: email,
				dedupedAt: admin.firestore.FieldValue.serverTimestamp(),
				dedupedBy: 'scripts/dedupeUsers.js'
			};
			if (canonicalUid) finalWinnerPatch.uid = canonicalUid;

			info(
				`prepared survivor patch: ${Object.keys(accumulatedPatch).length} merged ` +
					`field(s) + provenance stamps`
			);

			// ── Dry-run path ────────────────────────────────────────────────
			if (!EXECUTE) {
				info(
					`${YEL}(dry-run)${RST} would MERGE into users/${winner.id} and DELETE: ` +
						`${losers.map((l) => `users/${l.id}`).join(', ')}`
				);
				continue;
			}

			// ── Live: merge survivor, then delete losers in a batch ──────────
			step(`[${email}] Writing survivor merge to users/${winner.id}`);
			await db
				.collection('users')
				.doc(winner.id)
				.set(finalWinnerPatch, { merge: true });
			results.merged += 1;
			ok(`survivor users/${winner.id} patched`);

			step(`[${email}] Deleting ${losers.length} duplicate doc(s)`);
			let batch = db.batch();
			let ops = 0;
			for (const L of losers) {
				batch.delete(db.collection('users').doc(L.id));
				ops += 1;
				if (ops >= 400) {
					await batch.commit();
					batch = db.batch();
					ops = 0;
				}
			}
			if (ops > 0) await batch.commit();
			results.deleted += losers.length;
			for (const L of losers) ok(`deleted users/${L.id}`);

			// ── Audit log ───────────────────────────────────────────────────
			step(`[${email}] Appending security_audit entry`);
			try {
				await db.collection('security_audit').add({
					action: 'DEDUPE_USER',
					scope: 'dedupe_script',
					email,
					keptDocId: winner.id,
					deletedDocIds: losers.map((L) => L.id),
					mergedFieldCount: mergedFieldsTotal,
					canonicalUid: canonicalUid || null,
					actor: 'scripts/dedupeUsers.js',
					at: admin.firestore.FieldValue.serverTimestamp()
				});
				ok(`audit row written`);
			} catch (err) {
				warn(`audit failed (non-fatal): ${err.message}`);
			}

			console.log(
				`${GRN}${BLD}   ✓ ${email} consolidated → users/${winner.id}${RST}`
			);
		} catch (err) {
			results.errors += 1;
			fail(`unhandled error for ${email}: ${err.stack || err.message || err}`);
		}
	}

	/* ---------------------------------------------------------------- */
	/* Summary                                                          */
	/* ---------------------------------------------------------------- */
	console.log('');
	console.log(RULE);
	console.log(
		` ${BLD}Summary${RST}  duplicate buckets processed: ${buckets.length}/${duplicateBuckets.length}`
	);
	console.log(RULE);
	console.log(
		` survivors merged   = ${GRN}${results.merged}${RST}` +
			`   duplicates deleted = ${GRN}${results.deleted}${RST}`
	);
	console.log(
		` unresolved skipped = ${YEL}${results.skippedUnresolved}${RST}` +
			`   errors             = ${RED}${results.errors}${RST}`
	);
	if (!EXECUTE) {
		console.log(` ${YEL}This was a dry-run.${RST} Re-run with ${BLD}--execute${RST} to commit.`);
	}
	console.log(RULE);

	return results.errors === 0 ? 0 : 1;
}

main()
	.then((code) => {
		console.log(
			`${DIM}[${stamp()}]${RST} ${GRN}script finished${RST} exitCode=${code}`
		);
		process.exit(code);
	})
	.catch((err) => {
		console.error('');
		console.error(`${RED}${BLD}FATAL ERROR — dedupe aborted${RST}`);
		console.error(`${RED}message:${RST} ${err && err.message ? err.message : String(err)}`);
		if (err && err.code) console.error(`${RED}code   :${RST} ${err.code}`);
		if (err && err.stack) console.error(`${RED}stack  :${RST}\n${err.stack}`);
		else console.error(err);
		process.exit(1);
	});
