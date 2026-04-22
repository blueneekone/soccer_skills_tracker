/**
 * scripts/migrateGlobalAdmins.js
 * ---------------------------------------------------------------------------
 * Sprint 2.6.4 — Global Admin role migration (obnoxiously verbose edition).
 *
 * Promotes a curated set of operator emails to the canonical `global_admin`
 * role. This is the ONLY sanctioned path to grant platform-wide admin
 * authority — there are no hardcoded auth bypasses, master passwords, or
 * magic links anywhere in the product.
 *
 * Per CTO mandate (Sprint 2.6.4 final polish):
 *   • For every email we resolve the real Firebase Auth UID via
 *     `admin.auth().getUserByEmail(email)` — we do NOT assume any implicit
 *     email ⇄ doc-id mapping.
 *   • We set Auth custom claims on that UID:
 *         { role: 'global_admin', isGlobalAdmin: true, global_admin: true }
 *   • We write the Firestore role record to `users/{uid}` with
 *     `{ merge: true }`.
 *   • Because the rest of the app historically reads `users/{emailKey}`
 *     (see src/lib/auth/profile.js — `doc(db, 'users', emailKey)`), we ALSO
 *     mirror the role into `users/{emailKey}` as a backward-compatible shim
 *     so the running product recognises the claim immediately. Both writes
 *     are logged distinctly.
 *
 *     Organization → Program → Team → Roster
 *
 * Every step is narrated to stdout so failures can NEVER happen silently.
 * The entire main flow is wrapped in a top-level try/catch that prints the
 * error and calls process.exit(1).
 *
 * Credentials (in priority order):
 *   1. `GOOGLE_APPLICATION_CREDENTIALS` env var → path to a SA JSON.
 *   2. `./serviceAccountKey.json` at the repo root (gitignored).
 *   3. `gcloud auth application-default login` ambient credentials.
 *
 * Usage:
 *   # Dry-run against the default cohort:
 *   node scripts/migrateGlobalAdmins.js
 *
 *   # Live run:
 *   node scripts/migrateGlobalAdmins.js --execute
 *
 *   # Custom cohort via CLI flag or env var:
 *   node scripts/migrateGlobalAdmins.js --execute \
 *     --emails="ceo@example.com,keagan@example.com"
 *   GLOBAL_ADMIN_EMAILS="a@b.com,c@d.com" node scripts/migrateGlobalAdmins.js
 * ---------------------------------------------------------------------------
 */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { createRequire } from 'node:module';

/* ------------------------------------------------------------------ */
/* 0. Console decoration + narration helpers                           */
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

let stepCounter = 0;
function stamp() {
	return new Date().toISOString().replace('T', ' ').replace('Z', '');
}
function step(label) {
	stepCounter += 1;
	console.log(
		`${DIM}[${stamp()}]${RST} ${CYA}▸ step ${String(stepCounter).padStart(
			2,
			'0'
		)}${RST} ${BLD}${label}${RST}`
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
/* 1. Main — entire flow wrapped in top-level try/catch               */
/* ------------------------------------------------------------------ */
async function main() {
	console.log(RULE);
	console.log(
		` ${BLD}Global Admin Migration${RST}  │  ${DIM}verbose-debug mode${RST}`
	);
	console.log(RULE);

	step('Resolving script location + repo root');
	const __filename = url.fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const REPO_ROOT = path.resolve(__dirname, '..');
	info(`__filename = ${__filename}`);
	info(`REPO_ROOT  = ${REPO_ROOT}`);
	info(`node       = ${process.version}  platform=${process.platform}`);

	step('Resolving firebase-admin package');
	const rootRequire = createRequire(import.meta.url);
	let admin;
	try {
		admin = rootRequire('firebase-admin');
		ok("firebase-admin resolved from repo-root 'node_modules'");
	} catch (err) {
		warn(
			`repo-root resolution failed (${err.code || err.message}); trying ./functions/node_modules…`
		);
		const functionsRequire = createRequire(
			path.join(REPO_ROOT, 'functions', 'package.json')
		);
		admin = functionsRequire('firebase-admin');
		ok("firebase-admin resolved from ./functions/node_modules");
	}

	step('Parsing CLI flags + environment');
	const argv = process.argv.slice(2);
	info(`argv = ${JSON.stringify(argv)}`);
	const hasFlag = (name) => argv.includes(name);
	const getFlag = (name) => {
		const hit = argv.find((a) => a.startsWith(`${name}=`));
		return hit ? hit.slice(name.length + 1) : '';
	};
	const EXECUTE = hasFlag('--execute');
	const VERBOSE_EXTRA = hasFlag('--verbose') || hasFlag('-v');
	const PROJECT_ID =
		process.env.GCLOUD_PROJECT ||
		process.env.FIREBASE_PROJECT ||
		'soccer-skills-tracker';
	info(`EXECUTE       = ${EXECUTE ? `${RED}LIVE${RST}` : `${YEL}dry-run${RST}`}`);
	info(`PROJECT_ID    = ${PROJECT_ID}`);
	info(`VERBOSE_EXTRA = ${VERBOSE_EXTRA}`);

	step('Parsing target email cohort');
	const DEFAULT_COHORT = ['ceo@example.com', 'keagan@example.com'];
	const cliRaw = getFlag('--emails');
	const envRaw = process.env.GLOBAL_ADMIN_EMAILS || '';
	info(`--emails flag   : ${cliRaw ? `"${cliRaw}"` : '(not provided)'}`);
	info(
		`GLOBAL_ADMIN_EMAILS env: ${envRaw ? `"${envRaw}"` : '(not provided)'}`
	);
	const raw = cliRaw || envRaw || DEFAULT_COHORT.join(',');
	info(`effective cohort source: ${cliRaw ? 'CLI' : envRaw ? 'env' : 'DEFAULT_COHORT'}`);
	info(`raw cohort string       : "${raw}"`);
	const COHORT = raw
		.split(',')
		.map((e) => e.trim().toLowerCase())
		.filter(Boolean)
		.filter((e, i, a) => a.indexOf(e) === i);

	if (COHORT.length === 0) {
		fail('Empty cohort. Nothing to do.');
		throw new Error(
			'No target emails resolved. Pass --emails="a@b.com,c@d.com" or set GLOBAL_ADMIN_EMAILS.'
		);
	}
	ok(`parsed ${COHORT.length} unique email${COHORT.length === 1 ? '' : 's'}:`);
	for (const e of COHORT) info(`  • ${e}`);

	if (COHORT.some((e) => e.includes('example.com'))) {
		warn(
			`cohort contains a placeholder @example.com address — that account almost ` +
				`certainly does not exist in Firebase Auth and will be reported as ` +
				`'auth/user-not-found'. Override via --emails=... before running live.`
		);
	}

	step('Initialising Firebase Admin SDK');
	const localKeyPath = path.join(REPO_ROOT, 'serviceAccountKey.json');
	if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
		info(
			`credential source: GOOGLE_APPLICATION_CREDENTIALS → ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`
		);
		admin.initializeApp({ projectId: PROJECT_ID });
	} else if (fs.existsSync(localKeyPath)) {
		info(`credential source: ./serviceAccountKey.json`);
		const sa = JSON.parse(fs.readFileSync(localKeyPath, 'utf8'));
		admin.initializeApp({
			credential: admin.credential.cert(sa),
			projectId: sa.project_id || PROJECT_ID
		});
		info(`  project_id in SA JSON = ${sa.project_id || '(missing)'}`);
		info(`  client_email          = ${sa.client_email || '(missing)'}`);
	} else {
		info('credential source: Application Default Credentials (ADC)');
		admin.initializeApp({ projectId: PROJECT_ID });
	}
	ok(`firebase-admin initialised (apps.length=${admin.apps.length})`);

	const db = admin.firestore();
	const auth = admin.auth();

	step('Smoke-testing Firestore connectivity');
	try {
		const probe = await db.collection('users').limit(1).get();
		ok(
			`firestore reachable — 'users' probe returned ${probe.size} doc${
				probe.size === 1 ? '' : 's'
			} (ignore content; this is a connectivity probe)`
		);
	} catch (err) {
		fail(`firestore probe FAILED: ${err.code || ''} ${err.message}`);
		throw err;
	}

	console.log(RULE);
	console.log(
		` ${
			EXECUTE
				? `${RED}▶ LIVE EXECUTE MODE — custom claims & Firestore roles WILL change.${RST}`
				: `${YEL}▶ DRY-RUN MODE (no writes). Re-run with --execute to commit.${RST}`
		}`
	);
	console.log(RULE);

	/* ---------------------------------------------------------------- */
	/* 2. Per-email migration                                           */
	/* ---------------------------------------------------------------- */
	const results = [];
	for (const email of COHORT) {
		console.log('');
		console.log(`${MAG}──── ${email} ────${RST}`);
		const r = {
			email,
			uid: null,
			previousRoleByUid: null,
			previousRoleByEmail: null,
			firestoreUidWritten: false,
			firestoreEmailMirrorWritten: false,
			claimsWritten: false,
			tokensRevoked: false,
			auditWritten: false,
			skipped: false,
			reason: ''
		};

		try {
			// ── Step A: Firebase Auth lookup ─────────────────────────────────
			step(`[${email}] Looking up Firebase Auth record by email`);
			let userRec;
			try {
				userRec = await auth.getUserByEmail(email);
			} catch (err) {
				if (err && err.code === 'auth/user-not-found') {
					fail(
						`no Firebase Auth user found for ${email}. They must sign in to the ` +
							`product at least once (or be provisioned via the auth console) ` +
							`before they can be promoted. Skipping.`
					);
					r.skipped = true;
					r.reason = 'auth/user-not-found';
					results.push(r);
					continue;
				}
				throw err;
			}
			r.uid = userRec.uid;
			ok(`auth record found`);
			info(`  uid           = ${userRec.uid}`);
			info(`  email         = ${userRec.email}`);
			info(`  emailVerified = ${userRec.emailVerified}`);
			info(`  disabled      = ${userRec.disabled}`);
			info(`  providers     = ${userRec.providerData.map((p) => p.providerId).join(', ') || '(none)'}`);
			info(
				`  customClaims  = ${
					userRec.customClaims ? JSON.stringify(userRec.customClaims) : '(none)'
				}`
			);

			// ── Step B-preflight: inspect current Firestore state (both keys) ─
			const emailKey = email; // already lowercased above
			step(`[${email}] Inspecting current Firestore role state`);
			const [byUidSnap, byEmailSnap] = await Promise.all([
				db.collection('users').doc(userRec.uid).get(),
				db.collection('users').doc(emailKey).get()
			]);
			r.previousRoleByUid =
				byUidSnap.exists && byUidSnap.data()?.role
					? String(byUidSnap.data().role)
					: null;
			r.previousRoleByEmail =
				byEmailSnap.exists && byEmailSnap.data()?.role
					? String(byEmailSnap.data().role)
					: null;
			info(
				`  users/${userRec.uid}: ${
					byUidSnap.exists
						? `exists (role=${r.previousRoleByUid || 'unset'})`
						: 'missing'
				}`
			);
			info(
				`  users/${emailKey}: ${
					byEmailSnap.exists
						? `exists (role=${r.previousRoleByEmail || 'unset'})`
						: 'missing'
				}`
			);

			// ── Dry-run: announce intent and continue ────────────────────────
			if (!EXECUTE) {
				info(
					`${YEL}(dry-run)${RST} would SET users/${userRec.uid}.role = 'global_admin' ` +
						`(merge)`
				);
				info(
					`${YEL}(dry-run)${RST} would MIRROR users/${emailKey}.role = 'global_admin' ` +
						`(merge, legacy shim for profile.js reads)`
				);
				info(
					`${YEL}(dry-run)${RST} would SET custom claims { role: 'global_admin', ` +
						`isGlobalAdmin: true, global_admin: true } on uid=${userRec.uid}`
				);
				info(`${YEL}(dry-run)${RST} would revoke refresh tokens on uid=${userRec.uid}`);
				info(
					`${YEL}(dry-run)${RST} would append security_audit entry ` +
						`(action=GRANT_GLOBAL_ADMIN)`
				);
				results.push(r);
				continue;
			}

			// ── Step B: Firestore write — users/{uid} (CTO mandate) ──────────
			step(`[${email}] Writing Firestore users/${userRec.uid}`);
			/** @type {Record<string, unknown>} */
			const uidPayload = {
				email: email,
				emailLower: emailKey,
				role: 'global_admin',
				uid: userRec.uid,
				roleUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
				roleUpdatedBy: 'scripts/migrateGlobalAdmins.js'
			};
			if (!byUidSnap.exists) {
				uidPayload.createdAt = admin.firestore.FieldValue.serverTimestamp();
			}
			await db
				.collection('users')
				.doc(userRec.uid)
				.set(uidPayload, { merge: true });
			r.firestoreUidWritten = true;
			ok(`users/${userRec.uid}.role = 'global_admin' (merge)`);

			// ── Step B-mirror: legacy emailKey doc (what profile.js reads) ───
			step(`[${email}] Mirroring to legacy users/${emailKey} (profile.js shim)`);
			/** @type {Record<string, unknown>} */
			const emailPayload = {
				email: email,
				emailLower: emailKey,
				role: 'global_admin',
				uid: userRec.uid,
				roleUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
				roleUpdatedBy: 'scripts/migrateGlobalAdmins.js'
			};
			if (!byEmailSnap.exists) {
				emailPayload.createdAt = admin.firestore.FieldValue.serverTimestamp();
			}
			await db
				.collection('users')
				.doc(emailKey)
				.set(emailPayload, { merge: true });
			r.firestoreEmailMirrorWritten = true;
			ok(`users/${emailKey}.role = 'global_admin' (merge)`);

			// ── Step C: Firebase Auth custom claims ──────────────────────────
			step(`[${email}] Setting Firebase Auth custom claims on uid=${userRec.uid}`);
			/** @type {Record<string, unknown>} */
			const nextClaims = { ...(userRec.customClaims || {}) };
			nextClaims.role = 'global_admin';
			nextClaims.isGlobalAdmin = true;
			nextClaims.global_admin = true;
			// Retire the legacy bit so identity checks converge on isGlobalAdmin.
			delete nextClaims.isSuperAdmin;
			info(`  claims payload = ${JSON.stringify(nextClaims)}`);
			await auth.setCustomUserClaims(userRec.uid, nextClaims);
			r.claimsWritten = true;
			ok(`custom claims written`);

			// Force any existing sessions to re-mint tokens.
			step(`[${email}] Revoking refresh tokens (forces re-auth to pick up claim)`);
			try {
				await auth.revokeRefreshTokens(userRec.uid);
				r.tokensRevoked = true;
				ok(`refresh tokens revoked`);
			} catch (err) {
				warn(
					`revokeRefreshTokens failed (non-fatal): ${err.code || ''} ${err.message}`
				);
			}

			// ── Audit log ────────────────────────────────────────────────────
			step(`[${email}] Appending security_audit entry`);
			try {
				await db.collection('security_audit').add({
					action: 'GRANT_GLOBAL_ADMIN',
					scope: 'migration_script',
					targetEmail: email,
					targetUid: userRec.uid,
					previousRoleByUid: r.previousRoleByUid,
					previousRoleByEmail: r.previousRoleByEmail,
					newRole: 'global_admin',
					actor: 'scripts/migrateGlobalAdmins.js',
					at: admin.firestore.FieldValue.serverTimestamp()
				});
				r.auditWritten = true;
				ok(`security_audit row written`);
			} catch (err) {
				warn(
					`security_audit write failed (non-fatal): ${err.code || ''} ${err.message}`
				);
			}

			console.log(`${GRN}${BLD}   ✓ ${email} fully migrated to global_admin${RST}`);
		} catch (err) {
			fail(`unhandled error for ${email}: ${err.stack || err.message || err}`);
			r.skipped = true;
			r.reason = `error: ${err.code || ''} ${err.message || err}`;
		}

		results.push(r);
	}

	/* ---------------------------------------------------------------- */
	/* 3. Summary                                                       */
	/* ---------------------------------------------------------------- */
	console.log('');
	console.log(RULE);
	console.log(` ${BLD}Summary${RST}`);
	console.log(RULE);
	for (const r of results) {
		const bits = [];
		if (r.uid) bits.push(`uid=${r.uid}`);
		if (r.firestoreUidWritten) bits.push('users/{uid}✓');
		if (r.firestoreEmailMirrorWritten) bits.push('users/{email}✓');
		if (r.claimsWritten) bits.push('claims✓');
		if (r.tokensRevoked) bits.push('tokens-revoked');
		if (r.auditWritten) bits.push('audit✓');
		if (r.skipped) bits.push(`SKIPPED(${r.reason || 'unknown'})`);

		const colour = r.skipped && r.reason.startsWith('error:') ? RED : r.skipped ? YEL : GRN;
		const glyph = r.skipped && r.reason.startsWith('error:') ? '✖' : r.skipped ? '–' : '✓';
		console.log(
			` ${colour}${glyph}${RST} ${r.email.padEnd(40)} ${DIM}${bits.join(' · ') || 'no-op'}${RST}`
		);
	}
	console.log(RULE);

	const promoted = results.filter(
		(r) => r.firestoreUidWritten || r.firestoreEmailMirrorWritten || r.claimsWritten
	).length;
	const skipped = results.filter((r) => r.skipped).length;
	const errored = results.filter(
		(r) => r.skipped && r.reason.startsWith('error:')
	).length;
	console.log(
		` promoted=${GRN}${promoted}${RST}  skipped=${YEL}${skipped}${RST}  errored=${RED}${errored}${RST}  total=${results.length}`
	);
	if (!EXECUTE) {
		console.log(
			` ${YEL}This was a dry-run.${RST} Re-run with ${BLD}--execute${RST} to commit.`
		);
	} else {
		console.log(
			` ${CYA}Affected users must sign out & back in${RST} to refresh their ID ` +
				`token and pick up the new ${BLD}global_admin${RST} claim.`
		);
	}
	console.log(RULE);

	return errored === 0 ? 0 : 1;
}

/* ------------------------------------------------------------------ */
/* Top-level try/catch — NOTHING fails silently                       */
/* ------------------------------------------------------------------ */
main()
	.then((code) => {
		console.log(
			`${DIM}[${stamp()}]${RST} ${GRN}script finished${RST} exitCode=${code}`
		);
		process.exit(code);
	})
	.catch((err) => {
		console.error('');
		console.error(`${RED}${BLD}FATAL ERROR — migration aborted${RST}`);
		console.error(
			`${RED}message:${RST} ${err && err.message ? err.message : String(err)}`
		);
		if (err && err.code) console.error(`${RED}code   :${RST} ${err.code}`);
		if (err && err.stack) console.error(`${RED}stack  :${RST}\n${err.stack}`);
		else console.error(err);
		process.exit(1);
	});
