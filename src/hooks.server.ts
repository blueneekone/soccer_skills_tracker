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
				const j = readFileSync(resolve(process.cwd(), 'serviceAccountKey.json'), 'utf8');
				initializeApp({ credential: cert(JSON.parse(j)) });
			} catch (e) {
				initializeApp({ credential: applicationDefault() });
			}
		}
	}
	return getAuth();
}

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    const sessionCookie = event.cookies.get('__session');
    const authHeader = event.request.headers.get('Authorization');
    const token = sessionCookie || (authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : null);

    event.locals.user = null;
    if (token) {
        try {
            const auth = ensureAdminAuth();
            const decodedToken = await auth.verifyIdToken(token);
            event.locals.user = {
                uid: decodedToken.uid,
                email: decodedToken.email,
                role: decodedToken.role || null,
                clubId: decodedToken.clubId || null
            };
        } catch (error) {
            console.error('[hooks.server.ts] Error decoding token:', error);
        }
    }

    const role = event.locals.user?.role;
    const path = event.url.pathname;

    if ((path.startsWith('/coach') && role !== 'coach') || (path.startsWith('/director') && role !== 'director')) {
        const isDataReq = event.request.headers.get('accept')?.includes('application/json') || event.isDataRequest;
        return new Response(null, { status: isDataReq ? 401 : 303, headers: isDataReq ? undefined : { location: '/login' } });
    }

    return await resolve(event);
}

/** @type {import('@sveltejs/kit').HandleServerError} */
export function handleError({ error, event, status, message }) {
    const err = error as (Error & { code?: string }) | undefined;
    const errorMessage = err?.message || message || 'An unexpected server error occurred.';
    console.error('[SvelteKit Server Error]', { status, path: event.url.pathname, message: errorMessage, error });
    return { message: errorMessage, status: status || 500 };
}
