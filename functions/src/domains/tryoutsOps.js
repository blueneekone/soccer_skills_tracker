'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const crypto = require('crypto');
const {normEmail} = require('../utils/formatters');
const {postChannelSystemMessage} = require('./commsChannelOps');

const REGION = 'us-east1';
const db = () => admin.firestore();
const PLATFORM_URL =
  process.env.PLATFORM_URL || 'https://sports-skill-tracker-dev.web.app';
const PLATFORM_NAME = 'SSTracker';

const COMMS_TEMPLATES = new Set([
  'registration_confirm',
  'session_assigned',
  'offer_sent',
  'waitlist_promoted',
]);

/**
 * @param {{ headline: string, body: string, ctaUrl?: string, ctaLabel?: string }} o
 */
function buildTryoutMailHtml({headline, body, ctaUrl, ctaLabel}) {
  const cta = ctaUrl ?
    `<p style="margin-top:20px"><a href="${ctaUrl}" style="background:#14b8a6;color:#0f172a;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:700">${ctaLabel || 'Open tryout portal'}</a></p>` :
    '';
  return `<div style="font-family:system-ui,sans-serif;color:#0f172a;line-height:1.5">
    <h2 style="margin:0 0 12px">${headline}</h2>
    <p>${body}</p>${cta}
    <p style="margin-top:24px;font-size:12px;color:#64748b">${PLATFORM_NAME}</p>
  </div>`;
}

/**
 * @param {{ to: string, subject: string, html: string, programId: string, registrationId?: string, template: string }} o
 */
async function queueTryoutMail({to, subject, html, programId, registrationId, template}) {
  const mailRef = await db().collection('mail').add({
    to: [to],
    message: {subject, html},
    mailType: 'transactional',
  });
  await db().collection('tryout_programs').doc(programId).collection('comms').add({
    template,
    registrationId: registrationId || null,
    mailDocId: mailRef.id,
    to,
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return mailRef.id;
}

/**
 * @param {string} programId
 * @param {string} registrationId
 * @param {string} template
 */
async function sendTryoutCommsForRegistration(programId, registrationId, template) {
  if (!COMMS_TEMPLATES.has(template)) return null;
  const programRef = db().collection('tryout_programs').doc(programId);
  const regRef = programRef.collection('registrations').doc(registrationId);
  const [pSnap, rSnap] = await Promise.all([programRef.get(), regRef.get()]);
  if (!pSnap.exists || !rSnap.exists) return null;
  const p = pSnap.data();
  const r = rSnap.data();
  const to = normEmail(r.guardianEmail);
  if (!to) return null;

  const programName = typeof p.name === 'string' ? p.name : 'Tryouts';
  const playerName = typeof r.playerName === 'string' ? r.playerName : 'your athlete';
  const portalUrl = `${PLATFORM_URL}/tryouts/${encodeURIComponent(programId)}`;

  /** @type {{ subject: string, headline: string, body: string }} */
  let copy;
  if (template === 'registration_confirm') {
    copy = {
      subject: `[${PLATFORM_NAME}] Tryout registration received — ${programName}`,
      headline: 'Registration confirmed',
      body: `${playerName} is registered for <strong>${programName}</strong>. ` +
        `Your confirmation code is <strong>${registrationId}</strong>. ` +
        'We will email session details when the club assigns your tryout block.',
    };
  } else if (template === 'waitlist_promoted') {
    copy = {
      subject: `[${PLATFORM_NAME}] Tryout waitlist — ${programName}`,
      headline: 'You are on the waitlist',
      body: `${playerName} is waitlisted for <strong>${programName}</strong>. ` +
        'The club will contact you if a spot opens.',
    };
  } else if (template === 'session_assigned') {
    const when = r.sessionStartAt || 'TBD';
    const where = r.sessionFieldLabel || 'See club message';
    copy = {
      subject: `[${PLATFORM_NAME}] Tryout session assigned — ${programName}`,
      headline: 'Tryout session scheduled',
      body: `${playerName}'s tryout block: <strong>${when}</strong> at <strong>${where}</strong>. ` +
        `Confirmation code: <strong>${registrationId}</strong>. Please RSVP on the tryout portal.`,
    };
  } else {
    copy = {
      subject: `[${PLATFORM_NAME}] Roster offer — ${programName}`,
      headline: 'Roster offer',
      body: `Congratulations — ${playerName} has been offered a roster spot from ` +
        `<strong>${programName}</strong>. Accept or decline on the tryout portal.`,
    };
  }

  return queueTryoutMail({
    to,
    subject: copy.subject,
    html: buildTryoutMailHtml({
      headline: copy.headline,
      body: copy.body,
      ctaUrl: portalUrl,
      ctaLabel: 'Open tryout portal',
    }),
    programId,
    registrationId,
    template,
  });
}

const PIPELINE = {
  REGISTERED: 'registered',
  WAITLISTED: 'waitlisted',
  CHECKED_IN: 'checked_in',
  EVALUATED: 'evaluated',
  CALLBACK: 'callback',
  OFFERED: 'offered',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  ROSTER_PENDING: 'roster_pending',
  ROSTERED: 'rostered',
};

/** @type {Record<string, Set<string>>} */
const STAFF_PIPELINE = {
  [PIPELINE.EVALUATED]: new Set([PIPELINE.CALLBACK, PIPELINE.OFFERED, PIPELINE.DECLINED]),
  [PIPELINE.CALLBACK]: new Set([PIPELINE.OFFERED, PIPELINE.DECLINED]),
  [PIPELINE.OFFERED]: new Set([PIPELINE.DECLINED]),
  [PIPELINE.ACCEPTED]: new Set([PIPELINE.ROSTER_PENDING]),
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

      const mailTemplate =
        result.pipelineStatus === PIPELINE.WAITLISTED ?
          'waitlist_promoted' :
          'registration_confirm';
      void sendTryoutCommsForRegistration(programId, result.registrationId, mailTemplate)
          .catch(() => undefined);

      void (async () => {
        try {
          const pSnap = await db().collection('tryout_programs').doc(programId).get();
          if (!pSnap.exists) return;
          const clubId = typeof pSnap.data().clubId === 'string' ? pSnap.data().clubId.trim() : '';
          if (!clubId) return;
          const statusLabel =
            result.pipelineStatus === PIPELINE.WAITLISTED ? 'waitlisted' : 'registered';
          let householdId = '';
          const gSnap = await db().collection('users').doc(guardianEmail).get();
          if (gSnap.exists && typeof gSnap.data().householdId === 'string') {
            householdId = gSnap.data().householdId.trim();
          }
          await postChannelSystemMessage({
            channelType: 'tryouts_events',
            clubId,
            programId,
            householdId,
            guardianEmail,
            subject: 'Tryout registration received',
            body: `${playerName} (${ageBand}) is ${statusLabel} for this tryout program.`,
            sourceCallable: 'registerForTryout',
            actorRole: 'system',
          });
        } catch (tryoutChErr) {
          logger.warn('[registerForTryout] tryouts_events channel post failed (non-fatal)', {
            programId,
            err: tryoutChErr instanceof Error ? tryoutChErr.message : String(tryoutChErr),
          });
        }
      })();

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

  for (const ref of regRefs) {
    void sendTryoutCommsForRegistration(programId, ref.id, 'session_assigned')
        .catch(() => undefined);
  }

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

const EVAL_KEYS = ['pace', 'technique', 'tacticalVision', 'physicality', 'mentality'];

/**
 * @param {unknown} v
 * @param {number} fallback
 */
function clampScore(v, fallback = 50) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/**
 * Director/registrar: station template for tryout eval rotations (Phase C).
 */
exports.upsertTryoutPlan = onCall({region: REGION}, async (request) => {
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
  if (!programId) {
    throw new HttpsError('invalid-argument', 'programId is required.');
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

  const stationsRaw = Array.isArray(data.stations) ? data.stations : [];
  const stations = stationsRaw.slice(0, 12).map((row, idx) => {
    const r = row && typeof row === 'object' ? row : {};
    const label =
      typeof r.label === 'string' ? r.label.trim().slice(0, 120) : `Station ${idx + 1}`;
    const durationMin = clampScore(r.durationMin, 10);
    const evaluatorRole =
      typeof r.evaluatorRole === 'string' ?
        r.evaluatorRole.trim().slice(0, 64) :
        'Evaluator';
    return {id: `s${idx + 1}`, label, durationMin, evaluatorRole};
  });

  const now = admin.firestore.FieldValue.serverTimestamp();
  await programRef.set({
    evalPlan: {stations, updatedAt: now},
    updatedAt: now,
    updatedBy: request.auth.uid,
  }, {merge: true});

  return {ok: true, programId, stationCount: stations.length};
});

/**
 * Coach/staff: lock tryout eval sheet for a registration (Phase C).
 */
exports.submitTryoutEvaluation = onCall({region: REGION}, async (request) => {
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
  if (!programId || !registrationId) {
    throw new HttpsError('invalid-argument', 'programId and registrationId are required.');
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

  const reg = regSnap.data();
  if (reg.pipelineStatus === PIPELINE.WAITLISTED) {
    throw new HttpsError('failed-precondition', 'Waitlisted athletes cannot be evaluated.');
  }

  /** @type {Record<string, number>} */
  const scores = {};
  for (const key of EVAL_KEYS) {
    scores[key] = clampScore(data[key], 50);
  }
  const overallGrade = Math.round(
      EVAL_KEYS.reduce((sum, k) => sum + scores[k], 0) / EVAL_KEYS.length,
  );
  const notes =
    typeof data.notes === 'string' ? data.notes.trim().slice(0, 2000) : '';

  const now = admin.firestore.FieldValue.serverTimestamp();
  const actorEmail = normEmail(request.auth.token.email || '');

  const evalPayload = {
    programId,
    clubId,
    registrationId,
    playerName: reg.playerName || '',
    ageBand: reg.ageBand || '',
    ...scores,
    overallGrade,
    ...(notes ? {notes} : {}),
    lockedAt: now,
    lockedBy: request.auth.uid,
    lockedByEmail: actorEmail || null,
  };

  await db().runTransaction(async (tx) => {
    tx.set(
        programRef.collection('evaluations').doc(registrationId),
        evalPayload,
        {merge: true},
    );
    tx.set(regRef, {
      pipelineStatus: PIPELINE.EVALUATED,
      evaluatedAt: now,
      overallGrade,
      updatedAt: now,
    }, {merge: true});
  });

  return {ok: true, programId, registrationId, overallGrade};
});

/**
 * Staff: advance tryout pipeline (callback / offer / decline).
 */
exports.setTryoutPipelineStatus = onCall({region: REGION}, async (request) => {
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
  const nextStatusRaw =
    typeof data.pipelineStatus === 'string' ? data.pipelineStatus.trim() : '';
  const nextStatus = nextStatusRaw.toLowerCase();

  if (!programId || !registrationId) {
    throw new HttpsError('invalid-argument', 'programId and registrationId are required.');
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

  const current = regSnap.data().pipelineStatus || PIPELINE.REGISTERED;
  const allowedNext = STAFF_PIPELINE[current];
  if (!allowedNext || !allowedNext.has(nextStatus)) {
    throw new HttpsError(
        'failed-precondition',
        `Cannot move from ${current} to ${nextStatus}.`,
    );
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  await regRef.set({
    pipelineStatus: nextStatus,
    pipelineUpdatedAt: now,
    pipelineUpdatedBy: request.auth.uid,
    updatedAt: now,
  }, {merge: true});

  if (nextStatus === PIPELINE.OFFERED) {
    void sendTryoutCommsForRegistration(programId, registrationId, 'offer_sent')
        .catch(() => undefined);
  }

  return {ok: true, programId, registrationId, pipelineStatus: nextStatus};
});

/**
 * Public: guardian accepts or declines a roster offer.
 */
exports.respondTryoutOffer = onCall(
    {region: REGION, invoker: 'public'},
    async (request) => {
      const data = request.data || {};
      const programId =
        typeof data.programId === 'string' ? data.programId.trim() : '';
      const registrationId =
        typeof data.registrationId === 'string' ? data.registrationId.trim() : '';
      const guardianEmail = normEmail(data.guardianEmail);
      const responseRaw =
        typeof data.response === 'string' ? data.response.trim() : '';
      const response = responseRaw.toLowerCase();

      if (!programId || !registrationId || !guardianEmail) {
        throw new HttpsError(
            'invalid-argument',
            'programId, registrationId, and guardianEmail are required.',
        );
      }
      if (response !== PIPELINE.ACCEPTED && response !== PIPELINE.DECLINED) {
        throw new HttpsError('invalid-argument', 'response must be accepted or declined.');
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
      if (reg.pipelineStatus !== PIPELINE.OFFERED) {
        throw new HttpsError('failed-precondition', 'No open offer for this registration.');
      }

      const now = admin.firestore.FieldValue.serverTimestamp();
      await regRef.set({
        pipelineStatus: response,
        offerRespondedAt: now,
        updatedAt: now,
      }, {merge: true});

      return {ok: true, programId, registrationId, pipelineStatus: response};
    },
);

/**
 * Public: lookup registration status for guardian (offer / RSVP follow-up).
 */
exports.getPublicTryoutRegistration = onCall(
    {region: REGION, invoker: 'public'},
    async (request) => {
      const data = request.data || {};
      const programId =
        typeof data.programId === 'string' ? data.programId.trim() : '';
      const registrationId =
        typeof data.registrationId === 'string' ? data.registrationId.trim() : '';
      const guardianEmail = normEmail(data.guardianEmail);

      if (!programId || !registrationId || !guardianEmail) {
        throw new HttpsError(
            'invalid-argument',
            'programId, registrationId, and guardianEmail are required.',
        );
      }

      const regRef = db()
          .collection('tryout_programs')
          .doc(programId)
          .collection('registrations')
          .doc(registrationId);
      const snap = await regRef.get();
      if (!snap.exists) {
        return {ok: false, notFound: true};
      }
      const reg = snap.data();
      if (normEmail(reg.guardianEmail) !== guardianEmail) {
        throw new HttpsError('permission-denied', 'Guardian email does not match registration.');
      }

      return {
        ok: true,
        programId,
        registrationId,
        playerName: reg.playerName || '',
        pipelineStatus: reg.pipelineStatus || PIPELINE.REGISTERED,
        assignedSessionId: reg.assignedSessionId || null,
        sessionStartAt: reg.sessionStartAt || null,
        sessionFieldLabel: reg.sessionFieldLabel || null,
        sessionRsvpStatus: reg.sessionRsvpStatus || null,
      };
    },
);

/**
 * Link an existing household operative (by guardian + display name) to the roster team.
 * @param {{ guardianEmail: string, playerName: string, teamId: string, clubId: string }} input
 */
async function linkHouseholdOperativeToTeam(input) {
  const gEm = normEmail(input.guardianEmail);
  const teamId = typeof input.teamId === 'string' ? input.teamId.trim() : '';
  const clubId = typeof input.clubId === 'string' ? input.clubId.trim() : '';
  const playerName =
      typeof input.playerName === 'string' ? input.playerName.trim().slice(0, 200) : '';
  if (!gEm || !teamId || !playerName) {
    return {linked: false};
  }
  const hhSnap = await db()
      .collection('households')
      .where('parentEmails', 'array-contains', gEm)
      .limit(8)
      .get();
  const nameNorm = playerName.toLowerCase();
  for (const hdoc of hhSnap.docs) {
    const pe = Array.isArray(hdoc.data().playerEmails) ?
      hdoc.data().playerEmails :
      [];
    for (const raw of pe) {
      const childEmail = normEmail(String(raw || ''));
      if (!childEmail.endsWith('@operative.local')) continue;
      const uRef = db().collection('users').doc(childEmail);
      const uSnap = await uRef.get();
      if (!uSnap.exists) continue;
      const u = uSnap.data() || {};
      const pn =
          typeof u.playerName === 'string' ? u.playerName.trim().toLowerCase() : '';
      if (pn !== nameNorm) continue;
      if (u.teamId === teamId) {
        return {linked: true, noop: true, childEmail};
      }
      let childUid = '';
      try {
        const rec = await admin.auth().getUserByEmail(childEmail);
        childUid = rec.uid;
      } catch (e) {
        if (e && e.code === 'auth/user-not-found') continue;
        throw e;
      }
      const now = admin.firestore.FieldValue.serverTimestamp();
      const batch = db().batch();
      batch.set(uRef, {teamId, clubId, updatedAt: now}, {merge: true});
      batch.set(
          db().collection('player_lookup').doc(childEmail),
          {
            clubId,
            teamId,
            playerName: u.playerName,
            updatedAt: now,
          },
          {merge: true},
      );
      batch.update(db().collection('teams').doc(teamId), {
        playerUids: admin.firestore.FieldValue.arrayUnion(childUid),
        updatedAt: now,
      });
      await batch.commit();
      return {linked: true, childEmail, teamId};
    }
  }
  return {linked: false};
}

/**
 * Director/registrar: add accepted athlete to team roster pipeline (name-only row).
 */
exports.promoteTryoutToRoster = onCall({region: REGION}, async (request) => {
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
  const registrationId =
    typeof data.registrationId === 'string' ? data.registrationId.trim() : '';
  const teamId =
    typeof data.teamId === 'string' ? data.teamId.trim() : '';

  if (!programId || !registrationId || !teamId) {
    throw new HttpsError(
        'invalid-argument',
        'programId, registrationId, and teamId are required.',
    );
  }

  const programRef = db().collection('tryout_programs').doc(programId);
  const regRef = programRef.collection('registrations').doc(registrationId);
  const [programSnap, regSnap, teamSnap] = await Promise.all([
    programRef.get(),
    regRef.get(),
    db().collection('teams').doc(teamId).get(),
  ]);
  if (!programSnap.exists || !regSnap.exists || !teamSnap.exists) {
    throw new HttpsError('not-found', 'Program, registration, or team not found.');
  }

  const clubId = programSnap.data().clubId || '';
  const teamClub =
    typeof teamSnap.data().clubId === 'string' ? teamSnap.data().clubId.trim() : '';
  if (teamClub && teamClub !== clubId) {
    throw new HttpsError('failed-precondition', 'Team must belong to the tryout program club.');
  }
  if (!staffCanAccessClub(role, tokenClub, clubId)) {
    throw new HttpsError('permission-denied', 'Program must belong to your club.');
  }

  const reg = regSnap.data();
  if (reg.pipelineStatus !== PIPELINE.ACCEPTED) {
    throw new HttpsError(
        'failed-precondition',
        'Athlete must accept the offer before roster promotion.',
    );
  }

  const playerName =
    typeof reg.playerName === 'string' ? reg.playerName.trim().slice(0, 200) : '';
  if (!playerName) {
    throw new HttpsError('failed-precondition', 'Registration missing player name.');
  }

  const rosterRef = db().collection('rosters').doc(teamId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db().runTransaction(async (tx) => {
    const rosterSnap = await tx.get(rosterRef);
    const players = rosterSnap.exists && Array.isArray(rosterSnap.data().players) ?
      rosterSnap.data().players.filter((x) => typeof x === 'string') :
      [];
    const norm = playerName.toLowerCase();
    if (!players.some((n) => String(n).trim().toLowerCase() === norm)) {
      tx.set(rosterRef, {
        players: [...players, playerName],
        updatedAt: now,
      }, {merge: true});
    }
    tx.set(regRef, {
      pipelineStatus: PIPELINE.ROSTER_PENDING,
      rosterTeamId: teamId,
      rosterPromotedAt: now,
      updatedAt: now,
    }, {merge: true});
  });

  const guardianEmail = normEmail(reg.guardianEmail);
  let operativeLink = {linked: false};
  try {
    operativeLink = await linkHouseholdOperativeToTeam({
      guardianEmail,
      playerName,
      teamId,
      clubId,
    });
  } catch (linkErr) {
    console.warn(
        '[promoteTryoutToRoster] operative link failed (non-fatal)',
        linkErr instanceof Error ? linkErr.message : linkErr,
    );
  }

  return {
    ok: true,
    programId,
    registrationId,
    teamId,
    playerName,
    guardianEmail,
    pipelineStatus: PIPELINE.ROSTER_PENDING,
    operativeLinked: operativeLink.linked === true,
    operativeEmail: operativeLink.childEmail || null,
  };
});

/**
 * Staff: manually dispatch tryout comms template to one or many registrations.
 */
exports.dispatchTryoutComms = onCall({region: REGION}, async (request) => {
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
  const template =
    typeof data.template === 'string' ? data.template.trim() : '';
  const registrationId =
    typeof data.registrationId === 'string' ? data.registrationId.trim() : '';
  const ageBand =
    typeof data.ageBand === 'string' ? data.ageBand.trim().slice(0, 32) : '';

  if (!programId || !COMMS_TEMPLATES.has(template)) {
    throw new HttpsError(
        'invalid-argument',
        'programId and template (registration_confirm|session_assigned|offer_sent|waitlist_promoted) are required.',
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

  /** @type {string[]} */
  let ids = registrationId ? [registrationId] : [];
  if (!ids.length && ageBand) {
    const q = await programRef.collection('registrations').where('ageBand', '==', ageBand).get();
    ids = q.docs.map((d) => d.id);
  }
  if (!ids.length) {
    throw new HttpsError('not-found', 'No registrations matched.');
  }

  let sent = 0;
  for (const id of ids.slice(0, 500)) {
    const mailId = await sendTryoutCommsForRegistration(programId, id, template);
    if (mailId) sent++;
  }

  return {ok: true, programId, template, sentCount: sent};
});
