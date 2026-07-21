'use strict';

/**
 * Tomorrow.io facility weather webhook — lightning lockdown + FCM alerts.
 * Split from webhooksOps so integrations codebase does not load Stripe.
 */
const crypto = require('crypto');
const {onRequest} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const {defineSecret} = require('firebase-functions/params');
const {
  collectFcmTokensForUids,
  collectPlayerCoachUidsForClub,
} = require('./notificationOps');

const REGION = 'us-east1';
const WEBHOOK_AUTH_TOKEN = defineSecret('WEBHOOK_AUTH_TOKEN');

/** Lazy Firestore accessor — defers init until first call. */
const db = () => admin.firestore();

/**
 * Parse Tomorrow.io-style JSON for facility routing + alert rule display name.
 * @param {Record<string, unknown>} body
 * @return {{ clubId: string, facilityId: string, ruleName: string }}
 */
function parseFacilityWeatherPayload(body) {
  const r = body && typeof body === 'object' ? body : {};
  let clubId =
      typeof r.clubId === 'string' ? r.clubId.trim() : '';
  let facilityId =
      typeof r.facilityId === 'string' ? r.facilityId.trim() : '';
  const params =
      r.parameters && typeof r.parameters === 'object' ?
        /** @type {Record<string, unknown>} */ (r.parameters) :
        {};
  if (!facilityId && typeof params.facilityId === 'string') {
    facilityId = params.facilityId.trim();
  }
  if (!clubId && typeof params.clubId === 'string') {
    clubId = params.clubId.trim();
  }
  if (!clubId && facilityId.includes('__')) {
    const parts = facilityId.split('__');
    if (parts.length >= 2) {
      clubId = parts[0].trim();
      facilityId = parts.slice(1).join('__').trim();
    }
  }
  let ruleName = '';
  const ruleObj = r.rule && typeof r.rule === 'object' ?
    /** @type {Record<string, unknown>} */ (r.rule) :
    null;
  if (ruleObj && typeof ruleObj.name === 'string') {
    ruleName = ruleObj.name.trim();
  }
  if (!ruleName && r.alert && typeof r.alert === 'object') {
    const alertObj = /** @type {Record<string, unknown>} */ (r.alert);
    const innerRule = alertObj.rule;
    if (innerRule && typeof innerRule === 'object') {
      const ir = /** @type {Record<string, unknown>} */ (innerRule);
      if (typeof ir.name === 'string') ruleName = ir.name.trim();
    }
  }
  return {clubId, facilityId, ruleName};
}

/**
 * Real-time Tomorrow.io webhook: lightning proximity -> LOCKED facility doc +
 * emergency FCM to club roster coaches & players.
 */
exports.facilityWeatherWebhook = onRequest(
    {region: REGION, secrets: [WEBHOOK_AUTH_TOKEN]},
    async (req, res) => {
      if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
      }
      const token =
          typeof req.query.token === 'string' ?
            req.query.token.trim() :
            '';
      const expectedToken = WEBHOOK_AUTH_TOKEN.value();
      if (!expectedToken || !token) {
        res.status(403).send('Forbidden');
        return;
      }

      const expectedTokenBuffer = Buffer.from(expectedToken);
      const tokenBuffer = Buffer.from(token);

      if (
        expectedTokenBuffer.length !== tokenBuffer.length ||
        !crypto.timingSafeEqual(expectedTokenBuffer, tokenBuffer)
      ) {
        res.status(403).send('Forbidden');
        return;
      }

      const raw = req.rawBody;
      if (!raw || !Buffer.isBuffer(raw)) {
        logger.error('facilityWeatherWebhook: missing rawBody buffer');
        res.status(400).send('Invalid body');
        return;
      }

      /** @type {Record<string, unknown>} */
      let body;
      try {
        body = JSON.parse(raw.toString('utf8'));
      } catch (e) {
        logger.warn('facilityWeatherWebhook: invalid JSON', {err: String(e)});
        res.status(400).send('Invalid JSON');
        return;
      }

      const {clubId, facilityId, ruleName} = parseFacilityWeatherPayload(body);
      const lightning = /lightning/i.test(ruleName);
      if (!lightning) {
        logger.info('facilityWeatherWebhook: ignored (not lightning)', {
          ruleName,
          facilityId,
          clubId,
        });
        res.status(200).json({received: true, processed: false});
        return;
      }
      if (!clubId || !facilityId) {
        logger.warn(
            'facilityWeatherWebhook: missing clubId/facilityId',
            {clubId, facilityId, ruleName},
        );
        res.status(400).json({error: 'clubId and facilityId required'});
        return;
      }

      const lockStartedMs = Date.now();
      const facRef = db()
          .collection('clubs')
          .doc(clubId)
          .collection('facilities')
          .doc(facilityId);

      let facilitySnap;
      try {
        facilitySnap = await facRef.get();
      } catch (e) {
        logger.error('facilityWeatherWebhook: facility read failed', {
          clubId,
          facilityId,
          err: e instanceof Error ? e.message : String(e),
        });
        res.status(500).send('Facility read failed');
        return;
      }
      if (!facilitySnap.exists) {
        logger.warn('facilityWeatherWebhook: unknown facility document', {
          clubId,
          facilityId,
          ruleName,
        });
        res.status(404).json({error: 'Unknown facility'});
        return;
      }

      try {
        await facRef.set(
            {
              status: 'LOCKED',
              lockReason: 'Lightning Proximity - 30 Minute Delay',
              lockedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            {merge: true},
        );
      } catch (e) {
        logger.error('facilityWeatherWebhook: facility lock write failed', {
          clubId,
          facilityId,
          err: e instanceof Error ? e.message : String(e),
        });
        res.status(500).send('Lock failed');
        return;
      }

      logger.warn('facilityWeatherWebhook: LIGHTNING_LOCKDOWN', {
        facilityId,
        clubId,
        ruleName,
        lockStartedMs,
        message:
            'Facility locked — audit trail timestamp (ms since epoch): ' +
            String(lockStartedMs),
      });

      let uids = [];
      try {
        uids = await collectPlayerCoachUidsForClub(clubId);
      } catch (e) {
        logger.error('facilityWeatherWebhook: UID resolution failed', {
          clubId,
          err: e instanceof Error ? e.message : String(e),
        });
      }

      let tokens = [];
      try {
        tokens = await collectFcmTokensForUids(uids);
      } catch (e) {
        logger.error('facilityWeatherWebhook: FCM token load failed', {
          clubId,
          err: e instanceof Error ? e.message : String(e),
        });
      }

      const title = 'RED ALERT: LIGHTNING';
      const bodyText =
          'Lightning strike detected within 10 miles. Clear the pitch immediately. ' +
          'The 30-minute safety clock has started.';
      const chunkSize = 500;
      if (tokens.length > 0) {
        for (let i = 0; i < tokens.length; i += chunkSize) {
          const chunk = tokens.slice(i, i + chunkSize);
          try {
            await admin.messaging().sendMulticast({
              tokens: chunk,
              notification: {
                title,
                body: bodyText,
              },
              data: {
                kind: 'emergency_weather',
                facilityId: String(facilityId),
              },
            });
            logger.info('facilityWeatherWebhook: sendMulticast ok', {
              clubId,
              facilityId,
              tokenCount: chunk.length,
              lockStartedMs,
            });
          } catch (e) {
            logger.error('facilityWeatherWebhook: sendMulticast failed', {
              clubId,
              facilityId,
              err: e instanceof Error ? e.message : String(e),
            });
          }
        }
      } else {
        logger.info('facilityWeatherWebhook: no FCM tokens for club roster', {
          clubId,
          facilityId,
          uidCount: uids.length,
        });
      }

      res.status(200).json({
        received: true,
        processed: true,
        facilityId,
        clubId,
        lockStartedMs,
      });
    },
);
