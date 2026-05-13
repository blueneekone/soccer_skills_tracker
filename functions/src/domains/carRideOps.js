'use strict';

/**
 * carRideOps.js — Phase 4, Epic 8: The Car Ride Home Protocol
 * ─────────────────────────────────────────────────────────────
 *
 * Two Cloud Function exports:
 *
 *   onMatchResultCreated (Firestore trigger)
 *   ─────────────────────────────────────────
 *   Fires when `match_results/{fixtureId}` is created by a coach.
 *   Resolves parent Auth UIDs for every player in playerStats via the
 *   existing player_lookup → users → households chain, then enqueues a
 *   Cloud Tasks task targeting `deliverCarRideHomePush` at T+15 minutes.
 *   Persists the task name on the result doc for idempotency.
 *
 *   deliverCarRideHomePush (HTTPS — Cloud Tasks target)
 *   ────────────────────────────────────────────────────
 *   Called by Cloud Tasks ~15 minutes after match recording.
 *   OIDC-authenticated: only Google Cloud Tasks service account may invoke.
 *   Idempotency check: short-circuits if `carRideNotifiedAt` already set.
 *   Sends FCM multicast to all parent devices, then stamps the result doc.
 *
 * Required infra (provision once per project):
 *   gcloud tasks queues create car-ride-home \
 *     --location=us-east1 \
 *     --max-attempts=5 \
 *     --min-backoff=30s
 *
 * IAM:
 *   firebase-adminsdk service account needs roles/cloudtasks.enqueuer
 *   on the car-ride-home queue.
 */

const {onDocumentCreated} = require('firebase-functions/v2/firestore');
const {onRequest} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const {CloudTasksClient} = require('@google-cloud/tasks');

const {normEmail} = require('../utils/formatters');
const {collectFcmTokensForUids} = require('./notificationOps');

const REGION = 'us-east1';
const TASKS_LOCATION = 'us-east1';
const TASKS_QUEUE = 'car-ride-home';

/** Lazy Firestore accessor. */
const db = () => admin.firestore();

/** GCP project ID (resolved from App Options at runtime). */
function projectId() {
  return admin.app().options.projectId || process.env.GCLOUD_PROJECT || '';
}

/** Fully-qualified Cloud Tasks queue path. */
function queuePath() {
  return `projects/${projectId()}/locations/${TASKS_LOCATION}/queues/${TASKS_QUEUE}`;
}

/** Handler URL for deliverCarRideHomePush — auto-constructed from project. */
function deliverUrl() {
  return `https://${REGION}-${projectId()}.cloudfunctions.net/deliverCarRideHomePush`;
}

// ── Parent UID resolution ─────────────────────────────────────────────────────

/**
 * Resolve the Auth UIDs of every parent linked to a given player email.
 *
 * Chain: player email → users/{email}.householdId
 *        → households/{hid}.parentEmails[]
 *        → admin.auth().getUserByEmail() per parent email
 *
 * Intentionally mirrors `resolveParentUidsForTrialPlayer` in notificationOps.js
 * but accepts a player email directly (from `playerStats` map keys) rather
 * than resolving through player_lookup first.
 *
 * @param {string} playerEmail - Lowercase player email.
 * @return {Promise<string[]>}
 */
async function resolveParentUidsForEmail(playerEmail) {
  const em = normEmail(playerEmail);
  if (!em || !em.includes('@')) return [];

  const uSnap = await db().collection('users').doc(em).get();
  if (!uSnap.exists) return [];

  const hid = typeof uSnap.data().householdId === 'string'
    ? uSnap.data().householdId.trim()
    : '';
  if (!hid) return [];

  const hSnap = await db().collection('households').doc(hid).get();
  if (!hSnap.exists) return [];

  const parentEmails = hSnap.data().parentEmails;
  if (!Array.isArray(parentEmails) || parentEmails.length === 0) return [];

  const uids = [];
  await Promise.all(parentEmails.map(async (raw) => {
    const pem = normEmail(String(raw));
    if (!pem || !pem.includes('@')) return;
    try {
      const ur = await admin.auth().getUserByEmail(pem);
      if (ur && ur.uid) uids.push(ur.uid);
    } catch (_e) {
      // No Firebase Auth account for this parent email — skip silently.
    }
  }));
  return [...new Set(uids)];
}

/**
 * Resolve all unique parent Auth UIDs for every player in the match.
 *
 * @param {Record<string, unknown>} playerStats - Map keyed by player email.
 * @return {Promise<string[]>}
 */
async function resolveAllParentUids(playerStats) {
  const playerEmails = Object.keys(playerStats || {});
  if (playerEmails.length === 0) return [];

  const uidSets = await Promise.all(
      playerEmails.map((em) => resolveParentUidsForEmail(em)),
  );
  return [...new Set(uidSets.flat())];
}

// ── onMatchResultCreated ──────────────────────────────────────────────────────

/**
 * Firestore trigger: fires when `match_results/{fixtureId}` is created.
 * Resolves parent UIDs and enqueues a delayed Cloud Tasks delivery job.
 */
exports.onMatchResultCreated = onDocumentCreated(
    {
      document: 'match_results/{fixtureId}',
      region: REGION,
    },
    async (event) => {
      const fixtureId = event.params.fixtureId;
      const snap = event.data;
      if (!snap) {
        logger.error('onMatchResultCreated: missing event.data', {fixtureId});
        return;
      }

      const data = snap.data() || {};

      // Idempotency: skip if a push was already scheduled.
      if (data.carRideTaskName) {
        logger.info('onMatchResultCreated: task already enqueued', {
          fixtureId,
          taskName: data.carRideTaskName,
        });
        return;
      }

      const playerStats = data.playerStats || {};
      let parentUids = [];
      try {
        parentUids = await resolveAllParentUids(playerStats);
      } catch (e) {
        logger.error('onMatchResultCreated: resolveAllParentUids failed', {
          fixtureId,
          err: e instanceof Error ? e.message : String(e),
        });
        return;
      }

      if (parentUids.length === 0) {
        logger.info('onMatchResultCreated: no parent UIDs resolved; skip', {
          fixtureId,
        });
        return;
      }

      // Schedule delivery T+15 minutes from the Firestore server timestamp.
      // Fall back to now() if recordedAt is absent on the doc.
      const recordedAtMs = data.recordedAt
        ? data.recordedAt.toMillis()
        : Date.now();
      const scheduleMs = recordedAtMs + 15 * 60 * 1000;

      const taskBody = JSON.stringify({fixtureId, parentUids});
      const task = {
        httpRequest: {
          httpMethod: 'POST',
          url: deliverUrl(),
          headers: {'Content-Type': 'application/json'},
          body: Buffer.from(taskBody).toString('base64'),
          oidcToken: {
            serviceAccountEmail: `firebase-adminsdk@${projectId()}.iam.gserviceaccount.com`,
            audience: deliverUrl(),
          },
        },
        scheduleTime: {
          seconds: Math.floor(scheduleMs / 1000),
        },
      };

      const client = new CloudTasksClient();
      let taskName;
      try {
        const [createdTask] = await client.createTask({
          parent: queuePath(),
          task,
        });
        taskName = createdTask.name || '';
      } catch (e) {
        logger.error('onMatchResultCreated: Cloud Tasks enqueue failed', {
          fixtureId,
          err: e instanceof Error ? e.message : String(e),
        });
        return;
      }

      // Persist task name for idempotency and audit.
      try {
        await db().collection('match_results').doc(fixtureId).update({
          carRideTaskName: taskName,
        });
      } catch (e) {
        logger.warn('onMatchResultCreated: could not stamp carRideTaskName', {
          fixtureId,
          taskName,
          err: e instanceof Error ? e.message : String(e),
        });
        // Non-fatal — the task is already enqueued.
      }

      logger.info('onMatchResultCreated: task enqueued', {
        fixtureId,
        parentUidCount: parentUids.length,
        scheduleMs,
        taskName,
      });
    },
);

// ── deliverCarRideHomePush ────────────────────────────────────────────────────

/**
 * Cloud Tasks target — delivers the Car Ride Home FCM multicast.
 *
 * Authentication: Google OIDC token issued by the Cloud Tasks service account.
 * The function validates the OIDC token via the `Authorization: Bearer` header
 * using Firebase Admin's verifyIdToken (the token audience is this function's URL).
 *
 * Idempotency: checks `carRideNotifiedAt` before sending; safe on retry.
 *
 * @param {import('firebase-functions/v2/https').Request} req
 * @param {import('firebase-functions/v2/https').Response} res
 */
exports.deliverCarRideHomePush = onRequest(
    {region: REGION},
    async (req, res) => {
      // ── OIDC authentication ─────────────────────────────────────────────
      const authHeader = req.headers['authorization'] || '';
      const bearerToken = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : '';

      if (!bearerToken) {
        logger.warn('deliverCarRideHomePush: missing Authorization header');
        res.status(401).send('Unauthorized');
        return;
      }

      try {
        await admin.auth().verifyIdToken(bearerToken);
      } catch (e) {
        logger.warn('deliverCarRideHomePush: OIDC token verification failed', {
          err: e instanceof Error ? e.message : String(e),
        });
        res.status(403).send('Forbidden');
        return;
      }

      // ── Parse payload ───────────────────────────────────────────────────
      const {fixtureId, parentUids} = req.body || {};
      if (!fixtureId || !Array.isArray(parentUids) || parentUids.length === 0) {
        logger.error('deliverCarRideHomePush: invalid payload', {
          fixtureId,
          parentUids,
        });
        res.status(400).send('Bad Request');
        return;
      }

      // ── Idempotency check ───────────────────────────────────────────────
      const resultRef = db().collection('match_results').doc(fixtureId);
      const resultSnap = await resultRef.get();

      if (!resultSnap.exists) {
        logger.error('deliverCarRideHomePush: match_results doc not found', {
          fixtureId,
        });
        res.status(404).send('Not Found');
        return;
      }

      if (resultSnap.data().carRideNotifiedAt) {
        logger.info('deliverCarRideHomePush: already notified; skipping', {
          fixtureId,
        });
        res.status(200).send('Already notified');
        return;
      }

      // ── Collect FCM tokens ──────────────────────────────────────────────
      let tokens = [];
      try {
        tokens = await collectFcmTokensForUids(parentUids);
      } catch (e) {
        logger.error('deliverCarRideHomePush: token collection failed', {
          fixtureId,
          err: e instanceof Error ? e.message : String(e),
        });
        res.status(500).send('Internal Error');
        return;
      }

      if (tokens.length === 0) {
        logger.info('deliverCarRideHomePush: no FCM tokens; stamping notified', {
          fixtureId,
        });
        await resultRef.update({
          carRideNotifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(200).send('No tokens; stamped');
        return;
      }

      // ── FCM multicast ───────────────────────────────────────────────────
      const notification = {
        title: 'The Car Ride Home',
        body: 'Before discussing the match — protect their EQ. Open Vanguard to unlock today\'s metrics.',
      };
      const data = {
        kind: 'car_ride_home',
        fixtureId: String(fixtureId),
        clickAction: `/parent/dashboard?fixtureId=${encodeURIComponent(fixtureId)}`,
      };

      const CHUNK_SIZE = 500;
      for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
        const chunk = tokens.slice(i, i + CHUNK_SIZE);
        try {
          const response = await admin.messaging().sendMulticast({
            tokens: chunk,
            notification,
            data,
          });
          logger.info('deliverCarRideHomePush: sendMulticast ok', {
            fixtureId,
            tokenCount: chunk.length,
            successCount: response.successCount,
            failureCount: response.failureCount,
          });
        } catch (e) {
          logger.error('deliverCarRideHomePush: sendMulticast failed', {
            fixtureId,
            err: e instanceof Error ? e.message : String(e),
          });
        }
      }

      // ── Stamp the result doc ────────────────────────────────────────────
      try {
        await resultRef.update({
          carRideNotifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (e) {
        logger.error('deliverCarRideHomePush: could not stamp carRideNotifiedAt', {
          fixtureId,
          err: e instanceof Error ? e.message : String(e),
        });
      }

      res.status(200).send('OK');
    },
);
