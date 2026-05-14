'use strict';

const {onCall} = require('firebase-functions/v2/https');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const {HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const {normEmail, computeAgeYears, computeAgeBand} = require('../utils/formatters');
const {
  assertDirectorOrSuper,
  assertParent,
  assertClubStaff,
} = require('../middleware/authBouncers');

const REGION = 'us-east1';

/** Lazy Firestore accessor — defers init until first call. */
const db = () => admin.firestore();

// ── Private helpers ──────────────────────────────────────────────────────────

/**
 * Returns a deterministic Firestore document ID for a vpc_requests entry.
 * One canonical row per (parentUid, playerEmail) pair — prevents queue stacking
 * when a parent re-submits consent for the same child.
 * @param {string} parentUid  Firebase Auth UID of the parent.
 * @param {string} playerEmail  Normalised (lowercased) player email.
 * @returns {string}
 */
function vpcRequestId(parentUid, playerEmail) {
  const safeEmail = String(playerEmail).replace(/[^a-z0-9._-]/g, '_');
  return `${parentUid}__${safeEmail}`;
}

async function resolveClubIdForVpcIntent(u, h, parentEmail) {
  const fromUser =
      typeof u.clubId === 'string' && u.clubId.trim() ? u.clubId.trim() : null;
  if (fromUser) return fromUser;
  const fromHousehold =
      typeof h.clubId === 'string' && h.clubId.trim() ? h.clubId.trim() : null;
  if (fromHousehold) return fromHousehold;
  const tid = typeof u.teamId === 'string' ? u.teamId.trim() : '';
  if (tid && tid !== 'admin') {
    const tSnap = await db().collection('teams').doc(tid).get();
    if (tSnap.exists) {
      const tc = tSnap.data().clubId;
      if (typeof tc === 'string' && tc.trim()) return tc.trim();
    }
  }
  const pEm = normEmail(parentEmail);
  if (pEm) {
    const pSnap = await db().collection('users').doc(pEm).get();
    if (pSnap.exists) {
      const pc = pSnap.data().clubId;
      if (typeof pc === 'string' && pc.trim()) return pc.trim();
    }
  }
  return null;
}

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

  const uRef = db().collection('users').doc(playerEmail);
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
  // Guard: only block when isMinor is EXPLICITLY false.
  // isMinor === undefined / null means DOB was never self-reported (legacy player);
  // a player in the VPC queue is by definition a minor, so allow the director
  // to finalize rather than dead-locking the flow for pre-DOB-feature accounts.
  if (u.isMinor === false) {
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
  const hSnap = await db().collection('households').doc(hid).get();
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

  const pendingReqs = await db().collection('vpc_requests')
      .where('playerEmail', '==', playerEmail)
      .where('status', 'in', ['pending', 'parent_consented'])
      .get();

  const batch = db().batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  pendingReqs.forEach((d) => {
    batch.set(d.ref, {status: 'completed', completedAt: now}, {merge: true});
  });

  batch.set(uRef, {vpcStatus: 'verified'}, {merge: true});

  const passRef = db().collection('passports').doc(playerEmail);
  batch.set(passRef, {
    hasSignedWaiver: true,
    waiverSignedAt: now,
    waiverAttestedBy: actor.email || 'director',
    waiverMethod: 'vpc_director_attestation',
  }, {merge: true});

  const consentRef = db().collection('consent_records').doc();
  batch.set(consentRef, {
    subjectEmail: playerEmail,
    method: 'director_vpc_attestation',
    verifiedAt: now,
    actorEmail: actor.email || null,
    actorUid: request.auth.uid,
    householdId: hid,
  });

  batch.set(db().collection('security_audit').doc(), {
    action: auditAction,
    playerEmail,
    actorEmail: actor.email || null,
    actorUid: request.auth.uid,
    at: now,
  });

  await batch.commit();

  return {playerEmail, vpcStatus: 'verified'};
}

/**
 * Paginated batch-delete for any Firestore query result set.
 * Firestore batches are capped at 500 writes; this helper splits large
 * query results into sequential batches so the purge can never throw a
 * "batch too large" error regardless of collection size.
 *
 * @param {FirebaseFirestore.Query} q - The query whose matching docs to delete.
 * @param {number} [pageSize=400] - Documents per batch (must be ≤ 500).
 * @return {Promise<number>} Total number of documents deleted.
 */
async function paginatedBatchDelete(q, pageSize = 400) {
  if (pageSize > 499) pageSize = 400;
  let totalDeleted = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await q.limit(pageSize).get();
    if (snap.empty) break;

    const batch = db().batch();
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
    const uRef = db().collection('users').doc(email);
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

    // ── Phase 1: query-based paginated deletes for large collections ──────────
    const playerIdField = 'playerId';
    const playerEmailField = 'playerEmail';

    const [repsDeleted, statsDeleted, evalsDeleted, trialsDeleted, assignsDeleted] =
      await Promise.all([
        paginatedBatchDelete(
            db().collection('reps').where(playerIdField, '==', email),
        ),
        paginatedBatchDelete(
            db().collection('player_stats').where(playerIdField, '==', email),
        ),
        paginatedBatchDelete(
            db().collection('evaluations').where(playerEmailField, '==', email),
        ),
        paginatedBatchDelete(
            db().collection('trials').where(playerEmailField, '==', email),
        ),
        paginatedBatchDelete(
            db().collection('assignments').where(playerIdField, '==', email),
        ),
      ]);

    // ── Phase 2: workout_logs subcollection on the users doc ──────────────────
    const workoutLogsDeleted = await paginatedBatchDelete(
        uRef.collection('workout_logs'),
    );

    // ── Phase 3: atomic batch for documents with known IDs ────────────────────
    const batch = db().batch();

    batch.delete(db().collection('passports').doc(email));
    batch.delete(db().collection('player_lookup').doc(email));

    if (teamId && teamId !== 'admin' && playerName) {
      const rRef = db().collection('rosters').doc(teamId);
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
      const hRef = db().collection('households').doc(householdId);
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

    // ── Phase 4: anonymize the Firebase Auth record ───────────────────────────
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

// ── Exported callable functions ──────────────────────────────────────────────

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
    const snap = await db().collection('users').doc(em).get();
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
  const batch = db().batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  if (householdId) {
    const hRef = db().collection('households').doc(householdId);
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
    householdId = db().collection('households').doc().id;
    const hRef = db().collection('households').doc(householdId);
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
        db().collection('users').doc(em),
        {householdId},
        {merge: true},
    );
  }

  const auditRef = db().collection('security_audit').doc();
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
  const snap = await db().collection('users').doc(playerEmail).get();
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
  // Phase 2, Epic 3: COPPA 2.0 age band for teen 13-16 ad-block interceptors.
  const ageBand = computeAgeBand(ts);

  await snap.ref.update({
    dateOfBirth: ts,
    isMinor,
    vpcStatus,
    ageBand,
  });

  await db().collection('security_audit').add({
    action: 'setPlayerDateOfBirth',
    playerEmail,
    actorEmail: actor.email || null,
    actorUid: request.auth.uid,
    isMinor,
    ageBand,
    at: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {playerEmail, isMinor, vpcStatus, ageBand};
});

// Legacy name; prefer directorApproveVpc for new clients (identical behavior).
exports.verifyVpcForMinor = onCall(
    {region: REGION, enforceAppCheck: false},
    (request) => executeDirectorVpcApproval(request, 'verifyVpcForMinor'),
);

/**
 * Director / super_admin: finalize VPC. Sets users.vpcStatus = verified;
 * onWrite syncUserClaims stamps custom claim vpcVerified for Firestore rules.
 */
exports.directorApproveVpc = onCall(
    {region: REGION, enforceAppCheck: false},
    (request) => executeDirectorVpcApproval(request, 'directorApproveVpc'),
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

  const hRef = db().collection('households').doc(actor.householdId);
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

  const uRef = db().collection('users').doc(playerEmail);
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

  const clubIdResolved = await resolveClubIdForVpcIntent(u, h, actor.email);
  if (!clubIdResolved) {
    throw new HttpsError(
        'failed-precondition',
        'Club context is missing for this athlete. Ask your director to set ' +
        "the player\u2019s club, link a household with a club, or ensure your " +
        'parent profile includes a club.',
    );
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const docId = vpcRequestId(request.auth.uid, playerEmail);
  await db().collection('vpc_requests').doc(docId).set({
    playerEmail,
    parentEmail: actor.email,
    householdId: actor.householdId,
    clubId: clubIdResolved,
    status: 'pending',
    createdAt: now,
  }, {merge: true});

  await db().collection('security_audit').add({
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
 * Sprint 1.2 — COPPA 2026: player self-reports date of birth at account setup.
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

  const uRef = db().collection('users').doc(email);
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
  // Phase 2, Epic 3: COPPA 2.0 age band for teen 13-16 ad-block interceptors.
  const ageBand = computeAgeBand(ts);

  await uRef.update({
    dateOfBirth: ts,
    isMinor,
    vpcStatus,
    ageBand,
  });

  await db().collection('security_audit').add({
    action: 'playerSelfReportDob',
    playerEmail: email,
    actorUid: request.auth.uid,
    isMinor,
    vpcStatus,
    ageBand,
    at: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {ok: true, isMinor, vpcStatus, ageBand};
});

/**
 * Sprint 1.2 — COPPA 2026: parent submits explicit granular consent via the
 * online consent ceremony. Creates a structured consent_records document and
 * updates vpc_requests to 'parent_consented'. Does NOT verify the minor —
 * directorApproveVpc is still required as the second factor.
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

  const hRef = db().collection('households').doc(actor.householdId);
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

  const uRef = db().collection('users').doc(playerEmail);
  const uSnap = await uRef.get();
  if (!uSnap.exists) {
    throw new HttpsError('not-found', 'Player profile not found.');
  }
  const u = uSnap.data();
  // Guard: only block when isMinor is EXPLICITLY false.
  // isMinor === undefined / null means the onboarding pipeline didn't write the
  // field yet; players in a household with vpcStatus 'pending' are by definition
  // the minors VPC is built for, so we allow them through rather than dead-locking
  // parents whose children were invited before the isMinor field was introduced.
  if (u.isMinor === false) {
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

  const consentRef = db().collection('consent_records').doc();
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

  const docId = vpcRequestId(request.auth.uid, playerEmail);
  await db().collection('vpc_requests').doc(docId).set({
    playerEmail,
    parentEmail: actor.email,
    householdId: actor.householdId,
    clubId,
    status: 'parent_consented',
    consentRecordId: consentRef.id,
    consentedAt: now,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }, {merge: true});

  await db().collection('security_audit').add({
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

  const uRef = db().collection('users').doc(playerEmail);
  const plRef = db().collection('player_lookup').doc(playerEmail);
  const targetTeamRef = db().collection('teams').doc(targetTeamId);

  const txResult = await db().runTransaction(async (transaction) => {
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
          db().collection('teams').doc(oldTeamId),
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
      db().collection('rosters').doc(oldTeamId) :
      null;
    const newRosterRef = db().collection('rosters').doc(targetTeamId);

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

    const newTeamEntRef = db().collection('team_entitlements').doc(targetTeamId);
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
          db().collection('license_entitlements').doc(newClubId),
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
          db().collection('team_entitlements').doc(oldTeamId) :
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
        const oldEntRef = db().collection('license_entitlements').doc(oldClubId);
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
            db().collection('license_entitlements').doc(newClubId),
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
  await db().collection('security_audit').doc().set({
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

  const uRef = db().collection('users').doc(playerEmail);
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

  const dup = await db().collection('minor_retention_queue')
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
  await db().collection('minor_retention_queue').add({
    playerEmail,
    clubId: u.clubId || null,
    status: 'pending',
    expireAt,
    enqueuedAt: now,
    actorEmail: actor.email || null,
    actorUid: req.auth.uid,
  });

  await db().collection('security_audit').add({
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
 * Legacy / immediate: pending jobs with no expireAt (pre-TTL enqueue).
 */
exports.processMinorRetentionQueue = onSchedule('every 24 hours', async () => {
  const pending = await db().collection('minor_retention_queue')
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
  const snap = await db().collection('minor_retention_queue')
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
