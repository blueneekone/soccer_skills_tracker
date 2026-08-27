'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const logger = require('firebase-functions/logger');

const REGION = 'us-east1';
const db = () => admin.firestore();

const ALLOWED_STAFF_ROLES = new Set([
  'assistant_coach',
  'team_manager',
  'schedule_manager',
  'event_manager',
  'head_coach',
  'none',
  'clear',
]);

async function syncStaffAuthAndTeam(clubId, teamId, targetUserId, newRole) {
  const emailNorm = targetUserId.toLowerCase().trim();
  await db().collection('teams').doc(teamId).set(
    { expandedStaff: admin.firestore.FieldValue.arrayUnion(emailNorm) },
    { merge: true }
  );

  const uRef = db().collection('users').doc(emailNorm);
  const uSnap = await uRef.get();
  if (uSnap.exists) {
    await uRef.update({ role: newRole, teamId, clubId, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  } else {
    await uRef.set({
      email: emailNorm,
      role: newRole,
      teamId,
      clubId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  try {
    const userRecord = emailNorm.includes('@') ?
      await admin.auth().getUserByEmail(emailNorm) :
      await admin.auth().getUser(emailNorm);
    const existingClaims = userRecord.customClaims || {};
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      ...existingClaims,
      role: newRole,
      teamId,
      clubId,
    });
  } catch (e) {
    logger.warn('[callableUpdateStaffRole] claims update skipped', e);
  }
}

async function clearStaffAuthAndTeam(clubId, teamId, targetUserId) {
  const emailNorm = targetUserId.toLowerCase().trim();
  await db().collection('teams').doc(teamId).set(
    { expandedStaff: admin.firestore.FieldValue.arrayRemove(emailNorm) },
    { merge: true }
  );

  const uRef = db().collection('users').doc(emailNorm);
  const uSnap = await uRef.get();
  if (uSnap.exists) {
    await uRef.update({ role: 'parent', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  }

  try {
    const userRecord = emailNorm.includes('@') ?
      await admin.auth().getUserByEmail(emailNorm) :
      await admin.auth().getUser(emailNorm);
    const existingClaims = userRecord.customClaims || {};
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      ...existingClaims,
      role: 'parent',
    });
  } catch (e) {
    logger.warn('[callableUpdateStaffRole] claims clear skipped', e);
  }
}

/**
 * Assigns or updates a team staff role strictly scoped under:
 * /clubs/{clubId}/teams/{teamId}/staff/{userId}
 * Grants coach OS access and team assignment.
 */
exports.callableUpdateStaffRole = onCall({ region: REGION }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const callerRole = request.auth.token.role || '';
  const tokenClub = typeof request.auth.token.clubId === 'string' ? request.auth.token.clubId.trim() : '';
  const isSuper = ['director', 'super_admin', 'global_admin'].includes(callerRole);
  const isTeamCoach = ['coach', 'head_coach'].includes(callerRole);

  const data = request.data || {};
  const clubId = typeof data.clubId === 'string' ? data.clubId.trim() : '';
  const teamId = typeof data.teamId === 'string' ? data.teamId.trim() : '';
  const targetUserId = typeof data.targetUserId === 'string' ? data.targetUserId.trim() : '';
  const newRole = typeof data.role === 'string' ? data.role.trim().toLowerCase() : '';

  if (!clubId || !teamId || !targetUserId || !newRole) {
    throw new HttpsError('invalid-argument', 'clubId, teamId, targetUserId, and role are required.');
  }
  if (!ALLOWED_STAFF_ROLES.has(newRole)) {
    throw new HttpsError('invalid-argument', 'Invalid staff role specified.');
  }

  if (!isSuper) {
    if (!tokenClub || tokenClub !== clubId) {
      throw new HttpsError('permission-denied', 'You can only update staff permissions for your own club.');
    }
    if (!isTeamCoach) {
      throw new HttpsError('permission-denied', 'Only coaches or directors can assign team staff.');
    }
  }

  const staffRef = db().collection('clubs').doc(clubId).collection('teams').doc(teamId).collection('staff').doc(targetUserId);

  if (newRole === 'none' || newRole === 'clear') {
    await staffRef.delete().catch(() => {});
    await clearStaffAuthAndTeam(clubId, teamId, targetUserId);
    logger.info(`[callableUpdateStaffRole] Cleared staff role for ${targetUserId} in team ${teamId}`);
    return { ok: true, clubId, teamId, targetUserId, role: 'none' };
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  await staffRef.set(
    { clubId, teamId, userId: targetUserId, role: newRole, updatedAt: now, updatedBy: request.auth.uid },
    { merge: true }
  );
  await syncStaffAuthAndTeam(clubId, teamId, targetUserId, newRole);

  logger.info(`[callableUpdateStaffRole] Updated staff ${targetUserId} role to ${newRole} for team ${teamId}`);
  return { ok: true, clubId, teamId, targetUserId, role: newRole };
});
