// 🛡️ SafeSport Compliance Mandate: Secure WebAuthn Verification Protocol Active
import { json, type RequestHandler } from '@sveltejs/kit';
import { getAdminDb } from '$lib/server/admin.js';

/**
 * Checks whether an account associated with an email requires passkey re-enrollment / biometric verification.
 */
async function checkPasskeyRequirement(email: string): Promise<boolean> {
	if (!email || typeof email !== 'string') return false;
	const cleanEmail = email.trim().toLowerCase();

	try {
		const db = getAdminDb();
		// Check user document by email key or query
		let userDoc = await db.collection('users').doc(cleanEmail).get();
		if (!userDoc.exists) {
			const snap = await db.collection('users').where('email', '==', cleanEmail).limit(1).get();
			if (!snap.empty) {
				userDoc = snap.docs[0];
			}
		}

		if (userDoc.exists) {
			const data = userDoc.data();
			if (data?.passkeyEnrolled === true) {
				return true;
			}
			const passkeysSnap = await userDoc.ref.collection('passkeys').limit(1).get();
			if (!passkeysSnap.empty) {
				return true;
			}
		}
	} catch (err) {
		console.warn('[magic-link-guard] Error checking passkey requirement:', err);
	}

	return false;
}

export const POST: RequestHandler = async ({ request }) => {
	let body: { email?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'INVALID_JSON', message: 'Invalid JSON payload' }, { status: 400 });
	}

	const email = body?.email;
	if (!email || typeof email !== 'string') {
		return json({ error: 'EMAIL_REQUIRED', message: 'Email is required' }, { status: 400 });
	}

	const isPasskeyRequired = await checkPasskeyRequirement(email);
	if (isPasskeyRequired) {
		return json(
			{
				error: 'PASSKEY_REQUIRED',
				message: 'Silent magic link fallback blocked. Biometric verification or re-enrollment required.'
			},
			{ status: 403 }
		);
	}

	return json({ success: true, message: 'Magic link dispatch authorized' });
};
