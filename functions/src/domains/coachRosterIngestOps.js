'use strict';

/**
 * Coach-scoped roster file parse (CSV/PDF) — preview rows for secureBulkAddPlayers.
 * Does not write Firestore; director ingestRoster remains invite-code path only.
 */

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {defineSecret} = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const {assertCanSecureAddPlayer} = require('../middleware/authBouncers');
const {
  MAX_PLAYERS_PER_BATCH,
  parseCsvBase64ToCoachPlayers,
  parsePdfBase64ToCoachPlayers,
} = require('./rosterIngestParse');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const REGION = 'us-east1';

/**
 * @param {unknown} raw
 * @return {string}
 */
function normFormat(raw) {
  if (typeof raw !== 'string') return '';
  const f = raw.trim().toLowerCase();
  return f === 'csv' || f === 'pdf' ? f : '';
}

exports.coachRosterIngest = onCall(
    {region: REGION, secrets: [GEMINI_API_KEY], timeoutSeconds: 120},
    async (request) => {
      const data = request.data || {};
      const teamId =
        typeof data.teamId === 'string' ? data.teamId.trim().slice(0, 200) : '';
      const format = normFormat(data.format);
      const contentBase64 =
        typeof data.contentBase64 === 'string' ? data.contentBase64.trim() : '';

      if (!teamId) {
        throw new HttpsError('invalid-argument', 'teamId is required.');
      }
      if (!format) {
        throw new HttpsError('invalid-argument', 'format must be "csv" or "pdf".');
      }
      if (!contentBase64) {
        throw new HttpsError('invalid-argument', 'contentBase64 is required.');
      }

      await assertCanSecureAddPlayer(request, teamId);

      /** @type {Array<{ playerName: string, playerEmail?: string, jersey?: string }>} */
      let players = [];
      try {
        if (format === 'csv') {
          players = parseCsvBase64ToCoachPlayers(contentBase64);
        } else {
          players = await parsePdfBase64ToCoachPlayers(
              contentBase64,
              GEMINI_API_KEY.value(),
          );
        }
      } catch (err) {
        const msg = err && err.message ? String(err.message) : 'Parse failed.';
        if (msg.includes('GEMINI_API_KEY')) {
          throw new HttpsError('failed-precondition', msg);
        }
        throw new HttpsError('invalid-argument', msg);
      }

      if (!players.length) {
        throw new HttpsError(
            'invalid-argument',
            'No valid player rows found. Ensure names (and valid emails when present).',
        );
      }
      if (players.length > MAX_PLAYERS_PER_BATCH) {
        throw new HttpsError(
            'invalid-argument',
            `Too many players: ${players.length} exceeds the ${MAX_PLAYERS_PER_BATCH} per-batch limit.`,
        );
      }

      logger.info('[coachRosterIngest] parsed', {
        count: players.length,
        format,
        teamId,
      });

      return {ok: true, players};
    },
);
