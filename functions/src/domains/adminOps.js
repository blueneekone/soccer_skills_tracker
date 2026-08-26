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
const {DEFAULT_CELL_ID, resolveCellId} = require('../../cellConstants');
const {buildBaseCustomClaims} = require('../auth/customClaims');
const {getRegistryDb, getRequestDb, getAdminDb} = require('../../cellRouter');

const REGION = 'us-east1';
const ADMIN_EMAIL = defineString('ADMIN_EMAIL');

/** Lazy Firestore accessor — defaults to control-plane registry DB. */
const db = () => getRegistryDb();

/** Write to security_audits SIEM audit log. */
async function writeSecurityAuditLog(entry) {
  const auditData = {
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    admin: entry.admin || 'system',
    action: entry.action || 'UNKNOWN',
    target: entry.target || '',
    details: entry.details || '',
  };
  try {
    const registry = getRegistryDb();
    await Promise.all([
      registry.collection('security_audits').add(auditData),
      registry.collection('security_audit').add(auditData),
    ]);
  } catch (err) {
    logger.warn('[writeSecurityAuditLog] audit write failed', err);
  }
}

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

async function resolveUserAuthRecord(docId, userData) {
  const isUidKey = docId && !docId.includes('@');
  if (isUidKey) {
    try {
      return await admin.auth().getUser(docId);
    } catch (e) {
      /* fallback */
    }
  }
  const fallbackEmail = (userData && userData.email) || (docId.includes('@') ? docId : null);
  if (fallbackEmail) {
    try {
      return await admin.auth().getUserByEmail(fallbackEmail);
    } catch (e) {
      /* fallback */
    }
  }
  return null;
}

async function enrichClubClaims(customClaims, cid) {
  if (!cid) return;
  try {
    const entSnap = await getRegistryDb().collection('license_entitlements').doc(cid).get();
    if (entSnap.exists) {
      const ed = entSnap.data() || {};
      customClaims.tier = typeof ed.tier === 'string' ? ed.tier : null;
      customClaims.subscription_status = typeof ed.subscription_status === 'string' ? ed.subscription_status : null;
    }
  } catch (e) {
    logger.warn('syncUserClaims entitlement read', e);
  }
  try {
    const orgSnap = await getRegistryDb().collection('organizations').doc(cid).get();
    if (orgSnap.exists) {
      customClaims.cellId = resolveCellId(orgSnap.get('cellId'));
      const bm = orgSnap.get('billingModel');
      if (typeof bm === 'string' && bm.length > 0) {
        customClaims.billingModel = bm;
        if (bm === 'transaction_billing') {
          customClaims.tier = null;
          customClaims.subscription_status = null;
        }
      }
    }
  } catch (e) {
    logger.warn('syncUserClaims cellId/billingModel read', e);
  }
}

exports.syncUserClaims = onDocumentWritten('users/{docId}', async (event) => {
  const userData = event.data.after.data();
  const docId = event.params.docId;
  const userRecord = await resolveUserAuthRecord(docId, userData);

  if (!userData) {
    logger.info('User profile deleted. Exiting function.');
    if (userRecord) {
      const cellDb = getAdminDb(DEFAULT_CELL_ID);
      await cellDb.collection('public_player_profiles').doc(userRecord.uid).delete().catch(() => {});
    }
    return null;
  }

  if (!userRecord) {
    logger.warn('syncUserClaims: Could not resolve auth record for docId', docId);
    return null;
  }

  const userEmail = userRecord.email || '';
  const authUid = userRecord.uid;
  const superAdmin = ADMIN_EMAIL.value();

  const customClaims = buildBaseCustomClaims(userData);
  if (!customClaims) {
    logger.warn('syncUserClaims: empty profile payload', docId);
    return null;
  }

  const cid = typeof userData.clubId === 'string' && userData.clubId.trim() ? userData.clubId.trim() : '';
  await enrichClubClaims(customClaims, cid);

  if (userEmail.toLowerCase() === superAdmin.toLowerCase()) {
    customClaims.role = 'super_admin';
    logger.info('Super Admin detected! Upgrading badge.');
  }

  try {
    const cellDb = getAdminDb(customClaims.cellId || DEFAULT_CELL_ID);
    if (userData.uid !== authUid) {
      await cellDb.collection('users').doc(docId).set({uid: authUid}, {merge: true});
    }
    await admin.auth().setCustomUserClaims(authUid, customClaims);
    logger.info('Successfully stamped claims!');
    const r = userData.role || 'player';
    if (r !== 'player') {
      await cellDb.collection('public_player_profiles').doc(authUid).delete().catch(() => {});
    } else {
      try {
        await syncPublicPlayerProfile(authUid);
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
  const snap = await getRequestDb(request).collection('teams')
      .where('clubId', '==', clubId)
      .limit(200)
      .get();
  const teams = snap.docs.map((d) => ({id: d.id, ...d.data()}));
  return {teams};
});

/**
 * Normalize team dispatch codes (e.g. QA-PP26) for Firestore lookup.
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
 * Parent setup: clubs open to self-join (joinable flag) or all clubs on dev project.
 * Auth required — Admin SDK bypasses tenant-scoped Firestore rules.
 */
exports.listJoinableClubs = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const projectId =
      process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || '';
  const isDevProject = projectId === 'sports-skill-tracker-dev';

  const snap = await db().collection('organizations').limit(200).get();
  /** @type {Array<{id: string, name: string, slug?: string}>} */
  const clubs = [];
  snap.forEach((d) => {
    const data = d.data() || {};
    const joinable =
        data.joinable === true || data.publicRegistration === true;
    if (joinable || isDevProject) {
      clubs.push({
        id: d.id,
        name: typeof data.name === 'string' && data.name.trim() ?
          data.name.trim() :
          d.id,
        ...(typeof data.slug === 'string' && data.slug.trim() ?
          {slug: data.slug.trim()} :
          {}),
      });
    }
  });
  clubs.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return {clubs};
});

/**
 * Parent setup: resolve team dispatch code → club + team (GP-GATE-03).
 */
exports.resolveDispatchCode = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const raw = request.data && request.data.dispatchCode;
  const codeNorm = normTeamInviteCode(raw);
  if (!codeNorm) {
    throw new HttpsError('invalid-argument', 'dispatchCode is required.');
  }

  const reqDb = getRequestDb(request);
  const tq = await reqDb.collection('teams')
      .where('inviteCode', '==', codeNorm)
      .limit(2)
      .get();
  if (tq.empty) {
    throw new HttpsError(
        'not-found',
        'No team matches this dispatch code. Ask your coach for the correct code.',
    );
  }
  if (tq.size > 1) {
    throw new HttpsError(
        'failed-precondition',
        'Multiple teams share this code. Contact the club to resolve.',
    );
  }

  const tdoc = tq.docs[0];
  const tData = tdoc.data() || {};
  const clubId =
      typeof tData.clubId === 'string' ? tData.clubId.trim() : '';
  if (!clubId) {
    throw new HttpsError(
        'failed-precondition',
        'Team is not linked to a club.',
    );
  }

  const clubSnap = await reqDb.collection('clubs').doc(clubId).get();
  const clubData = clubSnap.exists ? clubSnap.data() || {} : {};
  const clubName =
      typeof clubData.name === 'string' && clubData.name.trim() ?
        clubData.name.trim() :
        clubId;
  const teamName =
      typeof tData.name === 'string' && tData.name.trim() ?
        tData.name.trim() :
        tdoc.id;

  return {
    ok: true,
    clubId,
    teamId: tdoc.id,
    clubName,
    teamName,
    dispatchCode: codeNorm,
  };
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
  await writeSecurityAuditLog({
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
async function syncClubEntitlements(clubId, maxSeats, adminEmail) {
  if (!clubId) return;
  const entRef = getRegistryDb().collection('license_entitlements').doc(clubId);
  await getRegistryDb().runTransaction(async (t) => {
    const snap = await t.get(entRef);
    const cur = snap.exists && typeof snap.data().seats_limit === 'number' && !Number.isNaN(snap.data().seats_limit) ? snap.data().seats_limit : 0;
    const active = snap.exists && typeof snap.data().active_seats === 'number' && !Number.isNaN(snap.data().active_seats) ? snap.data().active_seats : 0;
    const reserved = snap.exists && typeof snap.data().reserved_seats === 'number' && !Number.isNaN(snap.data().reserved_seats) ? snap.data().reserved_seats : 0;
    t.set(entRef, {
      schemaVersion: 1,
      clubId,
      seats_limit: cur + maxSeats,
      active_seats: active,
      reserved_seats: reserved,
      seatDefinition: 'players_in_club',
      lastReconciledAt: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: adminEmail,
    }, {merge: true});
  });
}

exports.generateLicense = onCall({region: REGION}, async (request) => {
  assertSuperAdmin(request);
  const data = request.data || {};
  const licenseTypeRaw = typeof data.licenseType === 'string' ? data.licenseType.trim() : '';
  const licenseType = licenseTypeRaw && licenseTypeRaw.length <= 64 ? licenseTypeRaw.slice(0, 64) : 'subscription';
  let maxSeats = parseInt(data.maxSeats, 10);
  if (!Number.isFinite(maxSeats) || maxSeats < 1) maxSeats = 10;
  maxSeats = Math.min(Math.floor(maxSeats), 100000);
  let durationMonths = parseInt(data.durationMonths, 10);
  if (!Number.isFinite(durationMonths) || durationMonths < 1) durationMonths = 12;
  durationMonths = Math.min(Math.floor(durationMonths), 120);
  const clubId = typeof data.clubId === 'string' ? data.clubId.trim().slice(0, 128) : '';
  const adminEmail = normEmail(request.auth.token.email) || 'unknown';

  for (let attempt = 0; attempt < 16; attempt++) {
    const licenseKey = generateLicenseKeyString();
    const ref = getRegistryDb().collection('licenses').doc(licenseKey);
    try {
      await ref.create({
        licenseKey,
        licenseType,
        maxSeats,
        durationMonths,
        clubId: clubId || null,
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: adminEmail,
      });
      await syncClubEntitlements(clubId, maxSeats, adminEmail);
      await writeSecurityAuditLog({
        admin: adminEmail,
        action: 'GENERATE_LICENSE',
        target: clubId || licenseKey,
        details: JSON.stringify({ licenseKey, licenseType, maxSeats, durationMonths }),
      });
      return {ok: true, licenseKey};
    } catch (err) {
      if (isAlreadyExistsError(err)) continue;
      logger.error('generateLicense create failed', err);
      throw new HttpsError('internal', err?.message ? String(err.message) : 'Could not create license.');
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
  const clubId = typeof data.clubId === 'string' ? data.clubId.trim().slice(0, 128) : '';
  const primaryHex = typeof data.brandPrimaryHex === 'string' ? data.brandPrimaryHex.trim() : '';
  const accentHex = typeof data.brandAccentHex === 'string' ? data.brandAccentHex.trim() : '';
  const logoUrl = typeof data.logoUrl === 'string' ? data.logoUrl.trim().slice(0, 2000) : '';

  if (!clubId) throw new HttpsError('invalid-argument', 'clubId is required.');
  const hexOk = (h) => /^#[0-9A-Fa-f]{6}$/.test(h);
  if (!hexOk(primaryHex) || !hexOk(accentHex)) {
    throw new HttpsError('invalid-argument', 'brandPrimaryHex and brandAccentHex must be #RRGGBB.');
  }
  if (logoUrl && !isTrustedFirebaseStorageLogoUrl(logoUrl)) {
    throw new HttpsError('invalid-argument', 'logoUrl must be a Firebase Storage download URL.');
  }

  const actor = assertClubStaffOrSuper(request, clubId);
  const by = normEmail(actor.email) || 'unknown';

  const payload = {
    brandPrimaryHex: primaryHex,
    brandAccentHex: accentHex,
    brandingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    brandingUpdatedBy: by,
    ...(logoUrl ? {brandLogoUrl: logoUrl} : {}),
  };

  await getRequestDb(request).collection('clubs').doc(clubId).set(payload, {merge: true});
  return {ok: true};
});

/**
 * Reserve one licensed seat + create pending coach invite (atomic).
 * Does not touch active_seats until claimCoachInvite.
 */
async function processInviteCoachTxn(reqDb, entRef, inviteRef, clubId, teamId, coachEmail, creatorEmail) {
  return reqDb.runTransaction(async (transaction) => {
    const entSnap = await transaction.get(entRef);
    if (!entSnap.exists) return {kind: 'no_entitlement'};
    const ent = entSnap.data() || {};
    const seatsLimit = typeof ent.seats_limit === 'number' && !Number.isNaN(ent.seats_limit) ? ent.seats_limit : 0;
    const activeSeats = typeof ent.active_seats === 'number' && !Number.isNaN(ent.active_seats) ? ent.active_seats : 0;
    const reservedSeats = typeof ent.reserved_seats === 'number' && !Number.isNaN(ent.reserved_seats) ? ent.reserved_seats : 0;

    if (activeSeats + reservedSeats >= seatsLimit) return {kind: 'full'};

    const inviteSnap = await transaction.get(inviteRef);
    if (inviteSnap.exists && inviteSnap.data().status === 'pending') {
      return {kind: 'duplicate_invite'};
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
      createdBy: creatorEmail,
    });

    return {kind: 'ok'};
  });
}

exports.directorInviteCoach = onCall({region: REGION}, async (request) => {
  const data = request.data || {};
  const teamId = typeof data.teamId === 'string' ? data.teamId.trim().slice(0, 200) : '';
  const coachEmailRaw = typeof data.coachEmail === 'string' ? data.coachEmail.trim() : '';
  const coachEmail = normEmail(coachEmailRaw.slice(0, 320));
  if (!teamId || !coachEmail || !coachEmail.includes('@')) {
    throw new HttpsError('invalid-argument', 'teamId and a valid coachEmail are required.');
  }

  const reqDb = getRequestDb(request);
  const teamSnap = await reqDb.collection('teams').doc(teamId).get();
  if (!teamSnap.exists) throw new HttpsError('not-found', 'Team not found.');
  const clubId = typeof teamSnap.data().clubId === 'string' ? teamSnap.data().clubId.trim() : '';
  if (!clubId) throw new HttpsError('failed-precondition', 'Team has no clubId.');

  assertDirectorClubOrSuper(request, clubId);
  await assertClubSubscriptionWritable(clubId, request);

  const entRef = getRegistryDb().collection('license_entitlements').doc(clubId);
  const inviteId = coachInviteDocId(clubId, teamId, coachEmail);
  const inviteRef = reqDb.collection('coach_invites').doc(inviteId);

  const existingUser = await reqDb.collection('users').doc(coachEmail).get();
  if (existingUser.exists && existingUser.data().role === 'coach' && existingUser.data().teamId === teamId) {
    throw new HttpsError('already-exists', 'This coach is already assigned to this team.');
  }

  const creatorEmail = normEmail(request.auth.token.email) || 'unknown';
  const result = await processInviteCoachTxn(reqDb, entRef, inviteRef, clubId, teamId, coachEmail, creatorEmail);

  if (result.kind === 'no_entitlement') throw new HttpsError('failed-precondition', 'Club license is not configured yet.');
  if (result.kind === 'full') throw new HttpsError('resource-exhausted', 'No licensed seats available for pending invites.');
  if (result.kind === 'duplicate_invite') throw new HttpsError('already-exists', 'A pending invite already exists for this coach and team.');

  return {ok: true, inviteId};
});

/**
 * Coach accepts oldest pending invite — moves one seat from reserved to active.
 */
async function executeClaimCoachInviteTxn(reqDb, entRef, inviteDoc, email, clubId, teamId) {
  const teamRef = reqDb.collection('teams').doc(teamId);
  const userRef = reqDb.collection('users').doc(email);
  const lookupRef = reqDb.collection('coach_lookup').doc(email);

  return reqDb.runTransaction(async (transaction) => {
    const inviteSnap = await transaction.get(inviteDoc.ref);
    if (!inviteSnap.exists || inviteSnap.data().status !== 'pending') return {kind: 'stale'};
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
      if (role && role !== 'player') return {kind: 'role_conflict'};
    }

    const entSnap = await transaction.get(entRef);
    const reserved = entSnap.exists && typeof entSnap.data().reserved_seats === 'number' && !Number.isNaN(entSnap.data().reserved_seats) ? entSnap.data().reserved_seats : 0;
    if (reserved < 1) return {kind: 'no_reserved'};

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
      email, teamId, clubId, role: 'coach',
      coachInviteAcceptedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});
    transaction.set(lookupRef, { teamId, clubId, role: 'coach' }, {merge: true});
    transaction.set(teamRef, {
      coachEmail: email,
      coachAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});

    return {kind: 'ok'};
  });
}

exports.claimCoachInvite = onCall({region: REGION}, async (request) => {
  if (!request.auth || !request.auth.token.email) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const email = normEmail(request.auth.token.email);
  if (!email) throw new HttpsError('invalid-argument', 'Authenticated email missing.');

  const reqDb = getRequestDb(request);
  const pendingSnap = await reqDb.collection('coach_invites')
      .where('coachEmail', '==', email)
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'asc')
      .limit(1)
      .get();

  if (pendingSnap.empty) return {ok: true, claimed: false};

  const inviteDoc = pendingSnap.docs[0];
  const inv = inviteDoc.data();
  const clubId = typeof inv.clubId === 'string' ? inv.clubId : '';
  const teamId = typeof inv.teamId === 'string' ? inv.teamId : '';
  if (!clubId || !teamId) {
    logger.error('claimCoachInvite: malformed invite', inviteDoc.id);
    throw new HttpsError('internal', 'Invite data is invalid.');
  }

  const entRef = getRegistryDb().collection('license_entitlements').doc(clubId);
  const out = await executeClaimCoachInviteTxn(reqDb, entRef, inviteDoc, email, clubId, teamId);

  if (out.kind === 'role_conflict') throw new HttpsError('failed-precondition', 'Your account already has a non-player role. Contact support.');
  if (out.kind === 'no_reserved') throw new HttpsError('failed-precondition', 'Seat reservation out of sync. Ask your director to resend an invite.');
  if (out.kind === 'stale') return {ok: true, claimed: false};
  if (out.kind === 'already_coach') return {ok: true, claimed: true, teamId, reconciled: true};
  return {ok: true, claimed: true, teamId};
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
function parseBookingTimestamps(startIso, endIso) {
  let startDate, endDate;
  try {
    startDate = new Date(startIso);
    endDate = new Date(endIso);
  } catch (e) {
    throw new HttpsError('invalid-argument', 'Invalid start or end time.');
  }
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate.getTime() >= endDate.getTime()) {
    throw new HttpsError('invalid-argument', 'endTime must be after startTime.');
  }
  return {
    startTs: admin.firestore.Timestamp.fromDate(startDate),
    endTs: admin.firestore.Timestamp.fromDate(endDate),
  };
}

async function executeBookFieldTxn(reqDb, fieldRef, teamRef, startTs, endTs, bookingMeta) {
  const { teamId, scheduleDate, activityType, role, tokenClub, tokenTeam, userEmail } = bookingMeta;
  return reqDb.runTransaction(async (transaction) => {
    const fieldSnap = await transaction.get(fieldRef);
    if (!fieldSnap.exists) return {kind: 'no_field'};
    const fieldClub = typeof fieldSnap.data().clubId === 'string' ? fieldSnap.data().clubId.trim() : '';
    if (!fieldClub) return {kind: 'bad_field'};

    const teamSnap = await transaction.get(teamRef);
    if (!teamSnap.exists) return {kind: 'no_team'};
    const teamClub = typeof teamSnap.data().clubId === 'string' ? teamSnap.data().clubId.trim() : '';
    if (teamClub !== fieldClub) return {kind: 'club_mismatch'};

    if (role !== 'super_admin') {
      if ((role === 'director' || role === 'registrar') && tokenClub !== fieldClub) return {kind: 'denied'};
      if (role === 'coach' && (tokenClub !== fieldClub || tokenTeam !== teamId)) return {kind: 'denied'};
      if (role !== 'director' && role !== 'registrar' && role !== 'coach') return {kind: 'denied'};
    }

    const dailyLockRef = fieldRef.collection('schedule_locks').doc(scheduleDate);
    await transaction.get(dailyLockRef);

    const q = fieldRef.collection('schedules').where('scheduleDate', '==', scheduleDate);
    const existingSnap = await transaction.get(q);

    let conflictTeamId = '';
    for (const doc of existingSnap.docs) {
      const d = doc.data();
      if (d.startTime instanceof admin.firestore.Timestamp && d.endTime instanceof admin.firestore.Timestamp) {
        if (timeRangesOverlap(startTs, endTs, d.startTime, d.endTime)) {
          conflictTeamId = typeof d.teamId === 'string' ? d.teamId : '';
          break;
        }
      }
    }
    if (conflictTeamId) return {kind: 'overlap', conflictTeamId};

    const scheduleRef = fieldRef.collection('schedules').doc();
    transaction.set(scheduleRef, {
      teamId, clubId: fieldClub, scheduleDate,
      startTime: startTs, endTime: endTs, activityType,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: userEmail,
    });
    transaction.set(dailyLockRef, { lastBookedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

    return {kind: 'ok', scheduleId: scheduleRef.id};
  });
}

exports.secureBookField = onCall({region: REGION}, async (request) => {
  const data = request.data || {};
  const fieldId = typeof data.fieldId === 'string' ? data.fieldId.trim().slice(0, 128) : '';
  const teamId = typeof data.teamId === 'string' ? data.teamId.trim().slice(0, 200) : '';
  const scheduleDate = typeof data.scheduleDate === 'string' ? data.scheduleDate.trim().slice(0, 12) : '';
  const startIso = typeof data.startTime === 'string' ? data.startTime.trim() : '';
  const endIso = typeof data.endTime === 'string' ? data.endTime.trim() : '';
  const activityRaw = typeof data.activityType === 'string' ? data.activityType.trim() : 'Practice';
  const activityType = activityRaw.toLowerCase() === 'game' ? 'Game' : 'Practice';

  if (!fieldId || !teamId || !scheduleDate || !startIso || !endIso) {
    throw new HttpsError('invalid-argument', 'fieldId, teamId, scheduleDate, startTime, endTime are required.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduleDate)) {
    throw new HttpsError('invalid-argument', 'scheduleDate must be YYYY-MM-DD.');
  }

  const { startTs, endTs } = parseBookingTimestamps(startIso, endIso);
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');

  const reqDb = getRequestDb(request);
  const fieldPre = await reqDb.collection('fields').doc(fieldId).get();
  if (!fieldPre.exists) throw new HttpsError('not-found', 'Field not found.');
  const preClub = typeof fieldPre.data().clubId === 'string' ? fieldPre.data().clubId.trim() : '';
  if (!preClub) throw new HttpsError('failed-precondition', 'Field has no clubId.');
  await assertClubSubscriptionWritable(preClub, request);

  const bookingMeta = {
    teamId, scheduleDate, activityType,
    role: request.auth.token.role,
    tokenClub: request.auth.token.clubId || null,
    tokenTeam: request.auth.token.teamId || null,
    userEmail: normEmail(request.auth.token.email) || 'unknown',
  };

  const fieldRef = reqDb.collection('fields').doc(fieldId);
  const teamRef = reqDb.collection('teams').doc(teamId);
  const txnResult = await executeBookFieldTxn(reqDb, fieldRef, teamRef, startTs, endTs, bookingMeta);

  if (txnResult.kind === 'no_field') throw new HttpsError('not-found', 'Field not found.');
  if (txnResult.kind === 'bad_field') throw new HttpsError('failed-precondition', 'Field has no clubId.');
  if (txnResult.kind === 'no_team') throw new HttpsError('not-found', 'Team not found.');
  if (txnResult.kind === 'club_mismatch') throw new HttpsError('failed-precondition', 'Team and field must belong to the same club.');
  if (txnResult.kind === 'denied') throw new HttpsError('permission-denied', 'You cannot book this field for that team.');
  if (txnResult.kind === 'overlap') {
    const tid = txnResult.conflictTeamId || '';
    const nameSnap = await reqDb.collection('teams').doc(tid).get();
    const teamName = nameSnap.exists && typeof nameSnap.data().name === 'string' && nameSnap.data().name.trim() ? nameSnap.data().name.trim() : tid || 'another team';
    throw new HttpsError('failed-precondition', 'Time slot conflicts with ' + teamName + '.');
  }

  return {ok: true, scheduleId: txnResult.scheduleId};
});

/**
 * Director / super_admin: set per-team seat cap. Sum of all team caps for the
 * club must not exceed license_entitlements/{clubId}.seats_limit.
 */
async function processAllocateSeatsTxn(reqDb, masterRef, rosterRef, teamEntRef, teamsQuery, teamId, clubId, seatsLimit) {
  return reqDb.runTransaction(async (transaction) => {
    const [rosterSnap, masterSnap, teamsSnap] = await Promise.all([
      transaction.get(rosterRef),
      transaction.get(masterRef),
      transaction.get(teamsQuery),
    ]);

    if (!masterSnap.exists) {
      throw new HttpsError('failed-precondition', 'Club license is not configured yet.');
    }
    const master = masterSnap.data() || {};
    const masterLimit = typeof master.seats_limit === 'number' && !Number.isNaN(master.seats_limit) ? master.seats_limit : 0;
    const list = rosterSnap.exists && Array.isArray(rosterSnap.data().players) ? rosterSnap.data().players : [];
    const activeCount = list.length;

    if (seatsLimit < activeCount) {
      throw new HttpsError('invalid-argument', `seatsLimit must be at least current roster size (${activeCount}).`);
    }

    let sumOthers = 0;
    for (const td of teamsSnap.docs) {
      if (td.id === teamId) continue;
      const oSnap = await transaction.get(reqDb.collection('team_entitlements').doc(td.id));
      if (oSnap.exists && typeof oSnap.data().seats_limit === 'number' && !Number.isNaN(oSnap.data().seats_limit)) {
        sumOthers += oSnap.data().seats_limit;
      }
    }

    if (sumOthers + seatsLimit > masterLimit) {
      throw new HttpsError('failed-precondition', 'Team allocations exceed the club master license limit.');
    }

    transaction.set(teamEntRef, {
      clubId,
      teamId,
      seats_limit: seatsLimit,
      active_seats: activeCount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: 'system:secureAllocateTeamSeats',
    }, {merge: true});
  });
}

exports.secureAllocateTeamSeats = onCall({region: REGION}, async (request) => {
  const actor = assertDirectorOrSuper(request);
  const data = request.data || {};
  const teamId = typeof data.teamId === 'string' ? data.teamId.trim().slice(0, 200) : '';
  let seatsLimit = typeof data.seatsLimit === 'string' ? parseInt(data.seatsLimit, 10) : data.seatsLimit;
  if (!teamId || !Number.isFinite(seatsLimit) || seatsLimit < 1) {
    throw new HttpsError('invalid-argument', 'teamId and a positive integer seatsLimit are required.');
  }
  seatsLimit = Math.floor(seatsLimit);

  const reqDb = getRequestDb(request);
  const teamSnap = await reqDb.collection('teams').doc(teamId).get();
  if (!teamSnap.exists) throw new HttpsError('not-found', 'Team not found.');
  const clubId = typeof teamSnap.data().clubId === 'string' ? teamSnap.data().clubId.trim() : '';
  if (!clubId) throw new HttpsError('failed-precondition', 'Team has no club scope.');

  if (actor.role === 'director' && (!actor.clubId || actor.clubId !== clubId)) {
    throw new HttpsError('permission-denied', 'Out of club scope.');
  }

  await assertClubSubscriptionWritable(clubId, request);

  const rosterRef = reqDb.collection('rosters').doc(teamId);
  const masterRef = getRegistryDb().collection('license_entitlements').doc(clubId);
  const teamEntRef = reqDb.collection('team_entitlements').doc(teamId);
  const teamsQuery = reqDb.collection('teams').where('clubId', '==', clubId);

  await processAllocateSeatsTxn(reqDb, masterRef, rosterRef, teamEntRef, teamsQuery, teamId, clubId, seatsLimit);

  return {ok: true, teamId, seatsLimit};
});

const MAX_BULK_ROSTER_ROWS = 200;

function normalizePhoneLookupKey(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? `phone_${digits.slice(-10)}` : '';
}

/**
 * Shared roster-add transaction body for secureAddPlayer / secureBulkAddPlayers.
 * @param {admin.firestore.Transaction} transaction
 * @param {object} params
 * @return {Promise<{kind: string}>}
 */
async function secureAddPlayerTxn(transaction, params) {
  const {
    teamId, clubId, playerName, playerEmail, jersey,
    parentPhone, parentName, dob,
    rosterRef, entRef, teamEntRef, lookupRef, phoneLookupRef,
    updatedBy,
  } = params;

  const rosterSnap = await transaction.get(rosterRef);
  const list = rosterSnap.exists && Array.isArray(rosterSnap.data().players) ?
    rosterSnap.data().players : [];
  if (list.includes(playerName)) return {kind: 'duplicate'};

  const teamEntSnap = await transaction.get(teamEntRef);
  if (teamEntSnap.exists) {
    const td = teamEntSnap.data() || {};
    const teClub = typeof td.clubId === 'string' ? td.clubId.trim() : '';
    if (teClub && teClub !== clubId) return {kind: 'no_entitlement'};
    const tLimit = typeof td.seats_limit === 'number' ? td.seats_limit : 0;
    const tActive = typeof td.active_seats === 'number' ? td.active_seats : 0;
    if (tLimit > 0 && tActive >= tLimit) return {kind: 'team_full'};
  }

  const entSnap = await transaction.get(entRef);
  if (!entSnap.exists) {
    transaction.set(entRef, {
      clubId,
      allocated_seats: 100,
      active_seats: 1,
      tier: 'starter',
      subscription_status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy,
    });
  } else {
    const entData = entSnap.data() || {};
    const allocated = typeof entData.allocated_seats === 'number' ? entData.allocated_seats :
      (typeof entData.seats_limit === 'number' ? entData.seats_limit : 100);
    const active = typeof entData.active_seats === 'number' ? entData.active_seats : 0;
    if (allocated > 0 && active >= allocated) return {kind: 'full'};

    transaction.update(entRef, {
      active_seats: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy,
    });
  }

  const jerseys = rosterSnap.exists && typeof rosterSnap.data().jerseys === 'object' ?
    {...rosterSnap.data().jerseys} : {};
  if (jersey) jerseys[playerName] = jersey;

  if (teamEntSnap.exists) {
    transaction.update(teamEntRef, {
      active_seats: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy,
    });
  }

  transaction.set(rosterRef, {players: [...list, playerName], jerseys}, {merge: true});

  const lookupPayload = {
    teamId,
    playerName,
    clubId,
    ...(playerEmail ? {playerEmail} : {}),
    ...(parentPhone ? {parentPhone} : {}),
    ...(parentName ? {parentName} : {}),
    ...(dob ? {dob} : {}),
    ...(jersey ? {jersey} : {}),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (lookupRef) transaction.set(lookupRef, lookupPayload, {merge: true});
  if (phoneLookupRef) transaction.set(phoneLookupRef, lookupPayload, {merge: true});
  return {kind: 'ok'};
}

/**
 * Normalize one bulk-import roster row.
 * @param {unknown} row
 * @return {{ok: true, playerName: string, playerEmail: string, parentPhone: string, parentName: string, dob: string, jersey: string} | {ok: false, reason: string}}
 */
function normalizeBulkPlayerRow(row) {
  if (!row || typeof row !== 'object') {
    return {ok: false, reason: 'invalid_row'};
  }
  let playerName =
      typeof row.playerName === 'string' ? row.playerName.trim() : '';
  playerName = playerName.replace(/\s+/g, ' ');
  if (!playerName || playerName.length > 200) {
    return {ok: false, reason: 'invalid_name'};
  }

  let playerEmail = '';
  if (typeof row.playerEmail === 'string' && row.playerEmail.trim()) {
    playerEmail = normEmail(row.playerEmail.trim().slice(0, 320));
    if (!playerEmail || !playerEmail.includes('@')) {
      return {ok: false, reason: 'invalid_email'};
    }
  }

  let parentPhone = '';
  if (typeof row.parentPhone === 'string' && row.parentPhone.trim()) {
    parentPhone = row.parentPhone.trim().slice(0, 30);
  }

  let parentName = '';
  if (typeof row.parentName === 'string' && row.parentName.trim()) {
    parentName = row.parentName.trim().slice(0, 100);
  }

  let dob = '';
  if (typeof row.dob === 'string' && row.dob.trim()) {
    dob = row.dob.trim().slice(0, 30);
  }

  let jersey = '';
  if (typeof row.jersey === 'string' && row.jersey.trim()) {
    jersey = row.jersey.trim().slice(0, 16);
  }

  return {ok: true, playerName, playerEmail, parentPhone, parentName, dob, jersey};
}

/**
 * Atomic roster add with license_entitlements seat check
 * (no direct client writes).
 */
exports.secureAddPlayer = onCall({region: REGION, cors: true}, async (request) => {
  const data = request.data || {};
  const teamId = typeof data.teamId === 'string' ? data.teamId.trim().slice(0, 200) : '';
  let playerName = typeof data.playerName === 'string' ? data.playerName.trim().replace(/\s+/g, ' ') : '';
  if (!playerName || playerName.length > 200) {
    throw new HttpsError('invalid-argument', 'playerName is required (1-200 characters).');
  }

  let playerEmail = '';
  if (typeof data.playerEmail === 'string' && data.playerEmail.trim()) {
    playerEmail = normEmail(data.playerEmail.trim().slice(0, 320));
    if (!playerEmail || !playerEmail.includes('@')) {
      throw new HttpsError('invalid-argument', 'playerEmail must be a valid email when provided.');
    }
  }

  let parentPhone = typeof data.parentPhone === 'string' ? data.parentPhone.trim().slice(0, 30) : '';
  let parentName = typeof data.parentName === 'string' ? data.parentName.trim().slice(0, 100) : '';
  let dob = typeof data.dob === 'string' ? data.dob.trim().slice(0, 30) : '';
  let jersey = typeof data.jersey === 'string' && data.jersey.trim() ? data.jersey.trim().slice(0, 16) : '';

  const {clubId} = await assertCanSecureAddPlayer(request, teamId);
  await assertClubSubscriptionWritable(clubId, request);

  const reqDb = getRequestDb(request);
  const rosterRef = reqDb.collection('rosters').doc(teamId);
  const entRef = getRegistryDb().collection('license_entitlements').doc(clubId);
  const teamEntRef = reqDb.collection('team_entitlements').doc(teamId);
  const lookupRef = playerEmail ? reqDb.collection('player_lookup').doc(playerEmail) : null;
  const phoneKey = normalizePhoneLookupKey(parentPhone);
  const phoneLookupRef = phoneKey ? reqDb.collection('player_lookup').doc(phoneKey) : null;

  const txnResult = await reqDb.runTransaction(async (transaction) =>
    secureAddPlayerTxn(transaction, {
      teamId, clubId, playerName, playerEmail, jersey,
      parentPhone, parentName, dob,
      rosterRef, entRef, teamEntRef, lookupRef, phoneLookupRef,
      updatedBy: 'system:secureAddPlayer',
    }),
  );

  if (txnResult.kind === 'duplicate') return {ok: true, duplicate: true};
  if (txnResult.kind === 'email_in_use') throw new HttpsError('already-exists', 'That email is already linked to a player on another team.');
  if (txnResult.kind === 'no_entitlement') throw new HttpsError('failed-precondition', 'Club license is not configured yet.');
  if (txnResult.kind === 'team_full') throw new HttpsError('failed-precondition', 'team-full');
  if (txnResult.kind === 'full') throw new HttpsError('resource-exhausted', 'Licensed roster seats are fully allocated.');
  return {ok: true};
});

async function enqueueParentInviteEmail(reqDb, teamId, playerName, parentEmail) {
  if (!parentEmail) return;
  try {
    const teamDoc = await reqDb.collection('teams').doc(teamId).get();
    const teamName = teamDoc.exists && teamDoc.data()?.name ? teamDoc.data().name : 'Your Squad';
    const teamCode = teamDoc.exists && (teamDoc.data()?.inviteCode || teamDoc.data()?.dispatchCode) ?
      (teamDoc.data().inviteCode || teamDoc.data().dispatchCode) : '';
    await reqDb.collection('mail').add({
      to: [parentEmail],
      message: {
        subject: `You're invited to join ${teamName} on SSTracker!`,
        text: `Hello,\n\n${playerName} has been added to ${teamName}.\n\nYour Persistent Team Code is: ${teamCode}\n\nLink your player account: https://sports-skill-tracker-dev.web.app/parent/household\n\n- SSTracker`,
        html: `<div style="font-family:sans-serif;background:#0f172a;color:#f8fafc;padding:24px;border-radius:8px;"><h2 style="color:#14b8a6;margin-top:0;">Welcome to ${teamName}!</h2><p><strong>${playerName}</strong> has been added to the team roster.</p><div style="background:#020617;border:1px solid #14b8a6;border-radius:6px;padding:16px;margin:20px 0;text-align:center;"><span style="font-size:12px;color:#94a3b8;">PERSISTENT TEAM CODE</span><br/><strong style="font-size:28px;font-family:monospace;color:#daff0a;">${teamCode}</strong></div><p style="text-align:center;"><a href="https://sports-skill-tracker-dev.web.app/parent/household" style="background:#fbbf24;color:#000;padding:12px 24px;text-decoration:none;font-weight:bold;border-radius:4px;display:inline-block;">Link Player Account</a></p></div>`,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    logger.warn('[adminOps] Failed to enqueue invite email', err);
  }
}

/**
 * Bulk roster import — same per-row txn semantics as secureAddPlayer.
 * Coach / director / registrar / super_admin on assigned team only.
 */
exports.secureBulkAddPlayers = onCall({region: REGION, cors: true}, async (request) => {
  const data = request.data || {};
  const teamId = typeof data.teamId === 'string' ? data.teamId.trim().slice(0, 200) : '';
  if (!teamId) throw new HttpsError('invalid-argument', 'teamId is required.');

  const rawPlayers = data.players;
  if (!Array.isArray(rawPlayers) || rawPlayers.length === 0) {
    throw new HttpsError('invalid-argument', 'players must be a non-empty array.');
  }
  if (rawPlayers.length > MAX_BULK_ROSTER_ROWS) {
    throw new HttpsError('invalid-argument', `At most ${MAX_BULK_ROSTER_ROWS} players per bulk import.`);
  }

  const {clubId} = await assertCanSecureAddPlayer(request, teamId);
  await assertClubSubscriptionWritable(clubId, request);

  const reqDb = getRequestDb(request);
  const rosterRef = reqDb.collection('rosters').doc(teamId);
  const entRef = getRegistryDb().collection('license_entitlements').doc(clubId);
  const teamEntRef = reqDb.collection('team_entitlements').doc(teamId);

  let added = 0, duplicates = 0, skipped = 0, seatCapHit = false;
  const errors = [];

  for (let index = 0; index < rawPlayers.length; index++) {
    const normalized = normalizeBulkPlayerRow(rawPlayers[index]);
    if (!normalized.ok) {
      errors.push({index, reason: normalized.reason});
      skipped++;
      continue;
    }

    const {playerName, playerEmail, parentPhone, parentName, dob, jersey} = normalized;
    const lookupRef = playerEmail ? reqDb.collection('player_lookup').doc(playerEmail) : null;
    const phoneKey = normalizePhoneLookupKey(parentPhone);
    const phoneLookupRef = phoneKey ? reqDb.collection('player_lookup').doc(phoneKey) : null;

    const txnResult = await reqDb.runTransaction(async (transaction) =>
      secureAddPlayerTxn(transaction, {
        teamId, clubId, playerName, playerEmail, jersey,
        parentPhone, parentName, dob,
        rosterRef, entRef, teamEntRef, lookupRef, phoneLookupRef,
        updatedBy: 'system:secureBulkAddPlayers',
      }),
    );

    if (txnResult.kind === 'ok') {
      added++;
      if (playerEmail) {
        await enqueueParentInviteEmail(reqDb, teamId, playerName, playerEmail);
      }
      continue;
    }
    if (txnResult.kind === 'duplicate') { duplicates++; continue; }
    if (txnResult.kind === 'email_in_use') { errors.push({index, reason: 'email_in_use'}); skipped++; continue; }
    if (txnResult.kind === 'no_entitlement') throw new HttpsError('failed-precondition', 'Club license is not configured yet.');
    if (txnResult.kind === 'team_full' || txnResult.kind === 'full') {
      seatCapHit = true;
      errors.push({index, reason: txnResult.kind === 'team_full' ? 'team_full' : 'club_full'});
      skipped += rawPlayers.length - index;
      break;
    }
  }

  return {ok: true, added, duplicates, skipped, seatCapHit, errors};
});

/**
 * Atomic roster remove + license_entitlements seat release + player_lookup
 * cleanup (Admin SDK only).
 */
exports.secureRemovePlayer = onCall({region: REGION, cors: true}, async (request) => {
  const data = request.data || {};
  const teamId = typeof data.teamId === 'string' ? data.teamId.trim().slice(0, 200) : '';
  let playerName = typeof data.playerName === 'string' ? data.playerName.trim().replace(/\s+/g, ' ') : '';
  if (!playerName || playerName.length > 200) {
    throw new HttpsError('invalid-argument', 'playerName is required (1-200 characters).');
  }

  const {clubId} = await assertCanSecureAddPlayer(request, teamId);
  const reqDb = getRequestDb(request);

  const rosterRef = reqDb.collection('rosters').doc(teamId);
  const entRef = getRegistryDb().collection('license_entitlements').doc(clubId);
  const teamEntRef = reqDb.collection('team_entitlements').doc(teamId);
  const lookupQuery = reqDb.collection('player_lookup')
      .where('teamId', '==', teamId)
      .where('playerName', '==', playerName)
      .limit(10);

  const txnResult = await reqDb.runTransaction(async (transaction) => {
    const rosterSnap = await transaction.get(rosterRef);
    const list = rosterSnap.exists && Array.isArray(rosterSnap.data().players) ? rosterSnap.data().players : [];
    if (!list.includes(playerName)) return {kind: 'not_found'};

    const entSnap = await transaction.get(entRef);
    const teamEntSnap = await transaction.get(teamEntRef);
    const lookupSnap = await transaction.get(lookupQuery);

    const jerseys = rosterSnap.exists && rosterSnap.data().jerseys && typeof rosterSnap.data().jerseys === 'object' ? {...rosterSnap.data().jerseys} : {};
    delete jerseys[playerName];

    transaction.set(rosterRef, {players: list.filter((p) => p !== playerName), jerseys}, {merge: true});
    lookupSnap.forEach((d) => transaction.delete(d.ref));

    if (entSnap.exists) {
      const activeSeats = typeof entSnap.data().active_seats === 'number' ? entSnap.data().active_seats : 0;
      transaction.update(entRef, { active_seats: Math.max(0, activeSeats - 1), updatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedBy: 'system:secureRemovePlayer' });
    }

    if (teamEntSnap.exists) {
      const a = typeof teamEntSnap.data().active_seats === 'number' ? teamEntSnap.data().active_seats : 0;
      transaction.update(teamEntRef, { active_seats: Math.max(0, a - 1), updatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedBy: 'system:secureRemovePlayer' });
    }

    return {kind: 'ok'};
  });

  if (txnResult.kind === 'not_found') return {ok: true, notFound: true};
  return {ok: true};
});

/**
 * Jersey number updates on rosters/{teamId} (no license seat change).
 */
exports.secureUpdateJersey = onCall({region: REGION, cors: true}, async (request) => {
  const data = request.data || {};
  const teamId = typeof data.teamId === 'string' ? data.teamId.trim().slice(0, 200) : '';
  let playerName = typeof data.playerName === 'string' ? data.playerName.trim().replace(/\s+/g, ' ') : '';
  if (!teamId || !playerName || playerName.length > 200) {
    throw new HttpsError('invalid-argument', 'teamId and playerName are required.');
  }

  let jersey = typeof data.jersey === 'string' && data.jersey.trim() ? data.jersey.trim().slice(0, 16) : '';
  await assertCanSecureAddPlayer(request, teamId);

  const reqDb = getRequestDb(request);
  const rosterRef = reqDb.collection('rosters').doc(teamId);

  const txnResult = await reqDb.runTransaction(async (transaction) => {
    const rosterSnap = await transaction.get(rosterRef);
    const list = rosterSnap.exists && Array.isArray(rosterSnap.data().players) ? rosterSnap.data().players : [];
    if (!list.includes(playerName)) return {kind: 'not_found'};

    const jerseys = rosterSnap.exists && rosterSnap.data().jerseys && typeof rosterSnap.data().jerseys === 'object' ? {...rosterSnap.data().jerseys} : {};
    if (jersey) jerseys[playerName] = jersey;
    else delete jerseys[playerName];

    transaction.set(rosterRef, {jerseys}, {merge: true});
    return {kind: 'ok'};
  });

  if (txnResult.kind === 'not_found') return {ok: true, notFound: true};
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
  const reqDb = getRequestDb(request);
  if (actor.role === 'super_admin') {
    const raw = typeof data.clubId === 'string' ? data.clubId.trim() : '';
    if (!raw) throw new HttpsError('invalid-argument', 'clubId is required for super admin.');
    const cSnap = await reqDb.collection('clubs').doc(raw).get();
    if (!cSnap.exists) throw new HttpsError('not-found', 'Club not found.');
    clubId = raw;
  } else {
    if (!actor.clubId) throw new HttpsError('failed-precondition', 'Club scope missing; sign out and back in.');
    clubId = actor.clubId;
  }

  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const body = typeof data.body === 'string' ? data.body.trim() : '';
  if (!title || title.length > 200) throw new HttpsError('invalid-argument', 'title is required (max 200 characters).');
  if (!body || body.length > 8000) throw new HttpsError('invalid-argument', 'body is required (max 8000 characters).');

  const audienceRaw = typeof data.targetAudience === 'string' ? data.targetAudience.trim() : '';
  const allowedAudiences = ['all', 'parents', 'coaches', 'players'];
  if (!allowedAudiences.includes(audienceRaw)) {
    throw new HttpsError('invalid-argument', 'targetAudience must be all, parents, coaches, or players.');
  }

  const docRef = await reqDb.collection('clubs').doc(clubId)
      .collection('campaigns')
      .add({
        title,
        body,
        targetAudience: audienceRaw,
        priority: data.priority === true,
        clubId,
        authorId: request.auth.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

  return {ok: true, campaignId: docRef.id, clubId};
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
    {region: REGION},
    async (request) => {
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be signed in to redeem an invite code.');
      }

      const uid = request.auth.uid;
      const {inviteId} = request.data || {};
      if (!inviteId || typeof inviteId !== 'string') {
        throw new HttpsError('invalid-argument', '`inviteId` is required.');
      }

      const inviteRef = getRegistryDb().collection('invites').doc(inviteId);
      const inviteSnap = await inviteRef.get();
      if (!inviteSnap.exists) throw new HttpsError('not-found', 'Invite not found.');

      const invite = inviteSnap.data() || {};
      if (invite.status !== 'consumed' || invite.consumedBy !== uid) {
        logger.warn('[assignTenantClaims] status/owner mismatch', {inviteId, status: invite.status, consumedBy: invite.consumedBy, callerUid: uid});
        throw new HttpsError('permission-denied', 'Invite code is not in a redeemable state.');
      }

      const expiresAt = invite.expiresAt?.toDate ? invite.expiresAt.toDate() : new Date(invite.expiresAt || 0);
      if (expiresAt < new Date()) {
        await inviteRef.update({status: 'expired'}).catch(() => {});
        throw new HttpsError('deadline-exceeded', 'Invite code has expired.');
      }

      const tenantId = String(invite.tenantId || invite.clubId || '');
      const targetRole = String(invite.targetRole || '');
      const teamId = invite.teamId ? String(invite.teamId) : null;
      if (!tenantId || !targetRole) throw new HttpsError('internal', 'Invite is missing tenantId or targetRole.');

      const existingClaims = (await admin.auth().getUser(uid)).customClaims || {};
      const newClaims = {...existingClaims, clubId: tenantId, role: targetRole, ...(teamId ? {teamId} : {})};
      await admin.auth().setCustomUserClaims(uid, newClaims);

      try {
        const userEmail = (await admin.auth().getUser(uid)).email;
        if (userEmail) {
          await getRegistryDb().collection('users').doc(userEmail.toLowerCase()).set({
            role: targetRole, clubId: tenantId, ...(teamId ? {teamId} : {}),
          }, {merge: true});
        }
      } catch (syncErr) {
        logger.warn('[assignTenantClaims] Firestore user sync failed:', syncErr);
      }

      await writeSecurityAuditLog({
        admin: request.auth.token.email || uid,
        action: 'ASSIGN_TENANT_CLAIMS',
        target: uid,
        details: JSON.stringify({ tenantId, targetRole, teamId }),
      });

      logger.info('[assignTenantClaims] claims assigned', {uid, tenantId, targetRole, teamId});
      return {success: true};
    },
);


// ── Epic 5 — Security & Infrastructure: impersonateUser ────────────────────────
//
// Callable for Global Admins to generate a custom token for another user
// without requiring their password. Used for remote debugging/support.
// ─────────────────────────────────────────────────────────────────────────────
exports.impersonateUser = onCall(
    {region: REGION},
    async (request) => {
      if (!request.auth) throw new HttpsError('unauthenticated', 'You must be signed in to impersonate.');

      const callerRole = request.auth.token.role;
      if (callerRole !== 'global_admin' && callerRole !== 'super_admin') {
        logger.warn('[impersonateUser] unauthorized attempt', {uid: request.auth.uid, role: callerRole});
        throw new HttpsError('permission-denied', 'You must be a global admin to impersonate users.');
      }

      const {targetUid: targetUidIn, targetEmail: targetEmailIn} = request.data || {};
      if (!targetUidIn && !targetEmailIn) {
        throw new HttpsError('invalid-argument', 'Provide targetUid or targetEmail.');
      }

      const adminEmail = normEmail(request.auth.token.email) || request.auth.uid;

      let userRecord;
      try {
        if (targetUidIn) {
          userRecord = await admin.auth().getUser(targetUidIn);
        } else {
          userRecord = await admin.auth().getUserByEmail(normEmail(targetEmailIn) || targetEmailIn);
        }
      } catch (err) {
        logger.warn('[impersonateUser] target lookup failed', { admin: adminEmail, targetUidIn, targetEmailIn, err: err?.message });
        throw new HttpsError('not-found', 'Target user does not exist.');
      }

      const targetUid = userRecord.uid;
      const targetEmail = normEmail(userRecord.email) || targetEmailIn || '';

      if (request.auth.uid === targetUid) {
        throw new HttpsError('failed-precondition', 'Cannot impersonate your own account.');
      }

      let targetRole = '';
      if (targetEmail || targetUid) {
        let userDocSnap = targetEmail ? await db().collection('users').doc(targetEmail).get().catch(() => null) : null;
        if (!userDocSnap?.exists && targetUid) {
          userDocSnap = await db().collection('users').doc(targetUid).get().catch(() => null);
        }
        if (userDocSnap?.exists) {
          targetRole = typeof userDocSnap.data()?.role === 'string' ? userDocSnap.data().role : '';
        }
      }
      if (targetRole === 'super_admin' || targetRole === 'global_admin') {
        throw new HttpsError('permission-denied', 'Cannot impersonate another global admin.');
      }

      const additionalClaims = {
        impersonation: true,
        impersonatedBy: adminEmail,
        impersonatedEmail: targetEmail || null,
        impersonatedRole: targetRole || null,
        impersonationStartedAt: Date.now(),
      };

      try {
        const customToken = await admin.auth().createCustomToken(targetUid, additionalClaims);
        await writeSecurityAuditLog({
          admin: adminEmail,
          action: 'IMPERSONATION_SUCCESS',
          target: targetUid,
          details: JSON.stringify({ targetEmail: targetEmail || 'unknown', targetRole, ip: request.rawRequest?.ip || 'unknown' }),
        });
        logger.info('[impersonateUser] success', {actorUid: request.auth.uid, targetUid, targetRole});
        return {
          customToken,
          token: customToken,
          targetUid,
          targetEmail: targetEmail || null,
          targetRole: targetRole || null,
          impersonatedBy: adminEmail,
        };
      } catch (err) {
        logger.error('[impersonateUser] failed to generate token', err);
        throw new HttpsError('internal', 'Failed to generate impersonation token.');
      }
    },
);

exports.executeSupportCommand = onCall(
  {region: REGION, enforceAppCheck: false},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Missing or invalid authorization token');
    }
    
    // Check if the user is a global or super admin via their custom claims
    const role = request.auth.token.role;
    if (role !== 'global_admin' && role !== 'super_admin') {
      throw new HttpsError('permission-denied', 'Insufficient privileges. Support Chat is for Support Agents (Admins).');
    }

    const cmdStr = (request.data.command || '').trim();
    if (!cmdStr) {
      throw new HttpsError('invalid-argument', 'No command provided.');
    }

    // Support Agent Command Parsing
    if (cmdStr.startsWith('/sync-roster')) {
      const match = cmdStr.match(/clubId=([a-zA-Z0-9_-]+)/);
      const clubId = match ? match[1] : null;
      
      if (!clubId) {
        return { reply: "Usage: /sync-roster clubId=<id>" };
      }
      
      // Mock sync logic: update an audit document
      await db().collection('audit_logs').add({
        action: 'admin_sync_roster',
        clubId,
        agentId: request.auth.uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      return { reply: `Roster synchronization successfully queued for club: ${clubId}.` };
    }

    if (cmdStr.startsWith('/clear-queue')) {
      const match = cmdStr.match(/clubId=([a-zA-Z0-9_-]+)/);
      const clubId = match ? match[1] : null;
      if (!clubId) {
        return { reply: "Usage: /clear-queue clubId=<id>" };
      }
      
      // Simulate clearing the queue
      return { reply: `Compliance queues flushed for club: ${clubId}.` };
    }

    return { reply: `Command not recognized: ${cmdStr.split(' ')[0]}. Available commands: /sync-roster, /clear-queue` };
  }
);

exports.updateUserRole = onCall({ region: REGION }, async (request) => {
  const { auth, data } = request;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const callerRole = auth.token.role || '';
  if (callerRole !== 'admin' && callerRole !== 'global_admin' && callerRole !== 'super_admin' && callerRole !== 'director') {
    throw new HttpsError('permission-denied', 'Only authorized staff can update roles.');
  }

  const { targetEmail, newRole } = data;
  if (!targetEmail || !newRole) {
    throw new HttpsError('invalid-argument', 'targetEmail and newRole are required.');
  }

  // Update in Firestore
  const cellDb = getRequestDb(request);
  const docRef = cellDb.collection('users').doc(targetEmail.toLowerCase());
  await docRef.set({ role: newRole }, { merge: true });

  // Update auth claims
  try {
    const userRecord = await admin.auth().getUserByEmail(targetEmail);
    const existingClaims = userRecord.customClaims || {};
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      ...existingClaims,
      role: newRole
    });
  } catch (e) {
    logger.warn('Auth claims update failed for', targetEmail, e);
  }

  await writeSecurityAuditLog({
    admin: auth.token.email || auth.uid,
    action: 'UPDATE_USER_ROLE',
    target: targetEmail,
    details: JSON.stringify({ newRole, callerRole }),
  });

  return { success: true };
});
