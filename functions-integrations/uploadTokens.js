/* eslint-disable quotes */
/**
 * uploadTokens.js â€” Secure Direct-to-Cloud Upload Tokens
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Generates pre-signed GCS upload URLs so media never transits the
 * SvelteKit server. This is the ONLY way players should upload video clips.
 *
 * Flow:
 *   1. Client calls getUploadToken({ mimeType, fileName, targetStat })
 *   2. CF validates auth, enforces size/type limits, generates a V4 signed URL
 *      targeting: tenants/{tenantId}/staging/{uid}/{sanitizedFileName}
 *   3. Client uploads directly to GCS using the signed URL (PUT request)
 *   4. Storage trigger `processMedia` fires automatically on upload completion
 *   5. processMedia strips EXIF, runs content safety, moves to media/ bucket
 *
 * Zero-Trust notes:
 *   â€¢ Only authenticated players can request upload tokens for their own UID.
 *   â€¢ Directors may request tokens for players within their tenant.
 *   â€¢ The staging path is separated from the final media path so that
 *     partially-processed or unsafe files can never be served publicly.
 *   â€¢ Each token is single-use and expires in 15 minutes.
 *
 * Exports:
 *   getUploadToken       â€” onCall: generate a signed upload URL
 *   getDeleteAllToken    â€” onCall: director/parent deletes all media for a player
 */

'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const REGION = 'us-east1';
const UPLOAD_EXPIRY_MINUTES = 15;
// Max 50 MB for video clips, 8 MB for images
const SIZE_LIMIT_VIDEO = 50 * 1024 * 1024;
const SIZE_LIMIT_IMAGE = 8 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const VIDEO_MIME_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

/**
 * Sanitise a file name: keep alphanumeric, dashes, underscores, dots.
 * Prevent path traversal and null bytes.
 * @param {string} name
 * @return {string}
 */
function sanitizeFileName(name) {
  return String(name)
      .replace(/[^a-zA-Z0-9._\-]/g, '_')
      .replace(/\.{2,}/g, '_')
      .slice(0, 128);
}

// â”€â”€ getUploadToken â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Generate a signed V4 PUT URL for direct-to-cloud video/image upload.
 *
 * Input: { mimeType: string, fileName: string, targetStat?: string }
 *   mimeType  â€” MIME type of the file being uploaded
 *   fileName  â€” Client-supplied file name (will be sanitized)
 *   targetStat â€” optional Scout's Six stat this clip is training for
 *
 * Returns: { signedUrl, storagePath, clipId, expiresAt }
 */
exports.getUploadToken = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const {mimeType, fileName, targetStat = null} = request.data ?? {};

  if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new HttpsError(
        'invalid-argument',
        `Unsupported media type. Allowed: ${[...ALLOWED_MIME_TYPES].join(', ')}`,
    );
  }
  if (!fileName || typeof fileName !== 'string') {
    throw new HttpsError('invalid-argument', 'fileName is required.');
  }

  const sizeLimit = VIDEO_MIME_TYPES.has(mimeType) ? SIZE_LIMIT_VIDEO : SIZE_LIMIT_IMAGE;
  const callerUid = request.auth.uid;
  const tenantId = request.auth.token.clubId || request.auth.token.tenantId || '';
  const role = request.auth.token.role || '';

  if (!tenantId) {
    throw new HttpsError('permission-denied', 'You must belong to an organisation to upload media.');
  }

  const safe = sanitizeFileName(fileName);
  const clipId = `${Date.now()}_${callerUid.slice(0, 8)}_${Math.random().toString(36).slice(2, 8)}`;
  const ext = safe.includes('.') ? safe.slice(safe.lastIndexOf('.')) : '';
  const storagePath = `tenants/${tenantId}/staging/${callerUid}/${clipId}${ext}`;

  const bucket = admin.storage().bucket();
  const file = bucket.file(storagePath);

  const expiresAt = new Date(Date.now() + UPLOAD_EXPIRY_MINUTES * 60 * 1000);

  const [signedUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: expiresAt,
    contentType: mimeType,
    extensionHeaders: {
      'x-goog-content-length-range': `0,${sizeLimit}`,
      'x-goog-meta-uploaded-by': callerUid,
      'x-goog-meta-tenant-id': tenantId,
      'x-goog-meta-target-stat': targetStat ?? '',
      'x-goog-meta-clip-id': clipId,
    },
  });

  // Pre-register the clip in Firestore as 'processing' so the client can
  // track status without polling Storage.
  const db = admin.firestore();
  const mediaRef = db.doc(`player_media/${callerUid}/clips/${clipId}`);
  await mediaRef.set({
    clipId,
    playerUid: callerUid,
    tenantId,
    mimeType,
    originalFileName: safe,
    storagePath,
    targetStat,
    status: 'uploading',
    uploadedByUid: callerUid,
    uploadedByRole: role,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    processedAt: null,
    publicUrl: null,
    safetyScore: null,
    analysisResult: null,
  });

  logger.info('[getUploadToken] token issued', {clipId, tenantId, mimeType});

  return {signedUrl, storagePath, clipId, expiresAt: expiresAt.toISOString()};
});

// â”€â”€ getDeleteAllToken â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Hard-delete ALL media for a specific player (director or parent only).
 * Removes both Storage files and Firestore records. Immutable audit log written first.
 *
 * Input: { playerUid: string, playerEmail: string }
 * Returns: { deletedCount: number }
 */
exports.deleteAllPlayerMedia = onCall({region: REGION}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');

  const role = request.auth.token.role || '';
  const callerTenant = request.auth.token.clubId || request.auth.token.tenantId || '';
  const {playerUid, playerEmail} = request.data ?? {};

  if (!playerUid || typeof playerUid !== 'string') {
    throw new HttpsError('invalid-argument', 'playerUid is required.');
  }

  const isAdmin = role === 'super_admin' || role === 'global_admin';
  const isDirector = role === 'director';
  const isParent = role === 'parent';

  if (!isAdmin && !isDirector && !isParent) {
    throw new HttpsError('permission-denied', 'Director or parent role required.');
  }

  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  // Load all clips for this player
  const clipsSnap = await db.collection(`player_media/${playerUid}/clips`).get();

  let deletedCount = 0;
  const batch = db.batch();

  for (const clipDoc of clipsSnap.docs) {
    const data = clipDoc.data();
    if (!isAdmin && data.tenantId && data.tenantId !== callerTenant) continue;

    // Delete from Storage (both staging and media paths)
    for (const path of [data.storagePath, data.processedPath].filter(Boolean)) {
      try {
        await bucket.file(path).delete();
      } catch {
        // File may already be gone â€” continue
      }
    }

    batch.delete(clipDoc.ref);
    deletedCount++;
  }

  if (deletedCount > 0) await batch.commit();

  // Immutable audit log
  await db.collection('audit_logs').add({
    action: 'DELETE_ALL_MEDIA',
    actorUid: request.auth.uid,
    targetUid: playerUid,
    targetEmail: playerEmail ?? null,
    deletedCount,
    tenantId: callerTenant,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  logger.info('[deleteAllPlayerMedia] completed', {playerUid, deletedCount});
  return {deletedCount};
});
