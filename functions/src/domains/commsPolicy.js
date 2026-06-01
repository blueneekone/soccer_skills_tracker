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

module.exports = {
  ADULT_ATHLETE_AGE,
  STAFF_ROLES,
  resolveIsMinor,
  assertStaffMayDirectMessagePlayer,
  isStaffRole,
  parentHasCommsConsent,
  filterParentsWithCommsConsent,
};
