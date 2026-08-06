/**
 * recreateTeam.cjs — Recreate aggiesfc_u16gew and link coach account
 */
'use strict';

const { readFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');
const admin = require('firebase-admin');

const keyPath = resolve(__dirname, '..', 'serviceAccountKey.json');
if (!existsSync(keyPath)) { console.error('Missing serviceAccountKey.json'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(readFileSync(keyPath, 'utf8'))) });

const db = admin.firestore();
const auth = admin.auth();

const CLUB_ID = 'aggiesfc';
const TEAM_ID = 'aggiesfc_u16gew';
const TEAM_NAME = 'Aggies FC 16G Grey';
const COACH_EMAIL = 'ecwaechtler+coach@gmail.com';

async function main() {
	console.log('═══ RECREATE TEAM & LINK COACH ═══\n');

	// 1. Recreate the team document
	const teamRef = db.collection('teams').doc(TEAM_ID);
	await teamRef.set({
		name: TEAM_NAME,
		clubId: CLUB_ID,
		sport: 'soccer',
		ageGroup: 'U16',
		gender: 'girls',
		coachEmail: COACH_EMAIL,
		createdAt: admin.firestore.FieldValue.serverTimestamp(),
	});
	console.log(`[OK] Created teams/${TEAM_ID} ("${TEAM_NAME}")`);

	// 2. Look up the coach's Auth UID
	let coachUid;
	try {
		const userRecord = await auth.getUserByEmail(COACH_EMAIL);
		coachUid = userRecord.uid;
		console.log(`[OK] Found coach auth: ${COACH_EMAIL} → uid: ${coachUid}`);
	} catch (e) {
		console.error(`[FATAL] Coach auth account not found: ${e.message}`);
		process.exit(1);
	}

	// 3. Update the coach's Firestore user doc with club + team linkage
	const userRef = db.collection('users').doc(coachUid);
	await userRef.set({
		email: COACH_EMAIL,
		role: 'coach',
		clubId: CLUB_ID,
		teamId: TEAM_ID,
	}, { merge: true });
	console.log(`[OK] Linked users/${coachUid} → clubId: "${CLUB_ID}", teamId: "${TEAM_ID}"`);

	// 4. Ensure custom claims include clubId
	await auth.setCustomUserClaims(coachUid, { role: 'coach', clubId: CLUB_ID });
	console.log(`[OK] Custom claims updated: role=coach, clubId=${CLUB_ID}`);

	// 5. Verify
	const verify = await auth.getUser(coachUid);
	console.log(`[VERIFIED] customClaims:`, verify.customClaims);

	const teamSnap = await teamRef.get();
	console.log(`[VERIFIED] teams/${TEAM_ID}:`, teamSnap.data());

	console.log('\n═══ DONE ═══');
}

main().catch((err) => { console.error('[FATAL]', err); process.exit(1); });
