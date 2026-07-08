'use strict';

const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const { getFirestore } = require('firebase-admin/firestore');

const STACK_SPORTS_CLIENT_ID = defineSecret('STACK_SPORTS_CLIENT_ID');
const STACK_SPORTS_CLIENT_SECRET = defineSecret('STACK_SPORTS_CLIENT_SECRET');

const REDIRECT_URI = process.env.FUNCTIONS_EMULATOR === 'true' 
  ? 'http://127.0.0.1:5001/soccer-skills-tracker-dev/us-central1/stackSportsAuthCallback'
  : 'https://us-central1-soccer-skills-tracker-prod.cloudfunctions.net/stackSportsAuthCallback';

/**
 * PHASE 1: OAUTH 2.0 HANDSHAKE - INIT
 * Redirects the user to Stack Sports OAuth consent screen.
 */
exports.stackSportsAuthInit = onRequest({ secrets: [STACK_SPORTS_CLIENT_ID] }, (req, res) => {
  const { clubId } = req.query;
  if (!clubId) {
    res.status(400).send('Missing clubId parameter');
    return;
  }

  // Generate a random state token and append clubId to it (in production use a signed JWT or session)
  const state = Buffer.from(JSON.stringify({ clubId, nonce: Math.random().toString(36).substring(7) })).toString('base64');
  
  const clientId = STACK_SPORTS_CLIENT_ID.value();
  const authUrl = `https://stacksports.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&state=${encodeURIComponent(state)}&scope=offline_access%20clubs%20teams%20rosters`;
  
  logger.info(`Initiating Stack Sports OAuth for clubId: ${clubId}`);
  res.redirect(authUrl);
});

/**
 * PHASE 1: OAUTH 2.0 HANDSHAKE - CALLBACK
 * Handles the redirect, exchanges code for access token, and stores it in Firestore.
 */
exports.stackSportsAuthCallback = onRequest({ secrets: [STACK_SPORTS_CLIENT_ID, STACK_SPORTS_CLIENT_SECRET] }, async (req, res) => {
  const { code, state } = req.query;
  
  if (!code || !state) {
    res.status(400).send('Missing code or state parameter');
    return;
  }

  try {
    const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    const { clubId } = decodedState;
    if (!clubId) throw new Error('Invalid state token');

    // Simulate Token Exchange (Replace with actual fetch to Stack Sports API)
    const tokenResponse = await Promise.resolve({
      access_token: 'mock_stack_sports_access_token',
      refresh_token: 'mock_stack_sports_refresh_token',
      expires_in: 3600
    });

    // Securely store the token
    const db = getFirestore();
    await db.doc(`integration_credentials/${clubId}`).set({
      provider: 'stack_sports',
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      updatedAt: new Date(),
    });

    logger.info(`Successfully stored Stack Sports credentials for clubId: ${clubId}`);
    
    // Redirect back to admin console
    res.redirect(`/admin/organizations`);
  } catch (err) {
    logger.error('Stack Sports OAuth callback failed', err);
    res.status(500).send('OAuth callback failed');
  }
});

/**
 * PHASE 3: THE VAMPIRE SYNC PIPELINE
 * Pulls payloads from Stack Sports and normalizes them to Firestore using batched writes (capped at 500).
 */
exports.syncStackSportsDataFn = onCall({ secrets: [STACK_SPORTS_CLIENT_ID, STACK_SPORTS_CLIENT_SECRET] }, async (request) => {
  const { clubId } = request.data;
  
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }
  if (!clubId) {
    throw new HttpsError('invalid-argument', 'Missing clubId.');
  }

  try {
    const db = getFirestore();
    const credsDoc = await db.doc(`integration_credentials/${clubId}`).get();
    
    if (!credsDoc.exists) {
      throw new HttpsError('failed-precondition', 'Stack Sports integration not configured for this club.');
    }

    const { accessToken } = credsDoc.data();
    logger.info(`Syncing Stack Sports data for club: ${clubId} using token: ${accessToken.substring(0, 5)}...`);

    // Mock Payload from Stack Sports
    const mockTeams = Array.from({ length: 1200 }, (_, i) => ({
      stackId: `t_${i}`,
      name: `Team ${i}`,
      division: 'U12',
    }));

    let batch = db.batch();
    let opCount = 0;
    let totalSynced = 0;

    for (const team of mockTeams) {
      const teamRef = db.doc(`clubs/${clubId}/teams/${team.stackId}`);
      batch.set(teamRef, {
        name: team.name,
        division: team.division,
        source: 'stack_sports',
        updatedAt: new Date(),
      }, { merge: true });

      opCount++;
      totalSynced++;

      if (opCount === 500) {
        await batch.commit();
        logger.info(`Committed 500 ops for clubId: ${clubId}`);
        batch = db.batch();
        opCount = 0;
      }
    }

    // Commit any remaining operations
    if (opCount > 0) {
      await batch.commit();
      logger.info(`Committed remaining ${opCount} ops for clubId: ${clubId}`);
    }

    return { success: true, syncedTeams: totalSynced };
  } catch (err) {
    logger.error(`Error in syncStackSportsDataFn: ${err.message}`);
    throw new HttpsError('internal', 'Vampire Sync Pipeline failed.', err.message);
  }
});
