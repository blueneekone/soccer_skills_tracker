#!/usr/bin/env node
/**
 * scripts/firestore-inventory.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * List ALL root Firestore collections on sports-skill-tracker-dev (default DB),
 * document counts, codebase/rules cross-ref, technical-debt verdict.
 *
 * Does NOT delete anything. Pair with dev-tenant-reset for execute cleanup.
 *
 * Usage:
 *   node scripts/firestore-inventory.mjs
 *   node scripts/firestore-inventory.mjs --artifact-date 20260603
 *   node scripts/firestore-inventory.mjs --export-subcollections   # depth-1 under each root doc sample
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const DEFAULT_PROJECT = 'sports-skill-tracker-dev';
const BLOCKED_PROJECTS = new Set(['soccer-skills-tracker', 'soccer-skills-tracker-prod']);

/** Never flag as debt — compliance / legal */
const PROTECTED = new Set([
	'consents',
	'consent_logs',
	'consent_tokens',
	'consent_records',
	'pii_vault',
	'minor_retention_queue',
]);

/** Launch-critical roots (keep even if temporarily empty) */
const PLATFORM_CORE = new Set([
	'users',
	'clubs',
	'teams',
	'organizations',
	'households',
	'coach_lookup',
	'registrar_lookup',
	'player_lookup',
	'invites',
	'license_entitlements',
	'licenses',
	'player_media',
	'sports_configs',
	'analytics',
	'config',
	'pricing_policy',
]);

const SCAN_ROOTS = [
	'src',
	'functions',
	'functions-core',
	'functions-platform',
	'functions-integrations',
	'functions-compliance',
	'functions-commerce',
	'functions-rl',
	'scripts',
	'e2e',
];

const CODE_EXT = new Set(['.js', '.ts', '.svelte', '.mjs', '.cjs', '.rules']);

const argv = process.argv.slice(2);
const hasFlag = (f) => argv.includes(f);
const flagVal = (f, fallback) => {
	const hit = argv.find((a) => a.startsWith(`${f}=`));
	if (hit) return hit.slice(f.length + 1);
	const i = argv.indexOf(f);
	return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};

const PROJECT_ID = flagVal('--project', DEFAULT_PROJECT);
const ARTIFACT_DATE =
	flagVal('--artifact-date', '') || new Date().toISOString().slice(0, 10).replace(/-/g, '');
const OUT_DIR = path.join(REPO_ROOT, 'artifacts', `firestore-inventory-${ARTIFACT_DATE}`);
const EXPORT_SUBCOLS = hasFlag('--export-subcollections');

/** Names commonly visible in Firebase Console left nav (incl. empty / stale roots) */
const CONSOLE_NAV_LIST = `
analytics assigned_missions assignments audit_logs auth_challenges clubs coach_lookup
config consent_records households invites license_entitlements licenses logs_system
operative_dispatches passports player_lookup player_stats reps rl_training_runs
security_audit sport_audit_report sports_configs team_stats team_workouts teams users
vpc_requests workout_logs workouts
`
	.trim()
	.split(/\s+/);

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
	if (!admin.apps.length) {
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
	}
	return admin;
}

/** Walk repo and collect collection id mentions */
function scanCodebaseReferences() {
	/** @type {Map<string, { src: number; functions: number; scripts: number; e2e: number; rules: number }>} */
	const refs = new Map();

	const bump = (name, bucket) => {
		const row = refs.get(name) || { src: 0, functions: 0, scripts: 0, e2e: 0, rules: 0 };
		row[bucket] += 1;
		refs.set(name, row);
	};

	const patterns = [
		/\.collection\(\s*['"]([a-z][a-z0-9_]*)['"]/gi,
		/collection\(\s*db\s*,\s*['"]([a-z][a-z0-9_]*)['"]/gi,
		/collection\(\s*[^,]+,\s*['"]([a-z][a-z0-9_]*)['"]/gi,
		/doc\(\s*['"]([a-z][a-z0-9_]*)\//gi,
		/document:\s*['"]([a-z][a-z0-9_]*)\//gi,
	];

	const rulesPath = path.join(REPO_ROOT, 'firestore.rules');
	if (fs.existsSync(rulesPath)) {
		const rulesText = fs.readFileSync(rulesPath, 'utf8');
		const ruleRe = /match\s+\/([a-z][a-z0-9_]*)\/\{/g;
		let m;
		while ((m = ruleRe.exec(rulesText))) {
			bump(m[1], 'rules');
		}
	}

	function walk(dir, bucket) {
		if (!fs.existsSync(dir)) return;
		for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, ent.name);
			if (ent.isDirectory()) {
				if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === 'dist') continue;
				walk(full, bucket);
				continue;
			}
			const ext = path.extname(ent.name);
			if (!CODE_EXT.has(ext)) continue;
			const text = fs.readFileSync(full, 'utf8');
			for (const re of patterns) {
				re.lastIndex = 0;
				let match;
				while ((match = re.exec(text))) {
					bump(match[1], bucket);
				}
			}
		}
	}

	for (const root of SCAN_ROOTS) {
		const abs = path.join(REPO_ROOT, root);
		let bucket = 'src';
		if (root.startsWith('functions')) bucket = 'functions';
		else if (root === 'scripts') bucket = 'scripts';
		else if (root === 'e2e') bucket = 'e2e';
		walk(abs, bucket);
	}

	return refs;
}

async function countCollection(db, name) {
	const col = db.collection(name);
	try {
		const agg = await col.count().get();
		const count = agg.data().count;
		const sampleSnap = await col.limit(5).get();
		return {
			count,
			sampleIds: sampleSnap.docs.map((d) => d.id),
			error: null,
		};
	} catch (e) {
		return { count: -1, sampleIds: [], error: String(e.message || e) };
	}
}

async function sampleSubcollections(db, rootName, sampleIds) {
	/** @type {Record<string, string[]>} */
	const out = {};
	for (const docId of sampleIds.slice(0, 3)) {
		try {
			const subs = await db.collection(rootName).doc(docId).listCollections();
			if (subs.length) out[docId] = subs.map((c) => c.id);
		} catch {
			/* ignore */
		}
	}
	return out;
}

function totalRefs(row) {
	if (!row) return 0;
	return row.src + row.functions + row.scripts + row.e2e + row.rules;
}

function verdictFor(name, count, refs) {
	if (PROTECTED.has(name)) {
		return { verdict: 'KEEP', reason: 'Protected compliance / vault' };
	}
	if (PLATFORM_CORE.has(name)) {
		return {
			verdict: count === 0 ? 'KEEP_EMPTY' : 'KEEP',
			reason: 'Platform core (launch schema)',
		};
	}
	const r = totalRefs(refs);
	if (r > 0) {
		if (refs?.rules && !refs.src && !refs.functions && refs.rules === r) {
			return { verdict: 'REVIEW', reason: 'Firestore rules only — no app/CF string refs found' };
		}
		return { verdict: 'KEEP', reason: `Referenced in codebase (${r} hits)` };
	}
	if (count === 0) {
		return { verdict: 'DEBT_EMPTY', reason: 'Root exists in project listing but 0 docs and no refs' };
	}
	return { verdict: 'DEBT_CANDIDATE', reason: `${count} doc(s), no codebase/rules refs` };
}

async function main() {
	if (BLOCKED_PROJECTS.has(PROJECT_ID)) {
		throw new Error(`Refusing project ${PROJECT_ID}`);
	}

	fs.mkdirSync(OUT_DIR, { recursive: true });
	log(`Project: ${PROJECT_ID}  database: (default)`);
	log(`Scanning codebase references…`);
	const codeRefs = scanCodebaseReferences();
	log(`Code index: ${codeRefs.size} collection ids mentioned`);

	const admin = resolveAdmin();
	const db = admin.firestore();

	log('Listing root collections (listCollections)…');
	const rootCols = await db.listCollections();
	const names = rootCols.map((c) => c.id).sort();

	log(`Found ${names.length} materialized roots (listCollections — requires ≥1 doc historically)`);

	/** Probe every Console nav id (includes 0-doc ghosts Console still shows) */
	/** @type {object[]} */
	const consoleRows = [];
	for (const name of CONSOLE_NAV_LIST) {
		try {
			const countSnap = await db.collection(name).count().get();
			const n = countSnap.data().count;
			const inList = names.includes(name);
			const refs = codeRefs.get(name);
			const { verdict, reason } = verdictFor(name, n, refs);
			let status = 'ACTIVE';
			if (n === 0 && !inList) status = 'CONSOLE_GHOST';
			else if (n === 0 && inList) status = 'EMPTY_ROOT';
			else if (n > 0 && !inList) status = 'QUERYABLE_NOT_LISTED';
			consoleRows.push({
				name,
				count: n,
				inListCollections: inList,
				consoleStatus: status,
				verdict,
				reason,
			});
		} catch (e) {
			consoleRows.push({
				name,
				count: -1,
				inListCollections: false,
				consoleStatus: 'ERROR',
				verdict: 'ERROR',
				reason: String(e.message || e),
			});
		}
	}

	/** @type {object[]} */
	const rows = [];
	for (const name of names) {
		const { count, sampleIds, error } = await countCollection(db, name);
		const refs = codeRefs.get(name);
		const { verdict, reason } = error
			? { verdict: 'ERROR', reason: error }
			: verdictFor(name, count, refs);

		let subcollections = null;
		if (EXPORT_SUBCOLS && count > 0 && sampleIds.length) {
			subcollections = await sampleSubcollections(db, name, sampleIds);
		}

		rows.push({
			name,
			count,
			verdict,
			reason,
			sampleIds,
			refs: refs || null,
			subcollections,
		});
		log(`  ${name}: ${error ? error : count} docs → ${verdict}`);
	}

	// Collections referenced in code/rules but missing from DB (schema drift)
	const missingRoots = [...codeRefs.keys()]
		.filter((k) => !names.includes(k) && totalRefs(codeRefs.get(k)) >= 2)
		.sort();

	const byVerdict = (v) => rows.filter((r) => r.verdict === v || (v === 'DEBT' && r.verdict.startsWith('DEBT')));

	const md = [
		`# Firestore root collection inventory — ${PROJECT_ID}`,
		'',
		`Generated: ${stamp()}`,
		`Database: \`(default)\``,
		`Root collections found: **${names.length}**`,
		'',
		'## Summary by verdict',
		'',
		`| Verdict | Count |`,
		`|---------|------:|`,
		...['KEEP', 'KEEP_EMPTY', 'REVIEW', 'DEBT_CANDIDATE', 'DEBT_EMPTY', 'ERROR'].map((v) => {
			const n = rows.filter((r) => r.verdict === v).length;
			return `| ${v} | ${n} |`;
		}),
		'',
		'## Why Console shows more names than listCollections()',
		'',
		'Firebase Console **keeps collection ids in the left nav** even after the last document was deleted.',
		'Admin SDK `listCollections()` only returns roots that **still exist** (non-empty / materialized).',
		'',
		'| Status | Meaning |',
		'|--------|---------|',
		'| `ACTIVE` | ≥1 document; appears in Console and listCollections |',
		'| `CONSOLE_GHOST` | **0 documents**; Console may still list it; **not** in listCollections |',
		'| `EMPTY_ROOT` | 0 documents but still returned by listCollections (rare) |',
		'',
		'## Your Console nav list (all 31 names probed)',
		'',
		'| Collection | Docs | listCollections | Console status | Verdict |',
		'|------------|-----:|:---------------:|----------------|---------|',
		...consoleRows.map(
			(r) =>
				`| \`${r.name}\` | ${r.count < 0 ? 'err' : r.count} | ${r.inListCollections ? 'yes' : 'no'} | ${r.consoleStatus} | ${r.verdict} |`,
		),
		'',
		'### CONSOLE_GHOST (safe technical-debt targets — 0 docs)',
		'',
		...(consoleRows
			.filter((r) => r.consoleStatus === 'CONSOLE_GHOST')
			.map((r) => `- \`${r.name}\` — ${r.reason}`).length
			? consoleRows
					.filter((r) => r.consoleStatus === 'CONSOLE_GHOST')
					.map((r) => `- \`${r.name}\` — ${r.reason}`)
			: ['_none_']),
		'',
		'## Materialized roots (listCollections)',
		'',
		'| Collection | Docs | Verdict | In rules? | Code refs (src/fn/rules) | Sample ids | Notes |',
		'|------------|-----:|---------|:---------:|-------------------------|------------|-------|',
		...rows.map((r) => {
			const ref = r.refs;
			const refStr = ref
				? `${ref.src}/${ref.functions}/${ref.rules}`
				: '0/0/0';
			const rules = ref?.rules ? 'yes' : 'no';
			const samples = (r.sampleIds || []).slice(0, 3).join(', ') || '—';
			return `| \`${r.name}\` | ${r.count < 0 ? 'error' : r.count} | ${r.verdict} | ${rules} | ${refStr} | ${samples} | ${r.reason} |`;
		}),
		'',
		'## DEBT — candidates for removal (has data, no refs)',
		'',
		...(byVerdict('DEBT_CANDIDATE').length
			? byVerdict('DEBT_CANDIDATE').map(
					(r) => `- \`${r.name}\` (${r.count} docs) — ${r.reason}`,
				)
			: ['_none_']),
		'',
		'## DEBT — empty roots (no docs, no refs)',
		'',
		...(rows.filter((r) => r.verdict === 'DEBT_EMPTY').length
			? rows
					.filter((r) => r.verdict === 'DEBT_EMPTY')
					.map((r) => `- \`${r.name}\``)
			: ['_none_']),
		'',
		'## REVIEW — rules or partial wiring',
		'',
		...(rows.filter((r) => r.verdict === 'REVIEW').length
			? rows.filter((r) => r.verdict === 'REVIEW').map((r) => `- \`${r.name}\` (${r.count}) — ${r.reason}`)
			: ['_none_']),
		'',
		'## Code references but no root collection in DB',
		'',
		'_(Mentioned ≥2× in code/rules; may be subcollection-only or not yet written.)_',
		'',
		...(missingRoots.length ? missingRoots.map((k) => `- \`${k}\` (${totalRefs(codeRefs.get(k))} hits)`) : ['_none_']),
		'',
		'## Protected (never auto-delete)',
		'',
		[...PROTECTED].map((c) => `- \`${c}\``).join('\n'),
		'',
		'## Next steps',
		'',
		'1. Owner reviews DEBT_* and REVIEW rows.',
		'2. Extend `dev-tenant-reset.mjs` wipe list OR add `firestore-cleanup.mjs` for approved deletes.',
		'3. Re-run this inventory after cleanup: `node scripts/firestore-inventory.mjs`',
		'',
	].join('\n');

	fs.writeFileSync(path.join(OUT_DIR, 'FIRESTORE_INVENTORY.md'), md, 'utf8');
	fs.writeFileSync(
		path.join(OUT_DIR, 'root-collections.json'),
		JSON.stringify(
			{ projectId: PROJECT_ID, generatedAt: stamp(), rows, consoleRows, missingRoots },
			null,
			2,
		),
		'utf8',
	);

	const ghosts = consoleRows.filter((r) => r.consoleStatus === 'CONSOLE_GHOST');
	const dbOnly = names.filter((c) => !CONSOLE_NAV_LIST.includes(c));
	fs.writeFileSync(
		path.join(OUT_DIR, 'CONSOLE_DIFF.md'),
		[
			'# Console vs Admin SDK diff',
			'',
			'## CONSOLE_GHOST — in Console nav, 0 docs, not in listCollections',
			'',
			...(ghosts.length ? ghosts.map((r) => `- \`${r.name}\``) : ['_none_']),
			'',
			'These are **not real data** today; Console UI is stale. No delete API needed.',
			'',
			`## In listCollections but not in your Console paste (${dbOnly.length})`,
			'',
			...(dbOnly.length ? dbOnly.map((c) => `- \`${c}\``) : ['_none_']),
			'',
		].join('\n'),
		'utf8',
	);

	log(`Wrote ${path.join(OUT_DIR, 'FIRESTORE_INVENTORY.md')}`);
	const debt = rows.filter((r) => r.verdict.startsWith('DEBT'));
	log(`DEBT rows: ${debt.length} (candidates + empty)`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
