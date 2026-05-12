/* eslint-disable quotes */
const crypto = require('crypto');
const {onDocumentCreated, onDocumentWritten} =
    require('firebase-functions/v2/firestore');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const {onCall, onRequest, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const {defineString, defineSecret} = require('firebase-functions/params');

admin.initializeApp();
const db = admin.firestore();
const ADMIN_EMAIL = defineString('ADMIN_EMAIL');
/** Set via: firebase functions:secrets:set WORKOUT_ATTESTATION_HMAC_SECRET */
const WORKOUT_ATTESTATION_HMAC_SECRET = defineSecret(
    'WORKOUT_ATTESTATION_HMAC_SECRET',
);
/** Webhook: firebase functions:secrets:set AFFINITY_WEBHOOK_HMAC_SECRET */
const AFFINITY_WEBHOOK_HMAC_SECRET = defineSecret(
    'AFFINITY_WEBHOOK_HMAC_SECRET',
);
/** Epic 4: Gemini Developer API key (Secret Manager). */
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const WEBHOOK_AUTH_TOKEN = defineSecret('WEBHOOK_AUTH_TOKEN');

/** Epic 9: Stripe billing (Secret Manager). */
const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');
const STRIPE_PRICE_TUTOR = defineString('STRIPE_PRICE_TUTOR', {default: ''});
const STRIPE_PRICE_TEAM = defineString('STRIPE_PRICE_TEAM', {default: ''});
const STRIPE_PRICE_CLUB = defineString('STRIPE_PRICE_CLUB', {default: ''});
const STRIPE_PRICE_RECRUITER = defineString(
    'STRIPE_PRICE_RECRUITER',
    {default: ''},
);

const stripe = require('stripe');

const {
  calculateTrainingSessionEarnedXp,
  trainingLevelFromTotalXp,
  computeMatchTelemetryParlayXp,
  grantTrainingXpAfterRepCreated,
} = require('./gamificationWorkoutXp');

// â”€â”€ Epic 7: Media Integrations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const integrationHandlers = require('./integrations');
exports.getSoccerNews = integrationHandlers.getSoccerNews;
exports.searchPodcasts = integrationHandlers.searchPodcasts;
exports.getPodcastEpisodes = integrationHandlers.getPodcastEpisodes;

// â”€â”€ Epic 7: AEGIS Weather & Safety Protocol â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const weatherHandlers = require('./weather');
exports.getWeatherConditions = weatherHandlers.getWeatherConditions;

// â”€â”€ Epic 9: Secure Media Vault â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const uploadTokenHandlers = require('./uploadTokens');
exports.getUploadToken = uploadTokenHandlers.getUploadToken;
exports.deleteAllPlayerMedia = uploadTokenHandlers.deleteAllPlayerMedia;

const processMediaHandlers = require('./processMedia');
exports.processMedia = processMediaHandlers.processMedia;

// â”€â”€ Epic 9: Universal Roster Ingestion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ingestHandlers = require('./ingestRoster');
exports.ingestRoster = ingestHandlers.ingestRoster;

// â”€â”€ Epic 10: Marketing / Subscription checkout stub â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const subscriptionHandlers = require('./subscription');
exports.createSubscription = subscriptionHandlers.createSubscription;

// â”€â”€ Epic 11: Commerce Engine (Stripe Connect) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const commerceHandlers = require('./commerce');
exports.createRegistrationIntent = commerceHandlers.createRegistrationIntent;
exports.handleRegistrationWebhook = commerceHandlers.handleRegistrationWebhook;
exports.createConnectOnboarding = commerceHandlers.createConnectOnboarding;
exports.getRegistrationStatus = commerceHandlers.getRegistrationStatus;

// â”€â”€ Epic 11: Pitch Collision Avoidance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const facilitiesHandlers = require('./facilities');
exports.checkFacilityAvailability = facilitiesHandlers.checkFacilityAvailability;
exports.bookFacility = facilitiesHandlers.bookFacility;
exports.releaseFacilityBooking = facilitiesHandlers.releaseFacilityBooking;
exports.listFacilities = facilitiesHandlers.listFacilities;

// â”€â”€ Epic 11: Vanguard Transfer Protocol â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const transferHandlers = require('./transfer');
exports.initiatePlayerTransfer = transferHandlers.initiatePlayerTransfer;
exports.presentTransferToken = transferHandlers.presentTransferToken;
exports.confirmPlayerTransfer = transferHandlers.confirmPlayerTransfer;

// â”€â”€ Epic 12: FCM Notification Dispatcher â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const dispatcherHandlers = require('./dispatcher');
exports.sendWeatherAlertToTenant = dispatcherHandlers.sendWeatherAlertToTenant;
exports.sendGameRemindersToday = dispatcherHandlers.sendGameRemindersToday;

// â”€â”€ Hotfix Alpha-3: League & Fixture Management (UTC enforcement) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const leagueHandlers = require('./league');
exports.createFixture    = leagueHandlers.createFixture;
exports.updateFixture    = leagueHandlers.updateFixture;
exports.cancelFixture    = leagueHandlers.cancelFixture;
exports.schedulePractice = leagueHandlers.schedulePractice;

// â”€â”€ Epic 6+: Compliance & Communications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// -- Epic 14: Vanguard Clearance Protocol ------------------------------------
const complianceHandlers = require('./compliance');
exports.generateCheckrEmbedToken = complianceHandlers.generateCheckrEmbedToken;
exports.backgroundCheckCallback  = complianceHandlers.backgroundCheckCallback;
exports.checkrWebhook            = complianceHandlers.checkrWebhook;
exports.getComplianceRoster      = complianceHandlers.getComplianceRoster;
exports.requestManualOverride    = complianceHandlers.requestManualOverride;
exports.revokeCoachClearance     = complianceHandlers.revokeCoachClearance;
exports.initiateAnkoredUplink    = complianceHandlers.initiateAnkoredUplink;
exports.simulateClearance        = complianceHandlers.simulateClearance;
const commsHandlers = require('./comms');
exports.safeSportBroadcast = commsHandlers.safeSportBroadcast;

const verifyDocHandlers = require('./verifyDocument');
exports.verifyDocument = verifyDocHandlers.verifyDocument;
exports.processPendingDocDeletions = verifyDocHandlers.processPendingDocDeletions;
exports.getRetentionReport = verifyDocHandlers.getRetentionReport;

// â”€â”€ Epic 5 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const inviteHandlers = require('./invites');
exports.syncUserClaims    = inviteHandlers.syncUserClaims;
exports.consumeInviteCode = inviteHandlers.consumeInviteCode;
exports.generateInviteCode = inviteHandlers.generateInviteCode;

const coppaHandlers = require('./coppa');
exports.sendParentalConsentEmail      = coppaHandlers.sendParentalConsentEmail;
exports.verifyParentalConsent         = coppaHandlers.verifyParentalConsent;
// Epic 15: WebAuthn COPPA Attestation
exports.generateWebAuthnChallenge     = coppaHandlers.generateWebAuthnChallenge;
exports.verifyBiometricConsent        = coppaHandlers.verifyBiometricConsent;
// Alpha Interlock: Director Out-of-Band VPC Override
exports.directorOutOfBandClearance    = coppaHandlers.directorOutOfBandClearance;

const auditHandlers = require('./audit');
// IAM prerequisite: grant "Service Account Token Creator" to the Functions service account.
exports.getSensitiveDocumentUrl = auditHandlers.getSensitiveDocumentUrl;

// ── Deconstruction Sprint 2: Profile Sync Engine ─────────────────────────────
// Triggers and the syncPublicPlayerProfile aggregation engine have been
// extracted to src/domains/profileTriggers.js + src/utils/profileSyncer.js.
// The inline bodies below (updatePublicProfile, updatePublicProfileOnTrial,
// onWorkoutLogCreated) are removed; the function definitions remain in this
// file only until remaining callers are migrated.
const profileTriggers = require('./src/domains/profileTriggers');
exports.updatePublicProfile        = profileTriggers.updatePublicProfile;
exports.updatePublicProfileOnTrial = profileTriggers.updatePublicProfileOnTrial;
exports.onWorkoutLogCreated        = profileTriggers.onWorkoutLogCreated;

// ── Deconstruction Sprint 3: Admin & Rosters Domain ──────────────────────────
// Administrative logic, seating entrenchment, custom claims, and facility
// bookings have been extracted to src/domains/adminOps.js.
const adminOps = require('./src/domains/adminOps');

// ── Deconstruction Sprint 4: Training & Gamification Domain ──────────────────
// Workout reps, XP, match telemetry, homework, leaderboards, and AI tactics
// have been extracted to src/domains/trainingOps.js.
const trainingOps = require('./src/domains/trainingOps');
exports.commitMatchTelemetry          = trainingOps.commitMatchTelemetry;
exports.submitWorkoutRep              = trainingOps.submitWorkoutRep;
exports.logTrainingSession            = trainingOps.logTrainingSession;
exports.secureAssignHomework          = trainingOps.secureAssignHomework;
exports.secureDeleteHomework          = trainingOps.secureDeleteHomework;
exports.completeAssignmentStatus      = trainingOps.completeAssignmentStatus;
exports.onRepCreatedUpdateTeamStats   = trainingOps.onRepCreatedUpdateTeamStats;
exports.getAccountabilityReport       = trainingOps.getAccountabilityReport;
exports.getPublicRecruitProfile       = trainingOps.getPublicRecruitProfile;
exports.getPublicClubLanding          = trainingOps.getPublicClubLanding;
exports.getTeamLeaderboard            = trainingOps.getTeamLeaderboard;
exports.logPlayerActivity             = trainingOps.logPlayerActivity;
exports.analyzeTacticWithAI           = trainingOps.analyzeTacticWithAI;
exports.onRepCreatedApplyGamificationXp = trainingOps.onRepCreatedApplyGamificationXp;
exports.syncUserClaims            = adminOps.syncUserClaims;
exports.listTeamsForClub          = adminOps.listTeamsForClub;
exports.logSecurityAudit          = adminOps.logSecurityAudit;
exports.generateLicense           = adminOps.generateLicense;
exports.directorSaveClubBranding  = adminOps.directorSaveClubBranding;
exports.directorInviteCoach       = adminOps.directorInviteCoach;
exports.claimCoachInvite          = adminOps.claimCoachInvite;
exports.secureAllocateTeamSeats   = adminOps.secureAllocateTeamSeats;
exports.secureAddPlayer           = adminOps.secureAddPlayer;
exports.secureRemovePlayer        = adminOps.secureRemovePlayer;
exports.secureUpdateJersey        = adminOps.secureUpdateJersey;
exports.directorUpsertField       = adminOps.directorUpsertField;
exports.secureBookField           = adminOps.secureBookField;
exports.createSportModule         = adminOps.createSportModule;
exports.publishClubCampaign       = adminOps.publishClubCampaign;
exports.assignTenantClaims        = adminOps.assignTenantClaims;

// ── Deconstruction Sprint 5: Compliance & VPC Domain ─────────────────────────
// Household linkages, verifiable consent, minor retention purges, and the
// COPPA / GDPR compliance lifecycle have been extracted to
// src/domains/complianceOps.js.
const complianceOps = require('./src/domains/complianceOps');
exports.linkHousehold               = complianceOps.linkHousehold;
exports.setPlayerDateOfBirth        = complianceOps.setPlayerDateOfBirth;
exports.verifyVpcForMinor           = complianceOps.verifyVpcForMinor;
exports.directorApproveVpc          = complianceOps.directorApproveVpc;
exports.parentSubmitVpcIntent       = complianceOps.parentSubmitVpcIntent;
exports.playerSelfReportDob         = complianceOps.playerSelfReportDob;
exports.parentGrantVpcConsent       = complianceOps.parentGrantVpcConsent;
exports.registrarTransferPlayer     = complianceOps.registrarTransferPlayer;
exports.enqueueMinorRetentionPurge  = complianceOps.enqueueMinorRetentionPurge;
exports.processMinorRetentionQueue  = complianceOps.processMinorRetentionQueue;
exports.purgeExpiredMinorData       = complianceOps.purgeExpiredMinorData;

// ── Deconstruction Sprint 5: Operative & Identity Domain ─────────────────────
// Custom proxy enclaves, COPPA operatives, SafeSport comms, impersonation,
// and GDPR wipes have been extracted to src/domains/operativeOps.js.
const operativeOps = require('./src/domains/operativeOps');
exports.sendCoachPlayerMessage      = operativeOps.sendCoachPlayerMessage;
exports.sendChannelMessage          = operativeOps.sendChannelMessage;
exports.impersonateUserFn           = operativeOps.impersonateUserFn;
exports.purgeUserDataFn             = operativeOps.purgeUserDataFn;
exports.parentSignCoppaWaiver       = operativeOps.parentSignCoppaWaiver;
exports.parentProvisionOperative    = operativeOps.parentProvisionOperative;
exports.operativeSignInWithDispatch = operativeOps.operativeSignInWithDispatch;
exports.generatePlayerOTP           = operativeOps.generatePlayerOTP;
exports.validatePlayerOTP           = operativeOps.validatePlayerOTP;


// -- Deconstruction Sprint 6: Webhooks & Integrations Domain ----------------
// Affinity eligibility ingestion, Stripe billing, facility weather alerts,
// scheduled seat cleanup, and video trial management have been extracted to
// src/domains/webhooksOps.js.
const webhooksOps = require('./src/domains/webhooksOps');
exports.expireCoachInvites           = webhooksOps.expireCoachInvites;
exports.submitVideoTrial             = webhooksOps.submitVideoTrial;
exports.verifyVideoTrial             = webhooksOps.verifyVideoTrial;
exports.directorOverrideEligibility  = webhooksOps.directorOverrideEligibility;
exports.affinityWebhook              = webhooksOps.affinityWebhook;
exports.mockAffinityPush             = webhooksOps.mockAffinityPush;
exports.createStripeCheckoutSession  = webhooksOps.createStripeCheckoutSession;
exports.stripeWebhook                = webhooksOps.stripeWebhook;
exports.facilityWeatherWebhook       = webhooksOps.facilityWeatherWebhook;

// -- Deconstruction Sprint 6: Notifications & FCM Domain ---------------------
// Device token registry, mission/assignment/trial score FCM push loops, and
// roster UID resolution have been extracted to src/domains/notificationOps.js.
const notificationOps = require('./src/domains/notificationOps');
exports.registerDeviceToken          = notificationOps.registerDeviceToken;
exports.onMissionAssigned            = notificationOps.onMissionAssigned;
exports.onAssignmentCreated          = notificationOps.onAssignmentCreated;
exports.onTrialScoreAdded            = notificationOps.onTrialScoreAdded;
exports.onTrialScoreWritten          = notificationOps.onTrialScoreWritten;

// ---------------------------------------------------------------------------
// Zero-Trust tenant utilities pre-load.
// ---------------------------------------------------------------------------
require('./tenantUtils');

// ---------------------------------------------------------------------------
// Analytics aggregation triggers (Strike 1 / Agent 3).
// ---------------------------------------------------------------------------
const analyticsTriggers = require('./analytics');
exports.onAnalyticsUserWritten   = analyticsTriggers.onUserWritten;
exports.onAnalyticsClubWritten   = analyticsTriggers.onClubWritten;
exports.onAnalyticsLicenseWritten = analyticsTriggers.onLicenseWritten;
