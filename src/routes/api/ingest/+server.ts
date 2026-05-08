/**
 * src/routes/api/ingest/+server.ts — Universal Roster Ingestion API Route
 * ────────────────────────────────────────────────────────────────────────
 * NOTE: This route requires a SvelteKit server-side adapter.
 * The project currently uses `adapter-static` which does NOT support server routes.
 *
 * For production deployment with Firebase App Hosting (adapter-node):
 *   • Set `export const ssr = true;` in this route
 *   • Switch from `@sveltejs/adapter-static` to `@sveltejs/adapter-node`
 *   • Configure Firebase App Hosting to serve the Node.js app
 *
 * Alternatively, use the `ingestRoster` Cloud Function directly from the client.
 * The `RosterIngest.svelte` component already calls the CF — this route is
 * provided as a spec-complete implementation for App Hosting deployments.
 *
 * This endpoint accepts multipart/form-data with a `file` field and an optional
 * `teamId` field. It validates the director's auth, parses the file, and
 * batch-writes players to Firestore with invite codes.
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { env } from '$env/dynamic/private';
import crypto from 'crypto';

// ── Firebase Admin init — lazy, runtime-only ──────────────────────────────────
//
// WHY $env/dynamic/private:
//   $env/static/private is inlined at build time — the build crashes if the
//   variable is absent from the CI environment. $env/dynamic/private is read
//   at the first incoming request, so the build always succeeds regardless of
//   whether secrets are present in the build container.
//
// CREDENTIAL STRATEGY:
//   1. GCP / Firebase App Hosting: FIREBASE_SERVICE_ACCOUNT_JSON is absent →
//      falls back to applicationDefault() which uses the runtime service-account
//      identity automatically attached to every App Hosting instance.
//   2. Local dev / other hosts: set FIREBASE_SERVICE_ACCOUNT_JSON to the JSON
//      string and the cert() path is used instead.

function getAdminDb() {
	if (!getApps().length) {
		const saJson = env.FIREBASE_SERVICE_ACCOUNT_JSON;
		if (saJson) {
			const svc = JSON.parse(saJson);
			initializeApp({ credential: cert(svc) });
		} else {
			// Application Default Credentials — works automatically on GCP
			initializeApp({ credential: applicationDefault() });
		}
	}
	return getFirestore();
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Format = 'csv' | 'json' | 'pdf';

interface ParsedPlayer {
	email: string;
	displayName?: string;
	position?: string;
	dateOfBirth?: string;
	jerseyNumber?: string;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

const normEmail = (e: string) => e.trim().toLowerCase();
const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const generateCode = () =>
	crypto.randomBytes(4).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();

/**
 * Zero-dep CSV parser with quoted field support.
 */
function parseCsv(text: string): Record<string, string>[] {
	const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim());
	if (lines.length < 2) return [];

	function splitLine(line: string): string[] {
		const fields: string[] = [];
		let cur = '';
		let inQuotes = false;
		for (let i = 0; i < line.length; i++) {
			const ch = line[i];
			if (ch === '"') {
				if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
				else inQuotes = !inQuotes;
			} else if (ch === ',' && !inQuotes) {
				fields.push(cur.trim()); cur = '';
			} else {
				cur += ch;
			}
		}
		fields.push(cur.trim());
		return fields;
	}

	const headers = splitLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, '_'));
	return lines.slice(1).map((line) => {
		const vals = splitLine(line);
		const row: Record<string, string> = {};
		headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
		return row;
	}).filter((r) => Object.values(r).some((v) => v.trim()));
}

function mapRow(row: Record<string, string>): ParsedPlayer | null {
	const get = (...keys: string[]) => {
		for (const k of keys) {
			const v = row[k] ?? row[k.replace(/\s/g, '_')];
			if (v?.trim()) return v.trim();
		}
		return '';
	};
	const email = normEmail(get('email', 'email_address', 'player_email'));
	if (!email || !isValidEmail(email)) return null;
	return {
		email,
		displayName: get('name', 'full_name', 'player_name') ||
			`${get('first_name', 'first')} ${get('last_name', 'last')}`.trim() || undefined,
		position: get('position', 'pos') || undefined,
		dateOfBirth: get('dob', 'date_of_birth', 'birth_date') || undefined,
		jerseyNumber: get('number', 'jersey', 'jersey_number') || undefined,
	};
}

// ── POST handler ──────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request }) => {
	// Lazy-init Admin SDK — safe to call on every request (idempotent after first call)
	const db = getAdminDb();

	// Verify Firebase ID token from Authorization header
	const authHeader = request.headers.get('authorization') ?? '';
	if (!authHeader.startsWith('Bearer ')) {
		throw error(401, 'Authorization token required.');
	}
	const idToken = authHeader.slice(7);

	let decodedToken: Awaited<ReturnType<typeof getAuth>['verifyIdToken']>;
	try {
		decodedToken = await getAuth().verifyIdToken(idToken);
	} catch {
		throw error(401, 'Invalid or expired token.');
	}

	const role = decodedToken.role as string ?? '';
	const tenantId = (decodedToken.clubId ?? decodedToken.tenantId ?? '') as string;

	if (!['director', 'super_admin', 'global_admin'].includes(role)) {
		throw error(403, 'Director role required.');
	}
	if (!tenantId && role === 'director') {
		throw error(400, 'No tenantId on caller token.');
	}

	// Parse multipart form data
	const formData = await request.formData();
	const file = formData.get('file') as File | null;
	const teamId = (formData.get('teamId') as string | null) ?? null;

	if (!file) throw error(400, 'file field is required.');
	if (file.size > 5 * 1024 * 1024) throw error(413, 'File too large (max 5 MB).');

	// Detect format
	const name = file.name.toLowerCase();
	let format: Format;
	if (name.endsWith('.csv') || file.type === 'text/csv') format = 'csv';
	else if (name.endsWith('.json') || file.type === 'application/json') format = 'json';
	else if (name.endsWith('.pdf') || file.type === 'application/pdf') format = 'pdf';
	else throw error(415, 'Unsupported format. Upload .csv, .json, or .pdf.');

	// Parse players
	let players: ParsedPlayer[] = [];

	if (format === 'csv') {
		const text = await file.text();
		players = parseCsv(text).map(mapRow).filter(Boolean) as ParsedPlayer[];
	} else if (format === 'json') {
		const text = await file.text();
		const parsed = JSON.parse(text);
		const arr = Array.isArray(parsed) ? parsed : [parsed];
		players = arr.map(mapRow).filter(Boolean) as ParsedPlayer[];
	} else {
		// PDF: Delegate to Gemini via Cloud Function
		// For App Hosting server routes, we call the CF through the Admin SDK
		// rather than re-implementing the Gemini PDF extraction here.
		// This avoids duplicating the LLM prompt and keeps the logic in one place.
		throw error(501, 'PDF ingestion via server route requires the ingestRoster Cloud Function. Use RosterIngest.svelte which calls the CF directly.');
	}

	if (!players.length) throw error(422, 'No valid player records found (email required).');
	if (players.length > 200) throw error(422, 'Max 200 players per batch.');

	// Batch write to Firestore
	const batch = db.batch();
	const now = FieldValue.serverTimestamp();
	const invites: Array<{ email: string; code: string; name: string }> = [];
	let skipped = 0;

	for (const player of players) {
		const email = player.email;
		if (!isValidEmail(email)) { skipped++; continue; }

		const userRef = db.doc(`users/${email}`);
		const snap = await userRef.get();
		const userData = {
			email,
			displayName: player.displayName || email.split('@')[0],
			position: player.position ?? null,
			dateOfBirth: player.dateOfBirth ?? null,
			jerseyNumber: player.jerseyNumber ?? null,
			role: snap.exists ? (snap.data()?.role ?? 'player') : 'player',
			clubId: tenantId,
			tenantId,
			teamId: teamId ?? null,
			ingestedByUid: decodedToken.uid,
			ingestedAt: now,
			status: 'invited',
		};
		snap.exists ? batch.update(userRef, { ...userData, updatedAt: now }) : batch.set(userRef, { ...userData, createdAt: now, xp: 0, tier: 'ROOKIE' });

		const code = generateCode();
		batch.set(db.doc(`invites/${code}`), {
			code, tenantId, clubId: tenantId, teamId: teamId ?? null, role: 'player',
			usageLimit: 1, usageCount: 0, consumedByUids: [],
			targetEmail: email,
			createdByUid: decodedToken.uid,
			createdAt: now,
			expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
		});
		invites.push({ email, code, name: player.displayName ?? email });
	}

	await batch.commit();

	// Audit log
	await db.collection('audit_logs').add({
		action: 'ROSTER_INGESTED',
		actorUid: decodedToken.uid,
		tenantId,
		format,
		processed: invites.length,
		skipped,
		teamId: teamId ?? null,
		timestamp: now,
	});

	return json({ processed: invites.length, skipped, invites });
};
