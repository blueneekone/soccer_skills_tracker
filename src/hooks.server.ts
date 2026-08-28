import { getAdminDb } from '$lib/server/admin';
import { getAuth } from 'firebase-admin/auth';
import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { env } from '$env/dynamic/private';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Helper to ensure admin is initialized (using the same logic as admin.js)
function ensureAdminAuth() {
	if (!getApps().length) {
		const saJson = env.FIREBASE_SERVICE_ACCOUNT_JSON;
		if (saJson) {
			const svc = JSON.parse(saJson);
			initializeApp({ credential: cert(svc) });
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

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    // Attempt to read session cookie or Authorization header
    const sessionCookie = event.cookies.get('__session');
    const authHeader = event.request.headers.get('Authorization');
    const token = sessionCookie || (authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : null);

    if (token) {
        try {
            const auth = ensureAdminAuth();
            const decodedToken = await auth.verifyIdToken(token);
            // Hydrate the event locals with the decoded token and custom claims
            event.locals.user = {
                uid: decodedToken.uid,
                email: decodedToken.email,
                role: decodedToken.role || null,
                clubId: decodedToken.clubId || null
            };
        } catch (error) {
            console.error('[hooks.server.ts] Error decoding token:', error);
            event.locals.user = null;
        }
    } else {
        event.locals.user = null;
    }

    const response = await resolve(event);
    return response;
}

/** @type {import('@sveltejs/kit').HandleServerError} */
export function handleError({ error, event, status, message }) {
    const err = error as (Error & { code?: string }) | undefined;
    const errorMessage = err?.message || message || 'An unexpected server error occurred.';
    console.error('[SvelteKit Server Error]', {
        status,
        path: event.url.pathname,
        message: errorMessage,
        stack: err?.stack,
        error,
    });
    return {
        message: errorMessage,
        status: status || 500,
    };
}
