/* eslint-disable max-len */
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const crypto = require('crypto');

/**
 * PHASE 1: SECURE BIOMETRIC INGESTION
 * Endpoint for client-side Apple HealthKit / Google Fit pushes.
 */
exports.ingestBiometrics = onCall({ region: 'us-central1' }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { date, hrv, sleepMinutes, rhr } = req.data;
  if (!date) {
    throw new HttpsError('invalid-argument', 'date string (YYYY-MM-DD) is required.');
  }

  const firestore = admin.firestore();
  
  // Enforce zero-liability PII invariant
  const docRef = firestore.doc(`player_biometrics/${uid}/daily/${date}`);
  
  await docRef.set({
    date,
    hrv: Number(hrv) || null,
    sleepMinutes: Number(sleepMinutes) || null,
    rhr: Number(rhr) || null,
    source: 'client_push',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  logger.info('ingestBiometrics success', { uid, date });
  return { success: true };
});

/**
 * Webhook for Garmin OAuth server-to-server push.
 */
exports.garminWebhook = onRequest({ region: 'us-central1' }, async (req, res) => {
  // In production, validate OAuth1 signature and route to respective UID
  logger.info('garminWebhook received payload');
  res.status(200).send('OK');
});

/**
 * Webhook for Whoop API server-to-server push.
 */
exports.whoopWebhook = onRequest({ region: 'us-central1' }, async (req, res) => {
  // In production, validate webhook signature and route to respective UID
  logger.info('whoopWebhook received payload');
  res.status(200).send('OK');
});
