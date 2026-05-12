/**
 * apiClient.svelte.ts
 * ────────────────────
 * Thin client for the Vanguard /v1/* API Gateway.
 *
 * Phase 1, Epic 1 — Cell-Based Routing, Session E
 *
 * Responsibilities
 * ────────────────
 *   • Attach the current Firebase ID token as `Authorization: Bearer …`.
 *   • Auto-mint an X-Idempotency-Key for every mutating request.
 *   • Surface 429 rate-limit responses with a `RateLimitError` typed
 *     exception so callers can render a polite "try again in a moment"
 *     toast without parsing JSON.
 *   • Transparent retry on 401: refresh the ID token and replay once.
 *
 * Non-responsibilities
 * ────────────────────
 *   • The client does NOT pick a cell.  The gateway reads cellId from
 *     the JWT and routes server-side.  Clients only need the token.
 *
 *   • The client does NOT batch.  For multi-document atomic writes use
 *     `$lib/services/writes.svelte.ts` which talks directly to
 *     Firestore for offline-safe writeBatch semantics.
 *
 * Naming convention
 * ─────────────────
 * Methods are named after HTTP verbs to make the call site read like
 * the wire protocol:
 *
 *   const cell = await api.get<{cellId: string}>('cells/me');
 *   await api.post('drill_completions', { drillId, xp });
 */

import { browser } from '$app/environment';
import { auth } from '$lib/firebase.js';

/**
 * Base URL for the /v1 surface.  Falls back to `/v1` (Firebase Hosting
 * rewrite) when not explicitly set — the production deployment routes
 * `/v1/**` to the apiGateway Cloud Function automatically.
 */
const GATEWAY_BASE = '/v1';

/** Mint a UUID v4 client-side for idempotency keys. */
function nextIdempotencyKey(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Thrown when the gateway returns a 429 Too Many Requests response.
 * Distinguished from generic ApiError so UI code can render rate
 * limit warnings without parsing the body.
 */
export class RateLimitError extends Error {
	scope: 'uid' | 'cell';
	retryAfter: number;
	constructor(scope: 'uid' | 'cell', retryAfter: number) {
		super(`Rate limited (${scope}); retry in ${retryAfter}s.`);
		this.name = 'RateLimitError';
		this.scope = scope;
		this.retryAfter = retryAfter;
	}
}

/** Generic gateway error — 4xx / 5xx other than 429. */
export class ApiError extends Error {
	status: number;
	body: unknown;
	constructor(status: number, body: unknown) {
		super(typeof body === 'object' && body && 'message' in body
			? String((body as Record<string, unknown>).message)
			: `HTTP ${status}`);
		this.name = 'ApiError';
		this.status = status;
		this.body = body;
	}
}

/**
 * Read the current user's ID token, force-refreshing if requested.
 * Returns `null` if no user is signed in — the gateway will reject
 * the request with 401 but it's the caller's responsibility to
 * surface a sign-in prompt.
 */
async function getIdToken(forceRefresh = false): Promise<string | null> {
	if (!browser) return null;
	const user = auth.currentUser;
	if (!user) return null;
	try {
		return await user.getIdToken(forceRefresh);
	} catch {
		return null;
	}
}

/**
 * Issue a single request to the gateway.  Handles auth refresh on 401
 * exactly once before giving up.
 */
async function send<T>(
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
	path: string,
	body?: unknown,
	opts: { idempotencyKey?: string } = {},
): Promise<T> {
	const url = `${GATEWAY_BASE}/${path.replace(/^\//, '')}`;
	const mutates = method !== 'GET';
	const idemKey = mutates
		? (opts.idempotencyKey ?? nextIdempotencyKey())
		: undefined;

	const doFetch = async (token: string | null): Promise<Response> => {
		const headers: Record<string, string> = {};
		if (token) headers['Authorization'] = `Bearer ${token}`;
		if (body !== undefined) headers['Content-Type'] = 'application/json';
		if (idemKey) headers['X-Idempotency-Key'] = idemKey;

		return fetch(url, {
			method,
			headers,
			body: body === undefined ? undefined : JSON.stringify(body),
		});
	};

	let token = await getIdToken(false);
	let res = await doFetch(token);

	// Transparent retry once on 401 — refresh the token and replay
	// using the SAME idempotency key, so the gateway dedup record
	// recognises this as a retry, not a duplicate request.
	if (res.status === 401) {
		token = await getIdToken(true);
		res = await doFetch(token);
	}

	if (res.status === 429) {
		const parsed = await res.json().catch(() => ({}));
		throw new RateLimitError(
			parsed.scope === 'cell' ? 'cell' : 'uid',
			typeof parsed.retryAfter === 'number' ? parsed.retryAfter : 1,
		);
	}

	if (!res.ok) {
		const parsed = await res.json().catch(() => null);
		throw new ApiError(res.status, parsed);
	}

	if (res.status === 204) return undefined as unknown as T;
	return res.json() as Promise<T>;
}

/**
 * Public client.  Use the verb method that matches the gateway
 * route's contract.  TypeScript generics let the caller declare the
 * expected response shape:
 *
 *   const { cellId } = await api.get<{cellId: string}>('cells/me');
 */
export const api = {
	get<T = unknown>(path: string): Promise<T> {
		return send<T>('GET', path);
	},
	post<T = unknown>(path: string, body?: unknown, opts?: { idempotencyKey?: string }): Promise<T> {
		return send<T>('POST', path, body, opts);
	},
	put<T = unknown>(path: string, body?: unknown, opts?: { idempotencyKey?: string }): Promise<T> {
		return send<T>('PUT', path, body, opts);
	},
	patch<T = unknown>(path: string, body?: unknown, opts?: { idempotencyKey?: string }): Promise<T> {
		return send<T>('PATCH', path, body, opts);
	},
	delete<T = unknown>(path: string, opts?: { idempotencyKey?: string }): Promise<T> {
		return send<T>('DELETE', path, undefined, opts);
	},
};
