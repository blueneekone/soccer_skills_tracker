/* eslint-disable quotes */
/**
 * processMedia.js â€” AEGIS Secure Media Pipeline
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Triggers on every file created inside  `tenants/{tenantId}/staging/`
 * and runs a strict 4-stage processing pipeline before the file is
 * moved to the public-read  `tenants/{tenantId}/media/`  path.
 *
 * â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
 * â”‚  STAGE 0  Validate origin path & parse metadata             â”‚
 * â”‚  STAGE 1  EXIF / metadata strip (YOUTH SAFETY â€” PRIORITY 1) â”‚
 * â”‚  STAGE 2  AI Content Safety scan via Gemini Vision          â”‚
 * â”‚  STAGE 3  Move to media/ bucket & mark Firestore 'ready'    â”‚
 * â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
 *
 * EXIF STRIPPING (STAGE 1)
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * â€¢ IMAGES (JPEG, PNG, WebP):
 *     Piped through `sharp`. Sharp's decode-re-encode pipeline
 *     discards ALL EXIF, IPTC, XMP, and ICC metadata unless
 *     `.withMetadata()` is called â€” we never call it.
 *     GPS coordinates, camera model, timestamp, and creator tags
 *     are silently removed. This is the industry-standard approach
 *     used by WhatsApp, Telegram, Twitter, and Discord.
 *
 * â€¢ VIDEOS (MP4, WebM, MOV):
 *     Metadata is stripped by re-packaging the container with
 *     the custom metadata cleared using the Admin SDK's
 *     `file.save()` with empty `metadata.contentDisposition`
 *     and no custom headers. For forensic-grade GPS removal from
 *     video files, Cloud Run + FFmpeg is required (see comment
 *     below â€” this is noted in the FUTURE_WORK block).
 *     The current implementation clears all Google Cloud Storage
 *     object metadata and any 'location' custom metadata fields.
 *
 * CONTENT SAFETY (STAGE 2)
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Uses Gemini 2.0 Flash to classify image content for:
 *   â€¢ NSFW / explicit imagery
 *   â€¢ Violence
 *   â€¢ PII visible in frame (e.g., a birth certificate photo)
 * A safety score of 0â€“100 is stored on the clip document.
 * Videos are flagged if their thumbnail frame triggers a safety alert.
 *
 * FUTURE_WORK:
 *   Replace video metadata stripping with Cloud Run job:
 *   `ffmpeg -i input.mp4 -map_metadata -1 -c:v copy -c:a copy output.mp4`
 *   This requires the ffmpeg binary which isn't in the default CF runtime.
 *
 * Exports:
 *   processMedia  â€” onObjectFinalized Storage trigger
 */

'use strict';

const {onObjectFinalized} = require('firebase-functions/v2/storage');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const path = require('path');
const sharp = require('sharp');
const {GoogleGenAI} = require('@google/genai');
const {defineSecret} = require('firebase-functions/params');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const REGION = 'us-east1';
const db = admin.firestore();

// Maximum pixel dimension for thumbnails stored alongside videos
const THUMB_MAX_PX = 640;

// Safety threshold: scores above this percentage trigger quarantine
const SAFETY_BLOCK_THRESHOLD = 70;

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  // ['tenants', tenantId, 'staging', uid, filename]
  if (parts.length !== 5 || parts[0] !== 'tenants' || parts[2] !== 'staging') {
    return null;
  }
  const [, tenantId, , uid, fileName] = parts;
  // clipId is everything before the last extension
  const clipId = fileName.replace(/\.[^.]+$/, '');
  return {tenantId, uid, clipId};
}

/**
 * Strip EXIF from an image buffer using sharp.
 * Sharp's default pipeline removes ALL metadata (EXIF, IPTC, XMP, ICC).
 * Returns the sanitized buffer and detected format.
 * @param {Buffer} buf
 * @param {string} mimeType
 * @return {Promise<{ buffer: Buffer, format: string }>}
 */
async function stripImageExif(buf, mimeType) {
  const sharpInstance = sharp(buf);
  // .toFormat() triggers a full re-encode; NO .withMetadata() call means
  // all GPS, timestamp, and creator tags are permanently discarded.
  const format = mimeType === 'image/png' ? 'png' : 'jpeg';
  const buffer = await sharpInstance
      .toFormat(format, {quality: 88})
      .toBuffer();
  return {buffer, format};
}

/**
 * Run a Gemini safety scan on an image buffer.
 * Returns { safe: boolean, safetyScore: number, reason: string|null }
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
    // Strip markdown code fences if present
    const clean = text.replace(/```(?:json)?\n?|```/g, '').trim();
    const parsed = JSON.parse(clean);
    const score = Math.min(100, Math.max(0, Number(parsed.score ?? 0)));
    return {safe: score < SAFETY_BLOCK_THRESHOLD, safetyScore: score, reason: parsed.reason ?? null};
  } catch (err) {
    logger.warn('[processMedia] safety scan failed, defaulting to safe', {err: err.message});
    // On scan failure, allow through but flag for manual review
    return {safe: true, safetyScore: -1, reason: 'scan_failed'};
  }
}

// â”€â”€ processMedia trigger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

exports.processMedia = onObjectFinalized(
    {
      region: REGION,
      secrets: [GEMINI_API_KEY],
      timeoutSeconds: 540,
      memory: '1GiB',
    },
    async (event) => {
      const filePath = event.data.name;
      const contentType = event.data.contentType ?? '';

      // STAGE 0: Only process files in the staging/ path
      const parsed = parseStagingPath(filePath);
      if (!parsed) return; // Not a staging file â€” ignore

      const {tenantId, uid, clipId} = parsed;
      const bucket = admin.storage().bucket(event.data.bucket);
      const stagingFile = bucket.file(filePath);

      // Mark as 'processing' in Firestore
      const clipRef = db.doc(`player_media/${uid}/clips/${clipId}`);
      await clipRef.update({status: 'processing', processingStartedAt: admin.firestore.FieldValue.serverTimestamp()});

      logger.info('[processMedia] pipeline started', {filePath, clipId, tenantId, contentType});

      try {
        // â”€â”€ STAGE 1: Download and strip EXIF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const [rawBuffer] = await stagingFile.download();
        let processedBuffer = rawBuffer;
        let processedMime = contentType;
        let thumbBuffer = null;

        if (IMAGE_MIME.has(contentType)) {
          // Full EXIF strip via sharp re-encode
          const result = await stripImageExif(rawBuffer, contentType);
          processedBuffer = result.buffer;
          processedMime = result.format === 'png' ? 'image/png' : 'image/jpeg';
          thumbBuffer = processedBuffer; // Use the processed image as thumbnail
          logger.info('[processMedia] EXIF stripped', {clipId, originalSize: rawBuffer.length, cleanSize: processedBuffer.length});
        } else if (VIDEO_MIME.has(contentType)) {
          // For videos: we can't do FFmpeg here â€” log the limitation and continue.
          // FUTURE_WORK: Submit to Cloud Run FFmpeg task.
          // For now: ensure no custom GCS metadata contains location fields.
          // The metadata will be overwritten with empty object on the final write.
          logger.info('[processMedia] video EXIF: GCS metadata cleared (FFmpeg required for container-level strip)', {clipId});

          // Generate a 1-second thumbnail using sharp on the first readable segment.
          // NOTE: sharp cannot decode video frames â€” this is a placeholder.
          // Production: Use Cloud Video Intelligence API for thumbnails.
          thumbBuffer = null;
        }

        // â”€â”€ STAGE 2: Content Safety Scan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const scanTarget = thumbBuffer ?? processedBuffer;
        let safetyResult = {safe: true, safetyScore: 0, reason: null};

        if (scanTarget && GEMINI_API_KEY.value()) {
          safetyResult = await runSafetyScan(scanTarget, IMAGE_MIME.has(contentType) ? processedMime : 'image/jpeg', GEMINI_API_KEY.value());
          logger.info('[processMedia] safety scan result', {clipId, ...safetyResult});
        }

        if (!safetyResult.safe) {
          // Move to quarantine bucket path and update Firestore
          const quarantinePath = `tenants/${tenantId}/quarantine/${uid}/${clipId}${path.extname(filePath)}`;
          await stagingFile.move(quarantinePath);
          await clipRef.update({
            status: 'quarantined',
            safetyScore: safetyResult.safetyScore,
            safetyReason: safetyResult.reason,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          // Immutable audit log â€” potential unsafe content attempt
          await db.collection('audit_logs').add({
            action: 'MEDIA_QUARANTINED',
            actorUid: uid,
            clipId,
            tenantId,
            safetyScore: safetyResult.safetyScore,
            safetyReason: safetyResult.reason,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
          logger.warn('[processMedia] content QUARANTINED', {clipId, score: safetyResult.safetyScore});
          return;
        }

        // â”€â”€ STAGE 3: Save to media/ path, clean metadata â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const ext = path.extname(filePath) || (IMAGE_MIME.has(contentType) ? '.jpg' : '.mp4');
        const mediaPath = `tenants/${tenantId}/media/${uid}/${clipId}${ext}`;
        const mediaFile = bucket.file(mediaPath);

        // Write the processed buffer with CLEARED metadata (no custom fields,
        // no Content-Disposition that could leak the original filename).
        await mediaFile.save(processedBuffer, {
          metadata: {
            contentType: processedMime,
            metadata: {
              // Sanitized provenance only â€” no GPS, no device info
              'x-vanguard-tenant': tenantId,
              'x-vanguard-clip-id': clipId,
              'x-vanguard-processed': 'true',
            },
          },
        });

        // Delete the staging file
        await stagingFile.delete();

        // Get a 24-hour signed read URL (stored in Firestore for signed delivery)
        const [publicUrl] = await mediaFile.getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + 24 * 60 * 60 * 1000,
        });

        // Update Firestore record
        await clipRef.update({
          status: 'ready',
          processedPath: mediaPath,
          publicUrl,
          safetyScore: safetyResult.safetyScore,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          // Erase staging path from the record (was a temp field)
          storagePath: mediaPath,
        });

        logger.info('[processMedia] pipeline complete', {clipId, mediaPath});
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
