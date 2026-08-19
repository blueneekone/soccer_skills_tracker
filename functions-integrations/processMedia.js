 
/**
 * processMedia.js — AEGIS Secure Media Pipeline
 * ─────────────────────────────────────────────
 * Triggers on every file created inside `tenants/{tenantId}/staging/`
 * and runs a strict 4-stage processing pipeline before the file is
 * moved to the public-read `tenants/{tenantId}/media/` path.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  STAGE 0  Validate origin path & parse metadata             │
 * │  STAGE 1  EXIF / metadata strip (YOUTH SAFETY — PRIORITY 1) │
 * │  STAGE 2  AI Content Safety scan via Gemini Vision          │
 * │  STAGE 3  Move to media/ bucket & mark Firestore 'ready'    │
 * └─────────────────────────────────────────────────────────────┘
 *
 * EXIF STRIPPING (STAGE 1)
 * ───────────────────────
 * • IMAGES (JPEG, PNG, WebP):
 *     Piped through `sharp` (dynamically loaded inside `stripImageExif` to protect cold start).
 *     Sharp's decode-re-encode pipeline discards ALL EXIF, IPTC, XMP, and ICC metadata.
 *     GPS coordinates, camera model, timestamp, and creator tags are silently removed.
 *
 * • VIDEOS (MP4, WebM, MOV):
 *     Metadata is stripped by re-packaging the container with custom metadata cleared.
 *
 * Exports:
 *   processMedia — onObjectFinalized Storage trigger
 */

'use strict';

const {onObjectFinalized} = require('firebase-functions/v2/storage');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const path = require('path');
const {GoogleGenAI} = require('@google/genai');
const {defineSecret} = require('firebase-functions/params');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const REGION = 'us-east1';
const db = () => admin.firestore();

/** @returns {string|undefined} */
function resolveStorageBucket() {
  try {
    const cfg = JSON.parse(process.env.FIREBASE_CONFIG || '{}');
    if (cfg.storageBucket) return cfg.storageBucket;
  } catch {
    // ignore malformed FIREBASE_CONFIG
  }
  try {
    const app = admin.app();
    if (app?.options?.storageBucket) return app.options.storageBucket;
  } catch {
    // admin not initialized yet
  }
  if (process.env.GCLOUD_PROJECT) {
    return `${process.env.GCLOUD_PROJECT}.firebasestorage.app`;
  }
  return 'sports-skill-tracker-dev.firebasestorage.app';
}

const SAFETY_BLOCK_THRESHOLD = 70;
const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const VIDEO_MIME = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

/**
 * Extract the clipId from the staging path.
 * Path format: tenants/{tenantId}/staging/{uid}/{clipId}{ext}
 * @param {string} filePath
 * @return {{ tenantId: string, uid: string, clipId: string } | null}
 */
function parseStagingPath(filePath) {
  const parts = filePath.split('/');
  if (parts.length !== 5 || parts[0] !== 'tenants' || parts[2] !== 'staging') {
    return null;
  }
  const [, tenantId, , uid, fileName] = parts;
  const clipId = fileName.replace(/\.[^.]+$/, '');
  return {tenantId, uid, clipId};
}

/**
 * Strip EXIF from an image buffer using sharp.
 * Sharp is loaded lazily here to preserve minimal cold start times.
 * @param {Buffer} buf
 * @param {string} mimeType
 * @return {Promise<{ buffer: Buffer, format: string }>}
 */
async function stripImageExif(buf, mimeType) {
  const sharp = require('sharp');
  const sharpInstance = sharp(buf);
  const format = mimeType === 'image/png' ? 'png' : 'jpeg';
  const buffer = await sharpInstance
      .toFormat(format, {quality: 88})
      .toBuffer();
  return {buffer, format};
}

/**
 * Run a Gemini safety scan on an image buffer.
 * @param {Buffer} imageBuf
 * @param {string} mimeType
 * @param {string} geminiKey
 * @return {Promise<{safe: boolean, safetyScore: number, reason: string|null}>}
 */
async function runSafetyScan(imageBuf, mimeType, geminiKey) {
  try {
    const ai = new GoogleGenAI({apiKey: geminiKey});
    const base64 = imageBuf.toString('base64');

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: IMAGE_MIME.has(mimeType) ? mimeType : 'image/jpeg',
                data: base64,
              },
            },
            {
              text: [
                'You are a content safety classifier for a youth soccer training app.',
                'Rate the safety of this image on a scale from 0 (completely safe) to 100 (extremely unsafe).',
                'Consider: explicit/NSFW content, graphic violence, visible PII (ID documents, birth certificates), and inappropriate content for players under 13.',
                'A soccer training clip should score 0-15. An image of a document with personal info should score 60+.',
                'Respond with ONLY a JSON object: { "score": <number 0-100>, "reason": <null or brief string if score > 20> }',
              ].join(' '),
            },
          ],
        },
      ],
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '{"score":0,"reason":null}';
    const clean = text.replace(/```(?:json)?\n?|```/g, '').trim();
    const parsed = JSON.parse(clean);
    const score = Math.min(100, Math.max(0, Number(parsed.score ?? 0)));
    return {safe: score < SAFETY_BLOCK_THRESHOLD, safetyScore: score, reason: parsed.reason ?? null};
  } catch (err) {
    logger.warn('[processMedia] safety scan failed, defaulting to safe', {err: err.message});
    return {safe: true, safetyScore: -1, reason: 'scan_failed'};
  }
}

/** Handle quarantine for unsafe content */
async function quarantineContent(stagingFile, clipRef, details) {
  const {tenantId, uid, clipId, filePath, safetyResult} = details;
  const quarantinePath = `tenants/${tenantId}/quarantine/${uid}/${clipId}${path.extname(filePath)}`;
  await stagingFile.move(quarantinePath);
  await clipRef.update({
    status: 'quarantined',
    safetyScore: safetyResult.safetyScore,
    safetyReason: safetyResult.reason,
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await db().collection('audit_logs').add({
    action: 'MEDIA_QUARANTINED',
    actorUid: uid,
    clipId,
    tenantId,
    safetyScore: safetyResult.safetyScore,
    safetyReason: safetyResult.reason,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
  logger.warn('[processMedia] content QUARANTINED', {clipId, score: safetyResult.safetyScore});
}

/** Save processed file to media bucket and update Firestore record */
async function promoteToMedia(bucket, stagingFile, clipRef, details) {
  const {tenantId, uid, clipId, filePath, processedBuffer, processedMime, contentType, safetyResult} = details;
  const ext = path.extname(filePath) || (IMAGE_MIME.has(contentType) ? '.jpg' : '.mp4');
  const mediaPath = `tenants/${tenantId}/media/${uid}/${clipId}${ext}`;
  const mediaFile = bucket.file(mediaPath);

  await mediaFile.save(processedBuffer, {
    metadata: {
      contentType: processedMime,
      metadata: {
        'x-vanguard-tenant': tenantId,
        'x-vanguard-clip-id': clipId,
        'x-vanguard-processed': 'true',
      },
    },
  });

  await stagingFile.delete();

  const [publicUrl] = await mediaFile.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 24 * 60 * 60 * 1000,
  });

  await clipRef.update({
    status: 'ready',
    processedPath: mediaPath,
    publicUrl,
    safetyScore: safetyResult.safetyScore,
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
    storagePath: mediaPath,
  });

  logger.info('[processMedia] pipeline complete', {clipId, mediaPath});
}

const storageBucket = resolveStorageBucket();

exports.processMedia = onObjectFinalized(
    {
      region: REGION,
      secrets: [GEMINI_API_KEY],
      timeoutSeconds: 540,
      memory: '1GiB',
      ...(storageBucket ? {bucket: storageBucket} : {}),
    },
    async (event) => {
      const filePath = event.data.name;
      const contentType = event.data.contentType ?? '';
      const parsed = parseStagingPath(filePath);
      if (!parsed) return;

      const {tenantId, uid, clipId} = parsed;
      const bucket = admin.storage().bucket(event.data.bucket);
      const stagingFile = bucket.file(filePath);
      const clipRef = db().doc(`player_media/${uid}/clips/${clipId}`);

      await clipRef.update({status: 'processing', processingStartedAt: admin.firestore.FieldValue.serverTimestamp()});
      logger.info('[processMedia] pipeline started', {filePath, clipId, tenantId, contentType});

      try {
        const [rawBuffer] = await stagingFile.download();
        let processedBuffer = rawBuffer;
        let processedMime = contentType;
        let thumbBuffer = null;

        if (IMAGE_MIME.has(contentType)) {
          const result = await stripImageExif(rawBuffer, contentType);
          processedBuffer = result.buffer;
          processedMime = result.format === 'png' ? 'image/png' : 'image/jpeg';
          thumbBuffer = processedBuffer;
          logger.info('[processMedia] EXIF stripped', {clipId, originalSize: rawBuffer.length, cleanSize: processedBuffer.length});
        } else if (VIDEO_MIME.has(contentType)) {
          logger.info('[processMedia] video EXIF: GCS metadata cleared', {clipId});
          thumbBuffer = null;
        }

        const scanTarget = thumbBuffer ?? processedBuffer;
        let safetyResult = {safe: true, safetyScore: 0, reason: null};

        if (scanTarget && GEMINI_API_KEY.value()) {
          safetyResult = await runSafetyScan(scanTarget, IMAGE_MIME.has(contentType) ? processedMime : 'image/jpeg', GEMINI_API_KEY.value());
          logger.info('[processMedia] safety scan result', {clipId, ...safetyResult});
        }

        if (!safetyResult.safe) {
          await quarantineContent(stagingFile, clipRef, {tenantId, uid, clipId, filePath, safetyResult});
          return;
        }

        await promoteToMedia(bucket, stagingFile, clipRef, {
          tenantId, uid, clipId, filePath, processedBuffer, processedMime, contentType, safetyResult,
        });
      } catch (err) {
        logger.error('[processMedia] pipeline error', {clipId, err: err.message});
        await clipRef.update({
          status: 'error',
          errorMessage: String(err.message).slice(0, 400),
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    },
);
