/**
 * hotelPartner.ts
 * ────────────────
 * Phase 2, Epic 2 — Session B1: Hotel partner directory types.
 *
 * `hotel_partners/{partnerId}` stores authentication material (hashed keys,
 * signing secrets), contact info, and the NGB allowlist that gates which
 * tenants a partner can file rebates against.
 *
 * Security model:
 *   • Plain-text API key and signing secret are returned ONCE at provisioning
 *     via `provisionHotelPartner`.  After that, only hashed values are stored.
 *   • Partners identify themselves via:
 *       Authorization: Partner <partnerId>:<base64-encoded-api-key>
 *       X-Vanguard-Signature: <hex(HMAC-SHA256(rawBody, signingSecret))>
 *   • Super-admin may rotate keys via `rotateHotelPartnerKeys`.
 *     The previous key hash remains valid for 24h (grace window) via
 *     `previousApiKeyHashUntil` so the partner can roll keys without downtime.
 */

export type HotelPartnerStatus = 'active' | 'paused' | 'revoked';

/** Supported payload shapes — used by the adapter layer (Session B7). */
export type PartnerPayloadFormat = 'vanguard_v1' | 'marriott_v1' | 'hilton_v1';

/**
 * Shape of `hotel_partners/{partnerId}`.
 * Never returned to the partner directly — only super_admin can read.
 */
export interface HotelPartnerDoc {
	/** Document ID — also the `partnerId` field in requests. */
	id: string;
	/** Human display name (e.g. "Marriott Bonvoy"). */
	name: string;
	status: HotelPartnerStatus;

	// ── Authentication hashes ───────────────────────────────────────────
	/** `crypto.scrypt`-derived hash of the partner's API key. */
	apiKeyHash: string;
	/** `crypto.scrypt`-derived hash of the partner's signing secret. */
	signingSecretHash: string;
	/**
	 * Salt used in `crypto.scrypt` for the current key pair.
	 * 32 bytes, hex-encoded.
	 */
	keySalt: string;
	/**
	 * Previous API key hash — valid until this timestamp.
	 * Null when no rotation is in progress.
	 */
	previousApiKeyHash?: string | null;
	previousApiKeyHashUntil?: string | null;
	/**
	 * Previous signing secret hash — valid during the same rotation window.
	 */
	previousSigningSecretHash?: string | null;

	// ── Partner metadata ────────────────────────────────────────────────
	/** Contact emails for API issues / rotation notices. */
	contactEmails: string[];
	/**
	 * Payload format this partner sends.
	 * The adapter layer (Session B7) normalises to `vanguard_v1` before
	 * calling `submitHotelRebateRecord`.
	 */
	payloadFormat: PartnerPayloadFormat;
	/**
	 * Allowlist of NGB/tenant IDs this partner can file rebates for.
	 * The POST handler validates `nationalGoverningBodyId` is in this list.
	 * Empty = no restrictions (super_admin only partners).
	 */
	ngbAllowlist: string[];

	createdAt?: unknown;
	updatedAt?: unknown;
}

// ── Response types (returned once at provisioning) ────────────────────────

/**
 * One-time provisioning response containing plain-text credentials.
 * Never stored — the caller must save these securely.
 */
export interface HotelPartnerProvisionResult {
	partnerId: string;
	apiKey: string;
	signingSecret: string;
	note: string;
}
