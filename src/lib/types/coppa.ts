/**
 * coppa.ts
 * ────────
 * COPPA 2026 / Privacy Shield — Parental Consent Flow
 *
 * ROLE HIERARCHY:
 *   Child (player, isMinor=true)  → requests consent via email
 *   Parent                        → receives link, verifies token, grants/denies
 *   Server (Cloud Functions)      → the ONLY actor that may flip coppaStatus
 *
 * ZERO-TRUST RULE:
 *   NO client-side write may ever set coppaStatus.
 *   The verifyParentalConsent CF is the sole write path.
 */

/** Timestamp type alias (matches Firestore Timestamp shape for compatibility). */
type FirestoreTimestamp = { toDate(): Date; seconds: number; nanoseconds: number };
type AnyTimestamp = FirestoreTimestamp | Date | string | null;

// ── Coppa Status ─────────────────────────────────────────────────────────────

export type CoppaStatus = 'pending' | 'granted' | 'denied';

export type ConsentAction = 'granted' | 'denied';

export type ConsentLogAction = 'email_sent' | 'granted' | 'denied' | 'expired' | 'resend';

// ── Schema: users/{email} additions ─────────────────────────────────────────

/**
 * COPPA-specific fields that live on the `users/{email}` Firestore document.
 * These fields are ONLY written by:
 *   - Cloud Function `syncUserClaims` (sets isMinor from dateOfBirth)
 *   - Cloud Function `verifyParentalConsent` (sets coppaStatus / consentDate)
 * Client writes are blocked by Firestore Security Rules.
 */
export interface CoppaUserFields {
  /** True when server has determined age < 13 based on dateOfBirth. */
  isMinor?: boolean;
  /** ISO date string or Firestore Timestamp — COPPA age calculation source. */
  dateOfBirth?: AnyTimestamp;
  /** Verified parent / guardian email (written by child during consent request). */
  parentEmail?: string;
  /** COPPA consent state. Default absent = 'pending' (no consent requested yet). */
  coppaStatus?: CoppaStatus;
  /** Server timestamp set by verifyParentalConsent when action == 'granted'. */
  consentDate?: FirestoreTimestamp | Date | null;
}

// ── Schema: consent_tokens/{token} ──────────────────────────────────────────

/**
 * Ephemeral one-time-use token document for email-based parental consent.
 * Document ID == token (32-char hex), allowing direct lookup with no query.
 *
 * Written by: sendParentalConsentEmail CF (Admin SDK).
 * Read by:    verifyParentalConsent CF (Admin SDK, inside transaction).
 * Expired by: TTL or `consumed: true` flag.
 */
export interface ConsentTokenDoc {
  /** The token itself (= document ID). */
  token: string;
  /** Firebase Auth UID of the child player. */
  childUid: string;
  /** Lowercase email key of the child (= users/{childEmail} doc path). */
  childEmail: string;
  /** Parent email that received the consent link. */
  parentEmail: string;
  /** Tenant (club) the child belongs to. */
  tenantId: string;
  /** Hard expiry (48 hours from creation). */
  expiresAt: FirestoreTimestamp | Date;
  /** True once verifyParentalConsent has committed this token. */
  consumed: boolean;
  /** ISO-8601 or Timestamp — when the CF wrote this doc. */
  createdAt: FirestoreTimestamp | Date;
}

// ── Schema: consent_logs/{autoId} ───────────────────────────────────────────

/**
 * Immutable audit record for every consent-flow event.
 * Written exclusively by Cloud Functions (Admin SDK).
 * Satisfies COPPA "digital signature" audit requirements.
 */
export interface ConsentLogDoc {
  id?: string;
  /** One of ConsentLogAction values. */
  action: ConsentLogAction;
  /** Firebase Auth UID of the child. */
  childUid: string;
  /** Lowercase email key of the child. */
  childEmail: string;
  /** Email of the parent who received / actioned the consent request. */
  parentEmail: string;
  /** Tenant the child belongs to. */
  tenantId: string;
  /** The one-time token that was used (for correlation across events). */
  consentToken: string;
  /** IP address of the actor who triggered the event (parent IP on verify). */
  ipAddress: string;
  /** HTTP User-Agent string (diagnostic only; not PII-indexed). */
  userAgent?: string;
  /** Server-side write timestamp — tamper-evident via Firestore server time. */
  timestamp: FirestoreTimestamp | Date;
}

// ── Client-side callable payloads ────────────────────────────────────────────

/** Input for `sendParentalConsentEmail` onCall CF. */
export interface SendConsentEmailInput {
  /** Parent / guardian email the link should be sent to. */
  parentEmail: string;
}

/** Input for `verifyParentalConsent` onCall CF (called from /consent/[token]). */
export interface VerifyConsentInput {
  /** 32-char hex token from the email link. */
  token: string;
  /** Parent's decision. */
  action: ConsentAction;
}

/** Successful response from `verifyParentalConsent`. */
export interface VerifyConsentResult {
  success: true;
  action: ConsentAction;
  /** Display name of child (from users doc). */
  childDisplayName?: string;
}

// ── Phase 2, Epic 3 — WebAuthn Biometric Attestation for COPPA consent ──────

/**
 * Age band for COPPA 2.0 compliance.
 * Computed server-side from dateOfBirth; stamped as JWT custom claim `ageBand`.
 * COPPA 2.0 / Children's Online Privacy Protection 2026 covers up to 16 inclusive.
 *
 *   under13   → age < 13   (strict COPPA; requires parental consent)
 *   teen13to16 → 13 ≤ age ≤ 16 (COPPA 2.0 teen; restricted ad sharing)
 *   adult      → age ≥ 17  (unrestricted)
 */
export type AgeBand = 'under13' | 'teen13to16' | 'adult';

/** Add ageBand to the users/{email} document shape. */
export interface AgeBandUserFields {
  /**
   * Age band computed from dateOfBirth by setPlayerDateOfBirth / playerSelfReportDob.
   * Written exclusively by Cloud Functions (Admin SDK).
   * Mirror of the `ageBand` JWT custom claim stamped by syncUserClaims.
   */
  ageBand?: AgeBand;
}

/**
 * Immutable WebAuthn biometric attestation record for a parental consent grant.
 * Stored at `coppa_attestations/{tokenId}` (tokenId = consent token doc ID).
 * Written exclusively by the `attestParentalConsent` Cloud Function (Admin SDK).
 * Readable by: platform admins, directors scoped to the child's tenant.
 *
 * Satisfies the COPPA "digital signature" requirement with hardware-bound
 * biometric proof of the parent's identity.
 */
export interface ConsentAttestationDoc {
  /** The consent_tokens document ID this attestation is bound to. */
  tokenId: string;
  /** Parent email that was verified (= consent_tokens.parentEmail). */
  parentEmail: string;
  /** Firebase Auth UID of the child whose consent was granted. */
  childUid: string;
  /** Tenant the child belongs to (for director-scoped rule reads). */
  tenantId: string;
  /** COSE public key extracted from authData, base64url-encoded. */
  publicKeyB64: string;
  /** Raw attestationObject from PublicKeyCredential.response, base64url. */
  attestationObjectB64: string;
  /** Raw clientDataJSON from PublicKeyCredential.response, base64url. */
  clientDataJSONB64: string;
  /** credential.id from PublicKeyCredential (stable identifier). */
  credentialIdB64: string;
  /** Relying Party ID used at attestation time (e.g. 'vanguard.app'). */
  rpId: string;
  /** Exact origin used at attestation time (e.g. 'https://vanguard.app'). */
  origin: string;
  /** Grant action ('granted' | 'denied'). */
  action: ConsentAction;
  /** IP address of the attesting parent (captured server-side). */
  parentIp: string;
  /** HTTP User-Agent of the attesting parent's browser. */
  parentUserAgent: string;
  /** Server timestamp when this attestation was committed. */
  attestedAt: FirestoreTimestamp | Date;
}

// ── WebAuthn callable payloads ───────────────────────────────────────────────

/** Input to `generateConsentAttestationChallenge` onCall. */
export interface GenerateConsentChallengeInput {
  /** The 64-char hex consent token from the email link. */
  token: string;
}

/** Result from `generateConsentAttestationChallenge`. */
export interface GenerateConsentChallengeResult {
  /** 32-byte cryptographically-random challenge, base64url-encoded. */
  challenge: string;
  /** WebAuthn Relying Party ID (hostname without port). */
  rpId: string;
  /**
   * 16-char opaque handle used as WebAuthn user.id.
   * Not the child UID — derived from the token to avoid leaking child PII.
   */
  userIdHandle: string;
  /** Display name for the parent (= parentEmail). */
  userName: string;
  /** Human-readable display name for the WebAuthn dialog. */
  userDisplayName: string;
}

/** Input to `attestParentalConsent` onCall. */
export interface AttestParentalConsentInput {
  /** The 64-char hex consent token. */
  token: string;
  /** Parent's decision. */
  action: ConsentAction;
  /** base64url-encoded attestationObject from PublicKeyCredential.response. */
  attestationObjectB64: string;
  /** base64url-encoded clientDataJSON from PublicKeyCredential.response. */
  clientDataJSONB64: string;
  /** credential.id from PublicKeyCredential. */
  credentialIdB64: string;
}

/** Result from `attestParentalConsent`. */
export interface AttestParentalConsentResult {
  success: true;
  action: ConsentAction;
  attestationStored: true;
  childDisplayName?: string;
}
