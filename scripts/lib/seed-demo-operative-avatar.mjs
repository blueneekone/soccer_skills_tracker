/**
 * Idempotent demo avatar seed for QA operative — precomposed bust match (no avatar builder).
 * Used by scripts/seed-demo-operative-avatar.mjs and dev-tenant-reset --reset-demo-stats.
 */

export const DEMO_PRECOMPOSED_BUST_ID = 'precomposed_bust_demo_teen_home';

/** v2 parts matching precomposed.config.json → generate-portrait-manifest matchParts */
export const DEMO_OPERATIVE_MATCH_PARTS = Object.freeze({
	face: 'portrait_face_teen_light_default',
	hair: 'portrait_hair_teen_long',
	kit: 'portrait_kit_home',
});

/** Teen starter catalog ids + home kit — sufficient for Studio + holo compose */
export const DEMO_OWNED_PORTRAIT_PARTS = Object.freeze([
	'portrait_face_teen_light_default',
	'portrait_face_teen_medium_default',
	'portrait_face_teen_tan_default',
	'portrait_face_teen_deep_default',
	'portrait_hair_teen_long',
	'portrait_hair_teen_ponytail',
	'portrait_hair_teen_crop',
	'portrait_kit_home',
	'portrait_kit_away',
	'portrait_kit_default',
]);

/**
 * @returns {import('firebase-admin/firestore').UpdateData}
 */
export function buildDemoAvatarMergePayload() {
	return {
		operativeAvatar: {
			v: 2,
			parts: {...DEMO_OPERATIVE_MATCH_PARTS},
			bodyScale: 'teen',
		},
		ownedPortraitParts: [...DEMO_OWNED_PORTRAIT_PARTS],
		demoPrecomposedBustId: DEMO_PRECOMPOSED_BUST_ID,
		updatedAt: new Date().toISOString(),
	};
}

/**
 * @param {import('firebase-admin').firestore.Firestore} db
 * @param {string} operativeEmail normalized email
 * @param {boolean} dryRun
 */
export async function seedDemoOperativeAvatar(db, operativeEmail, dryRun) {
	if (!operativeEmail) throw new Error('operativeEmail required');
	const userRef = db.collection('users').doc(operativeEmail);
	const snap = await userRef.get();
	if (!snap.exists) {
		throw new Error(`users/${operativeEmail} not found — link operative via household first`);
	}
	const payload = buildDemoAvatarMergePayload();
	if (dryRun) {
		return { operativeEmail, payload, wrote: false };
	}
	await userRef.set(payload, { merge: true });
	return { operativeEmail, payload, wrote: true };
}
