#!/usr/bin/env node
/**
 * scripts/roster-ghost-cleanup.mjs
 * Team-scoped roster ghost cleanup per docs/vision/ROSTER_DEDUPE_RUNBOOK.md (sections A–D).
 *
 * Default: dry-run. Pass --execute to commit writes.
 *
 * Usage:
 *   node scripts/roster-ghost-cleanup.mjs --team-id=qa_launch_2026_ppc
 *   node scripts/roster-ghost-cleanup.mjs --team-id=qa_launch_2026_ppc --execute
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_PROJECT = 'sports-skill-tracker-dev';
const BLOCKED = new Set(['soccer-skills-tracker', 'soccer-skills-tracker-prod']);

const argv = process.argv.slice(2);
const hasFlag = (f) => argv.includes(f);
const flagVal = (f, fb) => {
	const hit = argv.find((a) => a.startsWith(`${f}=`));
	if (hit) return hit.slice(f.length + 1);
	const i = argv.indexOf(f);
	return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fb;
};

const TEAM_ID = flagVal('--team-id', 'qa_launch_2026_ppc');
const PROJECT_ID = flagVal('--project', DEFAULT_PROJECT);
const EXECUTE = hasFlag('--execute');

if (BLOCKED.has(PROJECT_ID)) {
	console.error(`[roster-ghost-cleanup] Refusing project "${PROJECT_ID}".`);
	process.exit(1);
}

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');
const sa = path.join(REPO_ROOT, 'serviceAccountKey.json');
if (fs.existsSync(sa)) {
	const raw = JSON.parse(fs.readFileSync(sa, 'utf8'));
	admin.initializeApp({ credential: admin.credential.cert(raw), projectId: raw.project_id || PROJECT_ID });
} else {
	admin.initializeApp({ projectId: PROJECT_ID });
}
const db = admin.firestore();

function normName(n) {
	return String(n || '').trim().toLowerCase();
}
function isValidUid(u) {
	return typeof u === 'string' && u.length > 0 && !u.includes('@');
}
function log(msg) {
	console.log(`[roster-ghost-cleanup] ${msg}`);
}

/**
 * Merge loser's non-null fields into winner (last-write-wins on empty winner fields).
 * @param {Record<string, unknown>} winner
 * @param {Record<string, unknown>} loser
 */
function mergeFields(winner, loser) {
	/** @type {Record<string, unknown>} */
	const patch = {};
	for (const [k, v] of Object.entries(loser || {})) {
		if (v === undefined || v === null || v === '') continue;
		const wv = winner[k];
		if (wv === undefined || wv === null || wv === '') patch[k] = v;
	}
	return patch;
}

async function main() {
	log(`project=${PROJECT_ID} team=${TEAM_ID} mode=${EXECUTE ? 'EXECUTE' : 'DRY-RUN'}`);

	const usersSnap = await db
		.collection('users')
		.where('teamId', '==', TEAM_ID)
		.where('role', '==', 'player')
		.get();
	const players = usersSnap.docs.map((d) => ({ ref: d.ref, id: d.id, data: d.data() || {} }));

	log(`player users on team: ${players.length}`);
	for (const p of players) {
		log(`  users/${p.id} uid=${p.data.uid || '(none)'} name=${p.data.playerName || '(none)'}`);
	}

	const linkedByUid = new Map();
	const linkedNames = new Set();
	for (const p of players) {
		if (isValidUid(p.data.uid)) linkedByUid.set(p.data.uid, p);
		const n = normName(p.data.playerName);
		if (n && isValidUid(p.data.uid)) linkedNames.add(n);
	}

	/** @type {Array<{ action: string, detail: string }>} */
	const plan = [];

	// A — same auth uid on multiple docs
	const byUidField = new Map();
	for (const p of players) {
		if (!isValidUid(p.data.uid)) continue;
		const list = byUidField.get(p.data.uid) || [];
		list.push(p);
		byUidField.set(p.data.uid, list);
	}
	for (const [uid, list] of byUidField) {
		if (list.length <= 1) continue;
		const winner =
			list.find((p) => p.id === uid) ||
			list.find((p) => isValidUid(p.id)) ||
			list[0];
		const losers = list.filter((p) => p.id !== winner.id);
		for (const loser of losers) {
			const patch = mergeFields(winner.data, loser.data);
			plan.push({
				action: 'merge-delete-user',
				detail: `merge users/${loser.id} → users/${winner.id} (${Object.keys(patch).length} fields) then delete loser`,
			});
			if (EXECUTE) {
				if (Object.keys(patch).length) await winner.ref.set(patch, { merge: true });
				await loser.ref.delete();
				log(`deleted ghost users/${loser.id}; survivor users/${winner.id}`);
			}
		}
	}

	// B — same displayName, keep uid-linked row
	const byName = new Map();
	for (const p of players) {
		const n = normName(p.data.playerName);
		if (!n) continue;
		const list = byName.get(n) || [];
		list.push(p);
		byName.set(n, list);
	}
	for (const [name, list] of byName) {
		if (list.length <= 1) continue;
		const scored = list.map((p) => ({
			p,
			score:
				(isValidUid(p.data.uid) ? 10 : 0) +
				(p.id === p.data.uid ? 5 : 0) +
				(p.id.includes('@') ? 0 : 2),
		}));
		scored.sort((a, b) => b.score - a.score);
		const winner = scored[0].p;
		for (const loser of scored.slice(1).map((s) => s.p)) {
			if (plan.some((x) => x.detail.includes(`users/${loser.id}`))) continue;
			const patch = mergeFields(winner.data, loser.data);
			plan.push({
				action: 'merge-delete-user',
				detail: `name-dupe "${name}": merge users/${loser.id} → users/${winner.id} then delete`,
			});
			if (EXECUTE) {
				if (Object.keys(patch).length) await winner.ref.set(patch, { merge: true });
				await loser.ref.delete();
				log(`deleted name-ghost users/${loser.id}; survivor users/${winner.id}`);
			}
		}
	}

	// C — teams.playerUids orphans
	const teamRef = db.collection('teams').doc(TEAM_ID);
	const teamSnap = await teamRef.get();
	const team = teamSnap.exists ? teamSnap.data() || {} : {};
	const playerUids = Array.isArray(team.playerUids) ? [...team.playerUids] : [];
	const survivingUids = new Set([...linkedByUid.keys()]);
	const orphanUids = playerUids.filter((u) => !survivingUids.has(u));
	if (orphanUids.length) {
		const cleaned = playerUids.filter((u) => survivingUids.has(u));
		plan.push({
			action: 'scrub-team-playerUids',
			detail: `remove orphan uids: ${orphanUids.join(', ')}`,
		});
		if (EXECUTE) {
			await teamRef.set({ playerUids: cleaned, updatedAt: new Date().toISOString() }, { merge: true });
			log(`teams/${TEAM_ID}.playerUids scrubbed → [${cleaned.join(', ')}]`);
		}
	}

	// D — rosters.players name-only ghosts when linked operative exists
	const rosterRef = db.collection('rosters').doc(TEAM_ID);
	const rosterSnap = await rosterRef.get();
	const rosterPlayers = rosterSnap.exists && Array.isArray(rosterSnap.data()?.players) ?
		[...rosterSnap.data().players] :
		[];
	const nameGhosts = rosterPlayers.filter((n) => linkedNames.has(normName(String(n || ''))));
	if (nameGhosts.length) {
		const cleaned = rosterPlayers.filter((n) => !linkedNames.has(normName(String(n || ''))));
		plan.push({
			action: 'scrub-roster-players',
			detail: `remove name-only ghosts from rosters/${TEAM_ID}.players: ${nameGhosts.join(', ')}`,
		});
		if (EXECUTE) {
			await rosterRef.set({ players: cleaned, updatedAt: new Date().toISOString() }, { merge: true });
			log(`rosters/${TEAM_ID}.players scrubbed → [${cleaned.join(', ') || '(empty)'}]`);
		}
	}

	// Stale operative_dispatches: same childEmail, wrong childUid vs surviving auth uid
	const childEmails = new Set(
		players
			.map((p) => String(p.data.email || p.id || '').trim().toLowerCase())
			.filter((e) => e.endsWith('@operative.local')),
	);
	for (const childEmail of childEmails) {
		const dispSnap = await db.collection('operative_dispatches').where('childEmail', '==', childEmail).get();
		if (dispSnap.size <= 1) continue;
		const canonicalUid = players.find((p) => normName(p.data.email || p.id) === childEmail)?.data?.uid;
		if (!isValidUid(canonicalUid)) continue;
		for (const d of dispSnap.docs) {
			const childUid = d.data()?.childUid;
			if (childUid === canonicalUid) continue;
			plan.push({
				action: 'delete-stale-dispatch',
				detail: `operative_dispatches/${d.id} childUid=${childUid} ≠ canonical ${canonicalUid}`,
			});
			if (EXECUTE) {
				await d.ref.delete();
				log(`deleted stale operative_dispatches/${d.id}`);
			}
		}
	}

	if (!plan.length) {
		log('nothing to clean — team roster is canonical');
		return;
	}

	log(`plan (${plan.length} action${plan.length === 1 ? '' : 's'}):`);
	for (const p of plan) log(`  [${p.action}] ${p.detail}`);
	if (!EXECUTE) {
		log('DRY-RUN complete — re-run with --execute to commit');
	}
}

main().catch((err) => {
	console.error('[roster-ghost-cleanup] FATAL:', err.stack || err.message || err);
	process.exit(1);
});
