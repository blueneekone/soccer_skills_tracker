/* eslint-disable quotes */
/**
 * invites.js
 * ──────────
 * Cloud Functions for the Nexus Command multi-tenant invite & identity system.
 *
 * IMPORTANT: admin.initializeApp() is called in functions/index.js (the entry
 * point).  This module require()s 'firebase-admin' and reuses the already-
 * initialised singleton app — never calls initializeApp() again.
 *
 * Exports
 * ───────
 *   syncUserClaims     onDocumentWritten — Firestore trigger on users/{emailKey}
 *   consumeInviteCode  onCall            — transactional invite redemption
 *
 * ─── Zero-Trust Architecture ────────────────────────────────────────────────
 *
 * JWT custom claims are the ENFORCEMENT layer.
 * Firestore documents are the SOURCE OF TRUTH.
 *
 *   syncUserClaims:
 *     Fires on every write to users/{emailKey}.  If role or clubId changes,
 *     the JWT custom claims are immediately updated.  If clubId is removed,
 *     all tenant-scope claims are REVOKED — preventing "homeless" users
 *     from matching any Firestore rule of the form:
 *       allow read: if request.auth.token.tenantId == resource.data.tenantId;
 *
 *   consumeInviteCode:
 *     Self-service onboarding.  The invite document is keyed by the code
 *     itself (invites/{code}), so the Cloud Function can execute a direct
 *     Firestore transaction with NO prior query — eliminating the index
 *     dependency and the race window between query and transaction.
 *
 * ─── Invite Document Schema (Firestore: invites/{code}) ─────────────────────
 *
 *   code          string      — 6-char alphanumeric (= document ID)
 *   tenantId      string      — canonical tenant key
 *   clubId        string      — legacy alias = tenantId
 *   teamId?       string      — optional team scope
 *   targetRole    string      — 'coach' | 'player' | 'parent' …
 *   createdBy     string      — email/uid of generator
 *   expiresAt     Timestamp   — hard TTL (default 48 h)
 *   usageLimit    number      — max redemptions (default 1)
 *   usageCount    number      — counter, starts at 0, incremented per unique user
 *   consumedByUids string[]   — UIDs that have redeemed (idempotency log)
 *   status        string      — 'pending' | 'consumed' | 'expired'
 *   createdAt     Timestamp
 *
 * ─── Why code-as-doc-ID? ─────────────────────────────────────────────────────
 *
 *   Previous approach: invites/{autoId} with a `code` field
 *     → Required a Firestore query (needs an index) then a transaction.
 *     → Small TOCTOU window between the query result and the transaction.
 *
 *   Current approach: invites/{code} (code IS the document ID)
 *     → Direct doc read inside the transaction — fully atomic, no query.
 *     → No composite index required.
 *     → If two processes generate the same code, the second setDoc will
 *       encounter the existing doc and the collision-check loop in
 *       generateInviteCode() will retry with a new code.
 */

const {onDocumentWritten} = require('firebase-functions/v2/firestore');
const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const REGION = 'us-central1';

// Lazily access Firestore — safe because admin is initialised in index.js
// before this module is ever require()'d.
const fs = () => admin.firestore();

// ─────────────────────────────────────────────────────────────────────────────
// Structured Audit Logging  (Task 5.4 prep)
//
// Every identity-sensitive event writes a document to `audit_logs/{autoId}`.
// This collection is the immutable compliance trail required for COPPA
// compliance (parent/guardian consent flows) and Zero-Trust audits.
//
// The write is FIRE-AND-FORGET: a failure must never block the main operation.
//
// Audit log document schema:
//   type        string      — event type (see AUDIT_EVENT below)
//   uid         string      — Firebase Auth UID of the actor
//   email?      string      — actor email (if available; may be absent for UID-only tokens)
//   tenantId    string      — tenant in scope ('(revoked)' when claims stripped)
//   role        string      — role at time of event
//   metadata    object      — event-specific structured data
//   timestamp   Timestamp   — server-side write time (immutable)
//
// Do NOT include PII beyond email in `metadata` — store IDs and types only.
// ─────────────────────────────────────────────────────────────────────────────

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
 * Fire-and-forget — errors are logged but never throw.
 *
 * @param {string} type                  — one of AUDIT_EVENT values
 * @param {{ uid: string, email?: string | null, tenantId: string, role: string, metadata?: Record<string, unknown> }} data
 */
function logAuditEvent(type, data) {
  const firestore = fs();
  firestore
      .collection('audit_logs')
      .add({
        type,
        uid: data.uid || '',
        email: data.email || null,
        tenantId: data.tenantId || '',
        role: data.role || '',
        metadata: data.metadata || {},
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      })
      .catch((err) => {
        // Audit write failure must never surface to the caller.
        logger.warn('[auditLog] write failed for event type', type, err.message);
      });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1.  syncUserClaims — Firestore trigger
//
// Fires on create / update of users/{emailKey}.
//
// REVOCATION (Zero-Trust requirement)
//   If clubId is set   → write { clubId, tenantId, role, teamId? } to claims.
//   If clubId is empty → DELETE clubId, tenantId, teamId from claims so the
//                        user cannot match any tenant-scoped Firestore rule.
//
// Idempotency guard
//   Claims are read before writing; if the result would be identical, the
//   write (and its session-invalidating side effect) is skipped.
// ─────────────────────────────────────────────────────────────────────────────

exports.syncUserClaims = onDocumentWritten(
    {document: 'users/{emailKey}', region: REGION},
    async (event) => {
      const emailKey = event.params.emailKey;
      const before = event.data?.before?.data();
      const after = event.data?.after?.data();

      if (!after) return; // document deleted — no forward sync

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

      // ── Platform-admin whitelist guard ────────────────────────────────────
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
          logger.warn('[syncUserClaims] whitelist fetch failed — denying admin claim', cfgErr.message);
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

      // Build the new claims — revoke tenant scope if clubId was cleared.
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
        // ── REVOCATION ────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// 2.  consumeInviteCode — onCall
//
// Called by src/lib/services/inviteService.ts after the user enters their code.
//
// Document path: invites/{code}  (code is the Firestore document ID)
//   → The transaction reads the invite by code directly — NO query.
//   → No composite index required.  Atomic from the first read.
//
// usageCount / usageLimit
//   Each unique user increments usageCount.  When usageCount >= usageLimit,
//   status → 'consumed' and the code is permanently closed.
//
// consumedByUids[]
//   Array of UIDs that have redeemed this code.  Same user retrying (e.g.
//   network failure) is detected here and handled as a no-op — usageCount
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
//   the current session — the trigger is the authoritative backstop.
// ─────────────────────────────────────────────────────────────────────────────

exports.consumeInviteCode = onCall(
    {
      region: REGION,
      // enforceAppCheck: true, // enable when App Check is configured in prod
    },
    async (request) => {
      // ── Auth guard ────────────────────────────────────────────────────────
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

      // ── Direct document reference — no query, no index ────────────────────
      // The document ID IS the invite code.
      const inviteRef = firestore.collection('invites').doc(normalised);

      // ── Atomic transaction ────────────────────────────────────────────────
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

          // ── Idempotency: same user retrying ────────────────────────────────
          if (consumedByUids.includes(uid)) {
            logger.info('[consumeInviteCode] idempotent re-try', {uid, code: normalised});
            logAuditEvent(AUDIT_EVENT.INVITE_IDEMPOTENT, {
              uid,
              email: callerEmail,
              tenantId: String(inviteData.tenantId || inviteData.clubId || ''),
              role: String(inviteData.targetRole || ''),
              metadata: {code: normalised},
            });
            return; // safe exit — proceeds to claim assignment below
          }

          // ── Expired by status ──────────────────────────────────────────────
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

          // ── Expired by timestamp ───────────────────────────────────────────
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

          // ── Usage limit exhausted ──────────────────────────────────────────
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

          // ── All checks passed ──────────────────────────────────────────────
          const newUsageCount = usageCount + 1;
          const nowFull = newUsageCount >= usageLimit;

          // Increment counter + track UID + close code if exhausted.
          txn.update(inviteRef, {
            usageCount: newUsageCount,
            consumedByUids: admin.firestore.FieldValue.arrayUnion(uid),
            ...(nowFull ? {status: 'consumed'} : {}),
          });

          // Write user doc — triggers syncUserClaims as defence-in-depth.
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

      // ── Direct claim assignment (fast path for current session) ────────────
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
