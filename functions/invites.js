/* eslint-disable quotes */
/**
 * invites.js
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Cloud Functions for the Nexus Command multi-tenant invite & identity system.
 *
 * IMPORTANT: admin.initializeApp() is called in functions/index.js (the entry
 * point).  This module require()s 'firebase-admin' and reuses the already-
 * initialised singleton app â€” never calls initializeApp() again.
 *
 * Audit logging:
 *   logAuditEvent() delegates to logActivity() from auditLogger.js, which
 *   writes to the unified `audit_logs` collection.  The per-invite AUDIT_EVENT
 *   constants are mapped to ACTIVITY_TYPE constants for consistent naming
 *   across the entire platform audit trail.
 *
 * Exports
 * â”€â”€â”€â”€â”€â”€â”€
 *   syncUserClaims     onDocumentWritten â€” Firestore trigger on users/{emailKey}
 *   consumeInviteCode  onCall            â€” transactional invite redemption
 *
 * â”€â”€â”€ Zero-Trust Architecture â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *
 * JWT custom claims are the ENFORCEMENT layer.
 * Firestore documents are the SOURCE OF TRUTH.
 *
 *   syncUserClaims:
 *     Fires on every write to users/{emailKey}.  If role or clubId changes,
 *     the JWT custom claims are immediately updated.  If clubId is removed,
 *     all tenant-scope claims are REVOKED â€” preventing "homeless" users
 *     from matching any Firestore rule of the form:
 *       allow read: if request.auth.token.tenantId == resource.data.tenantId;
 *
 *   consumeInviteCode:
 *     Self-service onboarding.  The invite document is keyed by the code
 *     itself (invites/{code}), so the Cloud Function can execute a direct
 *     Firestore transaction with NO prior query â€” eliminating the index
 *     dependency and the race window between query and transaction.
 *
 * â”€â”€â”€ Invite Document Schema (Firestore: invites/{code}) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *
 *   code          string      â€” 6-char alphanumeric (= document ID)
 *   tenantId      string      â€” canonical tenant key
 *   clubId        string      â€” legacy alias = tenantId
 *   teamId?       string      â€” optional team scope
 *   targetRole    string      â€” 'coach' | 'player' | 'parent' â€¦
 *   createdBy     string      â€” email/uid of generator
 *   expiresAt     Timestamp   â€” hard TTL (default 48 h)
 *   usageLimit    number      â€” max redemptions (default 1)
 *   usageCount    number      â€” counter, starts at 0, incremented per unique user
 *   consumedByUids string[]   â€” UIDs that have redeemed (idempotency log)
 *   status        string      â€” 'pending' | 'consumed' | 'expired'
 *   createdAt     Timestamp
 *
 * â”€â”€â”€ Why code-as-doc-ID? â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *
 *   Previous approach: invites/{autoId} with a `code` field
 *     â†’ Required a Firestore query (needs an index) then a transaction.
 *     â†’ Small TOCTOU window between the query result and the transaction.
 *
 *   Current approach: invites/{code} (code IS the document ID)
 *     â†’ Direct doc read inside the transaction â€” fully atomic, no query.
 *     â†’ No composite index required.
 *     â†’ If two processes generate the same code, the second setDoc will
 *       encounter the existing doc and the collision-check loop in
 *       generateInviteCode() will retry with a new code.
 */

const crypto = require('crypto');
const {onDocumentWritten} = require('firebase-functions/v2/firestore');
const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const {logActivity, ACTIVITY_TYPE} = require('./auditLogger');

const REGION = 'us-east1';

// Lazily access Firestore â€” safe because admin is initialised in index.js
// before this module is ever require()'d.
const fs = () => admin.firestore();

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Structured Audit Logging  (Task 5.4 prep)
//
// Every identity-sensitive event writes a document to `audit_logs/{autoId}`.
// This collection is the immutable compliance trail required for COPPA
// compliance (parent/guardian consent flows) and Zero-Trust audits.
//
// The write is FIRE-AND-FORGET: a failure must never block the main operation.
//
// Audit log document schema:
//   type        string      â€” event type (see AUDIT_EVENT below)
//   uid         string      â€” Firebase Auth UID of the actor
//   email?      string      â€” actor email (if available; may be absent for UID-only tokens)
//   tenantId    string      â€” tenant in scope ('(revoked)' when claims stripped)
//   role        string      â€” role at time of event
//   metadata    object      â€” event-specific structured data
//   timestamp   Timestamp   â€” server-side write time (immutable)
//
// Do NOT include PII beyond email in `metadata` â€” store IDs and types only.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const AUDIT_EVENT = Object.freeze({
  CLAIMS_SYNCED: 'claims_synced',
  TENANT_REVOKED: 'tenant_revoked',
  INVITE_CONSUMED: 'invite_consumed',
  INVITE_EXPIRED: 'invite_expired',
  INVITE_EXHAUSTED: 'invite_exhausted',
  INVITE_IDEMPOTENT: 'invite_idempotent_retry',
});

/**
 * Write a structured audit event to `audit_logs/{autoId}`.
 * Fire-and-forget â€” errors are logged but never throw.
 *
 * Delegates to the unified logActivity() helper from auditLogger.js so that
 * all invite-lifecycle events appear in the same audit_logs collection as
 * PII access events, consent events, and stat overrides.
 *
 * @param {string} type                  â€” one of AUDIT_EVENT values
 * @param {{ uid: string, email?: string | null, tenantId: string, role: string, metadata?: Record<string, unknown> }} data
 */
function logAuditEvent(type, data) {
  // Map legacy AUDIT_EVENT keys to canonical ACTIVITY_TYPE constants where
  // possible.  Unknown events are passed through as-is â€” logActivity accepts
  // any string action value.
  const typeMap = {
    [AUDIT_EVENT.CLAIMS_SYNCED]:     ACTIVITY_TYPE.CLAIMS_SYNCED,
    [AUDIT_EVENT.TENANT_REVOKED]:    ACTIVITY_TYPE.TENANT_REVOKED,
    [AUDIT_EVENT.INVITE_CONSUMED]:   ACTIVITY_TYPE.INVITE_CONSUMED,
    [AUDIT_EVENT.INVITE_EXPIRED]:    ACTIVITY_TYPE.INVITE_EXPIRED,
    [AUDIT_EVENT.INVITE_EXHAUSTED]:  ACTIVITY_TYPE.INVITE_EXHAUSTED,
    [AUDIT_EVENT.INVITE_IDEMPOTENT]: ACTIVITY_TYPE.INVITE_IDEMPOTENT,
    // Ad-hoc types not in AUDIT_EVENT enum
    'admin_claim_blocked':           ACTIVITY_TYPE.ADMIN_CLAIM_BLOCKED,
    'claims_revoked':                ACTIVITY_TYPE.CLAIMS_REVOKED,
  };
  const mappedAction = typeMap[type] || type;

  logActivity(mappedAction, {
    actorUid:   data.uid || '',
    actorEmail: data.email || null,
    tenantId:   data.tenantId || '',
    notes:      data.role ? `role: ${data.role}` : null,
    extra:      data.metadata || null,
  });
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 1.  syncUserClaims â€” Firestore trigger
//
// Fires on create / update of users/{emailKey}.
//
// REVOCATION (Zero-Trust requirement)
//   If clubId is set   â†’ write { clubId, tenantId, role, teamId? } to claims.
//   If clubId is empty â†’ DELETE clubId, tenantId, teamId from claims so the
//                        user cannot match any tenant-scoped Firestore rule.
//
// Idempotency guard
//   Claims are read before writing; if the result would be identical, the
//   write (and its session-invalidating side effect) is skipped.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

exports.syncUserClaims = onDocumentWritten(
    {document: 'users/{emailKey}', region: REGION},
    async (event) => {
      const emailKey = event.params.emailKey;
      const before = event.data?.before?.data();
      const after = event.data?.after?.data();

      if (!after) return; // document deleted â€” no forward sync

      const roleChanged = before?.role !== after.role;
      const clubIdChanged = before?.clubId !== after.clubId;
      if (!roleChanged && !clubIdChanged) return; // nothing claims-relevant changed

      const newRole = String(after.role || '');
      const newClubId = String(after.clubId || '');
      const newTeamId = after.teamId ? String(after.teamId) : null;

      // Resolve Firebase Auth UID from the email-keyed doc.
      let userRecord;
      try {
        userRecord = await admin.auth().getUserByEmail(emailKey);
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          logger.info('[syncUserClaims] no Auth account yet for', emailKey);
        } else {
          logger.warn('[syncUserClaims] uid lookup failed', emailKey, err.message);
        }
        return;
      }

      const uid = userRecord.uid;
      const existing = userRecord.customClaims || {};

      // â”€â”€ Platform-admin whitelist guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // Only emails listed in platform_config/admins.emails may receive the
      // global_admin or super_admin claim.  If a Firestore document write
      // attempts to elevate an unlisted email, the role is downgraded to
      // 'director' and a SECURITY_VIOLATION audit event is written.
      const isPlatformAdminRole = newRole === 'global_admin' || newRole === 'super_admin';
      if (isPlatformAdminRole) {
        let allowed = false;
        try {
          const cfgSnap = await fs().collection('platform_config').doc('admins').get();
          const whitelist = cfgSnap.exists
            ? (cfgSnap.data()?.emails || []).map((e) => String(e).toLowerCase())
            : [];
          allowed = whitelist.includes(emailKey.toLowerCase());
        } catch (cfgErr) {
          logger.warn('[syncUserClaims] whitelist fetch failed â€” denying admin claim', cfgErr.message);
        }

        if (!allowed) {
          logger.error('[syncUserClaims] SECURITY VIOLATION: admin role blocked for non-whitelisted email', {
            email: emailKey,
            attemptedRole: newRole,
          });
          logAuditEvent('admin_claim_blocked', {
            uid,
            email: emailKey,
            tenantId: newClubId || '(none)',
            role: newRole,
            metadata: {blockedRole: newRole, downgraded: 'director'},
          });
          // Downgrade the Firestore document to 'director' so the trigger
          // doesn't re-fire an admin attempt on the next write.
          await fs().collection('users').doc(emailKey).update({role: 'director'});
          return;
        }
      }

      // Build the new claims â€” revoke tenant scope if clubId was cleared.
      const updated = {...existing, role: newRole};

      if (newClubId) {
        updated.clubId = newClubId;
        updated.tenantId = newClubId;
        if (newTeamId) {
          updated.teamId = newTeamId;
        } else {
          delete updated.teamId;
        }
      } else {
        // â”€â”€ REVOCATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        // User removed from their organisation.  Strip all tenant-scope claims.
        delete updated.clubId;
        delete updated.tenantId;
        delete updated.teamId;
      }

      // Idempotency: skip write if claims are already identical.
      const unchanged =
        existing.role === updated.role &&
        existing.clubId === updated.clubId &&
        existing.tenantId === updated.tenantId &&
        existing.teamId === updated.teamId;

      if (unchanged) {
        logger.info('[syncUserClaims] no-op (claims current)', {email: emailKey});
        return;
      }

      await admin.auth().setCustomUserClaims(uid, updated);

      const wasRevoked = !newClubId;
      logger.info('[syncUserClaims] synced', {
        email: emailKey,
        uid,
        role: newRole,
        tenantId: newClubId || '(revoked)',
        revoked: wasRevoked,
      });

      logAuditEvent(wasRevoked ? AUDIT_EVENT.TENANT_REVOKED : AUDIT_EVENT.CLAIMS_SYNCED, {
        uid,
        email: emailKey,
        tenantId: newClubId || '(revoked)',
        role: newRole,
        metadata: {
          previousRole: before?.role || null,
          previousTenantId: before?.clubId || null,
          revoked: wasRevoked,
        },
      });
    },
);

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 2.  consumeInviteCode â€” onCall
//
// Called by src/lib/services/inviteService.ts after the user enters their code.
//
// Document path: invites/{code}  (code is the Firestore document ID)
//   â†’ The transaction reads the invite by code directly â€” NO query.
//   â†’ No composite index required.  Atomic from the first read.
//
// usageCount / usageLimit
//   Each unique user increments usageCount.  When usageCount >= usageLimit,
//   status â†’ 'consumed' and the code is permanently closed.
//
// consumedByUids[]
//   Array of UIDs that have redeemed this code.  Same user retrying (e.g.
//   network failure) is detected here and handled as a no-op â€” usageCount
//   is NOT incremented again.
//
// Zero-Trust note
//   The tenantId granted to the user is read from the INVITE DOCUMENT, not
//   from the client request.  The client sends only the code string.
//
// Race-condition safety
//   Firestore transaction serialises concurrent redemptions.  If two users
//   hit the last slot simultaneously, one commits and the other retries,
//   reads usageCount >= usageLimit on the re-read, and throws 'already-exists'.
//
// Defence in depth
//   The txn.set(userRef, ...) inside the transaction triggers syncUserClaims.
//   The explicit setCustomUserClaims after the transaction is a fast path for
//   the current session â€” the trigger is the authoritative backstop.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

exports.consumeInviteCode = onCall(
    {
      region: REGION,
      // enforceAppCheck: true, // enable when App Check is configured in prod
    },
    async (request) => {
      // â”€â”€ Auth guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (!request.auth) {
        throw new HttpsError(
            'unauthenticated',
            'You must be signed in to redeem an invite code.',
        );
      }

      const uid = request.auth.uid;
      const callerEmail = request.auth.token.email || null;
      const {code} = request.data;

      if (!code || typeof code !== 'string' || !code.trim()) {
        throw new HttpsError('invalid-argument', '`code` is required.');
      }

      const normalised = code.toUpperCase().trim();
      const firestore = fs();

      // â”€â”€ Direct document reference â€” no query, no index â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // The document ID IS the invite code.
      const inviteRef = firestore.collection('invites').doc(normalised);

      // â”€â”€ Atomic transaction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      /** @type {Record<string, unknown>} */
      let inviteData;

      try {
        await firestore.runTransaction(async (txn) => {
          const snap = await txn.get(inviteRef);

          if (!snap.exists) {
            throw new HttpsError(
                'not-found',
                'Invite code not found. Double-check the code and try again.',
            );
          }

          inviteData = snap.data();

          const consumedByUids = Array.isArray(inviteData.consumedByUids)
            ? inviteData.consumedByUids
            : [];
          const usageLimit = typeof inviteData.usageLimit === 'number'
            ? inviteData.usageLimit
            : 1;
          const usageCount = typeof inviteData.usageCount === 'number'
            ? inviteData.usageCount
            : 0;

          // â”€â”€ Idempotency: same user retrying â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          if (consumedByUids.includes(uid)) {
            logger.info('[consumeInviteCode] idempotent re-try', {uid, code: normalised});
            logAuditEvent(AUDIT_EVENT.INVITE_IDEMPOTENT, {
              uid,
              email: callerEmail,
              tenantId: String(inviteData.tenantId || inviteData.clubId || ''),
              role: String(inviteData.targetRole || ''),
              metadata: {code: normalised},
            });
            return; // safe exit â€” proceeds to claim assignment below
          }

          // â”€â”€ Expired by status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          if (inviteData.status === 'expired') {
            logAuditEvent(AUDIT_EVENT.INVITE_EXPIRED, {
              uid,
              email: callerEmail,
              tenantId: String(inviteData.tenantId || inviteData.clubId || ''),
              role: String(inviteData.targetRole || ''),
              metadata: {code: normalised, reason: 'status_expired'},
            });
            throw new HttpsError(
                'deadline-exceeded',
                'This invite code has expired. Ask your coach for a new one.',
            );
          }

          // â”€â”€ Expired by timestamp â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          const expiresAt = inviteData.expiresAt?.toDate
            ? inviteData.expiresAt.toDate()
            : new Date(inviteData.expiresAt || 0);

          if (expiresAt < new Date()) {
            txn.update(inviteRef, {status: 'expired'});
            logAuditEvent(AUDIT_EVENT.INVITE_EXPIRED, {
              uid,
              email: callerEmail,
              tenantId: String(inviteData.tenantId || inviteData.clubId || ''),
              role: String(inviteData.targetRole || ''),
              metadata: {code: normalised, reason: 'timestamp_expired'},
            });
            throw new HttpsError(
                'deadline-exceeded',
                'This invite code has expired. Ask your coach for a new one.',
            );
          }

          // â”€â”€ Usage limit exhausted â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          if (usageCount >= usageLimit) {
            logAuditEvent(AUDIT_EVENT.INVITE_EXHAUSTED, {
              uid,
              email: callerEmail,
              tenantId: String(inviteData.tenantId || inviteData.clubId || ''),
              role: String(inviteData.targetRole || ''),
              metadata: {code: normalised, usageCount, usageLimit},
            });
            throw new HttpsError(
                'already-exists',
                'This invite code has reached its maximum number of uses.',
            );
          }

          // â”€â”€ All checks passed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          const newUsageCount = usageCount + 1;
          const nowFull = newUsageCount >= usageLimit;

          // Increment counter + track UID + close code if exhausted.
          txn.update(inviteRef, {
            usageCount: newUsageCount,
            consumedByUids: admin.firestore.FieldValue.arrayUnion(uid),
            ...(nowFull ? {status: 'consumed'} : {}),
          });

          // Write user doc â€” triggers syncUserClaims as defence-in-depth.
          // Zero-Trust: tenantId is read from the INVITE DOCUMENT, never from
          // the client request payload.
          const tenantId = String(inviteData.tenantId || inviteData.clubId || '');
          const targetRole = String(inviteData.targetRole || 'player');
          const teamId = inviteData.teamId ? String(inviteData.teamId) : null;
          const userDocKey = callerEmail ? callerEmail.toLowerCase() : uid;

          txn.set(
              firestore.collection('users').doc(userDocKey),
              {
                clubId: tenantId,
                tenantId: tenantId,
                role: targetRole,
                ...(teamId ? {teamId} : {}),
              },
              {merge: true},
          );
        });
      } catch (err) {
        if (err instanceof HttpsError) throw err;
        logger.error('[consumeInviteCode] transaction error:', err);
        throw new HttpsError('internal', 'Failed to redeem invite. Please try again.');
      }

      const finalTenantId = String(inviteData.tenantId || inviteData.clubId || '');
      const finalRole = String(inviteData.targetRole || 'player');
      const finalTeamId = inviteData.teamId ? String(inviteData.teamId) : null;

      // â”€â”€ Direct claim assignment (fast path for current session) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // syncUserClaims trigger handles the async path for all other sessions.
      try {
        const authUser = await admin.auth().getUser(uid);
        const merged = {
          ...(authUser.customClaims || {}),
          clubId: finalTenantId,
          tenantId: finalTenantId,
          role: finalRole,
          ...(finalTeamId ? {teamId: finalTeamId} : {}),
        };
        await admin.auth().setCustomUserClaims(uid, merged);
      } catch (claimsErr) {
        logger.warn('[consumeInviteCode] fast-path claim set failed (trigger will sync):', claimsErr);
      }

      logger.info('[consumeInviteCode] redeemed', {
        uid,
        tenantId: finalTenantId,
        role: finalRole,
        teamId: finalTeamId,
        code: normalised,
      });

      logAuditEvent(AUDIT_EVENT.INVITE_CONSUMED, {
        uid,
        email: callerEmail,
        tenantId: finalTenantId,
        role: finalRole,
        metadata: {
          code: normalised,
          teamId: finalTeamId,
          usageCount: (inviteData.usageCount || 0) + 1,
          usageLimit: inviteData.usageLimit || 1,
        },
      });

      return {success: true, tenantId: finalTenantId, role: finalRole, teamId: finalTeamId};
    },
);

// ---------------------------------------------------------------------------
// 3.  generateInviteCode — onCall
//
// Director / super_admin: provisions a single-use or high-limit cryptographic
// invite code stored as invites/{code}.  The code-as-doc-ID design guarantees
// atomic uniqueness without a separate query — if a collision is detected via
// ref.create(), the loop retries with a fresh code.
//
// enforceAppCheck: false — required for Alpha staging and Director terminal
// usage before App Check is configured in the target environment.
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically random alphanumeric code omitting visually
 * ambiguous characters (I, O, 0, 1).
 * @param {number} length
 * @return {string}
 */
function generateRandomCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[crypto.randomInt(0, chars.length)];
  }
  return code;
}

/**
 * Director / super_admin: generates a single-use or high-limit cryptographic
 * invite code stored strictly as a document ID at invites/{code}.
 */
exports.generateInviteCode = onCall(
    {region: REGION, enforceAppCheck: false},
    async (request) => {
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Sign in required.');
      }

      const data = request.data || {};
      const clubId =
          typeof data.clubId === 'string' ? data.clubId.trim() : '';
      const teamId =
          typeof data.teamId === 'string' && data.teamId.trim() ?
            data.teamId.trim() :
            null;
      const targetRole =
          typeof data.targetRole === 'string' && data.targetRole.trim() ?
            data.targetRole.trim() :
            'player';

      let usageLimit = Number(data.usageLimit);
      if (!Number.isFinite(usageLimit) || usageLimit < 1) usageLimit = 1;

      let expiryHours = Number(data.expiryHours);
      if (!Number.isFinite(expiryHours) || expiryHours < 1) expiryHours = 48;

      if (!clubId) {
        throw new HttpsError('invalid-argument', 'clubId is required.');
      }

      // Tenant isolation: verify actor context bounds.
      const role = request.auth.token.role;
      const tokenClub = request.auth.token.clubId;
      if (role !== 'super_admin') {
        if (!tokenClub || tokenClub !== clubId) {
          throw new HttpsError(
              'permission-denied',
              'You can only generate access keys within your own organization.',
          );
        }
      }

      const firestore = fs();
      const nowMs = Date.now();
      const expiresAt = admin.firestore.Timestamp.fromMillis(
          nowMs + expiryHours * 3600 * 1000,
      );
      const createdBy = request.auth.token.email || request.auth.uid;

      // Retry loop guaranteeing absolute primary-key uniqueness.
      for (let attempt = 0; attempt < 10; attempt++) {
        const code = generateRandomCode(6);
        const ref = firestore.collection('invites').doc(code);
        try {
          await ref.create({
            code,
            tenantId: clubId,
            clubId,
            ...(teamId ? {teamId} : {}),
            targetRole,
            createdBy,
            expiresAt,
            usageLimit,
            usageCount: 0,
            consumedByUids: [],
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          logger.info('[generateInviteCode] access key instantiated', {
            code,
            clubId,
            teamId,
            targetRole,
          });
          return {code};
        } catch (err) {
          // gRPC ALREADY_EXISTS (code 6) — collision, retry with new code.
          if (err && err.code === 6) continue;
          throw new HttpsError(
              'internal',
              'Failed to persist unique access key matrix.',
          );
        }
      }

      throw new HttpsError(
          'internal',
          'Exhausted retry cycles attempting to allocate unique code.',
      );
    },
);
