'use strict';

/**
 * functions-rl — RL adaptive workout callables + triggers.
 * Domain sources are copied into this package by scripts/bundle-functions.cjs.
 */
require('./bootstrapAdmin');
const rlOps = require('./rlOps');
exports.submitPhysioSelfReport = rlOps.submitPhysioSelfReport;
exports.initRlPolicy = rlOps.initRlPolicy;
exports.getAdaptiveWorkoutPolicy = rlOps.getAdaptiveWorkoutPolicy;
exports.setPolicyAbPercent = rlOps.setPolicyAbPercent;
exports.freezeRlPolicy = rlOps.freezeRlPolicy;
exports.rollbackRlPolicy = rlOps.rollbackRlPolicy;

const transitionRecorder = require('./src/ml/transitionRecorder');
exports.rlOnWorkoutLogCreated = transitionRecorder.onWorkoutLogCreated;
exports.rlOnPhysioReportCreated = transitionRecorder.onPhysioReportCreated;

const trainer = require('./src/ml/trainer');
exports.trainRlPolicyNightly = trainer.trainRlPolicyNightly;
