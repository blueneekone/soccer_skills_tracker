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

const scheduleOps = require('./src/domains/scheduleOps');
exports.setEventRsvp = scheduleOps.setEventRsvp;

const registrationOps = require('./src/domains/registrationOps');
exports.getPublicRegistrationProgram = registrationOps.getPublicRegistrationProgram;

const rosterOps = require('./src/domains/rosterOps');
exports.claimRosterSpot = rosterOps.claimRosterSpot;

const tryoutsOps = require('./src/domains/tryoutsOps');
exports.upsertTryoutProgram = tryoutsOps.upsertTryoutProgram;
exports.getPublicTryoutProgram = tryoutsOps.getPublicTryoutProgram;
exports.registerForTryout = tryoutsOps.registerForTryout;
exports.upsertTryoutSession = tryoutsOps.upsertTryoutSession;
exports.assignTryoutSession = tryoutsOps.assignTryoutSession;
exports.setTryoutSessionRsvp = tryoutsOps.setTryoutSessionRsvp;
exports.checkInTryoutRegistration = tryoutsOps.checkInTryoutRegistration;
exports.upsertTryoutPlan = tryoutsOps.upsertTryoutPlan;
exports.submitTryoutEvaluation = tryoutsOps.submitTryoutEvaluation;
exports.setTryoutPipelineStatus = tryoutsOps.setTryoutPipelineStatus;
exports.respondTryoutOffer = tryoutsOps.respondTryoutOffer;
exports.getPublicTryoutRegistration = tryoutsOps.getPublicTryoutRegistration;
exports.promoteTryoutToRoster = tryoutsOps.promoteTryoutToRoster;
exports.dispatchTryoutComms = tryoutsOps.dispatchTryoutComms;

const eligibilityOps = require('./src/domains/eligibilityOps');
exports.upsertClubEligibilityMatrix = eligibilityOps.upsertClubEligibilityMatrix;
exports.getClubEligibilityMatrix = eligibilityOps.getClubEligibilityMatrix;
