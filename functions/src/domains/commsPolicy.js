'use strict';

/**
 * commsPolicy.js — Epic 4.2 / 4.11 SafeSport comms policy helpers.
 * Authority: docs/vision/COMMS_HUB.md · docs/SAFESPORT_COMMS_MATRIX.md
 */

const {HttpsError} = require('firebase-functions/v2/https');
const {normEmail, computeAgeYears} = require('../utils/formatters');

const STAFF_ROLES = new Set([
  'coach',
  'director',
  'super_admin',
  'global_admin',
]);

const ADULT_ATHLETE_AGE = 18;

/**
 * @param {FirebaseFirestore.Firestore} firestore
 * @return {FirebaseFirestore.CollectionReference}
 */
function consentRecordsCol(firestore) {
  return firestore.collection('consent_records');
}

/**
 * @param {Record<string, unknown> | undefined} userData
 * @return {boolean}
 */
function resolveIsMinor(userData) {
  if (!userData || typeof userData !== 'object') return false;
  if (userData.isMinor === true) return true;
  if (userData.isMinor === false) return false;
  if (userData.dateOfBirth) {
    try {
      return computeAgeYears(userData.dateOfBirth) < ADULT_ATHLETE_AGE;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Staff direct mail to athletes is adult-only (18+).
 * @param {Record<string, unknown> | undefined} userData
 */
function assertStaffMayDirectMessagePlayer(userData) {
  if (resolveIsMinor(userData)) {
    throw new HttpsError(
        'failed-precondition',
        'SafeSport policy: staff cannot send direct messages to minor athletes. ' +
        'Use parent-targeted announcements instead.',
    );
  }
}

/**
 * @param {string} role
 * @return {boolean}
 */
function isStaffRole(role) {
  return STAFF_ROLES.has(String(role || ''));
}

/**
 * VPC consent_records gate for parent comms delivery.
 * @param {FirebaseFirestore.Firestore} firestore
 * @param {string} parentEmail
 * @param {string} playerEmail
 * @return {Promise<boolean>}
 */
async function parentHasCommsConsent(firestore, parentEmail, playerEmail) {
  const parent = normEmail(parentEmail);
  const player = normEmail(playerEmail);
  if (!parent || !player) return false;

  const snap = await consentRecordsCol(firestore)
      .where('parentEmail', '==', parent)
      .where('subjectEmail', '==', player)
      .orderBy('grantedAt', 'desc')
      .limit(1)
      .get();

  if (snap.empty) return false;
  const items = snap.docs[0].data().consentItems;
  return items && items.comms === true;
}

/**
 * @param {FirebaseFirestore.Firestore} firestore
 * @param {readonly string[]} parentEmails
 * @param {string} playerEmail
 * @return {Promise<string[]>}
 */
async function filterParentsWithCommsConsent(firestore, parentEmails, playerEmail) {
  const out = [];
  for (const raw of parentEmails) {
    const parent = normEmail(String(raw));
    if (!parent) continue;
    if (await parentHasCommsConsent(firestore, parent, playerEmail)) {
      out.push(parent);
    }
  }
  return [...new Set(out)];
}

/**
 * Guardian emails for a roster player (household + direct parentEmail).
 * @param {FirebaseFirestore.Firestore} firestore
 * @param {Record<string, unknown>} prof
 * @return {Promise<string[]>}
 */
async function resolvePlayerGuardianEmails(firestore, prof) {
  /** @type {string[]} */
  const out = [];
  const householdId = typeof prof.householdId === 'string' ? prof.householdId.trim() : '';
  if (householdId) {
    const hSnap = await firestore.collection('households').doc(householdId).get();
    if (hSnap.exists) {
      const pe = hSnap.data().parentEmails || [];
      pe.forEach((p) => {
        const n = normEmail(String(p));
        if (n) out.push(n);
      });
    }
  }
  const directParent = normEmail(String(prof.parentEmail || ''));
  if (directParent) out.push(directParent);
  return [...new Set(out)];
}

/**
 * Parent-first announcement audience (COMMS_CHANNEL_CANON §6).
 * consentComms: skip with reason — no transactional bypass for announcements.
 *
 * @param {FirebaseFirestore.Firestore} firestore
 * @param {readonly string[]} playerEmails
 * @param {ReadonlyMap<string, {isMinor: boolean}>} playerMeta
 * @param {ReadonlyMap<string, readonly string[]>} parentToPlayers
 * @return {Promise<{
 *   parentRecipientEmails: string[],
 *   ccParentEmails: string[],
 *   parentDelivered: Array<{email: string, channels: string[]}>,
 *   parentSkipped: Array<{email: string, reason: string}>,
 *   parentDeliveredEmails: string[],
 * }>}
 */
async function buildTeamBroadcastAudience(
    firestore,
    playerEmails,
    playerMeta,
    parentToPlayers,
    consentFn = parentHasCommsConsent,
) {
  const parentRecipientEmails = [...parentToPlayers.keys()].sort();
  /** @type {Array<{email: string, channels: string[]}>} */
  const parentDelivered = [];
  /** @type {Array<{email: string, reason: string}>} */
  const parentSkipped = [];
  const ccParentEmailSet = new Set();

  for (const parentEmail of parentRecipientEmails) {
    const linkedPlayers = parentToPlayers.get(parentEmail) || [];
    let consented = false;
    for (const playerEmail of linkedPlayers) {
      if (await consentFn(firestore, parentEmail, playerEmail)) {
        consented = true;
        break;
      }
    }
    if (consented) {
      parentDelivered.push({email: parentEmail, channels: ['in_app']});
      for (const playerEmail of linkedPlayers) {
        const meta = playerMeta.get(playerEmail);
        if (meta?.isMinor) ccParentEmailSet.add(parentEmail);
      }
    } else {
      parentSkipped.push({email: parentEmail, reason: 'consent_comms_declined'});
    }
  }

  return {
    parentRecipientEmails,
    ccParentEmails: [...ccParentEmailSet],
    parentDelivered,
    parentSkipped,
    parentDeliveredEmails: parentDelivered.map((p) => p.email),
  };
}

module.exports = {
  ADULT_ATHLETE_AGE,
  STAFF_ROLES,
  resolveIsMinor,
  assertStaffMayDirectMessagePlayer,
  isStaffRole,
  parentHasCommsConsent,
  filterParentsWithCommsConsent,
  resolvePlayerGuardianEmails,
  buildTeamBroadcastAudience,
};
