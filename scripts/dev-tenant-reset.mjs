#!/usr/bin/env node
/**
 * scripts/dev-tenant-reset.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * DEV TENANT RESET — sports-skill-tracker-dev ONLY.
 * Do not point at soccer-skills-tracker (prod) unless owner explicitly overrides.
 *
 * Default: --dry-run (no writes). --execute only after owner replies "approved execute".
 *
 * Credentials (priority):
 *   1. GOOGLE_APPLICATION_CREDENTIALS
 *   2. ./serviceAccountKey.json (gitignored)
 *   3. Application Default Credentials (gcloud auth application-default login)
 *
 * Usage:
 *   node scripts/dev-tenant-reset.mjs --inventory
 *   node scripts/dev-tenant-reset.mjs
 *   node scripts/dev-tenant-reset.mjs --execute --club-id ab001
 *   node scripts/dev-tenant-reset.mjs --provision --club-id ab001 --team-id team-qa-01
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const DEFAULT_PROJECT = 'sports-skill-tracker-dev';
const BLOCKED_PROJECTS = new Set(['soccer-skills-tracker', 'soccer-skills-tracker-prod']);
const DEFAULT_KEEP =
	'ecwaechtler@gmail.com,ecwaechtler+parent@gmail.com,ecwaechtler+coach@gmail.com,aaron.hanks0287@gmail.com';
const PARENT_EMAIL = 'ecwaechtler+parent@gmail.com';
const BATCH_SIZE = 450;

/** Never delete — compliance / vault */
const PROTECTED_COLLECTIONS = new Set([
	'consents',
	'consent_logs',
	'consent_tokens',
	'consent_records',
	'pii_vault',
]);

/** Skipped unless --include-audit-collections (owner must approve) */
const OWNER_ASK_COLLECTIONS = new Set([
	'audit_logs',
	'security_audit',
	'platform_fee_ledger',
]);

/** Full collection wipe (all documents) */
const FULL_WIPE_ROOT = [
	'coach_invites',
	'magic_uplinks',
	'teams',
	'rosters',
	'team_workouts',
	'schedules',
	'team_stats',
	'team_entitlements',
	'team_broadcasts',
	'assignments',
	'team_assignments',
	'active_missions',
	'missions',
	'assigned_missions',
	'player_stats',
	'reps',
	'trials',
	'evaluations',
	'trial_scores',
	'drill_completions',
	'grit_awards',
	'bounties',
	'bounty_completions',
	'passports',
	'vpc_requests',
	'passkey_challenges',
];

const LOOKUP_COLLECTIONS = ['coach_lookup', 'registrar_lookup', 'player_lookup'];

const argv = process.argv.slice(2);
const hasFlag = (f) => argv.includes(f);
const flagVal = (f, fallback) => {
	const hit = argv.find((a) => a.startsWith(`${f}=`));
	if (hit) return hit.slice(f.length + 1);
	const i = argv.indexOf(f);
	return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};

const PROJECT_ID = flagVal('--project', DEFAULT_PROJECT);
const KEEP_EMAILS = new Set(
	(flagVal('--keep-emails', DEFAULT_KEEP) || DEFAULT_KEEP)
		.split(',')
		.map((e) => normEmail(e))
		.filter(Boolean),
);
const EXECUTE = hasFlag('--execute');
const INVENTORY_ONLY = hasFlag('--inventory');
const PROVISION = hasFlag('--provision');
const REINVENTORY = hasFlag('--re-inventory');
const CLUB_ID_ARG = flagVal('--club-id', '');
const TEAM_ID_ARG = flagVal('--team-id', '');
const ARTIFACT_DATE =
	flagVal('--artifact-date', '') || new Date().toISOString().slice(0, 10).replace(/-/g, '');
const ARTIFACT_DIR = path.join(REPO_ROOT, 'artifacts', `firestore-reset-${ARTIFACT_DATE}`);
const INCLUDE_AUDIT = hasFlag('--include-audit-collections');

function normEmail(v) {
	if (typeof v !== 'string') return '';
	return v.trim().toLowerCase();
}

/** Comma-separated `--club-id` → Set of club doc ids to preserve */
function parseKeepClubIds(arg) {
	if (!arg || !String(arg).trim()) return new Set();
	return new Set(
		String(arg)
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean),
	);
}

function resolveKeepClubIds(inv) {
	const fromCli = parseKeepClubIds(CLUB_ID_ARG);
	if (fromCli.size) return fromCli;
	const backupPath = path.join(ARTIFACT_DIR, 'backup-clubs-teams.json');
	if (fs.existsSync(backupPath)) {
		try {
			const b = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
			if (Array.isArray(b.clubIds) && b.clubIds.length) return new Set(b.clubIds);
		} catch {
			/* ignore */
		}
	}
	if (inv?.clubPick?.clubId) return new Set([inv.clubPick.clubId]);
	return new Set();
}

function stamp() {
	return new Date().toISOString();
}

function log(msg) {
	console.log(`[${stamp()}] ${msg}`);
}

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

async function listAllAuthUsers(auth) {
	/** @type {import('firebase-admin/auth').UserRecord[]} */
	const users = [];
	let pageToken;
	do {
		const res = await auth.listUsers(1000, pageToken);
		users.push(...res.users);
		pageToken = res.pageToken;
	} while (pageToken);
	return users;
}

async function paginateCollection(db, name) {
	const col = db.collection(name);
	/** @type {import('firebase-admin/firestore').QueryDocumentSnapshot[]} */
	const docs = [];
	let last;
	const pageSize = 500;
	while (true) {
		let q = col.orderBy('__name__').limit(pageSize);
		if (last) q = q.startAfter(last);
		const snap = await q.get();
		if (snap.empty) break;
		docs.push(...snap.docs);
		last = snap.docs[snap.docs.length - 1];
		if (snap.size < pageSize) break;
	}
	return docs;
}

async function countOrList(db, name) {
	try {
		const docs = await paginateCollection(db, name);
		return { count: docs.length, docs, error: null };
	} catch (e) {
		return { count: -1, docs: [], error: String(e.message || e) };
	}
}

async function deleteRefs(db, refs, label, dryRun) {
	if (!refs.length) return 0;
	if (dryRun) {
		log(`[dry-run] ${label}: would delete ${refs.length}`);
		return refs.length;
	}
	for (let i = 0; i < refs.length; i += BATCH_SIZE) {
		const slice = refs.slice(i, i + BATCH_SIZE);
		const batch = db.batch();
		for (const r of slice) batch.delete(r);
		await batch.commit();
	}
	log(`[execute] ${label}: deleted ${refs.length}`);
	return refs.length;
}

async function deleteCollectionRoot(db, name, dryRun) {
	if (PROTECTED_COLLECTIONS.has(name)) {
		log(`[skip] ${name} — protected (compliance)`);
		return 0;
	}
	if (OWNER_ASK_COLLECTIONS.has(name) && !INCLUDE_AUDIT) {
		log(`[skip] ${name} — owner approval required (--include-audit-collections)`);
		return 0;
	}
	const { docs } = await countOrList(db, name);
	return deleteRefs(
		db,
		docs.map((d) => d.ref),
		name,
		dryRun,
	);
}

async function deleteSubcollections(db, docRef, dryRun, label) {
	const cols = await docRef.listCollections();
	let n = 0;
	for (const col of cols) {
		const snap = await col.get();
		if (snap.empty) continue;
		n += await deleteRefs(
			db,
			snap.docs.map((d) => d.ref),
			`${label}/${col.id}`,
			dryRun,
		);
	}
	return n;
}

/**
 * @param {import('firebase-admin').firestore.Firestore} db
 */
async function deleteTeamsDeep(db, dryRun) {
	const teams = await paginateCollection(db, 'teams');
	for (const t of teams) {
		if (!dryRun) await deleteSubcollections(db, t.ref, false, `teams/${t.id}`);
		else {
			const cols = await t.ref.listCollections();
			for (const c of cols) {
				const n = (await c.get()).size;
				if (n) log(`[dry-run] teams/${t.id}/${c.id}: ${n} docs`);
			}
		}
	}
	return deleteRefs(
		db,
		teams.map((t) => t.ref),
		'teams',
		dryRun,
	);
}

function userEmailFromDoc(doc) {
	const d = doc.data() || {};
	if (typeof d.email === 'string' && d.email.trim()) return normEmail(d.email);
	if (typeof d.emailLower === 'string' && d.emailLower.trim()) return normEmail(d.emailLower);
	if (doc.id.includes('@')) return normEmail(doc.id);
	return '';
}

function pickCanonicalClubId(userDocs, keepEmails) {
	/** @type {Record<string, string>} */
	const byEmail = {};
	for (const d of userDocs) {
		const em = userEmailFromDoc(d);
		if (!em || !keepEmails.has(em)) continue;
		const clubId = typeof d.data()?.clubId === 'string' ? d.data().clubId.trim() : '';
		if (clubId) byEmail[em] = clubId;
	}
	const parent = byEmail[PARENT_EMAIL];
	const coach = byEmail['ecwaechtler+coach@gmail.com'];
	const aaron = byEmail['aaron.hanks0287@gmail.com'];
	if (parent) return { clubId: parent, source: 'ecwaechtler+parent@gmail.com users.clubId' };
	if (coach) return { clubId: coach, source: 'ecwaechtler+coach@gmail.com users.clubId' };
	if (aaron) return { clubId: aaron, source: 'aaron.hanks0287@gmail.com users.clubId' };
	return { clubId: '', source: 'owner must choose clubId (--club-id)' };
}

async function buildInventory(auth, db) {
	fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
	const authUsers = await listAllAuthUsers(auth);
	const authRows = authUsers.map((u) => ({
		uid: u.uid,
		email: normEmail(u.email || ''),
		providers: (u.providerData || []).map((p) => p.providerId),
		disabled: u.disabled,
	}));
	const keepAuth = authRows.filter((r) => KEEP_EMAILS.has(r.email));
	const deleteAuth = authRows.filter((r) => r.email && !KEEP_EMAILS.has(r.email));
	const noEmailAuth = authRows.filter((r) => !r.email);

	const usersSnap = await db.collection('users').get();
	const userDocs = usersSnap.docs;
	const keepUidSet = new Set(
		authRows.filter((r) => KEEP_EMAILS.has(r.email)).map((r) => r.uid),
	);
	const isKeepUserDoc = (d) => {
		const em = userEmailFromDoc(d);
		if (em && KEEP_EMAILS.has(em)) return true;
		const uid = typeof d.data()?.uid === 'string' ? d.data().uid : d.id;
		return keepUidSet.has(uid);
	};
	const keepUserDocs = userDocs.filter(isKeepUserDoc);
	const deleteUserDocs = userDocs.filter((d) => !isKeepUserDoc(d));

	const emailToUid = new Map();
	for (const r of authRows) {
		if (r.email) emailToUid.set(r.email, r.uid);
	}

	const clubPick = CLUB_ID_ARG
		? { clubId: CLUB_ID_ARG, source: '--club-id CLI' }
		: pickCanonicalClubId(userDocs, KEEP_EMAILS);

	const counts = {};
	const samples = {};
	for (const name of [
		...LOOKUP_COLLECTIONS,
		'households',
		'clubs',
		'organizations',
		'teams',
		'invites',
		'coach_invites',
		'magic_uplinks',
		'operative_dispatches',
		'public_player_profiles',
		'device_tokens',
		...FULL_WIPE_ROOT,
	]) {
		const { count, docs, error } = await countOrList(db, name);
		counts[name] = error ? `error: ${error}` : count;
		if (docs.length) samples[name] = docs.slice(0, 5).map((d) => d.id);
	}

	const lookupTies = {};
	for (const col of LOOKUP_COLLECTIONS) {
		const { docs } = await countOrList(db, col);
		lookupTies[col] = {
			keep: docs.filter((d) => KEEP_EMAILS.has(normEmail(d.id))).map((d) => d.id),
			remove: docs.filter((d) => !KEEP_EMAILS.has(normEmail(d.id))).map((d) => d.id).slice(0, 20),
			removeCount: docs.filter((d) => !KEEP_EMAILS.has(normEmail(d.id))).length,
		};
	}

	const keptSnapshots = {};
	for (const d of keepUserDocs) {
		const em = userEmailFromDoc(d);
		const data = d.data() || {};
		keptSnapshots[em] = {
			docId: d.id,
			role: data.role ?? null,
			clubId: data.clubId ?? null,
			teamId: data.teamId ?? null,
			playerName: data.playerName ?? data.name ?? null,
			uid: data.uid ?? emailToUid.get(em) ?? null,
		};
	}

	const backup = {
		generatedAt: stamp(),
		projectId: PROJECT_ID,
		authUsers: authRows.map(({ uid, email }) => ({ uid, email })),
		usersDocIds: userDocs.map((d) => d.id),
		clubIds: (await paginateCollection(db, 'clubs')).map((d) => d.id),
		teamIds: (await paginateCollection(db, 'teams')).map((d) => d.id),
		orgIds: (await paginateCollection(db, 'organizations')).map((d) => d.id),
	};
	fs.writeFileSync(path.join(ARTIFACT_DIR, 'backup-auth-users.json'), JSON.stringify(backup.authUsers, null, 2));
	fs.writeFileSync(path.join(ARTIFACT_DIR, 'backup-users-doc-ids.json'), JSON.stringify(backup.usersDocIds, null, 2));
	fs.writeFileSync(
		path.join(ARTIFACT_DIR, 'backup-clubs-teams.json'),
		JSON.stringify(
			{ clubIds: backup.clubIds, teamIds: backup.teamIds, orgIds: backup.orgIds },
			null,
			2,
		),
	);
	fs.writeFileSync(path.join(ARTIFACT_DIR, 'kept-user-snapshot.json'), JSON.stringify(keptSnapshots, null, 2));

	const md = `# Firestore reset inventory — ${PROJECT_ID}

Generated: ${stamp()}
Artifact dir: \`artifacts/firestore-reset-${ARTIFACT_DATE}/\`

## Auth (\`admin.auth().listUsers\`)

| Metric | Count |
|--------|------:|
| Total Auth users | ${authRows.length} |
| Keep (whitelist) | ${keepAuth.length} |
| Delete (has email, not whitelist) | ${deleteAuth.length} |
| No email on record | ${noEmailAuth.length} |

### Keep list (normalized)
${[...KEEP_EMAILS].map((e) => `- \`${e}\``).join('\n')}

### Auth — keep
${keepAuth.map((r) => `- \`${r.email}\` uid=\`${r.uid}\` providers=${r.providers.join(',') || 'none'}`).join('\n') || '_none_'}

### Auth — delete (sample, max 15)
${deleteAuth
	.slice(0, 15)
	.map((r) => `- \`${r.email}\` uid=\`${r.uid}\``)
	.join('\n') || '_none_'}
${deleteAuth.length > 15 ? `\n_…and ${deleteAuth.length - 15} more._` : ''}

### Auth — no email (review before execute)
${noEmailAuth.map((r) => `- uid=\`${r.uid}\``).join('\n') || '_none_'}

## users collection (doc id = email key or legacy uid)

| Metric | Count |
|--------|------:|
| Total docs | ${userDocs.length} |
| Keep | ${keepUserDocs.length} |
| Delete | ${deleteUserDocs.length} |

### users — keep doc ids
${keepUserDocs.map((d) => `- \`${d.id}\` (${userEmailFromDoc(d)})`).join('\n') || '_none_'}

### users — delete sample (max 15)
${deleteUserDocs
	.slice(0, 15)
	.map((d) => `- \`${d.id}\``)
	.join('\n') || '_none_'}

## Canonical QA clubId

**${clubPick.clubId || '_(unset — owner must choose)_'}** — source: ${clubPick.source}

CLI override: \`--club-id <id>\`

${
	keptSnapshots['aaron.hanks0287@gmail.com']?.clubId &&
	clubPick.clubId &&
	keptSnapshots['aaron.hanks0287@gmail.com'].clubId !== clubPick.clubId
		? `### ⚠ clubId conflict\n\nParent/coach QA canonical **${clubPick.clubId}** but Aaron \`users\` has **${keptSnapshots['aaron.hanks0287@gmail.com'].clubId}**. Execute with default \`--club-id ${clubPick.clubId}\` deletes Aaron's club. Owner must choose: keep \`${keptSnapshots['aaron.hanks0287@gmail.com'].clubId}\`, re-home Aaron to \`${clubPick.clubId}\` on provision, or keep two clubs (not supported by script — single \`--club-id\` only).\n`
		: ''
}

## Firestore collection counts

| Collection | Count | Sample ids |
|------------|------:|------------|
${Object.entries(counts)
	.map(([k, v]) => {
		const samp = samples[k] ? samples[k].map((id) => `\`${id}\``).join(', ') : '';
		return `| ${k} | ${v} | ${samp || '—'} |`;
	})
	.join('\n')}

## Lookup ties (non-whitelist keys)

${Object.entries(lookupTies)
	.map(
		([col, t]) =>
			`### ${col}\n- keep: ${t.keep.length ? t.keep.map((id) => `\`${id}\``).join(', ') : '_none_'}\n- remove count: ${t.removeCount}\n- remove sample: ${t.remove.slice(0, 10).map((id) => `\`${id}\``).join(', ') || '_none_'}`,
	)
	.join('\n\n')}

## Protected (never deleted by script)

${[...PROTECTED_COLLECTIONS].map((c) => `- \`${c}\``).join('\n')}

## Owner approval required before delete

${[...OWNER_ASK_COLLECTIONS].map((c) => `- \`${c}\` (pass \`--include-audit-collections\` after explicit approval)`).join('\n')}

## Explicitly NOT in keep list

- \`ecwaechtler+director@gmail.com\` — will be removed on execute

## Next steps

1. \`firebase use ${PROJECT_ID}\` and refresh credentials if inventory failed earlier.
2. Dry-run: \`node scripts/dev-tenant-reset.mjs\`
3. Owner replies **approved execute** in chat.
4. Execute: \`node scripts/dev-tenant-reset.mjs --execute --club-id <clubId>\`
5. Re-inventory: \`node scripts/dev-tenant-reset.mjs --re-inventory\`
6. Provision: \`node scripts/dev-tenant-reset.mjs --provision --club-id <clubId> --team-id <teamId>\`
`;

	fs.writeFileSync(path.join(ARTIFACT_DIR, 'INVENTORY.md'), md);
	log(`Wrote ${path.join(ARTIFACT_DIR, 'INVENTORY.md')}`);

	return {
		authRows,
		deleteAuth,
		noEmailAuth,
		keepAuth,
		userDocs,
		deleteUserDocs,
		keepUserDocs,
		emailToUid,
		clubPick,
		counts,
	};
}

async function runResetPlan(auth, db, inv, dryRun) {
	const { deleteAuth, noEmailAuth, deleteUserDocs, emailToUid } = inv;
	const keepClubIds = resolveKeepClubIds(inv);

	let total = 0;

	// 2A AUTH
	for (const r of deleteAuth) {
		if (!dryRun) await auth.deleteUser(r.uid);
		total++;
	}
	log(`${dryRun ? '[dry-run]' : '[execute]'} Auth delete: ${deleteAuth.length}`);
	if (noEmailAuth.length) {
		log(`[warn] ${noEmailAuth.length} Auth user(s) without email — not auto-deleted; review in Console`);
	}

	// 2B users docs
	for (const d of deleteUserDocs) {
		if (!dryRun) await deleteSubcollections(db, d.ref, false, `users/${d.id}`);
	}
	total += await deleteRefs(
		db,
		deleteUserDocs.map((d) => d.ref),
		'users (non-keep)',
		dryRun,
	);

	// 2C lookups + invites
	for (const col of LOOKUP_COLLECTIONS) {
		const { docs } = await countOrList(db, col);
		const remove = docs.filter((d) => !KEEP_EMAILS.has(normEmail(d.id)));
		total += await deleteRefs(
			db,
			remove.map((d) => d.ref),
			col,
			dryRun,
		);
	}
	total += await deleteCollectionRoot(db, 'coach_invites', dryRun);
	total += await deleteCollectionRoot(db, 'magic_uplinks', dryRun);

	const invSnap = await paginateCollection(db, 'invites');
	const invRemove = invSnap.filter((d) => {
		const data = d.data() || {};
		const em =
			normEmail(data.email) ||
			normEmail(data.inviteeEmail) ||
			normEmail(data.to) ||
			normEmail(d.id);
		return !KEEP_EMAILS.has(em);
	});
	total += await deleteRefs(
		db,
		invRemove.map((d) => d.ref),
		'invites (non-keep)',
		dryRun,
	);

	// 2D teams + related + clubs/orgs
	total += await deleteTeamsDeep(db, dryRun);
	for (const c of FULL_WIPE_ROOT) {
		if (c === 'teams') continue;
		total += await deleteCollectionRoot(db, c, dryRun);
	}

	const clubs = await paginateCollection(db, 'clubs');
	const orgs = await paginateCollection(db, 'organizations');
	const clubRemove = keepClubIds.size
		? clubs.filter((d) => !keepClubIds.has(d.id))
		: clubs;
	const orgRemove = keepClubIds.size ? orgs.filter((d) => !keepClubIds.has(d.id)) : orgs;
	if (!keepClubIds.size) log('[warn] No --club-id; ALL clubs and organizations will be deleted');
	else log(`Keeping clubs/orgs: ${[...keepClubIds].join(', ')}`);
	for (const d of clubRemove) {
		if (!dryRun) await deleteSubcollections(db, d.ref, false, `clubs/${d.id}`);
	}
	total += await deleteRefs(db, clubRemove.map((d) => d.ref), 'clubs', dryRun);
	for (const d of orgRemove) {
		if (!dryRun) await deleteSubcollections(db, d.ref, false, `organizations/${d.id}`);
	}
	total += await deleteRefs(db, orgRemove.map((d) => d.ref), 'organizations', dryRun);

	for (const name of ['fields', 'facilities', 'deployment_calendar_entries']) {
		const { docs } = await countOrList(db, name);
		const remove = keepClubIds.size
			? docs.filter((d) => {
					const data = d.data() || {};
					const cid =
						(typeof data.clubId === 'string' && data.clubId) ||
						(typeof data.tenantId === 'string' && data.tenantId) ||
						'';
					return cid && !keepClubIds.has(cid);
				})
			: docs;
		total += await deleteRefs(db, remove.map((d) => d.ref), name, dryRun);
	}

	// 2E households
	const hh = await paginateCollection(db, 'households');
	const hhKeep = hh.filter((d) => {
		const data = d.data() || {};
		const parents = Array.isArray(data.parentEmails) ? data.parentEmails.map(normEmail) : [];
		return parents.includes(PARENT_EMAIL);
	});
	const hhRemove = hh.filter((d) => !hhKeep.includes(d));
	total += await deleteRefs(db, hhRemove.map((d) => d.ref), 'households', dryRun);

	const disp = await paginateCollection(db, 'operative_dispatches');
	const keepChildEmails = new Set();
	for (const h of hhKeep) {
		const pe = h.data()?.playerEmails;
		if (Array.isArray(pe)) for (const e of pe) keepChildEmails.add(normEmail(e));
	}
	const dispRemove = disp.filter((d) => {
		const em = normEmail(d.data()?.childEmail);
		return em && !keepChildEmails.has(em);
	});
	total += await deleteRefs(db, dispRemove.map((d) => d.ref), 'operative_dispatches', dryRun);

	// 2F public profiles + device tokens
	const keepUids = new Set(
		[...KEEP_EMAILS]
			.map((em) => emailToUid.get(em))
			.filter(Boolean),
	);
	const ppp = await paginateCollection(db, 'public_player_profiles');
	total += await deleteRefs(
		db,
		ppp.filter((d) => !keepUids.has(d.id)).map((d) => d.ref),
		'public_player_profiles',
		dryRun,
	);
	const dt = await paginateCollection(db, 'device_tokens');
	total += await deleteRefs(
		db,
		dt.filter((d) => !keepUids.has(d.id)).map((d) => d.ref),
		'device_tokens',
		dryRun,
	);

	// 2G passkeys (all users including keep — re-enroll after reset)
	const usersAll = await db.collection('users').get();
	for (const d of usersAll.docs) {
		const uid =
			(typeof d.data()?.uid === 'string' && d.data().uid) ||
			emailToUid.get(userEmailFromDoc(d)) ||
			(d.id.length >= 20 && !d.id.includes('@') ? d.id : null);
		if (!uid) continue;
		const pkCol = db.collection('users').doc(uid).collection('passkeys');
		const pkSnap = await pkCol.get();
		total += await deleteRefs(db, pkSnap.docs.map((x) => x.ref), `users/${uid}/passkeys`, dryRun);
	}
	total += await deleteCollectionRoot(db, 'passkey_challenges', dryRun);

	return { total, keepClubIds };
}

async function provision(db, auth, keepClubIds, teamIdArg) {
	const snapPath = path.join(ARTIFACT_DIR, 'kept-user-snapshot.json');
	/** @type {Record<string, object>} */
	let snapshots = {};
	if (fs.existsSync(snapPath)) {
		snapshots = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
	}

	if (!keepClubIds.size) {
		log('[provision] ERROR: --club-id required (comma-separated for multiple clubs)');
		process.exit(1);
	}

	const parentClub =
		(typeof snapshots[PARENT_EMAIL]?.clubId === 'string' && snapshots[PARENT_EMAIL].clubId) ||
		'aggiesfc';
	const aaronSnap = snapshots['aaron.hanks0287@gmail.com'] || {};
	const aaronClub = (typeof aaronSnap.clubId === 'string' && aaronSnap.clubId) || 'ab001';
	const aaronTeam = (typeof aaronSnap.teamId === 'string' && aaronSnap.teamId) || 'ab001_AB001';
	const coachTeam = teamIdArg || 'aggiesfc_15bew';

	for (const cid of keepClubIds) {
		await db
			.collection('clubs')
			.doc(cid)
			.set(
				{ clubId: cid, updatedAt: new Date().toISOString() },
				{ merge: true },
			);
		await db
			.collection('organizations')
			.doc(cid)
			.set({ tenantId: cid, cellId: '(default)', updatedAt: new Date().toISOString() }, { merge: true });
		log(`[provision] clubs/${cid} organizations/${cid}`);
	}

	const teams = [
		{
			id: coachTeam,
			clubId: parentClub,
			name: 'QA Team (Aggies)',
			coachEmail: 'ecwaechtler+coach@gmail.com',
		},
		{
			id: aaronTeam,
			clubId: aaronClub,
			name: 'QA Team (AB001)',
			coachEmail: 'aaron.hanks0287@gmail.com',
		},
	];
	for (const t of teams) {
		if (!keepClubIds.has(t.clubId)) continue;
		await db
			.collection('teams')
			.doc(t.id)
			.set({ ...t, updatedAt: new Date().toISOString() }, { merge: true });
		log(`[provision] teams/${t.id} clubId=${t.clubId}`);
	}

	const profiles = [
		{
			email: 'ecwaechtler@gmail.com',
			role: 'super_admin',
			clubId: parentClub,
			teamId: coachTeam,
		},
		{
			email: PARENT_EMAIL,
			role: 'parent',
			clubId: parentClub,
			playerName:
				(typeof snapshots[PARENT_EMAIL]?.playerName === 'string' && snapshots[PARENT_EMAIL].playerName) ||
				'QA Player',
			teamId: '',
		},
		{
			email: 'ecwaechtler+coach@gmail.com',
			role: 'coach',
			clubId: parentClub,
			teamId: coachTeam,
		},
		{
			email: 'aaron.hanks0287@gmail.com',
			role: (typeof aaronSnap.role === 'string' && aaronSnap.role) || 'coach',
			clubId: aaronClub,
			teamId: aaronTeam,
			playerName: aaronSnap.playerName || null,
		},
	];

	for (const p of profiles) {
		let uid = '';
		try {
			const u = await auth.getUserByEmail(p.email);
			uid = u.uid;
		} catch {
			log(`[provision] Auth user missing for ${p.email} — create via Console magic link / Google first`);
		}
		await db
			.collection('users')
			.doc(p.email)
			.set(
				{
					email: p.email,
					emailLower: p.email,
					role: p.role,
					clubId: p.clubId || null,
					teamId: p.teamId || null,
					playerName: p.playerName || null,
					uid: uid || null,
					updatedAt: new Date().toISOString(),
				},
				{ merge: true },
			);
		log(`[provision] users/${p.email} role=${p.role} clubId=${p.clubId || '—'} teamId=${p.teamId || '—'}`);
	}

	await db
		.collection('coach_lookup')
		.doc('ecwaechtler+coach@gmail.com')
		.set({ role: 'coach', clubId: parentClub, teamId: coachTeam }, { merge: true });
	await db
		.collection('coach_lookup')
		.doc('aaron.hanks0287@gmail.com')
		.set({ role: 'coach', clubId: aaronClub, teamId: aaronTeam }, { merge: true });
	log('[provision] Passkeys cleared — re-enroll on sstracker.app after WEBAUTHN_RP deploy');
	log('[provision] Admin: ecwaechtler@gmail.com uses Google; ADMIN_EMAIL → super_admin via syncUserClaims');
}

function appendExecutionLog(line) {
	fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
	const p = path.join(ARTIFACT_DIR, 'EXECUTION_LOG.md');
	const header = fs.existsSync(p)
		? ''
		: `# Execution log — ${PROJECT_ID}\n\n`;
	fs.appendFileSync(p, header + `- ${stamp()} ${line}\n`);
}

async function main() {
	if (BLOCKED_PROJECTS.has(PROJECT_ID) && !hasFlag('--i-know-prod')) {
		console.error(`[dev-tenant-reset] Refusing project "${PROJECT_ID}". Use sports-skill-tracker-dev only.`);
		process.exit(1);
	}

	log(`project=${PROJECT_ID} mode=${EXECUTE ? 'EXECUTE' : INVENTORY_ONLY ? 'INVENTORY' : PROVISION ? 'PROVISION' : 'DRY-RUN'}`);
	log(`artifactDir=${ARTIFACT_DIR}`);
	log(`keepEmails=${[...KEEP_EMAILS].join(', ')}`);

	const admin = resolveAdmin();
	const db = admin.firestore();
	const auth = admin.auth();

	let inv;
	try {
		inv = await buildInventory(auth, db);
	} catch (e) {
		console.error('[dev-tenant-reset] Inventory failed:', e.message || e);
		console.error('  Refresh: firebase login --reauth  OR  set GOOGLE_APPLICATION_CREDENTIALS');
		process.exit(1);
	}

	if (INVENTORY_ONLY || REINVENTORY) {
		appendExecutionLog(INVENTORY_ONLY ? 'inventory complete' : 're-inventory complete');
		process.exit(0);
	}

	const deleteAuthN = inv.deleteAuth.length;
	const deleteUsersN = inv.deleteUserDocs.length;
	const teamsN = typeof inv.counts.teams === 'number' ? inv.counts.teams : 0;
	const keepClubIds = resolveKeepClubIds(inv);
	const clubLabel = keepClubIds.size
		? [...keepClubIds].join(', ')
		: CLUB_ID_ARG || inv.clubPick.clubId || '(owner must choose)';

	if (PROVISION) {
		if (!EXECUTE) {
			log('[provision] Running provision (writes) — use after execute + owner approval');
		}
		await provision(db, auth, keepClubIds, TEAM_ID_ARG);
		appendExecutionLog(`provision clubs=${clubLabel} teamId=${TEAM_ID_ARG || 'aggiesfc_15bew + ab001_AB001'}`);
		process.exit(0);
	}

	log('── Plan summary ──');
	log(`Would delete Auth users (emailed, non-keep): ${deleteAuthN}`);
	log(`Would delete users docs: ${deleteUsersN}`);
	log(`Would delete ALL teams: ${teamsN}`);
	log(`Keep clubIds: ${clubLabel}`);

	if (!EXECUTE) {
		console.log('\n*** DRY-RUN — no writes. Owner must reply: approved execute ***\n');
		console.log(
			`Dry-run will delete ${deleteAuthN} Auth users, ${deleteUsersN} users docs, ${teamsN} teams. Keep clubIds: ${clubLabel}. Reply approved execute.`,
		);
		appendExecutionLog(`dry-run auth=${deleteAuthN} users=${deleteUsersN} teams=${teamsN} clubId=${clubLabel}`);
		process.exit(0);
	}

	appendExecutionLog(
		`execute START auth=${deleteAuthN} users=${deleteUsersN} teams=${teamsN} clubs=${clubLabel}`,
	);
	await runResetPlan(auth, db, inv, false);
	appendExecutionLog('execute COMPLETE');
	log('Execute complete. Run: node scripts/dev-tenant-reset.mjs --re-inventory --artifact-date ' + ARTIFACT_DATE);
	log(
		`Then: node scripts/dev-tenant-reset.mjs --provision --club-id ${clubLabel} --artifact-date ${ARTIFACT_DATE}`,
	);
}

main().catch((e) => {
	console.error('[dev-tenant-reset] Fatal:', e);
	process.exit(1);
});
