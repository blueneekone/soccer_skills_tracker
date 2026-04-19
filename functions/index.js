/* eslint-disable quotes */
const crypto = require('crypto');
const {onDocumentWritten} = require('firebase-functions/v2/firestore');
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

const REGION = 'us-central1';

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
 * Coach / director / super_admin — allowed to send guarded athlete messages.
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
 * @param {unknown} e
 * @return {string|null}
 */
function normEmail(e) {
  if (typeof e !== 'string') return null;
  const s = e.trim().toLowerCase();
  return s || null;
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
        'the player’s club, link a household with a club, or ensure your ' +
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
      minorRecipient = computeAgeYears(u.dateOfBirth) < 13;
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
    bodyRaw.slice(0, 200) + '…' :
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
 * Epic 1: Server-side workout log + HMAC integrity digest (tamper-evident).
 * — Parent: must be linked household; writes verifiedByUid / verifiedByEmail.
 * — Player: self-log only; verificationMethod player_self_log.
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

      const statsRef = db.collection('player_stats').doc(playerName);
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

  const tSnap = await db.collection('teams').doc(targetTeamId).get();
  if (!tSnap.exists) {
    throw new HttpsError('not-found', 'Target team not found.');
  }
  const newClubId = tSnap.data().clubId || null;
  if (!newClubId) {
    throw new HttpsError('failed-precondition', 'Target team missing clubId.');
  }

  const uRef = db.collection('users').doc(playerEmail);
  const plRef = db.collection('player_lookup').doc(playerEmail);
  const [uSnap, plSnap] = await Promise.all([uRef.get(), plRef.get()]);

  let playerName;
  let oldTeamId;
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
    const ot = await db.collection('teams').doc(oldTeamId).get();
    if (ot.exists) {
      oldClubId = ot.data().clubId || null;
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
      ok: true,
      noop: true,
      playerEmail,
      targetTeamId,
      playerName,
    };
  }

  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  if (uSnap.exists) {
    batch.set(uRef, {
      teamId: targetTeamId,
      clubId: newClubId,
    }, {merge: true});
  }

  batch.set(plRef, {
    teamId: targetTeamId,
    playerName,
  }, {merge: true});

  if (oldTeamId && oldTeamId !== targetTeamId) {
    const oldR = db.collection('rosters').doc(oldTeamId);
    const oldRs = await oldR.get();
    if (oldRs.exists) {
      const d = oldRs.data();
      const players = (d.players || []).filter((p) => p !== playerName);
      const jerseys = {...(d.jerseys || {})};
      delete jerseys[playerName];
      batch.set(oldR, {players, jerseys}, {merge: true});
    }
  }

  const newR = db.collection('rosters').doc(targetTeamId);
  const newRs = await newR.get();
  const players = newRs.exists ? [...(newRs.data().players || [])] : [];
  const jerseys = newRs.exists ? {...(newRs.data().jerseys || {})} : {};
  if (!players.includes(playerName)) {
    players.push(playerName);
  }
  batch.set(newR, {players, jerseys}, {merge: true});

  batch.set(db.collection('security_audit').doc(), {
    action: 'registrarTransferPlayer',
    playerEmail,
    playerName,
    oldTeamId: oldTeamId || null,
    oldClubId: oldClubId || null,
    targetTeamId,
    newClubId,
    actorEmail: actor.email || null,
    actorUid: request.auth.uid,
    at: now,
  });

  await batch.commit();

  return {
    ok: true,
    playerEmail,
    targetTeamId,
    newClubId,
    playerName,
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
        const playerEmails = (hd.playerEmails || [])
            .filter((e) => (e || '').toLowerCase() !== email);
        const playerNames = (hd.playerNames || [])
            .filter((n) => n !== playerName);
        batch.set(hRef, {
          playerEmails,
          playerNames,
          updatedAt: now,
        }, {merge: true});
      }
    }

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
    logger.info(
        `minor_retention_queue: purged ${email} (ttl=${deleteQueueDoc})`,
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
