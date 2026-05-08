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
exports.backgroundCheckCallback = complianceHandlers.backgroundCheckCallback;
exports.getComplianceRoster     = complianceHandlers.getComplianceRoster;
exports.requestManualOverride   = complianceHandlers.requestManualOverride;
exports.revokeCoachClearance    = complianceHandlers.revokeCoachClearance;
exports.markDocumentsUploaded   = complianceHandlers.markDocumentsUploaded;
exports.simulateClearance       = complianceHandlers.simulateClearance;
const commsHandlers = require('./comms');
exports.safeSportBroadcast = commsHandlers.safeSportBroadcast;

const verifyDocHandlers = require('./verifyDocument');
exports.verifyDocument = verifyDocHandlers.verifyDocument;
exports.processPendingDocDeletions = verifyDocHandlers.processPendingDocDeletions;
exports.getRetentionReport = verifyDocHandlers.getRetentionReport;

// â”€â”€ Epic 5 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const inviteHandlers = require('./invites');
exports.syncUserClaims = inviteHandlers.syncUserClaims;
exports.consumeInviteCode = inviteHandlers.consumeInviteCode;

const coppaHandlers = require('./coppa');
exports.sendParentalConsentEmail = coppaHandlers.sendParentalConsentEmail;
exports.verifyParentalConsent = coppaHandlers.verifyParentalConsent;

const auditHandlers = require('./audit');
// IAM prerequisite: grant "Service Account Token Creator" to the Functions service account.
exports.getSensitiveDocumentUrl = auditHandlers.getSensitiveDocumentUrl;

const REGION = 'us-east1';

const {GoogleGenAI} = require('@google/genai');

/**
 * @param {string} secret
 * @param {Record<string, unknown>} fields
 * @return {string} hex HMAC-SHA256
 */
function workoutAttestationHmac(secret, fields) {
  const sortedKeys = Object.keys(fields).sort();
  const sorted = {};
  for (const k of sortedKeys) {
    sorted[k] = fields[k];
  }
  const canonical = JSON.stringify(sorted);
  return crypto.createHmac('sha256', secret).update(canonical).digest('hex');
}

/**
 * @param {unknown} raw
 * @return {Array<{name: string, sets: number, reps: number}>}
 */
function parseDrillsPayload(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new HttpsError(
        'invalid-argument',
        'Add at least one drill to the session.',
    );
  }
  if (raw.length > 80) {
    throw new HttpsError('invalid-argument', 'Too many drills in one session.');
  }
  return raw.map((d) => {
    if (!d || typeof d !== 'object') {
      throw new HttpsError('invalid-argument', 'Invalid drill row.');
    }
    const name = typeof d.name === 'string' ? d.name.trim() : '';
    if (!name || name.length > 220) {
      throw new HttpsError(
          'invalid-argument',
          'Each drill needs a valid name.',
      );
    }
    let sets = Number(d.sets);
    let reps = Number(d.reps);
    if (!Number.isFinite(sets) || sets < 1) sets = 1;
    if (!Number.isFinite(reps) || reps < 1) reps = 1;
    sets = Math.min(Math.floor(sets), 999);
    reps = Math.min(Math.floor(reps), 99999);
    return {name, sets, reps};
  });
}

/**
 * @param {any} request Callable request
 * @return {Object} Actor with role, clubId, email
 */
function assertDirectorOrSuper(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const role = request.auth.token.role;
  if (role !== 'super_admin' && role !== 'director') {
    throw new HttpsError(
        'permission-denied',
        'Only directors and application admins may perform this action.',
    );
  }
  return {
    role,
    clubId: request.auth.token.clubId || null,
    email: request.auth.token.email,
  };
}

const READONLY_SUBSCRIPTION_MSG =
    'Subscription inactive. Account is in read-only mode.';

/**
 * Epic 9: block mutating callables when subscription is not active (past_due /
 * canceled). Legacy: missing entitlement doc or empty subscription_status
 * still allowed. super_admin bypass.
 * @param {string} clubId
 * @param {any} request Callable request
 * @return {Promise<void>}
 */
async function assertClubSubscriptionWritable(clubId, request) {
  if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
    return;
  }
  if (request.auth && request.auth.token.role === 'super_admin') {
    return;
  }
  const snap =
      await db.collection('license_entitlements').doc(clubId.trim()).get();
  if (!snap.exists) {
    return;
  }
  const d = snap.data() || {};
  if (d.billing_exempt === true || d.grandfathered === true) {
    return;
  }
  const raw = d.subscription_status;
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return;
  }
  if (String(raw).toLowerCase() === 'active') {
    return;
  }
  throw new HttpsError('permission-denied', READONLY_SUBSCRIPTION_MSG);
}

/**
 * Strict super_admin only (licensing, sport modules, etc.).
 * @param {any} request Callable request
 * @return {{ email: string }}
 */
function assertSuperAdmin(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  if (request.auth.token.role !== 'super_admin') {
    throw new HttpsError(
        'permission-denied',
        'Only application super admins may perform this action.',
    );
  }
  return {email: normEmail(request.auth.token.email) || 'unknown'};
}

/**
 * @return {string} e.g. SST-A3F9-K2PL
 */
function generateLicenseKeyString() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segment = () =>
    Array.from({length: 4}, () =>
      chars[crypto.randomInt(0, chars.length)],
    ).join('');
  return `SST-${segment()}-${segment()}`;
}

/**
 * @param {*} err Firestore / gRPC error from DocumentReference.create
 * @return {boolean}
 */
function isAlreadyExistsError(err) {
  if (!err || typeof err !== 'object') return false;
  if (err.code === 6) return true;
  const msg = typeof err.message === 'string' ? err.message : '';
  return msg.includes('ALREADY_EXISTS') || msg.includes('already exists');
}

/**
 * Coach / director / registrar / super_admin: may add roster rows for teamId.
 * @param {any} request Callable request
 * @param {string} teamId Team document id
 * @return {Promise<{clubId: string}>}
 */
async function assertCanSecureAddPlayer(request, teamId) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  if (!teamId || typeof teamId !== 'string' || !teamId.trim()) {
    throw new HttpsError('invalid-argument', 'teamId is required.');
  }
  const role = request.auth.token.role || 'player';
  const tokenClub = request.auth.token.clubId || null;
  const tokenTeam = request.auth.token.teamId || null;
  const tid = teamId.trim();
  const teamSnap = await db.collection('teams').doc(tid).get();
  if (!teamSnap.exists) {
    throw new HttpsError('not-found', 'Team not found.');
  }
  const clubIdRaw = teamSnap.data().clubId;
  const clubId =
      typeof clubIdRaw === 'string' && clubIdRaw.trim() ?
        clubIdRaw.trim() :
        '';
  if (!clubId) {
    throw new HttpsError('failed-precondition', 'Team has no club scope.');
  }
  if (role === 'super_admin') {
    return {clubId};
  }
  if (role === 'director' && tokenClub && tokenClub === clubId) {
    return {clubId};
  }
  if (role === 'registrar' && tokenClub && tokenClub === clubId) {
    return {clubId};
  }
  if (role === 'coach' && tokenTeam === tid) {
    return {clubId};
  }
  throw new HttpsError(
      'permission-denied',
      'Only club staff assigned to this team may add players.',
  );
}

/**
 * @param {any} request Callable request
 * @return {{ email: string, householdId: string }}
 */
function assertParent(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  if (request.auth.token.role !== 'parent') {
    throw new HttpsError(
        'permission-denied',
        'Only parent accounts may use this action.',
    );
  }
  const email = normEmail(request.auth.token.email);
  const householdId =
    typeof request.auth.token.householdId === 'string' ?
      request.auth.token.householdId.trim() :
      '';
  if (!email || !householdId) {
    throw new HttpsError(
        'failed-precondition',
        'Your account must be linked to a household. ' +
        'Ask your director to connect parent and player emails.',
    );
  }
  return {email, householdId};
}

/**
 * Assert caller is club staff for roster transfers.
 * @param {any} request Callable request
 * @return {Object} Actor with role, clubId, email
 */
function assertClubStaff(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const role = request.auth.token.role;
  const clubId = request.auth.token.clubId || null;
  if (role === 'super_admin') {
    return {role, clubId, email: request.auth.token.email};
  }
  if (role === 'director' || role === 'registrar') {
    if (!clubId) {
      throw new HttpsError(
          'failed-precondition',
          'Your account is missing club scope; sign out and back in.',
      );
    }
    return {role, clubId, email: request.auth.token.email};
  }
  throw new HttpsError(
      'permission-denied',
      'Only club staff may perform this action.',
  );
}

/**
 * Coach / director / super_admin â€” allowed to send guarded athlete messages.
 * @param {any} request Callable request
 * @return {Object} Actor with role, teamId, clubId, email.
 */
function assertCoachMessageSender(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const role = request.auth.token.role;
  const email = normEmail(request.auth.token.email);
  const teamId = request.auth.token.teamId || null;
  const clubId = request.auth.token.clubId || null;
  if (role === 'super_admin') {
    return {role, teamId, clubId, email};
  }
  if (role === 'director') {
    if (!clubId) {
      throw new HttpsError(
          'failed-precondition',
          'Your account is missing club scope; sign out and back in.',
      );
    }
    return {role, teamId, clubId, email};
  }
  if (role === 'coach') {
    if (!teamId) {
      throw new HttpsError(
          'failed-precondition',
          'Your account is missing team scope; sign out and back in.',
      );
    }
    return {role, teamId, clubId, email};
  }
  throw new HttpsError(
      'permission-denied',
      'Only coaches, directors, or admins may send staff messages.',
  );
}

/**
 * Coach / director / super_admin access to a team doc (tactics, AI, etc.).
 * @param {Object} actor assertCoachMessageSender result
 * @param {string} teamId
 * @param {Object} tSnap teams/{teamId} doc snapshot
 */
function assertActorCanAccessTeam(actor, teamId, tSnap) {
  if (!tSnap.exists) {
    throw new HttpsError('not-found', 'Team not found.');
  }
  const teamClubId =
      typeof tSnap.data().clubId === 'string' ?
        tSnap.data().clubId.trim() :
        null;
  if (actor.role === 'super_admin') {
    return;
  }
  if (actor.role === 'coach') {
    if (!actor.teamId || actor.teamId !== teamId) {
      throw new HttpsError(
          'permission-denied',
          'You can only access your assigned team.',
      );
    }
    return;
  }
  if (actor.role === 'director') {
    if (!actor.clubId || !teamClubId || teamClubId !== actor.clubId) {
      throw new HttpsError(
          'permission-denied',
          'Team is not in your club.',
      );
    }
    return;
  }
  throw new HttpsError('permission-denied', 'Not allowed.');
}

/**
 * Sprint 3.3: authenticated player only (JWT role).
 * @param {any} request Callable request
 * @return {string} Normalized users/{emailKey} document id
 */
function assertPlayer(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const role = request.auth.token.role || 'player';
  if (role !== 'player') {
    throw new HttpsError(
        'permission-denied',
        'Only player accounts may perform this action.',
    );
  }
  const email = normEmail(request.auth.token.email);
  if (!email) {
    throw new HttpsError(
        'failed-precondition',
        'A verified email is required.',
    );
  }
  return email;
}

/**
 * @param {string} ymd yyyy-mm-dd (UTC calendar)
 * @param {number} deltaDays
 * @return {string}
 */
function utcYmdAddDays(ymd, deltaDays) {
  const parts = ymd.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

/**
 * @param {unknown} value Firestore field
 * @return {string|null} yyyy-mm-dd UTC or null
 */
function lastActivityToUtcYmd(value) {
  if (!value) return null;
  if (value instanceof admin.firestore.Timestamp) {
    return value.toDate().toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    const s = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  }
  return null;
}

/**
 * Stable opaque id for leaderboard payloads (not raw email / PII).
 * @param {string} emailKey
 * @return {string}
 */
function leaderboardPublicPlayerKey(emailKey) {
  return crypto
      .createHash('sha256')
      .update('sst_lb_v1|' + emailKey)
      .digest('hex')
      .slice(0, 24);
}

/**
 * @param {Record<string, unknown>} u
 * @return {boolean}
 */
function isLeaderboardPlayerRow(u) {
  const r = typeof u.role === 'string' ? u.role : '';
  if (r === 'coach' || r === 'director' || r === 'registrar' ||
      r === 'parent' || r === 'super_admin') {
    return false;
  }
  return true;
}

/**
 * @param {unknown} e
 * @return {string|null}
 */
function normEmail(e) {
  if (typeof e !== 'string') return null;
  const s = e.trim().toLowerCase();
  return s || null;
}

/**
 * Lowercase a-z0-9 only, for Operative proxy local-part and login lookup.
 * @param {unknown} raw
 * @return {string}
 */
function normOperativeCallsignSlug(raw) {
  if (raw == null || typeof raw !== 'string') {
    return '';
  }
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * @param {string} url
 * @return {boolean}
 */
function isTrustedFirebaseStorageLogoUrl(url) {
  if (typeof url !== 'string' || url.length < 40 || url.length > 2000) {
    return false;
  }
  if (!url.startsWith('https://')) {
    return false;
  }
  return url.includes('firebasestorage.googleapis.com') ||
      url.includes('firebasestorage.app') ||
      url.includes('storage.googleapis.com');
}

/**
 * Deterministic id for coach invite dedupe
 * (one pending invite per club+team+email).
 * @param {string} clubId
 * @param {string} teamId
 * @param {string} coachEmail
 * @return {string}
 */
function coachInviteDocId(clubId, teamId, coachEmail) {
  const safe = (s) =>
    String(s || '')
        .replace(/[/\s]/g, '_')
        .replace(/[^a-zA-Z0-9_@-]/g, '')
        .slice(0, 200);
  return `${safe(clubId)}__${safe(teamId)}__${safe(coachEmail)}`;
}

/**
 * Director must operate only on their token club
 * (super_admin may pass any club).
 * @param {any} request
 * @param {string} clubId
 * @return {{role: string, clubId: ?string, email: ?string}}
 */
function assertDirectorClubOrSuper(request, clubId) {
  const actor = assertDirectorOrSuper(request);
  if (actor.role === 'super_admin') {
    return actor;
  }
  if (!clubId || actor.clubId !== clubId) {
    throw new HttpsError(
        'permission-denied',
        'You can only manage resources for your own club.',
    );
  }
  return actor;
}

/**
 * Director, registrar, or super_admin for club branding persistence.
 * @param {any} request
 * @param {string} clubId
 * @return {{role: string, clubId: ?string, email: ?string}}
 */
function assertClubStaffOrSuper(request, clubId) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const role = request.auth.token.role;
  const tokenClub = request.auth.token.clubId || null;
  if (role === 'super_admin') {
    return {
      role,
      clubId: tokenClub,
      email: normEmail(request.auth.token.email),
    };
  }
  if (role !== 'director' && role !== 'registrar') {
    throw new HttpsError(
        'permission-denied',
        'Only directors or registrars may update club branding.',
    );
  }
  if (!clubId || !tokenClub || tokenClub !== clubId) {
    throw new HttpsError(
        'permission-denied',
        'You can only manage branding for your own club.',
    );
  }
  return {
    role,
    clubId: tokenClub,
    email: normEmail(request.auth.token.email),
  };
}

/**
 * vpc_requests.clubId must match director queue filters (child, household,
 * team, or parent profile fallback).
 * @param {Record<string, unknown>} u Minor users doc
 * @param {Record<string, unknown>} h Household doc
 * @param {string} parentEmail Caller (parent) email key
 * @return {Promise<string|null>}
 */
async function resolveClubIdForVpcIntent(u, h, parentEmail) {
  const fromUser =
      typeof u.clubId === 'string' && u.clubId.trim() ? u.clubId.trim() : null;
  if (fromUser) return fromUser;
  const fromHousehold =
      typeof h.clubId === 'string' && h.clubId.trim() ? h.clubId.trim() : null;
  if (fromHousehold) return fromHousehold;
  const tid = typeof u.teamId === 'string' ? u.teamId.trim() : '';
  if (tid && tid !== 'admin') {
    const tSnap = await db.collection('teams').doc(tid).get();
    if (tSnap.exists) {
      const tc = tSnap.data().clubId;
      if (typeof tc === 'string' && tc.trim()) return tc.trim();
    }
  }
  const pEm = normEmail(parentEmail);
  if (pEm) {
    const pSnap = await db.collection('users').doc(pEm).get();
    if (pSnap.exists) {
      const pc = pSnap.data().clubId;
      if (typeof pc === 'string' && pc.trim()) return pc.trim();
    }
  }
  return null;
}

/**
 * @param {admin.firestore.Timestamp} dob
 * @return {number}
 */
function computeAgeYears(dob) {
  const d = dob.toDate();
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
    age--;
  }
  return age;
}

/**
 * Epic 16: age band label for recruiter filters (no DOB exposed on public doc).
 * @param {number} ageYears
 * @return {string}
 */
function ageGroupLabel(ageYears) {
  if (!Number.isFinite(ageYears) || ageYears < 0) return 'Unknown';
  if (ageYears <= 10) return 'U10';
  if (ageYears <= 12) return 'U12';
  if (ageYears <= 14) return 'U14';
  if (ageYears <= 16) return 'U16';
  if (ageYears <= 18) return 'U18';
  return 'U19+';
}

/**
 * @param {string} playerName
 * @param {boolean} isMinor
 * @return {string}
 */
function sanitizePublicDisplayName(playerName, isMinor) {
  const raw = typeof playerName === 'string' ? playerName.trim() : '';
  if (!raw) return 'Athlete';
  if (!isMinor) return raw.slice(0, 80);
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Athlete';
  if (parts.length === 1) return parts[0].slice(0, 40);
  const last = parts[parts.length - 1];
  const initial = last.length > 0 ? last.charAt(0).toUpperCase() : '';
  return `${parts[0]} ${initial}.`.slice(0, 80);
}

/**
 * @param {Record<string, unknown>} physical
 * @param {Record<string, unknown>} technical
 * @return {string[]}
 */
function topAttributesFromMetrics(physical, technical) {
  /** @type {Array<{k: string, v: number}>} */
  const pairs = [];
  const phys = physical && typeof physical === 'object' ? physical : {};
  const tech = technical && typeof technical === 'object' ? technical : {};
  for (const [k, v] of Object.entries(phys)) {
    const n = typeof v === 'number' && !Number.isNaN(v) ? v : null;
    if (n !== null) {
      pairs.push({
        k: k.charAt(0).toUpperCase() + k.slice(1),
        v: n,
      });
    }
  }
  for (const [k, v] of Object.entries(tech)) {
    const n = typeof v === 'number' && !Number.isNaN(v) ? v : null;
    if (n !== null) {
      pairs.push({
        k: k.charAt(0).toUpperCase() + k.slice(1),
        v: n,
      });
    }
  }
  pairs.sort((a, b) => b.v - a.v);
  return pairs.slice(0, 3).map((p) => p.k);
}

/**
 * @param {string} uid
 * @return {Promise<void>}
 */
async function syncPublicPlayerProfile(uid) {
  if (!uid || typeof uid !== 'string') {
    return;
  }
  const pubRef = db.collection('public_player_profiles').doc(uid);

  let email = '';
  try {
    const au = await admin.auth().getUser(uid);
    email = normEmail(au.email);
  } catch (e) {
    logger.warn('syncPublicPlayerProfile: invalid uid', uid, e);
    return;
  }
  if (!email) {
    return;
  }

  const uRef = db.collection('users').doc(email);
  const uSnap = await uRef.get();
  if (!uSnap.exists) {
    await pubRef.delete().catch(() => {});
    return;
  }
  const u = uSnap.data() || {};
  const role = typeof u.role === 'string' ? u.role : 'player';
  if (role !== 'player') {
    await pubRef.delete().catch(() => {});
    return;
  }

  const psSnap = await db.collection('player_stats').doc(uid).get();
  if (!psSnap.exists) {
    await pubRef.delete().catch(() => {});
    return;
  }
  const ps = psSnap.data() || {};

  const nowAgg = new Date();
  const sixMonthsAgo = new Date(nowAgg);
  sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 6);
  const fourteenDaysAgo = new Date(nowAgg);
  fourteenDaysAgo.setUTCDate(fourteenDaysAgo.getUTCDate() - 14);

  const lgSnap = await db.collection('workout_logs').where('playerId', '==', uid).get();

  /** @type {Record<string, number>} */
  const monthXp = {};
  /** @type {Record<string, number>} */
  const dayXp = {};
  /** @type {Record<string, number>} */
  const weekXp = {};

  lgSnap.forEach((doc) => {
    const lg = doc.data() || {};
    const ts = lg.timestamp;
    const t =
        ts instanceof admin.firestore.Timestamp ?
          ts.toDate() :
          null;
    if (!t) return;
    const earned = Math.floor(Number(lg.earnedXP) || Number(lg.earnedXp) || Number(lg.earned) || 0);
    if (earned <= 0) return;

    if (t >= sixMonthsAgo) {
      const mk =
          `${t.getUTCFullYear()}-` +
          `${String(t.getUTCMonth() + 1).padStart(2, '0')}`;
      monthXp[mk] = (monthXp[mk] || 0) + earned;
    }
    if (t >= fourteenDaysAgo) {
      const dk = t.toISOString().slice(0, 10);
      dayXp[dk] = (dayXp[dk] || 0) + earned;
    }
    const wk = utcWeekMondayKeyFromDate(t);
    weekXp[wk] = (weekXp[wk] || 0) + earned;
  });

  /** @type {Array<{ month: string, xp: number }>} */
  const monthlyXp = Object.keys(monthXp)
      .sort()
      .map((month) => ({month, xp: monthXp[month]}));

  /** @type {Array<{ day: string, xp: number }>} */
  const dailyPerformance = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(
        Date.UTC(nowAgg.getUTCFullYear(), nowAgg.getUTCMonth(), nowAgg.getUTCDate() - i),
    );
    const key = d.toISOString().slice(0, 10);
    dailyPerformance.push({day: key, xp: dayXp[key] || 0});
  }

  const anchorMondayStr = utcWeekMondayKeyFromDate(nowAgg);
  const anchorMonday = parseUtcYmd(anchorMondayStr);
  /** @type {Array<{ week: string, xp: number }>} */
  const weeklyPerformance = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(anchorMonday);
    d.setUTCDate(d.getUTCDate() - i * 7);
    const key = d.toISOString().slice(0, 10);
    weeklyPerformance.push({week: key, xp: weekXp[key] || 0});
  }

  const playerNameForTrials =
      typeof ps.playerName === 'string' && ps.playerName.trim() ?
        ps.playerName.trim() :
        (typeof u.playerName === 'string' ? u.playerName.trim() : '');
  const teamIdForTrials =
      typeof u.teamId === 'string' && u.teamId.trim() && u.teamId !== 'admin' ?
        u.teamId.trim() :
        '';

  /** @type {Record<string, string>} */
  const verifiedTrialScores = {};
  if (teamIdForTrials && playerNameForTrials) {
    let trialSnap = await db.collection('trials')
        .where('teamId', '==', teamIdForTrials)
        .where('player', '==', playerNameForTrials)
        .limit(80)
        .get();

    if (trialSnap.empty) {
      trialSnap = await db.collection('trials')
          .where('teamId', '==', teamIdForTrials)
          .where('playerName', '==', playerNameForTrials)
          .limit(80)
          .get();
    }
    trialSnap.forEach((d) => {
      const tr = d.data() || {};
      if (tr.isCoach !== true) return;
      const skill =
          typeof tr.skill === 'string' && tr.skill.trim() ?
            tr.skill.trim() :
            '';
      const res =
          typeof tr.result === 'string' ? tr.result.trim() : '';
      if (!skill || !res) return;
      verifiedTrialScores[skill] = res;
    });
  }

  await db.collection('player_stats').doc(uid).set(
      {
        monthly_performance: monthlyXp,
        daily_performance: dailyPerformance,
        weekly_performance: weeklyPerformance,
        verified_trial_scores: verifiedTrialScores,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true},
  );

  if (u.recruitProfilePublic !== true) {
    await pubRef.delete().catch(() => {});
    return;
  }

  const dob = u.dateOfBirth;
  const dobBad =
      u.isMinor === true ||
      !dob ||
      !(dob instanceof admin.firestore.Timestamp);
  if (dobBad) {
    await pubRef.delete().catch(() => {});
    return;
  }
  const age = computeAgeYears(dob);
  if (age < 16) {
    await pubRef.delete().catch(() => {});
    return;
  }
  const totalXp =
      typeof ps.total_xp === 'number' && !Number.isNaN(ps.total_xp) ?
        Math.floor(ps.total_xp) :
        0;
  const currentLevel =
      typeof ps.current_level === 'number' && !Number.isNaN(ps.current_level) ?
        Math.floor(ps.current_level) :
        1;

  const playerName =
      typeof ps.playerName === 'string' && ps.playerName.trim() ?
        ps.playerName.trim() :
        (typeof u.playerName === 'string' ? u.playerName.trim() : 'Athlete');
  const displayName = sanitizePublicDisplayName(
      playerName,
      u.isMinor === true,
  );
  const ageGroup = ageGroupLabel(age);
  const position =
      typeof u.primaryPosition === 'string' && u.primaryPosition.trim() ?
        u.primaryPosition.trim().slice(0, 64) :
        'Unlisted';

  /** @type {string[]} */
  let topAttributes = [];
  const metricsSnap = await db.collection('player_metrics').doc(email)
      .collection('seasons')
      .get();
  /**
   * @type {{
   *   physical?: object,
   *   technical?: object,
   *   ua?: admin.firestore.Timestamp
   * } | null}
   */
  let best = null;
  metricsSnap.forEach((d) => {
    const x = d.data() || {};
    const vb = x.verifiedBy;
    if (typeof vb !== 'string' || !vb.length) return;
    const ua = x.updatedAt;
    if (!(ua instanceof admin.firestore.Timestamp)) return;
    if (!best || ua.toMillis() > best.ua.toMillis()) {
      best = {
        physical: x.physical,
        technical: x.technical,
        ua,
      };
    }
  });
  if (best) {
    topAttributes = topAttributesFromMetrics(
        /** @type {Record<string, unknown>} */ (best.physical || {}),
        /** @type {Record<string, unknown>} */ (best.technical || {}),
    );
  }

  const teamId =
      typeof u.teamId === 'string' && u.teamId.trim() && u.teamId !== 'admin' ?
        u.teamId.trim() :
        '';
  /** @type {string} */
  let resolvedClubId = '';
  let verifiedVideoScoreId = null;
  try {
    const vSnap = await db.collection('trial_scores')
        .where('playerId', '==', uid)
        .where('status', '==', 'verified')
        .orderBy('verifiedAt', 'desc')
        .limit(1)
        .get();
    if (!vSnap.empty) {
      const vd = vSnap.docs[0].data() || {};
      const vu =
          typeof vd.videoUrl === 'string' && vd.videoUrl.trim() ?
            vd.videoUrl.trim() :
            '';
      if (vu) {
        verifiedVideoUrl = vu;
        verifiedVideoScoreId = vSnap.docs[0].id;
      }
    }
  } catch (e) {
    logger.warn('syncPublicPlayerProfile trial_scores video', e);
  }

  let brandLogoUrl = null;
  let clubNameShort = null;
  if (teamId) {
    const teamSnap = await db.collection('teams').doc(teamId).get();
    const tData = teamSnap.exists ? teamSnap.data() : null;
    const tidClub =
        tData &&
        typeof tData.clubId === 'string' &&
        tData.clubId.trim() ?
          tData.clubId.trim() :
          '';
    const userClub =
        typeof u.clubId === 'string' && u.clubId.trim() ? u.clubId.trim() : '';
    const clubId = tidClub || userClub;
    if (clubId) {
      resolvedClubId = clubId;
      const clubSnap = await db.collection('clubs').doc(clubId).get();
      if (clubSnap.exists) {
        const c = clubSnap.data() || {};
        const logo =
            typeof c.brandLogoUrl === 'string' ? c.brandLogoUrl.trim() : '';
        if (logo) brandLogoUrl = logo;
        const cn =
            typeof c.name === 'string' && c.name.trim() ?
              c.name.trim().slice(0, 80) :
              '';
        if (cn) clubNameShort = cn;
      }
    }
  } else {
    const userClub =
        typeof u.clubId === 'string' && u.clubId.trim() ? u.clubId.trim() : '';
    if (userClub) {
      resolvedClubId = userClub;
    }
  }

  await pubRef.set(
      {
        displayName,
        ageGroup,
        position,
        clubId: resolvedClubId || null,
        current_level: currentLevel,
        total_xp: totalXp,
        top_attributes: topAttributes,
        verified_trial_scores: verifiedTrialScores,
        monthly_performance: monthlyXp,
        verified_video_url: verifiedVideoUrl || null,
        verified_video_score_id: verifiedVideoScoreId || null,
        brandLogoUrl: brandLogoUrl || null,
        clubDisplayName: clubNameShort || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true},
  );
}

/**
 * Epic 16: sanitized global index for recruiter search (Admin SDK only writes).
 * `statId` may be Auth UID or legacy keyed doc â€” resolve before syncing public profile.
 */
exports.updatePublicProfile = onDocumentWritten(
    {
      document: 'player_stats/{statId}',
      region: REGION,
    },
    async (event) => {
      const statId = event.params.statId;
      if (!statId) return;

      const after =
          event.data && event.data.after ? event.data.after.data() : null;
      const teamId = after ? after.teamId : null;

      try {
        try {
          const au = await admin.auth().getUser(statId);
          await syncPublicPlayerProfile(au.uid);
          return;
        } catch (_err) {
          /* Not a UID â€” proceed to name resolution. */
        }

        if (!teamId) return;

        const snap = await db.collection('users')
            .where('teamId', '==', teamId)
            .where('playerName', '==', statId)
            .limit(1)
            .get();

        if (snap.empty) return;
        const rawId = snap.docs[0].id;
        let playerUid = rawId;
        if (typeof rawId === 'string' && rawId.includes('@')) {
          const ur = await admin.auth().getUserByEmail(normEmail(rawId));
          playerUid = ur.uid;
        }
        await syncPublicPlayerProfile(playerUid);
      } catch (e) {
        logger.error('updatePublicProfile player_stats', e);
      }
    },
);

/**
 * Epic 16: refresh public index when coach-verified trials change.
 */
exports.updatePublicProfileOnTrial = onDocumentWritten(
    {
      document: 'trials/{scoreId}',
      region: REGION,
    },
    async (event) => {
      const after = event.data && event.data.after ?
        event.data.after.data() :
        null;
      const before = event.data && event.data.before ?
        event.data.before.data() :
        null;
      const data = after || before;
      if (!data) return;
      const teamId =
          typeof data.teamId === 'string' ? data.teamId.trim() : '';
      const playerName =
          typeof data.player === 'string' ? data.player.trim() :
          (typeof data.playerName === 'string' ? data.playerName.trim() : '');
      if (!teamId || !playerName) return;
      try {
        const snap = await db.collection('users')
            .where('teamId', '==', teamId)
            .where('playerName', '==', playerName)
            .limit(3)
            .get();
        if (snap.empty) return;
        for (const doc of snap.docs) {
          const rawId = doc.id;
          let playerUid = rawId;
          if (typeof rawId === 'string' && rawId.includes('@')) {
            try {
              const ur = await admin.auth().getUserByEmail(normEmail(rawId));
              playerUid = ur.uid;
            } catch (e) {
              logger.warn('updatePublicProfileOnTrial uid', e);
              continue;
            }
          }
          await syncPublicPlayerProfile(playerUid);
        }
      } catch (e) {
        logger.error('updatePublicProfileOnTrial', e);
      }
    },
);

/** Epic 14: video trial Firestore row after Storage upload (validated). */
exports.submitVideoTrial = onCall({region: REGION}, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const role = request.auth.token.role || 'player';
  if (role !== 'player') {
    throw new HttpsError(
        'permission-denied',
        'Only player accounts may submit video trials.',
    );
  }
  const data = request.data || {};
  const scoreId =
      typeof data.scoreId === 'string' ? data.scoreId.trim() : '';
  const videoUrl =
      typeof data.videoUrl === 'string' ? data.videoUrl.trim() : '';
  const skill =
      typeof data.skill === 'string' ? data.skill.trim().slice(0, 120) : '';
  if (!scoreId || scoreId.length < 8 || scoreId.length > 128) {
    throw new HttpsError('invalid-argument', 'scoreId is required.');
  }
  if (!videoUrl || !videoUrl.startsWith('http')) {
    throw new HttpsError('invalid-argument', 'videoUrl is required.');
  }
  const uid = request.auth.uid;
  const email = normEmail(request.auth.token.email);
  if (!email) {
    throw new HttpsError('failed-precondition', 'Missing email on account.');
  }
  const uSnap = await db.collection('users').doc(email).get();
  if (!uSnap.exists) {
    throw new HttpsError('not-found', 'Profile not found.');
  }
  const u = uSnap.data() || {};
  const teamId =
      typeof u.teamId === 'string' && u.teamId.trim() && u.teamId !== 'admin' ?
        u.teamId.trim() :
        '';
  const clubId =
      typeof u.clubId === 'string' && u.clubId.trim() ? u.clubId.trim() : '';
  const playerName =
      typeof u.playerName === 'string' && u.playerName.trim() ?
        u.playerName.trim() :
        '';
  if (!teamId || !clubId || !playerName) {
    throw new HttpsError(
        'failed-precondition',
        'Athlete profile must have team and club.',
    );
  }

  const expectedPath = `clubs/${clubId}/trials/${uid}/${scoreId}_video.mp4`;
  let bucket;
  try {
    bucket = admin.storage().bucket();
  } catch (e) {
    logger.error('submitVideoTrial bucket', e);
    throw new HttpsError(
        'failed-precondition',
        'Storage is not available.',
    );
  }
  const [exists] = await bucket.file(expectedPath).exists();
  if (!exists) {
    throw new HttpsError(
        'failed-precondition',
        'Upload the video to the expected path before submitting.',
    );
  }

  const ref = db.collection('trial_scores').doc(scoreId);
  const prev = await ref.get();
  if (prev.exists) {
    throw new HttpsError(
        'already-exists',
        'This trial id was already submitted.',
    );
  }

  await ref.set({
    clubId,
    teamId,
    playerId: uid,
    playerName,
    videoUrl,
    skill: skill || '',
    status: 'pending_verification',
    submittedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {ok: true, scoreId};
});

/**
 * Epic 14: coach / director approves or rejects a pending video trial.
 */
exports.verifyVideoTrial = onCall({region: REGION}, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const data = request.data || {};
  const scoreId =
      typeof data.scoreId === 'string' ? data.scoreId.trim() : '';
  const decisionRaw =
      typeof data.decision === 'string' ? data.decision.trim().toLowerCase() :
        '';
  if (!scoreId) {
    throw new HttpsError('invalid-argument', 'scoreId is required.');
  }
  if (!['approve', 'reject'].includes(decisionRaw)) {
    throw new HttpsError(
        'invalid-argument',
        'decision must be approve or reject.',
    );
  }

  const ref = db.collection('trial_scores').doc(scoreId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Trial not found.');
  }
  const t = snap.data() || {};
  const teamId =
      typeof t.teamId === 'string' ? t.teamId.trim() : '';
  if (!teamId) {
    throw new HttpsError('failed-precondition', 'Trial has no team.');
  }
  await assertCanSecureAddPlayer(request, teamId);

  const st = t.status;
  if (st !== 'pending_verification') {
    throw new HttpsError(
        'failed-precondition',
        'This trial is not pending verification.',
    );
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const actorUid = request.auth.uid;
  const patch =
      decisionRaw === 'approve' ?
        {
          status: 'verified',
          verifiedAt: now,
          verifiedByUid: actorUid,
        } :
        {
          status: 'rejected',
          verifiedAt: now,
          verifiedByUid: actorUid,
        };

  await db.runTransaction(async (tx) => {
    const cur = await tx.get(ref);
    if (!cur.exists) {
      throw new HttpsError('not-found', 'Trial not found.');
    }
    const c = cur.data() || {};
    if (c.status !== 'pending_verification') {
      throw new HttpsError(
          'failed-precondition',
          'This trial is no longer pending.',
      );
    }
    tx.update(ref, patch);
  });

  return {ok: true, scoreId, status: patch.status};
});

exports.syncUserClaims = onDocumentWritten('users/{email}', async (event) => {
  const userData = event.data.after.data();
  const userEmail = event.params.email;

  if (!userData) {
    logger.info('User profile deleted. Exiting function.');
    try {
      const ur = await admin.auth().getUserByEmail(userEmail);
      await db.collection('public_player_profiles').doc(ur.uid).delete();
    } catch (e) {
      logger.warn('syncUserClaims public profile delete', e);
    }
    return null;
  }

  const superAdmin = ADMIN_EMAIL.value();

  // Epic 14: Clearance Protocol — compute isCleared from Firestore clearance sub-object.
  // Zero-Trust: only status flag + expiry are used. No PII in JWT.
  const clearanceData = (typeof userData.clearance === 'object' && userData.clearance !== null)
    ? userData.clearance : {};
  const clearanceStatus = typeof clearanceData.status === 'string'
    ? clearanceData.status : 'pending';
  let isCleared = clearanceStatus === 'cleared';
  if (isCleared && clearanceData.expiresAt != null) {
    try {
      const expMs = typeof clearanceData.expiresAt.toMillis === 'function'
        ? clearanceData.expiresAt.toMillis()
        : Number(clearanceData.expiresAt);
      if (!isNaN(expMs) && expMs < Date.now()) isCleared = false;
    } catch {
      isCleared = false;
    }
  }
  // Only coaches and recruiters are subject to the clearance gate.
  // Directors, registrars, parents, players, and admins always pass isCleared = true.
  const clearedRole = userData.role || 'player';
  const requiresClearance = clearedRole === 'coach' || clearedRole === 'recruiter';
  if (!requiresClearance) isCleared = true;

  const customClaims = {
    teamId: userData.teamId || null,
    role: clearedRole,
    clubId: userData.clubId || null,
    householdId: userData.householdId || null,
    minor: userData.isMinor === true,
    vpcVerified: userData.vpcStatus === 'verified',
    isCleared,
    tier: null,
    subscription_status: null,
  };

  const cid =
      typeof userData.clubId === 'string' && userData.clubId.trim() ?
        userData.clubId.trim() :
        '';
  if (cid) {
    try {
      const entSnap = await db.collection('license_entitlements')
          .doc(cid)
          .get();
      if (entSnap.exists) {
        const ed = entSnap.data() || {};
        const tr = ed.tier;
        const ss = ed.subscription_status;
        customClaims.tier = typeof tr === 'string' ? tr : null;
        customClaims.subscription_status =
            typeof ss === 'string' ? ss : null;
      }
    } catch (e) {
      logger.warn('syncUserClaims entitlement read', e);
    }
  }

  logger.info(`Intercepted profile update for: ${userEmail}`);

  if (userEmail.toLowerCase() === superAdmin.toLowerCase()) {
    customClaims.role = 'super_admin';
    logger.info('Super Admin detected! Upgrading badge.');
  }

  try {
    const userRecord = await admin.auth().getUserByEmail(userEmail);
    await admin.auth().setCustomUserClaims(userRecord.uid, customClaims);
    logger.info('Successfully stamped claims!');
    const r = userData.role || 'player';
    if (r !== 'player') {
      await db.collection('public_player_profiles')
          .doc(userRecord.uid)
          .delete()
          .catch(() => {});
    } else {
      try {
        await syncPublicPlayerProfile(userRecord.uid);
      } catch (e) {
        logger.error('syncUserClaims syncPublicPlayerProfile', e);
      }
    }
  } catch (error) {
    logger.error('Error stamping claims:', error);
  }

  return null;
});

/**
 * Onboarding: teams in one club (Firestore team reads are club-scoped).
 */
exports.listTeamsForClub = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const raw = request.data && request.data.clubId;
  const clubId = typeof raw === 'string' ? raw.trim() : '';
  if (!clubId) {
    throw new HttpsError('invalid-argument', 'clubId is required.');
  }
  const snap = await db.collection('teams')
      .where('clubId', '==', clubId)
      .limit(200)
      .get();
  const teams = snap.docs.map((d) => ({id: d.id, ...d.data()}));
  return {teams};
});

/**
 * super_admin only (client direct security_audit writes disabled in rules).
 */
exports.logSecurityAudit = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  if (request.auth.token.role !== 'super_admin') {
    throw new HttpsError(
        'permission-denied',
        'Only application admins may log security audits.',
    );
  }
  const data = request.data || {};
  const action =
      typeof data.action === 'string' ? data.action.slice(0, 120) : '';
  const target =
      typeof data.target === 'string' ? data.target.slice(0, 500) : '';
  const details =
      typeof data.details === 'string' ? data.details.slice(0, 2000) : '';
  if (!action) {
    throw new HttpsError('invalid-argument', 'action is required.');
  }
  await db.collection('security_audit').add({
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    admin: normEmail(request.auth.token.email) || 'unknown',
    action,
    target,
    details,
  });
  return {ok: true};
});

/**
 * super_admin: create a license record (client Firestore writes disabled).
 */
exports.generateLicense = onCall({region: REGION}, async (request) => {
  assertSuperAdmin(request);
  const data = request.data || {};
  const licenseTypeRaw =
      typeof data.licenseType === 'string' ? data.licenseType.trim() : '';
  const licenseType =
      licenseTypeRaw && licenseTypeRaw.length <= 64 ?
        licenseTypeRaw.slice(0, 64) :
        'subscription';
  let maxSeats = parseInt(data.maxSeats, 10);
  if (!Number.isFinite(maxSeats) || maxSeats < 1) maxSeats = 10;
  maxSeats = Math.min(Math.floor(maxSeats), 100000);
  let durationMonths = parseInt(data.durationMonths, 10);
  if (!Number.isFinite(durationMonths) || durationMonths < 1) {
    durationMonths = 12;
  }
  durationMonths = Math.min(Math.floor(durationMonths), 120);
  const clubId =
      typeof data.clubId === 'string' ? data.clubId.trim().slice(0, 128) : '';

  const basePayload = (licenseKey) => ({
    licenseKey,
    licenseType,
    maxSeats,
    durationMonths,
    clubId: clubId || null,
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: normEmail(request.auth.token.email) || 'unknown',
  });

  let licenseKey = '';
  for (let attempt = 0; attempt < 16; attempt++) {
    licenseKey = generateLicenseKeyString();
    const ref = db.collection('licenses').doc(licenseKey);
    try {
      await ref.create(basePayload(licenseKey));
      if (clubId) {
        try {
          const entRef = db.collection('license_entitlements').doc(clubId);
          const adminEmail = normEmail(request.auth.token.email) || 'unknown';
          await db.runTransaction(async (t) => {
            const snap = await t.get(entRef);
            const cur =
                snap.exists &&
                typeof snap.data().seats_limit === 'number' &&
                !Number.isNaN(snap.data().seats_limit) ?
                  snap.data().seats_limit :
                  0;
            const active =
                snap.exists &&
                typeof snap.data().active_seats === 'number' &&
                !Number.isNaN(snap.data().active_seats) ?
                  snap.data().active_seats :
                  0;
            const reserved =
                snap.exists &&
                typeof snap.data().reserved_seats === 'number' &&
                !Number.isNaN(snap.data().reserved_seats) ?
                  snap.data().reserved_seats :
                  0;
            t.set(
                entRef,
                {
                  schemaVersion: 1,
                  clubId,
                  seats_limit: cur + maxSeats,
                  active_seats: active,
                  reserved_seats: reserved,
                  seatDefinition: 'players_in_club',
                  lastReconciledAt: null,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  updatedBy: adminEmail,
                },
                {merge: true},
            );
          });
        } catch (entErr) {
          logger.error('generateLicense entitlement upsert failed', entErr);
          throw new HttpsError(
              'internal',
              'License key was created but seat entitlement sync failed. ' +
              'Contact support.',
          );
        }
      }
      return {ok: true, licenseKey};
    } catch (err) {
      if (isAlreadyExistsError(err)) continue;
      logger.error('generateLicense create failed', err);
      const detail =
          err && err.message ?
            String(err.message) :
            'Could not create license.';
      throw new HttpsError('internal', detail);
    }
  }
  throw new HttpsError('internal', 'Could not allocate a unique license key.');
});

/**
 * Epic Phoenix: director persists club accent colors
 * (Admin SDK; clients cannot write clubs/).
 */
exports.directorSaveClubBranding = onCall({region: REGION}, async (request) => {
  const data = request.data || {};
  const clubId =
      typeof data.clubId === 'string' ? data.clubId.trim().slice(0, 128) : '';
  const primaryHex =
      typeof data.brandPrimaryHex === 'string' ?
        data.brandPrimaryHex.trim() :
        '';
  const accentHex =
      typeof data.brandAccentHex === 'string' ?
        data.brandAccentHex.trim() :
        '';
  const logoUrl = typeof data.logoUrl === 'string' ?
    data.logoUrl.trim().slice(0, 2000) :
    '';

  if (!clubId) {
    throw new HttpsError('invalid-argument', 'clubId is required.');
  }
  const hexOk = (h) => /^#[0-9A-Fa-f]{6}$/.test(h);
  if (!hexOk(primaryHex) || !hexOk(accentHex)) {
    throw new HttpsError(
        'invalid-argument',
        'brandPrimaryHex and brandAccentHex must be #RRGGBB.',
    );
  }

  if (logoUrl && !isTrustedFirebaseStorageLogoUrl(logoUrl)) {
    throw new HttpsError(
        'invalid-argument',
        'logoUrl must be a Firebase Storage download URL.',
    );
  }

  const actor = assertClubStaffOrSuper(request, clubId);
  const by = normEmail(actor.email) || 'unknown';

  const payload = {
    brandPrimaryHex: primaryHex,
    brandAccentHex: accentHex,
    brandingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    brandingUpdatedBy: by,
  };
  if (logoUrl) {
    payload.brandLogoUrl = logoUrl;
  }

  await db.collection('clubs').doc(clubId).set(payload, {merge: true});
  return {ok: true};
});

/**
 * Reserve one licensed seat + create pending coach invite (atomic).
 * Does not touch active_seats until claimCoachInvite.
 */
exports.directorInviteCoach = onCall({region: REGION}, async (request) => {
  const data = request.data || {};
  const teamId =
      typeof data.teamId === 'string' ? data.teamId.trim().slice(0, 200) : '';
  const coachEmailRaw =
      typeof data.coachEmail === 'string' ? data.coachEmail.trim() : '';
  const coachEmail = normEmail(coachEmailRaw.slice(0, 320));
  if (!teamId || !coachEmail || !coachEmail.includes('@')) {
    throw new HttpsError(
        'invalid-argument',
        'teamId and a valid coachEmail are required.',
    );
  }

  const teamRef = db.collection('teams').doc(teamId);
  const teamSnap = await teamRef.get();
  if (!teamSnap.exists) {
    throw new HttpsError('not-found', 'Team not found.');
  }
  const clubId =
      typeof teamSnap.data().clubId === 'string' ?
        teamSnap.data().clubId.trim() :
        '';
  if (!clubId) {
    throw new HttpsError('failed-precondition', 'Team has no clubId.');
  }

  assertDirectorClubOrSuper(request, clubId);
  await assertClubSubscriptionWritable(clubId, request);

  const entRef = db.collection('license_entitlements').doc(clubId);
  const inviteId = coachInviteDocId(clubId, teamId, coachEmail);
  const inviteRef = db.collection('coach_invites').doc(inviteId);

  const existingUser = await db.collection('users').doc(coachEmail).get();
  if (existingUser.exists) {
    const r = existingUser.data().role;
    if (r === 'coach' && existingUser.data().teamId === teamId) {
      throw new HttpsError(
          'already-exists',
          'This coach is already assigned to this team.',
      );
    }
  }

  const result = await db.runTransaction(async (transaction) => {
    const entSnap = await transaction.get(entRef);
    if (!entSnap.exists) {
      return {kind: 'no_entitlement'};
    }
    const ent = entSnap.data() || {};
    const seatsLimit =
        typeof ent.seats_limit === 'number' && !Number.isNaN(ent.seats_limit) ?
          ent.seats_limit :
          0;
    const activeSeats =
        typeof ent.active_seats === 'number' &&
        !Number.isNaN(ent.active_seats) ?
          ent.active_seats :
          0;
    const reservedSeats =
        typeof ent.reserved_seats === 'number' &&
        !Number.isNaN(ent.reserved_seats) ?
          ent.reserved_seats :
          0;

    if (activeSeats + reservedSeats >= seatsLimit) {
      return {kind: 'full'};
    }

    const inviteSnap = await transaction.get(inviteRef);
    if (inviteSnap.exists) {
      const st = inviteSnap.data().status;
      if (st === 'pending') {
        return {kind: 'duplicate_invite'};
      }
    }

    transaction.set(entRef, {
      reserved_seats: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: 'system:directorInviteCoach',
    }, {merge: true});

    transaction.set(inviteRef, {
      clubId,
      teamId,
      coachEmail,
      status: 'pending',
      kind: 'coach',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: normEmail(request.auth.token.email) || 'unknown',
    });

    return {kind: 'ok'};
  });

  if (result.kind === 'no_entitlement') {
    throw new HttpsError(
        'failed-precondition',
        'Club license is not configured yet.',
    );
  }
  if (result.kind === 'full') {
    throw new HttpsError(
        'resource-exhausted',
        'No licensed seats available for pending invites. Upgrade or wait ' +
        'for invites to expire.',
    );
  }
  if (result.kind === 'duplicate_invite') {
    throw new HttpsError(
        'already-exists',
        'A pending invite already exists for this coach and team.',
    );
  }
  return {ok: true, inviteId};
});

/**
 * Coach accepts oldest pending invite â€” moves one seat from reserved to active.
 */
exports.claimCoachInvite = onCall({region: REGION}, async (request) => {
  if (!request.auth || !request.auth.token.email) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const email = normEmail(request.auth.token.email);
  if (!email) {
    throw new HttpsError('invalid-argument', 'Authenticated email missing.');
  }

  const pendingSnap = await db.collection('coach_invites')
      .where('coachEmail', '==', email)
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'asc')
      .limit(1)
      .get();

  if (pendingSnap.empty) {
    return {ok: true, claimed: false};
  }

  const inviteDoc = pendingSnap.docs[0];
  const inv = inviteDoc.data();
  const clubId = typeof inv.clubId === 'string' ? inv.clubId : '';
  const teamId = typeof inv.teamId === 'string' ? inv.teamId : '';
  if (!clubId || !teamId) {
    logger.error('claimCoachInvite: malformed invite', inviteDoc.id);
    throw new HttpsError('internal', 'Invite data is invalid.');
  }

  const entRef = db.collection('license_entitlements').doc(clubId);
  const teamRef = db.collection('teams').doc(teamId);
  const userRef = db.collection('users').doc(email);
  const lookupRef = db.collection('coach_lookup').doc(email);

  const out = await db.runTransaction(async (transaction) => {
    const inviteSnap = await transaction.get(inviteDoc.ref);
    if (!inviteSnap.exists || inviteSnap.data().status !== 'pending') {
      return {kind: 'stale'};
    }
    const userSnap = await transaction.get(userRef);
    if (userSnap.exists) {
      const role = userSnap.data().role;
      if (role === 'coach' && userSnap.data().teamId === teamId) {
        transaction.update(inviteSnap.ref, {
          status: 'accepted',
          acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
          note: 'reconciled_existing_coach',
        });
        transaction.update(entRef, {
          reserved_seats: admin.firestore.FieldValue.increment(-1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: 'system:claimCoachInvite_reconcile',
        });
        return {kind: 'already_coach'};
      }
      if (role && role !== 'player') {
        return {kind: 'role_conflict'};
      }
    }

    const entSnap = await transaction.get(entRef);
    const reserved =
        entSnap.exists &&
        typeof entSnap.data().reserved_seats === 'number' &&
        !Number.isNaN(entSnap.data().reserved_seats) ?
          entSnap.data().reserved_seats :
          0;
    if (reserved < 1) {
      return {kind: 'no_reserved'};
    }

    transaction.update(entRef, {
      reserved_seats: admin.firestore.FieldValue.increment(-1),
      active_seats: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: 'system:claimCoachInvite',
    });

    transaction.update(inviteSnap.ref, {
      status: 'accepted',
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    transaction.set(userRef, {
      email,
      teamId,
      clubId,
      role: 'coach',
      coachInviteAcceptedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});

    transaction.set(lookupRef, {
      teamId,
      clubId,
      role: 'coach',
    }, {merge: true});

    transaction.set(teamRef, {
      coachEmail: email,
      coachAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});

    return {kind: 'ok'};
  });

  if (out.kind === 'role_conflict') {
    throw new HttpsError(
        'failed-precondition',
        'Your account already has a non-player role. Contact support.',
    );
  }
  if (out.kind === 'no_reserved') {
    throw new HttpsError(
        'failed-precondition',
        'Seat reservation out of sync. Ask your director to resend an invite.',
    );
  }
  if (out.kind === 'stale') {
    return {ok: true, claimed: false};
  }
  if (out.kind === 'already_coach') {
    return {ok: true, claimed: true, teamId, reconciled: true};
  }
  if (out.kind === 'ok') {
    return {ok: true, claimed: true, teamId};
  }
  return {ok: true, claimed: false};
});

/**
 * @param {admin.firestore.Timestamp} aStart
 * @param {admin.firestore.Timestamp} aEnd
 * @param {admin.firestore.Timestamp} bStart
 * @param {admin.firestore.Timestamp} bEnd
 * @return {boolean}
 */
function timeRangesOverlap(aStart, aEnd, bStart, bEnd) {
  return (
    aStart.toMillis() < bEnd.toMillis() && bStart.toMillis() < aEnd.toMillis()
  );
}

/**
 * Director / registrar / coach (own team) / super_admin â€” field metadata.
 */
exports.directorUpsertField = onCall({region: REGION}, async (request) => {
  const data = request.data || {};
  const fieldId =
      typeof data.fieldId === 'string' ? data.fieldId.trim().slice(0, 128) : '';
  const clubId =
      typeof data.clubId === 'string' ? data.clubId.trim().slice(0, 128) : '';
  const name =
      typeof data.name === 'string' ? data.name.trim().slice(0, 200) : '';
  const location =
      typeof data.location === 'string' ?
        data.location.trim().slice(0, 500) :
        '';
  const statusRaw =
      typeof data.status === 'string' ?
        data.status.trim().toLowerCase() :
        '';
  const status =
      statusRaw === 'maintenance' || statusRaw === 'closed' ?
        statusRaw :
        'active';

  if (!fieldId || !clubId || !name) {
    throw new HttpsError(
        'invalid-argument',
        'fieldId, clubId, and name are required.',
    );
  }

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const role = request.auth.token.role;
  const tokenClub = request.auth.token.clubId || null;
  if (role !== 'super_admin') {
    if (role !== 'director' && role !== 'registrar') {
      throw new HttpsError(
          'permission-denied',
          'Only club staff may manage fields.',
      );
    }
    if (!tokenClub || tokenClub !== clubId) {
      throw new HttpsError('permission-denied', 'Club mismatch.');
    }
  }

  await db.collection('fields').doc(fieldId).set(
      {
        clubId,
        name,
        location: location || '',
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: normEmail(request.auth.token.email) || 'unknown',
      },
      {merge: true},
  );
  return {ok: true};
});

/**
 * Atomic field schedule booking with same-day overlap check ("bouncer").
 */
exports.secureBookField = onCall({region: REGION}, async (request) => {
  const data = request.data || {};
  const fieldId =
      typeof data.fieldId === 'string' ? data.fieldId.trim().slice(0, 128) : '';
  const teamId =
      typeof data.teamId === 'string' ? data.teamId.trim().slice(0, 200) : '';
  const scheduleDate =
      typeof data.scheduleDate === 'string' ?
        data.scheduleDate.trim().slice(0, 12) :
        '';
  const startIso =
      typeof data.startTime === 'string' ? data.startTime.trim() : '';
  const endIso = typeof data.endTime === 'string' ? data.endTime.trim() : '';
  const activityRaw =
      typeof data.activityType === 'string' ?
        data.activityType.trim() :
        'Practice';
  const activityType =
      activityRaw.toLowerCase() === 'game' ? 'Game' : 'Practice';

  if (!fieldId || !teamId || !scheduleDate || !startIso || !endIso) {
    throw new HttpsError(
        'invalid-argument',
        'fieldId, teamId, scheduleDate, startTime, endTime are required.',
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduleDate)) {
    throw new HttpsError(
        'invalid-argument',
        'scheduleDate must be YYYY-MM-DD.',
    );
  }

  let startDate;
  let endDate;
  try {
    startDate = new Date(startIso);
    endDate = new Date(endIso);
  } catch (e) {
    throw new HttpsError('invalid-argument', 'Invalid start or end time.');
  }
  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    startDate.getTime() >= endDate.getTime()
  ) {
    throw new HttpsError(
        'invalid-argument',
        'endTime must be after startTime.',
    );
  }

  const startTs = admin.firestore.Timestamp.fromDate(startDate);
  const endTs = admin.firestore.Timestamp.fromDate(endDate);

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const fieldPre = await db.collection('fields').doc(fieldId).get();
  if (!fieldPre.exists) {
    throw new HttpsError('not-found', 'Field not found.');
  }
  const preClub =
      typeof fieldPre.data().clubId === 'string' ?
        fieldPre.data().clubId.trim() :
        '';
  if (!preClub) {
    throw new HttpsError('failed-precondition', 'Field has no clubId.');
  }
  await assertClubSubscriptionWritable(preClub, request);

  const role = request.auth.token.role;
  const tokenClub = request.auth.token.clubId || null;
  const tokenTeam = request.auth.token.teamId || null;

  const fieldRef = db.collection('fields').doc(fieldId);
  const teamRef = db.collection('teams').doc(teamId);

  const txnResult = await db.runTransaction(async (transaction) => {
    const fieldSnap = await transaction.get(fieldRef);
    if (!fieldSnap.exists) {
      return {kind: 'no_field'};
    }
    const fieldClub =
        typeof fieldSnap.data().clubId === 'string' ?
          fieldSnap.data().clubId.trim() :
          '';
    if (!fieldClub) {
      return {kind: 'bad_field'};
    }

    const teamSnap = await transaction.get(teamRef);
    if (!teamSnap.exists) {
      return {kind: 'no_team'};
    }
    const teamClub =
        typeof teamSnap.data().clubId === 'string' ?
          teamSnap.data().clubId.trim() :
          '';
    if (teamClub !== fieldClub) {
      return {kind: 'club_mismatch'};
    }

    if (role === 'super_admin') {
      // ok
    } else if (role === 'director' || role === 'registrar') {
      if (!tokenClub || tokenClub !== fieldClub) {
        return {kind: 'denied'};
      }
    } else if (role === 'coach') {
      if (!tokenClub || tokenClub !== fieldClub) {
        return {kind: 'denied'};
      }
      if (!tokenTeam || tokenTeam !== teamId) {
        return {kind: 'denied'};
      }
    } else {
      return {kind: 'denied'};
    }

    const q = fieldRef
        .collection('schedules')
        .where('scheduleDate', '==', scheduleDate);
    const existingSnap = await transaction.get(q);

    let conflictTeamId = '';
    for (const doc of existingSnap.docs) {
      const d = doc.data();
      const s = d.startTime;
      const e = d.endTime;
      if (!(s instanceof admin.firestore.Timestamp) ||
          !(e instanceof admin.firestore.Timestamp)) {
        continue;
      }
      if (timeRangesOverlap(startTs, endTs, s, e)) {
        conflictTeamId =
            typeof d.teamId === 'string' ? d.teamId : '';
        break;
      }
    }

    if (conflictTeamId) {
      return {kind: 'overlap', conflictTeamId};
    }

    const scheduleRef = fieldRef.collection('schedules').doc();
    transaction.set(scheduleRef, {
      teamId,
      clubId: fieldClub,
      scheduleDate,
      startTime: startTs,
      endTime: endTs,
      activityType,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: normEmail(request.auth.token.email) || 'unknown',
    });

    return {kind: 'ok', scheduleId: scheduleRef.id};
  });

  if (txnResult.kind === 'no_field') {
    throw new HttpsError('not-found', 'Field not found.');
  }
  if (txnResult.kind === 'bad_field') {
    throw new HttpsError('failed-precondition', 'Field has no clubId.');
  }
  if (txnResult.kind === 'no_team') {
    throw new HttpsError('not-found', 'Team not found.');
  }
  if (txnResult.kind === 'club_mismatch') {
    throw new HttpsError(
        'failed-precondition',
        'Team and field must belong to the same club.',
    );
  }
  if (txnResult.kind === 'denied') {
    throw new HttpsError(
        'permission-denied',
        'You cannot book this field for that team.',
    );
  }
  if (txnResult.kind === 'overlap') {
    const tid = txnResult.conflictTeamId || '';
    const nameSnap = await db.collection('teams').doc(tid).get();
    const teamName =
        nameSnap.exists &&
        typeof nameSnap.data().name === 'string' &&
        nameSnap.data().name.trim() ?
          nameSnap.data().name.trim() :
          tid || 'another team';
    throw new HttpsError(
        'failed-precondition',
        'Time slot conflicts with ' + teamName + '.',
    );
  }

  return {ok: true, scheduleId: txnResult.scheduleId};
});

/**
 * Scheduled: release reserved seats for coach invites older than 168 hours.
 */
exports.expireCoachInvites = onSchedule('every 60 minutes', async () => {
  const cutoffMs = Date.now() - 168 * 60 * 60 * 1000;
  const cutoff = admin.firestore.Timestamp.fromMillis(cutoffMs);
  const snap = await db.collection('coach_invites')
      .where('status', '==', 'pending')
      .where('createdAt', '<=', cutoff)
      .limit(400)
      .get();

  let released = 0;
  for (const doc of snap.docs) {
    try {
      await db.runTransaction(async (transaction) => {
        const invSnap = await transaction.get(doc.ref);
        if (!invSnap.exists || invSnap.data().status !== 'pending') {
          return;
        }
        const clubId = invSnap.data().clubId;
        if (typeof clubId !== 'string' || !clubId) {
          transaction.delete(doc.ref);
          return;
        }
        const entRef = db.collection('license_entitlements').doc(clubId);
        const entSnap = await transaction.get(entRef);
        const reserved =
                entSnap.exists &&
                typeof entSnap.data().reserved_seats === 'number' &&
                !Number.isNaN(entSnap.data().reserved_seats) ?
                  entSnap.data().reserved_seats :
                  0;
        if (reserved >= 1) {
          transaction.update(entRef, {
            reserved_seats: admin.firestore.FieldValue.increment(-1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: 'system:expireCoachInvites',
          });
        }
        transaction.delete(doc.ref);
      });
      released++;
    } catch (e) {
      logger.error('expireCoachInvites doc failed', doc.id, e);
    }
  }
  if (released > 0) {
    logger.info(`expireCoachInvites released ${released} pending invite(s).`);
  }

  await reconcileReservedSeatsWithoutPendingInvites();
});

/**
 * If no pending coach_invites exist for a club but reserved_seats leaked,
 * reset reserved_seats.
 */
async function reconcileReservedSeatsWithoutPendingInvites() {
  const snap = await db.collection('license_entitlements')
      .where('reserved_seats', '>', 0)
      .limit(200)
      .get();

  let fixed = 0;
  for (const entDoc of snap.docs) {
    const clubId = entDoc.id;
    const pending = await db.collection('coach_invites')
        .where('clubId', '==', clubId)
        .where('status', '==', 'pending')
        .limit(1)
        .get();
    if (pending.empty) {
      await db.collection('license_entitlements').doc(clubId).set(
          {
            reserved_seats: 0,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: 'system:reconcileReservedSeats',
          },
          {merge: true},
      );
      fixed++;
    }
  }
  if (fixed > 0) {
    logger.info(
        `reconcileReservedSeatsWithoutPendingInvites: reset ${fixed} club(s).`,
    );
  }
}

/**
 * Director / super_admin: set per-team seat cap. Sum of all team caps for the
 * club must not exceed license_entitlements/{clubId}.seats_limit.
 */
exports.secureAllocateTeamSeats = onCall({region: REGION}, async (request) => {
  const actor = assertDirectorOrSuper(request);
  const data = request.data || {};
  const teamId =
      typeof data.teamId === 'string' ? data.teamId.trim().slice(0, 200) : '';
  let seatsLimit = data.seatsLimit;
  if (typeof seatsLimit === 'string') {
    seatsLimit = parseInt(seatsLimit, 10);
  }
  if (!teamId || !Number.isFinite(seatsLimit) || seatsLimit < 1) {
    throw new HttpsError(
        'invalid-argument',
        'teamId and a positive integer seatsLimit are required.',
    );
  }
  seatsLimit = Math.floor(seatsLimit);

  const teamSnap = await db.collection('teams').doc(teamId).get();
  if (!teamSnap.exists) {
    throw new HttpsError('not-found', 'Team not found.');
  }
  const clubId =
      typeof teamSnap.data().clubId === 'string' ?
        teamSnap.data().clubId.trim() :
        '';
  if (!clubId) {
    throw new HttpsError('failed-precondition', 'Team has no club scope.');
  }
  if (actor.role === 'director') {
    if (!actor.clubId || actor.clubId !== clubId) {
      throw new HttpsError('permission-denied', 'Out of club scope.');
    }
  }

  await assertClubSubscriptionWritable(clubId, request);

  const rosterRef = db.collection('rosters').doc(teamId);
  const masterRef = db.collection('license_entitlements').doc(clubId);
  const teamEntRef = db.collection('team_entitlements').doc(teamId);
  const teamsQuery = db.collection('teams').where('clubId', '==', clubId);

  await db.runTransaction(async (transaction) => {
    const [rosterSnap, masterSnap, teamsSnap] = await Promise.all([
      transaction.get(rosterRef),
      transaction.get(masterRef),
      transaction.get(teamsQuery),
    ]);

    if (!masterSnap.exists) {
      throw new HttpsError(
          'failed-precondition',
          'Club license is not configured yet. ' +
          'Contact your platform administrator.',
      );
    }
    const master = masterSnap.data() || {};
    const masterLimit =
        typeof master.seats_limit === 'number' &&
        !Number.isNaN(master.seats_limit) ?
          master.seats_limit :
          0;

    const list = rosterSnap.exists && Array.isArray(rosterSnap.data().players) ?
      rosterSnap.data().players :
      [];
    const activeCount = list.length;

    if (seatsLimit < activeCount) {
      throw new HttpsError(
          'invalid-argument',
          `seatsLimit must be at least current roster size (${activeCount}).`,
      );
    }

    let sumOthers = 0;
    for (const td of teamsSnap.docs) {
      if (td.id === teamId) continue;
      const oSnap = await transaction.get(
          db.collection('team_entitlements').doc(td.id),
      );
      if (oSnap.exists) {
        const sl = oSnap.data().seats_limit;
        if (typeof sl === 'number' && !Number.isNaN(sl)) sumOthers += sl;
      }
    }

    if (sumOthers + seatsLimit > masterLimit) {
      throw new HttpsError(
          'failed-precondition',
          'Team allocations exceed the club master license limit. ' +
          'Lower other team caps or upgrade the club license.',
      );
    }

    transaction.set(
        teamEntRef,
        {
          clubId,
          teamId,
          seats_limit: seatsLimit,
          active_seats: activeCount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: 'system:secureAllocateTeamSeats',
        },
        {merge: true},
    );
  });

  return {ok: true, teamId, seatsLimit};
});

/**
 * Atomic roster add with license_entitlements seat check
 * (no direct client writes).
 */
exports.secureAddPlayer = onCall({region: REGION}, async (request) => {
  const data = request.data || {};
  const teamId =
      typeof data.teamId === 'string' ? data.teamId.trim().slice(0, 200) : '';
  let playerName =
      typeof data.playerName === 'string' ? data.playerName.trim() : '';
  playerName = playerName.replace(/\s+/g, ' ');
  if (!playerName || playerName.length > 200) {
    throw new HttpsError(
        'invalid-argument',
        'playerName is required (1â€“200 characters).',
    );
  }

  let playerEmail = '';
  if (typeof data.playerEmail === 'string' && data.playerEmail.trim()) {
    playerEmail = normEmail(data.playerEmail.trim().slice(0, 320));
    if (!playerEmail || !playerEmail.includes('@')) {
      throw new HttpsError(
          'invalid-argument',
          'playerEmail must be a valid email when provided.',
      );
    }
  }

  let jersey = '';
  if (typeof data.jersey === 'string' && data.jersey.trim()) {
    jersey = data.jersey.trim().slice(0, 16);
  }

  const {clubId} = await assertCanSecureAddPlayer(request, teamId);
  await assertClubSubscriptionWritable(clubId, request);

  const rosterRef = db.collection('rosters').doc(teamId);
  const entRef = db.collection('license_entitlements').doc(clubId);
  const teamEntRef = db.collection('team_entitlements').doc(teamId);
  const lookupRef = playerEmail ?
    db.collection('player_lookup').doc(playerEmail) :
    null;

  const txnResult = await db.runTransaction(async (transaction) => {
    const rosterSnap = await transaction.get(rosterRef);
    const list = rosterSnap.exists ?
      (Array.isArray(rosterSnap.data().players) ?
        rosterSnap.data().players :
        []) :
      [];
    if (list.includes(playerName)) {
      return {kind: 'duplicate'};
    }

    if (lookupRef) {
      const lkSnap = await transaction.get(lookupRef);
      if (lkSnap.exists) {
        const existingTid = lkSnap.data().teamId;
        if (existingTid && existingTid !== teamId) {
          return {kind: 'email_in_use'};
        }
      }
    }

    const teamEntSnap = await transaction.get(teamEntRef);
    if (teamEntSnap.exists) {
      const td = teamEntSnap.data() || {};
      const teClub =
          typeof td.clubId === 'string' ? td.clubId.trim() : '';
      if (teClub && teClub !== clubId) {
        return {kind: 'no_entitlement'};
      }
      const tLimit =
          typeof td.seats_limit === 'number' &&
          !Number.isNaN(td.seats_limit) ?
            td.seats_limit :
            0;
      const tActive =
          typeof td.active_seats === 'number' &&
          !Number.isNaN(td.active_seats) ?
            td.active_seats :
            0;
      if (tActive >= tLimit) {
        return {kind: 'team_full'};
      }
    }

    const entSnap = await transaction.get(entRef);
    if (!entSnap.exists) {
      return {kind: 'no_entitlement'};
    }
    const ent = entSnap.data() || {};
    const seatsLimit =
        typeof ent.seats_limit === 'number' && !Number.isNaN(ent.seats_limit) ?
          ent.seats_limit :
          0;
    const activeSeats =
        typeof ent.active_seats === 'number' &&
        !Number.isNaN(ent.active_seats) ?
          ent.active_seats :
          0;
    const reservedSeats =
        typeof ent.reserved_seats === 'number' &&
        !Number.isNaN(ent.reserved_seats) ?
          ent.reserved_seats :
          0;
    if (activeSeats + reservedSeats >= seatsLimit) {
      return {kind: 'full'};
    }

    const jerseys =
        rosterSnap.exists &&
        rosterSnap.data().jerseys &&
        typeof rosterSnap.data().jerseys === 'object' ?
          {...rosterSnap.data().jerseys} :
          {};
    if (jersey) {
      jerseys[playerName] = jersey;
    }

    const newPlayers = [...list, playerName];

    if (teamEntSnap.exists) {
      transaction.update(teamEntRef, {
        active_seats: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'system:secureAddPlayer',
      });
    }

    transaction.update(entRef, {
      active_seats: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: 'system:secureAddPlayer',
    });
    transaction.set(
        rosterRef,
        {players: newPlayers, jerseys},
        {merge: true},
    );
    if (lookupRef) {
      transaction.set(
          lookupRef,
          {
            teamId,
            playerName,
            clubId,
          },
          {merge: true},
      );
    }
    return {kind: 'ok'};
  });

  if (txnResult.kind === 'duplicate') {
    return {ok: true, duplicate: true};
  }
  if (txnResult.kind === 'email_in_use') {
    throw new HttpsError(
        'already-exists',
        'That email is already linked to a player on another team.',
    );
  }
  if (txnResult.kind === 'no_entitlement') {
    throw new HttpsError(
        'failed-precondition',
        'Club license is not configured yet. ' +
        'Contact your platform administrator.',
    );
  }
  if (txnResult.kind === 'team_full') {
    throw new HttpsError('failed-precondition', 'team-full');
  }
  if (txnResult.kind === 'full') {
    throw new HttpsError(
        'resource-exhausted',
        'Licensed roster seats are fully allocated. ' +
        'Contact your Director to upgrade.',
    );
  }
  return {ok: true};
});

/**
 * Atomic roster remove + license_entitlements seat release + player_lookup
 * cleanup (Admin SDK only).
 */
exports.secureRemovePlayer = onCall({region: REGION}, async (request) => {
  const data = request.data || {};
  const teamId =
      typeof data.teamId === 'string' ? data.teamId.trim().slice(0, 200) : '';
  let playerName =
      typeof data.playerName === 'string' ? data.playerName.trim() : '';
  playerName = playerName.replace(/\s+/g, ' ');
  if (!playerName || playerName.length > 200) {
    throw new HttpsError(
        'invalid-argument',
        'playerName is required (1â€“200 characters).',
    );
  }

  const {clubId} = await assertCanSecureAddPlayer(request, teamId);

  const rosterRef = db.collection('rosters').doc(teamId);
  const entRef = db.collection('license_entitlements').doc(clubId);
  const teamEntRef = db.collection('team_entitlements').doc(teamId);
  const lookupQuery = db.collection('player_lookup')
      .where('teamId', '==', teamId)
      .where('playerName', '==', playerName)
      .limit(10);

  const txnResult = await db.runTransaction(async (transaction) => {
    const rosterSnap = await transaction.get(rosterRef);
    const list = rosterSnap.exists ?
      (Array.isArray(rosterSnap.data().players) ?
        rosterSnap.data().players :
        []) :
      [];
    if (!list.includes(playerName)) {
      return {kind: 'not_found'};
    }

    const entSnap = await transaction.get(entRef);
    const teamEntSnap = await transaction.get(teamEntRef);
    const lookupSnap = await transaction.get(lookupQuery);

    const jerseys =
        rosterSnap.exists &&
        rosterSnap.data().jerseys &&
        typeof rosterSnap.data().jerseys === 'object' ?
          {...rosterSnap.data().jerseys} :
          {};
    if (Object.prototype.hasOwnProperty.call(jerseys, playerName)) {
      delete jerseys[playerName];
    }

    const newPlayers = list.filter((p) => p !== playerName);

    transaction.set(
        rosterRef,
        {players: newPlayers, jerseys},
        {merge: true},
    );

    lookupSnap.forEach((d) => transaction.delete(d.ref));

    if (entSnap.exists) {
      const ent = entSnap.data() || {};
      const activeSeats =
          typeof ent.active_seats === 'number' &&
          !Number.isNaN(ent.active_seats) ?
            ent.active_seats :
            0;
      const newActive = Math.max(0, activeSeats - 1);
      transaction.update(entRef, {
        active_seats: newActive,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'system:secureRemovePlayer',
      });
    }

    if (teamEntSnap.exists) {
      const td = teamEntSnap.data() || {};
      const teClub =
          typeof td.clubId === 'string' ? td.clubId.trim() : '';
      if (!teClub || teClub === clubId) {
        const a =
            typeof td.active_seats === 'number' &&
            !Number.isNaN(td.active_seats) ?
              td.active_seats :
              0;
        const newTA = Math.max(0, a - 1);
        transaction.update(teamEntRef, {
          active_seats: newTA,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: 'system:secureRemovePlayer',
        });
      }
    }

    return {kind: 'ok'};
  });

  if (txnResult.kind === 'not_found') {
    return {ok: true, notFound: true};
  }
  return {ok: true};
});

/**
 * Jersey number updates on rosters/{teamId} (no license seat change).
 */
exports.secureUpdateJersey = onCall({region: REGION}, async (request) => {
  const data = request.data || {};
  const teamId =
      typeof data.teamId === 'string' ? data.teamId.trim().slice(0, 200) : '';
  let playerName =
      typeof data.playerName === 'string' ? data.playerName.trim() : '';
  playerName = playerName.replace(/\s+/g, ' ');
  if (!teamId || !playerName || playerName.length > 200) {
    throw new HttpsError(
        'invalid-argument',
        'teamId and playerName are required.',
    );
  }

  let jersey = '';
  if (typeof data.jersey === 'string' && data.jersey.trim()) {
    jersey = data.jersey.trim().slice(0, 16);
  }

  await assertCanSecureAddPlayer(request, teamId);

  const rosterRef = db.collection('rosters').doc(teamId);

  const txnResult = await db.runTransaction(async (transaction) => {
    const rosterSnap = await transaction.get(rosterRef);
    const list = rosterSnap.exists ?
      (Array.isArray(rosterSnap.data().players) ?
        rosterSnap.data().players :
        []) :
      [];
    if (!list.includes(playerName)) {
      return {kind: 'not_found'};
    }

    const jerseys =
        rosterSnap.exists &&
        rosterSnap.data().jerseys &&
        typeof rosterSnap.data().jerseys === 'object' ?
          {...rosterSnap.data().jerseys} :
          {};
    if (jersey) {
      jerseys[playerName] = jersey;
    } else if (Object.prototype.hasOwnProperty.call(jerseys, playerName)) {
      delete jerseys[playerName];
    }

    transaction.set(rosterRef, {jerseys}, {merge: true});
    return {kind: 'ok'};
  });

  if (txnResult.kind === 'not_found') {
    return {ok: true, notFound: true};
  }
  return {ok: true};
});

/**
 * Coach / director: batch FieldValue increments for match-day telemetry.
 * Server-side only (client cannot write player_stats or foreign users/*).
 * Updates player_stats/{playerKey} and mirrors into users/{emailKey}.stats.
 */
exports.commitMatchTelemetry = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const data = request.data || {};
  const teamId =
      typeof data.teamId === 'string' ? data.teamId.trim().slice(0, 200) : '';
  const rows = Array.isArray(data.rows) ? data.rows : [];
  if (!teamId) {
    throw new HttpsError('invalid-argument', 'teamId is required.');
  }
  if (rows.length === 0) {
    throw new HttpsError('invalid-argument', 'No stat rows to commit.');
  }
  if (rows.length > 50) {
    throw new HttpsError(
        'invalid-argument',
        'Too many players in one commit (max 50).',
    );
  }

  await assertCanSecureAddPlayer(request, teamId);

  /**
   * @param {unknown} v
   * @param {number} max
   * @return {number}
   */
  const clamp = (v, max) => {
    const n = parseInt(String(v), 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(n, max);
  };

  const inc = admin.firestore.FieldValue.increment;
  const now = admin.firestore.FieldValue.serverTimestamp();

  const [rosterSnap, usersSnap] = await Promise.all([
    db.collection('rosters').doc(teamId).get(),
    db.collection('users').where('teamId', '==', teamId).get(),
  ]);
  const rosterNames = rosterSnap.exists && Array.isArray(rosterSnap.data().players) ?
    rosterSnap.data().players :
    [];
  const rosterSet = new Set(
      rosterNames
          .map((n) => (typeof n === 'string' ? n.trim() : String(n)))
          .filter(Boolean),
  );
  const nameToUid = {};
  usersSnap.forEach((d) => {
    const dd = d.data() || {};
    const pn =
        typeof dd.playerName === 'string' ? dd.playerName.trim() : '';
    if (pn) nameToUid[pn] = d.id;
  });

  /** @type {Map<string, { g: number, a: number, sh: number, sv: number }>} */
  const ag = new Map();
  for (const row of rows) {
    const playerKey =
        typeof row.playerKey === 'string' ? row.playerKey.trim() : '';
    if (!playerKey) continue;
    const goals = clamp(row.goals, 30);
    const assists = clamp(row.assists, 30);
    const shots = clamp(row.shots, 100);
    const saves = clamp(row.saves, 100);
    if (goals + assists + shots + saves === 0) continue;
    const prev = ag.get(playerKey) || {g: 0, a: 0, sh: 0, sv: 0};
    ag.set(playerKey, {
      g: prev.g + goals,
      a: prev.a + assists,
      sh: prev.sh + shots,
      sv: prev.sv + saves,
    });
  }
  if (ag.size === 0) {
    throw new HttpsError('invalid-argument', 'All stat deltas are zero or invalid.');
  }

  const psKeys = Array.from(ag.keys());
  /** @type {FirebaseFirestore.DocumentReference[]} */
  const psRefs = [];
  for (const k of psKeys) {
    let pid = nameToUid[k] || k;
    if (typeof pid === 'string' && pid.includes('@')) {
      try {
        pid = (await admin.auth().getUserByEmail(normEmail(pid))).uid;
      } catch (_e) {
        /* leave pid â€” may be roster-only key */
      }
    }
    psRefs.push(db.collection('player_stats').doc(pid));
  }
  const psSnaps = await Promise.all(psRefs.map((r) => r.get()));

  for (let i = 0; i < psKeys.length; i++) {
    const k = psKeys[i];
    const psSnap = psSnaps[i];
    if (psSnap.exists) {
      const tid = psSnap.data().teamId;
      if (tid !== teamId) {
        throw new HttpsError(
            'permission-denied',
            'A player is not on this team.',
        );
      }
    } else {
      if (!rosterSet.has(k)) {
        throw new HttpsError(
            'failed-precondition',
            `Not on active roster: ${k}`,
        );
      }
    }
  }

  const userMirrorOps = [];
  for (let i = 0; i < psKeys.length; i++) {
    const playerKey = psKeys[i];
    const psSnap = psSnaps[i];
    const displayName =
        psSnap.exists &&
        typeof psSnap.data().playerName === 'string' &&
        psSnap.data().playerName.trim() ?
          psSnap.data().playerName.trim() :
          playerKey;
    const em = nameToUid[displayName] || nameToUid[playerKey] || null;
    const d = ag.get(playerKey) || {g: 0, a: 0, sh: 0, sv: 0};
    if (em) {
      userMirrorOps.push({em, d});
    }
  }
  const uRefs = userMirrorOps.map((o) => db.collection('users').doc(o.em));
  const uSnaps = uRefs.length ? await Promise.all(uRefs.map((r) => r.get())) : [];

  const batch = db.batch();
  let writes = 0;
  for (let i = 0; i < psKeys.length; i++) {
    const playerKey = psKeys[i];
    const d = ag.get(playerKey) || {g: 0, a: 0, sh: 0, sv: 0};
    const psRef = psRefs[i];
    const psSnap = psSnaps[i];
    const displayName =
        psSnap.exists &&
        typeof psSnap.data().playerName === 'string' &&
        psSnap.data().playerName.trim() ?
          psSnap.data().playerName.trim() :
          playerKey;

    const matchXp = computeMatchTelemetryParlayXp(d);
    const prevPsXp =
        psSnap.exists &&
        typeof psSnap.data().total_xp === 'number' &&
        !Number.isNaN(psSnap.data().total_xp) ?
          Math.floor(psSnap.data().total_xp) :
          0;
    const nextPsLevel = trainingLevelFromTotalXp(prevPsXp + matchXp).level;

    batch.set(
        psRef,
        {
          teamId,
          playerName: displayName,
          goals: inc(d.g),
          assists: inc(d.a),
          shots: inc(d.sh),
          saves: inc(d.sv),
          total_xp: inc(matchXp),
          current_level: nextPsLevel,
          updatedAt: now,
        },
        {merge: true},
    );
    writes++;
  }
  for (let i = 0; i < userMirrorOps.length; i++) {
    if (!uSnaps[i] || !uSnaps[i].exists) {
      continue;
    }
    const {em, d} = userMirrorOps[i];
    const matchXpU = computeMatchTelemetryParlayXp(d);
    const ud = uSnaps[i].data() || {};
    const rawUx =
        typeof ud.totalXp === 'number' && !Number.isNaN(ud.totalXp) ?
          ud.totalXp :
          typeof ud.xp === 'number' && !Number.isNaN(ud.xp) ?
            ud.xp :
            0;
    const prevUx = Math.max(0, Math.floor(Number(rawUx) || 0));
    const nextUserLevel = trainingLevelFromTotalXp(prevUx + matchXpU).level;

    batch.set(
        db.collection('users').doc(em),
        {
          'stats.goals': inc(d.g),
          'stats.assists': inc(d.a),
          'stats.shots': inc(d.sh),
          'stats.saves': inc(d.sv),
          totalXp: inc(matchXpU),
          xp: inc(matchXpU),
          trainingLevel: nextUserLevel,
          updatedAt: now,
        },
        {merge: true},
    );
    writes++;
  }

  if (writes > 500) {
    throw new HttpsError('failed-precondition', 'Batch too large; try fewer players.');
  }
  await batch.commit();
  return {ok: true, players: ag.size, writes};
});

/** super_admin: create sport module (no client writes). */
exports.createSportModule = onCall({region: REGION}, async (request) => {
  assertSuperAdmin(request);
  const data = request.data || {};
  const sportName =
      typeof data.sportName === 'string' ? data.sportName.trim() : '';
  if (!sportName || sportName.length > 120) {
    throw new HttpsError(
        'invalid-argument',
        'sportName is required (1â€“120 characters).',
    );
  }
  const defaultIcon =
      typeof data.defaultIcon === 'string' && data.defaultIcon.trim() ?
        data.defaultIcon.trim().slice(0, 64) :
        'ph-soccer-ball';
  let courtType =
      typeof data.courtType === 'string' && data.courtType.trim() ?
        data.courtType.trim().slice(0, 64) :
        sportName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
            .slice(0, 64);
  if (!courtType) courtType = 'generic';

  const slug = sportName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80);
  const sportId = slug || `sport_${crypto.randomInt(0, 1e9)}`;

  const ref = db.collection('sports').doc(sportId);
  const existing = await ref.get();
  if (existing.exists) {
    throw new HttpsError(
        'already-exists',
        'A sport module with this id already exists. Pick a different name.',
    );
  }

  await ref.set({
    sportName,
    defaultIcon,
    courtType,
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: normEmail(request.auth.token.email) || 'unknown',
  });

  return {ok: true, sportId};
});

/**
 * Director / super_admin: merge household; stamp householdId on users.
 * Users must exist and share one club (director scoped to token club).
 */
exports.linkHousehold = onCall({region: REGION}, async (request) => {
  const actor = assertDirectorOrSuper(request);
  const data = request.data || {};
  const parentRaw = Array.isArray(data.parentEmails) ? data.parentEmails : [];
  const playerRaw = Array.isArray(data.playerEmails) ? data.playerEmails : [];
  const existingHouseholdId =
    typeof data.householdId === 'string' ? data.householdId.trim() : '';
  const payloadClubId =
      typeof data.clubId === 'string' ? data.clubId.trim() : '';

  const parents = [...new Set(parentRaw.map(normEmail).filter(Boolean))];
  const players = [...new Set(playerRaw.map(normEmail).filter(Boolean))];

  if (parents.length < 1 || players.length < 1) {
    throw new HttpsError(
        'invalid-argument',
        'Provide at least one parent email and one player (minor) email.',
    );
  }

  const allEmails = [...new Set([...parents, ...players])];
  /** @type {Map<string, Record<string, unknown>>} */
  const userMap = new Map();

  for (const em of allEmails) {
    const snap = await db.collection('users').doc(em).get();
    if (!snap.exists) {
      throw new HttpsError(
          'not-found',
          'User profile not found for ' + em +
          '. Accounts must exist before linking.',
      );
    }
    userMap.set(em, snap.data());
  }

  const clubIds = [...new Set(
      allEmails.map((e) => userMap.get(e).clubId).filter(Boolean),
  )];
  if (clubIds.length !== 1) {
    throw new HttpsError(
        'failed-precondition',
        'All users must belong to exactly one club.',
    );
  }
  const effectiveClubId = clubIds[0];

  if (actor.role === 'director') {
    if (!actor.clubId || actor.clubId !== effectiveClubId) {
      throw new HttpsError(
          'permission-denied',
          'You can only link households within your club.',
      );
    }
  } else if (payloadClubId && payloadClubId !== effectiveClubId) {
    throw new HttpsError(
        'invalid-argument',
        'clubId does not match the users club.',
    );
  }

  let householdId = existingHouseholdId;
  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  if (householdId) {
    const hRef = db.collection('households').doc(householdId);
    const hSnap = await hRef.get();
    if (!hSnap.exists) {
      throw new HttpsError('not-found', 'Household not found.');
    }
    const hData = hSnap.data();
    if (hData.clubId !== effectiveClubId) {
      throw new HttpsError('permission-denied', 'Household club mismatch.');
    }
    const mergedParents = [...new Set([
      ...(hData.parentEmails || []),
      ...parents,
    ])];
    const mergedPlayers = [...new Set([
      ...(hData.playerEmails || []),
      ...players,
    ])];
    const nameSet = new Set([...(hData.playerNames || [])]);
    for (const em of players) {
      const nm = userMap.get(em).playerName;
      if (nm) nameSet.add(nm);
    }
    batch.set(hRef, {
      parentEmails: mergedParents,
      playerEmails: mergedPlayers,
      playerNames: [...nameSet],
      updatedAt: now,
    }, {merge: true});
  } else {
    householdId = db.collection('households').doc().id;
    const hRef = db.collection('households').doc(householdId);
    const playerNames = players.map((em) => userMap.get(em).playerName).filter(
        Boolean,
    );
    batch.set(hRef, {
      clubId: effectiveClubId,
      parentEmails: parents,
      playerEmails: players,
      playerNames,
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const em of allEmails) {
    batch.set(
        db.collection('users').doc(em),
        {householdId},
        {merge: true},
    );
  }

  const auditRef = db.collection('security_audit').doc();
  batch.set(auditRef, {
    action: 'linkHousehold',
    householdId,
    actorEmail: actor.email || null,
    actorUid: request.auth.uid,
    parentEmails: parents,
    playerEmails: players,
    clubId: effectiveClubId,
    at: now,
  });

  await batch.commit();

  return {householdId, clubId: effectiveClubId};
});

/**
 * Director / super_admin: set DOB; derives isMinor and vpcStatus.
 */
exports.setPlayerDateOfBirth = onCall({region: REGION}, async (request) => {
  const actor = assertDirectorOrSuper(request);
  const data = request.data || {};
  const playerEmail = normEmail(data.playerEmail);
  const rawDob = data.dateOfBirth;
  if (!playerEmail || typeof rawDob !== 'string') {
    throw new HttpsError(
        'invalid-argument',
        'playerEmail and dateOfBirth (ISO date) are required.',
    );
  }
  const dobDate = new Date(rawDob);
  if (Number.isNaN(dobDate.getTime())) {
    throw new HttpsError('invalid-argument', 'Invalid dateOfBirth.');
  }
  const snap = await db.collection('users').doc(playerEmail).get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'User not found.');
  }
  const u = snap.data();
  if (actor.role === 'director') {
    if (!actor.clubId || u.clubId !== actor.clubId) {
      throw new HttpsError('permission-denied', 'Out of club scope.');
    }
  }

  const ts = admin.firestore.Timestamp.fromDate(dobDate);
  const age = computeAgeYears(ts);
  // COPPA 2026 / Children's Privacy Act: threshold is under 17.
  const isMinor = age < 17;
  const vpcStatus = isMinor ? 'pending' : 'not_required';

  await snap.ref.update({
    dateOfBirth: ts,
    isMinor,
    vpcStatus,
  });

  await db.collection('security_audit').add({
    action: 'setPlayerDateOfBirth',
    playerEmail,
    actorEmail: actor.email || null,
    actorUid: request.auth.uid,
    isMinor,
    at: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {playerEmail, isMinor, vpcStatus};
});

/**
 * Director / super_admin: after offline / gateway VPC, mark minor verified and
 * attest passport waiver (replaces canvas for U13). Real payment/KBA webhooks
 * should call the same internal logic later.
 *
 * @param {any} request
 * @param {string} auditAction security_audit.action value
 * @return {Promise<{playerEmail: string, vpcStatus: string}>}
 */
async function executeDirectorVpcApproval(request, auditAction) {
  const actor = assertDirectorOrSuper(request);
  const data = request.data || {};
  const playerEmail = normEmail(data.playerEmail);
  if (!playerEmail) {
    throw new HttpsError('invalid-argument', 'playerEmail is required.');
  }

  const uRef = db.collection('users').doc(playerEmail);
  const uSnap = await uRef.get();
  if (!uSnap.exists) {
    throw new HttpsError('not-found', 'User not found.');
  }
  const u = uSnap.data();
  if (actor.role === 'director') {
    if (!actor.clubId || u.clubId !== actor.clubId) {
      throw new HttpsError('permission-denied', 'Out of club scope.');
    }
  }
  if (u.isMinor !== true) {
    throw new HttpsError(
        'failed-precondition',
        'User is not marked as a minor (set date of birth first).',
    );
  }
  const hid = u.householdId;
  if (!hid) {
    throw new HttpsError(
        'failed-precondition',
        'Link a parent household before completing VPC.',
    );
  }
  const hSnap = await db.collection('households').doc(hid).get();
  if (!hSnap.exists) {
    throw new HttpsError('failed-precondition', 'Household missing.');
  }
  const h = hSnap.data();
  if (!h.parentEmails || h.parentEmails.length < 1) {
    throw new HttpsError(
        'failed-precondition',
        'Household must include at least one parent email.',
    );
  }

  const pendingReqs = await db.collection('vpc_requests')
      .where('playerEmail', '==', playerEmail)
      .where('status', '==', 'pending')
      .get();

  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  pendingReqs.forEach((d) => {
    batch.set(d.ref, {status: 'completed', completedAt: now}, {merge: true});
  });

  batch.set(uRef, {vpcStatus: 'verified'}, {merge: true});

  const passRef = db.collection('passports').doc(playerEmail);
  batch.set(passRef, {
    hasSignedWaiver: true,
    waiverSignedAt: now,
    waiverAttestedBy: actor.email || 'director',
    waiverMethod: 'vpc_director_attestation',
  }, {merge: true});

  const consentRef = db.collection('consent_records').doc();
  batch.set(consentRef, {
    subjectEmail: playerEmail,
    method: 'director_vpc_attestation',
    verifiedAt: now,
    actorEmail: actor.email || null,
    actorUid: request.auth.uid,
    householdId: hid,
  });

  batch.set(db.collection('security_audit').doc(), {
    action: auditAction,
    playerEmail,
    actorEmail: actor.email || null,
    actorUid: request.auth.uid,
    at: now,
  });

  await batch.commit();

  return {playerEmail, vpcStatus: 'verified'};
}

// Legacy name; prefer directorApproveVpc for new clients (identical behavior).
exports.verifyVpcForMinor = onCall({region: REGION}, (request) =>
  executeDirectorVpcApproval(request, 'verifyVpcForMinor'),
);

/**
 * Director / super_admin: finalize VPC. Sets users.vpcStatus = verified;
 * onWrite syncUserClaims stamps custom claim vpcVerified for Firestore rules.
 */
exports.directorApproveVpc = onCall({region: REGION}, (request) =>
  executeDirectorVpcApproval(request, 'directorApproveVpc'),
);

/**
 * Parent: after completing the club's VPC process offline, notify the club so
 * a director can run directorApproveVpc (legacy: verifyVpcForMinor).
 * Does not grant consent by itself.
 */
exports.parentSubmitVpcIntent = onCall({region: REGION}, async (request) => {
  const actor = assertParent(request);
  const data = request.data || {};
  const playerEmail = normEmail(data.playerEmail);
  if (!playerEmail) {
    throw new HttpsError('invalid-argument', 'playerEmail is required.');
  }

  const hRef = db.collection('households').doc(actor.householdId);
  const hSnap = await hRef.get();
  if (!hSnap.exists) {
    throw new HttpsError('failed-precondition', 'Household not found.');
  }
  const h = hSnap.data();
  const parentSet = new Set(
      (h.parentEmails || [])
          .map((e) => normEmail(String(e)))
          .filter(Boolean),
  );
  if (!parentSet.has(actor.email)) {
    throw new HttpsError(
        'permission-denied',
        'You are not listed on this household.',
    );
  }
  const playerSet = new Set(
      (h.playerEmails || [])
          .map((e) => normEmail(String(e)))
          .filter(Boolean),
  );
  if (!playerSet.has(playerEmail)) {
    throw new HttpsError(
        'invalid-argument',
        'That player email is not linked to your household.',
    );
  }

  const uRef = db.collection('users').doc(playerEmail);
  const uSnap = await uRef.get();
  if (!uSnap.exists) {
    throw new HttpsError('not-found', 'Player profile not found.');
  }
  const u = uSnap.data();
  if (u.isMinor !== true) {
    throw new HttpsError(
        'failed-precondition',
        'VPC intake applies to minors (under 13) only.',
    );
  }
  if (u.vpcStatus === 'verified') {
    return {ok: true, alreadyVerified: true, playerEmail};
  }

  const dup = await db.collection('vpc_requests')
      .where('playerEmail', '==', playerEmail)
      .where('status', '==', 'pending')
      .limit(1)
      .get();
  if (!dup.empty) {
    return {ok: true, duplicate: true, playerEmail};
  }

  const clubIdResolved = await resolveClubIdForVpcIntent(u, h, actor.email);
  if (!clubIdResolved) {
    throw new HttpsError(
        'failed-precondition',
        'Club context is missing for this athlete. Ask your director to set ' +
        'the playerâ€™s club, link a household with a club, or ensure your ' +
        'parent profile includes a club.',
    );
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  await db.collection('vpc_requests').add({
    playerEmail,
    parentEmail: actor.email,
    householdId: actor.householdId,
    clubId: clubIdResolved,
    status: 'pending',
    createdAt: now,
  });

  await db.collection('security_audit').add({
    action: 'parentSubmitVpcIntent',
    playerEmail,
    parentEmail: actor.email,
    householdId: actor.householdId,
    clubId: clubIdResolved,
    actorUid: request.auth.uid,
    at: now,
  });

  return {ok: true, playerEmail};
});

/**
 * Sprint 1.2 â€” COPPA 2026: player self-reports date of birth at account setup.
 * Server-side age derivation prevents client-side spoofing.
 * Sets isMinor (age < 17) and vpcStatus ('pending_parent' | 'not_required').
 * syncUserClaims trigger fires automatically to stamp JWT claims.
 *
 * @param {{ dateOfBirth: string }} data ISO date string, e.g. '2012-03-15'
 */
exports.playerSelfReportDob = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const role = request.auth.token.role || 'player';
  if (role !== 'player') {
    throw new HttpsError(
        'permission-denied',
        'Only player accounts may self-report date of birth.',
    );
  }
  const email = normEmail(request.auth.token.email);
  if (!email) {
    throw new HttpsError('unauthenticated', 'Authenticated email is missing.');
  }

  const data = request.data || {};
  const rawDob = data.dateOfBirth;
  if (typeof rawDob !== 'string' || !rawDob.trim()) {
    throw new HttpsError(
        'invalid-argument',
        'dateOfBirth (ISO date string, e.g. 2012-03-15) is required.',
    );
  }
  const dobDate = new Date(rawDob.trim());
  if (Number.isNaN(dobDate.getTime())) {
    throw new HttpsError('invalid-argument', 'Invalid dateOfBirth value.');
  }

  const now = new Date();
  if (dobDate >= now) {
    throw new HttpsError('invalid-argument', 'Date of birth must be in the past.');
  }

  const earliestAllowed = new Date(now);
  earliestAllowed.setFullYear(earliestAllowed.getFullYear() - 100);
  if (dobDate < earliestAllowed) {
    throw new HttpsError('invalid-argument', 'Date of birth is implausibly old.');
  }

  const uRef = db.collection('users').doc(email);
  const uSnap = await uRef.get();
  if (!uSnap.exists) {
    throw new HttpsError(
        'not-found',
        'User profile not found. Complete profile setup first.',
    );
  }

  const u = uSnap.data();
  if (u.vpcStatus === 'verified') {
    return {ok: true, isMinor: u.isMinor === true, vpcStatus: 'verified'};
  }

  const ts = admin.firestore.Timestamp.fromDate(dobDate);
  const age = computeAgeYears(ts);
  // COPPA 2026 / Children's Privacy Act: threshold is under 17.
  const isMinor = age < 17;
  // 'pending_parent' distinguishes self-reported DOB from director-set DOB ('pending').
  const vpcStatus = isMinor ? 'pending_parent' : 'not_required';

  await uRef.update({
    dateOfBirth: ts,
    isMinor,
    vpcStatus,
  });

  await db.collection('security_audit').add({
    action: 'playerSelfReportDob',
    playerEmail: email,
    actorUid: request.auth.uid,
    isMinor,
    vpcStatus,
    at: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {ok: true, isMinor, vpcStatus};
});

/**
 * Sprint 1.2 â€” COPPA 2026: parent submits explicit granular consent via the
 * online consent ceremony. Creates a structured consent_records document and
 * updates vpc_requests to 'parent_consented'. Does NOT verify the minor â€”
 * directorApproveVpc is still required as the second factor.
 *
 * @param {{
 *   playerEmail: string,
 *   consentItems: {
 *     workoutData: boolean,
 *     identity: boolean,
 *     analytics: boolean,
 *     comms: boolean
 *   },
 *   parentDisplayName: string
 * }} data
 */
exports.parentGrantVpcConsent = onCall({region: REGION}, async (request) => {
  const actor = assertParent(request);
  const data = request.data || {};

  const playerEmail = normEmail(data.playerEmail);
  if (!playerEmail) {
    throw new HttpsError('invalid-argument', 'playerEmail is required.');
  }

  const ci = data.consentItems;
  if (
    !ci ||
    typeof ci !== 'object' ||
    ci.workoutData !== true ||
    ci.identity !== true
  ) {
    throw new HttpsError(
        'invalid-argument',
        'Required consent items (workoutData, identity) must be explicitly accepted.',
    );
  }

  const parentDisplayName =
      typeof data.parentDisplayName === 'string' ?
        data.parentDisplayName.trim() :
        '';
  if (!parentDisplayName) {
    throw new HttpsError(
        'invalid-argument',
        'parentDisplayName is required for consent attestation.',
    );
  }

  const hRef = db.collection('households').doc(actor.householdId);
  const hSnap = await hRef.get();
  if (!hSnap.exists) {
    throw new HttpsError('failed-precondition', 'Household not found.');
  }
  const h = hSnap.data();

  const parentSet = new Set(
      (h.parentEmails || []).map((e) => normEmail(String(e))).filter(Boolean),
  );
  if (!parentSet.has(actor.email)) {
    throw new HttpsError(
        'permission-denied',
        'You are not listed on this household.',
    );
  }

  const playerSet = new Set(
      (h.playerEmails || []).map((e) => normEmail(String(e))).filter(Boolean),
  );
  if (!playerSet.has(playerEmail)) {
    throw new HttpsError(
        'invalid-argument',
        'That player email is not linked to your household.',
    );
  }

  const uRef = db.collection('users').doc(playerEmail);
  const uSnap = await uRef.get();
  if (!uSnap.exists) {
    throw new HttpsError('not-found', 'Player profile not found.');
  }
  const u = uSnap.data();
  if (u.isMinor !== true) {
    throw new HttpsError(
        'failed-precondition',
        'VPC consent applies to minors only.',
    );
  }
  if (u.vpcStatus === 'verified') {
    return {ok: true, alreadyVerified: true, playerEmail};
  }

  const clubId = u.clubId || h.clubId || null;
  if (!clubId) {
    throw new HttpsError(
        'failed-precondition',
        'Club context is missing. Ask your director to link the club to this household.',
    );
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const nowIso = new Date().toISOString();

  const consentRef = db.collection('consent_records').doc();
  await consentRef.set({
    subjectEmail: playerEmail,
    parentEmail: actor.email,
    parentDisplayName,
    householdId: actor.householdId,
    clubId,
    consentItems: {
      workoutData: ci.workoutData === true,
      identity: ci.identity === true,
      analytics: ci.analytics === true,
      comms: ci.comms === true,
    },
    method: 'parent_online_explicit',
    policyVersion: '2026-04',
    grantedAt: now,
    grantedAtIso: nowIso,
  });

  const dupQ = await db.collection('vpc_requests')
      .where('playerEmail', '==', playerEmail)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

  if (!dupQ.empty) {
    await dupQ.docs[0].ref.update({
      status: 'parent_consented',
      parentEmail: actor.email,
      consentRecordId: consentRef.id,
      consentedAt: now,
    });
  } else {
    await db.collection('vpc_requests').add({
      playerEmail,
      parentEmail: actor.email,
      householdId: actor.householdId,
      clubId,
      status: 'parent_consented',
      consentRecordId: consentRef.id,
      createdAt: now,
      consentedAt: now,
    });
  }

  await db.collection('security_audit').add({
    action: 'parentGrantVpcConsent',
    playerEmail,
    parentEmail: actor.email,
    householdId: actor.householdId,
    clubId,
    consentRecordId: consentRef.id,
    actorUid: request.auth.uid,
    at: now,
  });

  return {ok: true, playerEmail, pendingDirectorApproval: true};
});

/**
 * SafeSport / Epic 1.4: coach or director sends in-app message to a rostered
 * athlete. Minors get parent emails denormalized for CC visibility; audit log
 * mirrors metadata (not full body in messaging_audit).
 */
exports.sendCoachPlayerMessage = onCall({region: REGION}, async (request) => {
  const actor = assertCoachMessageSender(request);
  const data = request.data || {};
  const teamId = typeof data.teamId === 'string' ? data.teamId.trim() : '';
  const playerName =
      typeof data.playerName === 'string' ? data.playerName.trim() : '';
  const bodyRaw = typeof data.body === 'string' ? data.body.trim() : '';
  if (!teamId || !playerName || !bodyRaw) {
    throw new HttpsError(
        'invalid-argument',
        'teamId, playerName, and body are required.',
    );
  }
  if (bodyRaw.length > 4000) {
    throw new HttpsError(
        'invalid-argument',
        'Message too long (max 4000 characters).',
    );
  }

  const tSnap = await db.collection('teams').doc(teamId).get();
  if (!tSnap.exists) {
    throw new HttpsError('not-found', 'Team not found.');
  }
  const teamClubId = tSnap.data().clubId || null;

  if (actor.role === 'coach' && actor.teamId !== teamId) {
    throw new HttpsError(
        'permission-denied',
        'You can only message your team.',
    );
  }
  if (actor.role === 'director') {
    if (!teamClubId || teamClubId !== actor.clubId) {
      throw new HttpsError(
          'permission-denied',
          'Team is not in your club.',
      );
    }
  }

  const lookupSnap = await db.collection('player_lookup')
      .where('teamId', '==', teamId)
      .where('playerName', '==', playerName)
      .limit(2)
      .get();

  if (lookupSnap.empty) {
    throw new HttpsError(
        'failed-precondition',
        'Add the athlete login email on the roster before messaging.',
    );
  }
  if (lookupSnap.size > 1) {
    throw new HttpsError(
        'failed-precondition',
        'Duplicate roster links for this name; resolve in Firestore.',
    );
  }

  const toPlayerEmail = normEmail(lookupSnap.docs[0].id);
  if (!toPlayerEmail) {
    throw new HttpsError('failed-precondition', 'Invalid player email key.');
  }

  const uSnap = await db.collection('users').doc(toPlayerEmail).get();
  if (!uSnap.exists) {
    throw new HttpsError(
        'failed-precondition',
        'Athlete has not finished account setup.',
    );
  }
  const u = uSnap.data();
  if (u.teamId !== teamId) {
    throw new HttpsError('failed-precondition', 'Athlete is not on this team.');
  }

  const actorEmail = actor.email || '';
  if (normEmail(actorEmail) === toPlayerEmail) {
    throw new HttpsError('invalid-argument', 'Cannot message yourself.');
  }

  let minorRecipient = u.isMinor === true;
  if (!minorRecipient && u.dateOfBirth) {
    try {
      minorRecipient = computeAgeYears(u.dateOfBirth) < 17;
    } catch (e) {
      logger.warn('sendCoachPlayerMessage: age check failed', e);
    }
  }

  /** @type {string[]} */
  let ccParentEmails = [];
  if (minorRecipient && u.householdId) {
    const hSnap = await db.collection('households').doc(u.householdId).get();
    if (hSnap.exists) {
      const pe = hSnap.data().parentEmails || [];
      ccParentEmails = [...new Set(
          pe.map((x) => normEmail(String(x))).filter(Boolean),
      )];
    }
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const bodyPreview = bodyRaw.length > 200 ?
    bodyRaw.slice(0, 200) + 'â€¦' :
    bodyRaw;

  const msgRef = db.collection('in_app_messages').doc();
  const batch = db.batch();

  batch.set(msgRef, {
    teamId,
    teamClubId: teamClubId || null,
    fromEmail: actorEmail,
    toPlayerEmail,
    toPlayerName: playerName,
    body: bodyRaw,
    bodyPreview,
    minorRecipient,
    ccParentEmails,
    createdAt: now,
    createdByRole: actor.role,
  });

  batch.set(db.collection('messaging_audit').doc(), {
    action: 'coach_player_message',
    messageId: msgRef.id,
    teamId,
    fromEmail: actorEmail,
    toPlayerEmail,
    toPlayerName: playerName,
    minorRecipient,
    ccParentEmails,
    bodyPreview,
    bodyLength: bodyRaw.length,
    actorUid: request.auth.uid,
    at: now,
  });

  await batch.commit();

  return {
    ok: true,
    messageId: msgRef.id,
    minorRecipient,
    ccCount: ccParentEmails.length,
    warnNoCc: minorRecipient && ccParentEmails.length === 0,
  };
});

/**
 * Sprint 1.3 â€” SafeSport Comms: server-enforced message send for the Comms Hub.
 *
 * For channels where safesportMonitored === true, Firestore Rules block direct
 * client addDoc; all messages MUST route through this callable so the server can:
 *   1. Verify the caller is a current channel member (cannot be spoofed client-side).
 *   2. Re-resolve and atomically re-add any parent emails dropped from memberIds
 *      after channel creation (e.g., removed manually or household updated).
 *   3. Write the message via Admin SDK with safesportMonitored: true stamped on it.
 *   4. Create an immutable messaging_audit record for director compliance review.
 *
 * Non-monitored channels still use direct client addDoc; this callable also accepts
 * non-monitored IDs to provide a single unified send path for the UI if desired.
 *
 * @param {{ clubId: string, channelId: string, text: string }} data
 */
exports.sendChannelMessage = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const callerEmail = normEmail(request.auth.token.email);
  const callerUid = request.auth.uid;
  const callerRole = request.auth.token.role || 'player';

  if (!callerEmail) {
    throw new HttpsError('unauthenticated', 'Authenticated email is missing.');
  }

  const data = request.data || {};
  const clubId = typeof data.clubId === 'string' ? data.clubId.trim() : '';
  const channelId = typeof data.channelId === 'string' ? data.channelId.trim() : '';
  const rawText = typeof data.text === 'string' ? data.text.trim() : '';

  if (!clubId || !channelId || !rawText) {
    throw new HttpsError(
        'invalid-argument',
        'clubId, channelId, and text are required.',
    );
  }
  if (rawText.length > 8000) {
    throw new HttpsError(
        'invalid-argument',
        'Message too long (max 8000 characters).',
    );
  }

  // Resolve display name server-side (not trusted from client).
  let callerName = callerEmail.split('@')[0];
  const callerUserSnap = await db.collection('users').doc(callerEmail).get();
  if (callerUserSnap.exists) {
    const cd = callerUserSnap.data();
    const pn = typeof cd.playerName === 'string' ? cd.playerName.trim() : '';
    const dn = typeof cd.displayName === 'string' ? cd.displayName.trim() : '';
    callerName = pn || dn || callerName;
  }

  // Load and validate the channel doc.
  const channelRef = db
      .collection('clubs').doc(clubId)
      .collection('channels').doc(channelId);
  const channelSnap = await channelRef.get();
  if (!channelSnap.exists) {
    throw new HttpsError('not-found', 'Channel not found.');
  }
  const channel = channelSnap.data();

  // Verify caller is a current member of this channel.
  const memberIds = Array.isArray(channel.memberIds) ?
    channel.memberIds.map((e) => normEmail(String(e))).filter(Boolean) :
    [];
  if (!memberIds.includes(callerEmail)) {
    throw new HttpsError(
        'permission-denied',
        'You are not a member of this channel.',
    );
  }

  // Cross-tenant guard: verify the channel's team belongs to the declared club.
  const channelTeamId =
      typeof channel.teamId === 'string' ? channel.teamId.trim() : '';
  if (channelTeamId) {
    const teamSnap = await db.collection('teams').doc(channelTeamId).get();
    if (teamSnap.exists) {
      const teamClubId = teamSnap.data().clubId;
      if (teamClubId && teamClubId !== clubId) {
        throw new HttpsError(
            'permission-denied',
            'Channel does not belong to the specified club.',
        );
      }
    }
  }

  // Broadcast channels: only staff may write.
  if (
    channel.type === 'broadcast' &&
    callerRole !== 'coach' &&
    callerRole !== 'director' &&
    callerRole !== 'super_admin'
  ) {
    throw new HttpsError('permission-denied', 'Read-only: Announcements channel.');
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const safesportMonitored = channel.safesportMonitored === true;
  let ccParentEmails = Array.isArray(channel.ccParentEmails) ?
    channel.ccParentEmails.map((e) => normEmail(String(e))).filter(Boolean) :
    [];

  // SafeSport CC verification and re-enforcement (monitored channels only).
  if (safesportMonitored) {
    const memberSet = new Set(memberIds);

    // Identify every player-role user currently in the channel member list.
    const userSnaps = await Promise.all(
        memberIds.map((em) => db.collection('users').doc(em).get()),
    );
    const playerEmailsInChannel = [];
    for (let i = 0; i < memberIds.length; i++) {
      const us = userSnaps[i];
      if (us.exists && us.data().role === 'player') {
        playerEmailsInChannel.push(memberIds[i]);
      }
    }

    // Re-resolve parent emails for each player via household (strict club scope).
    const resolvedParentSet = new Set(ccParentEmails);
    for (const playerEmail of playerEmailsInChannel) {
      const uSnap = await db.collection('users').doc(playerEmail).get();
      if (!uSnap.exists) continue;
      const playerHouseholdId = uSnap.data().householdId;
      if (!playerHouseholdId) continue;
      const hSnap = await db.collection('households').doc(playerHouseholdId).get();
      if (!hSnap.exists) continue;
      const hd = hSnap.data();
      if (hd.clubId !== clubId) continue; // cross-tenant guard
      const parentEmailList = (hd.parentEmails || [])
          .map((e) => normEmail(String(e)))
          .filter(Boolean);
      for (const p of parentEmailList) resolvedParentSet.add(p);
    }

    const resolvedParents = [...resolvedParentSet].sort();

    // Detect parents missing from current memberIds (dropped after creation).
    const missingParents = resolvedParents.filter((p) => !memberSet.has(p));
    const newParentsFound = resolvedParents.length > ccParentEmails.length;

    if (missingParents.length > 0 || newParentsFound) {
      const updatedMemberIds = [
        ...new Set([...memberIds, ...resolvedParents]),
      ].sort();
      await channelRef.update({
        memberIds: updatedMemberIds,
        ccParentEmails: resolvedParents,
      });
      ccParentEmails = resolvedParents;
      logger.info(
          `[sendChannelMessage] re-enforced SafeSport CC: ` +
          `${missingParents.length} missing + ${newParentsFound ? 'new' : '0 new'} ` +
          `parents on channel ${channelId} in club ${clubId}`,
      );
    }
  }

  // Atomically write the message and audit record via Admin SDK.
  const msgRef = db
      .collection('clubs').doc(clubId)
      .collection('channels').doc(channelId)
      .collection('messages').doc();
  const batch = db.batch();

  batch.set(msgRef, {
    senderId: callerUid,
    senderName: callerName,
    senderRole: callerRole,
    text: rawText,
    timestamp: now,
    deleted: false,
    safesportMonitored,
    ...(safesportMonitored ? {ccParentEmails} : {}),
  });

  batch.set(db.collection('messaging_audit').doc(), {
    action: 'channel_message',
    channelId,
    clubId,
    teamId: channelTeamId || null,
    fromEmail: callerEmail,
    safesportMonitored,
    ccParentEmails: safesportMonitored ? ccParentEmails : [],
    bodyLength: rawText.length,
    actorUid: callerUid,
    at: now,
  });

  await batch.commit();

  return {
    ok: true,
    messageId: msgRef.id,
    safesportMonitored,
    ccCount: safesportMonitored ? ccParentEmails.length : 0,
    warnNoCc: safesportMonitored && ccParentEmails.length === 0,
  };
});

/**
 * Epic 1: Server-side workout log + HMAC integrity digest (tamper-evident).
 * â€” Parent: must be linked household; writes verifiedByUid / verifiedByEmail.
 * â€” Player: self-log only; verificationMethod player_self_log.
 * Client direct writes to `reps` are disabled in Firestore rules.
 */
exports.submitWorkoutRep = onCall(
    {
      region: REGION,
      secrets: [WORKOUT_ATTESTATION_HMAC_SECRET],
    },
    async (request) => {
      if (!request.auth || !request.auth.uid) {
        throw new HttpsError('unauthenticated', 'Sign in required.');
      }
      const secret = WORKOUT_ATTESTATION_HMAC_SECRET.value();
      if (!secret || typeof secret !== 'string' || secret.length < 16) {
        logger.error('WORKOUT_ATTESTATION_HMAC_SECRET missing or too short.');
        throw new HttpsError(
            'failed-precondition',
            'Server configuration error. Ask an admin to set the ' +
                'attestation secret.',
        );
      }

      const data = request.data || {};
      const role = request.auth.token.role || 'player';
      const mins = parseInt(String(data.minutes), 10);
      if (!Number.isFinite(mins) || mins <= 0 || mins > 1440) {
        throw new HttpsError(
            'invalid-argument',
            'minutes must be between 1 and 1440.',
        );
      }
      const outcomeRaw =
          typeof data.outcome === 'string' ? data.outcome.trim() : '';
      if (!outcomeRaw || outcomeRaw.length > 80) {
        throw new HttpsError('invalid-argument', 'outcome is required.');
      }
      const drills = parseDrillsPayload(data.drills);
      const drillSummary = drills.map((x) => x.name).join(', ');

      /** @type {string} */
      let playerEmail;
      /** @type {string|null} */
      let verifiedByUid = null;
      /** @type {string|null} */
      let verifiedByEmail = null;
      /** @type {string|null} */
      let verifiedByLegalName = null;
      /** @type {string} */
      let verificationMethod;

      if (role === 'parent') {
        const actor = assertParent(request);
        playerEmail = normEmail(data.playerEmail);
        if (!playerEmail) {
          throw new HttpsError(
              'invalid-argument',
              'playerEmail (athlete account) is required.',
          );
        }
        const hRef = db.collection('households').doc(actor.householdId);
        const hSnap = await hRef.get();
        if (!hSnap.exists) {
          throw new HttpsError('failed-precondition', 'Household not found.');
        }
        const h = hSnap.data();
        const playerSet = new Set(
            (h.playerEmails || [])
                .map((e) => normEmail(String(e)))
                .filter(Boolean),
        );
        if (!playerSet.has(playerEmail)) {
          throw new HttpsError(
              'permission-denied',
              'That athlete is not linked to your household.',
          );
        }
        const legal =
            typeof data.verifierLegalName === 'string' ?
              data.verifierLegalName.trim().replace(/\s+/g, ' ') :
              '';
        const parts = legal.split(/\s+/).filter(Boolean);
        if (parts.length < 2 || legal.length < 4) {
          throw new HttpsError(
              'invalid-argument',
              'Enter your full legal name (first and last).',
          );
        }
        verifiedByUid = request.auth.uid;
        verifiedByEmail = actor.email;
        verifiedByLegalName = legal;
        verificationMethod = 'parent_auth_callable';
      } else if (role === 'player') {
        playerEmail = normEmail(request.auth.token.email);
        if (!playerEmail) {
          throw new HttpsError('failed-precondition', 'Missing auth email.');
        }
        verificationMethod = 'player_self_log';
      } else {
        throw new HttpsError(
            'permission-denied',
            'Only player or parent accounts may log workouts here.',
        );
      }

      const uRef = db.collection('users').doc(playerEmail);
      const uSnap = await uRef.get();
      if (!uSnap.exists) {
        throw new HttpsError(
            'failed-precondition',
            'Athlete profile not found. Complete setup first.',
        );
      }
      const u = uSnap.data();
      const teamId = u.teamId || null;
      const playerName = u.playerName || null;
      if (!teamId || teamId === 'admin' || !playerName) {
        throw new HttpsError(
            'failed-precondition',
            'Athlete profile is missing team or display name.',
        );
      }

      let athleteUid = '';
      try {
        const au = await admin.auth().getUserByEmail(playerEmail);
        athleteUid = au.uid;
      } catch (e) {
        logger.error('submitWorkoutRep: getUserByEmail failed', e);
        throw new HttpsError(
            'failed-precondition',
            'Could not resolve athlete account.',
        );
      }

      const repRef = db.collection('reps').doc();
      const repId = repRef.id;
      const tsSeconds = Math.floor(Date.now() / 1000);
      const attestationPayload = {
        v: 1,
        repId,
        teamId,
        player: playerName,
        minutes: mins,
        outcome: outcomeRaw,
        drillSummary,
        ts: tsSeconds,
        verificationMethod,
      };
      const attestationDigest =
          workoutAttestationHmac(secret, attestationPayload);
      const now = admin.firestore.FieldValue.serverTimestamp();

      const repDoc = {
        timestamp: now,
        teamId,
        player: playerName,
        playerEmail,
        minutes: mins,
        drills,
        drillSummary,
        outcome: outcomeRaw,
        verificationMethod,
        attestationAlg: 'HMAC-SHA256-v1',
        attestationDigest,
        attestationPayload: attestationPayload,
        submittedByUid: request.auth.uid,
        submittedAt: now,
      };
      if (verifiedByUid) {
        repDoc.verifiedByUid = verifiedByUid;
        repDoc.verifiedByEmail = verifiedByEmail;
        repDoc.verifiedByLegalName = verifiedByLegalName;
        repDoc.verifiedAt = now;
      }

      const statsRef = db.collection('player_stats').doc(athleteUid);
      const batch = db.batch();
      batch.set(repRef, repDoc);
      batch.set(
          statsRef,
          {
            teamId,
            totalMins: admin.firestore.FieldValue.increment(mins),
            totalWorkouts: admin.firestore.FieldValue.increment(1),
            lastActive: now,
          },
          {merge: true},
      );
      batch.set(db.collection('security_audit').doc(), {
        action: 'submitWorkoutRep',
        repId,
        teamId,
        playerEmail,
        playerName,
        verificationMethod,
        actorUid: request.auth.uid,
        at: now,
      });

      await batch.commit();

      return {ok: true, repId, verificationMethod};
    },
);

/**
 * Monday UTC date key for weekly counters.
 * @return {string}
 */
function utcWeekMondayKey() {
  const now = new Date();
  const utc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const dow = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() - (dow - 1));
  return utc.toISOString().slice(0, 10);
}

/**
 * Monday UTC yyyy-mm-dd for the week containing `d` (local UTC calendar).
 * @param {Date} d
 * @return {string}
 */
function utcWeekMondayKeyFromDate(d) {
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() - (dow - 1));
  return utc.toISOString().slice(0, 10);
}

/**
 * Parse yyyy-mm-dd â†’ UTC noon (stable ordering).
 * @param {string} ymd
 * @return {Date}
 */
function parseUtcYmd(ymd) {
  const parts = String(ymd).split('-').map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return new Date(0);
  }
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));
}

/**
 * Epic 2/3: server-side XP, workout_logs, player_stats/{uid}, team_stats.
 */
exports.logTrainingSession = onCall({region: REGION}, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const data = request.data || {};
  const role = request.auth.token.role || 'player';

  const duration = parseInt(String(data.duration), 10);
  const reps = parseInt(String(data.reps), 10);
  if (!Number.isFinite(duration) || duration < 1 || duration > 1440) {
    throw new HttpsError(
        'invalid-argument',
        'duration must be 1â€“1440 minutes.',
    );
  }
  if (!Number.isFinite(reps) || reps < 0 || reps > 100000) {
    throw new HttpsError(
        'invalid-argument',
        'reps must be 0â€“100000.',
    );
  }

  const drillType =
      typeof data.drillType === 'string' ?
        data.drillType.trim().slice(0, 200) :
        '';
  if (!drillType) {
    throw new HttpsError('invalid-argument', 'drillType is required.');
  }

  const intensityRaw =
      typeof data.intensity === 'string' ?
        data.intensity.trim().toLowerCase() :
        '';
  if (!['low', 'medium', 'high'].includes(intensityRaw)) {
    throw new HttpsError(
        'invalid-argument',
        'intensity must be low, medium, or high.',
    );
  }

  const assignmentIdRaw =
      typeof data.assignmentId === 'string' ?
        data.assignmentId.trim() :
        '';

  /** @type {string} */
  let playerEmail;
  /** @type {string|null} */
  let verifiedByUid = null;
  /** @type {string|null} */
  let verifiedByEmail = null;
  /** @type {string|null} */
  let verifiedByLegalName = null;
  /** @type {string} */
  let verificationMethod;

  if (role === 'parent') {
    const actor = assertParent(request);
    playerEmail = normEmail(data.playerEmail);
    if (!playerEmail) {
      throw new HttpsError(
          'invalid-argument',
          'playerEmail (athlete account) is required.',
      );
    }
    const hRef = db.collection('households').doc(actor.householdId);
    const hSnap = await hRef.get();
    if (!hSnap.exists) {
      throw new HttpsError('failed-precondition', 'Household not found.');
    }
    const h = hSnap.data();
    const playerSet = new Set(
        (h.playerEmails || [])
            .map((e) => normEmail(String(e)))
            .filter(Boolean),
    );
    if (!playerSet.has(playerEmail)) {
      throw new HttpsError(
          'permission-denied',
          'That athlete is not linked to your household.',
      );
    }
    const legal =
        typeof data.verifierLegalName === 'string' ?
          data.verifierLegalName.trim().replace(/\s+/g, ' ') :
          '';
    const parts = legal.split(/\s+/).filter(Boolean);
    if (parts.length < 2 || legal.length < 4) {
      throw new HttpsError(
          'invalid-argument',
          'Enter your full legal name (first and last).',
      );
    }
    verifiedByUid = request.auth.uid;
    verifiedByEmail = actor.email;
    verifiedByLegalName = legal;
    verificationMethod = 'parent_auth_callable';
  } else if (role === 'player') {
    playerEmail = normEmail(request.auth.token.email);
    if (!playerEmail) {
      throw new HttpsError('failed-precondition', 'Missing auth email.');
    }
    verificationMethod = 'player_self_log';
  } else {
    throw new HttpsError(
        'permission-denied',
        'Only player or parent accounts may log training.',
    );
  }

  const uRef = db.collection('users').doc(playerEmail);
  const uSnap = await uRef.get();
  if (!uSnap.exists) {
    throw new HttpsError(
        'failed-precondition',
        'Athlete profile not found. Complete setup first.',
    );
  }
  const u = uSnap.data();
  const teamId = u.teamId || null;
  const playerName = u.playerName || null;
  if (!teamId || teamId === 'admin' || !playerName) {
    throw new HttpsError(
        'failed-precondition',
        'Athlete profile is missing team or display name.',
    );
  }

  let athleteUid = '';
  try {
    const au = await admin.auth().getUserByEmail(playerEmail);
    athleteUid = au.uid;
  } catch (e) {
    logger.error('logTrainingSession: getUserByEmail failed', e);
    throw new HttpsError(
        'failed-precondition',
        'Could not resolve athlete account.',
    );
  }

  const earned = calculateTrainingSessionEarnedXp({
    duration,
    reps,
    intensity: intensityRaw,
  });
  if (earned < 1) {
    throw new HttpsError(
        'invalid-argument',
        'Earned XP would be zero; increase duration or reps.',
    );
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = utcYmdAddDays(todayStr, -1);
  const weekKey = utcWeekMondayKey();

  const logRef = db.collection('workout_logs').doc();
  const logId = logRef.id;
  const psRef = db.collection('player_stats').doc(athleteUid);
  const tsRef = db.collection('team_stats').doc(teamId);
  const teamRef = db.collection('teams').doc(teamId);

  /**
   * @type {{
   *   earnedXP: number,
   *   totalXp: number,
   *   level: number,
   *   streak: number
   * }}
   */
  const out = {
    earnedXP: earned,
    totalXp: 0,
    level: 1,
    streak: 1,
  };

  await db.runTransaction(async (tx) => {
    const [psSnap, tsSnap, teamSnap, uSnapTx] = await Promise.all([
      tx.get(psRef),
      tx.get(tsRef),
      tx.get(teamRef),
      tx.get(uRef),
    ]);
    if (!uSnapTx.exists) {
      throw new HttpsError(
          'failed-precondition',
          'Athlete profile not found.',
      );
    }
    const uTx = uSnapTx.data();

    const prevTotal =
        psSnap.exists &&
        typeof psSnap.data().total_xp === 'number' &&
        !Number.isNaN(psSnap.data().total_xp) ?
          Math.floor(psSnap.data().total_xp) :
          0;
    const newTotal = prevTotal + earned;

    const prevWeek =
        psSnap.exists && typeof psSnap.data().stats_week_key === 'string' ?
          psSnap.data().stats_week_key :
          '';
    let repsWeek = 0;
    let minsWeek = 0;
    let xpWeek = 0;
    if (prevWeek === weekKey && psSnap.exists) {
      const d = psSnap.data();
      const rw = d.reps_this_week;
      repsWeek =
          typeof rw === 'number' && !Number.isNaN(rw) ?
            rw :
            0;
      minsWeek =
          typeof d.minutes_this_week === 'number' &&
          !Number.isNaN(d.minutes_this_week) ?
            d.minutes_this_week :
            0;
      const xw = d.xp_this_week;
      xpWeek =
          typeof xw === 'number' && !Number.isNaN(xw) ?
            Math.floor(xw) :
            0;
    }
    repsWeek += reps;
    minsWeek += duration;
    xpWeek += earned;

    const lastTr =
        psSnap.exists && typeof psSnap.data().last_training_utc === 'string' ?
          psSnap.data().last_training_utc :
          '';
    let streakDays = 1;
    if (psSnap.exists) {
      const sd = psSnap.data();
      const prevSt =
          typeof sd.streak_days === 'number' && !Number.isNaN(sd.streak_days) ?
            Math.floor(sd.streak_days) :
            0;
      if (lastTr === todayStr) {
        streakDays = Math.max(1, prevSt);
      } else if (lastTr === yesterdayStr) {
        streakDays = Math.max(1, prevSt + 1);
      } else if (lastTr) {
        streakDays = 1;
      } else {
        streakDays = 1;
      }
    }

    const lv = trainingLevelFromTotalXp(newTotal);

    const logDoc = {
      drillType,
      duration,
      reps,
      intensity: intensityRaw,
      earnedXP: earned,
      teamId,
      playerName,
      playerEmail,
      playerId: athleteUid,
      verificationMethod,
      submittedByUid: request.auth.uid,
      timestamp: now,
    };
    if (verifiedByUid) {
      logDoc.verifiedByUid = verifiedByUid;
      logDoc.verifiedByEmail = verifiedByEmail;
      logDoc.verifiedByLegalName = verifiedByLegalName;
      logDoc.verifiedAt = now;
    }

    tx.set(logRef, logDoc);

    tx.set(
        psRef,
        {
          teamId,
          playerName,
          total_xp: admin.firestore.FieldValue.increment(earned),
          current_level: lv.level,
          reps_this_week: repsWeek,
          minutes_this_week: minsWeek,
          xp_this_week: xpWeek,
          streak_days: streakDays,
          stats_week_key: weekKey,
          last_training_utc: todayStr,
          updatedAt: now,
        },
        {merge: true},
    );

    const uTxData = uSnapTx.data() || {};
    const prevLong =
        typeof uTxData.longestStreak === 'number' && !Number.isNaN(uTxData.longestStreak) ?
          Math.floor(uTxData.longestStreak) :
          0;
    const xpInc = admin.firestore.FieldValue.increment(earned);
    tx.update(uRef, {
      xp: xpInc,
      totalXp: xpInc,
      trainingLevel: lv.level,
      currentStreak: streakDays,
      longestStreak: Math.max(prevLong, streakDays),
      updatedAt: now,
    });

    const clubId =
        teamSnap.exists &&
        typeof teamSnap.data().clubId === 'string' &&
        teamSnap.data().clubId.trim() ?
          teamSnap.data().clubId.trim() :
          null;

    const nowDate = new Date();
    const monthKey =
        `${nowDate.getUTCFullYear()}-` +
        `${String(nowDate.getUTCMonth() + 1).padStart(2, '0')}`;

    let totalSessions = 1;
    if (tsSnap.exists) {
      const sd = tsSnap.data() || {};
      const prevKey = sd.stats_month_key;
      if (prevKey === monthKey) {
        const prev =
            typeof sd.total_sessions_this_month === 'number' &&
            !Number.isNaN(sd.total_sessions_this_month) ?
              sd.total_sessions_this_month :
              0;
        totalSessions = prev + 1;
      }
    }

    tx.set(
        tsRef,
        {
          teamId,
          clubId: clubId || null,
          last_activity_timestamp: now,
          total_sessions_this_month: totalSessions,
          stats_month_key: monthKey,
          updatedAt: now,
        },
        {merge: true},
    );

    out.totalXp = newTotal;
    out.level = lv.level;
    out.streak = streakDays;
  });

  await db.collection('security_audit').add({
    action: 'logTrainingSession',
    logId,
    teamId,
    playerEmail,
    playerName,
    earnedXP: earned,
    verificationMethod,
    actorUid: request.auth.uid,
    at: admin.firestore.FieldValue.serverTimestamp(),
  });

  if (assignmentIdRaw) {
    try {
      const asRef = db.collection('assignments').doc(assignmentIdRaw);
      const asSnap = await asRef.get();
      if (asSnap.exists) {
        const a = asSnap.data();
        const st = a.status;
        const open = st === 'pending' || st === 'active';
        if (
          open &&
          a.teamId === teamId &&
          typeof a.playerId === 'string' &&
          a.playerId === athleteUid
        ) {
          await asRef.update({
            status: 'completed',
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            completedViaLogSession: true,
          });
        }
      }
    } catch (e) {
      logger.error('logTrainingSession assignment completion', e);
    }
  }

  return {
    ok: true,
    earnedXP: out.earnedXP,
    totalXp: out.totalXp,
    level: out.level,
    streakDays: out.streak,
    athleteUid,
  };
});

/**
 * Epic 11: coach/director assigns homework from global drills catalog.
 * @param {string[]} playerEmails Athlete account emails on the roster.
 */
exports.secureAssignHomework = onCall({region: REGION}, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const data = request.data || {};
  const teamId =
      typeof data.teamId === 'string' ? data.teamId.trim() : '';
  const drillId =
      typeof data.drillId === 'string' ? data.drillId.trim() : '';
  const dueRaw = data.dueDate;
  const emailsRaw = data.playerEmails;

  if (!teamId || teamId === 'admin') {
    throw new HttpsError('invalid-argument', 'teamId is required.');
  }
  if (!drillId) {
    throw new HttpsError('invalid-argument', 'drillId is required.');
  }
  if (!Array.isArray(emailsRaw) || emailsRaw.length === 0) {
    throw new HttpsError(
        'invalid-argument',
        'playerEmails must be a non-empty array.',
    );
  }
  if (emailsRaw.length > 50) {
    throw new HttpsError(
        'invalid-argument',
        'Assign to at most 50 players per request.',
    );
  }

  let dueDate;
  if (dueRaw instanceof Date && !Number.isNaN(dueRaw.getTime())) {
    dueDate = admin.firestore.Timestamp.fromDate(dueRaw);
  } else if (
    typeof dueRaw === 'string' &&
    dueRaw.trim() &&
    !Number.isNaN(Date.parse(dueRaw))
  ) {
    dueDate = admin.firestore.Timestamp.fromDate(new Date(dueRaw));
  } else if (
    typeof dueRaw === 'number' &&
    Number.isFinite(dueRaw) &&
    dueRaw > 0
  ) {
    dueDate = admin.firestore.Timestamp.fromMillis(dueRaw);
  } else {
    throw new HttpsError(
        'invalid-argument',
        'dueDate must be an ISO string, millis, or Date.',
    );
  }

  const {clubId} = await assertCanSecureAddPlayer(request, teamId);
  await assertClubSubscriptionWritable(clubId, request);

  const drillSnap = await db.collection('drills').doc(drillId).get();
  if (!drillSnap.exists) {
    throw new HttpsError('not-found', 'Drill not found in library.');
  }
  const drillTitle =
      typeof drillSnap.data().title === 'string' ?
        drillSnap.data().title.trim().slice(0, 200) :
        'Drill';

  const batch = db.batch();
  let count = 0;
  const seen = new Set();
  for (const raw of emailsRaw) {
    const em = normEmail(String(raw || ''));
    if (!em || seen.has(em)) continue;
    seen.add(em);
    const uSnap = await db.collection('users').doc(em).get();
    if (!uSnap.exists) continue;
    const u = uSnap.data();
    if (u.teamId !== teamId) {
      throw new HttpsError(
          'failed-precondition',
          `Player ${em} is not on this team.`,
      );
    }
    let uid;
    try {
      const rec = await admin.auth().getUserByEmail(em);
      uid = rec.uid;
    } catch (e) {
      logger.warn('secureAssignHomework: no auth user for', em);
      continue;
    }
    const playerName =
        typeof u.playerName === 'string' ? u.playerName.trim() : '';
    const ref = db.collection('assignments').doc();
    batch.set(ref, {
      teamId,
      playerId: uid,
      player: playerName || 'Player',
      drillId,
      drillTitle,
      dueDate,
      status: 'pending',
      assignedBy: request.auth.uid,
      assignedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    count++;
  }

  if (count === 0) {
    throw new HttpsError(
        'failed-precondition',
        'No valid athlete accounts could be assigned.',
    );
  }

  await batch.commit();

  await db.collection('security_audit').add({
    action: 'secureAssignHomework',
    teamId,
    drillId,
    count,
    actorUid: request.auth.uid,
    at: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {ok: true, assignedCount: count};
});

/**
 * Epic 11: coach deletes an assignment row.
 */
exports.secureDeleteHomework = onCall({region: REGION}, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const data = request.data || {};
  const assignmentId =
      typeof data.assignmentId === 'string' ?
        data.assignmentId.trim() :
        '';
  if (!assignmentId) {
    throw new HttpsError('invalid-argument', 'assignmentId is required.');
  }
  const ref = db.collection('assignments').doc(assignmentId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Assignment not found.');
  }
  const teamId =
      typeof snap.data().teamId === 'string' ?
        snap.data().teamId.trim() :
        '';
  if (!teamId) {
    throw new HttpsError('failed-precondition', 'Invalid assignment.');
  }
  const {clubId} = await assertCanSecureAddPlayer(request, teamId);
  await assertClubSubscriptionWritable(clubId, request);
  await ref.delete();
  return {ok: true};
});

/**
 * Epic 11: player marks homework done without a training log (legacy / quick).
 */
exports.completeAssignmentStatus = onCall({region: REGION}, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const data = request.data || {};
  const assignmentId =
      typeof data.assignmentId === 'string' ?
        data.assignmentId.trim() :
        '';
  if (!assignmentId) {
    throw new HttpsError('invalid-argument', 'assignmentId is required.');
  }
  const ref = db.collection('assignments').doc(assignmentId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Assignment not found.');
  }
  const a = snap.data();
  const uid = request.auth.uid;
  let allowed = false;
  if (typeof a.playerId === 'string' && a.playerId === uid) {
    allowed = true;
  } else if (typeof a.player === 'string' && a.player.trim()) {
    const em = normEmail(request.auth.token.email);
    if (em) {
      const uSnap = await db.collection('users').doc(em).get();
      if (
        uSnap.exists &&
        typeof uSnap.data().playerName === 'string' &&
        uSnap.data().playerName.trim() === a.player.trim()
      ) {
        allowed = true;
      }
    }
  }
  if (!allowed) {
    throw new HttpsError(
        'permission-denied',
        'This assignment is not yours to complete.',
    );
  }
  await ref.update({
    status: 'completed',
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return {ok: true};
});

/**
 * Phase 2: aggregate team practice activity when a workout rep is logged
 * (player/parent submitWorkoutRep). Updates team_stats for accountability.
 */
exports.onRepCreatedUpdateTeamStats = onDocumentCreated(
    {
      document: 'reps/{repId}',
      region: REGION,
    },
    async (event) => {
      const snap = event.data;
      if (!snap) return;
      const data = snap.data();
      const teamId =
          typeof data.teamId === 'string' ? data.teamId.trim() : '';
      if (!teamId || teamId === 'admin') return;

      const statsRef = db.collection('team_stats').doc(teamId);
      const teamRef = db.collection('teams').doc(teamId);

      try {
        await db.runTransaction(async (transaction) => {
          const [statsSnap, teamSnap] = await Promise.all([
            transaction.get(statsRef),
            transaction.get(teamRef),
          ]);
          const clubId =
              teamSnap.exists &&
              typeof teamSnap.data().clubId === 'string' &&
              teamSnap.data().clubId.trim() ?
                teamSnap.data().clubId.trim() :
                null;

          const nowDate = new Date();
          const monthKey =
              `${nowDate.getUTCFullYear()}-` +
              `${String(nowDate.getUTCMonth() + 1).padStart(2, '0')}`;

          let totalSessions = 1;
          if (statsSnap.exists) {
            const sd = statsSnap.data() || {};
            const prevKey = sd.stats_month_key;
            if (prevKey === monthKey) {
              const prev =
                  typeof sd.total_sessions_this_month === 'number' &&
                  !Number.isNaN(sd.total_sessions_this_month) ?
                    sd.total_sessions_this_month :
                    0;
              totalSessions = prev + 1;
            }
          }

          transaction.set(
              statsRef,
              {
                teamId,
                clubId: clubId || null,
                last_activity_timestamp:
                  admin.firestore.FieldValue.serverTimestamp(),
                total_sessions_this_month: totalSessions,
                stats_month_key: monthKey,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              {merge: true},
          );
        });
      } catch (err) {
        logger.error('onRepCreatedUpdateTeamStats failed', err);
      }
    },
);

/**
 * Director / super_admin: oversight analytics (coach accountability buckets).
 * Directors are restricted to token clubId only (zero-trust).
 */
exports.getAccountabilityReport = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const role = request.auth.token.role || 'player';
  if (role !== 'director' && role !== 'super_admin') {
    throw new HttpsError(
        'permission-denied',
        'Only directors and application admins may view this report.',
    );
  }

  let clubId = '';
  if (role === 'super_admin') {
    const data = request.data || {};
    const raw =
        typeof data.clubId === 'string' ? data.clubId.trim() : '';
    if (!raw) {
      throw new HttpsError(
          'invalid-argument',
          'clubId is required for super admin.',
      );
    }
    clubId = raw;
  } else {
    clubId = request.auth.token.clubId || '';
    if (!clubId) {
      throw new HttpsError(
          'failed-precondition',
          'Your account is missing club scope.',
      );
    }
  }

  const teamsSnap = await db.collection('teams')
      .where('clubId', '==', clubId)
      .get();

  const nowMs = Date.now();
  const MS_PER_DAY = 86400000;

  const teams = [];

  for (const tDoc of teamsSnap.docs) {
    const teamId = tDoc.id;
    const td = tDoc.data() || {};
    const teamName =
        typeof td.name === 'string' && td.name.trim() ?
          td.name.trim() :
          teamId;
    const coachEmail =
        typeof td.coachEmail === 'string' && td.coachEmail.trim() ?
          td.coachEmail.trim().toLowerCase() :
          '';

    const statsSnap = await db.collection('team_stats').doc(teamId).get();
    let lastMs = null;
    let sessionsThisMonth = 0;
    if (statsSnap.exists) {
      const sd = statsSnap.data() || {};
      const ts = sd.last_activity_timestamp;
      if (ts && typeof ts.toMillis === 'function') {
        lastMs = ts.toMillis();
      }
      if (typeof sd.total_sessions_this_month === 'number' &&
          !Number.isNaN(sd.total_sessions_this_month)) {
        sessionsThisMonth = sd.total_sessions_this_month;
      }
    }

    let daysSince = null;
    if (lastMs != null) {
      daysSince = Math.floor((nowMs - lastMs) / MS_PER_DAY);
    }

    let status = 'at_risk';
    if (daysSince !== null && daysSince <= 3) {
      status = 'active';
    } else if (daysSince !== null && daysSince <= 6) {
      status = 'warning';
    } else {
      status = 'at_risk';
    }

    teams.push({
      teamId,
      teamName,
      coachEmail,
      daysSinceActivity: daysSince,
      lastActivityAt: lastMs != null ?
        new Date(lastMs).toISOString() :
        null,
      sessionsThisMonth,
      status,
    });
  }

  teams.sort((a, b) => {
    const order = {at_risk: 0, warning: 1, active: 2};
    const oa = order[a.status] !== undefined ? order[a.status] : 3;
    const ob = order[b.status] !== undefined ? order[b.status] : 3;
    if (oa !== ob) return oa - ob;
    return (a.teamName || '').localeCompare(b.teamName || '');
  });

  const summary = {
    active: teams.filter((t) => t.status === 'active').length,
    warning: teams.filter((t) => t.status === 'warning').length,
    atRisk: teams.filter((t) => t.status === 'at_risk').length,
  };

  return {
    ok: true,
    clubId,
    generatedAt: new Date().toISOString(),
    summary,
    teams,
  };
});

/**
 * Move a player (users + player_lookup + rosters) to another team/club.
 * Caller must be super_admin or club staff for the player's current club
 * (outbound) or the destination club (inbound).
 */
exports.registrarTransferPlayer = onCall({region: REGION}, async (request) => {
  const actor = assertClubStaff(request);
  const data = request.data || {};
  const playerEmail = normEmail(data.playerEmail);
  const targetTeamId =
      typeof data.targetTeamId === 'string' ? data.targetTeamId.trim() : '';
  if (!playerEmail || !targetTeamId) {
    throw new HttpsError(
        'invalid-argument',
        'playerEmail and targetTeamId are required.',
    );
  }

  const uRef = db.collection('users').doc(playerEmail);
  const plRef = db.collection('player_lookup').doc(playerEmail);
  const targetTeamRef = db.collection('teams').doc(targetTeamId);

  const txResult = await db.runTransaction(async (transaction) => {
    const uSnap = await transaction.get(uRef);
    const plSnap = await transaction.get(plRef);
    const tSnap = await transaction.get(targetTeamRef);
    if (!tSnap.exists) {
      throw new HttpsError('not-found', 'Target team not found.');
    }
    const newClubIdRaw = tSnap.data().clubId;
    const newClubId =
        typeof newClubIdRaw === 'string' && newClubIdRaw.trim() ?
          newClubIdRaw.trim() :
          '';
    if (!newClubId) {
      throw new HttpsError(
          'failed-precondition',
          'Target team missing clubId.',
      );
    }

    let playerName;
    let oldTeamId = null;
    let oldClubId = null;

    if (uSnap.exists) {
      const u = uSnap.data();
      playerName = u.playerName;
      oldTeamId = u.teamId || null;
      oldClubId = u.clubId || null;
    }
    if (!playerName && plSnap.exists) {
      const pl = plSnap.data();
      playerName = pl.playerName;
      oldTeamId = oldTeamId || pl.teamId || null;
    }
    if (!playerName) {
      throw new HttpsError(
          'not-found',
          'No player account or invite found for that email.',
      );
    }

    if (!oldClubId && oldTeamId) {
      const otSnap = await transaction.get(
          db.collection('teams').doc(oldTeamId),
      );
      if (otSnap.exists) {
        const oc = otSnap.data().clubId;
        oldClubId =
            typeof oc === 'string' && oc.trim() ? oc.trim() : null;
      }
    }

    if (actor.role !== 'super_admin') {
      const ac = actor.clubId;
      const canOut = oldClubId != null && ac === oldClubId;
      const canIn = ac === newClubId;
      if (!canOut && !canIn) {
        throw new HttpsError(
            'permission-denied',
            'Staff must belong to the player current club or destination club.',
        );
      }
    }

    const uClub = uSnap.exists ? (uSnap.data().clubId || null) : null;
    if (oldTeamId === targetTeamId &&
        (uClub === newClubId || !uSnap.exists)) {
      return {
        noop: true,
        playerEmail,
        targetTeamId,
        playerName,
        newClubId,
        oldTeamId: oldTeamId || null,
        oldClubId: oldClubId || null,
      };
    }

    const oldRosterRef = oldTeamId ?
      db.collection('rosters').doc(oldTeamId) :
      null;
    const newRosterRef = db.collection('rosters').doc(targetTeamId);

    const oldRSnap = oldRosterRef && oldTeamId !== targetTeamId ?
      await transaction.get(oldRosterRef) :
      null;
    const newRSnap = await transaction.get(newRosterRef);

    const oldPlayers = oldRSnap && oldRSnap.exists ?
      [...(oldRSnap.data().players || [])] :
      [];
    const newPlayers = newRSnap.exists ?
      [...(newRSnap.data().players || [])] :
      [];
    const newJerseys = newRSnap.exists ?
      {...(newRSnap.data().jerseys || {})} :
      {};

    const wasOnOld = oldPlayers.includes(playerName);
    const alreadyOnNew = newPlayers.includes(playerName);

    const newTeamEntRef = db.collection('team_entitlements').doc(targetTeamId);
    const newTESnap = await transaction.get(newTeamEntRef);

    if (newTESnap.exists && !alreadyOnNew && oldTeamId !== targetTeamId) {
      const net = newTESnap.data() || {};
      const teClub =
          typeof net.clubId === 'string' ? net.clubId.trim() : '';
      if (teClub && teClub !== newClubId) {
        throw new HttpsError(
            'failed-precondition',
            'Target team scope mismatch.',
        );
      }
      const tLimit =
          typeof net.seats_limit === 'number' &&
          !Number.isNaN(net.seats_limit) ?
            net.seats_limit :
            0;
      const tActive =
          typeof net.active_seats === 'number' &&
          !Number.isNaN(net.active_seats) ?
            net.active_seats :
            0;
      if (tActive >= tLimit) {
        throw new HttpsError('failed-precondition', 'team-full');
      }
    }

    const sameClub = oldClubId === newClubId;

    if (!sameClub && !alreadyOnNew) {
      const newEntSnap = await transaction.get(
          db.collection('license_entitlements').doc(newClubId),
      );
      if (!newEntSnap.exists) {
        throw new HttpsError(
            'failed-precondition',
            'Destination club license is not configured.',
        );
      }
      const ne = newEntSnap.data() || {};
      const nLimit =
          typeof ne.seats_limit === 'number' &&
          !Number.isNaN(ne.seats_limit) ?
            ne.seats_limit :
            0;
      const nActive =
          typeof ne.active_seats === 'number' &&
          !Number.isNaN(ne.active_seats) ?
            ne.active_seats :
            0;
      const nRes =
          typeof ne.reserved_seats === 'number' &&
          !Number.isNaN(ne.reserved_seats) ?
            ne.reserved_seats :
            0;
      if (nActive + nRes >= nLimit) {
        throw new HttpsError(
            'resource-exhausted',
            'Licensed roster seats are fully allocated. ' +
            'Contact your Director to upgrade.',
        );
      }
    }

    if (oldRosterRef &&
        oldTeamId !== targetTeamId &&
        oldRSnap &&
        oldRSnap.exists) {
      const oj = {...(oldRSnap.data().jerseys || {})};
      if (Object.prototype.hasOwnProperty.call(oj, playerName)) {
        delete oj[playerName];
      }
      const filtered = oldPlayers.filter((p) => p !== playerName);
      transaction.set(
          oldRosterRef,
          {players: filtered, jerseys: oj},
          {merge: true},
      );
    }

    const mergedNewPlayers = alreadyOnNew ?
      newPlayers :
      [...newPlayers, playerName];
    transaction.set(
        newRosterRef,
        {players: mergedNewPlayers, jerseys: newJerseys},
        {merge: true},
    );

    if (uSnap.exists) {
      transaction.set(
          uRef,
          {teamId: targetTeamId, clubId: newClubId},
          {merge: true},
      );
    }
    transaction.set(
        plRef,
        {
          teamId: targetTeamId,
          playerName,
          clubId: newClubId,
        },
        {merge: true},
    );

    const oldTeamEntRef =
        oldTeamId && oldTeamId !== targetTeamId ?
          db.collection('team_entitlements').doc(oldTeamId) :
          null;

    if (sameClub) {
      if (wasOnOld && oldTeamEntRef) {
        const oSnap = await transaction.get(oldTeamEntRef);
        if (oSnap.exists) {
          const od = oSnap.data() || {};
          const a =
              typeof od.active_seats === 'number' &&
              !Number.isNaN(od.active_seats) ?
                od.active_seats :
                0;
          transaction.update(oldTeamEntRef, {
            active_seats: Math.max(0, a - 1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: 'system:registrarTransferPlayer',
          });
        }
      }
      if (!alreadyOnNew && newTESnap.exists) {
        const net = newTESnap.data() || {};
        const a =
            typeof net.active_seats === 'number' &&
            !Number.isNaN(net.active_seats) ?
              net.active_seats :
              0;
        transaction.update(newTeamEntRef, {
          active_seats: a + 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: 'system:registrarTransferPlayer',
        });
      }
    } else {
      if (wasOnOld && oldClubId) {
        const oldEntRef = db.collection('license_entitlements').doc(oldClubId);
        const oeSnap = await transaction.get(oldEntRef);
        if (oeSnap.exists) {
          const oe = oeSnap.data() || {};
          const a =
              typeof oe.active_seats === 'number' &&
              !Number.isNaN(oe.active_seats) ?
                oe.active_seats :
                0;
          transaction.update(oldEntRef, {
            active_seats: Math.max(0, a - 1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: 'system:registrarTransferPlayer',
          });
        }
      }
      if (!alreadyOnNew) {
        transaction.update(
            db.collection('license_entitlements').doc(newClubId),
            {
              active_seats: admin.firestore.FieldValue.increment(1),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedBy: 'system:registrarTransferPlayer',
            },
        );
      }
      if (wasOnOld && oldTeamEntRef) {
        const oSnap = await transaction.get(oldTeamEntRef);
        if (oSnap.exists) {
          const od = oSnap.data() || {};
          const a =
              typeof od.active_seats === 'number' &&
              !Number.isNaN(od.active_seats) ?
                od.active_seats :
                0;
          transaction.update(oldTeamEntRef, {
            active_seats: Math.max(0, a - 1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: 'system:registrarTransferPlayer',
          });
        }
      }
      if (!alreadyOnNew && newTESnap.exists) {
        const net = newTESnap.data() || {};
        const a =
            typeof net.active_seats === 'number' &&
            !Number.isNaN(net.active_seats) ?
              net.active_seats :
              0;
        transaction.update(newTeamEntRef, {
          active_seats: a + 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: 'system:registrarTransferPlayer',
        });
      }
    }

    return {
      noop: false,
      playerEmail,
      targetTeamId,
      playerName,
      newClubId,
      oldTeamId: oldTeamId || null,
      oldClubId: oldClubId || null,
    };
  });

  if (txResult.noop) {
    return {
      ok: true,
      noop: true,
      playerEmail: txResult.playerEmail,
      targetTeamId: txResult.targetTeamId,
      playerName: txResult.playerName,
    };
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  await db.collection('security_audit').doc().set({
    action: 'registrarTransferPlayer',
    playerEmail: txResult.playerEmail,
    playerName: txResult.playerName,
    oldTeamId: txResult.oldTeamId || null,
    oldClubId: txResult.oldClubId || null,
    targetTeamId: txResult.targetTeamId,
    newClubId: txResult.newClubId,
    actorEmail: actor.email || null,
    actorUid: request.auth.uid,
    at: now,
  });

  return {
    ok: true,
    playerEmail: txResult.playerEmail,
    targetTeamId: txResult.targetTeamId,
    newClubId: txResult.newClubId,
    playerName: txResult.playerName,
  };
});

/**
 * Director / super_admin: queue COPPA-style purge for an offboarded minor.
 * Jobs include expireAt; purgeExpiredMinorData runs daily when due.
 * Legacy rows without expireAt are still handled by processMinorRetentionQueue.
 */
exports.enqueueMinorRetentionPurge = onCall({region: REGION}, async (req) => {
  const actor = assertDirectorOrSuper(req);
  const data = req.data || {};
  const playerEmail = normEmail(data.playerEmail);
  if (!playerEmail) {
    throw new HttpsError(
        'invalid-argument',
        'playerEmail is required.',
    );
  }

  const uRef = db.collection('users').doc(playerEmail);
  const uSnap = await uRef.get();
  if (!uSnap.exists) {
    throw new HttpsError('not-found', 'User not found.');
  }
  const u = uSnap.data();
  if (actor.role === 'director') {
    if (!actor.clubId || u.clubId !== actor.clubId) {
      throw new HttpsError('permission-denied', 'Out of club scope.');
    }
  }
  if (u.isMinor !== true && actor.role !== 'super_admin') {
    throw new HttpsError(
        'failed-precondition',
        'Retention queue is for minors; admins may override.',
    );
  }

  const dup = await db.collection('minor_retention_queue')
      .where('playerEmail', '==', playerEmail)
      .where('status', '==', 'pending')
      .limit(1)
      .get();
  if (!dup.empty) {
    return {ok: true, duplicate: true, playerEmail};
  }

  const rawDays = data.purgeAfterDays;
  let days = 30;
  if (typeof rawDays === 'number' && Number.isFinite(rawDays)) {
    days = Math.max(0, Math.min(Math.floor(rawDays), 3650));
  }
  const expireAt = admin.firestore.Timestamp.fromMillis(
      Date.now() + days * 86400000,
  );

  const now = admin.firestore.FieldValue.serverTimestamp();
  await db.collection('minor_retention_queue').add({
    playerEmail,
    clubId: u.clubId || null,
    status: 'pending',
    expireAt,
    enqueuedAt: now,
    actorEmail: actor.email || null,
    actorUid: req.auth.uid,
  });

  await db.collection('security_audit').add({
    action: 'enqueueMinorRetentionPurge',
    playerEmail,
    clubId: u.clubId || null,
    actorEmail: actor.email || null,
    actorUid: req.auth.uid,
    at: now,
  });

  return {ok: true, playerEmail};
});

/**
 * @param {admin.firestore.QueryDocumentSnapshot} jobSnap Queue row.
 * @param {boolean} deleteQueueDoc If true, delete job doc after purge (TTL).
 */
/**
 * Paginated batch-delete for any Firestore query result set.
 * Firestore batches are capped at 500 writes; this helper splits large
 * query results into sequential batches so the purge can never throw a
 * "batch too large" error regardless of collection size.
 *
 * @param {FirebaseFirestore.Query} q - The query whose matching docs to delete.
 * @param {number} [pageSize=400] - Documents per batch (must be â‰¤ 500).
 * @return {Promise<number>} Total number of documents deleted.
 */
async function paginatedBatchDelete(q, pageSize = 400) {
  if (pageSize > 499) pageSize = 400;
  let totalDeleted = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await q.limit(pageSize).get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    totalDeleted += snap.docs.length;

    if (snap.docs.length < pageSize) break;
  }

  return totalDeleted;
}

/**
 * Sprint 1.2 hardened purge: deletes the minor athlete's training data,
 * severs roster/household linkages, anonymizes the users doc, and
 * anonymizes the Firebase Auth record to satisfy COPPA 2026 / Privacy Shield.
 *
 * Scope of deletion:
 *  - passports/{email}
 *  - player_lookup/{email}
 *  - workout_logs subcollection on users/{email}
 *  - reps (where playerId == email)
 *  - player_stats (where playerId == email)
 *  - evaluations (where playerEmail == email)
 *  - trials (where playerEmail == email)
 *  - assignments (where playerId == email)
 *  - Roster reference scrub
 *  - Household playerEmails/playerNames scrub
 *  - users/{email} doc â€” field-level anonymization
 *  - Firebase Auth record â€” email, displayName, photoURL cleared
 */
async function runMinorRetentionPurgeJob(jobSnap, deleteQueueDoc) {
  const jobRef = jobSnap.ref;
  const job = jobSnap.data();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const email = typeof job.playerEmail === 'string' ?
    job.playerEmail.trim().toLowerCase() :
    '';
  if (!email) {
    if (deleteQueueDoc) {
      await jobRef.delete();
    } else {
      await jobRef.update({
        status: 'failed',
        completedAt: now,
        error: 'missing_playerEmail',
      });
    }
    return;
  }

  try {
    const uRef = db.collection('users').doc(email);
    const uSnap = await uRef.get();
    if (!uSnap.exists) {
      if (deleteQueueDoc) {
        await jobRef.delete();
      } else {
        await jobRef.update({
          status: 'completed',
          completedAt: now,
          note: 'user_already_deleted',
        });
      }
      return;
    }

    const u = uSnap.data();
    if (job.clubId && u.clubId && job.clubId !== u.clubId) {
      await jobRef.update({
        status: 'failed',
        completedAt: now,
        error: 'club_mismatch',
      });
      return;
    }

    const playerName = u.playerName || null;
    const teamId = u.teamId || null;
    const householdId = u.householdId || null;

    // â”€â”€ Phase 1: query-based paginated deletes for large collections â”€â”€â”€â”€â”€â”€â”€â”€
    const playerIdField = 'playerId';
    const playerEmailField = 'playerEmail';

    const [repsDeleted, statsDeleted, evalsDeleted, trialsDeleted, assignsDeleted] =
      await Promise.all([
        paginatedBatchDelete(
            db.collection('reps').where(playerIdField, '==', email),
        ),
        paginatedBatchDelete(
            db.collection('player_stats').where(playerIdField, '==', email),
        ),
        paginatedBatchDelete(
            db.collection('evaluations').where(playerEmailField, '==', email),
        ),
        paginatedBatchDelete(
            db.collection('trials').where(playerEmailField, '==', email),
        ),
        paginatedBatchDelete(
            db.collection('assignments').where(playerIdField, '==', email),
        ),
      ]);

    // â”€â”€ Phase 2: workout_logs subcollection on the users doc â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const workoutLogsDeleted = await paginatedBatchDelete(
        uRef.collection('workout_logs'),
    );

    // â”€â”€ Phase 3: atomic batch for documents with known IDs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const batch = db.batch();

    batch.delete(db.collection('passports').doc(email));
    batch.delete(db.collection('player_lookup').doc(email));

    if (teamId && teamId !== 'admin' && playerName) {
      const rRef = db.collection('rosters').doc(teamId);
      const rSnap = await rRef.get();
      if (rSnap.exists) {
        const d = rSnap.data();
        const players = (d.players || []).filter((p) => p !== playerName);
        const jerseys = {...(d.jerseys || {})};
        delete jerseys[playerName];
        batch.set(rRef, {players, jerseys}, {merge: true});
      }
    }

    if (householdId) {
      const hRef = db.collection('households').doc(householdId);
      const hSnap = await hRef.get();
      if (hSnap.exists) {
        const hd = hSnap.data();
        const pEmails = (hd.playerEmails || [])
            .filter((e) => (e || '').toLowerCase() !== email);
        const pNames = (hd.playerNames || [])
            .filter((n) => n !== playerName);
        batch.set(hRef, {
          playerEmails: pEmails,
          playerNames: pNames,
          updatedAt: now,
        }, {merge: true});
      }
    }

    // Anonymize the users doc (retain the doc so auth-state queries don't 404).
    batch.set(uRef, {
      playerName: '[removed]',
      teamId: null,
      clubId: null,
      role: 'player',
      householdId: admin.firestore.FieldValue.delete(),
      dateOfBirth: admin.firestore.FieldValue.delete(),
      isMinor: admin.firestore.FieldValue.delete(),
      vpcStatus: 'not_required',
      privacyProfile: admin.firestore.FieldValue.delete(),
      telemetryOptIn: admin.firestore.FieldValue.delete(),
      settingsUpdatedAt: admin.firestore.FieldValue.delete(),
      biometricOrVideoConsentAt: admin.firestore.FieldValue.delete(),
      consentPolicyVersion: admin.firestore.FieldValue.delete(),
      retentionPurgedAt: now,
    }, {merge: true});

    if (deleteQueueDoc) {
      batch.delete(jobRef);
    } else {
      batch.set(jobRef, {
        status: 'completed',
        completedAt: now,
      }, {merge: true});
    }

    await batch.commit();

    // â”€â”€ Phase 4: anonymize the Firebase Auth record â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // This is outside the batch (Admin SDK auth calls are not transactional),
    // but happens after the Firestore batch to ensure Firestore is consistent
    // before the auth record is modified.
    let authAnonymized = false;
    try {
      const authUser = await admin.auth().getUserByEmail(email);
      const anonymizedEmail = `purged-${authUser.uid}@retained.invalid`;
      await admin.auth().updateUser(authUser.uid, {
        email: anonymizedEmail,
        displayName: '[removed]',
        photoURL: null,
        disabled: true,
      });
      authAnonymized = true;
    } catch (authErr) {
      // If the user doesn't exist in Auth (already deleted), that is acceptable.
      if (authErr.code !== 'auth/user-not-found') {
        logger.warn(
            `minor_retention_queue: auth anonymization skipped for ${email}`,
            authErr.message,
        );
      }
    }

    logger.info(
        `minor_retention_queue: purged ${email} | ` +
        `reps=${repsDeleted} stats=${statsDeleted} evals=${evalsDeleted} ` +
        `trials=${trialsDeleted} assigns=${assignsDeleted} ` +
        `workoutLogs=${workoutLogsDeleted} authAnonymized=${authAnonymized}`,
    );
  } catch (err) {
    logger.error(`minor_retention_queue: failed for ${email}`, err);
    await jobRef.update({
      status: 'failed',
      completedAt: now,
      error: err.message || String(err),
    });
  }
}

/**
 * Legacy / immediate: pending jobs with no expireAt (pre-TTL enqueue).
 */
exports.processMinorRetentionQueue = onSchedule('every 24 hours', async () => {
  const pending = await db.collection('minor_retention_queue')
      .where('status', '==', 'pending')
      .limit(30)
      .get();

  if (pending.empty) {
    logger.info('minor_retention_queue: no pending jobs.');
    return null;
  }

  let ran = 0;
  for (const jobSnap of pending.docs) {
    const job = jobSnap.data();
    if (job.expireAt != null) continue;
    await runMinorRetentionPurgeJob(jobSnap, false);
    ran++;
  }
  if (ran === 0) {
    logger.info('minor_retention_queue: no legacy (non-TTL) jobs.');
  }
  return null;
});

/**
 * Epic 1.3: TTL-based purge when expireAt <= now (COPPA retention).
 */
exports.purgeExpiredMinorData = onSchedule('every 24 hours', async () => {
  const nowTs = admin.firestore.Timestamp.now();
  const snap = await db.collection('minor_retention_queue')
      .where('status', '==', 'pending')
      .where('expireAt', '<=', nowTs)
      .limit(25)
      .get();

  if (snap.empty) {
    logger.info('minor_retention_queue: no expired TTL jobs.');
    return null;
  }

  for (const doc of snap.docs) {
    await runMinorRetentionPurgeJob(doc, true);
  }
  return null;
});

// ---------------------------------------------------------------------------
// Epic 2.1: Affinity-ready webhook (HTTP) + mock callable. Fail-closed
// eligibility; client writes forbidden on integration collections (rules).
// ---------------------------------------------------------------------------

/**
 * @param {number} status
 * @param {string} msg
 */
function throwAffinityHttp(status, msg) {
  const err = new Error(msg);
  err.status = status;
  throw err;
}

/**
 * @param {Buffer} rawBuffer
 * @param {string|undefined} signatureHeader Header value after colon;
 *     expected form sha256=hex
 * @param {string} secret
 */
function verifyAffinityHmac(rawBuffer, signatureHeader, secret) {
  const expected = crypto.createHmac('sha256', secret)
      .update(rawBuffer)
      .digest();
  const sig = (signatureHeader || '').trim();
  const prefix = 'sha256=';
  if (!sig.startsWith(prefix)) {
    throw new Error('Invalid signature header (expected sha256=hex)');
  }
  let provided;
  try {
    provided = Buffer.from(sig.slice(prefix.length), 'hex');
  } catch (e) {
    throw new Error('Invalid signature hex');
  }
  if (provided.length !== expected.length ||
      !crypto.timingSafeEqual(provided, expected)) {
    throw new Error('HMAC verification failed');
  }
}

/**
 * @param {string} eventId
 * @return {string}
 */
function sanitizeAffinityEventDocId(eventId) {
  const s = String(eventId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const out = s.slice(0, 400);
  return out || 'invalid_event';
}

/**
 * @param {string} teamId
 * @param {string|null} extId
 * @param {string|null} emailKey
 * @param {string} displayName
 * @return {string}
 */
function makeEligibilityDocId(teamId, extId, emailKey, displayName) {
  let part = '';
  if (extId) part = 'ext_' + extId;
  else if (emailKey) part = 'em_' + emailKey;
  else {
    const h = crypto.createHash('sha256')
        .update(String(displayName || '') + '|' + teamId)
        .digest('hex')
        .slice(0, 16);
    part = 'nm_' + h;
  }
  const safe = part.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 220);
  return ('elig_' + teamId + '_' + safe).slice(0, 750);
}

/**
 * @param {string} teamId
 * @param {string|null} extId
 * @param {string|null} emailKey
 * @param {string} displayName
 * @return {string}
 */
function makeRosterLinkDocId(teamId, extId, emailKey, displayName) {
  let part = '';
  if (extId) part = 'ext_' + extId;
  else if (emailKey) part = 'em_' + emailKey;
  else {
    const h = crypto.createHash('sha256')
        .update(String(displayName || '') + '|' + teamId)
        .digest('hex')
        .slice(0, 16);
    part = 'nm_' + h;
  }
  const safe = part.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 220);
  return ('rlink_' + teamId + '_' + safe).slice(0, 750);
}

/**
 * @param {string} sidCode
 * @param {string} [seasonExternalId]
 * @return {!Promise<!Object>}
 */
async function resolveTeamBySidCode(sidCode, seasonExternalId) {
  const code = typeof sidCode === 'string' ? sidCode.trim() : '';
  if (!code) {
    throwAffinityHttp(400, 'sidCode is required in payload');
  }
  const snap = await db.collection('teams')
      .where('externalSidCode', '==', code)
      .limit(25)
      .get();
  if (snap.empty) {
    throwAffinityHttp(
        404,
        'No team found with externalSidCode; set teams.externalSidCode first.',
    );
  }
  if (snap.size === 1) {
    const d = snap.docs[0];
    const t = d.data();
    return {teamId: d.id, clubId: t.clubId || null};
  }
  const season = typeof seasonExternalId === 'string' ?
    seasonExternalId.trim() :
    '';
  if (!season) {
    throwAffinityHttp(
        409,
        'Multiple teams match sidCode; include seasonExternalId in payload.',
    );
  }
  for (const d of snap.docs) {
    const t = d.data();
    if (t.externalSeasonId === season) {
      return {teamId: d.id, clubId: t.clubId || null};
    }
  }
  throwAffinityHttp(
      409,
      'Multiple teams match sidCode; no team has matching externalSeasonId.',
  );
}

/**
 * Fail-closed eligibility row for one player payload object.
 * @param {Record<string, unknown>} p
 * @param {string} teamId
 * @param {string|null} clubId
 * @param {string} seasonExternalId
 * @param {string} sidCode
 * @param {string} sourceTag
 * @param {string} eventId
 * @return {!Promise<!Object>}
 */
async function buildEligibilityRow(
    p, teamId, clubId, seasonExternalId, sidCode, sourceTag, eventId,
) {
  const emailKey = normEmail(
      typeof p.email === 'string' ? p.email : null,
  );
  const extId =
      typeof p.externalMemberId === 'string' && p.externalMemberId.trim() ?
        p.externalMemberId.trim() :
        null;
  const displayName =
      typeof p.displayName === 'string' ? p.displayName.trim() : '';

  const identityVerified = !!(emailKey || extId);
  const identityStatus = identityVerified ? 'verified' : 'unverified';

  const safeSportVerified =
      p.safeSport === true || p.safeSportVerified === true;
  const concussionClearanceVerified =
      p.concussionClearance === true ||
      p.concussionClearanceVerified === true;

  const rawGb =
      typeof p.governingBodyStatus === 'string' ?
        p.governingBodyStatus.trim().toLowerCase() :
        '';
  let governingBodyStatus = 'unknown';
  if (rawGb === 'clear') governingBodyStatus = 'clear';
  else if (rawGb === 'red_card' || rawGb === 'red card') {
    governingBodyStatus = 'red_card';
  } else if (rawGb === 'suspended') governingBodyStatus = 'suspended';
  const governingBodyClear = governingBodyStatus === 'clear';

  let vpcSatisfied = false;
  if (!identityVerified) {
    vpcSatisfied = false;
  } else if (emailKey) {
    const uSnap = await db.collection('users').doc(emailKey).get();
    if (!uSnap.exists) {
      vpcSatisfied = false;
    } else {
      const ud = uSnap.data();
      if (ud.isMinor === true) {
        vpcSatisfied = ud.vpcStatus === 'verified';
      } else {
        vpcSatisfied = true;
      }
    }
  } else {
    vpcSatisfied = false;
  }

  const eligible =
      safeSportVerified &&
      concussionClearanceVerified &&
      governingBodyClear &&
      vpcSatisfied &&
      identityVerified;

  const reasons = [];
  if (!identityVerified) reasons.push('identity_unverified');
  if (!safeSportVerified) reasons.push('safesport_not_verified');
  if (!concussionClearanceVerified) {
    reasons.push('concussion_not_verified');
  }
  if (!governingBodyClear) reasons.push('governing_body_not_clear');
  if (!vpcSatisfied) reasons.push('vpc_not_satisfied');

  const eligibilityDocId = makeEligibilityDocId(
      teamId, extId, emailKey, displayName,
  );
  const now = admin.firestore.FieldValue.serverTimestamp();
  const eligibilityData = {
    teamId,
    clubId: clubId || null,
    seasonExternalId: seasonExternalId || null,
    sidCode,
    externalMemberId: extId,
    emailKey: emailKey || null,
    displayName: displayName || null,
    safeSportVerified,
    concussionClearanceVerified,
    governingBodyClear,
    governingBodyStatus,
    vpcSatisfied,
    identityVerified,
    identityStatus,
    eligible,
    ineligibilityReasons: reasons,
    source: sourceTag,
    lastEventId: eventId,
    updatedAt: now,
  };

  const linkId = makeRosterLinkDocId(teamId, extId, emailKey, displayName);
  const rosterLinkData = {
    id: linkId,
    data: {
      teamId,
      clubId: clubId || null,
      seasonExternalId: seasonExternalId || null,
      sidCode,
      externalMemberId: extId,
      emailKey: emailKey || null,
      displayName: displayName || null,
      updatedAt: now,
      lastEventId: eventId,
    },
  };

  return {eligibilityDocId, eligibilityData, rosterLinkData};
}

/**
 * Recompute vpc + aggregate eligibility from stored doc fields (post-override).
 * @param {Record<string, unknown>} d
 * @return {!Promise<{vpcSatisfied: boolean, eligible: boolean,
 *     ineligibilityReasons: string[]}>}
 */
async function recomputeEligibilityDerived(d) {
  const identityVerified = d.identityVerified === true;
  const safeSportVerified = d.safeSportVerified === true;
  const concussionClearanceVerified = d.concussionClearanceVerified === true;
  const governingBodyClear = d.governingBodyClear === true;
  const emailKey = typeof d.emailKey === 'string' ? d.emailKey : null;

  let vpcSatisfied = false;
  if (!identityVerified) {
    vpcSatisfied = false;
  } else if (emailKey) {
    const uSnap = await db.collection('users').doc(emailKey).get();
    if (!uSnap.exists) {
      vpcSatisfied = false;
    } else {
      const ud = uSnap.data();
      if (ud.isMinor === true) {
        vpcSatisfied = ud.vpcStatus === 'verified';
      } else {
        vpcSatisfied = true;
      }
    }
  } else {
    vpcSatisfied = false;
  }

  const eligible =
      safeSportVerified &&
      concussionClearanceVerified &&
      governingBodyClear &&
      vpcSatisfied &&
      identityVerified;

  const reasons = [];
  if (!identityVerified) reasons.push('identity_unverified');
  if (!safeSportVerified) reasons.push('safesport_not_verified');
  if (!concussionClearanceVerified) {
    reasons.push('concussion_not_verified');
  }
  if (!governingBodyClear) reasons.push('governing_body_not_clear');
  if (!vpcSatisfied) reasons.push('vpc_not_satisfied');

  return {vpcSatisfied, eligible, ineligibilityReasons: reasons};
}

/**
 * Director / super_admin: manual SafeSport / concussion / identity flags.
 */
exports.directorOverrideEligibility = onCall(
    {region: REGION},
    async (request) => {
      const actor = assertDirectorOrSuper(request);
      if (actor.role === 'director' && !actor.clubId) {
        throw new HttpsError(
            'failed-precondition',
            'Your account is missing club scope; sign out and back in.',
        );
      }
      const data = request.data || {};
      const eligibilityDocId =
          typeof data.eligibilityDocId === 'string' ?
            data.eligibilityDocId.trim() :
            '';
      if (!eligibilityDocId) {
        throw new HttpsError(
            'invalid-argument',
            'eligibilityDocId is required.',
        );
      }

      const ref = db.collection('player_eligibility').doc(eligibilityDocId);
      const snap = await ref.get();
      if (!snap.exists) {
        throw new HttpsError('not-found', 'Eligibility record not found.');
      }
      const cur = snap.data();
      const docClubId = cur.clubId || null;
      if (actor.role === 'director') {
        if (!docClubId || actor.clubId !== docClubId) {
          throw new HttpsError(
              'permission-denied',
              'You can only override eligibility for your club.',
          );
        }
      }

      /** @type {Record<string, boolean>} */
      const changes = {};
      if (data.safeSportVerified !== undefined) {
        if (typeof data.safeSportVerified !== 'boolean') {
          throw new HttpsError(
              'invalid-argument',
              'safeSportVerified must be a boolean.',
          );
        }
        changes.safeSportVerified = data.safeSportVerified;
      }
      if (data.concussionClearanceVerified !== undefined) {
        if (typeof data.concussionClearanceVerified !== 'boolean') {
          throw new HttpsError(
              'invalid-argument',
              'concussionClearanceVerified must be a boolean.',
          );
        }
        changes.concussionClearanceVerified =
            data.concussionClearanceVerified;
      }
      if (data.identityVerified !== undefined) {
        if (typeof data.identityVerified !== 'boolean') {
          throw new HttpsError(
              'invalid-argument',
              'identityVerified must be a boolean.',
          );
        }
        changes.identityVerified = data.identityVerified;
      }
      if (Object.keys(changes).length === 0) {
        throw new HttpsError(
            'invalid-argument',
            'Provide at least one of safeSportVerified, ' +
            'concussionClearanceVerified, identityVerified.',
        );
      }

      /** @type {Record<string, unknown>} */
      const merged = {...cur, ...changes};
      merged.identityVerified = merged.identityVerified === true;
      merged.safeSportVerified = merged.safeSportVerified === true;
      merged.concussionClearanceVerified =
          merged.concussionClearanceVerified === true;
      merged.governingBodyClear = merged.governingBodyClear === true;
      if (changes.identityVerified !== undefined) {
        merged.identityStatus =
            merged.identityVerified === true ? 'verified' : 'unverified';
      }

      const derived = await recomputeEligibilityDerived(merged);
      const now = admin.firestore.FieldValue.serverTimestamp();

      /** @type {Record<string, unknown>} */
      const writePayload = {
        ...changes,
        vpcSatisfied: derived.vpcSatisfied,
        eligible: derived.eligible,
        ineligibilityReasons: derived.ineligibilityReasons,
        directorEligibilityOverrideAt: now,
        directorEligibilityOverrideBy:
            normEmail(actor.email) || actor.email || null,
        updatedAt: now,
      };
      if (changes.identityVerified !== undefined) {
        writePayload.identityStatus = merged.identityStatus;
      }

      await ref.set(writePayload, {merge: true});

      await db.collection('security_audit').add({
        action: 'directorOverrideEligibility',
        eligibilityDocId,
        teamId: cur.teamId || null,
        clubId: docClubId,
        actorEmail: actor.email || null,
        actorUid: request.auth.uid,
        changes,
        resultingEligible: derived.eligible,
        at: now,
      });

      return {
        ok: true,
        eligibilityDocId,
        eligible: derived.eligible,
        vpcSatisfied: derived.vpcSatisfied,
        ineligibilityReasons: derived.ineligibilityReasons,
      };
    },
);

/**
 * @param {Record<string, unknown>} payload
 * @param {{sourceTag: string, rawString: string}} opts
 * @return {!Promise<!Object>}
 */
async function runAffinityIngestCore(payload, opts) {
  const eventId =
      typeof payload.eventId === 'string' ? payload.eventId.trim() : '';
  if (!eventId) {
    throwAffinityHttp(400, 'eventId is required');
  }
  const sidCode =
      typeof payload.sidCode === 'string' ? payload.sidCode.trim() : '';
  const seasonExternalId =
      typeof payload.seasonExternalId === 'string' ?
        payload.seasonExternalId.trim() :
        '';
  const players = Array.isArray(payload.players) ? payload.players : [];
  if (players.length > 120) {
    throwAffinityHttp(400, 'At most 120 players per payload');
  }

  const eventDocId = sanitizeAffinityEventDocId(eventId);
  const eventRef = db.collection('affinity_webhook_events').doc(eventDocId);

  const duplicate = await db.runTransaction(async (t) => {
    const es = await t.get(eventRef);
    if (es.exists) return true;
    t.set(eventRef, {
      eventId,
      status: 'processing',
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: opts.sourceTag,
    });
    return false;
  });

  if (duplicate) {
    return {ok: true, duplicate: true, eventId};
  }

  const rawRef = db.collection('affinity_ingest_raw').doc();
  await rawRef.set({
    eventId,
    bodyPreview: (opts.rawString || '').slice(0, 80000),
    byteLength: Buffer.byteLength(opts.rawString || '', 'utf8'),
    receivedAt: admin.firestore.FieldValue.serverTimestamp(),
    source: opts.sourceTag,
  });

  let teamId;
  let clubId;
  try {
    const resolved = await resolveTeamBySidCode(sidCode, seasonExternalId);
    teamId = resolved.teamId;
    clubId = resolved.clubId;
  } catch (err) {
    await eventRef.set({
      status: 'failed',
      error: err.message || String(err),
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});
    throw err;
  }

  const built = [];
  for (const p of players) {
    if (!p || typeof p !== 'object') continue;
    built.push(
        await buildEligibilityRow(
            /** @type {Record<string, unknown>} */ (p),
            teamId,
            clubId,
            seasonExternalId,
            sidCode,
            opts.sourceTag,
            eventId,
        ),
    );
  }

  let batch = db.batch();
  let ops = 0;
  for (const row of built) {
    batch.set(
        db.collection('player_eligibility').doc(row.eligibilityDocId),
        row.eligibilityData,
        {merge: true},
    );
    ops++;
    batch.set(
        db.collection('roster_links').doc(row.rosterLinkData.id),
        row.rosterLinkData.data,
        {merge: true},
    );
    ops++;
    if (ops >= 450) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) {
    await batch.commit();
  }

  await eventRef.set({
    status: 'completed',
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
    teamId,
    playerCount: built.length,
    ingestRawId: rawRef.id,
  }, {merge: true});

  return {
    ok: true,
    eventId,
    teamId,
    playerCount: built.length,
  };
}

/**
 * POST JSON body. Header: X-SSTRACKER-Signature: sha256=<hmac-sha256-hex>
 * over raw bytes. Requires teams.externalSidCode (and optional
 * teams.externalSeasonId when multiple teams share a sid).
 */
exports.affinityWebhook = onRequest(
    {
      region: REGION,
      secrets: [AFFINITY_WEBHOOK_HMAC_SECRET],
      invoker: 'public',
    },
    async (req, res) => {
      if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
      }
      const secret = AFFINITY_WEBHOOK_HMAC_SECRET.value();
      const raw = req.rawBody;
      if (!raw || !Buffer.isBuffer(raw)) {
        res.status(400).json({error: 'Missing raw body buffer'});
        return;
      }
      try {
        verifyAffinityHmac(raw, req.get('X-SSTRACKER-Signature'), secret);
      } catch (e) {
        logger.warn('affinityWebhook: bad signature', e);
        res.status(401).json({error: 'Unauthorized'});
        return;
      }
      let payload;
      try {
        payload = JSON.parse(raw.toString('utf8'));
      } catch (e) {
        res.status(400).json({error: 'Invalid JSON'});
        return;
      }
      try {
        const out = await runAffinityIngestCore(
            /** @type {Record<string, unknown>} */ (payload),
            {
              sourceTag: 'affinity_webhook',
              rawString: raw.toString('utf8'),
            },
        );
        res.status(200).json(out);
      } catch (err) {
        const status = err.status || 500;
        logger.error('affinityWebhook: ingest failed', err);
        res.status(status).json({error: err.message || String(err)});
      }
    },
);

/**
 * Director / super_admin: run same ingest as webhook without HMAC (local QA).
 */
exports.mockAffinityPush = onCall({region: REGION}, async (request) => {
  const actor = assertDirectorOrSuper(request);
  const data = request.data || {};
  const eventIdRaw = data.eventId;
  const fallbackEv =
      `mock_${Date.now()}_` +
      (actor.email || 'unknown').replace(/[^a-z0-9]+/gi, '_');
  const eventId =
      typeof eventIdRaw === 'string' && eventIdRaw.trim() ?
        eventIdRaw.trim() :
        fallbackEv;
  const sidCode =
      typeof data.sidCode === 'string' ? data.sidCode.trim() : '';
  if (!sidCode) {
    throw new HttpsError('invalid-argument', 'sidCode is required.');
  }
  const seasonExternalId =
      typeof data.seasonExternalId === 'string' ?
        data.seasonExternalId.trim() :
        '';
  const players = Array.isArray(data.players) ? data.players : [];
  const payload = {
    eventId,
    sidCode,
    seasonExternalId,
    players,
  };
  const rawString = JSON.stringify(payload);
  try {
    return await runAffinityIngestCore(
        /** @type {Record<string, unknown>} */ (payload),
        {
          sourceTag: 'mock_affinity_push',
          rawString,
        },
    );
  } catch (err) {
    if (err.status) {
      throw new HttpsError(
          err.status === 400 ? 'invalid-argument' :
            err.status === 404 ? 'not-found' : 'failed-precondition',
          err.message || String(err),
      );
    }
    throw err;
  }
});

/**
 * Public (no auth): recruit/scout-safe snapshot when player opted in and
 * is 16+.
 * Callable: allow unauthenticated invoke in GCP IAM for production.
 */
exports.getPublicRecruitProfile = onCall(
    {region: REGION, invoker: 'public'},
    async (request) => {
      const data = request.data || {};
      const rawKey =
          typeof data.playerKey === 'string' ? data.playerKey.trim() : '';
      const playerKey = normEmail(rawKey);
      if (!playerKey) {
        throw new HttpsError('invalid-argument', 'playerKey is required.');
      }

      const uRef = db.collection('users').doc(playerKey);
      const uSnap = await uRef.get();
      if (!uSnap.exists) {
        throw new HttpsError('not-found', 'Profile not found.');
      }
      const u = uSnap.data();
      if (u.recruitProfilePublic !== true) {
        throw new HttpsError(
            'permission-denied',
            'Public recruit profile is not enabled for this player.',
        );
      }

      const isMinor = u.isMinor === true;
      const dob = u.dateOfBirth;
      if (isMinor || !dob || !(dob instanceof admin.firestore.Timestamp)) {
        throw new HttpsError(
            'permission-denied',
            'Public profile requires verified age (16+) on file.',
        );
      }
      const age = computeAgeYears(dob);
      if (age < 16) {
        throw new HttpsError(
            'permission-denied',
            'Public recruit profiles are only for players 16+.',
        );
      }

      const metricsSnap = await db.collection('player_metrics').doc(playerKey)
          .collection('seasons')
          .get();

      /** @type {Array<Record<string, unknown>>} */
      const seasons = [];
      metricsSnap.forEach((d) => {
        const x = d.data();
        const vb = x.verifiedBy;
        if (typeof vb === 'string' && vb.length > 0) {
          const row = {
            id: d.id,
            seasonLabel: x.seasonLabel || null,
            physical: x.physical || null,
            technical: x.technical || null,
            verifiedBy: vb,
          };
          const ua = x.updatedAt;
          if (ua && typeof ua.toDate === 'function') {
            row.updatedAt = ua.toDate().toISOString();
          }
          seasons.push(row);
        }
      });

      const rawOa = u.operativeAvatar;
      /** @type {{ v: number, seed: string } | null} */
      let operativeAvatar = null;
      if (
        rawOa &&
        typeof rawOa === 'object' &&
        rawOa.v === 1 &&
        typeof rawOa.seed === 'string' &&
        rawOa.seed.trim()
      ) {
        operativeAvatar = {
          v: 1,
          seed: String(rawOa.seed).trim().slice(0, 128),
        };
      }

      return {
        ok: true,
        playerKey,
        displayName: typeof u.playerName === 'string' ? u.playerName : null,
        seasons,
        operativeAvatar,
      };
    },
);

/**
 * Public (no auth): marketing storefront landing by clubs.marketing.publicSlug.
 */
exports.getPublicClubLanding = onCall(
    {region: REGION, invoker: 'public'},
    async (request) => {
      const data = request.data || {};
      const raw =
          typeof data.slug === 'string' ? data.slug.trim().toLowerCase() : '';
      if (!raw || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(raw) || raw.length > 80) {
        throw new HttpsError('invalid-argument', 'Invalid slug.');
      }

      const snap = await db.collection('clubs')
          .where('marketing.publicSlug', '==', raw)
          .limit(1)
          .get();
      if (snap.empty) {
        return {ok: false, notFound: true};
      }

      const clubDoc = snap.docs[0];
      const clubId = clubDoc.id;
      const c = clubDoc.data() || {};
      const m = c.marketing && typeof c.marketing === 'object' ? c.marketing : {};
      const metaPixelId =
          typeof m.metaPixelId === 'string' ? m.metaPixelId.trim().slice(0, 64) : '';
      const googleAnalyticsId =
          typeof m.googleAnalyticsId === 'string' ?
            m.googleAnalyticsId.trim().slice(0, 64) :
            '';

      /** @type {Array<Record<string, unknown>>} */
      const athletes = [];
      try {
        const profSnap = await db.collection('public_player_profiles')
            .where('clubId', '==', clubId)
            .orderBy('current_level', 'desc')
            .limit(8)
            .get();
        profSnap.forEach((d) => {
          const p = d.data() || {};
          athletes.push({
            id: d.id,
            displayName: p.displayName || null,
            ageGroup: p.ageGroup || null,
            position: p.position || null,
            current_level: p.current_level || 1,
            total_xp: p.total_xp || 0,
            verified_trial_scores: p.verified_trial_scores || {},
            brandLogoUrl: p.brandLogoUrl || null,
            clubDisplayName: p.clubDisplayName || null,
          });
        });
      } catch (e) {
        logger.warn('getPublicClubLanding athletes query', e);
      }

      const sportRaw = typeof c.sport === 'string' ? c.sport.trim().toLowerCase() : '';
      const sport =
          sportRaw &&
          [
            'soccer', 'basketball', 'baseball', 'football', 'volleyball',
            'hockey', 'lacrosse', 'generic',
          ].includes(sportRaw) ?
            sportRaw :
            'generic';

      return {
        ok: true,
        clubId,
        slug: raw,
        clubName: typeof c.name === 'string' ? c.name : '',
        sport,
        brandLogoUrl: typeof c.brandLogoUrl === 'string' ? c.brandLogoUrl : '',
        brandPrimaryHex:
          typeof c.brandPrimaryHex === 'string' ? c.brandPrimaryHex : '',
        brandAccentHex:
          typeof c.brandAccentHex === 'string' ? c.brandAccentHex : '',
        metaPixelId: metaPixelId || null,
        googleAnalyticsId: googleAnalyticsId || null,
        athletes,
      };
    },
);

/**
 * Sanitized team XP board (no emails, COPPA, or compliance fields).
 * Players use their profile teamId; staff may pass teamId when permitted.
 */
exports.getTeamLeaderboard = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const role = request.auth.token.role || 'player';
  const tokenTeamId =
      typeof request.auth.token.teamId === 'string' ?
        request.auth.token.teamId.trim() :
        '';
  const tokenClubId =
      typeof request.auth.token.clubId === 'string' ?
        request.auth.token.clubId.trim() :
        '';
  const callerEmail = normEmail(request.auth.token.email);
  const data = request.data || {};
  const requestedTeamRaw =
      typeof data.teamId === 'string' ? data.teamId.trim() : '';

  let targetTeamId = '';

  if (role === 'player') {
    if (!callerEmail) {
      throw new HttpsError(
          'failed-precondition',
          'A verified email is required.',
      );
    }
    const uSnap = await db.collection('users').doc(callerEmail).get();
    if (!uSnap.exists) {
      throw new HttpsError('not-found', 'Profile not found.');
    }
    const u = uSnap.data();
    const tid = typeof u.teamId === 'string' ? u.teamId.trim() : '';
    if (!tid || tid === 'admin') {
      throw new HttpsError(
          'failed-precondition',
          'Team is not set on your profile.',
      );
    }
    targetTeamId = tid;
  } else if (role === 'super_admin') {
    if (!requestedTeamRaw || requestedTeamRaw === 'admin') {
      throw new HttpsError('invalid-argument', 'teamId is required.');
    }
    const tSnap = await db.collection('teams').doc(requestedTeamRaw).get();
    if (!tSnap.exists) {
      throw new HttpsError('not-found', 'Team not found.');
    }
    targetTeamId = requestedTeamRaw;
  } else if (role === 'coach') {
    if (!tokenTeamId || tokenTeamId === 'admin') {
      throw new HttpsError(
          'failed-precondition',
          'Your account is missing team scope; sign out and back in.',
      );
    }
    if (requestedTeamRaw && requestedTeamRaw !== tokenTeamId) {
      throw new HttpsError(
          'permission-denied',
          'You can only load your assigned team leaderboard.',
      );
    }
    targetTeamId = tokenTeamId;
  } else if (role === 'director') {
    if (!tokenClubId) {
      throw new HttpsError(
          'failed-precondition',
          'Club scope missing; sign out and back in.',
      );
    }
    if (!requestedTeamRaw || requestedTeamRaw === 'admin') {
      throw new HttpsError('invalid-argument', 'teamId is required.');
    }
    const tSnap = await db.collection('teams').doc(requestedTeamRaw).get();
    if (!tSnap.exists) {
      throw new HttpsError('not-found', 'Team not found.');
    }
    const teamClub =
        typeof tSnap.data().clubId === 'string' ?
          tSnap.data().clubId.trim() :
          '';
    if (!teamClub || teamClub !== tokenClubId) {
      throw new HttpsError(
          'permission-denied',
          'Team is not in your club.',
      );
    }
    targetTeamId = requestedTeamRaw;
  } else {
    throw new HttpsError(
        'permission-denied',
        'Leaderboard is not available for this account.',
    );
  }

  const snap = await db.collection('users')
      .where('teamId', '==', targetTeamId)
      .orderBy('xp', 'desc')
      .limit(60)
      .get();

  /** @type {Array<{docId: string, xp: number, u: Record<string, unknown>}>} */
  const raw = [];
  snap.forEach((doc) => {
    const u = doc.data();
    if (!isLeaderboardPlayerRow(u)) return;
    const x = Number(u.xp);
    const xpVal = Number.isFinite(x) ? Math.floor(x) : 0;
    raw.push({docId: doc.id, xp: xpVal, u});
  });
  raw.sort((a, b) => b.xp - a.xp);

  /** @type {Array<Record<string, unknown>>} */
  const entries = [];
  const limit = 15;
  for (let i = 0; i < raw.length && entries.length < limit; i++) {
    const row = raw[i];
    const u = row.u;
    const streak = Number(u.currentStreak);
    const streakVal = Number.isFinite(streak) ? Math.floor(streak) : 0;
    const name =
        typeof u.playerName === 'string' && u.playerName.trim() ?
          u.playerName.trim() :
          'Player';
    entries.push({
      rank: entries.length + 1,
      playerKey: leaderboardPublicPlayerKey(row.docId),
      displayName: name,
      xp: row.xp,
      currentStreak: streakVal,
      isCurrentUser: callerEmail ? row.docId === callerEmail : false,
    });
  }

  return {ok: true, teamId: targetTeamId, entries};
});

/** XP granted per calendar day (UTC) when `logPlayerActivity` awards. */
const DAILY_ACTIVITY_XP = 50;

/**
 * Player-only: idempotent daily XP + streak update (UTC dates).
 * At most one award per UTC day per user (`lastActivityDate`).
 */
exports.logPlayerActivity = onCall({region: REGION}, async (request) => {
  const emailKey = assertPlayer(request);
  const uRef = db.collection('users').doc(emailKey);

  /** @type {{ result: Record<string, unknown> }} */
  const out = {result: {}};

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(uRef);
    if (!snap.exists) {
      throw new HttpsError('not-found', 'User profile not found.');
    }
    const u = snap.data();
    const docRole = typeof u.role === 'string' ? u.role : 'player';
    if (docRole !== 'player') {
      throw new HttpsError(
          'permission-denied',
          'Gamification is only for player profiles.',
      );
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayStr = utcYmdAddDays(todayStr, -1);
    const lastStr = lastActivityToUtcYmd(u.lastActivityDate);

    const prevXp = Number(u.xp);
    const safeXp = Number.isFinite(prevXp) ? Math.floor(prevXp) : 0;
    const prevCur = Number(u.currentStreak);
    const safeCur = Number.isFinite(prevCur) ? Math.floor(prevCur) : 0;
    const prevLong = Number(u.longestStreak);
    const safeLong = Number.isFinite(prevLong) ? Math.floor(prevLong) : 0;

    if (lastStr === todayStr) {
      out.result = {
        ok: true,
        awarded: false,
        xp: safeXp,
        xpDelta: 0,
        currentStreak: safeCur,
        longestStreak: safeLong,
        lastActivityDate: lastStr,
      };
      return;
    }

    let newStreak;
    if (lastStr === yesterdayStr) {
      newStreak = safeCur + 1;
    } else {
      newStreak = 1;
    }

    const newXp = safeXp + DAILY_ACTIVITY_XP;
    const newLongest = Math.max(safeLong, newStreak);

    tx.update(uRef, {
      xp: newXp,
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActivityDate: todayStr,
    });

    out.result = {
      ok: true,
      awarded: true,
      xp: newXp,
      xpDelta: DAILY_ACTIVITY_XP,
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActivityDate: todayStr,
    };
  });

  return out.result;
});

/** Max JSON chars sent to Gemini (prompt budget guard). */
const TACTIC_CANVAS_JSON_MAX_CHARS = 120000;

/**
 * Epic 4.1: Gemini analysis of a saved tactical board (server-only API key).
 * Callers: coach, director, super_admin (team scoped like tactics rules).
 */
exports.analyzeTacticWithAI = onCall(
    {
      region: REGION,
      secrets: [GEMINI_API_KEY],
    },
    async (request) => {
      const actor = assertCoachMessageSender(request);
      const data = request.data || {};
      const teamId =
          typeof data.teamId === 'string' ? data.teamId.trim() : '';
      const tacticId =
          typeof data.tacticId === 'string' ? data.tacticId.trim() : '';
      if (!teamId || !tacticId) {
        throw new HttpsError(
            'invalid-argument',
            'teamId and tacticId are required.',
        );
      }

      const tSnap = await db.collection('teams').doc(teamId).get();
      assertActorCanAccessTeam(actor, teamId, tSnap);

      const tacRef = db.collection('teams').doc(teamId)
          .collection('tactics').doc(tacticId);
      const tacSnap = await tacRef.get();
      if (!tacSnap.exists) {
        throw new HttpsError('not-found', 'Tactic not found.');
      }
      const tac = tacSnap.data();
      const name =
          typeof tac.name === 'string' && tac.name.trim() ?
            tac.name.trim() :
            'Untitled tactic';
      const canvasState = tac.canvasState;

      let canvasJson;
      try {
        const forJson =
            canvasState === undefined || canvasState === null ?
              null :
              canvasState;
        canvasJson =
            typeof canvasState === 'string' ?
              canvasState :
              JSON.stringify(forJson, null, 0);
      } catch (e) {
        throw new HttpsError(
            'failed-precondition',
            'Tactic canvasState could not be serialized.',
        );
      }
      if (canvasJson.length > TACTIC_CANVAS_JSON_MAX_CHARS) {
        canvasJson =
            canvasJson.slice(0, TACTIC_CANVAS_JSON_MAX_CHARS) +
            '\n...[truncated for model context]';
      }

      const apiKey = GEMINI_API_KEY.value();
      if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 16) {
        logger.error('GEMINI_API_KEY missing or too short.');
        throw new HttpsError(
            'failed-precondition',
            'AI is not configured. Ask an admin to set GEMINI_API_KEY.',
        );
      }

      const systemPersona = [
        'You are an Expert UEFA Pro License Soccer Coach. You read',
        'structured tactical board data (normalized coordinates, objects,',
        'and layers) and give concise, practical coaching feedback.',
        'Stay evidence-based; do not invent players or formations not',
        'implied by the data. Use football terminology appropriate for',
        'elite youth and semi-pro coaches.',
      ].join(' ');

      const userPrompt = [
        systemPersona,
        '',
        '---',
        'Tactic name: ' + name,
        '',
        'Canvas state JSON (spatial layout, normalized X/Y where',
        'applicable):',
        canvasJson,
        '',
        'Respond with:',
        '1) Two or three short bullets on spatial distribution (width,',
        '   depth, compactness, rest-defence if visible).',
        '2) One bullet naming a plausible tactical weakness (e.g.',
        '   vulnerable to counters on the wings, half-space underloaded).',
        '3) One bullet with a single concrete improvement for the next',
        '   session (drill or positional tweak).',
        'Keep total under ~220 words. No AI self-introduction.',
      ].join('\n');

      const ai = new GoogleGenAI({apiKey});

      let analysisText = '';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: userPrompt,
        });
        if (response && typeof response.text === 'string') {
          analysisText = response.text;
        } else if (
          response &&
          response.candidates &&
          response.candidates[0] &&
          response.candidates[0].content &&
          response.candidates[0].content.parts
        ) {
          const parts = response.candidates[0].content.parts;
          analysisText = parts
              .map((p) => (typeof p.text === 'string' ? p.text : ''))
              .join('');
        }
      } catch (err) {
        logger.error('analyzeTacticWithAI: Gemini request failed', err);
        throw new HttpsError(
            'internal',
            'AI analysis failed. Try again later.',
        );
      }

      analysisText = (analysisText || '').trim();
      if (!analysisText) {
        throw new HttpsError(
            'internal',
            'AI returned an empty analysis.',
        );
      }

      return {
        ok: true,
        tacticId,
        teamId,
        tacticName: name,
        analysis: analysisText,
        model: 'gemini-2.5-flash',
      };
    },
);

/**
 * Epic 12: director/super_admin broadcast to a club (no client Firestore
 * writes).
 */
exports.publishClubCampaign = onCall({region: REGION}, async (request) => {
  const actor = assertDirectorOrSuper(request);
  const data = request.data || {};

  /** @type {string} */
  let clubId;
  if (actor.role === 'super_admin') {
    const raw =
        typeof data.clubId === 'string' ? data.clubId.trim() : '';
    if (!raw) {
      throw new HttpsError(
          'invalid-argument',
          'clubId is required for super admin.',
      );
    }
    const cSnap = await db.collection('clubs').doc(raw).get();
    if (!cSnap.exists) {
      throw new HttpsError('not-found', 'Club not found.');
    }
    clubId = raw;
  } else {
    if (!actor.clubId) {
      throw new HttpsError(
          'failed-precondition',
          'Club scope missing; sign out and back in.',
      );
    }
    clubId = actor.clubId;
  }

  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const body = typeof data.body === 'string' ? data.body.trim() : '';
  if (!title || title.length > 200) {
    throw new HttpsError(
        'invalid-argument',
        'title is required (max 200 characters).',
    );
  }
  if (!body || body.length > 8000) {
    throw new HttpsError(
        'invalid-argument',
        'body is required (max 8000 characters).',
    );
  }

  const audienceRaw =
      typeof data.targetAudience === 'string' ?
        data.targetAudience.trim() :
        '';
  const allowedAudiences = ['all', 'parents', 'coaches', 'players'];
  if (!allowedAudiences.includes(audienceRaw)) {
    throw new HttpsError(
        'invalid-argument',
        'targetAudience must be all, parents, coaches, or players.',
    );
  }

  const priority = data.priority === true;
  const uid = request.auth.uid;

  const docRef = await db.collection('clubs').doc(clubId)
      .collection('campaigns')
      .add({
        title,
        body,
        targetAudience: audienceRaw,
        priority,
        clubId,
        authorId: uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

  return {
    ok: true,
    campaignId: docRef.id,
    clubId,
  };
});

// ---------------------------------------------------------------------------
// Epic 9: Stripe billing (tiered multi-tenancy)
// ---------------------------------------------------------------------------

/**
 * @param {string} tierType
 * @param {number} purchasedQty
 * @return {number}
 */
function seatsLimitForTier(tierType, purchasedQty) {
  if (tierType === 'tutor') return 15;
  if (tierType === 'free_trial') return 15;
  if (tierType === 'team') return 25;
  if (tierType === 'club') {
    return purchasedQty > 0 && purchasedQty <= 100000 ? purchasedQty : 100;
  }
  if (tierType === 'recruiter') return 0;
  return 0;
}

/**
 * @param {string} stripeStatus
 * @return {'active'|'past_due'|'canceled'}
 */
function mapStripeSubscriptionStatus(stripeStatus) {
  if (stripeStatus === 'active' || stripeStatus === 'trialing') {
    return 'active';
  }
  if (stripeStatus === 'past_due' || stripeStatus === 'unpaid') {
    return 'past_due';
  }
  if (
    stripeStatus === 'canceled' ||
    stripeStatus === 'incomplete_expired' ||
    stripeStatus === 'paused'
  ) {
    return 'canceled';
  }
  return 'past_due';
}

/**
 * @param {Object} stripe Stripe client
 * @param {string} tierType
 * @return {string}
 */
function priceIdForTierType(stripe, tierType) {
  void stripe;
  if (tierType === 'tutor') return STRIPE_PRICE_TUTOR.value();
  if (tierType === 'team') return STRIPE_PRICE_TEAM.value();
  if (tierType === 'club') return STRIPE_PRICE_CLUB.value();
  if (tierType === 'recruiter') return STRIPE_PRICE_RECRUITER.value();
  return '';
}

/**
 * @param {any} request
 * @return {string} clubId
 */
function resolveClubIdForStripeCheckout(request) {
  const actor = assertDirectorOrSuper(request);
  const data = request.data || {};
  if (actor.role === 'super_admin') {
    const raw = typeof data.clubId === 'string' ? data.clubId.trim() : '';
    if (!raw) {
      throw new HttpsError(
          'invalid-argument',
          'clubId is required for super admin.',
      );
    }
    return raw;
  }
  const cid = request.auth.token.clubId || '';
  if (!cid) {
    throw new HttpsError(
        'failed-precondition',
        'Club scope missing; sign out and back in.',
    );
  }
  return cid;
}

/**
 * @param {string} url
 * @return {boolean}
 */
function isAllowedStripeRedirectUrl(url) {
  if (typeof url !== 'string' || url.length < 12 || url.length > 2048) {
    return false;
  }
  if (url.startsWith('https://')) return true;
  if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
    return true;
  }
  return false;
}

/**
 * Director / super_admin: Stripe Checkout Session for subscription tier.
 */
exports.createStripeCheckoutSession = onCall(
    {
      region: REGION,
      secrets: [STRIPE_SECRET_KEY],
    },
    async (request) => {
      if (!request.auth || !request.auth.uid) {
        throw new HttpsError('unauthenticated', 'Sign in required.');
      }
      const clubId = resolveClubIdForStripeCheckout(request);
      const data = request.data || {};
      const tierTypeRaw = typeof data.tierType === 'string' ?
        data.tierType.trim().toLowerCase() :
        '';
      const allowedTiers = ['tutor', 'team', 'club', 'recruiter'];
      if (!allowedTiers.includes(tierTypeRaw)) {
        throw new HttpsError(
            'invalid-argument',
            'tierType must be tutor, team, club, or recruiter.',
        );
      }
      const successUrl =
          typeof data.successUrl === 'string' ? data.successUrl.trim() : '';
      const cancelUrl =
          typeof data.cancelUrl === 'string' ? data.cancelUrl.trim() : '';
      if (!isAllowedStripeRedirectUrl(successUrl) ||
          !isAllowedStripeRedirectUrl(cancelUrl)) {
        throw new HttpsError(
            'invalid-argument',
            'successUrl and cancelUrl must be valid https URLs ' +
            '(or localhost for dev).',
        );
      }

      const secret = STRIPE_SECRET_KEY.value();
      if (!secret || typeof secret !== 'string' || secret.length < 16) {
        throw new HttpsError(
            'failed-precondition',
            'Stripe is not configured. Set STRIPE_SECRET_KEY secret.',
        );
      }

      const stripeClient = stripe(secret);
      const priceId = priceIdForTierType(stripeClient, tierTypeRaw);
      if (!priceId || typeof priceId !== 'string') {
        throw new HttpsError(
            'failed-precondition',
            'Stripe Price ID not configured for this tier.',
        );
      }

      let quantity = 1;
      if (tierTypeRaw === 'club') {
        const q = parseInt(String(data.clubSeatQuantity), 10);
        if (Number.isFinite(q) && q >= 1 && q <= 100000) {
          quantity = q;
        } else {
          quantity = 100;
        }
      }

      const email =
          typeof request.auth.token.email === 'string' ?
            request.auth.token.email :
            undefined;

      const session = await stripeClient.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{price: priceId, quantity: quantity}],
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id:
            clubId.length <= 255 ? clubId : clubId.slice(0, 255),
        customer_email: email || undefined,
        metadata: {
          clubId: clubId,
          tierType: tierTypeRaw,
          firebaseUid: request.auth.uid,
        },
        subscription_data: {
          metadata: {
            clubId: clubId,
            tierType: tierTypeRaw,
          },
        },
      });

      if (!session.url) {
        throw new HttpsError(
            'internal',
            'Stripe did not return a checkout URL.',
        );
      }

      return {ok: true, url: session.url, sessionId: session.id};
    },
);

/**
 * Stripe webhooks: verify signature, sync license_entitlements.
 * Deploy with public invoker for Stripe; use endpoint signing secret.
 */
exports.stripeWebhook = onRequest(
    {
      region: REGION,
      cors: false,
      invoker: 'public',
      secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET],
    },
    async (req, res) => {
      if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
      }
      const sig = req.headers['stripe-signature'];
      if (!sig || typeof sig !== 'string') {
        res.status(400).send('Missing stripe-signature');
        return;
      }
      const rawBody = req.rawBody;
      if (!Buffer.isBuffer(rawBody)) {
        logger.error('stripeWebhook: missing rawBody buffer');
        res.status(400).send('Invalid body');
        return;
      }

      const secretKey = STRIPE_SECRET_KEY.value();
      const whSecret = STRIPE_WEBHOOK_SECRET.value();
      if (!secretKey || !whSecret) {
        logger.error('stripeWebhook: missing Stripe secrets');
        res.status(500).send('Server misconfiguration');
        return;
      }

      const stripeClient = stripe(secretKey);
      let event;
      try {
        event = stripeClient.webhooks.constructEvent(rawBody, sig, whSecret);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Webhook signature verification failed: ${msg}`);
        res.status(400).send(`Webhook Error: ${msg}`);
        return;
      }

      try {
        await handleStripeWebhookEvent(stripeClient, event);
      } catch (err) {
        logger.error('stripeWebhook handler error', err);
        res.status(500).send('Handler error');
        return;
      }

      res.status(200).json({received: true});
    },
);

/**
 * @param {Object} stripe Stripe client
 * @param {Object} event Stripe event payload
 */
async function handleStripeWebhookEvent(stripe, event) {
  const type = event.type;

  if (type === 'checkout.session.completed') {
    const session = /** @type {import('stripe').Stripe.Checkout.Session} */ (
      event.data.object
    );
    let clubId =
        session.metadata && session.metadata.clubId ?
          String(session.metadata.clubId).trim() :
          '';
    if (!clubId && session.client_reference_id) {
      clubId = String(session.client_reference_id).trim();
    }
    const tierType =
        session.metadata && session.metadata.tierType ?
          String(session.metadata.tierType).toLowerCase() :
          '';
    if (!clubId || !tierType) {
      logger.warn(
          'checkout.session.completed: missing clubId/tier in metadata',
      );
      return;
    }
    const subId = session.subscription;
    const customerId = session.customer;
    let quantity = 1;
    if (typeof subId === 'string') {
      const sub = await stripe.subscriptions.retrieve(subId);
      const first = sub.items && sub.items.data[0] ? sub.items.data[0] : null;
      if (first && typeof first.quantity === 'number' && first.quantity > 0) {
        quantity = first.quantity;
      }
    }
    const seats = seatsLimitForTier(tierType, quantity);
    const entRef = db.collection('license_entitlements').doc(clubId);
    await entRef.set(
        {
          tier: tierType,
          stripe_customer_id: typeof customerId === 'string' ?
            customerId :
            String(customerId || ''),
          stripe_subscription_id: typeof subId === 'string' ? subId : '',
          subscription_status: 'active',
          seats_limit: seats,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: 'stripe:checkout.session.completed',
        },
        {merge: true},
    );
    return;
  }

  if (type === 'customer.subscription.deleted') {
    const sub = /** @type {import('stripe').Stripe.Subscription} */ (
      event.data.object
    );
    await syncSubscriptionStatusFromStripeObject(stripe, sub, 'canceled');
    return;
  }

  if (type === 'customer.subscription.updated') {
    const sub = /** @type {import('stripe').Stripe.Subscription} */ (
      event.data.object
    );
    const mapped = mapStripeSubscriptionStatus(sub.status);
    await syncSubscriptionStatusFromStripeObject(stripe, sub, mapped);
    return;
  }

  if (type === 'invoice.payment_failed') {
    const invoice = /** @type {import('stripe').Stripe.Invoice} */ (
      event.data.object
    );
    const subId = invoice.subscription;
    if (typeof subId === 'string') {
      const sub = await stripe.subscriptions.retrieve(subId);
      await syncSubscriptionStatusFromStripeObject(stripe, sub, 'past_due');
    }
    return;
  }
}

/**
 * @param {Object} stripe Stripe client
 * @param {Object} sub Stripe subscription
 * @param {'active'|'past_due'|'canceled'} status
 */
async function syncSubscriptionStatusFromStripeObject(stripe, sub, status) {
  void stripe;
  let clubId =
      sub.metadata && sub.metadata.clubId ?
        String(sub.metadata.clubId).trim() :
        '';
  if (!clubId && typeof sub.id === 'string') {
    try {
      const snap = await db
          .collection('license_entitlements')
          .where('stripe_subscription_id', '==', sub.id)
          .limit(2)
          .get();
      if (!snap.empty) {
        if (snap.size > 1) {
          logger.warn(
              'subscription event: multiple license_entitlements for sub id',
              {subId: sub.id},
          );
        }
        clubId = snap.docs[0].id;
      }
    } catch (e) {
      logger.error('subscription event: club lookup by subscription id failed', {
        subId: sub.id,
        err: e instanceof Error ? e.message : String(e),
      });
      return;
    }
  }
  if (!clubId) {
    logger.warn('subscription event: missing clubId in subscription metadata');
    return;
  }
  const tierType =
      sub.metadata && sub.metadata.tierType ?
        String(sub.metadata.tierType).toLowerCase() :
        '';
  const first = sub.items && sub.items.data[0] ? sub.items.data[0] : null;
  const quantity =
      first && typeof first.quantity === 'number' && first.quantity > 0 ?
        first.quantity :
        1;
  const seats = tierType ? seatsLimitForTier(tierType, quantity) : undefined;

  const patch = {
    stripe_subscription_id: sub.id,
    stripe_customer_id:
      typeof sub.customer === 'string' ?
        sub.customer :
        String(sub.customer || ''),
    subscription_status: status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: 'stripe:subscription',
  };
  if (tierType && seats !== undefined) {
    patch.seats_limit = seats;
    patch.tier = tierType;
  }

  await db
      .collection('license_entitlements')
      .doc(clubId)
      .set(patch, {merge: true});
}

// ---------------------------------------------------------------------------
// Epic 13: FCM â€” device token registry + trial notifications
// ---------------------------------------------------------------------------

/**
 * Authenticated users register web push tokens for their Auth uid.
 */
exports.registerDeviceToken = onCall({region: REGION}, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const uid = request.auth.uid;
  const raw = request.data && request.data.fcmToken;
  const fcmToken = typeof raw === 'string' ? raw.trim() : '';
  if (!fcmToken || fcmToken.length < 80 || fcmToken.length > 4096) {
    throw new HttpsError(
        'invalid-argument',
        'fcmToken must be a valid FCM registration token string.',
    );
  }
  await db.collection('device_tokens').doc(uid).set(
      {
        tokens: admin.firestore.FieldValue.arrayUnion(fcmToken),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true},
  );
  return {ok: true};
});

/**
 * Resolve parent Auth UIDs for a player (team + display name) via
 * player_lookup, users, and households.
 * @param {string} teamId
 * @param {string} playerName
 * @return {Promise<string[]>}
 */
async function resolveParentUidsForTrialPlayer(teamId, playerName) {
  if (!teamId || !playerName) {
    return [];
  }
  const lookupSnap = await db.collection('player_lookup')
      .where('teamId', '==', teamId)
      .where('playerName', '==', playerName)
      .limit(2)
      .get();
  if (lookupSnap.empty) {
    return [];
  }
  if (lookupSnap.size > 1) {
    logger.warn(
        'onTrialScoreAdded: duplicate player_lookup; skip notify.',
    );
    return [];
  }
  const playerEmail = normEmail(lookupSnap.docs[0].id);
  if (!playerEmail) {
    return [];
  }
  const uSnap = await db.collection('users').doc(playerEmail).get();
  if (!uSnap.exists) {
    return [];
  }
  const hid =
      typeof uSnap.data().householdId === 'string' ?
        uSnap.data().householdId.trim() :
        '';
  if (!hid) {
    return [];
  }
  const hSnap = await db.collection('households').doc(hid).get();
  if (!hSnap.exists) {
    return [];
  }
  const pe = hSnap.data().parentEmails;
  if (!Array.isArray(pe) || pe.length === 0) {
    return [];
  }
  /** @type {string[]} */
  const uids = [];
  for (const raw of pe) {
    const em = normEmail(String(raw));
    if (!em || !em.includes('@')) continue;
    try {
      const ur = await admin.auth().getUserByEmail(em);
      if (ur && ur.uid) uids.push(ur.uid);
    } catch (e) {
      logger.warn(
          'onTrialScoreAdded: parent auth lookup failed ' + em + ' ' + e,
      );
    }
  }
  return [...new Set(uids)];
}

/**
 * Collect unique FCM tokens from device_tokens for the given Auth UIDs.
 * @param {string[]} uids
 * @return {Promise<string[]>}
 */
async function collectFcmTokensForUids(uids) {
  /** @type {string[]} */
  const out = [];
  for (const uid of uids) {
    if (!uid) continue;
    const snap = await db.collection('device_tokens').doc(uid).get();
    if (!snap.exists) continue;
    const arr = snap.data().tokens;
    if (!Array.isArray(arr)) continue;
    for (const t of arr) {
      if (typeof t === 'string' && t.length > 80) {
        out.push(t);
      }
    }
  }
  return [...new Set(out)];
}

/**
 * Player OS: coach deploy â†’ assigned_missions/{missionId} â†’ FCM to player
 * (`device_tokens/{playerId}`). Resolves Auth uid from `targetPlayerKey` email
 * when `playerId` is omitted (legacy rows).
 */
exports.onMissionAssigned = onDocumentCreated(
    {
      document: 'assigned_missions/{missionId}',
      region: REGION,
    },
    async (event) => {
      const missionId = event.params.missionId;
      const snap = event.data;
      if (!snap) {
        logger.error('onMissionAssigned: missing event.data', {missionId});
        return;
      }
      const data = snap.data() || {};
      const teamId =
          typeof data.teamId === 'string' ? data.teamId.trim() : '';
      let playerId =
          typeof data.playerId === 'string' ? data.playerId.trim() : '';

      if (!teamId) {
        logger.error('onMissionAssigned: missing teamId', {missionId});
        return;
      }

      if (!playerId) {
        const targetPlayerKey =
            typeof data.targetPlayerKey === 'string' ?
              data.targetPlayerKey.trim().toLowerCase() :
              '';
        if (!targetPlayerKey || !targetPlayerKey.includes('@')) {
          logger.error('onMissionAssigned: missing playerId and valid targetPlayerKey', {
            missionId,
            teamId,
          });
          return;
        }
        try {
          const ur = await admin.auth().getUserByEmail(targetPlayerKey);
          playerId = ur.uid || '';
        } catch (e) {
          logger.error('onMissionAssigned: auth lookup failed', {
            missionId,
            teamId,
            targetPlayerKey,
            err: e instanceof Error ? e.message : String(e),
          });
          return;
        }
      }

      if (!playerId) {
        logger.error('onMissionAssigned: could not resolve playerId', {
          missionId,
          teamId,
        });
        return;
      }

      logger.info('onMissionAssigned: assignment ingested', {
        missionId,
        teamId,
        playerId,
      });

      let tokens = [];
      try {
        tokens = await collectFcmTokensForUids([playerId]);
      } catch (e) {
        logger.error('onMissionAssigned: token load failed', {
          missionId,
          playerId,
          err: e instanceof Error ? e.message : String(e),
        });
        return;
      }

      if (tokens.length === 0) {
        logger.info('onMissionAssigned: no device tokens; skip FCM', {
          missionId,
          teamId,
          playerId,
        });
        return;
      }

      const title = 'New Training Mission! ðŸŽ¯';
      const body =
          'Your coach just deployed a new mission. Head to the Armory to accept it.';

      const chunkSize = 500;
      for (let i = 0; i < tokens.length; i += chunkSize) {
        const chunk = tokens.slice(i, i + chunkSize);
        try {
          await admin.messaging().sendMulticast({
            tokens: chunk,
            notification: {
              title,
              body,
            },
            data: {
              kind: 'assigned_mission',
              missionId: String(missionId),
              teamId,
              playerId,
            },
          });
          logger.info('onMissionAssigned: sendMulticast ok', {
            missionId,
            playerId,
            tokenCount: chunk.length,
          });
        } catch (e) {
          logger.error('onMissionAssigned: sendMulticast failed', {
            missionId,
            playerId,
            err: e instanceof Error ? e.message : String(e),
          });
        }
      }
    },
);

/**
 * Drill library: new row in assignments/ â†’ FCM to player (device_tokens).
 */
exports.onAssignmentCreated = onDocumentCreated(
    {
      document: 'assignments/{assignmentId}',
      region: REGION,
    },
    async (event) => {
      const snap = event.data;
      if (!snap) return;
      const data = snap.data();
      if (!data || !data.playerId || !data.teamId) return;
      const playerId =
          typeof data.playerId === 'string' ? data.playerId.trim() : '';
      const teamId =
          typeof data.teamId === 'string' ? data.teamId.trim() : '';
      if (!playerId || !teamId) return;

      let tokens = [];
      try {
        tokens = await collectFcmTokensForUids([playerId]);
      } catch (e) {
        logger.error('onAssignmentCreated: token load failed', e);
        return;
      }
      if (tokens.length === 0) return;

      const title = 'New Training Assigned! ðŸ“‹';
      const body = 'Check your Armory for a new drill.';
      const chunkSize = 500;
      for (let i = 0; i < tokens.length; i += chunkSize) {
        const chunk = tokens.slice(i, i + chunkSize);
        try {
          await admin.messaging().sendMulticast({
            tokens: chunk,
            notification: {title, body},
            data: {
              kind: 'library_assignment',
              teamId,
            },
          });
        } catch (e) {
          logger.error('onAssignmentCreated FCM failed', e);
        }
      }
    },
);

/**
 * Firestore: new skill trial logged under trials/ â€” notify linked parents.
 * Path matches client writes (challenges + coach Evals).
 * Video trials use trial_scores/ + onTrialScoreWritten (player FCM on verify).
 */
exports.onTrialScoreAdded = onDocumentCreated(
    {
      document: 'trials/{scoreId}',
      region: REGION,
    },
    async (event) => {
      const snap = event.data;
      if (!snap) return;
      const data = snap.data() || {};
      const teamId =
          typeof data.teamId === 'string' ? data.teamId.trim() : '';
      const playerName =
          typeof data.player === 'string' ? data.player.trim() :
          (typeof data.playerName === 'string' ? data.playerName.trim() : '');
      const skill =
          typeof data.skill === 'string' && data.skill.trim() ?
            data.skill.trim() :
            'trial drill';
      const score =
          typeof data.result === 'string' && data.result.trim() ?
            data.result.trim() :
            'â€”';

      if (!teamId || !playerName) {
        return;
      }

      let parentUids = [];
      try {
        parentUids = await resolveParentUidsForTrialPlayer(teamId, playerName);
      } catch (e) {
        logger.error('onTrialScoreAdded: resolve parents failed', e);
        return;
      }
      if (parentUids.length === 0) {
        return;
      }

      let tokens = [];
      try {
        tokens = await collectFcmTokensForUids(parentUids);
      } catch (e) {
        logger.error('onTrialScoreAdded: token load failed', e);
        return;
      }
      if (tokens.length === 0) {
        return;
      }

      const title = 'New Trial Score Logged! ðŸš€';
      const body =
          `${playerName} just logged a ${score} on ${skill}. ` +
          'Tap to view their progress!';

      const scoreId = event.params.scoreId || '';
      const chunkSize = 500;
      for (let i = 0; i < tokens.length; i += chunkSize) {
        const chunk = tokens.slice(i, i + chunkSize);
        try {
          await admin.messaging().sendMulticast({
            tokens: chunk,
            notification: {
              title,
              body,
            },
            data: {
              kind: 'trial_score',
              teamId,
              scoreId: String(scoreId),
              playerName,
            },
          });
        } catch (e) {
          logger.error('onTrialScoreAdded: sendMulticast failed', e);
        }
      }
    },
);

/**
 * Epic 14: trial_scores â†’ public profile + FCM on verify.
 * Legacy trials/ still uses onTrialScoreAdded for parents.
 */
exports.onTrialScoreWritten = onDocumentWritten(
    {
      document: 'trial_scores/{scoreId}',
      region: REGION,
    },
    async (event) => {
      const afterSnap = event.data.after;
      const beforeSnap = event.data.before;
      if (!afterSnap || !afterSnap.exists) return;
      const after = afterSnap.data();
      const before =
          beforeSnap && beforeSnap.exists ? beforeSnap.data() : null;
      const pid =
          typeof after.playerId === 'string' ? after.playerId.trim() : '';
      if (!pid) return;

      try {
        await syncPublicPlayerProfile(pid);
      } catch (e) {
        logger.error('onTrialScoreWritten syncPublicProfile', e);
      }

      if (after.status !== 'verified') return;
      if (before && before.status === 'verified') return;

      let tokens = [];
      try {
        tokens = await collectFcmTokensForUids([pid]);
      } catch (e) {
        logger.error('onTrialScoreWritten tokens', e);
        return;
      }
      if (tokens.length === 0) return;

      const title = 'Verification Complete! ðŸ†';
      const body =
          'Your video trial has been approved and added to your global ' +
          'scouting profile.';
      const sid = event.params.scoreId || '';
      const chunkSize = 500;
      for (let i = 0; i < tokens.length; i += chunkSize) {
        const chunk = tokens.slice(i, i + chunkSize);
        try {
          await admin.messaging().sendMulticast({
            tokens: chunk,
            notification: {title, body},
            data: {
              kind: 'video_trial_verified',
              scoreId: String(sid),
            },
          });
        } catch (e) {
          logger.error('onTrialScoreWritten FCM', e);
        }
      }
    },
);

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Sprint 2.7 â€” True Account Impersonation Engine.
//
// Generates a short-lived Firebase Custom Token for a super_admin to sign in
// as another user for incident-triage / white-glove support.
//
// Security model:
//   â€¢ Caller MUST be a super_admin (request.auth.token.role === 'super_admin').
//   â€¢ Self-impersonation is rejected (no-op / audit noise protection).
//   â€¢ Impersonating another super_admin is denied (lateral-movement guard).
//   â€¢ Every call writes an immutable row to `security_audit` with
//     action=IMPERSONATE_USER, actor=<adminEmail>, target=<targetUid/email>.
//   â€¢ Custom token carries `additionalClaims.impersonation = true` and
//     `additionalClaims.impersonatedBy = <adminEmail>` so downstream auditing
//     can correlate sessions.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.impersonateUserFn = onCall({region: REGION}, async (request) => {
  const {email: adminEmail} = assertSuperAdmin(request);
  const data = request.data || {};

  const targetEmailIn =
      typeof data.targetEmail === 'string' ? data.targetEmail.trim() : '';
  const targetUidIn =
      typeof data.targetUid === 'string' ? data.targetUid.trim() : '';

  if (!targetEmailIn && !targetUidIn) {
    throw new HttpsError(
        'invalid-argument',
        'Provide targetEmail or targetUid.',
    );
  }

  // Resolve the target Firebase Auth record authoritatively.
  let userRecord;
  try {
    if (targetUidIn) {
      userRecord = await admin.auth().getUser(targetUidIn);
    } else {
      userRecord = await admin.auth().getUserByEmail(
          normEmail(targetEmailIn) || targetEmailIn,
      );
    }
  } catch (err) {
    logger.warn('impersonateUserFn: target lookup failed', {
      admin: adminEmail,
      targetEmailIn,
      targetUidIn,
      err: err && err.message,
    });
    throw new HttpsError('not-found', 'Target user does not exist.');
  }

  const targetUid = userRecord.uid;
  const targetEmail = normEmail(userRecord.email) || '';

  // Self-impersonation has no valid use-case and pollutes audit history.
  if (request.auth.uid === targetUid) {
    throw new HttpsError(
        'failed-precondition',
        'You cannot impersonate your own account.',
    );
  }

  // Lateral-movement guard: a super_admin may never impersonate another
  // super_admin (prevents collusion / privilege-chain obfuscation).
  let targetRole = '';
  if (targetEmail) {
    try {
      const userDocSnap = await db.collection('users').doc(targetEmail).get();
      if (userDocSnap.exists) {
        const raw = userDocSnap.data() || {};
        targetRole = typeof raw.role === 'string' ? raw.role : '';
      }
    } catch (err) {
      logger.warn('impersonateUserFn: users/{email} lookup failed', {
        admin: adminEmail,
        targetEmail,
        err: err && err.message,
      });
    }
  }
  if (targetRole === 'super_admin') {
    throw new HttpsError(
        'permission-denied',
        'Impersonating another super_admin is not permitted.',
    );
  }

  // Mint the custom token. The additionalClaims flow into the signed-in user's
  // ID token so the client-side session is permanently identifiable as an
  // impersonation session for the lifetime of that token.
  // Sprint 2.6.1 â€” the banner is now derived from these claims on the client
  // (no sessionStorage), so include target email + role so the high-visibility
  // banner never requires a second Firestore round-trip.
  const additionalClaims = {
    impersonation: true,
    impersonatedBy: adminEmail,
    impersonatedEmail: targetEmail || null,
    impersonatedRole: targetRole || null,
    impersonationStartedAt: Date.now(),
  };

  let customToken;
  try {
    customToken = await admin.auth().createCustomToken(
        targetUid,
        additionalClaims,
    );
  } catch (err) {
    logger.error('impersonateUserFn: createCustomToken failed', {
      admin: adminEmail,
      targetUid,
      err: err && err.message,
    });
    throw new HttpsError(
        'internal',
        'Failed to mint impersonation token.',
    );
  }

  try {
    await db.collection('security_audit').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      admin: adminEmail,
      action: 'IMPERSONATE_USER',
      target: targetEmail || targetUid,
      details: JSON.stringify({
        targetUid,
        targetEmail: targetEmail || null,
        targetRole: targetRole || null,
        callerUid: request.auth.uid,
      }).slice(0, 2000),
    });
  } catch (err) {
    // An audit write failure must not leak a token without traceability.
    logger.error('impersonateUserFn: audit write failed', {
      admin: adminEmail,
      targetUid,
      err: err && err.message,
    });
    throw new HttpsError(
        'internal',
        'Audit logging failed; impersonation aborted.',
    );
  }

  return {
    token: customToken,
    targetUid,
    targetEmail: targetEmail || null,
    targetRole: targetRole || null,
    impersonatedBy: adminEmail,
  };
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Sprint 2.7 â€” GDPR Purge (right-to-be-forgotten).
//
// Hard-deletes a user's core identity footprint:
//   â€¢ Firebase Auth record
//   â€¢ users/{email}
//   â€¢ player_lookup, coach_lookup, registrar_lookup (any matching rows)
// Writes a PURGE_USER_DATA audit record before the Auth deletion so the
// audit trail survives even if the caller's token is invalidated.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.purgeUserDataFn = onCall({region: REGION}, async (request) => {
  const {email: adminEmail} = assertSuperAdmin(request);
  const data = request.data || {};
  const targetEmailIn =
      typeof data.targetEmail === 'string' ? data.targetEmail.trim() : '';
  const reason =
      typeof data.reason === 'string' ? data.reason.trim().slice(0, 500) : '';

  const targetEmail = normEmail(targetEmailIn);
  if (!targetEmail) {
    throw new HttpsError('invalid-argument', 'targetEmail is required.');
  }
  if (targetEmail === adminEmail) {
    throw new HttpsError(
        'failed-precondition',
        'You cannot purge your own account.',
    );
  }

  // Lateral-movement guard: super_admin â†’ super_admin purge is denied.
  let targetRole = '';
  try {
    const userDocSnap = await db.collection('users').doc(targetEmail).get();
    if (userDocSnap.exists) {
      const raw = userDocSnap.data() || {};
      targetRole = typeof raw.role === 'string' ? raw.role : '';
    }
  } catch (err) {
    logger.warn('purgeUserDataFn: users lookup failed', {
      admin: adminEmail,
      targetEmail,
      err: err && err.message,
    });
  }
  if (targetRole === 'super_admin') {
    throw new HttpsError(
        'permission-denied',
        'Purging another super_admin is not permitted.',
    );
  }

  // Audit FIRST so the action is recorded even if mid-batch we fail.
  try {
    await db.collection('security_audit').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      admin: adminEmail,
      action: 'PURGE_USER_DATA',
      target: targetEmail,
      details: JSON.stringify({
        targetRole: targetRole || null,
        reason: reason || null,
      }).slice(0, 2000),
    });
  } catch (err) {
    logger.error('purgeUserDataFn: audit write failed', {
      admin: adminEmail,
      targetEmail,
      err: err && err.message,
    });
    throw new HttpsError('internal', 'Audit logging failed; purge aborted.');
  }

  // Delete users/{email} and any lookup rows atomically.
  const batch = db.batch();
  batch.delete(db.collection('users').doc(targetEmail));
  batch.delete(db.collection('player_lookup').doc(targetEmail));
  batch.delete(db.collection('coach_lookup').doc(targetEmail));
  batch.delete(db.collection('registrar_lookup').doc(targetEmail));
  try {
    await batch.commit();
  } catch (err) {
    logger.error('purgeUserDataFn: Firestore batch failed', {
      admin: adminEmail,
      targetEmail,
      err: err && err.message,
    });
    throw new HttpsError('internal', 'Firestore purge failed.');
  }

  // Best-effort Auth deletion: ignore if the user never completed signup.
  try {
    const rec = await admin.auth().getUserByEmail(targetEmail);
    await admin.auth().deleteUser(rec.uid);
  } catch (err) {
    if (err && err.code !== 'auth/user-not-found') {
      logger.warn('purgeUserDataFn: Auth deleteUser non-fatal', {
        admin: adminEmail,
        targetEmail,
        err: err && err.message,
      });
    }
  }

  return {ok: true, targetEmail};
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Sprint 5.1 â€” Household Provisioning Engine (COPPA: minors never self-create)
// Client direct writes to `operative_dispatches` are denied; all via onCall.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Parent: digital COPPA / liability signature â€” stamps household + coppaSigned.
 * Creates a household if the parent has none (requires clubId on users/{email}).
 */
exports.parentSignCoppaWaiver = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const email = normEmail(request.auth.token.email);
  if (!email) {
    throw new HttpsError('invalid-argument', 'No email on session.');
  }
  const uRef = db.collection('users').doc(email);
  const uSnap = await uRef.get();
  if (!uSnap.exists) {
    throw new HttpsError('not-found', 'User profile not found.');
  }
  const u = uSnap.data();
  if (u.role !== 'parent') {
    throw new HttpsError(
        'permission-denied',
        'Only parent accounts may sign the household waiver.',
    );
  }
  const clubId = typeof u.clubId === 'string' ? u.clubId.trim() : '';
  if (!clubId) {
    throw new HttpsError(
        'failed-precondition',
        'Your profile is missing a club. Complete organization setup first.',
    );
  }
  const now = admin.firestore.FieldValue.serverTimestamp();
  let hid = typeof u.householdId === 'string' ? u.householdId.trim() : '';
  if (!hid) {
    hid = db.collection('households').doc().id;
    const hRef = db.collection('households').doc(hid);
    const pe = Array.isArray(u.playerEmails) ? u.playerEmails : [];
    const pn = Array.isArray(u.playerNames) ? u.playerNames : [];
    await hRef.set({
      clubId,
      parentEmails: [email],
      playerEmails: [...new Set([...pe].map((x) => normEmail(/** @type {string} */(x))).filter(Boolean))],
      playerNames: [...new Set([...pn].filter((x) => typeof x === 'string' && x.trim()))],
      coppaSigned: true,
      coppaSignedAt: now,
      primaryParentUid: request.auth.uid,
      createdAt: now,
      updatedAt: now,
    });
    await uRef.set({householdId: hid}, {merge: true});
    return {ok: true, householdId: hid, createdHousehold: true};
  }
  const hRef = db.collection('households').doc(hid);
  const hSnap = await hRef.get();
  if (!hSnap.exists) {
    throw new HttpsError('not-found', 'Household not found. Contact support.');
  }
  const hData = hSnap.data();
  if (hData.clubId !== clubId) {
    throw new HttpsError('permission-denied', 'Household club does not match your profile.');
  }
  const parents = new Set(
      [...(hData.parentEmails || []), email].map((x) => normEmail(/** @type {string} */(x))).filter(Boolean),
  );
  await hRef.set(
      {
        parentEmails: [...parents],
        coppaSigned: true,
        coppaSignedAt: now,
        primaryParentUid: request.auth.uid,
        updatedAt: now,
      },
      {merge: true},
  );
  return {ok: true, householdId: hid, createdHousehold: false};
});

/**
 * Normalize team invite codes (e.g. AG-7B2X) for lookup.
 * @param {unknown} raw
 * @return {string}
 */
function normTeamInviteCode(raw) {
  if (raw == null || typeof raw !== 'string') {
    return '';
  }
  const t = raw.trim();
  if (!t) {
    return '';
  }
  return t
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .replace(/^(.{2})(.{4})$/, '$1-$2');
}

/**
 * Parent: add minor operative (Auth + users row + dispatch credentials). Requires prior COPPA signature.
 * Optional `teamInviteCode`: links the child to a team (Strike 26) via `teams.inviteCode` and `playerUids`.
 */
exports.parentProvisionOperative = onCall({region: REGION}, async (request) => {
  const data = request.data || {};
  const childName =
    typeof data.childName === 'string' ? data.childName.trim().slice(0, 200) : '';
  const rawCallsign =
    typeof data.operativeCallsign === 'string' ? data.operativeCallsign.trim().slice(0, 200) : '';
  const operSlug = normOperativeCallsignSlug(rawCallsign);
  if (!rawCallsign || !childName) {
    throw new HttpsError(
        'invalid-argument',
        'operativeCallsign and childName are required.',
    );
  }
  if (operSlug.length < 2 || operSlug.length > 32) {
    throw new HttpsError(
        'invalid-argument',
        'Operative Callsign must yield 2â€“32 letters or numbers (after normalizing).',
    );
  }
  const childEmail = normEmail(`${operSlug}@operative.local`);
  if (!childEmail) {
    throw new HttpsError('invalid-argument', 'Invalid operative proxy email.');
  }
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const parentEmail = normEmail(request.auth.token.email);
  if (!parentEmail) {
    throw new HttpsError('invalid-argument', 'No email on session.');
  }
  if (childEmail === parentEmail) {
    throw new HttpsError('invalid-argument', 'Child email must differ from parent email.');
  }
  const rawTeamCode = data.teamInviteCode;
  const teamCodeNorm =
    typeof rawTeamCode === 'string' && rawTeamCode.trim() ?
      normTeamInviteCode(rawTeamCode) :
      '';
  const pRef = db.collection('users').doc(parentEmail);
  const pSnap = await pRef.get();
  if (!pSnap.exists || pSnap.data().role !== 'parent') {
    throw new HttpsError('permission-denied', 'Only parent accounts may provision operatives.');
  }
  const pu = pSnap.data();
  const hid =
    typeof pu.householdId === 'string' ? pu.householdId.trim() : '';
  if (!hid) {
    throw new HttpsError(
        'failed-precondition',
        'Sign the household waiver before generating operative credentials.',
    );
  }
  const hRef = db.collection('households').doc(hid);
  const hSnap = await hRef.get();
  if (!hSnap.exists) {
    throw new HttpsError('not-found', 'Household not found.');
  }
  const h = hSnap.data();
  if (!h.coppaSigned) {
    throw new HttpsError(
        'failed-precondition',
        'COPPA waiver is not on file. Sign the waiver first.',
    );
  }
  const parentList = Array.isArray(h.parentEmails) ? h.parentEmails.map(normEmail) : [];
  if (!parentList.includes(parentEmail)) {
    throw new HttpsError('permission-denied', 'You are not an authorized parent on this household.');
  }
  const clubId = typeof pu.clubId === 'string' ? pu.clubId.trim() : '';
  if (!clubId || h.clubId !== clubId) {
    throw new HttpsError('failed-precondition', 'Club scope mismatch.');
  }
  const existingPlayers = (h.playerEmails || []).map(normEmail);
  if (existingPlayers.includes(childEmail)) {
    throw new HttpsError(
        'already-exists',
        'This athlete email is already in your household.',
    );
  }
  let teamRef = null;
  let teamIdForUser = null;
  if (teamCodeNorm) {
    const tq = await db
        .collection('teams')
        .where('inviteCode', '==', teamCodeNorm)
        .limit(2)
        .get();
    if (tq.empty) {
      throw new HttpsError(
          'not-found',
          'No team matches this team dispatch code. Check with the coach and try again.',
      );
    }
    if (tq.size > 1) {
      throw new HttpsError(
          'failed-precondition',
          'Multiple teams share this code. Contact the club to resolve.',
      );
    }
    const tdoc = tq.docs[0];
    const tData = tdoc.data();
    const tidClub =
      typeof tData.clubId === 'string' ? tData.clubId.trim() : '';
    if (tidClub !== clubId) {
      throw new HttpsError(
          'permission-denied',
          'That team is not in your club. Use a code from your organization.',
      );
    }
    teamRef = tdoc.ref;
    teamIdForUser = tdoc.id;
  }
  const parentTeamIdRaw = typeof pu.teamId === 'string' ? pu.teamId.trim() : '';
  const currentTeamId = teamIdForUser || (parentTeamIdRaw ? parentTeamIdRaw : null);
  const dispatchCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  const now = admin.firestore.FieldValue.serverTimestamp();
  let childUid;
  try {
    const existing = await admin.auth().getUserByEmail(childEmail);
    childUid = existing.uid;
  } catch (e) {
    if (e.code !== 'auth/user-not-found') {
      throw e;
    }
    const rec = await admin.auth().createUser({
      email: childEmail,
      password: crypto.randomBytes(32).toString('hex'),
      displayName: childName,
    });
    childUid = rec.uid;
  }
  const uRef = db.collection('users').doc(childEmail);
  const uExisting = await uRef.get();
  if (uExisting.exists) {
    const uData = uExisting.data() || {};
    const role = uData.role;
    if (role && role !== 'player') {
      throw new HttpsError(
          'failed-precondition',
          'This email is already in use with a different role. Contact your club.',
      );
    }
    const exHid = typeof uData.householdId === 'string' ? uData.householdId.trim() : '';
    if (exHid && exHid !== hid) {
      throw new HttpsError(
          'already-exists',
          'That Operative Callsign is already in use. Choose a different one.',
      );
    }
  }
  const mergedPlayers = [...new Set([...existingPlayers, childEmail])];
  const nameSet = new Set(
      Array.isArray(h.playerNames) ? h.playerNames.filter((x) => typeof x === 'string') : [],
  );
  nameSet.add(childName);
  const userPayload = {
    role: 'player',
    clubId,
    householdId: hid,
    playerName: childName,
    operativeCallsign: rawCallsign,
    operativeCallsignSlug: operSlug,
    parentProvisioned: true,
    parentProvisionerEmail: parentEmail,
    updatedAt: now,
  };
  if (teamIdForUser) {
    userPayload.teamId = teamIdForUser;
  }
  const prevPE = (h.playerEmails || [])
      .map((x) => normEmail(String(x || '')))
      .filter(Boolean);
  const prevCalls = Array.isArray(h.playerCallsigns) ? h.playerCallsigns : [];
  const callByEmail = new Map();
  for (let i = 0; i < prevPE.length; i++) {
    const em = prevPE[i];
    const c =
        prevCalls[i] != null && String(prevCalls[i]).trim() ?
          String(prevCalls[i]).trim() :
          em && em.endsWith('@operative.local') ?
            em.split('@')[0] :
            '';
    callByEmail.set(em, c);
  }
  callByEmail.set(childEmail, rawCallsign);
  const playerCallsigns = mergedPlayers.map((em) => {
    if (!em) {
      return '';
    }
    const fromMap = callByEmail.get(em);
    if (fromMap != null && String(fromMap).trim()) {
      return String(fromMap).trim();
    }
    return em.endsWith('@operative.local') ? em.split('@')[0] : '';
  });
  const dispRef = db.collection('operative_dispatches').doc();
  const plRef = db.collection('player_lookup').doc(childEmail);
  const batch = db.batch();
  batch.set(uRef, userPayload, {merge: true});
  batch.set(plRef, {
    clubId,
    teamId: currentTeamId,
    playerName: childName,
    role: 'player',
  }, {merge: true});
  batch.set(
      hRef,
      {
        playerEmails: mergedPlayers,
        playerNames: [...nameSet],
        playerCallsigns,
        updatedAt: now,
      },
      {merge: true},
  );
  batch.set(dispRef, {
    householdId: hid,
    childEmail,
    childName,
    dispatchCode,
    childUid,
    parentUid: request.auth.uid,
    parentEmail,
    ...(teamIdForUser ? {teamId: teamIdForUser, teamInviteCode: teamCodeNorm} : {}),
    createdAt: now,
  });
  if (teamRef) {
    batch.update(teamRef, {
      playerUids: admin.firestore.FieldValue.arrayUnion(childUid),
      updatedAt: now,
    });
    batch.set(db.collection('rosters').doc(teamIdForUser), {
      players: admin.firestore.FieldValue.arrayUnion(childName),
    }, {merge: true});
  }
  await batch.commit();
  return {
    ok: true,
    householdId: hid,
    childEmail,
    dispatchCode,
    teamLinked: Boolean(teamIdForUser),
    teamId: teamIdForUser || null,
    message:
      'Share this dispatch code with your athlete. It is also stored server-side for Operative sign-in.',
  };
});

/**
 * Public: operatives sign in with email + dispatch code (custom token).
 */
exports.operativeSignInWithDispatch = onCall({region: REGION}, async (request) => {
  const data = request.data || {};
  const em = normEmail(data.email);
  const code = typeof data.dispatchCode === 'string' ?
    data.dispatchCode.trim().toUpperCase() :
    '';
  if (!em || !code) {
    throw new HttpsError('invalid-argument', 'email and dispatchCode are required.');
  }
  const q = await db
      .collection('operative_dispatches')
      .where('childEmail', '==', em)
      .where('dispatchCode', '==', code)
      .limit(1)
      .get();
  if (q.empty) {
    throw new HttpsError('permission-denied', 'Invalid email or dispatch code.');
  }
  const row = q.docs[0].data();
  const childUid = row.childUid;
  if (!childUid || typeof childUid !== 'string') {
    throw new HttpsError('internal', 'Provision record is incomplete.');
  }
  const hSnap = await db.collection('households').doc(row.householdId).get();
  if (!hSnap.exists || hSnap.data().coppaSigned !== true) {
    throw new HttpsError(
        'failed-precondition',
        'This household is not authorized. A parent must sign compliance first.',
    );
  }
  const customToken = await admin.auth().createCustomToken(childUid);
  return {customToken, householdId: row.householdId};
});

/**
 * @param {number} n Length
 * @return {string} Random Aâ€“Z0-9 string
 */
function randomAlphaNumChunk(n) {
  const cs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const buf = crypto.randomBytes(n);
  let s = '';
  for (let i = 0; i < n; i++) {
    s += cs[buf[i] % cs.length];
  }
  return s;
}

/**
 * 6 characters + hyphen, e.g. A7K-2M9P (XXX-XXX).
 * @return {string}
 */
function generateOtpCodeString() {
  return `${randomAlphaNumChunk(3)}-${randomAlphaNumChunk(3)}`;
}

/**
 * @param {unknown} raw
 * @return {string} Normalized doc id, e.g. A7K-2M9P
 */
function normOtpCode(raw) {
  if (raw == null || typeof raw !== 'string') {
    return '';
  }
  const alnum = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (alnum.length !== 6) {
    return '';
  }
  return `${alnum.slice(0, 3)}-${alnum.slice(3)}`;
}

/**
 * Resolves a player auth UID for OTP login. Queries (in order):
 * `users` doc by email, else `users` where `operativeCallsignSlug`, else
 * `users` where `playerName` (exact, case-sensitive in Firestore).
 * @param {string} raw Username, callsign, or email (pre-trim/lower in callers as needed)
 * @return {Promise<string>} Firebase Auth UID
 */
async function resolveUserUidFromUsernameOrCallsign(raw) {
  const u = typeof raw === 'string' ? raw.trim() : '';
  if (!u) {
    throw new HttpsError('invalid-argument', 'username is required.');
  }
  if (u.includes('@')) {
    const em = normEmail(u);
    if (!em) {
      throw new HttpsError('invalid-argument', 'Invalid email.');
    }
    const us = await db.collection('users').doc(em).get();
    if (!us.exists) {
      throw new HttpsError('not-found', 'No user found for that email.');
    }
    const role = us.data().role;
    if (role && role !== 'player') {
      throw new HttpsError(
          'failed-precondition',
          'That account is not a player profile.',
      );
    }
    try {
      const rec = await admin.auth().getUserByEmail(em);
      return rec.uid;
    } catch (e) {
      if (e && e.code === 'auth/user-not-found') {
        throw new HttpsError('not-found', 'No sign-in account for that email.');
      }
      throw e;
    }
  }
  const operSlug = normOperativeCallsignSlug(u);
  if (operSlug.length >= 2) {
    const operQ = await db
        .collection('users')
        .where('operativeCallsignSlug', '==', operSlug)
        .limit(2)
        .get();
    if (!operQ.empty) {
      if (operQ.size > 1) {
        throw new HttpsError(
            'failed-precondition',
            'Multiple operatives share that callsign. Use the proxy email for sign-in instead.',
        );
      }
      const em = operQ.docs[0].id;
      const d = operQ.docs[0].data() || {};
      if (d.role && d.role !== 'player') {
        throw new HttpsError(
            'failed-precondition',
            'That account is not a player profile.',
        );
      }
      try {
        const rec = await admin.auth().getUserByEmail(em);
        return rec.uid;
      } catch (e) {
        if (e && e.code === 'auth/user-not-found') {
          throw new HttpsError('not-found', 'No sign-in account for that callsign.');
        }
        throw e;
      }
    }
  }
  const q = await db
      .collection('users')
      .where('playerName', '==', u)
      .limit(2)
      .get();
  if (q.empty) {
    throw new HttpsError(
        'not-found',
        'No player matches that name or callsign.',
    );
  }
  if (q.size > 1) {
    throw new HttpsError(
        'failed-precondition',
        'Multiple players share that name. Use your sign-in email instead.',
    );
  }
  const em = q.docs[0].id;
  const rec = await admin.auth().getUserByEmail(em);
  return rec.uid;
}

/**
 * @param {{ email: string, householdId: string }} actor
 * @param {string} childUid
 */
async function assertChildInParentHousehold(actor, childUid) {
  let childUser;
  try {
    childUser = await admin.auth().getUser(childUid);
  } catch (e) {
    if (e && e.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', 'Child account not found.');
    }
    throw e;
  }
  const childEm = normEmail(childUser.email);
  if (!childEm) {
    throw new HttpsError('failed-precondition', 'Child has no email on file.');
  }
  const hSnap = await db.collection('households').doc(actor.householdId).get();
  if (!hSnap.exists) {
    throw new HttpsError('not-found', 'Household not found.');
  }
  const h = hSnap.data();
  const players = (h.playerEmails || [])
      .map((x) => normEmail(String(x)))
      .filter(Boolean);
  if (!players.includes(childEm)) {
    throw new HttpsError(
        'permission-denied',
        'That player is not linked to your household.',
    );
  }
  const parents = (h.parentEmails || [])
      .map((x) => normEmail(String(x)))
      .filter(Boolean);
  if (!parents.includes(actor.email)) {
    throw new HttpsError(
        'permission-denied',
        'You are not an authorized parent on this household.',
    );
  }
  const uSnap = await db.collection('users').doc(childEm).get();
  if (uSnap.exists) {
    const r = uSnap.data().role;
    if (r && r !== 'player') {
      throw new HttpsError('failed-precondition', 'Target account is not a player.');
    }
  }
}

/**
 * Parent-only: store a 10-minute OTP in `auth_challenges/{code}` for player
 * sign-in.
 */
exports.generatePlayerOTP = onCall({region: REGION}, async (request) => {
  const data = request.data || {};
  let childUid = typeof data.childUid === 'string' ? data.childUid.trim() : '';
  const childEm = normEmail(
      typeof data.childEmail === 'string' ? data.childEmail : '',
  );
  if (!childUid && childEm) {
    try {
      const ur = await admin.auth().getUserByEmail(childEm);
      childUid = ur.uid;
    } catch (e) {
      if (e && e.code === 'auth/user-not-found') {
        throw new HttpsError('not-found', 'No account for that child email.');
      }
      throw e;
    }
  }
  if (!childUid) {
    throw new HttpsError(
        'invalid-argument',
        'childUid or childEmail is required.',
    );
  }
  const actor = assertParent(request);
  await assertChildInParentHousehold(actor, childUid);
  const parentUid = request.auth.uid;
  const nowMs = Date.now();
  const tenMin = 10 * 60 * 1000;
  const expiresAt = admin.firestore.Timestamp.fromMillis(nowMs + tenMin);
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateOtpCodeString();
    const ref = db.collection('auth_challenges').doc(code);
    const snap = await ref.get();
    if (snap.exists) {
      continue;
    }
    await ref.set({
      childUid,
      parentUid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
    });
    return {code, expiresAt: expiresAt.toDate().toISOString()};
  }
  throw new HttpsError('unavailable', 'Could not issue a unique code. Try again.');
});

/**
 * Public: validate 6-char Clearance Code; mints a custom token for the child
 * (one use). Unauthenticated by design (child login) â€” do not require
 * `request.auth`.
 */
exports.validatePlayerOTP = onCall({region: REGION}, async (request) => {
  // request.auth is intentionally ignored â€” unauthenticated child login.
  const data = request.data || {};
  const uRaw = typeof data.username === 'string' ? data.username : '';
  const username = uRaw.trim().toLowerCase();
  const oRaw = data.otpCode != null ? String(data.otpCode) : '';
  const otpForNorm = oRaw.trim().toLowerCase();
  const otpCode = normOtpCode(otpForNorm);
  if (!username || !otpCode) {
    throw new HttpsError(
        'invalid-argument',
        'username and a 6-character Clearance Code are required.',
    );
  }
  let childUid;
  try {
    childUid = await resolveUserUidFromUsernameOrCallsign(username);
  } catch (e) {
    if (e instanceof HttpsError) {
      if (e.code === 'not-found') {
        throw new HttpsError('not-found', 'Callsign not found in database.');
      }
      if (e.code === 'invalid-argument') {
        throw e;
      }
    }
    console.error('validatePlayerOTP resolve user failed', e);
    throw new HttpsError('internal', 'Server failed to resolve user.');
  }
  const ref = db.collection('auth_challenges').doc(otpCode);
  try {
    await db.runTransaction(async (t) => {
      const snap = await t.get(ref);
      if (!snap.exists) {
        throw new HttpsError('not-found', 'Invalid or expired Clearance Code.');
      }
      const d = snap.data() || {};
      const ch = typeof d.childUid === 'string' ? d.childUid.trim() : '';
      if (!ch || ch !== childUid) {
        throw new HttpsError('not-found', 'Invalid or expired Clearance Code.');
      }
      const ex = d.expiresAt;
      if (!ex || typeof ex.toMillis !== 'function') {
        t.delete(ref);
        throw new HttpsError(
            'internal',
            'Server failed to read clearance challenge.',
        );
      }
      if (ex.toMillis() <= Date.now()) {
        t.delete(ref);
        throw new HttpsError('not-found', 'Invalid or expired Clearance Code.');
      }
      t.delete(ref);
    });
  } catch (e) {
    if (e instanceof HttpsError) {
      throw e;
    }
    console.error('validatePlayerOTP challenge transaction', e);
    throw new HttpsError(
        'internal',
        'Server failed to validate Clearance Code.',
    );
  }
  let customToken;
  try {
    customToken = await admin.auth().createCustomToken(childUid);
  } catch (error) {
    console.error('Token Minting Error:', error);
    throw new HttpsError('internal', 'Server failed to mint login token.');
  }
  return {customToken};
});

/**
 * Collect Auth UIDs for players (via player_lookup email keys) and coaches
 * (coachEmail + assistants) on all teams in the club â€” used for strike alerts.
 * @param {string} clubId
 * @return {Promise<string[]>}
 */
async function collectPlayerCoachUidsForClub(clubId) {
  if (!clubId) return [];
  const teamSnap = await db
      .collection('teams')
      .where('clubId', '==', clubId)
      .get();
  /** @type {Set<string>} */
  const emails = new Set();
  const teamIds = [];
  for (const doc of teamSnap.docs) {
    teamIds.push(doc.id);
    const d = doc.data() || {};
    const coach =
        typeof d.coachEmail === 'string' ? normEmail(d.coachEmail) : '';
    if (coach) emails.add(coach);
    const asst = d.assistants;
    if (Array.isArray(asst)) {
      for (const a of asst) {
        if (typeof a === 'string') emails.add(normEmail(a));
      }
    }
  }
  for (const tid of teamIds) {
    let plSnap;
    try {
      plSnap = await db
          .collection('player_lookup')
          .where('teamId', '==', tid)
          .get();
    } catch (e) {
      logger.warn('collectPlayerCoachUidsForClub: player_lookup query failed', {
        tid,
        err: e instanceof Error ? e.message : String(e),
      });
      continue;
    }
    for (const pd of plSnap.docs) {
      const em = normEmail(pd.id);
      if (em && em.includes('@')) emails.add(em);
    }
  }
  /** @type {string[]} */
  const uids = [];
  const emArr = [...emails];
  await Promise.all(
      emArr.map(async (em) => {
        if (!em) return;
        try {
          const ur = await admin.auth().getUserByEmail(em);
          if (ur && ur.uid) uids.push(ur.uid);
        } catch (_e) {
          /* no Firebase Auth user for this roster email */
        }
      }),
  );
  return [...new Set(uids)];
}

/**
 * Parse Tomorrow.io-style JSON for facility routing + alert rule display name.
 * Prefer explicit clubId + facilityId; allow facilityId as clubId__facilityDocId.
 * @param {Record<string, unknown>} body
 * @return {{ clubId: string, facilityId: string, ruleName: string }}
 */
function parseFacilityWeatherPayload(body) {
  const r = body && typeof body === 'object' ? body : {};
  let clubId =
      typeof r.clubId === 'string' ? r.clubId.trim() : '';
  let facilityId =
      typeof r.facilityId === 'string' ? r.facilityId.trim() : '';
  const params =
      r.parameters && typeof r.parameters === 'object' ?
        /** @type {Record<string, unknown>} */ (r.parameters) :
        {};
  if (!facilityId && typeof params.facilityId === 'string') {
    facilityId = params.facilityId.trim();
  }
  if (!clubId && typeof params.clubId === 'string') {
    clubId = params.clubId.trim();
  }
  if (!clubId && facilityId.includes('__')) {
    const parts = facilityId.split('__');
    if (parts.length >= 2) {
      clubId = parts[0].trim();
      facilityId = parts.slice(1).join('__').trim();
    }
  }
  let ruleName = '';
  const ruleObj = r.rule && typeof r.rule === 'object' ?
    /** @type {Record<string, unknown>} */ (r.rule) :
    null;
  if (ruleObj && typeof ruleObj.name === 'string') {
    ruleName = ruleObj.name.trim();
  }
  if (!ruleName && r.alert && typeof r.alert === 'object') {
    const alertObj = /** @type {Record<string, unknown>} */ (r.alert);
    const innerRule = alertObj.rule;
    if (innerRule && typeof innerRule === 'object') {
      const ir = /** @type {Record<string, unknown>} */ (innerRule);
      if (typeof ir.name === 'string') ruleName = ir.name.trim();
    }
  }
  return {clubId, facilityId, ruleName};
}

/**
 * Real-time Tomorrow.io webhook: lightning proximity â†’ LOCKED facility doc +
 * emergency FCM to club roster coaches & players.
 *
 * Configure Insights HTTP destination URL including query param:
 * `?token=<WEBHOOK_AUTH_TOKEN>` (Secret Manager).
 *
 * JSON body: clubId + facilityId + rule.name (e.g. Lightning Strike).
 * Or send facilityId as yourClubId__yourFacilityDocId.
 */
exports.facilityWeatherWebhook = onRequest({ region: REGION, secrets: [WEBHOOK_AUTH_TOKEN] }, async (req, res) => {
      if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
      }
      const token =
          typeof req.query.token === 'string' ?
            req.query.token.trim() :
            '';
      const expectedToken = WEBHOOK_AUTH_TOKEN.value();
      if (!expectedToken || token !== expectedToken) {
        res.status(403).send('Forbidden');
        return;
      }

      const raw = req.rawBody;
      if (!raw || !Buffer.isBuffer(raw)) {
        logger.error('facilityWeatherWebhook: missing rawBody buffer');
        res.status(400).send('Invalid body');
        return;
      }

      /** @type {Record<string, unknown>} */
      let body;
      try {
        body = JSON.parse(raw.toString('utf8'));
      } catch (e) {
        logger.warn('facilityWeatherWebhook: invalid JSON', {err: String(e)});
        res.status(400).send('Invalid JSON');
        return;
      }

      const {clubId, facilityId, ruleName} = parseFacilityWeatherPayload(body);
      const lightning = /lightning/i.test(ruleName);
      if (!lightning) {
        logger.info('facilityWeatherWebhook: ignored (not lightning)', {
          ruleName,
          facilityId,
          clubId,
        });
        res.status(200).json({received: true, processed: false});
        return;
      }
      if (!clubId || !facilityId) {
        logger.warn(
            'facilityWeatherWebhook: missing clubId/facilityId',
            {clubId, facilityId, ruleName},
        );
        res.status(400).json({error: 'clubId and facilityId required'});
        return;
      }

      const lockStartedMs = Date.now();
      const facRef = db
          .collection('clubs')
          .doc(clubId)
          .collection('facilities')
          .doc(facilityId);

      let facilitySnap;
      try {
        facilitySnap = await facRef.get();
      } catch (e) {
        logger.error('facilityWeatherWebhook: facility read failed', {
          clubId,
          facilityId,
          err: e instanceof Error ? e.message : String(e),
        });
        res.status(500).send('Facility read failed');
        return;
      }
      if (!facilitySnap.exists) {
        logger.warn('facilityWeatherWebhook: unknown facility document', {
          clubId,
          facilityId,
          ruleName,
        });
        res.status(404).json({error: 'Unknown facility'});
        return;
      }

      try {
        await facRef.set(
            {
              status: 'LOCKED',
              lockReason: 'Lightning Proximity - 30 Minute Delay',
              lockedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            {merge: true},
        );
      } catch (e) {
        logger.error('facilityWeatherWebhook: facility lock write failed', {
          clubId,
          facilityId,
          err: e instanceof Error ? e.message : String(e),
        });
        res.status(500).send('Lock failed');
        return;
      }

      logger.warn('facilityWeatherWebhook: LIGHTNING_LOCKDOWN', {
        facilityId,
        clubId,
        ruleName,
        lockStartedMs,
        message:
            'Facility locked â€” audit trail timestamp (ms since epoch): ' +
            String(lockStartedMs),
      });

      let uids = [];
      try {
        uids = await collectPlayerCoachUidsForClub(clubId);
      } catch (e) {
        logger.error('facilityWeatherWebhook: UID resolution failed', {
          clubId,
          err: e instanceof Error ? e.message : String(e),
        });
      }

      let tokens = [];
      try {
        tokens = await collectFcmTokensForUids(uids);
      } catch (e) {
        logger.error('facilityWeatherWebhook: FCM token load failed', {
          clubId,
          err: e instanceof Error ? e.message : String(e),
        });
      }

      const title = 'ðŸš¨ RED ALERT: LIGHTNING ðŸš¨';
      const bodyText =
          'Lightning strike detected within 10 miles. Clear the pitch immediately. ' +
          'The 30-minute safety clock has started.';
      const chunkSize = 500;
      if (tokens.length > 0) {
        for (let i = 0; i < tokens.length; i += chunkSize) {
          const chunk = tokens.slice(i, i + chunkSize);
          try {
            await admin.messaging().sendMulticast({
              tokens: chunk,
              notification: {
                title,
                body: bodyText,
              },
              data: {
                kind: 'emergency_weather',
                facilityId: String(facilityId),
              },
            });
            logger.info('facilityWeatherWebhook: sendMulticast ok', {
              clubId,
              facilityId,
              tokenCount: chunk.length,
              lockStartedMs,
            });
          } catch (e) {
            logger.error('facilityWeatherWebhook: sendMulticast failed', {
              clubId,
              facilityId,
              err: e instanceof Error ? e.message : String(e),
            });
          }
        }
      } else {
        logger.info('facilityWeatherWebhook: no FCM tokens for club roster', {
          clubId,
          facilityId,
          uidCount: uids.length,
        });
      }

      res.status(200).json({
        received: true,
        processed: true,
        facilityId,
        clubId,
        lockStartedMs,
      });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Zero-Trust tenant utilities â€” available to ALL Cloud Functions in this file.
// Usage: const { getCallerTenantId, assertSameTenant } = require('./tenantUtils');
//
// These are NOT exported as Cloud Function endpoints; they are internal helpers.
// They are require()'d here once so other CF implementations can import them
// with confidence that the module is cached and initialised.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
require('./tenantUtils'); // pre-load module; individual functions require it directly

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Strike 1 (Agent 3) â€” Analytics aggregation triggers.
//
// The Global Admin "Command Center" reads from `analytics/platform_totals`,
// a single pre-aggregated document. These triggers keep that doc in sync
// with the authoritative collections. Defined in functions/analytics.js and
// re-exported here so they actually deploy.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const analyticsTriggers = require('./analytics');
exports.onAnalyticsUserWritten = analyticsTriggers.onUserWritten;
exports.onAnalyticsClubWritten = analyticsTriggers.onClubWritten;
exports.onAnalyticsLicenseWritten = analyticsTriggers.onLicenseWritten;

/** Epic 16: Instant graph rebuild on workout log */
exports.onWorkoutLogCreated = onDocumentCreated(
    {
      document: 'workout_logs/{logId}',
      region: REGION,
    },
    async (event) => {
      try {
        const snap = event.data;
        if (!snap) {
          return;
        }
        const data = snap.data();
        if (!data || !data.playerId) return;
        await syncPublicPlayerProfile(data.playerId);
      } catch (e) {
        logger.error('onWorkoutLogCreated rebuild failed', e);
      }
    },
);

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Epic 4 â€” Multi-Tenant SaaS: assignTenantClaims
//
// Callable triggered by inviteService.ts â€º consumeInviteCode() after the
// client marks an invite as 'consumed' in Firestore.
//
// This is the ONLY path that may set JWT custom claims â€” never from the
// client.  The function re-validates the invite before writing claims so
// that a race-condition or a tampered client cannot elevate privileges.
//
// Claims written:
//   { clubId: string, role: string, teamId?: string }
//
// After this function returns, the client calls
//   auth.currentUser.getIdToken(true)
// to force-refresh the JWT so new claims are active in this session.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

exports.assignTenantClaims = onCall(
    {
      region: REGION,
      // Require Firebase App Check in production (comment out for emulator dev).
      // enforceAppCheck: true,
    },
    async (request) => {
      // â”€â”€ Auth guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (!request.auth) {
        throw new HttpsError(
            'unauthenticated',
            'You must be signed in to redeem an invite code.',
        );
      }

      const uid = request.auth.uid;
      const {inviteId} = request.data;

      if (!inviteId || typeof inviteId !== 'string') {
        throw new HttpsError('invalid-argument', '`inviteId` is required.');
      }

      // â”€â”€ Load invite â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const inviteRef = db.collection('invites').doc(inviteId);
      const inviteSnap = await inviteRef.get();

      if (!inviteSnap.exists) {
        throw new HttpsError('not-found', 'Invite not found.');
      }

      const invite = inviteSnap.data();

      // â”€â”€ Re-validate status and expiry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (invite.status !== 'consumed' || invite.consumedBy !== uid) {
        // Guard against replay / race: only the user who optimistically
        // marked 'consumed' (same UID) may trigger claim assignment.
        logger.warn('[assignTenantClaims] status/owner mismatch', {
          inviteId,
          status: invite.status,
          consumedBy: invite.consumedBy,
          callerUid: uid,
        });
        throw new HttpsError(
            'permission-denied',
            'Invite code is not in a redeemable state.',
        );
      }

      const expiresAt = invite.expiresAt.toDate
        ? invite.expiresAt.toDate()
        : new Date(invite.expiresAt);
      if (expiresAt < new Date()) {
        await inviteRef.update({status: 'expired'}).catch(() => {});
        throw new HttpsError('deadline-exceeded', 'Invite code has expired.');
      }

      const tenantId = String(invite.tenantId || invite.clubId || '');
      const targetRole = String(invite.targetRole || '');
      const teamId = invite.teamId ? String(invite.teamId) : null;

      if (!tenantId || !targetRole) {
        throw new HttpsError(
            'internal',
            'Invite is missing tenantId or targetRole.',
        );
      }

      // â”€â”€ Set custom claims on the Auth token â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const existingClaims = (await admin.auth().getUser(uid)).customClaims || {};
      const newClaims = {
        ...existingClaims,
        clubId: tenantId,   // canonical claim name used by all Firestore rules
        role: targetRole,
        ...(teamId ? {teamId} : {}),
      };

      await admin.auth().setCustomUserClaims(uid, newClaims);

      // â”€â”€ Sync role into Firestore user doc â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // Best-effort: update the user's Firestore profile so Firestore
      // queries based on role/clubId are immediately consistent.
      try {
        const userEmail = (await admin.auth().getUser(uid)).email;
        if (userEmail) {
          const userRef = db.collection('users').doc(userEmail.toLowerCase());
          await userRef.set(
              {
                role: targetRole,
                clubId: tenantId,
                ...(teamId ? {teamId} : {}),
              },
              {merge: true},
          );
        }
      } catch (syncErr) {
        // Non-critical â€” JWT claims are the authoritative source.
        logger.warn('[assignTenantClaims] Firestore user sync failed:', syncErr);
      }

      logger.info('[assignTenantClaims] claims assigned', {
        uid,
        tenantId,
        targetRole,
        teamId,
      });

      return {success: true};
    },
);

/** Server XP grant when a `reps` doc is created (parent/player submitWorkoutRep). */
exports.onRepCreatedApplyGamificationXp = onDocumentCreated(
    {
      document: 'reps/{repId}',
      region: REGION,
    },
    async (event) => {
      try {
        const snap = event.data;
        if (!snap) {
          return;
        }
        const repId = event.params && event.params.repId ? String(event.params.repId) : '';
        if (!repId) {
          return;
        }
        await grantTrainingXpAfterRepCreated(db, snap, repId);
      } catch (e) {
        logger.error('onRepCreatedApplyGamificationXp failed', e);
      }
    },
);
