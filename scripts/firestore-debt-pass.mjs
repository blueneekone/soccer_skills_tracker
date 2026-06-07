#!/usr/bin/env node
/**
 * scripts/firestore-debt-pass.mjs
 * Full Firestore + optional Storage debt pass — sports-skill-tracker-dev ONLY.
 *
 * Default: --dry-run. Execute only after: "approved execute firestore debt pass"
 *
 * Usage:
 *   node scripts/firestore-debt-pass.mjs --qa-club-id ab001,aggiesfc --artifact-date 20260603
 *   node scripts/firestore-debt-pass.mjs --execute --include-storage ...
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
	DEFAULT_PROJECT,
	BLOCKED_PROJECTS,
	assertSafeProject,
	artifactDir,
	log,
	parseArgs,
	normEmail,
	resolveAdmin,
	resolveKeepUids,
	resolveQaClubIds,
} from './storage-shared.mjs';
import {
	PROTECTED_ROOTS,
	KEEP_ROOTS,
	WIPE_ROOTS_ALWAYS,
	WIPE_ROOTS_OPS_HISTORY,
	WIPE_ROOTS_OPERATIONAL,
	WIPE_ROOTS_SEED,
	ALLOWED_SUBCOLLECTIONS,
	DEFAULT_KEEP_EMAILS,
	PARENT_EMAIL,
} from './firestore-debt-manifest.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const BATCH_SIZE = 450;

const argv = process.argv.slice(2);
const { hasFlag, flagVal } = parseArgs(argv);

const PROJECT_ID = flagVal('--project', DEFAULT_PROJECT);
const ARTIFACT_DATE =
	flagVal('--artifact-date', '') || new Date().toISOString().slice(0, 10).replace(/-/g, '');
const OUT_DIR = path.join(REPO_ROOT, 'artifacts', `firestore-debt-pass-${ARTIFACT_DATE}`);
const EXECUTE = hasFlag('--execute');
const DRY_RUN = !EXECUTE;
const QA_CLUB_ARG = flagVal('--qa-club-id', 'ab001,aggiesfc');
const KEEP_EMAILS = new Set(
	(flagVal('--keep-emails', DEFAULT_KEEP_EMAILS) || DEFAULT_KEEP_EMAILS)
		.split(',')
		.map(normEmail)
		.filter(Boolean),
);
const WIPE_OPS = !hasFlag('--keep-ops-history');
const WIPE_SEED = hasFlag('--wipe-seed-data');
const PRUNE_SUBS = !hasFlag('--no-prune-subcollections');
const INCLUDE_STORAGE = hasFlag('--include-storage');
const WIPE_STORAGE_TIER_B = hasFlag('--storage-include-tier-b');

/** @type {{ phase: string; label: string; count: number }[]} */
const plan = [];

function addPlan(phase, label, count) {
	if (count > 0) plan.push({ phase, label, count });
}

async function paginateCollection(db, colRef) {
	/** @type {import('firebase-admin/firestore').QueryDocumentSnapshot[]} */
	const docs = [];
	let last;
	while (true) {
		let q = colRef.orderBy('__name__').limit(500);
		if (last) q = q.startAfter(last);
		const snap = await q.get();
		if (snap.empty) break;
		docs.push(...snap.docs);
		last = snap.docs[snap.docs.length - 1];
		if (snap.size < 500) break;
	}
	return docs;
}

async function deleteRefs(db, refs, label, dryRun) {
	if (!refs.length) return 0;
	if (dryRun) {
		log(`[dry-run] ${label}: ${refs.length} doc(s)`);
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

async function wipeRootCollection(db, name, dryRun) {
	if (PROTECTED_ROOTS.has(name)) {
		log(`[skip] ${name} — protected`);
		return 0;
	}
	const docs = await paginateCollection(db, db.collection(name));
	return deleteRefs(db, docs.map((d) => d.ref), `root/${name}`, dryRun);
}

async function deleteAllSubcollectionsDeep(db, docRef, label, dryRun) {
	const cols = await docRef.listCollections();
	let n = 0;
	for (const col of cols) {
		const docs = await paginateCollection(db, col);
		if (docs.length) {
			n += await deleteRefs(db, docs.map((d) => d.ref), `${label}/${col.id}`, dryRun);
		}
	}
	return n;
}

async function pruneSubcollections(db, parentKind, docRef, docId, allowSet, dryRun) {
	const cols = await docRef.listCollections();
	let n = 0;
	for (const col of cols) {
		if (allowSet.has(col.id)) continue;
		const docs = await paginateCollection(db, col);
		if (!docs.length) continue;
		n += await deleteRefs(
			db,
			docs.map((d) => d.ref),
			`${parentKind}/${docId}/${col.id} (orphan)`,
			dryRun,
		);
	}
	return n;
}

function userEmailFromDoc(doc) {
	const d = doc.data() || {};
	if (typeof d.email === 'string' && d.email.trim()) return normEmail(d.email);
	if (typeof d.emailLower === 'string' && d.emailLower.trim()) return normEmail(d.emailLower);
	if (doc.id.includes('@')) return normEmail(doc.id);
	return '';
}

function buildWipeSet() {
	const s = new Set([
		...WIPE_ROOTS_ALWAYS,
		...WIPE_ROOTS_OPERATIONAL,
		...(WIPE_OPS ? WIPE_ROOTS_OPS_HISTORY : []),
		...(WIPE_SEED ? WIPE_ROOTS_SEED : []),
	]);
	for (const k of KEEP_ROOTS) s.delete(k);
	for (const p of PROTECTED_ROOTS) s.delete(p);
	return s;
}

async function runFirestorePass(db, auth, qaClubIds, keepUids) {
	const wipeExplicit = buildWipeSet();
	let total = 0;

	// ── Phase A: auto-wipe unknown roots ─────────────────────────────────────
	const roots = (await db.listCollections()).map((c) => c.id);
	for (const name of roots) {
		if (PROTECTED_ROOTS.has(name) || KEEP_ROOTS.has(name)) continue;
		if (wipeExplicit.has(name)) continue;
		const n = await wipeRootCollection(db, name, DRY_RUN);
		addPlan('A-unknown-root', name, n);
		total += n;
	}

	// ── Phase B: explicit wipe lists ─────────────────────────────────────────
	for (const name of wipeExplicit) {
		if (PROTECTED_ROOTS.has(name)) continue;
		const n = await wipeRootCollection(db, name, DRY_RUN);
		addPlan('B-explicit', name, n);
		total += n;
	}

	// ── Phase C: non-QA clubs / organizations ────────────────────────────────
	for (const kind of ['clubs', 'organizations']) {
		const docs = await paginateCollection(db, db.collection(kind));
		const remove = docs.filter((d) => !qaClubIds.has(d.id));
		for (const d of remove) {
			let subCount = 0;
			for (const c of await d.ref.listCollections()) {
				subCount += (await paginateCollection(db, c)).length;
			}
			addPlan('C-non-qa', `${kind}/${d.id}`, subCount + 1);
			if (!DRY_RUN) await deleteAllSubcollectionsDeep(db, d.ref, `${kind}/${d.id}`, false);
		}
		const n = await deleteRefs(db, remove.map((d) => d.ref), `${kind} non-QA`, DRY_RUN);
		total += n;
	}

	// ── Phase D: non-keep users ──────────────────────────────────────────────
	const usersSnap = await db.collection('users').get();
	const emailToUid = new Map();
	for (const d of usersSnap.docs) {
		const em = userEmailFromDoc(d);
		const uid = d.data()?.uid || d.id;
		if (em) emailToUid.set(em, uid);
	}
	const removeUsers = usersSnap.docs.filter((d) => {
		const em = userEmailFromDoc(d);
		if (em && KEEP_EMAILS.has(em)) return false;
		const uid = typeof d.data()?.uid === 'string' ? d.data().uid : d.id;
		return !keepUids.has(uid);
	});
	for (const d of removeUsers) {
		if (!DRY_RUN) await deleteAllSubcollectionsDeep(db, d.ref, `users/${d.id}`, false);
	}
	const nu = await deleteRefs(
		db,
		removeUsers.map((d) => d.ref),
		'users non-keep',
		DRY_RUN,
	);
	addPlan('D-users', 'non-keep', nu);
	total += nu;

	// ── Phase E: lookups ─────────────────────────────────────────────────────
	for (const col of ['coach_lookup', 'registrar_lookup', 'player_lookup']) {
		const docs = await paginateCollection(db, db.collection(col));
		const remove = docs.filter((d) => !KEEP_EMAILS.has(normEmail(d.id)));
		const n = await deleteRefs(db, remove.map((d) => d.ref), col, DRY_RUN);
		addPlan('E-lookup', col, n);
		total += n;
	}

	// ── Phase F: households + dispatches ─────────────────────────────────────
	const hh = await paginateCollection(db, db.collection('households'));
	const hhKeep = hh.filter((d) => {
		const parents = Array.isArray(d.data()?.parentEmails)
			? d.data().parentEmails.map(normEmail)
			: [];
		return parents.includes(PARENT_EMAIL);
	});
	const hhRemove = hh.filter((d) => !hhKeep.includes(d));
	total += await deleteRefs(db, hhRemove.map((d) => d.ref), 'households', DRY_RUN);

	const keepChildEmails = new Set();
	for (const h of hhKeep) {
		const pe = h.data()?.playerEmails;
		if (Array.isArray(pe)) for (const e of pe) keepChildEmails.add(normEmail(e));
	}
	const disp = await paginateCollection(db, db.collection('operative_dispatches'));
	const dispRemove = disp.filter((d) => {
		const em = normEmail(d.data()?.childEmail);
		return em && !keepChildEmails.has(em);
	});
	total += await deleteRefs(db, dispRemove.map((d) => d.ref), 'operative_dispatches', DRY_RUN);

	// ── Phase G: root facilities/fields by club ──────────────────────────────
	for (const name of ['fields', 'facilities', 'deployment_calendar_entries']) {
		const docs = await paginateCollection(db, db.collection(name));
		const remove = docs.filter((d) => {
			const data = d.data() || {};
			const cid = data.clubId || data.tenantId || '';
			return cid && !qaClubIds.has(String(cid));
		});
		total += await deleteRefs(db, remove.map((d) => d.ref), name, DRY_RUN);
	}

	// ── Phase H: prune orphan subcollections on kept parents ─────────────────
	if (PRUNE_SUBS) {
		for (const d of usersSnap.docs.filter((doc) => !removeUsers.includes(doc))) {
			const allow = ALLOWED_SUBCOLLECTIONS.users;
			const n = await pruneSubcollections(db, 'users', d.ref, d.id, allow, DRY_RUN);
			addPlan('H-prune', `users/${d.id}`, n);
			total += n;
		}
		for (const kind of ['clubs', 'teams', 'organizations']) {
			const allow = ALLOWED_SUBCOLLECTIONS[kind];
			const all = await paginateCollection(db, db.collection(kind));
			const docs = all.filter((d) =>
				kind === 'teams'
					? qaClubIds.has(String(d.data()?.clubId || ''))
					: qaClubIds.has(d.id),
			);
			for (const d of docs) {
				const n = await pruneSubcollections(db, kind, d.ref, d.id, allow, DRY_RUN);
				addPlan('H-prune', `${kind}/${d.id}`, n);
				total += n;
			}
		}
		const hhKeepDocs = hh.filter((d) => !hhRemove.includes(d));
		for (const d of hhKeepDocs) {
			const n = await pruneSubcollections(
				db,
				'households',
				d.ref,
				d.id,
				ALLOWED_SUBCOLLECTIONS.households,
				DRY_RUN,
			);
			total += n;
		}
	}

	return { total, roots, wipeExplicit };
}

async function main() {
	assertSafeProject(PROJECT_ID);
	if (BLOCKED_PROJECTS.has(PROJECT_ID)) throw new Error(`Refusing ${PROJECT_ID}`);

	fs.mkdirSync(OUT_DIR, { recursive: true });
	const mode = DRY_RUN ? 'DRY-RUN' : 'EXECUTE';
	log(`Firestore debt pass — ${mode}`);
	log(`Project: ${PROJECT_ID}`);

	if (EXECUTE) log('Owner phrase expected: approved execute firestore debt pass');

	const admin = resolveAdmin(PROJECT_ID);
	const db = admin.firestore();
	const auth = admin.auth();
	const qaClubIds = resolveQaClubIds(QA_CLUB_ARG, ARTIFACT_DATE);
	const keepUids = await resolveKeepUids(auth, KEEP_EMAILS, '', ARTIFACT_DATE);

	log(`QA clubs: ${[...qaClubIds].join(', ')}`);
	log(`Keep UIDs: ${[...keepUids].join(', ')}`);

	const { total, roots } = await runFirestorePass(db, auth, qaClubIds, keepUids);

	if (INCLUDE_STORAGE) {
		log('── Storage pass ──');
		await new Promise((resolve, reject) => {
			const args = [
				'scripts/storage-cleanup.mjs',
				'--artifact-date',
				ARTIFACT_DATE,
				`--qa-club-id=${QA_CLUB_ARG}`,
				'--wipe-staging',
				'--wipe-quarantine',
				'--delete-non-qa-clubs',
			];
			if (EXECUTE) args.push('--execute');
			if (WIPE_STORAGE_TIER_B) args.push('--include-tier-b');
			const child = spawn('node', args, { cwd: REPO_ROOT, stdio: 'inherit', shell: true });
			child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`storage ${code}`))));
		});
	}

	const md = [
		`# Firestore debt pass — ${mode}`,
		'',
		`Generated: ${new Date().toISOString()}`,
		`Project: \`${PROJECT_ID}\``,
		`QA clubIds: ${[...qaClubIds].join(', ')}`,
		`Keep emails: ${[...KEEP_EMAILS].join(', ')}`,
		'',
		'## Flags',
		'',
		`| Flag | Value |`,
		`|------|-------|`,
		`| --execute | ${EXECUTE} |`,
		`| --wipe-ops-history (default on) | ${WIPE_OPS} |`,
		`| --wipe-seed-data | ${WIPE_SEED} |`,
		`| --prune-subcollections | ${PRUNE_SUBS} |`,
		`| --include-storage | ${INCLUDE_STORAGE} |`,
		'',
		'## Plan summary',
		'',
		`| Phase | Label | Docs |`,
		`|-------|-------|-----:|`,
		...plan.map((p) => `| ${p.phase} | ${p.label} | ${p.count} |`),
		'',
		`| **Total Firestore doc deletes (approx)** | | **${total}** |`,
		'',
		`Materialized roots before pass: ${roots.length}`,
		'',
		'## Protected (never touched)',
		'',
		[...PROTECTED_ROOTS].map((c) => `- \`${c}\``).join('\n'),
		'',
		'## Kept roots (schema preserved)',
		'',
		[...KEEP_ROOTS].sort().map((c) => `- \`${c}\``).join('\n'),
		'',
	];

	if (DRY_RUN) {
		md.push(
			'## Owner approval',
			'',
			'Reply: **`approved execute firestore debt pass`**',
			'',
			'```bash',
			`node scripts/firestore-debt-pass.mjs --execute --qa-club-id ${QA_CLUB_ARG} --artifact-date ${ARTIFACT_DATE} --include-storage`,
			'```',
			'',
		);
	}

	fs.writeFileSync(path.join(OUT_DIR, 'DEBT_PASS_REPORT.md'), md.join('\n'), 'utf8');
	fs.writeFileSync(path.join(OUT_DIR, 'debt-pass-plan.json'), JSON.stringify({ mode, plan, total }, null, 2));

	log(`Wrote ${path.join(OUT_DIR, 'DEBT_PASS_REPORT.md')}`);
	log(`Approx ${total} Firestore document deletions ${DRY_RUN ? '(dry-run)' : '(executed)'}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
