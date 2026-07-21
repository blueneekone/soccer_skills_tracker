'use strict';

/**
 * Universal Roster Ingestion Engine — Parses CSV, JSON, and PDF rosters.
 * Refactored to leverage extracted utilities and respect the 80-line limit.
 */

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const {defineSecret} = require('firebase-functions/params');
const {resolveDirectorRbac, sanitizeIngestPayload, validateIngestPayload} = require('./src/domains/rosterIngestRbac');
const {batchCommitRoster} = require('./src/domains/rosterIngestMutations');
const {MAX_PLAYERS_PER_BATCH, normEmail, isValidEmail, parseCsv, mapRowToSchema, parsePdfBase64ToCoachPlayers} = require('./src/domains/rosterIngestParse');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const REGION = 'us-east1';

/**
 * Extracts raw players from payload based on format.
 */
async function parseRawPlayers(format, content) {
  if (format === 'csv') return parseCsv(content).map(mapRowToSchema).filter(Boolean);
  if (format === 'json') {
    try {
      const arr = Array.isArray(JSON.parse(content)) ? JSON.parse(content) : [JSON.parse(content)];
      return arr.map(mapRowToSchema).filter(Boolean);
    } catch {
      throw new HttpsError('invalid-argument', 'Invalid JSON content.');
    }
  }
  if (format === 'pdf') {
    try {
      const coachRows = await parsePdfBase64ToCoachPlayers(content, GEMINI_API_KEY.value());
      return coachRows.filter((p) => p.playerEmail && isValidEmail(p.playerEmail)).map((p) => ({
        email: normEmail(p.playerEmail), displayName: p.playerName, jerseyNumber: p.jersey,
      }));
    } catch (err) {
      throw new HttpsError(err?.message?.includes('GEMINI_API_KEY') ? 'failed-precondition' : 'internal', err?.message || 'PDF parse failed.');
    }
  }
  return [];
}

exports.ingestRoster = onCall(
    {region: REGION, secrets: [GEMINI_API_KEY], timeoutSeconds: 120},
    async (request) => {
      const {tenantId, callerUid} = resolveDirectorRbac(request);
      const payload = sanitizeIngestPayload(request.data);
      validateIngestPayload(payload);

      const rawPlayers = await parseRawPlayers(payload.format, payload.content);

      if (!rawPlayers.length) throw new HttpsError('invalid-argument', 'No valid player records found. Ensure emails are present.');
      if (rawPlayers.length > MAX_PLAYERS_PER_BATCH) throw new HttpsError('invalid-argument', `Exceeds limit of ${MAX_PLAYERS_PER_BATCH} players per batch.`);

      logger.info('[ingestRoster] parsed', {count: rawPlayers.length, format: payload.format, tenantId});
      const batchResult = await batchCommitRoster(rawPlayers, {callerUid, tenantId, teamId: payload.teamId, format: payload.format});
      logger.info('[ingestRoster] batch committed', {processed: batchResult.processed, skipped: batchResult.skipped});
      return batchResult;
    },
);
