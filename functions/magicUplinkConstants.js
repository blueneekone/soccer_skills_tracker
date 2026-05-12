/**
 * magicUplinkConstants.js
 * ────────────────────────
 * CommonJS mirror of src/lib/types/magicUplink.ts constants.
 * Used by magicUplinks.js Cloud Functions.
 * Keep in sync with the TypeScript source.
 */

'use strict';

// ── TTL defaults (hours) per purpose ─────────────────────────────────────

/** @type {Record<string, number>} */
const TTL_HOURS_BY_PURPOSE = {
  player:    7 * 24,  // 7 days
  parent:    7 * 24,  // 7 days
  coach:    14 * 24,  // 14 days
  director: 14 * 24,  // 14 days
  registrar: 14 * 24, // 14 days
  recruiter: 30 * 24, // 30 days
};

/** Maximum TTL a caller may request (hours). */
const MAX_EXPIRY_HOURS = 30 * 24; // 30 days
/** Minimum TTL (hours). */
const MIN_EXPIRY_HOURS = 1;

// ── Token format ──────────────────────────────────────────────────────────

/** Bytes of randomness used for the tokenId part. */
const TOKEN_ID_BYTES = 20;
/** Bytes of randomness used for the secret part. */
const SECRET_BYTES = 32;
/** Bytes of randomness used for the scrypt salt. */
const SALT_BYTES = 32;
/** Separator between tokenId and secret in the URL. */
const TOKEN_SEPARATOR = '.';

// ── scrypt params (same as hotelPartnerOps.js for consistency) ────────────

const SCRYPT_N       = 16384;
const SCRYPT_R       = 8;
const SCRYPT_P       = 1;
const SCRYPT_KEY_LEN = 64;

// ── Rate-limit guard (per minter) ─────────────────────────────────────────

/**
 * Maximum number of un-consumed, un-revoked, un-expired uplinks a single
 * minter may have active for the same (targetEmail, purpose) pair before
 * mintMagicUplink rejects the request.
 */
const MAX_PENDING_PER_TRIPLE = 3;

// ── Post-redemption redirect map ──────────────────────────────────────────

/** @type {Record<string, string>} */
const REDIRECT_BY_PURPOSE = {
  player:    '/player/dashboard',
  parent:    '/parent/household',
  coach:     '/coach',
  director:  '/director',
  registrar: '/director',
  recruiter: '/recruiter',
};

// ── Lifecycle statuses ────────────────────────────────────────────────────

const STATUS = {
  PENDING:  'pending',
  CONSUMED: 'consumed',
  REVOKED:  'revoked',
  EXPIRED:  'expired',
};

// ── Audit actions ─────────────────────────────────────────────────────────

const AUDIT_ACTION = {
  MINTED:     'minted',
  DISPATCHED: 'dispatched',
  REDEEMED:   'redeemed',
  REVOKED:    'revoked',
  EXPIRED:    'expired',
};

// ── Dispatch channels ─────────────────────────────────────────────────────

const DISPATCH_CHANNEL = {
  EMAIL: 'email',
  SMS:   'sms', // reserved — Twilio fast-follow
};

// ── Exports ───────────────────────────────────────────────────────────────

module.exports = {
  TTL_HOURS_BY_PURPOSE,
  MAX_EXPIRY_HOURS,
  MIN_EXPIRY_HOURS,
  TOKEN_ID_BYTES,
  SECRET_BYTES,
  SALT_BYTES,
  TOKEN_SEPARATOR,
  SCRYPT_N,
  SCRYPT_R,
  SCRYPT_P,
  SCRYPT_KEY_LEN,
  MAX_PENDING_PER_TRIPLE,
  REDIRECT_BY_PURPOSE,
  STATUS,
  AUDIT_ACTION,
  DISPATCH_CHANNEL,
};
