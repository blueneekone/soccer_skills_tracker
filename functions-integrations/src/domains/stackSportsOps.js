'use strict';

const { onCall, onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');

const STACK_SPORTS_CLIENT_SECRET = defineSecret('STACK_SPORTS_CLIENT_SECRET');
const REGION = 'us-east1';

exports.stackSportsAuthInit = onRequest(
  { region: REGION, secrets: [STACK_SPORTS_CLIENT_SECRET] },
  (req, res) => {
    logger.info('[stackSportsAuthInit] stub called');
    res.status(200).send("Not implemented");
  }
);

exports.stackSportsAuthCallback = onRequest(
  { region: REGION, secrets: [STACK_SPORTS_CLIENT_SECRET] },
  (req, res) => {
    logger.info('[stackSportsAuthCallback] stub called');
    res.status(200).send("Not implemented");
  }
);

exports.syncStackSportsDataFn = onCall(
  { region: REGION, secrets: [STACK_SPORTS_CLIENT_SECRET] },
  (request) => {
    logger.info('[syncStackSportsDataFn] sync stub triggered');
    return { success: true };
  }
);
