#!/usr/bin/env node
/**
 * Shared helpers for Firebase Storage audit/cleanup (dev bucket only).
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '..');

export const DEFAULT_PROJECT = 'sports-skill-tracker-dev';
export const DEFAULT_BUCKET = 'sports-skill-tracker-dev.firebasestorage.app';
export const BLOCKED_PROJECTS = new Set(['soccer-skills-tracker', 'soccer-skills-tracker-prod']);
export const BLOCKED_BUCKETS = new Set([
	'soccer-skills-tracker.firebasestorage.app',
	'soccer-skills-tracker.appspot.com',
]);

export const DEFAULT_KEEP_EMAILS =
	'ecwaechtler@gmail.com,ecwaechtler+parent@gmail.com,ecwaechtler+coach@gmail.com,aaron.hanks0287@gmail.com';

/** Prefixes defined in storage.rules + active app/functions code */
export const CANONICAL_PREFIXES = [
	{
		prefix: 'clubs/',
		inRules: true,
		referencedIn: 'ClubIdentityModule.svelte, FacilityMapVault, VideoTrialUploader, webhooksOps',
	},
	{
		prefix: 'tenants/',
		inRules: true,
		referencedIn: 'uploadTokens.js, processMedia.js, player vault paths',
	},
	{
		prefix: 'compliance/',
		inRules: true,
		referencedIn: 'storage.rules (coach/recruiter certs)',
	},
	{
		prefix: 'rl_models/',
		inRules: false,
		referencedIn: 'functions-rl rlOps.js, policyModel.js (Admin SDK)',
	},
];

export function stamp() {
	return new Date().toISOString();
}

export function log(msg) {
	console.log(`[${stamp()}] ${msg}`);
}

export function normEmail(v) {
	if (typeof v !== 'string') return '';
	return v.trim().toLowerCase();
}

export function parseCsvSet(arg) {
	if (!arg || !String(arg).trim()) return new Set();
	return new Set(
		String(arg)
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean),
	);
}

export function parseArgs(argv) {
	const hasFlag = (f) => argv.includes(f);
	const flagVal = (f, fallback) => {
		const hit = argv.find((a) => a.startsWith(`${f}=`));
		if (hit) return hit.slice(f.length + 1);
		const i = argv.indexOf(f);
		return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
	};
	return { hasFlag, flagVal };
}

export function assertSafeProject(projectId, bucketName) {
	if (BLOCKED_PROJECTS.has(projectId)) {
		throw new Error(
			`Refusing project "${projectId}" — prod blocked. Use --project ${DEFAULT_PROJECT} only.`,
		);
	}
	if (bucketName && BLOCKED_BUCKETS.has(bucketName)) {
		throw new Error(`Refusing bucket "${bucketName}" — prod bucket blocked.`);
	}
}

export function resolveAdmin(projectId) {
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
			admin.initializeApp({ projectId, storageBucket: DEFAULT_BUCKET });
		} else if (fs.existsSync(saPath)) {
			const raw = JSON.parse(fs.readFileSync(saPath, 'utf8'));
			admin.initializeApp({
				credential: admin.credential.cert(raw),
				projectId: raw.project_id || projectId,
				storageBucket: DEFAULT_BUCKET,
			});
		} else {
			admin.initializeApp({ projectId, storageBucket: DEFAULT_BUCKET });
		}
	}
	return admin;
}

export function artifactDir(dateStamp) {
	const d = dateStamp || new Date().toISOString().slice(0, 10).replace(/-/g, '');
	return path.join(REPO_ROOT, 'artifacts', `storage-audit-${d}`);
}

export function resolveQaClubIds(flagClubId, artifactDate) {
	const fromCli = parseCsvSet(flagClubId);
	if (fromCli.size) return fromCli;

	const resetDir = path.join(REPO_ROOT, 'artifacts', `firestore-reset-${artifactDate || ''}`);
	const backupPath = path.join(resetDir, 'backup-clubs-teams.json');
	if (fs.existsSync(backupPath)) {
		try {
			const b = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
			if (Array.isArray(b.clubIds) && b.clubIds.length) return new Set(b.clubIds);
		} catch {
			/* ignore */
		}
	}

	const snapPath = path.join(resetDir, 'kept-user-snapshot.json');
	if (fs.existsSync(snapPath)) {
		try {
			const snap = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
			const ids = new Set();
			for (const row of Object.values(snap)) {
				if (row?.clubId) ids.add(String(row.clubId));
			}
			if (ids.size) return ids;
		} catch {
			/* ignore */
		}
	}

	return new Set();
}

/**
 * Decode Firebase Storage download URL or gs:// path to object path (no leading slash).
 * @param {string} url
 * @returns {string | null}
 */
export function storageUrlToObjectPath(url) {
	if (typeof url !== 'string' || !url.trim()) return null;
	const s = url.trim();
	if (s.startsWith('gs://')) {
		const m = s.match(/^gs:\/\/[^/]+\/(.+)$/);
		return m ? decodeURIComponent(m[1]) : null;
	}
	if (s.includes('firebasestorage.googleapis.com') || s.includes('firebasestorage.app')) {
		try {
			const u = new URL(s);
			const o = u.pathname.match(/\/o\/(.+)$/);
			if (o) return decodeURIComponent(o[1].replace(/\+/g, ' '));
		} catch {
			/* fall through */
		}
	}
	return null;
}

/**
 * @param {import('@google-cloud/storage').Bucket} bucket
 * @param {string} [prefix]
 */
export async function listAllObjects(bucket, prefix = '') {
	/** @type {import('@google-cloud/storage').File[]} */
	const files = [];
	let pageToken;
	do {
		const [page, , api] = await bucket.getFiles({
			prefix: prefix || undefined,
			autoPaginate: false,
			maxResults: 1000,
			pageToken,
		});
		files.push(...page);
		pageToken = api?.nextPageToken;
	} while (pageToken);
	return files;
}

/**
 * @param {import('@google-cloud/storage').Bucket} bucket
 */
export async function listTopLevelPrefixes(bucket) {
	const [, , api] = await bucket.getFiles({ delimiter: '/', autoPaginate: false });
	const prefixes = api?.prefixes || [];
	return prefixes.map((p) => p.replace(/\/$/, ''));
}

/**
 * @param {import('@google-cloud/storage').File[]} files
 */
export function aggregateByPrefix(files, depth = 1) {
	/** @type {Map<string, { count: number; bytes: number }>} */
	const map = new Map();
	for (const f of files) {
		const name = f.name;
		const parts = name.split('/');
		const key = parts.slice(0, depth).join('/') + (parts.length > depth ? '/' : '');
		const prev = map.get(key) || { count: 0, bytes: 0 };
		const size = Number(f.metadata?.size || 0);
		prev.count += 1;
		prev.bytes += size;
		map.set(key, prev);
	}
	return map;
}

export function bytesToMb(bytes) {
	return (bytes / (1024 * 1024)).toFixed(2);
}

export async function listAllAuthUsers(auth) {
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

export async function resolveKeepUids(auth, keepEmails, explicitUids, artifactDate = '') {
	const uidSet = parseCsvSet(explicitUids);
	if (uidSet.size) return uidSet;
	const emailSet = new Set([...keepEmails].map(normEmail));
	const users = await listAllAuthUsers(auth);
	for (const u of users) {
		const em = normEmail(u.email || '');
		if (emailSet.has(em) && u.uid) uidSet.add(u.uid);
	}
	const d = artifactDate || new Date().toISOString().slice(0, 10).replace(/-/g, '');
	const snapPath = path.join(REPO_ROOT, 'artifacts', `firestore-reset-${d}`, 'kept-user-snapshot.json');
	if (!uidSet.size && fs.existsSync(snapPath)) {
		try {
			const snap = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
			for (const row of Object.values(snap)) {
				if (row?.uid) uidSet.add(String(row.uid));
			}
		} catch {
			/* ignore */
		}
	}
	return uidSet;
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

/**
 * Firestore paths required for QA tenants (read-only cross-ref).
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {{ qaClubIds: Set<string>; keepUids: Set<string> }} opts
 */
export async function collectFirestoreRequiredPaths(db, { qaClubIds, keepUids }) {
	/** @type {Set<string>} */
	const required = new Set();
	const notes = [];

	for (const clubId of qaClubIds) {
		required.add(`clubs/${clubId}/branding/logo.png`);

		try {
			const facSnap = await db.collection('clubs').doc(clubId).collection('facilities').get();
			for (const doc of facSnap.docs) {
				const p = doc.data()?.mapStoragePath;
				if (typeof p === 'string' && p.trim()) {
					required.add(p.trim());
					notes.push(`facility ${clubId}/${doc.id}`);
				}
			}
		} catch (e) {
			notes.push(`facilities ${clubId}: ${e.message}`);
		}
	}

	for (const uid of keepUids) {
		try {
			const clipsSnap = await db.collection(`player_media/${uid}/clips`).get();
			for (const doc of clipsSnap.docs) {
				const d = doc.data();
				for (const field of ['storagePath', 'processedPath']) {
					const p = d?.[field];
					if (typeof p === 'string' && p.trim()) required.add(p.trim());
				}
				const urlPath = storageUrlToObjectPath(d?.publicUrl);
				if (urlPath) required.add(urlPath);
			}
		} catch (e) {
			notes.push(`player_media ${uid}: ${e.message}`);
		}
	}

	for (const coll of ['trials', 'trial_scores']) {
		try {
			const docs = await paginateCollection(db, coll);
			for (const doc of docs) {
				const d = doc.data();
				const clubId = d?.clubId || d?.tenantId;
				if (clubId && qaClubIds.size && !qaClubIds.has(String(clubId))) continue;
				const uid = d?.uid || d?.playerId || d?.playerUid;
				const scoreId = doc.id;
				if (clubId && uid) {
					required.add(`clubs/${clubId}/trials/${uid}/${scoreId}_video.mp4`);
				}
				for (const field of ['videoUrl', 'videoPath', 'storagePath']) {
					const raw = d?.[field];
					if (typeof raw === 'string') {
						const p = storageUrlToObjectPath(raw) || (raw.startsWith('clubs/') ? raw : null);
						if (p) required.add(p);
					}
				}
			}
		} catch {
			/* collection may not exist */
		}
	}

	try {
		const userDocs = await paginateCollection(db, 'users');
		for (const doc of userDocs) {
			const d = doc.data();
			const photo = d?.photoURL || d?.photoUrl;
			if (typeof photo === 'string') {
				const p = storageUrlToObjectPath(photo);
				if (p) required.add(p);
			}
		}
	} catch (e) {
		notes.push(`users: ${e.message}`);
	}

	return { required, notes };
}

/**
 * @param {string} objectPath
 * @param {{
 *   qaClubIds: Set<string>;
 *   keepUids: Set<string>;
 *   required: Set<string>;
 *   keepRlModels: boolean;
 *   wipeStaging: boolean;
 *   wipeQuarantine: boolean;
 *   deleteNonQaClubs: boolean;
 * }} ctx
 */
export function classifyObject(objectPath, ctx) {
	const p = objectPath.replace(/^\/+/, '');

	if (ctx.required.has(p)) {
		return { verdict: 'KEEP', tier: null, reason: 'Firestore or canonical required path' };
	}

	if (p.startsWith('rl_models/')) {
		return ctx.keepRlModels
			? { verdict: 'KEEP', tier: 'C', reason: 'RL policy artifacts (--keep-rl-models)' }
			: { verdict: 'DELETE_CANDIDATE', tier: 'C', reason: 'RL models (owner disabled keep)' };
	}

	const top = p.split('/')[0];
	const canonicalTops = new Set(['clubs', 'tenants', 'compliance', 'rl_models']);
	if (!canonicalTops.has(top)) {
		return { verdict: 'DELETE_CANDIDATE', tier: 'A', reason: `Non-canonical root prefix "${top}/"` };
	}

	if (p.startsWith('clubs/')) {
		const clubId = p.split('/')[1];
		if (ctx.deleteNonQaClubs && clubId && !ctx.qaClubIds.has(clubId)) {
			return { verdict: 'DELETE_CANDIDATE', tier: 'A', reason: `Non-QA clubId ${clubId}` };
		}
		if (ctx.qaClubIds.has(clubId) && p.endsWith('/branding/logo.png')) {
			return { verdict: 'KEEP', tier: null, reason: 'QA club branding logo slot' };
		}
		if (ctx.qaClubIds.has(clubId) && p.includes('/trials/')) {
			return { verdict: 'REVIEW', tier: 'B', reason: 'Trial video not in Firestore required set' };
		}
		if (ctx.qaClubIds.has(clubId) && p.includes('/facility_maps/')) {
			return { verdict: 'REVIEW', tier: 'B', reason: 'Facility map not referenced in Firestore' };
		}
		if (clubId && !ctx.qaClubIds.has(clubId)) {
			return { verdict: 'DELETE_CANDIDATE', tier: 'A', reason: `Non-QA clubId ${clubId}` };
		}
	}

	if (p.startsWith('tenants/')) {
		const parts = p.split('/');
		const tenantId = parts[1];
		const zone = parts[2];
		const pathUid = parts[3] || null;

		if (tenantId && ctx.qaClubIds.size && !ctx.qaClubIds.has(tenantId)) {
			return { verdict: 'DELETE_CANDIDATE', tier: 'A', reason: `Non-QA tenantId ${tenantId}` };
		}

		if (zone === 'staging' && ctx.wipeStaging) {
			return { verdict: 'DELETE_CANDIDATE', tier: 'A', reason: 'Orphan staging (--wipe-staging)' };
		}

		if (zone === 'quarantine' && ctx.wipeQuarantine) {
			return { verdict: 'DELETE_CANDIDATE', tier: 'A', reason: 'Quarantine wipe (--wipe-quarantine)' };
		}

		if (pathUid && ctx.keepUids.size && !ctx.keepUids.has(pathUid)) {
			return { verdict: 'DELETE_CANDIDATE', tier: 'A', reason: `UID ${pathUid} not in keep list` };
		}

		if (zone === 'media') {
			return { verdict: 'REVIEW', tier: 'B', reason: 'Processed media not in player_media clips' };
		}

		if (zone === 'staging' && !ctx.wipeStaging) {
			return { verdict: 'REVIEW', tier: 'B', reason: 'Staging present (use --wipe-staging on execute)' };
		}

		if (zone === 'quarantine' && !ctx.wipeQuarantine) {
			return { verdict: 'REVIEW', tier: 'B', reason: 'Quarantine (use --wipe-quarantine on execute)' };
		}

		if (zone === 'players') {
			return { verdict: 'REVIEW', tier: 'B', reason: 'Player vault file not in Firestore cross-ref' };
		}
	}

	if (p.startsWith('compliance/')) {
		const tenantId = p.split('/')[1];
		const userId = p.split('/')[2];
		if (tenantId && !ctx.qaClubIds.has(tenantId)) {
			return { verdict: 'DELETE_CANDIDATE', tier: 'A', reason: `Non-QA compliance tenant ${tenantId}` };
		}
		if (userId && ctx.keepUids.size && !ctx.keepUids.has(userId)) {
			return { verdict: 'REVIEW', tier: 'B', reason: 'Compliance doc for non-kept UID' };
		}
		return { verdict: 'REVIEW', tier: 'B', reason: 'Compliance cert (confirm coach still active)' };
	}

	return { verdict: 'REVIEW', tier: 'B', reason: 'Unclassified canonical path' };
}

export function canonicalRulesNote(prefix) {
	const row = CANONICAL_PREFIXES.find((r) => prefix === r.prefix || prefix.startsWith(r.prefix));
	if (row) return { inRules: row.inRules, referencedIn: row.referencedIn };
	if (CANONICAL_PREFIXES.some((r) => prefix.startsWith(r.prefix.replace(/\/$/, '')))) {
		return { inRules: true, referencedIn: 'storage.rules (nested)' };
	}
	return { inRules: false, referencedIn: '—' };
}
