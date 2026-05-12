/**
 * phoneVerification.ts
 * ─────────────────────
 * Phase 2, Epic 3 — Native Firebase Phone Number Verification.
 *
 * Type definitions for phone-verification-related fields on the
 * `users/{email}` Firestore document.  These fields are written
 * exclusively by the `mirrorPhoneVerification` and
 * `unlinkPhoneVerification` Cloud Functions via Admin SDK.
 * Client writes are blocked by Firestore Security Rules.
 *
 * JWT custom claim: `phoneVerified: true` is stamped by
 * `mirrorPhoneVerification` and preserved by `syncUserClaims`.
 * The claim is the SINGLE SOURCE OF TRUTH for rule-level gating.
 * The Firestore mirror (`phoneE164`, `phoneVerifiedAt`) is for
 * UI display only.
 */

/** @type alias for Firestore Timestamp compatibility. */
type AnyTimestamp = { toDate(): Date; seconds: number } | Date | string | null;

/**
 * Phone-verification fields that live on `users/{email}`.
 * Merged into the existing user document shape via `{ merge: true }`.
 * All fields optional so existing docs without phone are valid.
 */
export interface PhoneVerificationUserFields {
  /**
   * E.164 formatted phone number (+15555550123).
   * Present and non-null only when a phone has been verified.
   * Cleared to `null` by `unlinkPhoneVerification`.
   */
  phoneE164?: string | null;

  /**
   * Server timestamp written atomically when `mirrorPhoneVerification`
   * confirms a successful `confirmationResult.confirm()`.
   * Cleared to `null` by `unlinkPhoneVerification`.
   */
  phoneVerifiedAt?: AnyTimestamp;

  /**
   * Denormalised mirror of the `phoneVerified` JWT custom claim.
   * Kept in the Firestore doc so the auth store can display a
   * verified badge without a token force-refresh round-trip.
   * The JWT claim remains authoritative for security rules.
   */
  phoneVerified?: boolean;
}

// ── Mirror callable I/O ────────────────────────────────────────────────────

/** Input to `mirrorPhoneVerification` onCall. No user-supplied data needed —
 *  the phone number is read from `request.auth.token.phone_number`. */
export type MirrorPhoneVerificationInput = Record<string, never>;

/** Return value of `mirrorPhoneVerification`. */
export interface MirrorPhoneVerificationResult {
  phoneVerified: true;
  phoneE164: string;
}

/** Input to `unlinkPhoneVerification` onCall. */
export type UnlinkPhoneVerificationInput = Record<string, never>;

/** Return value of `unlinkPhoneVerification`. */
export interface UnlinkPhoneVerificationResult {
  phoneUnlinked: true;
}
