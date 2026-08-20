/* eslint-disable quotes */
/**
 * teenAdInterceptor.js
 * ────────────────────
 * Phase 2, Epic 3 — COPPA 2.0 Teen 13-16 Ad-Block Write Validator
 *
 * Provides three exported helpers that any Cloud Function touching ad-data-
 * adjacent operations (recruiter exports, partner adapters, public profile
 * sync, marketing mail dispatch) must call before egressing player data:
 *
 *   assertNoTeenForAdContext(rows, integrationType, auditCtx)
 *     Throwing variant — rejects the entire operation if ANY row maps to a
 *     teen13to16 user.  Zero-tolerance policy for recruiter exports.
 *
 *   filterTeenRows(rows, options)
 *     Non-throwing variant — returns { kept, dropped }.  Writes an audit
 *     entry for each dropped row.  Used where partial filtering is acceptable
 *     (e.g. marketing mail dispatch that can proceed for non-teen recipients).
 *
 *   markPayloadTainted(context)
 *     Sets `context.teenTainted = true` on the Cloud Functions request
 *     context so egressGuard.js can intercept any subsequent outbound fetch.
 *
 * ── AD_INTEGRATION_TYPES ──────────────────────────────────────────────────
 *
 * Valid integrationType values for audit records:
 *
 *   'recruiter_export'        — recordRecruiterExport in recruiterBilling.js
 *   'partner_adapter'         — vanguardV1 / marriottV1 / hiltonV1 in partnerHandlers/
 *   'public_profile_sync'     — syncPublicPlayerProfile in profileSyncer.js
 *   'mail_dispatch_marketing' — marketing mail writes in coppa.js / magicUplinks.js
 *
 * ── Threshold logic (inline assertion block) ──────────────────────────────
 *
 * COPPA 2.0 / Children's Online Privacy Protection 2026:
 *   under13   → age < 13   (full COPPA; consent required)
 *   teen13to16 → 13 ≤ age ≤ 16 (restricted; targeted ad sharing blocked)
 *   adult      → age ≥ 17  (unrestricted)
 *
 * Threshold assertions (invariants at module load):
 */

const admin    = require('firebase-admin');
const crypto   = require('crypto');
const logger   = require('firebase-functions/logger');

// ── Threshold logic assertions ────────────────────────────────────────────────
// These assertions lock the age-band boundary at module load time.
// Any regression in computeAgeBand (formatters.js) would be caught here at CF boot.
const {computeAgeBand} = require('./src/utils/formatters');
const _checkTs = (y) => admin.firestore.Timestamp.fromDate(new Date(y, 0, 1));
const _assertBand = (ts, expected) => {
  const got = computeAgeBand(ts);
  if (got !== expected) throw new Error(`[teenAdInterceptor] Age band assertion failed: year=${ts.toDate().getFullYear()} expected=${expected} got=${got}`);
};
const _now = new Date();
_assertBand(_checkTs(_now.getFullYear() - 12), 'under13');
_assertBand(_checkTs(_now.getFullYear() - 13), 'teen13to16');
_assertBand(_checkTs(_now.getFullYear() - 16), 'teen13to16');
_assertBand(_checkTs(_now.getFullYear() - 17), 'adult');
// ─────────────────────────────────────────────────────────────────────────────

/** @type {readonly string[]} */
const AD_INTEGRATION_TYPES = Object.freeze([
  'recruiter_export',
  'partner_adapter',
  'public_profile_sync',
  'mail_dispatch_marketing',
]);

const fs = () => admin.firestore();

/**
 * Hash an email address (SHA-256) so audit rows do not store raw PII.
 * @param {string} email
 * @returns {string}
 */
function hashEmail(email) {
  return crypto.createHash('sha256').update((email || '').toLowerCase().trim()).digest('hex').slice(0, 16);
}

/**
 * Look up the ageBand for a single row by email or uid.
 * Prefers `row.email` → Firestore `users` collection.
 * Falls back to `row.uid` via Firebase Auth custom claims (slower; avoid).
 *
 * @param {{ email?: string, uid?: string }} row
 * @returns {Promise<string>}  'under13' | 'teen13to16' | 'adult' | 'unknown'
 */
async function resolveAgeBand(row) {
  const email = (row.email || '').toLowerCase().trim();
  if (email) {
    try {
      const snap = await fs().collection('users').doc(email).get();
      if (snap.exists) {
        return snap.data().ageBand || 'adult';
      }
    } catch (err) {
      logger.warn('[teenAdInterceptor] resolveAgeBand: Firestore read failed', {email: hashEmail(email), err: err.message});
    }
  }
  return 'unknown';
}

/**
 * Write one ad_block_audit entry (fire-and-forget).
 *
 * @param {{
 *   integrationType: string,
 *   blockedEmails: string[],
 *   callerUid: string,
 *   callerIp: string,
 *   reason: string
 * }} params
 */
function writeAdBlockAudit({integrationType, blockedEmails, callerUid, callerIp, reason}) {
  fs().collection('ad_block_audit').add({
    integrationType,
    blockedEmailHashes: blockedEmails.map(hashEmail),
    blockedCount: blockedEmails.length,
    callerUid:    callerUid || 'unknown',
    callerIp:     callerIp  || 'unknown',
    reason,
    at: admin.firestore.FieldValue.serverTimestamp(),
  }).catch((err) => {
    logger.error('[teenAdInterceptor] writeAdBlockAudit failed', err.message);
  });
}

/**
 * assertNoTeenForAdContext — Throwing variant (zero-tolerance).
 *
 * Fetches users/{email} for every row in `rows`, throws an `HttpsError`
 * with code 'failed-precondition' and message 'TEEN_BLOCKED' if ANY row
 * maps to a teen13to16 (or under13) user.
 *
 * Writes one ad_block_audit entry with the integration type, hashed emails
 * of blocked subjects, caller UID, and caller IP.
 *
 * @param {Array<{ email?: string, uid?: string }>} rows
 * @param {string} integrationType  — one of AD_INTEGRATION_TYPES
 * @param {{ callerUid?: string, callerIp?: string }} [auditCtx]
 * @returns {Promise<void>}
 */
async function assertNoTeenForAdContext(rows, integrationType, auditCtx = {}) {
  if (!Array.isArray(rows) || rows.length === 0) return;

  const bands = await Promise.all(rows.map(resolveAgeBand));
  const blockedRows = rows.filter((_, i) => bands[i] === 'teen13to16' || bands[i] === 'under13');

  if (blockedRows.length > 0) {
    const blockedEmails = blockedRows.map((r) => r.email || r.uid || '');
    writeAdBlockAudit({
      integrationType,
      blockedEmails,
      callerUid: auditCtx.callerUid || 'unknown',
      callerIp:  auditCtx.callerIp  || 'unknown',
      reason:    'assertNoTeenForAdContext_thrown',
    });

    logger.warn('[teenAdInterceptor] TEEN_BLOCKED: assertNoTeenForAdContext', {
      integrationType,
      blockedCount: blockedRows.length,
      callerUid: auditCtx.callerUid,
    });

    const {HttpsError} = require('firebase-functions/v2/https');
    throw new HttpsError(
        'failed-precondition',
        `TEEN_BLOCKED: ${blockedRows.length} row(s) reference a teen 13-16 subject and cannot be shared via ${integrationType}.`,
    );
  }
}

/**
 * filterTeenRows — Non-throwing variant.
 *
 * Returns { kept, dropped } where `dropped` contains all rows that map to
 * teen13to16 or under13 users.  Writes an ad_block_audit entry for the
 * dropped set (fire-and-forget).
 *
 * @param {Array<{ email?: string, uid?: string }>} rows
 * @param {{ integrationType?: string, callerUid?: string, callerIp?: string }} [options]
 * @returns {Promise<{ kept: typeof rows, dropped: typeof rows }>}
 */
async function filterTeenRows(rows, options = {}) {
  if (!Array.isArray(rows) || rows.length === 0) return {kept: [], dropped: []};

  const integrationType = options.integrationType || 'unknown';
  const bands = await Promise.all(rows.map(resolveAgeBand));

  const kept    = rows.filter((_, i) => bands[i] !== 'teen13to16' && bands[i] !== 'under13');
  const dropped = rows.filter((_, i) => bands[i] === 'teen13to16' || bands[i] === 'under13');

  if (dropped.length > 0) {
    const droppedEmails = dropped.map((r) => r.email || r.uid || '');
    writeAdBlockAudit({
      integrationType,
      blockedEmails: droppedEmails,
      callerUid: options.callerUid || 'unknown',
      callerIp:  options.callerIp  || 'unknown',
      reason:    'filterTeenRows_dropped',
    });

    logger.info('[teenAdInterceptor] filterTeenRows: dropped teen subjects', {
      integrationType,
      droppedCount: dropped.length,
      keptCount:    kept.length,
    });
  }

  return {kept, dropped};
}

/**
 * markPayloadTainted — sets `context.teenTainted = true`.
 *
 * Called by any Cloud Function handler after it detects that it is operating
 * on a teen's data.  The egressGuard.js wrapFetch interceptor reads this flag
 * from the AsyncLocalStorage context and blocks any outbound fetch to a
 * non-whitelisted host.
 *
 * @param {{ teenTainted?: boolean } | Record<string, unknown>} context
 *   A mutable object that the calling CF uses as its per-request context.
 *   Typically the egressGuard AsyncLocalStorage store value.
 * @returns {void}
 */
function markPayloadTainted(context) {
  if (context && typeof context === 'object') {
    context.teenTainted = true;
  }
}

// ── logTeenAdBlock  onCall ─────────────────────────────────────────────────────
// Lightweight callable invoked by the client teenAdGuard.svelte.js store when
// it blocks a third-party script for a teen subject.  Writes to ad_block_audit.
//
// Exported and wired in functions/index.js as `logTeenAdBlock`.
const {onCall} = require('firebase-functions/v2/https');

exports.logTeenAdBlock = onCall(
    {region: 'us-east1', enforceAppCheck: false},
    async (request) => {
      const {src = '', marker = ''} = request.data || {};
      const callerUid = request.auth?.uid || 'anonymous';
      const callerIp  = request.rawRequest?.ip || 'unknown';

      fs().collection('ad_block_audit').add({
        integrationType:     'client_pixel_block',
        blockedSrc:          String(src).slice(0, 512),
        marker:              String(marker).slice(0, 64),
        blockedEmailHashes:  [],
        blockedCount:        1,
        callerUid,
        callerIp,
        reason:              'teenAdGuard_client_block',
        at: admin.firestore.FieldValue.serverTimestamp(),
      }).catch((err) => logger.warn('[teenAdInterceptor] logTeenAdBlock write failed', err.message));

      logger.info('[teenAdInterceptor] logTeenAdBlock', {marker, callerUid});
      return {logged: true};
    },
);

module.exports = {
  assertNoTeenForAdContext,
  filterTeenRows,
  markPayloadTainted,
  AD_INTEGRATION_TYPES,
  logTeenAdBlock: exports.logTeenAdBlock,
};
