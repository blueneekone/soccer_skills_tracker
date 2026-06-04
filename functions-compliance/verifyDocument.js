/* eslint-disable quotes */
/**
 * verifyDocument.js â€” PII "Burn" Protocol
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Cloud Functions implementing the Vanguard Data Minimization policy for
 * sensitive player documents (birth certificates, photo IDs, medical forms).
 *
 * THE BURN PROTOCOL
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * When a director verifies a player's sensitive document:
 *  1. Log the verification event (DOCUMENT_VERIFIED) to audit_logs.
 *  2. Mark the document as verified on the user's Firestore profile.
 *  3. Queue a deletion record in `pending_deletions/{autoId}` with a
 *     `scheduledDeleteAt` timestamp 24 hours in the future.
 *  4. A scheduled Cloud Function (`processPendingDocDeletions`) runs every
 *     6 hours and deletes any Storage files whose window has passed.
 *
 * RESULT: The "Verified" status is permanent; the file is gone.
 *   Directors see the audit log as proof of verification.
 *   No one stores thousands of birth certificates long-term.
 *
 * Exports:
 *   verifyDocument            â€” onCall: director verifies a doc, queues burn
 *   processPendingDocDeletions â€” onSchedule: hourly burn executor
 *   getRetentionReport        â€” onCall: director fetches pending deletions
 */

'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const {logActivity, ACTIVITY_TYPE} = require('./auditLogger');

const REGION = 'us-east1';
const db = admin.firestore();

const BURN_DELAY_MS = 24 * 60 * 60 * 1000; // 24 hours

const normEmail = (e) => (typeof e === 'string' ? e.trim().toLowerCase() : '');

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// verifyDocument â€” onCall
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Director-callable function to verify a player document and queue its deletion.
 *
 * Input:
 *   targetEmail   string â€” player's email key (users/{email} doc)
 *   documentType  string â€” e.g. 'BIRTH_CERTIFICATE', 'PHOTO_ID', 'MEDICAL_FORM'
 *   storagePath   string â€” full Cloud Storage path of the private file
 *   notes         string â€” optional verification notes (e.g. "Reviewed in person")
 *
 * Returns:
 *   { success, pendingDeletionId, scheduledDeleteAt (ISO string) }
 */
exports.verifyDocument = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const actorUid = request.auth.uid;
  const actorEmail = normEmail(request.auth.token.email);
  const actorRole = request.auth.token.role || '';
  const actorTenantId = request.auth.token.tenantId || request.auth.token.clubId || '';

  const allowedRoles = ['director', 'global_admin', 'super_admin'];
  if (!allowedRoles.includes(actorRole)) {
    throw new HttpsError(
        'permission-denied',
        'Only directors and platform admins may verify documents.',
    );
  }

  const data = request.data || {};
  const targetEmail = normEmail(data.targetEmail || '');
  const documentType = typeof data.documentType === 'string' ? data.documentType.trim().toUpperCase() : '';
  const storagePath = typeof data.storagePath === 'string' ? data.storagePath.trim() : '';
  const notes = typeof data.notes === 'string' ? data.notes.trim().slice(0, 500) : '';

  if (!targetEmail || !documentType || !storagePath) {
    throw new HttpsError(
        'invalid-argument',
        'targetEmail, documentType, and storagePath are required.',
    );
  }

  // â”€â”€ Resolve target player profile â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const playerSnap = await db.collection('users').doc(targetEmail).get();
  if (!playerSnap.exists) {
    throw new HttpsError('not-found', `Player profile not found for "${targetEmail}".`);
  }
  const playerData = playerSnap.data();
  const playerTenantId = playerData.clubId || playerData.tenantId || '';

  // â”€â”€ Tenant isolation guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const isPlatformAdmin = ['global_admin', 'super_admin'].includes(actorRole);
  if (!isPlatformAdmin && actorTenantId && playerTenantId && actorTenantId !== playerTenantId) {
    // Log cross-tenant access attempt before rejecting.
    logActivity(ACTIVITY_TYPE.VIEW_PII, {
      actorUid, actorEmail,
      targetUid: playerData.uid || null,
      targetEmail,
      tenantId: actorTenantId,
      documentType,
      notes: `BLOCKED: cross-tenant document verification attempt (actor: ${actorTenantId}, target: ${playerTenantId})`,
      ipAddress: request.rawRequest?.ip,
    });
    throw new HttpsError(
        'permission-denied',
        'Player is not in your organisation.',
    );
  }

  const effectiveTenantId = playerTenantId || actorTenantId;

  // â”€â”€ AUDIT LOG â€” write FIRST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await logActivity(ACTIVITY_TYPE.DOCUMENT_VERIFIED, {
    actorUid,
    actorEmail,
    targetUid: playerData.uid || null,
    targetEmail,
    tenantId: effectiveTenantId,
    documentType,
    notes: notes || `Director verified ${documentType} for ${targetEmail}. Burn scheduled in 24h.`,
    ipAddress: request.rawRequest?.ip,
    extra: {storagePath, burnScheduled: true},
  });

  // â”€â”€ Mark document as verified in Firestore â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const verifiedAt = admin.firestore.FieldValue.serverTimestamp();
  await db.collection('users').doc(targetEmail).set(
      {
        documents: {
          [documentType]: {
            isVerified: true,
            verifiedAt,
            verifiedByUid: actorUid,
            verifiedByEmail: actorEmail,
            pendingDeletion: true,
          },
        },
      },
      {merge: true},
  );

  // â”€â”€ Queue burn deletion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const scheduledDeleteAt = new Date(Date.now() + BURN_DELAY_MS);

  const deletionRef = await db.collection('pending_deletions').add({
    targetEmail,
    targetUid: playerData.uid || null,
    tenantId: effectiveTenantId,
    documentType,
    storagePath,
    scheduledDeleteAt: admin.firestore.Timestamp.fromDate(scheduledDeleteAt),
    requestedByUid: actorUid,
    requestedByEmail: actorEmail,
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  logger.info('[verifyDocument] burn queued', {
    pendingDeletionId: deletionRef.id,
    storagePath,
    scheduledDeleteAt: scheduledDeleteAt.toISOString(),
    actorEmail,
    targetEmail,
  });

  return {
    success: true,
    pendingDeletionId: deletionRef.id,
    scheduledDeleteAt: scheduledDeleteAt.toISOString(),
  };
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// processPendingDocDeletions â€” scheduled every 6 hours
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Scheduled executor: delete Storage files whose 24-hour burn window has elapsed.
 *
 * For each `pending_deletions` document where:
 *   status == 'pending'
 *   scheduledDeleteAt <= now
 *
 * Actions:
 *   1. Delete the file from Firebase Storage.
 *   2. Mark the pending_deletions doc as 'completed' (or 'failed').
 *   3. Update the user's documents map: pendingDeletion â†’ false, storageDeleted â†’ true.
 *   4. Log DOCUMENT_BURNED to audit_logs.
 */
exports.processPendingDocDeletions = onSchedule(
    {schedule: 'every 6 hours', region: REGION},
    async () => {
      const now = admin.firestore.Timestamp.now();

      const pendingSnap = await db
          .collection('pending_deletions')
          .where('status', '==', 'pending')
          .where('scheduledDeleteAt', '<=', now)
          .limit(50) // process max 50 per run to stay within Cloud Function timeout
          .get();

      if (pendingSnap.empty) {
        logger.info('[processPendingDocDeletions] no pending deletions due.');
        return;
      }

      logger.info(`[processPendingDocDeletions] processing ${pendingSnap.size} deletions.`);

      const bucket = admin.storage().bucket();

      for (const snap of pendingSnap.docs) {
        const rec = snap.data();
        const {storagePath, targetEmail, documentType, tenantId} = rec;

        try {
          // Delete the file from Storage.
          const file = bucket.file(storagePath);
          const [exists] = await file.exists();
          if (exists) {
            await file.delete();
            logger.info('[processPendingDocDeletions] deleted', {storagePath});
          } else {
            logger.warn('[processPendingDocDeletions] file already gone', {storagePath});
          }

          // Update user profile.
          await db.collection('users').doc(targetEmail).set(
              {
                documents: {
                  [documentType]: {
                    pendingDeletion: false,
                    storageDeleted: true,
                    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
                  },
                },
              },
              {merge: true},
          );

          // Mark deletion record as completed.
          await snap.ref.update({
            status: 'completed',
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Audit log â€” fire-and-forget.
          logActivity(ACTIVITY_TYPE.DOCUMENT_BURNED, {
            actorUid: rec.requestedByUid || 'scheduled-function',
            actorEmail: rec.requestedByEmail || null,
            targetEmail,
            tenantId: tenantId || '',
            documentType,
            notes: `24h burn executed. File deleted from Storage: ${storagePath}`,
            extra: {storagePath, pendingDeletionId: snap.id},
          });
        } catch (err) {
          logger.error('[processPendingDocDeletions] failed', {
            storagePath,
            err: err.message,
          });
          // Mark as failed so it can be retried manually.
          await snap.ref.update({
            status: 'failed',
            failedAt: admin.firestore.FieldValue.serverTimestamp(),
            failureReason: err.message || 'Unknown error',
          });
        }
      }
    },
);

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// getRetentionReport â€” onCall (director only)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Return the pending_deletions list for the caller's tenant.
 * Used by the Director's Compliance Portal "Retention Report" UI.
 *
 * Input: { includeCompleted?: boolean }
 * Returns: { documents: PendingDeletion[] }
 */
exports.getRetentionReport = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const actorRole = request.auth.token.role || '';
  const actorTenantId = request.auth.token.tenantId || request.auth.token.clubId || '';
  const isPlatformAdmin = ['global_admin', 'super_admin'].includes(actorRole);

  if (!['director', 'global_admin', 'super_admin'].includes(actorRole)) {
    throw new HttpsError('permission-denied', 'Directors only.');
  }

  const includeCompleted = request.data?.includeCompleted === true;

  let q = db.collection('pending_deletions').orderBy('scheduledDeleteAt', 'asc');

  if (!isPlatformAdmin) {
    q = q.where('tenantId', '==', actorTenantId);
  }
  if (!includeCompleted) {
    q = q.where('status', '==', 'pending');
  }

  const snap = await q.limit(200).get();

  const documents = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      targetEmail: data.targetEmail,
      documentType: data.documentType,
      status: data.status,
      scheduledDeleteAt: data.scheduledDeleteAt?.toDate?.()?.toISOString() ?? null,
      completedAt: data.completedAt?.toDate?.()?.toISOString() ?? null,
      requestedByEmail: data.requestedByEmail,
    };
  });

  return {documents};
});
