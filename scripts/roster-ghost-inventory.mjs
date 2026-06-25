#!/usr/bin/env node
/**
 * One-shot inventory for roster ghost cleanup on a team.
 * Read-only — no writes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const TEAM_ID = process.argv.find((a) => a.startsWith('--team-id='))?.slice(10) || 'qa_launch_2026_ppc';
const PROJECT_ID = 'sports-skill-tracker-dev';

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

const usersSnap = await db.collection('users').where('teamId', '==', TEAM_ID).where('role', '==', 'player').get();
const players = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

console.log(`\n=== Team ${TEAM_ID} player users (${players.length}) ===`);
for (const p of players) {
	console.log(`  users/${p.id}  uid=${p.uid || '(none)'}  name=${p.playerName || '(none)'}  email=${p.email || '(none)'}`);
}

const byUid = new Map();
for (const p of players) {
	if (!isValidUid(p.uid)) continue;
	const list = byUid.get(p.uid) || [];
	list.push(p);
	byUid.set(p.uid, list);
}
const uidDupes = [...byUid.entries()].filter(([, list]) => list.length > 1);
if (uidDupes.length) {
	console.log('\n=== A: Same auth uid on multiple docs ===');
	for (const [uid, list] of uidDupes) {
		console.log(`  uid=${uid}: ${list.map((p) => p.id).join(', ')}`);
	}
} else {
	console.log('\n=== A: No duplicate auth uids ===');
}

const byName = new Map();
for (const p of players) {
	const n = normName(p.playerName);
	if (!n) continue;
	const list = byName.get(n) || [];
	list.push(p);
	byName.set(n, list);
}
const nameDupes = [...byName.entries()].filter(([, list]) => list.length > 1);
if (nameDupes.length) {
	console.log('\n=== B: Same displayName duplicates ===');
	for (const [name, list] of nameDupes) {
		console.log(`  name=${name}:`);
		for (const p of list) {
			console.log(`    users/${p.id} uid=${p.uid || '(none)'} canonical=${p.id === p.uid ? 'YES' : 'no'}`);
		}
	}
} else {
	console.log('\n=== B: No duplicate display names ===');
}

const teamSnap = await db.collection('teams').doc(TEAM_ID).get();
const team = teamSnap.exists ? teamSnap.data() : null;
const playerUids = Array.isArray(team?.playerUids) ? team.playerUids : [];
console.log(`\n=== C: teams/${TEAM_ID}.playerUids (${playerUids.length}) ===`);
const survivingUids = new Set(players.filter((p) => isValidUid(p.uid)).map((p) => p.uid));
const orphanUids = playerUids.filter((u) => !survivingUids.has(u));
if (orphanUids.length) {
	console.log(`  ORPHANS: ${orphanUids.join(', ')}`);
} else if (playerUids.length) {
	console.log(`  all ${playerUids.length} uids match surviving player docs`);
} else {
	console.log('  (empty or unset)');
}

const rosterSnap = await db.collection('rosters').doc(TEAM_ID).get();
const rosterPlayers = rosterSnap.exists && Array.isArray(rosterSnap.data()?.players) ? rosterSnap.data().players : [];
console.log(`\n=== D: rosters/${TEAM_ID}.players (${rosterPlayers.length}) ===`);
const linkedNames = new Set(players.filter((p) => isValidUid(p.uid) && p.playerName).map((p) => normName(p.playerName)));
const nameGhosts = rosterPlayers.filter((n) => linkedNames.has(normName(n)));
if (nameGhosts.length) {
	console.log(`  NAME-ONLY GHOSTS (linked operative exists): ${nameGhosts.join(', ')}`);
} else {
	console.log(`  ${rosterPlayers.join(', ') || '(empty)'}`);
}

process.exit(0);
