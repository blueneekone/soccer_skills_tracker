#!/usr/bin/env node
/**
 * scripts/storage-cleanup.mjs — Firebase Storage cleanup (dry-run default).
 *
 * Execute only after owner replies: "approved execute storage"
 *
 * Usage:
 *   node scripts/storage-cleanup.mjs --qa-club-id ab001,aggiesfc --wipe-staging --wipe-quarantine --delete-non-qa-clubs
 *   node scripts/storage-cleanup.mjs --execute --qa-club-id ab001,aggiesfc ...  # owner approved
 */

import fs from 'node:fs';
import path from 'node:path';
import {
	DEFAULT_PROJECT,
	DEFAULT_BUCKET,
	BLOCKED_BUCKETS,
	assertSafeProject,
	artifactDir,
	bytesToMb,
	classifyObject,
	collectFirestoreRequiredPaths,
	resolveAdmin,
	resolveKeepUids,
	resolveQaClubIds,
	listAllObjects,
	log,
	parseArgs,
	parseCsvSet,
	DEFAULT_KEEP_EMAILS,
	normEmail,
} from './storage-shared.mjs';

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
const EXECUTE = hasFlag('--execute');
const DRY_RUN = !EXECUTE;
const WIPE_STAGING = hasFlag('--wipe-staging');
const WIPE_QUARANTINE = hasFlag('--wipe-quarantine');
const DELETE_NON_QA = hasFlag('--delete-non-qa-clubs');
const KEEP_RL = !hasFlag('--no-keep-rl-models');
const INCLUDE_TIER_B = hasFlag('--include-tier-b');
const CONCURRENCY = Math.min(20, Math.max(1, Number(flagVal('--concurrency', '10')) || 10));

async function deleteWithConcurrency(bucket, paths, dryRun) {
	let ok = 0;
	let fail = 0;
	/** @type {{ path: string; error: string }[]} */
	const failures = [];
	const queue = [...paths];
	const workers = Array.from({ length: CONCURRENCY }, async () => {
		while (queue.length) {
			const objectPath = queue.shift();
			if (!objectPath) break;
			if (dryRun) {
				ok += 1;
				continue;
			}
			try {
				await bucket.file(objectPath).delete();
				ok += 1;
			} catch (e) {
				fail += 1;
				failures.push({ path: objectPath, error: String(e.message || e) });
			}
		}
	});
	await Promise.all(workers);
	return { ok, fail, failures };
}

function groupByPrefix(paths, allFiles) {
	/** @type {Map<string, { count: number; bytes: number }>} */
	const map = new Map();
	const sizeByPath = new Map(allFiles.map((f) => [f.name, Number(f.metadata?.size || 0)]));
	for (const p of paths) {
		const parts = p.split('/').filter(Boolean);
		const key =
			['clubs', 'tenants', 'compliance', 'rl_models'].includes(parts[0]) && parts[1]
				? `${parts[0]}/${parts[1]}/`
				: `${parts[0]}/`;
		const prev = map.get(key) || { count: 0, bytes: 0 };
		prev.count += 1;
		prev.bytes += sizeByPath.get(p) || 0;
		map.set(key, prev);
	}
	return [...map.entries()].sort((a, b) => b[1].bytes - a[1].bytes);
}

async function main() {
	assertSafeProject(PROJECT_ID, BUCKET_NAME);
	if (BLOCKED_BUCKETS.has(BUCKET_NAME)) {
		throw new Error(`Refusing bucket ${BUCKET_NAME}`);
	}

	fs.mkdirSync(OUT_DIR, { recursive: true });
	const mode = DRY_RUN ? 'DRY-RUN' : 'EXECUTE';
	log(`Mode: ${mode}`);
	log(`Project: ${PROJECT_ID}  Bucket: ${BUCKET_NAME}`);

	if (EXECUTE) {
		log('Owner must have replied: approved execute storage');
	}

	const admin = resolveAdmin(PROJECT_ID);
	const bucket = admin.storage().bucket(BUCKET_NAME);
	const db = admin.firestore();
	const auth = admin.auth();

	const qaClubIds = resolveQaClubIds(QA_CLUB_ARG, ARTIFACT_DATE);
	const keepUids = await resolveKeepUids(auth, KEEP_EMAILS, KEEP_UIDS_ARG, ARTIFACT_DATE);

	if (!qaClubIds.size) {
		throw new Error('Set --qa-club-id (comma-separated) or ensure firestore-reset artifacts exist.');
	}

	const { required } = await collectFirestoreRequiredPaths(db, { qaClubIds, keepUids });
	const ctx = {
		qaClubIds,
		keepUids,
		required,
		keepRlModels: KEEP_RL,
		wipeStaging: WIPE_STAGING,
		wipeQuarantine: WIPE_QUARANTINE,
		deleteNonQaClubs: DELETE_NON_QA,
	};

	log('Listing bucket objects…');
	const allFiles = await listAllObjects(bucket);

	/** @type {string[]} */
	const toDelete = [];
	/** @type {string[]} */
	const tierBReview = [];

	for (const f of allFiles) {
		const c = classifyObject(f.name, ctx);
		if (c.verdict === 'DELETE_CANDIDATE') {
			toDelete.push(f.name);
		} else if (c.verdict === 'REVIEW' && INCLUDE_TIER_B) {
			toDelete.push(f.name);
			tierBReview.push(f.name);
		} else if (c.verdict === 'REVIEW') {
			tierBReview.push(f.name);
		}
	}

	const delBytes = toDelete.reduce((s, p) => {
		const f = allFiles.find((x) => x.name === p);
		return s + Number(f?.metadata?.size || 0);
	}, 0);

	const prefixGroups = groupByPrefix(toDelete, allFiles);
	const prefixList = prefixGroups.map(([k, v]) => `${k} (${v.count}, ${bytesToMb(v.bytes)} MB)`);

	const sizeLabel =
		delBytes >= 1024 * 1024 * 1024
			? `${(delBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
			: `${bytesToMb(delBytes)} MB`;
	const ownerMessage = [
		`${DRY_RUN ? 'Dry-run will delete' : 'Deleted'} ${toDelete.length} objects (~${sizeLabel}).`,
		`Prefixes: [${prefixList.slice(0, 12).join('; ')}${prefixList.length > 12 ? '…' : ''}]`,
		`QA clubIds: ${[...qaClubIds].join(', ')}`,
		`Keep RL models: ${KEEP_RL ? 'Y' : 'N'}`,
		'Reply `approved execute storage` to run with --execute',
	].join('\n');

	log('--- Owner preview ---');
	log(ownerMessage.replace(/\n/g, '\n'));

	const { ok, fail, failures } = await deleteWithConcurrency(bucket, toDelete, DRY_RUN);

	const logMd = [
		`# Storage cleanup ${mode} — ${PROJECT_ID}`,
		'',
		`Generated: ${new Date().toISOString()}`,
		`Bucket: \`${BUCKET_NAME}\``,
		'',
		'## Flags',
		'',
		`| Flag | Value |`,
		`|------|-------|`,
		`| --execute | ${EXECUTE} |`,
		`| --qa-club-id | ${[...qaClubIds].join(', ')} |`,
		`| --keep-uids | ${[...keepUids].join(', ')} |`,
		`| --wipe-staging | ${WIPE_STAGING} |`,
		`| --wipe-quarantine | ${WIPE_QUARANTINE} |`,
		`| --delete-non-qa-clubs | ${DELETE_NON_QA} |`,
		`| --keep-rl-models | ${KEEP_RL} |`,
		`| --include-tier-b | ${INCLUDE_TIER_B} |`,
		'',
		'## Result',
		'',
		`| Metric | Value |`,
		`|--------|------:|`,
		`| Candidates | ${toDelete.length} |`,
		`| Size | ${bytesToMb(delBytes)} MB |`,
		`| ${DRY_RUN ? 'Would delete' : 'Deleted'} | ${ok} |`,
		`| Failed | ${fail} |`,
		`| Tier B left for review | ${tierBReview.length} |`,
		'',
		'## Prefix breakdown (delete set)',
		'',
		...prefixGroups.map(([k, v]) => `- \`${k}\` — ${v.count} objects, ${bytesToMb(v.bytes)} MB`),
		'',
		'## Owner message',
		'',
		'```',
		ownerMessage,
		'```',
		'',
	];

	if (failures.length) {
		logMd.push('## Failures', '', ...failures.slice(0, 50).map((f) => `- \`${f.path}\`: ${f.error}`));
	}

	fs.writeFileSync(path.join(OUT_DIR, 'EXECUTION_LOG.md'), logMd.join('\n'), 'utf8');
	fs.writeFileSync(
		path.join(OUT_DIR, 'delete-candidates.json'),
		JSON.stringify({ mode, toDelete, tierBReview, prefixGroups, ownerMessage }, null, 2),
		'utf8',
	);

	log(`Wrote ${path.join(OUT_DIR, 'EXECUTION_LOG.md')}`);
	if (DRY_RUN) {
		log(`[dry-run] Would delete ${ok} objects. Tier B review (not deleted): ${tierBReview.length}`);
	} else {
		log(`Deleted ${ok} objects; failures: ${fail}`);
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
