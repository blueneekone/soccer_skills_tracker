/**
 * inviteService.ts
 * ─────────────────
 * Client-side invite code generation and consumption for the multi-tenant
 * Nexus Command platform.
 *
 * Invite flow
 * ───────────
 *   GENERATION (coach / director)
 *   1. `generateInviteCode(role, tenantId, teamId?, usageLimit?)` →
 *      Writes a document to `invites/{code}` (the code IS the doc ID).
 *      Returns `{ code, expiresAt }`.
 *
 *   CONSUMPTION (new member)
 *   2. `consumeInviteCode(code)` →
 *      Delegates entirely to the `consumeInviteCode` Cloud Function which:
 *        a. Reads `invites/{code}` directly (no query, no index needed).
 *        b. Runs a Firestore transaction: validates expiry + usageCount,
 *           increments usageCount, writes the user doc, closes code if full.
 *        c. Calls setCustomUserClaims on the server.
 *        d. Returns { tenantId, role, teamId }.
 *      The client then force-refreshes the JWT so new claims are immediately active.
 *
 * Security notes
 * ──────────────
 * •  Codes are cryptographically random (Web Crypto API), 6 chars from a
 *    32-char alphabet → 32^6 ≈ 1.07 billion combinations.  Brute-force is
 *    infeasible within the 48-hour window.
 * •  The Cloud Function NEVER trusts a tenantId from the client — it always
 *    reads it from the invite document (Zero-Trust principle).
 * •  Collision handling: if a generated code already exists as a doc ID,
 *    the function retries up to 5 times (probability ≈ 1 in 10M per attempt).
 *
 * Schema: invites/{code}  (document ID = the 6-char code)
 * ──────────────────────────────────────────────────────────
 *   No composite Firestore index required — the CF reads by doc ID directly.
 */

import { browser } from '$app/environment';
import { auth, db, functions } from '$lib/firebase.js';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { InviteDoc, TenantRole } from '$lib/types/tenant';

// ── Constants ─────────────────────────────────────────────────────────────

/**
 * 32-character alphabet: uppercase letters and digits with visually ambiguous
 * characters removed (0, O, 1, I) — so operatives can read codes aloud.
 */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const INVITE_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically random 6-char invite code using Web Crypto.
 * Falls back to `Math.random` only if `crypto` is unavailable.
 */
function generateCode(): string {
	if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
		const bytes = new Uint8Array(CODE_LENGTH);
		crypto.getRandomValues(bytes);
		return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
	}
	return Array.from({ length: CODE_LENGTH }, () =>
		CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
	).join('');
}

// ── generateInviteCode ────────────────────────────────────────────────────

export type GenerateInviteResult = {
	/** The 6-character code to share with the recipient. Also the Firestore doc ID. */
	code: string;
	/** UTC expiry (48 h from now). */
	expiresAt: Date;
};

/**
 * Write a new invite document to `invites/{code}` and return the code.
 *
 * The code IS the Firestore document ID.  This eliminates any query-step
 * on the consumption side — the Cloud Function reads the doc directly.
 *
 * @param targetRole  Role assigned to the person who redeems.
 * @param tenantId    Club / organization ID (= `clubId` in Firestore).
 * @param teamId      Optional team scope for the new member.
 * @param usageLimit  Max redemptions (default 1; pass > 1 for squad invites).
 *
 * @example
 *   // Single-use coach invite
 *   const { code } = await generateInviteCode('coach', 'aggies-fc', 'team-u14');
 *
 *   // 20-use squad invite
 *   const { code } = await generateInviteCode('player', 'aggies-fc', 'team-u14', 20);
 */
export async function generateInviteCode(
	targetRole: TenantRole,
	tenantId: string,
	teamId?: string,
	usageLimit = 1,
): Promise<GenerateInviteResult> {
	if (!browser) throw new Error('[inviteService] generateInviteCode must run in the browser.');
	if (!auth.currentUser) throw new Error('[inviteService] Must be authenticated.');
	if (!tenantId) throw new Error('[inviteService] tenantId is required.');
	if (usageLimit < 1 || !Number.isInteger(usageLimit)) {
		throw new Error('[inviteService] usageLimit must be a positive integer.');
	}

	const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

	// Collision-resistant generation: try up to 5 codes (probability < 1 in 10M).
	let code = '';
	for (let attempt = 0; attempt < 5; attempt++) {
		const candidate = generateCode();
		const existing = await getDoc(doc(db, 'invites', candidate));
		if (!existing.exists()) {
			code = candidate;
			break;
		}
	}
	if (!code) throw new Error('[inviteService] Code generation failed — please retry.');

	const payload: Omit<InviteDoc, 'id'> = {
		code,
		tenantId,
		clubId: tenantId, // backward-compat alias for existing Firestore rules
		targetRole,
		createdBy: auth.currentUser.email ?? auth.currentUser.uid,
		expiresAt,
		usageLimit,
		usageCount: 0,     // field name matches directive spec
		consumedByUids: [],
		status: 'pending',
		...(teamId ? { teamId } : {}),
	};

	// setDoc with the code as document ID — no addDoc auto-ID needed.
	await setDoc(doc(db, 'invites', code), {
		...payload,
		createdAt: serverTimestamp(),
	});

	return { code, expiresAt };
}

// ── consumeInviteCode ─────────────────────────────────────────────────────

export type ConsumeInviteResult = {
	tenantId: string;
	role: TenantRole;
	teamId?: string | null;
};

/**
 * Validate and redeem an invite code.
 *
 * Delegates entirely to the `consumeInviteCode` Cloud Function which:
 *   • Reads `invites/{code}` by doc ID (no query).
 *   • Validates expiry, usageCount < usageLimit.
 *   • Atomically increments usageCount, updates the user doc.
 *   • Sets JWT custom claims directly (syncUserClaims trigger is the backstop).
 *
 * This client function is a thin adapter:
 *   1. Call the CF.
 *   2. Force-refresh the JWT so new claims are active immediately.
 *   3. Return the grant data.
 *
 * @param code  6-character code (case-insensitive).
 */
export async function consumeInviteCode(code: string): Promise<ConsumeInviteResult> {
	if (!browser) throw new Error('[inviteService] consumeInviteCode must run in the browser.');
	if (!auth.currentUser) throw new Error('[inviteService] Must be authenticated.');
	if (!code?.trim()) throw new Error('[inviteService] Code is required.');

	const consumeFn = httpsCallable<{ code: string }, ConsumeInviteResult>(
		functions,
		'consumeInviteCode',
	);

	let result: ConsumeInviteResult;
	try {
		const response = await consumeFn({ code: code.toUpperCase().trim() });
		result = response.data;
	} catch (fnErr: unknown) {
		const msg =
			fnErr instanceof Error ? fnErr.message : 'Failed to redeem invite. Please try again.';
		throw new Error(msg, { cause: fnErr });
	}

	// Force-refresh JWT — new claims (tenantId, role, teamId) active immediately.
	await auth.currentUser.getIdToken(/* forceRefresh */ true);

	return result;
}
