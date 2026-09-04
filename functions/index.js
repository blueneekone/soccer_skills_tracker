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
const admin = require('./functions-shared/bootstrapAdmin');

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


const complianceOps = require('./src/domains/complianceOps.js');
exports.parentSubmitVpcIntent = complianceOps.parentSubmitVpcIntent;
exports.submitMedicalIntake = complianceOps.submitMedicalIntake;
exports.submitLiabilityWaivers = complianceOps.submitLiabilityWaivers;

const vpcOps = require('./src/domains/vpcOps.js');
exports.generateVpcChallenge = vpcOps.generateVpcChallenge;
exports.verifyVpcSignature = vpcOps.verifyVpcSignature;

const adminOps = require('./src/domains/adminOps.js');
const dailyIntelOps = require('./src/domains/dailyIntelOps.js');
exports.fetchDailyIntel = dailyIntelOps.fetchDailyIntel;

// --- Auth & Setup Bugfix Exports ---
const operativeOps = require('./src/domains/operativeOps.js');
exports.createCommsChannel = operativeOps.createCommsChannel;



const commsChannelOps = require('./src/domains/commsChannelOps.js');
exports.coachProvisionStaffInternal = commsChannelOps.coachProvisionStaffInternal;
exports.coachProvisionParentLounge = commsChannelOps.coachProvisionParentLounge;
exports.mirrorScheduleToLogistics = commsChannelOps.mirrorScheduleToLogistics;

exports.sendCoachPlayerMessage = operativeOps.sendCoachPlayerMessage;
exports.sendChannelMessage = operativeOps.sendChannelMessage;
exports.sendHouseholdMessage = operativeOps.sendHouseholdMessage;
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
exports.consumeInviteCode = require('./invites').consumeInviteCode;
exports.redeemMagicUplink = require('./magicUplinks').redeemMagicUplink;

const b2bEnrollmentOps = require('./src/domains/b2bEnrollmentOps.js');


const federationInvites = require('./lib/domains/federationInvites.js');
exports.consumeFederationInvite = federationInvites.consumeFederationInvite;

const ingestRoster = require("./ingestRoster.js");

const { onChannelCreated } = require('./src/onChannelCreated');

const scheduledPiiShredder = require('./src/scheduledPiiShredder');
exports.scheduledPiiShredder = scheduledPiiShredder.scheduledPiiShredder;

const superdrawOps = require('./src/domains/superdrawOps.js');
exports.purchaseSuperdrawTickets = superdrawOps.purchaseSuperdrawTickets;
const authSync = require('./src/triggers/authSync');
const clubCreationOps = require('./src/domains/clubCreationOps');
const matchOps = require('./src/domains/matchOps');
const orphanCoachOps = require('./src/domains/orphanCoachOps');
exports.authOnCreate = authSync.authOnCreate;
exports.createClub = clubCreationOps.createClub;
exports.registerIndependentCoach = orphanCoachOps.registerIndependentCoach;

// Match Ops
exports.syncMatchStats = matchOps.syncMatchStats;

// Resend Outbound Transactional Mail Bus
const resendService = require('./src/services/resendService');
exports.processOutboundMail = resendService.processOutboundMail;

// Onboarding Invitations Trigger
const invitations = require('./lib/domains/invitations');
exports.onInvitationCreated = invitations.onInvitationCreated;

// User Onboarding Triggers
exports.onUserProfileCleared = require('./lib/triggers/userOnboardingTriggers').onUserProfileCleared;
