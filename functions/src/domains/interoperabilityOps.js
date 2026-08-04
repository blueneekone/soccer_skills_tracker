'use strict';

const { onCall, onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');

exports.interoperabilitySync = onCall((request) => {
  return { success: true };
});

exports.interoperabilityWebhook = onRequest((req, res) => {
  res.status(200).send("OK");
});
