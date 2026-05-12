/**
 * magicUplink.ts
 * ───────────────
 * Phase 2, Epic 3 — Passwordless Magic Uplinks (Email v1).
 *
 * A Magic Uplink is a single-use, time-locked invite token that lets a
 * director/coach onboard any role without ever setting a password.
 *
 * Token format: `<tokenId>.<base64url-secret>`
 *   - tokenId: 20 random bytes → base64url → used as Firestore doc ID
 *   - secret:  32 random bytes → base64url → travels in the email link ONLY
 *
 * Only `scrypt(secret, salt)` is stored in Firestore; the plain secret never
 * persists.  On redemption the CF re-derives the hash and compares with a
 * constant-time compare, then mints a Firebase custom token with pre-stamped
 * tenant claims.
 *
 * Schema is a superset of what email v1 needs: `dispatchChannel` reserves the
 * SMS slot; `phoneE164` is present for a Twilio fast-follow.
 */

// ── Purpose / lifecycle ───────────────────────────────────────────────────

/**
 * The intended recipient role.  Controls default TTL and the post-redemption
 * redirect destination.
 */
export type MagicUplinkPurpose =
	| 'player'
	| 'parent'
	| 'coach'
	| 'director'
	| 'registrar'
	| 'recruiter';

/** Lifecycle state of the uplink doc. */
export type MagicUplinkStatus = 'pending' | 'consumed' | 'revoked' | 'expired';

/** Dispatch medium — 'sms' is reserved for Twilio fast-follow. */
export type MagicUplinkDispatchChannel = 'email' | 'sms';

// ── Document shape ────────────────────────────────────────────────────────

/**
 * Shape of `magic_uplinks/{tokenId}`.
 *
 * Write rules: ALL writes are Admin SDK only (`mintMagicUplink`,
 * `redeemMagicUplink`, `revokeMagicUplink`, `purgeExpiredUplinks`).
 * Clients NEVER write this collection directly.
 */
export interface MagicUplinkDoc {
	/** Firestore doc ID — same as the `tokenId` segment of the uplink URL. */
	id: string;

	// ── Security material ───────────────────────────────────────────────
	/**
	 * `hex(scrypt(secret, salt, 64, {N:16384,r:8,p:1}))`.
	 * The plain `secret` NEVER persists anywhere after dispatch.
	 */
	tokenHash: string;
	/** 32-byte hex-encoded salt used for the scrypt derivation. */
	salt: string;

	// ── Dispatch metadata ───────────────────────────────────────────────
	dispatchChannel: MagicUplinkDispatchChannel;
	/** Lowercase email of the intended recipient. */
	targetEmail: string;
	/**
	 * E.164 phone number for the SMS fast-follow.
	 * Only set when `dispatchChannel === 'sms'`.
	 */
	phoneE164?: string;
	/** Firestore `mail/{docId}` doc ID returned by the Trigger Email write. */
	dispatchMessageId?: string;
	/** Server timestamp set after the mail doc was written. */
	dispatchedAt?: unknown;

	// ── Scope ───────────────────────────────────────────────────────────
	purpose: MagicUplinkPurpose;
	/** The JWT `role` claim stamped on first redemption. */
	role: string;
	/** Tenant / NGB. */
	tenantId?: string;
	clubId?: string;
	teamId?: string;
	/** For `parent` purpose — links parent to a specific household. */
	householdId?: string;

	// ── Lifecycle ───────────────────────────────────────────────────────
	status: MagicUplinkStatus;
	/** ISO-8601 expiry string (derived from `expiresAt` Firestore Timestamp). */
	expiresAt: unknown; // Firestore Timestamp
	mintedAt: unknown;
	mintedByUid: string;

	/** Set atomically by `redeemMagicUplink` transaction. */
	consumedAt?: unknown;
	consumedByUid?: string;

	/** Set by `revokeMagicUplink`. */
	revokedAt?: unknown;
	revokedByUid?: string;
}

// ── Audit event ───────────────────────────────────────────────────────────

export type MagicUplinkAuditAction = 'minted' | 'dispatched' | 'redeemed' | 'revoked' | 'expired';

/**
 * Shape of `magic_uplink_audit/{eventId}`.
 * Immutable audit trail — server writes only.
 */
export interface MagicUplinkAuditDoc {
	action: MagicUplinkAuditAction;
	tokenId: string;
	targetEmail: string;
	purpose: MagicUplinkPurpose;
	actorUid?: string;
	consumedByUid?: string;
	clubId?: string;
	tenantId?: string;
	timestamp: unknown;
	/** IP or CF region hint — populated by `redeemMagicUplink`. */
	redeemRegion?: string;
}

// ── Mint payload (used by client → mintMagicUplink callable) ──────────────

export interface MintMagicUplinkPayload {
	targetEmail: string;
	purpose: MagicUplinkPurpose;
	role: string;
	clubId?: string;
	teamId?: string;
	householdId?: string;
	tenantId?: string;
	/** Override the default TTL in hours. Must be 1–720 (30 days). */
	expiryHours?: number;
}

export interface MintMagicUplinkResult {
	tokenId: string;
	expiresAt: string; // ISO-8601
	dispatchMessageId: string;
}

// ── Redeem payload ────────────────────────────────────────────────────────

export interface RedeemMagicUplinkPayload {
	/** Full `<tokenId>.<secret>` string from the URL. */
	token: string;
}

export interface RedeemMagicUplinkResult {
	customToken: string;
	/** SvelteKit route to navigate to post sign-in. */
	redirectTo: string;
}
