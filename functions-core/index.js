'use strict';

/**
 * functions-core — launch-critical training + intent callables.
 * Domain sources are copied into this package by scripts/bundle-functions.cjs.
 */
require('./bootstrapAdmin');
const trainingOps = require('./src/domains/trainingOps');

exports.logTrainingSession = trainingOps.logTrainingSession;
exports.secureDeployIntent = trainingOps.secureDeployIntent;
exports.secureCancelIntent = trainingOps.secureCancelIntent;
exports.secureExtendIntent = trainingOps.secureExtendIntent;
