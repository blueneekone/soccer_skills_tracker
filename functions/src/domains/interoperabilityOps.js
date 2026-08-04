'use strict';

const { onCall, onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { assertDirectorClubOrSuper } = require('../middleware/authBouncers');

const REGION = 'us-east1';
const db = () => admin.firestore();
const BATCH_LIMIT = 500;

exports.interoperabilitySync = onCall((request) => {
  return { success: true };
});

exports.interoperabilityWebhook = onRequest((req, res) => {
  res.status(200).send("OK");
});

exports.vampireIngestRows = onCall({ region: REGION }, async (request) => {
  const { clubId, rows = [] } = request.data ?? {};
  assertDirectorClubOrSuper(request, clubId);

  if (!Array.isArray(rows) || rows.length === 0) {
    return { ingested: 0 };
  }

  const firestoreDb = db();
  let ingested = 0;

  for (let i = 0; i < rows.length; i += BATCH_LIMIT) {
    const batch = firestoreDb.batch();
    const chunk = rows.slice(i, i + BATCH_LIMIT);

    for (const row of chunk) {
      const docRef = firestoreDb.collection('roster_staging').doc();
      batch.set(docRef, {
        clubId,
        firstName: row.firstName || '',
        lastName: row.lastName || '',
        email: row.email || '',
        role: row.role || '',
        ingestedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      ingested++;
    }

    await batch.commit();
  }

  logger.info('[vampireIngestRows] batch committed', { clubId, ingested });
  return { ingested };
});
