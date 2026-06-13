'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const crypto = require('crypto');
const {normEmail} = require('../utils/formatters');

const REGION = 'us-east1';
const db = () => admin.firestore();

const PIPELINE = {
  REGISTERED: 'registered',
  WAITLISTED: 'waitlisted',
  CHECKED_IN: 'checked_in',
};

const CHECK_IN = {
  PRESENT: 'present',
  NO_SHOW: 'no_show',
  LATE: 'late',
};

const RSVP = new Set(['going', 'not_going', 'maybe']);

/**
 * @param {string} role
 * @param {string} tokenClub
 * @param {string} clubId
 */
function staffCanAccessClub(role, tokenClub, clubId) {
  if (role === 'super_admin' || role === 'global_admin') return true;
  if (role === 'director' || role === 'registrar' || role === 'coach') {
    return Boolean(tokenClub && tokenClub === clubId);
  }
  return false;
}

/**
 * @param {FirebaseFirestore.DocumentData | undefined} data
 * @param {string} nowIso
 */
function programRegistrationOpen(data, nowIso) {
  if (!data || data.registrationOpen === false) return false;
  if (typeof data.status === 'string' && data.status === 'closed') return false;
  const opens =
    typeof data.registrationOpensAt === 'string' ? data.registrationOpensAt : null;
  const closes =
    typeof data.registrationClosesAt === 'string' ? data.registrationClosesAt : null;
  if (opens && nowIso < opens) return false;
  if (closes && nowIso > closes) return false;
  return true;
}

/**
 * Director/registrar: create or update a tryout program.
 */
exports.upsertTryoutProgram = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const role = request.auth.token.role || '';
  const tokenClub =
    typeof request.auth.token.clubId === 'string' ?
      request.auth.token.clubId.trim() :
      '';
  const allowed = ['director', 'registrar', 'super_admin', 'global_admin'].includes(role);
  if (!allowed) {
    throw new HttpsError('permission-denied', 'Director or registrar access required.');
  }

  const data = request.data || {};
  const clubId = typeof data.clubId === 'string' ? data.clubId.trim() : '';
  const name = typeof data.name === 'string' ? data.name.trim().slice(0, 200) : '';
  const programId =
    typeof data.programId === 'string' ? data.programId.trim() : '';

  if (!clubId || !name) {
    throw new HttpsError('invalid-argument', 'clubId and name are required.');
  }
  if (role === 'director' || role === 'registrar') {
    if (!tokenClub || tokenClub !== clubId) {
      throw new HttpsError('permission-denied', 'Program must belong to your club.');
    }
  }

  const ageBandsRaw = Array.isArray(data.ageBands) ? data.ageBands : [];
  const ageBands = ageBandsRaw
      .map((b) => (typeof b === 'string' ? b.trim().slice(0, 32) : ''))
      .filter(Boolean)
      .slice(0, 24);

  const capacityRaw = Number(data.capacity);
  const capacity =
    Number.isFinite(capacityRaw) && capacityRaw > 0 ?
      Math.min(Math.floor(capacityRaw), 5000) :
      null;

  const feeRaw = Number(data.feeAmountDollars);
  const feeAmountDollars =
    Number.isFinite(feeRaw) && feeRaw > 0 ? Math.min(feeRaw, 5000) : 0;

  const registrationOpen = data.registrationOpen !== false;
  const registrationOpensAt =
    typeof data.registrationOpensAt === 'string' ?
      data.registrationOpensAt.trim().slice(0, 32) :
      null;
  const registrationClosesAt =
    typeof data.registrationClosesAt === 'string' ?
      data.registrationClosesAt.trim().slice(0, 32) :
      null;

  const now = admin.firestore.FieldValue.serverTimestamp();
  const payload = {
    clubId,
    name,
    ageBands,
    registrationOpen,
    ...(registrationOpensAt ? {registrationOpensAt} : {}),
    ...(registrationClosesAt ? {registrationClosesAt} : {}),
    ...(capacity != null ? {capacity} : {}),
    feeAmountDollars,
    status: registrationOpen ? 'open' : 'draft',
    updatedAt: now,
    updatedBy: request.auth.uid,
  };

  let ref;
  if (programId) {
    ref = db().collection('tryout_programs').doc(programId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Tryout program not found.');
    }
    if (snap.data().clubId !== clubId) {
      throw new HttpsError('permission-denied', 'Program club mismatch.');
    }
    await ref.set(payload, {merge: true});
  } else {
    ref = db().collection('tryout_programs').doc();
    await ref.set({
      ...payload,
      registrationCount: 0,
      waitlistCount: 0,
      createdAt: now,
      createdBy: request.auth.uid,
    });
  }

  return {ok: true, programId: ref.id, clubId};
});

/**
 * Public: safe tryout program fields for /tryouts/[programId].
 */
exports.getPublicTryoutProgram = onCall(
    {region: REGION, invoker: 'public'},
    async (request) => {
      const programId =
        typeof request.data?.programId === 'string' ?
          request.data.programId.trim() :
          '';
      if (!programId) {
        throw new HttpsError('invalid-argument', 'programId is required.');
      }

      const snap = await db().collection('tryout_programs').doc(programId).get();
      if (!snap.exists) {
        return {ok: false, notFound: true};
      }

      const p = snap.data() || {};
      const clubId = typeof p.clubId === 'string' ? p.clubId : '';
      const clubSnap = clubId ? await db().doc(`clubs/${clubId}`).get() : null;
      const clubName =
        clubSnap?.exists && typeof clubSnap.data()?.name === 'string' ?
          clubSnap.data().name :
          clubId;

      const nowIso = new Date().toISOString().slice(0, 10);
      const open = programRegistrationOpen(p, nowIso);

      const capacity = Number(p.capacity) || 0;
      const registrationCount = Number(p.registrationCount) || 0;
      const waitlistCount = Number(p.waitlistCount) || 0;

      return {
        ok: true,
        programId,
        clubId,
        clubName,
        name: typeof p.name === 'string' ? p.name : 'Tryouts',
        ageBands: Array.isArray(p.ageBands) ? p.ageBands : [],
        feeAmountDollars: Number(p.feeAmountDollars) || 0,
        registrationOpen: open,
        registrationClosesAt: p.registrationClosesAt || null,
        capacity: capacity > 0 ? capacity : null,
        registrationCount,
        waitlistCount,
        spotsRemaining:
          capacity > 0 ? Math.max(0, capacity - registrationCount) : null,
      };
    },
);

/**
 * Public: register an athlete for a tryout program (waitlist when full).
 */
exports.registerForTryout = onCall(
    {region: REGION, invoker: 'public'},
    async (request) => {
      const data = request.data || {};
      const programId =
        typeof data.programId === 'string' ? data.programId.trim() : '';
      const playerName =
        typeof data.playerName === 'string' ? data.playerName.trim().slice(0, 200) : '';
      const ageBand =
        typeof data.ageBand === 'string' ? data.ageBand.trim().slice(0, 32) : '';
      const guardianName =
        typeof data.guardianName === 'string' ?
          data.guardianName.trim().slice(0, 200) :
          '';
      const guardianEmail = normEmail(data.guardianEmail);
      const guardianPhone =
        typeof data.guardianPhone === 'string' ?
          data.guardianPhone.trim().slice(0, 32) :
          '';

      if (!programId || !playerName || !ageBand || !guardianName || !guardianEmail) {
        throw new HttpsError(
            'invalid-argument',
            'programId, playerName, ageBand, guardianName, and guardianEmail are required.',
        );
      }

      const programRef = db().collection('tryout_programs').doc(programId);
      const nowIso = new Date().toISOString().slice(0, 10);
      const now = admin.firestore.FieldValue.serverTimestamp();

      /** @type {{ registrationId: string, pipelineStatus: string }} */
      const result = await db().runTransaction(async (tx) => {
        const pSnap = await tx.get(programRef);
        if (!pSnap.exists) {
          throw new HttpsError('not-found', 'Tryout program not found.');
        }
        const p = pSnap.data();
        if (!programRegistrationOpen(p, nowIso)) {
          throw new HttpsError(
              'failed-precondition',
              'Registration is closed for this tryout program.',
          );
        }

        const bands = Array.isArray(p.ageBands) ? p.ageBands : [];
        if (bands.length > 0 && !bands.includes(ageBand)) {
          throw new HttpsError('invalid-argument', 'Invalid age band for this program.');
        }

        const regKey = crypto
            .createHash('sha256')
            .update(`${programId}|${guardianEmail}|${playerName.toLowerCase()}`)
            .digest('hex')
            .slice(0, 32);
        const regRef = programRef.collection('registrations').doc(regKey);
        const dupSnap = await tx.get(regRef);
        if (dupSnap.exists) {
          throw new HttpsError(
              'already-exists',
              'This athlete is already registered for this tryout.',
          );
        }

        const capacity = Number(p.capacity) || 0;
        const regCount = Number(p.registrationCount) || 0;
        const waitCount = Number(p.waitlistCount) || 0;
        const waitlisted = capacity > 0 && regCount >= capacity;
        const pipelineStatus = waitlisted ? PIPELINE.WAITLISTED : PIPELINE.REGISTERED;

        tx.set(regRef, {
          programId,
          clubId: p.clubId,
          playerName,
          ageBand,
          guardianName,
          guardianEmail,
          ...(guardianPhone ? {guardianPhone} : {}),
          pipelineStatus,
          createdAt: now,
        });

        tx.update(programRef, {
          registrationCount: waitlisted ? regCount : regCount + 1,
          waitlistCount: waitlisted ? waitCount + 1 : waitCount,
          updatedAt: now,
        });

        return {registrationId: regRef.id, pipelineStatus};
      });

      return {ok: true, ...result, programId};
    },
);

/**
 * Director/registrar: schedule a tryout field session (Phase B).
 */
exports.upsertTryoutSession = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const role = request.auth.token.role || '';
  const tokenClub =
    typeof request.auth.token.clubId === 'string' ?
      request.auth.token.clubId.trim() :
      '';
  const allowed = ['director', 'registrar', 'super_admin', 'global_admin'].includes(role);
  if (!allowed) {
    throw new HttpsError('permission-denied', 'Director or registrar access required.');
  }

  const data = request.data || {};
  const programId =
    typeof data.programId === 'string' ? data.programId.trim() : '';
  const sessionId =
    typeof data.sessionId === 'string' ? data.sessionId.trim() : '';
  const title =
    typeof data.title === 'string' ? data.title.trim().slice(0, 200) : 'Tryout session';
  const fieldLabel =
    typeof data.fieldLabel === 'string' ? data.fieldLabel.trim().slice(0, 200) : '';
  const startAt =
    typeof data.startAt === 'string' ? data.startAt.trim().slice(0, 32) : '';
  const endAt =
    typeof data.endAt === 'string' ? data.endAt.trim().slice(0, 32) : '';

  if (!programId || !fieldLabel || !startAt) {
    throw new HttpsError(
        'invalid-argument',
        'programId, fieldLabel, and startAt are required.',
    );
  }

  const programRef = db().collection('tryout_programs').doc(programId);
  const programSnap = await programRef.get();
  if (!programSnap.exists) {
    throw new HttpsError('not-found', 'Tryout program not found.');
  }
  const clubId = programSnap.data().clubId || '';
  if (!staffCanAccessClub(role, tokenClub, clubId)) {
    throw new HttpsError('permission-denied', 'Program must belong to your club.');
  }

  const ageBandsRaw = Array.isArray(data.ageBands) ? data.ageBands : [];
  const ageBands = ageBandsRaw
      .map((b) => (typeof b === 'string' ? b.trim().slice(0, 32) : ''))
      .filter(Boolean)
      .slice(0, 24);

  const now = admin.firestore.FieldValue.serverTimestamp();
  const payload = {
    programId,
    clubId,
    title,
    fieldLabel,
    startAt,
    ...(endAt ? {endAt} : {}),
    ...(ageBands.length ? {ageBands} : {}),
    updatedAt: now,
    updatedBy: request.auth.uid,
  };

  let ref;
  if (sessionId) {
    ref = programRef.collection('sessions').doc(sessionId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Tryout session not found.');
    }
    await ref.set(payload, {merge: true});
  } else {
    ref = programRef.collection('sessions').doc();
    await ref.set({...payload, createdAt: now});
  }

  return {ok: true, programId, sessionId: ref.id};
});

/**
 * Director/registrar: assign registered athletes to a session (by age band or ids).
 */
exports.assignTryoutSession = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const role = request.auth.token.role || '';
  const tokenClub =
    typeof request.auth.token.clubId === 'string' ?
      request.auth.token.clubId.trim() :
      '';
  const allowed = ['director', 'registrar', 'super_admin', 'global_admin'].includes(role);
  if (!allowed) {
    throw new HttpsError('permission-denied', 'Director or registrar access required.');
  }

  const data = request.data || {};
  const programId =
    typeof data.programId === 'string' ? data.programId.trim() : '';
  const sessionId =
    typeof data.sessionId === 'string' ? data.sessionId.trim() : '';
  const ageBand =
    typeof data.ageBand === 'string' ? data.ageBand.trim().slice(0, 32) : '';
  const registrationIdsRaw = Array.isArray(data.registrationIds) ?
    data.registrationIds :
    [];

  if (!programId || !sessionId) {
    throw new HttpsError('invalid-argument', 'programId and sessionId are required.');
  }

  const programRef = db().collection('tryout_programs').doc(programId);
  const sessionRef = programRef.collection('sessions').doc(sessionId);
  const [programSnap, sessionSnap] = await Promise.all([
    programRef.get(),
    sessionRef.get(),
  ]);
  if (!programSnap.exists || !sessionSnap.exists) {
    throw new HttpsError('not-found', 'Program or session not found.');
  }
  const clubId = programSnap.data().clubId || '';
  if (!staffCanAccessClub(role, tokenClub, clubId)) {
    throw new HttpsError('permission-denied', 'Program must belong to your club.');
  }

  const regCol = programRef.collection('registrations');
  let regRefs = registrationIdsRaw
      .map((id) => (typeof id === 'string' ? id.trim() : ''))
      .filter(Boolean)
      .slice(0, 500)
      .map((id) => regCol.doc(id));

  if (!regRefs.length && ageBand) {
    const q = await regCol.where('ageBand', '==', ageBand).get();
    regRefs = q.docs
        .filter((d) => {
          const st = d.data().pipelineStatus;
          return st === PIPELINE.REGISTERED || st === PIPELINE.CHECKED_IN;
        })
        .map((d) => d.ref);
  }

  if (!regRefs.length) {
    throw new HttpsError('not-found', 'No registrations matched for assignment.');
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const batch = db().batch();
  for (const ref of regRefs) {
    batch.set(ref, {
      assignedSessionId: sessionId,
      sessionTitle: sessionSnap.data().title || 'Tryout session',
      sessionStartAt: sessionSnap.data().startAt || null,
      sessionFieldLabel: sessionSnap.data().fieldLabel || null,
      updatedAt: now,
    }, {merge: true});
  }
  await batch.commit();

  return {ok: true, programId, sessionId, assignedCount: regRefs.length};
});

/**
 * Public: guardian RSVPs to an assigned tryout session.
 */
exports.setTryoutSessionRsvp = onCall(
    {region: REGION, invoker: 'public'},
    async (request) => {
      const data = request.data || {};
      const programId =
        typeof data.programId === 'string' ? data.programId.trim() : '';
      const registrationId =
        typeof data.registrationId === 'string' ? data.registrationId.trim() : '';
      const guardianEmail = normEmail(data.guardianEmail);
      const statusRaw = typeof data.status === 'string' ? data.status.trim() : '';
      const status = statusRaw.toLowerCase();

      if (!programId || !registrationId || !guardianEmail || !RSVP.has(status)) {
        throw new HttpsError(
            'invalid-argument',
            'programId, registrationId, guardianEmail, and status (going|not_going|maybe) are required.',
        );
      }

      const regRef = db()
          .collection('tryout_programs')
          .doc(programId)
          .collection('registrations')
          .doc(registrationId);
      const snap = await regRef.get();
      if (!snap.exists) {
        throw new HttpsError('not-found', 'Registration not found.');
      }
      const reg = snap.data();
      if (normEmail(reg.guardianEmail) !== guardianEmail) {
        throw new HttpsError('permission-denied', 'Guardian email does not match registration.');
      }
      if (!reg.assignedSessionId) {
        throw new HttpsError(
            'failed-precondition',
            'No tryout session assigned yet — check back after the club publishes your time slot.',
        );
      }

      await regRef.set({
        sessionRsvpStatus: status,
        sessionRsvpAt: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});

      return {
        ok: true,
        programId,
        registrationId,
        status,
        assignedSessionId: reg.assignedSessionId,
      };
    },
);

/**
 * Staff gate check-in for a registered athlete.
 */
exports.checkInTryoutRegistration = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const role = request.auth.token.role || '';
  const tokenClub =
    typeof request.auth.token.clubId === 'string' ?
      request.auth.token.clubId.trim() :
      '';
  const allowed = ['director', 'registrar', 'coach', 'super_admin', 'global_admin'].includes(role);
  if (!allowed) {
    throw new HttpsError('permission-denied', 'Staff access required.');
  }

  const data = request.data || {};
  const programId =
    typeof data.programId === 'string' ? data.programId.trim() : '';
  const registrationId =
    typeof data.registrationId === 'string' ? data.registrationId.trim() : '';
  const checkInStatusRaw =
    typeof data.checkInStatus === 'string' ? data.checkInStatus.trim() : '';
  const checkInStatus = checkInStatusRaw.toLowerCase();

  if (!programId || !registrationId) {
    throw new HttpsError('invalid-argument', 'programId and registrationId are required.');
  }
  if (!Object.values(CHECK_IN).includes(checkInStatus)) {
    throw new HttpsError(
        'invalid-argument',
        'checkInStatus must be present, no_show, or late.',
    );
  }

  const programRef = db().collection('tryout_programs').doc(programId);
  const regRef = programRef.collection('registrations').doc(registrationId);
  const [programSnap, regSnap] = await Promise.all([programRef.get(), regRef.get()]);
  if (!programSnap.exists || !regSnap.exists) {
    throw new HttpsError('not-found', 'Program or registration not found.');
  }
  const clubId = programSnap.data().clubId || '';
  if (!staffCanAccessClub(role, tokenClub, clubId)) {
    throw new HttpsError('permission-denied', 'Program must belong to your club.');
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const pipelineStatus =
    checkInStatus === CHECK_IN.NO_SHOW ?
      regSnap.data().pipelineStatus || PIPELINE.REGISTERED :
      PIPELINE.CHECKED_IN;

  await regRef.set({
    checkInStatus,
    checkInAt: now,
    checkInBy: request.auth.uid,
    pipelineStatus,
    updatedAt: now,
  }, {merge: true});

  return {ok: true, programId, registrationId, checkInStatus, pipelineStatus};
});
