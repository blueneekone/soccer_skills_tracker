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
};

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
