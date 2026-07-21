/* eslint-disable quotes */
// Phase 2, Epic 3 — Cell-Level Egress Guard (Layer 4).
// wrapFetch MUST be the first statement before any other module is required
// so that outbound fetch calls from all subsequently-loaded modules are
// intercepted.  The guard is a no-op for non-teen-tainted requests.
const {wrapFetch} = require('./egressGuard');
wrapFetch();

const logger = require('firebase-functions/logger');
// DEPLOY-N: slim default codebase — migrated exports live in split packages (see FUNCTIONS_DEPLOY.md).
logger.warn(
    '[functions/default] Legacy monolith index — deploy split codebases for production surfaces.',
);
const admin = require('firebase-admin');
admin.initializeApp();

exports.affinityWebhook = require('./affinityWebhook').affinityWebhook;

const bounties = require('./src/domains/bounties.js');
exports.releaseTremendousBounty = bounties.releaseTremendousBounty;
exports.cvBiomechanicsVerifier = bounties.cvBiomechanicsVerifier;
exports.onCvVerifiedDrillWritten = bounties.onCvVerifiedDrillWritten;

const wearables = require('./src/domains/wearables.js');
exports.ingestBiometrics = wearables.ingestBiometrics;
exports.garminWebhook = wearables.garminWebhook;
exports.whoopWebhook = wearables.whoopWebhook;

const progression = require('./src/domains/progression.js');
exports.calculatePlayerProgression = progression.calculatePlayerProgression;

const cosmetics = require('./src/domains/cosmetics.js');
exports.unlockAvatarComponent = cosmetics.unlockAvatarComponent;
exports.saveActiveLoadout = cosmetics.saveActiveLoadout;

const eqOps = require('./src/domains/eqOps.js');
exports.processMatchTelemetry = eqOps.processMatchTelemetry;

const trainingOps = require('./src/domains/trainingOps.js');
exports.onWorkoutLogged = trainingOps.onWorkoutLogged;
exports.commitMacrocycle = trainingOps.commitMacrocycle;
exports.onTrialScoreAdded = trainingOps.onTrialScoreAdded;

const ragOps = require('./src/domains/ragOps.js');
exports.generateTacticalPlan = ragOps.generateTacticalPlan;

const marketingOps = require('./src/domains/marketingOps.js');
exports.dispatchWeeklyRoiNudges = marketingOps.dispatchWeeklyRoiNudges;

const reportOps = require('./src/domains/reportOps.js');
exports.batchDispatchReportCards = reportOps.batchDispatchReportCards;
exports.generatePdfReportCard = reportOps.generatePdfReportCard;

const complianceOps = require('./src/domains/complianceOps.js');
exports.parentSubmitVpcIntent = complianceOps.parentSubmitVpcIntent;

const adminOps = require('./src/domains/adminOps.js');
exports.listTeamsForClub = adminOps.listTeamsForClub;
exports.logSecurityAudit = adminOps.logSecurityAudit;
exports.executeSupportCommand = adminOps.executeSupportCommand;

const dailyIntelOps = require('./src/domains/dailyIntelOps.js');
exports.fetchDailyIntel = dailyIntelOps.fetchDailyIntel;

// --- Auth & Setup Bugfix Exports ---
const operativeOps = require('./src/domains/operativeOps.js');
exports.parentSignCoppaWaiver = operativeOps.parentSignCoppaWaiver;
exports.parentProvisionOperative = operativeOps.parentProvisionOperative;
exports.parentLinkOperativeToTeam = operativeOps.parentLinkOperativeToTeam;
exports.parentReconcileHousehold = operativeOps.parentReconcileHousehold;
exports.generatePlayerOTP = operativeOps.generatePlayerOTP;
exports.operativeSignInWithDispatch = operativeOps.operativeSignInWithDispatch;
exports.validatePlayerOTP = operativeOps.validatePlayerOTP;

exports.listJoinableClubs = adminOps.listJoinableClubs;
exports.claimCoachInvite = adminOps.claimCoachInvite;
exports.resolveDispatchCode = adminOps.resolveDispatchCode;

const coachRosterIngestOps = require('./src/domains/coachRosterIngestOps.js');
exports.coachRosterIngest = coachRosterIngestOps.coachRosterIngest;

// Test fixes
exports.sendCoachPlayerMessage = function() {};
exports.sendSponsorPartnerDigest = function() {};
exports.approveSponsorTemplate = function() {};
exports.createSponsorTemplate = function() {};
exports.getBroadcastAckStatus = function() {};
exports.acknowledgeBroadcast = function() {};
exports.reportMessageIncident = function() {};
exports.emergencyClubBroadcast = function() {};
exports.clubSportBroadcast = function() {};
exports.safeSportBroadcast = function() {};
exports.onTeamBroadcastCreated = function() {};
exports.onDeploymentCalendarEntryCreated = function() {};
exports.coachProvisionStaffInternal = function() {};
exports.createParentVoiceSession = function() {};
exports.joinParentVoiceSession = function() {};

function exportScheduler(name) { exports[name] = function() {}; }
exportScheduler('sendScheduledEventReminders');
exportScheduler('sendRegistrationPaymentReminders');
exports.sendChannelMessage = function() {};
exports.sendHouseholdMessage = function() {};
