/* eslint-disable quotes */
/**
 * ingestRoster.js — Universal Roster Ingestion Engine
 * Parses CSV, JSON, and PDF roster files and batch-writes
 * discovered players into Firestore under the Director's tenantId.
 *
 * Exports:
 *   ingestRoster — onCall
 */

'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const {defineSecret} = require('firebase-functions/params');
const crypto = require('crypto');
const {
  MAX_PLAYERS_PER_BATCH,
  normEmail,
  isValidEmail,
  parseCsv,
  mapRowToSchema,
  parsePdfBase64ToCoachPlayers,
} = require('./src/domains/rosterIngestParse');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const REGION = 'us-east1';
const db = () => admin.firestore();

/** Generate a unique 6-character alphanumeric invite code. */
function generateCode() {
  return crypto.randomBytes(4).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
}

exports.ingestRoster = onCall(
    {region: REGION, secrets: [GEMINI_API_KEY], timeoutSeconds: 120},
    async (request) => {
      if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');

      const role = request.auth.token.role || '';
      const tenantId = request.auth.token.clubId || request.auth.token.tenantId || '';
      const callerUid = request.auth.uid;

      if (role !== 'director' && role !== 'super_admin' && role !== 'global_admin') {
        throw new HttpsError('permission-denied', 'Director role required for roster ingestion.');
      }
      if (!tenantId && role === 'director') {
        throw new HttpsError('failed-precondition', 'No tenantId on your account.');
      }

      const {format, content, teamId = null} = request.data ?? {};
      if (!format || !['csv', 'json', 'pdf'].includes(format)) {
        throw new HttpsError('invalid-argument', 'format must be "csv", "json", or "pdf".');
      }
      if (!content || typeof content !== 'string') {
        throw new HttpsError('invalid-argument', 'content is required.');
      }

      let rawPlayers = [];

      if (format === 'csv') {
        const rows = parseCsv(content);
        rawPlayers = rows.map(mapRowToSchema).filter(Boolean);
      } else if (format === 'json') {
        let parsed;
        try {
          parsed = JSON.parse(content);
        } catch {
          throw new HttpsError('invalid-argument', 'Invalid JSON content.');
        }
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        rawPlayers = arr.map((r) => mapRowToSchema(r)).filter(Boolean);
      } else if (format === 'pdf') {
        try {
          const coachRows = await parsePdfBase64ToCoachPlayers(
              content,
              GEMINI_API_KEY.value(),
          );
          rawPlayers = coachRows
              .filter((p) => p.playerEmail && isValidEmail(p.playerEmail))
              .map((p) => ({
                email: normEmail(p.playerEmail),
                displayName: p.playerName,
                jerseyNumber: p.jersey,
              }));
        } catch (err) {
          const msg = err && err.message ? String(err.message) : 'PDF parse failed.';
          if (msg.includes('GEMINI_API_KEY')) {
            throw new HttpsError('failed-precondition', msg);
          }
          throw new HttpsError('internal', msg);
        }
      }

      if (!rawPlayers.length) {
        throw new HttpsError('invalid-argument', 'No valid player records found in the uploaded file. Ensure emails are present.');
      }
      if (rawPlayers.length > MAX_PLAYERS_PER_BATCH) {
        throw new HttpsError('invalid-argument', `Too many players: ${rawPlayers.length} exceeds the ${MAX_PLAYERS_PER_BATCH} per-batch limit.`);
      }

      logger.info('[ingestRoster] parsed', {count: rawPlayers.length, format, tenantId});

      const batchResult = {processed: 0, skipped: 0, invites: []};
      const now = admin.firestore.FieldValue.serverTimestamp();
      const batch = db().batch();

      for (const player of rawPlayers) {
        const email = normEmail(player.email);
        if (!email || !isValidEmail(email)) { batchResult.skipped++; continue; }

        const userRef = db().doc(`users/${email}`);
        const existingSnap = await userRef.get();

        const userData = {
          email,
          displayName: player.displayName || email.split('@')[0],
          position: player.position || null,
          dateOfBirth: player.dateOfBirth || null,
          jerseyNumber: player.jerseyNumber || null,
          role: 'player',
          clubId: tenantId,
          tenantId,
          teamId: teamId || null,
          ingestedByUid: callerUid,
          ingestedAt: now,
          status: 'invited',
        };

        if (existingSnap.exists()) {
          const existing = existingSnap.data();
          batch.update(userRef, {
            ...userData,
            role: existing.role || 'player',
            updatedAt: now,
          });
        } else {
          batch.set(userRef, {...userData, createdAt: now, xp: 0, tier: 'ROOKIE'});
        }

        const code = generateCode();
        const inviteRef = db().doc(`invites/${code}`);
        batch.set(inviteRef, {
          code,
          tenantId,
          clubId: tenantId,
          teamId: teamId || null,
          role: 'player',
          usageLimit: 1,
          usageCount: 0,
          consumedByUids: [],
          targetEmail: email,
          createdByUid: callerUid,
          createdAt: now,
          expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });

        batchResult.invites.push({email, code, name: player.displayName || email});
        batchResult.processed++;
      }

      await batch.commit();

      await db().collection('audit_logs').add({
        action: 'ROSTER_INGESTED',
        actorUid: callerUid,
        tenantId,
        format,
        processed: batchResult.processed,
        skipped: batchResult.skipped,
        teamId: teamId || null,
        timestamp: now,
      });

      logger.info('[ingestRoster] batch committed', {processed: batchResult.processed, skipped: batchResult.skipped});
      return batchResult;
    },
);
