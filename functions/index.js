/* eslint-disable quotes */
// Phase 2, Epic 3 — Cell-Level Egress Guard (Layer 4).
// wrapFetch MUST be the first statement before any other module is required
// so that outbound fetch calls from all subsequently-loaded modules are
// intercepted.  The guard is a no-op for non-teen-tainted requests.
const {wrapFetch} = require('./egressGuard');
wrapFetch();

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

// ── Phase 2, Epic 2: Transaction-based pricing (Session E) ─────────────────
// Sunset path for the legacy per-seat SaaS subscription model.  Recruiter
// subscriptions are excluded — they migrate to the hybrid model in Session M.
const legacyBillingHandlers = require('./legacyBillingOps');
exports.sunsetLegacySubscription = legacyBillingHandlers.sunsetLegacySubscription;
exports.sweepLegacySubscriptions = legacyBillingHandlers.sweepLegacySubscriptions;

// ── Phase 2, Epic 2: Digital Ticketing (Session H) ─────────────────────────
// Same Stripe Connect destination-charge plumbing as season registrations,
// but for tournament/event tickets.  Generates HMAC QR tokens on success.
const ticketingHandlers = require('./ticketing');
exports.createTicketSaleIntent    = ticketingHandlers.createTicketSaleIntent;
exports.handleTicketingWebhook    = ticketingHandlers.handleTicketingWebhook;
exports.upsertTournamentEvent     = ticketingHandlers.upsertTournamentEvent;
exports.publishTournamentEvent    = ticketingHandlers.publishTournamentEvent;
exports.verifyScanToken           = ticketingHandlers.verifyScanToken;

// ── Phase 2, Epic 2: Branded ticket receipts (Session A8 — feature-flagged) ─
// v1 receipts are handled by Stripe's built-in receipt_email in ticketing.js.
// This trigger fires onCreate but self-disables unless the
// feature_flags/brandedTicketReceipts doc has enabled:true.
const ticketReceiptsHandlers = require('./ticketReceipts');
exports.sendTicketReceiptOnCreate = ticketReceiptsHandlers.sendTicketReceiptOnCreate;

// ── Phase 2, Epic 2: Hotel Block Rebates (Session I) ───────────────────────
// Inverted economics — record hotel partner commission receipts and
// transfer the NGB share via Stripe Transfers.  Both callables are
// super_admin only; the rebate flow is operated from a console.
const hotelRebateHandlers = require('./hotelRebates');
exports.submitHotelRebateRecord = hotelRebateHandlers.submitHotelRebateRecord;
exports.approveHotelRebatePayout = hotelRebateHandlers.approveHotelRebatePayout;

// ── Phase 2, Epic 2: Hotel Partner Directory (Session B1) ──────────────────
// Provisioning and key-rotation callables for hotel partner API credentials.
const hotelPartnerOpsHandlers = require('./hotelPartnerOps');
exports.provisionHotelPartner    = hotelPartnerOpsHandlers.provisionHotelPartner;
exports.rotateHotelPartnerKeys   = hotelPartnerOpsHandlers.rotateHotelPartnerKeys;
exports.setHotelPartnerStatus    = hotelPartnerOpsHandlers.setHotelPartnerStatus;

// ── Phase 2, Epic 2: Clearance Expiry (Session K) ──────────────────────────
// Daily sweep — flips cleared users past the 365-day validity window to
// 'expired' and revokes their isCleared JWT claim.
const clearanceExpiryHandlers = require('./clearanceExpiry');
exports.expireStaleClearances = clearanceExpiryHandlers.expireStaleClearances;

// ── Phase 2, Epic 2: Recruiter Hybrid Billing (Session M) ──────────────────
// Per-export metered billing on top of the existing annual Stripe sub.
// Charges are stacked onto the recruiter's existing invoice via
// invoiceItem.create — no new PaymentIntents per export.
const recruiterBillingHandlers = require('./recruiterBilling');
exports.recordRecruiterExport = recruiterBillingHandlers.recordRecruiterExport;
exports.cancelRecruiterAccount = recruiterBillingHandlers.cancelRecruiterAccount;

// ── Phase 2, Epic 2: Live policy admin (Session N) ─────────────────────────
// Super-admin only.  bootstrapPricingPolicy seeds the empty default-v1 doc.
// updatePricingPolicy is the live rate-change knob — version-bumps the
// policy and writes an audit row in the same transaction.
const pricingPolicyOps = require('./pricingPolicyOps');
exports.bootstrapPricingPolicy = pricingPolicyOps.bootstrapPricingPolicy;
exports.updatePricingPolicy = pricingPolicyOps.updatePricingPolicy;

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
// NOTE: syncUserClaims is NOT exported here — the canonical implementation
// lives in adminOps and is exported below (line ~237).  Exporting it twice
// would silently overwrite the first assignment, creating a dead export.
exports.consumeInviteCode  = inviteHandlers.consumeInviteCode;
exports.generateInviteCode = inviteHandlers.generateInviteCode;

const coppaHandlers = require('./coppa');
exports.sendParentalConsentEmail      = coppaHandlers.sendParentalConsentEmail;
exports.verifyParentalConsent         = coppaHandlers.verifyParentalConsent;
// Epic 15: WebAuthn COPPA Attestation
exports.generateWebAuthnChallenge     = coppaHandlers.generateWebAuthnChallenge;
exports.verifyBiometricConsent        = coppaHandlers.verifyBiometricConsent;
// Alpha Interlock: Director Out-of-Band VPC Override
exports.directorOutOfBandClearance    = coppaHandlers.directorOutOfBandClearance;
// Phase 2, Epic 3: WebAuthn Biometric Attestation for Parental Consent
exports.generateConsentAttestationChallenge = coppaHandlers.generateConsentAttestationChallenge;
exports.attestParentalConsent               = coppaHandlers.attestParentalConsent;

// Phase 2, Epic 3: Teen 13-16 Ad-Block — client beacon + CF write-validator
const teenAdInterceptorHandlers = require('./teenAdInterceptor');
exports.logTeenAdBlock = teenAdInterceptorHandlers.logTeenAdBlock;

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

// ---------------------------------------------------------------------------
// Phase 1, Epic 1 — Cell-Based Routing
//
// Registry bootstrap (Session A), tenant ↔ cell provisioning (Session B),
// shared cell router accessor (Session D), migration tooling (Session G),
// API gateway (Session E), and observability (Session I).
// ---------------------------------------------------------------------------
require('./cellRouter'); // Eager-load to seed the per-cellId Firestore cache.

const cellBootstrapHandlers = require('./cellBootstrap');
exports.bootstrapCellRegistry  = cellBootstrapHandlers.bootstrapCellRegistry;
exports.registerDedicatedCell  = cellBootstrapHandlers.registerDedicatedCell;
exports.activateCell           = cellBootstrapHandlers.activateCell;

const cellProvisioningHandlers = require('./cellProvisioning');
exports.provisionTenantCell    = cellProvisioningHandlers.provisionTenantCell;
exports.peekTenantCell         = cellProvisioningHandlers.peekTenantCell;

// /v1/* HTTP gateway — single entry point for all cell-aware REST traffic.
// Session E: handlers register their routes via apiGateway.register() at
// module load.  Adding new domain routes does not require touching
// firebase.json or hosting rewrites — they bind to the same Cloud Function.
const apiGatewayHandlers = require('./apiGateway');
exports.apiGateway             = apiGatewayHandlers.apiGateway;

// Tenant migration tooling (Session G).  Each callable advances a
// migration record one phase: announce → freeze → export → import →
// verify → cutover → rollback.  See functions/cellMigration.js for the
// state machine.
const cellMigrationHandlers = require('./cellMigration');
exports.startTenantMigration      = cellMigrationHandlers.startTenantMigration;
exports.markExportComplete        = cellMigrationHandlers.markExportComplete;
exports.markImportComplete        = cellMigrationHandlers.markImportComplete;
exports.verifyTenantOnCell        = cellMigrationHandlers.verifyTenantOnCell;
exports.executeCutover            = cellMigrationHandlers.executeCutover;
exports.rollbackTenantMigration   = cellMigrationHandlers.rollbackTenantMigration;

// Observability + promotion queue (Session I).  Schedulers + admin
// callables that feed the Director OS cell-health dashboard and
// drive the noisy-neighbor early-warning system.
const cellObservabilityHandlers = require('./cellObservability');
exports.flagTenantForPromotion    = cellObservabilityHandlers.flagTenantForPromotion;
exports.acknowledgePromotionFlag  = cellObservabilityHandlers.acknowledgePromotionFlag;
exports.evaluateCellPromotions    = cellObservabilityHandlers.evaluateCellPromotions;
exports.purgeGatewayCaches        = cellObservabilityHandlers.purgeGatewayCaches;

// Synthetic NGB seed (Session J).  Sandboxed loader for end-to-end
// verification of the migration pipeline — every doc is tagged
// `synthetic: true` and tenantId must start with `synth-`.
const cellSeedHandlers = require('./cellSeed');
exports.seedSyntheticTenant       = cellSeedHandlers.seedSyntheticTenant;
exports.purgeSyntheticTenant      = cellSeedHandlers.purgeSyntheticTenant;

// Phone Number Verification (Phase 2, Epic 3 — Native Firebase Phone Auth).
// Secondary linking: mirrorPhoneVerification stamps phoneVerified JWT claim
// after client-side linkWithPhoneNumber succeeds.  unlinkPhoneVerification
// removes the credential and clears the claim.
const phoneVerificationHandlers = require('./phoneVerification');
exports.mirrorPhoneVerification  = phoneVerificationHandlers.mirrorPhoneVerification;
exports.unlinkPhoneVerification  = phoneVerificationHandlers.unlinkPhoneVerification;

// Magic Uplinks (Phase 2, Epic 3 — Passwordless Magic Uplinks).
// Single-use, time-locked, email-dispatched invite tokens with scrypt-
// hashed secrets and custom-token mint on redemption.
const magicUplinkHandlers = require('./magicUplinks');
exports.mintMagicUplink   = magicUplinkHandlers.mintMagicUplink;
exports.redeemMagicUplink = magicUplinkHandlers.redeemMagicUplink;
exports.revokeMagicUplink = magicUplinkHandlers.revokeMagicUplink;
exports.purgeExpiredUplinks = magicUplinkHandlers.purgeExpiredUplinks;

// Phase 3, Epic 4 — Sports_Configs Dynamic Trees.
// seedBaseSportsConfigs: super_admin callable to cold-boot or re-seed the
// canonical 8-sport configs into `sports_configs/{sportId}`.
// sportsConfigOps: upsert / list / archive callables for the admin CRUD UI.
const sportsSeeder = require('./src/seeders/sportsSeeder');
exports.seedBaseSportsConfigs = sportsSeeder.seedBaseSportsConfigs;

const sportsConfigOps = require('./sportsConfigOps');
exports.upsertSportsConfig  = sportsConfigOps.upsertSportsConfig;
exports.listSportsConfigs   = sportsConfigOps.listSportsConfigs;
exports.archiveSportsConfig = sportsConfigOps.archiveSportsConfig;

// Club-sport integrity triggers (Phase 3, Epic 4).
// auditClubSportConfig: flags orphan sport when clubs/{clubId}.sport changes.
// pruneOrphanedSports:  weekly scan → sport_audit_report/{yyyy-ww}.
const clubOps = require('./src/domains/clubOps');
exports.auditClubSportConfig = clubOps.auditClubSportConfig;
exports.pruneOrphanedSports  = clubOps.pruneOrphanedSports;

// ── Phase 3, Epic 4 (deliverable 2) — RL Adaptive Workout Engine ─────────────
// submitPhysioSelfReport: daily player physiological self-report (S2).
// initRlPolicy: cold-boot random-weight policy v1 (S4, stub until model ships).
// getAdaptiveWorkoutPolicy: inference callable, returns heuristic until S5 (S5).
// setPolicyAbPercent / freezeRlPolicy / rollbackRlPolicy: super_admin controls (S10).
const rlOps = require('./rlOps');
exports.submitPhysioSelfReport   = rlOps.submitPhysioSelfReport;
exports.initRlPolicy             = rlOps.initRlPolicy;
exports.getAdaptiveWorkoutPolicy = rlOps.getAdaptiveWorkoutPolicy;
exports.setPolicyAbPercent       = rlOps.setPolicyAbPercent;
exports.freezeRlPolicy           = rlOps.freezeRlPolicy;
exports.rollbackRlPolicy         = rlOps.rollbackRlPolicy;

// RL transition recording triggers (S6).
// onWorkoutLogCreated: writes rl_transitions row when workout_logs doc is created.
// onPhysioReportCreated: patches nextState when morning physio report arrives.
const transitionRecorder = require('./src/ml/transitionRecorder');
exports.rlOnWorkoutLogCreated    = transitionRecorder.onWorkoutLogCreated;
exports.rlOnPhysioReportCreated  = transitionRecorder.onPhysioReportCreated;

// Nightly RL training scheduler (S7).
const trainer = require('./src/ml/trainer');
exports.trainRlPolicyNightly = trainer.trainRlPolicyNightly;

// ── Phase 3, Epic 5 — Loss Avoidance (Octalysis Core Drive 8) ────────────────
// enforceLossAvoidance:       nightly sweep drains inactive XP, breaks/freezes
//                             streaks, and queues reengagement alerts.
// dispatchReengagementAlerts: runs every 30 min to flush the alert queue via FCM.
// claimStreakFreeze:          onCall — player/parent consumes a streak freeze.
const lossAvoidance = require('./lossAvoidance');
exports.enforceLossAvoidance        = lossAvoidance.enforceLossAvoidance;
exports.dispatchReengagementAlerts  = lossAvoidance.dispatchReengagementAlerts;
exports.claimStreakFreeze           = lossAvoidance.claimStreakFreeze;
