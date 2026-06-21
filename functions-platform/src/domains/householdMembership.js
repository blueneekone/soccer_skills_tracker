'use strict';

/**
 * Canonical household membership checks + safe graph repair.
 *
 * Admin surfaces may show linkage from denormalized `player_lookup.parentEmails`
 * while parent callables gate on `households.playerEmails`. This module
 * reconciles those views before rejecting parent actions.
 */

const admin = require('firebase-admin');
const {HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const {normEmail} = require('../utils/formatters');
const {stampPlayerLookupGuardians} = require('./householdGraph');

const db = () => admin.firestore();

/**
 * @param {unknown} raw
 * @return {string[]}
 */
function emailList(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((x) => normEmail(String(x))).filter(Boolean))];
}

/**
 * @param {string} email
 * @return {Promise<{ householdId: string, role: string, playerName: string }>}
 */
async function readUserHouseholdContext(email) {
  const em = normEmail(email);
  if (!em) {
    return {householdId: '', role: '', playerName: ''};
  }
  const snap = await db().collection('users').doc(em).get();
  if (!snap.exists) {
    return {householdId: '', role: '', playerName: ''};
  }
  const d = snap.data() || {};
  return {
    householdId:
      typeof d.householdId === 'string' ? d.householdId.trim() : '',
    role: typeof d.role === 'string' ? d.role.trim() : '',
    playerName:
      typeof d.playerName === 'string' && d.playerName.trim() ?
        d.playerName.trim() :
        '',
  };
}

/**
 * @param {string} childEmail
 * @return {Promise<{ householdId: string, parentEmails: string[] }>}
 */
async function readPlayerLookupGuardians(childEmail) {
  const em = normEmail(childEmail);
  if (!em) {
    return {householdId: '', parentEmails: []};
  }
  const snap = await db().collection('player_lookup').doc(em).get();
  if (!snap.exists) {
    return {householdId: '', parentEmails: []};
  }
  const d = snap.data() || {};
  return {
    householdId:
      typeof d.householdId === 'string' ? d.householdId.trim() : '',
    parentEmails: emailList(d.parentEmails),
  };
}

/**
 * @param {string} householdId
 * @param {string} parentEmail
 * @param {string} childEmail
 * @param {string} childName
 * @return {Promise<boolean>}
 */
async function repairHouseholdMembership(
    householdId,
    parentEmail,
    childEmail,
    childName,
) {
  const hid = typeof householdId === 'string' ? householdId.trim() : '';
  const parent = normEmail(parentEmail);
  const child = normEmail(childEmail);
  if (!hid || !parent || !child) {
    return false;
  }

  const hRef = db().collection('households').doc(hid);
  const hSnap = await hRef.get();
  if (!hSnap.exists) {
    return false;
  }

  const h = hSnap.data() || {};
  const players = emailList(h.playerEmails);
  const parents = emailList(h.parentEmails);
  const names = Array.isArray(h.playerNames) ?
    h.playerNames.filter((x) => typeof x === 'string' && x.trim()) :
    [];

  let changed = false;
  if (!players.includes(child)) {
    players.push(child);
    changed = true;
  }
  if (!parents.includes(parent)) {
    parents.push(parent);
    changed = true;
  }
  if (childName && !names.includes(childName)) {
    names.push(childName);
    changed = true;
  }

  if (!changed) {
    return true;
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const batch = db().batch();
  batch.set(
      hRef,
      {
        playerEmails: players,
        parentEmails: parents,
        playerNames: names,
        updatedAt: now,
      },
      {merge: true},
  );
  batch.set(
      db().collection('users').doc(parent),
      {householdId: hid, updatedAt: now},
      {merge: true},
  );
  batch.set(
      db().collection('users').doc(child),
      {householdId: hid, role: 'player', updatedAt: now},
      {merge: true},
  );
  stampPlayerLookupGuardians(batch, child, {
    householdId: hid,
    parentEmails: parents,
  });
  batch.set(db().collection('security_audit').doc(), {
    action: 'repairHouseholdMembership',
    householdId: hid,
    parentEmail: parent,
    childEmail: child,
    at: now,
  });
  await batch.commit();
  logger.info('[repairHouseholdMembership] healed household graph', {
    householdId: hid,
    parentEmail: parent,
    childEmail: child,
  });
  return true;
}

/**
 * Resolve the household id that should gate a parent action.
 * @param {{ email: string, householdId: string }} actor
 * @return {Promise<string>}
 */
async function resolveParentHouseholdId(actor) {
  const parentCtx = await readUserHouseholdContext(actor.email);
  return parentCtx.householdId || actor.householdId || '';
}

/**
 * Assert a child belongs to the parent's household, repairing denorm gaps when
 * users + player_lookup agree but households.playerEmails is stale.
 *
 * @param {{ email: string, householdId: string }} actor
 * @param {string} childUid
 * @param {string} [requestedChildEmail] email sent by client (operative row)
 */
async function assertChildInParentHousehold(actor, childUid, requestedChildEmail) {
  let childUser;
  try {
    childUser = await admin.auth().getUser(childUid);
  } catch (e) {
    if (e && e.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', 'Child account not found.');
    }
    throw e;
  }

  const authChildEm = normEmail(childUser.email);
  const requestedEm = normEmail(requestedChildEmail);
  const childEm = authChildEm || requestedEm;
  if (!childEm) {
    throw new HttpsError('failed-precondition', 'Child has no email on file.');
  }
  if (requestedEm && authChildEm && requestedEm !== authChildEm) {
    throw new HttpsError(
        'failed-precondition',
        'Operative sign-in email does not match the provisioned account. ' +
        'Contact your club to relink this athlete.',
    );
  }

  const parentCtx = await readUserHouseholdContext(actor.email);
  const childCtx = await readUserHouseholdContext(childEm);
  const lookup = await readPlayerLookupGuardians(childEm);
  const householdId =
    parentCtx.householdId ||
    actor.householdId ||
    childCtx.householdId ||
    lookup.householdId ||
    '';

  if (!householdId) {
    throw new HttpsError(
        'failed-precondition',
        'Your account must be linked to a household. Sign the waiver on the household page first.',
    );
  }

  const hSnap = await db().collection('households').doc(householdId).get();
  if (!hSnap.exists) {
    throw new HttpsError('not-found', 'Household not found.');
  }

  const h = hSnap.data() || {};
  const players = emailList(h.playerEmails);
  const parents = emailList(h.parentEmails);

  const linkedOnHousehold =
    players.includes(childEm) && parents.includes(actor.email);
  const linkedOnUsers =
    parentCtx.householdId &&
    childCtx.householdId &&
    parentCtx.householdId === childCtx.householdId;
  const linkedOnLookup =
    lookup.householdId === householdId &&
    lookup.parentEmails.includes(actor.email);

  if (!linkedOnHousehold && (linkedOnUsers || linkedOnLookup)) {
    const repaired = await repairHouseholdMembership(
        householdId,
        actor.email,
        childEm,
        childCtx.playerName,
    );
    if (!repaired) {
      throw new HttpsError(
          'failed-precondition',
          'Household linkage is inconsistent and could not be repaired automatically.',
      );
    }
  } else if (!linkedOnHousehold) {
    /** @type {string[]} */
    const hints = [];
    if (childCtx.householdId && childCtx.householdId !== householdId) {
      hints.push(`player householdId=${childCtx.householdId}`);
    }
    if (lookup.parentEmails.length > 0 && !lookup.parentEmails.includes(actor.email)) {
      hints.push('player_lookup lists a different guardian');
    }
    if (!players.includes(childEm)) {
      hints.push('player missing from households.playerEmails');
    }
    if (!parents.includes(actor.email)) {
      hints.push('parent missing from households.parentEmails');
    }
    const detail = hints.length > 0 ? ` (${hints.join('; ')})` : '';
    throw new HttpsError(
        'permission-denied',
        'That player is not linked to your household.' + detail,
    );
  }

  const uSnap = await db().collection('users').doc(childEm).get();
  if (uSnap.exists) {
    const r = uSnap.data().role;
    if (r && r !== 'player') {
      throw new HttpsError('failed-precondition', 'Target account is not a player.');
    }
  }
}

module.exports = {
  assertChildInParentHousehold,
  repairHouseholdMembership,
  resolveParentHouseholdId,
  readUserHouseholdContext,
  readPlayerLookupGuardians,
};
