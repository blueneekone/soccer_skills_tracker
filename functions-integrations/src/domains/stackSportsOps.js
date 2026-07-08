'use strict';

const { onCall, onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');

exports.stackSportsAuthInit = onRequest((req, res) => {
  res.status(200).send("Not implemented");
});

exports.stackSportsAuthCallback = onRequest((req, res) => {
  res.status(200).send("Not implemented");
});

exports.syncStackSportsDataFn = onCall((request) => {
  return { success: true };
});
