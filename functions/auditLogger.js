/* eslint-disable quotes */
/**
 * auditLogger.js
 * ─────────────
 * Canonical audit activity logger for all Cloud Functions.
 * Supersedes the per-module `logAuditEvent` helpers.
 *
 * Every call writes one document to `audit_logs/{autoId}` using the Admin SDK,
 * which bypasses Firestore Security Rules — making the log IMMUTABLE from any
 * client perspective (rules block all client writes).
 *
 * Schema (v2) — audit_logs/{autoId}:
 * ─────────────────────────────────
 *   action          string     — ACTIVITY_TYPE constant (see below)
 *   actorUid        string     — Firebase Auth UID of the actor
 *   actorEmail      string?    — actor's email (PII, platform admin only)
 *   targetUid       string?    — UID of the subject (player, if applicable)
 *   targetEmail     string?    — subject's email (PII)
 *   tenantId        string     — canonical club / tenant scope
 *   documentType    string?    — e.g. 'BIRTH_CERTIFICATE', 'PHOTO_ID'
 *   ipAddress       string     — extracted server-side from rawRequest.ip
 *   notes           string?    — human-readable context
 *   extra           object?    — additional structured metadata
 *   schemaVersion   number     — 2 (v1 = legacy per-module logAuditEvent)
 *   timestamp       Timestamp  — server-side, tamper-evident
 *
 * USAGE (in any Cloud Function file):
 *   const { logActivity, ACTIVITY_TYPE } = require('./auditLogger');
 *   logActivity(ACTIVITY_TYPE.VIEW_PII, {
 *     actorUid, actorEmail, targetUid, targetEmail,
 *     tenantId, documentType: 'BIRTH_CERTIFICATE',
 *     ipAddress: request.rawRequest.ip,
 *   });
 *
 * COMPLIANCE NOTE:
 *   audit_logs is restricted in Firestore Rules:
 *     • Platform admins: full read
 *     • Directors: read own tenant's logs
 *     • Child players: read their own consent logs
 *     • All clients: create/update/delete = false
 *   This ensures the log is a tamper-evident compliance record.
 */

const admin = require('firebase-admin');
const logger = require('firebase-functions/logger');

// ─────────────────────────────────────────────────────────────────────────────
// Activity type constants — use these for all logActivity() calls to ensure
// consistent naming across the entire audit trail.
// ─────────────────────────────────────────────────────────────────────────────

const ACTIVITY_TYPE = Object.freeze({
  // ── PII access ──────────────────────────────────────────────────────────
  /** Director requested a signed URL to view a private player document. */
  VIEW_PII: 'VIEW_PII',
  /** Director downloaded a private player document (signed URL was used). */
  DOWNLOAD_PII: 'DOWNLOAD_PII',

  // ── Identity & tenant lifecycle ──────────────────────────────────────────
  /** JWT custom claims were synced after a Firestore users/{email} write. */
  CLAIMS_SYNCED: 'CLAIMS_SYNCED',
  /** JWT claims were revoked when clubId was removed from a user doc. */
  CLAIMS_REVOKED: 'CLAIMS_REVOKED',
  /** Blocked attempt to grant global_admin/super_admin to a non-whitelisted email. */
  ADMIN_CLAIM_BLOCKED: 'ADMIN_CLAIM_BLOCKED',
  /** Tenant access was explicitly revoked by removing clubId from user doc. */
  TENANT_REVOKED: 'TENANT_REVOKED',

  // ── Invite lifecycle ─────────────────────────────────────────────────────
  /** An invite code was successfully consumed and claims were set. */
  INVITE_CONSUMED: 'INVITE_CONSUMED',
  /** An invite code was rejected because it expired. */
  INVITE_EXPIRED: 'INVITE_EXPIRED',
  /** An invite code was rejected because its usageLimit was reached. */
  INVITE_EXHAUSTED: 'INVITE_EXHAUSTED',
  /** An invite code consumption was a no-op (already consumed by this uid). */
  INVITE_IDEMPOTENT: 'INVITE_IDEMPOTENT_RETRY',

  // ── COPPA 2026 consent ───────────────────────────────────────────────────
  /** A consent email was sent to the parent / guardian. */
  CONSENT_EMAIL_SENT: 'CONSENT_EMAIL_SENT',
  /** Parent granted consent → coppaStatus='granted', vpcVerified=true. */
  CONSENT_GRANTED: 'CONSENT_GRANTED',
  /** Parent denied consent → coppaStatus='denied'. */
  CONSENT_DENIED: 'CONSENT_DENIED',
  /** A consent token expired before the parent responded. */
  CONSENT_EXPIRED: 'CONSENT_EXPIRED',

  // ── Data manipulation ────────────────────────────────────────────────────
  /**
   * A coach manually overrode a player's recorded stat.
   * Metadata should include: { statKey, oldValue, newValue, reason }.
   * Call this from the updateStat / coachStatOverride Cloud Function.
   */
  STAT_OVERRIDE: 'STAT_OVERRIDE',

  // ── SafeSport communication ──────────────────────────────────────────────
  /** A team/group broadcast was sent via the SafeSport-compliant channel. */
  MESSAGE_BROADCAST: 'MESSAGE_BROADCAST',
  /** A 1-on-1 message to a minor was BLOCKED by the SafeSport engine. */
  DM_MINOR_BLOCKED: 'DM_MINOR_BLOCKED',

  // ── PII Burn Protocol ────────────────────────────────────────────────────
  /** Director verified a sensitive document (birth cert, photo ID, etc.). */
  DOCUMENT_VERIFIED: 'DOCUMENT_VERIFIED',
  /** Scheduled 24-hour burn: file was deleted from Firebase Storage. */
  DOCUMENT_BURNED: 'DOCUMENT_BURNED',
  /** Burn execution failed (Storage error). */
  DOCUMENT_BURN_FAILED: 'DOCUMENT_BURN_FAILED',
});

// ─────────────────────────────────────────────────────────────────────────────
// logActivity — the canonical write path for the audit trail
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Write a structured activity event to `audit_logs/{autoId}`.
 *
 * Fire-and-forget pattern:
 *   The returned Promise is intentionally NOT awaited in most callers because
 *   audit log failures must never block the primary operation or surface to
 *   the end user.  Failures are logged via Firebase logger.
 *
 * @param {string} action — One of ACTIVITY_TYPE values (or any string for custom events)
 * @param {{
 *   actorUid:     string,
 *   actorEmail?:  string | null,
 *   targetUid?:   string | null,
 *   targetEmail?: string | null,
 *   tenantId:     string,
 *   documentType?: string | null,
 *   ipAddress?:   string,
 *   notes?:       string | null,
 *   extra?:       Record<string, unknown> | null,
 * }} metadata
 * @return {Promise<void>}
 */
function logActivity(action, metadata) {
  if (!action) {
    logger.warn('[logActivity] called with empty action — skipping');
    return Promise.resolve();
  }

  return admin
      .firestore()
      .collection('audit_logs')
      .add({
        action: String(action),
        actorUid: metadata.actorUid || '',
        actorEmail: metadata.actorEmail || null,
        targetUid: metadata.targetUid || null,
        targetEmail: metadata.targetEmail || null,
        tenantId: metadata.tenantId || '',
        documentType: metadata.documentType || null,
        ipAddress: metadata.ipAddress || 'unknown',
        notes: metadata.notes || null,
        extra: metadata.extra || null,
        schemaVersion: 2,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      })
      .then(() => {
        // Intentional no-op on success; the caller does not need the doc reference.
      })
      .catch((err) => {
        // Never throw — audit log failure is non-fatal.
        logger.warn('[logActivity] write failed', {action, err: err.message});
      });
}

module.exports = {logActivity, ACTIVITY_TYPE};
