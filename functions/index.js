/* eslint-disable quotes */
// Phase 2, Epic 3 — Cell-Level Egress Guard (Layer 4).
// wrapFetch MUST be the first statement before any other module is required
// so that outbound fetch calls from all subsequently-loaded modules are
// intercepted.  The guard is a no-op for non-teen-tainted requests.
const {wrapFetch} = require('./egressGuard');
wrapFetch();

const logger = require('firebase-functions/logger');
// DEPLOY-N: slim default codebase — migrated exports live in split packages (see FUNCTIONS_DEPLOY.md).
// DEPLOY-N: RL → functions-rl/
logger.warn(
    '[functions/default] Legacy monolith index — deploy split codebases for production surfaces.',
);
const admin = require('firebase-admin');


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
exports.submitMedicalIntake = complianceOps.submitMedicalIntake;
exports.submitLiabilityWaivers = complianceOps.submitLiabilityWaivers;

const vpcOps = require('./src/domains/vpcOps.js');
exports.generateVpcChallenge = vpcOps.generateVpcChallenge;
exports.verifyVpcSignature = vpcOps.verifyVpcSignature;

const adminOps = require('./src/domains/adminOps.js');
exports.updateUserRole = adminOps.updateUserRole;
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
exports.createCommsChannel = operativeOps.createCommsChannel;

exports.listJoinableClubs = adminOps.listJoinableClubs;
exports.claimCoachInvite = adminOps.claimCoachInvite;
exports.resolveDispatchCode = adminOps.resolveDispatchCode;

const coachRosterIngestOps = require('./src/domains/coachRosterIngestOps.js');
exports.coachRosterIngest = coachRosterIngestOps.coachRosterIngest;
const commsChannelOps = require('./src/domains/commsChannelOps.js');
exports.coachProvisionStaffInternal = commsChannelOps.coachProvisionStaffInternal;
exports.coachProvisionParentLounge = commsChannelOps.coachProvisionParentLounge;
exports.mirrorScheduleToLogistics = commsChannelOps.mirrorScheduleToLogistics;

exports.sendCoachPlayerMessage = operativeOps.sendCoachPlayerMessage;
exports.sendChannelMessage = operativeOps.sendChannelMessage;
exports.sendHouseholdMessage = operativeOps.sendHouseholdMessage;
exports.impersonateUserFn = operativeOps.impersonateUserFn;
exports.purgeUserDataFn = operativeOps.purgeUserDataFn;

const comms = require('./comms.js');
exports.safeSportBroadcast = comms.safeSportBroadcast;
exports.clubSportBroadcast = comms.clubSportBroadcast;
exports.emergencyClubBroadcast = comms.emergencyClubBroadcast;
exports.reportMessageIncident = comms.reportMessageIncident;

const sponsorPartnerOps = require('./src/domains/sponsorPartnerOps.js');
exports.createSponsorTemplate = sponsorPartnerOps.createSponsorTemplate;
exports.approveSponsorTemplate = sponsorPartnerOps.approveSponsorTemplate;
exports.sendSponsorPartnerDigest = sponsorPartnerOps.sendSponsorPartnerDigest;

const parentVoiceSessionOps = require('./src/domains/parentVoiceSessionOps.js');
exports.createParentVoiceSession = parentVoiceSessionOps.createParentVoiceSession;

const invites = require("./invites.js");
exports.consumeInviteCode = invites.consumeInviteCode;

const magicUplinks = require("./magicUplinks.js");
exports.redeemMagicUplink = magicUplinks.redeemMagicUplink;
exports.joinParentVoiceSession = parentVoiceSessionOps.joinParentVoiceSession;

const notificationOps = require('./src/domains/notificationOps.js');
exports.onTeamBroadcastCreated = notificationOps.onTeamBroadcastCreated;
exports.onDeploymentCalendarEntryCreated = notificationOps.onDeploymentCalendarEntryCreated;
exports.registerDeviceToken = notificationOps.registerDeviceToken;

const webhooksOps = require('./src/domains/webhooksOps.js');
exports.acknowledgeBroadcast = webhooksOps.acknowledgeBroadcast;
exports.getBroadcastAckStatus = webhooksOps.getBroadcastAckStatus;

const weatherOps = require('./src/domains/weatherOps.js');
exports.processTomorrowIoAlert = weatherOps.processTomorrowIoAlert;

function exportScheduler(target, name, modFn) {
  if (process.env.SCHEDULERS_ENABLED === 'true') {
    target[name] = modFn;
  }
}
// const eventOps = require('./src/domains/eventOps.js');
// exportScheduler(exports, 'sendScheduledEventReminders', eventOps.sendScheduledEventReminders);
const commerce = require('./commerce.js');
exportScheduler(exports, 'sendRegistrationPaymentReminders', commerce.sendRegistrationPaymentReminders);

const globalAdminOs = require('./src/domains/globalAdminOs.js');
exports.loginAs = globalAdminOs.loginAs;
exports.rightToBeForgotten = globalAdminOs.rightToBeForgotten;
exports.listAllUsers = globalAdminOs.listAllUsers;
exports.repairUserClaims = globalAdminOs.repairUserClaims;
exports.resetUserPassword = globalAdminOs.resetUserPassword;
exports.disableUser = globalAdminOs.disableUser;
exports.purgeUser = globalAdminOs.purgeUser;
exports.createTeam = globalAdminOs.createTeam;
exports.deleteTeam = globalAdminOs.deleteTeam;
exports.linkUserToTeam = globalAdminOs.linkUserToTeam;
exports.consumeInviteCode = require('./invites').consumeInviteCode;
exports.redeemMagicUplink = require('./magicUplinks').redeemMagicUplink;

const b2bEnrollmentOps = require('./src/domains/b2bEnrollmentOps.js');
exports.enrollIndependentDirector = b2bEnrollmentOps.enrollIndependentDirector;
exports.enrollGovernedDirector = b2bEnrollmentOps.enrollGovernedDirector;

const federationInvites = require('./lib/domains/federationInvites.js');
exports.consumeFederationInvite = federationInvites.consumeFederationInvite;

const ingestRoster = require("./ingestRoster.js");
exports.ingestRoster = ingestRoster.ingestRoster;

const { onChannelCreated } = require('./src/onChannelCreated');
exports.onChannelCreated = onChannelCreated;

const scheduledPiiShredder = require('./src/scheduledPiiShredder');
exports.scheduledPiiShredder = scheduledPiiShredder.scheduledPiiShredder;

const superdrawOps = require('./src/domains/superdrawOps.js');
exports.purchaseSuperdrawTickets = superdrawOps.purchaseSuperdrawTickets;
