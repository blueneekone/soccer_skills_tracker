/* eslint-disable quotes */
const {onDocumentWritten} = require('firebase-functions/v2/firestore');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const {defineString} = require('firebase-functions/params');

admin.initializeApp();
const db = admin.firestore();
const ADMIN_EMAIL = defineString('ADMIN_EMAIL');

const REGION = 'us-central1';

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

exports.syncUserClaims = onDocumentWritten('users/{email}', async (event) => {
  const userData = event.data.after.data();

  if (!userData) {
    logger.info('User profile deleted. Exiting function.');
    return null;
  }

  const userEmail = event.params.email;
  const superAdmin = ADMIN_EMAIL.value();

  const customClaims = {
    teamId: userData.teamId || null,
    role: userData.role || 'player',
    clubId: userData.clubId || null,
    householdId: userData.householdId || null,
    minor: userData.isMinor === true,
    vpcVerified: userData.vpcStatus === 'verified',
  };

  logger.info(`Intercepted profile update for: ${userEmail}`);

  if (userEmail.toLowerCase() === superAdmin.toLowerCase()) {
    customClaims.role = 'super_admin';
    logger.info('Super Admin detected! Upgrading badge.');
  }

  try {
    const userRecord = await admin.auth().getUserByEmail(userEmail);
    await admin.auth().setCustomUserClaims(userRecord.uid, customClaims);
    logger.info('Successfully stamped claims!');
  } catch (error) {
    logger.error('Error stamping claims:', error);
  }

  return null;
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
  const isMinor = age < 13;
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
 */
exports.verifyVpcForMinor = onCall({region: REGION}, async (request) => {
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

  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

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
    action: 'verifyVpcForMinor',
    playerEmail,
    actorEmail: actor.email || null,
    actorUid: request.auth.uid,
    at: now,
  });

  await batch.commit();

  return {playerEmail, vpcStatus: 'verified'};
});

/**
 * Epic 2 placeholder: wire to minor_retention_queue / club offboarding jobs.
 * SafeSport messaging CC should enqueue parent copies here when implemented.
 */
exports.purgeLeaverDataStub = onSchedule('every 24 hours', async () => {
  logger.info(
      'TTL purge stub: process minor_retention_queue on club offboarding.',
  );
  return null;
});
