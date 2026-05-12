'use strict';

// ── Deconstruction Sprint 3: Admin & Rosters Domain ──────────────────────────
// Extracted from functions/index.js. Contains all administrative logic for:
//   • JWT custom-claims sync (syncUserClaims trigger)
//   • Team/roster management (list, allocate seats, add/remove/update players)
//   • License provisioning (generateLicense)
//   • Club branding (directorSaveClubBranding)
//   • Coach invite lifecycle (directorInviteCoach, claimCoachInvite)
//   • Facility management (directorUpsertField, secureBookField)
//   • Sport module provisioning (createSportModule)
//   • Campaign publishing (publishClubCampaign)
//   • Tenant claim assignment (assignTenantClaims)
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require('crypto');
const {onDocumentWritten} = require('firebase-functions/v2/firestore');
const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const {defineString} = require('firebase-functions/params');

const {
  assertDirectorOrSuper,
  assertClubSubscriptionWritable,
  assertSuperAdmin,
  assertCanSecureAddPlayer,
  assertClubStaffOrSuper,
  assertDirectorClubOrSuper,
} = require('../middleware/authBouncers');

const {
  normEmail,
  generateLicenseKeyString,
  isTrustedFirebaseStorageLogoUrl,
  coachInviteDocId,
} = require('../utils/formatters');

const {syncPublicPlayerProfile} = require('../utils/profileSyncer');

const REGION = 'us-east1';
const ADMIN_EMAIL = defineString('ADMIN_EMAIL');

/** Lazy Firestore accessor — defers init until first invocation. */
const db = () => admin.firestore();

// ── Private helpers ───────────────────────────────────────────────────────────

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

// ── Exports ───────────────────────────────────────────────────────────────────

exports.syncUserClaims = onDocumentWritten('users/{email}', async (event) => {
  const userData = event.data.after.data();
  const userEmail = event.params.email;

  if (!userData) {
    logger.info('User profile deleted. Exiting function.');
    try {
      const ur = await admin.auth().getUserByEmail(userEmail);
      await db().collection('public_player_profiles').doc(ur.uid).delete();
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
    teamId:    userData.teamId    || null,
    role:      clearedRole,
    clubId:    userData.clubId    || null,
    // Org-topology: orgId = umbrella Rec-Center / league; divisionId = scoped club/program
    orgId:      userData.orgId      || null,
    divisionId: userData.divisionId || userData.clubId || null,
    householdId: userData.householdId || null,
    minor:       userData.isMinor === true,
    vpcVerified: userData.vpcStatus === 'verified',
    isCleared,
    tier:                null,
    subscription_status: null,
  };

  const cid =
      typeof userData.clubId === 'string' && userData.clubId.trim() ?
        userData.clubId.trim() :
        '';
  if (cid) {
    try {
      const entSnap = await db().collection('license_entitlements')
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
      await db().collection('public_player_profiles')
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
  const snap = await db().collection('teams')
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
  await db().collection('security_audit').add({
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
    const ref = db().collection('licenses').doc(licenseKey);
    try {
      await ref.create(basePayload(licenseKey));
      if (clubId) {
        try {
          const entRef = db().collection('license_entitlements').doc(clubId);
          const adminEmail = normEmail(request.auth.token.email) || 'unknown';
          await db().runTransaction(async (t) => {
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

  await db().collection('clubs').doc(clubId).set(payload, {merge: true});
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

  const teamRef = db().collection('teams').doc(teamId);
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

  const entRef = db().collection('license_entitlements').doc(clubId);
  const inviteId = coachInviteDocId(clubId, teamId, coachEmail);
  const inviteRef = db().collection('coach_invites').doc(inviteId);

  const existingUser = await db().collection('users').doc(coachEmail).get();
  if (existingUser.exists) {
    const r = existingUser.data().role;
    if (r === 'coach' && existingUser.data().teamId === teamId) {
      throw new HttpsError(
          'already-exists',
          'This coach is already assigned to this team.',
      );
    }
  }

  const result = await db().runTransaction(async (transaction) => {
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
 * Coach accepts oldest pending invite — moves one seat from reserved to active.
 */
exports.claimCoachInvite = onCall({region: REGION}, async (request) => {
  if (!request.auth || !request.auth.token.email) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const email = normEmail(request.auth.token.email);
  if (!email) {
    throw new HttpsError('invalid-argument', 'Authenticated email missing.');
  }

  const pendingSnap = await db().collection('coach_invites')
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

  const entRef = db().collection('license_entitlements').doc(clubId);
  const teamRef = db().collection('teams').doc(teamId);
  const userRef = db().collection('users').doc(email);
  const lookupRef = db().collection('coach_lookup').doc(email);

  const out = await db().runTransaction(async (transaction) => {
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
 * Director / registrar / coach (own team) / super_admin — field metadata.
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

  await db().collection('fields').doc(fieldId).set(
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

  const fieldPre = await db().collection('fields').doc(fieldId).get();
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

  const fieldRef = db().collection('fields').doc(fieldId);
  const teamRef = db().collection('teams').doc(teamId);

  const txnResult = await db().runTransaction(async (transaction) => {
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
    const nameSnap = await db().collection('teams').doc(tid).get();
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

  const teamSnap = await db().collection('teams').doc(teamId).get();
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

  const rosterRef = db().collection('rosters').doc(teamId);
  const masterRef = db().collection('license_entitlements').doc(clubId);
  const teamEntRef = db().collection('team_entitlements').doc(teamId);
  const teamsQuery = db().collection('teams').where('clubId', '==', clubId);

  await db().runTransaction(async (transaction) => {
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
          db().collection('team_entitlements').doc(td.id),
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
        'playerName is required (1-200 characters).',
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

  const rosterRef = db().collection('rosters').doc(teamId);
  const entRef = db().collection('license_entitlements').doc(clubId);
  const teamEntRef = db().collection('team_entitlements').doc(teamId);
  const lookupRef = playerEmail ?
    db().collection('player_lookup').doc(playerEmail) :
    null;

  const txnResult = await db().runTransaction(async (transaction) => {
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
        'playerName is required (1-200 characters).',
    );
  }

  const {clubId} = await assertCanSecureAddPlayer(request, teamId);

  const rosterRef = db().collection('rosters').doc(teamId);
  const entRef = db().collection('license_entitlements').doc(clubId);
  const teamEntRef = db().collection('team_entitlements').doc(teamId);
  const lookupQuery = db().collection('player_lookup')
      .where('teamId', '==', teamId)
      .where('playerName', '==', playerName)
      .limit(10);

  const txnResult = await db().runTransaction(async (transaction) => {
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

  const rosterRef = db().collection('rosters').doc(teamId);

  const txnResult = await db().runTransaction(async (transaction) => {
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

/** super_admin: create sport module (no client writes). */
exports.createSportModule = onCall({region: REGION}, async (request) => {
  assertSuperAdmin(request);
  const data = request.data || {};
  const sportName =
      typeof data.sportName === 'string' ? data.sportName.trim() : '';
  if (!sportName || sportName.length > 120) {
    throw new HttpsError(
        'invalid-argument',
        'sportName is required (1-120 characters).',
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

  const ref = db().collection('sports').doc(sportId);
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
    const cSnap = await db().collection('clubs').doc(raw).get();
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

  const docRef = await db().collection('clubs').doc(clubId)
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

// ── Epic 4 — Multi-Tenant SaaS: assignTenantClaims ───────────────────────────
//
// Callable triggered by inviteService.ts › consumeInviteCode() after the
// client marks an invite as 'consumed' in Firestore.
//
// This is the ONLY path that may set JWT custom claims — never from the
// client.  The function re-validates the invite before writing claims so
// that a race-condition or a tampered client cannot elevate privileges.
//
// Claims written:
//   { clubId: string, role: string, teamId?: string }
//
// After this function returns, the client calls
//   auth.currentUser.getIdToken(true)
// to force-refresh the JWT so new claims are active in this session.
// ─────────────────────────────────────────────────────────────────────────────

exports.assignTenantClaims = onCall(
    {
      region: REGION,
      // Require Firebase App Check in production (comment out for emulator dev).
      // enforceAppCheck: true,
    },
    async (request) => {
      // ── Auth guard ────────────────────────────────────────────────────────
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

      // ── Load invite ───────────────────────────────────────────────────────
      const inviteRef = db().collection('invites').doc(inviteId);
      const inviteSnap = await inviteRef.get();

      if (!inviteSnap.exists) {
        throw new HttpsError('not-found', 'Invite not found.');
      }

      const invite = inviteSnap.data();

      // ── Re-validate status and expiry ─────────────────────────────────────
      if (invite.status !== 'consumed' || invite.consumedBy !== uid) {
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

      // ── Set custom claims on the Auth token ───────────────────────────────
      const existingClaims = (await admin.auth().getUser(uid)).customClaims || {};
      const newClaims = {
        ...existingClaims,
        clubId: tenantId,
        role: targetRole,
        ...(teamId ? {teamId} : {}),
      };

      await admin.auth().setCustomUserClaims(uid, newClaims);

      // ── Sync role into Firestore user doc ─────────────────────────────────
      // Best-effort: update the user's Firestore profile so Firestore
      // queries based on role/clubId are immediately consistent.
      try {
        const userEmail = (await admin.auth().getUser(uid)).email;
        if (userEmail) {
          const userRef = db().collection('users').doc(userEmail.toLowerCase());
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
