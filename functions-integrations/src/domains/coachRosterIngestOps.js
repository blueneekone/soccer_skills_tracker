'use strict';

/**
 * Coach-scoped roster file parse (CSV/PDF) — preview rows for secureBulkAddPlayers.
 */

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {defineSecret} = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const {assertCanSecureAddPlayer} = require('../middleware/authBouncers');
const {sanitizeIngestPayload} = require('./rosterIngestRbac');
const {
  MAX_PLAYERS_PER_BATCH,
  parseCsvBase64ToCoachPlayers,
  parsePdfBase64ToCoachPlayers,
} = require('./rosterIngestParse');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const REGION = 'us-east1';

exports.coachRosterIngest = onCall(
    {region: REGION, secrets: [GEMINI_API_KEY], timeoutSeconds: 120},
    async (request) => {
      const {format, content: contentBase64, teamId} = sanitizeIngestPayload(request.data);

      if (!teamId) throw new HttpsError('invalid-argument', 'teamId is required.');
      if (!format || (format !== 'csv' && format !== 'pdf')) {
        throw new HttpsError('invalid-argument', 'format must be "csv" or "pdf".');
      }
      if (!contentBase64) throw new HttpsError('invalid-argument', 'contentBase64 is required.');

      await assertCanSecureAddPlayer(request, teamId);

      let players = [];
      try {
        if (format === 'csv') {
          players = parseCsvBase64ToCoachPlayers(contentBase64);
        } else {
          players = await parsePdfBase64ToCoachPlayers(contentBase64, GEMINI_API_KEY.value());
        }
      } catch (err) {
        const msg = err?.message || 'Parse failed.';
        throw new HttpsError(msg.includes('GEMINI_API_KEY') ? 'failed-precondition' : 'invalid-argument', msg);
      }

      if (!players.length) throw new HttpsError('invalid-argument', 'No valid player rows found.');
      if (players.length > MAX_PLAYERS_PER_BATCH) {
        throw new HttpsError('invalid-argument', `Exceeds ${MAX_PLAYERS_PER_BATCH} limit.`);
      }

      logger.info('[coachRosterIngest] parsed', {count: players.length, format, teamId});
      return {ok: true, players};
    },
);
