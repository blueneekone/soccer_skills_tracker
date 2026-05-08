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
