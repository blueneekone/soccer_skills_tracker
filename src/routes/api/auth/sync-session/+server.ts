import { json } from '@sveltejs/kit';
import { getAuth } from 'firebase-admin/auth';
import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { env } from '$env/dynamic/private';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function ensureAdminAuth() {
	if (!getApps().length) {
		const saJson = env.FIREBASE_SERVICE_ACCOUNT_JSON;
		if (saJson) {
			initializeApp({ credential: cert(JSON.parse(saJson)) });
		} else {
			try {
				const keyPath = resolve(process.cwd(), 'serviceAccountKey.json');
				const json = readFileSync(keyPath, 'utf8');
				initializeApp({ credential: cert(JSON.parse(json)) });
			} catch (e) {
				initializeApp({ credential: applicationDefault() });
			}
		}
	}
	return getAuth();
}

export async function POST({ request, cookies }) {
    try {
        const body = await request.json();
        const idToken = body?.idToken;

        if (!idToken) {
            return json({ status: 'error', message: 'Missing idToken' }, { status: 400 });
        }

        const auth = ensureAdminAuth();
        await auth.verifyIdToken(idToken);

        const expiresIn = 60 * 60 * 24 * 5 * 1000;
        const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

        cookies.set('__session', sessionCookie, {
            maxAge: expiresIn / 1000,
            httpOnly: true,
            secure: true,
            path: '/',
            sameSite: 'lax'
        });

        return json({ status: 'success' });
    } catch (error) {
        console.error('[sync-session] Error:', error);
        return json({ status: 'error', message: 'Failed to sync session' }, { status: 401 });
    }
}
