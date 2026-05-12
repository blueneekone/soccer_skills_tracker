/**
 * /api/v1/[...path]/+server.ts — Vanguard API Gateway proxy
 * ───────────────────────────────────────────────────────────
 * Phase 1, Epic 1 — Cell-Based Routing, Session E.
 *
 * Why two entry points?
 * ─────────────────────
 * The Vanguard /v1 surface lives on the `apiGateway` Cloud Function
 * (`functions/apiGateway.js`).  Two routes reach it:
 *
 *   1.  Firebase Hosting rewrite       /v1/**  → apiGateway (Cloud Run)
 *       Works today with adapter-static.  See firebase.json rewrites.
 *
 *   2.  This SvelteKit route           /api/v1/**  → apiGateway
 *       Works with future adapter-node / adapter-vercel.  Required for
 *       any environment where SvelteKit owns the server runtime (e.g.
 *       enterprise deployments off of Firebase Hosting).
 *
 * Behavior identical at both: the proxy forwards method, body,
 * Authorization header, and X-Idempotency-Key transparently.  No
 * additional logic — the gateway already enforces auth, rate limits,
 * and idempotency.
 *
 * BUILD NOTE
 * ──────────
 * adapter-static skips this file at build time (it has no prerender
 * directive and uses dynamic route segments).  It is here for
 * adapter-node / adapter-vercel migration paths.  Until then, the
 * Firebase Hosting rewrite (firebase.json → /v1/**) is the active
 * path.
 */

import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

/**
 * The Cloud Run URL of the apiGateway Cloud Function.
 *
 * `firebase functions:secrets:set GATEWAY_FUNCTION_URL` so this is read
 * at runtime and not embedded into the build artifact.  The function's
 * URL is stable for the lifetime of the project — once set, never
 * rotates.
 */
function gatewayBaseUrl(): string {
	const explicit = env.GATEWAY_FUNCTION_URL;
	if (explicit) return explicit.replace(/\/$/, '');
	// Fallback for local development with `firebase emulators:start`.
	return 'http://127.0.0.1:5001/__functions/apiGateway';
}

/**
 * Forward an incoming SvelteKit request to the apiGateway Cloud
 * Function.  Pulls only the headers the gateway requires; strips
 * Cookie, X-Forwarded-*, and any other transport noise.
 */
async function proxy(event: Parameters<RequestHandler>[0]): Promise<Response> {
	const { request, params } = event;
	const subPath = params.path ?? '';
	const target = `${gatewayBaseUrl()}/v1/${subPath}${event.url.search}`;

	const forwardedHeaders = new Headers();
	const passthrough = ['authorization', 'content-type', 'x-idempotency-key'];
	for (const name of passthrough) {
		const value = request.headers.get(name);
		if (value) forwardedHeaders.set(name, value);
	}

	const init: RequestInit = {
		method: request.method,
		headers: forwardedHeaders,
		// Reuse the inbound body stream for non-GET/HEAD verbs.  `duplex`
		// is required by the WHATWG Fetch spec when streaming a body.
		...(request.method !== 'GET' && request.method !== 'HEAD'
			? { body: await request.arrayBuffer() }
			: {}),
	};

	const upstream = await fetch(target, init);

	// Pass status, body, and a curated subset of headers back to the
	// client.  Never forward Set-Cookie (the gateway never issues
	// cookies) or any *-Powered-By header.
	const responseHeaders = new Headers();
	const allowList = [
		'content-type',
		'content-length',
		'x-idempotency-replay',
		'x-request-id',
	];
	for (const name of allowList) {
		const value = upstream.headers.get(name);
		if (value) responseHeaders.set(name, value);
	}

	return new Response(upstream.body, {
		status: upstream.status,
		statusText: upstream.statusText,
		headers: responseHeaders,
	});
}

export const GET: RequestHandler = (event) => proxy(event);
export const POST: RequestHandler = (event) => proxy(event);
export const PUT: RequestHandler = (event) => proxy(event);
export const PATCH: RequestHandler = (event) => proxy(event);
export const DELETE: RequestHandler = (event) => proxy(event);
