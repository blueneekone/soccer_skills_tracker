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
// DEPLOY-N: slim default codebase — migrated exports live in split packages (see FUNCTIONS_DEPLOY.md).
logger.warn(
    '[functions/default] Legacy monolith index — deploy split codebases for production surfaces.',
);
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

// DEPLOY-N: integrations → functions-integrations/ · commerce → functions-commerce/

// ── Phase 2, Epic 2: Clearance Expiry (Session K) ──────────────────────────
// Daily sweep — flips cleared users past the 365-day validity window to
// 'expired' and revokes their isCleared JWT claim.
const clearanceExpiryHandlers = require('./clearanceExpiry');
exports.expireStaleClearances = clearanceExpiryHandlers.expireStaleClearances;

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
exports.sendScheduledEventReminders = dispatcherHandlers.sendScheduledEventReminders;
exports.sendRegistrationPaymentReminders = dispatcherHandlers.sendRegistrationPaymentReminders;

// â”€â”€ Hotfix Alpha-3: League & Fixture Management (UTC enforcement) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const leagueHandlers = require('./league');
exports.createFixture    = leagueHandlers.createFixture;
exports.updateFixture    = leagueHandlers.updateFixture;
exports.cancelFixture    = leagueHandlers.cancelFixture;
exports.schedulePractice = leagueHandlers.schedulePractice;

// DEPLOY-N: compliance/COPPA/WebAuthn/vault → functions-compliance/

// â”€â”€ Epic 6+: Communications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const commsHandlers = require('./comms');
exports.safeSportBroadcast = commsHandlers.safeSportBroadcast;
exports.clubSportBroadcast = commsHandlers.clubSportBroadcast;
exports.reportMessageIncident = commsHandlers.reportMessageIncident;

// â”€â”€ Epic 5 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const inviteHandlers = require('./invites');
// NOTE: syncUserClaims is NOT exported here — the canonical implementation
// lives in adminOps and is exported below (line ~237).  Exporting it twice
// would silently overwrite the first assignment, creating a dead export.
exports.consumeInviteCode  = inviteHandlers.consumeInviteCode;
exports.generateInviteCode = inviteHandlers.generateInviteCode;

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

// ── Deconstruction Sprint 4: Training & Gamification (partial — default only) ─
// Launch callables → functions-core/: logTrainingSession, secure*Intent.
const trainingOps = require('./src/domains/trainingOps');
exports.commitMatchTelemetry          = trainingOps.commitMatchTelemetry;
exports.submitWorkoutRep              = trainingOps.submitWorkoutRep;
exports.secureAssignHomework          = trainingOps.secureAssignHomework;
exports.secureDeleteHomework          = trainingOps.secureDeleteHomework;
exports.completeAssignmentStatus      = trainingOps.completeAssignmentStatus;
exports.onRepCreatedUpdateTeamStats   = trainingOps.onRepCreatedUpdateTeamStats;
exports.getAccountabilityReport       = trainingOps.getAccountabilityReport;
exports.getPublicRecruitProfile       = trainingOps.getPublicRecruitProfile;
exports.getPublicClubLanding          = trainingOps.getPublicClubLanding;
exports.logPlayerActivity             = trainingOps.logPlayerActivity;
exports.analyzeTacticWithAI           = trainingOps.analyzeTacticWithAI;
exports.onRepCreatedApplyGamificationXp = trainingOps.onRepCreatedApplyGamificationXp;
// Epic 8 — intent lifecycle (not in functions-core launch slice)
exports.onUserXpUpdateIntentLifecycle = trainingOps.onUserXpUpdateIntentLifecycle;
exports.scheduledExpireIntents        = trainingOps.scheduledExpireIntents;
// B4a/B4b — advisory completion proof (player submits; parent reviews)
exports.submitCompletionProof         = trainingOps.submitCompletionProof;
exports.parentReviewCompletionProof   = trainingOps.parentReviewCompletionProof;

const gritHandlers = require('./lib/grit');
exports.triggerGritAwardUpdate = gritHandlers.triggerGritAwardUpdate;

// DEPLOY-N: admin/cell/gateway → functions-platform/ (createSportModule, publishClubCampaign, …)
exports.createSportModule         = adminOps.createSportModule;
exports.publishClubCampaign       = adminOps.publishClubCampaign;

// ── Deconstruction Sprint 5: Compliance & VPC Domain ─────────────────────────
// Household linkages, verifiable consent, minor retention purges, and the
// COPPA / GDPR compliance lifecycle have been extracted to
// src/domains/complianceOps.js.
// DEPLOY-N-household: linkHousehold, parentGrantVpcConsent → functions-compliance/
const complianceOps = require('./src/domains/complianceOps');
exports.setPlayerDateOfBirth        = complianceOps.setPlayerDateOfBirth;
exports.verifyVpcForMinor           = complianceOps.verifyVpcForMinor;
exports.directorApproveVpc          = complianceOps.directorApproveVpc;
exports.parentSubmitVpcIntent       = complianceOps.parentSubmitVpcIntent;
exports.playerSelfReportDob         = complianceOps.playerSelfReportDob;
exports.registrarTransferPlayer     = complianceOps.registrarTransferPlayer;

// ── Deconstruction Sprint 5: Operative & Identity Domain ─────────────────────
// Custom proxy enclaves, COPPA operatives, SafeSport comms, impersonation,
// and GDPR wipes have been extracted to src/domains/operativeOps.js.
// DEPLOY-N-household: parentSignCoppaWaiver, parentProvisionOperative,
// operativeSignInWithDispatch, generatePlayerOTP, validatePlayerOTP → functions-compliance/
const operativeOps = require('./src/domains/operativeOps');
exports.sendCoachPlayerMessage      = operativeOps.sendCoachPlayerMessage;
exports.sendChannelMessage          = operativeOps.sendChannelMessage;
exports.sendHouseholdMessage        = operativeOps.sendHouseholdMessage;

const scheduleOps = require('./src/domains/scheduleOps');
exports.setEventRsvp                = scheduleOps.setEventRsvp;

const registrationOps = require('./src/domains/registrationOps');
exports.getPublicRegistrationProgram = registrationOps.getPublicRegistrationProgram;

const rosterOps = require('./src/domains/rosterOps');
exports.claimRosterSpot             = rosterOps.claimRosterSpot;

const tryoutsOps = require('./src/domains/tryoutsOps');
exports.upsertTryoutProgram         = tryoutsOps.upsertTryoutProgram;
exports.getPublicTryoutProgram      = tryoutsOps.getPublicTryoutProgram;
exports.registerForTryout           = tryoutsOps.registerForTryout;
exports.upsertTryoutSession         = tryoutsOps.upsertTryoutSession;
exports.assignTryoutSession         = tryoutsOps.assignTryoutSession;
exports.setTryoutSessionRsvp        = tryoutsOps.setTryoutSessionRsvp;
exports.checkInTryoutRegistration   = tryoutsOps.checkInTryoutRegistration;

// ── Epic 4.4 W1: Parent Lounge channel provisioning ──────────────────────────
const commsChannelOps = require('./src/domains/commsChannelOps');
exports.coachProvisionParentLounge  = commsChannelOps.coachProvisionParentLounge;

// ── Sprint 3.3 — Operative loadout unlock ceremonies ────────────────────────
const loadoutOps = require('./src/domains/loadoutOps');
exports.grantLoadoutCosmetic        = loadoutOps.grantLoadoutCosmetic;
exports.redeemQuartermasterDigital  = loadoutOps.redeemQuartermasterDigital;
exports.grantAlbumSetBonus          = loadoutOps.grantAlbumSetBonus;

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

// -- Deconstruction Sprint 6: Notifications & FCM Domain ---------------------
// Device token registry, mission/assignment/trial score FCM push loops, and
// roster UID resolution have been extracted to src/domains/notificationOps.js.
const notificationOps = require('./src/domains/notificationOps');
exports.registerDeviceToken          = notificationOps.registerDeviceToken;
exports.onMissionAssigned            = notificationOps.onMissionAssigned;
exports.onAssignmentCreated          = notificationOps.onAssignmentCreated;
exports.onTrialScoreAdded            = notificationOps.onTrialScoreAdded;
exports.onTrialScoreWritten          = notificationOps.onTrialScoreWritten;
// Epic 4.3 — announcement push loop
exports.onTeamBroadcastCreated       = notificationOps.onTeamBroadcastCreated;
// Epic 4.5 Slice A — deployment calendar → team broadcast auto-announce
exports.onDeploymentCalendarEntryCreated = notificationOps.onDeploymentCalendarEntryCreated;

// Epic 5.4 — field weather / lightning lock (scheduled; feature-flagged)
const weatherOps = require('./src/domains/weatherOps');
exports.evaluateFieldWeatherLock = weatherOps.evaluateFieldWeatherLock;

// ── Phase 4, Epic 8 — Car Ride Home Protocol ─────────────────────────────────
// Fires mandatory push notifications to parents 15 minutes post-match and
// locks per-player metrics behind an EQ attestation.
// Requires: Cloud Tasks queue `car-ride-home` in us-east1 (see carRideOps.js).
const carRideOps = require('./src/domains/carRideOps');
exports.onMatchResultCreated         = carRideOps.onMatchResultCreated;
exports.deliverCarRideHomePush       = carRideOps.deliverCarRideHomePush;

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

// DEPLOY-N: RL → functions-rl/ (getAdaptiveWorkoutPolicy, initRlPolicy, triggers, …)

// ── Phase 3, Epic 5 — Loss Avoidance (Octalysis Core Drive 8) ────────────────
// enforceLossAvoidance:       nightly sweep drains inactive XP, breaks/freezes
//                             streaks, and queues reengagement alerts.
// dispatchReengagementAlerts: runs every 30 min to flush the alert queue via FCM.
// claimStreakFreeze:          onCall — player/parent consumes a streak freeze.
const lossAvoidance = require('./lossAvoidance');
exports.enforceLossAvoidance        = lossAvoidance.enforceLossAvoidance;
exports.dispatchReengagementAlerts  = lossAvoidance.dispatchReengagementAlerts;
exports.claimStreakFreeze           = lossAvoidance.claimStreakFreeze;

// ── Phase 3, Epic 5.4 — Parent Co-Op & Automated Escrow Bounties ─────────────
//
// bountyOps:
//   linkTremendousFundingSource  — parent links bank/card via Tremendous
//   listTremendousFundingSources — list available funding sources for picker
//   createBountyEscrow           — parent creates an objective bounty
//   voidBounty                   — parent cancels an active/verified bounty
//
// coOpOps:
//   activateTelemetryBoost       — parent activates a time-bounded XP multiplier
//
// bountyVerification:
//   onSkillTreeNodeWritten       — trigger on mastery_node_unlock criterion
//   onAcademicRecordWritten      — trigger on gpa_threshold criterion
//
// tremendousWebhook:
//   tremendousWebhook            — HTTPS handler for Tremendous reward status events
const bountyOpsModule = require('./bountyOps');
exports.linkTremendousFundingSource  = bountyOpsModule.linkTremendousFundingSource;
exports.listTremendousFundingSources = bountyOpsModule.listTremendousFundingSources;
exports.createBountyEscrow           = bountyOpsModule.createBountyEscrow;
exports.voidBounty                   = bountyOpsModule.voidBounty;

const coOpOpsModule = require('./coOpOps');
exports.activateTelemetryBoost = coOpOpsModule.activateTelemetryBoost;

const bountyVerificationModule = require('./bountyVerification');
exports.onSkillTreeNodeWritten  = bountyVerificationModule.onSkillTreeNodeWritten;
exports.onAcademicRecordWritten = bountyVerificationModule.onAcademicRecordWritten;

const {tremendousWebhook} = require('./tremendousWebhook');
exports.tremendousWebhook = tremendousWebhook;

// ── Phase 3, Epic 6 — Trajectory Tracking ────────────────────────────────────
//
// trajectoryMonthlyAggregator: hourly — sums xpHistory per calendar month,
//   writes trajectory_months/{YYYY-MM} buckets and updates users/{email}.trajectory
//   summary map (GVI + monthsActive + current/last month XP).
//
// trajectoryPlateauDetector: daily at 02:30 UTC — detects XP plateaus over the
//   configurable lookback window and writes memory_capsules/cap_{isoWeekKey}.
//
// getMemoryCapsule: onCall — returns the most recent unacknowledged capsule for
//   the authenticated player (on-demand "show me my breakthrough" UX).
const trajectoryAggregatorHandlers = require('./trajectoryAggregator');
exports.trajectoryMonthlyAggregator = trajectoryAggregatorHandlers.trajectoryMonthlyAggregator;

const trajectoryPlateauHandlers = require('./trajectoryPlateauDetector');
exports.trajectoryPlateauDetector = trajectoryPlateauHandlers.trajectoryPlateauDetector;
exports.getMemoryCapsule          = trajectoryPlateauHandlers.getMemoryCapsule;

// ── Phase 4, Epic 7 — Grit XP Daily-Cap Backstop ─────────────────────────────
//
// Primary path: `triggerGritAwardUpdate` callable (transaction + daily_grit_count).
// This trigger remains as a safety net for any legacy direct grit_awards writes.
//
//   1.  Counts today's grit_awards for the same playerUid (UTC day boundary).
//   2.  If count > GRIT_DAILY_CAP (default 3), voids the doc by setting
//       { void: true, voidReason: 'over_cap' } and reverses the XP increment
//       on the user document with a compensating decrement.
//
// The function intentionally uses a hard-coded cap of 3; the Remote Config
// value is only consumed client-side (fast UX gate).  Server-side the cap is
// the source of truth defined here.
exports.onGritAwardCreated = onDocumentCreated(
    'grit_awards/{recordId}',
    async (event) => {
      const snap = event.data;
      if (!snap) return;

      const data = snap.data();
      // Ignore already-voided docs (prevents re-trigger loops).
      if (data.void) return;

      const playerUid = data.playerUid;
      if (!playerUid) return;

      const GRIT_DAILY_CAP = 3;
      const GRIT_XP = 50;

      // Compute today's UTC midnight boundary.
      const now = new Date();
      const todayStart = new Date(Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
      ));

      const todaySnap = await db
          .collection('grit_awards')
          .where('playerUid', '==', playerUid)
          .where('loggedAt', '>=', admin.firestore.Timestamp.fromDate(todayStart))
          .get();

      // todaySnap already includes the current doc, so cap threshold is > not >=.
      if (todaySnap.size <= GRIT_DAILY_CAP) return;

      logger.warn('[onGritAwardCreated] Over-cap detected', {
        playerUid,
        todayCount: todaySnap.size,
        recordId: event.params.recordId,
      });

      const batch = db.batch();

      // Void the over-cap doc.
      batch.update(snap.ref, {
        void: true,
        voidReason: 'over_cap',
        voidedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Reverse the XP increment on the user document.
      // userKey is the doc ID convention (lowercase email).
      const userKey = data.userKey;
      if (userKey) {
        const userRef = db.collection('users').doc(userKey);
        batch.set(
            userRef,
            {armory: {totalXP: admin.firestore.FieldValue.increment(-GRIT_XP)}},
            {merge: true},
        );
      }

      await batch.commit();
    },
);

