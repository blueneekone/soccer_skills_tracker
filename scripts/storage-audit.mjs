#!/usr/bin/env node
/**
 * scripts/storage-audit.mjs — Firebase Storage inventory (sports-skill-tracker-dev only).
 *
 * Usage:
 *   node scripts/storage-audit.mjs
 *   node scripts/storage-audit.mjs --qa-club-id ab001,aggiesfc --cross-ref
 *   node scripts/storage-audit.mjs --artifact-date 20260603
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	DEFAULT_PROJECT,
	DEFAULT_BUCKET,
	BLOCKED_BUCKETS,
	assertSafeProject,
	artifactDir,
	bytesToMb,
	collectFirestoreRequiredPaths,
	resolveAdmin,
	resolveKeepUids,
	resolveQaClubIds,
	listAllObjects,
	listTopLevelPrefixes,
	aggregateByPrefix,
	canonicalRulesNote,
	classifyObject,
	log,
	parseArgs,
	parseCsvSet,
	DEFAULT_KEEP_EMAILS,
	normEmail,
	CANONICAL_PREFIXES,
} from './storage-shared.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const { hasFlag, flagVal } = parseArgs(argv);

const PROJECT_ID = flagVal('--project', DEFAULT_PROJECT);
const BUCKET_NAME = flagVal('--bucket', DEFAULT_BUCKET);
const QA_CLUB_ARG = flagVal('--qa-club-id', '');
const KEEP_UIDS_ARG = flagVal('--keep-uids', '');
const KEEP_EMAILS = new Set(
	(flagVal('--keep-emails', DEFAULT_KEEP_EMAILS) || DEFAULT_KEEP_EMAILS)
		.split(',')
		.map(normEmail)
		.filter(Boolean),
);
const ARTIFACT_DATE =
	flagVal('--artifact-date', '') || new Date().toISOString().slice(0, 10).replace(/-/g, '');
const OUT_DIR = artifactDir(ARTIFACT_DATE);
const CROSS_REF = !hasFlag('--no-cross-ref');
const EXPORT_JSON = !hasFlag('--no-export-json');
const WIPE_STAGING = hasFlag('--wipe-staging');
const WIPE_QUARANTINE = hasFlag('--wipe-quarantine');
const DELETE_NON_QA = hasFlag('--delete-non-qa-clubs') || !hasFlag('--no-delete-non-qa-clubs');
const KEEP_RL = !hasFlag('--no-keep-rl-models');

async function main() {
	assertSafeProject(PROJECT_ID, BUCKET_NAME);
	if (BLOCKED_BUCKETS.has(BUCKET_NAME)) {
		throw new Error(`Refusing bucket ${BUCKET_NAME}`);
	}

	fs.mkdirSync(OUT_DIR, { recursive: true });
	log(`Project: ${PROJECT_ID}`);
	log(`Bucket: ${BUCKET_NAME}`);
	log(`Artifact dir: ${OUT_DIR}`);

	const admin = resolveAdmin(PROJECT_ID);
	const bucket = admin.storage().bucket(BUCKET_NAME);
	const db = admin.firestore();
	const auth = admin.auth();

	const qaClubIds = resolveQaClubIds(QA_CLUB_ARG, ARTIFACT_DATE);
	const keepUids = await resolveKeepUids(auth, KEEP_EMAILS, KEEP_UIDS_ARG, ARTIFACT_DATE);

	log(`QA clubIds: ${[...qaClubIds].join(', ') || '(none — pass --qa-club-id)'}`);
	log(`Keep UIDs: ${[...keepUids].join(', ') || '(none)'}`);

	log('Listing all objects (paginated)…');
	const allFiles = await listAllObjects(bucket);
	log(`Total objects: ${allFiles.length}`);

	const topPrefixes = await listTopLevelPrefixes(bucket);
	const knownRoots = new Set(['clubs', 'tenants', 'compliance', 'rl_models']);
	const legacyRoots = topPrefixes.filter((p) => !knownRoots.has(p));

	let required = new Set();
	let firestoreNotes = [];
	if (CROSS_REF && qaClubIds.size) {
		log('Cross-referencing Firestore (read-only)…');
		const xref = await collectFirestoreRequiredPaths(db, { qaClubIds, keepUids });
		required = xref.required;
		firestoreNotes = xref.notes;
		log(`Firestore required paths: ${required.size}`);
	}

	const ctx = {
		qaClubIds,
		keepUids,
		required,
		keepRlModels: KEEP_RL,
		wipeStaging: WIPE_STAGING,
		wipeQuarantine: WIPE_QUARANTINE,
		deleteNonQaClubs: DELETE_NON_QA,
	};

	/** @type {Map<string, { count: number; bytes: number; keep: number; review: number; delete: number }>} */
	const prefixStats = new Map();
	let totalBytes = 0;
	const verdictCounts = { KEEP: 0, REVIEW: 0, DELETE_CANDIDATE: 0 };
	/** @type {{ path: string; size: number; verdict: string; tier: string | null; reason: string }[]} */
	const objectRows = [];

	for (const f of allFiles) {
		const size = Number(f.metadata?.size || 0);
		totalBytes += size;
		const c = classifyObject(f.name, ctx);
		verdictCounts[c.verdict] = (verdictCounts[c.verdict] || 0) + 1;
		objectRows.push({
			path: f.name,
			size,
			verdict: c.verdict,
			tier: c.tier,
			reason: c.reason,
		});

		const root = f.name.split('/')[0] + '/';
		const stat = prefixStats.get(root) || {
			count: 0,
			bytes: 0,
			keep: 0,
			review: 0,
			delete: 0,
		};
		stat.count += 1;
		stat.bytes += size;
		if (c.verdict === 'KEEP') stat.keep += 1;
		else if (c.verdict === 'REVIEW') stat.review += 1;
		else stat.delete += 1;
		prefixStats.set(root, stat);
	}

	const scanPrefixes = [
		...CANONICAL_PREFIXES.map((r) => r.prefix),
		...legacyRoots.map((r) => `${r}/`),
	];
	const tableRows = [];

	for (const prefix of scanPrefixes) {
		const under = allFiles.filter((f) => f.name.startsWith(prefix));
		const count = under.length;
		const bytes = under.reduce((s, f) => s + Number(f.metadata?.size || 0), 0);
		const meta = canonicalRulesNote(prefix);
		let verdict = 'REVIEW';
		if (prefix.startsWith('rl_models/')) verdict = KEEP_RL ? 'KEEP' : 'REVIEW';
		else if (legacyRoots.some((r) => prefix.startsWith(`${r}/`))) verdict = 'DELETE';
		else if (count === 0) verdict = 'KEEP';
		else {
			const st = prefixStats.get(prefix.replace(/\/$/, '') + '/') || prefixStats.get(prefix.split('/')[0] + '/');
			if (st?.delete === count) verdict = 'DELETE';
			else if (st?.keep === count) verdict = 'KEEP';
		}
		tableRows.push({
			prefix,
			count,
			mb: bytesToMb(bytes),
			inRules: meta.inRules ? 'yes' : 'no',
			referencedIn: meta.referencedIn,
			verdict,
		});
	}

	for (const root of legacyRoots) {
		if (!tableRows.some((r) => r.prefix === `${root}/`)) {
			const under = allFiles.filter((f) => f.name.startsWith(`${root}/`));
			const bytes = under.reduce((s, f) => s + Number(f.metadata?.size || 0), 0);
			tableRows.push({
				prefix: `${root}/`,
				count: under.length,
				mb: bytesToMb(bytes),
				inRules: 'no',
				referencedIn: '— (legacy/orphan)',
				verdict: 'DELETE',
			});
		}
	}

	const subAgg = aggregateByPrefix(allFiles, 2);
	const subLines = [...subAgg.entries()]
		.sort((a, b) => b[1].bytes - a[1].bytes)
		.slice(0, 40)
		.map(([k, v]) => `- \`${k}\` — ${v.count} objects, ${bytesToMb(v.bytes)} MB`);

	const deleteCandidates = objectRows.filter((r) => r.verdict === 'DELETE_CANDIDATE');
	const reviewCandidates = objectRows.filter((r) => r.verdict === 'REVIEW');

	const md = [
		`# Firebase Storage inventory — ${PROJECT_ID}`,
		'',
		`Generated: ${new Date().toISOString()}`,
		`Bucket: \`${BUCKET_NAME}\``,
		`QA clubIds: ${[...qaClubIds].join(', ') || '_not set_'}`,
		`Keep UIDs (${keepUids.size}): ${[...keepUids].join(', ') || '_not set_'}`,
		`Cross-ref Firestore: ${CROSS_REF ? 'yes' : 'no'}`,
		`Firestore required paths: ${required.size}`,
		'',
		'## Summary',
		'',
		`| Metric | Value |`,
		`|--------|------:|`,
		`| Total objects | ${allFiles.length} |`,
		`| Total size | ${bytesToMb(totalBytes)} MB |`,
		`| KEEP | ${verdictCounts.KEEP || 0} |`,
		`| REVIEW | ${verdictCounts.REVIEW || 0} |`,
		`| DELETE_CANDIDATE | ${verdictCounts.DELETE_CANDIDATE || 0} |`,
		'',
		'## Prefix table',
		'',
		'| Prefix | Object count | Total size MB | In storage.rules? | Referenced in src/ or functions/? | Verdict |',
		'|--------|-------------:|--------------:|:------------------:|-----------------------------------|---------|',
		...tableRows.map(
			(r) =>
				`| \`${r.prefix}\` | ${r.count} | ${r.mb} | ${r.inRules} | ${r.referencedIn} | ${r.verdict} |`,
		),
		'',
		'## Top sub-prefixes (depth 2)',
		'',
		...subLines,
		'',
		'## Firestore cross-ref notes',
		'',
		...(firestoreNotes.length ? firestoreNotes.map((n) => `- ${n}`) : ['_none_']),
		'',
		'## Tier A — DELETE_CANDIDATE paths',
		'',
		...(deleteCandidates.length
			? deleteCandidates.map(
					(r) => `- \`${r.path}\` (${bytesToMb(r.size)} MB) — ${r.reason}`,
				)
			: ['_none_']),
		'',
		'## Tier B — REVIEW paths',
		'',
		...(reviewCandidates.length
			? reviewCandidates.map(
					(r) => `- \`${r.path}\` (${bytesToMb(r.size)} MB) — ${r.reason}`,
				)
			: ['_none_']),
		'',
		'## Dry-run delete preview (classification flags)',
		'',
		`- \`--delete-non-qa-clubs\`: ${DELETE_NON_QA}`,
		`- \`--wipe-staging\`: ${WIPE_STAGING}`,
		`- \`--wipe-quarantine\`: ${WIPE_QUARANTINE}`,
		`- \`--keep-rl-models\`: ${KEEP_RL}`,
		'',
		'Run `node scripts/storage-cleanup.mjs` (default dry-run) for execute plan.',
		'',
	].join('\n');

	fs.writeFileSync(path.join(OUT_DIR, 'STORAGE_INVENTORY.md'), md, 'utf8');

	if (EXPORT_JSON) {
		const inventory = {
			generatedAt: new Date().toISOString(),
			projectId: PROJECT_ID,
			bucket: BUCKET_NAME,
			qaClubIds: [...qaClubIds],
			keepUids: [...keepUids],
			totalObjects: allFiles.length,
			totalBytes,
			verdictCounts,
			prefixTable: tableRows,
			firestoreRequired: [...required],
			firestoreNotes,
			topLevelPrefixes: topPrefixes,
			legacyRoots,
		};
		fs.writeFileSync(
			path.join(OUT_DIR, 'prefix-inventory.json'),
			JSON.stringify(inventory, null, 2),
			'utf8',
		);
		fs.writeFileSync(
			path.join(OUT_DIR, 'object-classification.json'),
			JSON.stringify(objectRows, null, 2),
			'utf8',
		);
	}

	log(`Wrote ${path.join(OUT_DIR, 'STORAGE_INVENTORY.md')}`);
	const delBytes = objectRows
		.filter((r) => r.verdict === 'DELETE_CANDIDATE')
		.reduce((s, r) => s + r.size, 0);
	const delCount = objectRows.filter((r) => r.verdict === 'DELETE_CANDIDATE').length;
	log(
		`DELETE_CANDIDATE (current flags): ${delCount} objects (~${bytesToMb(delBytes)} MB)`,
	);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
