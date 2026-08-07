'use strict';

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const pdfParse = require('pdf-parse');
const { getFirestore } = require('firebase-admin/firestore');
const { extractPlayersFromPdfText, mapExtractedPlayerToCoach } = require('./rosterIngestParse');

exports.interoperabilitySync = onCall((request) => {
  return { success: true };
});

exports.interoperabilityWebhook = onRequest((req, res) => {
  res.status(200).send("OK");
});

exports.vampireIngestRows = onCall({ region: 'us-east1' }, async (request) => {
  const { auth, data } = request;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const role = auth.token.role || '';
  const clubId = auth.token.clubId || '';
  
  if (role !== 'admin' && role !== 'director' && role !== 'coach') {
    throw new HttpsError('permission-denied', 'Only authorized staff can upload rosters.');
  }
  if (!clubId) {
    throw new HttpsError('permission-denied', 'No associated clubId.');
  }

  const { fileBufferBase64, teamId } = data;
  if (!fileBufferBase64 || !teamId) {
    throw new HttpsError('invalid-argument', 'Missing file payload or teamId.');
  }

  let pdfText = '';
  try {
    const pdfBuffer = Buffer.from(fileBufferBase64, 'base64');
    // Direct async function call without 'new' keyword
    const parsedData = await pdfParse(pdfBuffer);
    pdfText = parsedData.text;
  } catch (error) {
    logger.error('PDF Parse failed', error);
    throw new HttpsError('internal', 'Failed to read PDF payload.');
  }

  const apiKey = process.env.GEMINI_API_KEY || ''; // Adjust depending on env
  if (!apiKey) {
    logger.error('Missing GEMINI_API_KEY');
  }

  const extracted = await extractPlayersFromPdfText(pdfText, apiKey);
  const players = extracted.map(mapExtractedPlayerToCoach).filter(Boolean);
  if (!players.length) throw new HttpsError('invalid-argument', 'No valid players extracted.');

  const db = getFirestore();
  let batch = db.batch();
  let opCount = 0;
  
  for (const p of players) {
    const pId = p.playerEmail || `roster_${teamId}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const ref = db.collection('users').doc(pId.toLowerCase());
    batch.set(ref, {
      ...p,
      role: 'player',
      clubId: clubId,
      teamId: teamId,
      createdBy: auth.uid,
      source: 'vampireIngestRows'
    }, { merge: true });
    opCount++;
    if (opCount === 500) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }

  if (opCount > 0) {
    await batch.commit();
  }

  return { success: true, count: players.length };
});
