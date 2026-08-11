'use strict';

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const { parse } = require('csv-parse/sync');
const { getFirestore } = require('firebase-admin/firestore');
const { sanitizeVampireRow, validateVampireSchema } = require('../utils/vampireSanitizer');

exports.interoperabilitySync = onCall((request) => {
  return { success: true };
});

exports.interoperabilityWebhook = onRequest((req, res) => {
  res.status(200).send("OK");
});

exports.vampireIngestRows = onCall({ region: 'us-east1' }, async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'User must be authenticated.');

  const role = auth.token.role || '';
  const clubId = auth.token.clubId || '';
  if (!['admin', 'director', 'coach'].includes(role)) {
    throw new HttpsError('permission-denied', 'Only authorized staff can upload rosters.');
  }
  if (!clubId) throw new HttpsError('permission-denied', 'No associated clubId.');

  const { csvPayload, teamId } = data;
  if (!csvPayload || !teamId) throw new HttpsError('invalid-argument', 'Missing payload/teamId.');

  let parsedRows;
  try {
    parsedRows = parse(csvPayload, { columns: true, skip_empty_lines: true });
  } catch (err) {
    logger.error('CSV Parse failed', err);
    throw new HttpsError('invalid-argument', 'Malformed CSV.');
  }

  const sanitizedRows = parsedRows.map(sanitizeVampireRow);
  if (!validateVampireSchema(sanitizedRows)) {
    throw new HttpsError('invalid-argument', 'CSV schema validation failed.');
  }

  const db = getFirestore();
  let batch = db.batch();
  let opCount = 0;
  let totalProcessed = 0;

  for (let i = 0; i < sanitizedRows.length; i++) {
    const row = sanitizedRows[i];
    const docId = `vamp_${teamId}_${Date.now()}_${i}_${Math.floor(Math.random() * 100000)}`;
    const ref = db.collection('roster_staging').doc(docId);
    batch.set(ref, {
      ...row,
      teamId,
      clubId,
      createdBy: auth.uid,
      ingestedAt: new Date().toISOString()
    });
    opCount++;
    totalProcessed++;

    if (opCount === 500) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }

  if (opCount > 0) await batch.commit();
  return { success: true, count: totalProcessed };
});
